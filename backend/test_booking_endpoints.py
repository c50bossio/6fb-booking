#!/usr/bin/env python3
"""
Test script to verify booking endpoints are working correctly
"""
import os
import sys
import requests
import json
from typing import Dict, Any

# Set environment variables
os.environ["DATA_ENCRYPTION_KEY"] = "BcyOvTLRfOGPAUWZlxaeYHCMpwP9w391ZBFCMNy-TOQ="  # pragma: allowlist secret

# Test server configuration
BASE_URL = "http://localhost:8000"


def test_endpoint(
    endpoint: str, method: str = "GET", data: Dict[Any, Any] = None
) -> Dict[str, Any]:
    """Test a single endpoint and return results"""
    url = f"{BASE_URL}{endpoint}"

    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data)
        elif method == "PUT":
            response = requests.put(url, json=data)
        elif method == "DELETE":
            response = requests.delete(url)
        else:
            return {"error": f"Unsupported method: {method}"}

        result = {
            "endpoint": endpoint,
            "method": method,
            "status_code": response.status_code,
            "success": response.status_code < 400,
        }

        # Try to parse JSON response
        try:
            result["response"] = response.json()
        except:
            result["response"] = response.text[:200] if response.text else "No content"

        return result

    except requests.exceptions.ConnectionError:
        return {
            "endpoint": endpoint,
            "method": method,
            "error": "Connection refused - server not running",
            "success": False,
        }
    except Exception as e:
        return {
            "endpoint": endpoint,
            "method": method,
            "error": str(e),
            "success": False,
        }


def main():
    print("🧪 Testing 6FB Booking API Endpoints")
    print("=" * 50)

    # Test basic endpoints first
    print("\n📋 Testing Basic Endpoints")
    print("-" * 30)

    basic_tests = [
        "/",
        "/health",
        "/docs",
    ]

    for endpoint in basic_tests:
        result = test_endpoint(endpoint)
        status = "✅" if result.get("success") else "❌"
        print(f"{status} {endpoint}: {result.get('status_code', 'ERROR')}")
        if not result.get("success"):
            print(f"   Error: {result.get('error', 'Unknown error')}")

    # Test booking endpoints
    print("\n🎯 Testing Booking Endpoints")
    print("-" * 30)

    booking_tests = [
        # Public booking endpoints
        "/api/v1/booking-public/shops/1/barbers",
        "/api/v1/booking-public/barbers/1/services",
        "/api/v1/booking-public/barbers/1/availability",
        # Authenticated booking endpoints
        "/api/v1/booking-auth/barbers/1/schedule",
        "/api/v1/booking-auth/bookings/calendar",
        # Combined booking endpoints
        "/api/v1/booking/public/shops/1/barbers",
        "/api/v1/booking/public/barbers/1/services",
    ]

    for endpoint in booking_tests:
        result = test_endpoint(endpoint)
        status = "✅" if result.get("success") else "❌"
        print(f"{status} {endpoint}: {result.get('status_code', 'ERROR')}")
        if not result.get("success") and result.get("status_code") != 404:
            print(f"   Error: {result.get('error', 'Unknown error')}")

    print("\n📊 Testing Results Summary")
    print("-" * 30)
    print("If endpoints return 404, they may not be properly registered.")
    print("If endpoints return 422, they exist but need parameters.")
    print("If endpoints return 401/403, they exist but need authentication.")
    print("If endpoints return 500, there's a server error.")


if __name__ == "__main__":
    main()
