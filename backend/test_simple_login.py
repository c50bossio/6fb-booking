#!/usr/bin/env python3
"""
Simple login test to isolate the JWT serialization issue
"""

import requests
import json


# Test basic login
def test_simple_login():
    """Test simple login to identify the JWT issue"""
    print("Testing simple login...")

    # First, create a user
    user_data = {
        "email": "simple.test@6fbtest.com",
        "password": "TestUser2024!",  # pragma: allowlist secret
        "first_name": "Simple",
        "last_name": "Test",
        "role": "client",
    }

    # Register
    print("1. Registering user...")
    try:
        response = requests.post(
            "http://localhost:8000/api/v1/auth/register",
            json=user_data,
            headers={"Content-Type": "application/json"},
        )
        if response.status_code == 200:
            print("✓ Registration successful")
        else:
            print(f"✗ Registration failed: {response.status_code}")
            print(f"Response: {response.text}")
            return
    except Exception as e:
        print(f"✗ Registration error: {e}")
        return

    # Login
    print("2. Testing login...")
    try:
        response = requests.post(
            "http://localhost:8000/api/v1/auth/token",
            data={"username": user_data["email"], "password": user_data["password"]},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        print(f"Login response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")

        if response.status_code == 200:
            data = response.json()
            print("✓ Login successful!")
            print(
                f"Access token (first 20 chars): {data.get('access_token', 'N/A')[:20]}..."
            )
        else:
            print(f"✗ Login failed: {response.status_code}")
            print(f"Response: {response.text}")

    except Exception as e:
        print(f"✗ Login error: {e}")


if __name__ == "__main__":
    test_simple_login()
