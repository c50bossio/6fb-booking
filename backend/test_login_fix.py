#!/usr/bin/env python3
"""
Test the login fix with improved decryption error handling
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables from .env file
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy.orm import Session
from config.database import SessionLocal
from models.user import User
from utils.encrypted_search import exact_match_encrypted_field
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


def test_login_fix():
    """Test that the login fix allows user lookup without decryption"""

    db: Session = SessionLocal()

    try:
        # Test with a known email that should exist
        test_email = "admin@6fb.com"

        print("=" * 60)
        print("TESTING LOGIN FIX")
        print("=" * 60)
        print(f"Searching for email: '{test_email}'")

        # Use the same search logic as the login endpoint
        user_query = db.query(User)
        user_query = exact_match_encrypted_field(user_query, "email", test_email, User)

        # Try to get the user
        user = user_query.first()

        if user:
            print(f"✅ User found successfully!")
            print(f"   User ID: {user.id}")
            print(f"   User email field: '{user.email}'")
            print(f"   User first name: '{user.first_name}'")
            print(f"   User last name: '{user.last_name}'")
            print(f"   User is_active: {user.is_active}")

            # Check if the email is the placeholder (indicating decryption failed but user exists)
            if user.email == "[ENCRYPTED_EMAIL_DECRYPTION_FAILED]":
                print(
                    "   📝 Note: Email decryption failed, but user was found successfully"
                )
                print(
                    "   🎯 This means login should work even without the correct decryption key"
                )

            print("\n🎉 LOGIN FIX SUCCESS!")
            print("The encrypted search is working and users can be found for login")

        else:
            print("❌ User not found")
            print("The search is still not working")

        # Test with multiple emails to ensure it works broadly
        print("\n" + "=" * 60)
        print("TESTING MULTIPLE EMAILS")
        print("=" * 60)

        test_emails = ["admin@6fb.com", "test@example.com", "user@test.com"]

        for email in test_emails:
            print(f"\nTesting: '{email}'")

            user_query = db.query(User)
            user_query = exact_match_encrypted_field(user_query, "email", email, User)
            users_found = user_query.all()

            print(f"Found {len(users_found)} users")
            for user in users_found[:3]:  # Show first 3
                print(
                    f"  User ID {user.id}: email='{user.email}', name='{user.first_name} {user.last_name}'"
                )

        print("\n" + "=" * 60)
        print("TEST COMPLETE")
        print("=" * 60)

    except Exception as e:
        print(f"Error during test: {e}")
        import traceback

        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    test_login_fix()
