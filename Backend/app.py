from flask import Flask, jsonify, request
from flask_cors import CORS
from db import get_db_connection

app = Flask(__name__)

# Allow React frontend to communicate with Flask
CORS(app)


@app.route("/")
def home():
    return jsonify({"message": "Blood Bank API is running"})


# -----------------------------------------
# GET ALL DONORS
# -----------------------------------------


@app.route("/api/donors", methods=["GET"])
def get_donors():

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("SELECT * FROM DONOR")

    donors = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify(donors)


# -----------------------------------------
# GET ALL BLOOD UNITS
# -----------------------------------------


@app.route("/api/blood-units", methods=["GET"])
def get_blood_units():

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
    """)

    units = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify(units)


# -----------------------------------------
# GET ALL HOSPITALS
# -----------------------------------------


@app.route("/api/hospitals", methods=["GET"])
def get_hospitals():

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("SELECT * FROM HOSPITAL")

    hospitals = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify(hospitals)


# -----------------------------------------
# GET ALL REQUESTS
# -----------------------------------------


@app.route("/api/requests", methods=["GET"])
def get_requests():

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
            H.Name AS Hospital_Name
        FROM HOSPITAL_REQUEST HR
        JOIN HOSPITAL H
            ON HR.Hospital_ID = H.Hospital_ID
        ORDER BY HR.Request_ID DESC
    """)

    requests = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify(requests)


# -----------------------------------------
# REGISTER A NEW DONOR
# -----------------------------------------


@app.route("/api/newdonor", methods=["POST"])
def add_donor():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body must contain JSON"}), 400

    required_fields = ["Name", "Address", "Blood_Type", "Contact_No", "DOB", "Gender"]

    missing_fields = [field for field in required_fields if not data.get(field)]

    if missing_fields:
        return (
            jsonify({"error": "Missing required fields", "fields": missing_fields}),
            400,
        )

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO DONOR
                (Name, Address, Blood_Type, Contact_No, DOB, Gender)
            VALUES (%s, %s, %s, %s, %s, %s)
        """,
            (
                data["Name"],
                data["Address"],
                data["Blood_Type"],
                data["Contact_No"],
                data["DOB"],
                data["Gender"],
            ),
        )

        donor_id = cursor.lastrowid
        connection.commit()

        return (
            jsonify({"message": "Donor registered successfully", "Donor_ID": donor_id}),
            201,
        )

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Failed to register donor")

        return jsonify({"error": "Failed to register donor"}), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# -----------------------------------------
# CREATE A BLOOD REQUEST
# -----------------------------------------

@app.route("/api/newrequest ", methods=["POST"])
def create_blood_request():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body must contain JSON"}), 400

    required_fields = [
        "Needed_Blood_Type",
        "Qty_Requested",
        "Urgency_Level",
        "Hospital_ID"
    ]

    missing_fields = [
        field for field in required_fields
        if data.get(field) is None or data.get(field) == ""
    ]

    if missing_fields:
        return jsonify({
            "error": "Missing required fields",
            "fields": missing_fields
        }), 400

    blood_type = data["Needed_Blood_Type"]
    valid_blood_types = {
        "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"
    }

    if blood_type not in valid_blood_types:
        return jsonify({"error": "Invalid blood group"}), 400

    try:
        quantity = int(data["Qty_Requested"])
        hospital_id = int(data["Hospital_ID"])
    except (ValueError, TypeError):
        return jsonify({
            "error": "Quantity and Hospital_ID must be integers"
        }), 400

    if quantity <= 0 or hospital_id <= 0:
        return jsonify({
            "error": "Quantity and Hospital_ID must be positive"
        }), 400

    urgency = data["Urgency_Level"]

    if urgency not in {"Low", "Medium", "High", "Critical"}:
        return jsonify({"error": "Invalid urgency level"}), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("""
            INSERT INTO HOSPITAL_REQUEST
                (Request_Date, Needed_Blood_Type, Qty_Requested,
                 Status, Urgency_Level, Hospital_ID)
            VALUES (CURDATE(), %s, %s, %s, %s, %s)
        """, (
            blood_type,
            quantity,
            "Pending",
            urgency,
            hospital_id
        ))

        request_id = cursor.lastrowid
        connection.commit()

        return jsonify({
            "message": "Blood request submitted successfully",
            "Request_ID": request_id,
            "Status": "Pending"
        }), 201

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Failed to create blood request")

        return jsonify({
            "error": "Failed to submit blood request"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


if __name__ == "__main__":
    app.run(debug=True, port=5000)
