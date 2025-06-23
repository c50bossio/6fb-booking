#!/usr/bin/env python3
"""
Test script for client management API endpoints
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
TOKEN = None  # Will be set after login

def print_response(response, title="Response"):
    """Pretty print API response"""
    print(f"\n=== {title} ===")
    print(f"Status: {response.status_code}")
    try:
        data = response.json()
        print(json.dumps(data, indent=2))
    except:
        print(response.text)
    print("=" * 50)

def login():
    """Login and get access token"""
    global TOKEN
    
    # Try to login as admin
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "username": "admin",
            "password": "Test123!"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        TOKEN = data.get("access_token")
        print("✓ Login successful")
        return True
    else:
        print("✗ Login failed")
        print_response(response, "Login Error")
        return False

def test_get_clients():
    """Test getting all clients"""
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    response = requests.get(f"{BASE_URL}/clients", headers=headers)
    print_response(response, "Get All Clients")
    
    # Test with search
    response = requests.get(
        f"{BASE_URL}/clients",
        headers=headers,
        params={"search": "john"}
    )
    print_response(response, "Search Clients (john)")
    
    # Test with filter
    response = requests.get(
        f"{BASE_URL}/clients",
        headers=headers,
        params={"customer_type": "vip"}
    )
    print_response(response, "Filter VIP Clients")

def test_create_client():
    """Test creating a new client"""
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    client_data = {
        "first_name": "Test",
        "last_name": "Client",
        "email": f"test.client.{datetime.now().timestamp()}@example.com",
        "phone": "(555) 555-5555",
        "date_of_birth": "1990-01-01",
        "notes": "This is a test client created via API",
        "tags": ["API Test", "Demo"],
        "sms_enabled": True,
        "email_enabled": True,
        "marketing_enabled": False
    }
    
    response = requests.post(
        f"{BASE_URL}/clients",
        headers=headers,
        json=client_data
    )
    print_response(response, "Create Client")
    
    if response.status_code == 200:
        return response.json()["id"]
    return None

def test_get_client(client_id):
    """Test getting a specific client"""
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    response = requests.get(f"{BASE_URL}/clients/{client_id}", headers=headers)
    print_response(response, f"Get Client {client_id}")

def test_update_client(client_id):
    """Test updating a client"""
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    update_data = {
        "notes": "Updated notes via API test",
        "tags": ["API Test", "Updated", "VIP"],
        "marketing_enabled": True
    }
    
    response = requests.put(
        f"{BASE_URL}/clients/{client_id}",
        headers=headers,
        json=update_data
    )
    print_response(response, f"Update Client {client_id}")

def test_client_history(client_id):
    """Test getting client history"""
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    response = requests.get(f"{BASE_URL}/clients/{client_id}/history", headers=headers)
    print_response(response, f"Client {client_id} History")

def test_vip_status(client_id):
    """Test updating VIP status"""
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    vip_data = {
        "is_vip": True,
        "custom_rate": 15.0,
        "vip_benefits": {
            "priority_booking": True,
            "discount_percentage": 15,
            "free_services": ["Beard Trim"],
            "loyalty_points_multiplier": 2
        }
    }
    
    response = requests.post(
        f"{BASE_URL}/clients/{client_id}/vip-status",
        headers=headers,
        json=vip_data
    )
    print_response(response, f"Update VIP Status for Client {client_id}")

def test_send_message(client_id):
    """Test sending message to client"""
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    message_data = {
        "subject": "Test Message from 6FB Platform",
        "message": "This is a test message sent via the API. Thank you for being a valued client!",
        "send_email": True,
        "send_sms": False
    }
    
    response = requests.post(
        f"{BASE_URL}/clients/{client_id}/message",
        headers=headers,
        json=message_data
    )
    print_response(response, f"Send Message to Client {client_id}")

def test_export_clients():
    """Test exporting clients"""
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    # Test CSV export
    response = requests.post(
        f"{BASE_URL}/clients/export",
        headers=headers,
        params={"format": "csv"}
    )
    
    if response.status_code == 200:
        print("\n✓ CSV Export successful")
        print(f"Content-Type: {response.headers.get('content-type')}")
        print(f"Size: {len(response.content)} bytes")
    else:
        print_response(response, "CSV Export Error")
    
    # Test JSON export
    response = requests.post(
        f"{BASE_URL}/clients/export",
        headers=headers,
        params={"format": "json", "customer_type": "vip"}
    )
    print_response(response, "JSON Export (VIP Clients)")

def main():
    """Run all tests"""
    print("=== Client Management API Test Suite ===\n")
    
    # Login first
    if not login():
        print("Cannot proceed without authentication")
        return
    
    # Run tests
    print("\n1. Testing GET /clients endpoint...")
    test_get_clients()
    
    print("\n2. Testing POST /clients endpoint...")
    client_id = test_create_client()
    
    if client_id:
        print(f"\n3. Testing GET /clients/{client_id} endpoint...")
        test_get_client(client_id)
        
        print(f"\n4. Testing PUT /clients/{client_id} endpoint...")
        test_update_client(client_id)
        
        print(f"\n5. Testing GET /clients/{client_id}/history endpoint...")
        test_client_history(client_id)
        
        print(f"\n6. Testing POST /clients/{client_id}/vip-status endpoint...")
        test_vip_status(client_id)
        
        print(f"\n7. Testing POST /clients/{client_id}/message endpoint...")
        test_send_message(client_id)
    
    print("\n8. Testing POST /clients/export endpoint...")
    test_export_clients()
    
    print("\n✅ All tests completed!")

if __name__ == "__main__":
    main()