#!/usr/bin/env python3
import sqlite3
import bcrypt

# Hash for 'admin123' password
password = "admin123"
salt = bcrypt.gensalt()
hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

print(f"Generated hash: {hashed_password}")

# Update the database
conn = sqlite3.connect('6fb_booking.db')
cursor = conn.cursor()

# Update the admin user's password
cursor.execute("""
    UPDATE users 
    SET hashed_password = ? 
    WHERE email = 'admin@bookedbarber.com'
""", (hashed_password,))

conn.commit()
print(f"Updated password for admin@bookedbarber.com")

# Verify the update
cursor.execute("SELECT email, hashed_password FROM users WHERE email = 'admin@bookedbarber.com'")
result = cursor.fetchone()
print(f"Current hash in DB: {result[1]}")

conn.close()