#!/usr/bin/env python3
"""
Test script to verify API routing structure
"""

import requests
import json

BASE_URL = "http://localhost:8000"

# List of endpoints to test
endpoints = [
    {"path": "/", "method": "GET", "description": "Root endpoint"},
    {"path": "/health", "method": "GET", "description": "Health check (redirect)"},
    {"path": "/api/v1/health", "method": "GET", "description": "API health check"},
    {"path": "/api/v1/services", "method": "GET", "description": "Services list"},
    {
        "path": "/api/v1/services/categories",
        "method": "GET",
        "description": "Service categories",
    },
    {"path": "/docs", "method": "GET", "description": "API documentation"},
]

print("Testing API Routes...")
print("=" * 60)

for endpoint in endpoints:
    try:
        url = f"{BASE_URL}{endpoint['path']}"
        response = requests.request(
            endpoint["method"],
            url,
            allow_redirects=False,  # Don't follow redirects automatically
            timeout=5,
        )

        print(f"\n{endpoint['method']} {endpoint['path']}")
        print(f"Description: {endpoint['description']}")
        print(f"Status: {response.status_code}")

        if response.status_code in [301, 302, 307, 308]:
            print(f"Redirects to: {response.headers.get('Location', 'N/A')}")

        if response.status_code == 200 and response.headers.get(
            "content-type", ""
        ).startswith("application/json"):
            print(f"Response: {json.dumps(response.json(), indent=2)[:200]}...")

    except requests.exceptions.ConnectionError:
        print(f"\n{endpoint['method']} {endpoint['path']}")
        print(f"Description: {endpoint['description']}")
        print("Status: CONNECTION ERROR - Is the server running?")
    except Exception as e:
        print(f"\n{endpoint['method']} {endpoint['path']}")
        print(f"Description: {endpoint['description']}")
        print(f"Error: {str(e)}")

print("\n" + "=" * 60)
print("Route testing complete!")
