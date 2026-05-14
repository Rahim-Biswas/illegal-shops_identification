"""
KoboToolbox API integration routes.

Fetches and syncs survey submissions from the 'GEO AI Complaint system' form.
Asset UID: acNYuKP7ZdAigVucAD5eHF

KoboToolbox field mapping:
  _id              → kobo_submission_id
  Name             → reporter name (stored in description)
  Enter_a_date     → incident_date
  Disaster_Name    → disaster_type
  Location         → "lat lon alt accuracy" string → latitude, longitude
  Enter_a_time     → incident time (merged with date)
  Click_a_Photo    → attachment filename → image_url (direct download link)
  _geolocation     → [lat, lon] array
  _submission_time → created_at reference
  _submitted_by    → username
"""
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from src.config import settings
from src.database import get_db
from src.models import Complaint, ComplaintStatus, User
from src.security import get_current_admin_user

router = APIRouter(prefix="/api/kobo", tags=["KoboToolbox"])

KOBO_HEADERS = {
    "Authorization": f"Token {settings.KOBO_API_TOKEN}",
    "Accept": "application/json",
}


def _get_kobo_url(path: str) -> str:
    base = settings.KOBO_API_URL.rstrip("/")
    return f"{base}/{path.lstrip('/')}"


def _parse_location(location_str: Optional[str]) -> tuple[Optional[float], Optional[float]]:
    """Parse KoboToolbox location string 'lat lon alt accuracy' into (lat, lon)."""
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


# ============= Routes =============

@router.get("/submissions")
async def get_kobo_submissions(
    limit: int = Query(100, ge=1, le=10000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Fetch all submissions from the KoboToolbox 'GEO AI Complaint system' form.
    Returns raw KoboToolbox data enriched with parsed fields. Admin only.
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

    # Enrich each result with parsed fields for easier frontend consumption
    enriched = []
    for sub in results:
        lat, lon = _parse_location(sub.get("Location"))
        # Use _geolocation array as fallback
        geo = sub.get("_geolocation", [None, None])
        if lat is None and geo and len(geo) >= 2:
            lat, lon = geo[0], geo[1]

        enriched.append({
            "id": sub.get("_id"),
            "uuid": sub.get("_uuid"),
            "submission_time": sub.get("_submission_time"),
            "submitted_by": sub.get("_submitted_by"),
            "reporter_name": sub.get("Name", ""),
            "incident_date": sub.get("Enter_a_date"),
            "incident_time": sub.get("Enter_a_time"),
            "disaster_type": sub.get("Disaster_Name", "Unknown"),
            "location_raw": sub.get("Location"),
            "latitude": lat,
            "longitude": lon,
            "image_url": _build_image_url(sub),
            "image_filename": sub.get("Click_a_Photo"),
            "status": sub.get("_status"),
            "validation_status": sub.get("_validation_status", {}),
            "tags": sub.get("_tags", []),
            "notes": sub.get("_notes", []),
            "attachments": sub.get("_attachments", []),
            # Raw data for any unmapped fields
            "_raw": sub,
        })

    return {
        "count": data.get("count", len(results)),
        "next": data.get("next"),
        "previous": data.get("previous"),
        "asset_uid": settings.KOBO_ASSET_UID,
        "results": enriched,
    }


@router.get("/submissions/{submission_id}")
async def get_kobo_submission(
    submission_id: int,
    current_user: User = Depends(get_current_admin_user),
):
    """Fetch a single KoboToolbox submission by ID. Admin only."""
    if not settings.KOBO_API_TOKEN or not settings.KOBO_ASSET_UID:
        raise HTTPException(status_code=503, detail="KoboToolbox not configured")

    url = _get_kobo_url(f"assets/{settings.KOBO_ASSET_UID}/data/{submission_id}/")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=KOBO_HEADERS, params={"format": "json"})

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Submission not found")
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"KoboToolbox error: {response.status_code}")

    return response.json()


@router.post("/sync")
async def sync_kobo_to_db(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Sync KoboToolbox submissions into the local complaints table.
    Skips submissions already imported (matched by kobo_submission_id).
    Admin only.
    """
    if not settings.KOBO_API_TOKEN or not settings.KOBO_ASSET_UID:
        raise HTTPException(status_code=503, detail="KoboToolbox not configured")

    url = _get_kobo_url(f"assets/{settings.KOBO_ASSET_UID}/data/")

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(url, headers=KOBO_HEADERS, params={"limit": 10000, "format": "json"})

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"KoboToolbox API error: {response.status_code}")

    submissions = response.json().get("results", [])
    created_count = 0
    skipped_count = 0

    for sub in submissions:
        kobo_id = str(sub.get("_id", ""))
        if not kobo_id:
            continue

        # Skip if already synced
        existing = db.query(Complaint).filter(Complaint.kobo_submission_id == kobo_id).first()
        if existing:
            skipped_count += 1
            continue

        lat, lon = _parse_location(sub.get("Location"))
        geo = sub.get("_geolocation", [None, None])
        if lat is None and geo and len(geo) >= 2:
            lat, lon = geo[0], geo[1]

        # Parse incident date
        incident_date = None
        date_str = sub.get("Enter_a_date")
        if date_str:
            try:
                incident_date = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                pass

        # Get image URL from first attachment
        image_url = _build_image_url(sub)

        reporter_name = sub.get("Name", "Unknown Reporter")
        disaster_type = sub.get("Disaster_Name", "Unknown")

        # Ensure we have an admin user to attach the complaint to
        admin_user = db.query(User).filter(User.id == current_user.id).first()

        complaint = Complaint(
            user_id=admin_user.id,
            title=f"KoboToolbox: {disaster_type} reported by {reporter_name}",
            description=(
                f"Reported by: {reporter_name}\n"
                f"Submitted via KoboToolbox on {sub.get('_submission_time', 'unknown date')}\n"
                f"Submitted by: {sub.get('_submitted_by', 'unknown')}"
            ),
            disaster_type=disaster_type,
            latitude=lat,
            longitude=lon,
            location_name=sub.get("Location"),
            incident_date=incident_date,
            image_url=image_url,
            kobo_submission_id=kobo_id,
            status=ComplaintStatus.SUBMITTED,
            severity="Medium",  # Default severity for KoboToolbox imports
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
    """
    List all KoboToolbox forms/assets available for this API token. Admin only.
    """
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
        raise HTTPException(status_code=502, detail=f"KoboToolbox API error: {response.status_code}")

    data = response.json()
    forms = [
        {
            "uid": a.get("uid"),
            "name": a.get("name"),
            "asset_type": a.get("asset_type"),
            "deployment_status": a.get("deployment_status"),
            "submission_count": a.get("deployment__submission_count", 0),
            "last_submission": a.get("deployment__last_submission_time"),
            "owner": a.get("owner_label"),
        }
        for a in data.get("results", [])
    ]

    return {"count": len(forms), "forms": forms}
