"""
Main FastAPI application for Municipality GeoAI Enforcement Platform.
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from src.config import settings
from src.database import init_db, get_db
from src.routes import auth, users, complaints
from src.routes import kobo
from src.routes import minio_routes, ocr_routes
from src.routes import yolo_routes
from src.routes import data_files
import httpx
from datetime import datetime

logger = logging.getLogger("kobo_autosync")

# Initialize database
init_db()


def _parse_gps(loc):
    """Parse 'lat lon alt acc' string into (lat, lon)."""
    if not loc:
        return None, None
    parts = str(loc).strip().split()
    try:
        return float(parts[0]), float(parts[1])
    except (IndexError, ValueError):
        return None, None


def _build_image_url(sub: dict):
    att = sub.get("_attachments", [])
    return att[0].get("download_url") if att else None


async def _run_kobo_sync():
    """
    Pull new submissions from the Illegal Shop Detection KoboToolbox form
    and insert them into the local database.
    Returns (created, skipped) counts.
    """
    from src.models import Complaint, ComplaintStatus
    from sqlalchemy import text

    url = f"{settings.KOBO_API_URL.rstrip('/')}/assets/{settings.KOBO_ASSET_UID}/data/"
    headers = {
        "Authorization": f"Token {settings.KOBO_API_TOKEN}",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=headers, params={"limit": 10000, "format": "json"})

    if response.status_code != 200:
        logger.warning(f"KoboToolbox API returned {response.status_code}")
        return 0, 0

    submissions = response.json().get("results", [])
    created = skipped = 0

    db = next(get_db())
    try:
        # Get admin user id via raw SQL to avoid enum cast issues
        row = db.execute(text("SELECT id FROM users WHERE email='admin@geoai.com' LIMIT 1")).fetchone()
        if not row:
            row = db.execute(text("SELECT id FROM users LIMIT 1")).fetchone()
        if not row:
            logger.error("No user found for Kobo sync")
            return 0, 0
        admin_id = row[0]

        for sub in submissions:
            kobo_id = str(sub.get("_id", ""))
            if not kobo_id:
                continue

            existing = db.query(Complaint).filter(Complaint.kobo_submission_id == kobo_id).first()
            if existing:
                skipped += 1
                continue

            # --- Parse fields (new Illegal Shop Detection form) ---
            lat, lon = _parse_gps(sub.get("GPS_Location") or sub.get("Location"))
            geo = sub.get("_geolocation", [None, None])
            if lat is None and geo and len(geo) >= 2:
                lat, lon = geo[0], geo[1]

            incident_date = None
            date_str = sub.get("Inspection_Date") or sub.get("Enter_a_date")
            if date_str:
                for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
                    try:
                        incident_date = datetime.strptime(date_str, fmt)
                        break
                    except ValueError:
                        continue

            inspector   = sub.get("Inspector_Name") or sub.get("Name", "Unknown Inspector")
            shop        = sub.get("Shop_Name", "Unknown Shop")
            violation   = sub.get("Violation_Type") or sub.get("Disaster_Name", "Unknown")
            owner       = sub.get("Shop_Owner_Name", "")
            contact     = sub.get("Contact_Number", "")
            license_no  = sub.get("License_Number", "")
            zone        = sub.get("Municipality_Zone", "")
            action      = sub.get("Action_Taken", "")
            vdesc       = sub.get("Violation_Description", "")
            insp_id     = sub.get("Inspector_ID", "")

            description = (
                f"Inspector: {inspector} (ID: {insp_id})\n"
                f"Shop: {shop}\nOwner: {owner}\nContact: {contact}\n"
                f"License: {license_no}\nZone: {zone}\n"
                f"Violation: {violation}\nDetails: {vdesc}\nAction: {action}\n"
                f"Submitted via KoboToolbox on {sub.get('_submission_time', '')}"
            )

            complaint = Complaint(
                user_id=admin_id,
                title=f"Illegal Shop: {shop} — {violation}",
                description=description,
                disaster_type=violation,
                latitude=lat,
                longitude=lon,
                location_name=zone,
                incident_date=incident_date,
                image_url=_build_image_url(sub),
                kobo_submission_id=kobo_id,
                status=ComplaintStatus.SUBMITTED,
                severity="Medium",
            )
            db.add(complaint)
            created += 1

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"DB error during Kobo sync: {e}")
    finally:
        db.close()

    return created, skipped


# ── Auto-sync loop ─────────────────────────────────────────────────────────
SYNC_INTERVAL_SECONDS = 120  # every 2 minutes


async def auto_sync_loop():
    """Continuously pulls new KoboToolbox submissions in the background."""
    logger.info("Auto-sync task started (interval: %ds)", SYNC_INTERVAL_SECONDS)
    await asyncio.sleep(10)   # brief delay so the server finishes starting up
    while True:
        try:
            if settings.KOBO_API_TOKEN and settings.KOBO_ASSET_UID:
                created, skipped = await _run_kobo_sync()
                if created > 0:
                    logger.info(f"[Auto-sync] Imported {created} new shop reports, skipped {skipped}.")
        except Exception as e:
            logger.error(f"[Auto-sync] Unexpected error: {e}")
        await asyncio.sleep(SYNC_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: launch background auto-sync
    task = asyncio.create_task(auto_sync_loop())
    yield
    # Shutdown: cancel gracefully
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="A production-ready backend for disaster complaint management with geospatial capabilities",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============= Health Check =============

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "app": settings.APP_NAME}


# ============= Include Routers =============

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(complaints.router)
app.include_router(kobo.router)
app.include_router(minio_routes.router)
app.include_router(ocr_routes.router)
app.include_router(yolo_routes.router)
app.include_router(data_files.router)


# ============= Error Handlers =============

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """General exception handler for unhandled errors."""
    if settings.DEBUG:
        import traceback
        traceback.print_exc()
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "status_code": 500
        }
    )


# ============= Root Endpoint =============

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "endpoints": {
            "health": "/health",
            "auth": "/api/auth",
            "users": "/api/users",
            "complaints": "/api/complaints"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
