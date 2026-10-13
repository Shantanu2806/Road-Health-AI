"""
models.py - SQLAlchemy ORM Models for Road Health Assessments, Users, & Email Logs
"""

from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, JSON, Boolean, ForeignKey, text
from sqlalchemy.orm import relationship
from database import Base


class UserRole:
    USER = "user"
    CONTRACTOR = "contractor"
    ADMIN = "admin"


class User(Base):
    """
    Table storing registered users and administrators.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)  # Nullable for Google OAuth users
    full_name = Column(String, nullable=False)
    role = Column(String, default=UserRole.USER, nullable=False)  # "user" | "contractor" | "admin"
    google_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now().astimezone(), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Contractor approval fields
    is_approved = Column(Boolean, default=True, nullable=False)  # False for contractors until admin approves
    otp_code = Column(String, nullable=True)        # 6-digit OTP sent to contractor's email
    otp_expires_at = Column(DateTime, nullable=True) # OTP valid for 10 minutes
    otp_verified = Column(Boolean, default=False, nullable=False)  # Whether OTP was entered correctly

    # Contractor service area / location assignment
    service_state = Column(String, nullable=True)  # e.g. "Maharashtra"
    service_city = Column(String, nullable=True)   # e.g. "Pune"
    service_area = Column(String, nullable=True)   # e.g. "Katraj" or "Shivajinagar"

    # Password reset fields (available for all roles: admin, contractor, user)
    reset_otp_code = Column(String, nullable=True)
    reset_otp_expires_at = Column(DateTime, nullable=True)

    # Relationship to analyses
    analyses = relationship("Analysis", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        created_str = self.created_at.isoformat() if self.created_at else datetime.now().astimezone().isoformat()
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "is_active": self.is_active,
            "is_approved": self.is_approved,
            "otp_verified": self.otp_verified,
            "service_state": self.service_state,
            "service_city": self.service_city,
            "service_area": self.service_area,
            "created_at": created_str,
        }


class Analysis(Base):
    """
    Table storing historical road damage assessments with optional location and user ownership.
    """
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now().astimezone(), nullable=False, index=True)

    # Optional user ownership
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    user = relationship("User", back_populates="analyses")

    # Optional Geo-location fields
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_name = Column(String, nullable=True)

    # Image paths / URLs
    original_image_path = Column(String, nullable=False)
    annotated_image_path = Column(String, nullable=False)

    # Detection results stored as JSON list of dicts
    detections = Column(JSON, nullable=False)

    # Core Assessment Metrics (from scoring formulas)
    damage_index = Column(Float, nullable=False)
    coverage_pct = Column(Float, nullable=False)
    severity = Column(String, nullable=False)            # "Low" | "Medium" | "High"
    road_health_score = Column(Float, nullable=False)   # 0.0 - 100.0
    condition_label = Column(String, nullable=False)     # "Good" | "Fair" | "Poor" | "Critical"

    # Image metadata
    image_width = Column(Integer, nullable=True)
    image_height = Column(Integer, nullable=True)

    def to_dict(self) -> dict:
        """Convert model instance to a dictionary representation."""
        ts_str = None
        if self.timestamp:
            dt = self.timestamp
            if dt.tzinfo is None:
                dt = dt.astimezone()
            ts_str = dt.isoformat()
        else:
            ts_str = datetime.now().astimezone().isoformat()

        user_name = self.user.full_name if self.user else "Anonymous User"
        user_email = self.user.email if self.user else "N/A"

        return {
            "id": self.id,
            "timestamp": ts_str,
            "user_id": self.user_id,
            "user_name": user_name,
            "user_email": user_email,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "location_name": self.location_name,
            "original_image_path": self.original_image_path,
            "annotated_image_path": self.annotated_image_path,
            "detections": self.detections or [],
            "damage_index": self.damage_index,
            "coverage_pct": self.coverage_pct,
            "severity": self.severity,
            "road_health_score": self.road_health_score,
            "condition_label": self.condition_label,
            "image_width": self.image_width,
            "image_height": self.image_height,
        }


class EmailLog(Base):
    """
    Table recording automated notification email attempts.
    """
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now().astimezone(), nullable=False, index=True)
    recipient = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    status = Column(String, nullable=False)  # "sent" | "failed"
    error_message = Column(String, nullable=True)
    road_health_score = Column(Float, nullable=True)
    analysis_id = Column(Integer, nullable=True)

    def to_dict(self) -> dict:
        ts_str = self.timestamp.isoformat() if self.timestamp else datetime.now().astimezone().isoformat()
        return {
            "id": self.id,
            "timestamp": ts_str,
            "recipient": self.recipient,
            "subject": self.subject,
            "status": self.status,
            "error_message": self.error_message,
            "road_health_score": self.road_health_score,
            "analysis_id": self.analysis_id,
        }


def run_db_migrations(db_engine):
    """
    Safely migrates SQLite schema without losing existing analysis records.
    Adds missing columns to tables if not present.
    """
    Base.metadata.create_all(bind=db_engine)

    with db_engine.connect() as conn:
        # ─── Analyses table migrations ───
        cursor = conn.execute(text("PRAGMA table_info(analyses)"))
        existing_analysis_cols = {row[1] for row in cursor.fetchall()}

        analysis_columns_to_add = [
            ("user_id", "INTEGER REFERENCES users(id)"),
            ("latitude", "REAL"),
            ("longitude", "REAL"),
            ("location_name", "TEXT"),
        ]

        for col_name, col_type in analysis_columns_to_add:
            if col_name not in existing_analysis_cols:
                conn.execute(text(f"ALTER TABLE analyses ADD COLUMN {col_name} {col_type}"))
                conn.commit()

        # ─── Users table migrations ───
        cursor2 = conn.execute(text("PRAGMA table_info(users)"))
        existing_user_cols = {row[1] for row in cursor2.fetchall()}

        user_columns_to_add = [
            ("is_approved", "INTEGER NOT NULL DEFAULT 1"),
            ("otp_code", "TEXT"),
            ("otp_expires_at", "DATETIME"),
            ("otp_verified", "INTEGER NOT NULL DEFAULT 0"),
            ("service_state", "TEXT"),
            ("service_city", "TEXT"),
            ("service_area", "TEXT"),
            ("reset_otp_code", "TEXT"),
            ("reset_otp_expires_at", "DATETIME"),
        ]

        for col_name, col_type in user_columns_to_add:
            if col_name not in existing_user_cols:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                conn.commit()
