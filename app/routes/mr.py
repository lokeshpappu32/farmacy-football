from flask import Blueprint
from flask_jwt_extended import get_jwt_identity

from app.auth.guards import mr_required
from app.models import Participant, Prediction
from app.services.analytics_service import leaderboard

mr_bp = Blueprint("mr", __name__)


@mr_bp.get("/dashboard")
@mr_required
def mr_dashboard():
    mr_id = str(get_jwt_identity()).upper()
    users = Participant.query.filter_by(mr_id=mr_id).order_by(Participant.total_points.desc(), Participant.created_at.asc()).all()
    user_ids = [user.id for user in users]
    predictions = Prediction.query.filter(Prediction.participant_id.in_(user_ids)).all() if user_ids else []

    correct = sum(1 for prediction in predictions if prediction.is_correct is True)
    wrong = sum(1 for prediction in predictions if prediction.is_correct is False)
    pending = sum(1 for prediction in predictions if prediction.is_correct is None)
    total_points = sum(user.total_points or 0 for user in users)
    global_ranks = {row["id"]: row["rank"] for row in leaderboard(limit=100000)}

    prediction_map = {}
    for prediction in predictions:
        stats = prediction_map.setdefault(prediction.participant_id, {"predictions": 0, "correct": 0, "wrong": 0, "pending": 0})
        stats["predictions"] += 1
        if prediction.is_correct is True:
            stats["correct"] += 1
        elif prediction.is_correct is False:
            stats["wrong"] += 1
        else:
            stats["pending"] += 1

    return {
        "mr_id": mr_id,
        "summary": {
            "participants": len(users),
            "total_points": total_points,
            "predictions": len(predictions),
            "correct_predictions": correct,
            "wrong_predictions": wrong,
            "pending_predictions": pending,
            "accuracy": round((correct / max(correct + wrong, 1)) * 100, 1),
        },
        "leaderboard": [
            {
                **user.to_dict(include_private=True),
                "rank": index + 1,
                "global_rank": global_ranks.get(user.id),
                **prediction_map.get(user.id, {"predictions": 0, "correct": 0, "wrong": 0, "pending": 0}),
            }
            for index, user in enumerate(users)
        ],
    }
