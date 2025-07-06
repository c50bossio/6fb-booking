#!/usr/bin/env python3
"""
API Security Error Testing Script

Tests actual API endpoints to ensure they don't expose stack traces or internal details.
"""

import json
import sys
import time
from datetime import datetime
from typing import Dict, Any, List

import requests

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_RESULTS_FILE = "api_security_test_results.json"


class APISecurityTester:
    """Test real API endpoints for security information disclosure"""

    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []

    def test_authentication_errors(self) -> List[Dict[str, Any]]:
        """Test authentication endpoints for information disclosure"""
        tests = []

        # Test 1: Invalid login attempt
        test = self.make_request(
            "POST",
            "/api/v1/auth/login",
            json={"username": "nonexistent@test.com", "password": "wrongpassword"},
            test_name="Invalid Login Attempt",
            should_not_contain=[
                "traceback",
                "Traceback",
                'File "/',
                "line ",
                "sqlalchemy",
                "psycopg2",
                "database",
                "connection",
            ],
        )
        tests.append(test)

        # Test 2: Malformed login data
        test = self.make_request(
            "POST",
            "/api/v1/auth/login",
            data="invalid_json_data",
            headers={"Content-Type": "application/json"},
            test_name="Malformed Login Data",
            should_not_contain=[
                "JSONDecodeError",
                "json.decoder",
                "Traceback",
                "pydantic",
                "fastapi",
                'File "/',
                "line ",
            ],
        )
        tests.append(test)

        # Test 3: Missing authorization header
        test = self.make_request(
            "GET",
            "/api/v1/users/me",
            test_name="Missing Authorization Header",
            should_not_contain=[
                "traceback",
                "Traceback",
                "HTTPException",
                "fastapi.security",
                'File "/',
                "line ",
            ],
        )
        tests.append(test)

        # Test 4: Invalid JWT token
        test = self.make_request(
            "GET",
            "/api/v1/users/me",
            headers={"Authorization": "Bearer invalid_token_12345"},
            test_name="Invalid JWT Token",
            should_not_contain=[
                "jwt.exceptions",
                "PyJWT",
                "traceback",
                "Traceback",
                'File "/',
                "line ",
                "decode",
                "InvalidTokenError",
            ],
        )
        tests.append(test)

        return tests

    def test_database_errors(self) -> List[Dict[str, Any]]:
        """Test endpoints that might trigger database errors"""
        tests = []

        # Test 1: Non-existent resource
        test = self.make_request(
            "GET",
            "/api/v1/users/99999999",
            test_name="Non-existent User ID",
            should_not_contain=[
                "sqlalchemy",
                "psycopg2",
                "sqlite",
                "database",
                "SELECT",
                "WHERE",
                'File "/',
                "line ",
                "traceback",
            ],
        )
        tests.append(test)

        # Test 2: Invalid ID format
        test = self.make_request(
            "GET",
            "/api/v1/appointments/invalid_id_format",
            test_name="Invalid ID Format",
            should_not_contain=[
                "ValueError",
                "int()",
                'File "/',
                "line ",
                "traceback",
                "Traceback",
                "invalid literal",
            ],
        )
        tests.append(test)

        return tests

    def test_validation_errors(self) -> List[Dict[str, Any]]:
        """Test validation error handling"""
        tests = []

        # Test 1: Create user with invalid email
        test = self.make_request(
            "POST",
            "/api/v1/auth/register",
            json={
                "email": "invalid_email_format",
                "password": "test123",
                "first_name": "Test",
                "last_name": "User",
            },
            test_name="Invalid Email Format",
            should_not_contain=[
                "pydantic",
                "ValidationError",
                'File "/',
                "line ",
                "traceback",
                "Traceback",
                "email_validator",
            ],
        )
        tests.append(test)

        # Test 2: Missing required fields
        test = self.make_request(
            "POST",
            "/api/v1/auth/register",
            json={"email": "test@example.com"},
            test_name="Missing Required Fields",
            should_not_contain=[
                "pydantic",
                "ValidationError",
                "Field required",
                'File "/',
                "line ",
                "traceback",
                "Traceback",
            ],
        )
        tests.append(test)

        return tests

    def test_server_errors(self) -> List[Dict[str, Any]]:
        """Test endpoints that might cause server errors"""
        tests = []

        # Test 1: Test the sentry debug endpoint (should be disabled in production)
        test = self.make_request(
            "GET",
            "/sentry-debug",
            test_name="Sentry Debug Endpoint",
            should_not_contain=[
                "ZeroDivisionError",
                "division by zero",
                'File "/',
                "line ",
                "traceback",
                "Traceback",
                "1 / 0",
            ],
        )
        tests.append(test)

        return tests

    def make_request(
        self,
        method: str,
        endpoint: str,
        json: Dict[str, Any] = None,
        data: str = None,
        headers: Dict[str, str] = None,
        test_name: str = "",
        should_not_contain: List[str] = None,
        should_contain: List[str] = None,
    ) -> Dict[str, Any]:
        """Make a request and analyze the response for security issues"""

        url = f"{self.base_url}{endpoint}"
        test_start = time.time()

        try:
            # Make the request
            if method == "GET":
                response = self.session.get(url, headers=headers)
            elif method == "POST":
                if json is not None:
                    response = self.session.post(url, json=json, headers=headers)
                elif data is not None:
                    response = self.session.post(url, data=data, headers=headers)
                else:
                    response = self.session.post(url, headers=headers)
            else:
                response = self.session.request(method, url, json=json, headers=headers)

            duration = time.time() - test_start
            response_text = response.text

            # Analyze response for security issues
            security_issues = []

            if should_not_contain:
                for sensitive_text in should_not_contain:
                    if sensitive_text.lower() in response_text.lower():
                        security_issues.append(
                            {
                                "type": "information_disclosure",
                                "content": sensitive_text,
                                "location": "response_body",
                            }
                        )

            if should_contain:
                for expected_text in should_contain:
                    if expected_text.lower() not in response_text.lower():
                        security_issues.append(
                            {
                                "type": "missing_expected_content",
                                "content": expected_text,
                                "location": "response_body",
                            }
                        )

            # Check for common security issues in headers
            headers_text = str(response.headers).lower()
            dangerous_headers = [
                "traceback",
                'file "/',
                "line ",
                "exception",
                "error occurred at",
                "stack trace",
            ]

            for dangerous in dangerous_headers:
                if dangerous in headers_text:
                    security_issues.append(
                        {
                            "type": "information_disclosure",
                            "content": dangerous,
                            "location": "response_headers",
                        }
                    )

            # Try to parse JSON response
            try:
                response_json = response.json()
            except:
                response_json = None

            return {
                "test_name": test_name,
                "endpoint": endpoint,
                "method": method,
                "status_code": response.status_code,
                "duration": round(duration, 3),
                "security_issues": security_issues,
                "passed": len(security_issues) == 0,
                "response_size": len(response_text),
                "has_request_id": "X-Request-ID" in response.headers,
                "response_structure": (
                    list(response_json.keys()) if response_json else None
                ),
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            return {
                "test_name": test_name,
                "endpoint": endpoint,
                "method": method,
                "error": str(e),
                "passed": False,
                "security_issues": [
                    {"type": "test_execution_error", "content": str(e)}
                ],
                "timestamp": datetime.utcnow().isoformat(),
            }

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all security tests"""
        print("🔐 Running API Security Tests")
        print("=" * 50)

        all_tests = []

        # Run different test categories
        print("🔑 Testing Authentication Errors...")
        auth_tests = self.test_authentication_errors()
        all_tests.extend(auth_tests)

        print("🗄️  Testing Database Errors...")
        db_tests = self.test_database_errors()
        all_tests.extend(db_tests)

        print("✅ Testing Validation Errors...")
        validation_tests = self.test_validation_errors()
        all_tests.extend(validation_tests)

        print("⚡ Testing Server Errors...")
        server_tests = self.test_server_errors()
        all_tests.extend(server_tests)

        # Analyze results
        passed_tests = [t for t in all_tests if t["passed"]]
        failed_tests = [t for t in all_tests if not t["passed"]]

        security_issues = []
        for test in all_tests:
            if test.get("security_issues"):
                for issue in test["security_issues"]:
                    security_issues.append(
                        {
                            "test": test["test_name"],
                            "endpoint": test["endpoint"],
                            **issue,
                        }
                    )

        results = {
            "summary": {
                "total_tests": len(all_tests),
                "passed": len(passed_tests),
                "failed": len(failed_tests),
                "security_issues_found": len(security_issues),
                "success_rate": f"{(len(passed_tests) / len(all_tests)) * 100:.1f}%",
            },
            "tests": all_tests,
            "security_issues": security_issues,
            "timestamp": datetime.utcnow().isoformat(),
            "base_url": self.base_url,
        }

        return results

    def print_results(self, results: Dict[str, Any]):
        """Print test results summary"""
        print("\n" + "=" * 50)
        print("📊 API Security Test Results")
        print("=" * 50)

        summary = results["summary"]
        print(f"Total Tests: {summary['total_tests']}")
        print(f"Passed: {summary['passed']}")
        print(f"Failed: {summary['failed']}")
        print(f"Success Rate: {summary['success_rate']}")
        print(f"Security Issues: {summary['security_issues_found']}")

        if results["security_issues"]:
            print("\n⚠️  SECURITY ISSUES FOUND:")
            for i, issue in enumerate(results["security_issues"], 1):
                print(f"  {i}. {issue['test']} ({issue['endpoint']})")
                print(f"     Type: {issue['type']}")
                print(f"     Content: {issue['content']}")
                print(f"     Location: {issue['location']}")
        else:
            print("\n✅ No security issues detected!")

        if results["summary"]["failed"] > 0:
            print("\n❌ FAILED TESTS:")
            for test in results["tests"]:
                if not test["passed"]:
                    print(f"  • {test['test_name']} ({test['endpoint']})")
                    if test.get("error"):
                        print(f"    Error: {test['error']}")


def main():
    """Main test execution"""
    print("🚀 API Security Error Handling Test")
    print("Testing real API endpoints for information disclosure...")
    print()

    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code != 200:
            print(f"⚠️  Server health check failed (status: {response.status_code})")
    except requests.exceptions.RequestException:
        print("❌ Unable to connect to the API server.")
        print(f"   Make sure the server is running at {BASE_URL}")
        print("   Start the server with: uvicorn main:app --reload")
        return 1

    # Run tests
    tester = APISecurityTester(BASE_URL)
    results = tester.run_all_tests()

    # Print results
    tester.print_results(results)

    # Save results
    with open(TEST_RESULTS_FILE, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n📄 Detailed results saved to: {TEST_RESULTS_FILE}")

    # Return appropriate exit code
    if results["summary"]["security_issues_found"] > 0:
        print("\n❌ Security issues detected! Please review and fix.")
        return 1
    elif results["summary"]["failed"] > 0:
        print("\n⚠️  Some tests failed, but no security issues detected.")
        return 0
    else:
        print("\n✅ All tests passed! API error handling is secure.")
        return 0


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
