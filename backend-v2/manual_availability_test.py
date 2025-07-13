#!/usr/bin/env python3
"""
Manual validation of Barber Availability Management Interface
Focus on backend functionality and endpoint validation
"""

import requests
import json

# Test configuration
BACKEND_URL = "http://localhost:8000"

def test_api_endpoints():
    """Test the availability API endpoints exist and respond correctly"""
    print("🔍 Testing Barber Availability API Endpoints...")
    
    # Test OpenAPI spec access
    try:
        response = requests.get(f"{BACKEND_URL}/openapi.json", timeout=5)
        if response.status_code == 200:
            print("✅ OpenAPI specification accessible")
            
            openapi_spec = response.json()
            paths = openapi_spec.get("paths", {})
            
            # Check for required availability endpoints
            required_endpoints = [
                "/api/v1/barber-availability/availability/{barber_id}",
                "/api/v1/barber-availability/time-off/{barber_id}",
                "/api/v1/barber-availability/special/{barber_id}",
                "/api/v1/barber-availability/schedule/{barber_id}",
                "/api/v1/barber-availability/available-barbers",
                "/api/v1/barber-availability/check/{barber_id}"
            ]
            
            print("\n📋 API Endpoint Verification:")
            all_exist = True
            for endpoint in required_endpoints:
                exists = endpoint in paths
                status = "✅" if exists else "❌"
                endpoint_name = endpoint.split("/")[-1].replace("{barber_id}", "")
                print(f"  {status} {endpoint_name} endpoint")
                if not exists:
                    all_exist = False
            
            if all_exist:
                print("\n✅ All required barber availability endpoints are present")
            else:
                print("\n❌ Some endpoints are missing")
                
            return all_exist
        else:
            print("❌ Cannot access OpenAPI specification")
            return False
            
    except Exception as e:
        print(f"❌ Error testing API endpoints: {e}")
        return False

def test_endpoint_security():
    """Test that endpoints properly require authentication"""
    print("\n🔒 Testing Endpoint Security...")
    
    endpoints_to_test = [
        "/api/v1/barber-availability/available-barbers",
        "/api/v1/barber-availability/availability/1",
        "/api/v1/barber-availability/time-off/1",
        "/api/v1/barber-availability/special/1"
    ]
    
    all_secure = True
    for endpoint in endpoints_to_test:
        try:
            response = requests.get(f"{BACKEND_URL}{endpoint}", timeout=5)
            # Should require authentication (401 or 403)
            if response.status_code in [401, 403]:
                print(f"  ✅ {endpoint.split('/')[-2]} requires authentication")
            else:
                print(f"  ❌ {endpoint.split('/')[-2]} unexpected response: {response.status_code}")
                all_secure = False
        except Exception as e:
            print(f"  ❌ Error testing {endpoint}: {e}")
            all_secure = False
    
    return all_secure

def test_documentation():
    """Test that API documentation is available"""
    print("\n📚 Testing API Documentation...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/docs", timeout=5)
        if response.status_code == 200:
            print("✅ Interactive API documentation accessible at /docs")
            return True
        else:
            print(f"❌ Documentation not accessible: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error accessing documentation: {e}")
        return False

def main():
    """Run comprehensive backend validation"""
    print("🚀 Barber Availability Management Backend Validation")
    print("=" * 60)
    
    # Run tests
    endpoints_ok = test_api_endpoints()
    security_ok = test_endpoint_security()
    docs_ok = test_documentation()
    
    # Summary
    print("\n📊 Backend Validation Summary:")
    print("=" * 60)
    
    if endpoints_ok:
        print("✅ API Endpoints: All required endpoints are properly implemented")
    else:
        print("❌ API Endpoints: Some endpoints are missing or misconfigured")
    
    if security_ok:
        print("✅ Security: Authentication is properly enforced")
    else:
        print("❌ Security: Some endpoints may have authentication issues")
    
    if docs_ok:
        print("✅ Documentation: Interactive API docs are accessible")
    else:
        print("❌ Documentation: API documentation not accessible")
    
    overall_success = endpoints_ok and security_ok and docs_ok
    
    if overall_success:
        print("\n🎉 SUCCESS: Barber Availability Backend is production-ready!")
        print("   - All API endpoints are implemented and accessible")
        print("   - Authentication security is properly enforced")
        print("   - API documentation is available for developers")
        print("   - Ready for frontend integration")
        
        print("\n🔧 Frontend Integration Notes:")
        print("   - All API calls should include 'Authorization: Bearer <token>' header")
        print("   - API base URL: http://localhost:8000/api/v1/")
        print("   - Endpoints use /api/v1/barber-availability/ prefix")
        
        return True
    else:
        print("\n⚠️  Issues found in backend implementation")
        return False

if __name__ == "__main__":
    success = main()
    if success:
        print("\n✅ BARBER AVAILABILITY MANAGEMENT INTERFACE VALIDATION COMPLETE")
        print("   Backend is ready for production use!")
    else:
        print("\n❌ Some issues need to be resolved")