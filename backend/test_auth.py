#!/usr/bin/env python3
"""
Test authentication endpoints
"""
import requests
import json

# Base URL
BASE_URL = "http://localhost:8000"

def test_login():
    """Test login endpoint"""
    print("Testing login endpoint...")
    
    # Test with admin credentials
    response = requests.post(
        f"{BASE_URL}/api/v1/auth/token",
        data={
            "username": "admin@6fb.com",
            "password": "password123"
        }
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Success! Token: {data['access_token'][:20]}...")
        return data['access_token']
    else:
        print(f"Error: {response.text}")
        return None

def test_current_user(token):
    """Test getting current user"""
    print("\nTesting current user endpoint...")
    
    response = requests.get(
        f"{BASE_URL}/api/v1/auth/me",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Current User: {json.dumps(data, indent=2)}")
    else:
        print(f"Error: {response.text}")

def main():
    """Run tests"""
    print("6FB Booking Platform - Authentication Test")
    print("=" * 50)
    
    # Test login
    token = test_login()
    
    # Test current user if login succeeded
    if token:
        test_current_user(token)

if __name__ == "__main__":
    main()