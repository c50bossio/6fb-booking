#!/usr/bin/env python3
"""
Test Trafft OAuth2 flow with WLBookings
"""
import requests
import json
import base64

# From the Trafft dashboard
API_BASE_URL = "https://headlinesbarbershops.admin.wlbookings.com"
CLIENT_ID = "cf0e541ffb9bb5a1ad777eff256f1f96"
CLIENT_SECRET = "bdc3e1eb65cc5638fb89f0997e1e3858f0e021440e42c16a0e66f5984732599e"

print("🔐 Testing Trafft OAuth2 Authentication")
print("=" * 50)

# Common OAuth2 token endpoints to try
oauth_endpoints = [
    f"{API_BASE_URL}/oauth/token",
    f"{API_BASE_URL}/api/oauth/token",
    f"{API_BASE_URL}/api/v1/oauth/token",
    f"{API_BASE_URL}/token",
    f"{API_BASE_URL}/api/token",
    f"{API_BASE_URL}/api/v1/token",
    f"{API_BASE_URL}/auth/token",
    f"{API_BASE_URL}/api/auth/token"
]

def test_oauth_flow():
    """Test OAuth2 client credentials flow"""
    
    # Basic auth string
    auth_string = base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()
    
    # Different OAuth2 request formats
    oauth_requests = [
        {
            "name": "Client Credentials in Body",
            "data": {
                "grant_type": "client_credentials",
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET
            },
            "headers": {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        },
        {
            "name": "Basic Auth Header",
            "data": {
                "grant_type": "client_credentials"
            },
            "headers": {
                "Authorization": f"Basic {auth_string}",
                "Content-Type": "application/x-www-form-urlencoded"
            }
        },
        {
            "name": "JSON Body",
            "json": {
                "grant_type": "client_credentials",
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET
            },
            "headers": {
                "Content-Type": "application/json"
            }
        }
    ]
    
    for endpoint in oauth_endpoints:
        print(f"\n📍 Testing endpoint: {endpoint}")
        
        for req in oauth_requests:
            print(f"   Method: {req['name']}")
            
            try:
                if 'json' in req:
                    response = requests.post(
                        endpoint,
                        json=req['json'],
                        headers=req['headers'],
                        timeout=5
                    )
                else:
                    response = requests.post(
                        endpoint,
                        data=req['data'],
                        headers=req['headers'],
                        timeout=5
                    )
                
                print(f"   Status: {response.status_code}")
                
                if response.status_code == 200:
                    print("   ✅ SUCCESS!")
                    token_data = response.json()
                    print(f"   Token data: {json.dumps(token_data, indent=2)}")
                    return token_data
                elif response.status_code == 401:
                    print(f"   Response: {response.text[:100]}...")
                    
            except Exception as e:
                print(f"   Error: {str(e)}")
    
    return None

# Test direct API access with different patterns
def test_direct_api():
    """Test if API has public endpoints or different auth pattern"""
    print("\n\n🔍 Testing Direct API Access Patterns")
    print("=" * 50)
    
    # Test public endpoints
    public_endpoints = [
        "/api/v1/public/locations",
        "/api/v1/public/services",
        "/api/v1/public/employees",
        "/api/public/locations",
        "/api/public/services",
        "/public/api/v1/locations",
        "/public/api/locations"
    ]
    
    for endpoint in public_endpoints:
        url = f"{API_BASE_URL}{endpoint}"
        print(f"\nTesting: {url}")
        
        try:
            response = requests.get(url, timeout=5)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Found public endpoint!")
                data = response.json()
                if isinstance(data, list):
                    print(f"Found {len(data)} items")
                return True
                
        except Exception as e:
            print(f"Error: {str(e)}")
    
    return False

# Run tests
print("\n1️⃣ Testing OAuth2 Flow...")
token_data = test_oauth_flow()

if not token_data:
    print("\n2️⃣ Testing Direct API Access...")
    public_found = test_direct_api()
    
    if not public_found:
        print("\n" + "=" * 50)
        print("\n❌ Could not access Trafft API")
        print("\n💡 Next steps:")
        print("1. Check if there's API documentation in your Trafft dashboard")
        print("2. The client ID/secret might be for webhooks only")
        print("3. You might need to generate a Personal Access Token")
        print("4. Contact Trafft support for API access details")
else:
    print("\n✅ OAuth2 authentication successful!")
    print("Use the access token for API requests")