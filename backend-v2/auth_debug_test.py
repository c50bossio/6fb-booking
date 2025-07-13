#!/usr/bin/env python3
"""
Debug authentication timeout issue
"""

import time
import requests
import json

def test_auth_timeout():
    print("🔐 Debugging Authentication Timeout Issue")
    print("=" * 50)
    
    # Test basic API connectivity first
    try:
        print("1. Testing basic API connectivity...")
        start_time = time.time()
        response = requests.get("http://localhost:8000/docs", timeout=5)
        elapsed = time.time() - start_time
        print(f"   ✅ API docs accessible in {elapsed:.3f}s (Status: {response.status_code})")
    except Exception as e:
        print(f"   ❌ API docs failed: {str(e)}")
        return
    
    # Test invalid login (should be fast)
    try:
        print("2. Testing invalid login (should fail fast)...")
        start_time = time.time()
        payload = {"email": "nonexistent@example.com", "password": "wrongpassword"}
        response = requests.post("http://localhost:8000/api/v1/auth/login", 
                               json=payload, timeout=10)
        elapsed = time.time() - start_time
        print(f"   ✅ Invalid login responded in {elapsed:.3f}s (Status: {response.status_code})")
        if elapsed > 5:
            print(f"   ⚠️  WARNING: {elapsed:.1f}s is too slow for invalid login")
    except requests.exceptions.Timeout:
        print("   ❌ Invalid login TIMED OUT - This is the problem!")
    except Exception as e:
        print(f"   ❌ Invalid login failed: {str(e)}")
    
    print("=" * 50)

if __name__ == "__main__":
    test_auth_timeout()