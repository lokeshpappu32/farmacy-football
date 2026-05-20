from datetime import datetime, timezone

from app.extensions import db


class AdminLog(db.Model):
    __tablename__ = "admin_logs"

    id = db.Column(db.Integer, primary_key=True)
    admin_action = db.Column(db.String(120), nullable=False)
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "admin_action": self.admin_action,
            "details": self.details,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
