#!/usr/bin/env python3
"""
Test script to verify Six Figure Barber authentication
"""
import requests
import json

# Test login and Six Figure Barber access
API_URL = "http://localhost:8000"

def test_auth_and_six_figure():
    # Test login with admin user
    login_data = {
        "email": "admin@example.com",  # Adjust if needed
        "password": "admin123"  # Adjust if needed
    }
    
    print("🔐 Testing login...")
    login_response = requests.post(f"{API_URL}/api/v2/auth/login", json=login_data)
    print(f"Login status: {login_response.status_code}")
    
    if login_response.status_code == 200:
        token_data = login_response.json()
        token = token_data.get("access_token")
        print(f"✅ Login successful, token: {token[:20]}...")
        
        # Test Six Figure Barber dashboard with token
        headers = {"Authorization": f"Bearer {token}"}
        print("\n📊 Testing Six Figure Barber dashboard...")
        dashboard_response = requests.get(f"{API_URL}/api/v2/six-figure-barber/dashboard", headers=headers)
        print(f"Dashboard status: {dashboard_response.status_code}")
        
        if dashboard_response.status_code != 200:
            print(f"❌ Dashboard error: {dashboard_response.text}")
        else:
            print("✅ Dashboard access successful!")
            
        # Test user info
        print("\n👤 Testing user info...")
        user_response = requests.get(f"{API_URL}/api/v2/auth/me", headers=headers)
        print(f"User info status: {user_response.status_code}")
        if user_response.status_code == 200:
            user_data = user_response.json()
            print(f"User: {user_data.get('email')} - Role: {user_data.get('role')}")
        
    else:
        print(f"❌ Login failed: {login_response.text}")

if __name__ == "__main__":
    test_auth_and_six_figure()