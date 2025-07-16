#!/usr/bin/env python3
"""
Test script to verify test data option in registration flow
"""
import requests
import json

def test_registration_with_test_data():
    """Test the registration endpoint with test data enabled"""
    
    # Registration data with test data enabled
    registration_data = {
        "firstName": "Test",
        "lastName": "User",
        "email": "testuser@example.com", 
        "password": "TestPass123!",
        "user_type": "barber",
        "businessName": "Test Barber Shop",
        "businessType": "individual",
        "address": {
            "street": "123 Test St",
            "city": "Test City", 
            "state": "CA",
            "zipCode": "12345"
        },
        "phone": "555-123-4567",
        "website": "",
        "chairCount": 1,
        "barberCount": 1,
        "description": "",
        "pricingInfo": None,
        "consent": {
            "terms": True,
            "privacy": True,
            "marketing": True,
            "testData": True  # This is the key field we're testing
        }
    }
    
    # Send registration request
    url = "http://localhost:8000/api/v1/auth/register-complete"
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(url, json=registration_data, headers=headers)
        print(f"Registration Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Registration successful!")
            print(f"User ID: {result.get('user', {}).get('id')}")
            print(f"Test data requested: {registration_data['consent']['testData']}")
            return True
        else:
            print("❌ Registration failed")
            return False
            
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing registration with test data option...")
    success = test_registration_with_test_data()
    print("✅ Test completed successfully!" if success else "❌ Test failed!")