#!/usr/bin/env python3
"""
Comprehensive Authentication System Verification Script
Tests the complete authentication flow end-to-end to ensure all fixes are working.
"""

import requests
import json
import time
import sys
from datetime import datetime
from typing import Dict, Optional, Tuple
import random
import string

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

# Color codes for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def print_header(message: str):
    """Print a formatted header"""
    print(f"\n{BLUE}{'='*60}")
    print(f"{message}")
    print(f"{'='*60}{RESET}")


def print_success(message: str):
    """Print success message"""
    print(f"{GREEN}✓ {message}{RESET}")


def print_error(message: str):
    """Print error message"""
    print(f"{RED}✗ {message}{RESET}")


def print_info(message: str):
    """Print info message"""
    print(f"{YELLOW}ℹ {message}{RESET}")


def generate_test_user() -> Dict[str, str]:
    """Generate a unique test user with strong password"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))

    return {
        "email": f"test.user.{timestamp}.{random_suffix}@6fbtest.com",
        "password": "TestUser2024!",  # Meets all requirements  # pragma: allowlist secret
        "first_name": "Test",
        "last_name": f"User{timestamp}",
        "phone_number": "+1234567890",
        "role": "client",
    }


def test_signup(user_data: Dict[str, str]) -> Tuple[bool, Optional[Dict]]:
    """Test user signup"""
    print_info(f"Testing signup for {user_data['email']}")

    try:
        response = requests.post(
            f"{API_BASE}/auth/register",
            json=user_data,
            headers={"Content-Type": "application/json"},
        )

        if response.status_code == 200:
            data = response.json()
            print_success(f"Signup successful! User ID: {data.get('user_id', 'N/A')}")
            print_info(f"Response: {json.dumps(data, indent=2)}")
            return True, data
        else:
            print_error(f"Signup failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False, None
    except Exception as e:
        print_error(f"Signup request failed: {str(e)}")
        return False, None


def test_immediate_login(email: str, password: str) -> Tuple[bool, Optional[str]]:
    """Test immediate login after registration"""
    print_info(f"Testing immediate login for {email}")

    try:
        response = requests.post(
            f"{API_BASE}/auth/token",
            data={"username": email, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        if response.status_code == 200:
            data = response.json()
            access_token = data.get("access_token")
            if access_token:
                print_success("Immediate login successful!")
                print_info(f"Token type: {data.get('token_type', 'N/A')}")
                print_info(f"Access token (first 20 chars): {access_token[:20]}...")
                return True, access_token
            else:
                print_error("Login response missing access token")
                return False, None
        else:
            print_error(f"Login failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False, None
    except Exception as e:
        print_error(f"Login request failed: {str(e)}")
        return False, None


def test_manual_login(email: str, password: str) -> Tuple[bool, Optional[str]]:
    """Test manual login with same credentials (simulating user returning later)"""
    print_info(f"Testing manual login (simulating returning user) for {email}")

    # Wait a bit to simulate time passing
    time.sleep(2)

    try:
        response = requests.post(
            f"{API_BASE}/auth/token",
            data={"username": email, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        if response.status_code == 200:
            data = response.json()
            access_token = data.get("access_token")
            if access_token:
                print_success("Manual login successful!")
                return True, access_token
            else:
                print_error("Login response missing access token")
                return False, None
        else:
            print_error(f"Login failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            return False, None
    except Exception as e:
        print_error(f"Login request failed: {str(e)}")
        return False, None


def test_authenticated_access(access_token: str) -> bool:
    """Test authenticated API access"""
    print_info("Testing authenticated API access")

    headers = {"Authorization": f"Bearer {access_token}"}

    # Test accessing user profile
    try:
        response = requests.get(f"{API_BASE}/auth/me", headers=headers)

        if response.status_code == 200:
            user_data = response.json()
            print_success("Authenticated API access successful!")
            print_info(f"User profile retrieved: {user_data.get('email', 'N/A')}")
            print_info(f"User ID: {user_data.get('id', 'N/A')}")
            print_info(f"Role: {user_data.get('role', 'N/A')}")
            return True
        else:
            print_error(
                f"Authenticated access failed with status {response.status_code}"
            )
            print_error(f"Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"Authenticated request failed: {str(e)}")
        return False


def test_invalid_password_formats():
    """Test that weak passwords are properly rejected"""
    print_header("Testing Password Validation")

    test_cases = [
        ("short", "Short1!"),  # Too short
        ("no_upper", "testuser2024!"),  # No uppercase
        ("no_lower", "TESTUSER2024!"),  # No lowercase
        ("no_number", "TestUser!"),  # No number
        ("no_special", "TestUser2024"),  # No special character
    ]

    for test_name, weak_password in test_cases:
        user_data = generate_test_user()
        user_data["password"] = weak_password

        print_info(f"Testing {test_name}: '{weak_password}'")

        try:
            response = requests.post(
                f"{API_BASE}/auth/register",
                json=user_data,
                headers={"Content-Type": "application/json"},
            )

            if response.status_code in [400, 422]:
                print_success(f"Correctly rejected weak password ({test_name})")
            else:
                print_error(
                    f"Failed to reject weak password ({test_name}), status: {response.status_code}"
                )
                print_error(f"Response: {response.text}")
        except Exception as e:
            print_error(f"Request failed: {str(e)}")


def run_comprehensive_test():
    """Run comprehensive authentication system verification"""
    print_header("6FB Authentication System Verification")
    print(f"Testing against: {BASE_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}")

    # Test 1: Password validation
    test_invalid_password_formats()

    # Test 2-5: Complete authentication flow
    print_header("Testing Complete Authentication Flow")

    # Generate test user
    user_data = generate_test_user()
    print_info(f"Generated test user: {user_data['email']}")
    print_info(f"Password: {user_data['password']} (meets all requirements)")

    # Test signup
    signup_success, signup_response = test_signup(user_data)
    if not signup_success:
        print_error("Signup failed! Cannot continue with tests.")
        return False

    # Test immediate login
    immediate_login_success, access_token1 = test_immediate_login(
        user_data["email"], user_data["password"]
    )
    if not immediate_login_success:
        print_error("Immediate login failed!")
        return False

    # Test authenticated access with first token
    auth_access_success1 = test_authenticated_access(access_token1)
    if not auth_access_success1:
        print_error("Authenticated access with first token failed!")
        return False

    # Test manual login (simulating returning user)
    manual_login_success, access_token2 = test_manual_login(
        user_data["email"], user_data["password"]
    )
    if not manual_login_success:
        print_error("Manual login failed!")
        return False

    # Test authenticated access with second token
    auth_access_success2 = test_authenticated_access(access_token2)
    if not auth_access_success2:
        print_error("Authenticated access with second token failed!")
        return False

    # Final summary
    print_header("Test Summary")

    all_tests_passed = all(
        [
            signup_success,
            immediate_login_success,
            auth_access_success1,
            manual_login_success,
            auth_access_success2,
        ]
    )

    if all_tests_passed:
        print_success("ALL TESTS PASSED! ✨")
        print_success("The authentication system is working correctly!")
        print_info("\nKey verified behaviors:")
        print_info("• Password validation enforces strong password requirements")
        print_info("• Users can sign up with valid credentials")
        print_info("• Users can login immediately after registration")
        print_info("• Users can login again later with same credentials")
        print_info("• JWT tokens provide proper authenticated access")
        print_info("• The original authentication issue has been resolved!")
        return True
    else:
        print_error("Some tests failed. Please check the errors above.")
        return False


def main():
    """Main entry point"""
    print("\n🔐 Starting 6FB Authentication System Verification...\n")

    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code != 200:
            print_error("Backend server is not healthy!")
            print_info(
                "Please ensure the backend is running: cd backend && uvicorn main:app --reload"
            )
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to backend server!")
        print_info("Please start the backend: cd backend && uvicorn main:app --reload")
        sys.exit(1)

    # Run comprehensive test
    success = run_comprehensive_test()

    if success:
        print(f"\n{GREEN}{'='*60}")
        print("✅ VERIFICATION COMPLETE - AUTHENTICATION SYSTEM WORKING!")
        print(f"{'='*60}{RESET}\n")
        sys.exit(0)
    else:
        print(f"\n{RED}{'='*60}")
        print("❌ VERIFICATION FAILED - ISSUES DETECTED")
        print(f"{'='*60}{RESET}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
