import sys
sys.path.append('.')
from src.database import SessionLocal
from src.models import Complaint
from sqlalchemy import and_
from src.schemas import MapDataPoint

db = SessionLocal()
complaints = db.query(Complaint).filter(and_(Complaint.latitude != None, Complaint.longitude != None)).all()

try:
    points = [
        MapDataPoint(
            id=c.id,
            latitude=c.latitude,
            longitude=c.longitude,
            title=c.title,
            disaster_type=c.disaster_type,
            status=c.status,
            severity=c.severity,
            created_at=c.created_at
        )
        for c in complaints
    ]
    print('Success:', len(points))
except Exception as e:
    import traceback
    traceback.print_exc()

