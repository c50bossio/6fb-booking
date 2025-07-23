#!/usr/bin/env python3
"""Reset admin password to password123"""

import sqlite3
from passlib.context import CryptContext

# Create password context
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

# Connect to database
conn = sqlite3.connect('6fb_booking.db')
cursor = conn.cursor()

# Hash the password
hashed_password = pwd_context.hash("password123")

# Update admin password
cursor.execute(
    "UPDATE users SET hashed_password = ? WHERE email = ?",
    (hashed_password, "admin@bookedbarber.com")
)

# Commit changes
conn.commit()

# Verify the update
cursor.execute("SELECT email, role FROM users WHERE email = 'admin@bookedbarber.com'")
result = cursor.fetchone()

if result:
    print(f"✅ Password reset successful for {result[0]} (role: {result[1]})")
    print(f"   New password: password123")
else:
    print("❌ User not found")

conn.close()