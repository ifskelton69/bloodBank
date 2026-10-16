import json
from app import app
from db import get_db_connection

def test_full_suite():
    client = app.test_client()

    print("\n--- Test 1: Admin Login with romitchavan0192@gmail.com ---")
    res = client.post("/api/auth/login", json={
        "email": "romitchavan0192@gmail.com",
        "password": "romit@123"
    })
    assert res.status_code == 200, res.data
    data = res.get_json()
    assert "token" in data
    token1 = data["token"]
    assert data["admin"]["email"] == "romitchavan0192@gmail.com"
    print("[PASS] Permitted admin 1 logged in successfully")

    print("\n--- Test 2: Admin Login with rcsketch02@gmail.com ---")
    res = client.post("/api/auth/login", json={
        "email": "rcsketch02@gmail.com",
        "password": "romitsketch@012"
    })
    assert res.status_code == 200, res.data
    data = res.get_json()
    assert "token" in data
    token2 = data["token"]
    assert data["admin"]["email"] == "rcsketch02@gmail.com"
    print("[PASS] Permitted admin 2 logged in successfully")

    print("\n--- Test 3: Unauthorized email login attempt ---")
    res = client.post("/api/auth/login", json={
        "email": "intruder@example.com",
        "password": "romit@123"
    })
    assert res.status_code == 403, res.data
    print("[PASS] Unauthorized email correctly rejected with 403")

    print("\n--- Test 4: Wrong password ---")
    res = client.post("/api/auth/login", json={
        "email": "romitchavan0192@gmail.com",
        "password": "wrongpassword"
    })
    assert res.status_code == 401, res.data
    print("[PASS] Wrong password rejected with 401")

    print("\n--- Test 5: Verify Auth Me & Protected Endpoints ---")
    headers = {"Authorization": f"Bearer {token1}"}
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200
    assert res.get_json()["admin"]["email"] == "romitchavan0192@gmail.com"

    # Without token
    res = client.get("/api/auth/me")
    assert res.status_code == 401
    print("[PASS] Protected route successfully verified")

    print("\n--- Test 6: Blood Unit Validation ---")
    # Invalid quantity
    res = client.post("/api/blood-units", headers=headers, json={
        "Blood_Type": "O+",
        "Quantity": 0,
        "Collection_Date": "2026-10-15",
        "Expiration_Date": "2026-11-26"
    })
    assert res.status_code == 400
    # Invalid dates (expiration < collection)
    res = client.post("/api/blood-units", headers=headers, json={
        "Blood_Type": "O+",
        "Quantity": 10,
        "Collection_Date": "2026-10-15",
        "Expiration_Date": "2026-10-10"
    })
    assert res.status_code == 400
    print("[PASS] Blood unit validation passed")

    print("\n--- Test 7: Add, Edit, Delete Blood Unit & Status Locking ---")
    # 7a: Create unit with Pending status
    res = client.post("/api/blood-units", headers=headers, json={
        "Blood_Type": "AB+",
        "Quantity": 15,
        "Collection_Date": "2026-10-15",
        "Expiration_Date": "2026-11-26",
        "Testing_Status": "Pending"
    })
    assert res.status_code == 201
    created_unit = res.get_json()
    unit_id_pending = created_unit["Unit_ID"]
    assert created_unit["Testing_Status"] == "Pending"

    # Pending -> Failed is allowed
    res = client.patch(f"/api/blood-units/{unit_id_pending}/status", headers=headers, json={
        "Testing_Status": "Failed"
    })
    assert res.status_code == 200
    assert res.get_json()["Testing_Status"] == "Failed"

    # Failed -> Passed is blocked
    res = client.patch(f"/api/blood-units/{unit_id_pending}/status", headers=headers, json={
        "Testing_Status": "Passed"
    })
    assert res.status_code == 400
    assert "locked" in res.get_json()["error"]
    print("[PASS] Pending to Failed allowed, Failed to Passed correctly blocked")

    # Clean up pending/failed unit
    res = client.delete(f"/api/blood-units/{unit_id_pending}", headers=headers)
    assert res.status_code == 200

    # 7b: Create unit with Passed status
    res = client.post("/api/blood-units", headers=headers, json={
        "Blood_Type": "AB+",
        "Quantity": 15,
        "Collection_Date": "2026-10-15",
        "Expiration_Date": "2026-11-26",
        "Testing_Status": "Passed"
    })
    assert res.status_code == 201
    passed_unit_id = res.get_json()["Unit_ID"]

    # Edit metadata while keeping Passed status is allowed
    res = client.put(f"/api/blood-units/{passed_unit_id}", headers=headers, json={
        "Blood_Type": "AB+",
        "Quantity": 20,
        "Collection_Date": "2026-10-15",
        "Expiration_Date": "2026-11-26",
        "Testing_Status": "Passed"
    })
    assert res.status_code == 200
    assert res.get_json()["Quantity"] == 20

    # Requirement 1: When status is Passed, changing status via PATCH is LOCKED
    res = client.patch(f"/api/blood-units/{passed_unit_id}/status", headers=headers, json={
        "Testing_Status": "Failed"
    })
    assert res.status_code == 400
    assert "Testing status is locked" in res.get_json()["error"]

    res = client.patch(f"/api/blood-units/{passed_unit_id}/status", headers=headers, json={
        "Testing_Status": "Pending"
    })
    assert res.status_code == 400
    assert "Testing status is locked" in res.get_json()["error"]

    # Changing status via PUT is also LOCKED
    res = client.put(f"/api/blood-units/{passed_unit_id}", headers=headers, json={
        "Blood_Type": "AB+",
        "Quantity": 20,
        "Collection_Date": "2026-10-15",
        "Expiration_Date": "2026-11-26",
        "Testing_Status": "Failed"
    })
    assert res.status_code == 400
    assert "Testing status is locked" in res.get_json()["error"]
    print("[PASS] Passed unit status locking enforced in both PATCH and PUT APIs")

    # Clean up passed unit
    res = client.delete(f"/api/blood-units/{passed_unit_id}", headers=headers)
    assert res.status_code == 200
    print("[PASS] Blood unit add, edit, lock and delete lifecycle verified")

    print("\n--- Test 8: Hospital Request Shortage & Approval Deduction ---")
    # Add a fresh test blood unit: 5 units of B-
    res = client.post("/api/blood-units", headers=headers, json={
        "Blood_Type": "B-",
        "Quantity": 5,
        "Collection_Date": "2026-10-15",
        "Expiration_Date": "2026-11-26",
        "Testing_Status": "Passed"
    })
    assert res.status_code == 201
    b_minus_unit_id = res.get_json()["Unit_ID"]

    # Create a request for 10 units of B- (Shortage case!)
    res = client.post("/api/requests", headers=headers, json={
        "Needed_Blood_Type": "B-",
        "Qty_Requested": 10,
        "Urgency_Level": "High",
        "Hospital_ID": 1
    })
    assert res.status_code == 201
    req_shortage_id = res.get_json()["Request_ID"]

    # Try approving with shortage: should fail with 400
    res = client.put(f"/api/requests/{req_shortage_id}/status", headers=headers, json={
        "status": "Approved"
    })
    assert res.status_code == 400, res.data
    err_msg = res.get_json()["error"]
    assert "Insufficient inventory" in err_msg
    print(f"[PASS] Shortage correctly blocked approval: {err_msg}")

    # Create a request for 3 units of B- (Sufficient stock case: 5 available, 3 requested)
    res = client.post("/api/requests", headers=headers, json={
        "Needed_Blood_Type": "B-",
        "Qty_Requested": 3,
        "Urgency_Level": "Normal",
        "Hospital_ID": 1
    })
    assert res.status_code == 201
    req_success_id = res.get_json()["Request_ID"]

    # Approve request
    res = client.put(f"/api/requests/{req_success_id}/status", headers=headers, json={
        "status": "Approved"
    })
    assert res.status_code == 200
    assert res.get_json()["Status"] == "Approved"
    print("[PASS] Request successfully approved with inventory deduction")

    # Verify inventory was deducted: 5 - 3 = 2
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT Quantity FROM BLOOD_UNIT WHERE Unit_ID = %s", (b_minus_unit_id,))
    rem_qty = cur.fetchone()["Quantity"]
    assert rem_qty == 2, f"Expected 2 remaining units, got {rem_qty}"
    print(f"[PASS] Inventory verified in MySQL: remaining stock is exactly {rem_qty} units")

    # Try re-approving the same request (Duplicate deduction test)
    res = client.put(f"/api/requests/{req_success_id}/status", headers=headers, json={
        "status": "Approved"
    })
    # Should block duplicate approval
    cur.execute("SELECT Quantity FROM BLOOD_UNIT WHERE Unit_ID = %s", (b_minus_unit_id,))
    assert cur.fetchone()["Quantity"] == 2
    print("[PASS] Duplicate approval prevented duplicate inventory deduction")

    # Clean up test blood unit and requests
    cur.execute("DELETE FROM HOSPITAL_REQUEST WHERE Request_ID IN (%s, %s)", (req_shortage_id, req_success_id))
    cur.execute("DELETE FROM requires WHERE Unit_ID = %s", (b_minus_unit_id,))
    cur.execute("DELETE FROM is_stored_in WHERE Unit_ID = %s", (b_minus_unit_id,))
    cur.execute("DELETE FROM gives WHERE Unit_ID = %s", (b_minus_unit_id,))
    cur.execute("DELETE FROM BLOOD_UNIT WHERE Unit_ID = %s", (b_minus_unit_id,))
    conn.commit()
    cur.close()
    conn.close()

    print("\n--- Test 9: Hospital Safe Restriction & Deletion ---")
    # Attempt to delete hospital 1 (has requests)
    res = client.delete("/api/hospitals/1", headers=headers)
    assert res.status_code == 400
    assert "blood request" in res.get_json()["error"]
    print("[PASS] Hospital with active requests blocked from deletion")

    # Add a temporary hospital without requests
    res = client.post("/api/hospitals", headers=headers, json={
        "Name": "Temporary Test Clinic",
        "Address": "Kothrud, Pune",
        "Contact_No": "020 9999 8888"
    })
    assert res.status_code == 201
    temp_hosp_id = res.get_json()["Hospital_ID"]

    # Delete temporary hospital
    res = client.delete(f"/api/hospitals/{temp_hosp_id}", headers=headers)
    assert res.status_code == 200
    print("[PASS] Independent hospital deleted successfully")

    print("\n--- Test 10: Valid and Invalid Donation Submissions ---")
    # Invalid quantity (<= 0)
    res = client.post("/api/donations", headers=headers, json={
        "Donor_ID": 1,
        "Quantity": 0,
        "Collection_Date": "2026-10-16"
    })
    assert res.status_code == 400
    assert "quantity" in res.get_json()["error"].lower()

    # Non-existent donor
    res = client.post("/api/donations", headers=headers, json={
        "Donor_ID": 999999,
        "Quantity": 450,
        "Collection_Date": "2026-10-16"
    })
    assert res.status_code == 404
    assert "not found" in res.get_json()["error"].lower()

    # Ineligible donor test: create a donor with Eligibility_Status='Not Eligible'
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        INSERT INTO DONOR (Name, Blood_Type, DOB, Gender, Contact_No, Address, Eligibility_Status)
        VALUES ('Ineligible Test Donor', 'A+', '1995-01-01', 'Male', '9999888877', 'Pune', 'Not Eligible')
    """)
    ineligible_donor_id = cur.lastrowid
    conn.commit()

    # Attempt donation from ineligible donor
    res = client.post("/api/donations", headers=headers, json={
        "Donor_ID": ineligible_donor_id,
        "Quantity": 450,
        "Collection_Date": "2026-10-16"
    })
    assert res.status_code == 400
    assert "marked as not eligible" in res.get_json()["error"].lower()
    print("[PASS] Invalid donations (zero qty, missing donor, ineligible donor) correctly rejected with 400/404")

    # Clean up temporary ineligible donor
    cur.execute("DELETE FROM DONOR WHERE Donor_ID = %s", (ineligible_donor_id,))
    conn.commit()

    donation_date = "2026-10-16"
    # Ensure clean starting state for Test 11
    cur.execute("SELECT Unit_ID FROM gives WHERE Donor_ID = 1 AND Collection_Date = %s", (donation_date,))
    prev_units = [r["Unit_ID"] for r in cur.fetchall()]
    if prev_units:
        for p_id in prev_units:
            cur.execute("DELETE FROM is_stored_in WHERE Unit_ID = %s", (p_id,))
            cur.execute("DELETE FROM gives WHERE Unit_ID = %s", (p_id,))
            cur.execute("DELETE FROM BLOOD_UNIT WHERE Unit_ID = %s", (p_id,))
        cur.execute("""
            UPDATE DONOR d
            SET Total_Donations = (SELECT COUNT(*) FROM gives g WHERE g.Donor_ID = d.Donor_ID),
                Total_Quantity_Donated = COALESCE((SELECT SUM(Quantity) FROM gives g WHERE g.Donor_ID = d.Donor_ID), 0)
            WHERE d.Donor_ID = 1
        """)
        conn.commit()

    # Check baseline donor totals for Donor 1
    cur.execute("SELECT Total_Donations, Total_Quantity_Donated FROM DONOR WHERE Donor_ID = 1")
    donor_before = cur.fetchone()
    base_donations = donor_before["Total_Donations"]
    base_qty = donor_before["Total_Quantity_Donated"]

    # Record valid donation: 450 ml
    res = client.post("/api/donations", headers=headers, json={
        "Donor_ID": 1,
        "Quantity": 450,
        "Donation_Type": "Whole Blood",
        "Collection_Date": donation_date,
        "Bank_ID": 1
    })
    assert res.status_code == 201, res.data
    don_data = res.get_json()
    new_unit_id = don_data["Unit_ID"]
    assert don_data["Testing_Status"] == "Pending"
    assert don_data["Quantity"] == 450

    # Verify donor totals updated atomically in MySQL
    cur.execute("SELECT Total_Donations, Total_Quantity_Donated FROM DONOR WHERE Donor_ID = 1")
    donor_after = cur.fetchone()
    assert donor_after["Total_Donations"] == base_donations + 1
    assert donor_after["Total_Quantity_Donated"] == base_qty + 450

    # Verify gives table record created
    cur.execute("SELECT * FROM gives WHERE Donor_ID = 1 AND Unit_ID = %s", (new_unit_id,))
    gives_rec = cur.fetchone()
    assert gives_rec is not None
    assert gives_rec["Quantity"] == 450

    # Verify storage record
    cur.execute("SELECT * FROM is_stored_in WHERE Unit_ID = %s", (new_unit_id,))
    storage_rec = cur.fetchone()
    assert storage_rec is not None

    # Test Duplicate Prevention on the same date for the same donor
    res_dup = client.post("/api/donations", headers=headers, json={
        "Donor_ID": 1,
        "Quantity": 450,
        "Donation_Type": "Whole Blood",
        "Collection_Date": donation_date,
        "Bank_ID": 1
    })
    assert res_dup.status_code == 400
    assert "duplicate" in res_dup.get_json()["error"].lower()
    print("[PASS] Valid donation atomically updated donor & blood units; duplicate submission was blocked")

    print("\n--- Test 12: Usable Stock Exclusion for Pending/Failed Units ---")
    # Newly created unit has Testing_Status='Pending'.
    # Check that it is EXCLUDED from live available blood stock report
    res_stock = client.get("/api/reports/blood-stock")
    assert res_stock.status_code == 200
    stock_list = res_stock.get_json()
    # Find O+ stock in report
    o_plus_stock = next((s["total_quantity"] for s in stock_list if s["Blood_Type"] == "O+"), 0)

    # Transition unit from Pending -> Passed: now it MUST be included in usable stock
    res_pass = client.patch(f"/api/blood-units/{new_unit_id}/status", headers=headers, json={
        "Testing_Status": "Passed"
    })
    assert res_pass.status_code == 200

    # Check stock report again: O+ usable stock should have increased by 450
    res_stock_after = client.get("/api/reports/blood-stock")
    stock_after_list = res_stock_after.get_json()
    o_plus_stock_after = next((s["total_quantity"] for s in stock_after_list if s["Blood_Type"] == "O+"), 0)
    assert o_plus_stock_after == o_plus_stock + 450
    print("[PASS] Pending donation was excluded from usable inventory; Passed donation increased stock")

    print("\n--- Test 13: Status Locking on Passed Donation Unit ---")
    # Once Passed, status cannot be changed to Failed or Pending
    res_lock = client.patch(f"/api/blood-units/{new_unit_id}/status", headers=headers, json={
        "Testing_Status": "Failed"
    })
    assert res_lock.status_code == 400
    assert "locked" in res_lock.get_json()["error"].lower()

    res_lock_put = client.put(f"/api/blood-units/{new_unit_id}", headers=headers, json={
        "Blood_Type": "O+",
        "Quantity": 450,
        "Collection_Date": donation_date,
        "Expiration_Date": "2026-11-27",
        "Testing_Status": "Pending"
    })
    assert res_lock_put.status_code == 400
    assert "locked" in res_lock_put.get_json()["error"].lower()
    print("[PASS] Passed donation unit status is strictly locked against modification")

    print("\n--- Test 14: Donor History API Verification ---")
    res_hist = client.get("/api/donors/1/history")
    assert res_hist.status_code == 200
    hist_data = res_hist.get_json()
    assert "donor" in hist_data
    assert "history" in hist_data
    assert hist_data["donor"]["Total_Donations"] >= 1
    found_donation = any(h["Unit_ID"] == new_unit_id for h in hist_data["history"])
    assert found_donation
    print("[PASS] Donor history API returns accurate lifetime totals and donation records")

    # Clean up test donation unit and restore donor 1 totals
    res_del = client.delete(f"/api/blood-units/{new_unit_id}", headers=headers)
    assert res_del.status_code == 200
    cur.execute("SELECT Total_Donations, Total_Quantity_Donated FROM DONOR WHERE Donor_ID = 1")
    donor_cleaned = cur.fetchone()
    assert donor_cleaned["Total_Donations"] == base_donations
    assert donor_cleaned["Total_Quantity_Donated"] == base_qty
    cur.close()
    conn.close()

    print("\n--- Test 15: Logout & Token Invalidation ---")
    res = client.post("/api/auth/logout", headers=headers)
    assert res.status_code == 200

    # Token should now be rejected
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 401
    print("[PASS] Logout successfully invalidated token")

    print("\nALL BACKEND INTEGRATION TESTS PASSED!")

if __name__ == "__main__":
    test_full_suite()
