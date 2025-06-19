#!/usr/bin/env python3
"""
Test different API URL patterns for Trafft
"""
import requests
import json

CLIENT_ID = "cf0e541ffb9bb5a1ad777eff256f1f96"
CLIENT_SECRET = "bdc3e1eb65cc5638fb89f0997e1e3858f0e021440e42c16a0e66f5984732599e"

print("🔍 Testing Trafft API URL Discovery")
print("=" * 50)

# Different possible API URLs
base_urls = [
    "https://headlinesbarbershops.admin.wlbookings.com",
    "https://api.headlinesbarbershops.admin.wlbookings.com",
    "https://headlinesbarbershops.api.wlbookings.com",
    "https://api.wlbookings.com",
    "https://headlinesbarbershops.trafft.com",
    "https://api.trafft.com"
]

auth_data = {
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "grant_type": "client_credentials"
}

working_url = None

for base_url in base_urls:
    print(f"\n📍 Testing: {base_url}")
    
    # Test /auth/token endpoint
    try:
        url = f"{base_url}/auth/token"
        print(f"   POST {url}")
        
        response = requests.post(
            url,
            json=auth_data,
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        
        print(f"   Status: {response.status_code}")
        
        # Check if it's JSON
        content_type = response.headers.get('Content-Type', '')
        if 'application/json' in content_type:
            try:
                data = response.json()
                print(f"   ✅ Got JSON response!")
                
                if 'access_token' in data:
                    print(f"   🎉 Found access token!")
                    working_url = base_url
                    access_token = data['access_token']
                    break
                else:
                    print(f"   Response: {json.dumps(data, indent=2)[:200]}")
            except:
                print("   ❌ Invalid JSON")
        else:
            if response.text.startswith('<!'):
                print("   ❌ Returns HTML")
            else:
                print(f"   Response: {response.text[:100]}")
                
    except requests.exceptions.ConnectionError:
        print("   ❌ Connection failed - URL doesn't exist")
    except requests.exceptions.Timeout:
        print("   ❌ Request timed out")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")

if working_url:
    print("\n" + "=" * 50)
    print(f"\n✅ Found working API at: {working_url}")
    print(f"Access token: {access_token[:30]}...")
    
    # Test the API
    print("\n📍 Testing API access...")
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    test_response = requests.get(
        f"{working_url}/api/v2/available-times",
        headers=headers,
        timeout=5
    )
    
    if test_response.status_code == 200:
        print("✅ API access confirmed!")
    else:
        print(f"❌ API test failed: {test_response.status_code}")
else:
    print("\n" + "=" * 50)
    print("\n❌ Could not find working API URL")
    print("\nThe issue appears to be:")
    print("1. The /auth/token endpoint returns HTML instead of JSON")
    print("2. This suggests the API might not be properly exposed for your instance")
    print("3. You may need to contact Trafft support to enable API access")
    
    print("\n📧 Email Trafft support with this information:")
    print("- Your instance returns HTML at /auth/token instead of JSON")
    print("- Ask if API access needs to be enabled for your subdomain")
    print("- Request the correct API base URL for your instance")