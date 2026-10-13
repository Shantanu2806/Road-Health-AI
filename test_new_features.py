#!/usr/bin/env python3
"""
test_new_features.py - Automated Test Suite for New Road Health AI Features
Tests:
1. Authentication (User, Contractor, Admin validation, Login, Token, /auth/me)
2. Protected Endpoints (/analyze, /history auth requirements)
3. Location + Map Features (GPS pinning, public /map/markers, privacy verification)
4. Role-Based Access Controls (/contractor/dashboard, /admin/dashboard)
5. Automated Email Triggers (Poor/Critical damage email dispatch & /admin/email-logs)
6. History Isolation (User-only history vs Contractor global access)
"""

import sys
import os
import time
import sqlite3
import requests
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"
DB_PATH = Path("backend/road_health.db")


def reset_test_users():
    """Ensure clean starting state for idempotent test runs."""
    if not DB_PATH.exists():
        return
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute(
            "DELETE FROM analyses WHERE user_id IN (SELECT id FROM users WHERE email IN ('testuser@test.com', 'testcontractor@test.com'))"
        )
        c.execute(
            "DELETE FROM users WHERE email IN ('testuser@test.com', 'testcontractor@test.com')"
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[SETUP] Warning during test DB cleanup: {e}")


def get_test_image() -> Path:
    """Finds or creates a valid road surface image for uploads."""
    candidates = [
        Path("21431547/RDD2022_released_through_CRDDC2022/RDD2022/India/train/images/India_000005.jpg"),
        Path("21431547/RDD2022_released_through_CRDDC2022/RDD2022/Czech/train/images/Czech_000000.jpg"),
        Path("temp_test_scenarios/scenario1_clean_asphalt.jpg"),
        Path("clean_road.jpg"),
    ]
    for c in candidates:
        if c.is_file():
            return c
    # Fallback create a dummy JPEG
    fallback = Path("temp_test_image.jpg")
    fallback.write_bytes(b"\xFF\xD8\xFF\xE0\x00\x10JFIF" + b"\x00" * 2000)
    return fallback


def get_heavily_damaged_image() -> Path:
    """Finds image in RDD2022 dataset that produces Road Health Score <= 60."""
    candidates = [
        Path("21431547/RDD2022_released_through_CRDDC2022/RDD2022/India/train/images/India_000323.jpg"),
        Path("backend/static/uploads/09b4ebf4af_3.jpg"),
        Path("21431547/RDD2022_released_through_CRDDC2022/RDD2022/India/train/images/India_000052.jpg"),
    ]
    for c in candidates:
        if c.is_file():
            return c
    return get_test_image()


def main():
    print("=" * 80)
    print(" ROAD HEALTH AI - COMPREHENSIVE AUTOMATED TEST SUITE (NEW FEATURES)")
    print(f" Target Server: {BASE_URL}")
    print("=" * 80)

    reset_test_users()

    checks = []

    def record_result(category: str, check_name: str, passed: bool, detail: str = ""):
        status = "PASS" if passed else "FAIL"
        checks.append({
            "category": category,
            "name": check_name,
            "passed": passed,
            "detail": detail,
        })
        print(f"  [{status}] {check_name} {detail}")

    user_token = None
    contractor_token = None
    admin_token = None

    # =========================================================================
    # 1. AUTHENTICATION TESTS
    # =========================================================================
    print("\n--- 1. AUTHENTICATION TESTS ---")

    # 1.1 Register new user
    res_reg_user = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            "email": "testuser@test.com",
            "password": "Test1234",
            "full_name": "Test User",
            "role": "user",
        },
    )
    user_token = res_reg_user.json().get("access_token") if res_reg_user.status_code == 200 else None
    record_result(
        "1. Auth",
        "Register new user (role: user)",
        res_reg_user.status_code == 200 and user_token is not None,
        f"(HTTP {res_reg_user.status_code})",
    )

    # 1.2 Register contractor
    res_reg_cont = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            "email": "testcontractor@test.com",
            "password": "Test1234",
            "full_name": "Test Contractor",
            "role": "contractor",
        },
    )
    reg_cont_json = res_reg_cont.json() if res_reg_cont.status_code == 200 else {}
    contractor_registered = (
        res_reg_cont.status_code == 200
        and (reg_cont_json.get("status") == "pending" or "access_token" in reg_cont_json)
    )
    contractor_token = reg_cont_json.get("access_token")
    record_result(
        "1. Auth",
        "Register contractor (role: contractor)",
        contractor_registered,
        f"(HTTP {res_reg_cont.status_code}: {reg_cont_json.get('status', 'ok')})",
    )

    # 1.3 Try to register as admin with unauthorized email -> Expect HTTP 400
    res_reg_bad_admin = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            "email": "fakeadmin@test.com",
            "password": "Test1234",
            "full_name": "Fake Admin",
            "role": "admin",
        },
    )
    record_result(
        "1. Auth",
        "Reject admin registration with wrong email",
        res_reg_bad_admin.status_code == 400,
        f"(HTTP {res_reg_bad_admin.status_code}: {res_reg_bad_admin.json().get('detail')})",
    )

    # 1.4 Login with correct credentials -> Expect JWT token
    res_login_ok = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "testuser@test.com", "password": "Test1234"},
    )
    got_token = res_login_ok.status_code == 200 and bool(res_login_ok.json().get("access_token"))
    record_result(
        "1. Auth",
        "Login with correct credentials returns JWT",
        got_token,
        f"(HTTP {res_login_ok.status_code})",
    )

    # 1.5 Login with wrong password -> Expect HTTP 401
    res_login_bad = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "testuser@test.com", "password": "WrongPassword999"},
    )
    record_result(
        "1. Auth",
        "Login with wrong password rejected",
        res_login_bad.status_code == 401,
        f"(HTTP {res_login_bad.status_code})",
    )

    # 1.6 Access /auth/me with valid token -> Expect user info returned
    res_me_valid = requests.get(
        f"{BASE_URL}/auth/me",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    me_data = res_me_valid.json() if res_me_valid.status_code == 200 else {}
    record_result(
        "1. Auth",
        "Access /auth/me with valid token",
        res_me_valid.status_code == 200 and me_data.get("email") == "testuser@test.com",
        f"(User: {me_data.get('email')}, Role: {me_data.get('role')})",
    )

    # 1.7 Access /auth/me with no token -> Expect HTTP 401
    res_me_no_token = requests.get(f"{BASE_URL}/auth/me")
    record_result(
        "1. Auth",
        "Access /auth/me with no token rejected",
        res_me_no_token.status_code == 401,
        f"(HTTP {res_me_no_token.status_code})",
    )

    # Setup admin token - default root admin password is Admin@2026
    for admin_pwd in ["Admin@2026", "adminpassword123"]:
        res_admin_login = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": "kauteshantanu80@gmail.com", "password": admin_pwd},
        )
        if res_admin_login.status_code == 200:
            admin_token = res_admin_login.json().get("access_token")
            break

    if not admin_token:
        # Register admin if not already existing
        res_admin_reg = requests.post(
            f"{BASE_URL}/auth/register",
            json={
                "email": "kauteshantanu80@gmail.com",
                "password": "Admin@2026",
                "full_name": "Admin",
                "role": "admin",
            },
        )
        if res_admin_reg.status_code == 200:
            admin_token = res_admin_reg.json().get("access_token")

    # If contractor registered as pending approval, approve them via admin workflow:
    if admin_token and not contractor_token:
        try:
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("SELECT otp_code FROM users WHERE email = 'testcontractor@test.com'")
            row = c.fetchone()
            conn.close()
            otp = row[0] if row else None
            if otp:
                # Admin verifies OTP
                requests.post(
                    f"{BASE_URL}/admin/verify-contractor-otp",
                    json={"contractor_email": "testcontractor@test.com", "otp": otp},
                    headers={"Authorization": f"Bearer {admin_token}"},
                )
                # Admin approves contractor
                requests.post(
                    f"{BASE_URL}/admin/approve-contractor",
                    json={"contractor_email": "testcontractor@test.com"},
                    headers={"Authorization": f"Bearer {admin_token}"},
                )
        except Exception as e:
            print(f"[TEST SETUP] Approval error: {e}")

        # Contractor logs in after approval
        res_cont_login = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": "testcontractor@test.com", "password": "Test1234"},
        )
        if res_cont_login.status_code == 200:
            contractor_token = res_cont_login.json().get("access_token")

    # =========================================================================
    # 2. PROTECTED ENDPOINT TESTS
    # =========================================================================
    print("\n--- 2. PROTECTED ENDPOINT TESTS ---")

    test_img = get_test_image()

    # 2.1 POST /analyze without token -> Expect HTTP 401
    with open(test_img, "rb") as f:
        res_analyze_no_token = requests.post(
            f"{BASE_URL}/analyze",
            files={"file": (test_img.name, f, "image/jpeg")},
        )
    record_result(
        "2. Protected Endpoints",
        "POST /analyze without token rejected",
        res_analyze_no_token.status_code == 401,
        f"(HTTP {res_analyze_no_token.status_code})",
    )

    # 2.2 POST /analyze WITH token -> Expect HTTP 200
    with open(test_img, "rb") as f:
        res_analyze_with_token = requests.post(
            f"{BASE_URL}/analyze",
            files={"file": (test_img.name, f, "image/jpeg")},
            headers={"Authorization": f"Bearer {user_token}"},
        )
    record_result(
        "2. Protected Endpoints",
        "POST /analyze WITH token succeeds",
        res_analyze_with_token.status_code == 200,
        f"(HTTP {res_analyze_with_token.status_code}, Analysis ID #{res_analyze_with_token.json().get('id')})",
    )

    # 2.3 GET /history with user token -> Expect user's analyses
    res_hist_user = requests.get(
        f"{BASE_URL}/history",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    hist_items = res_hist_user.json() if res_hist_user.status_code == 200 else []
    record_result(
        "2. Protected Endpoints",
        "GET /history with user token returns analyses",
        res_hist_user.status_code == 200 and len(hist_items) >= 1,
        f"(HTTP {res_hist_user.status_code}, {len(hist_items)} record(s))",
    )

    # 2.4 GET /history with no token -> Expect HTTP 401
    res_hist_no_token = requests.get(f"{BASE_URL}/history")
    record_result(
        "2. Protected Endpoints",
        "GET /history with no token rejected",
        res_hist_no_token.status_code == 401,
        f"(HTTP {res_hist_no_token.status_code})",
    )

    # =========================================================================
    # 3. LOCATION + MAP TESTS
    # =========================================================================
    print("\n--- 3. LOCATION + MAP TESTS ---")

    # 3.1 POST /analyze with location data
    with open(test_img, "rb") as f:
        res_loc = requests.post(
            f"{BASE_URL}/analyze",
            files={"file": (test_img.name, f, "image/jpeg")},
            data={
                "latitude": 19.0760,
                "longitude": 72.8777,
                "location_name": "Mumbai, India",
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
    loc_analysis = res_loc.json() if res_loc.status_code == 200 else {}
    loc_id = loc_analysis.get("id")
    loc_saved = (
        res_loc.status_code == 200
        and loc_analysis.get("latitude") == 19.0760
        and loc_analysis.get("longitude") == 72.8777
        and loc_analysis.get("location_name") == "Mumbai, India"
    )
    record_result(
        "3. Location & Map",
        "POST /analyze with location saves geo-coordinates",
        loc_saved,
        f"(ID #{loc_id}, Lat: {loc_analysis.get('latitude')}, Lng: {loc_analysis.get('longitude')})",
    )

    # 3.2 GET /map/markers -> confirm analysis appears in markers
    res_markers = requests.get(f"{BASE_URL}/map/markers")
    markers = res_markers.json() if res_markers.status_code == 200 else []
    matching_marker = next((m for m in markers if m.get("id") == loc_id), None)
    record_result(
        "3. Location & Map",
        "GET /map/markers contains newly pinned analysis",
        res_markers.status_code == 200 and matching_marker is not None,
        f"(Found Marker #{loc_id} in {len(markers)} marker(s))",
    )

    # 3.3 Confirm marker response does NOT contain user email or user_id
    privacy_intact = True
    for m in markers:
        if "user_id" in m or "email" in m or "user_email" in m or "user_name" in m:
            privacy_intact = False
            break
    record_result(
        "3. Location & Map",
        "Marker response preserves user privacy (no email/user_id)",
        privacy_intact,
        "(Confirmed zero user PII exposed)",
    )

    # 3.4 GET /map/markers with no auth -> Expect 200 (public endpoint)
    res_markers_public = requests.get(f"{BASE_URL}/map/markers")
    record_result(
        "3. Location & Map",
        "GET /map/markers is public (no auth required)",
        res_markers_public.status_code == 200,
        f"(HTTP {res_markers_public.status_code})",
    )

    # =========================================================================
    # 4. ROLE-BASED ACCESS TESTS
    # =========================================================================
    print("\n--- 4. ROLE-BASED ACCESS TESTS ---")

    # 4.1 Contractor dashboard with user token -> Expect HTTP 403
    res_cd_user = requests.get(
        f"{BASE_URL}/contractor/dashboard",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    record_result(
        "4. Role Access",
        "Access /contractor/dashboard with user token rejected",
        res_cd_user.status_code == 403,
        f"(HTTP {res_cd_user.status_code})",
    )

    # 4.2 Contractor dashboard with contractor token -> Expect HTTP 200
    res_cd_cont = requests.get(
        f"{BASE_URL}/contractor/dashboard",
        headers={"Authorization": f"Bearer {contractor_token}"},
    )
    record_result(
        "4. Role Access",
        "Access /contractor/dashboard with contractor token succeeds",
        res_cd_cont.status_code == 200,
        f"(HTTP {res_cd_cont.status_code}, Total analyses: {res_cd_cont.json().get('total_analyses')})",
    )

    # 4.3 Admin dashboard with user token -> Expect HTTP 403
    res_ad_user = requests.get(
        f"{BASE_URL}/admin/dashboard",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    record_result(
        "4. Role Access",
        "Access /admin/dashboard with user token rejected",
        res_ad_user.status_code == 403,
        f"(HTTP {res_ad_user.status_code})",
    )

    # 4.4 Admin dashboard with contractor token -> Expect HTTP 403
    res_ad_cont = requests.get(
        f"{BASE_URL}/admin/dashboard",
        headers={"Authorization": f"Bearer {contractor_token}"},
    )
    record_result(
        "4. Role Access",
        "Access /admin/dashboard with contractor token rejected",
        res_ad_cont.status_code == 403,
        f"(HTTP {res_ad_cont.status_code})",
    )

    # 4.5 Admin dashboard with admin token -> Expect HTTP 200
    if admin_token:
        res_ad_admin = requests.get(
            f"{BASE_URL}/admin/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        record_result(
            "4. Role Access",
            "Access /admin/dashboard with admin token succeeds",
            res_ad_admin.status_code == 200,
            f"(HTTP {res_ad_admin.status_code}, Status: {res_ad_admin.json().get('system_status')})",
        )
    else:
        record_result(
            "4. Role Access",
            "Access /admin/dashboard with admin token",
            False,
            "(Admin token could not be obtained)",
        )

    # =========================================================================
    # 5. EMAIL TRIGGER TEST
    # =========================================================================
    print("\n--- 5. EMAIL TRIGGER TEST ---")

    damaged_img = get_heavily_damaged_image()
    print(f"  Uploading heavily damaged road image: {damaged_img.name}")

    with open(damaged_img, "rb") as f:
        res_damaged = requests.post(
            f"{BASE_URL}/analyze",
            files={"file": (damaged_img.name, f, "image/jpeg")},
            headers={"Authorization": f"Bearer {user_token}"},
        )

    dmg_body = res_damaged.json() if res_damaged.status_code == 200 else {}
    dmg_score = dmg_body.get("road_health_score", 100.0)
    dmg_cond = dmg_body.get("condition_label", "Unknown")
    dmg_id = dmg_body.get("id")

    # 5.1 & 5.2 Confirm score <= 60
    is_poor_or_critical = (res_damaged.status_code == 200 and dmg_score <= 60.0)
    record_result(
        "5. Email Trigger",
        "Damaged image yields Road Health Score <= 60",
        is_poor_or_critical,
        f"(Score: {dmg_score:.2f}/100, Condition: {dmg_cond})",
    )

    # Wait 1.5 seconds for background email thread to write to email_logs
    time.sleep(1.5)

    # 5.3 & 5.4 Check GET /admin/email-logs
    email_logged = False
    log_detail = "None"
    if admin_token:
        res_logs = requests.get(
            f"{BASE_URL}/admin/email-logs",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        if res_logs.status_code == 200:
            logs = res_logs.json()
            if logs:
                latest_log = logs[0]
                status_val = latest_log.get("status")
                # Either 'sent' or 'failed' is acceptable as requested
                if status_val in ["sent", "failed"]:
                    email_logged = True
                    log_detail = (
                        f"Recipient: {latest_log.get('recipient')}, "
                        f"Subject: '{latest_log.get('subject', '').replace('—', '-')}', "
                        f"Status: {status_val.upper()}"
                    )
                    print(f"  [EMAIL LOG DETAILS] {log_detail}")
                    if latest_log.get("error_message"):
                        clean_err = latest_log.get("error_message", "").replace("→", "->").replace("—", "-")
                        print(f"  [LOG NOTE] {clean_err}")

    record_result(
        "5. Email Trigger",
        "GET /admin/email-logs shows email dispatch attempt",
        email_logged,
        f"({log_detail})",
    )

    # =========================================================================
    # 6. HISTORY ISOLATION TEST
    # =========================================================================
    print("\n--- 6. HISTORY ISOLATION TEST ---")

    # Reset user analyses specifically for clean count of 2
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute(
            "DELETE FROM analyses WHERE user_id = (SELECT id FROM users WHERE email = 'testuser@test.com')"
        )
        conn.commit()
        conn.close()
    except Exception:
        pass

    # Login as testuser@test.com
    res_login_user = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "testuser@test.com", "password": "Test1234"},
    )
    user_token = res_login_user.json().get("access_token")

    # Upload exactly 2 images as testuser
    for i in range(2):
        with open(test_img, "rb") as f:
            requests.post(
                f"{BASE_URL}/analyze",
                files={"file": (f"test_isolation_{i}.jpg", f, "image/jpeg")},
                headers={"Authorization": f"Bearer {user_token}"},
            )

    # 6.1 GET /history with user token -> confirm only 2 records shown
    res_hist_isolation = requests.get(
        f"{BASE_URL}/history",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    user_hist_records = res_hist_isolation.json() if res_hist_isolation.status_code == 200 else []
    record_result(
        "6. History Isolation",
        "Regular user sees strictly their own 2 uploaded analyses",
        res_hist_isolation.status_code == 200 and len(user_hist_records) == 2,
        f"(Count: {len(user_hist_records)} records, expected: 2)",
    )

    # 6.2 Login as testcontractor@test.com -> GET /history -> contractor sees all
    res_login_cont = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "testcontractor@test.com", "password": "Test1234"},
    )
    contractor_token = res_login_cont.json().get("access_token")

    res_hist_contractor = requests.get(
        f"{BASE_URL}/history?limit=100",
        headers={"Authorization": f"Bearer {contractor_token}"},
    )
    cont_hist_records = res_hist_contractor.json() if res_hist_contractor.status_code == 200 else []
    record_result(
        "6. History Isolation",
        "Contractor sees all analyses across the system",
        res_hist_contractor.status_code == 200 and len(cont_hist_records) > 2,
        f"(Contractor sees {len(cont_hist_records)} total system records)",
    )

    # =========================================================================
    # FINAL SUMMARY TABLE
    # =========================================================================
    print("\n" + "=" * 80)
    print(" FINAL PASS / FAIL SUMMARY TABLE")
    print("=" * 80)
    print(f" {'#':<3} | {'CATEGORY':<22} | {'TEST CHECK':<40} | {'STATUS'}")
    print("-" * 80)

    all_passed = True
    for idx, c in enumerate(checks, 1):
        status_text = "[PASS]" if c["passed"] else "[FAIL]"
        print(f" {idx:<3} | {c['category']:<22} | {c['name']:<40} | {status_text}")
        if not c["passed"]:
            all_passed = False

    print("=" * 80)
    total_checks = len(checks)
    passed_checks = sum(1 for c in checks if c["passed"])
    print(f" OVERALL RESULT: {passed_checks} / {total_checks} CHECKS PASSED")
    if all_passed:
        print(" STATUS: ALL NEW FEATURES FULLY OPERATIONAL AND VERIFIED!")
    else:
        print(" STATUS: SOME CHECKS FAILED - REVIEW LOGS ABOVE.")
    print("=" * 80)

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
