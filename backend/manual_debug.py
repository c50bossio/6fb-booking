#!/usr/bin/env python3
"""
Manual debugging of the database and password verification
"""

import sys

sys.path.append(".")

from config.database import SessionLocal
from models.user import User
from passlib.context import CryptContext
from sqlalchemy import text


def debug_user_lookup_and_password():
    """Debug user lookup and password verification"""

    db = SessionLocal()
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    try:
        # Get the latest user
        print("🔍 Searching for latest user...")
        user = db.query(User).order_by(User.id.desc()).first()

        if not user:
            print("❌ No users found")
            return

        print(f"✅ Found user: ID {user.id}")
        print(f"   Email: {user.email}")
        print(f"   Hash length: {len(user.hashed_password)}")
        print(f"   Hash starts with: {user.hashed_password[:10]}...")
        print(f"   Is active: {user.is_active}")

        # Test password verification
        test_password = "TestPassword123!"  # pragma: allowlist secret
        print(f"\n🔐 Testing password verification...")
        print(f"   Password: {test_password}")

        try:
            is_valid = pwd_context.verify(test_password, user.hashed_password)
            print(f"   ✅ Bcrypt verification result: {is_valid}")
        except Exception as e:
            print(f"   ❌ Bcrypt verification error: {e}")

        # Test email search methods
        print(f"\n📧 Testing email search methods...")
        test_email = user.email

        # Method 1: Direct ORM
        try:
            found_user = db.query(User).filter(User.email == test_email).first()
            print(
                f"   Method 1 (direct ORM): {'✅ Found' if found_user else '❌ Not found'}"
            )
        except Exception as e:
            print(f"   Method 1 (direct ORM): ❌ Error: {e}")

        # Method 2: Raw SQL
        try:
            result = db.execute(
                text("SELECT * FROM users WHERE email = :email"), {"email": test_email}
            )
            row = result.fetchone()
            print(f"   Method 2 (raw SQL): {'✅ Found' if row else '❌ Not found'}")
        except Exception as e:
            print(f"   Method 2 (raw SQL): ❌ Error: {e}")

        # Method 3: Check if email is encrypted in database
        try:
            result = db.execute(
                text(
                    "SELECT id, email, hashed_password FROM users ORDER BY id DESC LIMIT 1"
                )
            )
            row = result.fetchone()
            if row:
                print(f"   Raw database email: {row[1]}")
                print(f"   Email matches search: {row[1] == test_email}")
            else:
                print(f"   No raw data found")
        except Exception as e:
            print(f"   Raw database check: ❌ Error: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    debug_user_lookup_and_password()
