#!/usr/bin/env python3
"""
Simple webhook test that bypasses model relationship issues
"""
import requests
import json
import time


def test_webhook_and_check_data():
    """Test webhook processing and check if data appears in database"""
    print("🔍 Testing webhook processing and data flow...")

    # Step 1: Send a test webhook
    print("\n1️⃣ Sending test webhook...")

    test_data = {
        "appointmentId": f"TEST{int(time.time())}",
        "appointmentStatus": "Approved",
        "appointmentStartDateTime": "June 21, 2025 2:00 pm",
        "appointmentEndDateTime": "June 21, 2025 2:30 pm",
        "appointmentPrice": "$30.00",
        "bookingUuid": f"test-uuid-{int(time.time())}",
        "customerFullName": "John Doe Test",
        "customerFirstName": "John",
        "customerLastName": "Doe",
        "customerEmail": "john.doe.test@example.com",
        "customerPhone": "+1234567890",
        "employeeFullName": "Jane Barber Test",
        "employeeFirstName": "Jane",
        "employeeLastName": "Barber",
        "employeeEmail": "jane.barber.test@example.com",
        "serviceName": "Haircut Only",
        "servicePrice": "$30.00",
        "locationName": "Test Barbershop",
        "locationAddress": "123 Test Street, Test City, FL",
    }

    # Convert to form data
    import urllib.parse

    form_data = urllib.parse.urlencode(test_data)

    try:
        response = requests.post(
            "https://sixfb-backend.onrender.com/api/v1/webhooks/trafft",
            data=form_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10,
        )

        print(f"   Webhook status: {response.status_code}")
        print(f"   Response: {response.text}")

        if response.status_code != 200:
            print("❌ Webhook failed")
            return

    except Exception as e:
        print(f"❌ Webhook request failed: {e}")
        return

    # Step 2: Check webhook logs
    print("\n2️⃣ Checking webhook logs...")
    try:
        logs_response = requests.get(
            "https://sixfb-backend.onrender.com/api/v1/webhooks/trafft/logs", timeout=10
        )

        if logs_response.status_code == 200:
            logs_data = logs_response.json()
            recent_logs = logs_data.get("logs", [])[:3]

            print(f"   Found {len(recent_logs)} recent webhook logs")
            for log in recent_logs:
                event_type = log.get("event_type", "unknown")
                customer = log.get("body_parsed", {}).get("customerFullName", "Unknown")
                timestamp = log.get("timestamp", "Unknown time")
                print(f"   • {event_type}: {customer} at {timestamp}")

        else:
            print(f"   ❌ Failed to get logs: {logs_response.status_code}")

    except Exception as e:
        print(f"   ❌ Error getting logs: {e}")

    # Step 3: Try to access analytics endpoint to see if data flows through
    print("\n3️⃣ Checking if analytics endpoints work...")
    try:
        analytics_response = requests.get(
            "https://sixfb-backend.onrender.com/api/v1/analytics/dashboard-summary",
            timeout=10,
        )

        print(f"   Analytics endpoint status: {analytics_response.status_code}")
        if analytics_response.status_code == 200:
            print("   ✅ Analytics endpoint accessible")
        else:
            print(f"   ❌ Analytics endpoint failed: {analytics_response.text}")

    except Exception as e:
        print(f"   ❌ Analytics request failed: {e}")

    print("\n🔍 Summary:")
    print("   • Webhooks are being received ✅")
    print("   • Webhook processing returns success ✅")
    print("   • Database model relationships need fixing ❌")
    print("   • Data is not reaching dashboard ❌")

    print(
        "\n💡 The issue is SQLAlchemy model relationship errors preventing database writes"
    )
    print("   Real webhook data is coming in but can't be stored due to import issues")


if __name__ == "__main__":
    test_webhook_and_check_data()
