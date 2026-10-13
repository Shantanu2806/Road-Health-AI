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
import uuid
import shutil
import random
import string
from pathlib import Path
from typing import List, Optional, Dict, Any
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
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func

# Load environment configuration
load_dotenv()

# Local application modules
from database import engine, Base, get_db, SessionLocal
from models import Analysis, User, EmailLog, UserRole, run_db_migrations
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
)
from scoring import assess_road_health
from visualizer import annotate_image
from inference_stub import run_inference
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
    }

    if include_user_info:
        resp["user_name"] = item.user.full_name if item.user else "Anonymous User"
        resp["user_email"] = item.user.email if item.user else "N/A"

    return resp


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

    # 8. Dispatch Async Email Alert if Damage Detected (Poor, Critical, or Fair with defects)
    trigger_email_alert_async(
        analysis_data=response_dict,
        annotated_image_path=str(annot_save_path),
        db_session_factory=SessionLocal,
    )

    # 9. Dispatch Async User Confirmation Email for this inspection
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
        contractors_data.append(c_dict)

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
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin endpoint returning all contractors with id, full_name, email, created_at, is_active, analysis_count.
    """
    contractors = (
        db.query(User)
        .filter(User.role == UserRole.CONTRACTOR)
        .order_by(User.created_at.desc())
        .all()
    )
    results = []
    for c in contractors:
        analysis_count = db.query(Analysis).filter(Analysis.user_id == c.id).count()
        created_str = (
            c.created_at.isoformat()
            if c.created_at
            else datetime.now().astimezone().isoformat()
        )
        results.append({
            "id": c.id,
            "full_name": c.full_name,
            "email": c.email,
            "created_at": created_str,
            "is_active": c.is_active,
            "analysis_count": analysis_count,
            "service_state": c.service_state,
            "service_city": c.service_city,
            "service_area": c.service_area,
        })
    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
