#!/usr/bin/env python3
"""
Check test user details for debugging.
"""

import os
import sys

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User
from utils.auth_simple import pwd_context

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./6fb_booking.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_test_user():
    """Check test user and verify password."""
    db = SessionLocal()
    
    try:
        # Find test user
        user = db.query(User).filter(User.email == "test@example.com").first()
        if not user:
            print("Test user not found!")
            return
        
        print(f"User found:")
        print(f"  ID: {user.id}")
        print(f"  Email: {user.email}")
        print(f"  Name: {user.name}")
        print(f"  Active: {user.is_active}")
        print(f"  Verified: {getattr(user, 'is_verified', 'N/A')}")
        print(f"  Email Verified: {getattr(user, 'email_verified', 'N/A')}")
        print(f"  Has hashed_password: {bool(user.hashed_password)}")
        print(f"  Role: {user.role}")
        print(f"  Unified Role: {getattr(user, 'unified_role', 'N/A')}")
        
        # Test password verification
        test_password = "testpassword123"
        if user.hashed_password:
            is_valid = pwd_context.verify(test_password, user.hashed_password)
            print(f"\nPassword verification test:")
            print(f"  Testing password: {test_password}")
            print(f"  Password valid: {is_valid}")
        else:
            print("\nNo hashed password found!")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_test_user()