#!/usr/bin/env python3
"""
Test different master password and default key approaches
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def test_master_password_approaches():
    """Test different master password approaches and default keys"""

    # Test different master passwords and default keys that might have been used
    master_passwords_to_test = [
        "admin123",
        "password",
        "6fb",
        "sixfigurebarber",
        "booking",
        "test",
        "development",
        "6fb_booking",
        "master",
        "",  # Empty password
    ]

    # Test different salts that might have been used
    salts_to_test = [
        b"6fb_booking_salt_2025",
        b"6fb_booking_salt",
        b"6fb_salt",
        b"booking_salt",
        b"salt",
        b"6fb",
    ]

    # Also test some common default Fernet keys
    default_keys_to_test = [
        "gAAAAABhZ_eK7w-bm9g-ddjEqM_gzQ7dFQs2JmlGU3XO-HN_UKvHcm0=",  # Common test key  # pragma: allowlist secret
        "gAAAAABhZ_eK7w-bm9g-ddjEqM_gzQ7dFQs2JmlGU3XO-HN_UKvHcm0",  # Without =  # pragma: allowlist secret
        Fernet.generate_key().decode(),  # Fresh key (won't work but tests the format)
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
        print(f"Encrypted part: {encrypted_part[:50]}...")
        print(f"Hash part: {hash_part}")
        print("=" * 70)

        # Test 1: Master password approaches
        print("\n=== Testing Master Password Approaches ===")
        for master_password in master_passwords_to_test:
            for salt in salts_to_test:
                try:
                    if master_password == "":
                        continue  # Skip empty password with salt

                    kdf = PBKDF2HMAC(
                        algorithm=hashes.SHA256(),
                        length=32,
                        salt=salt,
                        iterations=100000,
                    )
                    key = base64.urlsafe_b64encode(kdf.derive(master_password.encode()))
                    fernet = Fernet(key)

                    # Try to decrypt
                    decoded_data = base64.urlsafe_b64decode(encrypted_part.encode())
                    decrypted_data = fernet.decrypt(decoded_data)
                    result_email = decrypted_data.decode()

                    print(
                        f"🎉 SUCCESS with master password '{master_password}' and salt '{salt.decode()}'"
                    )
                    print(f"   Decrypted email: '{result_email}'")

                    # Verify hash
                    from utils.encrypted_search import hash_for_search

                    calculated_hash = hash_for_search(result_email)
                    print(f"   Hash match: {calculated_hash == hash_part}")

                    return master_password, salt.decode()

                except Exception:
                    pass  # Silently try next combination

        # Test 2: Default/common keys
        print("\n=== Testing Default/Common Keys ===")
        for i, test_key in enumerate(default_keys_to_test):
            try:
                fernet = Fernet(test_key.encode())

                # Try to decrypt
                decoded_data = base64.urlsafe_b64decode(encrypted_part.encode())
                decrypted_data = fernet.decrypt(decoded_data)
                result_email = decrypted_data.decode()

                print(f"🎉 SUCCESS with default key #{i+1}")
                print(f"   Key: {test_key}")
                print(f"   Decrypted email: '{result_email}'")

                return test_key

            except Exception:
                pass  # Silently try next key

        # Test 3: Check if it might be plain text or a different encoding
        print("\n=== Testing Alternative Encodings ===")
        try:
            # Maybe it's just base64 encoded plain text?
            decoded = base64.urlsafe_b64decode(encrypted_part.encode())
            if decoded.startswith(b"gAAAAA"):  # Fernet prefix
                print("Data looks like Fernet-encrypted data (starts with gAAAAA)")
            else:
                try:
                    plain_text = decoded.decode("utf-8")
                    print(f"Might be plain text: '{plain_text}'")
                except:
                    print("Not plain text after base64 decode")
        except Exception as e:
            print(f"Base64 decode failed: {e}")

        print("\n❌ No working key found")
        print("The data might be encrypted with a key that's no longer available")
        print("or using a different encryption method entirely")


if __name__ == "__main__":
    test_master_password_approaches()
