import re
from datetime import datetime, timezone

from flask import Blueprint
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import AdminLog, Match, Prediction
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
    now = datetime.now(timezone.utc)
    scheduled = [
        match
        for match in Match.query.filter(Match.status == "scheduled").order_by(Match.match_datetime.asc()).all()
        if as_utc(match.match_datetime) > now
    ]
    target_date = as_utc(scheduled[0].match_datetime).date() if scheduled else None
    matches = [match for match in scheduled if as_utc(match.match_datetime).date() == target_date] if target_date else []

    identity = get_jwt_identity()
    predictions = {}
    if identity and identity != "admin" and matches:
        rows = Prediction.query.filter(
            Prediction.participant_id == int(identity),
            Prediction.match_id.in_([match.id for match in matches]),
        ).all()
        predictions = {prediction.match_id: prediction.to_dict() for prediction in rows}

    return {
        "matches": [match.to_dict() for match in matches],
        "predictions": predictions,
        "schedule_date": target_date.isoformat() if target_date else None,
        "announcements": recent_match_announcements(),
    }


def recent_match_announcements(limit=2):
    actions = {"manual_winner_update", "manual_draw_update", "cancel_match", "reschedule_match"}
    logs = AdminLog.query.filter(AdminLog.admin_action.in_(actions)).order_by(AdminLog.created_at.desc()).limit(limit * 2).all()
    messages = []
    for log in logs:
        match_id = extract_match_id(log.details or "")
        match = db_get_match(match_id)
        if not match:
            continue
        if log.admin_action == "manual_winner_update":
            text = f"Result updated: {match.team1} vs {match.team2} - {match.winner_team} won."
        elif log.admin_action == "manual_draw_update":
            text = f"Result updated: {match.team1} vs {match.team2} ended in a draw. No winner bonus awarded."
        elif log.admin_action == "cancel_match":
            text = f"Match cancelled: {match.team1} vs {match.team2}. No winner bonus awarded."
        elif log.admin_action == "reschedule_match":
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
