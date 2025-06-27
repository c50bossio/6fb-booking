#!/usr/bin/env python3
"""
Real authentication test against running server
"""
import requests
import os


def test_login():
    """Test login against running server"""

    url = "http://localhost:8000/api/v1/auth/token"

    # Test credentials we know exist
    test_cases = [
        {
            "username": "test@example.com",
            "password": "testpassword123",
        },  # pragma: allowlist secret
        {
            "username": "admin@6fb.com",
            "password": "admin123",
        },  # pragma: allowlist secret
    ]

    print("🔍 Testing login against running backend server...")
    print("=" * 60)

    for i, creds in enumerate(test_cases, 1):
        print(f"\n🧪 Test {i}: {creds['username']} / {creds['password']}")

        try:
            response = requests.post(
                url,
                data=creds,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10,
            )

            print(f"  📊 Status Code: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print(f"  ✅ Login successful!")
                print(f"  🎫 Token type: {data.get('token_type', 'N/A')}")
                print(f"  👤 User: {data.get('user', {}).get('full_name', 'N/A')}")
                print(f"  🔑 Role: {data.get('user', {}).get('role', 'N/A')}")
                return True
            else:
                print(f"  ❌ Login failed: {response.text}")

        except requests.exceptions.ConnectionError:
            print(f"  💀 Connection failed - backend server not running on port 8000")
            return False
        except Exception as e:
            print(f"  ⚠️  Error: {e}")

    return False


if __name__ == "__main__":
    test_login()
