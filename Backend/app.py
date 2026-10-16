import datetime
from decimal import Decimal
from functools import wraps
import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from itsdangerous import BadTimeSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash

from db import ALLOWED_ADMIN_ACCOUNTS, get_db_connection, init_db

load_dotenv()

app = Flask(__name__)

# Load SECRET_KEY and initialize serializer for token auth
SECRET_KEY = os.getenv("SECRET_KEY", "vitaldrop_jwt_secret_9db3310c8f8536eab3")
app.config["SECRET_KEY"] = SECRET_KEY
token_serializer = URLSafeTimedSerializer(SECRET_KEY, salt="vitaldrop-admin-auth")

# In-memory blacklist for revoked tokens on logout
REVOKED_TOKENS = set()

# Permitted admin emails
ALLOWED_ADMIN_EMAILS = {acc["email"].strip().lower() for acc in ALLOWED_ADMIN_ACCOUNTS}

# Allow React frontend to communicate with Flask with headers and credentials
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)

# Run schema and seed check on startup
init_db()


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


def admin_required(f):
    """Decorator to require valid admin authentication token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Admin authentication required. Please log in."}), 401

        token = auth_header.split(" ", 1)[1].strip()
        if not token or token in REVOKED_TOKENS:
            return jsonify({"error": "Session token has been invalidated. Please log in again."}), 401

        try:
            payload = token_serializer.loads(token, max_age=86400)  # 24 hours validity
        except SignatureExpired:
            return jsonify({"error": "Session has expired. Please log in again."}), 401
        except (BadTimeSignature, Exception):
            return jsonify({"error": "Invalid authentication token. Please log in again."}), 401

        admin_email = (payload.get("email") or "").strip().lower()
        if admin_email not in ALLOWED_ADMIN_EMAILS:
            return jsonify({"error": "Access denied: Unauthorized administrator account."}), 403

        request.admin = payload
        return f(*args, **kwargs)

    return decorated


@app.route("/")
def home():
    return jsonify({"message": "VitalDrop Blood Bank API is running", "status": "online"})


# -----------------------------------------
# AUTHENTICATION
# -----------------------------------------

@app.route("/api/auth/login", methods=["POST"])
def admin_login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must contain JSON."}), 400

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    # Requirement 1: Only allow the two permitted emails
    if email not in ALLOWED_ADMIN_EMAILS:
        return (
            jsonify({
                "error": "Access denied. Only authorized administrators may log in."
            }),
            403,
        )

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            "SELECT Admin_ID, Email, Password_Hash, Name FROM ADMIN_USER WHERE Email = %s",
            (email,),
        )
        admin = cursor.fetchone()

        if not admin or not check_password_hash(admin["Password_Hash"], password):
            return jsonify({"error": "Invalid email or password."}), 401

        token = token_serializer.dumps({
            "admin_id": admin["Admin_ID"],
            "email": admin["Email"],
            "name": admin["Name"],
        })

        return jsonify({
            "message": "Login successful.",
            "token": token,
            "admin": {
                "id": admin["Admin_ID"],
                "email": admin["Email"],
                "name": admin["Name"],
            },
        }), 200

    except Exception as e:
        app.logger.exception("Login failure")
        return jsonify({"error": f"Authentication server error: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/api/auth/me", methods=["GET"])
@admin_required
def get_current_admin():
    return jsonify({
        "admin": {
            "id": request.admin.get("admin_id"),
            "email": request.admin.get("email"),
            "name": request.admin.get("name"),
        }
    }), 200


@app.route("/api/auth/logout", methods=["POST"])
@admin_required
def admin_logout():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        REVOKED_TOKENS.add(token)

    return jsonify({"message": "Logged out successfully."}), 200


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
@admin_required
def add_donor():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must contain JSON"}), 400

    required_fields = ["Name", "Blood_Type", "Contact_No"]
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return jsonify({"error": "Missing required fields", "fields": missing_fields}), 400

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

        return jsonify({
            "message": "Donor registered successfully",
            "Donor_ID": donor_id,
            "Name": name,
            "Blood_Type": blood_type,
        }), 201
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
                BU.Unit_ID,
                BU.Blood_Type,
                BU.Quantity,
                BU.Collection_Date,
                BU.Expiration_Date,
                BU.Testing_Status,
                BU.Donor_ID,
                BU.Bank_ID,
                BB.Name AS Bank_Name
            FROM BLOOD_UNIT BU
            LEFT JOIN BLOOD_BANK BB ON BU.Bank_ID = BB.Bank_ID
            ORDER BY BU.Unit_ID DESC
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
@admin_required
def add_blood_unit():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must contain JSON"}), 400

    blood_type = data.get("Blood_Type", "").strip().upper()
    valid_blood_types = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}
    if blood_type not in valid_blood_types:
        return jsonify({"error": "Invalid blood type"}), 400

    raw_qty = data.get("Quantity") if data.get("Quantity") is not None else data.get("quantity")
    if raw_qty is None or raw_qty == "":
        raw_qty = 450
    try:
        quantity = int(raw_qty)
    except (ValueError, TypeError):
        return jsonify({"error": "Quantity must be a valid number"}), 400

    if quantity <= 0:
        return jsonify({"error": "Quantity must be a positive integer"}), 400

    collection_date_str = data.get("Collection_Date")
    if not collection_date_str:
        collection_date_str = datetime.date.today().strftime("%Y-%m-%d")

    expiration_date_str = data.get("Expiration_Date")
    if not expiration_date_str:
        col_dt = datetime.datetime.strptime(collection_date_str, "%Y-%m-%d").date()
        expiration_date_str = (col_dt + datetime.timedelta(days=42)).strftime("%Y-%m-%d")

    try:
        col_date = datetime.datetime.strptime(collection_date_str, "%Y-%m-%d").date()
        exp_date = datetime.datetime.strptime(expiration_date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Dates must be in valid YYYY-MM-DD format"}), 400

    if exp_date < col_date:
        return jsonify({"error": "Expiration date cannot be earlier than collection date"}), 400

    testing_status = data.get("Testing_Status", "Pending").capitalize()
    if testing_status not in {"Pending", "Passed", "Failed"}:
        testing_status = "Pending"

    bank_id = data.get("Bank_ID")
    donor_id = data.get("Donor_ID")

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)

        if not bank_id:
            cursor.execute("SELECT Bank_ID FROM BLOOD_BANK LIMIT 1")
            first_bank = cursor.fetchone()
            bank_id = first_bank["Bank_ID"] if first_bank else 1
        else:
            bank_id = int(bank_id)

        if donor_id:
            donor_id = int(donor_id)
            cursor.execute("SELECT Donor_ID, Name, Blood_Type, Eligibility_Status FROM DONOR WHERE Donor_ID = %s FOR UPDATE", (donor_id,))
            donor = cursor.fetchone()
            if not donor:
                connection.rollback()
                return jsonify({"error": f"Donor #{donor_id} not found"}), 404
            if donor.get("Eligibility_Status") in {"Ineligible", "Not Eligible"}:
                connection.rollback()
                return jsonify({"error": f"Cannot add blood unit: Donor '{donor['Name']}' is currently marked as {donor['Eligibility_Status']}."}), 400
        else:
            cursor.execute("SELECT Donor_ID FROM DONOR LIMIT 1")
            first_donor = cursor.fetchone()
            donor_id = first_donor["Donor_ID"] if first_donor else 1

        cursor.execute(
            """
            INSERT INTO BLOOD_UNIT
                (Blood_Type, Quantity, Collection_Date, Expiration_Date, Testing_Status, Donor_ID, Bank_ID)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (blood_type, quantity, collection_date_str, expiration_date_str, testing_status, donor_id, bank_id),
        )
        unit_id = cursor.lastrowid

        # Insert relational bridge records
        cursor.execute(
            """
            INSERT INTO gives (Donor_ID, Unit_ID, Donation_Type, Collection_Date, Quantity)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (donor_id, unit_id, "Whole Blood", collection_date_str, quantity),
        )

        cursor.execute(
            """
            INSERT INTO is_stored_in (Unit_ID, Bank_ID, Aisle_No)
            VALUES (%s, %s, %s)
            """,
            (unit_id, bank_id, "Quarantine" if testing_status == "Pending" else "Standard"),
        )

        # Update donor totals
        cursor.execute(
            """
            UPDATE DONOR
            SET Total_Donations = Total_Donations + 1,
                Total_Quantity_Donated = Total_Quantity_Donated + %s
            WHERE Donor_ID = %s
            """,
            (quantity, donor_id),
        )

        connection.commit()

        return jsonify({
            "message": "Blood unit added successfully",
            "Unit_ID": unit_id,
            "Blood_Type": blood_type,
            "Quantity": quantity,
            "Collection_Date": collection_date_str,
            "Expiration_Date": expiration_date_str,
            "Testing_Status": testing_status,
        }), 201

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


@app.route("/api/blood-units/<int:unit_id>", methods=["PUT"])
@admin_required
def update_blood_unit(unit_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must contain JSON"}), 400

    blood_type = data.get("Blood_Type", "").strip().upper()
    valid_blood_types = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}
    if blood_type not in valid_blood_types:
        return jsonify({"error": "Invalid blood type"}), 400

    try:
        quantity = int(data.get("Quantity", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "Quantity must be a valid number"}), 400

    if quantity <= 0:
        return jsonify({"error": "Quantity must be a positive integer"}), 400

    collection_date_str = data.get("Collection_Date")
    expiration_date_str = data.get("Expiration_Date")

    if not collection_date_str or not expiration_date_str:
        return jsonify({"error": "Collection date and expiration date are required"}), 400

    try:
        col_date = datetime.datetime.strptime(collection_date_str, "%Y-%m-%d").date()
        exp_date = datetime.datetime.strptime(expiration_date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Dates must be in valid YYYY-MM-DD format"}), 400

    if exp_date < col_date:
        return jsonify({"error": "Expiration date cannot be earlier than collection date"}), 400

    testing_status = data.get("Testing_Status", "Pending").capitalize()
    if testing_status not in {"Pending", "Passed", "Failed"}:
        return jsonify({"error": "Testing status must be Pending, Passed, or Failed"}), 400

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT Unit_ID, Testing_Status FROM BLOOD_UNIT WHERE Unit_ID = %s FOR UPDATE", (unit_id,))
        existing = cursor.fetchone()
        if not existing:
            connection.rollback()
            return jsonify({"error": f"Blood unit #{unit_id} not found"}), 404

        current_status = existing.get("Testing_Status") or "Pending"
        # Requirement 1: If Passed, locked from status modification
        if current_status == "Passed" and testing_status != "Passed":
            connection.rollback()
            return jsonify({
                "error": f"Testing status is locked: Blood unit #{unit_id} is already marked as 'Passed' and cannot be changed."
            }), 400

        # If Failed, cannot be re-activated to Passed or Pending
        if current_status == "Failed" and testing_status != "Failed":
            connection.rollback()
            return jsonify({
                "error": f"Testing status is locked: Blood unit #{unit_id} is marked as 'Failed' and cannot be modified."
            }), 400

        cursor.execute(
            """
            UPDATE BLOOD_UNIT
            SET Blood_Type = %s,
                Quantity = %s,
                Collection_Date = %s,
                Expiration_Date = %s,
                Testing_Status = %s
            WHERE Unit_ID = %s
            """,
            (blood_type, quantity, collection_date_str, expiration_date_str, testing_status, unit_id),
        )
        connection.commit()

        return jsonify({
            "message": f"Blood unit #{unit_id} updated successfully",
            "Unit_ID": unit_id,
            "Blood_Type": blood_type,
            "Quantity": quantity,
            "Collection_Date": collection_date_str,
            "Expiration_Date": expiration_date_str,
            "Testing_Status": testing_status,
        }), 200

    except Exception as e:
        if connection:
            connection.rollback()
        app.logger.exception("Failed to update blood unit")
        return jsonify({"error": f"Failed to update blood unit: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/api/blood-units/<int:unit_id>/status", methods=["PATCH"])
@admin_required
def update_blood_unit_testing_status(unit_id):
    data = request.get_json()
    if not data or not data.get("Testing_Status"):
        return jsonify({"error": "Testing_Status is required"}), 400

    testing_status = data.get("Testing_Status", "").capitalize()
    if testing_status not in {"Pending", "Passed", "Failed"}:
        return jsonify({"error": "Testing status must be Pending, Passed, or Failed"}), 400

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT Unit_ID, Testing_Status FROM BLOOD_UNIT WHERE Unit_ID = %s FOR UPDATE", (unit_id,))
        unit = cursor.fetchone()
        if not unit:
            connection.rollback()
            return jsonify({"error": f"Blood unit #{unit_id} not found"}), 404

        current_status = unit.get("Testing_Status") or "Pending"

        # Requirement 1: If Testing_Status is Passed, status is locked and cannot be changed
        if current_status == "Passed":
            connection.rollback()
            return jsonify({
                "error": f"Testing status is locked: Blood unit #{unit_id} is already marked as 'Passed' and cannot be changed."
            }), 400

        # If current is Failed, cannot be re-activated
        if current_status == "Failed":
            connection.rollback()
            return jsonify({
                "error": f"Testing status is locked: Blood unit #{unit_id} is marked as 'Failed' and cannot be changed."
            }), 400

        # If current is Pending, allow change to Passed or Failed
        if current_status == "Pending" and testing_status not in {"Passed", "Failed", "Pending"}:
            connection.rollback()
            return jsonify({"error": "Testing status must be 'Passed' or 'Failed'"}), 400

        cursor.execute(
            "UPDATE BLOOD_UNIT SET Testing_Status = %s WHERE Unit_ID = %s",
            (testing_status, unit_id),
        )
        connection.commit()

        return jsonify({
            "message": f"Testing status for unit #{unit_id} updated to {testing_status}",
            "Unit_ID": unit_id,
            "Testing_Status": testing_status,
        }), 200

    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({"error": f"Failed to update testing status: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/api/blood-units/<int:unit_id>", methods=["DELETE"])
@admin_required
def delete_blood_unit(unit_id):
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT Unit_ID FROM BLOOD_UNIT WHERE Unit_ID = %s FOR UPDATE", (unit_id,))
        existing = cursor.fetchone()
        if not existing:
            connection.rollback()
            return jsonify({"error": f"Blood unit #{unit_id} not found"}), 404

        # Check linked donor in gives to maintain accurate donor totals
        cursor.execute("SELECT Donor_ID, Quantity FROM gives WHERE Unit_ID = %s", (unit_id,))
        linked = cursor.fetchone()
        if linked:
            deduct_qty = int(linked.get("Quantity") or 450)
            cursor.execute(
                """
                UPDATE DONOR
                SET Total_Donations = GREATEST(0, Total_Donations - 1),
                    Total_Quantity_Donated = GREATEST(0, Total_Quantity_Donated - %s)
                WHERE Donor_ID = %s
                """,
                (deduct_qty, linked["Donor_ID"]),
            )

        # Cleanly delete referencing rows from relational bridge tables first
        cursor.execute("DELETE FROM requires WHERE Unit_ID = %s", (unit_id,))
        cursor.execute("DELETE FROM is_stored_in WHERE Unit_ID = %s", (unit_id,))
        cursor.execute("DELETE FROM gives WHERE Unit_ID = %s", (unit_id,))
        cursor.execute("DELETE FROM BLOOD_UNIT WHERE Unit_ID = %s", (unit_id,))

        connection.commit()
        return jsonify({"message": f"Blood unit #{unit_id} deleted successfully."}), 200

    except Exception as e:
        if connection:
            connection.rollback()
        app.logger.exception("Failed to delete blood unit")
        return jsonify({"error": f"Failed to delete blood unit: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# -----------------------------------------
# DONATIONS & DONOR HISTORY
# -----------------------------------------

@app.route("/api/donations", methods=["GET"])
def get_donations():
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                g.Donor_ID,
                g.Unit_ID,
                g.Donation_Type,
                g.Collection_Date,
                COALESCE(g.Quantity, bu.Quantity, 450) AS Quantity,
                d.Name AS Donor_Name,
                d.Blood_Type,
                d.Eligibility_Status,
                bu.Testing_Status,
                bu.Expiration_Date,
                bu.Bank_ID,
                bb.Name AS Bank_Name
            FROM gives g
            JOIN DONOR d ON g.Donor_ID = d.Donor_ID
            JOIN BLOOD_UNIT bu ON g.Unit_ID = bu.Unit_ID
            LEFT JOIN BLOOD_BANK bb ON bu.Bank_ID = bb.Bank_ID
            ORDER BY g.Collection_Date DESC, g.Unit_ID DESC
        """)
        donations = cursor.fetchall()
        return jsonify(serialize_item(donations))
    except Exception as e:
        app.logger.exception("Failed to fetch donations")
        return jsonify({"error": f"Failed to fetch donations: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/api/donors/<int:donor_id>/history", methods=["GET"])
@app.route("/api/donors/<int:donor_id>/donations", methods=["GET"])
def get_donor_history(donor_id):
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT Donor_ID, Name, Blood_Type, Eligibility_Status, Total_Donations, Total_Quantity_Donated FROM DONOR WHERE Donor_ID = %s", (donor_id,))
        donor = cursor.fetchone()
        if not donor:
            return jsonify({"error": f"Donor #{donor_id} not found"}), 404

        cursor.execute("""
            SELECT
                g.Donor_ID,
                g.Unit_ID,
                g.Donation_Type,
                g.Collection_Date,
                COALESCE(g.Quantity, bu.Quantity, 450) AS Quantity,
                bu.Blood_Type,
                bu.Testing_Status,
                bu.Expiration_Date,
                bu.Bank_ID,
                bb.Name AS Bank_Name
            FROM gives g
            JOIN BLOOD_UNIT bu ON g.Unit_ID = bu.Unit_ID
            LEFT JOIN BLOOD_BANK bb ON bu.Bank_ID = bb.Bank_ID
            WHERE g.Donor_ID = %s
            ORDER BY g.Collection_Date DESC, g.Unit_ID DESC
        """, (donor_id,))
        history = cursor.fetchall()

        return jsonify({
            "donor": serialize_item(donor),
            "history": serialize_item(history)
        }), 200
    except Exception as e:
        app.logger.exception(f"Failed to fetch history for donor #{donor_id}")
        return jsonify({"error": f"Failed to fetch donor history: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/api/donations", methods=["POST"])
@app.route("/api/donors/<int:url_donor_id>/donations", methods=["POST"])
@admin_required
def record_donation(url_donor_id=None):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must contain JSON"}), 400

    donor_id = url_donor_id or data.get("Donor_ID") or data.get("donor_id")
    if not donor_id:
        return jsonify({"error": "Donor_ID is required"}), 400

    try:
        donor_id = int(donor_id)
    except (ValueError, TypeError):
        return jsonify({"error": "Donor_ID must be a valid integer"}), 400

    raw_qty = data.get("Quantity") if data.get("Quantity") is not None else data.get("quantity")
    if raw_qty is None or raw_qty == "":
        raw_qty = 450
    try:
        quantity = int(raw_qty)
    except (ValueError, TypeError):
        return jsonify({"error": "Quantity must be a valid integer"}), 400

    if quantity <= 0:
        return jsonify({"error": "Donation quantity must be greater than 0"}), 400

    donation_type = data.get("Donation_Type") or data.get("donation_type") or "Whole Blood"
    valid_types = {"Whole Blood", "Plasma", "Platelets"}
    if donation_type not in valid_types:
        return jsonify({"error": f"Invalid donation type. Must be one of: {', '.join(sorted(valid_types))}"}), 400

    collection_date_str = data.get("Collection_Date") or data.get("Donation_Date") or data.get("collection_date")
    if not collection_date_str:
        collection_date_str = datetime.date.today().strftime("%Y-%m-%d")

    try:
        col_date = datetime.datetime.strptime(collection_date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Collection date must be in YYYY-MM-DD format"}), 400

    exp_date = col_date + datetime.timedelta(days=42)
    expiration_date_str = exp_date.strftime("%Y-%m-%d")

    bank_id = data.get("Bank_ID") or data.get("bank_id")

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)

        # 1. Lock and verify donor
        cursor.execute(
            "SELECT Donor_ID, Name, Blood_Type, Eligibility_Status FROM DONOR WHERE Donor_ID = %s FOR UPDATE",
            (donor_id,)
        )
        donor = cursor.fetchone()
        if not donor:
            connection.rollback()
            return jsonify({"error": f"Donor #{donor_id} not found"}), 404

        # 2. Check donor eligibility
        eligibility = donor.get("Eligibility_Status") or "Eligible"
        if eligibility in {"Ineligible", "Not Eligible"}:
            connection.rollback()
            return jsonify({
                "error": f"Cannot record donation: Donor '{donor['Name']}' is currently marked as {eligibility}."
            }), 400

        # 3. Check bank_id
        if not bank_id:
            cursor.execute("SELECT Bank_ID FROM BLOOD_BANK LIMIT 1")
            first_bank = cursor.fetchone()
            bank_id = first_bank["Bank_ID"] if first_bank else 1
        else:
            bank_id = int(bank_id)
            cursor.execute("SELECT Bank_ID FROM BLOOD_BANK WHERE Bank_ID = %s", (bank_id,))
            if not cursor.fetchone():
                connection.rollback()
                return jsonify({"error": f"Blood bank #{bank_id} not found"}), 404

        # 4. Prevent duplicate donation record on the same date for the same donor
        cursor.execute(
            "SELECT Unit_ID FROM gives WHERE Donor_ID = %s AND Collection_Date = %s FOR UPDATE",
            (donor_id, collection_date_str)
        )
        existing_donation = cursor.fetchone()
        if existing_donation:
            connection.rollback()
            return jsonify({
                "error": f"A donation has already been recorded for {donor['Name']} on {collection_date_str}. Duplicate donation records are prevented."
            }), 400

        blood_type = donor["Blood_Type"]

        # 5. Insert BLOOD_UNIT with 'Pending' testing status (unavailable for usable stock until tested)
        cursor.execute(
            """
            INSERT INTO BLOOD_UNIT
                (Blood_Type, Quantity, Collection_Date, Expiration_Date, Testing_Status, Donor_ID, Bank_ID)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (blood_type, quantity, collection_date_str, expiration_date_str, "Pending", donor_id, bank_id),
        )
        unit_id = cursor.lastrowid

        # 6. Insert into gives (donation record)
        cursor.execute(
            """
            INSERT INTO gives (Donor_ID, Unit_ID, Donation_Type, Collection_Date, Quantity)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (donor_id, unit_id, donation_type, collection_date_str, quantity),
        )

        # 7. Insert storage record
        cursor.execute(
            """
            INSERT INTO is_stored_in (Unit_ID, Bank_ID, Aisle_No)
            VALUES (%s, %s, %s)
            """,
            (unit_id, bank_id, "Quarantine"),
        )

        # 8. Update DONOR donation history totals atomically
        cursor.execute(
            """
            UPDATE DONOR
            SET Total_Donations = Total_Donations + 1,
                Total_Quantity_Donated = Total_Quantity_Donated + %s
            WHERE Donor_ID = %s
            """,
            (quantity, donor_id),
        )

        # Commit transaction atomically
        connection.commit()

        return jsonify({
            "message": f"Donation of {quantity} ml successfully recorded for {donor['Name']}. Blood unit #{unit_id} created with 'Pending' testing status.",
            "Unit_ID": unit_id,
            "Donor_ID": donor_id,
            "Donor_Name": donor["Name"],
            "Blood_Type": blood_type,
            "Quantity": quantity,
            "Collection_Date": collection_date_str,
            "Expiration_Date": expiration_date_str,
            "Testing_Status": "Pending",
            "Donation_Type": donation_type,
            "Bank_ID": bank_id,
        }), 201

    except Exception as e:
        if connection:
            connection.rollback()
        app.logger.exception("Failed to record donation")
        return jsonify({"error": f"Failed to record donation: {str(e)}"}), 500
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
        cursor.execute("""
            SELECT
                H.Hospital_ID,
                H.Name,
                H.Address,
                H.Contact_No,
                COUNT(HR.Request_ID) AS Request_Count
            FROM HOSPITAL H
            LEFT JOIN HOSPITAL_REQUEST HR ON H.Hospital_ID = HR.Hospital_ID
            GROUP BY H.Hospital_ID, H.Name, H.Address, H.Contact_No
            ORDER BY H.Hospital_ID ASC
        """)
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
@admin_required
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
        return jsonify({
            "message": "Hospital added successfully",
            "Hospital_ID": hospital_id,
            "Name": name,
        }), 201
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


@app.route("/api/hospitals/<int:hospital_id>", methods=["DELETE"])
@admin_required
def delete_hospital(hospital_id):
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT Hospital_ID, Name FROM HOSPITAL WHERE Hospital_ID = %s", (hospital_id,))
        hospital = cursor.fetchone()
        if not hospital:
            return jsonify({"error": f"Hospital #{hospital_id} not found"}), 404

        hospital_name = hospital["Name"]

        # Requirement 4: Follow existing foreign-key relationships and use a safe restriction
        # rather than accidentally deleting request history
        cursor.execute("SELECT COUNT(*) AS cnt FROM HOSPITAL_REQUEST WHERE Hospital_ID = %s", (hospital_id,))
        req_count = cursor.fetchone()["cnt"]

        cursor.execute("SELECT COUNT(*) AS cnt FROM issues WHERE Hospital_ID = %s", (hospital_id,))
        issue_count = cursor.fetchone()["cnt"]

        total_linked = req_count + issue_count
        if total_linked > 0:
            return jsonify({
                "error": f"Cannot delete '{hospital_name}'. It is linked to {req_count} blood request(s) and {issue_count} issue record(s). Deletion is restricted to safeguard clinical audit history."
            }), 400

        cursor.execute("DELETE FROM HOSPITAL WHERE Hospital_ID = %s", (hospital_id,))
        connection.commit()

        return jsonify({
            "message": f"Hospital '{hospital_name}' was deleted successfully."
        }), 200

    except Exception as e:
        if connection:
            connection.rollback()
        app.logger.exception("Failed to delete hospital")
        return jsonify({"error": f"Failed to delete hospital: {str(e)}"}), 500
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
@admin_required
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
        return jsonify({
            "message": "Blood bank added successfully",
            "Bank_ID": bank_id,
            "Name": name,
        }), 201
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
@admin_required
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


@app.route("/api/requests/<int:request_id>/status", methods=["PUT", "PATCH"])
@admin_required
def update_request_status(request_id):
    """
    Update request status to Pending, Approved, or Rejected.
    Requirement 2: Approval must update blood inventory within a single MySQL transaction.
    - Check request exists and is not already approved.
    - Match exact blood type with tested ('Passed'), non-expired (Expiration_Date >= CURDATE()) units.
    - If stock is insufficient, reject approval and rollback.
    - If stock is available, deduct requested units from eligible inventory records using FIFO.
    - Save changes atomically. Prevent duplicate deductions.
    """
    data = request.get_json()
    if not data or not data.get("status"):
        return jsonify({"error": "Status is required (Pending, Approved, or Rejected)."}), 400

    new_status = data["status"].strip().capitalize()
    if new_status not in {"Pending", "Approved", "Rejected"}:
        return jsonify({"error": "Status must be 'Pending', 'Approved', or 'Rejected'."}), 400

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        # Explicitly begin transaction
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)

        # 1. Lock and fetch the request record
        cursor.execute(
            """
            SELECT
                Request_ID,
                Request_Date,
                Needed_Blood_Type,
                Qty_Requested,
                Status,
                Hospital_ID
            FROM HOSPITAL_REQUEST
            WHERE Request_ID = %s
            FOR UPDATE
            """,
            (request_id,),
        )
        req = cursor.fetchone()
        if not req:
            connection.rollback()
            return jsonify({"error": f"Blood request #{request_id} not found."}), 404

        current_status = req["Status"]

        # If already at target status, return cleanly without duplicating actions
        if current_status == new_status:
            connection.rollback()
            return jsonify({
                "message": f"Request #{request_id} is already {new_status}.",
                "Request_ID": request_id,
                "Status": new_status,
            }), 200

        # Handle APPROVAL
        if new_status == "Approved":
            # Rule 1 & 8: Prevent duplicate deductions
            if current_status == "Approved":
                connection.rollback()
                return jsonify({
                    "error": f"Request #{request_id} is already approved. Cannot re-approve or deduct stock again."
                }), 400

            blood_type = req["Needed_Blood_Type"]
            needed_units = int(req["Qty_Requested"])

            # 2. Lock and fetch compatible, tested ('Passed'), unexpired, positive-stock inventory units
            # Exact blood type matching is used and documented as required.
            cursor.execute(
                """
                SELECT
                    Unit_ID,
                    Blood_Type,
                    Quantity,
                    Collection_Date,
                    Expiration_Date,
                    Testing_Status
                FROM BLOOD_UNIT
                WHERE Blood_Type = %s
                  AND Testing_Status = 'Passed'
                  AND Expiration_Date >= CURDATE()
                  AND Quantity > 0
                ORDER BY Expiration_Date ASC, Unit_ID ASC
                FOR UPDATE
                """,
                (blood_type,),
            )
            eligible_units = cursor.fetchall()
            total_available = sum(int(u["Quantity"]) for u in eligible_units)

            # 3. Check for shortage
            if total_available < needed_units:
                connection.rollback()
                return jsonify({
                    "error": (
                        f"Cannot approve request: Insufficient inventory for blood type {blood_type}. "
                        f"Requested: {needed_units} unit(s). "
                        f"Available tested & non-expired stock: {total_available} unit(s). "
                        f"Shortage: {needed_units - total_available} unit(s)."
                    )
                }), 400

            # 4. Deduct requested units using FIFO (First Expiring, First Out)
            remaining_to_deduct = needed_units
            deducted_log = []

            for unit in eligible_units:
                if remaining_to_deduct <= 0:
                    break
                unit_qty = int(unit["Quantity"])
                deduct_from_this_unit = min(unit_qty, remaining_to_deduct)
                new_qty = unit_qty - deduct_from_this_unit

                cursor.execute(
                    "UPDATE BLOOD_UNIT SET Quantity = %s WHERE Unit_ID = %s",
                    (new_qty, unit["Unit_ID"]),
                )
                remaining_to_deduct -= deduct_from_this_unit
                deducted_log.append(f"Unit #{unit['Unit_ID']} (-{deduct_from_this_unit})")

            # 5. Update request status to Approved
            cursor.execute(
                "UPDATE HOSPITAL_REQUEST SET Status = 'Approved' WHERE Request_ID = %s",
                (request_id,),
            )

            # 6. Commit transaction atomically
            connection.commit()

            return jsonify({
                "message": (
                    f"Request #{request_id} approved successfully! "
                    f"Deducted {needed_units} unit(s) of {blood_type} from inventory ({', '.join(deducted_log)})."
                ),
                "Request_ID": request_id,
                "Status": "Approved",
                "Blood_Type": blood_type,
                "Units_Deducted": needed_units,
            }), 200

        # Handle REJECTED or PENDING
        else:
            # Rule: If a request is rejected or reset to pending, do not restore stock
            cursor.execute(
                "UPDATE HOSPITAL_REQUEST SET Status = %s WHERE Request_ID = %s",
                (new_status, request_id),
            )
            connection.commit()

            return jsonify({
                "message": f"Request #{request_id} status updated to {new_status}.",
                "Request_ID": request_id,
                "Status": new_status,
            }), 200

    except Exception as e:
        if connection:
            connection.rollback()
        app.logger.exception(f"Failed to update status for request #{request_id}")
        return jsonify({"error": f"Failed to update request status: {str(e)}"}), 500
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
    """Live verified blood stock grouped by blood type."""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                Blood_Type,
                CAST(COALESCE(SUM(Quantity), 0) AS UNSIGNED) AS total_quantity,
                COUNT(*) AS unit_count,
                MIN(Expiration_Date) AS earliest_expiry,
                MAX(Expiration_Date) AS latest_expiry
            FROM BLOOD_UNIT
            WHERE Testing_Status = 'Passed'
              AND Expiration_Date >= CURDATE()
              AND Quantity > 0
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
