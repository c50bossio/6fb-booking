#!/usr/bin/env python3
"""
Test CORS configuration for production deployment
"""

import requests
import json
from datetime import datetime


def test_cors_endpoint(base_url, endpoint, origin=None):
    """Test CORS for a specific endpoint"""
    url = f"{base_url}{endpoint}"
    headers = {}

    if origin:
        headers["Origin"] = origin
        headers["Access-Control-Request-Method"] = "GET"
        headers["Access-Control-Request-Headers"] = "Authorization,Content-Type"

    try:
        # Test OPTIONS request (preflight)
        print(f"\n🧪 Testing OPTIONS {url}")
        if origin:
            print(f"   Origin: {origin}")

        options_response = requests.options(url, headers=headers, timeout=10)
        print(f"   Status: {options_response.status_code}")
        print(f"   Headers: {dict(options_response.headers)}")

        # Test GET request
        print(f"\n🧪 Testing GET {url}")
        get_headers = {"Origin": origin} if origin else {}
        get_response = requests.get(url, headers=get_headers, timeout=10)
        print(f"   Status: {get_response.status_code}")

        if get_response.status_code == 200:
            print("   ✅ Success")
        else:
            print(f"   ❌ Failed: {get_response.text[:200]}")

        return options_response.status_code == 200 and get_response.status_code == 200

    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False


def main():
    """Main test function"""
    print("🚀 Testing CORS Configuration for Railway Deployment")
    print("=" * 60)

    # Test configurations
    base_url = "https://web-production-92a6c.up.railway.app"

    origins_to_test = [
        None,  # No origin (direct access)
        "https://web-production-92a6c.up.railway.app",  # Same origin
        "https://6fb-booking-frontend.up.railway.app",  # Expected frontend
        "https://6fb-booking-frontend-production.up.railway.app",  # Production frontend
        "http://localhost:3000",  # Local development
        "https://bookedbarber-6fb.vercel.app",  # Vercel deployment
    ]

    endpoints_to_test = [
        "/api/v1/health",
        "/api/v1/payment-splits/barbers",
        "/api/v1/payment-splits/recent",
    ]

    results = []

    for origin in origins_to_test:
        origin_label = origin if origin else "No Origin"
        print(f"\n🌍 Testing Origin: {origin_label}")
        print("-" * 40)

        origin_results = []
        for endpoint in endpoints_to_test:
            success = test_cors_endpoint(base_url, endpoint, origin)
            origin_results.append(success)

        results.append(
            {
                "origin": origin_label,
                "success_rate": sum(origin_results) / len(origin_results),
                "total_tests": len(origin_results),
                "passed": sum(origin_results),
            }
        )

    # Summary
    print("\n" + "=" * 60)
    print("📊 CORS Test Summary")
    print("=" * 60)

    for result in results:
        status = "✅ PASS" if result["success_rate"] == 1.0 else "❌ FAIL"
        print(
            f"{status} {result['origin']}: {result['passed']}/{result['total_tests']} tests passed"
        )

    overall_success = sum(r["passed"] for r in results) / sum(
        r["total_tests"] for r in results
    )
    print(f"\n🎯 Overall Success Rate: {overall_success:.1%}")

    if overall_success < 1.0:
        print("\n🔧 Recommendations:")
        print("1. Check Railway environment variables")
        print("2. Verify CORS origins in backend settings")
        print("3. Ensure frontend uses correct API URL")
        print("4. Check for any proxy or CDN blocking requests")


if __name__ == "__main__":
    main()
