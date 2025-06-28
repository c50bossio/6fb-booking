#!/usr/bin/env python3
"""
Health monitoring script for Render deployment
Can be used for external monitoring or debugging
"""

import requests
import json
import sys
import time
from datetime import datetime
from typing import Dict, Any

# Configuration
BACKEND_URL = "https://sixfb-backend.onrender.com"
FRONTEND_URL = "https://sixfb-frontend.onrender.com"
TIMEOUT = 10


def check_endpoint(
    url: str, path: str = "", expected_status: int = 200
) -> Dict[str, Any]:
    """Check if an endpoint is responsive"""
    full_url = f"{url}{path}"
    start_time = time.time()

    try:
        response = requests.get(full_url, timeout=TIMEOUT)
        response_time = (time.time() - start_time) * 1000  # Convert to ms

        return {
            "url": full_url,
            "status": (
                "healthy" if response.status_code == expected_status else "unhealthy"
            ),
            "status_code": response.status_code,
            "response_time_ms": round(response_time, 2),
            "timestamp": datetime.utcnow().isoformat(),
        }
    except requests.exceptions.Timeout:
        return {
            "url": full_url,
            "status": "timeout",
            "error": f"Request timed out after {TIMEOUT}s",
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {
            "url": full_url,
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }


def main():
    """Run health checks on all services"""
    print("🏥 6FB Booking Platform Health Check")
    print("=" * 50)

    checks = [
        ("Backend API Root", BACKEND_URL, "/"),
        ("Backend Health", BACKEND_URL, "/health"),
        ("Backend Health (Detailed)", BACKEND_URL, "/api/v1/health/detailed"),
        ("Backend API Docs", BACKEND_URL, "/docs", 200),
        ("Frontend Homepage", FRONTEND_URL, "/"),
    ]

    results = []
    all_healthy = True

    for name, base_url, path, *args in checks:
        expected_status = args[0] if args else 200
        print(f"\n📍 Checking {name}...")

        result = check_endpoint(base_url, path, expected_status)
        results.append({"name": name, **result})

        if result["status"] == "healthy":
            print(f"✅ {name}: OK ({result['response_time_ms']}ms)")
        else:
            all_healthy = False
            print(f"❌ {name}: {result['status'].upper()}")
            if "error" in result:
                print(f"   Error: {result['error']}")
            elif "status_code" in result:
                print(f"   Status Code: {result['status_code']}")

    # Backend detailed health check
    print("\n📊 Detailed Backend Health:")
    detailed_health = check_endpoint(BACKEND_URL, "/api/v1/health/detailed")

    if detailed_health["status"] == "healthy":
        try:
            response = requests.get(
                f"{BACKEND_URL}/api/v1/health/detailed", timeout=TIMEOUT
            )
            health_data = response.json()

            # Print key health metrics
            if "checks" in health_data:
                for check_name, check_data in health_data["checks"].items():
                    status_icon = "✅" if check_data.get("status") == "healthy" else "⚠️"
                    print(
                        f"  {status_icon} {check_name}: {check_data.get('status', 'unknown')}"
                    )

                    if check_name == "database_tables" and "table_counts" in check_data:
                        for table, count in check_data["table_counts"].items():
                            print(f"     - {table}: {count} records")
        except Exception as e:
            print(f"  ⚠️  Could not parse detailed health data: {e}")

    # Summary
    print("\n" + "=" * 50)
    if all_healthy:
        print("✅ All services are healthy!")
        return 0
    else:
        print("❌ Some services are experiencing issues")
        print("\n📋 Failed Checks:")
        for result in results:
            if result.get("status") != "healthy":
                print(f"  - {result['name']}: {result.get('status', 'unknown')}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
