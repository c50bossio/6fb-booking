#!/usr/bin/env python3
"""
Test frontend is working
"""
import requests
import time

def test_frontend():
    """Test that frontend is responding"""
    try:
        response = requests.get('http://localhost:3000/', timeout=5)
        print(f"✅ Frontend server is running! Status: {response.status_code}")
        
        # Check if it contains our 6FB content
        if "6FB" in response.text or "Dashboard" in response.text:
            print("✅ 6FB Dashboard content detected")
        else:
            print("⚠️  Dashboard content might not be loading properly")
            
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to frontend server on http://localhost:3000")
        print("   Make sure to run: npm run dev")
        return False
    except Exception as e:
        print(f"❌ Error testing frontend: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing 6FB Frontend...")
    if test_frontend():
        print("\n🎉 Frontend test passed!")
        print("Visit http://localhost:3000 to view the dashboard")
    else:
        print("\n❌ Frontend test failed!")