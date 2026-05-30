from flask import Blueprint, current_app, request
from flask_jwt_extended import create_access_token

from app.extensions import db, limiter
from app.models import Participant
from app.services.points_service import ENROLLMENT_POINTS, add_points
from app.utils.validators import ValidationError, compose_mobile, require_fields

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/enroll")
@limiter.limit("10 per minute")
def enroll():
    payload = request.get_json(silent=True) or {}
    try:
        require_fields(
            payload,
            [
                "full_name",
                "pharmacy_name",
                "country_code",
                "mobile_number",
                "country",
                "medical_rep_name",
                "medical_rep_country_code",
                "medical_rep_mobile_number",
            ],
        )
        participant_type = str(payload.get("participant_type") or "farmacist").strip().lower()
        if participant_type not in {"farmacist", "medical_rep"}:
            raise ValidationError("Select Farmacist or HETERO Rep.")
        country_code, mobile = compose_mobile(payload["country_code"], payload["mobile_number"])
        rep_country_code, rep_mobile = compose_mobile(payload["medical_rep_country_code"], payload["medical_rep_mobile_number"])
        if Participant.query.filter_by(mobile_number=mobile).first():
            return {"message": "This mobile number is already enrolled."}, 409
        if participant_type == "medical_rep":
            existing_rep = Participant.query.filter(
                db.func.lower(Participant.full_name) == str(payload["full_name"]).strip().lower(),
                Participant.participant_type == "medical_rep",
            ).first()
            if existing_rep:
                return {"message": "This HETERO Rep name is already enrolled."}, 409
        participant = Participant(
            full_name=str(payload["full_name"]).strip(),
            participant_type=participant_type,
            pharmacy_name=str(payload["pharmacy_name"]).strip(),
            country_code=country_code,
            mobile_number=mobile,
            email=None,
            country=str(payload["country"]).strip(),
            city=None,
            mr_id=None,
            medical_rep_name=str(payload["medical_rep_name"]).strip(),
            medical_rep_country_code=rep_country_code,
            medical_rep_mobile_number=rep_mobile,
            total_points=0,
        )
        db.session.add(participant)
        db.session.flush()
        add_points(participant, ENROLLMENT_POINTS, "Enrollment bonus")
        db.session.commit()
        token = create_access_token(identity=str(participant.id), additional_claims={"role": "participant"})
        return {"token": token, "role": "participant", "participant": participant.to_dict(include_private=True)}, 201
    except ValidationError as exc:
        db.session.rollback()
        return {"message": str(exc)}, 400


@auth_bp.post("/login")
@limiter.limit("15 per minute")
def login():
    payload = request.get_json(silent=True) or {}
    admin_value = str(payload.get("admin_code") or payload.get("code") or "").strip()
    if admin_value and admin_value == current_app.config["ADMIN_SECRET_CODE"]:
        token = create_access_token(identity="admin", additional_claims={"role": "admin"})
        return {"token": token, "role": "admin", "admin": {"name": "Farmacy Football Admin"}}
    return {"message": "Enter a valid admin code."}, 401
