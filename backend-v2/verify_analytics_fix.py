#!/usr/bin/env python3
"""
Final verification that analytics 500 errors are fixed
"""
import requests
import json

def verify_analytics_fix():
    print("🔍 Final verification of analytics 500 error fix")
    print("=" * 50)
    
    base_url = "http://localhost:8000"
    
    # Login
    login_data = {"email": "admin@sixfb.com", "password": "admin123"}
    login_response = requests.post(f"{base_url}/api/v1/auth/login", json=login_data)
    
    if login_response.status_code != 200:
        print("❌ Login failed - cannot verify fix")
        return False
        
    token_data = login_response.json()
    auth_headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    
    # Test the main endpoints that were failing
    critical_endpoints = [
        "/api/v1/analytics/dashboard",
        "/api/v1/analytics/revenue", 
        "/api/v1/analytics/appointments"
    ]
    
    all_working = True
    
    for endpoint in critical_endpoints:
        response = requests.get(f"{base_url}{endpoint}", headers=auth_headers, timeout=10)
        
        if response.status_code == 200:
            print(f"✅ {endpoint}: Working correctly")
            
            # Verify response is valid JSON
            try:
                data = response.json()
                print(f"   📊 Data returned: {len(json.dumps(data))} characters")
            except:
                print(f"   ⚠️  Response is not valid JSON")
                all_working = False
                
        elif response.status_code == 500:
            print(f"❌ {endpoint}: Still returning 500 error")
            print(f"   Error: {response.text}")
            all_working = False
        else:
            print(f"⚠️  {endpoint}: HTTP {response.status_code}")
            all_working = False
    
    print("=" * 50)
    
    if all_working:
        print("🎉 SUCCESS: All analytics 500 errors have been fixed!")
        print("\n📋 What was fixed:")
        print("   • Fixed AttributeError: 'User' object has no attribute 'primary_organization_id'")
        print("   • Updated analytics.py to use 'primary_organization' instead")
        print("   • All analytics endpoints now return 200 OK")
        print("\n✅ Analytics dashboard should now load without 500 errors")
        return True
    else:
        print("❌ FAILED: Some analytics endpoints still have issues")
        return False

if __name__ == "__main__":
    verify_analytics_fix()