#!/usr/bin/env python3
"""
Test all analytics endpoints to verify they're working
"""
import requests

def test_all_analytics():
    base_url = "http://localhost:8000"
    
    # Login to get token
    login_data = {
        "email": "admin@sixfb.com",
        "password": "admin123"
    }
    
    login_response = requests.post(f"{base_url}/api/v1/auth/login", json=login_data)
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.text}")
        return
        
    token_data = login_response.json()
    auth_headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    
    # Test all analytics endpoints
    endpoints = [
        ("/api/v1/analytics/dashboard", "Dashboard Analytics"),
        ("/api/v1/analytics/revenue", "Revenue Analytics"),
        ("/api/v1/analytics/appointments", "Appointment Analytics"),
        ("/api/v1/analytics/six-figure-barber", "Six Figure Barber Metrics"),
        ("/api/v1/analytics/client-retention", "Client Retention"),
        ("/api/v1/analytics/barber-performance", "Barber Performance"),
        ("/api/v1/analytics/comparative", "Comparative Analytics"),
        ("/api/v1/analytics/insights", "Business Insights"),
        ("/api/v1/analytics/appointment-patterns", "Appointment Patterns"),
        ("/api/v1/analytics/client-lifetime-value", "Client Lifetime Value")
    ]
    
    print("Testing all analytics endpoints...")
    print("=" * 60)
    
    success_count = 0
    total_count = len(endpoints)
    
    for endpoint, name in endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}", headers=auth_headers, timeout=15)
            
            if response.status_code == 200:
                print(f"✅ {name}: SUCCESS")
                success_count += 1
                
                # Check for potential frontend issues
                response_text = response.text
                issues = []
                
                if 'toFixed' in response_text:
                    issues.append("Contains 'toFixed' (JS issue)")
                if 'NaN' in response_text:
                    issues.append("Contains 'NaN'")
                if 'undefined' in response_text:
                    issues.append("Contains 'undefined'")
                
                if issues:
                    print(f"   ⚠️  Potential issues: {', '.join(issues)}")
                    
            elif response.status_code == 500:
                print(f"❌ {name}: ERROR 500 - {response.text}")
            elif response.status_code == 403:
                print(f"🔒 {name}: Permission denied")
            elif response.status_code == 404:
                print(f"❓ {name}: Endpoint not found")
            else:
                print(f"⚠️  {name}: HTTP {response.status_code}")
                
        except requests.exceptions.Timeout:
            print(f"⏱️  {name}: TIMEOUT (>15s)")
        except Exception as e:
            print(f"💥 {name}: Exception - {e}")
    
    print("=" * 60)
    print(f"Summary: {success_count}/{total_count} endpoints working")
    
    if success_count == total_count:
        print("🎉 All analytics endpoints are working correctly!")
    else:
        print(f"⚠️  {total_count - success_count} endpoints need attention")

if __name__ == "__main__":
    test_all_analytics()