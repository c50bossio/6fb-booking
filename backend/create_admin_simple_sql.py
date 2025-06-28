#!/usr/bin/env python3
"""
Simple SQL-based admin creation script for Render
This avoids ORM model import issues
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
import bcrypt
from datetime import datetime

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    exit(1)

# User details
email = "c50bossio@gmail.com"
password = "Welcome123!"
first_name = "Chris"
last_name = "Bossio"

print("Connecting to database...")

try:
    # Connect to database
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Hash password
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    # Check if user exists
    cur.execute("SELECT id, role FROM users WHERE email = %s", (email,))
    existing = cur.fetchone()

    if existing:
        print(f"User {email} already exists with role: {existing['role']}")
        # Update existing user
        cur.execute(
            """
            UPDATE users
            SET role = 'super_admin',
                hashed_password = %s,
                is_active = true,
                is_verified = true,
                permissions = ARRAY['*'],
                updated_at = %s
            WHERE email = %s
        """,
            (hashed_password, datetime.utcnow(), email),
        )
        print(f"✅ Updated {email} to super_admin with new password")
    else:
        # Create new user
        cur.execute(
            """
            INSERT INTO users (
                email, first_name, last_name, hashed_password,
                role, is_active, is_verified, permissions,
                created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
            (
                email,
                first_name,
                last_name,
                hashed_password,
                "super_admin",
                True,
                True,
                ["*"],
                datetime.utcnow(),
                datetime.utcnow(),
            ),
        )
        print(f"✅ Created new super_admin user {email}")

    # Commit changes
    conn.commit()

    print("\n📧 Email:", email)
    print("🔑 Password:", password)
    print(
        "\n✅ Admin user ready! Use these credentials at https://sixfb-backend.onrender.com/docs"
    )
    print("\n⚠️  IMPORTANT: Change this password after first login!")

except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    if "conn" in locals():
        conn.rollback()
finally:
    if "cur" in locals():
        cur.close()
    if "conn" in locals():
        conn.close()
