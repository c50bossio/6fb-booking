import requests
import json

# Create test user
url = "http://localhost:8000/api/v1/auth/register-complete"
data = {
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "TestPass@2024\!",
    "user_type": "barbershop",
    "businessName": "Test Barbershop",
    "businessType": "individual",
    "address": {
        "street": "123 Test St",
        "city": "Test City",
        "state": "CA",
        "zipCode": "12345"
    },
    "phone": "555-1234",
    "chairCount": 1,
    "barberCount": 1,
    "consent": {
        "terms": True,
        "privacy": True,
        "marketing": False,
        "testData": True
    }
}

response = requests.post(url, json=data)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")

if response.status_code == 200:
    # Login to get token
    login_url = "http://localhost:8000/api/v1/auth/login"
    login_data = {
        "email": "test@example.com",
        "password": "TestPass@2024\!"
    }
    login_response = requests.post(login_url, json=login_data)
    print(f"\nLogin Status: {login_response.status_code}")
    print(f"Login Response: {login_response.text[:200]}...")
    
    if login_response.status_code == 200:
        token = login_response.json()["access_token"]
        print(f"\nAccess Token: {token[:50]}...")
EOF < /dev/null