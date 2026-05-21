import csv
from io import StringIO

from flask import Blueprint, Response, request

from app.auth.guards import admin_required
from app.extensions import db
from app.models import AdminLog, Country, Match, Participant, Prediction
from app.services.analytics_service import admin_analytics, leaderboard
from app.services.match_service import cancel_match, finalize_draw, manual_update_winner, queue_prediction_awards, reschedule_match, sync_matches_from_api
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
        require_fields(payload, ["match_datetime"])
        team1_country = None
        team2_country = None
        if payload.get("team1_iso") and payload.get("team2_iso"):
            team1_country = Country.query.filter_by(iso_code=str(payload["team1_iso"]).upper(), is_active=True).first()
            team2_country = Country.query.filter_by(iso_code=str(payload["team2_iso"]).upper(), is_active=True).first()
            if not team1_country or not team2_country:
                raise ValidationError("Select valid countries for both teams.")
            if team1_country.iso_code == team2_country.iso_code:
                raise ValidationError("Team 1 and Team 2 must be different countries.")
            team1 = team1_country.name
            team2 = team2_country.name
            team1_logo = team1_country.flag_url
            team2_logo = team2_country.flag_url
        else:
            require_fields(payload, ["team1", "team2"])
            team1 = str(payload["team1"]).strip()
            team2 = str(payload["team2"]).strip()
            team1_logo = payload.get("team1_logo")
            team2_logo = payload.get("team2_logo")
        match = Match(
            api_match_id=payload.get("api_match_id"),
            team1=team1,
            team2=team2,
            team1_logo=team1_logo,
            team2_logo=team2_logo,
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
        manual_update_winner(match, str((request.get_json(silent=True) or {}).get("winner_team", "")).strip())
        queue_prediction_awards(match.id)
        return {"match": match.to_dict(), "awards_queued": True, "message": "Winner updated. Points are being awarded in the background."}
    except ValueError as exc:
        return {"message": str(exc)}, 400


@admin_bp.post("/matches/<int:match_id>/action")
@admin_required
def update_match_action(match_id):
    match = db.session.get(Match, match_id)
    if not match:
        return {"message": "Match not found."}, 404
    payload = request.get_json(silent=True) or {}
    action = str(payload.get("action") or "").strip().lower()
    if match.status in {"completed", "cancelled"}:
        return {"message": "This match is already finalized and cannot be updated."}, 400
    try:
        if action == "winner":
            manual_update_winner(match, str(payload.get("winner_team") or "").strip())
            queue_prediction_awards(match.id)
            return {"match": match.to_dict(), "awards_queued": True, "message": "Winner updated. Points are being awarded in the background."}
        if action == "draw":
            closed = finalize_draw(match)
            return {"match": match.to_dict(), "closed": closed, "message": "Match marked as draw."}
        if action == "cancel":
            closed = cancel_match(match)
            return {"match": match.to_dict(), "closed": closed, "message": "Match cancelled."}
        if action == "reschedule":
            rescheduled = reschedule_match(match, parse_utc_datetime(payload.get("match_datetime")))
            return {"match": rescheduled.to_dict(), "message": "Match rescheduled."}
    except (ValueError, ValidationError) as exc:
        return {"message": str(exc)}, 400
    return {"message": "Unsupported match action."}, 400


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


@admin_bp.get("/drug-analytics")
@admin_required
def drug_analytics():
    country = request.args.get("country", "").strip()
    mr_id = request.args.get("mr_id", "").strip()
    sort = request.args.get("sort", "most").strip().lower()

    query = (
        db.session.query(
            Prediction.favorite_drug,
            db.func.count(Prediction.id).label("selection_count"),
            db.func.count(db.distinct(Prediction.participant_id)).label("unique_users"),
        )
        .join(Participant, Participant.id == Prediction.participant_id)
    )
    if country:
        query = query.filter(Participant.country == country)
    if mr_id:
        query = query.filter(Participant.mr_id == mr_id.upper())
    order = db.asc("selection_count") if sort == "least" else db.desc("selection_count")
    drug_rows = query.group_by(Prediction.favorite_drug).order_by(order).all()

    answer_query = Prediction.query.join(Participant, Participant.id == Prediction.participant_id).join(Match, Match.id == Prediction.match_id)
    if country:
        answer_query = answer_query.filter(Participant.country == country)
    if mr_id:
        answer_query = answer_query.filter(Participant.mr_id == mr_id.upper())

    countries = [row[0] for row in db.session.query(Participant.country).filter(Participant.country.isnot(None)).distinct().order_by(Participant.country).all()]
    mr_ids = [row[0] for row in db.session.query(Participant.mr_id).filter(Participant.mr_id.isnot(None), Participant.mr_id != "").distinct().order_by(Participant.mr_id).all()]

    return {
        "filters": {"country": country, "mr_id": mr_id.upper() if mr_id else "", "sort": sort},
        "countries": countries,
        "mr_ids": mr_ids,
        "drugs": [
            {"favorite_drug": drug, "selection_count": int(count), "unique_users": int(unique_users)}
            for drug, count, unique_users in drug_rows
        ],
        "answers": [
            {
                "id": prediction.id,
                "participant": prediction.participant.full_name,
                "mobile_number": prediction.participant.mobile_number,
                "country": prediction.participant.country,
                "mr_id": prediction.participant.mr_id,
                "match": f"{prediction.match.team1} vs {prediction.match.team2}",
                "predicted_team": prediction.predicted_team,
                "favorite_drug": prediction.favorite_drug,
                "is_correct": prediction.is_correct,
                "submitted_at": prediction.submitted_at.isoformat() if prediction.submitted_at else None,
            }
            for prediction in answer_query.order_by(Prediction.submitted_at.desc()).limit(500).all()
        ],
    }


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
