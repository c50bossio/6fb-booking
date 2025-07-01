#!/usr/bin/env python3
"""Test script to verify public services endpoint works"""

import requests
import json

# Test configuration
BASE_URL = "http://localhost:8000"
PUBLIC_SERVICES_URL = f"{BASE_URL}/api/v1/public/services/"
PUBLIC_CATEGORIES_URL = f"{BASE_URL}/api/v1/public/services/categories"
AUTH_SERVICES_URL = f"{BASE_URL}/api/v1/services/"

def test_public_endpoints():
    print("Testing BookedBarber Public Services Endpoints...")
    print("=" * 50)
    
    # Test 1: Public services endpoint (no auth)
    print("\n1. Testing public services endpoint (no auth)...")
    try:
        response = requests.get(PUBLIC_SERVICES_URL)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            services = response.json()
            print(f"   ✅ Success! Found {len(services)} public services")
            if services:
                print(f"   First service: {services[0].get('name', 'Unknown')}")
        else:
            print(f"   ❌ Failed: {response.text}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Public categories endpoint (no auth)
    print("\n2. Testing public categories endpoint (no auth)...")
    try:
        response = requests.get(PUBLIC_CATEGORIES_URL)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            categories = response.json()
            print(f"   ✅ Success! Found {len(categories)} categories")
            if categories:
                print(f"   Categories: {[cat['label'] for cat in categories[:3]]}...")
        else:
            print(f"   ❌ Failed: {response.text}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Authenticated endpoint without token (should fail)
    print("\n3. Testing authenticated endpoint without token (should fail)...")
    try:
        response = requests.get(AUTH_SERVICES_URL)
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print(f"   ✅ Correctly rejected with 401 Unauthorized")
        else:
            print(f"   ❌ Unexpected response: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("Testing complete!")

if __name__ == "__main__":
    test_public_endpoints()