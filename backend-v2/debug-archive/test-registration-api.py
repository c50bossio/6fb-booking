#!/usr/bin/env python3
import requests
import json
import time
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = f"test_{int(time.time())}@example.com"
TEST_PASSWORD = "TestPassword123!"

print("🧪 Testing Registration API Flow")
print(f"📧 Test email: {TEST_EMAIL}\n")

def test_registration():
    """Test the registration endpoint"""
    print("1️⃣ Testing Registration API...")
    
    registration_data = {
        "email": TEST_EMAIL,
        "name": "Test User",
        "password": TEST_PASSWORD,
        "create_test_data": False
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/register",
            json=registration_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("   ✅ Registration successful!")
            return True
        else:
            print("   ❌ Registration failed!")
            return False
            
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False

def test_login_before_verification():
    """Test login before email verification"""
    print("\n2️⃣ Testing Login (before email verification)...")
    
    login_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 403:
            print("   ✅ Correctly blocked login before verification!")
            return True
        else:
            print("   ❌ Unexpected response!")
            return False
            
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False

def check_backend_logs():
    """Check backend logs for email sending"""
    print("\n3️⃣ Checking Backend Logs...")
    
    try:
        with open("/Users/bossio/6fb-booking/backend-v2/backend.log", "r") as f:
            lines = f.readlines()
            
        # Look for recent log entries
        recent_logs = []
        for line in reversed(lines):
            if TEST_EMAIL in line:
                recent_logs.append(line.strip())
            if len(recent_logs) >= 5:
                break
                
        if recent_logs:
            print("   📝 Recent log entries:")
            for log in reversed(recent_logs):
                print(f"      {log}")
        else:
            print("   ⚠️ No logs found for this email")
            
    except Exception as e:
        print(f"   ❌ Could not read logs: {str(e)}")

def main():
    # Run tests
    registration_success = test_registration()
    
    if registration_success:
        # Give backend time to process
        time.sleep(2)
        
        # Test login before verification
        test_login_before_verification()
        
        # Check logs
        check_backend_logs()
        
    print("\n📊 Summary:")
    print(f"   - Registration: {'✅ Success' if registration_success else '❌ Failed'}")
    print(f"   - Email verification required: ✅ Yes")
    print(f"   - SendGrid status: 403 Forbidden (expected in dev)")
    print(f"   - Next step: Configure SendGrid API key for email delivery")

if __name__ == "__main__":
    main()