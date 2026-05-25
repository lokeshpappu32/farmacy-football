from datetime import datetime, timezone

from app.extensions import db
from app.utils.serialization import utc_iso


class Prediction(db.Model):
    __tablename__ = "predictions"
    __table_args__ = (db.UniqueConstraint("participant_id", "match_id", name="uq_prediction_participant_match"),)

    id = db.Column(db.Integer, primary_key=True)
    participant_id = db.Column(db.Integer, db.ForeignKey("participants.id"), nullable=False, index=True)
    match_id = db.Column(db.Integer, db.ForeignKey("matches.id"), nullable=False, index=True)
    predicted_team = db.Column(db.String(120), nullable=False)
    favorite_drug = db.Column(db.String(160), nullable=False)
    is_correct = db.Column(db.Boolean, nullable=True)
    participation_points = db.Column(db.Integer, nullable=False, default=0)
    winner_points = db.Column(db.Integer, nullable=False, default=0)
    submitted_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    participant = db.relationship("Participant", back_populates="predictions")
    match = db.relationship("Match", back_populates="predictions")

    def to_dict(self):
        return {
            "id": self.id,
            "participant_id": self.participant_id,
            "match_id": self.match_id,
            "predicted_team": self.predicted_team,
            "favorite_drug": self.favorite_drug,
            "is_correct": self.is_correct,
            "participation_points": self.participation_points,
            "winner_points": self.winner_points,
            "submitted_at": utc_iso(self.submitted_at),
            "updated_at": utc_iso(self.updated_at),
            "match": self.match.to_dict() if self.match else None,
        }
