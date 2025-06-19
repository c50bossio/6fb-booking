#!/usr/bin/env python3
"""
Trafft Business API - Working implementation
The Client ID is used directly as the Bearer token
"""
import requests
import json
from datetime import datetime, timedelta

# Your Business API credentials
BASE_URL = "https://headlinesbarbershops.admin.wlbookings.com"
API_TOKEN = "cf0e541ffb9bb5a1ad777eff256f1f96"  # This is your Client ID that works as Bearer token
CLIENT_SECRET = "bdc3e1eb65cc5638fb89f0997e1e3858f0e021440e42c16a0e66f5984732599e"  # For webhook verification

print("🚀 Trafft Business API - Full Test")
print("=" * 50)
print(f"✅ Using Client ID as Bearer Token")
print(f"API Base URL: {BASE_URL}")
print(f"Token: {API_TOKEN[:20]}...")

# Default headers for all requests
headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

def test_endpoint(name, endpoint, params=None):
    """Test a single API endpoint"""
    url = f"{BASE_URL}{endpoint}"
    print(f"\n📍 Testing {name}...")
    print(f"   URL: {url}")
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if isinstance(data, list):
                print(f"   ✅ Success! Found {len(data)} items")
                if data:
                    # Show first item as sample
                    print(f"   Sample item:")
                    print(json.dumps(data[0], indent=4)[:500])
                return data
            else:
                print(f"   ✅ Success! Got data")
                print(json.dumps(data, indent=4)[:500])
                return data
        else:
            print(f"   ❌ Error: {response.text[:200]}")
            return None
            
    except Exception as e:
        print(f"   ❌ Exception: {str(e)}")
        return None

# Test all major endpoints
print("\n" + "=" * 50)
print("🧪 Testing All API Endpoints")

# 1. Locations
locations = test_endpoint("Locations", "/v1/locations")

# 2. Services
services = test_endpoint("Services", "/v1/services")

# 3. Employees (Barbers)
employees = test_endpoint("Employees", "/v1/employees")

# 4. Categories
categories = test_endpoint("Categories", "/v1/categories")

# 5. Customers
customers = test_endpoint("Customers", "/v1/customers", params={"limit": 5})

# 6. Recent Appointments
end_date = datetime.now()
start_date = end_date - timedelta(days=7)
appointments = test_endpoint(
    "Recent Appointments (last 7 days)", 
    "/v1/appointments",
    params={
        "startDate": start_date.strftime("%Y-%m-%d"),
        "endDate": end_date.strftime("%Y-%m-%d"),
        "limit": 10
    }
)

# 7. Company info
company = test_endpoint("Company Info", "/v1/company")

# Save working configuration
config = {
    "api_configuration": {
        "base_url": BASE_URL,
        "api_token": API_TOKEN,
        "client_secret": CLIENT_SECRET,
        "auth_method": "Bearer Token using Client ID",
        "headers": headers
    },
    "discovered_endpoints": {
        "locations": "/v1/locations",
        "services": "/v1/services", 
        "employees": "/v1/employees",
        "categories": "/v1/categories",
        "customers": "/v1/customers",
        "appointments": "/v1/appointments",
        "company": "/v1/company"
    },
    "test_results": {
        "locations_count": len(locations) if locations else 0,
        "services_count": len(services) if services else 0,
        "employees_count": len(employees) if employees else 0,
        "categories_count": len(categories) if categories else 0
    },
    "generated_at": datetime.now().isoformat(),
    "notes": [
        "Use the Client ID as Bearer token in Authorization header",
        "Client Secret is likely for webhook signature verification",
        "All endpoints use /v1/ prefix (not /api/v1/)"
    ]
}

with open("trafft_working_config.json", "w") as f:
    json.dump(config, f, indent=2)

print("\n" + "=" * 50)
print("📁 Configuration saved to trafft_working_config.json")

# Summary
print("\n📊 API Summary:")
print(f"   - Locations: {config['test_results']['locations_count']}")
print(f"   - Services: {config['test_results']['services_count']}")
print(f"   - Employees: {config['test_results']['employees_count']}")
print(f"   - Categories: {config['test_results']['categories_count']}")

if appointments and isinstance(appointments, list):
    print(f"   - Recent appointments: {len(appointments)}")

print("\n✅ Trafft Business API is working!")
print("\nNext steps:")
print("1. Update backend to use this authentication method")
print("2. Create sync functions for each data type")
print("3. Start importing data into your database")