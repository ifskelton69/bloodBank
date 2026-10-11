from flask import Flask, jsonify, request
from flask_cors import CORS
from db import get_db_connection

app = Flask(__name__)

# Allow React frontend to communicate with Flask
CORS(app)


@app.route("/")
def home():
    return jsonify({
        "message": "Blood Bank API is running"
    })


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


if __name__ == "__main__":
    app.run(debug=True, port=5000)