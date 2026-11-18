"""
models.py - SQLAlchemy ORM Models for Road Health Assessments, Users, Maintenance Tickets, & Email Logs
"""

from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, JSON, Boolean, ForeignKey, Text, text
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


# ─── Maintenance Ticket Status Constants ───
class TicketStatus:
    REPORTED = "Reported"
    VERIFIED = "Verified"
    ASSIGNED = "Assigned"
    IN_PROGRESS = "In Progress"
    REPAIR_SUBMITTED = "Repair Submitted"
    RESOLVED = "Resolved"
    REJECTED = "Rejected"

    ALL = [REPORTED, VERIFIED, ASSIGNED, IN_PROGRESS, REPAIR_SUBMITTED, RESOLVED, REJECTED]


class TicketPriority:
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

    ALL = [CRITICAL, HIGH, MEDIUM, LOW]


class RoadImportance:
    HIGHWAY = "Highway"
    MAIN_ROAD = "Main Road"
    LOCAL_ROAD = "Local Road"
    UNKNOWN = "Unknown"

    ALL = [HIGHWAY, MAIN_ROAD, LOCAL_ROAD, UNKNOWN]


class RepairStatus:
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"

    ALL = [PENDING, APPROVED, REJECTED]


class MaintenanceTicket(Base):
    """
    Table storing maintenance tickets auto-created from road damage analyses.
    """
    __tablename__ = "maintenance_tickets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(String, unique=True, index=True, nullable=False)  # e.g. "RH-2026-0001"
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now().astimezone(), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now().astimezone(), onupdate=lambda: datetime.now().astimezone(), nullable=False)

    title = Column(String, nullable=False)
    status = Column(String, default=TicketStatus.REPORTED, nullable=False, index=True)
    priority = Column(String, default=TicketPriority.MEDIUM, nullable=False)
    priority_reason = Column(Text, nullable=True)

    # Assignment & scheduling
    assigned_contractor_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    suggested_contractor_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    deadline = Column(DateTime, nullable=True)
    duplicate_of = Column(Integer, ForeignKey("maintenance_tickets.id"), nullable=True)
    road_importance = Column(String, default=RoadImportance.UNKNOWN, nullable=False)
    is_overdue_notified = Column(Boolean, default=False, nullable=False)

    # Location copied from analysis for quick access
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_name = Column(String, nullable=True)

    # Damage snapshot
    road_health_score = Column(Float, nullable=True)
    condition_label = Column(String, nullable=True)
    severity = Column(String, nullable=True)

    # Relationships
    analysis = relationship("Analysis", backref="tickets")
    assigned_contractor = relationship("User", foreign_keys=[assigned_contractor_id])
    suggested_contractor = relationship("User", foreign_keys=[suggested_contractor_id])
    repair_submissions = relationship("RepairSubmission", back_populates="ticket", cascade="all, delete-orphan", order_by="RepairSubmission.submitted_at.desc()")
    status_history = relationship("TicketStatusHistory", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketStatusHistory.changed_at.desc()")
    duplicate_target = relationship("MaintenanceTicket", remote_side=[id], foreign_keys=[duplicate_of])

    @property
    def is_overdue(self) -> bool:
        if not self.deadline:
            return False
        dl = self.deadline if self.deadline.tzinfo else self.deadline.astimezone()
        return bool(dl < datetime.now().astimezone() and self.status != TicketStatus.RESOLVED)

    @property
    def complaint_age_hours(self) -> float:
        if not self.created_at:
            return 0.0
        now = datetime.now().astimezone()
        created = self.created_at if self.created_at.tzinfo else self.created_at.astimezone()
        return round((now - created).total_seconds() / 3600.0, 1)

    def to_dict(self) -> dict:
        created_str = self.created_at.isoformat() if self.created_at else datetime.now().astimezone().isoformat()
        updated_str = self.updated_at.isoformat() if self.updated_at else created_str
        deadline_str = self.deadline.isoformat() if self.deadline else None

        contractor_name = None
        contractor_email = None
        contractor_area = None
        contractor_city = None
        contractor_state = None
        if self.assigned_contractor:
            contractor_name = self.assigned_contractor.full_name
            contractor_email = self.assigned_contractor.email
            contractor_area = self.assigned_contractor.service_area
            contractor_city = self.assigned_contractor.service_city
            contractor_state = self.assigned_contractor.service_state

        suggested_name = None
        suggested_email = None
        suggested_area = None
        suggested_city = None
        if self.suggested_contractor:
            suggested_name = self.suggested_contractor.full_name
            suggested_email = self.suggested_contractor.email
            suggested_area = self.suggested_contractor.service_area
            suggested_city = self.suggested_contractor.service_city

        dup_ticket_id = None
        if self.duplicate_target:
            dup_ticket_id = self.duplicate_target.ticket_id

        # Analysis summary
        analysis_summary = None
        if self.analysis:
            analysis_summary = {
                "id": self.analysis.id,
                "road_health_score": self.analysis.road_health_score,
                "condition_label": self.analysis.condition_label,
                "severity": self.analysis.severity,
                "location_name": self.analysis.location_name,
                "annotated_image_path": self.analysis.annotated_image_path,
                "latitude": self.analysis.latitude,
                "longitude": self.analysis.longitude,
            }

        # Latest repair submission status
        repair_status = None
        if self.repair_submissions:
            repair_status = self.repair_submissions[0].status

        return {
            "id": self.id,
            "ticket_id": self.ticket_id,
            "analysis_id": self.analysis_id,
            "created_at": created_str,
            "updated_at": updated_str,
            "title": self.title,
            "status": self.status,
            "priority": self.priority,
            "priority_reason": self.priority_reason,
            "assigned_contractor_id": self.assigned_contractor_id,
            "assigned_contractor_name": contractor_name,
            "assigned_contractor_email": contractor_email,
            "assigned_contractor_area": contractor_area,
            "assigned_contractor_city": contractor_city,
            "assigned_contractor_state": contractor_state,
            "suggested_contractor_id": self.suggested_contractor_id,
            "suggested_contractor_name": suggested_name,
            "suggested_contractor_email": suggested_email,
            "suggested_contractor_area": suggested_area,
            "suggested_contractor_city": suggested_city,
            "deadline": deadline_str,
            "is_overdue": self.is_overdue,
            "complaint_age_hours": self.complaint_age_hours,
            "duplicate_of": self.duplicate_of,
            "duplicate_of_ticket_id": dup_ticket_id,
            "road_importance": self.road_importance or "Unknown",
            "is_overdue_notified": self.is_overdue_notified,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "location_name": self.location_name,
            "road_health_score": self.road_health_score,
            "condition_label": self.condition_label,
            "severity": self.severity,
            "analysis_summary": analysis_summary,
            "repair_submission_status": repair_status,
        }


class RepairSubmission(Base):
    """
    Table storing contractor repair proof submissions for maintenance tickets.
    """
    __tablename__ = "repair_submissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(Integer, ForeignKey("maintenance_tickets.id"), nullable=False, index=True)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    submitted_at = Column(DateTime, default=lambda: datetime.now().astimezone(), nullable=False)

    after_image_path = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    status = Column(String, default=RepairStatus.PENDING, nullable=False)  # Pending | Approved | Rejected
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Relationships
    ticket = relationship("MaintenanceTicket", back_populates="repair_submissions")
    submitter = relationship("User", foreign_keys=[submitted_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    def to_dict(self) -> dict:
        submitted_str = self.submitted_at.isoformat() if self.submitted_at else datetime.now().astimezone().isoformat()
        reviewed_str = self.reviewed_at.isoformat() if self.reviewed_at else None

        return {
            "id": self.id,
            "ticket_id": self.ticket_id,
            "submitted_by": self.submitted_by,
            "submitted_by_name": self.submitter.full_name if self.submitter else None,
            "submitted_by_email": self.submitter.email if self.submitter else None,
            "submitted_at": submitted_str,
            "after_image_path": self.after_image_path,
            "notes": self.notes,
            "status": self.status,
            "reviewed_by": self.reviewed_by,
            "reviewed_by_name": self.reviewer.full_name if self.reviewer else None,
            "reviewed_at": reviewed_str,
            "rejection_reason": self.rejection_reason,
        }


class TicketStatusHistory(Base):
    """
    Audit trail recording every status change on a maintenance ticket.
    """
    __tablename__ = "ticket_status_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(Integer, ForeignKey("maintenance_tickets.id"), nullable=False, index=True)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    changed_at = Column(DateTime, default=lambda: datetime.now().astimezone(), nullable=False)

    old_status = Column(String, nullable=True)
    new_status = Column(String, nullable=False)
    notes = Column(Text, nullable=True)

    # Relationships
    ticket = relationship("MaintenanceTicket", back_populates="status_history")
    changer = relationship("User", foreign_keys=[changed_by])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "ticket_id": self.ticket_id,
            "changed_by": self.changed_by,
            "changed_by_name": self.changer.full_name if self.changer else "System",
            "changed_at": self.changed_at.isoformat() if self.changed_at else datetime.now().astimezone().isoformat(),
            "old_status": self.old_status,
            "new_status": self.new_status,
            "notes": self.notes,
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

        # ─── Maintenance Tickets table migrations ───
        try:
            cursor3 = conn.execute(text("PRAGMA table_info(maintenance_tickets)"))
            existing_ticket_cols = {row[1] for row in cursor3.fetchall()}

            ticket_columns_to_add = [
                ("priority_reason", "TEXT"),
                ("duplicate_of", "INTEGER REFERENCES maintenance_tickets(id)"),
                ("suggested_contractor_id", "INTEGER REFERENCES users(id)"),
                ("road_importance", "TEXT NOT NULL DEFAULT 'Unknown'"),
                ("is_overdue_notified", "INTEGER NOT NULL DEFAULT 0"),
                ("latitude", "REAL"),
                ("longitude", "REAL"),
                ("location_name", "TEXT"),
                ("road_health_score", "REAL"),
                ("condition_label", "TEXT"),
                ("severity", "TEXT"),
            ]

            for col_name, col_type in ticket_columns_to_add:
                if col_name not in existing_ticket_cols:
                    conn.execute(text(f"ALTER TABLE maintenance_tickets ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
        except Exception:
            pass  # Table may not exist yet on first run

        # ─── Repair Submissions migrations ───
        try:
            cursor4 = conn.execute(text("PRAGMA table_info(repair_submissions)"))
            existing_rep_cols = {row[1] for row in cursor4.fetchall()}

            rep_columns_to_add = [
                ("submitted_by", "INTEGER REFERENCES users(id)"),
                ("after_image_path", "TEXT"),
                ("notes", "TEXT"),
                ("status", "TEXT NOT NULL DEFAULT 'Pending'"),
                ("reviewed_by", "INTEGER REFERENCES users(id)"),
                ("reviewed_at", "DATETIME"),
                ("rejection_reason", "TEXT"),
            ]
            for col_name, col_type in rep_columns_to_add:
                if col_name not in existing_rep_cols:
                    conn.execute(text(f"ALTER TABLE repair_submissions ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
        except Exception:
            pass

        # ─── Ticket Status History migrations ───
        try:
            cursor5 = conn.execute(text("PRAGMA table_info(ticket_status_history)"))
            existing_hist_cols = {row[1] for row in cursor5.fetchall()}

            hist_columns_to_add = [
                ("changed_by", "INTEGER REFERENCES users(id)"),
                ("notes", "TEXT"),
            ]
            for col_name, col_type in hist_columns_to_add:
                if col_name not in existing_hist_cols:
                    conn.execute(text(f"ALTER TABLE ticket_status_history ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
        except Exception:
            pass


