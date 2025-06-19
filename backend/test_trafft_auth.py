#!/usr/bin/env python3
"""
Test different authentication methods for Trafft API
"""
import requests
import base64

API_KEY = "cf0e541ffb9bb5a1ad777eff256f1f96"
API_URL = "https://app.trafft.com/api/v1/locations"

print("🔐 Testing Trafft Authentication Methods")
print("=" * 50)

# Different auth methods to try
auth_methods = [
    {
        "name": "Bearer Token",
        "headers": {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        }
    },
    {
        "name": "API Key Header",
        "headers": {
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        }
    },
    {
        "name": "API Key Header (lowercase)",
        "headers": {
            "x-api-key": API_KEY,
            "Content-Type": "application/json"
        }
    },
    {
        "name": "Basic Auth (API key as username)",
        "headers": {
            "Authorization": f"Basic {base64.b64encode(f'{API_KEY}:'.encode()).decode()}",
            "Content-Type": "application/json"
        }
    },
    {
        "name": "Basic Auth (API key as password)",
        "headers": {
            "Authorization": f"Basic {base64.b64encode(f':{API_KEY}'.encode()).decode()}",
            "Content-Type": "application/json"
        }
    },
    {
        "name": "Trafft-API-Key Header",
        "headers": {
            "Trafft-API-Key": API_KEY,
            "Content-Type": "application/json"
        }
    },
    {
        "name": "Query Parameter",
        "headers": {
            "Content-Type": "application/json"
        },
        "params": {
            "api_key": API_KEY
        }
    },
    {
        "name": "Query Parameter (apiKey)",
        "headers": {
            "Content-Type": "application/json"
        },
        "params": {
            "apiKey": API_KEY
        }
    }
]

for method in auth_methods:
    print(f"\n🔍 Trying: {method['name']}")
    
    try:
        params = method.get('params', {})
        response = requests.get(
            API_URL,
            headers=method['headers'],
            params=params,
            timeout=5
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ SUCCESS! This authentication method works!")
            print(f"   Response preview: {response.text[:150]}...")
            break
        elif response.status_code == 401:
            print("   ❌ Unauthorized - wrong credentials or method")
        elif response.status_code == 403:
            print("   ⚠️  Forbidden - authenticated but no permission")
        else:
            print(f"   ❌ {response.reason}")
            
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")

print("\n" + "=" * 50)
print("\n💡 If none of these work, please check:")
print("1. The API key is correct and active")
print("2. The API key has the right permissions")
print("3. Your Trafft account is active")
print("\nYou can find your API key in Trafft at:")
print("Settings → Integrations → API Keys")