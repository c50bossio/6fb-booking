#!/usr/bin/env python3
"""
Frontend Deployment Monitoring Script
Monitors the deployment status of the 6FB frontend on Render
"""

import time
import requests
import sys
from datetime import datetime
from typing import Dict, List, Tuple

# Configuration
FRONTEND_URL = "https://6fb-booking-frontend.onrender.com"
BACKEND_URL = "https://sixfb-backend.onrender.com"
CHECK_INTERVAL = 10  # seconds
MAX_WAIT_TIME = 600  # 10 minutes

# Color codes for terminal output
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
RESET = "\033[0m"


def print_status(message: str, status: str = "info"):
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


def check_url(url: str, timeout: int = 5) -> Tuple[bool, int, str]:
    """Check if a URL is accessible"""
    try:
        response = requests.get(url, timeout=timeout, allow_redirects=True)
        return True, response.status_code, "OK"
    except requests.exceptions.Timeout:
        return False, 0, "Timeout"
    except requests.exceptions.ConnectionError:
        return False, 0, "Connection Error"
    except Exception as e:
        return False, 0, str(e)


def check_frontend_health() -> Dict[str, any]:
    """Comprehensive frontend health check"""
    results = {
        "accessible": False,
        "pages": {},
        "api_connectivity": False,
        "performance": {},
        "errors": [],
    }

    # Check main page
    print_status("Checking frontend accessibility...", "info")
    accessible, status_code, message = check_url(FRONTEND_URL)
    results["accessible"] = accessible

    if accessible:
        print_status(f"Frontend is accessible (Status: {status_code})", "success")

        # Check critical pages
        pages_to_check = [
            ("Home", "/"),
            ("Login", "/login"),
            ("Register", "/register"),
            ("Reset Password", "/reset-password"),
            ("Locations", "/locations"),
            ("Dashboard", "/dashboard"),
            ("Booking", "/book"),
        ]

        print_status("Checking critical pages...", "info")
        for page_name, path in pages_to_check:
            url = f"{FRONTEND_URL}{path}"
            page_accessible, page_status, page_message = check_url(url)
            results["pages"][page_name] = {
                "accessible": page_accessible,
                "status_code": page_status,
                "message": page_message,
            }

            if page_accessible:
                print_status(
                    f"  {page_name}: {GREEN}OK{RESET} (Status: {page_status})",
                    "success",
                )
            else:
                print_status(
                    f"  {page_name}: {RED}Failed{RESET} ({page_message})", "error"
                )
                results["errors"].append(
                    f"{page_name} page not accessible: {page_message}"
                )

        # Check API connectivity
        print_status("Checking API connectivity...", "info")
        api_check_url = f"{BACKEND_URL}/health"
        api_accessible, api_status, api_message = check_url(api_check_url)
        results["api_connectivity"] = api_accessible

        if api_accessible:
            print_status(f"API connectivity: {GREEN}OK{RESET}", "success")
        else:
            print_status(
                f"API connectivity: {RED}Failed{RESET} ({api_message})", "error"
            )
            results["errors"].append(f"Cannot connect to API: {api_message}")

        # Performance check
        print_status("Checking performance metrics...", "info")
        start_time = time.time()
        perf_check, _, _ = check_url(FRONTEND_URL)
        load_time = time.time() - start_time

        results["performance"]["home_page_load_time"] = round(load_time, 2)

        if load_time < 2:
            print_status(
                f"  Page load time: {GREEN}{load_time:.2f}s{RESET} (Good)", "success"
            )
        elif load_time < 5:
            print_status(
                f"  Page load time: {YELLOW}{load_time:.2f}s{RESET} (Acceptable)",
                "warning",
            )
        else:
            print_status(
                f"  Page load time: {RED}{load_time:.2f}s{RESET} (Slow)", "error"
            )
            results["errors"].append(f"Slow page load time: {load_time:.2f}s")

    else:
        print_status(f"Frontend not accessible: {message}", "error")
        results["errors"].append(f"Frontend not accessible: {message}")

    return results


def wait_for_deployment():
    """Wait for frontend deployment to complete"""
    print_status(f"Monitoring frontend deployment at {FRONTEND_URL}", "info")
    print_status(
        f"Will check every {CHECK_INTERVAL} seconds for up to {MAX_WAIT_TIME/60} minutes",
        "info",
    )
    print("-" * 60)

    start_time = time.time()
    attempt = 0

    while time.time() - start_time < MAX_WAIT_TIME:
        attempt += 1
        print_status(f"Attempt {attempt}...", "info")

        results = check_frontend_health()

        if results["accessible"] and len(results["errors"]) == 0:
            print("-" * 60)
            print_status("Frontend deployment successful! 🎉", "success")
            print_status(f"Frontend URL: {GREEN}{FRONTEND_URL}{RESET}", "success")
            print_status(
                f"Total deployment time: {(time.time() - start_time)/60:.1f} minutes",
                "info",
            )

            # Print summary
            print("\nDeployment Summary:")
            print(f"  - All pages accessible: {GREEN}✓{RESET}")
            print(f"  - API connectivity: {GREEN}✓{RESET}")
            print(
                f"  - Performance: {GREEN}Good{RESET} ({results['performance']['home_page_load_time']}s load time)"
            )

            return True

        elif results["accessible"]:
            print_status(
                f"Frontend is up but has issues: {len(results['errors'])} error(s)",
                "warning",
            )
            for error in results["errors"]:
                print(f"  - {error}")

        else:
            print_status("Frontend not yet accessible, waiting...", "warning")

        if time.time() - start_time < MAX_WAIT_TIME:
            print_status(
                f"Waiting {CHECK_INTERVAL} seconds before next check...\n", "info"
            )
            time.sleep(CHECK_INTERVAL)

    print("-" * 60)
    print_status("Deployment monitoring timed out!", "error")
    print_status(
        f"Frontend did not become fully accessible within {MAX_WAIT_TIME/60} minutes",
        "error",
    )
    return False


def run_post_deployment_tests():
    """Run comprehensive tests after deployment"""
    print("\n" + "=" * 60)
    print_status("Running post-deployment tests...", "info")
    print("=" * 60)

    test_results = []

    # Test 1: Frontend static assets
    print_status("Test 1: Checking static assets...", "info")
    static_check, status, _ = check_url(f"{FRONTEND_URL}/_next/static/")
    if status == 404:  # This is expected for directory listing
        test_results.append(
            ("Static assets", True, "Static assets configured correctly")
        )
        print_status("  Static assets: {GREEN}Pass{RESET}", "success")
    else:
        test_results.append(
            ("Static assets", False, "Unexpected static assets configuration")
        )
        print_status("  Static assets: {RED}Fail{RESET}", "error")

    # Test 2: API endpoint accessibility from frontend
    print_status("Test 2: Testing API endpoints...", "info")
    api_endpoints = [
        ("/health", "Health check"),
        ("/docs", "API documentation"),
        ("/api/v1/services", "Services endpoint"),
    ]

    for endpoint, description in api_endpoints:
        url = f"{BACKEND_URL}{endpoint}"
        accessible, status, message = check_url(url)
        if accessible:
            test_results.append((description, True, f"Status {status}"))
            print_status(
                f"  {description}: {GREEN}Pass{RESET} (Status {status})", "success"
            )
        else:
            test_results.append((description, False, message))
            print_status(f"  {description}: {RED}Fail{RESET} ({message})", "error")

    # Test 3: Response headers
    print_status("Test 3: Checking response headers...", "info")
    try:
        response = requests.get(FRONTEND_URL, timeout=5)
        headers = response.headers

        # Check for important headers
        important_headers = {
            "x-powered-by": "Should be hidden",
            "strict-transport-security": "HSTS should be enabled",
            "x-content-type-options": "Should be 'nosniff'",
        }

        for header, expectation in important_headers.items():
            if header in headers:
                print_status(f"  {header}: Present ({expectation})", "info")
            else:
                print_status(f"  {header}: Missing ({expectation})", "warning")
    except:
        print_status("  Could not check headers", "warning")

    # Print test summary
    print("\n" + "=" * 60)
    print("Test Summary:")
    print("=" * 60)

    passed = sum(1 for _, result, _ in test_results if result)
    total = len(test_results)

    for test_name, result, message in test_results:
        status = f"{GREEN}PASS{RESET}" if result else f"{RED}FAIL{RESET}"
        print(f"{test_name}: {status} - {message}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print_status("All tests passed! 🎉", "success")
    else:
        print_status(f"{total - passed} test(s) failed", "error")


def main():
    """Main monitoring function"""
    print("=" * 60)
    print(f"{BLUE}6FB Frontend Deployment Monitor{RESET}")
    print("=" * 60)

    # First, check if backend is running
    print_status("Checking backend availability...", "info")
    backend_available, backend_status, backend_message = check_url(
        f"{BACKEND_URL}/health"
    )

    if not backend_available:
        print_status(f"Backend is not available at {BACKEND_URL}", "error")
        print_status(
            "Please ensure the backend is deployed and running first!", "error"
        )
        sys.exit(1)

    print_status(f"Backend is available (Status: {backend_status})", "success")

    # Monitor frontend deployment
    deployment_successful = wait_for_deployment()

    if deployment_successful:
        # Run post-deployment tests
        run_post_deployment_tests()

        print("\n" + "=" * 60)
        print_status("Deployment monitoring complete!", "success")
        print("=" * 60)
        print(f"\nYour frontend is now live at: {GREEN}{FRONTEND_URL}{RESET}")
        print(f"Backend API is available at: {GREEN}{BACKEND_URL}{RESET}")
        print(f"\nNext steps:")
        print(f"  1. Visit {FRONTEND_URL} and test the application")
        print(f"  2. Try logging in with your test credentials")
        print(f"  3. Test the booking flow")
        print(f"  4. Check browser console for any errors")
        print(f"  5. Monitor Render dashboard for any issues")
    else:
        print_status("Deployment monitoring failed or timed out", "error")
        print("\nTroubleshooting steps:")
        print("  1. Check Render dashboard for build/deploy logs")
        print("  2. Verify all environment variables are set correctly")
        print("  3. Check if the build command succeeded")
        print("  4. Look for any error messages in the logs")
        print("  5. Try manually deploying from Render dashboard")
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n")
        print_status("Monitoring interrupted by user", "warning")
        sys.exit(0)
    except Exception as e:
        print_status(f"Unexpected error: {e}", "error")
        sys.exit(1)
