#!/usr/bin/env python3
"""
Test API endpoints
"""
import requests
import json
import time

def test_api_endpoints():
    """Test various API endpoints"""
    base_url = "http://localhost:8000"
    
    tests = [
        {"url": f"{base_url}/", "name": "Root endpoint"},
        {"url": f"{base_url}/health", "name": "Health check"},
        {"url": f"{base_url}/api/analytics/dashboard?barber_id=1", "name": "Dashboard analytics"},
        {"url": f"{base_url}/api/analytics/daily-metrics?barber_id=1", "name": "Daily metrics"},
        {"url": f"{base_url}/api/analytics/6fb-score?barber_id=1", "name": "6FB Score"},
        {"url": f"{base_url}/api/appointments/daily-summary?barber_id=1", "name": "Daily appointments"},
        {"url": f"{base_url}/api/clients/?barber_id=1&limit=5", "name": "Clients list"},
    ]
    
    print("🧪 Testing API endpoints...")
    print(f"Base URL: {base_url}")
    print("=" * 50)
    
    for test in tests:
        try:
            response = requests.get(test["url"], timeout=5)
            status = "✅" if response.status_code == 200 else "❌"
            print(f"{status} {test['name']}: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict) and "data" in data:
                    print(f"   📊 Response contains data")
                else:
                    print(f"   📝 Response: {str(data)[:100]}...")
            else:
                print(f"   ❗ Error: {response.text[:100]}...")
                
        except requests.exceptions.ConnectionError:
            print(f"❌ {test['name']}: Connection refused - is server running?")
        except Exception as e:
            print(f"❌ {test['name']}: {str(e)}")
    
    print("=" * 50)
    print("🚀 To start the server: uvicorn main:app --reload")
    print("📖 API docs: http://localhost:8000/docs")

if __name__ == "__main__":
    test_api_endpoints()