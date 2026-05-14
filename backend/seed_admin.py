"""
Admin seeding script — creates the initial admin user if not already present.

Run from the backend/ directory:
    .\.venv\Scripts\python seed_admin.py
"""
import sys
import os

# Force UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure src package is importable
sys.path.insert(0, os.path.dirname(__file__))

from src.config import settings
from src.database import SessionLocal, init_db
from src.models import User, UserRole
from src.security import hash_password


def seed_admin():
    print("=" * 50)
    print("  GEO AI Complaint System - Admin Seeder")
    print("=" * 50)

    # Initialise DB tables
    init_db()
    print("[OK] Database tables initialised")

    db = SessionLocal()
    try:
        # Check if admin already exists
        existing = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if existing:
            print(f"[!]  Admin user already exists: {settings.ADMIN_EMAIL}")
            print("     To reset, delete the user from the database and re-run.")
            return

        admin_user = User(
            email=settings.ADMIN_EMAIL,
            username=settings.ADMIN_USERNAME,
            full_name=settings.ADMIN_FULL_NAME,
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print("")
        print("[OK] Admin user created successfully!")
        print(f"     Email    : {settings.ADMIN_EMAIL}")
        print(f"     Username : {settings.ADMIN_USERNAME}")
        print(f"     Password : {settings.ADMIN_PASSWORD}")
        print(f"     Role     : {admin_user.role.value}")
        print("")
        print("=" * 50)
        print("  Please change the password after first login.")
        print("=" * 50)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
