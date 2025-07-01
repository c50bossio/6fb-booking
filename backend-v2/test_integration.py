#!/usr/bin/env python3
"""
Quick integration test to verify frontend-backend connectivity
"""
import requests
import time

def test_integration():
    print("🔗 Testing Frontend-Backend Integration...")
    
    # Test 1: Backend health
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend health check: OK")
        else:
            print(f"❌ Backend health failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend connection failed: {e}")
        return False
    
    # Test 2: Frontend accessibility
    try:
        response = requests.get("http://localhost:3000", timeout=5)
        if response.status_code == 200 and "Booked Barber" in response.text:
            print("✅ Frontend accessibility: OK")
        else:
            print(f"❌ Frontend failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Frontend connection failed: {e}")
        return False
    
    # Test 3: API endpoint discovery
    try:
        response = requests.get("http://localhost:8000/docs", timeout=5)
        if response.status_code == 200:
            print("✅ API docs accessible: OK")
        else:
            print(f"❌ API docs failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API docs failed: {e}")
        return False
    
    # Test 4: Environment variable check
    try:
        with open("/Users/bossio/6fb-booking/backend-v2/frontend-v2/.env.local", "r") as f:
            env_content = f.read()
            if "NEXT_PUBLIC_API_URL=http://localhost:8000" in env_content:
                print("✅ Environment configuration: OK")
            else:
                print("❌ Environment configuration incorrect")
                return False
    except Exception as e:
        print(f"❌ Environment file check failed: {e}")
        return False
    
    print("\n🎉 All integration tests passed!")
    return True

if __name__ == "__main__":
    success = test_integration()
    exit(0 if success else 1)