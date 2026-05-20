from flask import Blueprint, current_app, request
from flask_jwt_extended import create_access_token

from app.extensions import db, limiter
from app.models import Participant
from app.services.points_service import ENROLLMENT_POINTS, add_points
from app.utils.validators import ValidationError, clean_email, clean_mobile, compose_mobile, require_fields

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/enroll")
@limiter.limit("10 per minute")
def enroll():
    payload = request.get_json(silent=True) or {}
    try:
        require_fields(payload, ["full_name", "country_code", "mobile_number", "email", "country", "mr_id"])
        country_code, mobile = compose_mobile(payload["country_code"], payload["mobile_number"])
        if Participant.query.filter_by(mobile_number=mobile).first():
            return {"message": "This mobile number is already enrolled."}, 409
        participant = Participant(
            full_name=str(payload["full_name"]).strip(),
            country_code=country_code,
            mobile_number=mobile,
            email=clean_email(payload["email"]),
            country=str(payload["country"]).strip(),
            mr_id=str(payload["mr_id"]).strip(),
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
    value = str(payload.get("mobile_number") or "").strip()
    if (admin_value and admin_value == current_app.config["ADMIN_SECRET_CODE"]) or value == current_app.config["ADMIN_SECRET_CODE"]:
        token = create_access_token(identity="admin", additional_claims={"role": "admin"})
        return {"token": token, "role": "admin", "admin": {"name": "Farmacy Football Admin"}}
    if not value:
        return {"message": "Mobile number is required."}, 400
    if payload.get("country_code"):
        try:
            _, mobile = compose_mobile(payload["country_code"], value)
        except ValidationError as exc:
            return {"message": str(exc)}, 400
    else:
        mobile = clean_mobile(value)
    if value == current_app.config["ADMIN_SECRET_CODE"]:
        token = create_access_token(identity="admin", additional_claims={"role": "admin"})
        return {"token": token, "role": "admin", "admin": {"name": "Farmacy Football Admin"}}
    participant = Participant.query.filter_by(mobile_number=mobile).first()
    if not participant:
        return {"message": "Mobile number is not enrolled yet."}, 404
    token = create_access_token(identity=str(participant.id), additional_claims={"role": "participant"})
    return {"token": token, "role": "participant", "participant": participant.to_dict(include_private=True)}
