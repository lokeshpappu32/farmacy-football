from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from app.auth.guards import participant_required
from app.services.prediction_service import submit_or_update_prediction, update_prediction_by_id
from app.utils.validators import ValidationError, require_fields

predictions_bp = Blueprint("predictions", __name__)


@predictions_bp.post("/predictions")
@participant_required
def submit_prediction():
    payload = request.get_json(silent=True) or {}
    try:
        require_fields(payload, ["match_id", "predicted_team", "favorite_drug"])
        prediction, created = submit_or_update_prediction(
            int(get_jwt_identity()),
            int(payload["match_id"]),
            str(payload["predicted_team"]).strip(),
            str(payload["favorite_drug"]).strip(),
        )
        return {"prediction": prediction.to_dict(), "message": "Prediction saved."}, 201 if created else 200
    except ValidationError as exc:
        return {"message": str(exc)}, 400


@predictions_bp.put("/predictions/<int:prediction_id>")
@participant_required
def update_prediction(prediction_id):
    payload = request.get_json(silent=True) or {}
    try:
        require_fields(payload, ["predicted_team", "favorite_drug"])
        prediction, _ = update_prediction_by_id(
            int(get_jwt_identity()),
            prediction_id,
            str(payload["predicted_team"]).strip(),
            str(payload["favorite_drug"]).strip(),
        )
        return {"prediction": prediction.to_dict(), "message": "Prediction updated."}
    except ValidationError as exc:
        return {"message": str(exc)}, 400
