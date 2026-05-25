from pathlib import Path
import sys

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


app = create_app()

with app.app_context():
    db.create_all()
    seed_countries()
    db.session.commit()
    print("Database initialized.")
