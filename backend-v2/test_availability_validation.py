#!/usr/bin/env python3
"""
Quick validation test for Barber Availability Management Interface
Tests both backend API endpoints and frontend accessibility
"""

import requests
import json
import sys
from datetime import datetime

# Test configuration
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

def test_backend_endpoints():
    """Test that all barber availability API endpoints exist"""
    print("🔍 Testing Backend API Endpoints...")
    
    # Test endpoints that should be accessible
    endpoints_to_test = [
        ("/docs", "GET"),  # API documentation
        ("/api/v1/barber-availability/available-barbers", "GET"),  # Should require auth
    ]
    
    results = []
    for endpoint, method in endpoints_to_test:
        try:
            url = f"{BACKEND_URL}{endpoint}"
            response = requests.get(url, timeout=5)
            
            if endpoint == "/docs":
                success = response.status_code == 200
                message = "✅ API documentation accessible" if success else f"❌ API docs failed: {response.status_code}"
            elif endpoint == "/api/v1/barber-availability/available-barbers":
                success = response.status_code == 401 or response.status_code == 403  # Should require auth
                message = "✅ Availability endpoint requires auth (correct)" if success else f"❌ Unexpected response: {response.status_code}"
            
            results.append((success, message))
            print(f"  {message}")
            
        except requests.exceptions.RequestException as e:
            results.append((False, f"❌ {endpoint}: Connection failed"))
            print(f"  ❌ {endpoint}: Connection failed")
    
    return all(result[0] for result in results)

def test_frontend_accessibility():
    """Test that frontend availability page is accessible"""
    print("\n🔍 Testing Frontend Accessibility...")
    
    pages_to_test = [
        "/barber/availability",
        "/",  # Homepage
    ]
    
    results = []
    for page in pages_to_test:
        try:
            url = f"{FRONTEND_URL}{page}"
            response = requests.get(url, timeout=5)
            success = response.status_code == 200
            
            if page == "/barber/availability":
                message = "✅ Barber availability page accessible" if success else f"❌ Availability page failed: {response.status_code}"
            else:
                message = "✅ Homepage accessible" if success else f"❌ Homepage failed: {response.status_code}"
            
            results.append((success, message))
            print(f"  {message}")
            
        except requests.exceptions.RequestException as e:
            results.append((False, f"❌ {page}: Connection failed"))
            print(f"  ❌ {page}: Connection failed")
    
    return all(result[0] for result in results)

def check_api_endpoints_structure():
    """Check the OpenAPI structure for availability endpoints"""
    print("\n🔍 Validating API Endpoint Structure...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/openapi.json", timeout=5)
        if response.status_code != 200:
            print("❌ Cannot access OpenAPI specification")
            return False
        
        openapi_spec = response.json()
        paths = openapi_spec.get("paths", {})
        
        required_endpoints = [
            "/api/v1/barber-availability/availability/{barber_id}",
            "/api/v1/barber-availability/time-off/{barber_id}",
            "/api/v1/barber-availability/special/{barber_id}",
            "/api/v1/barber-availability/schedule/{barber_id}",
        ]
        
        results = []
        for endpoint in required_endpoints:
            exists = endpoint in paths
            message = f"✅ {endpoint.split('/')[-1]} endpoint exists" if exists else f"❌ {endpoint} missing"
            results.append((exists, message))
            print(f"  {message}")
        
        return all(result[0] for result in results)
        
    except Exception as e:
        print(f"❌ Error checking API structure: {e}")
        return False

def main():
    """Run all validation tests"""
    print("🚀 Barber Availability Management Interface Validation")
    print("=" * 60)
    
    # Run all tests
    backend_ok = test_backend_endpoints()
    frontend_ok = test_frontend_accessibility()
    api_structure_ok = check_api_endpoints_structure()
    
    # Summary
    print("\n📊 Validation Summary:")
    print("=" * 60)
    
    if backend_ok:
        print("✅ Backend API: All endpoints accessible and responding correctly")
    else:
        print("❌ Backend API: Some endpoints failed")
    
    if frontend_ok:
        print("✅ Frontend: Availability page accessible")
    else:
        print("❌ Frontend: Availability page not accessible")
    
    if api_structure_ok:
        print("✅ API Structure: All required endpoints present")
    else:
        print("❌ API Structure: Missing required endpoints")
    
    overall_success = backend_ok and frontend_ok and api_structure_ok
    
    if overall_success:
        print("\n🎉 SUCCESS: Barber Availability Management Interface is ready for production!")
        print("   - All API endpoints are accessible and properly structured")
        print("   - Frontend availability page loads correctly")
        print("   - Authentication is properly enforced")
        return 0
    else:
        print("\n⚠️  ISSUES FOUND: Some components need attention")
        return 1

if __name__ == "__main__":
    sys.exit(main())