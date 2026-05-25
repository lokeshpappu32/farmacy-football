from app.extensions import db
from app.models import Participant, PointsHistory

ENROLLMENT_POINTS = 100
PARTICIPATION_POINTS = 50
WINNER_POINTS = 50
CANCELLED_PARTICIPATION_REVERSAL_REASON = "Cancelled match participation reversal"


def add_points(participant: Participant, points: int, reason: str, match_id=None):
    participant.total_points = (participant.total_points or 0) + points
    history = PointsHistory(participant_id=participant.id, match_id=match_id, points=points, reason=reason)
    db.session.add(history)
    return history


def reverse_cancelled_match_participation(prediction):
    points = prediction.participation_points or 0
    if points <= 0:
        return False

    already_reversed = PointsHistory.query.filter_by(
        participant_id=prediction.participant_id,
        match_id=prediction.match_id,
        reason=CANCELLED_PARTICIPATION_REVERSAL_REASON,
    ).first()
    if already_reversed:
        prediction.participation_points = 0
        return False

    add_points(
        prediction.participant,
        -points,
        CANCELLED_PARTICIPATION_REVERSAL_REASON,
        match_id=prediction.match_id,
    )
    prediction.participation_points = 0
    return True
