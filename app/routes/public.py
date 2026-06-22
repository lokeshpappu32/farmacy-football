from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.auth.guards import participant_required
from app.extensions import db
from app.models import Country, Participant
from app.services.analytics_service import leaderboard_page, participant_performance, participant_rank_payload
from app.services.footballdata_io_service import maybe_sync_football_data

public_bp = Blueprint("public", __name__)
HETERO_TYPES = {"medical_rep", "hetero_rep", "hetero_representative_staff", "hetero_staff", "hetero_representative", "representative", "rep", "mr"}


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
    medical_rep_name = request.args.get("medical_rep_name", "").strip()
    medical_rep_mobile_number = request.args.get("medical_rep_mobile_number", "").strip()
    page = max(request.args.get("page", 1, type=int), 1)
    per_page = min(max(request.args.get("per_page", 50, type=int), 1), 100)
    data = leaderboard_page(
        country=country,
        medical_rep_name=medical_rep_name,
        medical_rep_mobile_number=medical_rep_mobile_number,
        page=page,
        per_page=per_page,
    )
    own = None
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            own = participant_rank_payload(data["query"], int(identity))
    except Exception:
        own = None
    return {
        "filters": {
            "country": country,
            "medical_rep_name": medical_rep_name,
            "medical_rep_mobile_number": medical_rep_mobile_number,
        },
        **leaderboard_options_payload(country=country),
        "leaderboard": data["rows"],
        "pagination": data["pagination"],
        "own": own,
    }


@public_bp.get("/leaderboard/options")
def leaderboard_options():
    country = request.args.get("country", "").strip()
    return leaderboard_options_payload(country=country)


def leaderboard_options_payload(country=None):
    rep_query = Participant.query.filter(
        Participant.participant_type.in_(HETERO_TYPES),
        Participant.full_name.isnot(None),
        Participant.mobile_number.isnot(None),
    )
    if country:
        rep_query = rep_query.filter(Participant.country == country)
    reps = [
        {
            "name": row.full_name,
            "mobile_number": row.mobile_number,
            "country": row.country,
            "participant_type": row.participant_type,
        }
        for row in rep_query.order_by(Participant.country.asc(), Participant.full_name.asc()).all()
    ]
    return {
        "countries": [row.name for row in Country.query.filter_by(is_active=True).order_by(Country.name.asc()).all()],
        "medical_rep_names": sorted({row["name"] for row in reps}),
        "medical_reps": reps,
    }


@public_bp.get("/countries")
def countries():
    rows = Country.query.filter_by(is_active=True).order_by(Country.name.asc()).all()
    return {"countries": [row.to_dict() for row in rows]}
