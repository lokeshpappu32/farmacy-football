from datetime import datetime, timezone

from app.extensions import db


class Match(db.Model):
    __tablename__ = "matches"

    id = db.Column(db.Integer, primary_key=True)
    api_match_id = db.Column(db.String(80), nullable=True, unique=True)
    team1 = db.Column(db.String(120), nullable=False)
    team2 = db.Column(db.String(120), nullable=False)
    team1_logo = db.Column(db.String(500), nullable=True)
    team2_logo = db.Column(db.String(500), nullable=True)
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
        return {
            "id": self.id,
            "api_match_id": self.api_match_id,
            "team1": self.team1,
            "team2": self.team2,
            "team1_logo": self.team1_logo,
            "team2_logo": self.team2_logo,
            "match_datetime": self.match_datetime.isoformat() if self.match_datetime else None,
            "winner_team": self.winner_team,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
