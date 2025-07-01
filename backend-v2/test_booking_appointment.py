import requests
import json
from datetime import datetime, timedelta
from pprint import pprint

# Configuration
BASE_URL = "http://localhost:8000"
TEST_EMAIL = "test-barber@6fb.com"
TEST_PASSWORD = "test123"

def login():
    """Login and get access token"""
    print("🔐 Logging in...")
    response = requests.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={
            "username": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
    )
    
    if response.status_code == 200:
        token_data = response.json()
        print("✅ Login successful!")
        return token_data["access_token"]
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(response.json())
        return None

def get_services(token):
    """Get available services"""
    print("\n📋 Fetching available services...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/v1/services", headers=headers)
    
    if response.status_code == 200:
        services = response.json()
        print(f"Found {len(services)} services:")
        for service in services[:5]:  # Show first 5
            print(f"  - {service['name']}: ${service['price']} ({service['duration']} min)")
        return services
    else:
        print(f"❌ Failed to get services: {response.status_code}")
        return []

def get_clients(token):
    """Get clients"""
    print("\n👥 Fetching clients...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/v1/clients", headers=headers)
    
    if response.status_code == 200:
        clients = response.json()
        if clients:
            print(f"Found {len(clients)} clients")
            return clients
        else:
            print("No clients found, creating one...")
            return create_test_client(token)
    else:
        print(f"❌ Failed to get clients: {response.status_code}")
        return []

def create_test_client(token):
    """Create a test client"""
    headers = {"Authorization": f"Bearer {token}"}
    client_data = {
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "+1234567890"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/v1/clients",
        headers=headers,
        json=client_data
    )
    
    if response.status_code in [200, 201]:
        client = response.json()
        print(f"✅ Created test client: {client['name']}")
        return [client]
    else:
        print(f"❌ Failed to create client: {response.status_code}")
        print(response.json())
        return []

def book_appointment(token, service_id, client_id, barber_id):
    """Book an appointment"""
    print("\n📅 Booking appointment...")
    
    # Schedule for tomorrow at 2 PM
    tomorrow = datetime.now() + timedelta(days=1)
    appointment_time = tomorrow.replace(hour=14, minute=0, second=0, microsecond=0)
    
    headers = {"Authorization": f"Bearer {token}"}
    appointment_data = {
        "service_id": service_id,
        "client_id": client_id,
        "barber_id": barber_id,
        "start_time": appointment_time.isoformat(),
        "notes": "Test appointment created via API"
    }
    
    print(f"Booking details:")
    print(f"  - Date/Time: {appointment_time.strftime('%Y-%m-%d %I:%M %p')}")
    print(f"  - Service ID: {service_id}")
    print(f"  - Client ID: {client_id}")
    print(f"  - Barber ID: {barber_id}")
    
    response = requests.post(
        f"{BASE_URL}/api/v1/appointments",
        headers=headers,
        json=appointment_data
    )
    
    if response.status_code in [200, 201]:
        appointment = response.json()
        print("\n✅ Appointment booked successfully!")
        print(f"Appointment ID: {appointment['id']}")
        print(f"Status: {appointment['status']}")
        print(f"Start Time: {appointment['start_time']}")
        if 'service' in appointment:
            print(f"Service: {appointment['service']['name']}")
        if 'price' in appointment:
            print(f"Price: ${appointment['price']}")
        return appointment
    else:
        print(f"❌ Failed to book appointment: {response.status_code}")
        print("Response:", response.text)
        return None

def get_user_info(token):
    """Get current user info"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/v1/users/me", headers=headers)
    
    if response.status_code == 200:
        user = response.json()
        print(f"Current user: {user['name']} (ID: {user['id']})")
        return user
    return None

def main():
    print("🚀 Testing Appointment Booking System\n")
    
    # Step 1: Login
    token = login()
    if not token:
        return
    
    # Get current user info
    user = get_user_info(token)
    if not user:
        return
    
    barber_id = user['id']
    
    # Step 2: Get services
    services = get_services(token)
    if not services:
        print("No services available. Please create services first.")
        return
    
    # Select first service
    service = services[0]
    
    # Step 3: Get or create client
    clients = get_clients(token)
    if not clients:
        print("No clients available.")
        return
    
    # Select first client
    client = clients[0]
    
    # Step 4: Book appointment
    appointment = book_appointment(
        token,
        service['id'],
        client['id'],
        barber_id
    )
    
    if appointment:
        print("\n🎉 Test completed successfully!")
        print(f"\nYou can now:")
        print(f"1. Go to http://localhost:3000/calendar to see the appointment")
        print(f"2. Try dragging it to a different time slot")
        print(f"3. Click the 'Sync' button to sync with Google Calendar")
        print(f"4. Check for any conflicts in the Conflicts panel")

if __name__ == "__main__":
    main()