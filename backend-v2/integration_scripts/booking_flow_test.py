#!/usr/bin/env python3
"""
Test complete booking flow functionality
"""

import requests
from datetime import datetime, timedelta

BACKEND_URL = "http://localhost:8000"
ADMIN_EMAIL = "admin@6fb.com"
ADMIN_PASSWORD = "admin123"

def get_token():
    """Get admin access token"""
    response = requests.post(
        f"{BACKEND_URL}/api/v1/auth/login",
        json={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    return response.json().get("access_token") if response.status_code == 200 else None

def test_booking_workflow():
    """Test complete booking workflow"""
    print("=== BOOKING WORKFLOW TESTS ===")
    
    token = get_token()
    if not token:
        print("✗ Cannot get authentication token")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Check available time slots
    print("\n1. Testing available time slots...")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    try:
        response = requests.get(
            f"{BACKEND_URL}/api/v1/bookings/available-slots?date={tomorrow}",
            headers=headers
        )
        
        if response.status_code == 200:
            slots = response.json()
            print(f"✓ Available slots retrieved: {len(slots)} slots for {tomorrow}")
            if slots:
                print(f"  First few slots: {slots[:3]}")
        else:
            print(f"✗ Available slots failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"✗ Available slots error: {e}")
    
    # 2. Test services endpoint
    print("\n2. Testing services...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/v1/services/", headers=headers)
        if response.status_code == 200:
            services = response.json()
            print(f"✓ Services retrieved: {len(services)} services")
            if services:
                print(f"  Services: {[s.get('name', 'N/A') for s in services[:3]]}")
        else:
            print(f"⚠ Services response: {response.status_code}")
    except Exception as e:
        print(f"✗ Services error: {e}")
    
    # 3. Test clients endpoint
    print("\n3. Testing clients...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/v1/clients/", headers=headers)
        if response.status_code == 200:
            data = response.json()
            clients = data.get('clients', [])
            print(f"✓ Clients retrieved: {len(clients)} clients")
            if clients:
                print(f"  Sample client: {clients[0].get('name', 'N/A')}")
        else:
            print(f"⚠ Clients response: {response.status_code}")
    except Exception as e:
        print(f"✗ Clients error: {e}")
    
    # 4. Test booking creation (if we have slots)
    print("\n4. Testing booking creation...")
    try:
        # Try to create a test booking
        booking_data = {
            "service_type": "haircut",
            "appointment_datetime": f"{tomorrow}T10:00:00",
            "client_name": "Test Client",
            "client_email": "testclient@example.com",
            "client_phone": "+1234567890",
            "notes": "Test booking from system verification"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/v1/bookings/",
            json=booking_data,
            headers=headers
        )
        
        if response.status_code in [200, 201]:
            booking = response.json()
            print(f"✓ Booking created successfully")
            print(f"  Booking ID: {booking.get('id', 'N/A')}")
            print(f"  Status: {booking.get('status', 'N/A')}")
            return booking.get('id')
        else:
            print(f"⚠ Booking creation: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"✗ Booking creation error: {e}")
        return None

def test_booking_management(booking_id):
    """Test booking management operations"""
    if not booking_id:
        print("\n⚠ Skipping booking management tests (no booking ID)")
        return
    
    print(f"\n=== BOOKING MANAGEMENT TESTS (ID: {booking_id}) ===")
    
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Get specific booking
    print("\n1. Testing booking retrieval...")
    try:
        response = requests.get(
            f"{BACKEND_URL}/api/v1/bookings/{booking_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            booking = response.json()
            print(f"✓ Booking retrieved successfully")
            print(f"  Client: {booking.get('client_name', 'N/A')}")
            print(f"  Service: {booking.get('service_type', 'N/A')}")
            print(f"  Status: {booking.get('status', 'N/A')}")
        else:
            print(f"⚠ Booking retrieval: {response.status_code}")
    except Exception as e:
        print(f"✗ Booking retrieval error: {e}")
    
    # 2. Test booking update
    print("\n2. Testing booking update...")
    try:
        update_data = {
            "notes": "Updated notes from system verification test"
        }
        
        response = requests.patch(
            f"{BACKEND_URL}/api/v1/bookings/{booking_id}",
            json=update_data,
            headers=headers
        )
        
        if response.status_code == 200:
            print("✓ Booking updated successfully")
        else:
            print(f"⚠ Booking update: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"✗ Booking update error: {e}")

def test_timezone_functionality():
    """Test timezone functionality"""
    print("\n=== TIMEZONE FUNCTIONALITY TESTS ===")
    
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BACKEND_URL}/api/v1/timezones", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            timezones = data.get('timezones', [])
            print(f"✓ Timezones retrieved: {len(timezones)} available")
            
            # Show some common timezones
            common_tzs = ['America/New_York', 'America/Los_Angeles', 'UTC']
            available_common = [tz for tz in timezones if tz in common_tzs]
            if available_common:
                print(f"  Common timezones available: {available_common}")
            else:
                print(f"  Sample timezones: {timezones[:5]}")
        else:
            print(f"⚠ Timezones response: {response.status_code}")
    except Exception as e:
        print(f"✗ Timezone error: {e}")

def test_business_hours_functionality():
    """Test business hours and availability"""
    print("\n=== BUSINESS HOURS TESTS ===")
    
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test multiple days to see availability patterns
    for i in range(3):
        test_date = (datetime.now() + timedelta(days=i+1)).strftime("%Y-%m-%d")
        
        try:
            response = requests.get(
                f"{BACKEND_URL}/api/v1/bookings/available-slots?date={test_date}",
                headers=headers
            )
            
            if response.status_code == 200:
                slots = response.json()
                print(f"  {test_date}: {len(slots)} available slots")
            else:
                print(f"  {test_date}: {response.status_code} error")
        except Exception as e:
            print(f"  {test_date}: Error - {e}")

def main():
    """Run complete booking flow tests"""
    print("BOOKING FLOW COMPREHENSIVE TESTS")
    print("="*50)
    
    # Test core booking workflow
    booking_id = test_booking_workflow()
    
    # Test booking management
    test_booking_management(booking_id)
    
    # Test timezone functionality
    test_timezone_functionality()
    
    # Test business hours
    test_business_hours_functionality()
    
    print("\n" + "="*50)
    print("BOOKING FLOW TESTS COMPLETED")
    print("="*50)

if __name__ == "__main__":
    main()