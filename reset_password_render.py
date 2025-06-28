#!/usr/bin/env python3
"""
Reset password directly - You need to add your database URL below
"""
import psycopg2
import bcrypt

# IMPORTANT: Replace this with your Render PostgreSQL External Database URL
# Get it from: Render Dashboard → PostgreSQL → Connect → External Database URL
DATABASE_URL = "postgresql://sixfb_db_user:54h2NyL0wDRliQ16LvXCtzO4hEs45Fa0@dpg-d19ota2dbo4c73bmijdg-a.virginia-postgres.render.com/sixfb_db"

if DATABASE_URL == "postgres://your_database_url_here":
    print("\n❌ ERROR: You need to edit this file first!")
    print("\n1. Go to Render Dashboard → PostgreSQL → Connect")
    print("2. Copy the 'External Database URL'")
    print("3. Edit reset_password_render.py")
    print("4. Replace the DATABASE_URL value with your URL")
    print("5. Run this script again\n")
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
    print("\nMake sure you copied the ENTIRE database URL from Render")
finally:
    if "conn" in locals():
        conn.close()
