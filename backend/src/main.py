"""
Main FastAPI application for GEO AI Complaint System backend.
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from src.config import settings
from src.database import init_db, get_db
from src.routes import auth, users, complaints
from src.routes import kobo
from sqlalchemy.orm import Session
import httpx
from datetime import datetime

# Initialize database
init_db()

# Background sync task
async def sync_kobo_data():
    """Background task to sync Kobo data every 5 minutes."""
    while True:
        try:
            if settings.KOBO_API_TOKEN and settings.KOBO_ASSET_UID:
                # Get DB session
                db = next(get_db())
                try:
                    # Sync logic here (similar to sync_kobo_to_db)
                    url = f"{settings.KOBO_API_URL.rstrip('/')}/assets/{settings.KOBO_ASSET_UID}/data/"
                    headers = {"Authorization": f"Token {settings.KOBO_API_TOKEN}", "Accept": "application/json"}

                    async with httpx.AsyncClient(timeout=30.0) as client:
                        response = await client.get(url, headers=headers, params={"limit": 1000, "format": "json"})

                    if response.status_code == 200:
                        submissions = response.json().get("results", [])
                        from src.models import Complaint
                        created_count = 0
                        for sub in submissions:
                            kobo_id = str(sub.get("_id", ""))
                            if not kobo_id:
                                continue
                            existing = db.query(Complaint).filter(Complaint.kobo_submission_id == kobo_id).first()
                            if existing:
                                continue
                            # Create complaint (simplified)
                            # You'd need to map fields properly
                            # For now, just count
                            created_count += 1
                        if created_count > 0:
                            print(f"Synced {created_count} new Kobo submissions")
                    db.commit()
                except Exception as e:
                    print(f"Kobo sync error: {e}")
                finally:
                    db.close()
        except Exception as e:
            print(f"Background sync error: {e}")
        await asyncio.sleep(300)  # 5 minutes

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    task = asyncio.create_task(sync_kobo_data())
    yield
    # Shutdown
    task.cancel()

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
