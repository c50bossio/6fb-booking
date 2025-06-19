#!/usr/bin/env python3
"""
Test different OAuth2 authentication patterns for Trafft
"""
import requests
import json
from datetime import datetime, timedelta

# Your Business API credentials
BASE_URL = "https://headlinesbarbershops.admin.wlbookings.com"
CLIENT_ID = "cf0e541ffb9bb5a1ad777eff256f1f96"
CLIENT_SECRET = "bdc3e1eb65cc5638fb89f0997e1e3858f0e021440e42c16a0e66f5984732599e"

print("🔐 Testing Trafft OAuth2 Authentication Patterns")
print("=" * 50)

attempts = [
    {
        "name": "Form-encoded to /auth/token",
        "url": f"{BASE_URL}/auth/token",
        "method": "POST",
        "data": {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "grant_type": "client_credentials"
        },
        "headers": {"Content-Type": "application/x-www-form-urlencoded"}
    },
    {
        "name": "JSON to /api/auth/token",
        "url": f"{BASE_URL}/api/auth/token",
        "method": "POST",
        "json": {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "grant_type": "client_credentials"
        }
    },
    {
        "name": "Form-encoded to /api/v2/auth/token",
        "url": f"{BASE_URL}/api/v2/auth/token",
        "method": "POST",
        "data": {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "grant_type": "client_credentials"
        }
    },
    {
        "name": "OAuth2 standard endpoint",
        "url": f"{BASE_URL}/oauth/token",
        "method": "POST",
        "data": {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "grant_type": "client_credentials"
        }
    },
    {
        "name": "Direct token endpoint with v1",
        "url": f"{BASE_URL}/v1/auth/token",
        "method": "POST",
        "json": {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "grant_type": "client_credentials"
        }
    },
    {
        "name": "API v1 token endpoint",
        "url": f"{BASE_URL}/api/v1/auth/token",
        "method": "POST",
        "data": {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "grant_type": "client_credentials"
        }
    }
]

access_token = None

for i, attempt in enumerate(attempts):
    print(f"\n📍 Attempt {i+1}: {attempt['name']}")
    print(f"URL: {attempt['url']}")
    
    try:
        if 'json' in attempt:
            response = requests.post(
                attempt['url'],
                json=attempt['json'],
                headers={"Content-Type": "application/json"},
                timeout=5
            )
        else:
            response = requests.post(
                attempt['url'],
                data=attempt['data'],
                headers=attempt.get('headers', {}),
                timeout=5
            )
        
        print(f"Status: {response.status_code}")
        
        # Check if response is JSON
        content_type = response.headers.get('Content-Type', '')
        if 'application/json' in content_type:
            try:
                data = response.json()
                print(f"JSON Response: {json.dumps(data, indent=2)[:300]}")
                
                # Check for access token
                if 'access_token' in data:
                    access_token = data['access_token']
                    print(f"✅ Found access token!")
                    break
                elif 'token' in data:
                    access_token = data['token']
                    print(f"✅ Found token!")
                    break
                    
            except json.JSONDecodeError:
                print("❌ Invalid JSON response")
        else:
            print(f"Response type: {content_type}")
            if response.text.startswith('<!'):
                print("❌ Response is HTML, not JSON")
            else:
                print(f"Response: {response.text[:200]}")
                
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {str(e)}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

# If we still don't have a token, try using the client_id directly
if not access_token:
    print("\n" + "=" * 50)
    print("\n📍 Testing if Client ID works directly as token...")
    
    headers = {
        "Authorization": f"Bearer {CLIENT_ID}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/v2/available-times",
            headers=headers,
            params={"calendar_start_date": datetime.now().strftime("%Y-%m-%d")},
            timeout=5
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Client ID works as Bearer token!")
            access_token = CLIENT_ID
        else:
            print(f"❌ Client ID doesn't work: {response.text[:200]}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if access_token:
    print("\n" + "=" * 50)
    print(f"\n✅ Authentication successful!")
    print(f"Access token: {access_token[:30]}...")
    print("\nYou can now use this token in the Authorization header:")
    print(f"Authorization: Bearer {access_token}")
else:
    print("\n" + "=" * 50)
    print("\n❌ Could not obtain access token")
    print("\nPossible issues:")
    print("1. The credentials might need to be activated or configured in Trafft dashboard")
    print("2. The authentication endpoint might be different for this instance")
    print("3. You might need to generate a Personal Access Token in the dashboard")
    print("\nPlease check with Trafft support for the exact authentication process.")