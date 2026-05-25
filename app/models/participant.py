from datetime import datetime, timezone

from app.extensions import db
from app.utils.serialization import utc_iso


class Participant(db.Model):
    __tablename__ = "participants"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(160), nullable=False)
    country_code = db.Column(db.String(8), nullable=True)
    mobile_number = db.Column(db.String(32), nullable=False, unique=True, index=True)
    email = db.Column(db.String(180), nullable=True)
    country = db.Column(db.String(100), nullable=False, index=True)
    city = db.Column(db.String(120), nullable=True, index=True)
    mr_id = db.Column(db.String(80), nullable=True, index=True)
    total_points = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    predictions = db.relationship("Prediction", back_populates="participant", cascade="all, delete-orphan")
    points_history = db.relationship("PointsHistory", back_populates="participant", cascade="all, delete-orphan")

    def to_dict(self, include_private=False):
        data = {
            "id": self.id,
            "full_name": self.full_name,
            "country_code": self.country_code,
            "country": self.country,
            "city": self.city,
            "mr_id": self.mr_id,
            "total_points": self.total_points,
            "created_at": utc_iso(self.created_at),
        }
        if include_private:
            data.update({"mobile_number": self.mobile_number, "email": self.email})
        return data
