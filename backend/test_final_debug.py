#!/usr/bin/env python3
"""
Final debug test - check both hash and password
"""

import sqlite3
from utils.encrypted_search import hash_for_search
from passlib.context import CryptContext


def test_user_1135():
    """Test the latest user"""

    # Expected data for user 1135
    test_email = "debug_1751052389@example.com"
    test_password = "TestPassword123!"  # pragma: allowlist secret

    print(f"🔧 Testing user lookup and password for: {test_email}")

    # Calculate expected hash
    expected_hash = hash_for_search(test_email)
    print(f"Expected hash: {expected_hash}")

    # Connect to database
    conn = sqlite3.connect("6fb_booking.db")
    cursor = conn.cursor()

    try:
        # Get user 1135
        cursor.execute("SELECT id, email, hashed_password FROM users WHERE id = 1135")
        row = cursor.fetchone()

        if row:
            user_id, email_field, hashed_password = row
            print(f"✅ Found user {user_id}")
            print(f"   Email field: {email_field}")

            if "|" in email_field:
                encrypted_part, stored_hash = email_field.split("|", 1)
                print(f"   Stored hash: {stored_hash}")
                print(f"   Hash match: {stored_hash == expected_hash}")

                # Test password verification
                pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
                try:
                    password_valid = pwd_context.verify(test_password, hashed_password)
                    print(f"   Password verification: {password_valid}")
                    print(f"   Password hash: {hashed_password[:20]}...")
                except Exception as e:
                    print(f"   Password verification error: {e}")

                # Test the LIKE query that should be used
                like_pattern = f"%|{expected_hash}"
                cursor.execute(
                    "SELECT id FROM users WHERE email LIKE ?", (like_pattern,)
                )
                like_result = cursor.fetchone()
                print(
                    f"   LIKE query result: {'Found' if like_result else 'Not found'}"
                )

            else:
                print("   ❌ No hash separator found")
        else:
            print("❌ User 1135 not found")

    except Exception as e:
        print(f"❌ Database error: {e}")
    finally:
        conn.close()


if __name__ == "__main__":
    test_user_1135()
