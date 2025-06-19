#!/usr/bin/env python3
"""
Test with real webhook data from your Trafft logs
"""
import requests
import urllib.parse
import time


def test_real_webhook_data():
    """Test with actual data from your webhook logs"""
    print("🔄 Testing with real Trafft webhook data...")

    # Real data from your webhook logs
    real_webhook_data = {
        "appointmentId": "18520",
        "appointmentStatus": "Approved",
        "appointmentStartDate": "June 21, 2025",
        "appointmentStartTime": "12:45 pm",
        "appointmentStartDateTime": "June 21, 2025 12:45 pm",
        "appointmentEndDate": "June 21, 2025",
        "appointmentEndTime": "1:15 pm",
        "appointmentEndDateTime": "June 21, 2025 1:15 pm",
        "appointmentPrice": "$30.00",
        "bookingUuid": "47cbfb23-1f7f-4a03-8a59-84824cee3104",
        "customerFullName": "Zac Hardiman",
        "customerFirstName": "Zac",
        "customerLastName": "Hardiman",
        "customerEmail": "Zachardiman@gmail.com",
        "customerPhone": "+18137679851",
        "employeeFullName": "Matthew Nava",
        "employeeFirstName": "Matthew",
        "employeeLastName": "Nava",
        "employeeEmail": "matthew.navaa@gmail.com",
        "employeePhone": "-",
        "serviceCategory": "Headlines Services",
        "serviceName": "Haircut Only",
        "serviceDuration": "30min",
        "servicePrice": "$30.00",
        "locationName": "Headlines Barbershop - Bloomingdale",
        "locationAddress": "909 E Bloomingdale Ave, Brandon, FL 33511, USA",
        "locationPhone": "+18132785346",
    }

    print(
        f"📋 Sending: {real_webhook_data['customerFullName']} at {real_webhook_data['locationName']}"
    )

    # Send to deployed backend
    form_data = urllib.parse.urlencode(real_webhook_data)

    try:
        response = requests.post(
            "https://sixfb-backend.onrender.com/api/v1/webhooks/trafft",
            data=form_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30,
        )

        print(f"📡 Response: {response.status_code}")
        print(f"📄 Body: {response.text}")

        if response.status_code == 200:
            print("✅ Webhook accepted by deployed backend!")

            # Wait a moment for processing
            print("⏳ Waiting 3 seconds for processing...")
            time.sleep(3)

            # Check logs
            logs_response = requests.get(
                "https://sixfb-backend.onrender.com/api/v1/webhooks/trafft/logs",
                timeout=10,
            )

            if logs_response.status_code == 200:
                logs_data = logs_response.json()
                recent_log = (
                    logs_data.get("logs", [])[0] if logs_data.get("logs") else None
                )

                if recent_log:
                    print(
                        f"📋 Latest log: {recent_log.get('event_type')} - {recent_log.get('body_parsed', {}).get('customerFullName')}"
                    )
                else:
                    print("❌ No recent logs found")

        else:
            print(f"❌ Webhook failed: {response.status_code}")

    except Exception as e:
        print(f"❌ Request failed: {e}")


if __name__ == "__main__":
    test_real_webhook_data()
