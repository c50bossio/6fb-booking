#!/usr/bin/env python3
"""
Test decryption with the production encryption key
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
import base64
from cryptography.fernet import Fernet


def test_production_key():
    """Test decryption with the production encryption key"""

    # Use the production key
    production_key = (
        "loK0a3QbI2HrUO6hDrilCe7QifXZIitX60KoKfLyluU"  # pragma: allowlist secret
    )

    # Create engine directly
    engine = create_engine("sqlite:///6fb_booking.db")

    fernet = Fernet(production_key.encode())

    # Get several sample encrypted emails
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT id, email FROM users WHERE email LIKE '%|%' LIMIT 5")
        )
        users = result.fetchall()

        print("Testing decryption with PRODUCTION encryption key:")
        print("=" * 70)

        success_count = 0

        for user_id, raw_email in users:
            print(f"\nUser ID {user_id}:")

            if "|" in raw_email:
                encrypted_part = raw_email.split("|")[0]
                hash_part = raw_email.split("|")[1]

                try:
                    # Test the corrected decryption process:
                    decoded_data = base64.urlsafe_b64decode(encrypted_part.encode())
                    decrypted_data = fernet.decrypt(decoded_data)
                    result_email = decrypted_data.decode()

                    print(f"✅ SUCCESS! Decrypted email: '{result_email}'")
                    success_count += 1

                    # Verify the hash matches
                    from utils.encrypted_search import hash_for_search

                    calculated_hash = hash_for_search(result_email)
                    print(f"   Calculated hash: {calculated_hash}")
                    print(f"   Stored hash: {hash_part}")
                    print(f"   Hash match: {calculated_hash == hash_part}")

                except Exception as e:
                    print(f"❌ FAILED: {e}")

        print(f"\n{'='*70}")
        print(f"SUMMARY: {success_count}/{len(users)} users decrypted successfully")

        if success_count > 0:
            print("\n🎉 SOLUTION FOUND!")
            print(
                "The data was encrypted with the PRODUCTION key, not the current .env key"
            )
            print("We need to fix the EncryptionManager to use the correct key")

            # Test the encrypted search with the correct key understanding
            print("\n" + "=" * 70)
            print("Testing encrypted search with PRODUCTION key understanding:")
            print("=" * 70)

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
                if "|" in raw_email:
                    encrypted_part = raw_email.split("|")[0]
                    try:
                        decoded_data = base64.urlsafe_b64decode(encrypted_part.encode())
                        decrypted_data = fernet.decrypt(decoded_data)
                        result_email = decrypted_data.decode()
                        print(f"  ✅ User ID {user_id}: '{result_email}'")
                    except Exception as e:
                        print(f"  ❌ User ID {user_id}: Decryption failed - {e}")
        else:
            print("\n❌ Production key didn't work either")
            print("The data might be encrypted with a different key or method")


if __name__ == "__main__":
    test_production_key()
