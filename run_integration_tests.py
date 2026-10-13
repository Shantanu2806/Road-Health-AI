#!/usr/bin/env python3
"""
run_integration_tests.py - Complete Integration Test Suite for Road Health AI
Scenarios:
1. Clean/no-damage road image (Expected: 0 detections, score ~100, condition 'Good')
2. Damaged road image from RDD2022 (Expected: Real detections D00/D10/D20/D40, non-zero score)
3. Blurry/low-quality road image (Expected: Pipeline completes without error, returns valid JSON)
4. Very large file (>10MB) & Non-image file (.txt / .pdf) (Expected: HTTP 400 with clear message)
Defensive checks:
- Empty detections frontend handling & disk annotation verification
- History endpoint verification for all test records
"""

import os
import sys
import json
import requests
from pathlib import Path
from PIL import Image, ImageFilter

BASE_URL = "http://127.0.0.1:8000"
TEST_DIR = Path("temp_test_scenarios")
TEST_DIR.mkdir(parents=True, exist_ok=True)


def test_scenario_1_clean_road():
    print("\n" + "=" * 70)
    print("SCENARIO 1: Clean / No-Damage Road Image")
    print("=" * 70)
    
    # Create clean asphalt road image
    clean_path = TEST_DIR / "scenario1_clean_asphalt.jpg"
    img = Image.new("RGB", (640, 480), color=(68, 70, 75))
    img.save(clean_path, format="JPEG", quality=95)
    
    with open(clean_path, "rb") as f:
        resp = requests.post(
            f"{BASE_URL}/analyze",
            files={"file": (clean_path.name, f, "image/jpeg")},
            data={"conf_threshold": 0.25},
            timeout=30,
        )
    
    status_code = resp.status_code
    print(f"HTTP Status Code: {status_code}")
    
    if status_code != 200:
        print(f"Response: {resp.text}")
        print("RESULT: FAIL (Expected HTTP 200)")
        return False, None
    
    data = resp.json()
    rhs = data.get("road_health_score")
    cond = data.get("condition_label")
    sev = data.get("severity")
    dets = data.get("detections", [])
    annot_path = data.get("annotated_image_path")
    
    print(f"Road Health Score: {rhs}")
    print(f"Condition Label:   {cond}")
    print(f"Severity:          {sev}")
    print(f"Detections Count:  {len(dets)}")
    print(f"Annotated Image:   {annot_path}")
    
    # Check assertions: 0 detections, score ~100, condition Good, no errors
    passed = (
        status_code == 200
        and len(dets) == 0
        and rhs >= 95.0
        and cond == "Good"
    )
    
    reason = "0 detections, score 100.0, condition 'Good', valid pipeline completion." if passed else f"Unexpected: dets={len(dets)}, score={rhs}, cond={cond}"
    print(f"RESULT: {'PASS' if passed else 'FAIL'} - {reason}")
    return passed, data


def test_scenario_2_damaged_road():
    print("\n" + "=" * 70)
    print("SCENARIO 2: Damaged Road Image (RDD2022 Dataset)")
    print("=" * 70)
    
    # Use real RDD2022 damaged image from India train set
    rdd_img_path = Path("21431547/RDD2022_released_through_CRDDC2022/RDD2022/India/train/images/India_000005.jpg")
    if not rdd_img_path.exists():
        print(f"File not found: {rdd_img_path}")
        return False, None
    
    with open(rdd_img_path, "rb") as f:
        resp = requests.post(
            f"{BASE_URL}/analyze",
            files={"file": (rdd_img_path.name, f, "image/jpeg")},
            data={"conf_threshold": 0.25},
            timeout=30,
        )
    
    status_code = resp.status_code
    print(f"HTTP Status Code: {status_code}")
    
    if status_code != 200:
        print(f"Response: {resp.text}")
        print("RESULT: FAIL (Expected HTTP 200)")
        return False, None
    
    data = resp.json()
    rhs = data.get("road_health_score")
    cond = data.get("condition_label")
    sev = data.get("severity")
    dets = data.get("detections", [])
    annot_path = data.get("annotated_image_path")
    
    print(f"Road Health Score: {rhs}")
    print(f"Condition Label:   {cond}")
    print(f"Severity:          {sev}")
    print(f"Detections Count:  {len(dets)}")
    print("Detections Breakdown:")
    for i, d in enumerate(dets, 1):
        print(f"  {i}. {d.get('class_code')} ({d.get('class_name')}): conf={d.get('confidence')}, bbox={d.get('bbox')}")
    print(f"Annotated Image:   {annot_path}")
    
    # Assertions: Real detections D00/D10/D20/D40, non-zero score, severity makes sense
    has_valid_classes = any(d.get("class_code") in ["D00", "D10", "D20", "D40"] for d in dets)
    passed = (
        status_code == 200
        and len(dets) > 0
        and has_valid_classes
        and rhs < 100.0
    )
    
    reason = f"Detected {len(dets)} defects with valid RDD2022 classes, health score={rhs}, severity='{sev}'." if passed else "No valid detections found."
    print(f"RESULT: {'PASS' if passed else 'FAIL'} - {reason}")
    return passed, data


def test_scenario_2b_damaged_road_second():
    print("\n" + "=" * 70)
    print("SCENARIO 2b: Damaged Road Image 2 (RDD2022 Alligator Crack)")
    print("=" * 70)
    
    rdd_img_path = Path("21431547/RDD2022_released_through_CRDDC2022/RDD2022/India/train/images/India_000014.jpg")
    if not rdd_img_path.exists():
        print(f"File not found: {rdd_img_path}")
        return False, None
    
    with open(rdd_img_path, "rb") as f:
        resp = requests.post(
            f"{BASE_URL}/analyze",
            files={"file": (rdd_img_path.name, f, "image/jpeg")},
            data={"conf_threshold": 0.25},
            timeout=30,
        )
    
    status_code = resp.status_code
    print(f"HTTP Status Code: {status_code}")
    if status_code != 200:
        print(f"Response: {resp.text}")
        print("RESULT: FAIL (Expected HTTP 200)")
        return False, None
    
    data = resp.json()
    rhs = data.get("road_health_score")
    cond = data.get("condition_label")
    sev = data.get("severity")
    dets = data.get("detections", [])
    print(f"Road Health Score: {rhs}")
    print(f"Condition Label:   {cond}")
    print(f"Severity:          {sev}")
    print(f"Detections Count:  {len(dets)}")
    for i, d in enumerate(dets, 1):
        print(f"  {i}. {d.get('class_code')} ({d.get('class_name')}): conf={d.get('confidence')}, bbox={d.get('bbox')}")
    
    passed = status_code == 200 and len(dets) > 0
    print(f"RESULT: {'PASS' if passed else 'FAIL'}")
    return passed, data


def test_scenario_3_blurry_image():
    print("\n" + "=" * 70)
    print("SCENARIO 3: Blurry / Low-Quality Road Image (GaussianBlur radius=5)")
    print("=" * 70)
    
    # Blur an existing road image using PIL ImageFilter.GaussianBlur(radius=5)
    rdd_img_path = Path("21431547/RDD2022_released_through_CRDDC2022/RDD2022/India/train/images/India_000005.jpg")
    blurry_path = TEST_DIR / "scenario3_blurry_road.jpg"
    
    with Image.open(rdd_img_path) as im:
        blurred = im.filter(ImageFilter.GaussianBlur(radius=5))
        blurred.save(blurry_path, format="JPEG", quality=85)
    
    with open(blurry_path, "rb") as f:
        resp = requests.post(
            f"{BASE_URL}/analyze",
            files={"file": (blurry_path.name, f, "image/jpeg")},
            data={"conf_threshold": 0.25},
            timeout=30,
        )
    
    status_code = resp.status_code
    print(f"HTTP Status Code: {status_code}")
    
    if status_code != 200:
        print(f"Response: {resp.text}")
        print("RESULT: FAIL (Expected HTTP 200)")
        return False, None
    
    data = resp.json()
    rhs = data.get("road_health_score")
    cond = data.get("condition_label")
    sev = data.get("severity")
    dets = data.get("detections", [])
    
    print(f"Road Health Score: {rhs}")
    print(f"Condition Label:   {cond}")
    print(f"Severity:          {sev}")
    print(f"Detections Count:  {len(dets)}")
    
    # Assertions: Pipeline completes without error, returns valid JSON response
    passed = (
        status_code == 200
        and rhs is not None
        and cond is not None
        and sev is not None
        and isinstance(dets, list)
    )
    reason = "Pipeline completed without error and returned valid assessment JSON." if passed else "Invalid response structure."
    print(f"RESULT: {'PASS' if passed else 'FAIL'} - {reason}")
    return passed, data


def test_scenario_4_large_and_non_image():
    print("\n" + "=" * 70)
    print("SCENARIO 4: Very Large File (>10MB) & Non-Image File (.txt / .pdf)")
    print("=" * 70)
    
    # 4A. Very large file (>10MB)
    large_file_path = TEST_DIR / "dummy_large_road.jpg"
    # Write 11 MB of dummy binary data
    with open(large_file_path, "wb") as f:
        f.write(b"\xFF\xD8\xFF" + b"\x00" * (11 * 1024 * 1024))
    
    print(f"[4A] Testing File > 10MB: {large_file_path.stat().st_size / (1024 * 1024):.2f} MB")
    with open(large_file_path, "rb") as f:
        resp_large = requests.post(
            f"{BASE_URL}/analyze",
            files={"file": (large_file_path.name, f, "image/jpeg")},
            timeout=30,
        )
    
    print(f"  HTTP Status Code: {resp_large.status_code}")
    print(f"  Response Body:    {resp_large.text}")
    large_passed = (resp_large.status_code == 400)
    print(f"  Sub-result 4A:    {'PASS' if large_passed else 'FAIL'}")
    
    # 4B. Non-image .txt file
    txt_file_path = TEST_DIR / "document_report.txt"
    txt_file_path.write_text("This is an inspection report document, not an image.")
    print(f"\n[4B] Testing Non-Image .txt File: {txt_file_path.name}")
    with open(txt_file_path, "rb") as f:
        resp_txt = requests.post(
            f"{BASE_URL}/analyze",
            files={"file": (txt_file_path.name, f, "text/plain")},
            timeout=15,
        )
    print(f"  HTTP Status Code: {resp_txt.status_code}")
    print(f"  Response Body:    {resp_txt.text}")
    txt_passed = (resp_txt.status_code == 400)
    print(f"  Sub-result 4B:    {'PASS' if txt_passed else 'FAIL'}")
    
    # 4C. Non-image .pdf file
    pdf_file_path = TEST_DIR / "inspection_manual.pdf"
    pdf_file_path.write_bytes(b"%PDF-1.4\n%EOF\n")
    print(f"\n[4C] Testing Non-Image .pdf File: {pdf_file_path.name}")
    with open(pdf_file_path, "rb") as f:
        resp_pdf = requests.post(
            f"{BASE_URL}/analyze",
            files={"file": (pdf_file_path.name, f, "application/pdf")},
            timeout=15,
        )
    print(f"  HTTP Status Code: {resp_pdf.status_code}")
    print(f"  Response Body:    {resp_pdf.text}")
    pdf_passed = (resp_pdf.status_code == 400)
    print(f"  Sub-result 4C:    {'PASS' if pdf_passed else 'FAIL'}")
    
    overall_passed = large_passed and txt_passed and pdf_passed
    reason = "All invalid/oversized uploads rejected with HTTP 400 without crashing." if overall_passed else "One or more invalid uploads did not return HTTP 400."
    print(f"\nRESULT: {'PASS' if overall_passed else 'FAIL'} - {reason}")
    return overall_passed


def test_defensive_checks(created_ids):
    print("\n" + "=" * 70)
    print("DEFENSIVE CHECKS: Annotated Image on Disk & History Endpoint")
    print("=" * 70)
    
    # 1. Check if annotated image exists on disk even for 0 detections (Scenario 1)
    clean_id = created_ids[0]
    resp = requests.get(f"{BASE_URL}/analyses/{clean_id}")
    if resp.status_code != 200:
        print(f"FAIL: Could not retrieve analysis #{clean_id}")
        disk_check = False
    else:
        clean_data = resp.json()
        annot_rel = clean_data.get("annotated_image_path")
        disk_path = Path("backend") / annot_rel.lstrip("/")
        exists = disk_path.exists()
        print(f"[Defensive 1] 0 Detections Annotated Image on Disk: {disk_path} -> Exists: {exists}")
        if exists:
            print(f"              File size: {disk_path.stat().st_size} bytes")
        disk_check = exists
    
    # 2. Check history endpoint returns all created records correctly
    resp_hist = requests.get(f"{BASE_URL}/history?limit=50")
    if resp_hist.status_code != 200:
        print(f"FAIL: History endpoint returned {resp_hist.status_code}")
        history_check = False
    else:
        history_records = resp_hist.json()
        history_ids = [r["id"] for r in history_records]
        print(f"[Defensive 2] History Endpoint Records Found: {len(history_records)}")
        print(f"              Looking for created test IDs: {created_ids}")
        all_found = all(cid in history_ids for cid in created_ids)
        print(f"              All {len(created_ids)} created test records present in history: {all_found}")
        history_check = all_found
    
    # 3. Frontend Zero Damage Detected confirmation
    print("[Defensive 3] Frontend Zero Damage UI Check:")
    frontend_results_path = Path("frontend/src/pages/ResultsPage.jsx")
    with open(frontend_results_path, "r", encoding="utf-8") as f:
        src = f.read()
    has_zero_damage_ui = "Zero Damage Detected" in src
    print(f"              ResultsPage.jsx renders 'Zero Damage Detected' banner: {has_zero_damage_ui}")
    
    overall = disk_check and history_check and has_zero_damage_ui
    print(f"\nDEFENSIVE CHECKS RESULT: {'PASS' if overall else 'FAIL'}")
    return overall


def main():
    print("*" * 70)
    print("ROAD HEALTH AI - COMPREHENSIVE INTEGRATION TEST SUITE")
    print("*" * 70)
    
    created_ids = []
    results = {}
    
    # Scenario 1
    p1, d1 = test_scenario_1_clean_road()
    results["Scenario 1 (Clean Road)"] = p1
    if d1:
        created_ids.append(d1["id"])
    
    # Scenario 2
    p2, d2 = test_scenario_2_damaged_road()
    results["Scenario 2 (Damaged Road)"] = p2
    if d2:
        created_ids.append(d2["id"])
        
    # Scenario 2b (Second Damaged Road for robust history set)
    p2b, d2b = test_scenario_2b_damaged_road_second()
    results["Scenario 2b (Damaged Road 2)"] = p2b
    if d2b:
        created_ids.append(d2b["id"])
    
    # Scenario 3
    p3, d3 = test_scenario_3_blurry_image()
    results["Scenario 3 (Blurry Road)"] = p3
    if d3:
        created_ids.append(d3["id"])
    
    # Scenario 4
    p4 = test_scenario_4_large_and_non_image()
    results["Scenario 4 (Large & Invalid File)"] = p4
    
    # Defensive checks
    p_def = test_defensive_checks(created_ids)
    results["Defensive Checks (Disk & History)"] = p_def
    
    # Summary
    print("\n" + "=" * 70)
    print("FINAL INTEGRATION TEST SUMMARY")
    print("=" * 70)
    all_passed = True
    for scenario, passed in results.items():
        status_str = "PASS [OK]" if passed else "FAIL [X]"
        print(f"  {scenario:<40}: {status_str}")
        if not passed:
            all_passed = False
            
    print("-" * 70)
    print(f"OVERALL STATUS: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")
    print("=" * 70)
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
