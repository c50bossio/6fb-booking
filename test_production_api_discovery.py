#!/usr/bin/env python3
"""
API Discovery Test
Check what endpoints are actually available in production
"""

import requests
import json
from datetime import datetime

# Production API URL
API_BASE_URL = "https://sixfb-backend.onrender.com"


def test_api_discovery():
    """Test various endpoints to discover what's available"""
    print("🔍 PRODUCTION API DISCOVERY")
    print(f"Base URL: {API_BASE_URL}")
    print(f"Time: {datetime.now().isoformat()}\n")

    session = requests.Session()

    # Test endpoints
    endpoints = [
        # Documentation
        ("GET", "/docs", "API Documentation"),
        ("GET", "/openapi.json", "OpenAPI Schema"),
        # Health/Status
        ("GET", "/health", "Health Check"),
        ("GET", "/api/v1/health", "Health Check v1"),
        ("GET", "/api/health", "Health Check (alt)"),
        # Services
        ("GET", "/api/v1/services", "Services List"),
        ("GET", "/api/v1/services/categories", "Service Categories"),
        # Booking endpoints with correct prefix
        ("GET", "/api/v1/booking-public/shops/1/barbers", "Barbers for Shop"),
        ("GET", "/api/v1/booking-public/barbers/1/services", "Services for Barber"),
        # Alternative booking paths
        ("GET", "/api/v1/booking/public/shops/1/barbers", "Booking Public (alt)"),
        ("GET", "/api/v1/bookings/public/shops/1/barbers", "Bookings Public"),
        # Root endpoints
        ("GET", "/", "Root"),
        ("GET", "/api", "API Root"),
        ("GET", "/api/v1", "API v1 Root"),
    ]

    results = []

    for method, path, description in endpoints:
        url = f"{API_BASE_URL}{path}"
        print(f"\n{'='*60}")
        print(f"Testing: {description}")
        print(f"{method} {url}")

        try:
            if method == "GET":
                response = session.get(url, timeout=10)
            else:
                response = session.post(url, timeout=10)

            print(f"Status: {response.status_code}")

            # Show response preview
            if response.status_code == 200:
                if "json" in response.headers.get("content-type", ""):
                    try:
                        data = response.json()
                        if isinstance(data, dict) and "paths" in data:
                            # OpenAPI spec - show available paths
                            print("Available paths:")
                            paths = list(data["paths"].keys())
                            for p in sorted(paths)[:20]:  # Show first 20
                                print(f"  {p}")
                            if len(paths) > 20:
                                print(f"  ... and {len(paths)-20} more")
                        else:
                            # Regular JSON response
                            preview = json.dumps(data, indent=2)
                            if len(preview) > 500:
                                print(f"Response preview: {preview[:500]}...")
                            else:
                                print(f"Response: {preview}")
                    except:
                        print(f"Response: {response.text[:200]}...")
                else:
                    print(f"Response: {response.text[:200]}...")
            elif response.status_code == 422:
                # Validation error - show details
                try:
                    print(f"Validation Error: {json.dumps(response.json(), indent=2)}")
                except:
                    print(f"Response: {response.text[:200]}...")
            else:
                try:
                    error = response.json()
                    print(f"Error: {json.dumps(error, indent=2)}")
                except:
                    print(f"Response: {response.text[:200]}...")

            results.append(
                {
                    "endpoint": path,
                    "description": description,
                    "status": response.status_code,
                    "success": response.status_code == 200,
                }
            )

        except requests.exceptions.Timeout:
            print("Status: TIMEOUT")
            results.append(
                {
                    "endpoint": path,
                    "description": description,
                    "status": "TIMEOUT",
                    "success": False,
                }
            )
        except Exception as e:
            print(f"Error: {e}")
            results.append(
                {
                    "endpoint": path,
                    "description": description,
                    "status": "ERROR",
                    "success": False,
                }
            )

    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")

    successful = [r for r in results if r["success"]]
    print(f"\n✅ Successful endpoints ({len(successful)}):")
    for r in successful:
        print(f"  - {r['endpoint']} ({r['description']})")

    failed = [r for r in results if not r["success"]]
    print(f"\n❌ Failed endpoints ({len(failed)}):")
    for r in failed:
        print(f"  - {r['endpoint']} ({r['description']}) - Status: {r['status']}")

    # Save results
    with open("API_DISCOVERY_RESULTS.json", "w") as f:
        json.dump(results, f, indent=2)
    print("\n📄 Results saved to: API_DISCOVERY_RESULTS.json")


if __name__ == "__main__":
    test_api_discovery()
