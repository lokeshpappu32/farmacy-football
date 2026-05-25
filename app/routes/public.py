from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from app.auth.guards import participant_required
from app.models import Country
from app.services.analytics_service import leaderboard, participant_performance
from app.services.footballdata_io_service import maybe_sync_football_data

public_bp = Blueprint("public", __name__)


@public_bp.get("/performance")
@participant_required
def performance():
    identity = get_jwt_identity()
    maybe_sync_football_data("performance", role="participant", user_id=identity, sync_types=["results"])
    return participant_performance(int(identity))


@public_bp.get("/leaderboard")
def public_leaderboard():
    maybe_sync_football_data("leaderboard", role="public", sync_types=["results"])
    country = request.args.get("country")
    return {"leaderboard": leaderboard(country=country, limit=100)}


@public_bp.get("/countries")
def countries():
    rows = Country.query.filter_by(is_active=True).order_by(Country.name.asc()).all()
    return {"countries": [row.to_dict() for row in rows]}
