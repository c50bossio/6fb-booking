#!/usr/bin/env python3

import sqlite3
from passlib.context import CryptContext

# Password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_simple_user():
    try:
        # Connect to database
        conn = sqlite3.connect("6fb_booking.db")
        cursor = conn.cursor()

        # Delete existing test user
        cursor.execute("DELETE FROM users WHERE email = ?", ("test@6fb.com",))

        # Hash password
        hashed_password = pwd_context.hash("test123")

        # Insert test user with unencrypted email
        cursor.execute(
            """
            INSERT INTO users (email, first_name, last_name, hashed_password, role, is_active, is_verified, created_at, updated_at, timezone)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
        """,
            (
                "test@6fb.com",
                "Test",
                "User",
                hashed_password,
                "admin",
                1,
                1,
                "America/New_York",
            ),
        )

        conn.commit()
        conn.close()

        print("✅ Simple test user created successfully!")
        print("Email: test@6fb.com")
        print("Password: test123")
        print("Role: admin")

    except Exception as e:
        print(f"❌ Error creating test user: {e}")


if __name__ == "__main__":
    create_simple_user()
