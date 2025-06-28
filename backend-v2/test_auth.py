#!/usr/bin/env python3
"""Test authentication endpoints."""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_login():
    """Test the login endpoint."""
    print("Testing login endpoint...")
    
    # Test data
    login_data = {
        "username": "admin@6fb.com",
        "password": "admin123"
    }
    
    # Make request
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json=login_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("Login successful!")
        print(f"Access Token: {data['access_token'][:50]}...")
        print(f"Token Type: {data['token_type']}")
        return data['access_token']
    else:
        print("Login failed!")
        print(f"Response: {response.text}")
        return None

def test_get_me(token):
    """Test the /me endpoint with authentication."""
    print("\nTesting /auth/me endpoint...")
    
    # Make request with bearer token
    response = requests.get(
        f"{BASE_URL}/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("Get user successful!")
        print(f"User Data: {json.dumps(data, indent=2)}")
    else:
        print("Get user failed!")
        print(f"Response: {response.text}")

def test_unauthorized():
    """Test accessing protected endpoint without token."""
    print("\nTesting unauthorized access...")
    
    response = requests.get(f"{BASE_URL}/auth/me")
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    print("Starting authentication tests...\n")
    
    # Test unauthorized access
    test_unauthorized()
    
    # Test login
    token = test_login()
    
    # Test authenticated access
    if token:
        test_get_me(token)
    
    print("\nTests completed!")