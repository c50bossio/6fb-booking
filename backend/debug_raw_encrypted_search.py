#!/usr/bin/env python3
"""
Debug script for encrypted email search issue - RAW SQL approach
Tests the encrypted search logic step by step without ORM
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables from .env file
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import create_engine, text
from utils.encrypted_search import hash_for_search
from utils.encryption import get_encryption_manager
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


def debug_raw_encrypted_search():
    """Debug the encrypted search using raw SQL"""

    # Create engine directly
    engine = create_engine("sqlite:///6fb_booking.db")

    try:
        with engine.connect() as conn:
            # Step 1: Check what users exist (raw)
            print("=" * 60)
            print("STEP 1: Check existing users (RAW SQL)")
            print("=" * 60)

            result = conn.execute(text("SELECT COUNT(*) as total FROM users"))
            total_count = result.fetchone()[0]
            print(f"Total users in database: {total_count}")

            # Get some sample users with raw email field
            result = conn.execute(text("SELECT id, email FROM users LIMIT 5"))
            raw_users = result.fetchall()

            print("Sample users with raw email fields:")
            for user_id, raw_email_field in raw_users:
                print(f"User ID {user_id}: '{raw_email_field}'")

                # Check if it has the expected encrypted format
                if raw_email_field and "|" in raw_email_field:
                    parts = raw_email_field.split("|")
                    print(f"  -> Encrypted part: '{parts[0][:30]}...'")
                    print(f"  -> Hash part: '{parts[1]}'")

                    # Try to decrypt the first part
                    try:
                        encrypted_part = parts[0]
                        decrypted = get_encryption_manager().decrypt(encrypted_part)
                        print(f"  -> Decrypted email: '{decrypted}'")
                    except Exception as e:
                        print(f"  -> Decryption failed: {e}")
                else:
                    print(f"  -> No pipe separator found or empty field!")

            # Step 2: Test hash generation
            print("\nSTEP 2: Test hash generation")
            print("=" * 60)

            test_email = "admin@6fb.com"  # Use a known test email
            hash1 = hash_for_search(test_email)
            hash2 = get_encryption_manager().hash_for_search(test_email)

            print(f"Test email: '{test_email}'")
            print(f"Hash from utils.encrypted_search: '{hash1}'")
            print(f"Hash from EncryptionManager: '{hash2}'")
            print(f"Hashes match: {hash1 == hash2}")

            # Step 3: Test LIKE queries with actual data
            print("\nSTEP 3: Test LIKE queries with real data")
            print("=" * 60)

            # Get the first user's real email
            if raw_users:
                user_id, raw_email_field = raw_users[0]
                print(f"Testing with User ID {user_id}")
                print(f"Raw email field: '{raw_email_field}'")

                if raw_email_field and "|" in raw_email_field:
                    parts = raw_email_field.split("|")
                    encrypted_part = parts[0]
                    stored_hash = parts[1]

                    try:
                        # Decrypt to get the actual email
                        actual_email = get_encryption_manager().decrypt(encrypted_part)
                        print(f"Actual email: '{actual_email}'")

                        # Generate hash for this email
                        calculated_hash = hash_for_search(actual_email)
                        print(f"Calculated hash: '{calculated_hash}'")
                        print(f"Stored hash: '{stored_hash}'")
                        print(f"Hashes match: {calculated_hash == stored_hash}")

                        # Test LIKE query with calculated hash
                        like_pattern = f"%|{calculated_hash}"
                        print(f"LIKE pattern: '{like_pattern}'")

                        like_result = conn.execute(
                            text(
                                "SELECT id, email FROM users WHERE email LIKE :pattern"
                            ),
                            {"pattern": like_pattern},
                        )
                        like_users = like_result.fetchall()

                        print(f"LIKE query found {len(like_users)} matches:")
                        for match_id, match_email in like_users:
                            print(f"  -> User ID {match_id}: '{match_email}'")

                        # Test with stored hash too
                        stored_pattern = f"%|{stored_hash}"
                        print(f"Testing stored hash pattern: '{stored_pattern}'")

                        stored_result = conn.execute(
                            text(
                                "SELECT id, email FROM users WHERE email LIKE :pattern"
                            ),
                            {"pattern": stored_pattern},
                        )
                        stored_users = stored_result.fetchall()

                        print(f"Stored hash query found {len(stored_users)} matches:")
                        for match_id, match_email in stored_users:
                            print(f"  -> User ID {match_id}: '{match_email}'")

                    except Exception as e:
                        print(f"Error processing user data: {e}")

            # Step 4: Test with common emails
            print("\nSTEP 4: Test with common test emails")
            print("=" * 60)

            test_emails = ["admin@6fb.com", "test@example.com", "user@test.com"]

            for email in test_emails:
                print(f"\nTesting email: '{email}'")
                test_hash = hash_for_search(email)
                test_pattern = f"%|{test_hash}"

                print(f"Hash: '{test_hash}'")
                print(f"Pattern: '{test_pattern}'")

                test_result = conn.execute(
                    text("SELECT id, email FROM users WHERE email LIKE :pattern"),
                    {"pattern": test_pattern},
                )
                test_users = test_result.fetchall()

                print(f"Found {len(test_users)} matches:")
                for match_id, match_email in test_users:
                    print(f"  -> User ID {match_id}")
                    # Try to decrypt and show the actual email
                    try:
                        if match_email and "|" in match_email:
                            encrypted_part = match_email.split("|")[0]
                            decrypted = get_encryption_manager().decrypt(encrypted_part)
                            print(f"     Decrypted: '{decrypted}'")
                    except Exception as e:
                        print(f"     Decryption error: {e}")

            print("\nDEBUG COMPLETE")
            print("=" * 60)

    except Exception as e:
        print(f"Debug error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    debug_raw_encrypted_search()
