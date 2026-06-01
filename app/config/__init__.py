import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import quote_plus

BASE_DIR = Path(__file__).resolve().parents[2]


def database_uri():
    azure_sql = azure_sql_connection_string()
    if azure_sql:
        if azure_sql.lower().startswith("mssql+pyodbc://"):
            return azure_sql
        return f"mssql+pyodbc:///?odbc_connect={quote_plus(normalize_azure_sql_connection_string(azure_sql))}"

    raw_uri = os.getenv("DATABASE_URL", "").strip()
    if raw_uri.startswith("postgres://"):
        return raw_uri.replace("postgres://", "postgresql://", 1)
    if raw_uri:
        return raw_uri
    return "postgresql://postgres:password@localhost:5432/farmacy_football"


def azure_sql_connection_string():
    explicit = os.getenv("AZURE_SQL_CONNECTION_STRING", "").strip()
    if explicit:
        return explicit
    for prefix in ("SQLAZURECONNSTR_", "SQLCONNSTR_"):
        for key, value in os.environ.items():
            if key.startswith(prefix) and value.strip():
                return value.strip()
    return ""


def normalize_azure_sql_connection_string(value):
    parts = [part.strip() for part in value.strip().rstrip(";").split(";") if part.strip()]
    has_driver = any(part.lower().startswith("driver=") for part in parts)
    if not has_driver:
        parts.insert(0, "Driver={ODBC Driver 18 for SQL Server}")
    return ";".join(parts) + ";"


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-farmacy-football-secret-key-change-in-production")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_DAYS", "90")))
    ADMIN_SECRET_CODE = os.getenv("ADMIN_SECRET_CODE", "ADMIN-FARMACY-CHANGE-ME")
    SUPER_ADMIN_USER_ID = os.getenv("SUPER_ADMIN_USER_ID", "superadmin")
    SUPER_ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD", "")

    SQLALCHEMY_DATABASE_URI = database_uri()
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
