from sqlalchemy import case, func

from app.extensions import db
from app.models import Match, Participant, PointsHistory, Prediction


def leaderboard(country=None, city=None, limit=100):
    query = Participant.query
    if country:
        query = query.filter(Participant.country == country)
    if city:
        query = query.filter(Participant.city == city)
    users = query.order_by(Participant.total_points.desc(), Participant.created_at.asc()).limit(limit).all()
    return [{**user.to_dict(), "rank": index + 1} for index, user in enumerate(users)]


def prediction_summary_for_participants(participant_ids):
    if not participant_ids:
        return {"predictions": 0, "correct": 0, "wrong": 0, "pending": 0, "accuracy": 0, "participation_rate": 0}
    rows = Prediction.query.filter(Prediction.participant_id.in_(participant_ids)).all()
    correct = sum(1 for row in rows if row.is_correct is True)
    wrong = sum(1 for row in rows if row.is_correct is False)
    pending = sum(1 for row in rows if row.is_correct is None)
    participants_with_predictions = len({row.participant_id for row in rows})
    return {
        "predictions": len(rows),
        "correct": correct,
        "wrong": wrong,
        "pending": pending,
        "accuracy": round((correct / max(correct + wrong, 1)) * 100, 1),
        "participation_rate": round((participants_with_predictions / max(len(participant_ids), 1)) * 100, 1),
    }


def grouped_participant_analytics(group_field, limit=100, base_query=None):
    query = base_query or Participant.query
    participants = query.all()
    groups = {}
    for participant in participants:
        key = (getattr(participant, group_field) or "Unknown").strip() or "Unknown"
        bucket = groups.setdefault(key, {"participants": [], "points": 0})
        bucket["participants"].append(participant)
        bucket["points"] += participant.total_points or 0

    rows = []
    for name, bucket in groups.items():
        participant_ids = [participant.id for participant in bucket["participants"]]
        summary = prediction_summary_for_participants(participant_ids)
        rows.append(
            {
                group_field: name,
                "participants": len(participant_ids),
                "points": int(bucket["points"] or 0),
                "avg_points": round((bucket["points"] or 0) / max(len(participant_ids), 1), 1),
                **summary,
            }
        )
    return sorted(rows, key=lambda row: (row["participants"], row["points"]), reverse=True)[:limit]


def top_mr_analytics(limit=10):
    rows = []
    mr_ids = [
        row[0]
        for row in db.session.query(Participant.mr_id)
        .filter(Participant.mr_id.isnot(None), Participant.mr_id != "")
        .distinct()
        .all()
    ]
    for mr_id in mr_ids:
        users = Participant.query.filter_by(mr_id=mr_id).all()
        participant_ids = [user.id for user in users]
        summary = prediction_summary_for_participants(participant_ids)
        rows.append(
            {
                "mr_id": mr_id,
                "participants": len(users),
                "points": int(sum(user.total_points or 0 for user in users)),
                "countries": len({user.country for user in users if user.country}),
                "cities": len({user.city for user in users if user.city}),
                **summary,
            }
        )
    return sorted(rows, key=lambda row: (row["participants"], row["points"]), reverse=True)[:limit]


def favorite_drug_summary(limit=8, participant_ids=None):
    query = db.session.query(
        Prediction.favorite_drug,
        func.count(Prediction.id).label("selection_count"),
        func.count(db.distinct(Prediction.participant_id)).label("unique_users"),
    )
    if participant_ids is not None:
        if not participant_ids:
            return []
        query = query.filter(Prediction.participant_id.in_(participant_ids))
    rows = (
        query.filter(Prediction.favorite_drug.isnot(None), Prediction.favorite_drug != "")
        .group_by(Prediction.favorite_drug)
        .order_by(func.count(Prediction.id).desc())
        .limit(limit)
        .all()
    )
    return [
        {"favorite_drug": drug, "selection_count": int(count), "unique_users": int(unique_users)}
        for drug, count, unique_users in rows
    ]


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
    participant_ids = [row[0] for row in db.session.query(Participant.id).all()]
    prediction_summary = prediction_summary_for_participants(participant_ids)
    active_participants = (
        db.session.query(func.count(db.distinct(Prediction.participant_id))).scalar()
        or 0
    )
    top_city = next(iter(grouped_participant_analytics("city", limit=1)), None)
    top_country = next(iter(grouped_participant_analytics("country", limit=1)), None)
    return {
        "total_participants": Participant.query.count(),
        "total_predictions": Prediction.query.count(),
        "total_matches": Match.query.count(),
        "completed_matches": Match.query.filter_by(status="completed").count(),
        "active_participants": int(active_participants),
        "participation_rate": prediction_summary["participation_rate"],
        "accuracy": prediction_summary["accuracy"],
        "pending_predictions": prediction_summary["pending"],
        "country_analytics": grouped_participant_analytics("country"),
        "city_analytics": grouped_participant_analytics("city"),
        "mr_analytics": top_mr_analytics(),
        "top_drugs": favorite_drug_summary(),
        "insights": {
            "top_country": top_country,
            "top_city": top_city,
            "active_participants": int(active_participants),
            "participation_rate": prediction_summary["participation_rate"],
            "accuracy": prediction_summary["accuracy"],
        },
        "top_leaderboard": leaderboard(limit=10),
    }
