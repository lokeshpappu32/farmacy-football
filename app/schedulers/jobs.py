from apscheduler.schedulers.background import BackgroundScheduler
from flask import current_app

from app.services.analytics_service import leaderboard
from app.services.match_service import award_prediction_points, sync_matches_from_api, update_match_statuses
from app.services.twilio_service import send_match_reminders

scheduler = BackgroundScheduler(timezone="UTC")


def run_with_app(app, fn, name):
    with app.app_context():
        try:
            result = fn()
            app.logger.info("Scheduler job %s completed: %s", name, result)
        except Exception:
            app.logger.exception("Scheduler job %s failed", name)


def refresh_leaderboard_rankings():
    return len(leaderboard(limit=100000))


def init_scheduler(app):
    if not app.config.get("SCHEDULER_ENABLED") or scheduler.running:
        return
    scheduler.add_job(lambda: run_with_app(app, sync_matches_from_api, "fetch_upcoming_matches"), "cron", hour=2, minute=10, id="fetch_upcoming_matches", replace_existing=True)
    scheduler.add_job(lambda: run_with_app(app, send_match_reminders, "send_match_reminders"), "cron", hour=9, minute=0, id="send_match_reminders", replace_existing=True)
    scheduler.add_job(lambda: run_with_app(app, update_match_statuses, "update_match_statuses"), "interval", minutes=15, id="update_match_statuses", replace_existing=True)
    scheduler.add_job(lambda: run_with_app(app, award_prediction_points, "award_prediction_points"), "interval", minutes=20, id="award_prediction_points", replace_existing=True)
    scheduler.add_job(lambda: run_with_app(app, refresh_leaderboard_rankings, "refresh_leaderboard_rankings"), "interval", minutes=30, id="refresh_leaderboard_rankings", replace_existing=True)
    scheduler.start()
    current_app.logger.info("APScheduler started.")
