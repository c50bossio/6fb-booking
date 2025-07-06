#!/usr/bin/env python3
"""Verify analytics endpoint with authentication"""

import requests
import json
from datetime import datetime, timedelta

# Test user credentials
EMAIL = "test-barber@6fb.com"
PASSWORD = "testpass123"

# API endpoints
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/v1/auth/login"
ANALYTICS_URL = f"{BASE_URL}/api/v1/agents/analytics"

def test_analytics_with_auth():
    # Step 1: Login to get access token
    print("1. Logging in...")
    login_response = requests.post(LOGIN_URL, json={
        "email": EMAIL,
        "password": PASSWORD
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(login_response.text)
        return False
    
    login_data = login_response.json()
    access_token = login_data.get("access_token")
    print(f"✅ Login successful, got access token")
    
    # Step 2: Call analytics endpoint with auth
    print("\n2. Testing analytics endpoint...")
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    
    params = {
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d")
    }
    
    analytics_response = requests.get(ANALYTICS_URL, headers=headers, params=params)
    
    if analytics_response.status_code == 200:
        print(f"✅ Analytics endpoint returned 200 OK")
        data = analytics_response.json()
        print(f"📊 Response summary:")
        print(f"   - Total revenue: ${data.get('total_revenue', 0)}")
        print(f"   - Total appointments: {data.get('total_appointments', 0)}")
        print(f"   - Active agents: {len(data.get('agents', []))}")
        return True
    else:
        print(f"❌ Analytics endpoint failed: {analytics_response.status_code}")
        print(analytics_response.text)
        return False

if __name__ == "__main__":
    print("Analytics Authentication Verification")
    print("=" * 40)
    
    try:
        success = test_analytics_with_auth()
        print("\n" + "=" * 40)
        if success:
            print("✅ Analytics verification PASSED")
        else:
            print("❌ Analytics verification FAILED")
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Make sure the backend server is running on port 8000")