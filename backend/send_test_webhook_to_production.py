#!/usr/bin/env python3
"""
Send a test webhook with real Headlines Barbershop data to production
"""
import requests
import urllib.parse
import time


def send_production_webhook():
    """Send real webhook data to production backend"""
    print("🚀 Sending test webhook to production backend...")

    # Use real data from your webhook logs but with today's date
    real_webhook_data = {
        "appointmentId": f"TEST{int(time.time())}",  # Unique ID
        "appointmentStatus": "Approved",
        "appointmentStartDate": "June 19, 2025",  # Today
        "appointmentStartTime": "7:30 pm",
        "appointmentStartDateTime": "June 19, 2025 7:30 pm",
        "appointmentEndDate": "June 19, 2025",
        "appointmentEndTime": "8:00 pm",
        "appointmentEndDateTime": "June 19, 2025 8:00 pm",
        "appointmentPrice": "$30.00",
        "bookingUuid": f"test-uuid-{int(time.time())}",
        "customerFullName": "Dashboard Test Customer",
        "customerFirstName": "Dashboard",
        "customerLastName": "Test",
        "customerEmail": "test@6fbtest.com",
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

    print(f"📋 Customer: {real_webhook_data['customerFullName']}")
    print(f"🏢 Location: {real_webhook_data['locationName']}")
    print(f"✂️ Barber: {real_webhook_data['employeeFullName']}")
    print(f"💰 Price: {real_webhook_data['appointmentPrice']}")
    print(f"📅 Time: {real_webhook_data['appointmentStartDateTime']}")

    # Send to production backend
    form_data = urllib.parse.urlencode(real_webhook_data)

    try:
        response = requests.post(
            "https://sixfb-backend.onrender.com/api/v1/webhooks/trafft",
            data=form_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30,
        )

        print(f"\n📡 Production Response: {response.status_code}")
        print(f"📄 Body: {response.text}")

        if response.status_code == 200:
            print("\n✅ Webhook sent successfully to production!")
            print("🎯 This appointment should now appear in your dashboard")
            print("🔗 Check: https://sixfb-frontend-paby.onrender.com/dashboard")

            # Wait and check logs
            print("\n⏳ Waiting 5 seconds for processing...")
            time.sleep(5)

            # Check logs to confirm processing
            logs_response = requests.get(
                "https://sixfb-backend.onrender.com/api/v1/webhooks/trafft/logs",
                timeout=10,
            )

            if logs_response.status_code == 200:
                logs_data = logs_response.json()
                recent_log = (
                    logs_data.get("logs", [])[0] if logs_data.get("logs") else None
                )

                if recent_log and "Dashboard Test" in recent_log.get(
                    "body_parsed", {}
                ).get("customerFullName", ""):
                    print(f"✅ Confirmed: Webhook processed successfully!")
                    print(
                        f"📋 Latest log shows: {recent_log.get('body_parsed', {}).get('customerFullName')}"
                    )
                else:
                    print("⚠️ Webhook logged but processing status unclear")

        else:
            print(f"❌ Webhook failed: {response.status_code}")
            print(f"Error: {response.text}")

    except Exception as e:
        print(f"❌ Request failed: {e}")


if __name__ == "__main__":
    send_production_webhook()
