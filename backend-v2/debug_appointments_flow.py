#!/usr/bin/env python3
"""
Debug script to trace appointment loading flow and data structure
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import requests
import json
from datetime import datetime

# API configuration
API_URL = "http://localhost:8000"
EMAIL = "barber1@test.com"
PASSWORD = "password123"

def login():
    """Login and get access token"""
    print("🔐 Logging in...")
    response = requests.post(
        f"{API_URL}/api/v2/auth/login",
        json={"email": EMAIL, "password": PASSWORD}
    )
    if response.status_code != 200:
        print(f"❌ Login failed: {response.text}")
        sys.exit(1)
    
    data = response.json()
    print(f"✅ Logged in successfully")
    return data["access_token"]

def get_appointments(token):
    """Get appointments using the same endpoint as frontend"""
    print("\n📋 Getting appointments from /api/v2/appointments/...")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{API_URL}/api/v2/appointments/", headers=headers)
    
    print(f"Response status: {response.status_code}")
    print(f"Response headers: {dict(response.headers)}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n📊 Response structure:")
        print(f"  - Keys: {list(data.keys())}")
        
        if "appointments" in data:
            print(f"  - Number of appointments: {len(data['appointments'])}")
            print(f"  - Total: {data.get('total', 'N/A')}")
            
            if data['appointments']:
                print(f"\n📅 First appointment structure:")
                first = data['appointments'][0]
                for key, value in first.items():
                    print(f"    - {key}: {value} (type: {type(value).__name__})")
        else:
            print(f"  - Full response: {json.dumps(data, indent=2)}")
    else:
        print(f"❌ Failed to get appointments: {response.text}")
    
    return response.json() if response.status_code == 200 else None

def check_frontend_expectation():
    """Check what the frontend expects"""
    print("\n🔍 Frontend expectation analysis:")
    print("  - Frontend code: setAppointments(userBookings.bookings || [])")
    print("  - Expected structure: { bookings: [...] }")
    print("  - Actual structure: { appointments: [...], total: N }")
    print("\n⚠️  MISMATCH DETECTED!")
    print("  - Frontend expects 'bookings' key but API returns 'appointments' key")

def main():
    print("🚀 Appointment Loading Flow Debug")
    print("=" * 50)
    
    # Login
    token = login()
    
    # Get appointments
    appointments_data = get_appointments(token)
    
    # Check frontend expectation
    check_frontend_expectation()
    
    # Suggest fix
    print("\n💡 SUGGESTED FIX:")
    print("  Option 1: Update frontend to use 'appointments' instead of 'bookings'")
    print("  Option 2: Update backend to return 'bookings' instead of 'appointments'")
    print("  Option 3: Create an adapter in the API client")

if __name__ == "__main__":
    main()