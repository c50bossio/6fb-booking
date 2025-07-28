#!/usr/bin/env python3
"""
Test the login endpoint directly using FastAPI TestClient.
"""

import os
import sys
sys.path.append('.')

def test_login_endpoint():
    """Test login endpoint using TestClient."""
    try:
        from fastapi.testclient import TestClient
        from main import app
        
        print("Testing login endpoint...")
        
        client = TestClient(app)
        
        # Test login
        login_data = {
            "email": "admin@bookedbarber.com",
            "password": "admin123"
        }
        
        print(f"Sending login request with: {login_data}")
        
        response = client.post("/auth/login", json=login_data)
        
        print(f"Response status code: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            response_data = response.json()
            print("✅ Login successful!")
            print(f"Access token: {response_data.get('access_token', 'N/A')[:50]}...")
            print(f"Token type: {response_data.get('token_type', 'N/A')}")
            return True
        else:
            print(f"❌ Login failed!")
            try:
                error_data = response.json()
                print(f"Error details: {error_data}")
            except:
                print(f"Error response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_login_endpoint()