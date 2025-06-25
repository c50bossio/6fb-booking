#!/usr/bin/env python3
"""
Direct test of customer booking functionality without problematic joinedloads
"""

import requests
import json

API_BASE = "http://localhost:8000/api/v1"


def get_auth_token():
    """Get auth token for API test customer"""

    login_data = {"email": "api_test_customer@example.com", "password": "ApiTest123!"}  # pragma: allowlist secret

    response = requests.post(
        f"{API_BASE}/customer/auth/login",
        json=login_data,
        headers={"Content-Type": "application/json"},
    )

    if response.status_code == 200:
        return response.json().get("access_token")
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None


def test_customer_endpoints():
    """Test customer endpoints with direct API calls"""

    token = get_auth_token()
    if not token:
        return False

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    print("Testing customer API endpoints...")

    # Test 1: Check current customer info
    print("\n1. Testing GET /customer/auth/me")
    response = requests.get(f"{API_BASE}/customer/auth/me", headers=headers)
    print(f"   Status: {response.status_code}")

    if response.status_code == 200:
        customer = response.json()
        print(f"   ✅ Customer: {customer['first_name']} {customer['last_name']}")
        print(f"   ✅ Customer ID: {customer['id']}")
        customer_id = customer["id"]
    else:
        print(f"   ❌ Failed: {response.text}")
        return False

    # Test 2: Direct database query to check appointments
    print(f"\n2. Checking appointments in database for customer {customer_id}")
    import sqlite3

    conn = sqlite3.connect("6fb_booking.db")
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            id, appointment_date, appointment_time, service_name, status,
            service_revenue, tip_amount, product_revenue
        FROM appointments
        WHERE customer_id = ?
        ORDER BY appointment_date DESC
    """,
        (customer_id,),
    )

    appointments = cursor.fetchall()
    print(f"   ✅ Found {len(appointments)} appointments in database")

    for apt in appointments[:3]:
        print(
            f"      - ID: {apt[0]}, Date: {apt[1]}, Service: {apt[3]}, Status: {apt[4]}"
        )

    conn.close()

    # Test 3: Try customer appointments endpoint
    print(f"\n3. Testing GET /customer/appointments")
    response = requests.get(f"{API_BASE}/customer/appointments", headers=headers)
    print(f"   Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ API returned {len(data.get('appointments', []))} appointments")
    else:
        print(f"   ❌ Failed: {response.text[:200]}...")

    # Test 4: Try customer stats endpoint
    print(f"\n4. Testing GET /customer/stats")
    response = requests.get(f"{API_BASE}/customer/stats", headers=headers)
    print(f"   Status: {response.status_code}")

    if response.status_code == 200:
        stats = response.json()
        print(f"   ✅ Stats: {stats}")
    else:
        print(f"   ❌ Failed: {response.text[:200]}...")

    return True


if __name__ == "__main__":
    test_customer_endpoints()
