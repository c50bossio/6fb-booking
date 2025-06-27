#!/usr/bin/env python3
"""
Test the actual login endpoint to verify the fix works end-to-end
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables from .env file
from dotenv import load_dotenv

load_dotenv()

import requests
import json


def test_actual_login():
    """Test the actual login endpoint"""

    # Start the server first - use the development server
    print("Testing actual login endpoint...")
    print("Make sure the server is running on http://localhost:8000")

    # Test login data
    login_data = {
        "username": "admin@6fb.com",  # This is the email field
        "password": "admin123",  # This needs to match the actual password  # pragma: allowlist secret
    }

    # Test the login endpoint
    try:
        response = requests.post(
            "http://localhost:8000/api/v1/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")

        if response.status_code == 200:
            print("✅ LOGIN SUCCESS!")
            response_data = response.json()
            print(f"Response data: {json.dumps(response_data, indent=2)}")

            # Check if we got tokens
            if "access_token" in response_data:
                print("🎉 Access token received - login is fully working!")
            else:
                print("⚠️  No access token in response")

        elif response.status_code == 401:
            print("❌ LOGIN FAILED - Unauthorized")
            print(f"Error response: {response.text}")
            print("This could mean:")
            print("1. User not found (our fix didn't work)")
            print("2. Wrong password")
            print("3. User account disabled")

        else:
            print(f"❌ Unexpected response code: {response.status_code}")
            print(f"Response: {response.text}")

    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server")
        print("Please start the server with: uvicorn main:app --reload")
        print("Then run this test again")

    except Exception as e:
        print(f"❌ Error during login test: {e}")


if __name__ == "__main__":
    test_actual_login()
