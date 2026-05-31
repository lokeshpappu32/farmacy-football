from flask import Blueprint, request

from app.auth.guards import admin_required
from app.services.analytics_service import mr_dashboard_analytics, mr_participation_rankings
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
    data = mr_dashboard_analytics(country=country)
    return {
        "filters": data["filters"],
        "countries": data["countries"],
        "mr_rankings": data["mr_rankings"],
    }
