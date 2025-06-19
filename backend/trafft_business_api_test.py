#!/usr/bin/env python3
"""
Test Trafft Business API with different authentication patterns
"""
import requests
import json
import base64
from urllib.parse import urlencode

BASE_URL = "https://headlinesbarbershops.admin.wlbookings.com"
CLIENT_ID = "cf0e541ffb9bb5a1ad777eff256f1f96"
CLIENT_SECRET = "bdc3e1eb65cc5638fb89f0997e1e3858f0e021440e42c16a0e66f5984732599e"

print("🔍 Testing Trafft Business API Authentication Patterns")
print("=" * 50)

# First, let's check what the 200 responses actually contain
print("\n1️⃣ Checking OAuth endpoint response...")
response = requests.post(f"{BASE_URL}/oauth/token", 
                        data={"grant_type": "client_credentials", "client_id": CLIENT_ID, "client_secret": CLIENT_SECRET},
                        timeout=5)
print(f"Status: {response.status_code}")
print(f"Content-Type: {response.headers.get('Content-Type', 'Unknown')}")
print(f"Response preview: {response.text[:200]}...")

# Now let's try the pattern from Agency API but adapted
print("\n" + "=" * 50)
print("\n2️⃣ Testing Access Token Request (Agency API Pattern)...")

# The Agency API uses variables, so let's try a direct request
token_request_data = {
    "clientId": CLIENT_ID,
    "clientSecret": CLIENT_SECRET
}

# Try different variations
attempts = [
    {
        "name": "JSON Body with clientId/clientSecret",
        "url": f"{BASE_URL}/v1/access-token",
        "json": token_request_data,
        "headers": {"Content-Type": "application/json"}
    },
    {
        "name": "Form Data with clientId/clientSecret", 
        "url": f"{BASE_URL}/v1/access-token",
        "data": token_request_data,
        "headers": {"Content-Type": "application/x-www-form-urlencoded"}
    },
    {
        "name": "JSON Body to /api/v1/access-token",
        "url": f"{BASE_URL}/api/v1/access-token",
        "json": token_request_data,
        "headers": {"Content-Type": "application/json"}
    },
    {
        "name": "URL Parameters",
        "url": f"{BASE_URL}/v1/access-token?clientId={CLIENT_ID}&clientSecret={CLIENT_SECRET}",
        "method": "GET",
        "headers": {"Content-Type": "application/json"}
    },
    {
        "name": "Basic Auth to access-token",
        "url": f"{BASE_URL}/v1/access-token",
        "method": "POST",
        "headers": {
            "Authorization": f"Basic {base64.b64encode(f'{CLIENT_ID}:{CLIENT_SECRET}'.encode()).decode()}",
            "Content-Type": "application/json"
        }
    }
]

access_token = None

for attempt in attempts:
    print(f"\n📍 Testing: {attempt['name']}")
    
    try:
        method = attempt.get('method', 'POST')
        
        if method == 'GET':
            response = requests.get(attempt['url'], headers=attempt.get('headers', {}), timeout=5)
        else:
            if 'json' in attempt:
                response = requests.post(attempt['url'], json=attempt['json'], headers=attempt['headers'], timeout=5)
            elif 'data' in attempt:
                response = requests.post(attempt['url'], data=attempt['data'], headers=attempt['headers'], timeout=5)
            else:
                response = requests.post(attempt['url'], headers=attempt['headers'], timeout=5)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"   ✅ Got JSON response!")
                print(f"   Response: {json.dumps(data, indent=2)[:300]}")
                
                # Extract token
                access_token = data.get('access_token') or data.get('accessToken') or data.get('token')
                if access_token:
                    print(f"   🎉 Found access token!")
                    break
                    
            except json.JSONDecodeError:
                print(f"   ❌ Not JSON: {response.text[:100]}")
        else:
            print(f"   Error: {response.text[:200] if response.text else 'No error message'}")
            
    except Exception as e:
        print(f"   Exception: {str(e)}")

if access_token:
    print("\n" + "=" * 50)
    print(f"\n✅ Successfully got access token!")
    print(f"Token: {access_token[:50]}...")
    
    # Test the token
    print("\n3️⃣ Testing API endpoints with token...")
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    test_url = f"{BASE_URL}/v1/locations"
    response = requests.get(test_url, headers=headers, timeout=5)
    
    print(f"\nTest URL: {test_url}")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ Token works! You can now access the API")
        data = response.json()
        print(f"Found {len(data)} locations" if isinstance(data, list) else "Got data")
    else:
        print(f"❌ Token doesn't work: {response.text[:200]}")
else:
    print("\n" + "=" * 50)
    print("\n❌ Could not get access token")
    print("\n💡 The Business API might:")
    print("1. Use a different authentication flow than the Agency API")
    print("2. Require you to generate a Personal Access Token in the dashboard")
    print("3. Use the Client ID directly as a Bearer token")
    
    # One more test - try using Client ID directly
    print("\n4️⃣ Testing Client ID as Bearer token...")
    headers = {
        "Authorization": f"Bearer {CLIENT_ID}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(f"{BASE_URL}/v1/locations", headers=headers, timeout=5)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ Client ID works as Bearer token!")
    else:
        print("❌ Client ID doesn't work as Bearer token")