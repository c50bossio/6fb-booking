#!/usr/bin/env python3
"""
Debug encryption and login process
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.user import User
from config.database import SessionLocal
from utils.encrypted_search import exact_match_encrypted_field
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def debug_login_process():
    """Debug the login process step by step"""

    db = SessionLocal()

    # Test credentials
    test_email = "test@example.com"
    test_password = "testpassword123"

    print("🔍 Debugging login process...")
    print("=" * 50)
    print(f"Test email: {test_email}")
    print(f"Test password: {test_password}")
    print()

    try:
        # Step 1: Try the encrypted search
        print("Step 1: Searching for user with encrypted search...")
        user_query = db.query(User)
        user_query = exact_match_encrypted_field(user_query, "email", test_email, User)
        user = user_query.first()

        if user:
            print(
                f"  ✅ Found user: {user.first_name} {user.last_name} (ID: {user.id})"
            )
            print(f"  📧 Stored email: {user.email}")

            # Step 2: Test password verification
            print("Step 2: Testing password verification...")
            if pwd_context.verify(test_password, user.hashed_password):
                print("  ✅ Password verification successful!")
            else:
                print("  ❌ Password verification failed!")
        else:
            print("  ❌ User not found with encrypted search")

            # Try direct search to see what emails are in the database
            print("  🔍 Checking all users in database...")
            all_users = db.query(User).all()
            print(f"  📊 Total users: {len(all_users)}")

            for i, u in enumerate(all_users[:5]):  # Show first 5
                print(
                    f"    User {i+1}: {u.first_name} {u.last_name} - Email: {u.email}"
                )

    except Exception as e:
        print(f"❌ Error in debug process: {e}")
        import traceback

        traceback.print_exc()

    finally:
        db.close()


if __name__ == "__main__":
    debug_login_process()
