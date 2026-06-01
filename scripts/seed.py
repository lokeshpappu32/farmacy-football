from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

from sqlalchemy import inspect, text

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.extensions import db
from app.models import AdminLog, Country, Match, Participant, PointsHistory, Prediction
from app.services.points_service import ENROLLMENT_POINTS, PARTICIPATION_POINTS, WINNER_POINTS, add_points
from scripts.country_seed import COUNTRIES

app = create_app()

DEMO_PARTICIPANTS = [
    ("Arjun Mehta", "hetero_representative_staff", "+91", "+919900001001", "arjun.rep@example.com", "India", "Mumbai", None, "Arjun Mehta", "+919900001001"),
    ("Kavitha Rao", "hetero_representative_staff", "+91", "+919900001002", "kavitha.staff@example.com", "India", "Bengaluru", None, "Kavitha Rao", "+919900001002"),
    ("Lucas Silva", "hetero_representative_staff", "+55", "+5511900001001", "lucas.rep@example.com", "Brazil", "Sao Paulo", None, "Lucas Silva", "+5511900001001"),
    ("Maya Tan", "hetero_representative_staff", "+60", "+601230001001", "maya.tan@example.com", "Malaysia", "Kuala Lumpur", None, "Maya Tan", "+601230001001"),
    ("Daniel Mensah", "hetero_representative_staff", "+233", "+233200001001", "daniel.mensah@example.com", "Ghana", "Accra", None, "Daniel Mensah", "+233200001001"),
    ("Aarav Patel", "farmacy_owner", "+91", "+919876543210", "aarav@example.com", "India", "Mumbai", "Aarav Farmacy", "Arjun Mehta", "+919900001001"),
    ("Neha Sharma", "farmacy_head_supervisor", "+91", "+919876543211", "neha@example.com", "India", "Delhi", "Neha Medicals", "Arjun Mehta", "+919900001001"),
    ("Ravi Kumar", "farmacy_head_supervisor", "+91", "+919876543212", "ravi@example.com", "India", "Mumbai", "Ravi Pharmacy", "Arjun Mehta", "+919900001001"),
    ("Priya Nair", "farmacy_sales_staff", "+91", "+919876543213", "priya@example.com", "India", "Bengaluru", "Priya Pharma", "Kavitha Rao", "+919900001002"),
    ("Maria Santos", "farmacy_owner", "+55", "+5511987654321", "maria@example.com", "Brazil", "Sao Paulo", "Santos Farmacia", "Lucas Silva", "+5511900001001"),
    ("Ahmed Khan", "farmacy_head_supervisor", "+971", "+971501234567", "ahmed@example.com", "United Arab Emirates", "Dubai", "Ahmed Pharmacy", "", ""),
    ("Nur Aisyah", "farmacy_owner", "+60", "+601298765431", "nur.aisyah@example.com", "Malaysia", "Kuala Lumpur", "Aisyah Care", "Maya Tan", "+601230001001"),
    ("Chen Wei", "farmacy_sales_staff", "+60", "+601298765432", "chen.wei@example.com", "Malaysia", "Penang", "Wei Wellness", "Maya Tan", "+601230001001"),
    ("Kwame Osei", "farmacy_head_supervisor", "+233", "+233240001111", "kwame.osei@example.com", "Ghana", "Accra", "Osei Pharmacy", "Daniel Mensah", "+233200001001"),
    ("Ama Boateng", "farmacy_owner", "+233", "+233240001112", "ama.boateng@example.com", "Ghana", "Kumasi", "Boateng Meds", "Daniel Mensah", "+233200001001"),
]

DEMO_MATCHES = [
    ("Brazil", "Argentina", -5, "completed", "Brazil"),
    ("France", "Germany", -4, "completed", "Draw"),
    ("Spain", "Portugal", -3, "cancelled", None),
    ("India", "Vietnam", 2, "scheduled", None),
    ("Indonesia", "Malaysia", 2, "scheduled", None),
]

DEMO_PREDICTIONS = {
    "+919876543210": [
        ("Brazil", "Argentina", "Brazil", "CoviFor"),
        ("France", "Germany", "France", "Hepcinat"),
        ("India", "Vietnam", "India", "CoviFor"),
        ("Indonesia", "Malaysia", "Malaysia", "Velasof"),
    ],
    "+919876543211": [
        ("Brazil", "Argentina", "Argentina", "Ivermectol"),
        ("France", "Germany", "Draw", "CoviFor"),
        ("India", "Vietnam", "Vietnam", "Tenvir"),
    ],
    "+919876543212": [
        ("Brazil", "Argentina", "Brazil", "CoviFor"),
        ("Spain", "Portugal", "Spain", "Ledifos"),
        ("Indonesia", "Malaysia", "Indonesia", "Aluvia"),
    ],
    "+919876543213": [
        ("Brazil", "Argentina", "Brazil", "Favivir"),
        ("France", "Germany", "France", "CoviFor"),
    ],
    "+5511987654321": [
        ("Brazil", "Argentina", "Brazil", "CoviFor"),
        ("India", "Vietnam", "India", "Hepcinat"),
    ],
    "+971501234567": [],
    "+919900001001": [
        ("Brazil", "Argentina", "Brazil", "CoviFor"),
        ("India", "Vietnam", "India", "CoviFor"),
    ],
    "+919900001002": [
        ("France", "Germany", "Draw", "Velasof"),
    ],
    "+5511900001001": [
        ("Brazil", "Argentina", "Brazil", "CoviFor"),
    ],
    "+601230001001": [
        ("Brazil", "Argentina", "Brazil", "CoviFor"),
        ("France", "Germany", "Draw", "Velasof"),
    ],
    "+233200001001": [
        ("Brazil", "Argentina", "Argentina", "Hepcinat"),
        ("France", "Germany", "Draw", "CoviFor"),
    ],
    "+601298765431": [
        ("Brazil", "Argentina", "Brazil", "CoviFor"),
        ("France", "Germany", "Draw", "Velasof"),
        ("India", "Vietnam", "India", "CoviFor"),
    ],
    "+601298765432": [
        ("Brazil", "Argentina", "Brazil", "CoviFor"),
        ("France", "Germany", "Germany", "Aluvia"),
        ("Indonesia", "Malaysia", "Malaysia", "Velasof"),
    ],
    "+233240001111": [
        ("Brazil", "Argentina", "Brazil", "CoviFor"),
        ("France", "Germany", "Draw", "CoviFor"),
        ("India", "Vietnam", "Vietnam", "Tenvir"),
    ],
    "+233240001112": [
        ("Brazil", "Argentina", "Brazil", "Favivir"),
        ("Spain", "Portugal", "Portugal", "Ledifos"),
        ("Indonesia", "Malaysia", "Indonesia", "Aluvia"),
    ],
}


def flag_for(country_name):
    country = Country.query.filter_by(name=country_name).first()
    return country.flag_url if country else None


def ensure_schema_columns():
    inspector = inspect(db.engine)
    participant_columns = {column["name"] for column in inspector.get_columns("participants")}
    expected_participant_columns = {
        "participant_type": "VARCHAR(40) NOT NULL DEFAULT 'farmacy_owner'",
        "pharmacy_name": "VARCHAR(180) NULL",
        "medical_rep_name": "VARCHAR(160) NULL",
        "medical_rep_country_code": "VARCHAR(8) NULL",
        "medical_rep_mobile_number": "VARCHAR(32) NULL",
    }
    for column_name, definition in expected_participant_columns.items():
        if column_name not in participant_columns:
            with db.engine.begin() as connection:
                connection.execute(text(f"ALTER TABLE participants ADD COLUMN {column_name} {definition}"))
    if "country_code" not in participant_columns:
        with db.engine.begin() as connection:
            suffix = " AFTER full_name" if db.engine.dialect.name == "mysql" else ""
            connection.execute(text(f"ALTER TABLE participants ADD COLUMN country_code VARCHAR(8) NULL{suffix}"))
    if "city" not in participant_columns:
        with db.engine.begin() as connection:
            suffix = " AFTER country" if db.engine.dialect.name == "mysql" else ""
            connection.execute(text(f"ALTER TABLE participants ADD COLUMN city VARCHAR(120) NULL{suffix}"))

    country_columns = {column["name"] for column in inspector.get_columns("countries")}
    if "flag_url" not in country_columns:
        with db.engine.begin() as connection:
            suffix = " AFTER country_code" if db.engine.dialect.name == "mysql" else ""
            connection.execute(text(f"ALTER TABLE countries ADD COLUMN flag_url VARCHAR(500) NULL{suffix}"))

    match_columns = {column["name"] for column in inspector.get_columns("matches")}
    with db.engine.begin() as connection:
        if "venue_name" not in match_columns:
            suffix = " AFTER team2_logo" if db.engine.dialect.name == "mysql" else ""
            connection.execute(text(f"ALTER TABLE matches ADD COLUMN venue_name VARCHAR(180) NULL{suffix}"))
        if "venue_location" not in match_columns:
            suffix = " AFTER venue_name" if db.engine.dialect.name == "mysql" else ""
            connection.execute(text(f"ALTER TABLE matches ADD COLUMN venue_location VARCHAR(240) NULL{suffix}"))

    if inspector.has_table("api_call_logs"):
        api_log_columns = {column["name"] for column in inspector.get_columns("api_call_logs")}
        with db.engine.begin() as connection:
            if "requests_remaining_snapshot" not in api_log_columns:
                suffix = " AFTER request_count" if db.engine.dialect.name == "mysql" else ""
                connection.execute(text(f"ALTER TABLE api_call_logs ADD COLUMN requests_remaining_snapshot INTEGER NULL{suffix}"))
            if "requests_used_snapshot" not in api_log_columns:
                suffix = " AFTER requests_remaining_snapshot" if db.engine.dialect.name == "mysql" else ""
                connection.execute(text(f"ALTER TABLE api_call_logs ADD COLUMN requests_used_snapshot INTEGER NULL{suffix}"))
            if "requests_limit_snapshot" not in api_log_columns:
                suffix = " AFTER requests_used_snapshot" if db.engine.dialect.name == "mysql" else ""
                connection.execute(text(f"ALTER TABLE api_call_logs ADD COLUMN requests_limit_snapshot INTEGER NULL{suffix}"))


def seed_countries():
    for name, iso_code, country_code in COUNTRIES:
        flag_url = f"https://flagcdn.com/{iso_code.lower()}.svg"
        country = Country.query.filter_by(iso_code=iso_code).first()
        if not country:
            db.session.add(Country(name=name, iso_code=iso_code, country_code=country_code, flag_url=flag_url, is_active=True))
        else:
            country.name = name
            country.country_code = country_code
            country.flag_url = flag_url
            country.is_active = True
    db.session.flush()


def seed_participants():
    for full_name, participant_type, country_code, mobile, email, country, city, pharmacy_name, medical_rep_name, medical_rep_mobile in DEMO_PARTICIPANTS:
        participant = Participant.query.filter_by(mobile_number=mobile).first()
        if not participant:
            participant = Participant(
                full_name=full_name,
                participant_type=participant_type,
                pharmacy_name=pharmacy_name,
                country_code=country_code,
                mobile_number=mobile,
                email=email,
                country=country,
                city=city,
                mr_id=None,
                medical_rep_name=medical_rep_name,
                medical_rep_country_code=country_code if medical_rep_mobile else None,
                medical_rep_mobile_number=medical_rep_mobile or None,
                total_points=0,
            )
            db.session.add(participant)
            db.session.flush()
            add_points(participant, ENROLLMENT_POINTS, "Enrollment bonus")
        else:
            participant.full_name = full_name
            participant.participant_type = participant_type
            participant.pharmacy_name = pharmacy_name
            participant.country_code = country_code
            participant.email = email
            participant.country = country
            participant.city = city
            participant.mr_id = None
            participant.medical_rep_name = medical_rep_name
            participant.medical_rep_country_code = country_code if medical_rep_mobile else None
            participant.medical_rep_mobile_number = medical_rep_mobile or None


def seed_matches():
    now = datetime.now(timezone.utc)
    for team1, team2, day_offset, status, winner in DEMO_MATCHES:
        match = Match.query.filter_by(team1=team1, team2=team2).first()
        match_datetime = now + timedelta(days=day_offset)
        team1_logo = flag_for(team1)
        team2_logo = flag_for(team2)
        if not match:
            match = Match(
                team1=team1,
                team2=team2,
                team1_logo=team1_logo,
                team2_logo=team2_logo,
                match_datetime=match_datetime,
                status=status,
                winner_team=winner,
            )
            db.session.add(match)
            continue
        match.team1_logo = team1_logo
        match.team2_logo = team2_logo
        match.match_datetime = match_datetime
        match.status = status
        match.winner_team = winner
    remove_old_extra_demo_match()


def remove_old_extra_demo_match():
    old_match = Match.query.filter_by(team1="United Arab Emirates", team2="Saudi Arabia").first()
    if not old_match:
        return
    Prediction.query.filter_by(match_id=old_match.id).delete(synchronize_session=False)
    PointsHistory.query.filter_by(match_id=old_match.id).delete(synchronize_session=False)
    db.session.delete(old_match)


def seed_predictions_and_points():
    db.session.flush()
    participants = {participant.mobile_number: participant for participant in Participant.query.all()}
    matches = {(match.team1, match.team2): match for match in Match.query.all()}

    for mobile, rows in DEMO_PREDICTIONS.items():
        participant = participants.get(mobile)
        if not participant:
            continue
        for team1, team2, predicted_team, favorite_drug in rows:
            match = matches.get((team1, team2))
            if not match:
                continue
            prediction = Prediction.query.filter_by(participant_id=participant.id, match_id=match.id).first()
            if not prediction:
                prediction = Prediction(participant_id=participant.id, match_id=match.id)
                db.session.add(prediction)
            prediction.predicted_team = predicted_team
            prediction.favorite_drug = favorite_drug
            prediction.participation_points = 0 if match.status == "cancelled" else PARTICIPATION_POINTS
            prediction.winner_points = 0
            if match.status == "completed" and match.winner_team:
                prediction.is_correct = predicted_team == match.winner_team
                prediction.winner_points = WINNER_POINTS if prediction.is_correct else 0
            elif match.status in {"completed", "cancelled"}:
                prediction.is_correct = False
            else:
                prediction.is_correct = None

    db.session.flush()
    recompute_demo_points()


def recompute_demo_points():
    demo_mobiles = [row[3] for row in DEMO_PARTICIPANTS]
    demo_users = Participant.query.filter(Participant.mobile_number.in_(demo_mobiles)).all()
    demo_user_ids = [user.id for user in demo_users]

    PointsHistory.query.filter(PointsHistory.participant_id.in_(demo_user_ids)).delete(synchronize_session=False)
    db.session.flush()

    for participant in demo_users:
        participant.total_points = 0
        add_points(participant, ENROLLMENT_POINTS, "Enrollment bonus")
        for prediction in Prediction.query.filter_by(participant_id=participant.id).all():
            if prediction.participation_points:
                add_points(participant, PARTICIPATION_POINTS, "Match participation", match_id=prediction.match_id)
            if prediction.winner_points:
                add_points(participant, WINNER_POINTS, "Correct prediction bonus", match_id=prediction.match_id)


def seed_logs():
    demo_logs = [
        ("manual_winner_update", "Match 1 winner set to Brazil"),
        ("manual_draw_update", "Match 2 marked as draw. 3 predictions closed."),
        ("cancel_match", "Match 3 cancelled. 1 predictions closed."),
        ("reschedule_match", "Match 6 rescheduled for demo schedule."),
    ]
    for action, details in demo_logs:
        if not AdminLog.query.filter_by(admin_action=action, details=details).first():
            db.session.add(AdminLog(admin_action=action, details=details))


with app.app_context():
    db.create_all()
    ensure_schema_columns()
    seed_countries()
    seed_participants()
    seed_matches()
    seed_predictions_and_points()
    seed_logs()
    db.session.commit()
    print("Seed data created.")
