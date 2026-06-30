from app.extensions import db
from app.models import AdminLog, Match, PointsHistory, Prediction
from app.services.points_service import WINNER_POINTS


def find_match_for_correction(match_id=None, api_match_id=None, team1=None, team2=None):
    if match_id:
        return db.session.get(Match, int(match_id))
    if api_match_id:
        return Match.query.filter_by(api_match_id=str(api_match_id)).first()
    if team1 and team2:
        return (
            Match.query.filter(Match.team1 == team1, Match.team2 == team2)
            .order_by(Match.match_datetime.desc())
            .first()
        )
    return None


def correct_match_winner(match, winner_team, dry_run=False):
    if not match:
        raise ValueError("Match not found.")
    if winner_team not in {match.team1, match.team2}:
        raise ValueError(f"Winner must be exactly one of: {match.team1} / {match.team2}")

    changed_predictions = 0
    corrected_points = 0
    awarded_points = 0
    reversed_points = 0
    adjustment_rows = []

    for prediction in Prediction.query.filter_by(match_id=match.id).all():
        old_points = int(prediction.winner_points or 0)
        is_correct = prediction.predicted_team == winner_team
        new_points = WINNER_POINTS if is_correct else 0
        delta = new_points - old_points

        if prediction.is_correct != is_correct or old_points != new_points:
            changed_predictions += 1

        if delta:
            corrected_points += delta
            if delta > 0:
                awarded_points += delta
            else:
                reversed_points += abs(delta)
            adjustment_rows.append((prediction, delta))

        if not dry_run:
            prediction.is_correct = is_correct
            prediction.winner_points = new_points

    if not dry_run:
        old_winner = match.winner_team or "None"
        match.status = "completed"
        match.winner_team = winner_team

        for prediction, delta in adjustment_rows:
            prediction.participant.total_points = (prediction.participant.total_points or 0) + delta
            db.session.add(
                PointsHistory(
                    participant_id=prediction.participant_id,
                    match_id=match.id,
                    points=delta,
                    reason=f"Winner correction adjustment: {match.team1} vs {match.team2}",
                )
            )

        db.session.add(
            AdminLog(
                admin_action="winner_correction",
                details=(
                    f"Corrected match {match.id} from {old_winner} to {winner_team}. "
                    f"{changed_predictions} predictions updated. "
                    f"{awarded_points} points awarded, {reversed_points} points reversed."
                ),
            )
        )
        db.session.commit()

    return {
        "match_id": match.id,
        "api_match_id": match.api_match_id,
        "match": f"{match.team1} vs {match.team2}",
        "winner_team": winner_team,
        "changed_predictions": changed_predictions,
        "points_delta": corrected_points,
        "awarded_points": awarded_points,
        "reversed_points": reversed_points,
        "dry_run": dry_run,
    }
