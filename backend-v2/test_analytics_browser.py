#!/usr/bin/env python3
"""
Test analytics functionality by simulating browser behavior
"""
import requests
import json
import traceback

def test_analytics_with_auth():
    """Test analytics endpoints with proper authentication"""
    base_url = "http://localhost:8000"
    
    # First create and verify a test user
    print("1. Creating/verifying test user...")
    
    # Try to create an admin user that's verified
    from db import get_db
    from models import User
    from utils.auth import get_password_hash
    
    db = next(get_db())
    
    # Check if test user exists
    test_user = db.query(User).filter(User.email == "debug@test.com").first()
    if not test_user:
        test_user = User(
            email="debug@test.com",
            name="Debug User",
            hashed_password=get_password_hash("debug123"),
            role="admin",
            is_verified=True,  # Make sure user is verified
            is_active=True
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        print(f"Created test user: {test_user.email}")
    else:
        # Update user to be verified
        test_user.is_verified = True
        test_user.is_active = True
        db.commit()
        print(f"Using existing test user: {test_user.email}")
    
    db.close()
    
    # Now try to login
    print("2. Attempting login...")
    login_data = {
        "email": "debug@test.com",
        "password": "debug123"
    }
    
    try:
        login_response = requests.post(f"{base_url}/api/v1/auth/login", json=login_data)
        print(f"Login response: {login_response.status_code}")
        
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.text}")
            return
            
        token_data = login_response.json()
        auth_headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        
        print("3. Testing analytics endpoints that might cause 500 errors...")
        
        # Test specific endpoints that commonly cause 500 errors
        test_endpoints = [
            ("/api/v1/analytics/dashboard", "Dashboard Analytics"),
            ("/api/v1/analytics/revenue", "Revenue Analytics"),
            ("/api/v1/analytics/appointments", "Appointment Analytics"),
            ("/api/v1/analytics/six-figure-barber", "Six Figure Barber"),
            ("/api/v1/analytics/client-retention", "Client Retention"),
            ("/api/v1/analytics/barber-performance", "Barber Performance"),
            ("/api/v1/analytics/insights", "Business Insights")
        ]
        
        for endpoint, name in test_endpoints:
            try:
                print(f"\n4. Testing {name} ({endpoint})...")
                response = requests.get(f"{base_url}{endpoint}", headers=auth_headers, timeout=15)
                print(f"   Status: {response.status_code}")
                
                if response.status_code == 500:
                    print(f"   ERROR 500 - Response: {response.text}")
                    # Try to get more details from server logs
                    try:
                        error_data = response.json()
                        if 'detail' in error_data:
                            print(f"   Error detail: {error_data['detail']}")
                    except:
                        pass
                elif response.status_code == 200:
                    try:
                        data = response.json()
                        # Check for common issues
                        data_str = json.dumps(data)
                        
                        # Check for JavaScript issues
                        if 'toFixed' in data_str:
                            print(f"   WARNING: Found 'toFixed' in response - this will cause JS errors")
                        
                        # Check for null/undefined values that might break frontend
                        if 'null' in data_str or 'undefined' in data_str:
                            print(f"   WARNING: Found null/undefined values that might break frontend")
                        
                        # Check for floating point precision issues
                        if any(isinstance(v, float) and len(str(v)) > 10 for v in str(data).split() if v.replace('.', '').isdigit()):
                            print(f"   WARNING: Found very precise float values that might need rounding")
                        
                        print(f"   SUCCESS: {len(data_str)} chars returned")
                        
                        # Show sample of data structure
                        if isinstance(data, dict):
                            keys = list(data.keys())[:5]
                            print(f"   Sample keys: {keys}")
                            
                    except Exception as parse_error:
                        print(f"   ERROR parsing JSON response: {parse_error}")
                        print(f"   Raw response: {response.text[:200]}...")
                        
                else:
                    print(f"   Response: {response.text[:200]}...")
                    
            except requests.exceptions.Timeout:
                print(f"   TIMEOUT: {name} took longer than 15 seconds")
            except Exception as e:
                print(f"   EXCEPTION: {e}")
                
    except Exception as e:
        print(f"Script error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    test_analytics_with_auth()