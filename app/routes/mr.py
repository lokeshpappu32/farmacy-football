from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from app.auth.guards import admin_required, hetero_rep_required
from app.models import Country, PointsHistory, Prediction
from app.services.analytics_service import hetero_points_leaderboard, hetero_rep_participation_performance, leaderboard, mr_dashboard_analytics
from app.services.footballdata_io_service import maybe_sync_football_data

mr_bp = Blueprint("mr", __name__)


@mr_bp.get("/performance")
@admin_required
def mr_performance():
    maybe_sync_football_data("mr_dashboard", role="admin", user_id="mr_admin", sync_types=["results"])
    country = request.args.get("country", "").strip()
    return mr_dashboard_analytics(country=country)


@mr_bp.get("/standing")
@admin_required
def mr_standing():
    maybe_sync_football_data("mr_dashboard", role="admin", user_id="mr_admin", sync_types=["results"])
    country = request.args.get("country", "").strip()
    return {
        "filters": {"country": country},
        "countries": countries_payload(),
        "mr_rankings": hetero_points_leaderboard(country=country),
    }


@mr_bp.get("/rep/performance")
@hetero_rep_required
def rep_performance():
    identity = int(get_jwt_identity())
    maybe_sync_football_data("rep_performance", role="hetero_rep", user_id=identity, sync_types=["results"])
    country = request.args.get("country", "").strip()
    return hetero_rep_participation_performance(identity, country=country)


@mr_bp.get("/rep/standing")
@hetero_rep_required
def rep_standing():
    identity = int(get_jwt_identity())
    maybe_sync_football_data("rep_standing", role="hetero_rep", user_id=identity, sync_types=["results"])
    country = request.args.get("country", "").strip()
    rows = hetero_points_leaderboard(country=country)
    own = next((row for row in rows if row["id"] == identity), None)
    return {
        "filters": {"country": country},
        "countries": countries_payload(),
        "own": own,
        "mr_rankings": rows,
        "points_history": [
            item.to_dict()
            for item in PointsHistory.query.filter_by(participant_id=identity)
            .order_by(PointsHistory.created_at.desc())
            .limit(100)
            .all()
        ],
        "match_history": [
            item.to_dict()
            for item in Prediction.query.filter_by(participant_id=identity)
            .order_by(Prediction.updated_at.desc())
            .limit(100)
            .all()
        ],
    }


@mr_bp.get("/rep/farmacist-standing")
@hetero_rep_required
def rep_farmacist_standing():
    identity = int(get_jwt_identity())
    data = hetero_rep_participation_performance(identity)
    return {"leaderboard": data["farmacist_standings"]}


def countries_payload():
    return [row.name for row in Country.query.filter_by(is_active=True).order_by(Country.name.asc()).all()]
