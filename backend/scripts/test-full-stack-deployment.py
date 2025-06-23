#!/usr/bin/env python3
"""
Full Stack Deployment Test Script
Tests the complete 6FB platform after deployment to Render
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, List, Optional

# Configuration
FRONTEND_URL = "https://6fb-booking-frontend.onrender.com"
BACKEND_URL = "https://sixfb-backend.onrender.com"
API_BASE = f"{BACKEND_URL}/api/v1"

# Test credentials (update these based on your setup)
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "testpassword123"

# Color codes
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
RESET = "\033[0m"


class FullStackTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.auth_token = None

    def print_status(self, message: str, status: str = "info"):
        """Print colored status messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        if status == "success":
            print(f"{GREEN}[{timestamp}] ✓ {message}{RESET}")
        elif status == "error":
            print(f"{RED}[{timestamp}] ✗ {message}{RESET}")
        elif status == "warning":
            print(f"{YELLOW}[{timestamp}] ⚠ {message}{RESET}")
        else:
            print(f"{BLUE}[{timestamp}] ℹ {message}{RESET}")

    def add_result(self, test_name: str, passed: bool, message: str):
        """Add test result"""
        self.test_results.append(
            {"name": test_name, "passed": passed, "message": message}
        )

    def test_frontend_pages(self):
        """Test frontend page accessibility"""
        self.print_status("Testing frontend pages...", "info")

        pages = [
            ("/", "Homepage"),
            ("/login", "Login page"),
            ("/register", "Registration page"),
            ("/locations", "Locations page"),
            ("/book", "Booking page"),
            ("/dashboard", "Dashboard (redirect expected)"),
        ]

        for path, name in pages:
            try:
                url = f"{FRONTEND_URL}{path}"
                response = self.session.get(url, timeout=10)

                if response.status_code in [200, 301, 302]:
                    self.print_status(
                        f"  {name}: Accessible (Status: {response.status_code})",
                        "success",
                    )
                    self.add_result(
                        f"Frontend - {name}",
                        True,
                        f"Status code: {response.status_code}",
                    )
                else:
                    self.print_status(
                        f"  {name}: Unexpected status ({response.status_code})",
                        "warning",
                    )
                    self.add_result(
                        f"Frontend - {name}",
                        False,
                        f"Unexpected status: {response.status_code}",
                    )

            except Exception as e:
                self.print_status(f"  {name}: Failed ({str(e)})", "error")
                self.add_result(f"Frontend - {name}", False, str(e))

    def test_api_endpoints(self):
        """Test API endpoint accessibility"""
        self.print_status("Testing API endpoints...", "info")

        endpoints = [
            ("GET", "/health", "Health check", None),
            ("GET", "/docs", "API documentation", None),
            ("GET", "/api/v1/services", "Services list", None),
            ("GET", "/api/v1/locations", "Locations list", None),
        ]

        for method, path, name, data in endpoints:
            try:
                url = f"{BACKEND_URL}{path}"

                if method == "GET":
                    response = self.session.get(url, timeout=10)
                else:
                    response = self.session.post(url, json=data, timeout=10)

                if response.status_code in [200, 201]:
                    self.print_status(
                        f"  {name}: Success (Status: {response.status_code})", "success"
                    )
                    self.add_result(
                        f"API - {name}", True, f"Status code: {response.status_code}"
                    )
                else:
                    self.print_status(
                        f"  {name}: Failed (Status: {response.status_code})", "error"
                    )
                    self.add_result(
                        f"API - {name}", False, f"Status code: {response.status_code}"
                    )

            except Exception as e:
                self.print_status(f"  {name}: Error ({str(e)})", "error")
                self.add_result(f"API - {name}", False, str(e))

    def test_cors(self):
        """Test CORS configuration"""
        self.print_status("Testing CORS configuration...", "info")

        try:
            # Test preflight request
            headers = {
                "Origin": FRONTEND_URL,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            }

            response = requests.options(
                f"{API_BASE}/auth/login", headers=headers, timeout=10
            )

            if response.status_code == 200:
                cors_headers = {
                    "Access-Control-Allow-Origin": response.headers.get(
                        "Access-Control-Allow-Origin"
                    ),
                    "Access-Control-Allow-Methods": response.headers.get(
                        "Access-Control-Allow-Methods"
                    ),
                    "Access-Control-Allow-Headers": response.headers.get(
                        "Access-Control-Allow-Headers"
                    ),
                }

                if cors_headers["Access-Control-Allow-Origin"]:
                    self.print_status(
                        f"  CORS enabled for: {cors_headers['Access-Control-Allow-Origin']}",
                        "success",
                    )
                    self.add_result(
                        "CORS Configuration", True, "CORS properly configured"
                    )
                else:
                    self.print_status("  CORS headers missing", "error")
                    self.add_result(
                        "CORS Configuration", False, "CORS headers not found"
                    )
            else:
                self.print_status(
                    f"  CORS preflight failed (Status: {response.status_code})", "error"
                )
                self.add_result(
                    "CORS Configuration",
                    False,
                    f"Preflight status: {response.status_code}",
                )

        except Exception as e:
            self.print_status(f"  CORS test failed: {str(e)}", "error")
            self.add_result("CORS Configuration", False, str(e))

    def test_auth_flow(self):
        """Test authentication flow"""
        self.print_status("Testing authentication flow...", "info")

        # Test registration (optional)
        # self.test_registration()

        # Test login
        try:
            login_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD}

            response = self.session.post(
                f"{API_BASE}/auth/login", json=login_data, timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.auth_token = data["access_token"]
                    self.session.headers.update(
                        {"Authorization": f"Bearer {self.auth_token}"}
                    )
                    self.print_status("  Login successful", "success")
                    self.add_result("Authentication - Login", True, "Login successful")
                else:
                    self.print_status("  Login response missing token", "error")
                    self.add_result(
                        "Authentication - Login", False, "No access token in response"
                    )
            else:
                self.print_status(
                    f"  Login failed (Status: {response.status_code})", "error"
                )
                self.add_result(
                    "Authentication - Login", False, f"Status: {response.status_code}"
                )

        except Exception as e:
            self.print_status(f"  Login test failed: {str(e)}", "error")
            self.add_result("Authentication - Login", False, str(e))

    def test_booking_flow(self):
        """Test booking flow"""
        self.print_status("Testing booking flow...", "info")

        # Test service listing
        try:
            response = self.session.get(f"{API_BASE}/services", timeout=10)

            if response.status_code == 200:
                services = response.json()
                self.print_status(f"  Services available: {len(services)}", "success")
                self.add_result(
                    "Booking - Service List", True, f"{len(services)} services found"
                )
            else:
                self.print_status(
                    f"  Service listing failed (Status: {response.status_code})",
                    "error",
                )
                self.add_result(
                    "Booking - Service List", False, f"Status: {response.status_code}"
                )

        except Exception as e:
            self.print_status(f"  Service test failed: {str(e)}", "error")
            self.add_result("Booking - Service List", False, str(e))

        # Test availability check
        try:
            # Get tomorrow's date
            from datetime import datetime, timedelta

            tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

            response = self.session.get(
                f"{API_BASE}/appointments/availability",
                params={"date": tomorrow},
                timeout=10,
            )

            if response.status_code == 200:
                self.print_status("  Availability check successful", "success")
                self.add_result(
                    "Booking - Availability", True, "Availability endpoint working"
                )
            else:
                self.print_status(
                    f"  Availability check failed (Status: {response.status_code})",
                    "error",
                )
                self.add_result(
                    "Booking - Availability", False, f"Status: {response.status_code}"
                )

        except Exception as e:
            self.print_status(f"  Availability test failed: {str(e)}", "error")
            self.add_result("Booking - Availability", False, str(e))

    def test_performance(self):
        """Test performance metrics"""
        self.print_status("Testing performance metrics...", "info")

        # Test frontend load time
        start_time = time.time()
        try:
            response = self.session.get(FRONTEND_URL, timeout=10)
            load_time = time.time() - start_time

            if load_time < 2:
                self.print_status(
                    f"  Frontend load time: {load_time:.2f}s (Excellent)", "success"
                )
                self.add_result(
                    "Performance - Frontend Load", True, f"{load_time:.2f}s"
                )
            elif load_time < 5:
                self.print_status(
                    f"  Frontend load time: {load_time:.2f}s (Good)", "warning"
                )
                self.add_result(
                    "Performance - Frontend Load", True, f"{load_time:.2f}s"
                )
            else:
                self.print_status(
                    f"  Frontend load time: {load_time:.2f}s (Slow)", "error"
                )
                self.add_result(
                    "Performance - Frontend Load", False, f"{load_time:.2f}s - Too slow"
                )

        except Exception as e:
            self.print_status(f"  Frontend performance test failed: {str(e)}", "error")
            self.add_result("Performance - Frontend Load", False, str(e))

        # Test API response time
        start_time = time.time()
        try:
            response = self.session.get(f"{BACKEND_URL}/health", timeout=10)
            api_time = time.time() - start_time

            if api_time < 0.5:
                self.print_status(
                    f"  API response time: {api_time:.2f}s (Excellent)", "success"
                )
                self.add_result("Performance - API Response", True, f"{api_time:.2f}s")
            elif api_time < 1:
                self.print_status(
                    f"  API response time: {api_time:.2f}s (Good)", "warning"
                )
                self.add_result("Performance - API Response", True, f"{api_time:.2f}s")
            else:
                self.print_status(
                    f"  API response time: {api_time:.2f}s (Slow)", "error"
                )
                self.add_result(
                    "Performance - API Response", False, f"{api_time:.2f}s - Too slow"
                )

        except Exception as e:
            self.print_status(f"  API performance test failed: {str(e)}", "error")
            self.add_result("Performance - API Response", False, str(e))

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("Test Summary")
        print("=" * 60)

        passed = sum(1 for r in self.test_results if r["passed"])
        total = len(self.test_results)

        # Group results by category
        categories = {}
        for result in self.test_results:
            category = result["name"].split(" - ")[0]
            if category not in categories:
                categories[category] = []
            categories[category].append(result)

        # Print results by category
        for category, results in categories.items():
            print(f"\n{category}:")
            for result in results:
                status = (
                    f"{GREEN}PASS{RESET}" if result["passed"] else f"{RED}FAIL{RESET}"
                )
                test_name = (
                    result["name"].split(" - ", 1)[1]
                    if " - " in result["name"]
                    else result["name"]
                )
                print(f"  {test_name}: {status} - {result['message']}")

        # Overall summary
        print(f"\n{'-' * 60}")
        print(f"Total: {passed}/{total} tests passed")

        if passed == total:
            print(f"{GREEN}All tests passed! The deployment is successful! 🎉{RESET}")
        elif passed >= total * 0.8:
            print(f"{YELLOW}Most tests passed. Check the failures above.{RESET}")
        else:
            print(f"{RED}Many tests failed. The deployment needs attention.{RESET}")

        # Deployment URLs
        print(f"\n{'-' * 60}")
        print("Deployment URLs:")
        print(f"  Frontend: {BLUE}{FRONTEND_URL}{RESET}")
        print(f"  Backend API: {BLUE}{BACKEND_URL}{RESET}")
        print(f"  API Docs: {BLUE}{BACKEND_URL}/docs{RESET}")

        # Next steps
        print(f"\n{'-' * 60}")
        print("Next Steps:")
        print("  1. Check any failed tests above")
        print("  2. Monitor application logs in Render dashboard")
        print("  3. Test with real user accounts")
        print("  4. Set up monitoring (UptimeRobot, etc.)")
        print("  5. Configure custom domain if needed")

    def run_all_tests(self):
        """Run all tests"""
        print("=" * 60)
        print(f"{BLUE}6FB Full Stack Deployment Test{RESET}")
        print("=" * 60)
        print(f"Frontend URL: {FRONTEND_URL}")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)

        # Run test suites
        self.test_frontend_pages()
        print()

        self.test_api_endpoints()
        print()

        self.test_cors()
        print()

        self.test_auth_flow()
        print()

        self.test_booking_flow()
        print()

        self.test_performance()

        # Print summary
        self.print_summary()


def main():
    """Main function"""
    tester = FullStackTester()

    try:
        tester.run_all_tests()
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Tests interrupted by user{RESET}")
    except Exception as e:
        print(f"\n{RED}Unexpected error: {e}{RESET}")


if __name__ == "__main__":
    main()
