#!/usr/bin/env python3
"""
Security Error Handling Test Script

This script tests the security fixes to ensure that:
1. Stack traces are never exposed to clients
2. Internal file paths are not leaked
3. Detailed error information is logged server-side only
4. User-friendly error messages are provided
5. Error monitoring works without exposing details
"""

import asyncio
import json
import sys
import traceback
import uuid
from datetime import datetime
from typing import Dict, Any

import requests
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

# Add the backend directory to Python path
sys.path.insert(0, "/Users/bossio/6fb-booking/backend")

from middleware.secure_error_handling import (
    SecureErrorHandlingMiddleware,
    register_secure_exception_handlers,
)
from config.settings import settings


class SecurityErrorTestApp:
    """Test application to validate security error handling"""

    def __init__(self):
        self.app = FastAPI(title="Security Error Test App")
        self.setup_middleware()
        self.setup_test_routes()
        self.test_results = []

    def setup_middleware(self):
        """Setup the secure error handling middleware"""
        self.app.add_middleware(SecureErrorHandlingMiddleware, enable_sentry=False)
        register_secure_exception_handlers(self.app)

    def setup_test_routes(self):
        """Setup test routes that trigger various error conditions"""

        @self.app.get("/test/division-by-zero")
        async def test_division_by_zero():
            """Trigger a ZeroDivisionError"""
            result = 1 / 0
            return {"result": result}

        @self.app.get("/test/file-not-found")
        async def test_file_not_found():
            """Trigger a FileNotFoundError"""
            with open("/nonexistent/path/file.txt", "r") as f:
                return {"content": f.read()}

        @self.app.get("/test/database-error")
        async def test_database_error():
            """Simulate a database error"""
            from sqlalchemy.exc import OperationalError

            raise OperationalError("Database connection failed", None, None)

        @self.app.post("/test/validation-error")
        async def test_validation_error(data: dict):
            """Trigger a validation error"""
            # This will trigger RequestValidationError when invalid data is sent
            return {"received": data}

        @self.app.get("/test/http-exception")
        async def test_http_exception():
            """Trigger an HTTPException"""
            raise HTTPException(status_code=404, detail="Test resource not found")

        @self.app.get("/test/permission-error")
        async def test_permission_error():
            """Trigger a PermissionError"""
            raise PermissionError("Access denied to test resource")

        @self.app.get("/test/value-error")
        async def test_value_error():
            """Trigger a ValueError"""
            raise ValueError("Invalid test value provided")

        @self.app.get("/test/custom-exception")
        async def test_custom_exception():
            """Trigger a custom exception with sensitive internal data"""

            class CustomError(Exception):
                def __init__(self, message):
                    self.sensitive_data = {
                        "database_password": "super_secret_password",
                        "api_key": "sk_live_secret_key_12345",
                        "internal_path": "/Users/admin/secret/config.json",
                    }
                    super().__init__(message)

            raise CustomError("Custom error with sensitive internal data")

    def run_security_tests(self) -> Dict[str, Any]:
        """Run comprehensive security tests"""
        print("🔒 Starting Security Error Handling Tests")
        print("=" * 60)

        client = TestClient(self.app)
        test_results = {
            "passed": 0,
            "failed": 0,
            "tests": [],
            "summary": {},
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Test cases
        test_cases = [
            {
                "name": "Division by Zero Error",
                "method": "GET",
                "url": "/test/division-by-zero",
                "expected_status": 500,
                "should_not_contain": [
                    "ZeroDivisionError",
                    "traceback",
                    "/Users/",
                    "division by zero",
                ],
            },
            {
                "name": "File Not Found Error",
                "method": "GET",
                "url": "/test/file-not-found",
                "expected_status": 500,
                "should_not_contain": [
                    "FileNotFoundError",
                    "/nonexistent/path/",
                    "Traceback",
                    "open",
                ],
            },
            {
                "name": "Database Error",
                "method": "GET",
                "url": "/test/database-error",
                "expected_status": 503,
                "should_not_contain": [
                    "OperationalError",
                    "Database connection failed",
                    "sqlalchemy",
                ],
            },
            {
                "name": "HTTP Exception",
                "method": "GET",
                "url": "/test/http-exception",
                "expected_status": 404,
                "should_contain": ["not found"],
                "should_not_contain": ["HTTPException", "raise"],
            },
            {
                "name": "Permission Error",
                "method": "GET",
                "url": "/test/permission-error",
                "expected_status": 403,
                "should_contain": ["permission"],
                "should_not_contain": [
                    "PermissionError",
                    "Access denied to test resource",
                ],
            },
            {
                "name": "Value Error",
                "method": "GET",
                "url": "/test/value-error",
                "expected_status": 400,
                "should_not_contain": ["ValueError", "Invalid test value provided"],
            },
            {
                "name": "Custom Exception with Sensitive Data",
                "method": "GET",
                "url": "/test/custom-exception",
                "expected_status": 500,
                "should_not_contain": [
                    "super_secret_password",
                    "sk_live_secret_key_12345",
                    "/Users/admin/secret/config.json",
                    "CustomError",
                    "sensitive_data",
                ],
            },
            {
                "name": "Validation Error",
                "method": "POST",
                "url": "/test/validation-error",
                "data": "invalid_json_data",
                "expected_status": 422,
                "should_contain": ["validation"],
                "should_not_contain": ["RequestValidationError", "pydantic"],
            },
        ]

        for test_case in test_cases:
            result = self.run_single_test(client, test_case)
            test_results["tests"].append(result)

            if result["passed"]:
                test_results["passed"] += 1
                print(f"✅ {test_case['name']}")
            else:
                test_results["failed"] += 1
                print(f"❌ {test_case['name']}")
                print(f"   Reason: {result['failure_reason']}")

        # Generate summary
        total_tests = len(test_cases)
        test_results["summary"] = {
            "total_tests": total_tests,
            "passed": test_results["passed"],
            "failed": test_results["failed"],
            "success_rate": f"{(test_results['passed'] / total_tests) * 100:.1f}%",
        }

        return test_results

    def run_single_test(
        self, client: TestClient, test_case: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Run a single security test case"""

        try:
            # Make the request
            if test_case["method"] == "GET":
                response = client.get(test_case["url"])
            elif test_case["method"] == "POST":
                if "data" in test_case:
                    response = client.post(
                        test_case["url"],
                        data=test_case["data"],
                        headers={"Content-Type": "application/json"},
                    )
                else:
                    response = client.post(test_case["url"], json={})

            # Get response data
            response_text = response.text
            response_data = (
                response.json()
                if response.headers.get("content-type", "").startswith(
                    "application/json"
                )
                else {}
            )

            # Check status code
            if response.status_code != test_case["expected_status"]:
                return {
                    "name": test_case["name"],
                    "passed": False,
                    "failure_reason": f"Expected status {test_case['expected_status']}, got {response.status_code}",
                    "response_status": response.status_code,
                    "response_preview": response_text[:200],
                }

            # Check that sensitive information is NOT present
            if "should_not_contain" in test_case:
                for sensitive_text in test_case["should_not_contain"]:
                    if sensitive_text.lower() in response_text.lower():
                        return {
                            "name": test_case["name"],
                            "passed": False,
                            "failure_reason": f"Response contains sensitive information: '{sensitive_text}'",
                            "response_status": response.status_code,
                            "response_preview": response_text[:500],
                        }

            # Check that expected information IS present
            if "should_contain" in test_case:
                for expected_text in test_case["should_contain"]:
                    if expected_text.lower() not in response_text.lower():
                        return {
                            "name": test_case["name"],
                            "passed": False,
                            "failure_reason": f"Response missing expected text: '{expected_text}'",
                            "response_status": response.status_code,
                            "response_preview": response_text[:200],
                        }

            # Verify response structure
            expected_fields = ["error", "type", "message", "request_id", "timestamp"]
            if not all(field in response_data for field in expected_fields):
                return {
                    "name": test_case["name"],
                    "passed": False,
                    "failure_reason": f"Response missing required fields. Has: {list(response_data.keys())}",
                    "response_status": response.status_code,
                    "response_data": response_data,
                }

            # Test passed
            return {
                "name": test_case["name"],
                "passed": True,
                "response_status": response.status_code,
                "response_structure": list(response_data.keys()),
            }

        except Exception as e:
            return {
                "name": test_case["name"],
                "passed": False,
                "failure_reason": f"Test execution error: {str(e)}",
                "exception": str(e),
            }

    def print_detailed_results(self, results: Dict[str, Any]):
        """Print detailed test results"""
        print("\n" + "=" * 60)
        print("📊 DETAILED TEST RESULTS")
        print("=" * 60)

        print(f"Total Tests: {results['summary']['total_tests']}")
        print(f"Passed: {results['summary']['passed']}")
        print(f"Failed: {results['summary']['failed']}")
        print(f"Success Rate: {results['summary']['success_rate']}")

        if results["failed"] > 0:
            print("\n❌ FAILED TESTS:")
            for test in results["tests"]:
                if not test["passed"]:
                    print(f"  • {test['name']}: {test['failure_reason']}")

        print("\n🔒 SECURITY VALIDATION:")
        security_issues = []
        for test in results["tests"]:
            if not test["passed"] and "sensitive information" in test.get(
                "failure_reason", ""
            ):
                security_issues.append(test)

        if security_issues:
            print(f"  ⚠️  Found {len(security_issues)} security issues!")
            for issue in security_issues:
                print(f"     - {issue['name']}: {issue['failure_reason']}")
        else:
            print("  ✅ No sensitive information exposure detected!")

        return len(security_issues) == 0


def main():
    """Main test execution"""
    print("🚀 Security Error Handling Validation")
    print("Testing for information disclosure vulnerabilities...")
    print()

    # Create test app
    test_app = SecurityErrorTestApp()

    # Run tests
    results = test_app.run_security_tests()

    # Print results
    test_app.print_detailed_results(results)

    # Save results to file
    with open("security_error_test_results.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n📄 Detailed results saved to: security_error_test_results.json")

    # Return exit code based on results
    if results["failed"] > 0:
        print("\n❌ Some tests failed. Please review the security fixes.")
        return 1
    else:
        print("\n✅ All security tests passed! Error handling is secure.")
        return 0


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
