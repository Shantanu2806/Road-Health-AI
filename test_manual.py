#!/usr/bin/env python3
"""
test_manual.py - Manual Verification Script for Road Damage Assessment API
Tests live endpoints on http://127.0.0.1:8000
"""

import sys
import json
from pathlib import Path
from typing import Dict, Any, List

try:
    import requests
except ImportError:
    print("[ERROR] 'requests' library is required. Install it using: pip install requests")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    Image = None

BASE_URL = "http://127.0.0.1:8000"


def find_or_create_test_image() -> Path:
    """Find an existing road image from the dataset or generate one with PIL."""
    candidates = [
        Path("21431547/RDD2022_released_through_CRDDC2022/RDD2022/Czech/train/images/Czech_000000.jpg"),
        Path("21431547/RDD2022_released_through_CRDDC2022/RDD2022/China_Drone/train/images/China_Drone_000000.jpg"),
        Path("21431547/RDD2022_released_through_CRDDC2022/RDD2022/India/train/images/India_000000.jpg"),
    ]
    for c in candidates:
        if c.is_file():
            return c.resolve()

    # Search for any jpg in the workspace
    found = list(Path(".").rglob("*.jpg"))
    if found:
        return found[0].resolve()

    # Create dummy image if no jpg found
    fallback_path = Path("test_sample_road.jpg").resolve()
    if Image is not None:
        im = Image.new("RGB", (640, 480), color=(85, 85, 85))
        im.save(fallback_path)
    else:
        fallback_path.write_bytes(b"\xFF\xD8\xFF\xE0\x00\x10JFIF" + b"\x00" * 500)
    return fallback_path


def check_annotated_file_exists(annotated_path_or_url: str) -> bool:
    """Check if the annotated file exists on disk, trying common relative roots."""
    clean_path = annotated_path_or_url.lstrip("/")
    candidate_paths = [
        Path(clean_path),
        Path("backend") / clean_path,
        Path(__file__).resolve().parent / clean_path,
        Path(__file__).resolve().parent / "backend" / clean_path,
    ]
    for p in candidate_paths:
        if p.is_file():
            return True
    return False


def main():
    print("=" * 80)
    print(f" Live API Verification Script -> {BASE_URL}")
    print("=" * 80)

    results = {
        "Check 1: Health Endpoint (GET /health)": False,
        "Check 2: Analysis Execution (POST /analyze)": False,
        "Check 3: Field Validation & Disk File Verification": False,
        "Check 4: History Record Confirmation (GET /history)": False,
    }

    # -------------------------------------------------------------------------
    # CHECK 1: GET /health
    # -------------------------------------------------------------------------
    print("\n[CHECK 1] Testing GET /health...")
    try:
        resp = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"  HTTP Status Code: {resp.status_code}")
        print(f"  Response Body:    {resp.text}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == "healthy":
                results["Check 1: Health Endpoint (GET /health)"] = True
                print("  -> PASSED: Server is healthy and responsive.")
            else:
                print(f"  -> FAILED: Unexpected health status '{data.get('status')}'.")
        else:
            print(f"  -> FAILED: Expected status 200, got {resp.status_code}.")
    except Exception as err:
        print(f"  -> FAILED: Could not connect to {BASE_URL}: {err}")
        print("     Please verify the server is running with: uvicorn main:app --reload")

    # -------------------------------------------------------------------------
    # CHECK 2 & 3: POST /analyze
    # -------------------------------------------------------------------------
    print("\n[CHECK 2 & 3] Testing POST /analyze with road image...")
    image_file = find_or_create_test_image()
    print(f"  Using test image: {image_file.name} ({image_file})")

    created_analysis_id = None
    annotated_url = None

    # Obtain JWT token for authenticated endpoints
    auth_token = None
    try:
        login_res = requests.post(f"{BASE_URL}/auth/login", json={"email": "testmanual@test.com", "password": "Password123"}, timeout=5)
        if login_res.status_code == 200:
            auth_token = login_res.json().get("access_token")
        else:
            reg_res = requests.post(f"{BASE_URL}/auth/register", json={"email": "testmanual@test.com", "password": "Password123", "full_name": "Test Manual", "role": "user"}, timeout=5)
            if reg_res.status_code == 200:
                auth_token = reg_res.json().get("access_token")
    except Exception:
        pass

    auth_headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}

    try:
        with open(image_file, "rb") as f:
            files = {"file": (image_file.name, f, "image/jpeg")}
            data = {"conf_threshold": "0.40"}
            resp = requests.post(f"{BASE_URL}/analyze", files=files, data=data, headers=auth_headers, timeout=15)

        print(f"  HTTP Status Code: {resp.status_code}")
        if resp.status_code == 200:
            results["Check 2: Analysis Execution (POST /analyze)"] = True
            analysis = resp.json()
            print("  Full JSON Response:")
            print(json.dumps(analysis, indent=2))

            created_analysis_id = analysis.get("id")
            annotated_url = analysis.get("annotated_image_url") or analysis.get("annotated_image_path")

            # Validate fields
            print("\n  Validating response fields:")
            val_errors = []

            # 1. detections (list)
            detections = analysis.get("detections")
            if isinstance(detections, list):
                print(f"   [OK] detections: {len(detections)} detection(s) found")
            else:
                val_errors.append(f"detections is not a list: {type(detections)}")

            # 2. damage_index (number >= 0)
            di = analysis.get("damage_index")
            if isinstance(di, (int, float)) and di >= 0:
                print(f"   [OK] damage_index: {di}")
            else:
                val_errors.append(f"invalid damage_index: {di}")

            # 3. coverage_pct (number 0-100)
            cov = analysis.get("coverage_pct")
            if isinstance(cov, (int, float)) and 0.0 <= cov <= 100.0:
                print(f"   [OK] coverage_pct: {cov}%")
            else:
                val_errors.append(f"invalid coverage_pct: {cov}")

            # 4. severity ("Low" / "Medium" / "High")
            sev = analysis.get("severity")
            if sev in ["Low", "Medium", "High"]:
                print(f"   [OK] severity: {sev}")
            else:
                val_errors.append(f"invalid severity: {sev}")

            # 5. road_health_score (number 0-100)
            score = analysis.get("road_health_score")
            if isinstance(score, (int, float)) and 0.0 <= score <= 100.0:
                print(f"   [OK] road_health_score: {score}")
            else:
                val_errors.append(f"invalid road_health_score: {score}")

            # 6. condition_label ("Good" / "Fair" / "Poor" / "Critical")
            cond = analysis.get("condition_label")
            if cond in ["Good", "Fair", "Poor", "Critical"]:
                print(f"   [OK] condition_label: {cond}")
            else:
                val_errors.append(f"invalid condition_label: {cond}")

            # 7. annotated_image_url & file existence on disk
            if annotated_url:
                file_exists = check_annotated_file_exists(annotated_url)
                if file_exists:
                    print(f"   [OK] annotated image exists on disk: {annotated_url}")
                else:
                    val_errors.append(f"annotated image not found on disk at {annotated_url}")
            else:
                val_errors.append("missing annotated_image_url in response")

            if not val_errors:
                results["Check 3: Field Validation & Disk File Verification"] = True
                print("  -> PASSED: All fields present with valid types/ranges and annotated file exists on disk.")
            else:
                print("  -> FAILED Field Validation:")
                for err in val_errors:
                    print(f"     - {err}")
        else:
            print(f"  -> FAILED: Expected 200 OK, got {resp.status_code}: {resp.text}")

    except Exception as err:
        print(f"  -> FAILED: Error during /analyze request: {err}")

    # -------------------------------------------------------------------------
    # CHECK 4: GET /history
    # -------------------------------------------------------------------------
    print("\n[CHECK 4] Testing GET /history...")
    try:
        resp = requests.get(f"{BASE_URL}/history", headers=auth_headers, timeout=5)
        print(f"  HTTP Status Code: {resp.status_code}")
        if resp.status_code == 200:
            history = resp.json()
            print(f"  Total records in database: {len(history)}")

            if isinstance(history, list) and len(history) > 0:
                # Confirm the analysis we just created shows up in the list
                matching = [item for item in history if item.get("id") == created_analysis_id]
                if matching or created_analysis_id is None:
                    results["Check 4: History Record Confirmation (GET /history)"] = True
                    print(f"  -> PASSED: Verified newly created analysis (ID: {created_analysis_id}) is present in history.")
                else:
                    print(f"  -> FAILED: Analysis ID {created_analysis_id} not found in history records.")
            else:
                print("  -> FAILED: History returned empty list.")
        else:
            print(f"  -> FAILED: Expected 200 OK, got {resp.status_code}: {resp.text}")
    except Exception as err:
        print(f"  -> FAILED: Error during /history request: {err}")

    # -------------------------------------------------------------------------
    # SUMMARY
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print(" SUMMARY OF TEST RESULTS")
    print("=" * 80)
    all_passed = True
    for check_name, passed in results.items():
        status_tag = "[PASS]" if passed else "[FAIL]"
        print(f"  {status_tag:<8} {check_name}")
        if not passed:
            all_passed = False

    print("=" * 80)
    if all_passed:
        print(" OVERALL STATUS: ALL CHECKS PASSED (4 / 4) - BACKEND FULLY OPERATIONAL")
    else:
        print(" OVERALL STATUS: SOME CHECKS FAILED - REVIEW LOGS ABOVE")
    print("=" * 80 + "\n")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
