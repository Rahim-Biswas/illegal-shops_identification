"""
KoboToolbox API integration routes.

Fetches and syncs survey submissions from the
'Illegal Shop Detection & Reporting' KoboToolbox form.

KoboToolbox field mapping (new form):
  _id                  → kobo_submission_id
  Inspector_Name       → inspector_name
  Inspector_ID         → inspector_id
  Municipality_Zone    → municipality_zone
  Shop_Name            → shop_name
  Shop_Owner_Name      → shop_owner_name
  Contact_Number       → contact_number
  License_Number       → license_number
  Violation_Type       → violation_type  (mapped → disaster_type for DB compat)
  Violation_Description→ violation_description (→ description)
  GPS_Location         → "lat lon alt accuracy" → latitude, longitude
  Action_Taken         → action_taken
  Evidence_Photo       → attachment filename → image_url
  Inspection_Date      → inspection_date (→ incident_date)
  Inspection_Time      → inspection_time
  _submission_time     → submission_time
  _submitted_by        → submitted_by
"""
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from src.config import settings
from src.database import get_db
from src.models import Complaint, ComplaintStatus, User
from src.security import get_current_admin_user, get_current_user

router = APIRouter(prefix="/api/kobo", tags=["KoboToolbox"])

KOBO_HEADERS = {
    "Authorization": f"Token {settings.KOBO_API_TOKEN}",
    "Accept": "application/json",
}

# Track last auto-sync result (in-memory, resets on restart)
_last_sync = {"time": None, "created": 0, "skipped": 0, "error": None}


def get_sync_status():
    return _last_sync


def _get_kobo_url(path: str) -> str:
    base = settings.KOBO_API_URL.rstrip("/")
    return f"{base}/{path.lstrip('/')}"


def _parse_gps(location_str: Optional[str]) -> tuple[Optional[float], Optional[float]]:
    """Parse KoboToolbox GPS string 'lat lon alt accuracy' into (lat, lon)."""
    if not location_str:
        return None, None
    parts = location_str.strip().split()
    try:
        return float(parts[0]), float(parts[1])
    except (IndexError, ValueError):
        return None, None


def _build_image_url(submission: dict) -> Optional[str]:
    """Build the image download URL from attachment data."""
    attachments = submission.get("_attachments", [])
    if attachments:
        return attachments[0].get("download_url")
    return None


def _enrich_submission(sub: dict) -> dict:
    """
    Map raw KoboToolbox submission fields to a clean frontend-friendly dict.
    Supports BOTH the legacy GEO AI Complaint form fields AND the new
    Illegal Shop Detection form fields — whichever are present.
    """
    # --- GPS ---
    # New form: GPS_Location field
    lat, lon = _parse_gps(sub.get("GPS_Location") or sub.get("Location"))
    geo = sub.get("_geolocation", [None, None])
    if lat is None and geo and len(geo) >= 2:
        lat, lon = geo[0], geo[1]

    # --- Core identity fields (new form first, legacy fallback) ---
    inspector_name   = sub.get("Inspector_Name") or sub.get("Name", "")
    inspector_id     = sub.get("Inspector_ID", "")
    municipality_zone = sub.get("Municipality_Zone", "")
    shop_name        = sub.get("Shop_Name", "")
    shop_owner_name  = sub.get("Shop_Owner_Name", "")
    contact_number   = sub.get("Contact_Number", "")
    license_number   = sub.get("License_Number", "")
    violation_type   = (
        sub.get("Violation_Type")
        or sub.get("Disaster_Name")
        or "Unknown"
    )
    violation_description = sub.get("Violation_Description", "")
    action_taken     = sub.get("Action_Taken", "")
    inspection_date  = (
        sub.get("Inspection_Date")
        or sub.get("Enter_a_date")
    )
    inspection_time  = (
        sub.get("Inspection_Time")
        or sub.get("Enter_a_time")
    )

    return {
        # Meta
        "id":                  sub.get("_id"),
        "uuid":                sub.get("_uuid"),
        "submission_time":     sub.get("_submission_time"),
        "submitted_by":        sub.get("_submitted_by"),
        "status":              sub.get("_status"),
        "validation_status":   sub.get("_validation_status", {}),
        "tags":                sub.get("_tags", []),
        "notes":               sub.get("_notes", []),
        "attachments":         sub.get("_attachments", []),

        # Inspector
        "inspector_name":      inspector_name,
        "inspector_id":        inspector_id,
        "municipality_zone":   municipality_zone,

        # Shop details
        "shop_name":           shop_name,
        "shop_owner_name":     shop_owner_name,
        "contact_number":      contact_number,
        "license_number":      license_number,

        # Violation
        "violation_type":      violation_type,
        "violation_description": violation_description,
        "action_taken":        action_taken,

        # Location
        "latitude":            lat,
        "longitude":           lon,
        "location_raw":        sub.get("GPS_Location") or sub.get("Location"),

        # Date / Time
        "inspection_date":     inspection_date,
        "inspection_time":     inspection_time,

        # Media
        "image_url":           _build_image_url(sub),
        "image_filename":      (
            sub.get("Evidence_Photo")
            or sub.get("Click_a_Photo")
        ),

        # Legacy aliases kept for backwards compat with existing UI code
        "reporter_name":       inspector_name,
        "disaster_type":       violation_type,
        "incident_date":       inspection_date,
        "incident_time":       inspection_time,

        # Raw payload (debugging)
        "_raw": sub,
    }


# ============= Routes =============

@router.get("/sync-status")
async def get_sync_status_endpoint(
    current_user: User = Depends(get_current_admin_user),
):
    """Return last auto-sync result and whether auto-sync is enabled."""
    from src.routes.kobo import _last_sync
    return {
        "auto_sync_enabled": True,
        "interval_seconds": 120,
        "last_sync_time": _last_sync.get("time"),
        "last_created": _last_sync.get("created", 0),
        "last_skipped": _last_sync.get("skipped", 0),
        "last_error": _last_sync.get("error"),
        "kobo_asset_uid": settings.KOBO_ASSET_UID,
    }


@router.get("/attachment-proxy")
async def proxy_attachment(
    url: str = Query(..., description="KoboToolbox attachment download URL"),
    current_user: User = Depends(get_current_admin_user),
):
    """Proxy a KoboToolbox attachment with the API token so the browser can display it."""
    from fastapi.responses import StreamingResponse
    import re
    if not re.match(r'https://(kf|kc|ee)\.kobotoolbox\.org/', url):
        raise HTTPException(status_code=400, detail="Only KoboToolbox URLs are allowed")
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers=KOBO_HEADERS)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Failed to fetch attachment")
    content_type = resp.headers.get("content-type", "image/jpeg")
    return StreamingResponse(
        iter([resp.content]),
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/submissions")
async def get_kobo_submissions(
    limit: int = Query(100, ge=1, le=10000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Fetch all submissions from the KoboToolbox 'Illegal Shop Detection' form.
    Returns enriched data with all parsed fields. Admin only.
    """
    if not settings.KOBO_API_TOKEN or not settings.KOBO_ASSET_UID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="KoboToolbox integration is not configured (missing token or asset UID)"
        )

    url = _get_kobo_url(f"assets/{settings.KOBO_ASSET_UID}/data/")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            url,
            headers=KOBO_HEADERS,
            params={"limit": limit, "start": offset, "format": "json"},
        )

    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="Invalid KoboToolbox API token")
    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="KoboToolbox form asset not found")
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"KoboToolbox API error: {response.status_code}"
        )

    data = response.json()
    results = data.get("results", [])
    enriched = [_enrich_submission(sub) for sub in results]

    return {
        "count": data.get("count", len(results)),
        "next": data.get("next"),
        "previous": data.get("previous"),
        "asset_uid": settings.KOBO_ASSET_UID,
        "results": enriched,
    }


@router.get("/forms/{asset_uid}")
async def get_kobo_form_definition(
    asset_uid: str,
    current_user: User = Depends(get_current_admin_user),
):
    """Get the form definition (survey structure) from KoboToolbox. Admin only."""
    if not settings.KOBO_API_TOKEN:
        raise HTTPException(status_code=503, detail="KoboToolbox not configured")

    url = _get_kobo_url(f"assets/{asset_uid}/")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=KOBO_HEADERS)

    if response.status_code == 200:
        data = response.json()
        return {
            "uid": data.get("uid"),
            "name": data.get("name"),
            "content": data.get("content"),
        }
    else:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Failed to get form: {response.text}"
        )


@router.delete("/data")
async def clear_kobo_data(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Delete all complaints that were synced from KoboToolbox. Admin only."""
    deleted_count = db.query(Complaint).filter(Complaint.kobo_submission_id.isnot(None)).delete()
    db.commit()
    return {"message": f"Deleted {deleted_count} Kobo-synced shop reports"}


@router.post("/sync")
async def sync_kobo_to_db(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Sync KoboToolbox submissions into the local complaints table.
    Maps Illegal Shop Detection form fields to the Complaint model.
    Skips submissions already imported (matched by kobo_submission_id).
    Admin only.
    """
    if not settings.KOBO_API_TOKEN or not settings.KOBO_ASSET_UID:
        raise HTTPException(status_code=503, detail="KoboToolbox not configured")

    url = _get_kobo_url(f"assets/{settings.KOBO_ASSET_UID}/data/")

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(
            url, headers=KOBO_HEADERS, params={"limit": 10000, "format": "json"}
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"KoboToolbox API error: {response.status_code}"
        )

    submissions = response.json().get("results", [])
    created_count = 0
    skipped_count = 0

    admin_user = db.query(User).filter(User.id == current_user.id).first()

    for sub in submissions:
        kobo_id = str(sub.get("_id", ""))
        if not kobo_id:
            continue

        # Skip already synced submissions
        existing = db.query(Complaint).filter(
            Complaint.kobo_submission_id == kobo_id
        ).first()
        if existing:
            skipped_count += 1
            continue

        # Use the shared enrichment helper for consistent field parsing
        enriched = _enrich_submission(sub)

        lat = enriched["latitude"]
        lon = enriched["longitude"]

        # Parse inspection/incident date
        incident_date = None
        date_str = enriched["inspection_date"]
        if date_str:
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
                try:
                    incident_date = datetime.strptime(date_str, fmt)
                    break
                except ValueError:
                    continue

        inspector_name  = enriched["inspector_name"] or "Unknown Inspector"
        violation_type  = enriched["violation_type"] or "Unknown"
        shop_name       = enriched["shop_name"] or "Unknown Shop"
        municipality_zone = enriched["municipality_zone"] or ""
        action_taken    = enriched["action_taken"] or ""

        # Build a descriptive title and description
        title = f"Illegal Shop: {shop_name} — {violation_type}"
        description = (
            f"Inspector: {inspector_name} (ID: {enriched['inspector_id']})\n"
            f"Shop Name: {shop_name}\n"
            f"Owner: {enriched['shop_owner_name']}\n"
            f"Contact: {enriched['contact_number']}\n"
            f"License No.: {enriched['license_number']}\n"
            f"Municipality Zone: {municipality_zone}\n"
            f"Violation: {violation_type}\n"
            f"Details: {enriched['violation_description']}\n"
            f"Action Taken: {action_taken}\n"
            f"Submitted via KoboToolbox on {sub.get('_submission_time', 'unknown date')}"
        )

        complaint = Complaint(
            user_id=admin_user.id,
            title=title,
            description=description,
            disaster_type=violation_type,       # reused field → violation type
            latitude=lat,
            longitude=lon,
            location_name=municipality_zone or enriched["location_raw"],
            incident_date=incident_date,
            image_url=enriched["image_url"],
            kobo_submission_id=kobo_id,
            status=ComplaintStatus.SUBMITTED,
            severity="Medium",
        )

        db.add(complaint)
        created_count += 1

    db.commit()

    return {
        "message": "Sync complete",
        "created": created_count,
        "skipped": skipped_count,
        "total_in_kobo": len(submissions),
    }


@router.get("/forms")
async def list_kobo_forms(
    current_user: User = Depends(get_current_admin_user),
):
    """List all KoboToolbox forms/assets available for this API token. Admin only."""
    if not settings.KOBO_API_TOKEN:
        raise HTTPException(status_code=503, detail="KoboToolbox not configured")

    url = _get_kobo_url("assets/")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            url,
            headers=KOBO_HEADERS,
            params={"format": "json", "asset_type": "survey"},
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"KoboToolbox API error: {response.status_code}"
        )

    data = response.json()
    forms = [
        {
            "uid":               a.get("uid"),
            "name":              a.get("name"),
            "asset_type":        a.get("asset_type"),
            "deployment_status": a.get("deployment_status"),
            "submission_count":  a.get("deployment__submission_count", 0),
            "last_submission":   a.get("deployment__last_submission_time"),
            "owner":             a.get("owner_label"),
        }
        for a in data.get("results", [])
    ]

    return {"count": len(forms), "forms": forms}


@router.post("/forms/{asset_uid}/submit")
async def submit_to_kobo_form(
    asset_uid: str,
    submission_data: dict,
    current_user: User = Depends(get_current_user),
):
    """Submit data to a KoboToolbox form."""
    if not settings.KOBO_API_TOKEN:
        raise HTTPException(status_code=503, detail="KoboToolbox not configured")

    url = _get_kobo_url(f"assets/{asset_uid}/submissions/")
    submission_data["_submitted_by"] = current_user.username

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=KOBO_HEADERS, json=submission_data)

    if response.status_code == 201:
        return response.json()
    else:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Submission failed: {response.text}"
        )


@router.post("/forms")
async def create_kobo_form(
    form_data: dict,
    current_user: User = Depends(get_current_admin_user),
):
    """
    Create a new KoboToolbox form/asset. Admin only.
    Expects: { name: str, content: { survey: [...], settings: {...} } }
    """
    if not settings.KOBO_API_TOKEN:
        raise HTTPException(status_code=503, detail="KoboToolbox not configured")

    url = _get_kobo_url("assets/")
    payload = {
        "asset_type": "survey",
        "name": form_data.get("name", "Untitled Form"),
        "content": form_data.get("content", {}),
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=KOBO_HEADERS, json=payload)

    if response.status_code in (200, 201):
        data = response.json()
        return {
            "uid":               data.get("uid"),
            "name":              data.get("name"),
            "asset_type":        data.get("asset_type"),
            "deployment_status": data.get("deployment_status"),
            "url":               data.get("url"),
        }
    else:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Failed to create form in KoboToolbox: {response.text}"
        )


@router.patch("/forms/{asset_uid}")
async def update_kobo_form(
    asset_uid: str,
    form_data: dict,
    current_user: User = Depends(get_current_admin_user),
):
    """Update an existing KoboToolbox form's name and/or content. Admin only."""
    if not settings.KOBO_API_TOKEN:
        raise HTTPException(status_code=503, detail="KoboToolbox not configured")

    url = _get_kobo_url(f"assets/{asset_uid}/")
    payload = {}
    if "name" in form_data:
        payload["name"] = form_data["name"]
    if "content" in form_data:
        payload["content"] = form_data["content"]

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.patch(url, headers=KOBO_HEADERS, json=payload)

    if response.status_code == 200:
        data = response.json()
        return {
            "uid":     data.get("uid"),
            "name":    data.get("name"),
            "content": data.get("content"),
        }
    else:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Failed to update form: {response.text}"
        )


@router.delete("/forms/{asset_uid}", status_code=204)
async def delete_kobo_form(
    asset_uid: str,
    current_user: User = Depends(get_current_admin_user),
):
    """Delete a KoboToolbox form/asset permanently. Admin only."""
    if not settings.KOBO_API_TOKEN:
        raise HTTPException(status_code=503, detail="KoboToolbox not configured")

    url = _get_kobo_url(f"assets/{asset_uid}/")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.delete(url, headers=KOBO_HEADERS)

    if response.status_code in (200, 204):
        return
    else:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Failed to delete form: {response.text}"
        )
