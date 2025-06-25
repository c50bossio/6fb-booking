#!/usr/bin/env python3
"""
Create a test customer with known credentials for API testing
"""

import requests
import json

API_BASE = "http://localhost:8000/api/v1"


def create_test_customer():
    """Create a new test customer"""

    customer_data = {
        "email": "api_test_customer@example.com",
        "password": "ApiTest123!",  # pragma: allowlist secret
        "first_name": "API",
        "last_name": "Tester",
        "phone": "+1234567890",
        "newsletter_subscription": True,
    }

    print(f"Creating test customer: {customer_data['email']}")

    response = requests.post(
        f"{API_BASE}/customer/auth/register",
        json=customer_data,
        headers={"Content-Type": "application/json"},
    )

    print(f"Registration Status: {response.status_code}")
    print(f"Response: {response.text}")

    if response.status_code in [200, 201]:
        print("✅ Customer created successfully!")
        return customer_data
    elif response.status_code == 400 and "Email already registered" in response.text:
        print("✅ Customer already exists, proceeding with login test")
        return customer_data
    else:
        print("❌ Failed to create customer")
        return None


def test_login(customer_data):
    """Test login with the created customer"""

    if not customer_data:
        return None

    print(f"\nTesting login for {customer_data['email']}")

    login_data = {
        "email": customer_data["email"],
        "password": customer_data["password"],
    }

    response = requests.post(
        f"{API_BASE}/customer/auth/login",
        json=login_data,
        headers={"Content-Type": "application/json"},
    )

    print(f"Login Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print("✅ Login successful!")
        print(
            f"Customer: {data.get('customer', {}).get('first_name')} {data.get('customer', {}).get('last_name')}"
        )
        return data.get("access_token")
    else:
        print(f"❌ Login failed: {response.text}")
        return None


def test_apis(token):
    """Test customer APIs with the token"""

    if not token:
        return

    print(f"\nTesting customer APIs...")

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Test appointments endpoint
    print("Testing GET /customer/appointments")
    response = requests.get(f"{API_BASE}/customer/appointments", headers=headers)
    print(f"  Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"  ✅ Found {len(data.get('appointments', []))} appointments")
    else:
        print(f"  ❌ Failed: {response.text[:100]}...")

    # Test stats endpoint
    print("Testing GET /customer/stats")
    response = requests.get(f"{API_BASE}/customer/stats", headers=headers)
    print(f"  Status: {response.status_code}")

    if response.status_code == 200:
        stats = response.json()
        print(f"  ✅ Stats: {stats}")
    else:
        print(f"  ❌ Failed: {response.text[:100]}...")


if __name__ == "__main__":
    customer_data = create_test_customer()
    token = test_login(customer_data)
    test_apis(token)
