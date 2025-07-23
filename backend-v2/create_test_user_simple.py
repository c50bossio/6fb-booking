#!/usr/bin/env python3
"""Create a test user for development"""

from sqlalchemy.orm import Session
from db import SessionLocal, engine
from models import User
from utils.auth import get_password_hash
import sys

def create_test_user():
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == "test@example.com").first()
        if existing_user:
            print("User test@example.com already exists")
            return
        
        # Create new user
        new_user = User(
            email="test@example.com",
            hashed_password=get_password_hash("testpass123"),
            name="Test User",
            role="user",
            is_active=True
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print(f"Test user created successfully!")
        print(f"Email: test@example.com")
        print(f"Password: testpass123")
        print(f"User ID: {new_user.id}")
        
    except Exception as e:
        print(f"Error creating user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()