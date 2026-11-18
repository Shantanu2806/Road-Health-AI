"""
main.py - FastAPI Backend for AI Road Damage Assessment System
Features:
- Multi-role Authentication (User, Contractor, Admin) with Email/Password & Google OAuth
- Road Damage Detection (YOLOv8n Ensemble) & Health Scoring
- Geographic Location Pinning & Public Interactive Road Damage Map
- Contractor & Admin Analytics Dashboards
- Automated Async Damage Alert Emails for Poor/Critical Roads
"""

import os
import io
import csv
import uuid
import math
import shutil
import random
import string
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta

import httpx
from dotenv import load_dotenv
from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    Depends,
    HTTPException,
    Query,
    Request,
    status,
)
from fastapi.responses import RedirectResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func

# Load environment configuration
load_dotenv()

# Local application modules
from database import engine, Base, get_db, SessionLocal
from models import (
    Analysis, User, EmailLog, UserRole, run_db_migrations,
    MaintenanceTicket, RepairSubmission, TicketStatusHistory,
    TicketStatus, TicketPriority, RoadImportance, RepairStatus,
)
from schemas import (
    AnalysisResponse,
    HealthStatus,
    UserRegister,
    UserLogin,
    TokenResponse,
    UserResponse,
    ContractorProfileUpdate,
    ForgotPasswordRequest,
    VerifyResetOTPRequest,
    ResetPasswordRequest,
    MapMarkerResponse,
    EmailLogResponse,
    AdminStatsResponse,
    ContractorDashboardResponse,
    TicketResponse,
    TicketAssignRequest,
    TicketStatusUpdate,
    TicketReopenRequest,
    RepairRejectRequest,
    RepairSubmissionCreate,
    RepairSubmissionResponse,
    TicketStatusHistoryResponse,
    TicketDetailResponse,
    MaintenanceSummaryResponse,
    TicketMergeRequest,
    RepairVerificationRequest,
)
from scoring import assess_road_health
from visualizer import annotate_image
from inference_stub import run_inference
from email_service import (
    send_ticket_assigned_email,
    send_ticket_assigned_user_email,
    send_overdue_warning_email,
    send_repair_submitted_admin_email,
    send_repair_approved_contractor_email,
    send_repair_approved_user_email,
    send_repair_rejected_contractor_email,
    normalize_location_text,
    token_matches_location,
)
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_admin,
    get_current_contractor_or_admin,
    ADMIN_EMAIL,
)
from email_service import (
    trigger_email_alert_async,
    trigger_submission_confirmation_async,
    trigger_password_reset_otp_async,
    trigger_password_reset_success_async,
    sync_contractor_emails_to_env,
)

# Run database schema migrations safely on startup
run_db_migrations(engine)


def _provision_admin_account():
    """
    Startup function: ensures root admin account (kauteshantanu80@gmail.com) exists,
    is active, is approved, and has the password hash for 'Admin@2026'.
    """
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if not existing:
            admin_user = User(
                email=ADMIN_EMAIL,
                password_hash=hash_password("Admin@2026"),
                full_name="Admin",
                role=UserRole.ADMIN,
                is_active=True,
                is_approved=True,
                otp_verified=True,
                created_at=datetime.now().astimezone(),
            )
            db.add(admin_user)
            db.commit()
            print("[STARTUP] Admin account created.")
        else:
            needs_update = False
            if not verify_password("Admin@2026", existing.password_hash):
                existing.password_hash = hash_password("Admin@2026")
                needs_update = True
            if not existing.is_approved:
                existing.is_approved = True
                needs_update = True
            if not existing.is_active:
                existing.is_active = True
                needs_update = True
            if existing.role != UserRole.ADMIN:
                existing.role = UserRole.ADMIN
                needs_update = True
            if needs_update:
                db.commit()
                print("[STARTUP] Admin account password/status synchronized to Admin@2026.")
    except Exception as e:
        print(f"[STARTUP] Admin provisioning error: {e}")
    finally:
        db.close()
    print("[STARTUP] Admin account ready.")


_provision_admin_account()
sync_contractor_emails_to_env()

# Setup directories for static storage
BACKEND_DIR = Path(__file__).resolve().parent
STATIC_DIR = BACKEND_DIR / "static"
UPLOADS_DIR = STATIC_DIR / "uploads"
ANNOTATED_DIR = STATIC_DIR / "annotated"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
ANNOTATED_DIR.mkdir(parents=True, exist_ok=True)

# Google OAuth Config
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Initialize FastAPI application
app = FastAPI(
    title="AI Road Damage Assessment API",
    description="Automated road inspection, multi-role auth, damage classification, and health scoring pipeline.",
    version="2.0.0",
)


@app.on_event("startup")
def on_app_startup():
    _provision_admin_account()


# Enable CORS for local React dev servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",  # Allow all during development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files to serve original and annotated images
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def _format_analysis_response(item: Analysis, include_user_info: bool = False) -> dict:
    """Format an Analysis ORM model into the required API response dictionary."""
    orig_path = item.original_image_path.replace("\\", "/")
    annot_path = item.annotated_image_path.replace("\\", "/")

    orig_url = orig_path if orig_path.startswith("/") else f"/{orig_path}"
    annot_url = annot_path if annot_path.startswith("/") else f"/{annot_path}"

    ts_str = None
    if item.timestamp:
        dt = item.timestamp
        if dt.tzinfo is None:
            dt = dt.astimezone()
        ts_str = dt.isoformat()
    else:
        ts_str = datetime.now().astimezone().isoformat()

    resp = {
        "id": item.id,
        "timestamp": ts_str,
        "user_id": item.user_id,
        "latitude": item.latitude,
        "longitude": item.longitude,
        "location_name": item.location_name,
        "damage_index": item.damage_index,
        "coverage_pct": item.coverage_pct,
        "severity": item.severity,
        "road_health_score": item.road_health_score,
        "condition_label": item.condition_label,
        "image_width": item.image_width,
        "image_height": item.image_height,
        "detections": item.detections or [],
        "original_image_url": orig_url,
        "annotated_image_url": annot_url,
        "annotated_image_path": annot_path,
        "ticket_id": item.tickets[0].ticket_id if (hasattr(item, "tickets") and item.tickets) else None,
        "ticket_priority": item.tickets[0].priority if (hasattr(item, "tickets") and item.tickets) else None,
        "ticket_status": item.tickets[0].status if (hasattr(item, "tickets") and item.tickets) else None,
        "possible_duplicate": None,
    }

    if include_user_info:
        resp["user_name"] = item.user.full_name if item.user else "Anonymous User"
        resp["user_email"] = item.user.email if item.user else "N/A"

    return resp


# Setup logger
logger = logging.getLogger("road_health")


# -----------------------------------------------------------------------------
# MAINTENANCE TICKET HELPERS
# -----------------------------------------------------------------------------
def _generate_ticket_id(db: Session) -> str:
    """Generate a unique sequential ticket ID like RH-2026-0001."""
    year = datetime.now().year
    last_ticket = (
        db.query(MaintenanceTicket)
        .filter(MaintenanceTicket.ticket_id.like(f"RH-{year}-%"))
        .order_by(MaintenanceTicket.id.desc())
        .first()
    )
    if last_ticket:
        try:
            last_num = int(last_ticket.ticket_id.split("-")[-1])
            next_num = last_num + 1
        except (ValueError, IndexError):
            next_num = 1
    else:
        next_num = 1
    return f"RH-{year}-{next_num:04d}"


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the Haversine distance in meters between two GPS coordinates."""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def check_duplicate_ticket(
    latitude: Optional[float],
    longitude: Optional[float],
    db: Session,
    exclude_ticket_id: Optional[int] = None,
) -> Optional[Tuple[MaintenanceTicket, float]]:
    """
    Check for potential duplicate tickets within 50 meters and 30 days.
    Returns (ticket, distance_in_meters) if found, else None.
    """
    if latitude is None or longitude is None:
        return None

    cutoff_date = datetime.now().astimezone() - timedelta(days=30)
    candidates = (
        db.query(MaintenanceTicket)
        .filter(
            MaintenanceTicket.created_at >= cutoff_date,
            MaintenanceTicket.status.notin_([TicketStatus.RESOLVED, TicketStatus.REJECTED]),
        )
        .all()
    )

    closest_match = None
    min_dist = float("inf")

    for candidate in candidates:
        if exclude_ticket_id and candidate.id == exclude_ticket_id:
            continue

        ticket_lat = candidate.latitude
        ticket_lng = candidate.longitude
        if (ticket_lat is None or ticket_lng is None) and candidate.analysis:
            ticket_lat = candidate.analysis.latitude
            ticket_lng = candidate.analysis.longitude

        if ticket_lat is None or ticket_lng is None:
            continue

        dist = _haversine_distance(latitude, longitude, ticket_lat, ticket_lng)
        if dist <= 50.0 and dist < min_dist:
            min_dist = dist
            closest_match = (candidate, dist)

    return closest_match


def _calculate_priority_and_reason(
    score: float,
    condition_label: str,
    damage_index: float,
    has_gps: bool,
    num_defects: int,
) -> Tuple[str, str]:
    """
    Calculate priority and priority_reason using exact spec logic:
    - Base priority from score:
      * 0-30 -> Critical
      * 31-45 -> High
      * 46-60 -> Medium
    - Upgrade priority if damage_index > 15 (upgrade one level)
    - Downgrade priority if no GPS: keep as is
    - Build priority_reason string explaining decision
    """
    if score <= 30:
        base = TicketPriority.CRITICAL
    elif score <= 45:
        base = TicketPriority.HIGH
    else:
        base = TicketPriority.MEDIUM

    priority = base
    upgraded = False
    if damage_index > 15:
        if base == TicketPriority.MEDIUM:
            priority = TicketPriority.HIGH
            upgraded = True
        elif base == TicketPriority.HIGH:
            priority = TicketPriority.CRITICAL
            upgraded = True
        elif base == TicketPriority.CRITICAL:
            # Stays Critical
            upgraded = True

    reason_parts = [f"Score {int(round(score))}/100 ({condition_label} condition)."]
    if upgraded:
        reason_parts.append(f"Damage Index {damage_index:.1f} exceeds threshold — upgraded to {priority}.")
    else:
        reason_parts.append(f"Base priority {priority}.")

    if not has_gps:
        reason_parts.append("No GPS location provided (retained priority).")

    reason_parts.append(f"{num_defects} defects detected.")
    priority_reason = " ".join(reason_parts)

    return priority, priority_reason


def find_contractor_for_location(db: Session, location_name: Optional[str]) -> Optional[User]:
    """
    Finds the active and approved contractor covering a geographic location.
    Prioritizes area match (e.g. Thane, Katraj, Swarget) then city match (e.g. Mumbai, Pune).
    """
    if not location_name:
        return None
    from email_service import normalize_location_text, token_matches_location
    norm_loc = normalize_location_text(location_name)
    if not norm_loc:
        return None
    active_contractors = (
        db.query(User)
        .filter(
            User.role == UserRole.CONTRACTOR,
            User.is_active == True,
            User.is_approved == True,
        )
        .all()
    )
    # 1. Area match
    area_matches = [
        c for c in active_contractors
        if c.service_area and token_matches_location(c.service_area, norm_loc)
    ]
    if area_matches:
        return area_matches[0]
    # 2. City match
    city_matches = [
        c for c in active_contractors
        if c.service_city and token_matches_location(c.service_city, norm_loc)
    ]
    if city_matches:
        return city_matches[0]
    return None


def _auto_create_ticket(
    db: Session,
    analysis: Analysis,
    current_user: Optional[User] = None,
) -> Optional[Tuple[MaintenanceTicket, Optional[Dict[str, Any]]]]:
    """
    Auto-create a maintenance ticket after analysis if road_health_score <= 60.
    Returns (ticket, possible_duplicate_dict) or None if score > 60.
    """
    if analysis.road_health_score > 60.0:
        return None

    ticket_id = _generate_ticket_id(db)
    has_gps = (analysis.latitude is not None and analysis.longitude is not None)
    num_defects = len(analysis.detections) if isinstance(analysis.detections, list) else 0

    priority, priority_reason = _calculate_priority_and_reason(
        score=analysis.road_health_score,
        condition_label=analysis.condition_label,
        damage_index=analysis.damage_index,
        has_gps=has_gps,
        num_defects=num_defects,
    )

    loc_name = analysis.location_name or "Unknown Location"
    title = f"{analysis.condition_label} Road Damage — {loc_name}"

    # Auto-match contractor by service area / city
    matched_contractor = find_contractor_for_location(db, analysis.location_name)

    initial_status = TicketStatus.REPORTED
    assigned_contractor_id = None
    suggested_contractor_id = matched_contractor.id if matched_contractor else None

    ticket = MaintenanceTicket(
        ticket_id=ticket_id,
        analysis_id=analysis.id,
        title=title,
        status=initial_status,
        priority=priority,
        priority_reason=priority_reason,
        road_importance=RoadImportance.UNKNOWN,
        latitude=analysis.latitude,
        longitude=analysis.longitude,
        location_name=analysis.location_name,
        road_health_score=analysis.road_health_score,
        condition_label=analysis.condition_label,
        severity=analysis.severity,
        assigned_contractor_id=assigned_contractor_id,
        suggested_contractor_id=suggested_contractor_id,
        created_at=datetime.now().astimezone(),
        updated_at=datetime.now().astimezone(),
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # First TicketStatusHistory entry:
    uploader_id = current_user.id if current_user else analysis.user_id
    notes_msg = (
        f"Auto-created from Analysis #{analysis.id} (Recommended Area Contractor: {matched_contractor.full_name} - {matched_contractor.service_area or matched_contractor.service_city})"
        if matched_contractor
        else f"Auto-created from Analysis #{analysis.id}"
    )
    history = TicketStatusHistory(
        ticket_id=ticket.id,
        changed_by=uploader_id,
        changed_at=datetime.now().astimezone(),
        old_status=None,
        new_status=initial_status,
        notes=notes_msg,
    )
    db.add(history)
    db.commit()

    # Feature 5: Duplicate Detection check
    duplicate_match = check_duplicate_ticket(analysis.latitude, analysis.longitude, db, exclude_ticket_id=ticket.id)
    possible_dup_info = None

    if duplicate_match:
        dup_ticket, dist = duplicate_match
        if dup_ticket.id != ticket.id:
            ticket.duplicate_of = dup_ticket.id
            db.commit()

            dup_history = TicketStatusHistory(
                ticket_id=ticket.id,
                changed_by=uploader_id,
                changed_at=datetime.now().astimezone(),
                old_status=TicketStatus.REPORTED,
                new_status=TicketStatus.REPORTED,
                notes=f"Possible duplicate of {dup_ticket.ticket_id} ({int(round(dist))}m away)",
            )
            db.add(dup_history)
            db.commit()

            possible_dup_info = {
                "ticket_id": dup_ticket.ticket_id,
                "distance_meters": round(dist, 1),
            }

    logger.info(f"Created ticket {ticket_id} for analysis #{analysis.id} (priority: {priority})")
    return ticket, possible_dup_info



# -----------------------------------------------------------------------------
# SYSTEM & HEALTH ENDPOINTS
# -----------------------------------------------------------------------------
@app.get("/", response_model=HealthStatus)
@app.get("/health", response_model=HealthStatus)
def health_check():
    """Health check endpoint to verify backend service status."""
    return {
        "status": "healthy",
        "system": "AI Road Damage Assessment API",
        "version": "2.0.0",
    }


# -----------------------------------------------------------------------------
# FEATURE 1: AUTHENTICATION SYSTEM (USER, CONTRACTOR, ADMIN)
# -----------------------------------------------------------------------------
@app.post("/auth/register")
def register_user(payload: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new account (User or Contractor).
    - Admin role can only be assigned to kauteshantanu80@gmail.com.
    - Contractor accounts start as is_approved=False; a 6-digit OTP is emailed
      to the contractor and a notification is sent to the admin.
    - For contractors: returns {message, status: 'pending'} — NO JWT token.
    - For users/admins: returns full TokenResponse with JWT.
    """
    clean_email = payload.email.strip().lower()

    # Admin validation rule
    if payload.role == UserRole.ADMIN and clean_email != ADMIN_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {ADMIN_EMAIL} is authorized to register as Admin.",
        )

    # Force admin role if admin email is used
    user_role = UserRole.ADMIN if clean_email == ADMIN_EMAIL else payload.role
    if user_role not in [UserRole.USER, UserRole.CONTRACTOR, UserRole.ADMIN]:
        user_role = UserRole.USER

    # Check if user already exists
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please log in instead.",
        )

    # Hash password with bcrypt
    hashed_pwd = hash_password(payload.password)

    # Contractors require admin approval — generate OTP
    is_contractor = (user_role == UserRole.CONTRACTOR)
    otp = "".join(random.choices(string.digits, k=6)) if is_contractor else None
    otp_expiry = datetime.now().astimezone() + timedelta(minutes=10) if is_contractor else None

    new_user = User(
        email=clean_email,
        password_hash=hashed_pwd,
        full_name=payload.full_name.strip(),
        role=user_role,
        is_active=True,
        is_approved=(not is_contractor),   # contractors start unapproved
        otp_code=otp,
        otp_expires_at=otp_expiry,
        otp_verified=False,
        service_state=payload.service_state.strip() if payload.service_state else None,
        service_city=payload.service_city.strip() if payload.service_city else None,
        service_area=payload.service_area.strip() if payload.service_area else None,
        created_at=datetime.now().astimezone(),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send OTP emails asynchronously for contractor registrations
    if is_contractor:
        _send_contractor_otp_emails_async(
            contractor_email=clean_email,
            contractor_name=new_user.full_name,
            otp=otp,
        )
        # Return PENDING response — no JWT token for contractors
        return {
            "message": "Registration successful. Please check your email for OTP. Your account is pending admin approval.",
            "status": "pending",
            "user_email": clean_email,
        }

    # For users/admins: issue JWT token immediately
    token = create_access_token({"sub": new_user.email, "role": new_user.role, "user_id": new_user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user.to_dict(),
    }


@app.post("/auth/login", response_model=TokenResponse)
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    """
    Log in with email and password. Returns JWT token with role embedded.
    Contractors who are not yet approved receive HTTP 403 with special message.
    """
    clean_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()

    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please try again.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support.",
        )

    # Block unapproved contractor accounts
    if user.role == UserRole.CONTRACTOR and not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending admin approval. Please wait for the admin to verify your OTP and approve your account.",
        )

    token = create_access_token({"sub": user.email, "role": user.role, "user_id": user.id})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user.to_dict(),
    }


# -----------------------------------------------------------------------------
# PASSWORD RESET ENDPOINTS (AVAILABLE FOR ALL ROLES: USER, CONTRACTOR, ADMIN)
# -----------------------------------------------------------------------------
@app.post("/auth/forgot-password")
def forgot_password_request(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Step 1 of Password Reset:
    Generates a 6-digit OTP code and emails it to the user.
    Available for all roles: User, Contractor, and Admin.
    """
    clean_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address. Please verify and try again.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact support.",
        )

    # Generate 6-digit OTP code
    otp = "".join(random.choices(string.digits, k=6))
    user.reset_otp_code = otp
    user.reset_otp_expires_at = datetime.now().astimezone() + timedelta(minutes=10)
    db.commit()

    # Dispatch OTP email asynchronously
    trigger_password_reset_otp_async(
        email=clean_email,
        full_name=user.full_name or "User",
        otp=otp,
        db_session_factory=SessionLocal,
    )

    return {
        "message": f"A 6-digit password reset OTP has been sent to {clean_email}.",
        "email": clean_email,
    }


@app.post("/auth/verify-reset-otp")
def verify_reset_otp(payload: VerifyResetOTPRequest, db: Session = Depends(get_db)):
    """
    Step 2 of Password Reset:
    Verifies that the OTP code entered by the user is valid and not expired.
    """
    clean_email = payload.email.strip().lower()
    clean_otp = payload.otp.strip()

    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found.",
        )

    if not user.reset_otp_code or user.reset_otp_code != clean_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Please check your email and try again.",
        )

    if not user.reset_otp_expires_at or datetime.now().astimezone() > user.reset_otp_expires_at.astimezone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This OTP code has expired. Please request a new code.",
        )

    return {
        "message": "OTP verified successfully. You can now reset your password.",
        "verified": True,
    }


@app.post("/auth/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Step 3 of Password Reset:
    Validates OTP, sets the new password in DB, clears the OTP,
    and dispatches a confirmation email.
    """
    clean_email = payload.email.strip().lower()
    clean_otp = payload.otp.strip()

    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found.",
        )

    if not user.reset_otp_code or user.reset_otp_code != clean_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code.",
        )

    if not user.reset_otp_expires_at or datetime.now().astimezone() > user.reset_otp_expires_at.astimezone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This OTP code has expired. Please request a new code.",
        )

    # Hash new password and save
    user.password_hash = hash_password(payload.new_password)
    user.reset_otp_code = None
    user.reset_otp_expires_at = None
    db.commit()

    # Dispatch confirmation email asynchronously
    trigger_password_reset_success_async(
        email=clean_email,
        full_name=user.full_name or "User",
        db_session_factory=SessionLocal,
    )

    return {
        "message": "Your password has been successfully reset. You can now sign in with your new password.",
        "success": True,
    }


@app.get("/auth/google")
def google_oauth_redirect(role: str = Query("user", description="Selected role for registration")):
    """
    Redirects browser to Google's OAuth consent screen.
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth Client ID is not configured in backend/.env.",
        )

    target_role = "contractor" if role == "contractor" else "user"
    scope = "openid%20email%20profile"
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope={scope}"
        f"&access_type=offline"
        f"&state={target_role}"
    )
    return RedirectResponse(url=auth_url)


@app.get("/auth/google/callback")
async def google_oauth_callback(
    code: str = Query(...),
    state: str = Query("user"),
    db: Session = Depends(get_db),
):
    """
    Handles Google OAuth code exchange, finds or creates user, and redirects to frontend with JWT.
    """
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(token_url, data=token_data)
        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Google OAuth token exchange failed: {resp.text}",
            )
        tokens = resp.json()
        access_token = tokens.get("access_token")

        # Fetch user info
        user_info_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if user_info_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to retrieve Google user profile.",
            )
        google_profile = user_info_resp.json()

    google_email = google_profile.get("email", "").strip().lower()
    google_name = google_profile.get("name") or google_email.split("@")[0]
    google_id = google_profile.get("id")

    if not google_email:
        raise HTTPException(status_code=400, detail="Google account has no associated email address.")

    user = db.query(User).filter(User.email == google_email).first()

    if not user:
        # Create new user
        assigned_role = UserRole.ADMIN if google_email == ADMIN_EMAIL else (
            UserRole.CONTRACTOR if state == "contractor" else UserRole.USER
        )

        user = User(
            email=google_email,
            full_name=google_name,
            google_id=google_id,
            role=assigned_role,
            is_active=True,
            created_at=datetime.now().astimezone(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update google_id if newly linked
        if not user.google_id:
            user.google_id = google_id
            db.commit()

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account has been deactivated.")

    # Issue JWT
    jwt_token = create_access_token({"sub": user.email, "role": user.role, "user_id": user.id})

    # Redirect to frontend callback route with JWT
    redirect_target = f"{FRONTEND_URL}/auth/callback?token={jwt_token}&role={user.role}&name={user.full_name}"
    return RedirectResponse(url=redirect_target)


@app.get("/auth/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Return profile details of currently authenticated user."""
    return current_user.to_dict()


# ─── OTP Email Helpers ───────────────────────────────────────────────────────
def _send_contractor_otp_emails_async(contractor_email: str, contractor_name: str, otp: str):
    """
    Sends two emails asynchronously after contractor self-registration:
    1. OTP to the contractor (they forward it to admin for verification)
    2. Notification to admin that a new contractor is awaiting approval
    """
    def _send():
        sender = os.getenv("EMAIL_SENDER", "kauteshantanu80@gmail.com")
        email_password = os.getenv("EMAIL_PASSWORD", "")
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))

        if not email_password or "<Gmail App Password" in email_password or "your_password" in email_password:
            print(f"[OTP EMAIL] Gmail App Password not configured — OTP for {contractor_email} is: {otp}")
            return

        import smtplib
        from email.message import EmailMessage

        # Email 1: OTP to contractor
        try:
            msg1 = EmailMessage()
            msg1["Subject"] = "Road Health AI — Your Contractor Registration OTP"
            msg1["From"] = sender
            msg1["To"] = contractor_email
            msg1.set_content(
                f"Hello {contractor_name},\n\n"
                f"Thank you for registering as a Contractor on Road Health AI.\n\n"
                f"Your account is pending approval by the administrator.\n"
                f"Please share the following OTP with the admin to verify your identity:\n\n"
                f"    OTP Code: {otp}\n\n"
                f"This OTP is valid for 10 minutes.\n\n"
                f"Once the admin approves your account, you will be able to log in at:\n"
                f"http://localhost:5173/login\n\n"
                f"— Road Health AI Team"
            )
            with smtplib.SMTP(smtp_server, smtp_port, timeout=20) as srv:
                srv.ehlo(); srv.starttls(); srv.ehlo()
                srv.login(sender, email_password)
                srv.send_message(msg1)
        except Exception as e:
            print(f"[OTP EMAIL] Failed to send OTP to contractor {contractor_email}: {e}")

        # Email 2: Notification to admin
        try:
            msg2 = EmailMessage()
            msg2["Subject"] = f"[Road Health AI] New Contractor Awaiting Approval: {contractor_name}"
            msg2["From"] = sender
            msg2["To"] = ADMIN_EMAIL
            msg2.set_content(
                f"A new contractor has registered and is awaiting your approval.\n\n"
                f"Name: {contractor_name}\n"
                f"Email: {contractor_email}\n\n"
                f"To approve, go to the Admin Dashboard > Pending Contractor Approvals.\n"
                f"Enter the OTP shared by the contractor to verify their identity, "
                f"then click Approve or Reject.\n\n"
                f"— Road Health AI System"
            )
            with smtplib.SMTP(smtp_server, smtp_port, timeout=20) as srv:
                srv.ehlo(); srv.starttls(); srv.ehlo()
                srv.login(sender, email_password)
                srv.send_message(msg2)
        except Exception as e:
            print(f"[OTP EMAIL] Failed to send admin notification: {e}")

    import threading
    threading.Thread(target=_send, daemon=True).start()


def _send_contractor_approval_email_async(contractor_email: str, contractor_name: str, approved: bool):
    """Notify contractor whether their account was approved or rejected."""
    def _send():
        sender = os.getenv("EMAIL_SENDER", "kauteshantanu80@gmail.com")
        email_password = os.getenv("EMAIL_PASSWORD", "")
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))

        if not email_password or "<Gmail App Password" in email_password or "your_password" in email_password:
            print(f"[APPROVAL EMAIL] Gmail App Password not configured — approval status for {contractor_email}: {approved}")
            return

        import smtplib
        from email.message import EmailMessage

        if approved:
            subject = "Road Health AI — Your Contractor Account Has Been Approved!"
            body = (
                f"Hello {contractor_name},\n\n"
                f"Great news! Your Contractor account on Road Health AI has been approved by the administrator.\n\n"
                f"You can now log in at: http://localhost:5173/login\n\n"
                f"— Road Health AI Team"
            )
        else:
            subject = "Road Health AI — Contractor Account Registration Update"
            body = (
                f"Hello {contractor_name},\n\n"
                f"Unfortunately, your Contractor account registration on Road Health AI has been rejected by the administrator.\n\n"
                f"If you believe this is a mistake, please contact the administrator at {ADMIN_EMAIL}.\n\n"
                f"— Road Health AI Team"
            )

        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = sender
            msg["To"] = contractor_email
            msg.set_content(body)
            with smtplib.SMTP(smtp_server, smtp_port, timeout=20) as srv:
                srv.ehlo(); srv.starttls(); srv.ehlo()
                srv.login(sender, email_password)
                srv.send_message(msg)
        except Exception as e:
            print(f"[APPROVAL EMAIL] Failed to send approval email to {contractor_email}: {e}")

    import threading
    threading.Thread(target=_send, daemon=True).start()


def _send_contractor_rejection_with_reason_async(contractor_email: str, contractor_name: str, reason: str):
    """Notify contractor that their account was rejected, including the reason."""
    def _send():
        sender = os.getenv("EMAIL_SENDER", "kauteshantanu80@gmail.com")
        email_password = os.getenv("EMAIL_PASSWORD", "")
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))

        if not email_password or "<Gmail App Password" in email_password or "your_password" in email_password:
            print(f"[REJECTION EMAIL] Gmail App Password not configured — rejection for {contractor_email}")
            return

        import smtplib
        from email.message import EmailMessage

        subject = "Road Health AI — Account Not Approved"
        body = (
            f"Hello {contractor_name},\n\n"
            f"Your contractor account registration was not approved.\n"
            f"Reason: {reason}\n\n"
            f"Please contact the admin for more information.\n\n"
            f"— Road Health AI Team"
        )
        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = sender
            msg["To"] = contractor_email
            msg.set_content(body)
            with smtplib.SMTP(smtp_server, smtp_port, timeout=20) as srv:
                srv.ehlo(); srv.starttls(); srv.ehlo()
                srv.login(sender, email_password)
                srv.send_message(msg)
        except Exception as e:
            print(f"[REJECTION EMAIL] Failed to send rejection email to {contractor_email}: {e}")

    import threading
    threading.Thread(target=_send, daemon=True).start()



# CORE INSPECTION & ASSESSMENT ENDPOINTS (PROTECTED WITH AUTH)
# -----------------------------------------------------------------------------
@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_road_image(
    request: Request,
    file: UploadFile = File(..., description="Road surface image (JPG, PNG)"),
    conf_threshold: float = Form(0.25, description="Minimum confidence threshold"),
    latitude: Optional[float] = Form(None, description="GPS latitude"),
    longitude: Optional[float] = Form(None, description="GPS longitude"),
    location_name: Optional[str] = Form(None, description="Location text / address"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload an image for road damage inspection:
    1. Validates image type and 10MB file size limit.
    2. Runs YOLO damage detection (RDD2022 + Cavity Pothole ensemble).
    3. Computes DI, Coverage %, Severity, Score, and Condition.
    4. Annotates image with bounding boxes, labels, and condition banner.
    5. Saves inspection with geo-coordinates and user ownership to DB.
    6. Asynchronously dispatches email alert if Road Health Score <= 60.
    """
    # 1. Validate file extension
    filename = file.filename or "upload.jpg"
    ext = Path(filename).suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".bmp", ".webp"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Please upload a valid JPG or PNG road image.",
        )

    # 2. Validate file size (10MB maximum limit)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    try:
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds 10MB limit ({file_size / (1024 * 1024):.2f}MB). Please upload an image under 10MB.",
            )
        if file_size == 0:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty. Please upload a valid road image.",
            )
    except HTTPException:
        raise
    except Exception:
        pass

    # Unique file identifiers to avoid collisions
    unique_id = uuid.uuid4().hex[:10]
    safe_filename = f"{unique_id}_{Path(filename).name}"
    orig_save_path = UPLOADS_DIR / safe_filename
    annot_save_path = ANNOTATED_DIR / f"annotated_{safe_filename}"

    # 3. Save uploaded file to disk
    try:
        with open(orig_save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded image: {e}")

    # 4. Run Inference
    try:
        inference_result = run_inference(orig_save_path, conf_threshold=conf_threshold)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference execution failed: {e}")

    # Road surface verification
    if not inference_result.get("is_road_surface", True):
        try:
            if orig_save_path.exists():
                orig_save_path.unlink()
        except Exception:
            pass
        raise HTTPException(
            status_code=400,
            detail="Wrong Image Uploaded: The uploaded photo is not recognized as an asphalt road surface.",
        )

    detections = inference_result.get("detections", [])
    img_width = inference_result.get("image_width", 640)
    img_height = inference_result.get("image_height", 640)

    # 5. Calculate Damage Metrics via scoring.py
    assessment = assess_road_health(detections, img_width, img_height)

    # 6. Generate annotated image with bounding boxes & banner
    rel_annot_path = f"static/annotated/annotated_{safe_filename}"
    rel_orig_path = f"static/uploads/{safe_filename}"

    try:
        annotate_image(
            image_path=orig_save_path,
            detections=detections,
            output_path=annot_save_path,
            road_health_score=assessment["road_health_score"],
            condition_label=assessment["condition_label"],
        )
    except Exception:
        rel_annot_path = rel_orig_path

    # Clean location text
    clean_loc_name = location_name.strip() if location_name and location_name.strip() else None

    # 7. Persist analysis to Database with user ownership
    analysis_record = Analysis(
        timestamp=datetime.now().astimezone(),
        user_id=current_user.id,
        latitude=latitude,
        longitude=longitude,
        location_name=clean_loc_name,
        original_image_path=rel_orig_path,
        annotated_image_path=rel_annot_path,
        detections=detections,
        damage_index=assessment["damage_index"],
        coverage_pct=assessment["coverage_pct"],
        severity=assessment["severity"],
        road_health_score=assessment["road_health_score"],
        condition_label=assessment["condition_label"],
        image_width=img_width,
        image_height=img_height,
    )

    db.add(analysis_record)
    db.commit()
    db.refresh(analysis_record)

    response_dict = _format_analysis_response(analysis_record, include_user_info=(current_user.role == UserRole.ADMIN))
    if current_user:
        response_dict["user_email"] = current_user.email
        response_dict["user_name"] = current_user.full_name

    # 8. Auto-create maintenance ticket if road_health_score <= 60
    response_dict["ticket_id"] = None
    response_dict["ticket_priority"] = None
    response_dict["possible_duplicate"] = None

    if analysis_record.road_health_score <= 60.0:
        try:
            ticket_res = _auto_create_ticket(db, analysis_record, current_user=current_user)
            if ticket_res:
                created_ticket, possible_dup = ticket_res
                response_dict["ticket_id"] = created_ticket.ticket_id
                response_dict["ticket_priority"] = created_ticket.priority
                response_dict["ticket_status"] = created_ticket.status
                response_dict["possible_duplicate"] = possible_dup
        except Exception as e:
            logger.error(f"Auto-ticket creation failed for analysis #{analysis_record.id}: {e}")

    # 9. Dispatch Async Email Alert if Damage Detected (Poor, Critical, or Fair with defects)
    trigger_email_alert_async(
        analysis_data=response_dict,
        annotated_image_path=str(annot_save_path),
        db_session_factory=SessionLocal,
    )

    # 10. Dispatch Async User Confirmation Email for this inspection
    if current_user and current_user.email:
        trigger_submission_confirmation_async(
            user_email=current_user.email,
            user_name=current_user.full_name or "Inspector",
            analysis_id=analysis_record.id,
            road_health_score=analysis_record.road_health_score,
            condition_label=analysis_record.condition_label,
            severity=analysis_record.severity,
            detection_count=len(detections),
            location_name=analysis_record.location_name,
            timestamp=response_dict.get("timestamp", datetime.now().isoformat()),
            db_session_factory=SessionLocal,
        )

    return response_dict


@app.get("/history", response_model=List[AnalysisResponse])
def get_assessment_history(
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve historical road analyses:
    - User: sees only their own inspections.
    - Contractor & Admin: see all inspections across the system.
    """
    query = db.query(Analysis).order_by(Analysis.timestamp.desc())

    if current_user.role == UserRole.USER:
        # Restrict regular users strictly to their own uploads
        query = query.filter(Analysis.user_id == current_user.id)

    records = query.limit(limit).all()
    include_user = (current_user.role == UserRole.ADMIN)
    return [_format_analysis_response(r, include_user_info=include_user) for r in records]


@app.get("/analyses/{analysis_id}", response_model=AnalysisResponse)
def get_single_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch a single analysis report by its database ID.
    """
    record = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Analysis with ID {analysis_id} not found.")

    # Access control: users cannot view another user's private assessment
    if current_user.role == UserRole.USER and record.user_id and record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to view this inspection.")

    return _format_analysis_response(record, include_user_info=(current_user.role == UserRole.ADMIN))


@app.post("/analyses/{analysis_id}/resend-alert")
def resend_damage_alert_endpoint(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Manually triggers / resends damage alert notification for an existing inspection.
    """
    record = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Analysis with ID {analysis_id} not found.")

    response_dict = _format_analysis_response(record, include_user_info=(current_user.role == UserRole.ADMIN))
    annot_path = Path(__file__).resolve().parent / record.annotated_image_path

    from email_service import send_damage_alert_sync
    import threading
    thread = threading.Thread(
        target=send_damage_alert_sync,
        args=(response_dict, str(annot_path), SessionLocal),
        daemon=True,
    )
    thread.start()

    return {
        "status": "alert_dispatched",
        "analysis_id": analysis_id,
        "score": record.road_health_score,
        "condition": record.condition_label,
        "location": record.location_name,
    }


# -----------------------------------------------------------------------------
# FEATURE 2: LOCATION & MAP FEATURE (PUBLIC ENDPOINTS)
# -----------------------------------------------------------------------------
@app.get("/map/markers", response_model=List[MapMarkerResponse])
def get_map_markers(db: Session = Depends(get_db)):
    """
    Public endpoint: Returns all road analyses that have GPS coordinates.
    Does NOT expose who uploaded the inspection (no user_id or email).
    """
    records = (
        db.query(Analysis)
        .filter(Analysis.latitude.isnot(None), Analysis.longitude.isnot(None))
        .order_by(Analysis.timestamp.desc())
        .limit(300)
        .all()
    )

    markers = []
    for r in records:
        dt_str = r.timestamp.isoformat() if r.timestamp else datetime.now().isoformat()
        defect_count = len(r.detections) if isinstance(r.detections, list) else 0

        markers.append({
            "id": r.id,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "road_health_score": r.road_health_score,
            "condition_label": r.condition_label,
            "severity": r.severity,
            "timestamp": dt_str,
            "location_name": r.location_name,
            "defect_count": defect_count,
        })

    return markers


# -----------------------------------------------------------------------------
# FEATURE 3: CONTRACTOR & ADMIN DASHBOARDS
# -----------------------------------------------------------------------------
@app.put("/contractor/profile", response_model=UserResponse)
def update_contractor_profile(
    payload: ContractorProfileUpdate,
    current_user: User = Depends(get_current_contractor_or_admin),
    db: Session = Depends(get_db),
):
    """
    Contractor Profile Update (contractor role required):
    Allows contractor to update their service_state, service_city, service_area.
    """
    if payload.service_state is not None:
        current_user.service_state = payload.service_state.strip() or None
    if payload.service_city is not None:
        current_user.service_city = payload.service_city.strip() or None
    if payload.service_area is not None:
        current_user.service_area = payload.service_area.strip() or None

    db.commit()
    db.refresh(current_user)
    return current_user.to_dict()


@app.get("/contractor/dashboard", response_model=ContractorDashboardResponse)
@app.get("/contractor/dashboard-data", response_model=ContractorDashboardResponse)
def get_contractor_dashboard(
    current_user: User = Depends(get_current_contractor_or_admin),
    db: Session = Depends(get_db),
):
    """
    Contractor Dashboard Summary:
    - Total analyses in system
    - Average road health score
    - Condition counts (Good, Fair, Poor, Critical)
    - Recent Critical / Poor inspections (notifications panel)
    - Priority Repair Queue: Critical (0-30), Poor (31-60), Fair (61-80) sorted by urgency
      Filtered by contractor's service area if set
    - Contractor service area metadata
    """
    total = db.query(Analysis).count()
    avg_score = db.query(func.avg(Analysis.road_health_score)).scalar() or 100.0

    counts = {
        "Good": db.query(Analysis).filter(Analysis.condition_label == "Good").count(),
        "Fair": db.query(Analysis).filter(Analysis.condition_label == "Fair").count(),
        "Poor": db.query(Analysis).filter(Analysis.condition_label == "Poor").count(),
        "Critical": db.query(Analysis).filter(Analysis.condition_label == "Critical").count(),
    }

    # Recent poor or critical
    recent_alerts = (
        db.query(Analysis)
        .filter(Analysis.condition_label.in_(["Poor", "Critical"]))
        .order_by(Analysis.timestamp.desc())
        .limit(10)
        .all()
    )

    # Priority Repair Queue (Critical, Poor, Fair) — Good (81-100) not shown
    priority_records = (
        db.query(Analysis)
        .filter(Analysis.condition_label.in_(["Critical", "Poor", "Fair"]))
        .all()
    )

    # Filter by contractor's service area if configured
    has_service_area = bool(current_user.service_city or current_user.service_state or current_user.service_area)
    filtered_priority = []
    if has_service_area:
        for item in priority_records:
            loc = (item.location_name or "").lower()
            if (
                (current_user.service_city and current_user.service_city.lower() in loc)
                or (current_user.service_state and current_user.service_state.lower() in loc)
                or (current_user.service_area and current_user.service_area.lower() in loc)
            ):
                filtered_priority.append(item)
        if not filtered_priority:
            # Fallback to show all priority items if none match specific filter
            filtered_priority = priority_records
    else:
        filtered_priority = priority_records

    # Sort priority queue: Critical (0-30) first, Poor (31-60) second, Fair (61-80) third
    priority_rank = {"Critical": 1, "Poor": 2, "Fair": 3}
    filtered_priority.sort(
        key=lambda x: (
            priority_rank.get(x.condition_label, 99),
            x.road_health_score,
            -(x.timestamp.timestamp() if x.timestamp else 0),
        )
    )

    priority_queue = [
        {
            "id": r.id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else "",
            "road_health_score": round(float(r.road_health_score), 1),
            "condition_label": r.condition_label,
            "severity": r.severity,
            "detection_count": len(r.detections or []) if isinstance(r.detections, list) else 0,
            "location_name": r.location_name or "Location not provided",
            "latitude": r.latitude,
            "longitude": r.longitude,
        }
        for r in filtered_priority
    ]

    contractor_info = {
        "service_state": current_user.service_state,
        "service_city": current_user.service_city,
        "service_area": current_user.service_area,
    }

    return {
        "total_analyses": total,
        "average_score": round(float(avg_score), 2),
        "condition_counts": counts,
        "recent_critical_or_poor": [_format_analysis_response(r, include_user_info=False) for r in recent_alerts],
        "priority_queue": priority_queue,
        "contractor_info": contractor_info,
    }


@app.get("/admin/dashboard", response_model=AdminStatsResponse)
@app.get("/admin/stats", response_model=AdminStatsResponse)
def get_admin_system_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin Dashboard: System statistics, counts by role and condition, db size.
    Includes pending_contractors count.
    """
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_analyses = db.query(Analysis).count()
    avg_score = db.query(func.avg(Analysis.road_health_score)).scalar() or 100.0

    # Role breakdown
    roles = {"user": 0, "contractor": 0, "admin": 0}
    for r, count in db.query(User.role, func.count(User.id)).group_by(User.role).all():
        roles[r] = count

    # Condition breakdown
    conditions = {"Good": 0, "Fair": 0, "Poor": 0, "Critical": 0}
    for c, count in db.query(Analysis.condition_label, func.count(Analysis.id)).group_by(Analysis.condition_label).all():
        conditions[c] = count

    # Pending contractors awaiting approval
    pending_contractors = (
        db.query(User)
        .filter(User.role == UserRole.CONTRACTOR, User.is_approved == False)
        .count()
    )

    # DB size
    db_file = BACKEND_DIR / "road_health.db"
    db_size = db_file.stat().st_size if db_file.exists() else 0

    contractors_data = []
    for c in db.query(User).filter(User.role == UserRole.CONTRACTOR).order_by(User.created_at.desc()).all():
        analysis_count = db.query(Analysis).filter(Analysis.user_id == c.id).count()
        c_dict = c.to_dict()
        c_dict["analysis_count"] = analysis_count
    # Ticket tracking stats
    now = datetime.now().astimezone()
    overdue_count = (
        db.query(MaintenanceTicket)
        .filter(
            MaintenanceTicket.deadline.isnot(None),
            MaintenanceTicket.deadline < now,
            MaintenanceTicket.status.notin_([TicketStatus.RESOLVED, TicketStatus.REJECTED]),
        )
        .count()
    )

    total_tickets = db.query(MaintenanceTicket).count()
    by_status = {s: 0 for s in TicketStatus.ALL}
    for st, count in db.query(MaintenanceTicket.status, func.count(MaintenanceTicket.id)).group_by(MaintenanceTicket.status).all():
        by_status[st] = count

    by_priority = {p: 0 for p in TicketPriority.ALL}
    for pr, count in db.query(MaintenanceTicket.priority, func.count(MaintenanceTicket.id)).group_by(MaintenanceTicket.priority).all():
        by_priority[pr] = count

    ticket_summary = {
        "total": total_tickets,
        "by_status": by_status,
        "by_priority": by_priority,
    }

    return {
        "total_users": total_users,
        "total_analyses": total_analyses,
        "analyses_by_role": roles,
        "analyses_by_condition": conditions,
        "average_score": round(float(avg_score), 2),
        "active_users": active_users,
        "database_size_bytes": db_size,
        "system_status": "Healthy (All micro-services active)",
        "model_info": "YOLOv8n RDD2022 + Cavity Pothole Ensemble (best.pt + pothole_yolo.pt)",
        "pending_contractors": pending_contractors,
        "contractors": contractors_data,
        "overdue_tickets": overdue_count,
        "ticket_summary": ticket_summary,
    }


@app.get("/admin/users", response_model=List[Dict[str, Any]])
def get_admin_user_management(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin Dashboard: User management listing all users with inspection counts.
    """
    users = db.query(User).order_by(User.created_at.desc()).all()
    user_list = []
    for u in users:
        analysis_count = db.query(Analysis).filter(Analysis.user_id == u.id).count()
        item = u.to_dict()
        item["analysis_count"] = analysis_count
        user_list.append(item)
    return user_list


@app.post("/admin/users/{user_id}/toggle-status")
def toggle_user_active_status(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin Dashboard: Deactivate or activate a user account.
    Prevents deactivating the root admin account.
    """
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    if target_user.email == ADMIN_EMAIL:
        raise HTTPException(status_code=400, detail="Cannot deactivate the primary administrator account.")

    target_user.is_active = not target_user.is_active
    db.commit()
    db.refresh(target_user)

    if target_user.role == UserRole.CONTRACTOR:
        sync_contractor_emails_to_env(db)

    status_str = "activated" if target_user.is_active else "deactivated"
    return {"message": f"User {target_user.email} successfully {status_str}.", "is_active": target_user.is_active}


# -----------------------------------------------------------------------------
# FEATURE 4: EMAIL NOTIFICATION LOGS
# -----------------------------------------------------------------------------
@app.get("/admin/email-logs", response_model=List[EmailLogResponse])
def get_admin_email_logs(
    admin: User = Depends(get_current_admin),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Admin Dashboard: Recent automated email dispatch logs.
    """
    logs = db.query(EmailLog).order_by(EmailLog.timestamp.desc()).limit(limit).all()
    return [l.to_dict() for l in logs]


from pydantic import BaseModel, EmailStr, Field


class TestSmtpPayload(BaseModel):
    app_password: Optional[str] = None
    recipient: Optional[str] = None


@app.post("/admin/test-smtp")
def test_smtp_connection_endpoint(
    payload: TestSmtpPayload,
    admin: User = Depends(get_current_admin),
):
    """
    Admin diagnostic tool: test live Gmail SMTP connectivity with smtp.gmail.com:587.
    Optionally accepts a new 16-character Google App Password to test and persist in .env.
    Sends a test email to the recipient (defaults to kauteshantanu80@gmail.com).
    """
    import smtplib
    from email.message import EmailMessage
    from email_service import SMTP_SERVER, SMTP_PORT, EMAIL_SENDER

    sender = EMAIL_SENDER or "kauteshantanu80@gmail.com"
    pw = (payload.app_password or "").strip() or os.getenv("EMAIL_PASSWORD", "").strip()
    recipient = (payload.recipient or "").strip() or sender
    env_file = Path(__file__).resolve().parent / ".env"

    if not pw:
        return {
            "success": False,
            "status": "error",
            "message": "No Gmail App Password provided in request or configured in backend/.env",
            "hint": "Generate a 16-letter App Password at https://myaccount.google.com/apppasswords (select Mail / Other).",
        }

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=12) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(sender, pw)

            msg = EmailMessage()
            msg["Subject"] = "Road Health AI — SMTP Verification & Live Connection Test"
            msg["From"] = f"Road Health AI <{sender}>"
            msg["To"] = recipient
            msg.set_content(
                f"Hello Admin,\n\n"
                f"This test email confirms that your Gmail App Password has been successfully verified "
                f"and is connected to the Road Health AI automated municipal dispatch system.\n\n"
                f"All future road damage alerts, tickets, and official PDF inspection reports "
                f"will be delivered directly to your inbox.\n\n"
                f"— Road Health AI Infrastructure Team"
            )
            server.send_message(msg)

        # If a valid password was supplied, persist it into .env!
        if payload.app_password and env_file.exists():
            env_text = env_file.read_text(encoding="utf-8")
            if "EMAIL_PASSWORD=" in env_text:
                env_text = re.sub(r"EMAIL_PASSWORD=.*", f"EMAIL_PASSWORD={pw}", env_text)
            else:
                env_text += f"\nEMAIL_PASSWORD={pw}\n"
            env_file.write_text(env_text, encoding="utf-8")
            os.environ["EMAIL_PASSWORD"] = pw

        return {
            "success": True,
            "status": "connected",
            "message": f"SMTP connection successful! Live test email delivered to {recipient}.",
            "sender": sender,
            "recipient": recipient,
        }

    except Exception as exc:
        err_str = str(exc)
        hint = (
            "Google rejected the credentials (535 Bad Credentials). "
            "To fix: 1. Visit https://myaccount.google.com/apppasswords. "
            "2. Make sure 2-Step Verification is active. "
            "3. Generate a new App Password for 'Road Health AI'. "
            "4. Copy the 16-letter code and save it into backend/.env as EMAIL_PASSWORD."
        )
        return {
            "success": False,
            "status": "authentication_failed",
            "error": err_str,
            "message": "Gmail rejected the App Password.",
            "hint": hint,
            "sender": sender,
            "recipient": recipient,
        }


# -----------------------------------------------------------------------------
# FEATURE: ADMIN CONTRACTOR PROVISIONING & MANAGEMENT + OTP APPROVAL FLOW
# -----------------------------------------------------------------------------
from pydantic import BaseModel, EmailStr, Field


# ── Pending Contractors Listing ───────────────────────────────────────────────
@app.get("/admin/pending-contractors")
def get_pending_contractors(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin endpoint: returns all contractor accounts that have not yet been approved.
    Includes OTP verification status.
    """
    pending = (
        db.query(User)
        .filter(User.role == UserRole.CONTRACTOR, User.is_approved == False)
        .order_by(User.created_at.desc())
        .all()
    )
    results = []
    for c in pending:
        created_str = c.created_at.isoformat() if c.created_at else datetime.now().astimezone().isoformat()
        otp_exp_str = c.otp_expires_at.isoformat() if c.otp_expires_at else None
        results.append({
            "id": c.id,
            "full_name": c.full_name,
            "email": c.email,
            "created_at": created_str,
            "is_active": c.is_active,
            "otp_verified": c.otp_verified,
            "otp_expires_at": otp_exp_str,
            "service_state": c.service_state,
            "service_city": c.service_city,
            "service_area": c.service_area,
        })
    return results


# ── Verify OTP ────────────────────────────────────────────────────────────────
class OTPVerifyPayload(BaseModel):
    contractor_email: str
    otp: str


@app.post("/admin/verify-contractor-otp")
def verify_contractor_otp(
    payload: OTPVerifyPayload,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin endpoint: verifies the 6-digit OTP shared by the contractor.
    On success, marks otp_verified=True. Does NOT approve yet.
    """
    contractor = db.query(User).filter(
        User.email == payload.contractor_email.strip().lower(),
        User.role == UserRole.CONTRACTOR,
        User.is_approved == False,
    ).first()

    if not contractor:
        raise HTTPException(status_code=404, detail="Pending contractor not found.")

    # Check OTP expiry
    if not contractor.otp_expires_at or datetime.now().astimezone() > contractor.otp_expires_at.astimezone():
        raise HTTPException(status_code=400, detail="OTP has expired. Ask the contractor to re-register.")

    if contractor.otp_code != payload.otp.strip():
        raise HTTPException(status_code=400, detail="Wrong OTP. Please enter the correct code.")

    contractor.otp_verified = True
    db.commit()
    return {"message": "OTP verified successfully. You can now approve this contractor.", "otp_verified": True}


# ── Approve Contractor ────────────────────────────────────────────────────────
class ContractorEmailPayload(BaseModel):
    contractor_email: str


@app.post("/admin/approve-contractor")
def approve_contractor(
    payload: ContractorEmailPayload,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin endpoint: approves a contractor account.
    OTP must have been verified first.
    """
    contractor = db.query(User).filter(
        User.email == payload.contractor_email.strip().lower(),
        User.role == UserRole.CONTRACTOR,
    ).first()

    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found.")

    if not contractor.otp_verified:
        raise HTTPException(status_code=400, detail="OTP not verified yet. Please verify OTP first.")

    contractor.is_approved = True
    contractor.otp_code = None       # Clear OTP after use
    contractor.otp_expires_at = None
    db.commit()
    sync_contractor_emails_to_env(db)

    # Notify contractor by email asynchronously
    _send_contractor_approval_email_async(
        contractor_email=contractor.email,
        contractor_name=contractor.full_name,
        approved=True,
    )

    return {"message": "Contractor approved successfully."}


@app.post("/admin/resend-contractor-otp")
def resend_contractor_otp(
    payload: ContractorEmailPayload,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin endpoint: generates a new 6-digit OTP for a pending contractor,
    extends expiration by 15 minutes, and resends the OTP email.
    """
    contractor = db.query(User).filter(
        User.email == payload.contractor_email.strip().lower(),
        User.role == UserRole.CONTRACTOR,
        User.is_approved == False,
    ).first()

    if not contractor:
        raise HTTPException(status_code=404, detail="Pending contractor not found.")

    new_otp = "".join([str(random.randint(0, 9)) for _ in range(6)])
    contractor.otp_code = new_otp
    contractor.otp_expires_at = datetime.now().astimezone() + timedelta(minutes=15)
    contractor.otp_verified = False
    db.commit()

    _send_contractor_otp_emails_async(
        contractor_email=contractor.email,
        contractor_name=contractor.full_name,
        otp=new_otp,
    )

    return {"message": f"Fresh OTP dispatched to {contractor.email}", "otp": new_otp}


# ── Reject Contractor ─────────────────────────────────────────────────────────
class ContractorRejectPayload(BaseModel):
    contractor_email: str
    reason: str = "Not specified"


@app.post("/admin/reject-contractor")
def reject_contractor(
    payload: ContractorRejectPayload,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin endpoint: rejects and deletes a pending contractor account.
    Sends a rejection email with the provided reason.
    """
    contractor = db.query(User).filter(
        User.email == payload.contractor_email.strip().lower(),
        User.role == UserRole.CONTRACTOR,
        User.is_approved == False,
    ).first()

    if not contractor:
        raise HTTPException(status_code=404, detail="Pending contractor not found.")

    email = contractor.email
    name = contractor.full_name
    reason = payload.reason or "Not specified"

    db.delete(contractor)
    db.commit()
    sync_contractor_emails_to_env(db)

    # Notify contractor by email asynchronously (with reason)
    _send_contractor_rejection_with_reason_async(
        contractor_email=email,
        contractor_name=name,
        reason=reason,
    )

    return {"message": "Contractor rejected."}


class ContractorCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2)
    password: str = Field(..., min_length=6)


def _send_welcome_contractor_email_async(email: str, full_name: str, plain_password: str):
    """
    Asynchronously dispatches a welcome email to the newly provisioned contractor
    and logs the attempt into the email_logs table.
    """
    def _send():
        sender = os.getenv("EMAIL_SENDER", "kauteshantanu80@gmail.com")
        password = os.getenv("EMAIL_PASSWORD", "")
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))

        subject = "Welcome to Road Health AI - Contractor Account Created"
        body = (
            f"You have been added as a Contractor on Road Health AI.\n"
            f"Login at http://localhost:5173/login\n"
            f"Email: {email}\n"
            f"Password: {plain_password}\n"
        )

        status_val = "failed"
        err_msg = None

        if not password or "<Gmail App Password" in password or "your_password" in password:
            err_msg = "Gmail App Password not configured in .env"
        else:
            try:
                import smtplib
                from email.message import EmailMessage
                msg = EmailMessage()
                msg["Subject"] = subject
                msg["From"] = sender
                msg["To"] = email
                msg.set_content(body)

                with smtplib.SMTP(smtp_server, smtp_port, timeout=20) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(sender, password)
                    server.send_message(msg)
                status_val = "sent"
            except Exception as e:
                err_msg = str(e)
                status_val = "failed"

        try:
            db = SessionLocal()
            log = EmailLog(
                timestamp=datetime.now().astimezone(),
                recipient=email,
                subject=subject,
                status=status_val,
                error_message=err_msg,
            )
            db.add(log)
            db.commit()
            db.close()
        except Exception as db_err:
            print(f"[EMAIL SERVICE] Error logging contractor welcome email: {db_err}")

    import threading
    t = threading.Thread(target=_send, daemon=True)
    t.start()


@app.post("/admin/add-contractor")
def add_contractor_account(
    payload: ContractorCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin endpoint to directly provision a contractor account:
    - Creates user with role: contractor in SQLite users table.
    - Rejects if email already registered with HTTP 400: 'This email is already registered'.
    - Returns success message, new contractor ID and email.
    - Sends welcome email asynchronously.
    """
    clean_email = payload.email.strip().lower()

    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email is already registered",
        )

    hashed_pwd = hash_password(payload.password)
    new_contractor = User(
        email=clean_email,
        password_hash=hashed_pwd,
        full_name=payload.full_name.strip(),
        role=UserRole.CONTRACTOR,
        is_active=True,
        is_approved=True,     # Admin-created contractors are pre-approved
        otp_verified=False,
        created_at=datetime.now().astimezone(),
    )
    db.add(new_contractor)
    db.commit()
    db.refresh(new_contractor)
    sync_contractor_emails_to_env(db)

    # Send welcome email asynchronously
    _send_welcome_contractor_email_async(
        email=clean_email,
        full_name=new_contractor.full_name,
        plain_password=payload.password,
    )

    return {
        "message": "Contractor added successfully",
        "id": new_contractor.id,
        "email": new_contractor.email,
    }


@app.get("/admin/contractors")
def get_all_contractors(
    location: Optional[str] = Query(None, description="Optional ticket location to identify matching area contractor"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin endpoint returning all contractors with id, full_name, email, created_at, is_active, is_approved, analysis_count.
    If location is supplied, analyzes and scores contractor geographic proximity (Area match, City match, State match)
    and sorts area-matched contractors to the top for seamless ticket assignment.
    """
    contractors = (
        db.query(User)
        .filter(User.role == UserRole.CONTRACTOR)
        .order_by(User.created_at.desc())
        .all()
    )
    results = []
    norm_loc = normalize_location_text(location) if location else ""

    for c in contractors:
        analysis_count = db.query(Analysis).filter(Analysis.user_id == c.id).count()
        created_str = (
            c.created_at.isoformat()
            if c.created_at
            else datetime.now().astimezone().isoformat()
        )

        is_area_match = False
        is_city_match = False
        is_state_match = False
        match_tier = 4
        match_label = None

        if norm_loc:
            if c.service_area and token_matches_location(c.service_area, norm_loc):
                is_area_match = True
                match_tier = 1
                match_label = f"Area Match ({c.service_area})"
            elif c.service_city and token_matches_location(c.service_city, norm_loc):
                is_city_match = True
                match_tier = 2
                match_label = f"City Match ({c.service_city})"
            elif c.service_state and token_matches_location(c.service_state, norm_loc):
                is_state_match = True
                match_tier = 3
                match_label = f"State Match ({c.service_state})"

        results.append({
            "id": c.id,
            "full_name": c.full_name,
            "email": c.email,
            "created_at": created_str,
            "is_active": c.is_active,
            "is_approved": c.is_approved,
            "analysis_count": analysis_count,
            "service_state": c.service_state,
            "service_city": c.service_city,
            "service_area": c.service_area,
            "is_area_match": is_area_match,
            "is_city_match": is_city_match,
            "is_state_match": is_state_match,
            "match_tier": match_tier,
            "match_label": match_label,
        })

    if norm_loc:
        results.sort(key=lambda x: (
            0 if (x["is_approved"] and x["is_active"]) else (1 if x["is_active"] else 2),
            x["match_tier"],
            (x["full_name"] or "").lower(),
        ))

    return results


# =============================================================================
# FEATURE 7: ROAD MAINTENANCE MANAGEMENT SYSTEM
# =============================================================================

# --- 7.0: Overdue Warning Email Trigger Helper ---
def _check_and_notify_overdue_tickets(db: Session):
    """
    Checks for overdue tickets (deadline passed, status Assigned or In Progress)
    and sends a one-time overdue warning email to the assigned contractor.
    """
    now = datetime.now().astimezone()
    overdue_tickets = (
        db.query(MaintenanceTicket)
        .filter(
            MaintenanceTicket.deadline.isnot(None),
            MaintenanceTicket.deadline < now,
            MaintenanceTicket.status.in_([TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS]),
            MaintenanceTicket.is_overdue_notified == False,
        )
        .all()
    )

    for t in overdue_tickets:
        if t.assigned_contractor and t.assigned_contractor.email:
            dl_tz = t.deadline if t.deadline.tzinfo else t.deadline.astimezone()
            days_overdue = max(1, int((now - dl_tz).total_seconds() / 86400))
            deadline_str = dl_tz.strftime("%Y-%m-%d %H:%M")
            send_overdue_warning_email(
                contractor_email=t.assigned_contractor.email,
                contractor_name=t.assigned_contractor.full_name or "Contractor",
                ticket_id=t.ticket_id,
                title=t.title,
                original_deadline=deadline_str,
                days_overdue=days_overdue,
                db_session_factory=SessionLocal,
            )
        t.is_overdue_notified = True

    if overdue_tickets:
        db.commit()


# --- 7.1: List / Filter Tickets ---
@app.get("/tickets", response_model=List[TicketResponse])
def list_tickets(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    location: Optional[str] = Query(None, description="Filter by location keyword"),
    date_from: Optional[str] = Query(None, description="Filter created >= date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter created <= date (YYYY-MM-DD)"),
    contractor_id: Optional[int] = Query(None, description="Filter by assigned contractor ID"),
    overdue_only: Optional[bool] = Query(False, description="Filter only overdue tickets"),
    assigned_to_me: Optional[bool] = Query(None, description="Show only tickets assigned to current user"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List maintenance tickets with role-based filtering:
    - Admin: all tickets with full details
    - Contractor: only tickets assigned to them
    - User: only tickets created from their analyses
    Also automatically checks and dispatches overdue warning emails once per overdue ticket.
    """
    # Trigger overdue notifications check on tickets list access
    try:
        _check_and_notify_overdue_tickets(db)
    except Exception as e:
        logger.error(f"Error checking overdue notifications: {e}")

    query = db.query(MaintenanceTicket).order_by(MaintenanceTicket.created_at.desc())

    # Role-based access filtering
    if current_user.role == UserRole.USER:
        user_analysis_ids = [a.id for a in db.query(Analysis.id).filter(Analysis.user_id == current_user.id).all()]
        query = query.filter(MaintenanceTicket.analysis_id.in_(user_analysis_ids))
    elif current_user.role == UserRole.CONTRACTOR:
        query = query.filter(MaintenanceTicket.assigned_contractor_id == current_user.id)
    # Admin sees all

    # Optional query filters
    if status_filter:
        query = query.filter(MaintenanceTicket.status == status_filter)
    if priority:
        query = query.filter(MaintenanceTicket.priority == priority)
    if location:
        query = query.filter(MaintenanceTicket.location_name.ilike(f"%{location.strip()}%"))
    if contractor_id:
        query = query.filter(MaintenanceTicket.assigned_contractor_id == contractor_id)
    if date_from:
        try:
            df = datetime.fromisoformat(date_from)
            query = query.filter(MaintenanceTicket.created_at >= df)
        except Exception:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            query = query.filter(MaintenanceTicket.created_at <= dt)
        except Exception:
            pass
    if overdue_only:
        now = datetime.now().astimezone()
        query = query.filter(
            MaintenanceTicket.deadline.isnot(None),
            MaintenanceTicket.deadline < now,
            MaintenanceTicket.status != TicketStatus.RESOLVED,
        )

    tickets = query.offset(offset).limit(limit).all()
    return [t.to_dict() for t in tickets]


def _lookup_ticket(ticket_id: str, db: Session) -> Optional[MaintenanceTicket]:
    """
    Robust lookup for MaintenanceTicket by string ticket_id (with or without dashes/spaces)
    or database integer ID.
    """
    clean_id = str(ticket_id).strip()
    alt_id = clean_id.replace(" ", "-")
    alt_id_rev = clean_id.replace("-", " ")
    ticket = db.query(MaintenanceTicket).filter(
        (MaintenanceTicket.ticket_id == clean_id) |
        (MaintenanceTicket.ticket_id == alt_id) |
        (MaintenanceTicket.ticket_id == alt_id_rev)
    ).first()
    if not ticket:
        try:
            tid = int(clean_id)
            ticket = db.query(MaintenanceTicket).filter(MaintenanceTicket.id == tid).first()
        except (ValueError, TypeError):
            pass
    return ticket


# --- 7.2: Get Single Ticket Detail ---
@app.get("/tickets/{ticket_id}")
def get_ticket_detail(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get detailed ticket information including analysis data, status history,
    repair submissions, before image, and after image.
    ticket_id can be string (RH-2026-0001) or integer database ID.
    """
    ticket = _lookup_ticket(ticket_id, db)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found.")

    # Access control
    if current_user.role == UserRole.USER:
        analysis = db.query(Analysis).filter(Analysis.id == ticket.analysis_id).first()
        if analysis and analysis.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="You do not have permission to view this ticket.")
    elif current_user.role == UserRole.CONTRACTOR:
        if ticket.assigned_contractor_id != current_user.id:
            raise HTTPException(status_code=403, detail="You do not have permission to view this ticket.")

    ticket_dict = ticket.to_dict()
    if not ticket_dict.get("suggested_contractor_id") and ticket.location_name:
        matched = find_contractor_for_location(db, ticket.location_name)
        if matched:
            ticket_dict["suggested_contractor_id"] = matched.id
            ticket_dict["suggested_contractor_name"] = matched.full_name
            ticket_dict["suggested_contractor_email"] = matched.email
            ticket_dict["suggested_contractor_area"] = matched.service_area
            ticket_dict["suggested_contractor_city"] = matched.service_city

    history = [h.to_dict() for h in ticket.status_history]
    submissions = [s.to_dict() for s in ticket.repair_submissions]

    analysis_data = None
    before_image_url = None
    if ticket.analysis:
        analysis_data = _format_analysis_response(ticket.analysis, include_user_info=(current_user.role == UserRole.ADMIN))
        before_image_url = ticket.analysis.annotated_image_path or ticket.analysis.original_image_path

    after_image_url = None
    if submissions:
        after_image_url = submissions[0].get("after_image_path")

    return {
        "ticket": ticket_dict,
        "status_history": history,
        "repair_submissions": submissions,
        "analysis": analysis_data,
        "before_image_url": before_image_url,
        "after_image_url": after_image_url,
    }


# --- 7.3: Verify Ticket (Admin only) ---
@app.post("/tickets/{ticket_id}/verify")
def verify_ticket(
    ticket_id: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin verifies a ticket:
    - Changes status Reported -> Verified
    - Adds TicketStatusHistory entry
    - Returns updated ticket
    """
    ticket = _lookup_ticket(ticket_id, db)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found.")

    old_status = ticket.status
    ticket.status = TicketStatus.VERIFIED
    ticket.updated_at = datetime.now().astimezone()

    history = TicketStatusHistory(
        ticket_id=ticket.id,
        changed_by=admin.id,
        changed_at=datetime.now().astimezone(),
        old_status=old_status,
        new_status=TicketStatus.VERIFIED,
        notes="Ticket verified by administrator",
    )
    db.add(history)
    db.commit()
    db.refresh(ticket)

    return ticket.to_dict()


# --- 7.4: Assign Ticket to Contractor (Admin only) ---
@app.post("/tickets/{ticket_id}/assign")
def assign_ticket(
    ticket_id: str,
    payload: TicketAssignRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin assigns ticket to contractor:
    - Changes status Verified -> Assigned (or Reported -> Assigned)
    - Sets assigned_contractor_id, deadline, road_importance
    - Adds TicketStatusHistory entry
    - Sends email to assigned contractor
    - Returns updated ticket
    """
    ticket = _lookup_ticket(ticket_id, db)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found.")

    contractor = db.query(User).filter(User.id == payload.contractor_id, User.role == UserRole.CONTRACTOR).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found or user is not a contractor.")

    old_status = ticket.status
    ticket.assigned_contractor_id = contractor.id
    ticket.status = TicketStatus.ASSIGNED
    ticket.updated_at = datetime.now().astimezone()

    if payload.road_importance:
        ticket.road_importance = payload.road_importance

    # Set deadline
    deadline_val = None
    if payload.deadline:
        try:
            clean_dl = payload.deadline.strip()
            if len(clean_dl) == 10 and "-" in clean_dl:
                deadline_val = datetime.strptime(clean_dl, "%Y-%m-%d").astimezone()
            else:
                deadline_val = datetime.fromisoformat(clean_dl.replace("Z", "+00:00"))
            ticket.deadline = deadline_val
        except Exception as de:
            logging.warning(f"Failed to parse deadline '{payload.deadline}': {de}")
    elif payload.deadline_days:
        deadline_val = datetime.now().astimezone() + timedelta(days=payload.deadline_days)
        ticket.deadline = deadline_val

    # Reset overdue notification flag for new assignment
    ticket.is_overdue_notified = False

    history = TicketStatusHistory(
        ticket_id=ticket.id,
        changed_by=admin.id,
        changed_at=datetime.now().astimezone(),
        old_status=old_status,
        new_status=TicketStatus.ASSIGNED,
        notes=payload.notes or f"Assigned to {contractor.full_name} ({contractor.email})"
              + (f", deadline: {ticket.deadline.strftime('%Y-%m-%d')}" if ticket.deadline else ""),
    )
    db.add(history)
    db.commit()
    db.refresh(ticket)

    deadline_str = ticket.deadline.strftime("%d %b %Y, %I:%M %p") if ticket.deadline else "Not specified"

    # 1. Send contractor work order email
    try:
        send_ticket_assigned_email(
            contractor_email=contractor.email,
            contractor_name=contractor.full_name or "Contractor",
            ticket_id=ticket.ticket_id,
            title=ticket.title,
            priority=ticket.priority,
            deadline=deadline_str,
            location=ticket.location_name or "Unknown Location",
            road_importance=ticket.road_importance or "Standard Road",
            notes=payload.notes or "",
            analysis_id=ticket.analysis_id,
            db_session_factory=SessionLocal,
        )
    except Exception as e:
        logging.error(f"Failed to trigger contractor ticket assignment email: {e}")

    # 2. Send reporting citizen email update
    try:
        reporter_email = None
        reporter_name = "Citizen"
        if ticket.analysis and ticket.analysis.user:
            reporter_email = ticket.analysis.user.email
            reporter_name = ticket.analysis.user.full_name or "Citizen"

        if reporter_email and reporter_email != contractor.email:
            send_ticket_assigned_user_email(
                user_email=reporter_email,
                user_name=reporter_name,
                ticket_id=ticket.ticket_id,
                title=ticket.title,
                contractor_name=contractor.full_name or "Contractor",
                contractor_area=contractor.service_area or contractor.service_city or "Assigned Contractor",
                deadline=deadline_str,
                location=ticket.location_name or "Unknown Location",
                db_session_factory=SessionLocal,
            )
    except Exception as ue:
        logging.error(f"Failed to trigger user ticket assignment email: {ue}")

    return ticket.to_dict()


# --- 7.5: Contractor Starts Work ---
@app.post("/tickets/{ticket_id}/start")
def start_ticket_work(
    ticket_id: str,
    payload: Optional[TicketStatusUpdate] = None,
    current_user: User = Depends(get_current_contractor_or_admin),
    db: Session = Depends(get_db),
):
    """
    Contractor confirms starting work:
    - Changes status Assigned -> In Progress
    - Adds TicketStatusHistory entry
    """
    ticket = _lookup_ticket(ticket_id, db)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found.")

    if current_user.role == UserRole.CONTRACTOR and ticket.assigned_contractor_id != current_user.id:
        raise HTTPException(status_code=403, detail="This ticket is not assigned to you.")

    if ticket.status not in [TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS]:
        raise HTTPException(status_code=400, detail=f"Cannot start work on ticket with status '{ticket.status}'.")

    old_status = ticket.status
    ticket.status = TicketStatus.IN_PROGRESS
    ticket.updated_at = datetime.now().astimezone()

    note_text = payload.notes or payload.comment if payload else "Contractor commenced repair work on site"
    history = TicketStatusHistory(
        ticket_id=ticket.id,
        changed_by=current_user.id,
        changed_at=datetime.now().astimezone(),
        old_status=old_status,
        new_status=TicketStatus.IN_PROGRESS,
        notes=note_text or "Work started",
    )
    db.add(history)
    db.commit()
    db.refresh(ticket)

    return ticket.to_dict()


# --- 7.6: Reopen Ticket (Admin only) ---
@app.post("/tickets/{ticket_id}/reopen")
def reopen_ticket(
    ticket_id: str,
    payload: Optional[TicketReopenRequest] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin reopens a rejected ticket:
    - Changes status Rejected -> Reported
    - Body: {notes}
    - Adds TicketStatusHistory entry
    """
    ticket = _lookup_ticket(ticket_id, db)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found.")

    old_status = ticket.status
    ticket.status = TicketStatus.REPORTED
    ticket.updated_at = datetime.now().astimezone()

    note_text = payload.notes if payload and payload.notes else "Ticket reopened by administrator"
    history = TicketStatusHistory(
        ticket_id=ticket.id,
        changed_by=admin.id,
        changed_at=datetime.now().astimezone(),
        old_status=old_status,
        new_status=TicketStatus.REPORTED,
        notes=note_text,
    )
    db.add(history)
    db.commit()
    db.refresh(ticket)

    return ticket.to_dict()


# --- 7.7: Submit Repair (Contractor only) ---
@app.post("/tickets/{ticket_id}/submit-repair")
async def submit_repair(
    ticket_id: str,
    notes: Optional[str] = Form(None),
    after_image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_contractor_or_admin),
    db: Session = Depends(get_db),
):
    """
    Contractor submits repair proof:
    - Contractor uploads after-repair photo + notes
    - Validates: contractor must be assigned to this ticket
    - Validates: status must be In Progress or Assigned
    - Saves image to backend/static/repairs/{ticket_id}_after.jpg
    - Creates RepairSubmission record with status='Pending'
    - Changes ticket status: In Progress -> Repair Submitted
    - Adds TicketStatusHistory entry
    - Sends email to admin
    """
    ticket = _lookup_ticket(ticket_id, db)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found.")

    if current_user.role == UserRole.CONTRACTOR and ticket.assigned_contractor_id != current_user.id:
        raise HTTPException(status_code=403, detail="This ticket is not assigned to you.")

    if ticket.status not in [TicketStatus.IN_PROGRESS, TicketStatus.ASSIGNED]:
        raise HTTPException(status_code=400, detail=f"Cannot submit repair for ticket with status '{ticket.status}'.")

    # Save after image to backend/static/repairs/{ticket_id}_after.jpg
    REPAIR_DIR = STATIC_DIR / "repairs"
    REPAIR_DIR.mkdir(parents=True, exist_ok=True)

    after_path = None
    if after_image and after_image.filename:
        ext = Path(after_image.filename).suffix.lower() or ".jpg"
        clean_tid = ticket.ticket_id.replace("/", "_").replace("\\", "_")
        after_filename = f"{clean_tid}_after{ext}"
        after_save = REPAIR_DIR / after_filename
        with open(after_save, "wb") as buf:
            shutil.copyfileobj(after_image.file, buf)
        after_path = f"static/repairs/{after_filename}"

    submission = RepairSubmission(
        ticket_id=ticket.id,
        submitted_by=current_user.id,
        submitted_at=datetime.now().astimezone(),
        after_image_path=after_path,
        notes=notes,
        status=RepairStatus.PENDING,
    )
    db.add(submission)

    old_status = ticket.status
    ticket.status = TicketStatus.REPAIR_SUBMITTED
    ticket.updated_at = datetime.now().astimezone()

    history = TicketStatusHistory(
        ticket_id=ticket.id,
        changed_by=current_user.id,
        changed_at=datetime.now().astimezone(),
        old_status=old_status,
        new_status=TicketStatus.REPAIR_SUBMITTED,
        notes=f"Repair submitted by contractor {current_user.full_name}: {notes or 'No notes provided'}",
    )
    db.add(history)
    db.commit()
    db.refresh(submission)
    db.refresh(ticket)

    # Send email to admin
    try:
        before_path = ticket.analysis.annotated_image_path if ticket.analysis else None
        send_repair_submitted_admin_email(
            ticket_id=ticket.ticket_id,
            title=ticket.title,
            contractor_name=current_user.full_name or "Contractor",
            contractor_notes=notes or "No notes",
            before_image_path=before_path,
            after_image_path=after_path,
            db_session_factory=SessionLocal,
        )
    except Exception as e:
        logger.error(f"Failed to notify admin of repair submission: {e}")

    return {
        "status": "Repair Submitted",
        "ticket": ticket.to_dict(),
        "submission": submission.to_dict(),
    }


# --- 7.8: Approve Repair (Admin only) ---
@app.post("/tickets/{ticket_id}/approve-repair")
def approve_repair(
    ticket_id: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin approves repair:
    - Validates: RepairSubmission exists with status="Pending"
    - Changes RepairSubmission status -> Approved
    - Changes ticket status -> Resolved
    - Sets reviewed_by, reviewed_at
    - Adds TicketStatusHistory entry
    - Sends email to contractor
    - Sends email to original reporting user
    - Returns updated ticket
    """
    ticket = _lookup_ticket(ticket_id, db)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found.")

    latest_submission = (
        db.query(RepairSubmission)
        .filter(RepairSubmission.ticket_id == ticket.id, RepairSubmission.status == RepairStatus.PENDING)
        .order_by(RepairSubmission.submitted_at.desc())
        .first()
    )

    if not latest_submission:
        raise HTTPException(status_code=400, detail="No pending repair submission found for this ticket.")

    now = datetime.now().astimezone()
    latest_submission.status = RepairStatus.APPROVED
    latest_submission.reviewed_by = admin.id
    latest_submission.reviewed_at = now

    old_status = ticket.status
    ticket.status = TicketStatus.RESOLVED
    ticket.updated_at = now

    history = TicketStatusHistory(
        ticket_id=ticket.id,
        changed_by=admin.id,
        changed_at=now,
        old_status=old_status,
        new_status=TicketStatus.RESOLVED,
        notes="Repair approved and verified by administrator",
    )
    db.add(history)
    db.commit()
    db.refresh(ticket)

    # 1. Email to contractor
    try:
        if ticket.assigned_contractor and ticket.assigned_contractor.email:
            send_repair_approved_contractor_email(
                contractor_email=ticket.assigned_contractor.email,
                contractor_name=ticket.assigned_contractor.full_name or "Contractor",
                ticket_id=ticket.ticket_id,
                title=ticket.title,
                db_session_factory=SessionLocal,
            )
    except Exception as e:
        logger.error(f"Failed to send repair approval email to contractor: {e}")

    # 2. Email to original user who reported it
    try:
        if ticket.analysis and ticket.analysis.user and ticket.analysis.user.email:
            send_repair_approved_user_email(
                user_email=ticket.analysis.user.email,
                user_name=ticket.analysis.user.full_name or "Citizen Reporter",
                ticket_id=ticket.ticket_id,
                title=ticket.title,
                location=ticket.location_name or "Reported location",
                db_session_factory=SessionLocal,
            )
    except Exception as e:
        logger.error(f"Failed to send repair completion email to reporting user: {e}")

    return ticket.to_dict()


# --- 7.9: Reject Repair (Admin only) ---
@app.post("/tickets/{ticket_id}/reject-repair")
def reject_repair(
    ticket_id: str,
    payload: RepairRejectRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin rejects repair:
    - Body: {rejection_reason}
    - Changes RepairSubmission status -> Rejected
    - Changes ticket status -> In Progress (contractor must resubmit)
    - Sets rejection_reason, reviewed_by, reviewed_at
    - Adds TicketStatusHistory entry
    - Sends email to contractor with instructions to resubmit
    """
    ticket = _lookup_ticket(ticket_id, db)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found.")

    latest_submission = (
        db.query(RepairSubmission)
        .filter(RepairSubmission.ticket_id == ticket.id, RepairSubmission.status == RepairStatus.PENDING)
        .order_by(RepairSubmission.submitted_at.desc())
        .first()
    )

    if not latest_submission:
        raise HTTPException(status_code=400, detail="No pending repair submission found for this ticket.")

    now = datetime.now().astimezone()
    latest_submission.status = RepairStatus.REJECTED
    latest_submission.rejection_reason = payload.rejection_reason
    latest_submission.reviewed_by = admin.id
    latest_submission.reviewed_at = now

    old_status = ticket.status
    ticket.status = TicketStatus.IN_PROGRESS
    ticket.updated_at = now

    history = TicketStatusHistory(
        ticket_id=ticket.id,
        changed_by=admin.id,
        changed_at=now,
        old_status=old_status,
        new_status=TicketStatus.IN_PROGRESS,
        notes=f"Repair rejected: {payload.rejection_reason}",
    )
    db.add(history)
    db.commit()
    db.refresh(ticket)

    # Email to contractor
    try:
        if ticket.assigned_contractor and ticket.assigned_contractor.email:
            send_repair_rejected_contractor_email(
                contractor_email=ticket.assigned_contractor.email,
                contractor_name=ticket.assigned_contractor.full_name or "Contractor",
                ticket_id=ticket.ticket_id,
                title=ticket.title,
                rejection_reason=payload.rejection_reason,
                db_session_factory=SessionLocal,
            )
    except Exception as e:
        logger.error(f"Failed to send repair rejection email to contractor: {e}")

    return ticket.to_dict()


# --- 7.10: Merge Duplicate Tickets (Admin only) ---
@app.post("/tickets/{ticket_id}/merge")
def merge_ticket_into(
    ticket_id: str,
    payload: TicketMergeRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin merges a ticket into a target duplicate ticket:
    - Marks current ticket as duplicate_of target ticket
    - Changes status to Rejected with note 'Merged into {target_id}'
    - Adds TicketStatusHistory entry
    """
    source = db.query(MaintenanceTicket).filter(MaintenanceTicket.ticket_id == ticket_id).first()
    if not source:
        try:
            tid = int(ticket_id)
            source = db.query(MaintenanceTicket).filter(MaintenanceTicket.id == tid).first()
        except (ValueError, TypeError):
            pass

    if not source:
        raise HTTPException(status_code=404, detail=f"Source ticket '{ticket_id}' not found.")

    target_id_str = payload.merge_into_ticket_id or payload.target_ticket_id
    if not target_id_str:
        raise HTTPException(status_code=400, detail="Target ticket ID must be provided.")

    target = db.query(MaintenanceTicket).filter(MaintenanceTicket.ticket_id == target_id_str).first()
    if not target:
        try:
            tid = int(target_id_str)
            target = db.query(MaintenanceTicket).filter(MaintenanceTicket.id == tid).first()
        except (ValueError, TypeError):
            pass

    if not target:
        raise HTTPException(status_code=404, detail=f"Target ticket '{target_id_str}' not found.")

    if source.id == target.id:
        raise HTTPException(status_code=400, detail="Cannot merge a ticket into itself.")

    old_status = source.status
    source.status = TicketStatus.REJECTED
    source.duplicate_of = target.id
    source.updated_at = datetime.now().astimezone()

    reason_text = f"Merged into {target.ticket_id}" + (f". Reason: {payload.reason}" if payload.reason else "")
    history = TicketStatusHistory(
        ticket_id=source.id,
        changed_by=admin.id,
        changed_at=datetime.now().astimezone(),
        old_status=old_status,
        new_status=TicketStatus.REJECTED,
        notes=reason_text,
    )
    db.add(history)
    db.commit()
    db.refresh(source)

    return source.to_dict()


@app.post("/tickets/merge")
def merge_tickets_general(
    payload: TicketMergeRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """General merge endpoint alias accepting source and target in body."""
    source_id_str = payload.source_ticket_id
    target_id_str = payload.merge_into_ticket_id or payload.target_ticket_id
    if not source_id_str or not target_id_str:
        raise HTTPException(status_code=400, detail="Both source_ticket_id and target_ticket_id must be provided.")

    return merge_ticket_into(source_id_str, payload, admin, db)


# --- 7.11: Overdue Tickets (Admin only) ---
@app.get("/admin/tickets/overdue")
@app.get("/maintenance/overdue")
def get_overdue_tickets_admin(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Returns all overdue tickets with contractor info and days overdue.
    """
    now = datetime.now().astimezone()
    overdue = (
        db.query(MaintenanceTicket)
        .filter(
            MaintenanceTicket.deadline.isnot(None),
            MaintenanceTicket.deadline < now,
            MaintenanceTicket.status.notin_([TicketStatus.RESOLVED, TicketStatus.REJECTED]),
        )
        .order_by(MaintenanceTicket.deadline.asc())
        .all()
    )

    results = []
    for t in overdue:
        td = t.to_dict()
        dl = t.deadline if t.deadline.tzinfo else t.deadline.astimezone()
        days_od = max(1, int((now - dl).total_seconds() / 86400))
        td["days_overdue"] = days_od
        results.append(td)

    return results


# --- 7.12: Management Dashboard Summary (Admin only) ---
@app.get("/admin/tickets/summary", response_model=MaintenanceSummaryResponse)
@app.get("/maintenance/summary", response_model=MaintenanceSummaryResponse)
def get_admin_ticket_summary(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin Ticket Management Summary:
    - total_tickets, open_tickets, resolved_tickets, overdue_tickets, high_priority_tickets
    - tickets_by_status
    - tickets_by_priority
    - tickets_created_vs_resolved (last 30 days daily counts)
    - top_locations (top 5 locations by ticket count)
    - avg_resolution_time_hours
    """
    now = datetime.now().astimezone()

    total = db.query(MaintenanceTicket).count()
    resolved = db.query(MaintenanceTicket).filter(MaintenanceTicket.status == TicketStatus.RESOLVED).count()
    rejected = db.query(MaintenanceTicket).filter(MaintenanceTicket.status == TicketStatus.REJECTED).count()
    open_tickets = total - resolved - rejected

    overdue = (
        db.query(MaintenanceTicket)
        .filter(
            MaintenanceTicket.deadline.isnot(None),
            MaintenanceTicket.deadline < now,
            MaintenanceTicket.status.notin_([TicketStatus.RESOLVED, TicketStatus.REJECTED]),
        )
        .count()
    )

    high_priority = (
        db.query(MaintenanceTicket)
        .filter(MaintenanceTicket.priority.in_([TicketPriority.CRITICAL, TicketPriority.HIGH]))
        .count()
    )

    by_status = {s: 0 for s in TicketStatus.ALL}
    for st, count in db.query(MaintenanceTicket.status, func.count(MaintenanceTicket.id)).group_by(MaintenanceTicket.status).all():
        by_status[st] = count

    by_priority = {p: 0 for p in TicketPriority.ALL}
    for pr, count in db.query(MaintenanceTicket.priority, func.count(MaintenanceTicket.id)).group_by(MaintenanceTicket.priority).all():
        by_priority[pr] = count

    # Trend: last 30 days created vs resolved
    trend = []
    for d in range(29, -1, -1):
        day_date = (now - timedelta(days=d)).date()
        day_start = datetime.combine(day_date, datetime.min.time()).astimezone()
        day_end = datetime.combine(day_date, datetime.max.time()).astimezone()

        created_cnt = (
            db.query(MaintenanceTicket)
            .filter(MaintenanceTicket.created_at >= day_start, MaintenanceTicket.created_at <= day_end)
            .count()
        )
        resolved_cnt = (
            db.query(MaintenanceTicket)
            .filter(
                MaintenanceTicket.status == TicketStatus.RESOLVED,
                MaintenanceTicket.updated_at >= day_start,
                MaintenanceTicket.updated_at <= day_end,
            )
            .count()
        )
        trend.append({
            "date": day_date.strftime("%b %d"),
            "created": created_cnt,
            "resolved": resolved_cnt,
        })

    # Top 5 locations
    top_locs_query = (
        db.query(MaintenanceTicket.location_name, func.count(MaintenanceTicket.id))
        .filter(MaintenanceTicket.location_name.isnot(None), MaintenanceTicket.location_name != "")
        .group_by(MaintenanceTicket.location_name)
        .order_by(func.count(MaintenanceTicket.id).desc())
        .limit(5)
        .all()
    )
    top_locations = [{"location": loc or "Unknown", "count": cnt} for loc, cnt in top_locs_query]

    # Average resolution time in hours
    resolved_tickets = (
        db.query(MaintenanceTicket)
        .filter(MaintenanceTicket.status == TicketStatus.RESOLVED)
        .all()
    )
    avg_hours = None
    if resolved_tickets:
        total_seconds = 0.0
        valid_cnt = 0
        for t in resolved_tickets:
            if t.created_at and t.updated_at:
                c_tz = t.created_at if t.created_at.tzinfo else t.created_at.astimezone()
                u_tz = t.updated_at if t.updated_at.tzinfo else t.updated_at.astimezone()
                diff = (u_tz - c_tz).total_seconds()
                if diff >= 0:
                    total_seconds += diff
                    valid_cnt += 1
        if valid_cnt > 0:
            avg_hours = round(total_seconds / (valid_cnt * 3600.0), 1)

    return {
        "total_tickets": total,
        "open_tickets": open_tickets,
        "resolved_tickets": resolved,
        "overdue_tickets": overdue,
        "high_priority_tickets": high_priority,
        "tickets_by_status": by_status,
        "tickets_by_priority": by_priority,
        "tickets_created_vs_resolved": trend,
        "top_locations": top_locations,
        "avg_resolution_time_hours": avg_hours,
    }


# --- 7.13: Export Tickets CSV (Admin only) ---
@app.get("/admin/tickets/export-csv")
@app.get("/maintenance/export-csv")
def export_tickets_csv(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    contractor_id: Optional[int] = Query(None),
    overdue_only: Optional[bool] = Query(False),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Exports maintenance tickets as a CSV file:
    Columns: ticket_id, title, status, priority, location, score, severity,
             created_at, deadline, assigned_contractor, resolved_at, days_to_resolve
    """
    query = db.query(MaintenanceTicket).order_by(MaintenanceTicket.created_at.desc())

    if status_filter:
        query = query.filter(MaintenanceTicket.status == status_filter)
    if priority:
        query = query.filter(MaintenanceTicket.priority == priority)
    if location:
        query = query.filter(MaintenanceTicket.location_name.ilike(f"%{location.strip()}%"))
    if contractor_id:
        query = query.filter(MaintenanceTicket.assigned_contractor_id == contractor_id)
    if date_from:
        try:
            df = datetime.fromisoformat(date_from)
            query = query.filter(MaintenanceTicket.created_at >= df)
        except Exception:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            query = query.filter(MaintenanceTicket.created_at <= dt)
        except Exception:
            pass
    if overdue_only:
        now = datetime.now().astimezone()
        query = query.filter(
            MaintenanceTicket.deadline.isnot(None),
            MaintenanceTicket.deadline < now,
            MaintenanceTicket.status != TicketStatus.RESOLVED,
        )

    tickets = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ticket_id", "title", "status", "priority", "location", "score", "severity",
        "created_at", "deadline", "assigned_contractor", "resolved_at", "days_to_resolve",
    ])

    for t in tickets:
        contractor_name = t.assigned_contractor.full_name if t.assigned_contractor else ""
        deadline_str = t.deadline.strftime("%Y-%m-%d %H:%M") if t.deadline else ""
        created_str = t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else ""

        resolved_at_str = ""
        days_to_resolve = ""
        if t.status == TicketStatus.RESOLVED and t.updated_at:
            resolved_at_str = t.updated_at.strftime("%Y-%m-%d %H:%M")
            if t.created_at:
                c_tz = t.created_at if t.created_at.tzinfo else t.created_at.astimezone()
                u_tz = t.updated_at if t.updated_at.tzinfo else t.updated_at.astimezone()
                diff_days = round((u_tz - c_tz).total_seconds() / 86400.0, 1)
                days_to_resolve = str(diff_days)

        writer.writerow([
            t.ticket_id,
            t.title,
            t.status,
            t.priority,
            t.location_name or "",
            t.road_health_score if t.road_health_score is not None else "",
            t.severity or "",
            created_str,
            deadline_str,
            contractor_name,
            resolved_at_str,
            days_to_resolve,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="tickets_export.csv"'},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
