#!/usr/bin/env python3
"""
Test the exact login flow to identify the issue
"""

import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from config.database import DATABASE_URL
from models.user import User
from utils.encrypted_search import exact_match_encrypted_field, hash_for_search
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


def test_login_flow():
    """Test the exact login flow"""

    # Create database session
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Test with the email that was failing
        test_email = "admin@sixfb.com"

        print(f"=== TESTING LOGIN FLOW FOR: {test_email} ===")
        print()

        # Step 1: Calculate hash
        search_hash = hash_for_search(test_email)
        print(f"1. Search hash for '{test_email}': {search_hash}")

        # Step 2: Replicate exact login code
        print(f"\n2. Replicating exact login code:")

        user = None
        email = test_email  # This is form_data.username in login

        logger.debug(f"Attempting login for email: {email}")

        try:
            # Use encrypted search since email field is SearchableEncryptedString
            logger.debug(f"Searching for user with email: {email}")

            user_query = db.query(User)
            user_query = exact_match_encrypted_field(user_query, "email", email, User)
            user = user_query.first()  # This is the line that fails

            if user:
                logger.debug(f"User found via encrypted search - ID: {user.id}")
                print(f"   ✅ SUCCESS: Found user {user.id} with email: {user.email}")
            else:
                logger.debug(f"User not found with encrypted search")
                print(f"   ❌ FAILURE: No user found")

        except Exception as e:
            logger.error(f"Error during encrypted user lookup: {str(e)}")
            print(f"   ❌ ERROR: {e}")
            user = None

        # Step 3: Let's try with a known working email
        print(f"\n3. Let's find what emails actually exist:")

        # Get all users and see their hashes
        all_users = db.query(User).limit(10).all()
        for user in all_users:
            print(f"   User {user.id}: {user.email}")

            # If we can see a real email, test login with it
            if user.email and not user.email.startswith("[ENCRYPTED"):
                print(f"   → Testing login with actual email: {user.email}")

                test_user_query = db.query(User)
                test_user_query = exact_match_encrypted_field(
                    test_user_query, "email", user.email, User
                )
                found_test_user = test_user_query.first()

                if found_test_user:
                    print(f"     ✅ SUCCESS: Found user {found_test_user.id}")
                else:
                    print(f"     ❌ FAILURE: Could not find user with their own email")

                break  # Test with first valid email only

    except Exception as e:
        print(f"Error during testing: {e}")
        import traceback

        traceback.print_exc()

    finally:
        db.close()


if __name__ == "__main__":
    test_login_flow()
