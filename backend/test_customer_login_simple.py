#!/usr/bin/env python3
"""
Simple test to check customer login functionality
"""

import requests
import json

# Test with known good customer data
TEST_EMAIL = "dashboard_test_1750884994@example.com"
TEST_PASSWORD = "testpass123"  # pragma: allowlist secret

API_BASE = "http://localhost:8000/api/v1"


def test_login():
    print(f"Testing login for {TEST_EMAIL}")

    login_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD}

    response = requests.post(
        f"{API_BASE}/customer/auth/login",
        json=login_data,
        headers={"Content-Type": "application/json"},
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")

    if response.status_code == 200:
        data = response.json()
        print(f"✅ Login successful!")
        print(f"Access Token: {data.get('access_token', 'N/A')[:50]}...")
        print(
            f"Customer: {data.get('customer', {}).get('first_name')} {data.get('customer', {}).get('last_name')}"
        )
        return data.get("access_token")
    else:
        print(f"❌ Login failed")
        return None


def test_with_token(token):
    if not token:
        return

    print(f"\nTesting API with token...")

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Test getting appointments
    response = requests.get(f"{API_BASE}/customer/appointments", headers=headers)
    print(f"Appointments endpoint: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"✅ Found {len(data.get('appointments', []))} appointments")

    # Test getting stats
    response = requests.get(f"{API_BASE}/customer/stats", headers=headers)
    print(f"Stats endpoint: {response.status_code}")

    if response.status_code == 200:
        stats = response.json()
        print(f"✅ Stats: {stats.get('totalAppointments')} total appointments")


if __name__ == "__main__":
    token = test_login()
    test_with_token(token)
