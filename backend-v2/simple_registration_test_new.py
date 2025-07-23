#!/usr/bin/env python3
"""
Simple test to verify registration functionality without complex database migrations.
"""

import requests
import json

def test_registration():
    """Test the registration endpoints"""
    base_url = "http://127.0.0.1:8000"
    
    # Test simple registration first
    simple_registration_data = {
        "email": "test.simple@example.com",
        "password": "TestPassword123!",
        "name": "Test Simple User",
        "user_type": "barber"
    }
    
    print("🧪 Testing simple registration...")
    try:
        response = requests.post(
            f"{base_url}/api/v2/auth/register",
            json=simple_registration_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Simple registration successful!")
            result = response.json()
            print(f"User created: {result.get('user', {}).get('email')}")
            print(f"Trial status: {result.get('user', {}).get('trial_active')}")
        else:
            print(f"❌ Simple registration failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Test complete registration
    complete_registration_data = {
        "email": "test.complete@example.com",
        "password": "TestPassword123!",
        "firstName": "Test",
        "lastName": "Complete",
        "phone": "+1234567890",
        "user_type": "barber",
        "businessType": "individual",
        "businessName": "Test Barber Shop",
        "description": "Professional barbering services",
        "address": {
            "street": "123 Main St",
            "city": "Anytown",
            "state": "CA",
            "zipCode": "90210"
        },
        "website": "https://testbarber.com",
        "chairCount": 1,
        "consent": {
            "terms": True,
            "privacy": True,
            "marketing": False,
            "testData": False
        }
    }
    
    print("🧪 Testing complete registration...")
    try:
        response = requests.post(
            f"{base_url}/api/v2/auth/register-complete",
            json=complete_registration_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Complete registration successful!")
            result = response.json()
            print(f"User created: {result.get('user', {}).get('email')}")
            print(f"Organization created: {result.get('organization', {}).get('name')}")
            print(f"Trial status: {result.get('user', {}).get('trial_active')}")
            print(f"Trial expires: {result.get('user', {}).get('trial_expires_at')}")
        else:
            print(f"❌ Complete registration failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_registration()