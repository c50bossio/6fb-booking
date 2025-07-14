#!/usr/bin/env python3
"""
Debug authentication test failures by testing individual components
"""

import os
import sys
import json
import traceback
from datetime import datetime

# Set testing environment
os.environ["TESTING"] = "true"

def test_basic_fastapi_client():
    """Test that FastAPI TestClient works with our app"""
    try:
        print("🔍 Testing FastAPI TestClient compatibility...")
        
        from fastapi.testclient import TestClient
        from main import app
        
        client = TestClient(app)
        
        # Test basic health endpoint
        response = client.get("/health")
        print(f"Health check status: {response.status_code}")
        print(f"Health check response: {response.json()}")
        
        return True
        
    except Exception as e:
        print(f"❌ FastAPI TestClient failed: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return False

def test_auth_endpoint_exists():
    """Test that auth endpoints are accessible"""
    try:
        print("\n🔍 Testing auth endpoint accessibility...")
        
        from fastapi.testclient import TestClient
        from main import app
        
        client = TestClient(app)
        
        # Test auth test endpoint
        response = client.get("/api/v1/auth/test")
        print(f"Auth test endpoint status: {response.status_code}")
        print(f"Auth test response: {response.json()}")
        
        return True
        
    except Exception as e:
        print(f"❌ Auth endpoint test failed: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return False

def test_database_setup():
    """Test database operations"""
    try:
        print("\n🔍 Testing database setup...")
        
        from database import get_db, engine, Base
        from sqlalchemy.orm import sessionmaker
        from models import User
        
        # Create tables
        Base.metadata.create_all(bind=engine)
        
        # Test session creation
        Session = sessionmaker(bind=engine)
        db = Session()
        
        # Test basic query
        user_count = db.query(User).count()
        print(f"✅ Database connection successful (found {user_count} users)")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return False

def test_simple_registration():
    """Test registration endpoint directly"""
    try:
        print("\n🔍 Testing simple registration...")
        
        from fastapi.testclient import TestClient
        from main import app
        from database import get_db, Base, engine
        from sqlalchemy.orm import sessionmaker
        from models import User
        import uuid
        
        # Ensure clean database
        Base.metadata.create_all(bind=engine)
        Session = sessionmaker(bind=engine)
        db = Session()
        
        # Create unique test data
        test_email = f"test-{uuid.uuid4().hex[:8]}@example.com"
        test_data = {
            "email": test_email,
            "password": "Test123!",
            "name": "Test User",
            "user_type": "barber"
        }
        
        # Ensure user doesn't exist
        existing = db.query(User).filter(User.email == test_email).first()
        if existing:
            db.delete(existing)
            db.commit()
        
        client = TestClient(app)
        
        print(f"Attempting registration with: {test_email}")
        response = client.post("/api/v1/auth/register", json=test_data)
        
        print(f"Registration status: {response.status_code}")
        print(f"Registration response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Registration successful for {data.get('user', {}).get('email')}")
            return True
        else:
            print(f"❌ Registration failed with status {response.status_code}")
            print(f"Error details: {response.text}")
            return False
        
    except Exception as e:
        print(f"❌ Registration test failed: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return False

def test_mock_notification_service():
    """Test that notification service mocking works"""
    try:
        print("\n🔍 Testing notification service mocking...")
        
        from services.notification_service import NotificationService
        
        # Create service instance
        service = NotificationService()
        
        # Test that methods exist
        assert hasattr(service, 'send_email')
        assert hasattr(service, 'send_sms')
        
        print("✅ Notification service instance created successfully")
        return True
        
    except Exception as e:
        print(f"❌ Notification service test failed: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return False

def test_password_validation():
    """Test password validation service"""
    try:
        print("\n🔍 Testing password validation...")
        
        from services.password_security import validate_password_strength
        
        # Test strong password
        result = validate_password_strength("Test123!", {"email": "test@example.com", "name": "Test"})
        print(f"Strong password validation: valid={result.is_valid}, score={result.strength_score}")
        
        # Test weak password  
        weak_result = validate_password_strength("weak", {"email": "test@example.com", "name": "Test"})
        print(f"Weak password validation: valid={weak_result.is_valid}, errors={weak_result.errors}")
        
        print("✅ Password validation working")
        return True
        
    except Exception as e:
        print(f"❌ Password validation failed: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return False

def main():
    """Run all debug tests and report results"""
    print("🚀 Authentication Test Debug Suite")
    print("=" * 60)
    print(f"⏰ Started at: {datetime.now().isoformat()}")
    print()
    
    tests = [
        ("FastAPI TestClient", test_basic_fastapi_client),
        ("Auth Endpoints", test_auth_endpoint_exists),
        ("Database Setup", test_database_setup),
        ("Notification Service", test_mock_notification_service),
        ("Password Validation", test_password_validation),
        ("Simple Registration", test_simple_registration)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            success = test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 DEBUG SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"   {status} {test_name}")
    
    print(f"\n🎯 Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("\n🎉 All debug tests passed!")
        print("✅ Ready to investigate specific auth test failures")
    else:
        print(f"\n⚠️  {total - passed} tests failed. These issues need to be resolved first.")
        print("❌ Fix these infrastructure issues before proceeding with auth tests")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)