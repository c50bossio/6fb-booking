#!/usr/bin/env python3
"""
Test script to check payment endpoints and identify any 500 errors
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_health():
    """Test if the server is running"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health check: {response.status_code} - {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def create_test_user_and_login():
    """Create a test user and get auth token"""
    try:
        # Try to register a test user with UserCreate schema
        register_data = {
            "email": "test@example.com",
            "password": "TestPassword123",  # Strong password as required
            "name": "Test User",
            "phone": "+1234567890",
            "user_type": "barber"  # Use barber to access payment features
        }
        
        # Use existing test admin user
        login_data = {
            "email": "admin.test@bookedbarber.com",
            "password": "AdminTest123"
        }
        
        response = requests.post(f"{BASE_URL}/api/v2/auth/login", 
                               json={"email": login_data['email'], "password": login_data['password']})
        
        if response.status_code == 200:
            token_data = response.json()
            print(f"Login successful: {response.status_code}")
            return token_data.get("access_token")
        else:
            print(f"Login failed, trying registration: {response.status_code} - {response.text}")
            
            # Try registration
            response = requests.post(f"{BASE_URL}/api/v2/auth/register", json=register_data)
            if response.status_code in [200, 201]:
                print(f"Registration successful: {response.status_code}")
                # Now login
                response = requests.post(f"{BASE_URL}/api/v2/auth/login", 
                                       json={"email": login_data['email'], "password": login_data['password']})
                if response.status_code == 200:
                    token_data = response.json()
                    return token_data.get("access_token")
                    
        return None
    except Exception as e:
        print(f"Auth failed: {e}")
        return None

def test_payment_endpoints(token):
    """Test payment endpoints with authentication"""
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    endpoints_to_test = [
        ("GET", "/api/v2/payments/history", None),
        ("GET", "/api/v2/payments/gift-certificates", None),
        ("GET", "/api/v2/payments/stripe-connect/status", None),
        # Test POST endpoints that might be causing 500 errors
        ("POST", "/api/v2/payments/reports", {
            "start_date": "2024-01-01T00:00:00Z",
            "end_date": "2024-12-31T23:59:59Z"
        }),
    ]
    
    results = []
    for method, endpoint, data in endpoints_to_test:
        try:
            print(f"\nTesting {method} {endpoint}")
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            elif method == "POST":
                response = requests.post(f"{BASE_URL}{endpoint}", headers=headers, json=data)
            
            print(f"Status: {response.status_code}")
            if response.status_code >= 400:
                print(f"Error response: {response.text}")
            else:
                response_data = response.json() if response.content else {}
                print(f"Success: {json.dumps(response_data, indent=2)[:200]}...")
                
            results.append((endpoint, response.status_code, response.text[:500]))
            
        except Exception as e:
            print(f"Exception testing {endpoint}: {e}")
            results.append((endpoint, "ERROR", str(e)))
    
    return results

def main():
    print("Testing BookedBarber V2 Payment Functionality")
    print("=" * 50)
    
    # Test health
    if not test_health():
        print("Server is not running or not responding")
        sys.exit(1)
    
    # Get auth token
    print("\nTesting authentication...")
    token = create_test_user_and_login()
    if not token:
        print("Failed to authenticate")
        sys.exit(1)
    
    print(f"Authentication successful, token: {token[:20]}...")
    
    # Test payment endpoints
    print("\nTesting payment endpoints...")
    results = test_payment_endpoints(token)
    
    print("\n" + "=" * 50)
    print("SUMMARY:")
    for endpoint, status, response in results:
        print(f"{endpoint}: {status}")
        if str(status).startswith("5"):
            print(f"  ERROR: {response[:100]}...")
    
    # Count errors
    errors = [r for r in results if str(r[1]).startswith("5") or r[1] == "ERROR"]
    if errors:
        print(f"\nFound {len(errors)} server errors (5xx)")
        return 1
    else:
        print(f"\nAll endpoints responded successfully!")
        return 0

if __name__ == "__main__":
    sys.exit(main())