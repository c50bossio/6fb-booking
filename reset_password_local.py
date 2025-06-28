#!/usr/bin/env python3
"""
Local password reset script - Run this on your machine
"""
import psycopg2
import bcrypt
import os

# Get database URL from environment or use direct connection
DATABASE_URL = input(
    "Paste your Render PostgreSQL External Database URL here: "
).strip()

# If URL is empty, exit
if not DATABASE_URL:
    print("No database URL provided. Exiting.")
    exit(1)

try:
    # Connect to database
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Hash the password
    password = "admin123"
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    # Update or insert user
    cur.execute(
        """
        INSERT INTO users (email, hashed_password, first_name, last_name, role, is_active, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET
            hashed_password = %s,
            is_active = true,
            updated_at = NOW()
        RETURNING id, email;
    """,
        ("c50bossio@gmail.com", hashed, "Admin", "User", "admin", True, hashed),
    )

    result = cur.fetchone()
    conn.commit()

    print(f"\n✅ SUCCESS!")
    print(f"User: {result[1]}")
    print(f"Password: admin123")
    print(f"\nYou can now login at: https://sixfb-frontend-paby.onrender.com/login")

except Exception as e:
    print(f"\n❌ Error: {e}")
    print(
        "\nMake sure you copied the ENTIRE database URL from Render, including 'postgres://' at the start"
    )
finally:
    if "conn" in locals():
        conn.close()
