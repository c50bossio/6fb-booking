#!/usr/bin/env python3
"""Test client registration functionality directly"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User
from db import Base
from passlib.context import CryptContext

# Setup database
DATABASE_URL = "sqlite:///./test_client_reg.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def test_client_registration():
    """Test the client registration flow"""
    
    # Create test data
    test_client = {
        "first_name": "Test",
        "last_name": "Client",
        "email": "testclient@example.com",
        "password": "testpass123",
        "phone": "555-1234",
        "marketing_consent": True
    }
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == test_client["email"]).first()
        if existing_user:
            print(f"❌ User already exists with email: {test_client['email']}")
            db.delete(existing_user)
            db.commit()
            print("   Deleted existing user for clean test")
        
        # Create new user
        hashed_password = pwd_context.hash(test_client["password"])
        new_user = User(
            email=test_client["email"],
            name=f"{test_client['first_name']} {test_client['last_name']}",
            hashed_password=hashed_password,
            user_type="client",
            unified_role="client",
            email_verified=True,
            phone=test_client["phone"],
            marketing_consent=test_client["marketing_consent"]
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print("✅ Client registration successful!")
        print(f"   User ID: {new_user.id}")
        print(f"   Email: {new_user.email}")
        print(f"   Name: {new_user.name}")
        print(f"   Type: {new_user.user_type}")
        print(f"   Role: {new_user.unified_role}")
        print(f"   Email Verified: {new_user.email_verified}")
        print(f"   Marketing Consent: {new_user.marketing_consent}")
        
        # Verify user can be retrieved
        retrieved_user = db.query(User).filter(User.email == test_client["email"]).first()
        if retrieved_user:
            print("\n✅ User retrieval successful!")
            print(f"   Retrieved user ID: {retrieved_user.id}")
        else:
            print("\n❌ Failed to retrieve user")
            
    except Exception as e:
        print(f"❌ Error during registration: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
        
    # Clean up test database
    os.remove("test_client_reg.db") if os.path.exists("test_client_reg.db") else None

if __name__ == "__main__":
    print("🧪 Testing Client Registration Functionality")
    print("=" * 50)
    test_client_registration()
    print("\n✅ Test completed!")