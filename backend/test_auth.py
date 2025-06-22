#\!/usr/bin/env python3
import requests
import json

# Test registration
def test_register():
    url = "http://localhost:8000/api/v1/auth/register"
    data = {
        "email": "test@example.com",
        "password": "TestPass123\!",
        "first_name": "Test",
        "last_name": "User",
        "role": "barber"
    }

    response = requests.post(url, json=data)
    print("Registration Response:")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    return response

# Test login
def test_login():
    url = "http://localhost:8000/api/v1/auth/token"
    data = {
        "username": "test@example.com",
        "password": "TestPass123\!"
    }

    response = requests.post(url, data=data)
    print("\nLogin Response:")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

    if response.status_code == 200:
        token_data = response.json()
        return token_data["access_token"]
    return None

# Test getting current user
def test_get_me(token):
    url = "http://localhost:8000/api/v1/auth/me"
    headers = {
        "Authorization": f"Bearer {token}"
    }

    response = requests.get(url, headers=headers)
    print("\nGet Current User Response:")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    # First try to register
    test_register()

    # Then try to login
    token = test_login()

    # If login successful, get user info
    if token:
        test_get_me(token)
EOF < /dev/null
