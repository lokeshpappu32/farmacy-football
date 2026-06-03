import re
from datetime import datetime, timezone

from email_validator import EmailNotValidError, validate_email

MOBILE_RE = re.compile(r"^\+?[0-9]{7,15}$")
LOCAL_MOBILE_RE = re.compile(r"^[0-9]{7,15}$")
COUNTRY_CODE_RE = re.compile(r"^\+[0-9]{1,4}$")


class ValidationError(ValueError):
    pass


def require_fields(payload, fields):
    missing = [field for field in fields if payload.get(field) in (None, "")]
    if missing:
        raise ValidationError(f"Missing required field(s): {', '.join(missing)}")


def clean_mobile(value):
    mobile = str(value or "").strip().replace(" ", "")
    mobile = mobile.replace("-", "")
    if not MOBILE_RE.match(mobile):
        raise ValidationError("Enter a valid mobile number with 7 to 15 digits.")
    return mobile


def clean_local_mobile(value):
    mobile = str(value or "").strip().replace(" ", "").replace("-", "")
    if not LOCAL_MOBILE_RE.match(mobile):
        raise ValidationError("Enter a valid mobile number with 7 to 15 digits.")
    return mobile


def clean_country_code(value):
    country_code = str(value or "").strip().replace(" ", "")
    if not COUNTRY_CODE_RE.match(country_code):
        raise ValidationError("Select a valid country code.")
    return country_code


def compose_mobile(country_code, mobile_number):
    country_code = clean_country_code(country_code)
    local_number = clean_local_mobile(mobile_number)
    return country_code, f"{country_code}{local_number}"


def clean_email(value):
    if not value:
        return None
    try:
        return validate_email(value, check_deliverability=False).normalized
    except EmailNotValidError as exc:
        raise ValidationError("Enter a valid email address.") from exc


def parse_utc_datetime(value):
    if not value:
        raise ValidationError("match_datetime is required.")
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValidationError("match_datetime must be an ISO-8601 datetime.") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)
