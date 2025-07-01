#!/usr/bin/env python3

"""
Simple authentication test to verify login functionality
"""

from database import SessionLocal
from models import User
from utils.auth import authenticate_user, get_password_hash, verify_password
import requests
import json

def test_password_verification():
    """Test password hashing and verification"""
    print("Testing password verification...")
    
    test_password = "testpass123"
    hashed = get_password_hash(test_password)
    
    # Test verification
    is_valid = verify_password(test_password, hashed)
    print(f"Password verification: {'PASS' if is_valid else 'FAIL'}")
    
    # Test with wrong password
    is_invalid = verify_password("wrongpassword", hashed)
    print(f"Wrong password rejection: {'PASS' if not is_invalid else 'FAIL'}")
    
    return is_valid and not is_invalid

def test_user_creation():
    """Create a test user for authentication"""
    print("\nCreating test user...")
    
    db = SessionLocal()
    try:
        # Remove existing test user if it exists
        existing_user = db.query(User).filter(User.email == "authtest@example.com").first()
        if existing_user:
            db.delete(existing_user)
            db.commit()
            print("Removed existing test user")
        
        # Create new test user
        test_user = User(
            email="authtest@example.com",
            name="Auth Test",
            hashed_password=get_password_hash("testpass123"),
            role="user",
            is_active=True
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        
        print(f"Created test user: {test_user.email} (ID: {test_user.id})")
        return test_user
        
    except Exception as e:
        print(f"Error creating test user: {e}")
        db.rollback()
        return None
    finally:
        db.close()

def test_authenticate_function():
    """Test the authenticate_user function directly"""
    print("\nTesting authenticate_user function...")
    
    db = SessionLocal()
    try:
        # Test with correct credentials
        user = authenticate_user(db, "authtest@example.com", "testpass123")
        if user:
            print(f"Authentication successful: {user.email}")
            success = True
        else:
            print("Authentication failed with correct credentials")
            success = False
        
        # Test with wrong password
        user_wrong = authenticate_user(db, "authtest@example.com", "wrongpassword")
        if not user_wrong:
            print("Correctly rejected wrong password")
            success = success and True
        else:
            print("Incorrectly accepted wrong password")
            success = False
        
        return success
        
    except Exception as e:
        print(f"Error in authenticate function: {e}")
        return False
    finally:
        db.close()

def test_api_login():
    """Test the API login endpoint"""
    print("\nTesting API login endpoint...")
    
    try:
        # Test login
        response = requests.post(
            "http://localhost:8000/api/v1/auth/login",
            json={"username": "authtest@example.com", "password": "testpass123"},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Login response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                print("Login successful - received access token")
                return data["access_token"]
            else:
                print("Login response missing access token")
                return None
        else:
            print(f"Login failed: {response.text}")
            return None
        
    except Exception as e:
        print(f"Error testing API login: {e}")
        return None

def test_authenticated_endpoint(token):
    """Test an authenticated endpoint"""
    if not token:
        print("No token available - skipping authenticated endpoint test")
        return False
    
    print("\nTesting authenticated endpoint...")
    
    try:
        response = requests.get(
            "http://localhost:8000/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"Profile response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Profile data: {data}")
            return True
        else:
            print(f"Profile request failed: {response.text}")
            return False
        
    except Exception as e:
        print(f"Error testing authenticated endpoint: {e}")
        return False

def main():
    """Run all authentication tests"""
    print("🔐 Starting Authentication Tests")
    print("=" * 40)
    
    results = []
    
    # Test 1: Password verification
    results.append(("Password Verification", test_password_verification()))
    
    # Test 2: User creation
    user = test_user_creation()
    results.append(("User Creation", user is not None))
    
    # Test 3: Direct authentication function
    results.append(("Authenticate Function", test_authenticate_function()))
    
    # Test 4: API login
    token = test_api_login()
    results.append(("API Login", token is not None))
    
    # Test 5: Authenticated endpoint
    results.append(("Authenticated Endpoint", test_authenticated_endpoint(token)))
    
    # Summary
    print("\n" + "=" * 40)
    print("🔐 AUTHENTICATION TEST RESULTS")
    print("=" * 40)
    
    passed = 0
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if success:
            passed += 1
    
    print(f"\nSummary: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All authentication tests passed!")
        return True
    else:
        print("❌ Some authentication tests failed")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)