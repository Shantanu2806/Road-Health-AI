"""
email_service.py - Automated Damage Alert Email Service for Road Health AI
Sends alert notifications to contractor when Road Health Score <= 60 (Poor or Critical).

To enable emails: Go to myaccount.google.com → Security → 2-Step Verification → App passwords → Generate one for 'Mail' → paste it in .env as EMAIL_PASSWORD
"""

import os
import re
import difflib
import smtplib
import threading
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List

from dotenv import load_dotenv

# Load environment configuration
load_dotenv()

EMAIL_SENDER = os.getenv("EMAIL_SENDER", "kauteshantanu80@gmail.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
CONTRACTOR_EMAIL = os.getenv("CONTRACTOR_EMAIL", "aniketbedwal90@gmail.com")
EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "true").lower() in ("true", "1", "yes")
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))


def sync_contractor_emails_to_env(db_session=None) -> list:
    """
    Synchronizes all active, approved contractors' email addresses into backend/.env
    under CONTRACTOR_EMAIL so the environment file dynamically stays up to date.
    """
    close_db = False
    if db_session is None:
        try:
            from database import SessionLocal
            db = SessionLocal()
            close_db = True
        except Exception:
            return []
    else:
        db = db_session

    try:
        from models import User, UserRole
        active_contractors = (
            db.query(User)
            .filter(
                User.role == UserRole.CONTRACTOR,
                User.is_active == True,
                User.is_approved == True,
            )
            .order_by(User.id.asc())
            .all()
        )
        emails = [c.email.strip().lower() for c in active_contractors if c.email and c.email.strip()]
        unique_emails = list(dict.fromkeys(emails))
        email_str = ",".join(unique_emails) if unique_emails else "aniketbedwal90@gmail.com"

        # Update environment variable in memory
        os.environ["CONTRACTOR_EMAIL"] = email_str
        global CONTRACTOR_EMAIL
        CONTRACTOR_EMAIL = email_str

        # Update backend/.env file on disk
        env_path = Path(__file__).resolve().parent / ".env"
        if env_path.is_file():
            content = env_path.read_text(encoding="utf-8")
            import re
            if re.search(r"^CONTRACTOR_EMAIL=.*$", content, flags=re.MULTILINE):
                new_content = re.sub(
                    r"^CONTRACTOR_EMAIL=.*$",
                    f"CONTRACTOR_EMAIL={email_str}",
                    content,
                    flags=re.MULTILINE,
                )
            else:
                new_content = content + f"\nCONTRACTOR_EMAIL={email_str}\n"
            env_path.write_text(new_content, encoding="utf-8")
            print(f"[ENV SYNC] Updated CONTRACTOR_EMAIL in .env with: {email_str}")
        return unique_emails
    except Exception as e:
        print(f"[ENV SYNC] Failed to update CONTRACTOR_EMAIL in .env: {e}")
        return []
    finally:
        if close_db:
            db.close()


def _build_html_email_body(
    score: float,
    condition: str,
    severity: str,
    damage_index: float,
    coverage_pct: float,
    detections: list,
    location_name: Optional[str],
    lat: Optional[float],
    lng: Optional[float],
    timestamp: str,
    analysis_id: Optional[int],
) -> str:
    """Builds clean, responsive HTML email body."""
    badge_color = "#dc2626" if condition.lower() == "critical" else "#ea580c"

    # Location summary
    loc_display = "Not specified"
    if location_name:
        loc_display = location_name
        if lat is not None and lng is not None:
            loc_display += f" ({lat:.4f}, {lng:.4f})"
    elif lat is not None and lng is not None:
        loc_display = f"Coordinates: {lat:.4f}, {lng:.4f}"

    # Detections table rows
    detection_rows = ""
    if detections:
        for idx, d in enumerate(detections, 1):
            code = d.get("class_code", "Defect")
            name = d.get("class_name", code)
            conf = int(float(d.get("confidence", 0)) * 100)
            bbox = str(d.get("bbox", []))
            detection_rows += f"""
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
                <td style="padding: 8px 12px; color: #64748b;">#{idx}</td>
                <td style="padding: 8px 12px; font-weight: bold; color: #0f172a;">{code}</td>
                <td style="padding: 8px 12px; color: #334155;">{name}</td>
                <td style="padding: 8px 12px; color: #0284c7; font-weight: bold;">{conf}%</td>
                <td style="padding: 8px 12px; color: #64748b; font-family: monospace;">{bbox}</td>
            </tr>
            """
    else:
        detection_rows = "<tr><td colspan='5' style='padding: 12px; text-align: center; color: #64748b;'>No defects listed</td></tr>"

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Road Damage Alert</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #0f172a;">
        <div style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
            
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 24px; color: #ffffff; border-bottom: 4px solid {badge_color};">
                <div style="display: inline-block; padding: 4px 12px; background-color: {badge_color}; color: #ffffff; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                    URGENT INSPECTION ALERT
                </div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #f8fafc;">Road Damage Detected: {condition}</h1>
                <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">Automated AI Inspection Assessment #{analysis_id or 'N/A'}</p>
            </div>

            <!-- Score Summary Card -->
            <div style="padding: 24px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Overall Road Health Score</div>
                        <div style="font-size: 38px; font-weight: 900; color: {badge_color}; line-height: 1.1;">
                            {score:.1f} <span style="font-size: 16px; color: #64748b; font-weight: 600;">/ 100</span>
                        </div>
                        <div style="font-size: 13px; font-weight: 600; color: #334155; margin-top: 4px;">
                            Condition: <span style="color: {badge_color};">{condition}</span> • Severity: <span>{severity}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Key Metrics Grid -->
            <div style="padding: 20px 24px; border-bottom: 1px solid #e2e8f0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; width: 50%;">
                            <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Total Defects</span><br>
                            <strong style="font-size: 15px; color: #0f172a;">{len(detections)} defect(s)</strong>
                        </td>
                        <td style="padding: 8px 0; width: 50%;">
                            <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Surface Coverage</span><br>
                            <strong style="font-size: 15px; color: #0f172a;">{coverage_pct:.2f}%</strong>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; width: 50%;">
                            <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Damage Index</span><br>
                            <strong style="font-size: 15px; color: #0f172a;">{damage_index:.2f}</strong>
                        </td>
                        <td style="padding: 8px 0; width: 50%;">
                            <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Location</span><br>
                            <strong style="font-size: 13px; color: #0f172a;">{loc_display}</strong>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding: 8px 0;">
                            <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Inspection Time</span><br>
                            <span style="font-size: 13px; color: #334155;">{timestamp}</span>
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Detections Breakdown Table -->
            <div style="padding: 20px 24px; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #0f172a;">Detected Surface Defect Breakdown</h3>
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="background-color: #f1f5f9; font-size: 11px; text-transform: uppercase; color: #475569;">
                            <th style="padding: 6px 12px;">#</th>
                            <th style="padding: 6px 12px;">Code</th>
                            <th style="padding: 6px 12px;">Type</th>
                            <th style="padding: 6px 12px;">Confidence</th>
                            <th style="padding: 6px 12px;">BBox</th>
                        </tr>
                    </thead>
                    <tbody>
                        {detection_rows}
                    </tbody>
                </table>
            </div>

            <!-- Footer / Attachment note -->
            <div style="padding: 20px 24px; background-color: #f8fafc; font-size: 12px; color: #64748b; text-align: center;">
                <p style="margin: 0 0 6px;">
                    📎 <strong>Annotated image with AI detection boxes is attached to this email.</strong>
                </p>
                <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                    Automated Road Damage Assessment System • Generated by YOLOv8 Pipeline
                </p>
            </div>
        </div>
    </body>
    </html>
    """


TRANSLITERATIONS = {
    "स्वारगेट": "swargate",
    "कात्रज": "katraj",
    "शिवाजीनगर": "shivajinagar",
    "कोथरूड": "kothrud",
    "हडपसर": "hadapsar",
    "औंध": "aundh",
    "वाकड": "wakad",
    "विमाननगर": "vimannagar",
    "पुणे": "pune",
    "महाराष्ट्र": "maharashtra",
    "मुंबई": "mumbai",
    "ठाणे": "thane",
    "नागपूर": "nagpur",
    "नाशिक": "nashik",
}


def normalize_location_text(text: Optional[str]) -> str:
    """Normalizes location string by appending known English transliterations for Devanagari area names."""
    if not text:
        return ""
    norm = text.lower()
    for devanagari, english in TRANSLITERATIONS.items():
        if devanagari in text:
            norm += f" {english}"
    return norm


def token_matches_location(target_token: Optional[str], normalized_loc: str) -> bool:
    """Checks whether a contractor area/city/state matches the inspection location."""
    if not target_token or not target_token.strip() or not normalized_loc:
        return False
    import difflib
    token = target_token.strip().lower()
    # Direct or substring check
    if token in normalized_loc or normalized_loc in token:
        return True
    # Token-level fuzzy similarity (e.g. 'Swarget' vs 'Swargate')
    clean_loc_tokens = [w for w in re.split(r"[\s,;.-]+", normalized_loc) if len(w) >= 3]
    for loc_word in clean_loc_tokens:
        if difflib.SequenceMatcher(None, token, loc_word).ratio() >= 0.8:
            return True
    return False


def find_recipients_for_damage_alert(db, location_name: Optional[str]) -> Tuple[List[str], List[str]]:
    """
    Hierarchically routes damage alerts to relevant contractors:
    1. Area-level match: contractors whose service_area matches the location (e.g. 'Swarget' / 'Swargate').
    2. City-level match: if no area matches, contractors whose service_city matches (e.g. 'Pune').
    3. State-level match: if no city matches, contractors whose service_state matches.
    4. Fallback: all active approved contractors.
    Also returns active admin emails so administrators stay notified of all road damage assessments.
    """
    from models import User, UserRole

    active_contractors = (
        db.query(User)
        .filter(
            User.role == UserRole.CONTRACTOR,
            User.is_active == True,
            User.is_approved == True,
        )
        .all()
    )

    active_admins = (
        db.query(User)
        .filter(
            User.role == UserRole.ADMIN,
            User.is_active == True,
        )
        .all()
    )
    admin_emails = [a.email.strip() for a in active_admins if a.email and a.email.strip()]

    matched_contractors = []
    norm_loc = normalize_location_text(location_name)

    if norm_loc and active_contractors:
        # Tier 1: Area Match
        area_matches = [
            c for c in active_contractors
            if c.service_area and token_matches_location(c.service_area, norm_loc)
        ]
        if area_matches:
            matched_contractors = area_matches
            print(f"[EMAIL SERVICE] Matched area-specific contractor(s): {[c.email for c in area_matches]}")
        else:
            # Tier 2: City Match
            city_matches = [
                c for c in active_contractors
                if c.service_city and token_matches_location(c.service_city, norm_loc)
            ]
            if city_matches:
                matched_contractors = city_matches
                print(f"[EMAIL SERVICE] Matched city-specific contractor(s): {[c.email for c in city_matches]}")
            else:
                # Tier 3: State Match
                state_matches = [
                    c for c in active_contractors
                    if c.service_state and token_matches_location(c.service_state, norm_loc)
                ]
                if state_matches:
                    matched_contractors = state_matches
                    print(f"[EMAIL SERVICE] Matched state-specific contractor(s): {[c.email for c in state_matches]}")
                else:
                    matched_contractors = active_contractors
    elif active_contractors:
        matched_contractors = active_contractors

    contractor_emails = [c.email.strip() for c in matched_contractors if c.email and c.email.strip()]
    return contractor_emails, admin_emails


def send_damage_alert_sync(
    analysis_data: Dict[str, Any],
    annotated_image_path: Optional[str] = None,
    db_session_factory=None,
):
    """
    Synchronous SMTP sender called inside a background thread.
    Routes damage alerts to the relevant area contractor and notifies administrators.
    Logs each email attempt separately in 'email_logs' SQLite table.
    """
    analysis_id = analysis_data.get("id", "N/A")
    score_val = float(analysis_data.get("road_health_score", 0.0))
    condition_val = analysis_data.get("condition_label", "Poor")

    subject = f"Road Damage Alert — {condition_val}: Score {score_val:.1f}/100 [ID #{analysis_id}]"

    # Query active contractors and admins from database
    target_recipients = []
    if db_session_factory:
        try:
            db = db_session_factory()
            loc_name = analysis_data.get("location_name")
            cont_emails, adm_emails = find_recipients_for_damage_alert(db, loc_name)

            # Target recipients = area contractors + admins
            target_recipients = list(dict.fromkeys(cont_emails + adm_emails))
            db.close()
        except Exception as query_err:
            print(f"[EMAIL SERVICE] Error querying contractors/admins for routing: {query_err}")

    # Fallback to .env CONTRACTOR_EMAIL if no contractors in DB
    if not target_recipients:
        raw_env = os.getenv("CONTRACTOR_EMAIL", CONTRACTOR_EMAIL or "")
        if raw_env:
            target_recipients = [e.strip() for e in raw_env.split(",") if e.strip()]

    # Deduplicate recipients
    target_recipients = list(dict.fromkeys([r.strip() for r in target_recipients if r and r.strip()]))

    # Shield real users and contractors during automated test executions
    uploader_email = str(analysis_data.get("user_email") or "").strip().lower()
    is_test_run = uploader_email.endswith("@test.com") or uploader_email.endswith("@example.com")
    if is_test_run:
        target_recipients = [r for r in target_recipients if r.endswith("@test.com") or r.endswith("@example.com")]
        if not target_recipients:
            target_recipients = ["testcontractor@test.com"]

    if not target_recipients:
        print("[EMAIL SERVICE] No recipients found for damage alert.")
        _record_log(db_session_factory, "N/A", subject, "failed", "No recipient found", analysis_data)
        return

    # Check email enabled
    if not EMAIL_ENABLED:
        for r in target_recipients:
            _record_log(db_session_factory, r, subject, "failed", "Email notifications disabled in .env (EMAIL_ENABLED=false)", analysis_data)
        return

    # Check for placeholder password
    if not EMAIL_PASSWORD or "<Gmail App Password" in EMAIL_PASSWORD or "your_password" in EMAIL_PASSWORD:
        err_msg = "Gmail App Password not configured in .env."
        print(f"[EMAIL SERVICE] {err_msg}")
        for r in target_recipients:
            _record_log(db_session_factory, r, subject, "failed", err_msg, analysis_data)
        return

    # Prepare attachment if available
    file_data = None
    attachment_name = None
    if annotated_image_path:
        img_file = Path(annotated_image_path)
        if not img_file.is_file():
            alt_file = Path(__file__).resolve().parent / str(annotated_image_path).lstrip("/")
            if alt_file.is_file():
                img_file = alt_file

        if img_file.is_file():
            try:
                with open(img_file, "rb") as f:
                    file_data = f.read()
                    attachment_name = f"annotated_inspection_{analysis_id}.jpg"
            except Exception as read_err:
                print(f"[EMAIL SERVICE] Failed reading attachment image: {read_err}")

    # Build HTML content
    html_content = _build_html_email_body(
        score=score_val,
        condition=condition_val,
        severity=analysis_data.get("severity", "High"),
        damage_index=analysis_data.get("damage_index", 0.0),
        coverage_pct=analysis_data.get("coverage_pct", 0.0),
        detections=analysis_data.get("detections", []),
        location_name=analysis_data.get("location_name"),
        lat=analysis_data.get("latitude"),
        lng=analysis_data.get("longitude"),
        timestamp=analysis_data.get("timestamp", datetime.now().isoformat()),
        analysis_id=analysis_data.get("id"),
    )

    # Dispatch to each recipient
    for recipient in target_recipients:
        # Isolated handling for test domains (avoids live SMTP bounces during automated tests)
        if recipient.lower().endswith("@test.com") or recipient.lower().endswith("@example.com"):
            print(f"[EMAIL SERVICE] Simulated email dispatch for test recipient: {recipient}")
            _record_log(db_session_factory, recipient, subject, "sent", "Simulated dispatch for test domain", analysis_data)
            continue

        status = "failed"
        error_message = None
        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = EMAIL_SENDER
            msg["To"] = recipient

            msg.set_content("Road Damage Alert: High defect severity detected. Please view in an HTML-compatible email client.")
            msg.add_alternative(html_content, subtype="html")

            if file_data and attachment_name:
                msg.add_attachment(
                    file_data,
                    maintype="image",
                    subtype="jpeg",
                    filename=attachment_name,
                )

            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=20) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(EMAIL_SENDER, EMAIL_PASSWORD)
                server.send_message(msg)

            status = "sent"
            print(f"[EMAIL SERVICE] Successfully dispatched damage alert #{analysis_id} to {recipient}")

        except Exception as exc:
            status = "failed"
            error_message = str(exc)
            print(f"[EMAIL SERVICE ERROR] Failed to send email alert to {recipient}: {exc}")

        finally:
            _record_log(db_session_factory, recipient, subject, status, error_message, analysis_data)


# -----------------------------------------------------------------------------
# FEATURE 2: USER CONFIRMATION EMAIL AFTER SUBMISSION
# -----------------------------------------------------------------------------
def _build_submission_confirmation_html(
    user_name: str,
    analysis_id: int,
    road_health_score: float,
    condition_label: str,
    severity: str,
    detection_count: int,
    location_name: Optional[str],
    timestamp: str,
) -> str:
    """Builds responsive HTML email body for user inspection submission confirmation."""
    cond_lower = condition_label.lower()
    if cond_lower == "good":
        score_color = "#10b981"  # Emerald
    elif cond_lower == "fair":
        score_color = "#f59e0b"  # Amber
    elif cond_lower == "poor":
        score_color = "#ea580c"  # Orange
    else:
        score_color = "#dc2626"  # Red

    loc_str = location_name if (location_name and location_name.strip()) else "Location not provided"

    # Status notice at bottom based on score and defects
    has_damage = (road_health_score <= 60.0) or (cond_lower in ["poor", "critical", "fair"] and detection_count > 0)
    if has_damage:
        status_box_bg = "#fff7ed"
        status_box_border = "#fed7aa"
        status_box_text = "#9a3412"
        status_message = (
            "⚠️ Road damage has been detected in your area. Our system has automatically notified "
            "the relevant contractor. Repairs will be prioritized based on the severity of the damage."
        )
    else:
        status_box_bg = "#f0fdf4"
        status_box_border = "#bbf7d0"
        status_box_text = "#166534"
        status_message = (
            "✅ The road condition appears to be acceptable. No urgent repairs are needed at this time."
        )

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Inspection Report #{analysis_id} Submitted</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #0f172a;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 28px 24px; color: #ffffff; text-align: center; border-bottom: 4px solid #3b82f6;">
                <div style="display: inline-block; padding: 4px 12px; background-color: #3b82f6; color: #ffffff; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
                    SUBMISSION CONFIRMED
                </div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #f8fafc;">Your Road Inspection Has Been Submitted</h1>
                <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">Inspection ID: #{analysis_id}</p>
            </div>

            <!-- Greeting & Score Card -->
            <div style="padding: 24px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <p style="margin: 0 0 16px; font-size: 14px; color: #334155;">
                    Hello <strong>{user_name or 'Inspector'}</strong>, thank you for contributing to road infrastructure safety. Your inspection has been analyzed by our AI model and recorded successfully.
                </p>
                <div style="background-color: #ffffff; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; text-align: center;">
                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">
                        Road Health Score
                    </div>
                    <div style="font-size: 42px; font-weight: 900; color: {score_color}; margin: 4px 0;">
                        {road_health_score:.1f} <span style="font-size: 16px; color: #94a3b8; font-weight: 600;">/ 100</span>
                    </div>
                    <div style="font-size: 14px; font-weight: 700; color: {score_color};">
                        Condition: {condition_label} &bull; Severity: {severity}
                    </div>
                </div>
            </div>

            <!-- Inspection Details Table -->
            <div style="padding: 24px; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 14px; font-size: 14px; font-weight: 700; color: #0f172a;">Inspection Summary</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 8px 0; color: #64748b; width: 40%;">Inspection ID:</td>
                        <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">#{analysis_id}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 8px 0; color: #64748b;">Total Defects Found:</td>
                        <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">{detection_count} defect(s)</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 8px 0; color: #64748b;">Location:</td>
                        <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">{loc_str}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b;">Submitted At:</td>
                        <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">{timestamp}</td>
                    </tr>
                </table>
            </div>

            <!-- Status Notice -->
            <div style="padding: 20px 24px;">
                <div style="background-color: {status_box_bg}; border: 1px solid {status_box_border}; border-radius: 12px; padding: 14px 16px; color: {status_box_text}; font-size: 13px; line-height: 1.5; font-weight: 500;">
                    {status_message}
                </div>
            </div>

            <!-- Footer -->
            <div style="padding: 16px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
                Road Health AI — Automated Road Inspection System<br>
                Empowering safer journeys through artificial intelligence.
            </div>
        </div>
    </body>
    </html>
    """


def send_submission_confirmation(
    user_email: str,
    user_name: str,
    analysis_id: int,
    road_health_score: float,
    condition_label: str,
    severity: str,
    detection_count: int,
    location_name: Optional[str],
    timestamp: str,
    db_session_factory=None,
):
    """
    Synchronous SMTP sender for user submission confirmation.
    Sends HTML confirmation email to the user who uploaded the inspection.
    Logs email attempt to 'email_logs' table.
    """
    subject = f"Road Health AI — Inspection Report #{analysis_id} Submitted"
    status = "failed"
    error_message = None

    if not user_email or not user_email.strip():
        return

    analysis_data = {
        "id": analysis_id,
        "road_health_score": road_health_score,
        "condition_label": condition_label,
    }

    if not EMAIL_ENABLED:
        _record_log(db_session_factory, user_email, subject, "failed", "Email notifications disabled in .env (EMAIL_ENABLED=false)", analysis_data)
        return

    if not EMAIL_PASSWORD or "<Gmail App Password" in EMAIL_PASSWORD or "your_password" in EMAIL_PASSWORD:
        err_msg = "Gmail App Password not configured in .env."
        _record_log(db_session_factory, user_email, subject, "failed", err_msg, analysis_data)
        return

    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = EMAIL_SENDER
        msg["To"] = user_email.strip()

        html_body = _build_submission_confirmation_html(
            user_name=user_name,
            analysis_id=analysis_id,
            road_health_score=road_health_score,
            condition_label=condition_label,
            severity=severity,
            detection_count=detection_count,
            location_name=location_name,
            timestamp=timestamp,
        )
        msg.set_content(f"Road Health AI — Inspection Report #{analysis_id} Submitted. Overall Health Score: {road_health_score:.1f}/100 ({condition_label}).")
        msg.add_alternative(html_body, subtype="html")

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.send_message(msg)

        status = "sent"
        print(f"[EMAIL SERVICE] Successfully dispatched user confirmation email to {user_email}")

    except Exception as exc:
        status = "failed"
        error_message = str(exc)
        print(f"[EMAIL SERVICE ERROR] Failed to send user confirmation email to {user_email}: {exc}")

    finally:
        _record_log(db_session_factory, user_email, subject, status, error_message, analysis_data)


def trigger_submission_confirmation_async(
    user_email: str,
    user_name: str,
    analysis_id: int,
    road_health_score: float,
    condition_label: str,
    severity: str,
    detection_count: int,
    location_name: Optional[str],
    timestamp: str,
    db_session_factory=None,
):
    """
    Fires the user confirmation email asynchronously in a background daemon thread.
    """
    if not user_email:
        return
    thread = threading.Thread(
        target=send_submission_confirmation,
        args=(
            user_email,
            user_name,
            analysis_id,
            road_health_score,
            condition_label,
            severity,
            detection_count,
            location_name,
            timestamp,
            db_session_factory,
        ),
        daemon=True,
    )
    thread.start()


def _record_log(db_session_factory, recipient: str, subject: str, status: str, error_msg: Optional[str], analysis_data: dict):
    """Helper to persist email log into database."""
    if not db_session_factory:
        return
    try:
        from models import EmailLog
        db = db_session_factory()
        log = EmailLog(
            timestamp=datetime.now().astimezone(),
            recipient=recipient,
            subject=subject,
            status=status,
            error_message=error_msg,
            road_health_score=analysis_data.get("road_health_score"),
            analysis_id=analysis_data.get("id"),
        )
        db.add(log)
        db.commit()
        db.close()
    except Exception as db_err:
        print(f"[EMAIL SERVICE] Error recording log to DB: {db_err}")


def should_trigger_damage_alert(analysis_data: Dict[str, Any]) -> bool:
    """
    Determines whether an inspection has actionable road damage:
    1. Score <= 60 or Condition Critical/Poor: Always trigger.
    2. Condition Fair with detected defects (e.g., potholes, cracks): Always trigger.
    3. Any score < 80 with detected defects: Trigger.
    4. Clean road (Score >= 80, no defects): Do not trigger.
    """
    try:
        score = float(analysis_data.get("road_health_score", 100.0))
        cond = str(analysis_data.get("condition_label", "")).strip().lower()
        dets = analysis_data.get("detections") or []

        if score <= 60.0 or cond in ["critical", "poor"]:
            return True
        if cond == "fair" and len(dets) > 0:
            return True
        if score < 80.0 and len(dets) > 0:
            return True
    except Exception:
        pass
    return False


def trigger_email_alert_async(analysis_data: Dict[str, Any], annotated_image_path: Optional[str], db_session_factory):
    """
    Asynchronously fires the email alert in a background daemon thread
    whenever actionable road damage is detected.
    """
    if should_trigger_damage_alert(analysis_data):
        thread = threading.Thread(
            target=send_damage_alert_sync,
            args=(analysis_data, annotated_image_path, db_session_factory),
            daemon=True,
        )
        thread.start()


# -----------------------------------------------------------------------------
# PASSWORD RESET EMAILS (FOR ALL ROLES: ADMIN, CONTRACTOR, USER)
# -----------------------------------------------------------------------------
def send_password_reset_otp_sync(email: str, full_name: str, otp: str, db_session_factory=None) -> bool:
    """
    Sends a 6-digit OTP email to the user for resetting their password.
    """
    sender = os.getenv("EMAIL_SENDER", "kauteshantanu80@gmail.com")
    email_password = os.getenv("EMAIL_PASSWORD", "")
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    subject = "Road Health AI — Password Reset OTP"

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b1120; color: #e2e8f0; margin: 0; padding: 24px; }}
    .card {{ max-width: 540px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }}
    .header {{ background: linear-gradient(135deg, #1e3a8a, #0284c7); padding: 28px 24px; text-align: center; }}
    .header h1 {{ margin: 0; font-size: 20px; color: #ffffff; letter-spacing: -0.5px; }}
    .header p {{ margin: 6px 0 0; font-size: 13px; color: #bae6fd; }}
    .body {{ padding: 28px 24px; }}
    .otp-box {{ background: #1e293b; border: 2px dashed #0284c7; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0; }}
    .otp-code {{ font-size: 34px; letter-spacing: 8px; font-weight: 800; color: #38bdf8; font-family: monospace; }}
    .info {{ font-size: 13px; color: #94a3b8; line-height: 1.6; }}
    .warning {{ background: #451a03; border: 1px solid #92400e; border-radius: 10px; padding: 12px; margin-top: 20px; font-size: 12px; color: #fde68a; }}
    .footer {{ padding: 18px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Password Reset Request</h1>
      <p>Road Health AI Verification Code</p>
    </div>
    <div class="body">
      <p style="font-size: 15px; color: #f1f5f9; margin-top: 0;">Hello <strong>{full_name}</strong>,</p>
      <p class="info">
        We received a request to reset the password associated with your account (<strong>{email}</strong>).
        Use the following one-time verification code to complete your password reset:
      </p>

      <div class="otp-box">
        <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px;">Your 6-Digit Verification Code</div>
        <div class="otp-code">{otp}</div>
      </div>

      <p class="info">
        ⏱️ This OTP code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
      </p>

      <div class="warning">
        🔒 If you did not request a password reset, you can safely ignore this email. Your existing password will remain unchanged.
      </div>
    </div>
    <div class="footer">
      Road Health AI — Automated Road Damage Assessment & Infrastructure Management
    </div>
  </div>
</body>
</html>"""

    plain_content = (
        f"Hello {full_name},\n\n"
        f"You requested to reset your password for Road Health AI ({email}).\n\n"
        f"Your 6-digit OTP code is: {otp}\n\n"
        f"This code will expire in 10 minutes.\n"
        f"If you did not request this, please ignore this email.\n\n"
        f"— Road Health AI Team"
    )

    status_val = "failed"
    err_msg = None

    if not email_password or "<Gmail App Password" in email_password or "your_password" in email_password:
        err_msg = "Gmail App Password not configured in .env"
        print(f"[RESET OTP EMAIL] Gmail App Password not configured — OTP for {email} is: {otp}")
    else:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Road Health AI <{sender}>"
            msg["To"] = email
            msg.attach(MIMEText(plain_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(smtp_server, smtp_port, timeout=20) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(sender, email_password)
                server.sendmail(sender, [email], msg.as_string())
            status_val = "sent"
            print(f"[RESET OTP EMAIL] Sent password reset OTP to {email}")
        except Exception as e:
            err_msg = str(e)
            print(f"[RESET OTP EMAIL] Error sending to {email}: {e}")

    if db_session_factory:
        try:
            from models import EmailLog
            db = db_session_factory()
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
            print(f"[RESET OTP EMAIL] Error recording log to DB: {db_err}")

    return status_val == "sent"


def trigger_password_reset_otp_async(email: str, full_name: str, otp: str, db_session_factory=None):
    """Asynchronously dispatches the password reset OTP email."""
    thread = threading.Thread(
        target=send_password_reset_otp_sync,
        args=(email, full_name, otp, db_session_factory),
        daemon=True,
    )
    thread.start()


def send_password_reset_success_sync(email: str, full_name: str, db_session_factory=None) -> bool:
    """
    Sends a confirmation email notifying the user that their password was successfully reset.
    """
    sender = os.getenv("EMAIL_SENDER", "kauteshantanu80@gmail.com")
    email_password = os.getenv("EMAIL_PASSWORD", "")
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    subject = "Road Health AI — Your Password Has Been Reset"

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b1120; color: #e2e8f0; margin: 0; padding: 24px; }}
    .card {{ max-width: 540px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }}
    .header {{ background: linear-gradient(135deg, #059669, #10b981); padding: 28px 24px; text-align: center; }}
    .header h1 {{ margin: 0; font-size: 20px; color: #ffffff; letter-spacing: -0.5px; }}
    .body {{ padding: 28px 24px; }}
    .info {{ font-size: 13px; color: #94a3b8; line-height: 1.6; }}
    .btn {{ display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 13px; margin: 20px 0; }}
    .warning {{ background: #451a03; border: 1px solid #92400e; border-radius: 10px; padding: 12px; margin-top: 20px; font-size: 12px; color: #fde68a; }}
    .footer {{ padding: 18px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Password Successfully Changed</h1>
    </div>
    <div class="body">
      <p style="font-size: 15px; color: #f1f5f9; margin-top: 0;">Hello <strong>{full_name}</strong>,</p>
      <p class="info">
        This is a confirmation that the password for your Road Health AI account (<strong>{email}</strong>) has been successfully reset.
      </p>
      <p class="info">
        You can now sign in using your new credentials.
      </p>

      <div style="text-align: center;">
        <a href="http://localhost:5173/login" class="btn">Sign In to Road Health AI</a>
      </div>

      <div class="warning">
        ⚠️ If you did NOT make this change, please immediately contact the administrator at <strong>kauteshantanu80@gmail.com</strong>.
      </div>
    </div>
    <div class="footer">
      Road Health AI — Automated Road Inspection System
    </div>
  </div>
</body>
</html>"""

    plain_content = (
        f"Hello {full_name},\n\n"
        f"The password for your Road Health AI account ({email}) has been successfully reset.\n"
        f"You can now log in at: http://localhost:5173/login\n\n"
        f"If you did not make this change, please contact admin at kauteshantanu80@gmail.com immediately.\n\n"
        f"— Road Health AI Team"
    )

    status_val = "failed"
    err_msg = None

    if not email_password or "<Gmail App Password" in email_password or "your_password" in email_password:
        err_msg = "Gmail App Password not configured in .env"
        print(f"[RESET SUCCESS EMAIL] Gmail App Password not configured — notification for {email}")
    else:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Road Health AI <{sender}>"
            msg["To"] = email
            msg.attach(MIMEText(plain_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(smtp_server, smtp_port, timeout=20) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(sender, email_password)
                server.sendmail(sender, [email], msg.as_string())
            status_val = "sent"
            print(f"[RESET SUCCESS EMAIL] Sent password reset confirmation to {email}")
        except Exception as e:
            err_msg = str(e)
            print(f"[RESET SUCCESS EMAIL] Error sending to {email}: {e}")

    if db_session_factory:
        try:
            from models import EmailLog
            db = db_session_factory()
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
            print(f"[RESET SUCCESS EMAIL] Error recording log to DB: {db_err}")

    return status_val == "sent"


def trigger_password_reset_success_async(email: str, full_name: str, db_session_factory=None):
    """Asynchronously dispatches the password reset confirmation email."""
    thread = threading.Thread(
        target=send_password_reset_success_sync,
        args=(email, full_name, db_session_factory),
        daemon=True,
    )
    thread.start()
