from app.extensions import db
from app.models import Participant, PointsHistory

ENROLLMENT_POINTS = 100
PARTICIPATION_POINTS = 50
WINNER_POINTS = 50


def add_points(participant: Participant, points: int, reason: str, match_id=None):
    participant.total_points = (participant.total_points or 0) + points
    history = PointsHistory(participant_id=participant.id, match_id=match_id, points=points, reason=reason)
    db.session.add(history)
    return history
