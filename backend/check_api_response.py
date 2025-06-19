#!/usr/bin/env python3
"""
Check what the API is actually returning
"""
import requests

BASE_URL = "https://headlinesbarbershops.admin.wlbookings.com"
API_TOKEN = "cf0e541ffb9bb5a1ad777eff256f1f96"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

print("🔍 Checking API Response Content")
print("=" * 50)

# Test a simple endpoint
url = f"{BASE_URL}/v1/locations"
print(f"\nTesting: {url}")

response = requests.get(url, headers=headers, timeout=10)
print(f"Status: {response.status_code}")
print(f"Content-Type: {response.headers.get('Content-Type', 'Not specified')}")
print(f"Content Length: {len(response.content)} bytes")

# Show the actual response
print(f"\nResponse (first 1000 chars):")
print(response.text[:1000])

# Check if it's HTML
if response.text.startswith('<!'):
    print("\n⚠️  Response is HTML, not JSON!")
    
    # Try without /v1 prefix
    print("\n" + "=" * 50)
    print("\nTrying without /v1 prefix...")
    
    url2 = f"{BASE_URL}/api/locations"
    response2 = requests.get(url2, headers=headers, timeout=10)
    print(f"URL: {url2}")
    print(f"Status: {response2.status_code}")
    
    if response2.status_code == 200:
        try:
            data = response2.json()
            print("✅ This works! Got JSON data")
            print(f"Data preview: {str(data)[:200]}")
        except:
            print(f"Content: {response2.text[:200]}")
            
    # Try /api/v1 prefix
    print("\nTrying with /api/v1 prefix...")
    
    url3 = f"{BASE_URL}/api/v1/locations"  
    response3 = requests.get(url3, headers=headers, timeout=10)
    print(f"URL: {url3}")
    print(f"Status: {response3.status_code}")
    
    if response3.status_code == 200:
        try:
            data = response3.json()
            print("✅ This works! Got JSON data")
            print(f"Data preview: {str(data)[:200]}")
        except:
            print(f"Not JSON: {response3.text[:200]}")