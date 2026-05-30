from datetime import datetime, timezone

from app.extensions import db
from app.utils.serialization import utc_iso


class Participant(db.Model):
    __tablename__ = "participants"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(160), nullable=False)
    participant_type = db.Column(db.String(40), nullable=False, default="farmacist", index=True)
    pharmacy_name = db.Column(db.String(180), nullable=True)
    country_code = db.Column(db.String(8), nullable=True)
    mobile_number = db.Column(db.String(32), nullable=False, unique=True, index=True)
    email = db.Column(db.String(180), nullable=True)
    country = db.Column(db.String(100), nullable=False, index=True)
    city = db.Column(db.String(120), nullable=True, index=True)
    mr_id = db.Column(db.String(80), nullable=True, index=True)
    medical_rep_name = db.Column(db.String(160), nullable=True, index=True)
    medical_rep_country_code = db.Column(db.String(8), nullable=True)
    medical_rep_mobile_number = db.Column(db.String(32), nullable=True, index=True)
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
            "participant_type": self.participant_type,
            "pharmacy_name": self.pharmacy_name,
            "country_code": self.country_code,
            "country": self.country,
            "city": self.city,
            "mr_id": self.mr_id,
            "medical_rep_name": self.medical_rep_name,
            "medical_rep_country_code": self.medical_rep_country_code,
            "medical_rep_mobile_number": self.medical_rep_mobile_number,
            "total_points": self.total_points,
            "created_at": utc_iso(self.created_at),
        }
        if include_private:
            data.update({"mobile_number": self.mobile_number, "email": self.email})
        return data
