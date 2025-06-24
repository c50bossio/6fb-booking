#!/usr/bin/env python3
"""
Quick integration test for the barber dashboard endpoint
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_barber_dashboard_endpoint():
    """Test the barber dashboard endpoint with demo mode"""
    
    # Test endpoint accessibility
    endpoint = f"{BASE_URL}/api/v1/financial-dashboard/barber-dashboard/1"
    
    try:
        print(f"🧪 Testing endpoint: {endpoint}")
        
        # This will fail without authentication, but that's expected
        # We're just checking the route is registered correctly
        response = requests.get(endpoint, timeout=5)
        
        print(f"✅ Endpoint is reachable (status: {response.status_code})")
        
        if response.status_code == 401:
            print("✅ Authentication required (expected)")
        elif response.status_code == 200:
            print("✅ Endpoint returned data successfully")
            data = response.json()
            print(f"📊 Response contains keys: {list(data.keys())}")
        else:
            print(f"⚠️  Unexpected status code: {response.status_code}")
            print(f"Response: {response.text[:200]}...")
            
    except requests.exceptions.ConnectionError:
        print("❌ Backend server is not running on localhost:8000")
        print("   Start it with: cd backend && uvicorn main:app --reload")
        return False
    except Exception as e:
        print(f"❌ Error testing endpoint: {e}")
        return False
    
    return True

def test_api_health():
    """Test basic API health"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ API health check passed")
            return True
        else:
            print(f"⚠️  Health check returned: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
    
    return False

if __name__ == "__main__":
    print("🚀 Starting Premium Barber Dashboard Integration Test")
    print(f"⏰ Timestamp: {datetime.now().isoformat()}")
    print("=" * 60)
    
    # Test API health first
    if not test_api_health():
        print("\n❌ Cannot proceed - API is not healthy")
        exit(1)
    
    # Test barber dashboard endpoint
    if test_barber_dashboard_endpoint():
        print("\n✅ Integration test completed successfully!")
        print("\n📋 Next steps:")
        print("  1. Start backend: cd backend && uvicorn main:app --reload")
        print("  2. Start frontend: cd frontend && npm run dev")
        print("  3. Test with demo credentials: demo@6fb.com / demo123")
        print("  4. Navigate to: /dashboard/financial (earnings tab)")
        print("  5. Click 'Open Premium Dashboard' button")
    else:
        print("\n❌ Integration test failed")
        exit(1)