import csv
from io import StringIO

from flask import Blueprint, Response, current_app, request

from app.auth.guards import admin_or_super_admin_required, super_admin_required
from app.extensions import db
from app.models import AdminLog, ApiCallLog, ApiSyncState, Country, Match, Participant, Prediction
from app.services.analytics_service import admin_analytics, leaderboard_page
from app.utils.participant_types import HETERO_TYPES, PHARMACY_TYPES
from app.services.footballdata_io_service import maybe_sync_football_data
from app.services.match_service import cancel_match, finalize_draw, manual_update_winner, reschedule_match, sync_matches_from_api
from app.services.winner_correction_service import correct_match_winner, find_match_for_correction
from app.utils.serialization import utc_iso
from app.utils.validators import ValidationError, clean_email, clean_mobile, parse_utc_datetime, require_fields

admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/dashboard")
@super_admin_required
def dashboard():
    maybe_sync_football_data("admin_dashboard", role="admin", user_id="admin", sync_types=["upcoming", "live", "results", "usage", "health"])
    admin_log_page = positive_int(request.args.get("admin_log_page"), 1)
    api_log_page = positive_int(request.args.get("api_log_page"), 1)
    per_page = min(positive_int(request.args.get("per_page"), 10), 50)
    logs_page = AdminLog.query.order_by(AdminLog.created_at.desc()).paginate(page=admin_log_page, per_page=per_page, error_out=False)
    api_logs_page = ApiCallLog.query.order_by(ApiCallLog.created_at.desc()).paginate(page=api_log_page, per_page=per_page, error_out=False)
    sync_states = ApiSyncState.query.order_by(ApiSyncState.sync_type.asc()).all()
    return {
        **admin_analytics(),
        "logs": [log.to_dict() for log in logs_page.items],
        "logs_pagination": pagination_payload(logs_page),
        "api_logs": [log.to_dict() for log in api_logs_page.items],
        "api_logs_pagination": pagination_payload(api_logs_page),
        "api_sync_states": [
            {
                "sync_type": state.sync_type,
                "last_synced_at": utc_iso(state.last_synced_at),
                "last_status": state.last_status,
                "last_error": state.last_error,
                "requests_used_snapshot": state.requests_used_snapshot,
                "requests_limit_snapshot": state.requests_limit_snapshot,
            }
            for state in sync_states
        ],
    }


def positive_int(value, fallback):
    try:
        parsed = int(value)
        return parsed if parsed > 0 else fallback
    except (TypeError, ValueError):
        return fallback


def pagination_payload(page):
    return {
        "page": page.page,
        "per_page": page.per_page,
        "total": page.total,
        "pages": page.pages,
        "has_prev": page.has_prev,
        "has_next": page.has_next,
    }


@admin_bp.post("/sync-matches")
@super_admin_required
def sync_matches():
    if current_app.config.get("FOOTBALLDATA_IO_SYNC_ENABLED"):
        return maybe_sync_football_data("admin_matches", role="admin", user_id="admin", sync_types=["upcoming", "live", "results", "usage", "health"])
    try:
        return sync_matches_from_api()
    except Exception as exc:
        return {"message": f"Match sync failed: {exc}"}, 502


@admin_bp.get("/matches")
@super_admin_required
def admin_matches():
    maybe_sync_football_data("admin_matches", role="admin", user_id="admin", sync_types=["upcoming", "live", "results"])
    page = positive_int(request.args.get("page"), 1)
    per_page = min(positive_int(request.args.get("per_page"), 20), 100)
    matches_page = Match.query.order_by(Match.match_datetime.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return {
        "matches": [match.to_dict() for match in matches_page.items],
        "pagination": pagination_payload(matches_page),
    }


@admin_bp.post("/matches")
@super_admin_required
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
@super_admin_required
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
@super_admin_required
def update_winner(match_id):
    match = db.session.get(Match, match_id)
    if not match:
        return {"message": "Match not found."}, 404
    try:
        closed, awarded = manual_update_winner(match, str((request.get_json(silent=True) or {}).get("winner_team", "")).strip())
        return {"match": match.to_dict(), "closed": closed, "awarded": awarded, "message": "Winner updated and points awarded."}
    except ValueError as exc:
        return {"message": str(exc)}, 400


@admin_bp.post("/matches/<int:match_id>/action")
@super_admin_required
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
            closed, awarded = manual_update_winner(match, str(payload.get("winner_team") or "").strip())
            return {"match": match.to_dict(), "closed": closed, "awarded": awarded, "message": "Winner updated and points awarded."}
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


@admin_bp.post("/matches/correct-winner")
@super_admin_required
def correct_winner():
    payload = request.get_json(silent=True) or {}
    winner = str(payload.get("winner_team") or payload.get("winner") or "").strip()
    dry_run = bool(payload.get("dry_run", True))
    if not winner:
        return {"message": "winner_team is required."}, 400
    try:
        match = find_match_for_correction(
            match_id=payload.get("match_id"),
            api_match_id=payload.get("api_match_id"),
            team1=str(payload.get("team1") or "").strip() or None,
            team2=str(payload.get("team2") or "").strip() or None,
        )
        result = correct_match_winner(match, winner, dry_run=dry_run)
        return {"message": "Dry run completed." if dry_run else "Winner correction applied.", "result": result}
    except ValueError as exc:
        return {"message": str(exc)}, 400


@admin_bp.delete("/matches/<int:match_id>")
@super_admin_required
def delete_match(match_id):
    match = db.session.get(Match, match_id)
    if not match:
        return {"message": "Match not found."}, 404
    db.session.delete(match)
    db.session.add(AdminLog(admin_action="delete_match", details=f"Deleted match {match_id}"))
    db.session.commit()
    return {"message": "Match deleted."}


@admin_bp.get("/users")
@admin_or_super_admin_required
def users():
    q, country, participant_type = user_filter_values()
    query = filtered_users_query()
    page = positive_int(request.args.get("page"), 1)
    per_page = min(positive_int(request.args.get("per_page"), 50), 200)
    users_page = query.order_by(Participant.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return {
        "filters": {"q": q, "country": country, "participant_type": participant_type},
        "countries": [
            row[0]
            for row in db.session.query(Participant.country)
            .filter(Participant.country.isnot(None), Participant.country != "")
            .distinct()
            .order_by(Participant.country)
            .all()
        ],
        "participant_types": participant_type_options(),
        "users": [user.to_dict(include_private=True) for user in users_page.items],
        "pagination": pagination_payload(users_page),
    }


@admin_bp.get("/users/options")
@admin_or_super_admin_required
def user_filter_options():
    country = request.args.get("country", "").strip()
    return {
        "countries": [
            row[0]
            for row in db.session.query(Participant.country)
            .filter(Participant.country.isnot(None), Participant.country != "")
            .distinct()
            .order_by(Participant.country)
            .all()
        ],
        "participant_types": participant_type_options(),
    }


@admin_bp.put("/users/<int:user_id>")
@super_admin_required
def update_user(user_id):
    user = db.session.get(Participant, user_id)
    if not user:
        return {"message": "User not found."}, 404
    payload = request.get_json(silent=True) or {}
    if "mobile_number" in payload:
        user.mobile_number = clean_mobile(payload["mobile_number"])
    if "email" in payload:
        user.email = clean_email(payload.get("email"))
    for field in ["full_name", "country", "city", "mr_id"]:
        if field in payload:
            setattr(user, field, str(payload[field]).strip())
    if "total_points" in payload:
        user.total_points = int(payload["total_points"])
    db.session.add(AdminLog(admin_action="update_user", details=f"Updated user {user_id}"))
    db.session.commit()
    return {"user": user.to_dict(include_private=True)}


@admin_bp.get("/leaderboard")
@super_admin_required
def admin_leaderboard():
    page = positive_int(request.args.get("page"), 1)
    per_page = min(positive_int(request.args.get("per_page"), 50), 100)
    data = leaderboard_page(page=page, per_page=per_page)
    return {"leaderboard": data["rows"], "pagination": data["pagination"]}


@admin_bp.get("/analytics")
@super_admin_required
def analytics():
    maybe_sync_football_data("admin_analytics", role="admin", user_id="admin", sync_types=["results"])
    return admin_analytics()


@admin_bp.get("/drug-analytics")
@super_admin_required
def drug_analytics():
    maybe_sync_football_data("admin_analytics", role="admin", user_id="admin", sync_types=["results"])
    country = request.args.get("country", "").strip()
    participant_type = request.args.get("participant_type", request.args.get("user_type", "")).strip()
    sort = request.args.get("sort", "most").strip().lower()
    page = positive_int(request.args.get("page"), 1)
    per_page = min(positive_int(request.args.get("per_page"), 25), 100)

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
    query = apply_participant_type_filter(query, participant_type)
    order = db.asc("selection_count") if sort == "least" else db.desc("selection_count")
    drug_rows = query.group_by(Prediction.favorite_drug).order_by(order).all()

    answer_query = Prediction.query.join(Participant, Participant.id == Prediction.participant_id).join(Match, Match.id == Prediction.match_id)
    if country:
        answer_query = answer_query.filter(Participant.country == country)
    answer_query = apply_participant_type_filter(answer_query, participant_type)

    answer_page = answer_query.order_by(Prediction.submitted_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    filtered_answers_count = answer_query.count()
    unique_users_count = (
        answer_query.with_entities(db.func.count(db.distinct(Prediction.participant_id))).scalar()
        or 0
    )
    pending_results_count = answer_query.filter(Prediction.is_correct.is_(None)).count()

    countries = [row[0] for row in db.session.query(Participant.country).filter(Participant.country.isnot(None)).distinct().order_by(Participant.country).all()]

    return {
        "filters": {"country": country, "participant_type": participant_type, "sort": sort},
        "countries": countries,
        "participant_types": participant_type_options(),
        "summary": {
            "answers": int(filtered_answers_count),
            "unique_users": int(unique_users_count),
            "pending_results": int(pending_results_count),
        },
        "drugs": [
            {"favorite_drug": drug, "selection_count": int(count), "unique_users": int(unique_users)}
            for drug, count, unique_users in drug_rows
        ],
        "answers": [
            {
                "id": prediction.id,
                "participant": prediction.participant.full_name,
                "mobile_number": prediction.participant.mobile_number,
                "email": prediction.participant.email,
                "country": prediction.participant.country,
                "city": prediction.participant.city,
                "mr_id": prediction.participant.mr_id,
                "participant_type": prediction.participant.participant_type,
                "total_points": prediction.participant.total_points,
                "match": f"{prediction.match.team1} vs {prediction.match.team2}",
                "match_status": prediction.match.status,
                "match_result": prediction.match.result_label(),
                "winner_team": prediction.match.winner_team,
                "predicted_team": prediction.predicted_team,
                "favorite_drug": prediction.favorite_drug,
                "is_correct": prediction.is_correct,
                "participation_points": prediction.participation_points,
                "winner_points": prediction.winner_points,
                "submitted_at": utc_iso(prediction.submitted_at),
            }
            for prediction in answer_page.items
        ],
        "pagination": pagination_payload(answer_page),
    }


def apply_participant_type_filter(query, participant_type):
    if not participant_type:
        return query
    if participant_type == "all_farmacists":
        return query.filter(Participant.participant_type.in_(PHARMACY_TYPES))
    if participant_type == "farmacy_head_supervisor":
        return query.filter(Participant.participant_type.in_({"farmacy_head_supervisor", "farmacy_head", "farmacy_supervisor"}))
    if participant_type == "hetero_representative_staff":
        return query.filter(Participant.participant_type.in_(HETERO_TYPES))
    return query.filter(Participant.participant_type == participant_type)


@admin_bp.get("/export/users.csv")
@admin_or_super_admin_required
def export_users():
    query = filtered_users_query()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "full_name", "user_type", "mobile_number", "email", "country", "city", "hetero_rep_name", "hetero_rep_mobile", "total_points", "created_at"])
    for user in query.order_by(Participant.created_at.desc()).all():
        writer.writerow([user.id, user.full_name, user.participant_type, user.mobile_number, user.email, user.country, user.city, user.medical_rep_name, user.medical_rep_mobile_number, user.total_points, user.created_at])
    return Response(output.getvalue(), mimetype="text/csv", headers={"Content-Disposition": "attachment; filename=farmacy-users.csv"})


def user_filter_values():
    return (
        request.args.get("q", "").strip(),
        request.args.get("country", "").strip(),
        request.args.get("participant_type", request.args.get("user_type", "")).strip(),
    )


def filtered_users_query():
    q, country, participant_type = user_filter_values()
    query = Participant.query
    if q:
        query = query.filter(
            db.or_(
                Participant.full_name.ilike(f"%{q}%"),
                Participant.mobile_number.ilike(f"%{q}%"),
                Participant.email.ilike(f"%{q}%"),
                Participant.country.ilike(f"%{q}%"),
                Participant.city.ilike(f"%{q}%"),
                Participant.mr_id.ilike(f"%{q}%"),
                Participant.medical_rep_name.ilike(f"%{q}%"),
                Participant.medical_rep_mobile_number.ilike(f"%{q}%"),
            )
        )
    if country:
        query = query.filter(Participant.country == country)
    if participant_type:
        if participant_type == "all_farmacists":
            query = query.filter(Participant.participant_type.in_(PHARMACY_TYPES))
        elif participant_type == "farmacy_head_supervisor":
            query = query.filter(Participant.participant_type.in_({"farmacy_head_supervisor", "farmacy_head", "farmacy_supervisor"}))
        elif participant_type == "hetero_representative_staff":
            query = query.filter(Participant.participant_type.in_(HETERO_TYPES))
        else:
            query = query.filter(Participant.participant_type == participant_type)
    return query


def participant_type_options():
    return [
        {"value": "all_farmacists", "label": "All Farmacists"},
        {"value": "farmacy_owner", "label": "Farmacy Owner"},
        {"value": "farmacy_head_supervisor", "label": "Farmacy Head / Supervisor"},
        {"value": "farmacy_sales_staff", "label": "Farmacy Sales Staff"},
        {"value": "hetero_representative_staff", "label": "HETERO Representative / Staff"},
    ]


@admin_bp.get("/predictions")
@super_admin_required
def admin_predictions():
    return {"predictions": [prediction.to_dict() for prediction in Prediction.query.order_by(Prediction.updated_at.desc()).limit(1000).all()]}
