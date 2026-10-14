import datetime
from decimal import Decimal
from flask import Flask, jsonify, request
from flask_cors import CORS
from db import get_db_connection

app = Flask(__name__)

# Allow React frontend to communicate with Flask
CORS(app)


def serialize_item(item):
    """Serialize datetime and Decimal objects for JSON responses."""
    if isinstance(item, dict):
        return {k: serialize_item(v) for k, v in item.items()}
    elif isinstance(item, list):
        return [serialize_item(v) for v in item]
    elif isinstance(item, (datetime.date, datetime.datetime)):
        return item.strftime("%Y-%m-%d")
    elif isinstance(item, Decimal):
        return int(item) if item % 1 == 0 else float(item)
    return item


@app.route("/")
def home():
    return jsonify({"message": "Blood Bank API is running", "status": "online"})


# -----------------------------------------
# DONORS
# -----------------------------------------

@app.route("/api/donors", methods=["GET"])
def get_donors():
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM DONOR ORDER BY Donor_ID DESC")
        donors = cursor.fetchall()
        return jsonify(serialize_item(donors))
    except Exception as e:
        app.logger.exception("Failed to fetch donors")
        return jsonify({"error": f"Failed to fetch donors: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/api/newdonor", methods=["POST"])
@app.route("/api/donors", methods=["POST"])
def add_donor():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body must contain JSON"}), 400

    required_fields = ["Name", "Blood_Type", "Contact_No"]
    missing_fields = [field for field in required_fields if not data.get(field)]

    if missing_fields:
        return (
            jsonify({"error": "Missing required fields", "fields": missing_fields}),
            400,
        )

    name = data.get("Name", "").strip()
    address = data.get("Address", "Not Provided").strip()
    blood_type = data.get("Blood_Type", "").strip().upper()
    contact_no = data.get("Contact_No", "").strip()
    dob = data.get("DOB") or "2000-01-01"
    gender = data.get("Gender", "Other")
    eligibility_status = data.get("Eligibility_Status", "Eligible")

    valid_blood_types = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}
    if blood_type not in valid_blood_types:
        return jsonify({"error": "Invalid blood type"}), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO DONOR
                (Name, Address, Blood_Type, Contact_No, DOB, Gender, Eligibility_Status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (name, address, blood_type, contact_no, dob, gender, eligibility_status),
        )

        donor_id = cursor.lastrowid
        connection.commit()

        return (
            jsonify({
                "message": "Donor registered successfully",
                "Donor_ID": donor_id,
                "Name": name,
                "Blood_Type": blood_type,
            }),
            201,
        )

    except Exception as e:
        if connection:
            connection.rollback()
        app.logger.exception("Failed to register donor")
        return jsonify({"error": f"Failed to register donor: {str(e)}"}), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# -----------------------------------------
# BLOOD UNITS / INVENTORY
# -----------------------------------------

@app.route("/api/blood-units", methods=["GET"])
def get_blood_units():
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                Unit_ID,
                Blood_Type,
                Quantity,
                Collection_Date,
                Expiration_Date,
                Testing_Status,
                Donor_ID,
                Bank_ID
            FROM BLOOD_UNIT
            ORDER BY Unit_ID DESC
        """)
        units = cursor.fetchall()
        return jsonify(serialize_item(units))
    except Exception as e:
        app.logger.exception("Failed to fetch blood units")
        return jsonify({"error": f"Failed to fetch blood units: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/api/newunit", methods=["POST"])
@app.route("/api/blood-units", methods=["POST"])
def add_blood_unit():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must contain JSON"}), 400

    blood_type = data.get("Blood_Type", "").strip().upper()
    valid_blood_types = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}
    if blood_type not in valid_blood_types:
        return jsonify({"error": "Invalid blood type"}), 400

    try:
        quantity = int(data.get("Quantity", 450))
    except (ValueError, TypeError):
        return jsonify({"error": "Quantity must be a valid number"}), 400

    if quantity <= 0:
        return jsonify({"error": "Quantity must be positive"}), 400

    collection_date = data.get("Collection_Date")
    if not collection_date:
        collection_date = datetime.date.today().strftime("%Y-%m-%d")

    expiration_date = data.get("Expiration_Date")
    if not expiration_date:
        col_dt = datetime.datetime.strptime(collection_date, "%Y-%m-%d")
        expiration_date = (col_dt + datetime.timedelta(days=42)).strftime("%Y-%m-%d")

    testing_status = data.get("Testing_Status", "Passed")
    bank_id = data.get("Bank_ID")
    donor_id = data.get("Donor_ID")

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Validate or fallback Bank_ID
        if not bank_id:
            cursor.execute("SELECT Bank_ID FROM BLOOD_BANK LIMIT 1")
            first_bank = cursor.fetchone()
            bank_id = first_bank["Bank_ID"] if first_bank else 1
        else:
            bank_id = int(bank_id)

        # Validate or fallback Donor_ID (foreign key constraint)
        if not donor_id:
            cursor.execute("SELECT Donor_ID FROM DONOR LIMIT 1")
            first_donor = cursor.fetchone()
            donor_id = first_donor["Donor_ID"] if first_donor else 1
        else:
            donor_id = int(donor_id)

        cursor.execute(
            """
            INSERT INTO BLOOD_UNIT
                (Blood_Type, Quantity, Collection_Date, Expiration_Date, Testing_Status, Donor_ID, Bank_ID)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (blood_type, quantity, collection_date, expiration_date, testing_status, donor_id, bank_id),
        )

        unit_id = cursor.lastrowid
        connection.commit()

        return (
            jsonify({
                "message": "Blood unit added successfully",
                "Unit_ID": unit_id,
                "Blood_Type": blood_type,
                "Quantity": quantity,
                "Testing_Status": testing_status,
            }),
            201,
        )
    except Exception as e:
        if connection:
            connection.rollback()
        app.logger.exception("Failed to add blood unit")
        return jsonify({"error": f"Failed to add blood unit: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# -----------------------------------------
# HOSPITALS
# -----------------------------------------

@app.route("/api/hospitals", methods=["GET"])
def get_hospitals():
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM HOSPITAL ORDER BY Hospital_ID ASC")
        hospitals = cursor.fetchall()
        return jsonify(serialize_item(hospitals))
    except Exception as e:
        app.logger.exception("Failed to fetch hospitals")
        return jsonify({"error": f"Failed to fetch hospitals: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/api/newhospital", methods=["POST"])
@app.route("/api/hospitals", methods=["POST"])
def add_hospital():
    data = request.get_json()
    if not data or not data.get("Name"):
        return jsonify({"error": "Hospital name is required"}), 400

    name = data.get("Name", "").strip()
    address = data.get("Address", "Pune, Maharashtra").strip()
    contact = data.get("Contact_No", "").strip()

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            "INSERT INTO HOSPITAL (Name, Address, Contact_No) VALUES (%s, %s, %s)",
            (name, address, contact),
        )
        hospital_id = cursor.lastrowid
        connection.commit()
        return (
            jsonify({
                "message": "Hospital added successfully",
                "Hospital_ID": hospital_id,
                "Name": name,
            }),
            201,
        )
    except Exception as e:
        if connection:
            connection.rollback()
        app.logger.exception("Failed to add hospital")
        return jsonify({"error": f"Failed to add hospital: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# -----------------------------------------
# BLOOD BANKS
# -----------------------------------------

@app.route("/api/blood-banks", methods=["GET"])
@app.route("/api/banks", methods=["GET"])
def get_blood_banks():
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM BLOOD_BANK ORDER BY Bank_ID ASC")
        banks = cursor.fetchall()
        return jsonify(serialize_item(banks))
    except Exception as e:
        app.logger.exception("Failed to fetch blood banks")
        return jsonify({"error": f"Failed to fetch blood banks: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/api/newbank", methods=["POST"])
@app.route("/api/blood-banks", methods=["POST"])
@app.route("/api/banks", methods=["POST"])
def add_blood_bank():
    data = request.get_json()
    if not data or not data.get("Name"):
        return jsonify({"error": "Blood bank name is required"}), 400

    name = data.get("Name", "").strip()
    address = data.get("Address", "Pune, Maharashtra").strip()
    contact = data.get("Contact_No", "").strip()
    try:
        staff_count = int(data.get("Staff_Count", 0))
    except (ValueError, TypeError):
        staff_count = 0

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO BLOOD_BANK (Name, Address, Contact_No, Staff_Count)
            VALUES (%s, %s, %s, %s)
            """,
            (name, address, contact, staff_count),
        )
        bank_id = cursor.lastrowid
        connection.commit()
        return (
            jsonify({
                "message": "Blood bank added successfully",
                "Bank_ID": bank_id,
                "Name": name,
            }),
            201,
        )
    except Exception as e:
        if connection:
            connection.rollback()
        app.logger.exception("Failed to add blood bank")
        return jsonify({"error": f"Failed to add blood bank: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# -----------------------------------------
# BLOOD REQUESTS
# -----------------------------------------

@app.route("/api/requests", methods=["GET"])
def get_requests():
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                HR.Request_ID,
                HR.Request_Date,
                HR.Needed_Blood_Type,
                HR.Qty_Requested,
                HR.Status,
                HR.Urgency_Level,
                HR.Hospital_ID,
                COALESCE(H.Name, 'General Hospital') AS Hospital_Name
            FROM HOSPITAL_REQUEST HR
            LEFT JOIN HOSPITAL H
                ON HR.Hospital_ID = H.Hospital_ID
            ORDER BY HR.Request_ID DESC
        """)
        requests_list = cursor.fetchall()
        return jsonify(serialize_item(requests_list))
    except Exception as e:
        app.logger.exception("Failed to fetch requests")
        return jsonify({"error": f"Failed to fetch requests: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/api/newrequest", methods=["POST"])
@app.route("/api/requests", methods=["POST"])
def create_blood_request():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body must contain JSON"}), 400

    required_fields = ["Needed_Blood_Type", "Qty_Requested"]
    missing_fields = [
        field for field in required_fields
        if data.get(field) is None or data.get(field) == ""
    ]

    if missing_fields:
        return jsonify({
            "error": "Missing required fields",
            "fields": missing_fields,
        }), 400

    blood_type = data["Needed_Blood_Type"].strip().upper()
    valid_blood_types = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}
    if blood_type not in valid_blood_types:
        return jsonify({"error": "Invalid blood group"}), 400

    try:
        quantity = int(data["Qty_Requested"])
    except (ValueError, TypeError):
        return jsonify({"error": "Quantity must be an integer"}), 400

    if quantity <= 0:
        return jsonify({"error": "Quantity must be positive"}), 400

    urgency = data.get("Urgency_Level", "Normal")
    if urgency not in {"Low", "Medium", "High", "Critical", "Normal", "Emergency"}:
        urgency = "Normal"

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        hospital_id = data.get("Hospital_ID")
        if not hospital_id:
            cursor.execute("SELECT Hospital_ID FROM HOSPITAL LIMIT 1")
            first_hosp = cursor.fetchone()
            hospital_id = first_hosp["Hospital_ID"] if first_hosp else 1
        else:
            hospital_id = int(hospital_id)

        cursor.execute(
            """
            INSERT INTO HOSPITAL_REQUEST
                (Request_Date, Needed_Blood_Type, Qty_Requested,
                 Status, Urgency_Level, Hospital_ID)
            VALUES (CURDATE(), %s, %s, %s, %s, %s)
            """,
            (blood_type, quantity, "Pending", urgency, hospital_id),
        )

        request_id = cursor.lastrowid
        connection.commit()

        return jsonify({
            "message": "Blood request submitted successfully",
            "Request_ID": request_id,
            "Needed_Blood_Type": blood_type,
            "Qty_Requested": quantity,
            "Status": "Pending",
        }), 201

    except Exception as e:
        if connection:
            connection.rollback()
        app.logger.exception("Failed to create blood request")
        return jsonify({"error": f"Failed to submit blood request: {str(e)}"}), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# -----------------------------------------
# REPORTS
# -----------------------------------------

@app.route("/api/reports/blood-stock", methods=["GET"])
@app.route("/api/reports/stock", methods=["GET"])
def get_blood_stock_report():
    """
    Returns live verified blood stock:
    Grouped by blood type, including only passed and unexpired units.
    """
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                Blood_Type,
                CAST(SUM(Quantity) AS UNSIGNED) AS total_quantity,
                COUNT(*) AS unit_count,
                MIN(Expiration_Date) AS earliest_expiry,
                MAX(Expiration_Date) AS latest_expiry
            FROM BLOOD_UNIT
            WHERE Testing_Status = 'Passed'
              AND Expiration_Date >= CURDATE()
            GROUP BY Blood_Type
            ORDER BY Blood_Type ASC
        """)
        stock_report = cursor.fetchall()
        return jsonify(serialize_item(stock_report))
    except Exception as e:
        app.logger.exception("Failed to generate stock report")
        return jsonify({"error": f"Failed to generate stock report: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/api/reports/donor-eligibility", methods=["GET"])
def get_donor_eligibility_report():
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                Eligibility_Status,
                COUNT(*) AS count
            FROM DONOR
            GROUP BY Eligibility_Status
        """)
        report = cursor.fetchall()
        return jsonify(serialize_item(report))
    except Exception as e:
        app.logger.exception("Failed to generate donor eligibility report")
        return jsonify({"error": f"Failed to generate report: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


if __name__ == "__main__":
    app.run(debug=True, port=5000)
