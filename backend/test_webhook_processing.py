#!/usr/bin/env python3
"""
Test webhook processing by simulating the data we see in logs
"""
import asyncio
import json
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))


async def test_webhook_processing():
    """Test the webhook processing with real data from logs"""
    print("🧪 Testing Trafft webhook processing...")

    # Sample data from your actual webhook logs
    sample_appointment = {
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
        f"📋 Testing with appointment: {sample_appointment['customerFullName']} - {sample_appointment['appointmentStartDateTime']}"
    )

    # Test the actual webhook endpoint
    try:
        import requests
        import urllib.parse

        # Convert to form data like Trafft sends
        form_data = urllib.parse.urlencode(sample_appointment)

        response = requests.post(
            "https://sixfb-backend.onrender.com/api/v1/webhooks/trafft",
            data=form_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        print(f"📡 Webhook response status: {response.status_code}")
        print(f"📄 Response: {response.text}")

        if response.status_code == 200:
            print("✅ Webhook processing successful!")
        else:
            print("❌ Webhook processing failed")

    except Exception as e:
        print(f"❌ Error testing webhook: {e}")


if __name__ == "__main__":
    asyncio.run(test_webhook_processing())
