import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-farmacy-football-secret-key-change-in-production")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    ADMIN_SECRET_CODE = os.getenv("ADMIN_SECRET_CODE", "ADMIN-FARMACY-CHANGE-ME")

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:password@localhost:3306/farmacy_football",
    )
    if SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
        "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
    }

    FOOTBALL_DATA_API_TOKEN = os.getenv("FOOTBALL_DATA_API_TOKEN", "")
    FOOTBALL_DATA_COMPETITION = os.getenv("FOOTBALL_DATA_COMPETITION", "WC")
    PUBLIC_APP_URL = os.getenv("PUBLIC_APP_URL", "http://localhost:5000")

    TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")

    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    SCHEDULER_ENABLED = os.getenv("SCHEDULER_ENABLED", "true").lower() == "true"

    FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
