from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from app.auth.guards import participant_required
from app.extensions import db
from app.models import Country, Participant
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
    country = request.args.get("country", "").strip()
    city = request.args.get("city", "").strip()
    return {
        "filters": {"country": country, "city": city},
        **leaderboard_options_payload(country),
        "leaderboard": leaderboard(country=country, city=city, limit=100),
    }


@public_bp.get("/leaderboard/options")
def leaderboard_options():
    country = request.args.get("country", "").strip()
    return leaderboard_options_payload(country)


def leaderboard_options_payload(country=""):
    cities_query = db.session.query(Participant.city).filter(Participant.city.isnot(None), Participant.city != "")
    if country:
        cities_query = cities_query.filter(Participant.country == country)
    return {
        "countries": [row.name for row in Country.query.filter_by(is_active=True).order_by(Country.name.asc()).all()],
        "cities": [row[0] for row in cities_query.distinct().order_by(Participant.city).all()],
    }


@public_bp.get("/countries")
def countries():
    rows = Country.query.filter_by(is_active=True).order_by(Country.name.asc()).all()
    return {"countries": [row.to_dict() for row in rows]}
