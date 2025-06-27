#!/usr/bin/env python3
"""
Test with specific user that we know works
"""

import requests

BASE_URL = "http://localhost:8000"


def test_user_1135():
    """Test login with user 1135 that we verified manually"""

    test_email = "debug_1751052389@example.com"
    test_password = "TestPassword123!"  # pragma: allowlist secret

    print(f"🔧 Testing login with verified user")
    print(f"Email: {test_email}")
    print(f"Password: {test_password}")

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
            print(f"   User: {token_data['user']['full_name']}")
        else:
            print(f"❌ Login failed")
            error_data = login_response.text
            print(f"   Error response: {error_data}")

    except Exception as e:
        print(f"❌ Login error: {e}")


if __name__ == "__main__":
    test_user_1135()
