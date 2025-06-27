#!/usr/bin/env python3
"""
Debug script to test encrypted search functionality
"""

import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, text
from config.database import get_db, DATABASE_URL
from models.user import User
from utils.encrypted_search import exact_match_encrypted_field, hash_for_search
from utils.encryption import get_encryption_manager
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


def debug_encrypted_search():
    """Debug the encrypted search functionality"""

    # Create database session
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Test email for debugging
        test_email = "admin@sixfb.com"

        print(f"\n=== DEBUGGING ENCRYPTED SEARCH FOR: {test_email} ===\n")

        # 1. Check what hash we generate
        search_hash = hash_for_search(test_email)
        print(f"1. Generated search hash: '{search_hash}' (length: {len(search_hash)})")

        # 2. Check what EncryptionManager generates
        enc_manager = get_encryption_manager()
        enc_hash = enc_manager.hash_for_search(test_email)
        print(f"2. EncryptionManager hash: '{enc_hash}' (length: {len(enc_hash)})")

        # 3. Check if hashes match
        print(f"3. Hashes match: {search_hash == enc_hash}")

        # 4. Look at actual database data
        print("\n4. Raw database data:")
        raw_query = text("SELECT id, email FROM users LIMIT 5")
        raw_results = db.execute(raw_query).fetchall()

        for row in raw_results:
            user_id, email_data = row
            print(
                f"   User {user_id}: '{email_data}' (length: {len(email_data) if email_data else 0})"
            )

            if email_data and "|" in email_data:
                parts = email_data.split("|")
                encrypted_part = parts[0]
                hash_part = parts[1] if len(parts) > 1 else ""
                print(
                    f"     - Encrypted: '{encrypted_part[:20]}...' (length: {len(encrypted_part)})"
                )
                print(f"     - Hash: '{hash_part}' (length: {len(hash_part)})")
                print(f"     - Hash matches our test: {hash_part == search_hash}")

        # 5. Test raw SQL LIKE query
        print(f"\n5. Testing raw SQL LIKE query:")
        like_pattern = f"%|{search_hash}"
        print(f"   Pattern: '{like_pattern}'")

        raw_like_query = text("SELECT id, email FROM users WHERE email LIKE :pattern")
        raw_like_results = db.execute(
            raw_like_query, {"pattern": like_pattern}
        ).fetchall()
        print(f"   Raw SQL results: {len(raw_like_results)} matches")

        for row in raw_like_results:
            user_id, email_data = row
            print(f"     - User {user_id}: {email_data}")

        # 6. Test SQLAlchemy ORM query with exact_match_encrypted_field
        print(f"\n6. Testing ORM query with exact_match_encrypted_field:")
        user_query = db.query(User)
        user_query = exact_match_encrypted_field(user_query, "email", test_email, User)

        # Get the compiled query for debugging
        try:
            compiled_query = str(
                user_query.statement.compile(compile_kwargs={"literal_binds": True})
            )
            print(f"   Compiled query: {compiled_query}")
        except Exception as e:
            print(f"   Could not compile query: {e}")

        orm_results = user_query.all()
        print(f"   ORM results: {len(orm_results)} matches")

        for user in orm_results:
            print(f"     - User {user.id}: {user.email}")

        # 7. Test direct ORM LIKE query (without text())
        print(f"\n7. Testing direct ORM LIKE query:")
        direct_query = db.query(User).filter(User.email.like(like_pattern))
        direct_results = direct_query.all()
        print(f"   Direct ORM LIKE results: {len(direct_results)} matches")

        for user in direct_results:
            print(f"     - User {user.id}: {user.email}")

        # 8. Test alternative: text() with column reference
        print(f"\n8. Testing text() with explicit column reference:")
        alt_query = (
            db.query(User)
            .filter(text("users.email LIKE :pattern"))
            .params(pattern=like_pattern)
        )
        alt_results = alt_query.all()
        print(f"   Alternative query results: {len(alt_results)} matches")

        for user in alt_results:
            print(f"     - User {user.id}: {user.email}")

    except Exception as e:
        print(f"Error during debugging: {e}")
        import traceback

        traceback.print_exc()

    finally:
        db.close()


if __name__ == "__main__":
    debug_encrypted_search()
