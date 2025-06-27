#!/usr/bin/env python3
"""
Test different decryption approaches to figure out the encryption key issue
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
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def test_decryption_approaches():
    """Test different decryption approaches"""

    # Create engine directly
    engine = create_engine("sqlite:///6fb_booking.db")

    # Get a sample encrypted email
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT email FROM users WHERE email LIKE '%|%' LIMIT 1")
        )
        raw_email = result.fetchone()[0]
        print(f"Raw email field: {raw_email}")

        if "|" in raw_email:
            encrypted_part = raw_email.split("|")[0]
            hash_part = raw_email.split("|")[1]
            print(f"Encrypted part: {encrypted_part}")
            print(f"Hash part: {hash_part}")

            # Test 1: Current environment key
            print("\n=== Test 1: Current DATA_ENCRYPTION_KEY ===")
            current_key = os.getenv("DATA_ENCRYPTION_KEY")
            if current_key:
                try:
                    fernet = Fernet(current_key.encode())
                    decoded_data = base64.urlsafe_b64decode(encrypted_part.encode())
                    decrypted = fernet.decrypt(decoded_data)
                    result = decrypted.decode()
                    print(f"✅ SUCCESS: {result}")
                except Exception as e:
                    print(f"❌ FAILED: {e}")

            # Test 2: Try master password approach
            print("\n=== Test 2: Master password approach ===")
            master_password = os.getenv("MASTER_PASSWORD")
            if master_password:
                try:
                    salt = b"6fb_booking_salt_2025"
                    kdf = PBKDF2HMAC(
                        algorithm=hashes.SHA256(),
                        length=32,
                        salt=salt,
                        iterations=100000,
                    )
                    key = base64.urlsafe_b64encode(kdf.derive(master_password.encode()))
                    fernet = Fernet(key)

                    decoded_data = base64.urlsafe_b64decode(encrypted_part.encode())
                    decrypted = fernet.decrypt(decoded_data)
                    result = decrypted.decode()
                    print(f"✅ SUCCESS with master password: {result}")
                except Exception as e:
                    print(f"❌ FAILED with master password: {e}")
            else:
                print("No MASTER_PASSWORD set")

            # Test 3: Try a different salt that might have been used
            print("\n=== Test 3: Different salt variations ===")
            if master_password:
                salts_to_try = [
                    b"6fb_booking_salt",
                    b"6fb_booking_salt_2024",
                    b"6fb_booking_salt_2025",
                    b"6fb_salt",
                    b"booking_salt",
                ]

                for salt in salts_to_try:
                    try:
                        kdf = PBKDF2HMAC(
                            algorithm=hashes.SHA256(),
                            length=32,
                            salt=salt,
                            iterations=100000,
                        )
                        key = base64.urlsafe_b64encode(
                            kdf.derive(master_password.encode())
                        )
                        fernet = Fernet(key)

                        decoded_data = base64.urlsafe_b64decode(encrypted_part.encode())
                        decrypted = fernet.decrypt(decoded_data)
                        result = decrypted.decode()
                        print(f"✅ SUCCESS with salt {salt.decode()}: {result}")
                        break
                    except Exception as e:
                        print(f"❌ FAILED with salt {salt.decode()}: {e}")

            # Test 4: Check if it's actually not encrypted (fallback case)
            print("\n=== Test 4: Check if it's plain text ===")
            try:
                # Maybe it's base64 encoded plain text?
                decoded = base64.urlsafe_b64decode(encrypted_part.encode())
                plain_text = decoded.decode()
                print(f"✅ Plain text after base64 decode: {plain_text}")
            except Exception as e:
                print(f"❌ Not plain text: {e}")

            # Test 5: Check environment variables
            print("\n=== Test 5: Environment variables ===")
            print(
                f"DATA_ENCRYPTION_KEY: {'SET' if os.getenv('DATA_ENCRYPTION_KEY') else 'NOT SET'}"
            )
            print(
                f"MASTER_PASSWORD: {'SET' if os.getenv('MASTER_PASSWORD') else 'NOT SET'}"
            )

            # Show first few characters of keys for debugging
            if current_key:
                print(f"DATA_ENCRYPTION_KEY starts with: {current_key[:10]}...")
            if master_password:
                print(f"MASTER_PASSWORD starts with: {master_password[:3]}...")


if __name__ == "__main__":
    test_decryption_approaches()
