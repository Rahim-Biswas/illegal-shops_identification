"""Import new KoboToolbox submissions into the database."""
import sys, os, urllib.request, json
sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv()
from src.database import SessionLocal
from src.models import Complaint, ComplaintStatus
from src.config import settings
from sqlalchemy import text
from datetime import datetime

TOKEN   = settings.KOBO_API_TOKEN
NEW_UID = settings.KOBO_ASSET_UID
BASE    = settings.KOBO_API_URL.rstrip('/')
HEADERS = {'Authorization': f'Token {TOKEN}', 'Accept': 'application/json'}

def parse_gps(loc):
    if not loc: return None, None
    parts = str(loc).strip().split()
    try: return float(parts[0]), float(parts[1])
    except: return None, None

def build_image(sub):
    att = sub.get('_attachments', [])
    return att[0].get('download_url') if att else None

# Fetch new submissions
req = urllib.request.Request(
    f'{BASE}/assets/{NEW_UID}/data/?limit=500&format=json', headers=HEADERS)
with urllib.request.urlopen(req, timeout=30) as r:
    data = json.loads(r.read())
results = data.get('results', [])
print(f'New form submissions: {len(results)}')

db = SessionLocal()

# Get admin user id using raw SQL to avoid enum cast issue
row = db.execute(text("SELECT id FROM users WHERE email='admin@geoai.com' LIMIT 1")).fetchone()
if not row:
    row = db.execute(text("SELECT id FROM users LIMIT 1")).fetchone()
admin_id = row[0]
print(f'Using admin user id={admin_id}')

created = 0
for sub in results:
    kobo_id = str(sub.get('_id', ''))
    if not kobo_id:
        continue
    existing = db.query(Complaint).filter(Complaint.kobo_submission_id == kobo_id).first()
    if existing:
        print(f'  Skipping {kobo_id} (already exists)')
        continue

    lat, lon = parse_gps(sub.get('GPS_Location'))
    geo = sub.get('_geolocation', [None, None])
    if lat is None and geo and len(geo) >= 2:
        lat, lon = geo[0], geo[1]

    incident_date = None
    ds = sub.get('Inspection_Date')
    if ds:
        for fmt in ('%Y-%m-%d', '%d/%m/%Y'):
            try: incident_date = datetime.strptime(ds, fmt); break
            except: pass

    inspector  = sub.get('Inspector_Name', 'Unknown Inspector')
    shop       = sub.get('Shop_Name', 'Unknown Shop')
    violation  = sub.get('Violation_Type', 'Unknown')
    owner      = sub.get('Shop_Owner_Name', '')
    contact    = sub.get('Contact_Number', '')
    license_no = sub.get('License_Number', '')
    zone       = sub.get('Municipality_Zone', '')
    action     = sub.get('Action_Taken', '')
    vdesc      = sub.get('Violation_Description', '')
    insp_id    = sub.get('Inspector_ID', '')

    description = (
        f"Inspector: {inspector} (ID: {insp_id})\n"
        f"Shop: {shop}\nOwner: {owner}\nContact: {contact}\n"
        f"License: {license_no}\nZone: {zone}\n"
        f"Violation: {violation}\nDetails: {vdesc}\nAction: {action}\n"
        f"Submitted: {sub.get('_submission_time', '')}"
    )

    c = Complaint(
        user_id=admin_id,
        title=f"Illegal Shop: {shop} — {violation}",
        description=description,
        disaster_type=violation,
        latitude=lat,
        longitude=lon,
        location_name=zone,
        incident_date=incident_date,
        image_url=build_image(sub),
        kobo_submission_id=kobo_id,
        status=ComplaintStatus.SUBMITTED,
        severity='Medium',
    )
    db.add(c)
    created += 1
    print(f'  + Imported: [{kobo_id}] {shop} | {violation} | zone={zone} | GPS=({lat},{lon})')

db.commit()

# Verify final state
total = db.execute(text("SELECT COUNT(*) FROM complaints")).scalar()
kobo  = db.execute(text("SELECT COUNT(*) FROM complaints WHERE kobo_submission_id IS NOT NULL")).scalar()
db.close()

print(f"\n{'='*50}")
print(f"FINAL DB STATE:")
print(f"  Total records : {total}")
print(f"  Kobo-synced   : {kobo}")
print(f"  Imported now  : {created}")
print("Done!")
