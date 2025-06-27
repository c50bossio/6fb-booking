#!/usr/bin/env python3
"""
Test different key formats to find the correct one
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
import base64
from cryptography.fernet import Fernet


def test_key_formats():
    """Test different key formats"""

    # Available keys
    current_key = "imxJo-lpXEYaRh1XWhWEhcv3fNnlQfIwYQ0O-yEy8gM="  # pragma: allowlist secret
    production_key = "loK0a3QbI2HrUO6hDrilCe7QifXZIitX60KoKfLyluU"  # pragma: allowlist secret
    second_key = "OJKlj1kP7p10g_lGT2qQ7N-vzSF_Q2Rs9vbFt-NJ16A="  # From line 21 in .env  # pragma: allowlist secret

    keys_to_test = [
        ("Current key", current_key),
        ("Production key", production_key),
        ("Production key with =", production_key + "="),
        ("Production key with ==", production_key + "=="),
        ("Second key from .env", second_key),
    ]

    # Create engine directly
    engine = create_engine("sqlite:///6fb_booking.db")

    # Get a sample encrypted email
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT id, email FROM users WHERE email LIKE '%|%' LIMIT 1")
        )
        user_data = result.fetchone()

        if not user_data:
            print("No encrypted users found")
            return

        user_id, raw_email = user_data

        if "|" not in raw_email:
            print("Email not in expected format")
            return

        encrypted_part = raw_email.split("|")[0]
        hash_part = raw_email.split("|")[1]

        print(f"Testing with User ID {user_id}")
        print(f"Raw email: {raw_email}")
        print(f"Encrypted part: {encrypted_part}")
        print(f"Hash part: {hash_part}")
        print("=" * 70)

        for key_name, key_value in keys_to_test:
            print(f"\nTesting {key_name}: {key_value}")

            try:
                # Try to create Fernet instance
                fernet = Fernet(key_value.encode())
                print(f"  ✅ Fernet instance created successfully")

                # Try to decrypt
                decoded_data = base64.urlsafe_b64decode(encrypted_part.encode())
                decrypted_data = fernet.decrypt(decoded_data)
                result_email = decrypted_data.decode()

                print(f"  🎉 DECRYPTION SUCCESS: '{result_email}'")

                # Verify hash
                from utils.encrypted_search import hash_for_search

                calculated_hash = hash_for_search(result_email)
                print(f"  Hash verification: {calculated_hash == hash_part}")

                # If this worked, test with multiple users
                print(f"  Testing with more users...")
                result = conn.execute(
                    text("SELECT id, email FROM users WHERE email LIKE '%|%' LIMIT 3")
                )
                test_users = result.fetchall()

                success_count = 0
                for test_id, test_email in test_users:
                    if "|" in test_email:
                        test_encrypted = test_email.split("|")[0]
                        try:
                            test_decoded = base64.urlsafe_b64decode(
                                test_encrypted.encode()
                            )
                            test_decrypted = fernet.decrypt(test_decoded)
                            test_result = test_decrypted.decode()
                            success_count += 1
                            print(f"    User {test_id}: {test_result}")
                        except:
                            pass

                print(
                    f"  📊 Successfully decrypted {success_count}/{len(test_users)} test users"
                )

                if success_count > 0:
                    print(f"\n🎯 FOUND THE CORRECT KEY: {key_name}")
                    print(f"Key value: {key_value}")
                    return key_value

            except ValueError as e:
                print(f"  ❌ Fernet creation failed: {e}")
            except Exception as e:
                print(f"  ❌ Decryption failed: {e}")

        print(f"\n❌ None of the keys worked")

        # Try to understand the key format better
        print(f"\nAnalyzing key formats:")
        for key_name, key_value in keys_to_test:
            print(
                f"{key_name}: length={len(key_value)}, ends_with_equals={'=' in key_value}"
            )


if __name__ == "__main__":
    test_key_formats()
