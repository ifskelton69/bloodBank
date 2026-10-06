import os

import mysql.connector
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
try:

    connection = mysql.connector.connect(
        host=DB_HOST, 
        port=DB_PORT, 
        user=DB_USER,
        password=DB_PASSWORD, 
        database=DB_NAME
    )

    print("SUCCESS: MySQL connected!")

    cursor = connection.cursor()

    cursor.execute("SELECT DATABASE();")

    result = cursor.fetchone()

    print("Database:", result[0])

    cursor.close()
    connection.close()

except mysql.connector.Error as e:

    print("MySQL Error:")
    print(e)
