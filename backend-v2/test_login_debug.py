#!/usr/bin/env python3
"""
Debug login failures
"""

import os
os.environ["TESTING"] = "true"

def test_login_issue():
    """Debug why login is returning 403"""
    try:
        from fastapi.testclient import TestClient
        from main import app
        from database import get_db, Base, engine
        from sqlalchemy.orm import sessionmaker
        from models import User
        from utils.auth import get_password_hash
        
        # Set up database
        Base.metadata.create_all(bind=engine)
        Session = sessionmaker(bind=engine)
        db = Session()
        
        # Create a test user with email_verified=True
        test_email = "debug@example.com"
        
        # Remove existing user
        existing = db.query(User).filter(User.email == test_email).first()
        if existing:
            db.delete(existing)
            db.commit()
        
        # Create verified test user
        test_user = User(
            email=test_email,
            name="Debug User", 
            hashed_password=get_password_hash("testpass123"),
            role="barber",
            email_verified=True,  # This is key!
            trial_active=True
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        
        print(f"Created test user: {test_user.email}, verified: {test_user.email_verified}")
        
        # Test login
        client = TestClient(app)
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_email,
                "password": "testpass123"
            }
        )
        
        print(f"Login status: {response.status_code}")
        print(f"Login response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ Login successful!")
            data = response.json()
            print(f"Access token: {data.get('access_token', 'None')[:50]}...")
            print(f"Refresh token: {data.get('refresh_token', 'None')[:50]}...")
        else:
            print(f"❌ Login failed: {response.text}")
        
        db.close()
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_login_issue()