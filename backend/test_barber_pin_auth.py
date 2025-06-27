#!/usr/bin/env python3
"""
Test script for barber PIN authentication flow
Tests all aspects of the PIN authentication system including:
- PIN setup
- PIN login
- Account lockout
- Session management
- Frontend integration verification
"""

import requests
import json
import time
from datetime import datetime
import sys
import os

# Base configuration
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
API_PREFIX = "/api/v1"

# Test configuration
TEST_BARBER_ID = 1  # Assuming barber with ID 1 exists
TEST_PIN = "1234"
WRONG_PIN = "9999"
NEW_PIN = "5678"
ADMIN_TOKEN = "test-admin-token"  # In production, this should be a real admin token

# Color codes for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def print_test_header(test_name):
    """Print a formatted test header"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}Testing: {test_name}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")


def print_result(success, message, details=None):
    """Print test result with color coding"""
    color = GREEN if success else RED
    status = "✓ PASS" if success else "✗ FAIL"
    print(f"{color}{status}: {message}{RESET}")
    if details:
        print(f"  {YELLOW}Details: {details}{RESET}")


def make_request(method, endpoint, data=None, headers=None):
    """Make HTTP request and return response"""
    url = f"{BASE_URL}{API_PREFIX}{endpoint}"

    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=30)
        elif method == "PUT":
            response = requests.put(url, json=data, headers=headers, timeout=30)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=30)

        return response
    except requests.exceptions.ConnectionError:
        print(f"{RED}Error: Cannot connect to API at {BASE_URL}{RESET}")
        print(f"{YELLOW}Make sure the backend server is running{RESET}")
        sys.exit(1)


def test_pin_status():
    """Test 1: Check PIN status for barber"""
    print_test_header("PIN Status Check")

    response = make_request("GET", f"/barber-pin/status/{TEST_BARBER_ID}")

    if response.status_code == 200:
        data = response.json()
        print_result(True, "Successfully retrieved PIN status", f"{data}")
        return data
    else:
        print_result(
            False, f"Failed to get PIN status: {response.status_code}", response.text
        )
        return None


def test_pin_setup():
    """Test 2: Set up PIN for barber"""
    print_test_header("PIN Setup")

    data = {"barber_id": TEST_BARBER_ID, "pin": TEST_PIN}

    response = make_request("POST", "/barber-pin/setup", data)

    if response.status_code == 200:
        result = response.json()
        print_result(True, "PIN setup successful", result.get("message"))
        return True
    else:
        print_result(False, f"PIN setup failed: {response.status_code}", response.text)
        return False


def test_pin_authentication_success():
    """Test 3: Test successful PIN authentication"""
    print_test_header("PIN Authentication - Success Case")

    data = {
        "barber_id": TEST_BARBER_ID,
        "pin": TEST_PIN,
        "device_info": "Test Script - Python",
    }

    response = make_request("POST", "/barber-pin/authenticate", data)

    if response.status_code == 200:
        result = response.json()
        if result.get("success"):
            print_result(True, "PIN authentication successful")
            print(
                f"  {GREEN}Session Token: {result.get('session_token')[:20]}...{RESET}"
            )
            print(f"  {GREEN}Expires At: {result.get('expires_at')}{RESET}")
            return result.get("session_token")
        else:
            print_result(False, "Authentication failed", result.get("message"))
            return None
    else:
        print_result(
            False,
            f"Authentication request failed: {response.status_code}",
            response.text,
        )
        return None


def test_pin_authentication_failure():
    """Test 4: Test failed PIN authentication"""
    print_test_header("PIN Authentication - Failure Case")

    data = {
        "barber_id": TEST_BARBER_ID,
        "pin": WRONG_PIN,
        "device_info": "Test Script - Python",
    }

    response = make_request("POST", "/barber-pin/authenticate", data)

    if response.status_code == 200:
        result = response.json()
        if not result.get("success"):
            print_result(True, "Correctly rejected wrong PIN", result.get("message"))
            return True
        else:
            print_result(False, "Wrong PIN was accepted!")
            return False
    else:
        print_result(
            False, f"Unexpected response: {response.status_code}", response.text
        )
        return False


def test_account_lockout():
    """Test 5: Test account lockout after multiple failed attempts"""
    print_test_header("Account Lockout Test")

    print(f"{YELLOW}Attempting multiple failed logins to trigger lockout...{RESET}")

    for i in range(6):  # MAX_PIN_ATTEMPTS is 5
        data = {
            "barber_id": TEST_BARBER_ID,
            "pin": WRONG_PIN,
            "device_info": "Test Script - Lockout Test",
        }

        response = make_request("POST", "/barber-pin/authenticate", data)
        result = response.json() if response.status_code == 200 else {}

        print(f"  Attempt {i+1}: {result.get('message', 'No message')}")

        if "locked" in result.get("message", "").lower():
            print_result(True, f"Account locked after {i+1} attempts")
            return True

        time.sleep(0.5)  # Small delay between attempts

    print_result(False, "Account was not locked after max attempts")
    return False


def test_session_validation(session_token):
    """Test 6: Validate session token"""
    print_test_header("Session Validation")

    if not session_token:
        print_result(False, "No session token available for testing")
        return False

    data = {"session_token": session_token}

    response = make_request("POST", "/barber-pin/validate-session", data)

    if response.status_code == 200:
        result = response.json()
        if result.get("valid"):
            print_result(True, "Session is valid")
            print(f"  Barber ID: {result.get('barber_id')}")
            print(f"  Expires At: {result.get('expires_at')}")
            return True
        else:
            print_result(False, "Session is invalid")
            return False
    else:
        print_result(
            False, f"Session validation failed: {response.status_code}", response.text
        )
        return False


def test_session_extension(session_token):
    """Test 7: Extend session duration"""
    print_test_header("Session Extension")

    if not session_token:
        print_result(False, "No session token available for testing")
        return False

    data = {"session_token": session_token, "hours": 2}

    response = make_request("POST", "/barber-pin/extend-session", data)

    if response.status_code == 200:
        result = response.json()
        print_result(True, "Session extended successfully", result.get("message"))
        return True
    else:
        print_result(
            False, f"Session extension failed: {response.status_code}", response.text
        )
        return False


def test_active_sessions():
    """Test 8: Get active sessions for barber"""
    print_test_header("Active Sessions List")

    response = make_request("GET", f"/barber-pin/sessions/{TEST_BARBER_ID}")

    if response.status_code == 200:
        result = response.json()
        print_result(True, f"Retrieved {result.get('count', 0)} active sessions")
        for i, session in enumerate(result.get("sessions", [])):
            print(
                f"  Session {i+1}: {session.get('device_info')} - Created: {session.get('created_at')}"
            )
        return True
    else:
        print_result(
            False, f"Failed to get sessions: {response.status_code}", response.text
        )
        return False


def test_pin_change(session_token):
    """Test 9: Change PIN"""
    print_test_header("PIN Change")

    data = {"barber_id": TEST_BARBER_ID, "current_pin": TEST_PIN, "new_pin": NEW_PIN}

    response = make_request("POST", "/barber-pin/change", data)

    if response.status_code == 200:
        result = response.json()
        if result.get("success"):
            print_result(True, "PIN changed successfully", result.get("message"))
            return True
        else:
            print_result(False, "PIN change failed", result.get("message"))
            return False
    else:
        print_result(
            False, f"PIN change request failed: {response.status_code}", response.text
        )
        return False


def test_session_logout(session_token):
    """Test 10: Logout from session"""
    print_test_header("Session Logout")

    if not session_token:
        print_result(False, "No session token available for testing")
        return False

    data = {"session_token": session_token}

    response = make_request("POST", "/barber-pin/logout", data)

    if response.status_code == 200:
        result = response.json()
        print_result(True, "Logged out successfully", result.get("message"))
        return True
    else:
        print_result(False, f"Logout failed: {response.status_code}", response.text)
        return False


def test_reset_pin_attempts():
    """Test 11: Reset PIN attempts (admin function)"""
    print_test_header("Reset PIN Attempts (Admin)")

    data = {"barber_id": TEST_BARBER_ID, "admin_token": ADMIN_TOKEN}

    response = make_request("POST", "/barber-pin/reset", data)

    if response.status_code == 200:
        result = response.json()
        print_result(True, "PIN attempts reset successfully", result.get("message"))
        return True
    else:
        print_result(False, f"Reset failed: {response.status_code}", response.text)
        return False


def test_frontend_integration():
    """Test 12: Verify frontend integration endpoints"""
    print_test_header("Frontend Integration Verification")

    # Test POS access verification endpoint
    print("\nTesting POS access verification endpoint...")

    # First get a valid session token
    data = {
        "barber_id": TEST_BARBER_ID,
        "pin": NEW_PIN,  # Using the new PIN from previous test
        "device_info": "Frontend Integration Test",
    }

    response = make_request("POST", "/barber-pin/authenticate", data)

    if response.status_code == 200 and response.json().get("success"):
        session_token = response.json().get("session_token")

        # Test the verify-access endpoint
        headers = {"Authorization": f"Bearer {session_token}"}

        response = make_request("GET", "/barber-pin/verify-access", headers=headers)

        if response.status_code == 200:
            result = response.json()
            print_result(
                True,
                "POS access verification working",
                f"Authorized: {result.get('authorized')}, Barber ID: {result.get('barber_id')}",
            )
            return True
        else:
            print_result(
                False,
                f"POS access verification failed: {response.status_code}",
                response.text,
            )
            return False
    else:
        print_result(False, "Could not get session token for frontend test")
        return False


def run_all_tests():
    """Run all PIN authentication tests"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}BARBER PIN AUTHENTICATION TEST SUITE{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    print(f"API Base URL: {BASE_URL}")
    print(f"Test Barber ID: {TEST_BARBER_ID}")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Track test results
    results = {"total": 0, "passed": 0, "failed": 0}

    # Run tests in sequence
    tests = [
        ("PIN Status Check", test_pin_status),
        ("PIN Setup", test_pin_setup),
        ("PIN Authentication Success", test_pin_authentication_success),
        ("PIN Authentication Failure", test_pin_authentication_failure),
        ("Account Lockout", test_account_lockout),
        ("Reset PIN Attempts", test_reset_pin_attempts),  # Reset before continuing
    ]

    session_token = None

    # Run initial tests
    for test_name, test_func in tests:
        results["total"] += 1

        if test_name == "PIN Authentication Success":
            session_token = test_func()
            if session_token:
                results["passed"] += 1
            else:
                results["failed"] += 1
        else:
            if test_func():
                results["passed"] += 1
            else:
                results["failed"] += 1

        time.sleep(0.5)  # Small delay between tests

    # Run session-dependent tests
    if session_token:
        session_tests = [
            ("Session Validation", lambda: test_session_validation(session_token)),
            ("Session Extension", lambda: test_session_extension(session_token)),
            ("Active Sessions", test_active_sessions),
            ("PIN Change", lambda: test_pin_change(session_token)),
            ("Session Logout", lambda: test_session_logout(session_token)),
        ]

        for test_name, test_func in session_tests:
            results["total"] += 1
            if test_func():
                results["passed"] += 1
            else:
                results["failed"] += 1
            time.sleep(0.5)

    # Final tests
    results["total"] += 1
    if test_frontend_integration():
        results["passed"] += 1
    else:
        results["failed"] += 1

    # Print summary
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}TEST SUMMARY{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    print(f"Total Tests: {results['total']}")
    print(f"{GREEN}Passed: {results['passed']}{RESET}")
    print(f"{RED}Failed: {results['failed']}{RESET}")

    success_rate = (
        (results["passed"] / results["total"] * 100) if results["total"] > 0 else 0
    )
    color = GREEN if success_rate >= 80 else YELLOW if success_rate >= 60 else RED
    print(f"{color}Success Rate: {success_rate:.1f}%{RESET}")

    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


def test_with_curl():
    """Print curl commands for manual testing"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}CURL COMMANDS FOR MANUAL TESTING{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")

    print("\n1. Check PIN Status:")
    print(f"   curl -X GET {BASE_URL}{API_PREFIX}/barber-pin/status/{TEST_BARBER_ID}")

    print("\n2. Setup PIN:")
    print(
        f"""   curl -X POST {BASE_URL}{API_PREFIX}/barber-pin/setup \\
        -H "Content-Type: application/json" \\
        -d '{{"barber_id": {TEST_BARBER_ID}, "pin": "{TEST_PIN}"}}'"""
    )

    print("\n3. Authenticate with PIN:")
    print(
        f"""   curl -X POST {BASE_URL}{API_PREFIX}/barber-pin/authenticate \\
        -H "Content-Type: application/json" \\
        -d '{{"barber_id": {TEST_BARBER_ID}, "pin": "{TEST_PIN}", "device_info": "curl test"}}'"""
    )

    print("\n4. Validate Session (replace SESSION_TOKEN):")
    print(
        f"""   curl -X POST {BASE_URL}{API_PREFIX}/barber-pin/validate-session \\
        -H "Content-Type: application/json" \\
        -d '{{"session_token": "SESSION_TOKEN"}}'"""
    )

    print("\n5. Verify POS Access (replace SESSION_TOKEN):")
    print(
        f"""   curl -X GET {BASE_URL}{API_PREFIX}/barber-pin/verify-access \\
        -H "Authorization: Bearer SESSION_TOKEN" """
    )


if __name__ == "__main__":
    # Check if we should run tests or just print curl commands
    if len(sys.argv) > 1 and sys.argv[1] == "--curl":
        test_with_curl()
    else:
        try:
            run_all_tests()
        except KeyboardInterrupt:
            print(f"\n{YELLOW}Tests interrupted by user{RESET}")
        except Exception as e:
            print(f"\n{RED}Unexpected error: {e}{RESET}")
            import traceback

            traceback.print_exc()

        # Always print curl commands at the end
        print("\n" + "=" * 60)
        print("To see curl commands for manual testing, run:")
        print(f"  python {sys.argv[0]} --curl")
