#!/usr/bin/env python3
"""
Full authentication flow test for 6FB Payouts
Tests: Registration -> Login -> Access Protected Route
"""
import requests
import json
import random
import string

BASE_URL = "http://localhost:8000/api/v1"


def generate_random_email():
    """Generate a random email for testing"""
    random_str = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"test_{random_str}@example.com"


def test_full_auth_flow():
    # Generate random test user data
    test_email = generate_random_email()
    test_password = "TestPassword123!"  # pragma: allowlist secret

    print("=" * 60)
    print("6FB PAYOUTS - AUTHENTICATION FLOW TEST")
    print("=" * 60)

    # Step 1: Register a new user
    print("\n1. TESTING USER REGISTRATION")
    print("-" * 40)
    register_data = {
        "email": test_email,
        "password": test_password,
        "first_name": "Test",
        "last_name": "User",
        "role": "barber",
    }

    print(f"Registering user: {test_email}")
    register_response = requests.post(f"{BASE_URL}/auth/register", json=register_data)

    if register_response.status_code == 200:
        print("✅ Registration successful!")
        user_data = register_response.json()
        print(f"   User ID: {user_data['id']}")
        print(f"   Email: {user_data['email']}")
        print(f"   Name: {user_data['first_name']} {user_data['last_name']}")
        print(f"   Role: {user_data['role']}")
    else:
        print("❌ Registration failed!")
        print(f"   Status: {register_response.status_code}")
        print(f"   Error: {register_response.text}")
        return

    # Step 2: Login with the new user
    print("\n2. TESTING USER LOGIN")
    print("-" * 40)
    login_data = {"username": test_email, "password": test_password}

    print(f"Logging in as: {test_email}")
    login_response = requests.post(
        f"{BASE_URL}/auth/token",
        data=login_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    if login_response.status_code == 200:
        print("✅ Login successful!")
        token_data = login_response.json()
        access_token = token_data["access_token"]
        user_info = token_data["user"]
        print(f"   Token: {access_token[:20]}...")
        print(f"   User: {user_info['full_name']} ({user_info['email']})")
        print(f"   Role: {user_info['role']}")
    else:
        print("❌ Login failed!")
        print(f"   Status: {login_response.status_code}")
        print(f"   Error: {login_response.text}")
        return

    # Step 3: Access protected route
    print("\n3. TESTING PROTECTED ROUTE ACCESS")
    print("-" * 40)
    headers = {"Authorization": f"Bearer {access_token}"}

    print("Accessing /auth/me endpoint...")
    me_response = requests.get(f"{BASE_URL}/auth/me", headers=headers)

    if me_response.status_code == 200:
        print("✅ Protected route access successful!")
        me_data = me_response.json()
        print(f"   User ID: {me_data['id']}")
        print(f"   Email: {me_data['email']}")
        print(f"   Name: {me_data['first_name']} {me_data['last_name']}")
        print(f"   Active: {me_data['is_active']}")
        print(f"   Created: {me_data['created_at']}")
    else:
        print("❌ Protected route access failed!")
        print(f"   Status: {me_response.status_code}")
        print(f"   Error: {me_response.text}")

    # Step 4: Test invalid token
    print("\n4. TESTING INVALID TOKEN HANDLING")
    print("-" * 40)
    bad_headers = {"Authorization": "Bearer invalid_token_12345"}

    print("Trying to access with invalid token...")
    bad_response = requests.get(f"{BASE_URL}/auth/me", headers=bad_headers)

    if bad_response.status_code == 401:
        print("✅ Invalid token correctly rejected!")
        print(f"   Status: {bad_response.status_code}")
        print(f"   Message: Unauthorized (as expected)")
    else:
        print("❌ Invalid token handling failed!")
        print(f"   Status: {bad_response.status_code}")
        print(f"   Error: {bad_response.text}")

    print("\n" + "=" * 60)
    print("AUTHENTICATION FLOW TEST COMPLETE")
    print("=" * 60)

    return {
        "email": test_email,
        "password": test_password,
        "token": access_token if "access_token" in locals() else None,
    }


if __name__ == "__main__":
    credentials = test_full_auth_flow()

    if credentials and credentials["token"]:
        print(f"\n📝 Test Credentials:")
        print(f"   Email: {credentials['email']}")
        print(f"   Password: {credentials['password']}")
        print(f"\n✅ You can now login at http://localhost:3000/login")
