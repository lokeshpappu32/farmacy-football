import csv
from io import StringIO

from flask import Blueprint, Response, request

from app.auth.guards import admin_required
from app.extensions import db
from app.models import AdminLog, Match, Participant, Prediction
from app.services.analytics_service import admin_analytics, leaderboard
from app.services.match_service import manual_update_winner, sync_matches_from_api
from app.services.twilio_service import send_match_reminders
from app.utils.validators import ValidationError, clean_email, clean_mobile, parse_utc_datetime, require_fields

admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/dashboard")
@admin_required
def dashboard():
    logs = AdminLog.query.order_by(AdminLog.created_at.desc()).limit(20).all()
    return {**admin_analytics(), "logs": [log.to_dict() for log in logs]}


@admin_bp.post("/sync-matches")
@admin_required
def sync_matches():
    try:
        return sync_matches_from_api()
    except Exception as exc:
        return {"message": f"Match sync failed: {exc}"}, 502


@admin_bp.post("/reminders")
@admin_required
def resend_reminders():
    sent = send_match_reminders()
    db.session.add(AdminLog(admin_action="resend_reminders", details=f"Reminder send attempted. Sent count: {sent}"))
    db.session.commit()
    return {"message": "Reminder job completed.", "sent": sent}


@admin_bp.get("/matches")
@admin_required
def admin_matches():
    return {"matches": [match.to_dict() for match in Match.query.order_by(Match.match_datetime.desc()).all()]}


@admin_bp.post("/matches")
@admin_required
def create_match():
    payload = request.get_json(silent=True) or {}
    try:
        require_fields(payload, ["team1", "team2", "match_datetime"])
        match = Match(
            api_match_id=payload.get("api_match_id"),
            team1=str(payload["team1"]).strip(),
            team2=str(payload["team2"]).strip(),
            team1_logo=payload.get("team1_logo"),
            team2_logo=payload.get("team2_logo"),
            match_datetime=parse_utc_datetime(payload["match_datetime"]),
            status=payload.get("status") or "scheduled",
        )
        db.session.add(match)
        db.session.add(AdminLog(admin_action="create_match", details=f"Created {match.team1} vs {match.team2}"))
        db.session.commit()
        return {"match": match.to_dict()}, 201
    except ValidationError as exc:
        return {"message": str(exc)}, 400


@admin_bp.put("/matches/<int:match_id>")
@admin_required
def update_match(match_id):
    match = db.session.get(Match, match_id)
    if not match:
        return {"message": "Match not found."}, 404
    payload = request.get_json(silent=True) or {}
    for field in ["team1", "team2", "team1_logo", "team2_logo", "status", "winner_team"]:
        if field in payload:
            setattr(match, field, payload[field])
    if payload.get("match_datetime"):
        match.match_datetime = parse_utc_datetime(payload["match_datetime"])
    db.session.add(AdminLog(admin_action="update_match", details=f"Updated match {match_id}"))
    db.session.commit()
    return {"match": match.to_dict()}


@admin_bp.post("/matches/<int:match_id>/winner")
@admin_required
def update_winner(match_id):
    match = db.session.get(Match, match_id)
    if not match:
        return {"message": "Match not found."}, 404
    try:
        awarded = manual_update_winner(match, str((request.get_json(silent=True) or {}).get("winner_team", "")).strip())
        return {"match": match.to_dict(), "awarded": awarded}
    except ValueError as exc:
        return {"message": str(exc)}, 400


@admin_bp.delete("/matches/<int:match_id>")
@admin_required
def delete_match(match_id):
    match = db.session.get(Match, match_id)
    if not match:
        return {"message": "Match not found."}, 404
    db.session.delete(match)
    db.session.add(AdminLog(admin_action="delete_match", details=f"Deleted match {match_id}"))
    db.session.commit()
    return {"message": "Match deleted."}


@admin_bp.get("/users")
@admin_required
def users():
    q = request.args.get("q", "").strip()
    query = Participant.query
    if q:
        query = query.filter(
            db.or_(
                Participant.full_name.ilike(f"%{q}%"),
                Participant.mobile_number.ilike(f"%{q}%"),
                Participant.country.ilike(f"%{q}%"),
                Participant.mr_id.ilike(f"%{q}%"),
            )
        )
    return {"users": [user.to_dict(include_private=True) for user in query.order_by(Participant.created_at.desc()).limit(500).all()]}


@admin_bp.put("/users/<int:user_id>")
@admin_required
def update_user(user_id):
    user = db.session.get(Participant, user_id)
    if not user:
        return {"message": "User not found."}, 404
    payload = request.get_json(silent=True) or {}
    if "mobile_number" in payload:
        user.mobile_number = clean_mobile(payload["mobile_number"])
    if "email" in payload:
        user.email = clean_email(payload.get("email"))
    for field in ["full_name", "country", "mr_id"]:
        if field in payload:
            setattr(user, field, str(payload[field]).strip())
    if "total_points" in payload:
        user.total_points = int(payload["total_points"])
    db.session.add(AdminLog(admin_action="update_user", details=f"Updated user {user_id}"))
    db.session.commit()
    return {"user": user.to_dict(include_private=True)}


@admin_bp.get("/leaderboard")
@admin_required
def admin_leaderboard():
    return {"leaderboard": leaderboard(limit=500)}


@admin_bp.get("/analytics")
@admin_required
def analytics():
    return admin_analytics()


@admin_bp.get("/export/users.csv")
@admin_required
def export_users():
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "full_name", "mobile_number", "email", "country", "mr_id", "total_points", "created_at"])
    for user in Participant.query.order_by(Participant.created_at.desc()).all():
        writer.writerow([user.id, user.full_name, user.mobile_number, user.email, user.country, user.mr_id, user.total_points, user.created_at])
    return Response(output.getvalue(), mimetype="text/csv", headers={"Content-Disposition": "attachment; filename=farmacy-users.csv"})


@admin_bp.get("/predictions")
@admin_required
def admin_predictions():
    return {"predictions": [prediction.to_dict() for prediction in Prediction.query.order_by(Prediction.updated_at.desc()).limit(1000).all()]}
