#!/usr/bin/env python3
"""
Comprehensive endpoint test to identify 404 errors
Tests both local and production endpoints
"""

import requests
import json
from typing import Dict, List, Tuple
from datetime import datetime

# Server URLs
LOCAL_URL = "http://localhost:8000"
PRODUCTION_URL = "https://sixfb-backend.onrender.com"

# List of all documented endpoints
ENDPOINTS = [
    # Authentication
    ("/api/v1/auth/login", "POST", {"email": "test@example.com", "password": "test"}),
    (
        "/api/v1/auth/register",
        "POST",
        {
            "email": "test@example.com",
            "password": "test",
            "first_name": "Test",
            "last_name": "User",
        },
    ),
    ("/api/v1/auth/me", "GET", None),
    ("/api/v1/auth/refresh", "POST", None),
    # Users
    ("/api/v1/users", "GET", None),
    ("/api/v1/users/1", "GET", None),
    # Locations
    ("/api/v1/locations", "GET", None),
    ("/api/v1/locations/1", "GET", None),
    # Services
    ("/api/v1/services", "GET", None),
    ("/api/v1/services/categories", "GET", None),
    ("/api/v1/services/1", "GET", None),
    # Barbers
    ("/api/v1/barbers", "GET", None),
    ("/api/v1/barbers/1", "GET", None),
    # Appointments
    ("/api/v1/appointments", "GET", None),
    ("/api/v1/appointments/1", "GET", None),
    # Analytics
    ("/api/v1/analytics/metrics", "GET", None),
    ("/api/v1/analytics/dashboard-summary", "GET", None),
    ("/api/v1/analytics/revenue", "GET", None),
    ("/api/v1/analytics/services", "GET", None),
    # Booking
    ("/api/v1/booking/availability", "GET", None),
    ("/api/v1/booking/appointments", "POST", None),
    # Calendar
    ("/api/v1/calendar/events", "GET", None),
    ("/api/v1/calendar/sync", "POST", None),
    # Notifications
    ("/api/v1/notifications", "GET", None),
    ("/api/v1/notifications/send", "POST", None),
    # Payments
    ("/api/v1/payments/methods", "GET", None),
    ("/api/v1/payments/process", "POST", None),
    # Public endpoints
    ("/api/v1/public/status", "GET", None),
    ("/api/v1/health", "GET", None),
    ("/", "GET", None),
    ("/version", "GET", None),
    # Dashboard
    ("/api/v1/dashboard/overview", "GET", None),
    # Clients
    ("/api/v1/clients", "GET", None),
    ("/api/v1/clients/1", "GET", None),
]


def test_endpoint(
    base_url: str, endpoint: str, method: str, data: Dict = None
) -> Tuple[int, str]:
    """Test a single endpoint and return status code and response"""
    url = f"{base_url}{endpoint}"

    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=5)
        else:
            return 0, f"Unsupported method: {method}"

        return response.status_code, response.text[:200]
    except requests.exceptions.ConnectionError:
        return -1, "Connection refused"
    except requests.exceptions.Timeout:
        return -2, "Request timeout"
    except Exception as e:
        return -3, f"Error: {type(e).__name__}: {str(e)}"


def analyze_results(results: List[Tuple[str, str, int, str]]) -> None:
    """Analyze and summarize test results"""
    print("\n" + "=" * 80)
    print("SUMMARY OF ENDPOINTS")
    print("=" * 80)

    # Group by status
    status_groups = {}
    for endpoint, method, status, _ in results:
        if status not in status_groups:
            status_groups[status] = []
        status_groups[status].append(f"{method} {endpoint}")

    # Print grouped results
    for status in sorted(status_groups.keys()):
        print(f"\nStatus {status}: {len(status_groups[status])} endpoints")
        if status == 404:
            print("  These endpoints are returning 404 (NOT FOUND):")
            for ep in sorted(status_groups[status]):
                print(f"    - {ep}")
        elif status < 0:
            print("  Connection/Error issues:")
            for ep in sorted(status_groups[status])[:5]:
                print(f"    - {ep}")
        elif status == 200:
            print("  Working correctly")
        else:
            for ep in sorted(status_groups[status])[:5]:
                print(f"    - {ep}")


def main():
    """Run comprehensive endpoint tests"""
    print("6FB Booking Platform - Comprehensive Endpoint Test")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("=" * 80)

    # Test production endpoints
    print("\nTesting PRODUCTION endpoints...")
    print(f"URL: {PRODUCTION_URL}")

    production_results = []
    for endpoint, method, data in ENDPOINTS:
        status, response = test_endpoint(PRODUCTION_URL, endpoint, method, data)
        production_results.append((endpoint, method, status, response))

        # Print progress for 404s
        if status == 404:
            print(f"  404 NOT FOUND: {method} {endpoint}")

    # Analyze results
    analyze_results(production_results)

    # Test local if available
    print("\n" + "=" * 80)
    print("Testing LOCAL endpoints...")
    print(f"URL: {LOCAL_URL}")

    # Quick check if local server is running
    local_status, _ = test_endpoint(LOCAL_URL, "/", "GET")
    if local_status == -1:
        print("Local server is not running. Skipping local tests.")
    else:
        local_results = []
        for endpoint, method, data in ENDPOINTS:
            status, response = test_endpoint(LOCAL_URL, endpoint, method, data)
            local_results.append((endpoint, method, status, response))

            # Print progress for 404s
            if status == 404:
                print(f"  404 NOT FOUND: {method} {endpoint}")

        analyze_results(local_results)

    # Special check for services endpoint variations
    print("\n" + "=" * 80)
    print("SPECIAL CHECK: Services endpoint variations")
    print("=" * 80)

    service_variations = [
        "/api/v1/services",
        "/api/v1/services/",
        "/api/v1/service",
        "/api/v1/service/",
    ]

    for endpoint in service_variations:
        status, _ = test_endpoint(PRODUCTION_URL, endpoint, "GET")
        print(f"  {endpoint} -> Status: {status}")


if __name__ == "__main__":
    main()
