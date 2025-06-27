#!/usr/bin/env python3
"""
Test the double base64 encoding hypothesis
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


def test_double_base64():
    """Test double base64 decoding approach"""

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

            # Test double base64 + fernet decryption
            print("\n=== Test: Double Base64 + Fernet Decryption ===")
            current_key = os.getenv("DATA_ENCRYPTION_KEY")
            if current_key:
                try:
                    # Step 1: First base64 decode
                    first_decode = base64.urlsafe_b64decode(encrypted_part.encode())
                    print(f"After first base64 decode: {first_decode}")

                    # Step 2: Fernet decrypt
                    fernet = Fernet(current_key.encode())
                    decrypted = fernet.decrypt(first_decode)
                    result = decrypted.decode()
                    print(f"✅ SUCCESS: {result}")

                    # Verify the hash matches
                    from utils.encrypted_search import hash_for_search

                    calculated_hash = hash_for_search(result)
                    print(f"Calculated hash: {calculated_hash}")
                    print(f"Stored hash: {hash_part}")
                    print(f"Hashes match: {calculated_hash == hash_part}")

                except Exception as e:
                    print(f"❌ FAILED: {e}")
                    import traceback

                    traceback.print_exc()


if __name__ == "__main__":
    test_double_base64()
