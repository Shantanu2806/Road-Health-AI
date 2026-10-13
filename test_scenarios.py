#!/usr/bin/env python3
"""
test_scenarios.py - Automated Integration Test Pass (Road Health AI)
Validates FastAPI backend with:
1. Clean Road Image (Control - Expected RHS ~100)
2. Damaged Road Image (Pothole & Crack Detections)
3. Blurry / Low-Contrast Road Image
4. Non-Image / Invalid File Upload (Expected HTTP 400 rejection)
"""

import sys
import json
import requests
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

BASE_URL = "http://127.0.0.1:8000"


def generate_clean_image(path: Path):
    """Generate clean road image with crisp pavement and lane marking."""
    im = Image.new("RGB", (640, 480), color=(60, 65, 75))
    draw = ImageDraw.Draw(im)
    draw.rectangle([315, 0, 325, 480], fill=(230, 230, 230))
    im.save(path, "JPEG")


def generate_damaged_image(path: Path):
    """Generate damaged road image with simulated potholes and cracks."""
    im = Image.new("RGB", (640, 480), color=(50, 52, 60))
    draw = ImageDraw.Draw(im)
    draw.rectangle([315, 0, 325, 480], fill=(220, 180, 50))
    draw.ellipse([200, 200, 290, 260], fill=(25, 25, 30))
    draw.line([(380, 100), (410, 190), (390, 280), (430, 370)], fill=(20, 20, 25), width=4)
    im.save(path, "JPEG")


def generate_blurry_image(path: Path):
    """Generate blurry, low-contrast road image."""
    im = Image.new("RGB", (640, 480), color=(40, 45, 50))
    draw = ImageDraw.Draw(im)
    draw.rectangle([315, 0, 325, 480], fill=(120, 120, 120))
    blurred = im.filter(ImageFilter.GaussianBlur(radius=8))
    blurred.save(path, "JPEG")


def generate_invalid_file(path: Path):
    """Generate non-image plain text file."""
    path.write_text("This is an invalid text document, not a road surface image.")


def run_test_scenario(scenario_num: int, title: str, file_path: Path, expect_success: bool = True):
    print(f"\n[SCENARIO {scenario_num}] {title}")
    print(f"  Target File: {file_path.name}")

    try:
        with open(file_path, "rb") as f:
            files = {"file": (file_path.name, f, "application/octet-stream")}
            data = {"conf_threshold": "0.40"}
            resp = requests.post(f"{BASE_URL}/analyze", files=files, data=data, timeout=15)

        print(f"  HTTP Status Code: {resp.status_code}")

        if expect_success:
            if resp.status_code == 200:
                body = resp.json()
                print(f"  -> SUCCESS: Assessment ID #{body.get('id')}")
                print(f"     Road Health Score: {body.get('road_health_score')} / 100 ({body.get('condition_label')})")
                print(f"     Severity:          {body.get('severity')}")
                print(f"     Damage Index:      {body.get('damage_index')}")
                print(f"     Coverage %:        {body.get('coverage_pct')}%")
                detections = body.get('detections', [])
                print(f"     Detections:        {len(detections)} item(s)")

                if detections:
                    first_det = detections[0]
                    print(f"     First Detection:   {first_det.get('class_code')} {first_det.get('class_name')} ({first_det.get('confidence'):.2f})")
                    print(f"     Bounding Box:      {first_det.get('bbox')}")

                return True
            else:
                print(f"  -> FAILED: Expected 200 OK, got {resp.status_code}: {resp.text}")
                return False
        else:
            if resp.status_code == 400:
                print(f"  -> SUCCESS: Correctly rejected with HTTP 400 Bad Request.")
                print(f"     Server Error Detail: {resp.json().get('detail')}")
                return True
            else:
                print(f"  -> FAILED: Expected HTTP 400, got {resp.status_code}: {resp.text}")
                return False

    except Exception as err:
        print(f"  -> FAILED with exception: {err}")
        return False


def main():
    print("=" * 80)
    print(" ROAD DAMAGE ASSESSMENT & HEALTH SCORING INTEGRATION TEST PASS")
    print(f" Base URL: {BASE_URL}")
    print("=" * 80)

    try:
        health_resp = requests.get(f"{BASE_URL}/health", timeout=5)
        if health_resp.status_code != 200 or health_resp.json().get("status") != "healthy":
            print(f"[ERROR] Backend health check failed: {health_resp.text}")
            return 1
    except Exception as e:
        print(f"[ERROR] Backend not reachable at {BASE_URL}: {e}")
        return 1

    temp_dir = Path("temp_test_scenarios")
    temp_dir.mkdir(exist_ok=True)

    clean_file = temp_dir / "scenario1_clean_road.jpg"
    damaged_file = temp_dir / "scenario2_damaged_road.jpg"
    blurry_file = temp_dir / "scenario3_blurry_road.jpg"
    invalid_file = temp_dir / "scenario4_invalid_doc.txt"

    generate_clean_image(clean_file)
    generate_damaged_image(damaged_file)
    generate_blurry_image(blurry_file)
    generate_invalid_file(invalid_file)

    results = []

    # Scenario 1: Clean image
    r1 = run_test_scenario(1, "Clean Road Surface Image", clean_file, expect_success=True)
    results.append(("Scenario 1: Clean Image", r1))

    # Scenario 2: Damaged image
    r2 = run_test_scenario(2, "Damaged Road Surface Image (Potholes & Cracks)", damaged_file, expect_success=True)
    results.append(("Scenario 2: Damaged Image", r2))

    # Scenario 3: Blurry image
    r3 = run_test_scenario(3, "Blurry / Adverse Visibility Road Image", blurry_file, expect_success=True)
    results.append(("Scenario 3: Blurry Image", r3))

    # Scenario 4: Non-image file
    r4 = run_test_scenario(4, "Non-Image Document (.txt file rejection)", invalid_file, expect_success=False)
    results.append(("Scenario 4: Non-Image File Rejection", r4))

    print("\n" + "=" * 80)
    print(" INTEGRATION TEST SUMMARY")
    print("=" * 80)
    all_ok = True
    for name, ok in results:
        status_str = "[PASS]" if ok else "[FAIL]"
        print(f"  {status_str:<8} {name}")
        if not ok:
            all_ok = False

    print("=" * 80)
    if all_ok:
        print(" ALL 4 INTEGRATION SCENARIOS PASSED CLEANLY!")
    else:
        print(" SOME SCENARIOS FAILED.")
    print("=" * 80 + "\n")

    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
