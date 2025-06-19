#!/usr/bin/env python3
"""
Test what a Trafft webhook might look like
"""
import requests
import json
from datetime import datetime

BASE_URL = "https://sixfb-backend.onrender.com"

print("🧪 Testing Trafft Webhook Formats")
print("=" * 50)

# Test different possible formats Trafft might use
test_scenarios = [
    {
        "name": "Form-encoded webhook",
        "headers": {"Content-Type": "application/x-www-form-urlencoded"},
        "data": "event=appointment.booked&appointmentId=123&customerId=456&date=2025-06-20&time=14:30"
    },
    {
        "name": "JSON webhook", 
        "headers": {"Content-Type": "application/json"},
        "json": {
            "event": "appointment.booked",
            "appointment": {
                "id": "123",
                "customerId": "456",
                "date": "2025-06-20",
                "time": "14:30"
            }
        }
    },
    {
        "name": "Minimal webhook",
        "headers": {"Content-Type": "application/json"},
        "json": {
            "appointmentId": "123",
            "action": "booked"
        }
    }
]

for scenario in test_scenarios:
    print(f"\n📤 Testing: {scenario['name']}")
    
    try:
        if 'json' in scenario:
            response = requests.post(
                f"{BASE_URL}/api/v1/webhooks/trafft",
                json=scenario['json'],
                headers=scenario['headers']
            )
        else:
            response = requests.post(
                f"{BASE_URL}/api/v1/webhooks/trafft",
                data=scenario['data'],
                headers=scenario['headers']
            )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
    except Exception as e:
        print(f"Error: {e}")

print("\n" + "=" * 50)
print("\n💡 Next Steps:")
print("1. Wait for deployment to complete (check Render dashboard)")
print("2. Once deployed, visit: https://sixfb-backend.onrender.com/api/v1/webhooks/trafft/logs")
print("3. You'll see what format Trafft actually uses")
print("\nYou can also check Render logs for lines containing 'Trafft webhook'")