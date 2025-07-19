#!/usr/bin/env python3
"""
Check actual endpoints from OpenAPI schema
"""

import requests
import json

API_BASE_URL = "https://sixfb-backend.onrender.com"


def check_openapi_endpoints():
    """Get and analyze OpenAPI schema"""
    print("📋 FETCHING OPENAPI SCHEMA")

    response = requests.get(f"{API_BASE_URL}/openapi.json", timeout=10)

    if response.status_code == 200:
        schema = response.json()
        paths = schema.get("paths", {})

        print(f"\nFound {len(paths)} endpoints\n")

        # Group endpoints by category
        categories = {}
        for path, methods in paths.items():
            # Extract category from path
            parts = path.split("/")
            if len(parts) > 2:
                category = parts[2] if parts[1] == "api" else parts[1]
            else:
                category = "root"

            if category not in categories:
                categories[category] = []
            categories[category].append(path)

        # Print by category
        for category, endpoints in sorted(categories.items()):
            print(f"\n{'='*60}")
            print(f"📁 {category.upper()}")
            print(f"{'='*60}")
            for endpoint in sorted(endpoints):
                methods = list(paths[endpoint].keys())
                print(f"  {endpoint} [{', '.join(methods).upper()}]")

        # Look specifically for booking endpoints
        print(f"\n{'='*60}")
        print("🔍 BOOKING-RELATED ENDPOINTS")
        print(f"{'='*60}")

        booking_endpoints = []
        service_endpoints = []
        appointment_endpoints = []

        for path in paths:
            if "booking" in path.lower():
                booking_endpoints.append(path)
            if "service" in path.lower():
                service_endpoints.append(path)
            if "appointment" in path.lower():
                appointment_endpoints.append(path)

        print("\n📅 Booking Endpoints:")
        for ep in sorted(booking_endpoints):
            print(f"  {ep}")

        print("\n✂️ Service Endpoints:")
        for ep in sorted(service_endpoints):
            print(f"  {ep}")

        print("\n📆 Appointment Endpoints:")
        for ep in sorted(appointment_endpoints):
            print(f"  {ep}")

        # Save full schema
        with open("openapi_schema.json", "w") as f:
            json.dump(schema, f, indent=2)
        print("\n📄 Full schema saved to: openapi_schema.json")

        # Create a simple API reference
        create_api_reference(paths)


def create_api_reference(paths):
    """Create a simple API reference"""
    reference = "# 6FB Booking API Reference\n\n"

    # Focus on key endpoints
    key_categories = {
        "Authentication": [],
        "Locations": [],
        "Barbers": [],
        "Services": [],
        "Appointments": [],
        "Booking": [],
        "Clients": [],
    }

    for path, methods in paths.items():
        path_lower = path.lower()

        if "auth" in path_lower or "login" in path_lower or "token" in path_lower:
            key_categories["Authentication"].append((path, methods))
        elif "location" in path_lower:
            key_categories["Locations"].append((path, methods))
        elif "barber" in path_lower:
            key_categories["Barbers"].append((path, methods))
        elif "service" in path_lower:
            key_categories["Services"].append((path, methods))
        elif "appointment" in path_lower:
            key_categories["Appointments"].append((path, methods))
        elif "booking" in path_lower:
            key_categories["Booking"].append((path, methods))
        elif "client" in path_lower:
            key_categories["Clients"].append((path, methods))

    for category, endpoints in key_categories.items():
        if endpoints:
            reference += f"\n## {category}\n\n"
            for path, methods in sorted(endpoints):
                for method in methods:
                    reference += f"- **{method.upper()}** `{path}`\n"

    with open("API_REFERENCE.md", "w") as f:
        f.write(reference)
    print("📄 API reference saved to: API_REFERENCE.md")


if __name__ == "__main__":
    check_openapi_endpoints()
