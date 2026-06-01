from datetime import datetime, timedelta, timezone

import requests
from flask import current_app

from app.extensions import db
from app.models import AdminLog, Match, Prediction
from app.services.points_service import WINNER_POINTS, add_points
from app.utils.time import as_utc


def sync_matches_from_api():
    token = current_app.config.get("FOOTBALL_DATA_API_TOKEN")
    if not token:
        return {"synced": 0, "message": "FOOTBALL_DATA_API_TOKEN is not configured."}

    competition = current_app.config.get("FOOTBALL_DATA_COMPETITION", "WC")
    date_from = datetime.now(timezone.utc).date().isoformat()
    date_to = (datetime.now(timezone.utc).date() + timedelta(days=45)).isoformat()
    url = f"https://api.football-data.org/v4/competitions/{competition}/matches"
    response = requests.get(
        url,
        headers={"X-Auth-Token": token},
        params={"dateFrom": date_from, "dateTo": date_to},
        timeout=20,
    )
    response.raise_for_status()
    payload = response.json()
    synced = 0
    for item in payload.get("matches", []):
        home = item.get("homeTeam") or {}
        away = item.get("awayTeam") or {}
        api_id = str(item.get("id"))
        match = Match.query.filter_by(api_match_id=api_id).first() or Match(api_match_id=api_id)
        match.team1 = home.get("name") or "Team 1"
        match.team2 = away.get("name") or "Team 2"
        match.team1_logo = home.get("crest")
        match.team2_logo = away.get("crest")
        match.match_datetime = datetime.fromisoformat(item["utcDate"].replace("Z", "+00:00")).astimezone(timezone.utc)
        match.status = football_status_to_local(item.get("status"))
        winner = extract_winner(item)
        if winner:
            match.winner_team = winner
        db.session.add(match)
        synced += 1
    db.session.add(AdminLog(admin_action="sync_matches", details=f"Synced {synced} matches from football-data.org"))
    db.session.commit()
    return {"synced": synced, "message": "Match sync completed."}


def football_status_to_local(status):
    mapping = {
        "SCHEDULED": "scheduled",
        "TIMED": "scheduled",
        "IN_PLAY": "live",
        "PAUSED": "live",
        "FINISHED": "completed",
        "POSTPONED": "postponed",
        "CANCELLED": "cancelled",
    }
    return mapping.get(str(status or "").upper(), "scheduled")


def extract_winner(item):
    score = item.get("score") or {}
    winner_code = score.get("winner")
    if winner_code == "HOME_TEAM":
        return (item.get("homeTeam") or {}).get("name")
    if winner_code == "AWAY_TEAM":
        return (item.get("awayTeam") or {}).get("name")
    return None


def update_match_statuses():
    now = datetime.now(timezone.utc)
    changed = 0
    for match in Match.query.filter(Match.status == "scheduled").all():
        if as_utc(match.match_datetime) > now:
            continue
        match.status = "live"
        changed += 1
    for match in Match.query.filter(Match.status == "live").all():
        if as_utc(match.match_datetime) > now - timedelta(hours=3):
            continue
        match.status = "completed"
        changed += 1
    if changed:
        db.session.commit()
    return changed


def award_prediction_points(match_id=None):
    query = Match.query.filter(Match.status == "completed", Match.winner_team.isnot(None))
    if match_id:
        query = query.filter(Match.id == match_id)
    awarded = 0
    for match in query.all():
        for prediction in Prediction.query.filter_by(match_id=match.id, is_correct=None).all():
            prediction.is_correct = prediction.predicted_team == match.winner_team
            if prediction.is_correct:
                prediction.winner_points = WINNER_POINTS
                add_points(prediction.participant, WINNER_POINTS, "Correct prediction bonus", match_id=match.id)
                awarded += 1
    if awarded:
        db.session.add(AdminLog(admin_action="award_points", details=f"Awarded correct prediction points to {awarded} users."))
    db.session.commit()
    return awarded


def close_predictions_for_completed_match(match):
    awarded = 0
    closed = 0
    for prediction in Prediction.query.filter_by(match_id=match.id).all():
        was_correct = prediction.is_correct is True
        is_correct = prediction.predicted_team == match.winner_team
        prediction.is_correct = is_correct
        prediction.winner_points = WINNER_POINTS if is_correct else 0
        if is_correct and not was_correct:
            add_points(prediction.participant, WINNER_POINTS, "Correct prediction bonus", match_id=match.id)
            awarded += 1
        closed += 1
    return closed, awarded


def finalize_draw(match, source="manual"):
    match.winner_team = "Draw"
    match.status = "completed"
    marked, awarded = close_predictions_for_completed_match(match)
    db.session.add(AdminLog(admin_action=f"{source}_draw_update", details=f"Match {match.id} marked as draw. {marked} predictions closed. {awarded} draw prediction bonuses awarded."))
    db.session.commit()
    return marked


def cancel_match(match, source="manual"):
    match.winner_team = None
    match.status = "cancelled"
    marked = 0
    for prediction in Prediction.query.filter_by(match_id=match.id).all():
        prediction.is_correct = False
        marked += 1
    action = "cancel_match" if source == "manual" else f"{source}_cancel_match"
    db.session.add(AdminLog(admin_action=action, details=f"Match {match.id} cancelled. {marked} predictions closed. Participation rewards retained."))
    db.session.commit()
    return marked


def reschedule_match(match, match_datetime, source="manual"):
    match.match_datetime = match_datetime
    match.status = "scheduled"
    match.winner_team = None
    action = "reschedule_match" if source == "manual" else f"{source}_reschedule_match"
    db.session.add(AdminLog(admin_action=action, details=f"Match {match.id} rescheduled to {match_datetime.isoformat()}"))
    db.session.commit()
    return match


def manual_update_winner(match, winner_team, source="manual"):
    if winner_team not in {match.team1, match.team2}:
        raise ValueError("Winner must match one of the participating teams.")
    match.winner_team = winner_team
    match.status = "completed"
    closed, awarded = close_predictions_for_completed_match(match)
    db.session.add(
        AdminLog(
            admin_action=f"{source}_winner_update",
            details=f"Match {match.id} winner set to {winner_team}. {closed} predictions closed. {awarded} winner bonuses awarded.",
        )
    )
    db.session.commit()
    return closed, awarded
