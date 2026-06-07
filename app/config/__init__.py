import json
import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import quote_plus

BASE_DIR = Path(__file__).resolve().parents[2]


def database_uri():
    azure_sql = os.getenv("AZURE_SQL_CONNECTION_STRING", "").strip()
    raw_uri = os.getenv("DATABASE_URL", "").strip()
    if raw_uri.startswith("postgres://"):
        return raw_uri.replace("postgres://", "postgresql://", 1)
    if raw_uri:
        return raw_uri
    if azure_sql:
        return f"mssql+pyodbc:///?odbc_connect={quote_plus(azure_sql)}"
    return "mssql+pyodbc:///?odbc_connect=" + quote_plus(
        "Driver={ODBC Driver 18 for SQL Server};"
        "Server=tcp:your-server.database.windows.net,1433;"
        "Database=your-database;"
        "Uid=your-user;"
        "Pwd=your-password;"
        "Encrypt=yes;"
        "TrustServerCertificate=no;"
        "Connection Timeout=30;"
    )


def parse_admin_credentials():
    raw_json = os.getenv("ADMIN_CREDENTIALS_JSON", "").strip()
    if raw_json:
        try:
            data = json.loads(raw_json)
        except (TypeError, ValueError):
            return {}
        return {
            str(user_id).strip().lower(): {
                "password": str(account.get("password") or ""),
                "name": str(account.get("name") or user_id).strip() or str(user_id),
            }
            for user_id, account in data.items()
            if str(user_id).strip() and str(account.get("password") or "")
        }

    raw_list = os.getenv("ADMIN_CREDENTIALS", "").strip()
    accounts = {}
    for entry in raw_list.split(";"):
        parts = [part.strip() for part in entry.split("|")]
        if len(parts) < 2 or not parts[0] or not parts[1]:
            continue
        accounts[parts[0].lower()] = {
            "password": parts[1],
            "name": parts[2] if len(parts) > 2 and parts[2] else parts[0],
        }
    return accounts


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-farmacy-football-secret-key-change-in-production")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_DAYS", "90")))
    ADMIN_SECRET_CODE = os.getenv("ADMIN_SECRET_CODE", "ADMIN-FARMACY-CHANGE-ME")
    ADMIN_CREDENTIALS = parse_admin_credentials()
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
    RATELIMIT_ENABLED = os.getenv("RATELIMIT_ENABLED", "true").lower() == "true"
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")

    FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
