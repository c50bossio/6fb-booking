#!/usr/bin/env python3
"""
Test script to verify authentication works
"""
import requests
import json

def test_auth():
    url = "http://localhost:8000/api/v1/auth-simple/login"
    data = {
        "email": "test-barber@6fb.com",
        "password": "testpass123"
    }
    
    try:
        response = requests.post(url, json=data, timeout=5)
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            print("✅ Authentication successful!")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"❌ Authentication failed: {response.text}")
    except requests.exceptions.Timeout:
        print("❌ Request timed out")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_auth()