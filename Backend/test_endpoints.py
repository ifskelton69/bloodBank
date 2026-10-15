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
        "password": "romit@123"
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

    print("\n--- Test 7: Add, Edit, Delete Blood Unit ---")
    res = client.post("/api/blood-units", headers=headers, json={
        "Blood_Type": "AB+",
        "Quantity": 15,
        "Collection_Date": "2026-10-15",
        "Expiration_Date": "2026-11-26",
        "Testing_Status": "Passed"
    })
    assert res.status_code == 201
    created_unit = res.get_json()
    unit_id = created_unit["Unit_ID"]
    assert created_unit["Quantity"] == 15

    # Edit
    res = client.put(f"/api/blood-units/{unit_id}", headers=headers, json={
        "Blood_Type": "AB+",
        "Quantity": 20,
        "Collection_Date": "2026-10-15",
        "Expiration_Date": "2026-11-26",
        "Testing_Status": "Passed"
    })
    assert res.status_code == 200
    assert res.get_json()["Quantity"] == 20

    # Quick testing status update
    res = client.patch(f"/api/blood-units/{unit_id}/status", headers=headers, json={
        "Testing_Status": "Failed"
    })
    assert res.status_code == 200
    assert res.get_json()["Testing_Status"] == "Failed"

    # Delete
    res = client.delete(f"/api/blood-units/{unit_id}", headers=headers)
    assert res.status_code == 200
    print("[PASS] Blood unit add, edit, and delete lifecycle verified")

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

    print("\n--- Test 10: Logout & Token Invalidation ---")
    res = client.post("/api/auth/logout", headers=headers)
    assert res.status_code == 200

    # Token should now be rejected
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 401
    print("[PASS] Logout successfully invalidated token")

    print("\nALL BACKEND INTEGRATION TESTS PASSED!")

if __name__ == "__main__":
    test_full_suite()
