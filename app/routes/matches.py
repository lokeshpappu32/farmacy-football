from datetime import datetime, timedelta, timezone

from flask import Blueprint, make_response, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models import Match, Prediction
from app.services.footballdata_io_service import maybe_sync_football_data
from app.utils.serialization import utc_iso
from app.utils.time import as_utc

matches_bp = Blueprint("matches", __name__)


@matches_bp.get("/upcoming")
@jwt_required(optional=True)
def upcoming_match():
    now = datetime.now(timezone.utc)
    match = next(
        (item for item in Match.query.filter(Match.status == "scheduled").order_by(Match.match_datetime.asc()).all() if as_utc(item.match_datetime) > now),
        None,
    )
    if not match:
        return {"match": None, "prediction": None}
    prediction = None
    participant_id = participant_identity()
    if participant_id:
        prediction = Prediction.query.filter_by(participant_id=participant_id, match_id=match.id).first()
    return {"match": match.to_dict(), "prediction": prediction.to_dict() if prediction else None}


@matches_bp.get("/dashboard")
@jwt_required(optional=True)
def dashboard_matches():
    identity = get_jwt_identity()
    participant_id = participant_identity()
    maybe_sync_football_data("game_dashboard", role="participant" if identity else "public", user_id=identity, sync_types=["upcoming", "live", "results"])
    tz_offset_minutes = request.args.get("tz_offset_minutes", type=int)
    now = datetime.now(timezone.utc)
    visible_until = now + timedelta(hours=48)
    open_matches = [
        match
        for match in Match.query.filter(Match.status.in_(["scheduled", "live"])).order_by(Match.match_datetime.asc()).all()
    ]
    upcoming_matches = [
        match
        for match in open_matches
        if now < as_utc(match.match_datetime) <= visible_until
    ]
    next_match = next((match for match in open_matches if as_utc(match.match_datetime) > now), None)
    awaiting_matches = [
        match
        for match in open_matches
        if as_utc(match.match_datetime) <= now
    ]
    matches = upcoming_matches

    predictions = {}
    prediction_match_ids = [match.id for match in [*matches, *awaiting_matches]]
    if participant_id and prediction_match_ids:
        rows = Prediction.query.filter(
            Prediction.participant_id == participant_id,
            Prediction.match_id.in_(prediction_match_ids),
        ).all()
        predictions = {prediction.match_id: prediction.to_dict() for prediction in rows}

    return {
        "matches": [match.to_dict() for match in matches],
        "next_match": next_match.to_dict() if next_match else None,
        "awaiting_result_matches": [match.to_dict() for match in awaiting_matches],
        "predictions": predictions,
        "window_hours": 48,
        "announcements": recent_match_announcements(participant_id),
    }


def participant_identity():
    identity = get_jwt_identity()
    return int(identity) if identity and str(identity).isdigit() else None


def local_datetime(value, tz_offset_minutes):
    utc_value = as_utc(value)
    if tz_offset_minutes is None:
        return utc_value
    return utc_value - timedelta(minutes=tz_offset_minutes)


def client_today(tz_offset_minutes):
    requested_date = request.args.get("client_date")
    if requested_date:
        try:
            return datetime.strptime(requested_date, "%Y-%m-%d").date()
        except ValueError:
            pass
    return local_datetime(datetime.now(timezone.utc), tz_offset_minutes).date()


def local_match_date(match, tz_offset_minutes):
    return local_datetime(match.match_datetime, tz_offset_minutes).date()


def recent_match_announcements(participant_id, limit=2):
    if not participant_id:
        return []

    predictions = (
        Prediction.query.join(Match)
        .filter(
            Prediction.participant_id == participant_id,
            Match.status.in_(["completed", "cancelled"]),
        )
        .order_by(Match.match_datetime.desc(), Match.updated_at.desc())
        .limit(limit)
        .all()
    )

    messages = []
    for prediction in predictions:
        match = prediction.match
        if match.status == "cancelled":
            update_type = "cancel_match"
            text = f"Match cancelled: {match.team1} vs {match.team2}. Participation points are retained."
        elif match.winner_team == "Draw":
            update_type = "draw_match"
            text = f"Result updated: {match.team1} vs {match.team2} ended in a draw. Draw predictions received +50 bonus."
        elif match.winner_team:
            update_type = "winner_update"
            text = f"Result updated: {match.team1} vs {match.team2} - {match.winner_team} won."
        else:
            continue
        messages.append({"id": match.id, "type": update_type, "message": text, "created_at": utc_iso(match.updated_at)})
    return messages


@matches_bp.get("/schedule")
@jwt_required(optional=True)
def match_schedule():
    maybe_sync_football_data("schedule", role="participant" if get_jwt_identity() else "public", sync_types=["upcoming", "live", "results"])
    now = datetime.now(timezone.utc)
    tz_offset_minutes = request.args.get("tz_offset_minutes", type=int)
    today = client_today(tz_offset_minutes)
    per_page = min(max(request.args.get("per_page", 8, type=int), 1), 24)
    upcoming_page = max(request.args.get("upcoming_page", 1, type=int), 1)
    completed_page = max(request.args.get("completed_page", 1, type=int), 1)

    upcoming_all = [
        match
        for match in Match.query.filter(Match.status.in_(["scheduled", "live"])).order_by(Match.match_datetime.asc()).all()
        if as_utc(match.match_datetime) > now and local_match_date(match, tz_offset_minutes) >= today
    ]
    completed_query = Match.query.filter(
        Match.status.in_(["completed", "cancelled"]),
    ).order_by(Match.match_datetime.desc())

    upcoming_total = len(upcoming_all)
    completed_total = completed_query.count()
    upcoming = upcoming_all[(upcoming_page - 1) * per_page : upcoming_page * per_page]
    completed = completed_query.offset((completed_page - 1) * per_page).limit(per_page).all()

    response = make_response({
        "upcoming": [match.to_dict() for match in upcoming],
        "completed": [match.to_dict() for match in completed],
        "pagination": {
            "upcoming": pagination_meta(upcoming_total, upcoming_page, per_page),
            "completed": pagination_meta(completed_total, completed_page, per_page),
        },
    })
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@matches_bp.get("")
def list_matches():
    matches = Match.query.order_by(Match.match_datetime.asc()).all()
    return {"matches": [match.to_dict() for match in matches]}


def pagination_meta(total, page, per_page):
    pages = max((total + per_page - 1) // per_page, 1)
    return {
        "page": page,
        "per_page": per_page,
        "total": total,
        "pages": pages,
        "has_prev": page > 1,
        "has_next": page < pages,
    }
