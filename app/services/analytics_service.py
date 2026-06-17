from sqlalchemy import case, func

from app.extensions import db
from app.models import Country, Match, Participant, PointsHistory, Prediction
from app.utils.participant_types import HETERO_TYPES, PHARMACY_TYPES

SQL_IN_CHUNK_SIZE = 1000


def bool_case(column, expected):
    return case((column == expected, 1), else_=0)


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


def chunked(values, size=SQL_IN_CHUNK_SIZE):
    values = list(values or [])
    for index in range(0, len(values), size):
        yield values[index : index + size]


def prediction_rows_for_participants(participant_ids):
    rows = []
    for participant_chunk in chunked(participant_ids):
        rows.extend(Prediction.query.filter(Prediction.participant_id.in_(participant_chunk)).all())
    return rows


def prediction_count_for_participants(participant_ids):
    return sum(
        Prediction.query.filter(Prediction.participant_id.in_(participant_chunk)).count()
        for participant_chunk in chunked(participant_ids)
    )


def prediction_summary_query(query):
    row = query.with_entities(
        func.count(Prediction.id),
        func.coalesce(func.sum(bool_case(Prediction.is_correct, True)), 0),
        func.coalesce(func.sum(bool_case(Prediction.is_correct, False)), 0),
        func.coalesce(func.sum(case((Prediction.is_correct.is_(None), 1), else_=0)), 0),
        func.count(func.distinct(Prediction.participant_id)),
    ).one()
    total, correct, wrong, pending, active = (int(value or 0) for value in row)
    return {
        "predictions": total,
        "correct": correct,
        "wrong": wrong,
        "pending": pending,
        "active_participants": active,
        "accuracy": round((correct / max(correct + wrong, 1)) * 100, 1),
    }


def global_prediction_summary(total_participants=None):
    summary = prediction_summary_query(Prediction.query)
    total_participants = Participant.query.count() if total_participants is None else total_participants
    summary["participation_rate"] = round((summary["active_participants"] / max(total_participants, 1)) * 100, 1)
    return summary


def participant_prediction_stats_subquery():
    return (
        db.session.query(
            Prediction.participant_id.label("participant_id"),
            func.count(Prediction.id).label("predictions"),
            func.coalesce(func.sum(bool_case(Prediction.is_correct, True)), 0).label("correct"),
            func.coalesce(func.sum(bool_case(Prediction.is_correct, False)), 0).label("wrong"),
            func.coalesce(func.sum(case((Prediction.is_correct.is_(None), 1), else_=0)), 0).label("pending"),
        )
        .group_by(Prediction.participant_id)
        .subquery()
    )


def leaderboard(country=None, medical_rep_name=None, medical_rep_mobile_number=None, limit=100):
    query = Participant.query.filter(Participant.participant_type.in_(PHARMACY_TYPES))
    if country:
        query = query.filter(Participant.country == country)
    if medical_rep_mobile_number:
        query = query.filter(Participant.medical_rep_mobile_number == medical_rep_mobile_number)
    elif medical_rep_name:
        query = query.filter(Participant.medical_rep_name == medical_rep_name)
    query = query.order_by(Participant.total_points.desc(), Participant.created_at.asc())
    if limit:
        query = query.limit(limit)
    users = query.all()
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
    flags = country_flag_map()

    stats_query = (
        db.session.query(
            Participant.medical_rep_mobile_number.label("rep_mobile"),
            func.count(func.distinct(Participant.id)).label("enrollments"),
            func.count(Prediction.id).label("participations"),
        )
        .outerjoin(Prediction, Prediction.participant_id == Participant.id)
        .filter(
            Participant.participant_type.in_(PHARMACY_TYPES),
            Participant.medical_rep_mobile_number.isnot(None),
            Participant.medical_rep_mobile_number != "",
        )
        .group_by(Participant.medical_rep_mobile_number)
    )
    stats_by_mobile = {
        row.rep_mobile: {
            "enrollments": int(row.enrollments or 0),
            "participations": int(row.participations or 0),
        }
        for row in stats_query.all()
    }

    rows = []
    for rep in reps:
        stats = stats_by_mobile.get(rep.mobile_number, {})
        enrollments = int(stats.get("enrollments") or 0)
        participations = int(stats.get("participations") or 0)
        rows.append(
            {
                "id": rep.id,
                "full_name": rep.full_name,
                "mobile_number": rep.mobile_number,
                "country": rep.country,
                "country_flag_url": flags.get(rep.country),
                "enrollments": enrollments,
                "participations": participations,
                "avg_participations_per_farmacist": round(participations / max(enrollments, 1), 1),
            }
        )
    ranked = sorted(rows, key=lambda row: (row["participations"], row["enrollments"], row["full_name"]), reverse=True)
    return apply_dense_ranks(ranked[:limit], "participations")


def mr_country_rankings():
    flags = country_flag_map()

    pharmacy_rows = (
        db.session.query(
            Participant.country.label("country"),
            func.count(func.distinct(Participant.id)).label("farmacy_enrollments"),
            func.count(Prediction.id).label("participations"),
        )
        .outerjoin(Prediction, Prediction.participant_id == Participant.id)
        .filter(Participant.participant_type.in_(PHARMACY_TYPES), Participant.country.isnot(None), Participant.country != "")
        .group_by(Participant.country)
        .all()
    )
    enrolling_rep_mobiles_by_country = {}
    for country, mobile in (
        db.session.query(Participant.country, Participant.medical_rep_mobile_number)
        .filter(
            Participant.participant_type.in_(PHARMACY_TYPES),
            Participant.country.isnot(None),
            Participant.country != "",
            Participant.medical_rep_mobile_number.isnot(None),
            Participant.medical_rep_mobile_number != "",
        )
        .distinct()
        .all()
    ):
        enrolling_rep_mobiles_by_country.setdefault(country, set()).add(mobile)

    hetero_mobiles_by_country = {}
    for country, mobile in (
        db.session.query(Participant.country, Participant.mobile_number)
        .filter(
            Participant.participant_type.in_(HETERO_TYPES),
            Participant.country.isnot(None),
            Participant.country != "",
            Participant.mobile_number.isnot(None),
            Participant.mobile_number != "",
        )
        .all()
    ):
        hetero_mobiles_by_country.setdefault(country, set()).add(mobile)

    rows = []
    countries = set(enrolling_rep_mobiles_by_country) | set(hetero_mobiles_by_country) | {row.country for row in pharmacy_rows}
    pharmacy_by_country = {
        row.country: {
            "farmacy_enrollments": int(row.farmacy_enrollments or 0),
            "participations": int(row.participations or 0),
        }
        for row in pharmacy_rows
    }
    for country in countries:
        pharmacy_stats = pharmacy_by_country.get(country, {})
        total_farmacy_enrollments = int(pharmacy_stats.get("farmacy_enrollments") or 0)
        total_participations = int(pharmacy_stats.get("participations") or 0)
        total_hetero_enrollments = len(
            hetero_mobiles_by_country.get(country, set()) & enrolling_rep_mobiles_by_country.get(country, set())
        )
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
    if not rep or rep.participant_type not in HETERO_TYPES:
        return {"message": "Representative not found."}, 404
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
            "active_farmacists": summary.get("active_participants", 0),
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
    all_rankings = mr_participation_rankings()
    rankings = mr_participation_rankings(country=country) if country else all_rankings
    total_enrollments = Participant.query.filter(Participant.participant_type.in_(PHARMACY_TYPES)).count()
    pharmacist_ids = [row[0] for row in db.session.query(Participant.id).filter(Participant.participant_type.in_(PHARMACY_TYPES)).all()]
    total_participations = prediction_count_for_participants(pharmacist_ids) if pharmacist_ids else 0
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
        return {"predictions": 0, "correct": 0, "wrong": 0, "pending": 0, "active_participants": 0, "accuracy": 0, "participation_rate": 0}
    total = correct = wrong = pending = participants_with_predictions = 0
    for participant_chunk in chunked(participant_ids):
        summary = prediction_summary_query(Prediction.query.filter(Prediction.participant_id.in_(participant_chunk)))
        total += summary["predictions"]
        correct += summary["correct"]
        wrong += summary["wrong"]
        pending += summary["pending"]
        participants_with_predictions += summary["active_participants"]
    return {
        "predictions": total,
        "correct": correct,
        "wrong": wrong,
        "pending": pending,
        "active_participants": participants_with_predictions,
        "accuracy": round((correct / max(correct + wrong, 1)) * 100, 1),
        "participation_rate": round((participants_with_predictions / max(len(participant_ids), 1)) * 100, 1),
    }


def grouped_participant_analytics(group_field, limit=100, base_query=None):
    if base_query is not None:
        participants = base_query.all()
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

    stats = participant_prediction_stats_subquery()
    group_column = getattr(Participant, group_field)
    grouped_rows = (
        db.session.query(
            group_column.label(group_field),
            func.count(Participant.id).label("participants"),
            func.coalesce(func.sum(Participant.total_points), 0).label("points"),
            func.coalesce(func.sum(stats.c.predictions), 0).label("predictions"),
            func.coalesce(func.sum(stats.c.correct), 0).label("correct"),
            func.coalesce(func.sum(stats.c.wrong), 0).label("wrong"),
            func.coalesce(func.sum(stats.c.pending), 0).label("pending"),
            func.coalesce(func.sum(case((stats.c.predictions > 0, 1), else_=0)), 0).label("active"),
        )
        .outerjoin(stats, stats.c.participant_id == Participant.id)
        .group_by(group_column)
        .order_by(func.count(Participant.id).desc(), func.coalesce(func.sum(Participant.total_points), 0).desc())
        .limit(limit)
        .all()
    )
    rows = []
    for row in grouped_rows:
        participants = int(row.participants or 0)
        correct = int(row.correct or 0)
        wrong = int(row.wrong or 0)
        active = int(row.active or 0)
        group_value = (getattr(row, group_field) or "Unknown").strip() or "Unknown"
        rows.append(
            {
                group_field: group_value,
                "participants": participants,
                "points": int(row.points or 0),
                "avg_points": round((row.points or 0) / max(participants, 1), 1),
                "predictions": int(row.predictions or 0),
                "correct": correct,
                "wrong": wrong,
                "pending": int(row.pending or 0),
                "accuracy": round((correct / max(correct + wrong, 1)) * 100, 1),
                "participation_rate": round((active / max(participants, 1)) * 100, 1),
            }
        )
    return rows


def top_medical_rep_analytics(limit=10):
    stats = participant_prediction_stats_subquery()
    rows = (
        db.session.query(
            Participant.medical_rep_name.label("medical_rep_name"),
            func.count(Participant.id).label("participants"),
            func.coalesce(func.sum(Participant.total_points), 0).label("points"),
            func.count(func.distinct(Participant.country)).label("countries"),
            func.count(func.distinct(Participant.city)).label("cities"),
            func.coalesce(func.sum(stats.c.predictions), 0).label("predictions"),
            func.coalesce(func.sum(stats.c.correct), 0).label("correct"),
            func.coalesce(func.sum(stats.c.wrong), 0).label("wrong"),
            func.coalesce(func.sum(stats.c.pending), 0).label("pending"),
            func.coalesce(func.sum(case((stats.c.predictions > 0, 1), else_=0)), 0).label("active"),
        )
        .outerjoin(stats, stats.c.participant_id == Participant.id)
        .filter(Participant.medical_rep_name.isnot(None), Participant.medical_rep_name != "")
        .group_by(Participant.medical_rep_name)
        .order_by(func.count(Participant.id).desc(), func.coalesce(func.sum(Participant.total_points), 0).desc())
        .limit(limit)
        .all()
    )
    result = []
    for row in rows:
        participants = int(row.participants or 0)
        correct = int(row.correct or 0)
        wrong = int(row.wrong or 0)
        active = int(row.active or 0)
        result.append(
            {
                "medical_rep_name": row.medical_rep_name,
                "participants": participants,
                "points": int(row.points or 0),
                "countries": int(row.countries or 0),
                "cities": int(row.cities or 0),
                "predictions": int(row.predictions or 0),
                "correct": correct,
                "wrong": wrong,
                "pending": int(row.pending or 0),
                "accuracy": round((correct / max(correct + wrong, 1)) * 100, 1),
                "participation_rate": round((active / max(participants, 1)) * 100, 1),
            }
        )
    return result


def favorite_drug_summary(limit=8, participant_ids=None):
    if participant_ids is not None:
        if not participant_ids:
            return []
        totals = {}
        unique_users_by_drug = {}
        for participant_chunk in chunked(participant_ids):
            rows = (
                db.session.query(
                    Prediction.favorite_drug,
                    func.count(Prediction.id).label("selection_count"),
                    func.count(db.distinct(Prediction.participant_id)).label("unique_users"),
                )
                .filter(
                    Prediction.participant_id.in_(participant_chunk),
                    Prediction.favorite_drug.isnot(None),
                    Prediction.favorite_drug != "",
                )
                .group_by(Prediction.favorite_drug)
                .all()
            )
            for drug, count, unique_users in rows:
                totals[drug] = totals.get(drug, 0) + int(count)
                unique_users_by_drug[drug] = unique_users_by_drug.get(drug, 0) + int(unique_users)
        return [
            {"favorite_drug": drug, "selection_count": count, "unique_users": unique_users_by_drug.get(drug, 0)}
            for drug, count in sorted(totals.items(), key=lambda item: item[1], reverse=True)[:limit]
        ]

    query = db.session.query(
        Prediction.favorite_drug,
        func.count(Prediction.id).label("selection_count"),
        func.count(db.distinct(Prediction.participant_id)).label("unique_users"),
    )
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
    total_participants = Participant.query.count()
    prediction_summary = global_prediction_summary(total_participants)
    active_participants = prediction_summary["active_participants"]
    country_analytics = grouped_participant_analytics("country")
    city_analytics = grouped_participant_analytics("city")
    top_city = next(iter(city_analytics), None)
    top_country = next(iter(country_analytics), None)
    return {
        "total_participants": total_participants,
        "total_predictions": Prediction.query.count(),
        "total_matches": Match.query.count(),
        "completed_matches": Match.query.filter_by(status="completed").count(),
        "active_participants": int(active_participants),
        "participation_rate": prediction_summary["participation_rate"],
        "accuracy": prediction_summary["accuracy"],
        "pending_predictions": prediction_summary["pending"],
        "country_analytics": country_analytics,
        "city_analytics": city_analytics,
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
