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
    add_column = "ADD" if db.engine.dialect.name == "mssql" else "ADD COLUMN"
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
                connection.execute(text(f"ALTER TABLE participants {add_column} {column} {definition}"))


def ensure_mssql_indexes():
    if db.engine.dialect.name != "mssql":
        return
    inspector = inspect(db.engine)
    if not inspector.has_table("matches"):
        return

    with db.engine.begin() as connection:
        unique_constraints = connection.execute(
            text(
                """
                SELECT kc.name
                FROM sys.key_constraints kc
                JOIN sys.index_columns ic
                  ON ic.object_id = kc.parent_object_id
                 AND ic.index_id = kc.unique_index_id
                JOIN sys.columns c
                  ON c.object_id = ic.object_id
                 AND c.column_id = ic.column_id
                WHERE kc.parent_object_id = OBJECT_ID('matches')
                  AND kc.type = 'UQ'
                  AND c.name = 'api_match_id'
                """
            )
        ).scalars().all()
        for constraint_name in unique_constraints:
            connection.execute(text(f"ALTER TABLE matches DROP CONSTRAINT [{constraint_name}]"))

        unique_indexes = connection.execute(
            text(
                """
                SELECT i.name
                FROM sys.indexes i
                JOIN sys.index_columns ic
                  ON ic.object_id = i.object_id
                 AND ic.index_id = i.index_id
                JOIN sys.columns c
                  ON c.object_id = ic.object_id
                 AND c.column_id = ic.column_id
                WHERE i.object_id = OBJECT_ID('matches')
                  AND i.is_unique = 1
                  AND c.name = 'api_match_id'
                  AND i.name <> 'ux_matches_api_match_id_not_null'
                """
            )
        ).scalars().all()
        for index_name in unique_indexes:
            connection.execute(text(f"DROP INDEX [{index_name}] ON matches"))

        connection.execute(
            text(
                """
                IF NOT EXISTS (
                    SELECT 1
                    FROM sys.indexes
                    WHERE object_id = OBJECT_ID('matches')
                      AND name = 'ux_matches_api_match_id_not_null'
                )
                CREATE UNIQUE INDEX ux_matches_api_match_id_not_null
                ON matches(api_match_id)
                WHERE api_match_id IS NOT NULL
                """
            )
        )


app = create_app()

with app.app_context():
    db.create_all()
    ensure_schema_columns()
    ensure_mssql_indexes()
    seed_countries()
    db.session.commit()
    print("Database initialized.")
