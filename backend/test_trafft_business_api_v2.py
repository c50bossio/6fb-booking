#!/usr/bin/env python3
"""
Test Trafft Business API with correct v2 endpoints
"""
import requests
import json
from datetime import datetime, timedelta

# Your Business API credentials
BASE_URL = "https://headlinesbarbershops.admin.wlbookings.com"
API_TOKEN = "cf0e541ffb9bb5a1ad777eff256f1f96"  # This should be used as Bearer token

print("🚀 Testing Trafft Business API v2")
print("=" * 50)
print(f"Base URL: {BASE_URL}")
print(f"Token: {API_TOKEN[:20]}...")

# Headers with Bearer token
headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

# Test 1: Available times endpoint
print("\n📍 Testing Available Times Endpoint...")
print(f"URL: {BASE_URL}/api/v2/available-times")

# Get available times for the next 7 days
params = {
    "calendar_start_date": datetime.now().strftime("%Y-%m-%d"),
    "calendar_end_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
}

try:
    response = requests.get(
        f"{BASE_URL}/api/v2/available-times",
        headers=headers,
        params=params,
        timeout=10
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Success! API is working")
        print(f"Found {len(data)} days with available slots")
        
        if data:
            print("\nSample response:")
            print(json.dumps(data[0], indent=2))
            
            # Extract unique service IDs, employee IDs, and location IDs
            services = set()
            employees = set()
            locations = set()
            
            for day in data:
                for slot in day.get("timeSlots", []):
                    services.update(slot.get("services", []))
                    employees.update(slot.get("employees", []))
                    locations.update(slot.get("locations", []))
            
            print(f"\nDiscovered resources:")
            print(f"  Services: {list(services)}")
            print(f"  Employees: {list(employees)}")
            print(f"  Locations: {list(locations)}")
    else:
        print(f"❌ Error: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        # If we get HTML, show it's HTML
        if response.text.startswith('<!'):
            print("\n⚠️  Response is HTML, not JSON!")

except Exception as e:
    print(f"❌ Exception: {str(e)}")

# Try with a specific service ID if we found any
print("\n" + "=" * 50)
print("\n📍 Testing with specific service ID...")

# Let's try service ID 13 from the example
service_params = {
    "service": 13,
    "calendar_start_date": datetime.now().strftime("%Y-%m-%d"),
    "calendar_end_date": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
}

try:
    response = requests.get(
        f"{BASE_URL}/api/v2/available-times",
        headers=headers,
        params=service_params,
        timeout=10
    )
    
    print(f"URL: {BASE_URL}/api/v2/available-times?service=13")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Success!")
        print(f"Found {len(data)} days with available slots for service 13")
    else:
        print(f"❌ Error: {response.text[:200]}")

except Exception as e:
    print(f"❌ Exception: {str(e)}")

print("\n" + "=" * 50)
print("\n📊 Summary:")
print("If the API returned JSON data, the token is working correctly.")
print("If it returned HTML, you may need a different token or the token needs to be generated in the Trafft dashboard.")