#!/usr/bin/env python3
"""
Test Trafft API using the correct WLBookings endpoint
"""
import requests
import json
from datetime import datetime, timedelta

# From the Trafft dashboard
API_BASE_URL = "https://headlinesbarbershops.admin.wlbookings.com"
CLIENT_ID = "cf0e541ffb9bb5a1ad777eff256f1f96"
CLIENT_SECRET = "bdc3e1eb65cc5638fb89f0997e1e3858f0e021440e42c16a0e66f5984732599e"

print("🚀 Testing Trafft WLBookings API")
print("=" * 50)

# Try different authentication methods with the correct URL
def test_api_endpoints():
    """Test various API endpoints with different auth methods"""
    
    # Endpoints to test
    endpoints = [
        "/api/v1/locations",
        "/api/v1/employees", 
        "/api/v1/services",
        "/api/v1/categories",
        "/api/v1/appointments",
        "/api/locations",
        "/api/employees",
        "/api/services"
    ]
    
    # Auth methods to try
    auth_methods = [
        {
            "name": "Bearer Token (Client ID)",
            "headers": {
                "Authorization": f"Bearer {CLIENT_ID}",
                "Content-Type": "application/json"
            }
        },
        {
            "name": "Bearer Token (Client Secret)",
            "headers": {
                "Authorization": f"Bearer {CLIENT_SECRET}",
                "Content-Type": "application/json"
            }
        },
        {
            "name": "X-API-Key (Client ID)",
            "headers": {
                "X-API-Key": CLIENT_ID,
                "Content-Type": "application/json"
            }
        },
        {
            "name": "X-API-Key (Client Secret)",
            "headers": {
                "X-API-Key": CLIENT_SECRET,
                "Content-Type": "application/json"
            }
        },
        {
            "name": "Client Credentials in Headers",
            "headers": {
                "X-Client-Id": CLIENT_ID,
                "X-Client-Secret": CLIENT_SECRET,
                "Content-Type": "application/json"
            }
        }
    ]
    
    for auth in auth_methods:
        print(f"\n🔐 Testing: {auth['name']}")
        
        for endpoint in endpoints:
            url = f"{API_BASE_URL}{endpoint}"
            
            try:
                response = requests.get(url, headers=auth['headers'], timeout=5)
                
                if response.status_code == 200:
                    print(f"   ✅ {endpoint}: SUCCESS!")
                    data = response.json()
                    if isinstance(data, list):
                        print(f"      Found {len(data)} items")
                    else:
                        print(f"      Response type: {type(data).__name__}")
                    
                    # If we found a working method, test more thoroughly
                    return auth['headers'], endpoint
                    
                elif response.status_code == 401:
                    print(f"   ❌ {endpoint}: Unauthorized")
                elif response.status_code == 404:
                    print(f"   ⚠️  {endpoint}: Not found")
                else:
                    print(f"   ❌ {endpoint}: {response.status_code}")
                    
            except Exception as e:
                print(f"   ❌ {endpoint}: Error - {str(e)}")
    
    return None, None

# Test the API
working_headers, working_endpoint = test_api_endpoints()

if working_headers:
    print("\n" + "=" * 50)
    print("✅ Found working authentication!")
    print("\n📊 Fetching data from Trafft...")
    
    # Test common endpoints
    test_endpoints = [
        ("Locations", "/api/v1/locations"),
        ("Employees", "/api/v1/employees"),
        ("Services", "/api/v1/services"),
        ("Categories", "/api/v1/categories"),
        ("Recent Appointments", "/api/v1/appointments?limit=5")
    ]
    
    for name, endpoint in test_endpoints:
        try:
            url = f"{API_BASE_URL}{endpoint}"
            response = requests.get(url, headers=working_headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    print(f"\n{name}: Found {len(data)} items")
                    if data:
                        print(f"Sample: {json.dumps(data[0], indent=2)[:300]}...")
                else:
                    print(f"\n{name}: {json.dumps(data, indent=2)[:300]}...")
                    
        except Exception as e:
            print(f"\n{name}: Error - {str(e)}")
    
    # Save configuration
    config = {
        "api_base_url": API_BASE_URL,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "auth_headers": working_headers,
        "working_endpoint": working_endpoint,
        "discovered_at": datetime.now().isoformat()
    }
    
    with open("trafft_wlbookings_config.json", "w") as f:
        json.dump(config, f, indent=2)
    
    print("\n✅ Configuration saved to trafft_wlbookings_config.json")
    
else:
    print("\n" + "=" * 50)
    print("❌ Could not authenticate with Trafft API")
    print("\nPlease check:")
    print("1. The API credentials are correct")
    print("2. Your Trafft account has API access enabled")
    print("3. The API might require a different authentication method")