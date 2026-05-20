from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env", override=True)

from flask import Flask, jsonify, send_from_directory
from werkzeug.exceptions import HTTPException

from app.config import Config
from app.extensions import cors, db, jwt, limiter, migrate
from app.routes import register_blueprints
from app.schedulers.jobs import init_scheduler


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
    register_error_handlers(app)
    register_frontend_routes(app)

    with app.app_context():
        init_scheduler(app)

    return app


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
