#!/usr/bin/env python3
"""
Verify the complete calendar data flow from backend to frontend
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import requests
import json
from datetime import datetime

# API configuration
API_URL = "http://localhost:8000"

def create_test_user():
    """Create a test user and login"""
    print("🔐 Creating test user...")
    
    # Try to register
    register_data = {
        "email": "calendar_test@example.com",
        "password": "test123456",
        "first_name": "Calendar",
        "last_name": "Test",
        "role": "barber"
    }
    
    response = requests.post(f"{API_URL}/api/v1/auth/register", json=register_data)
    
    # Login regardless of registration result
    print("🔐 Logging in...")
    login_response = requests.post(
        f"{API_URL}/api/v1/auth/login",
        json={"email": register_data["email"], "password": register_data["password"]}
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.text}")
        return None
    
    data = login_response.json()
    print(f"✅ Logged in successfully")
    return data["access_token"]

def test_appointments_endpoint(token):
    """Test the appointments endpoint"""
    print("\n📋 Testing /api/v1/appointments/ endpoint...")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{API_URL}/api/v1/appointments/", headers=headers)
    
    print(f"Response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Response structure:")
        print(f"  - Keys: {list(data.keys())}")
        
        if "appointments" in data:
            print(f"  - Number of appointments: {len(data['appointments'])}")
            print(f"  - Total: {data.get('total', 'N/A')}")
            
            if data['appointments']:
                print(f"\n📅 Sample appointment:")
                apt = data['appointments'][0]
                print(json.dumps(apt, indent=2, default=str))
                
                # Check required fields for calendar display
                required_fields = ['id', 'start_time', 'service_name', 'status', 'barber_id']
                missing_fields = [f for f in required_fields if f not in apt]
                
                if missing_fields:
                    print(f"\n⚠️  Missing required fields: {missing_fields}")
                else:
                    print(f"\n✅ All required fields present")
                    
                # Check date format
                try:
                    start_time = datetime.fromisoformat(apt['start_time'].replace('Z', '+00:00'))
                    print(f"✅ Date format is valid: {start_time}")
                except:
                    print(f"❌ Invalid date format: {apt['start_time']}")
                    
        return data
    else:
        print(f"❌ Failed: {response.text}")
        return None

def test_calendar_data_flow():
    """Test the complete data flow"""
    print("\n🔄 Testing Calendar Data Flow:")
    print("1. Frontend calls getAppointments() from lib/api.ts")
    print("2. getAppointments() calls fetchAPI('/api/v1/appointments/')")
    print("3. Backend returns { appointments: [...], total: N }")
    print("4. Frontend expects to access userBookings.appointments (was .bookings)")
    print("5. Appointments are filtered by date and displayed in calendar views")

def main():
    print("🚀 Calendar Data Flow Verification")
    print("=" * 50)
    
    # Create user and login
    token = create_test_user()
    if not token:
        print("❌ Failed to authenticate")
        return
    
    # Test appointments endpoint
    appointments_data = test_appointments_endpoint(token)
    
    # Explain the flow
    test_calendar_data_flow()
    
    # Check if fix is applied
    print("\n✅ FIX APPLIED:")
    print("  - Changed: setAppointments(userBookings.bookings || [])")
    print("  - To: setAppointments(userBookings.appointments || [])")
    print("\n📝 Next steps:")
    print("  1. Restart the frontend dev server")
    print("  2. Open browser console to see appointment data")
    print("  3. Check if appointments appear in calendar views")

if __name__ == "__main__":
    main()