"""
Seeding script - creates dummy Field Inspector users and Kobo-style complaints.
Run from the backend/ directory:
    .\.venv\Scripts\python seed_inspectors_and_kobo.py
"""
import sys
import os
from datetime import datetime

# Force UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure src package is importable
sys.path.insert(0, os.path.dirname(__file__))

from src.database import SessionLocal
from src.models import User, UserRole, Complaint, ComplaintStatus
from src.security import hash_password
from sqlalchemy import text

def seed_data():
    print("=" * 60)
    print("  GEO AI - Seeding Field Inspectors & Kobo Complaints")
    print("=" * 60)

    db = SessionLocal()
    try:
        # Ensure Postgres enum has the new roles
        roles_to_add = [
            "SUPER_ADMIN", "MUNICIPALITY_ADMIN", "SUPERVISOR", "FIELD_INSPECTOR", "AUDITOR", "OPERATOR",
            "super_admin", "municipality_admin", "supervisor", "field_inspector", "auditor", "operator"
        ]
        for role_val in roles_to_add:
            try:
                # ALTER TYPE ... ADD VALUE cannot run inside a transaction block in PostgreSQL
                # So we commit/rollback carefully or run with autocommit
                db.execute(text(f"ALTER TYPE userrole ADD VALUE '{role_val}'"))
                db.commit()
                print(f"[OK] Added value {role_val} to userrole enum in database")
            except Exception as enum_err:
                db.rollback()
                # Ignore duplicate or already exists errors

        # 1. Define dummy field inspectors
        inspectors_data = [
            {
                "email": "f.otaibi@madinah.gov.sa",
                "username": "faisal_otaibi",
                "full_name": "فيصل بن نايف العتيبي (Faisal Al-Otaibi)",
                "role": UserRole.FIELD_INSPECTOR,
                "phone": "+966 56 444 3322",
                "organization": "Field Operations"
            },
            {
                "email": "a.harbi@madinah.gov.sa",
                "username": "ahmed_harbi",
                "full_name": "أحمد بن خالد الحربي (Ahmed Al-Harbi)",
                "role": UserRole.FIELD_INSPECTOR,
                "phone": "+966 50 123 4567",
                "organization": "Municipal Inspections"
            },
            {
                "email": "y.qahtani@madinah.gov.sa",
                "username": "yasmin_qahtani",
                "full_name": "ياسمين بنت محمد القحطاني (Yasmin Al-Qahtani)",
                "role": UserRole.FIELD_INSPECTOR,
                "phone": "+966 54 987 6543",
                "organization": "Compliance & Audit"
            }
        ]

        inspector_users = {}
        for data in inspectors_data:
            existing = db.query(User).filter(User.email == data["email"]).first()
            if existing:
                print(f"[!] User already exists: {data['email']}")
                inspector_users[data["username"]] = existing
            else:
                user = User(
                    email=data["email"],
                    username=data["username"],
                    full_name=data["full_name"],
                    hashed_password=hash_password("Inspector@2024"),
                    role=data["role"],
                    phone=data["phone"],
                    organization=data["organization"],
                    is_active=True
                )
                db.add(user)
                db.flush() # get user.id
                print(f"[OK] Created Inspector: {data['full_name']}")
                inspector_users[data["username"]] = user

        # 2. Define dummy complaints for each inspector in Madinah
        complaints_data = [
            # Faisal's complaints
            {
                "username": "faisal_otaibi",
                "title": "No License: Supermarket Al-Cayan (سوبرماركت الكيان)",
                "description": "Inspector: Faisal Al-Otaibi\nShop operating without a valid municipal license. Outdoor display encroaching on the pedestrian sidewalk.",
                "disaster_type": "No License",
                "latitude": 24.4582,
                "longitude": 39.6081,
                "location_name": "Quba Road (طريق قباء)",
                "kobo_submission_id": "kobo-dummy-faisal-1",
                "status": ComplaintStatus.SUBMITTED,
                "severity": "High"
            },
            {
                "username": "faisal_otaibi",
                "title": "Expired License: Al-Baik Restaurant (مطعم البيك)",
                "description": "Inspector: Faisal Al-Otaibi\nCommercial license expired 3 months ago. Repeated warnings ignored by management.",
                "disaster_type": "Expired License",
                "latitude": 24.4725,
                "longitude": 39.5954,
                "location_name": "Prince Abdulmajeed Road",
                "kobo_submission_id": "kobo-dummy-faisal-2",
                "status": ComplaintStatus.UNDER_REVIEW,
                "severity": "Medium"
            },
            # Ahmed's complaints
            {
                "username": "ahmed_harbi",
                "title": "Illegal Construction: Extension on King Abdullah Road",
                "description": "Inspector: Ahmed Al-Harbi\nBuilding owner added a steel-frame outdoor shop extension without planning permission or safety review.",
                "disaster_type": "Illegal Construction",
                "latitude": 24.4912,
                "longitude": 39.6105,
                "location_name": "King Abdullah Road",
                "kobo_submission_id": "kobo-dummy-ahmed-1",
                "status": ComplaintStatus.ACKNOWLEDGED,
                "severity": "Critical"
            },
            {
                "username": "ahmed_harbi",
                "title": "Health Violation: Al-Saddah Kitchens (مطابخ السدة)",
                "description": "Inspector: Ahmed Al-Harbi\nCritical health violation: food preparation area exposed to outdoor pollution; improper waste storage.",
                "disaster_type": "Health Violation",
                "latitude": 24.4824,
                "longitude": 39.6351,
                "location_name": "Airport Road",
                "kobo_submission_id": "kobo-dummy-ahmed-2",
                "status": ComplaintStatus.SUBMITTED,
                "severity": "High"
            },
            # Yasmin's complaints
            {
                "username": "yasmin_qahtani",
                "title": "Zoning Violation: Industrial Warehouse in Residential Zone",
                "description": "Inspector: Yasmin Al-Qahtani\nCommercial metal warehouse operating in a strictly residential neighborhood. High noise levels from heavy machinery.",
                "disaster_type": "Zoning Violation",
                "latitude": 24.4705,
                "longitude": 39.5801,
                "location_name": "Khalid bin Al Walid Road",
                "kobo_submission_id": "kobo-dummy-yasmin-1",
                "status": ComplaintStatus.SUBMITTED,
                "severity": "High"
            },
            {
                "username": "yasmin_qahtani",
                "title": "Fire Safety: Blocked Emergency Exits at Commercial Center",
                "description": "Inspector: Yasmin Al-Qahtani\nRear emergency exits blocked with cardboard boxes and furniture. Significant fire hazard.",
                "disaster_type": "Fire Safety",
                "latitude": 24.4651,
                "longitude": 39.5752,
                "location_name": "Abu Bakr Al Siddiq Road",
                "kobo_submission_id": "kobo-dummy-yasmin-2",
                "status": ComplaintStatus.RESOLVED,
                "severity": "Critical"
            }
        ]

        for c_data in complaints_data:
            existing_c = db.query(Complaint).filter(Complaint.kobo_submission_id == c_data["kobo_submission_id"]).first()
            if existing_c:
                print(f"[!] Complaint already exists: {c_data['kobo_submission_id']}")
            else:
                user = inspector_users.get(c_data["username"])
                if not user:
                    continue
                complaint = Complaint(
                    user_id=user.id,
                    title=c_data["title"],
                    description=c_data["description"],
                    disaster_type=c_data["disaster_type"],
                    latitude=c_data["latitude"],
                    longitude=c_data["longitude"],
                    location_name=c_data["location_name"],
                    kobo_submission_id=c_data["kobo_submission_id"],
                    status=c_data["status"],
                    severity=c_data["severity"],
                    incident_date=datetime.utcnow()
                )
                db.add(complaint)
                print(f"[OK] Seeded Complaint: {c_data['title']} for {user.full_name}")

        db.commit()
        print("\n[SUCCESS] Seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
