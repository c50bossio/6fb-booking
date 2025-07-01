#!/usr/bin/env python3
"""
Setup test users for integration testing
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import User
from utils.auth import get_password_hash
from datetime import datetime

def create_test_users():
    """Create test users for integration testing"""
    db = SessionLocal()
    
    test_users = [
        {
            "email": "admin@sixfb.com",
            "name": "Admin User",
            "password": "admin123",
            "role": "admin",
            "timezone": "America/New_York"
        },
        {
            "email": "barber@sixfb.com",
            "name": "Test Barber",
            "password": "barber123",
            "role": "barber",
            "timezone": "America/New_York"
        },
        {
            "email": "testuser@example.com",
            "name": "Test User",
            "password": "testpass123",
            "role": "user",
            "timezone": "America/New_York"
        }
    ]
    
    try:
        for user_data in test_users:
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()
            if existing_user:
                print(f"User {user_data['email']} already exists, updating...")
                existing_user.hashed_password = get_password_hash(user_data["password"])
                existing_user.role = user_data["role"]
                existing_user.timezone = user_data["timezone"]
                existing_user.is_active = True
            else:
                print(f"Creating user {user_data['email']}...")
                new_user = User(
                    email=user_data["email"],
                    name=user_data["name"],
                    hashed_password=get_password_hash(user_data["password"]),
                    role=user_data["role"],
                    timezone=user_data["timezone"],
                    is_active=True,
                    created_at=datetime.utcnow()
                )
                db.add(new_user)
        
        db.commit()
        print("✅ Test users created/updated successfully!")
        
        # List all users
        all_users = db.query(User).all()
        print(f"\nTotal users in database: {len(all_users)}")
        for user in all_users:
            print(f"  - {user.email} ({user.role})")
        
    except Exception as e:
        print(f"❌ Error creating test users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_users()