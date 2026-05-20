from datetime import datetime, timezone

from flask import Blueprint
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models import Match, Prediction
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


@matches_bp.get("")
def list_matches():
    matches = Match.query.order_by(Match.match_datetime.asc()).all()
    return {"matches": [match.to_dict() for match in matches]}
