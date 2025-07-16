#!/usr/bin/env python3
"""
Create Test Admin User Script

Creates a test admin user for development and testing purposes.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User
from passlib.context import CryptContext
from config import settings

def create_test_admin():
    """Create test admin user if it doesn't exist"""
    # Create database connection
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if test admin already exists
        existing_admin = db.query(User).filter(User.email == "admin.test@bookedbarber.com").first()
        
        if existing_admin:
            print("✅ Test admin user already exists!")
            print(f"   Email: {existing_admin.email}")
            print(f"   Role: {existing_admin.role}")
            print(f"   Active: {existing_admin.is_active}")
            return existing_admin
        
        # Create password context
        pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
        
        # Create new admin user
        test_admin = User(
            email="admin.test@bookedbarber.com",
            name="Test Admin User",
            hashed_password=pwd_context.hash("AdminTest123"),
            role="admin",
            is_active=True,
            email_verified=True,
            phone="+1234567890"
        )
        
        db.add(test_admin)
        db.commit()
        db.refresh(test_admin)
        
        print("🎉 Test admin user created successfully!")
        print(f"   ID: {test_admin.id}")
        print(f"   Email: admin.test@bookedbarber.com")
        print(f"   Password: AdminTest123")
        print(f"   Role: {test_admin.role}")
        
        return test_admin
        
    except Exception as e:
        print(f"❌ Error creating test admin user: {e}")
        db.rollback()
        return None
    finally:
        db.close()

if __name__ == "__main__":
    create_test_admin()