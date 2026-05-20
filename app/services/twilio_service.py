from datetime import datetime, timedelta, timezone

from flask import current_app
from twilio.rest import Client

from app.models import Match, Participant


def send_sms(to_number, body):
    sid = current_app.config.get("TWILIO_ACCOUNT_SID")
    token = current_app.config.get("TWILIO_AUTH_TOKEN")
    sender = current_app.config.get("TWILIO_PHONE_NUMBER")
    if not all([sid, token, sender]):
        current_app.logger.info("Twilio not configured; skipping SMS to %s", to_number)
        return None
    client = Client(sid, token)
    return client.messages.create(to=to_number, from_=sender, body=body)


def send_match_reminders():
    now = datetime.now(timezone.utc)
    tomorrow = now + timedelta(days=1)
    matches = Match.query.filter(
        Match.status == "scheduled",
        Match.match_datetime >= tomorrow - timedelta(hours=2),
        Match.match_datetime <= tomorrow + timedelta(hours=2),
    ).all()
    sent = 0
    app_url = current_app.config.get("PUBLIC_APP_URL")
    for match in matches:
        body = f"Tomorrow Match:\n{match.team1} vs {match.team2}\n\nPredict now:\n{app_url}"
        for participant in Participant.query.all():
            if send_sms(participant.mobile_number, body) is not None:
                sent += 1
    return sent
