#!/usr/bin/env python3
"""
Debug what Trafft is sending to our webhook
"""
import requests
import json

# Check if the endpoint is accessible
print("🔍 Checking Trafft webhook endpoint...")

# 1. Check the setup endpoint
try:
    response = requests.get("https://sixfb-backend.onrender.com/api/v1/webhooks/trafft/setup")
    print(f"\nSetup endpoint status: {response.status_code}")
    if response.status_code == 200:
        print("Setup instructions:", json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")

# 2. Send a test webhook similar to what Trafft might send
print("\n\n📤 Sending test webhook...")

# Trafft might send data in different formats
test_payloads = [
    {
        "name": "Standard format",
        "data": {
            "event": "appointment.booked",
            "appointment": {
                "id": "123",
                "date": "2025-06-20",
                "time": "14:30",
                "service": "Haircut",
                "customer": {
                    "name": "John Doe",
                    "email": "john@example.com"
                }
            }
        }
    },
    {
        "name": "Alternative format",
        "data": {
            "type": "appointment_booked",
            "data": {
                "appointment_id": "123",
                "customer_name": "John Doe",
                "service_name": "Haircut",
                "appointment_date": "2025-06-20 14:30"
            }
        }
    },
    {
        "name": "Minimal format",
        "data": {
            "appointmentId": "123",
            "customerId": "456",
            "serviceId": "789",
            "dateTime": "2025-06-20T14:30:00"
        }
    }
]

for test in test_payloads:
    print(f"\n🧪 Testing: {test['name']}")
    try:
        response = requests.post(
            "https://sixfb-backend.onrender.com/api/v1/webhooks/trafft",
            json=test['data'],
            headers={"Content-Type": "application/json"}
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:200]}")
    except Exception as e:
        print(f"Error: {e}")

print("\n\n💡 Possible issues:")
print("1. Trafft might be sending form-encoded data instead of JSON")
print("2. Trafft might require a specific response format")
print("3. There might be required headers we're missing")
print("\nCheck your Render logs for more details about the 400 error!")