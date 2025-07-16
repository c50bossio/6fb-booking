#!/usr/bin/env python3
"""
Create test clients for development and testing purposes.
"""
import json
import requests

def create_test_clients():
    """Create test clients via API"""
    base_url = "http://localhost:8000"
    
    # First login to get a token
    login_data = {
        "email": "admin.test@bookedbarber.com",
        "password": "AdminTest123"
    }
    
    print("🔐 Logging in to get auth token...")
    login_response = requests.post(f"{base_url}/api/v1/auth/login", json=login_data)
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(f"Response: {login_response.text}")
        return
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test clients data
    test_clients = [
        {
            "name": "John Smith",
            "email": "john.smith@example.com",
            "phone": "+1234567890",
            "customer_type": "returning"
        },
        {
            "name": "Sarah Johnson",
            "email": "sarah.johnson@example.com", 
            "phone": "+1234567891",
            "customer_type": "new"
        },
        {
            "name": "Mike Davis",
            "email": "mike.davis@example.com",
            "phone": "+1234567892",
            "customer_type": "vip"
        }
    ]
    
    print("👥 Creating test clients...")
    for client_data in test_clients:
        response = requests.post(f"{base_url}/api/v1/clients/", json=client_data, headers=headers)
        
        if response.status_code == 201:
            client = response.json()
            print(f"✅ Created client: {client['name']} (ID: {client['id']})")
        else:
            print(f"❌ Failed to create client {client_data['name']}: {response.status_code}")
            print(f"Response: {response.text}")
    
    # Test the clients list endpoint
    print("\n📋 Testing clients list endpoint...")
    list_response = requests.get(f"{base_url}/api/v1/clients/?page=1&page_size=20", headers=headers)
    
    if list_response.status_code == 200:
        clients_data = list_response.json()
        print(f"✅ Clients endpoint working! Found {len(clients_data['clients'])} clients")
        print(f"Total clients: {clients_data['total']}")
    else:
        print(f"❌ Clients list failed: {list_response.status_code}")
        print(f"Response: {list_response.text}")

if __name__ == "__main__":
    create_test_clients()