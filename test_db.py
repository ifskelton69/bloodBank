import mysql.connector

try:

    connection = mysql.connector.connect(
        host="127.0.0.1",
        port=3306,
        user="root",
        password="Romit@23",
        database="BloodBankDB"
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