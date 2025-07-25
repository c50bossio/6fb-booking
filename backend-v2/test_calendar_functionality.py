#!/usr/bin/env python3
"""
Test script to verify all calendar booking app functionality
"""
import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"
AUTH_TOKEN = None

def login():
    """Login to get auth token"""
    global AUTH_TOKEN
    response = requests.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={"email": "super.admin@bookedbarber.com", "password": "TestPass123!"}
    )
    if response.status_code == 200:
        AUTH_TOKEN = response.json()["access_token"]
        print("✅ Login successful")
        return True
    else:
        print(f"❌ Login failed: {response.status_code} - {response.text}")
        return False

def test_appointments_list():
    """Test getting appointments list"""
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
    response = requests.get(f"{BASE_URL}/api/v1/appointments/", headers=headers)
    if response.status_code == 200:
        appointments = response.json()
        print(f"✅ Appointments list: Found {len(appointments)} appointments")
        return True
    else:
        print(f"❌ Appointments list failed: {response.status_code} - {response.text}")
        return False

def test_available_slots():
    """Test getting available slots"""
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    # Test without barber_id
    response = requests.get(
        f"{BASE_URL}/api/v1/appointments/slots",
        params={"appointment_date": tomorrow, "service_id": 1},
        headers=headers
    )
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Available slots (no barber): {data.get('date', 'N/A')}")
        if 'available_barbers' in data:
            for barber in data['available_barbers']:
                print(f"   - {barber['barber_name']}: {len(barber['slots'])} slots")
    else:
        print(f"❌ Available slots failed: {response.status_code} - {response.text}")
        return False
    
    # Test with specific barber_id
    response = requests.get(
        f"{BASE_URL}/api/v1/appointments/slots",
        params={"appointment_date": tomorrow, "service_id": 1, "barber_id": 2},
        headers=headers
    )
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Available slots (barber 2): Found {len(data.get('slots', []))} slots")
        return True
    else:
        print(f"❌ Available slots with barber failed: {response.status_code} - {response.text}")
        return False

def test_services():
    """Test getting services list"""
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
    response = requests.get(f"{BASE_URL}/api/v1/services/", headers=headers)
    if response.status_code == 200:
        services = response.json()
        if isinstance(services, list):
            print(f"✅ Services list: Found {len(services)} services")
            for service in services:
                duration = service.get('duration_minutes', service.get('duration', 'N/A'))
                print(f"   - {service['name']} (ID: {service['id']}, Duration: {duration} min)")
        else:
            print(f"✅ Services list: Found {len(services.get('services', []))} services")
            for service in services.get('services', []):
                duration = service.get('duration_minutes', service.get('duration', 'N/A'))
                print(f"   - {service['name']} (ID: {service['id']}, Duration: {duration} min)")
        return True
    else:
        print(f"❌ Services list failed: {response.status_code} - {response.text}")
        return False

def test_clients():
    """Test getting clients list"""
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
    response = requests.get(f"{BASE_URL}/api/v1/clients/", headers=headers)
    if response.status_code == 200:
        clients = response.json()
        print(f"✅ Clients list: Found {clients.get('total', 0)} clients")
        return True
    else:
        print(f"❌ Clients list failed: {response.status_code} - {response.text}")
        return False

def test_barbers():
    """Test getting barbers list"""
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
    response = requests.get(f"{BASE_URL}/api/v1/users/?role=barber", headers=headers)
    if response.status_code == 200:
        barbers = response.json()
        print(f"✅ Barbers list: Found {len(barbers)} barbers")
        for barber in barbers:
            print(f"   - {barber.get('name', barber.get('email', 'Unknown'))} (ID: {barber['id']})")
        return True
    else:
        print(f"❌ Barbers list failed: {response.status_code} - {response.text}")
        return False

def main():
    print("=== Calendar Booking App Functionality Test ===\n")
    
    if not login():
        print("\n❌ Cannot proceed without authentication")
        return
    
    print("\n--- Testing Core APIs ---")
    test_appointments_list()
    test_services()
    test_clients()
    test_barbers()
    
    print("\n--- Testing Appointment Slots ---")
    test_available_slots()
    
    print("\n=== Test Summary ===")
    print("Check the results above to identify broken functionality")

if __name__ == "__main__":
    main()