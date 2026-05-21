from datetime import datetime, timezone

from app.extensions import db


class Country(db.Model):
    __tablename__ = "countries"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    iso_code = db.Column(db.String(3), nullable=False, unique=True)
    country_code = db.Column(db.String(8), nullable=False)
    flag_url = db.Column(db.String(500), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "iso_code": self.iso_code,
            "country_code": self.country_code,
            "flag_url": self.flag_url,
            "is_active": self.is_active,
            "label": f"{self.name} ({self.country_code})",
        }
