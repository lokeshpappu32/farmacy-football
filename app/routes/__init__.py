from app.routes.admin import admin_bp
from app.routes.auth import auth_bp
from app.routes.matches import matches_bp
from app.routes.mr import mr_bp
from app.routes.predictions import predictions_bp
from app.routes.public import public_bp


def register_blueprints(app):
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(matches_bp, url_prefix="/api/matches")
    app.register_blueprint(predictions_bp, url_prefix="/api")
    app.register_blueprint(public_bp, url_prefix="/api")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(mr_bp, url_prefix="/api/mr")
