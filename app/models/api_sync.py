from datetime import datetime, timezone

from app.extensions import db
from app.utils.serialization import utc_iso


class ApiSyncState(db.Model):
    __tablename__ = "api_sync_state"

    id = db.Column(db.Integer, primary_key=True)
    provider = db.Column(db.String(80), nullable=False, default="footballdata.io")
    sync_type = db.Column(db.String(80), nullable=False, index=True)
    last_synced_at = db.Column(db.DateTime(timezone=True), nullable=True)
    locked_until = db.Column(db.DateTime(timezone=True), nullable=True)
    is_running = db.Column(db.Boolean, nullable=False, default=False)
    last_status = db.Column(db.String(40), nullable=True)
    last_error = db.Column(db.Text, nullable=True)
    requests_used_snapshot = db.Column(db.Integer, nullable=True)
    requests_limit_snapshot = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (db.UniqueConstraint("provider", "sync_type", name="uq_api_sync_provider_type"),)


class ApiCallLog(db.Model):
    __tablename__ = "api_call_logs"

    id = db.Column(db.Integer, primary_key=True)
    provider = db.Column(db.String(80), nullable=False, default="footballdata.io")
    endpoint = db.Column(db.String(240), nullable=False)
    sync_type = db.Column(db.String(80), nullable=False, index=True)
    triggered_by_page = db.Column(db.String(120), nullable=True)
    triggered_by_role = db.Column(db.String(40), nullable=True)
    triggered_by_user_id = db.Column(db.String(80), nullable=True)
    status = db.Column(db.String(80), nullable=False)
    http_status = db.Column(db.Integer, nullable=True)
    request_count = db.Column(db.Integer, nullable=False, default=0)
    requests_remaining_snapshot = db.Column(db.Integer, nullable=True)
    requests_used_snapshot = db.Column(db.Integer, nullable=True)
    requests_limit_snapshot = db.Column(db.Integer, nullable=True)
    response_time_ms = db.Column(db.Integer, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "provider": self.provider,
            "endpoint": self.endpoint,
            "sync_type": self.sync_type,
            "triggered_by_page": self.triggered_by_page,
            "triggered_by_role": self.triggered_by_role,
            "triggered_by_user_id": self.triggered_by_user_id,
            "status": self.status,
            "http_status": self.http_status,
            "request_count": self.request_count,
            "requests_remaining_snapshot": self.requests_remaining_snapshot,
            "requests_used_snapshot": self.requests_used_snapshot,
            "requests_limit_snapshot": self.requests_limit_snapshot,
            "response_time_ms": self.response_time_ms,
            "error_message": self.error_message,
            "created_at": utc_iso(self.created_at),
        }
