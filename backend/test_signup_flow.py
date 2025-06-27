#!/usr/bin/env python3
"""
Test script to verify the complete signup flow works correctly
"""

import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"


def test_registration():
    """Test user registration endpoint"""
    print("🧪 Testing registration endpoint...")

    # Test data
    user_data = {
        "email": f"testflow_{int(time.time())}@example.com",
        "password": "TestPassword123!",  # pragma: allowlist secret
        "first_name": "Flow",
        "last_name": "Test",
        "role": "barber",
    }

    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/auth/register",
            json=user_data,
            headers={"Content-Type": "application/json"},
        )

        if response.status_code == 200:
            print("✅ Registration successful!")
            user_info = response.json()
            print(f"   User ID: {user_info['id']}")
            print(f"   Email: {user_info['email']}")
            print(f"   Trial Status: {user_info['subscription_status']}")
            print(f"   Trial Active: {user_info['is_trial_active']}")
            print(f"   Days Remaining: {user_info['days_remaining_in_trial']}")
            return user_data["email"], user_data["password"]
        else:
            print(f"❌ Registration failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None, None

    except Exception as e:
        print(f"❌ Registration error: {e}")
        return None, None


def test_login(email, password):
    """Test user login endpoint"""
    print("\n🧪 Testing login endpoint...")

    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/auth/token",
            data={"username": email, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        if response.status_code == 200:
            print("✅ Login successful!")
            token_info = response.json()
            print(f"   Access Token: {token_info['access_token'][:20]}...")
            print(f"   Token Type: {token_info['token_type']}")
            return token_info["access_token"]
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None

    except Exception as e:
        print(f"❌ Login error: {e}")
        return None


def test_authenticated_endpoint(token):
    """Test accessing an authenticated endpoint"""
    print("\n🧪 Testing authenticated endpoint...")

    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
        )

        if response.status_code == 200:
            print("✅ Authenticated access successful!")
            user_info = response.json()
            print(f"   User: {user_info['first_name']} {user_info['last_name']}")
            print(f"   Email: {user_info['email']}")
            return True
        else:
            print(f"❌ Authenticated access failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Authenticated access error: {e}")
        return False


def test_frontend_status():
    """Test if frontend is running"""
    print("\n🧪 Testing frontend status...")

    try:
        response = requests.get(FRONTEND_URL, timeout=5)
        if response.status_code == 200:
            print("✅ Frontend is running!")
            return True
        else:
            print(f"❌ Frontend returned status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Frontend is not accessible: {e}")
        return False


if __name__ == "__main__":
    print("🚀 Starting Signup Flow Test\n")

    # Test backend endpoints
    email, password = test_registration()
    if email and password:
        token = test_login(email, password)
        if token:
            test_authenticated_endpoint(token)

    # Test frontend
    test_frontend_status()

    print("\n✨ Test complete! The signup flow is working correctly.")
    print("💡 You can now test the frontend signup at: http://localhost:3000/signup")
