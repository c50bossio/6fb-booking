#!/usr/bin/env python3
"""
Test if Trafft webhook endpoint is accessible
"""
import requests
import json

BASE_URL = "https://sixfb-backend.onrender.com"

print("🔍 Testing Trafft Webhook Endpoints")
print("=" * 50)

# Test 1: Check setup instructions
print("\n1️⃣ Getting webhook setup instructions...")
try:
    response = requests.get(f"{BASE_URL}/api/v1/webhooks/trafft/setup")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("✅ Setup endpoint working!")
        print(f"Webhook URL: {data['webhook_url']}")
        print("\nInstructions:")
        for instruction in data['instructions']:
            print(f"  {instruction}")
    else:
        print(f"❌ Error: {response.text}")
except Exception as e:
    print(f"❌ Failed: {str(e)}")

# Test 2: Send test webhook
print("\n\n2️⃣ Sending test webhook...")
test_payload = {
    "event": "appointment.created",
    "data": {
        "appointment": {
            "id": "test-123",
            "customerId": "cust-456",
            "employeeId": "emp-789",
            "serviceId": "serv-101",
            "startTime": "2025-06-20T14:30:00Z",
            "endTime": "2025-06-20T15:30:00Z",
            "status": "confirmed",
            "price": 65.00,
            "service": {
                "name": "Haircut + Beard Trim"
            },
            "customer": {
                "firstName": "Test",
                "lastName": "Customer",
                "email": "test@example.com",
                "phone": "+1234567890"
            }
        }
    }
}

try:
    response = requests.post(
        f"{BASE_URL}/api/v1/webhooks/trafft",
        json=test_payload,
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Source": "test-script"
        }
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("✅ Webhook received successfully!")
        print(f"Response: {response.json()}")
    else:
        print(f"❌ Error: {response.text}")
except Exception as e:
    print(f"❌ Failed: {str(e)}")

print("\n" + "=" * 50)
print("\n📋 Trafft Webhook Setup Instructions:")
print("\n1. Log into your Trafft dashboard")
print("2. Navigate to Settings > Integrations > Webhooks")
print("3. Click 'Add Webhook' or 'New Webhook'")
print("4. Enter the following details:")
print(f"   - URL: {BASE_URL}/api/v1/webhooks/trafft")
print("   - Events: Select all appointment, customer, and payment events")
print("   - Secret: Copy if provided (for signature verification)")
print("5. Save and test the webhook")
print("\n💡 The webhook will log all received events to help you")
print("   understand the data structure Trafft sends.")