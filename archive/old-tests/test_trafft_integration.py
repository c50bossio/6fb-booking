#!/usr/bin/env python3
"""
Test Trafft Integration Endpoints
The system appears to be integrated with Trafft for appointment booking
"""

import requests
import json
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional

# Production API URL
API_BASE_URL = "https://sixfb-backend.onrender.com"

# Admin credentials
ADMIN_EMAIL = "admin@6fb.com"
ADMIN_PASSWORD = "admin123"


class TraffitIntegrationTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.auth_token = None
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def log_response(self, response: requests.Response, description: str = ""):
        """Log response details"""
        print(f"\n{'='*60}")
        if description:
            print(f"📍 {description}")
        print(f"Status: {response.status_code}")
        try:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
        except:
            print(f"Response: {response.text[:500]}")
        print(f"{'='*60}\n")

    def authenticate(self) -> bool:
        """Authenticate and get JWT token"""
        print("\n🔐 AUTHENTICATING")
        url = f"{self.base_url}/api/v1/auth/token"
        data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}

        response = self.session.post(
            url, data=data, headers={"Accept": "application/json"}
        )

        if response.status_code == 200:
            result = response.json()
            self.auth_token = result.get("access_token")
            self.headers["Authorization"] = f"Bearer {self.auth_token}"
            print("✅ Authentication successful!")
            return True
        else:
            print("❌ Authentication failed!")
            return False

    def test_trafft_endpoints(self):
        """Test Trafft integration endpoints"""
        print("🚀 TESTING TRAFFT INTEGRATION")
        print(f"API URL: {self.base_url}")
        print(f"Time: {datetime.now().isoformat()}\n")

        # Authenticate first
        if not self.authenticate():
            print("Cannot proceed without authentication")
            return

        # Test Trafft endpoints
        endpoints = [
            ("GET", "/api/trafft/status", "Trafft Status"),
            ("GET", "/api/trafft/health", "Trafft Health"),
            ("GET", "/api/trafft/services", "Trafft Services"),
            ("GET", "/api/trafft/employees", "Trafft Employees"),
            ("GET", "/api/trafft/customers", "Trafft Customers"),
            ("GET", "/api/trafft/appointments/recent", "Recent Appointments"),
            ("GET", "/api/trafft/sync/history", "Sync History"),
            ("GET", "/api/trafft/reports/revenue", "Revenue Report"),
        ]

        results = []

        for method, path, description in endpoints:
            url = f"{self.base_url}{path}"
            print(f"\n📋 Testing: {description}")
            print(f"{method} {url}")

            try:
                if method == "GET":
                    response = self.session.get(url, headers=self.headers, timeout=10)
                else:
                    response = self.session.post(url, headers=self.headers, timeout=10)

                self.log_response(response, description)

                results.append(
                    {
                        "endpoint": path,
                        "description": description,
                        "status": response.status_code,
                        "success": response.status_code == 200,
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

        # Generate summary
        self.generate_summary(results)

    def generate_summary(self, results: List[Dict]):
        """Generate test summary"""
        print(f"\n{'='*60}")
        print("SUMMARY")
        print(f"{'='*60}")

        successful = [r for r in results if r["success"]]
        failed = [r for r in results if not r["success"]]

        print(f"\n✅ Successful endpoints ({len(successful)}):")
        for r in successful:
            print(f"  - {r['endpoint']} ({r['description']})")

        print(f"\n❌ Failed endpoints ({len(failed)}):")
        for r in failed:
            print(f"  - {r['endpoint']} ({r['description']}) - Status: {r['status']}")

        # Create documentation
        doc = f"""
# Trafft Integration API Documentation
Generated: {datetime.now().isoformat()}
Base URL: {self.base_url}

## Overview
The 6FB platform appears to be integrated with Trafft for appointment management.

## Available Endpoints

### Status & Health
- GET /api/trafft/status - Check integration status
- GET /api/trafft/health - Health check for Trafft connection

### Data Endpoints
- GET /api/trafft/services - List available services
- GET /api/trafft/employees - List employees (barbers)
- GET /api/trafft/customers - List customers
- GET /api/trafft/appointments/recent - Recent appointments

### Sync & Reports
- GET /api/trafft/sync/history - Sync operation history
- POST /api/trafft/sync/initial - Initial sync
- POST /api/trafft/sync/manual - Manual sync
- GET /api/trafft/reports/revenue - Revenue reports

### Connection Management
- POST /api/trafft/connect - Connect to Trafft
- POST /api/trafft/disconnect - Disconnect from Trafft

### Webhooks
- POST /api/trafft/webhooks/register - Register webhooks
- GET /api/trafft/webhooks/status - Webhook status

## Test Results
- Total endpoints tested: {len(results)}
- Successful: {len(successful)}
- Failed: {len(failed)}

## Notes
- All endpoints require authentication
- The system uses Trafft as the appointment booking backend
- Direct appointment creation may need to go through Trafft API
"""

        with open("TRAFFT_INTEGRATION_DOCUMENTATION.md", "w") as f:
            f.write(doc)
        print(f"\n📄 Documentation saved to: TRAFFT_INTEGRATION_DOCUMENTATION.md")


def main():
    """Run the test"""
    tester = TraffitIntegrationTester(API_BASE_URL)

    try:
        tester.test_trafft_endpoints()
        print("\n✅ TEST COMPLETE!")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
