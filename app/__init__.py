from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env", override=False)

import json

from flask import Flask, jsonify, request, send_from_directory
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request
from werkzeug.exceptions import HTTPException

from app.config import Config
from app.extensions import cors, db, jwt, limiter, migrate
from app.routes import register_blueprints


def create_app(config_class=Config):
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config_class)
    if str(app.config["SQLALCHEMY_DATABASE_URI"]).startswith("sqlite"):
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {}

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})
    limiter.init_app(app)

    register_blueprints(app)
    register_football_sync_hook(app)
    register_api_error_logging(app)
    register_error_handlers(app)
    register_frontend_routes(app)

    return app


def register_football_sync_hook(app):
    @app.before_request
    def sync_football_data_on_page_activity():
        if request.method != "GET":
            return None

        path = request.path or ""
        ignored_prefixes = (
            "/assets/",
            "/fonts/",
            "/images/",
            "/favicon",
            "/hetero-logo",
            "/manifest",
            "/.well-known/",
        )
        if path.startswith(ignored_prefixes) or "." in Path(path).name:
            return None

        api_exclusions = (
            "/api/countries",
            "/api/admin/sync-matches",
        )
        if path.startswith("/api/") and path.startswith(api_exclusions):
            return None

        try:
            from app.services.footballdata_io_service import maybe_sync_football_data

            page = path.strip("/").replace("/", "_") or "home"
            role = "page_open" if not path.startswith("/api/") else "api_get"
            maybe_sync_football_data(page, role=role, sync_types=["upcoming", "live", "results"])
        except Exception:
            app.logger.exception("Football API smart sync hook failed")
        return None


def register_api_error_logging(app):
    @app.after_request
    def log_api_error_response(response):
        if response.status_code < 400 or not (request.path or "").startswith("/api/"):
            return response

        identity = None
        role = None
        try:
            verify_jwt_in_request(optional=True)
            identity = get_jwt_identity()
            role = get_jwt().get("role")
        except Exception:
            identity = None
            role = None

        response_json = response.get_json(silent=True) if response.is_json else None
        request_json = request.get_json(silent=True) if request.is_json else None
        safe_request = {}
        if isinstance(request_json, dict):
            allowed_keys = {
                "action",
                "country",
                "country_code",
                "favorite_drug",
                "match_id",
                "participant_type",
                "predicted_team",
                "winner_team",
            }
            safe_request = {key: request_json.get(key) for key in allowed_keys if key in request_json}

        app.logger.warning(
            "api_error_response %s",
            json.dumps(
                {
                    "method": request.method,
                    "path": request.path,
                    "status_code": response.status_code,
                    "identity": identity,
                    "role": role,
                    "response": response_json,
                    "request": safe_request,
                },
                default=str,
            ),
        )
        return response


def register_error_handlers(app):
    @app.errorhandler(HTTPException)
    def handle_http_error(exc):
        return jsonify({"message": exc.description}), exc.code

    @app.errorhandler(Exception)
    def handle_uncaught_error(exc):
        app.logger.exception("Unhandled error")
        return jsonify({"message": "Something went wrong. Please try again."}), 500


def register_frontend_routes(app):
    @app.get("/")
    def index():
        dist = Path(app.config["FRONTEND_DIST"])
        index_file = dist / "index.html"
        if index_file.exists():
            return send_from_directory(dist, "index.html")
        return {"message": "Farmacy Football API is running. Build the frontend to serve the web app."}

    @app.get("/<path:path>")
    def serve_spa(path):
        dist = Path(app.config["FRONTEND_DIST"])
        target = dist / path
        if target.exists() and target.is_file():
            return send_from_directory(dist, path)
        if (dist / "index.html").exists():
            return send_from_directory(dist, "index.html")
        return {"message": "Frontend build not found."}, 404
