#!/usr/bin/env python3
"""
Test Trafft Business API authentication using /auth/token endpoint
"""
import requests
import json
from datetime import datetime, timedelta

# Your Business API credentials
BASE_URL = "https://headlinesbarbershops.admin.wlbookings.com"
CLIENT_ID = "cf0e541ffb9bb5a1ad777eff256f1f96"
CLIENT_SECRET = "bdc3e1eb65cc5638fb89f0997e1e3858f0e021440e42c16a0e66f5984732599e"

print("🔐 Testing Trafft Business API Authentication")
print("=" * 50)

# Step 1: Get Access Token
print("\n📍 Step 1: Getting Access Token...")
print(f"URL: {BASE_URL}/auth/token")

auth_data = {
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "grant_type": "client_credentials"
}

try:
    response = requests.post(
        f"{BASE_URL}/auth/token",
        json=auth_data,
        headers={"Content-Type": "application/json"},
        timeout=10
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}")
    
    if response.status_code == 200:
        token_data = response.json()
        access_token = token_data.get("access_token")
        
        if access_token:
            print(f"\n✅ Success! Got access token")
            print(f"Token: {access_token[:50]}...")
            print(f"Token type: {token_data.get('token_type', 'Bearer')}")
            print(f"Expires in: {token_data.get('expires_in', 'Unknown')} seconds")
            
            # Step 2: Test the token
            print("\n" + "=" * 50)
            print("\n📍 Step 2: Testing API with Access Token...")
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            # Test available times endpoint
            params = {
                "calendar_start_date": datetime.now().strftime("%Y-%m-%d"),
                "calendar_end_date": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
            }
            
            api_response = requests.get(
                f"{BASE_URL}/api/v2/available-times",
                headers=headers,
                params=params,
                timeout=10
            )
            
            print(f"URL: {BASE_URL}/api/v2/available-times")
            print(f"Status: {api_response.status_code}")
            
            if api_response.status_code == 200:
                data = api_response.json()
                print("✅ API Access Successful!")
                print(f"Found {len(data)} days with available time slots")
                
                if data and len(data) > 0:
                    print("\nSample day:")
                    print(json.dumps(data[0], indent=2)[:500])
                    
                # Save working configuration
                config = {
                    "authentication": {
                        "method": "OAuth2 Client Credentials",
                        "token_endpoint": f"{BASE_URL}/auth/token",
                        "client_id": CLIENT_ID,
                        "client_secret": CLIENT_SECRET,
                        "access_token": access_token,
                        "token_type": "Bearer",
                        "expires_in": token_data.get("expires_in"),
                        "obtained_at": datetime.now().isoformat()
                    },
                    "api_base_url": BASE_URL,
                    "api_version": "v2",
                    "working_endpoints": {
                        "available_times": "/api/v2/available-times",
                        "bookings": "/api/v2/bookings"
                    },
                    "status": "working"
                }
                
                with open("trafft_auth_config.json", "w") as f:
                    json.dump(config, f, indent=2)
                
                print("\n✅ Authentication configuration saved to trafft_auth_config.json")
                
            else:
                print(f"❌ API Error: {api_response.status_code}")
                print(f"Response: {api_response.text[:300]}")
                
        else:
            print("❌ No access token in response")
            
    else:
        print(f"❌ Authentication failed")
        
        # Try with form data instead of JSON
        print("\n📍 Trying with form data...")
        response2 = requests.post(
            f"{BASE_URL}/auth/token",
            data=auth_data,  # form data instead of json
            timeout=10
        )
        print(f"Status: {response2.status_code}")
        print(f"Response: {response2.text[:500]}")

except Exception as e:
    print(f"❌ Exception: {str(e)}")

print("\n" + "=" * 50)
print("\n📊 Summary:")
print("Check the output above to see if authentication was successful.")
print("If successful, you can now use the access token for all API requests.")