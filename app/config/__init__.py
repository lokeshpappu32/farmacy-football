import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-farmacy-football-secret-key-change-in-production")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    ADMIN_SECRET_CODE = os.getenv("ADMIN_SECRET_CODE", "ADMIN-FARMACY-CHANGE-ME")

    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/farmacy_football",
    )
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = database_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
        "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
    }

    FOOTBALL_DATA_API_TOKEN = os.getenv("FOOTBALL_DATA_API_TOKEN", "")
    FOOTBALL_DATA_COMPETITION = os.getenv("FOOTBALL_DATA_COMPETITION", "WC")
    FOOTBALLDATA_IO_API_KEY = os.getenv("FOOTBALLDATA_IO_API_KEY", "")
    FOOTBALLDATA_IO_BASE_URL = os.getenv("FOOTBALLDATA_IO_BASE_URL", "https://footballdata.io/api/v1")
    FOOTBALLDATA_IO_LEAGUE_IDS = os.getenv("FOOTBALLDATA_IO_LEAGUE_IDS", "50")
    FOOTBALLDATA_IO_SEASON_ID = os.getenv("FOOTBALLDATA_IO_SEASON_ID", "")
    FOOTBALLDATA_IO_LANG = os.getenv("FOOTBALLDATA_IO_LANG", "en")
    FOOTBALLDATA_IO_SYNC_ENABLED = os.getenv("FOOTBALLDATA_IO_SYNC_ENABLED", "false").lower() == "true"
    PUBLIC_APP_URL = os.getenv("PUBLIC_APP_URL", "http://localhost:5000")

    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")

    FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
