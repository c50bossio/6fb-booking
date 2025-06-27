#!/usr/bin/env python3
"""
Debug script to isolate the authentication issue
"""

import requests
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"


def debug_registration_and_login():
    """Debug the exact auth flow issue"""

    # Create test user
    timestamp = int(time.time())
    test_email = f"debug_{timestamp}@example.com"
    test_password = "TestPassword123!"  # pragma: allowlist secret

    print(f"🔧 Debug session started at {datetime.now()}")
    print(f"📧 Test email: {test_email}")
    print(f"🔐 Test password: {test_password}")

    # Step 1: Register user
    print("\n🔄 Step 1: Registration...")
    reg_data = {
        "email": test_email,
        "password": test_password,
        "first_name": "Debug",
        "last_name": "User",
        "role": "barber",
    }

    try:
        reg_response = requests.post(
            f"{BASE_URL}/api/v1/auth/register",
            json=reg_data,
            headers={"Content-Type": "application/json"},
        )

        print(f"Registration Status: {reg_response.status_code}")
        if reg_response.status_code == 200:
            user_data = reg_response.json()
            print(f"✅ User created: ID {user_data['id']}")
            print(f"   Email in response: {user_data['email']}")
        else:
            print(f"❌ Registration failed: {reg_response.text}")
            return

    except Exception as e:
        print(f"❌ Registration error: {e}")
        return

    # Step 2: Immediate login
    print(f"\n🔄 Step 2: Immediate login...")
    print(f"   Using email: '{test_email}'")
    print(f"   Using password: '{test_password}'")

    time.sleep(0.5)  # Small delay like in frontend

    try:
        login_response = requests.post(
            f"{BASE_URL}/api/v1/auth/token",
            data={"username": test_email, "password": test_password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        print(f"Login Status: {login_response.status_code}")
        if login_response.status_code == 200:
            print("✅ Login successful!")
            token_data = login_response.json()
            print(f"   Token: {token_data['access_token'][:20]}...")
        else:
            print(f"❌ Login failed")
            error_data = login_response.text
            print(f"   Error response: {error_data}")

    except Exception as e:
        print(f"❌ Login error: {e}")

    # Step 3: Try to query the user directly via API
    print(f"\n🔄 Step 3: Testing user lookup...")
    try:
        # Try a simple health check first
        health_response = requests.get(f"{BASE_URL}/api/v1/auth/health")
        print(f"Health check status: {health_response.status_code}")

        # Try to get auth test data
        test_data_response = requests.get(
            f"{BASE_URL}/api/v1/auth/subscription/test-data"
        )
        print(f"Test data status: {test_data_response.status_code}")

    except Exception as e:
        print(f"❌ API test error: {e}")


if __name__ == "__main__":
    debug_registration_and_login()
