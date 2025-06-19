#!/usr/bin/env python3
"""
Check what the OAuth endpoints are actually returning
"""
import requests

API_BASE_URL = "https://headlinesbarbershops.admin.wlbookings.com"
CLIENT_ID = "cf0e541ffb9bb5a1ad777eff256f1f96"
CLIENT_SECRET = "bdc3e1eb65cc5638fb89f0997e1e3858f0e021440e42c16a0e66f5984732599e"

print("🔍 Checking OAuth Response Content")
print("=" * 50)

# Test the endpoint that returned 200
url = f"{API_BASE_URL}/oauth/token"

data = {
    "grant_type": "client_credentials",
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET
}

try:
    response = requests.post(url, data=data, timeout=5)
    print(f"\nStatus: {response.status_code}")
    print(f"Content-Type: {response.headers.get('Content-Type', 'Not specified')}")
    print(f"Content Length: {len(response.content)} bytes")
    print(f"\nRaw Response (first 500 chars):\n{response.text[:500]}")
    
    # Check if it's returning a token in a different format
    if response.status_code == 200:
        # Try to parse as different formats
        print("\n" + "=" * 30)
        
        # Check if it's plain text token
        if response.text and not response.text.startswith('<'):
            print(f"Possible token: {response.text.strip()}")
            
            # Test using this as a bearer token
            print("\nTesting as Bearer token...")
            test_url = f"{API_BASE_URL}/api/v1/locations"
            test_headers = {
                "Authorization": f"Bearer {response.text.strip()}",
                "Content-Type": "application/json"
            }
            
            test_response = requests.get(test_url, headers=test_headers, timeout=5)
            print(f"API Test Status: {test_response.status_code}")
            if test_response.status_code == 200:
                print("✅ Token works!")
                
except Exception as e:
    print(f"Error: {str(e)}")

# Also check if the client_id or client_secret work directly as tokens
print("\n" + "=" * 50)
print("\n🔐 Testing credentials as direct tokens...")

tokens_to_test = [
    ("Client ID", CLIENT_ID),
    ("Client Secret", CLIENT_SECRET)
]

test_url = f"{API_BASE_URL}/api/v1/locations"

for name, token in tokens_to_test:
    print(f"\nTesting {name} as token...")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(test_url, headers=headers, timeout=5)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ {name} works as a Bearer token!")
            data = response.json()
            if isinstance(data, list):
                print(f"Found {len(data)} locations")
            break
            
    except Exception as e:
        print(f"Error: {str(e)}")