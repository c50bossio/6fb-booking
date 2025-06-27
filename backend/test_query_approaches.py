#!/usr/bin/env python3
"""
Test different query approaches for encrypted search
"""

import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, text
from config.database import DATABASE_URL
from models.user import User
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


def test_query_approaches():
    """Test different ways to query encrypted fields"""

    # Create database session
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        known_hash = "aa5cd624198bfb87"  # Hash we know exists  # pragma: allowlist secret
        like_pattern = f"%|{known_hash}"

        print(f"Testing different query approaches for pattern: {like_pattern}")
        print()

        # Approach 1: Raw SQL with text() and params
        print("1. Raw SQL with text() and params:")
        try:
            query1 = (
                db.query(User)
                .filter(text("users.email LIKE :pattern"))
                .params(pattern=like_pattern)
            )
            result1 = query1.all()
            print(f"   Result: {len(result1)} matches")
        except Exception as e:
            print(f"   Error: {e}")

        # Approach 2: Raw SQL with direct string interpolation (DANGEROUS but for testing)
        print("\n2. Raw SQL with direct string interpolation:")
        try:
            query2 = db.query(User).filter(text(f"users.email LIKE '{like_pattern}'"))
            result2 = query2.all()
            print(f"   Result: {len(result2)} matches")
        except Exception as e:
            print(f"   Error: {e}")

        # Approach 3: Use raw database execute
        print("\n3. Raw database execute:")
        try:
            raw_query = text("SELECT COUNT(*) FROM users WHERE email LIKE :pattern")
            result3 = db.execute(raw_query, {"pattern": like_pattern}).scalar()
            print(f"   Result: {result3} matches")
        except Exception as e:
            print(f"   Error: {e}")

        # Approach 4: Direct column LIKE (this will trigger encryption)
        print("\n4. Direct column LIKE (will trigger encryption):")
        try:
            query4 = db.query(User).filter(User.email.like(like_pattern))
            result4 = query4.all()
            print(f"   Result: {len(result4)} matches")
        except Exception as e:
            print(f"   Error: {e}")

        # Approach 5: Test the specific approach from exact_match_encrypted_field
        print("\n5. Current exact_match_encrypted_field approach:")
        try:
            from sqlalchemy import text

            query5 = db.query(User)
            query5 = query5.filter(
                text(f"{User.__tablename__}.email LIKE :pattern")
            ).params(pattern=like_pattern)
            result5 = query5.all()
            print(f"   Result: {len(result5)} matches")
        except Exception as e:
            print(f"   Error: {e}")

    except Exception as e:
        print(f"General error: {e}")
        import traceback

        traceback.print_exc()

    finally:
        db.close()


if __name__ == "__main__":
    test_query_approaches()
