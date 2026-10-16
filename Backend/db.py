import os
import mysql.connector
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

load_dotenv()

ALLOWED_ADMIN_ACCOUNTS = [
    {
        "email": "romitchavan0192@gmail.com",
        "name": "Romit Chavan",
        "password": "romit@123",
    },
    {
        "email": "rcsketch02@gmail.com",
        "name": "RC Sketch",
        "password": "romitsketch@012",
    },
]


def get_db_connection():
    connection = mysql.connector.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "bloodbankdb"),
        port=int(os.getenv("DB_PORT", 3306) or 3306),
        autocommit=False,
    )
    return connection


def init_db():
    """Ensure required tables, constraints, and initial admin accounts exist."""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # 1. Create ADMIN_USER table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ADMIN_USER (
                Admin_ID INT AUTO_INCREMENT PRIMARY KEY,
                Email VARCHAR(150) NOT NULL UNIQUE,
                Password_Hash VARCHAR(255) NOT NULL,
                Name VARCHAR(100) NOT NULL,
                Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
        """)

        # 2. Seed / sync authorized admin accounts with secure hashes
        for account in ALLOWED_ADMIN_ACCOUNTS:
            email = account["email"].strip().lower()
            name = account["name"]
            pwd_hash = generate_password_hash(account["password"])

            cursor.execute("SELECT Admin_ID FROM ADMIN_USER WHERE Email = %s", (email,))
            existing = cursor.fetchone()
            if not existing:
                cursor.execute(
                    "INSERT INTO ADMIN_USER (Email, Password_Hash, Name) VALUES (%s, %s, %s)",
                    (email, pwd_hash, name),
                )
            else:
                cursor.execute(
                    "UPDATE ADMIN_USER SET Password_Hash = %s, Name = %s WHERE Email = %s",
                    (pwd_hash, name, email),
                )

        # 3. Ensure chk_quantity allows Quantity >= 0 for blood_unit
        try:
            cursor.execute("ALTER TABLE blood_unit DROP CONSTRAINT chk_quantity")
            cursor.execute("ALTER TABLE blood_unit ADD CONSTRAINT chk_quantity CHECK (Quantity >= 0)")
        except Exception:
            # If constraint was already altered or doesn't exist under that name
            pass

        # 4. Safe migration: Ensure Total_Donations and Total_Quantity_Donated exist on DONOR
        try:
            cursor.execute("SHOW COLUMNS FROM donor")
            donor_cols = {col["Field"] for col in cursor.fetchall()}
            if "Total_Donations" not in donor_cols:
                cursor.execute("ALTER TABLE donor ADD COLUMN Total_Donations INT NOT NULL DEFAULT 0")
            if "Total_Quantity_Donated" not in donor_cols:
                cursor.execute("ALTER TABLE donor ADD COLUMN Total_Quantity_Donated INT NOT NULL DEFAULT 0")
        except Exception as e:
            print(f"Donor columns migration notice: {e}")

        # 5. Safe migration: Ensure Quantity exists on gives table
        try:
            cursor.execute("SHOW COLUMNS FROM gives")
            gives_cols = {col["Field"] for col in cursor.fetchall()}
            if "Quantity" not in gives_cols:
                cursor.execute("ALTER TABLE gives ADD COLUMN Quantity INT NOT NULL DEFAULT 450")
        except Exception as e:
            print(f"Gives table migration notice: {e}")

        connection.commit()
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Database initialization warning: {e}")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()