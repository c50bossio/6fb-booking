#!/usr/bin/env python3
"""
Test if the client ID/secret are actually direct API keys for Trafft
"""
import requests

# Credentials
CLIENT_ID = "cf0e541ffb9bb5a1ad777eff256f1f96"
CLIENT_SECRET = "bdc3e1eb65cc5638fb89f0997e1e3858f0e021440e42c16a0e66f5984732599e"

API_URL = "https://app.trafft.com/api/v1/locations"

print("🔍 Testing Direct API Authentication")
print("=" * 50)

# Different ways these might be used
auth_attempts = [
    {
        "name": "Client ID as API Key",
        "headers": {
            "Authorization": f"Bearer {CLIENT_ID}",
            "Content-Type": "application/json"
        }
    },
    {
        "name": "Client Secret as API Key",
        "headers": {
            "Authorization": f"Bearer {CLIENT_SECRET}",
            "Content-Type": "application/json"
        }
    },
    {
        "name": "X-API-Key with Client ID",
        "headers": {
            "X-API-Key": CLIENT_ID,
            "Content-Type": "application/json"
        }
    },
    {
        "name": "X-API-Key with Client Secret",
        "headers": {
            "X-API-Key": CLIENT_SECRET,
            "Content-Type": "application/json"
        }
    },
    {
        "name": "Both in Headers",
        "headers": {
            "X-Client-Id": CLIENT_ID,
            "X-Client-Secret": CLIENT_SECRET,
            "Content-Type": "application/json"
        }
    },
    {
        "name": "Trafft-Client-Id/Secret Headers",
        "headers": {
            "Trafft-Client-Id": CLIENT_ID,
            "Trafft-Client-Secret": CLIENT_SECRET,
            "Content-Type": "application/json"
        }
    }
]

for attempt in auth_attempts:
    print(f"\n🔐 Trying: {attempt['name']}")
    
    try:
        response = requests.get(API_URL, headers=attempt['headers'], timeout=5)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ SUCCESS! This method works!")
            data = response.json()
            if isinstance(data, list):
                print(f"   Found {len(data)} locations")
            print(f"   Response preview: {str(response.text)[:200]}...")
            
            # If successful, test more endpoints
            print("\n   Testing other endpoints:")
            for endpoint in ["/employees", "/services", "/appointments?limit=1"]:
                try:
                    test_response = requests.get(
                        f"https://app.trafft.com/api/v1{endpoint}",
                        headers=attempt['headers'],
                        timeout=5
                    )
                    if test_response.status_code == 200:
                        print(f"   ✅ {endpoint}: Success")
                    else:
                        print(f"   ❌ {endpoint}: {test_response.status_code}")
                except:
                    print(f"   ❌ {endpoint}: Failed")
            
            break
            
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")

print("\n" + "=" * 50)
print("\n💡 If none work, the credentials might be:")
print("1. For a different Trafft API version")
print("2. Webhook signing secrets (not API auth)")
print("3. Expired or invalid")
print("\nCheck your Trafft dashboard for the correct API credentials.")