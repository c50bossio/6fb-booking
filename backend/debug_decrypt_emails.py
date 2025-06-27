#!/usr/bin/env python3
"""
Debug script to decrypt actual emails in database
"""

import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, text
from config.database import DATABASE_URL
from models.user import User
from utils.encryption import get_encryption_manager
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


def debug_decrypt_emails():
    """Debug by decrypting actual emails in database"""

    # Create database session
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        print(f"\n=== DEBUGGING EMAIL DECRYPTION ===\n")

        # Get encryption manager
        enc_manager = get_encryption_manager()

        # Get all users via ORM to see decrypted emails
        print("1. Getting users via ORM (should decrypt automatically):")
        users = db.query(User).limit(5).all()

        for user in users:
            print(f"   User {user.id}: '{user.email}'")

            # Now calculate hash for this decrypted email
            if user.email and not user.email.startswith("[ENCRYPTED"):
                calculated_hash = enc_manager.hash_for_search(user.email)
                print(f"     - Calculated hash for '{user.email}': {calculated_hash}")

        # Test with a known user's email
        print("\n2. Testing search with actual user email:")
        if users:
            test_user = users[0]
            test_email = test_user.email

            if test_email and not test_email.startswith("[ENCRYPTED"):
                print(f"   Testing search for: '{test_email}'")

                # Import the search function
                from utils.encrypted_search import exact_match_encrypted_field

                user_query = db.query(User)
                user_query = exact_match_encrypted_field(
                    user_query, "email", test_email, User
                )
                found_users = user_query.all()

                print(f"   Found {len(found_users)} users")
                for found_user in found_users:
                    print(f"     - User {found_user.id}: {found_user.email}")

        # Raw database check with hash we know exists
        print("\n3. Testing with known hash from database:")
        known_hash = (
            "aa5cd624198bfb87"  # From previous debug output  # pragma: allowlist secret
        )

        raw_like_query = text("SELECT id FROM users WHERE email LIKE :pattern")
        raw_like_results = db.execute(
            raw_like_query, {"pattern": f"%|{known_hash}"}
        ).fetchall()
        print(f"   Raw SQL with known hash results: {len(raw_like_results)} matches")

    except Exception as e:
        print(f"Error during debugging: {e}")
        import traceback

        traceback.print_exc()

    finally:
        db.close()


if __name__ == "__main__":
    debug_decrypt_emails()
