#!/usr/bin/env python3

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from passlib.context import CryptContext
import sqlite3

# Password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_test_user():
    try:
        # Connect to database
        conn = sqlite3.connect("6fb_booking.db")
        cursor = conn.cursor()

        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE email = ?", ("test@6fb.com",))
        if cursor.fetchone():
            print("✅ Test user already exists: test@6fb.com")
            return

        # Hash password
        hashed_password = pwd_context.hash("test123")

        # Insert test user
        cursor.execute(
            """
            INSERT INTO users (email, first_name, last_name, hashed_password, role, is_active, is_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            ("test@6fb.com", "Test", "User", hashed_password, "admin", True, True),
        )

        conn.commit()
        conn.close()

        print("✅ Test user created successfully!")
        print("Email: test@6fb.com")
        print("Password: test123")
        print("Role: admin")

    except Exception as e:
        print(f"❌ Error creating test user: {e}")


if __name__ == "__main__":
    create_test_user()
