"""
Seeding script to add 20 more dummy complaints in Madinah.
Run from backend/ directory:
    .\.venv\Scripts\python seed_more_dummy.py
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
from src.models import User, Complaint, ComplaintStatus

def seed_more():
    print("=" * 60)
    print("  GEO AI - Seeding 20 More Dummy Complaints in Madinah")
    print("=" * 60)

    db = SessionLocal()
    try:
        # 1. Fetch inspectors
        inspectors = {}
        for username in ["faisal_otaibi", "ahmed_harbi", "yasmin_qahtani"]:
            user = db.query(User).filter(User.username == username).first()
            if not user:
                print(f"[ERROR] Inspector user {username} not found! Please run seed_inspectors_and_kobo.py first.")
                return
            inspectors[username] = user

        # 2. Define 20 complaints
        more_complaints = [
            {
                "username": "faisal_otaibi",
                "title": "No License: Madinah Special Bakery (مخبز المدينة الخاص)",
                "description": "Bakery operating without a municipal food production license. Unsanitary preparation counters observed.",
                "disaster_type": "No License",
                "latitude": 24.4601,
                "longitude": 39.6102,
                "location_name": "Quba Road",
                "kobo_submission_id": "kobo-more-faisal-1",
                "status": ComplaintStatus.SUBMITTED,
                "severity": "High"
              },
              {
                "username": "ahmed_harbi",
                "title": "Expired License: Riyadh Carpentry Workshop (ورشة نجارة الرياض)",
                "description": "Carpentry workshop with license expired for over 8 months. High dust emissions, no proper suction system.",
                "disaster_type": "Expired License",
                "latitude": 24.4485,
                "longitude": 39.5854,
                "location_name": "Khalid bin Al Walid Road",
                "kobo_submission_id": "kobo-more-ahmed-1",
                "status": ComplaintStatus.UNDER_REVIEW,
                "severity": "Medium"
              },
              {
                "username": "yasmin_qahtani",
                "title": "Illegal Construction: Unapproved Car Wash Canopy",
                "description": "Commercial building owner constructed a large metal wash canopy directly on the public easement without authorization.",
                "disaster_type": "Illegal Construction",
                "latitude": 24.4922,
                "longitude": 39.6205,
                "location_name": "King Abdullah Road",
                "kobo_submission_id": "kobo-more-yasmin-1",
                "status": ComplaintStatus.ACKNOWLEDGED,
                "severity": "Low"
              },
              {
                "username": "faisal_otaibi",
                "title": "Health Violation: Al-Fanoos Cafeteria (بوفية الفانوس)",
                "description": "Inspector: Faisal Al-Otaibi. Critical hygiene failure: uncooked meats stored next to ready-to-eat vegetables in active fridge.",
                "disaster_type": "Health Violation",
                "latitude": 24.4754,
                "longitude": 39.6380,
                "location_name": "Airport Road",
                "kobo_submission_id": "kobo-more-faisal-2",
                "status": ComplaintStatus.UNDER_REVIEW,
                "severity": "Critical"
              },
              {
                "username": "ahmed_harbi",
                "title": "Zoning Violation: Scrap Yard in Residential Block",
                "description": "Commercial scrap collector storing scrap metal and industrial debris in a residential zoned plot. Causing eyesore and pest issues.",
                "disaster_type": "Zoning Violation",
                "latitude": 24.5105,
                "longitude": 39.6412,
                "location_name": "Prince Nayef bin Abdulaziz Road",
                "kobo_submission_id": "kobo-more-ahmed-2",
                "status": ComplaintStatus.SUBMITTED,
                "severity": "High"
              },
              {
                "username": "yasmin_qahtani",
                "title": "Fire Safety: Stored Gas Cylinders Next to Bakery Oven",
                "description": "Highly dangerous storage setup. Over 10 commercial LPG tanks stored indoors within 2 meters of open flame bakery ovens.",
                "disaster_type": "Fire Safety",
                "latitude": 24.4532,
                "longitude": 39.5988,
                "location_name": "Abu Bakr Al Siddiq Road",
                "kobo_submission_id": "kobo-more-yasmin-2",
                "status": ComplaintStatus.SUBMITTED,
                "severity": "Critical"
              },
              {
                "username": "faisal_otaibi",
                "title": "No License: Al-Khaleej Laundromat (مغسلة الخليج)",
                "description": "Laundromat operating under unregistered entity name with no municipal business permit. Waste water leaking onto public road.",
                "disaster_type": "No License",
                "latitude": 24.4678,
                "longitude": 39.5699,
                "location_name": "Prince Abdulmajeed Road",
                "kobo_submission_id": "kobo-more-faisal-3",
                "status": ComplaintStatus.ACKNOWLEDGED,
                "severity": "Medium"
              },
              {
                "username": "ahmed_harbi",
                "title": "Expired License: Fast Food Corner (ركن الوجبات السريعة)",
                "description": "Licence expired. General sanitation is poor. Handwash sink lacks hot water or sanitizing soap.",
                "disaster_type": "Expired License",
                "latitude": 24.4841,
                "longitude": 39.6210,
                "location_name": "King Fahd Road",
                "kobo_submission_id": "kobo-more-ahmed-3",
                "status": ComplaintStatus.RESOLVED,
                "severity": "Low"
              },
              {
                "username": "yasmin_qahtani",
                "title": "Illegal Construction: Sidewalk Commercial Booth Extension",
                "description": "Sweets shop added a permanent brick-and-mortar storefront extension extending 1.5 meters into the municipal sidewalk.",
                "disaster_type": "Illegal Construction",
                "latitude": 24.4712,
                "longitude": 39.6015,
                "location_name": "Sultana Road",
                "kobo_submission_id": "kobo-more-yasmin-3",
                "status": ComplaintStatus.UNDER_REVIEW,
                "severity": "High"
              },
              {
                "username": "faisal_otaibi",
                "title": "Health Violation: Premium Shawarma (شاورما فاخرة)",
                "description": "Insects detected in dry storage room. Food preparation surfaces are scratched wood instead of non-porous steel/plastic.",
                "disaster_type": "Health Violation",
                "latitude": 24.4799,
                "longitude": 39.6095,
                "location_name": "Sultana Road",
                "kobo_submission_id": "kobo-more-faisal-4",
                "status": ComplaintStatus.SUBMITTED,
                "severity": "Critical"
              },
              {
                "username": "ahmed_harbi",
                "title": "Zoning Violation: Chemical Warehouse Near School",
                "description": "Commercial chemical storage facility handling combustible paints and solvents situated directly adjacent to an elementary school.",
                "disaster_type": "Zoning Violation",
                "latitude": 24.4325,
                "longitude": 39.6022,
                "location_name": "Quba Road",
                "kobo_submission_id": "kobo-more-ahmed-4",
                "status": ComplaintStatus.SUBMITTED,
                "severity": "Critical"
              },
              {
                "username": "yasmin_qahtani",
                "title": "Fire Safety: Extinguishers Expired at Supermarket",
                "description": "Supermarket has 8 portable fire extinguishers; all inspection tags show expirations ranging from 2021 to 2023.",
                "disaster_type": "Fire Safety",
                "latitude": 24.4890,
                "longitude": 39.5910,
                "location_name": "Khalid bin Al Walid Road",
                "kobo_submission_id": "kobo-more-yasmin-4",
                "status": ComplaintStatus.ACKNOWLEDGED,
                "severity": "Medium"
              },
              {
                "username": "faisal_otaibi",
                "title": "No License: Specialized Barber Shop (صالون الحلاقة المميز)",
                "description": "Barber shop operating without registration. Razors and tools reused without sterilization. Fined and warned.",
                "disaster_type": "No License",
                "latitude": 24.4566,
                "longitude": 39.5788,
                "location_name": "Abu Bakr Al Siddiq Road",
                "kobo_submission_id": "kobo-more-faisal-5",
                "status": ComplaintStatus.RESOLVED,
                "severity": "Low"
              },
              {
                "username": "ahmed_harbi",
                "title": "Expired License: Auto Repair Workshop (ورشة السيارات)",
                "description": "Auto mechanic shop operating with expired license for 6 months. Engine oil dumped directly into municipal sewage drain.",
                "disaster_type": "Expired License",
                "latitude": 24.5020,
                "longitude": 39.6350,
                "location_name": "Prince Nayef bin Abdulaziz Road",
                "kobo_submission_id": "kobo-more-ahmed-5",
                "status": ComplaintStatus.UNDER_REVIEW,
                "severity": "Medium"
              },
              {
                "username": "yasmin_qahtani",
                "title": "Illegal Construction: Unauthorized Roof Cafe Seating",
                "description": "Cafe converted building roof space into full commercial terrace dining without structural load permits or safety barriers.",
                "disaster_type": "Illegal Construction",
                "latitude": 24.4750,
                "longitude": 39.6150,
                "location_name": "Sultana Road",
                "kobo_submission_id": "kobo-more-yasmin-6",
                "status": ComplaintStatus.SUBMITTED,
                "severity": "High"
              },
              {
                "username": "faisal_otaibi",
                "title": "Health Violation: Sweet & Pastries Palace (قصر الحلويات)",
                "description": "Sweet production facility. Staff not wearing hairnets or gloves. Active flies inside kitchen and prep areas.",
                "disaster_type": "Health Violation",
                "latitude": 24.4815,
                "longitude": 39.6302,
                "location_name": "Airport Road",
                "kobo_submission_id": "kobo-more-faisal-6",
                "status": ComplaintStatus.SUBMITTED,
                "severity": "High"
              },
              {
                "username": "ahmed_harbi",
                "title": "Zoning Violation: Heavy Steel Fabrication in Residential Area",
                "description": "Steel factory operating heavy cutters and weld rigs at night in neighborhood. Decibel levels exceed residential legal limits.",
                "disaster_type": "Zoning Violation",
                "latitude": 24.4410,
                "longitude": 39.5790,
                "location_name": "Khalid bin Al Walid Road",
                "kobo_submission_id": "kobo-more-ahmed-6",
                "status": ComplaintStatus.ACKNOWLEDGED,
                "severity": "High"
              },
              {
                "username": "yasmin_qahtani",
                "title": "Fire Safety: Blocked Hydrant and Blocked Exit at Mall Store",
                "description": "Main retail loading bay blockading municipal fire hydrant connection. Rear emergency exit door chained shut.",
                "disaster_type": "Fire Safety",
                "latitude": 24.4988,
                "longitude": 39.6180,
                "location_name": "King Abdullah Road",
                "kobo_submission_id": "kobo-more-yasmin-7",
                "status": ComplaintStatus.UNDER_REVIEW,
                "severity": "Critical"
              },
              {
                "username": "faisal_otaibi",
                "title": "No License: Al-Rawda Mini-Market (بقالة الروضة)",
                "description": "Small grocery store selling imported processed foods with no commercial registration or municipal shop certificate.",
                "disaster_type": "No License",
                "latitude": 24.4690,
                "longitude": 39.6450,
                "location_name": "King Fahd Road",
                "kobo_submission_id": "kobo-more-faisal-7",
                "status": ComplaintStatus.SUBMITTED,
                "severity": "Medium"
              },
              {
                "username": "ahmed_harbi",
                "title": "Expired License: Fresh Juice Corner (عصير الطازج)",
                "description": "Juice bar license expired. Found to be sourcing water from undocumented well. Fined and license suspended.",
                "disaster_type": "Expired License",
                "latitude": 24.4615,
                "longitude": 39.6255,
                "location_name": "Quba Road",
                "kobo_submission_id": "kobo-more-ahmed-7",
                "status": ComplaintStatus.RESOLVED,
                "severity": "Low"
              }
        ]

        for c_data in more_complaints:
            existing = db.query(Complaint).filter(Complaint.kobo_submission_id == c_data["kobo_submission_id"]).first()
            if existing:
                print(f"[!] Already seeded: {c_data['kobo_submission_id']}")
            else:
                user = inspectors[c_data["username"]]
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
                print(f"[OK] Added: {c_data['title']}")

        db.commit()
        print("\n[SUCCESS] Seeded 20 extra complaints successfully!")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_more()
