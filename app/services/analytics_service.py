from sqlalchemy import func

from app.extensions import db
from app.models import Match, Participant, PointsHistory, Prediction


def leaderboard(country=None, limit=100):
    query = Participant.query
    if country:
        query = query.filter(Participant.country == country)
    users = query.order_by(Participant.total_points.desc(), Participant.created_at.asc()).limit(limit).all()
    return [{**user.to_dict(), "rank": index + 1} for index, user in enumerate(users)]


def participant_performance(participant_id):
    participant = db.session.get(Participant, participant_id)
    predictions = Prediction.query.filter_by(participant_id=participant_id).order_by(Prediction.updated_at.desc()).all()
    correct = sum(1 for item in predictions if item.is_correct is True)
    wrong = sum(1 for item in predictions if item.is_correct is False)
    all_ranks = leaderboard(limit=100000)
    rank = next((item["rank"] for item in all_ranks if item["id"] == participant_id), None)
    return {
        "participant": participant.to_dict(include_private=True),
        "total_points": participant.total_points,
        "matches_participated": len(predictions),
        "correct_predictions": correct,
        "wrong_predictions": wrong,
        "accuracy": round((correct / max(correct + wrong, 1)) * 100, 1),
        "rank": rank,
        "predictions": [item.to_dict() for item in predictions],
        "points_history": [
            item.to_dict()
            for item in PointsHistory.query.filter_by(participant_id=participant_id)
            .order_by(PointsHistory.created_at.desc())
            .all()
        ],
    }


def admin_analytics():
    country_rows = (
        db.session.query(Participant.country, func.count(Participant.id), func.sum(Participant.total_points))
        .group_by(Participant.country)
        .all()
    )
    return {
        "total_participants": Participant.query.count(),
        "total_predictions": Prediction.query.count(),
        "total_matches": Match.query.count(),
        "completed_matches": Match.query.filter_by(status="completed").count(),
        "country_analytics": [
            {"country": country, "participants": count, "points": int(points or 0)}
            for country, count, points in country_rows
        ],
        "top_leaderboard": leaderboard(limit=10),
    }
