from datetime import datetime, timezone

from app.extensions import db


class PointsHistory(db.Model):
    __tablename__ = "points_history"

    id = db.Column(db.Integer, primary_key=True)
    participant_id = db.Column(db.Integer, db.ForeignKey("participants.id"), nullable=False, index=True)
    match_id = db.Column(db.Integer, db.ForeignKey("matches.id"), nullable=True, index=True)
    points = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String(180), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    participant = db.relationship("Participant", back_populates="points_history")

    def to_dict(self):
        return {
            "id": self.id,
            "participant_id": self.participant_id,
            "match_id": self.match_id,
            "points": self.points,
            "reason": self.reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
