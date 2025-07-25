#!/usr/bin/env python3
"""
Debug script to test analytics endpoints for 500 errors
"""
import requests
import traceback

def test_analytics_endpoints():
    base_url = "http://localhost:8000"
    
    # First, login to get a token
    login_data = {
        "email": "admin@sixfb.com",
        "password": "admin123"
    }
    
    try:
        print("1. Attempting login...")
        login_response = requests.post(f"{base_url}/api/v1/auth/login", json=login_data)
        print(f"Login response: {login_response.status_code}")
        
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.text}")
            return
            
        token_data = login_response.json()
        auth_headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        
        print("2. Testing analytics endpoints...")
        
        # Test various analytics endpoints
        endpoints = [
            "/api/v1/analytics/dashboard",
            "/api/v1/analytics/revenue",
            "/api/v1/analytics/appointments",
            "/api/v1/analytics/six-figure-barber",
            "/api/v1/analytics/client-retention",
            "/api/v1/analytics/barber-performance"
        ]
        
        for endpoint in endpoints:
            try:
                print(f"\n3. Testing {endpoint}...")
                response = requests.get(f"{base_url}{endpoint}", headers=auth_headers, timeout=10)
                print(f"   Status: {response.status_code}")
                
                if response.status_code == 500:
                    print(f"   ERROR 500 Response: {response.text}")
                elif response.status_code == 200:
                    data = response.json()
                    print(f"   SUCCESS: {len(str(data))} chars of data returned")
                else:
                    print(f"   Response: {response.text}")
                    
            except requests.exceptions.Timeout:
                print(f"   TIMEOUT: Request took longer than 10 seconds")
            except Exception as e:
                print(f"   EXCEPTION: {e}")
                
    except Exception as e:
        print(f"Script error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    test_analytics_endpoints()