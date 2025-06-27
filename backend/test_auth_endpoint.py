#!/usr/bin/env python3
"""
Test the /me endpoint directly to see what's returned
"""

import requests


# Test user login and /me endpoint
def test_me_endpoint():
    print("Testing /me endpoint...")

    # Use the working user from before
    login_data = {
        "username": "simple.test@6fbtest.com",
        "password": "TestUser2024!",
    }  # pragma: allowlist secret

    # Login first
    response = requests.post(
        "http://localhost:8000/api/v1/auth/token",
        data=login_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    if response.status_code != 200:
        print(f"Login failed: {response.status_code}")
        return

    token_data = response.json()
    access_token = token_data.get("access_token")
    print(f"✓ Login successful, got token")

    # Test /me endpoint
    headers = {"Authorization": f"Bearer {access_token}"}

    try:
        response = requests.get("http://localhost:8000/api/v1/auth/me", headers=headers)
        print(f"/me endpoint status: {response.status_code}")

        if response.status_code == 200:
            user_data = response.json()
            print("✓ /me endpoint successful!")
            print(f"User data: {user_data}")
        else:
            print(f"✗ /me failed: {response.text}")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    test_me_endpoint()
