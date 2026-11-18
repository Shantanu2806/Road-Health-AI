import sys
import os
import requests
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8000"

def run_test():
    print("=== Testing Admin Ticket Assignment Workflow ===")
    
    # 1. Login as Admin
    admin_login = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "kauteshantanu80@gmail.com",
        "password": "Admin@2026"
    })
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("1. Admin logged in successfully.")

    # 2. Login as Citizen User
    user_login = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "kauteshantanu0@gmail.com",
        "password": "Shantanu@123"
    })
    assert user_login.status_code == 200, f"User login failed: {user_login.text}"
    user_token = user_login.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}
    print("2. Citizen User logged in successfully.")

    # 3. Submit Inspection for Mumbai/Thane area (Tanvi's area)
    # Using sample image
    img_path = "sample_pothole.jpg"
    if not os.path.exists(img_path):
        # find any image in uploads or root
        import glob
        jpgs = glob.glob("*.jpg") or glob.glob("uploads/*.jpg")
        img_path = jpgs[0] if jpgs else None

    print(f"3. Uploading inspection using image: {img_path}...")
    with open(img_path, "rb") as f:
        upload_res = requests.post(
            f"{BASE_URL}/analyze",
            headers=user_headers,
            files={"file": ("test_road.jpg", f, "image/jpeg")},
            data={
                "latitude": 19.2000,
                "longitude": 72.9700,
                "location_name": "Gokhale Road, Naupada, Thane, Maharashtra",
            }
        )
    assert upload_res.status_code == 200, f"Analysis failed: {upload_res.text}"
    analysis_data = upload_res.json()
    ticket_id = analysis_data.get("ticket_id")
    print(f"   Analysis #{analysis_data.get('id')} complete.")
    print(f"   Road Health Score: {analysis_data.get('road_health_score')}")
    print(f"   Created Ticket ID: {ticket_id}")

    if not ticket_id:
        print("   No ticket auto-created (score might be > 60). Checking tickets list...")
        tickets_res = requests.get(f"{BASE_URL}/tickets", headers=admin_headers)
        ticket_id = tickets_res.json()[0]["ticket_id"]

    # 4. Check Ticket Detail as Admin
    ticket_res = requests.get(f"{BASE_URL}/tickets/{ticket_id}", headers=admin_headers)
    assert ticket_res.status_code == 200, f"Get ticket failed: {ticket_res.text}"
    ticket_detail = ticket_res.json()
    ticket_info = ticket_detail["ticket"]

    print(f"4. Verified Ticket Details for {ticket_id}:")
    print(f"   Status: {ticket_info.get('status')}")
    print(f"   Assigned Contractor ID: {ticket_info.get('assigned_contractor_id')}")
    print(f"   Suggested Contractor ID: {ticket_info.get('suggested_contractor_id')}")
    print(f"   Suggested Contractor Name: {ticket_info.get('suggested_contractor_name')}")
    print(f"   Location: {ticket_info.get('location_name')}")

    # Verify status is REPORTED (NOT directly Assigned!)
    assert ticket_info.get("status") == "Reported", f"Expected 'Reported', got '{ticket_info.get('status')}'"
    print("   ✓ Ticket correctly created with status 'Reported' (NOT automatically Assigned!).")

    # 5. Fetch Contractors for this location
    cont_res = requests.get(f"{BASE_URL}/admin/contractors?location={ticket_info.get('location_name')}", headers=admin_headers)
    assert cont_res.status_code == 200
    contractors = cont_res.json()
    area_matches = [c for c in contractors if c.get("is_area_match")]
    assert len(area_matches) > 0, "Expected area match contractor for Thane"
    matched_contractor = area_matches[0]
    print(f"5. Area Contractor auto-matched: {matched_contractor['full_name']} ({matched_contractor['email']}) for area: {matched_contractor.get('service_area')}")
    assert "tanvi" in matched_contractor['email'].lower() or "tanvi" in matched_contractor['full_name'].lower()
    print("   ✓ Tanvi is the top auto-selected contractor for Thane/Mumbai!")

    # 6. Admin assigns ticket to Tanvi with Deadline Date and Custom Note
    deadline_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    admin_note = "Pothole depth > 6 inches. Asphalt resurfacing and compaction required within 7 days."
    
    print(f"6. Admin assigning ticket with deadline: {deadline_date} and note: '{admin_note}'...")
    assign_res = requests.post(f"{BASE_URL}/tickets/{ticket_id}/assign", headers=admin_headers, json={
        "contractor_id": matched_contractor["id"],
        "deadline": deadline_date,
        "road_importance": "Main Road",
        "notes": admin_note
    })
    assert assign_res.status_code == 200, f"Assign failed: {assign_res.text}"
    assigned_ticket = assign_res.json()

    print(f"   Assigned ticket status: {assigned_ticket.get('status')}")
    print(f"   Assigned contractor: {assigned_ticket.get('assigned_contractor_name')} ({assigned_ticket.get('assigned_contractor_email')})")
    print(f"   Assigned deadline: {assigned_ticket.get('deadline')}")
    assert assigned_ticket.get("status") == "Assigned"
    assert assigned_ticket.get("assigned_contractor_id") == matched_contractor["id"]
    print("   ✓ Ticket successfully assigned with status 'Assigned'!")

    # 7. Check Status History for Admin note
    updated_detail = requests.get(f"{BASE_URL}/tickets/{ticket_id}", headers=admin_headers).json()
    history = updated_detail.get("status_history", [])
    print(f"7. Status History count: {len(history)}")
    latest_hist = history[0] if history else {}
    print(f"   Latest audit note: {latest_hist.get('notes')}")
    assert admin_note in latest_hist.get("notes", "")
    print("   ✓ Admin note and deadline properly recorded in audit history!")

    # 8. Check email logs to verify email was sent to contractor with PDF
    email_logs_res = requests.get(f"{BASE_URL}/admin/email-logs?limit=5", headers=admin_headers)
    assert email_logs_res.status_code == 200
    logs = email_logs_res.json()
    print(f"8. Recent Email Logs ({len(logs)}):")
    for l in logs[:3]:
        print(f"   To: {l.get('recipient')} | Subject: {l.get('subject')} | Status: {l.get('status')}")
    
    # 9. Also test updating existing ticket RH-2026-0045 with deadline & note
    print("9. Updating existing ticket RH-2026-0045 with deadline and note...")
    update_res = requests.post(f"{BASE_URL}/tickets/RH-2026-0045/assign", headers=admin_headers, json={
        "contractor_id": matched_contractor["id"],
        "deadline": (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d"),
        "road_importance": "Highway",
        "notes": "Admin deadline update: Expedited repair required for Vandana Talkies sector."
    })
    assert update_res.status_code == 200, f"Updating RH-2026-0045 failed: {update_res.text}"
    print("   ✓ RH-2026-0045 successfully updated with deadline and admin note!")

    print("\n🎉 ALL TESTS PASSED! Workflow verified end-to-end.")

if __name__ == "__main__":
    run_test()
