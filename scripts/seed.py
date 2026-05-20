from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

from sqlalchemy import inspect, text

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.extensions import db
from app.models import Match, Participant
from app.services.points_service import ENROLLMENT_POINTS, add_points

app = create_app()

SAMPLE_PARTICIPANTS = [
    ("Aarav Patel", "+919876543210", "aarav@example.com", "India", "MR123"),
    ("Maria Santos", "+5511987654321", "maria@example.com", "Brazil", "MR220"),
    ("Ahmed Khan", "+971501234567", "ahmed@example.com", "UAE", "MR410"),
]

SAMPLE_MATCHES = [
    ("Brazil", "Argentina", "https://crests.football-data.org/764.svg", "https://crests.football-data.org/762.svg", 2),
    ("France", "Germany", "https://crests.football-data.org/773.svg", "https://crests.football-data.org/759.svg", 4),
    ("Spain", "Portugal", "https://crests.football-data.org/760.svg", "https://crests.football-data.org/765.svg", 6),
]

with app.app_context():
    db.create_all()
    inspector = inspect(db.engine)
    columns = {column["name"] for column in inspector.get_columns("participants")}
    if "country_code" not in columns:
        with db.engine.begin() as connection:
            suffix = " AFTER full_name" if db.engine.dialect.name == "mysql" else ""
            connection.execute(text(f"ALTER TABLE participants ADD COLUMN country_code VARCHAR(8) NULL{suffix}"))
    code_by_country = {"India": "+91", "Brazil": "+55", "UAE": "+971"}
    for full_name, mobile, email, country, mr_id in SAMPLE_PARTICIPANTS:
        if not Participant.query.filter_by(mobile_number=mobile).first():
            country_code = code_by_country.get(country)
            participant = Participant(full_name=full_name, country_code=country_code, mobile_number=mobile, email=email, country=country, mr_id=mr_id)
            db.session.add(participant)
            db.session.flush()
            add_points(participant, ENROLLMENT_POINTS, "Enrollment bonus")
    for team1, team2, logo1, logo2, days in SAMPLE_MATCHES:
        if not Match.query.filter_by(team1=team1, team2=team2).first():
            db.session.add(
                Match(
                    team1=team1,
                    team2=team2,
                    team1_logo=logo1,
                    team2_logo=logo2,
                    match_datetime=datetime.now(timezone.utc) + timedelta(days=days),
                    status="scheduled",
                )
            )
    db.session.commit()
    print("Seed data created.")
