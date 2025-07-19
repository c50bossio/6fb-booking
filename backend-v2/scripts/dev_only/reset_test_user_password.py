#!/usr/bin/env python3
"""
Reset test user password.
"""

import os
import sys

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User, UnifiedUserRole
from utils.auth_simple import pwd_context

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./6fb_booking.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def reset_password():
    """Reset test user password."""
    db = SessionLocal()
    
    try:
        # Find test user
        user = db.query(User).filter(User.email == "test@example.com").first()
        if not user:
            print("Test user not found!")
            return
        
        # Reset password
        new_password = "testpassword123"
        user.hashed_password = pwd_context.hash(new_password)
        
        # Also fix the role - use the enum value as string
        user.unified_role = UnifiedUserRole.SHOP_OWNER.value
        
        db.commit()
        
        print(f"Password reset successfully:")
        print(f"  Email: {user.email}")
        print(f"  New password: {new_password}")
        print(f"  Role updated to: {user.unified_role}")
        
        # Verify password works
        is_valid = pwd_context.verify(new_password, user.hashed_password)
        print(f"  Password verification: {is_valid}")
        
    finally:
        db.close()

if __name__ == "__main__":
    reset_password()