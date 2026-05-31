from pathlib import Path
import sys

from sqlalchemy import inspect, text

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.extensions import db
from app.models import Country
from scripts.country_seed import COUNTRIES


def seed_countries():
    for name, iso_code, country_code in COUNTRIES:
        flag_url = f"https://flagcdn.com/{iso_code.lower()}.svg"
        country = Country.query.filter_by(iso_code=iso_code).first()
        if country:
            country.name = name
            country.country_code = country_code
            country.flag_url = flag_url
            country.is_active = True
            continue
        db.session.add(
            Country(
                name=name,
                iso_code=iso_code,
                country_code=country_code,
                flag_url=flag_url,
                is_active=True,
            )
        )


def ensure_schema_columns():
    inspector = inspect(db.engine)
    if not inspector.has_table("participants"):
        return
    participant_columns = {column["name"] for column in inspector.get_columns("participants")}
    additions = {
        "participant_type": "VARCHAR(40) NOT NULL DEFAULT 'farmacy_owner'",
        "pharmacy_name": "VARCHAR(180) NULL",
        "medical_rep_name": "VARCHAR(160) NULL",
        "medical_rep_country_code": "VARCHAR(8) NULL",
        "medical_rep_mobile_number": "VARCHAR(32) NULL",
    }
    with db.engine.begin() as connection:
        for column, definition in additions.items():
            if column not in participant_columns:
                connection.execute(text(f"ALTER TABLE participants ADD COLUMN {column} {definition}"))


app = create_app()

with app.app_context():
    db.create_all()
    ensure_schema_columns()
    seed_countries()
    db.session.commit()
    print("Database initialized.")
