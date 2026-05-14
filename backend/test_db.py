from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:postgres@localhost:5432/geo_complaint_db')
with engine.connect() as conn:
    res = conn.execute(text('SELECT id, latitude, longitude, kobo_submission_id, location_name FROM complaints')).fetchall()
    for r in res:
        print(r)
