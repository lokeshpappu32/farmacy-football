from sqlalchemy import case, func

from app.extensions import db
from app.models import Country, Match, Participant, PointsHistory, Prediction
from app.utils.participant_types import HETERO_TYPES, PHARMACY_TYPES


def apply_dense_ranks(rows, score_key):
    ranked_rows = []
    previous_score = None
    current_rank = 0
    for row in rows:
        score = row.get(score_key) or 0
        if score != previous_score:
            current_rank += 1
            previous_score = score
        ranked_rows.append({**row, "rank": current_rank})
    return ranked_rows


def country_flag_map():
    return {country.name: country.flag_url for country in Country.query.filter(Country.flag_url.isnot(None)).all()}


def leaderboard(country=None, medical_rep_name=None, medical_rep_mobile_number=None, limit=100):
    query = Participant.query.filter(Participant.participant_type.in_(PHARMACY_TYPES))
    if country:
        query = query.filter(Participant.country == country)
    if medical_rep_mobile_number:
        query = query.filter(Participant.medical_rep_mobile_number == medical_rep_mobile_number)
    elif medical_rep_name:
        query = query.filter(Participant.medical_rep_name == medical_rep_name)
    users = query.order_by(Participant.total_points.desc(), Participant.created_at.asc()).limit(limit).all()
    flags = country_flag_map()
    rows = [{**user.to_dict(), "country_flag_url": flags.get(user.country)} for user in users]
    return apply_dense_ranks(rows, "total_points")


def hetero_points_leaderboard(country=None, limit=500):
    query = Participant.query.filter(Participant.participant_type.in_(HETERO_TYPES))
    if country:
        query = query.filter(Participant.country == country)
    users = query.order_by(Participant.total_points.desc(), Participant.created_at.asc()).limit(limit).all()
    flags = country_flag_map()
    rows = [{**user.to_dict(), "country_flag_url": flags.get(user.country)} for user in users]
    return apply_dense_ranks(rows, "total_points")


def mr_participation_rankings(country=None, limit=500):
    reps_query = Participant.query.filter(Participant.participant_type.in_(HETERO_TYPES))
    if country:
        reps_query = reps_query.filter(Participant.country == country)
    reps = reps_query.order_by(Participant.country.asc(), Participant.full_name.asc()).all()
    rows = []
    flags = country_flag_map()
    for rep in reps:
        pharmacists = Participant.query.filter(
            Participant.participant_type.in_(PHARMACY_TYPES),
            Participant.medical_rep_mobile_number == rep.mobile_number,
        ).all()
        pharmacist_ids = [user.id for user in pharmacists]
        participations = (
            Prediction.query.filter(Prediction.participant_id.in_(pharmacist_ids)).count()
            if pharmacist_ids
            else 0
        )
        rows.append(
            {
                "id": rep.id,
                "full_name": rep.full_name,
                "mobile_number": rep.mobile_number,
                "country": rep.country,
                "country_flag_url": flags.get(rep.country),
                "enrollments": len(pharmacists),
                "participations": participations,
                "avg_participations_per_farmacist": round(participations / max(len(pharmacists), 1), 1),
            }
        )
    ranked = sorted(rows, key=lambda row: (row["participations"], row["enrollments"], row["full_name"]), reverse=True)
    return apply_dense_ranks(ranked[:limit], "participations")


def mr_country_rankings():
    rows = []
    countries = [
        row[0]
        for row in db.session.query(Participant.country)
        .filter(Participant.participant_type.in_(PHARMACY_TYPES | HETERO_TYPES), Participant.country.isnot(None), Participant.country != "")
        .distinct()
        .all()
    ]
    flags = country_flag_map()
    for country in countries:
        pharmacist_ids = [
            row[0]
            for row in db.session.query(Participant.id)
            .filter(Participant.participant_type.in_(PHARMACY_TYPES), Participant.country == country)
            .all()
        ]
        total_farmacy_enrollments = len(pharmacist_ids)
        total_hetero_enrollments = (
            Participant.query.filter(
                Participant.participant_type.in_(HETERO_TYPES),
                Participant.country == country,
            ).count()
        )
        total_participations = Prediction.query.filter(Prediction.participant_id.in_(pharmacist_ids)).count() if pharmacist_ids else 0
        avg_participations = round(total_participations / max(total_hetero_enrollments, 1), 1)
        rank_score = (
            (1, avg_participations)
            if avg_participations > 0
            else (0, total_hetero_enrollments, total_farmacy_enrollments)
        )
        rows.append(
            {
                "country": country,
                "country_flag_url": flags.get(country),
                "enrollments": total_farmacy_enrollments,
                "farmacy_enrollments": total_farmacy_enrollments,
                "hetero_enrollments": total_hetero_enrollments,
                "participations": total_participations,
                "score": avg_participations,
                "avg_participations": avg_participations,
                "_rank_score": rank_score,
            }
        )
    ranked = sorted(
        rows,
        key=lambda row: (
            row["_rank_score"],
            row["participations"],
            row["country"],
        ),
        reverse=True,
    )
    ranked_rows = apply_dense_ranks(ranked, "_rank_score")
    return [{key: value for key, value in row.items() if key != "_rank_score"} for row in ranked_rows]


def hetero_rep_participation_performance(rep_id, country=None):
    rep = db.session.get(Participant, rep_id)
    pharmacists = Participant.query.filter(
        Participant.participant_type.in_(PHARMACY_TYPES),
        Participant.medical_rep_mobile_number == rep.mobile_number,
    ).order_by(Participant.total_points.desc(), Participant.created_at.asc()).all()
    pharmacist_ids = [user.id for user in pharmacists]
    summary = prediction_summary_for_participants(pharmacist_ids)
    country_rankings = mr_participation_rankings(country=rep.country)
    global_rankings = mr_participation_rankings()
    filtered_rankings = mr_participation_rankings(country=country) if country else global_rankings
    own_global_rank = next((row["rank"] for row in global_rankings if row["id"] == rep.id), None)
    own_country_rank = next((row["rank"] for row in country_rankings if row["id"] == rep.id), None)
    countries = [
        row[0]
        for row in db.session.query(Participant.country)
        .filter(Participant.participant_type.in_(HETERO_TYPES), Participant.country.isnot(None), Participant.country != "")
        .distinct()
        .order_by(Participant.country.asc())
        .all()
    ]
    return {
        "representative": rep.to_dict(include_private=True),
        "summary": {
            "enrollments": len(pharmacists),
            "participations": summary["predictions"],
            "active_farmacists": len({row.participant_id for row in Prediction.query.filter(Prediction.participant_id.in_(pharmacist_ids)).all()}) if pharmacist_ids else 0,
            "accuracy": summary["accuracy"],
            "participation_rate": summary["participation_rate"],
            "global_rank": own_global_rank,
            "country_rank": own_country_rank,
        },
        "filters": {"country": country or ""},
        "countries": countries,
        "mr_rankings": filtered_rankings,
        "country_rankings": mr_country_rankings(),
        "top_global_representatives": global_rankings[:10],
        "top_country_representatives": country_rankings[:10],
        "farmacist_standings": leaderboard(country=rep.country, medical_rep_mobile_number=rep.mobile_number, limit=100),
    }


def mr_dashboard_analytics(country=None):
    rankings = mr_participation_rankings(country=country)
    all_rankings = mr_participation_rankings()
    total_enrollments = Participant.query.filter(Participant.participant_type.in_(PHARMACY_TYPES)).count()
    pharmacist_ids = [row[0] for row in db.session.query(Participant.id).filter(Participant.participant_type.in_(PHARMACY_TYPES)).all()]
    total_participations = Prediction.query.filter(Prediction.participant_id.in_(pharmacist_ids)).count() if pharmacist_ids else 0
    countries = [
        row[0]
        for row in db.session.query(Participant.country)
        .filter(Participant.participant_type.in_(HETERO_TYPES), Participant.country.isnot(None), Participant.country != "")
        .distinct()
        .order_by(Participant.country.asc())
        .all()
    ]
    return {
        "summary": {
            "total_enrollments": total_enrollments,
            "total_participations": total_participations,
            "total_mrs": Participant.query.filter(Participant.participant_type.in_(HETERO_TYPES)).count(),
            "active_mrs": sum(1 for row in all_rankings if row["participations"] > 0),
            "avg_participations_per_enrollment": round(total_participations / max(total_enrollments, 1), 1),
        },
        "filters": {"country": country or ""},
        "countries": countries,
        "mr_rankings": rankings,
        "country_rankings": mr_country_rankings(),
    }


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


def top_medical_rep_analytics(limit=10):
    rows = []
    rep_names = [
        row[0]
        for row in db.session.query(Participant.medical_rep_name)
        .filter(Participant.medical_rep_name.isnot(None), Participant.medical_rep_name != "")
        .distinct()
        .all()
    ]
    for rep_name in rep_names:
        users = Participant.query.filter_by(medical_rep_name=rep_name).all()
        participant_ids = [user.id for user in users]
        summary = prediction_summary_for_participants(participant_ids)
        rows.append(
            {
                "medical_rep_name": rep_name,
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
    if not participant:
        return {"message": "Participant not found."}, 404
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
        "mr_analytics": top_medical_rep_analytics(),
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
