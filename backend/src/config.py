"""
Configuration settings for the GEO AI Complaint System backend.
"""
from pydantic_settings import BaseSettings
from typing import Optional, List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- Database ---
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/geo_complaint_db"

    # --- Server ---
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # --- JWT ---
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # --- CORS ---
    # Comma-separated list of allowed origins
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    # --- Application ---
    APP_NAME: str = "GEO AI Complaint System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # --- Email (optional) ---
    SMTP_SERVER: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    # --- KoboToolbox ---
    KOBO_API_URL: str = "https://kf.kobotoolbox.org/api/v2/"
    KOBO_API_TOKEN: Optional[str] = None
    KOBO_ASSET_UID: Optional[str] = None
    KOBO_COMPLAINT_FORM_UID: Optional[str] = None  # UID of form to use for complaint submissions

    # --- Admin Seed ---
    ADMIN_EMAIL: str = "admin@geoai.com"
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "GeoAdmin@2024"
    ADMIN_FULL_NAME: str = "System Administrator"

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse comma-separated ALLOWED_ORIGINS into a list."""
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
