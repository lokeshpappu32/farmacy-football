from flask import Blueprint, current_app, request
from flask_jwt_extended import create_access_token
from hmac import compare_digest
from sqlalchemy.exc import IntegrityError

from app.extensions import db, limiter
from app.models import Participant
from app.services.points_service import ENROLLMENT_POINTS, add_points
from app.utils.participant_types import app_role_for_participant
from app.utils.validators import ValidationError, compose_mobile, require_fields

auth_bp = Blueprint("auth", __name__)

PHARMACY_TYPES = {"farmacy_owner", "farmacy_head_supervisor", "farmacy_head", "farmacy_supervisor", "farmacy_sales_staff"}
HETERO_TYPES = {"hetero_representative_staff", "hetero_staff", "hetero_representative"}
LEGACY_FARMACIST_TYPES = {"farmacist"}
LEGACY_HETERO_TYPES = {"medical_rep", "hetero_rep", "representative", "rep", "mr"}
PARTICIPANT_TYPES = PHARMACY_TYPES | HETERO_TYPES | LEGACY_FARMACIST_TYPES | LEGACY_HETERO_TYPES
MR_REQUIRED_MESSAGE = "Kindly ask your Hetero Representative to enroll first using his/her mobile number."


def normalize_participant_type(payload):
    participant_type = str(payload.get("participant_type") or "").strip().lower()
    participant_type = participant_type.replace("-", "_").replace(" ", "_")
    if participant_type in {"pharmacy_head", "farmacy_head", "pharmacy_supervisor", "farmacy_supervisor"}:
        return "farmacy_head_supervisor"
    if participant_type in {"hetero_staff", "hetero_representative"} | LEGACY_HETERO_TYPES:
        return "hetero_representative_staff"
    if participant_type in PHARMACY_TYPES | HETERO_TYPES:
        return participant_type
    if participant_type in LEGACY_FARMACIST_TYPES:
        return "farmacy_owner"
    if not payload.get("pharmacy_name") and not payload.get("medical_rep_mobile_number") and not payload.get("medical_rep_name"):
        return "hetero_representative_staff"
    return "farmacy_owner"


def is_hetero_type(participant_type):
    return participant_type in HETERO_TYPES


def is_pharmacy_type(participant_type):
    return participant_type in PHARMACY_TYPES


def participant_login_response(participant, status_code=200):
    role = app_role_for_participant(participant)
    token = create_access_token(identity=str(participant.id), additional_claims={"role": role})
    return {"token": token, "role": role, "participant": participant.to_dict(include_private=True)}, status_code


def compose_labeled_mobile(country_code, mobile_number, label):
    try:
        return compose_mobile(country_code, mobile_number)
    except ValidationError as exc:
        message = str(exc)
        if "mobile number" in message.lower():
            raise ValidationError(f"Enter a valid {label} mobile number with 7 to 15 digits.") from exc
        if "country code" in message.lower():
            raise ValidationError(f"Select a valid country for {label} mobile number.") from exc
        raise


@auth_bp.post("/enroll")
@limiter.limit("10 per minute")
def enroll():
    payload = request.get_json(silent=True) or {}
    try:
        participant_type = normalize_participant_type(payload)
        if participant_type not in PARTICIPANT_TYPES:
            raise ValidationError("Select a valid user category.")
        require_fields(payload, ["full_name", "country_code", "mobile_number", "country"])
        if is_pharmacy_type(participant_type):
            require_fields(
                payload,
                ["pharmacy_name", "medical_rep_name", "medical_rep_country_code", "medical_rep_mobile_number"],
            )
        own_mobile_label = "Hetero Medical Rep" if is_hetero_type(participant_type) else "Farmacist"
        country_code, mobile = compose_labeled_mobile(payload["country_code"], payload["mobile_number"], own_mobile_label)
        rep_country_code, rep_mobile = compose_labeled_mobile(
            payload.get("medical_rep_country_code") or payload["country_code"],
            payload.get("medical_rep_mobile_number") or payload["mobile_number"],
            "Hetero Medical Rep",
        )
        country = str(payload["country"]).strip()
        existing_mobile = Participant.query.filter_by(country_code=country_code, mobile_number=mobile).first()
        if existing_mobile:
            if is_hetero_type(participant_type):
                return {"message": "Entered Hetero Medical Rep mobile number already exists."}, 409
            return {"message": "Entered Farmacist mobile number already exists."}, 409
        registered_rep = None
        if not is_hetero_type(participant_type):
            registered_rep = Participant.query.filter(
                Participant.participant_type.in_(HETERO_TYPES | LEGACY_HETERO_TYPES),
                Participant.mobile_number == rep_mobile,
                db.func.lower(Participant.country) == country.lower(),
            ).first()
            if not registered_rep:
                return {"message": MR_REQUIRED_MESSAGE}, 409
        canonical_rep_name = registered_rep.full_name if registered_rep else str(payload["full_name"]).strip()
        participant = Participant(
            full_name=str(payload["full_name"]).strip(),
            participant_type=participant_type,
            pharmacy_name=str(payload.get("pharmacy_name") or "").strip() or None,
            country_code=country_code,
            mobile_number=mobile,
            email=None,
            country=country,
            city=None,
            mr_id=None,
            medical_rep_name=canonical_rep_name,
            medical_rep_country_code=rep_country_code,
            medical_rep_mobile_number=rep_mobile,
            total_points=0,
        )
        db.session.add(participant)
        db.session.flush()
        add_points(participant, ENROLLMENT_POINTS, "Enrollment bonus")
        db.session.commit()
        return participant_login_response(participant, 201)
    except IntegrityError:
        db.session.rollback()
        return {"message": "Entered mobile number already exists for enrollment."}, 409
    except ValidationError as exc:
        db.session.rollback()
        return {"message": str(exc)}, 400


@auth_bp.post("/login")
@limiter.limit("15 per minute")
def login():
    payload = request.get_json(silent=True) or {}
    user_id = str(payload.get("user_id") or payload.get("username") or "").strip()
    password = str(payload.get("password") or "").strip()
    if user_id and password:
        admin_account = current_app.config.get("ADMIN_CREDENTIALS", {}).get(user_id.lower())
        if admin_account and compare_digest(password, admin_account["password"]):
            token = create_access_token(identity=user_id.lower(), additional_claims={"role": "admin"})
            return {"token": token, "role": "admin", "admin": {"name": admin_account["name"]}}
        if (
            user_id == current_app.config["SUPER_ADMIN_USER_ID"]
            and current_app.config["SUPER_ADMIN_PASSWORD"]
            and compare_digest(password, current_app.config["SUPER_ADMIN_PASSWORD"])
        ):
            token = create_access_token(identity="super_admin", additional_claims={"role": "super_admin"})
            return {"token": token, "role": "super_admin", "admin": {"name": "Super Admin"}}
        return {"message": "Enter valid user ID and password."}, 401
    admin_value = str(payload.get("admin_code") or payload.get("code") or "").strip()
    if admin_value and compare_digest(admin_value, current_app.config["ADMIN_SECRET_CODE"]):
        token = create_access_token(identity="super_admin", additional_claims={"role": "super_admin"})
        return {"token": token, "role": "super_admin", "admin": {"name": "Super Admin"}}
    return {"message": "Enter valid login details."}, 401


@auth_bp.post("/participant-login")
@limiter.limit("15 per minute")
def participant_login():
    payload = request.get_json(silent=True) or {}
    try:
        require_fields(payload, ["country_code", "mobile_number"])
        _, mobile = compose_labeled_mobile(payload["country_code"], payload["mobile_number"], "registered")
        participant = Participant.query.filter_by(mobile_number=mobile).first()
        if not participant:
            return {"message": "No enrollment found for this mobile number."}, 404
        return participant_login_response(participant)
    except ValidationError as exc:
        return {"message": str(exc)}, 400
