import re
from datetime import datetime, timedelta, timezone

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import AdminLog, Match, Prediction
from app.services.footballdata_io_service import maybe_sync_football_data
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
    identity = get_jwt_identity()
    if identity and identity != "admin":
        prediction = Prediction.query.filter_by(participant_id=int(identity), match_id=match.id).first()
    return {"match": match.to_dict(), "prediction": prediction.to_dict() if prediction else None}


@matches_bp.get("/dashboard")
@jwt_required(optional=True)
def dashboard_matches():
    identity = get_jwt_identity()
    maybe_sync_football_data("game_dashboard", role="participant" if identity else "public", user_id=identity, sync_types=["upcoming", "live", "results"])
    tz_offset_minutes = request.args.get("tz_offset_minutes", type=int)
    now = datetime.now(timezone.utc)
    today = client_today(tz_offset_minutes)
    open_matches = [
        match
        for match in Match.query.filter(Match.status.in_(["scheduled", "live"])).order_by(Match.match_datetime.asc()).all()
    ]
    upcoming_matches = [
        match
        for match in open_matches
        if local_match_date(match, tz_offset_minutes) >= today and as_utc(match.match_datetime) > now
    ]
    awaiting_matches = [
        match
        for match in open_matches
        if as_utc(match.match_datetime) <= now
    ]
    target_date = local_match_date(upcoming_matches[0], tz_offset_minutes) if upcoming_matches else None
    matches = [match for match in upcoming_matches if local_match_date(match, tz_offset_minutes) == target_date] if target_date else []

    predictions = {}
    prediction_match_ids = [match.id for match in [*matches, *awaiting_matches]]
    if identity and identity != "admin" and prediction_match_ids:
        rows = Prediction.query.filter(
            Prediction.participant_id == int(identity),
            Prediction.match_id.in_(prediction_match_ids),
        ).all()
        predictions = {prediction.match_id: prediction.to_dict() for prediction in rows}

    return {
        "matches": [match.to_dict() for match in matches],
        "awaiting_result_matches": [match.to_dict() for match in awaiting_matches],
        "predictions": predictions,
        "schedule_date": target_date.isoformat() if target_date else None,
        "announcements": recent_match_announcements(),
    }


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


def recent_match_announcements(limit=2):
    actions = {
        "manual_winner_update",
        "api_winner_update",
        "manual_draw_update",
        "api_draw_update",
        "cancel_match",
        "api_cancel_match",
        "reschedule_match",
        "api_reschedule_match",
    }
    logs = AdminLog.query.filter(AdminLog.admin_action.in_(actions)).order_by(AdminLog.created_at.desc()).limit(limit * 2).all()
    messages = []
    for log in logs:
        match_id = extract_match_id(log.details or "")
        match = db_get_match(match_id)
        if not match:
            continue
        if log.admin_action in {"manual_winner_update", "api_winner_update"}:
            text = f"Result updated: {match.team1} vs {match.team2} - {match.winner_team} won."
        elif log.admin_action in {"manual_draw_update", "api_draw_update"}:
            text = f"Result updated: {match.team1} vs {match.team2} ended in a draw. No winner bonus awarded."
        elif log.admin_action in {"cancel_match", "api_cancel_match"}:
            text = f"Match cancelled: {match.team1} vs {match.team2}. Participation rewards reversed."
        elif log.admin_action in {"reschedule_match", "api_reschedule_match"}:
            text = f"Match rescheduled: {match.team1} vs {match.team2} on {as_utc(match.match_datetime).isoformat()}."
        else:
            continue
        messages.append({"id": log.id, "type": log.admin_action, "message": text, "created_at": log.created_at.isoformat()})
        if len(messages) >= limit:
            break
    return messages


def extract_match_id(details):
    match = re.search(r"Match\s+(\d+)", details)
    return int(match.group(1)) if match else None


def db_get_match(match_id):
    return db.session.get(Match, match_id) if match_id else None


@matches_bp.get("")
def list_matches():
    matches = Match.query.order_by(Match.match_datetime.asc()).all()
    return {"matches": [match.to_dict() for match in matches]}
