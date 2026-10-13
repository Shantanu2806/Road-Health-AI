"""
test_api.py - Integration test for FastAPI endpoints
"""

from pathlib import Path
from PIL import Image
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_api_pipeline():
    # 1. Health check
    resp = client.get("/health")
    print("[1] GET /health ->", resp.status_code, resp.json())
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"

    # 2. Analyze damaged road image
    sample_img = Path("../21431547/RDD2022_released_through_CRDDC2022/RDD2022/Czech/train/images/Czech_000000.jpg")
    if not sample_img.is_file():
        # Fallback dummy image if path not found
        sample_img = Path("static/uploads/dummy_sample.jpg")
        Image.new("RGB", (640, 640), color=(100, 100, 100)).save(sample_img)

    with open(sample_img, "rb") as f:
        files = {"file": ("road_surface.jpg", f, "image/jpeg")}
        data = {"conf_threshold": "0.40"}
        analyze_resp = client.post("/analyze", files=files, data=data)

    print("[2] POST /analyze ->", analyze_resp.status_code)
    assert analyze_resp.status_code == 200
    result = analyze_resp.json()
    print("    - ID:", result["id"])
    print("    - Damage Index (DI):", result["damage_index"])
    print("    - Coverage %:", result["coverage_pct"])
    print("    - Severity:", result["severity"])
    print("    - Road Health Score:", result["road_health_score"])
    print("    - Condition Label:", result["condition_label"])
    print("    - Detections Count:", len(result["detections"]))
    print("    - Annotated URL:", result["annotated_image_url"])

    assert result["road_health_score"] >= 0.0 and result["road_health_score"] <= 100.0
    assert result["severity"] in ["Low", "Medium", "High"]
    assert result["condition_label"] in ["Good", "Fair", "Poor", "Critical"]

    # Verify that annotated file was created on disk
    annot_file = Path(result["annotated_image_path"])
    assert annot_file.is_file(), f"Annotated image file not found: {annot_file}"

    # 3. Test clean road (0 detections) graceful handling
    clean_img_path = Path("static/uploads/clean_test_road.jpg")
    Image.new("RGB", (600, 600), color=(120, 120, 120)).save(clean_img_path)

    with open(clean_img_path, "rb") as f:
        files = {"file": ("clean_road.jpg", f, "image/jpeg")}
        clean_resp = client.post("/analyze", files=files)

    print("[3] POST /analyze (Clean Road) ->", clean_resp.status_code)
    assert clean_resp.status_code == 200
    clean_data = clean_resp.json()
    print("    - Clean Road Score:", clean_data["road_health_score"])
    print("    - Clean Road Condition:", clean_data["condition_label"])
    assert clean_data["road_health_score"] == 100.0
    assert clean_data["condition_label"] == "Good"
    assert len(clean_data["detections"]) == 0

    # 4. History endpoint
    hist_resp = client.get("/history")
    print("[4] GET /history ->", hist_resp.status_code, f"({len(hist_resp.json())} records returned)")
    assert hist_resp.status_code == 200
    records = hist_resp.json()
    assert len(records) >= 2

    # 5. Fetch single record
    single_resp = client.get(f"/analyses/{result['id']}")
    print("[5] GET /analyses/{id} ->", single_resp.status_code)
    assert single_resp.status_code == 200
    assert single_resp.json()["id"] == result["id"]

    print("\n[SUCCESS] All FastAPI integration tests passed seamlessly!")


if __name__ == "__main__":
    test_api_pipeline()
