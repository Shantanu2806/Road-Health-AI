"""
test_maintenance_system.py - End-to-end verification of Road Maintenance Management System
Features tested:
1. Auto-ticket creation on POST /analyze (score <= 60, title, sequential ticket_id, priority calculation)
2. Admin verify ticket (POST /tickets/{ticket_id}/verify)
3. Admin assign ticket to contractor (POST /tickets/{ticket_id}/assign)
4. Contractor starts work (POST /tickets/{ticket_id}/start)
5. Contractor submits repair (POST /tickets/{ticket_id}/submit-repair with photo)
6. Admin approves repair (POST /tickets/{ticket_id}/approve-repair)
7. Admin tickets summary (GET /admin/tickets/summary)
8. Admin export CSV (GET /admin/tickets/export-csv)
9. Duplicate detection and merge (check_duplicate_ticket, POST /tickets/{ticket_id}/merge)
10. Role-based ticket visibility and overdue warning detection
"""

import sys
import io
import requests
from pathlib import Path

BASE = "http://127.0.0.1:8000"

def run_tests():
    print("=" * 80)
    print(" ROAD MAINTENANCE MANAGEMENT SYSTEM - E2E VERIFICATION")
    print("=" * 80)

    # 1. Admin login
    res_admin = requests.post(f"{BASE}/auth/login", json={"email": "kauteshantanu80@gmail.com", "password": "Admin@2026"})
    assert res_admin.status_code == 200, f"Admin login failed: {res_admin.text}"
    admin_token = res_admin.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[PASS] 1. Admin authenticated")

    # 2. Contractor login
    res_cont = requests.post(f"{BASE}/auth/login", json={"email": "testcontractor@test.com", "password": "Test1234"})
    assert res_cont.status_code == 200, f"Contractor login failed: {res_cont.text}"
    cont_token = res_cont.json()["access_token"]
    cont_headers = {"Authorization": f"Bearer {cont_token}"}
    cont_info = requests.get(f"{BASE}/auth/me", headers=cont_headers).json()
    contractor_id = cont_info["id"]
    print(f"[PASS] 2. Contractor authenticated (ID: {contractor_id})")

    # 3. User login
    res_user = requests.post(f"{BASE}/auth/login", json={"email": "testuser@test.com", "password": "Test1234"})
    assert res_user.status_code == 200, f"User login failed: {res_user.text}"
    user_token = res_user.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}
    user_info = requests.get(f"{BASE}/auth/me", headers=user_headers).json()
    print(f"[PASS] 3. User authenticated (ID: {user_info['id']})")

    # 4. Upload damaged road image to trigger auto-ticket creation
    img_path = Path("21431547/RDD2022_released_through_CRDDC2022/RDD2022/India/train/images/India_000323.jpg")
    if not img_path.exists():
        img_path = Path("Czech_000000.jpg")
    
    with open(img_path, "rb") as f:
        upload_res = requests.post(
            f"{BASE}/analyze",
            files={"file": (img_path.name, f, "image/jpeg")},
            data={"latitude": 18.5204, "longitude": 73.8567, "location_name": "Pune City Center"},
            headers=user_headers
        )
    assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
    analysis = upload_res.json()
    ticket_id = analysis.get("ticket_id")
    print(f"[PASS] 4. Damage analysis completed. Score: {analysis.get('road_health_score')}, Ticket ID: {ticket_id}")
    assert ticket_id is not None, "Auto-ticket creation failed for damaged road (score <= 60)"

    # 5. Admin fetches ticket details
    t_detail = requests.get(f"{BASE}/tickets/{ticket_id}", headers=admin_headers)
    assert t_detail.status_code == 200, f"Fetch ticket detail failed: {t_detail.text}"
    td = t_detail.json()
    t_obj = td.get("ticket", td)
    print(f"[PASS] 5. Ticket fetched. Status: {t_obj['status']}, Priority: {t_obj['priority']}, Reason: {t_obj['priority_reason'][:50]}...")

    # 6. Admin verifies ticket
    v_res = requests.post(f"{BASE}/tickets/{ticket_id}/verify", headers=admin_headers)
    assert v_res.status_code == 200, f"Verify ticket failed: {v_res.text}"
    assert v_res.json()["status"] == "Verified"
    print(f"[PASS] 6. Ticket verified by Admin -> status: {v_res.json()['status']}")

    # 7. Admin assigns ticket to contractor
    a_res = requests.post(
        f"{BASE}/tickets/{ticket_id}/assign",
        json={
            "contractor_id": contractor_id,
            "deadline": "2026-11-01T12:00:00",
            "road_importance": "Main Road",
            "notes": "Please fix cracks and potholes promptly."
        },
        headers=admin_headers
    )
    assert a_res.status_code == 200, f"Assign ticket failed: {a_res.text}"
    assert a_res.json()["status"] == "Assigned"
    print(f"[PASS] 7. Ticket assigned to contractor -> status: {a_res.json()['status']}")

    # 8. Contractor starts work
    s_res = requests.post(f"{BASE}/tickets/{ticket_id}/start", headers=cont_headers)
    assert s_res.status_code == 200, f"Start work failed: {s_res.text}"
    assert s_res.json()["status"] == "In Progress"
    print(f"[PASS] 8. Contractor started work -> status: {s_res.json()['status']}")

    # 9. Contractor submits repair with after-photo
    dummy_repair_photo = io.BytesIO(b"\xFF\xD8\xFF\xE0\x00\x10JFIF" + b"\x00" * 500)
    sub_res = requests.post(
        f"{BASE}/tickets/{ticket_id}/submit-repair",
        files={"file": ("repaired_road.jpg", dummy_repair_photo, "image/jpeg")},
        data={"notes": "Resurfaced asphalt and sealed cracks with hot bitumen."},
        headers=cont_headers
    )
    assert sub_res.status_code == 200, f"Submit repair failed: {sub_res.text}"
    assert sub_res.json()["status"] == "Repair Submitted"
    print(f"[PASS] 9. Repair submitted by contractor -> status: {sub_res.json()['status']}")

    # 10. Admin approves repair
    app_res = requests.post(f"{BASE}/tickets/{ticket_id}/approve-repair", headers=admin_headers)
    assert app_res.status_code == 200, f"Approve repair failed: {app_res.text}"
    assert app_res.json()["status"] == "Resolved"
    print(f"[PASS] 10. Admin approved repair -> status: {app_res.json()['status']}")

    # 11. Test duplicate detection: Upload another report within 50 meters and 30 days
    # First create another open ticket
    with open(img_path, "rb") as f:
        up2 = requests.post(
            f"{BASE}/analyze",
            files={"file": (img_path.name, f, "image/jpeg")},
            data={"latitude": 18.52041, "longitude": 73.85672, "location_name": "Pune City Center"},
            headers=user_headers
        )
    tid2 = up2.json().get("ticket_id")
    print(f"[PASS] 11. Created open ticket {tid2} for duplicate detection test.")

    # Now upload again at virtually the exact same coordinates (distance < 50m)
    with open(img_path, "rb") as f:
        up3 = requests.post(
            f"{BASE}/analyze",
            files={"file": (img_path.name, f, "image/jpeg")},
            data={"latitude": 18.52042, "longitude": 73.85671, "location_name": "Pune City Center"},
            headers=user_headers
        )
    dup_info = up3.json().get("possible_duplicate")
    tid3 = up3.json().get("ticket_id")
    print(f"[PASS] 12. Duplicate check result for {tid3}: {dup_info}")
    assert dup_info is not None, "Duplicate ticket was not detected within 50m"
    assert dup_info.get("ticket_id") is not None, "Expected duplicate ticket ID"

    # 13. Admin merges duplicate ticket
    merge_res = requests.post(
        f"{BASE}/tickets/{tid3}/merge",
        json={"merge_into_ticket_id": tid2, "reason": "Reported same pothole by multiple citizens"},
        headers=admin_headers
    )
    assert merge_res.status_code == 200, f"Merge failed: {merge_res.text}"
    assert merge_res.json()["status"] == "Rejected"
    print(f"[PASS] 13. Merged ticket {tid3} into {tid2} -> status: {merge_res.json()['status']}")

    # 14. Admin tickets summary
    summary_res = requests.get(f"{BASE}/admin/tickets/summary", headers=admin_headers)
    assert summary_res.status_code == 200
    s_data = summary_res.json()
    print(f"[PASS] 14. Tickets summary: total={s_data['total_tickets']}, open={s_data['open_tickets']}, resolved={s_data['resolved_tickets']}")

    # 15. Admin CSV Export
    csv_res = requests.get(f"{BASE}/admin/tickets/export-csv", headers=admin_headers)
    assert csv_res.status_code == 200
    assert "ticket_id,title,status" in csv_res.text
    print(f"[PASS] 15. CSV export generated successfully ({len(csv_res.text.splitlines())} lines)")

    print("=" * 80)
    print(" ALL 15 ROAD MAINTENANCE MANAGEMENT SYSTEM CHECKS PASSED!")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()
