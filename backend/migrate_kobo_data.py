"""
1. Show current DB state (complaints count, kobo-synced vs manual)
2. Show new form submissions from KoboToolbox (new UID)
3. Clear all OLD kobo-synced complaints from DB
4. Sync NEW submissions from the new form
"""
import sys
import os
import urllib.request
import json

# ── Add src to path so we can import backend modules ──────────────────────
sys.path.insert(0, os.path.dirname(__file__))

# Load env
from dotenv import load_dotenv
load_dotenv()

from src.database import SessionLocal
from src.models import Complaint, ComplaintStatus, User
from src.config import settings
from datetime import datetime

TOKEN    = settings.KOBO_API_TOKEN
NEW_UID  = settings.KOBO_ASSET_UID   # axbZkHAm9MP4DMNSpeGBxu
BASE     = settings.KOBO_API_URL.rstrip('/')
HEADERS  = {'Authorization': f'Token {TOKEN}', 'Accept': 'application/json',
            'Content-Type': 'application/json'}

def kobo_get(path):
    req = urllib.request.Request(f'{BASE}/{path}', headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def parse_gps(loc):
    if not loc: return None, None
    parts = str(loc).strip().split()
    try: return float(parts[0]), float(parts[1])
    except: return None, None

def build_image_url(sub):
    att = sub.get('_attachments', [])
    return att[0].get('download_url') if att else None

# ─────────────────────────────────────────────────────────────────────────────
db = SessionLocal()

# 1. Current DB state
total = db.query(Complaint).count()
kobo_synced = db.query(Complaint).filter(Complaint.kobo_submission_id.isnot(None)).count()
manual = total - kobo_synced
print(f"\n{'='*60}")
print(f"CURRENT DATABASE STATE")
print(f"  Total complaints : {total}")
print(f"  Kobo-synced      : {kobo_synced}")
print(f"  Manual entries   : {manual}")

# Show kobo synced records
synced = db.query(Complaint).filter(Complaint.kobo_submission_id.isnot(None)).all()
for c in synced:
    print(f"  [kobo-{c.kobo_submission_id}] {c.title[:60]} | created={c.created_at.date()}")

# 2. Fetch new form submissions
print(f"\n{'='*60}")
print(f"FETCHING from new KoboToolbox form: {NEW_UID}")
status, data = kobo_get(f'assets/{NEW_UID}/data/?limit=500&format=json')
print(f"  HTTP {status}")
if status != 200:
    print("  Error:", str(data)[:300])
    db.close()
    sys.exit(1)

results = data.get('results', [])
print(f"  Submissions found: {data.get('count', len(results))}")

for i, sub in enumerate(results, 1):
    lat, lon = parse_gps(sub.get('GPS_Location'))
    geo = sub.get('_geolocation', [None, None])
    if lat is None and geo and len(geo) >= 2:
        lat, lon = geo[0], geo[1]
    print(f"\n  [{i}] ID={sub.get('_id')} | submitted={sub.get('_submission_time','')[:10]}")
    print(f"      Inspector  : {sub.get('Inspector_Name','—')}")
    print(f"      Shop       : {sub.get('Shop_Name','—')}")
    print(f"      Violation  : {sub.get('Violation_Type','—')}")
    print(f"      Zone       : {sub.get('Municipality_Zone','—')}")
    print(f"      GPS        : {lat}, {lon}")
    print(f"      Photo      : {'Yes' if build_image_url(sub) else 'No'}")

# 3. Confirm before deleting
print(f"\n{'='*60}")
print(f"PLAN:")
print(f"  - DELETE {kobo_synced} old Kobo-synced complaint(s) from DB")
print(f"  - IMPORT {len(results)} new submission(s) from new form")
print(f"  - KEEP   {manual} manually created complaint(s)")
print()
answer = input("Proceed? (yes/no): ").strip().lower()
if answer != 'yes':
    print("Aborted.")
    db.close()
    sys.exit(0)

# 4. Delete old kobo data
deleted = db.query(Complaint).filter(Complaint.kobo_submission_id.isnot(None)).delete()
db.commit()
print(f"\nDeleted {deleted} old Kobo-synced records.")

# 5. Get admin user
admin = db.query(User).filter(User.role.in_(['admin', 'super_admin'])).first()
if not admin:
    print("ERROR: No admin user found!")
    db.close()
    sys.exit(1)

# 6. Import new submissions
created = 0
skipped = 0
for sub in results:
    kobo_id = str(sub.get('_id', ''))
    if not kobo_id:
        continue

    existing = db.query(Complaint).filter(Complaint.kobo_submission_id == kobo_id).first()
    if existing:
        skipped += 1
        continue

    lat, lon = parse_gps(sub.get('GPS_Location'))
    geo = sub.get('_geolocation', [None, None])
    if lat is None and geo and len(geo) >= 2:
        lat, lon = geo[0], geo[1]

    # Parse date
    incident_date = None
    date_str = sub.get('Inspection_Date') or sub.get('Enter_a_date')
    if date_str:
        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
            try:
                incident_date = datetime.strptime(date_str, fmt)
                break
            except ValueError:
                continue

    inspector   = sub.get('Inspector_Name') or sub.get('Name', 'Unknown Inspector')
    shop_name   = sub.get('Shop_Name', 'Unknown Shop')
    violation   = sub.get('Violation_Type') or sub.get('Disaster_Name', 'Unknown')
    owner       = sub.get('Shop_Owner_Name', '')
    contact     = sub.get('Contact_Number', '')
    license_no  = sub.get('License_Number', '')
    zone        = sub.get('Municipality_Zone', '')
    action      = sub.get('Action_Taken', '')
    viol_desc   = sub.get('Violation_Description', '')
    insp_id     = sub.get('Inspector_ID', '')
    image_url   = build_image_url(sub)

    title = f"Illegal Shop: {shop_name} — {violation}"
    description = (
        f"Inspector: {inspector} (ID: {insp_id})\n"
        f"Shop: {shop_name}\nOwner: {owner}\nContact: {contact}\n"
        f"License: {license_no}\nZone: {zone}\n"
        f"Violation: {violation}\nDetails: {viol_desc}\nAction: {action}\n"
        f"Submitted via KoboToolbox on {sub.get('_submission_time', '')}"
    )

    c = Complaint(
        user_id=admin.id,
        title=title,
        description=description,
        disaster_type=violation,
        latitude=lat,
        longitude=lon,
        location_name=zone,
        incident_date=incident_date,
        image_url=image_url,
        kobo_submission_id=kobo_id,
        status=ComplaintStatus.SUBMITTED,
        severity='Medium',
    )
    db.add(c)
    created += 1

db.commit()
db.close()

print(f"\nIMPORT COMPLETE:")
print(f"  Created : {created}")
print(f"  Skipped : {skipped}")
print(f"  Total in DB (kobo): {created}")
print("\nDone! Restart the backend server to reflect changes.")
