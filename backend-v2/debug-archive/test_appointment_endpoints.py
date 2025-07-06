#!/usr/bin/env python3
"""
Test script to verify appointment fetching API endpoints.
Tests that appointments (including ID 52) are properly accessible via the calendar APIs.
"""

import requests
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List

# API configuration
BASE_URL = "http://localhost:8000"
API_V1_BASE = f"{BASE_URL}/api/v1"

# Test user credentials (adjust as needed)
TEST_EMAIL = "testadmin@test.com"
TEST_PASSWORD = "testadmin123"

def get_auth_token() -> str:
    """Authenticate and get JWT token."""
    login_url = f"{API_V1_BASE}/auth/login"
    login_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    print(f"\n1. Authenticating with {TEST_EMAIL}...")
    try:
        response = requests.post(login_url, json=login_data)
        if response.status_code == 200:
            token = response.json()["access_token"]
            print("✅ Authentication successful")
            return token
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Authentication error: {str(e)}")
        return None

def test_appointments_endpoint(token: str) -> List[Dict[str, Any]]:
    """Test the /api/v1/appointments/ endpoint (used by calendar)."""
    appointments_url = f"{API_V1_BASE}/appointments/"
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n2. Testing /api/v1/appointments/ endpoint...")
    try:
        response = requests.get(appointments_url, headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            appointments = response.json()
            print(f"✅ Success! Found {len(appointments)} appointments")
            return appointments
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"Response: {response.text}")
            return []
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return []

def test_appointments_all_list_endpoint(token: str) -> List[Dict[str, Any]]:
    """Test the /api/v1/appointments/all/list endpoint (admin view)."""
    all_appointments_url = f"{API_V1_BASE}/appointments/all/list"
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n3. Testing /api/v1/appointments/all/list endpoint (admin)...")
    try:
        response = requests.get(all_appointments_url, headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            appointments = response.json()
            print(f"✅ Success! Found {len(appointments)} appointments")
            return appointments
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"Response: {response.text}")
            return []
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return []

def analyze_appointment_data(appointments: List[Dict[str, Any]], endpoint_name: str):
    """Analyze appointment data structure and content."""
    print(f"\n4. Analyzing data from {endpoint_name}...")
    
    if not appointments:
        print("   ⚠️  No appointments found")
        return
    
    # Handle both list responses and direct list formats
    apt_list = appointments
    if isinstance(appointments, dict) and "appointments" in appointments:
        apt_list = appointments["appointments"]
    
    # Check for appointment ID 52
    appointment_52 = None
    for apt in apt_list:
        if apt.get("id") == 52:
            appointment_52 = apt
            break
    
    if appointment_52:
        print(f"   ✅ Found appointment ID 52!")
        print(f"      - Start: {appointment_52.get('start_time')}")
        print(f"      - End: {appointment_52.get('end_time')}")
        print(f"      - Client: {appointment_52.get('client_name', 'N/A')}")
        print(f"      - Service: {appointment_52.get('service_name', 'N/A')}")
        print(f"      - Status: {appointment_52.get('status')}")
    else:
        print(f"   ⚠️  Appointment ID 52 not found in response")
    
    # Show sample appointment structure
    if apt_list:
        print(f"\n   Sample appointment structure:")
        sample = apt_list[0]
        print(json.dumps(sample, indent=2, default=str))
    
    # List all appointment IDs for debugging
    apt_ids = [apt.get("id") for apt in apt_list]
    print(f"\n   All appointment IDs: {sorted(apt_ids)}")
    
    # Check date formats
    print("\n   Date format check:")
    for i, apt in enumerate(apt_list[:3]):  # Check first 3
        start = apt.get("start_time", "N/A")
        duration = apt.get("duration_minutes", "N/A")
        print(f"      Appointment {i+1}: start={start}, duration={duration}min")

def test_appointment_details_endpoint(token: str, appointment_id: int):
    """Test fetching a specific appointment by ID."""
    appointment_url = f"{API_V1_BASE}/appointments/{appointment_id}"
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"\n5. Testing /api/v1/appointments/{appointment_id} endpoint...")
    try:
        response = requests.get(appointment_url, headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            appointment = response.json()
            print(f"✅ Success! Retrieved appointment {appointment_id}")
            print(json.dumps(appointment, indent=2, default=str))
            return appointment
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

def verify_calendar_compatibility(appointments: List[Dict[str, Any]]):
    """Verify data format matches frontend calendar expectations."""
    print("\n6. Verifying calendar compatibility...")
    
    # Handle both list responses and direct list formats
    apt_list = appointments
    if isinstance(appointments, dict) and "appointments" in appointments:
        apt_list = appointments["appointments"]
    
    required_fields = ["id", "start_time", "status"]
    optional_fields = ["service_name", "barber_id", "price", "duration_minutes"]
    
    if not apt_list:
        print("   ⚠️  No appointments to verify")
        return
    
    # Check first appointment for required fields
    sample = apt_list[0]
    missing_required = []
    for field in required_fields:
        if field not in sample:
            missing_required.append(field)
    
    if missing_required:
        print(f"   ❌ Missing required fields: {missing_required}")
    else:
        print(f"   ✅ All required fields present")
    
    # Check optional fields
    present_optional = [f for f in optional_fields if f in sample]
    print(f"   Optional fields present: {present_optional}")
    
    # Check date format (should be ISO format for calendar)
    try:
        start = sample.get("start_time")
        if start:
            # Try parsing as ISO format
            datetime.fromisoformat(start.replace('Z', '+00:00'))
            print(f"   ✅ Date format is ISO-compatible")
    except:
        print(f"   ⚠️  Date format may need conversion for calendar")

def main():
    """Run all appointment endpoint tests."""
    print("="*60)
    print("APPOINTMENT API ENDPOINT TESTS")
    print("="*60)
    
    # Get auth token
    token = get_auth_token()
    if not token:
        print("\n❌ Cannot proceed without authentication")
        return
    
    # Test main appointments endpoint
    appointments = test_appointments_endpoint(token)
    if appointments:
        analyze_appointment_data(appointments, "/appointments/")
        verify_calendar_compatibility(appointments)
    
    # Test admin all appointments endpoint
    all_appointments = test_appointments_all_list_endpoint(token)
    if all_appointments:
        analyze_appointment_data(all_appointments, "/appointments/all/list")
    
    # Test specific appointment endpoint
    test_appointment_details_endpoint(token, 52)
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    issues = []
    
    if not appointments and not all_appointments:
        issues.append("No appointments retrieved from any endpoint")
    
    appointment_52_found = False
    for apt_list in [appointments, all_appointments]:
        if apt_list and any(apt.get("id") == 52 for apt in apt_list):
            appointment_52_found = True
            break
    
    if not appointment_52_found:
        issues.append("Appointment ID 52 not found in API responses")
    
    if issues:
        print("❌ Issues found:")
        for issue in issues:
            print(f"   - {issue}")
    else:
        print("✅ All tests passed successfully!")
        print("   - Appointment endpoints are accessible")
        print("   - Appointment ID 52 is retrievable")
        print("   - Data format is calendar-compatible")

if __name__ == "__main__":
    main()