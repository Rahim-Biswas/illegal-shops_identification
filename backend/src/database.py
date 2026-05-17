"""
Database connection and session management (PostgreSQL).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from src.config import settings
from src.models import Base

# Create PostgreSQL engine with connection pooling
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,       # Verify connections before use
    pool_size=10,             # Number of persistent connections
    max_overflow=20,          # Max extra connections beyond pool_size
    pool_recycle=3600,        # Recycle connections after 1 hour
    echo=settings.DEBUG,      # Log SQL in debug mode
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """
    Dependency to get database session.
    Usage: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_default_admin():
    """
    Ensure the default super-admin account exists in the database.
    Called automatically on every startup — safe to run multiple times
    because it only inserts when the email is not already present.
    """
    # Import here to avoid circular imports at module load time
    from src.models import User, UserRole
    from passlib.context import CryptContext

    _pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

    ADMIN_EMAIL    = "admin@geoai.com"
    ADMIN_USERNAME = "superadmin"
    ADMIN_FULLNAME = "Super Admin"
    ADMIN_PASSWORD = "GeoAdmin@2024"

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if not existing:
            admin = User(
                email=ADMIN_EMAIL,
                username=ADMIN_USERNAME,
                full_name=ADMIN_FULLNAME,
                hashed_password=_pwd_context.hash(ADMIN_PASSWORD),
                is_active=True,
                role=UserRole.SUPER_ADMIN,
            )
            db.add(admin)
            db.commit()
            print(f"[startup] ✅  Default super-admin created  → {ADMIN_EMAIL}")
        else:
            print(f"[startup] ℹ️   Super-admin already exists  → {ADMIN_EMAIL}")
    except Exception as exc:
        db.rollback()
        print(f"[startup] ❌  Failed to seed super-admin: {exc}")
    finally:
        db.close()


def init_db():
    """Initialize database tables and seed the default super-admin."""
    Base.metadata.create_all(bind=engine)
    seed_default_admin()
