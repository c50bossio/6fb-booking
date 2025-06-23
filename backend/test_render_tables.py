#!/usr/bin/env python3
"""
Test if service tables exist in Render database
"""

import requests
import json

# First, let's try to create a test service to see what error we get
RENDER_URL = "https://sixfb-backend.onrender.com"

def test_tables():
    """Test if tables exist by trying to query"""
    
    # Test categories endpoint - this should work even without auth
    print("Testing service categories endpoint...")
    response = requests.get(f"{RENDER_URL}/api/v1/services/categories")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 404:
        print("ERROR: Endpoint not found - routes not registered")
    elif response.status_code == 500:
        print("ERROR: Internal server error - possible database issue")
        print(f"Response: {response.text}")
    elif response.status_code == 200:
        print("SUCCESS: Endpoint working")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"Unexpected status: {response.status_code}")
        print(f"Response: {response.text}")

if __name__ == "__main__":
    test_tables()