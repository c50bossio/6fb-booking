#!/usr/bin/env python3
"""
Create a test user for payment system testing
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from config.database import get_db, engine
from models.user import User
from sqlalchemy.orm import Session
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_test_user():
    """Create or update test user"""
    db = next(get_db())
    
    try:
        # Check if user exists
        existing_user = db.query(User).filter(User.email == "test@example.com").first()
        
        if existing_user:
            # Update password
            existing_user.hashed_password = pwd_context.hash("testpassword123")
            db.commit()
            print("✅ Updated existing test user password")
        else:
            # Create new user
            user = User(
                email="test@example.com",
                hashed_password=pwd_context.hash("testpassword123"),
                first_name="Test",
                last_name="User",
                role="admin",
                is_active=True
            )
            db.add(user)
            db.commit()
            print("✅ Created new test user")
            
        print("User: test@example.com")
        print("Password: testpassword123")
        print("Role: admin")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()