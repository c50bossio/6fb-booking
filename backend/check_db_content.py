#!/usr/bin/env python3
"""
Check what's actually stored in the database
"""

import sqlite3
from utils.encrypted_search import hash_for_search


def check_database_content():
    """Check what's in the database"""

    # Connect to SQLite database
    conn = sqlite3.connect("6fb_booking.db")
    cursor = conn.cursor()

    try:
        # Get the latest few users
        cursor.execute(
            "SELECT id, email, first_name, last_name, created_at FROM users ORDER BY id DESC LIMIT 5"
        )
        rows = cursor.fetchall()

        print("🔍 Latest users in database:")
        for row in rows:
            user_id, email, first_name, last_name, created_at = row
            print(f"   ID: {user_id}")
            print(f"   Email field content: {email}")
            print(f"   Name: {first_name} {last_name}")
            print(f"   Created: {created_at}")

            # Check if email contains the pipe separator
            if "|" in email:
                encrypted_part, hash_part = email.split("|", 1)
                print(f"   - Encrypted part: {encrypted_part[:20]}...")
                print(f"   - Hash part: {hash_part}")

                # Test if we can generate the same hash
                if first_name == "Debug":
                    test_email = (
                        f"debug_{user_id-1112}@example.com"  # Estimate the email
                    )
                    expected_hash = hash_for_search(test_email)
                    print(f"   - Expected hash for {test_email}: {expected_hash}")
                    print(f"   - Hashes match: {hash_part == expected_hash}")
            else:
                print(f"   - No pipe separator found - may not be encrypted properly")

            print()

    except Exception as e:
        print(f"❌ Database error: {e}")
    finally:
        conn.close()


if __name__ == "__main__":
    check_database_content()
