#!/usr/bin/env python3
"""
Get Trafft Business API Access Token using OAuth2 flow
Based on the Agency API pattern
"""
import requests
import json
from datetime import datetime

# Your Business API credentials from the screenshot
BASE_URL = "https://headlinesbarbershops.admin.wlbookings.com"
CLIENT_ID = "cf0e541ffb9bb5a1ad777eff256f1f96"
CLIENT_SECRET = "bdc3e1eb65cc5638fb89f0997e1e3858f0e021440e42c16a0e66f5984732599e"

print("🔐 Trafft Business API Authentication")
print("=" * 50)

def get_access_token():
    """Get access token using client credentials"""
    
    # Try different possible token endpoints based on common patterns
    token_endpoints = [
        f"{BASE_URL}/v1/token",
        f"{BASE_URL}/api/v1/token",
        f"{BASE_URL}/oauth/v1/token",
        f"{BASE_URL}/v1/oauth/token",
        f"{BASE_URL}/api/token",
        f"{BASE_URL}/token"
    ]
    
    # OAuth2 client credentials grant
    token_data = {
        "grant_type": "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET
    }
    
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    for endpoint in token_endpoints:
        print(f"\nTrying: {endpoint}")
        
        try:
            response = requests.post(
                endpoint,
                data=token_data,
                headers=headers,
                timeout=10
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                # Check if response is JSON
                try:
                    token_response = response.json()
                    print("✅ Success! Got access token")
                    print(f"Token Response: {json.dumps(token_response, indent=2)}")
                    
                    access_token = token_response.get('access_token') or token_response.get('accessToken') or token_response.get('token')
                    
                    if access_token:
                        return access_token, endpoint
                    else:
                        print("⚠️  Response doesn't contain access token")
                        
                except json.JSONDecodeError:
                    # Maybe the token is returned as plain text
                    if response.text and not response.text.startswith('<'):
                        print(f"Got plain text response: {response.text.strip()}")
                        return response.text.strip(), endpoint
                        
            elif response.status_code == 404:
                print("Endpoint not found")
            else:
                print(f"Error: {response.text[:200]}")
                
        except Exception as e:
            print(f"Request failed: {str(e)}")
    
    return None, None

def test_api_with_token(access_token):
    """Test the API using the access token"""
    print("\n" + "=" * 50)
    print("🧪 Testing API with access token...")
    
    # Common API endpoints to test
    test_endpoints = [
        ("Locations", "/v1/locations"),
        ("Locations (alt)", "/api/v1/locations"),
        ("Services", "/v1/services"),
        ("Services (alt)", "/api/v1/services"),
        ("Employees", "/v1/employees"),
        ("Employees (alt)", "/api/v1/employees"),
        ("Appointments", "/v1/appointments?limit=5"),
        ("Appointments (alt)", "/api/v1/appointments?limit=5")
    ]
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    working_endpoints = []
    
    for name, endpoint in test_endpoints:
        url = f"{BASE_URL}{endpoint}"
        print(f"\n📍 Testing {name}: {endpoint}")
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print("   ✅ Success!")
                data = response.json()
                
                if isinstance(data, list):
                    print(f"   Found {len(data)} items")
                    if data:
                        print(f"   Sample: {json.dumps(data[0], indent=2)[:300]}...")
                else:
                    print(f"   Data: {json.dumps(data, indent=2)[:300]}...")
                    
                working_endpoints.append(endpoint)
                
            elif response.status_code == 401:
                print("   ❌ Unauthorized - token might be invalid")
            elif response.status_code == 404:
                print("   ⚠️  Endpoint not found")
                
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
    
    return working_endpoints

# Main execution
print("\n1️⃣ Getting Access Token...")
access_token, token_endpoint = get_access_token()

if access_token:
    print(f"\n✅ Got access token from: {token_endpoint}")
    print(f"📝 Token: {access_token[:50]}..." if len(access_token) > 50 else f"📝 Token: {access_token}")
    
    # Test the API
    working_endpoints = test_api_with_token(access_token)
    
    if working_endpoints:
        # Save working configuration
        config = {
            "base_url": BASE_URL,
            "token_endpoint": token_endpoint,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "access_token": access_token,
            "working_endpoints": working_endpoints,
            "generated_at": datetime.now().isoformat(),
            "note": "Use this access token in Authorization: Bearer <token> header"
        }
        
        with open("trafft_business_config.json", "w") as f:
            json.dump(config, f, indent=2)
        
        print("\n" + "=" * 50)
        print("✅ Success! Configuration saved to trafft_business_config.json")
        print("\nWorking endpoints:")
        for endpoint in working_endpoints:
            print(f"  - {endpoint}")
    else:
        print("\n❌ Got token but couldn't access any API endpoints")
        print("The token might be invalid or the API structure is different")
        
else:
    print("\n❌ Failed to get access token")
    print("\nPossible issues:")
    print("1. The OAuth endpoint might be different")
    print("2. Additional parameters might be required")
    print("3. The credentials might need to be activated first")
    
    # Try to help debug
    print("\n💡 Next steps:")
    print("1. Check if there's a 'Generate Token' button in the Trafft dashboard")
    print("2. Look for API documentation specific to the Business API")
    print("3. The credentials might be for webhook verification only")