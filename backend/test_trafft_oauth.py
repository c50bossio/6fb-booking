#!/usr/bin/env python3
"""
Test Trafft OAuth2 authentication and get access token
"""
import requests
import json
from datetime import datetime, timedelta

# OAuth2 credentials
CLIENT_ID = "cf0e541ffb9bb5a1ad777eff256f1f96"
CLIENT_SECRET = "bdc3e1eb65cc5638fb89f0997e1e3858f0e021440e42c16a0e66f5984732599e"

# Try different OAuth endpoints
OAUTH_ENDPOINTS = [
    "https://app.trafft.com/oauth/token",
    "https://api.trafft.com/oauth/token",
    "https://headlinesbarbershops.trafft.com/oauth/token",
    "https://app.trafft.com/api/oauth/token",
    "https://app.trafft.com/api/v1/oauth/token"
]
API_BASE_URL = "https://app.trafft.com/api/v1"

def get_access_token():
    """Get OAuth2 access token using client credentials"""
    print("🔐 Getting OAuth2 Access Token...")
    
    # OAuth2 client credentials flow
    data = {
        "grant_type": "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "scope": "read"  # or specific scopes if needed
    }
    
    # Also try as Basic Auth
    import base64
    auth_string = base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()
    
    for endpoint in OAUTH_ENDPOINTS:
        print(f"\nTrying: {endpoint}")
        
        # Try with data in body
        try:
            response = requests.post(endpoint, data=data, timeout=5)
            print(f"   Body auth: {response.status_code}")
            
            if response.status_code == 200:
                token_data = response.json()
                print("   ✅ Success with body auth!")
                return token_data.get('access_token')
                
        except Exception as e:
            print(f"   Body auth error: {str(e)}")
        
        # Try with Basic Auth header
        try:
            headers = {
                "Authorization": f"Basic {auth_string}",
                "Content-Type": "application/x-www-form-urlencoded"
            }
            response = requests.post(
                endpoint, 
                data={"grant_type": "client_credentials"},
                headers=headers,
                timeout=5
            )
            print(f"   Basic auth: {response.status_code}")
            
            if response.status_code == 200:
                token_data = response.json()
                print("   ✅ Success with Basic auth!")
                return token_data.get('access_token')
                
        except Exception as e:
            print(f"   Basic auth error: {str(e)}")
    
    return None

def test_api_with_token(access_token):
    """Test API endpoints with the access token"""
    print("\n🔍 Testing API with Access Token...")
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Test endpoints
    endpoints = [
        "/company",
        "/locations", 
        "/employees",
        "/services",
        "/appointments?limit=5"
    ]
    
    for endpoint in endpoints:
        print(f"\n📍 Testing {endpoint}...")
        try:
            response = requests.get(
                f"{API_BASE_URL}{endpoint}",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    print(f"   ✅ Success! Found {len(data)} items")
                    if data and len(data) > 0:
                        print(f"   Sample: {json.dumps(data[0], indent=2)[:200]}...")
                else:
                    print(f"   ✅ Success! Got data")
                    print(f"   Response: {json.dumps(data, indent=2)[:200]}...")
            else:
                print(f"   ❌ Failed: {response.status_code} - {response.reason}")
                
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")

def save_token_for_backend(access_token):
    """Save the access token for use in the backend"""
    print("\n💾 Saving token configuration...")
    
    config = {
        "access_token": access_token,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "token_url": TOKEN_URL,
        "api_base_url": API_BASE_URL,
        "obtained_at": datetime.now().isoformat(),
        "note": "Use client credentials flow to refresh token when expired"
    }
    
    with open("trafft_oauth_config.json", "w") as f:
        json.dump(config, f, indent=2)
    
    print("✅ Configuration saved to trafft_oauth_config.json")
    print("\n🔧 Update your backend to:")
    print("1. Use OAuth2 client credentials flow to get tokens")
    print("2. Cache tokens and refresh when expired")
    print("3. Use the Bearer token for all API calls")

if __name__ == "__main__":
    print("🚀 Trafft OAuth2 Authentication Test")
    print("=" * 50)
    
    # Get access token
    access_token = get_access_token()
    
    if access_token:
        # Test API endpoints
        test_api_with_token(access_token)
        
        # Save configuration
        save_token_for_backend(access_token)
        
        print("\n✅ Trafft OAuth2 integration is ready!")
        print("\nNext steps:")
        print("1. Update backend to use OAuth2 authentication")
        print("2. Implement token refresh logic")
        print("3. Start syncing data from Trafft")
    else:
        print("\n❌ Failed to authenticate with Trafft")
        print("\nPlease check:")
        print("1. Client ID and Secret are correct")
        print("2. Your Trafft account has API access enabled")
        print("3. The OAuth2 app is properly configured in Trafft")