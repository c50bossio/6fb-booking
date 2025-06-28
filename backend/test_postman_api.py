#!/usr/bin/env python3
"""
Test API patterns from common booking systems
"""
import requests
import json

# Your Trafft details
BASE_URL = "https://headlinesbarbershops.admin.wlbookings.com"
CLIENT_ID = "cf0e541ffb9bb5a1ad777eff256f1f96"
CLIENT_SECRET = "bdc3e1eb65cc5638fb89f0997e1e3858f0e021440e42c16a0e66f5984732599e"

print("🔍 Testing Common Booking API Patterns")
print("=" * 50)

# Common API patterns for booking systems
test_cases = [
    {
        "name": "API Key in URL Parameter",
        "url": f"{BASE_URL}/api/v1/locations?api_key={CLIENT_ID}",
        "headers": {"Content-Type": "application/json"},
    },
    {
        "name": "API Key in URL Parameter (key)",
        "url": f"{BASE_URL}/api/v1/locations?key={CLIENT_ID}",
        "headers": {"Content-Type": "application/json"},
    },
    {
        "name": "API Key in URL Parameter (token)",
        "url": f"{BASE_URL}/api/v1/locations?token={CLIENT_ID}",
        "headers": {"Content-Type": "application/json"},
    },
    {
        "name": "API Key in URL Parameter (access_token)",
        "url": f"{BASE_URL}/api/v1/locations?access_token={CLIENT_ID}",
        "headers": {"Content-Type": "application/json"},
    },
    {
        "name": "Combined Client ID and Secret in URL",
        "url": f"{BASE_URL}/api/v1/locations?client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}",
        "headers": {"Content-Type": "application/json"},
    },
    {
        "name": "API Token Header",
        "url": f"{BASE_URL}/api/v1/locations",
        "headers": {"API-Token": CLIENT_ID, "Content-Type": "application/json"},
    },
    {
        "name": "Access-Token Header",
        "url": f"{BASE_URL}/api/v1/locations",
        "headers": {"Access-Token": CLIENT_ID, "Content-Type": "application/json"},
    },
    {
        "name": "X-Access-Token Header",
        "url": f"{BASE_URL}/api/v1/locations",
        "headers": {"X-Access-Token": CLIENT_ID, "Content-Type": "application/json"},
    },
    {
        "name": "X-Auth-Token Header",
        "url": f"{BASE_URL}/api/v1/locations",
        "headers": {"X-Auth-Token": CLIENT_ID, "Content-Type": "application/json"},
    },
]

# Test each pattern
for test in test_cases:
    print(f"\n📍 Testing: {test['name']}")

    try:
        response = requests.get(test["url"], headers=test["headers"], timeout=5)
        print(f"   Status: {response.status_code}")

        if response.status_code == 200:
            print("   ✅ SUCCESS! This method works!")

            try:
                data = response.json()
                if isinstance(data, list):
                    print(f"   Found {len(data)} items")
                    if data:
                        print(
                            f"   Sample item: {json.dumps(data[0], indent=2)[:300]}..."
                        )
                else:
                    print(f"   Response: {json.dumps(data, indent=2)[:300]}...")

                # Save working configuration
                config = {
                    "method": test["name"],
                    "base_url": BASE_URL,
                    "sample_url": test["url"],
                    "headers": test["headers"],
                    "client_id": CLIENT_ID,
                    "client_secret": CLIENT_SECRET,
                }

                with open("trafft_working_config.json", "w") as f:
                    json.dump(config, f, indent=2)

                print("\n   ✅ Configuration saved to trafft_working_config.json")
                break

            except json.JSONDecodeError:
                print(f"   Response (not JSON): {response.text[:200]}...")

        elif response.status_code == 401:
            error_msg = response.text[:100] if response.text else "No error message"
            print(f"   Unauthorized: {error_msg}")
        elif response.status_code == 403:
            print(f"   Forbidden - might need additional permissions")

    except Exception as e:
        print(f"   Error: {str(e)}")

print("\n" + "=" * 50)
print("\n💡 If none of these work, the API might:")
print("1. Require generating a Personal Access Token from the dashboard")
print("2. Use a completely different authentication method")
print("3. Require additional setup or activation")
print("\nCheck the Trafft dashboard for:")
print("- Personal Access Tokens section")
print("- API Keys (separate from OAuth Client ID/Secret)")
print("- Developer or Advanced settings")
