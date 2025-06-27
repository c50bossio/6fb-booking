#!/usr/bin/env python3
"""
Test the corrected decryption approach
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables from .env file
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import create_engine, text
import base64
from cryptography.fernet import Fernet


def test_correct_decryption():
    """Test the corrected decryption that matches the double-base64 encryption"""

    # Create engine directly
    engine = create_engine("sqlite:///6fb_booking.db")
    current_key = os.getenv("DATA_ENCRYPTION_KEY")

    if not current_key:
        print("No DATA_ENCRYPTION_KEY found")
        return

    fernet = Fernet(current_key.encode())

    # Get several sample encrypted emails
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT id, email FROM users WHERE email LIKE '%|%' LIMIT 5")
        )
        users = result.fetchall()

        print("Testing corrected decryption approach:")
        print("=" * 60)

        for user_id, raw_email in users:
            print(f"\nUser ID {user_id}:")
            print(f"Raw email field: {raw_email}")

            if "|" in raw_email:
                encrypted_part = raw_email.split("|")[0]
                hash_part = raw_email.split("|")[1]

                try:
                    # Corrected decryption process to match the double-base64 encryption:
                    # 1. First base64 decode (removes the outer base64 encoding)
                    decoded_data = base64.urlsafe_b64decode(encrypted_part.encode())
                    # 2. Fernet decrypt (which handles its own internal base64 encoding)
                    decrypted_data = fernet.decrypt(decoded_data)
                    result_email = decrypted_data.decode()

                    print(f"✅ Decrypted email: '{result_email}'")

                    # Verify the hash matches
                    from utils.encrypted_search import hash_for_search

                    calculated_hash = hash_for_search(result_email)
                    print(f"Calculated hash: {calculated_hash}")
                    print(f"Stored hash: {hash_part}")
                    print(f"Hashes match: {calculated_hash == hash_part}")

                    if calculated_hash == hash_part:
                        print("🎉 HASH VERIFICATION PASSED")
                    else:
                        print("⚠️  Hash mismatch - but decryption worked")

                except Exception as e:
                    print(f"❌ FAILED: {e}")

        # Test the encrypted search now that we know decryption works
        print("\n" + "=" * 60)
        print("Testing encrypted search with corrected understanding:")
        print("=" * 60)

        # Test with a known email
        test_email = "admin@6fb.com"
        from utils.encrypted_search import hash_for_search

        test_hash = hash_for_search(test_email)
        test_pattern = f"%|{test_hash}"

        print(f"Searching for email: '{test_email}'")
        print(f"Expected hash: '{test_hash}'")
        print(f"LIKE pattern: '{test_pattern}'")

        search_result = conn.execute(
            text("SELECT id, email FROM users WHERE email LIKE :pattern"),
            {"pattern": test_pattern},
        )
        found_users = search_result.fetchall()

        print(f"Found {len(found_users)} users:")
        for user_id, raw_email in found_users:
            encrypted_part = raw_email.split("|")[0]
            try:
                decoded_data = base64.urlsafe_b64decode(encrypted_part.encode())
                decrypted_data = fernet.decrypt(decoded_data)
                result_email = decrypted_data.decode()
                print(f"  User ID {user_id}: '{result_email}'")
            except Exception as e:
                print(f"  User ID {user_id}: Decryption failed - {e}")


if __name__ == "__main__":
    test_correct_decryption()
