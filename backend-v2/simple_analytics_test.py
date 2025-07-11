#!/usr/bin/env python3
"""
Simple test to check analytics endpoints without authentication complexities
"""
import requests
import json

def test_analytics_simple():
    """Simple test using curl-like approach"""
    base_url = "http://localhost:8000"
    
    print("Testing analytics endpoints without auth first...")
    
    endpoints = [
        "/api/v1/analytics/dashboard",
        "/api/v1/analytics/revenue", 
        "/api/v1/analytics/appointments"
    ]
    
    for endpoint in endpoints:
        try:
            print(f"\nTesting {endpoint}...")
            response = requests.get(f"{base_url}{endpoint}", timeout=5)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 500:
                print(f"ERROR 500: {response.text}")
            elif response.status_code == 403:
                print("403 Forbidden - Expected (no auth)")
            elif response.status_code == 401:
                print("401 Unauthorized - Expected (no auth)")  
            else:
                print(f"Response: {response.text[:100]}...")
                
        except Exception as e:
            print(f"Exception: {e}")
    
    # Now try with a manual token (if we can get one via direct login)
    print("\n" + "="*50)
    print("Attempting to get auth token...")
    
    # Try to login with existing admin user
    login_data = {
        "email": "admin@sixfb.com",
        "password": "admin123"
    }
    
    try:
        # Check if login works at all
        login_response = requests.post(f"{base_url}/api/v1/auth/login", json=login_data, timeout=5)
        print(f"Login attempt: {login_response.status_code}")
        print(f"Login response: {login_response.text}")
        
        if login_response.status_code == 200:
            token_data = login_response.json()
            token = token_data.get('access_token')
            
            print(f"\nGot token, testing with auth...")
            auth_headers = {"Authorization": f"Bearer {token}"}
            
            for endpoint in endpoints:
                try:
                    print(f"\nTesting {endpoint} with auth...")
                    response = requests.get(f"{base_url}{endpoint}", headers=auth_headers, timeout=10)
                    print(f"Status: {response.status_code}")
                    
                    if response.status_code == 500:
                        print(f"ERROR 500: {response.text}")
                    elif response.status_code == 200:
                        print("SUCCESS - Analytics endpoint working!")
                        # Check for any problematic content
                        response_text = response.text
                        if 'toFixed' in response_text:
                            print("WARNING: Response contains 'toFixed' - could cause JS errors")
                        if 'NaN' in response_text:
                            print("WARNING: Response contains 'NaN' - could cause issues")
                    else:
                        print(f"Response: {response.text[:200]}...")
                        
                except requests.exceptions.Timeout:
                    print("TIMEOUT - Endpoint took too long")
                except Exception as e:
                    print(f"Exception: {e}")
                    
    except Exception as e:
        print(f"Login failed: {e}")

if __name__ == "__main__":
    test_analytics_simple()