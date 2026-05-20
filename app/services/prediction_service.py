from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Match, Participant, Prediction
from app.services.points_service import PARTICIPATION_POINTS, add_points
from app.utils.time import as_utc
from app.utils.validators import ValidationError


def submit_or_update_prediction(participant_id, match_id, predicted_team, favorite_drug):
    match = db.session.get(Match, match_id)
    participant = db.session.get(Participant, participant_id)
    if not match or not participant:
        raise ValidationError("Participant or match was not found.")
    if as_utc(match.match_datetime) <= datetime.now(timezone.utc):
        raise ValidationError("Predictions are closed for this match.")
    if predicted_team not in {match.team1, match.team2}:
        raise ValidationError("Predicted team must be one of the match teams.")
    if not favorite_drug or len(str(favorite_drug).strip()) < 2:
        raise ValidationError("Favorite drug is required.")

    prediction = Prediction.query.filter_by(participant_id=participant_id, match_id=match_id).first()
    is_new = prediction is None
    if is_new:
        prediction = Prediction(participant_id=participant_id, match_id=match_id, participation_points=PARTICIPATION_POINTS)
        db.session.add(prediction)
        add_points(participant, PARTICIPATION_POINTS, "Match participation", match_id=match_id)

    prediction.predicted_team = predicted_team
    prediction.favorite_drug = str(favorite_drug).strip()

    try:
        db.session.commit()
    except IntegrityError as exc:
        db.session.rollback()
        raise ValidationError("Only one prediction is allowed per participant per match.") from exc
    return prediction, is_new


def update_prediction_by_id(participant_id, prediction_id, predicted_team, favorite_drug):
    prediction = Prediction.query.filter_by(id=prediction_id, participant_id=participant_id).first()
    if not prediction:
        raise ValidationError("Prediction was not found.")
    return submit_or_update_prediction(participant_id, prediction.match_id, predicted_team, favorite_drug)
