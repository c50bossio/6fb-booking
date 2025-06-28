#!/usr/bin/env python3
"""
Fix admin account on Render - Run this in Render Shell
"""
import os
from sqlalchemy import create_engine, text
from passlib.context import CryptContext
from datetime import datetime

# Get database URL from environment
DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("❌ DATABASE_URL not found!")
    exit(1)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print("🔍 Checking admin account...")

# Password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

try:
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        # Check if admin exists
        result = conn.execute(
            text(
                """
            SELECT id, email, first_name, last_name, is_active
            FROM users
            WHERE email = 'c50bossio@gmail.com'
        """
            )
        )

        admin = result.fetchone()

        if admin:
            print(f"✅ Found admin: {admin.first_name} {admin.last_name}")
            print(f"   Active: {admin.is_active}")

            # Reset password
            new_password = "admin123"
            hashed_password = pwd_context.hash(new_password)

            conn.execute(
                text(
                    """
                UPDATE users
                SET hashed_password = :password,
                    is_active = true,
                    updated_at = :updated_at
                WHERE id = :user_id
            """
                ),
                {
                    "password": hashed_password,
                    "user_id": admin.id,
                    "updated_at": datetime.utcnow(),
                },
            )

            conn.commit()
            print("✅ Password reset successfully!")
        else:
            print("❌ Admin not found, creating new admin...")

            # Create admin
            hashed_password = pwd_context.hash("admin123")

            result = conn.execute(
                text(
                    """
                INSERT INTO users (
                    email, hashed_password, first_name, last_name,
                    role, is_active, created_at, updated_at
                ) VALUES (
                    :email, :password, :first_name, :last_name,
                    :role, :is_active, :created_at, :updated_at
                ) RETURNING id
            """
                ),
                {
                    "email": "c50bossio@gmail.com",
                    "password": hashed_password,
                    "first_name": "Admin",
                    "last_name": "User",
                    "role": "admin",
                    "is_active": True,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                },
            )

            user_id = result.scalar()
            conn.commit()
            print(f"✅ Admin created with ID: {user_id}")

        print("\n📧 Login credentials:")
        print("Email: c50bossio@gmail.com")
        print("Password: admin123")

except Exception as e:
    print(f"❌ Error: {str(e)}")

    # Try to show existing users
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT id, email, role FROM users LIMIT 5"))
            users = result.fetchall()
            if users:
                print("\nExisting users:")
                for user in users:
                    print(f"  - {user.email} ({user.role})")
    except:
        pass
