from datetime import datetime, timezone
import unicodedata

from app.extensions import db
from app.models.country import Country
from app.utils.serialization import utc_iso


TEAM_FLAG_CODES = {
    "bosnia and herzegovina": "ba",
    "cape verde islands": "cv",
    "cape verde": "cv",
    "congo dr": "cd",
    "cote d ivoire": "ci",
    "curacao": "cw",
    "czech republic": "cz",
    "czechia": "cz",
    "dr congo": "cd",
    "ecuador": "ec",
    "england": "gb-eng",
    "haiti": "ht",
    "iran": "ir",
    "ivory coast": "ci",
    "new zealand": "nz",
    "norway": "no",
    "panama": "pa",
    "paraguay": "py",
    "scotland": "gb-sct",
    "senegal": "sn",
    "sweden": "se",
    "tunisia": "tn",
    "uruguay": "uy",
    "usmnt": "us",
    "usa": "us",
    "united states of america": "us",
    "uzbekistan": "uz",
}


class Match(db.Model):
    __tablename__ = "matches"

    id = db.Column(db.Integer, primary_key=True)
    api_match_id = db.Column(db.String(80), nullable=True, unique=True)
    team1 = db.Column(db.String(120), nullable=False)
    team2 = db.Column(db.String(120), nullable=False)
    team1_logo = db.Column(db.String(500), nullable=True)
    team2_logo = db.Column(db.String(500), nullable=True)
    venue_name = db.Column(db.String(180), nullable=True)
    venue_location = db.Column(db.String(240), nullable=True)
    match_datetime = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    winner_team = db.Column(db.String(120), nullable=True)
    status = db.Column(db.String(40), nullable=False, default="scheduled", index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    predictions = db.relationship("Prediction", back_populates="match", cascade="all, delete-orphan")

    def to_dict(self):
        team1_fallback = country_flag_for(self.team1)
        team2_fallback = country_flag_for(self.team2)
        return {
            "id": self.id,
            "api_match_id": self.api_match_id,
            "team1": self.team1,
            "team2": self.team2,
            "team1_logo": self.team1_logo or team1_fallback,
            "team2_logo": self.team2_logo or team2_fallback,
            "team1_flag_url": team1_fallback,
            "team2_flag_url": team2_fallback,
            "venue_name": self.venue_name,
            "venue_location": self.venue_location,
            "match_datetime": utc_iso(self.match_datetime),
            "winner_team": self.winner_team,
            "status": self.status,
            "result_label": self.result_label(),
            "created_at": utc_iso(self.created_at),
            "updated_at": utc_iso(self.updated_at),
        }

    def result_label(self):
        if self.status == "cancelled":
            return "Cancelled"
        if self.winner_team == "Draw":
            return "Draw"
        if self.winner_team:
            return f"{self.winner_team} won"
        return self.status.title()


def country_flag_for(team_name):
    if not team_name:
        return None
    normalized = normalize_team_name(team_name)
    country = Country.query.filter(db.func.lower(Country.name) == normalized).first()
    if country and country.flag_url:
        return country.flag_url
    code = TEAM_FLAG_CODES.get(normalized)
    return f"https://flagcdn.com/{code}.svg" if code else None


def normalize_team_name(value):
    normalized = unicodedata.normalize("NFKD", value.strip())
    normalized = "".join(character for character in normalized if not unicodedata.combining(character))
    return normalized.replace(".", "").replace("-", " ").replace("'", " ").lower()
