"""
Test script for Payout Schedules API endpoints
"""

import requests
import json
from datetime import datetime, timedelta

# Base URL - adjust as needed
BASE_URL = "http://localhost:8000/api/v1"

# Test user credentials
TEST_EMAIL = "admin@sixfigurebarber.com"
TEST_PASSWORD = "admin123"  # pragma: allowlist secret


def get_auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        timeout=30,
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Authentication failed: {response.status_code} - {response.text}")
        return None


def test_create_payout_schedule(token, barber_id):
    """Test creating a payout schedule"""
    headers = {"Authorization": f"Bearer {token}"}

    schedule_data = {
        "barber_id": barber_id,
        "frequency": "weekly",
        "day_of_week": 4,  # Friday
        "minimum_payout_amount": 50.00,
        "auto_payout_enabled": True,
        "email_notifications": True,
        "sms_notifications": False,
        "advance_notice_days": 2,
        "preferred_payment_method": "stripe",
    }

    response = requests.post(
        f"{BASE_URL}/payout-schedules/schedules",
        json=schedule_data,
        headers=headers,
        timeout=30,
    )

    print(f"\nCreate Payout Schedule: {response.status_code}")
    if response.status_code == 201:
        print(json.dumps(response.json(), indent=2))
        return response.json()["id"]
    else:
        print(f"Error: {response.text}")
        return None


def test_get_payout_schedules(token):
    """Test getting all payout schedules"""
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(
        f"{BASE_URL}/payout-schedules/schedules", headers=headers, timeout=30
    )

    print(f"\nGet All Payout Schedules: {response.status_code}")
    if response.status_code == 200:
        schedules = response.json()
        print(f"Found {len(schedules)} schedules")
        for schedule in schedules[:3]:  # Show first 3
            print(
                f"- Schedule {schedule['id']}: {schedule['barber_name']} - {schedule['frequency']}"
            )
    else:
        print(f"Error: {response.text}")


def test_get_payout_history(token):
    """Test getting payout history"""
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(
        f"{BASE_URL}/payout-schedules/history", headers=headers, timeout=30
    )

    print(f"\nGet Payout History: {response.status_code}")
    if response.status_code == 200:
        history = response.json()
        print(f"Total payouts: {history['total_count']}")
        print(f"Total amount: ${history['total_amount']:.2f}")
        if history["payouts"]:
            print(
                f"Latest payout: ${history['payouts'][0]['amount']:.2f} on {history['payouts'][0]['date']}"
            )
    else:
        print(f"Error: {response.text}")


def test_create_manual_payout(token, barber_id):
    """Test creating a manual payout"""
    headers = {"Authorization": f"Bearer {token}"}

    payout_data = {
        "barber_id": barber_id,
        "amount": 150.00,
        "payout_type": "commission",
        "payment_method": "stripe",
        "description": "Manual test payout",
        "process_immediately": False,
    }

    response = requests.post(
        f"{BASE_URL}/payout-schedules/manual",
        json=payout_data,
        headers=headers,
        timeout=30,
    )

    print(f"\nCreate Manual Payout: {response.status_code}")
    if response.status_code == 201:
        payout = response.json()
        print(f"Created payout {payout['id']} for ${payout['amount']:.2f}")
        return payout["id"]
    else:
        print(f"Error: {response.text}")
        return None


def test_get_analytics(token):
    """Test getting payout analytics"""
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(
        f"{BASE_URL}/payout-schedules/analytics", headers=headers, timeout=30
    )

    print(f"\nGet Payout Analytics: {response.status_code}")
    if response.status_code == 200:
        analytics = response.json()
        print(f"Total paid out: ${analytics['total_paid_out']:.2f}")
        print(f"Total pending: ${analytics['total_pending']:.2f}")
        print(f"Average payout: ${analytics['average_payout_amount']:.2f}")
        print(f"Total fees: ${analytics['total_fees_paid']:.2f}")
        print(f"Payouts by status: {analytics['payouts_by_status']}")
    else:
        print(f"Error: {response.text}")


def test_payout_system_health(token):
    """Test payout system health check"""
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(
        f"{BASE_URL}/payout-schedules/health", headers=headers, timeout=30
    )

    print(f"\nPayout System Health: {response.status_code}")
    if response.status_code == 200:
        health = response.json()
        print(f"Status: {health['status']}")
        print(f"Checks: {json.dumps(health['checks'], indent=2)}")
        print(f"Statistics: {json.dumps(health['statistics'], indent=2)}")
    else:
        print(f"Error: {response.text}")


def main():
    """Run all tests"""
    print("Testing Payout Schedules API...")

    # Get auth token
    token = get_auth_token()
    if not token:
        print("Failed to authenticate. Exiting.")
        return

    print("Authentication successful!")

    # Use barber_id 1 for testing - adjust as needed
    test_barber_id = 1

    # Run tests
    schedule_id = test_create_payout_schedule(token, test_barber_id)
    test_get_payout_schedules(token)
    test_get_payout_history(token)

    payout_id = test_create_manual_payout(token, test_barber_id)

    test_get_analytics(token)
    test_payout_system_health(token)

    print("\n✅ All tests completed!")


if __name__ == "__main__":
    main()
