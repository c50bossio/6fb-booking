#!/usr/bin/env python3
"""
API Endpoint Validator for 6FB Booking Platform
Specifically designed to prevent and detect 405 Method Not Allowed errors
"""

import asyncio
import aiohttp
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import requests
from dataclasses import dataclass, asdict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("/Users/bossio/6fb-booking/logs/api_validation.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


@dataclass
class EndpointTest:
    endpoint: str
    method: str
    expected_status: List[int]
    auth_required: bool
    test_payload: Optional[Dict] = None
    headers: Optional[Dict] = None


@dataclass
class ValidationResult:
    endpoint: str
    method: str
    status_code: int
    response_time: float
    success: bool
    error_message: Optional[str] = None
    is_405_error: bool = False
    timestamp: str = ""


class APIEndpointValidator:
    def __init__(self):
        self.base_dir = Path("/Users/bossio/6fb-booking")
        self.logs_dir = self.base_dir / "logs"
        self.monitoring_dir = self.base_dir / "monitoring"
        self.results_dir = self.monitoring_dir / "api_validation"

        # Create directories
        for dir_path in [self.logs_dir, self.monitoring_dir, self.results_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)

        self.api_base_url = os.getenv(
            "API_BASE_URL", "https://sixfb-backend.onrender.com"
        )
        self.auth_token = None

        # Comprehensive endpoint test definitions
        self.endpoint_tests = [
            # Health and info endpoints
            EndpointTest("/health", "GET", [200], False),
            EndpointTest("/", "GET", [200, 404], False),
            EndpointTest("/docs", "GET", [200], False),
            EndpointTest("/openapi.json", "GET", [200], False),
            # Authentication endpoints
            EndpointTest(
                "/api/v1/auth/login",
                "POST",
                [200, 400, 422],
                False,
                {"email": "test@example.com", "password": "testpass"},
            ),
            EndpointTest(
                "/api/v1/auth/register",
                "POST",
                [201, 400, 422],
                False,
                {
                    "email": "test@example.com",
                    "password": "testpass",
                    "name": "Test User",
                },
            ),
            EndpointTest("/api/v1/auth/logout", "POST", [200, 401], True),
            EndpointTest("/api/v1/auth/refresh", "POST", [200, 401], True),
            # User management endpoints
            EndpointTest("/api/v1/users", "GET", [200, 401], True),
            EndpointTest(
                "/api/v1/users",
                "POST",
                [201, 400, 401, 422],
                True,
                {
                    "email": "newuser@example.com",
                    "password": "password",
                    "name": "New User",
                },
            ),
            EndpointTest("/api/v1/users/me", "GET", [200, 401], True),
            EndpointTest(
                "/api/v1/users/me",
                "PUT",
                [200, 400, 401],
                True,
                {"name": "Updated Name"},
            ),
            # Services endpoints
            EndpointTest("/api/v1/services", "GET", [200], False),
            EndpointTest(
                "/api/v1/services",
                "POST",
                [201, 400, 401],
                True,
                {"name": "Test Service", "duration": 30, "price": 50},
            ),
            EndpointTest("/api/v1/services/1", "GET", [200, 404], False),
            EndpointTest(
                "/api/v1/services/1",
                "PUT",
                [200, 400, 401, 404],
                True,
                {"name": "Updated Service"},
            ),
            EndpointTest("/api/v1/services/1", "DELETE", [204, 401, 404], True),
            # Appointments endpoints
            EndpointTest("/api/v1/appointments", "GET", [200, 401], True),
            EndpointTest(
                "/api/v1/appointments",
                "POST",
                [201, 400, 401],
                True,
                {"service_id": 1, "datetime": "2024-12-01T10:00:00"},
            ),
            EndpointTest("/api/v1/appointments/1", "GET", [200, 401, 404], True),
            EndpointTest(
                "/api/v1/appointments/1",
                "PUT",
                [200, 400, 401, 404],
                True,
                {"datetime": "2024-12-01T11:00:00"},
            ),
            EndpointTest("/api/v1/appointments/1", "DELETE", [204, 401, 404], True),
            # Barbers endpoints
            EndpointTest("/api/v1/barbers", "GET", [200, 401], True),
            EndpointTest(
                "/api/v1/barbers",
                "POST",
                [201, 400, 401],
                True,
                {"name": "Test Barber", "email": "barber@example.com"},
            ),
            EndpointTest("/api/v1/barbers/1", "GET", [200, 404], False),
            EndpointTest(
                "/api/v1/barbers/1",
                "PUT",
                [200, 400, 401, 404],
                True,
                {"name": "Updated Barber"},
            ),
            EndpointTest("/api/v1/barbers/1", "DELETE", [204, 401, 404], True),
            # Customers endpoints
            EndpointTest("/api/v1/customers", "GET", [200, 401], True),
            EndpointTest(
                "/api/v1/customers",
                "POST",
                [201, 400, 401],
                True,
                {
                    "name": "Test Customer",
                    "email": "customer@example.com",
                    "phone": "1234567890",
                },
            ),
            EndpointTest("/api/v1/customers/1", "GET", [200, 401, 404], True),
            EndpointTest(
                "/api/v1/customers/1",
                "PUT",
                [200, 400, 401, 404],
                True,
                {"name": "Updated Customer"},
            ),
            EndpointTest("/api/v1/customers/1", "DELETE", [204, 401, 404], True),
            # Analytics endpoints
            EndpointTest("/api/v1/analytics/dashboard", "GET", [200, 401], True),
            EndpointTest("/api/v1/analytics/revenue", "GET", [200, 401], True),
            EndpointTest("/api/v1/analytics/bookings", "GET", [200, 401], True),
            # Payment endpoints
            EndpointTest(
                "/api/v1/payments/process",
                "POST",
                [200, 400, 401],
                True,
                {"amount": 50, "currency": "usd", "payment_method": "card"},
            ),
            EndpointTest(
                "/api/v1/payments/webhooks/stripe",
                "POST",
                [200, 400],
                False,
                {"type": "payment_intent.succeeded"},
            ),
            # Notification endpoints
            EndpointTest("/api/v1/notifications", "GET", [200, 401], True),
            EndpointTest(
                "/api/v1/notifications",
                "POST",
                [201, 400, 401],
                True,
                {"message": "Test notification", "type": "info"},
            ),
            # Calendar endpoints
            EndpointTest("/api/v1/calendar/events", "GET", [200, 401], True),
            EndpointTest("/api/v1/calendar/availability", "GET", [200], False),
            # Settings endpoints
            EndpointTest("/api/v1/settings", "GET", [200, 401], True),
            EndpointTest(
                "/api/v1/settings",
                "PUT",
                [200, 400, 401],
                True,
                {"timezone": "UTC", "currency": "USD"},
            ),
        ]

    async def get_auth_token(self) -> Optional[str]:
        """Get authentication token for protected endpoints"""
        if self.auth_token:
            return self.auth_token

        try:
            async with aiohttp.ClientSession() as session:
                # Try to get a token using test credentials
                login_data = {
                    "email": os.getenv("TEST_USER_EMAIL", "admin@6fb.com"),
                    "password": os.getenv("TEST_USER_PASSWORD", "admin123"),
                }

                async with session.post(
                    f"{self.api_base_url}/api/v1/auth/login",
                    json=login_data,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.auth_token = data.get("access_token")
                        logger.info("Successfully obtained auth token")
                        return self.auth_token
                    else:
                        logger.warning(
                            f"Failed to get auth token: HTTP {response.status}"
                        )
        except Exception as e:
            logger.error(f"Error getting auth token: {e}")

        return None

    async def validate_endpoint(
        self, session: aiohttp.ClientSession, test: EndpointTest
    ) -> ValidationResult:
        """Validate a single endpoint"""
        url = f"{self.api_base_url}{test.endpoint}"
        timestamp = datetime.utcnow().isoformat()

        # Prepare headers
        headers = test.headers.copy() if test.headers else {}
        if test.auth_required:
            token = await self.get_auth_token()
            if token:
                headers["Authorization"] = f"Bearer {token}"

        # Prepare request kwargs
        kwargs = {"timeout": aiohttp.ClientTimeout(total=15), "headers": headers}

        if test.test_payload and test.method in ["POST", "PUT", "PATCH"]:
            kwargs["json"] = test.test_payload

        start_time = asyncio.get_event_loop().time()

        try:
            async with session.request(test.method, url, **kwargs) as response:
                response_time = (asyncio.get_event_loop().time() - start_time) * 1000
                status_code = response.status

                # Read response text for debugging
                try:
                    response_text = await response.text()
                except:
                    response_text = ""

                # Check if status code is expected
                is_expected = status_code in test.expected_status
                is_405_error = status_code == 405

                # Determine success
                success = is_expected and not is_405_error

                error_message = None
                if not success:
                    if is_405_error:
                        error_message = f"405 Method Not Allowed - {test.method} method not supported for {test.endpoint}"
                    elif not is_expected:
                        error_message = f"Unexpected status code {status_code}, expected one of {test.expected_status}"

                return ValidationResult(
                    endpoint=test.endpoint,
                    method=test.method,
                    status_code=status_code,
                    response_time=response_time,
                    success=success,
                    error_message=error_message,
                    is_405_error=is_405_error,
                    timestamp=timestamp,
                )

        except asyncio.TimeoutError:
            return ValidationResult(
                endpoint=test.endpoint,
                method=test.method,
                status_code=0,
                response_time=15000,
                success=False,
                error_message="Request timeout",
                timestamp=timestamp,
            )
        except Exception as e:
            return ValidationResult(
                endpoint=test.endpoint,
                method=test.method,
                status_code=0,
                response_time=0,
                success=False,
                error_message=str(e),
                timestamp=timestamp,
            )

    async def validate_all_endpoints(self) -> Dict:
        """Validate all API endpoints"""
        logger.info(f"Starting validation of {len(self.endpoint_tests)} endpoints...")

        results = []

        async with aiohttp.ClientSession() as session:
            # Run validations in batches to avoid overwhelming the server
            batch_size = 5
            for i in range(0, len(self.endpoint_tests), batch_size):
                batch = self.endpoint_tests[i : i + batch_size]

                # Run batch concurrently
                batch_tasks = [self.validate_endpoint(session, test) for test in batch]
                batch_results = await asyncio.gather(
                    *batch_tasks, return_exceptions=True
                )

                for result in batch_results:
                    if isinstance(result, Exception):
                        logger.error(f"Validation error: {result}")
                        continue
                    results.append(result)

                # Small delay between batches
                if i + batch_size < len(self.endpoint_tests):
                    await asyncio.sleep(1)

        # Analyze results
        analysis = self._analyze_results(results)

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "total_endpoints": len(results),
            "results": [asdict(r) for r in results],
            "analysis": analysis,
        }

    def _analyze_results(self, results: List[ValidationResult]) -> Dict:
        """Analyze validation results"""
        total = len(results)
        successful = sum(1 for r in results if r.success)
        failed = total - successful

        # Count 405 errors specifically
        method_not_allowed = sum(1 for r in results if r.is_405_error)

        # Group failures by type
        failure_types = {}
        slow_endpoints = []

        for result in results:
            if not result.success:
                error_type = (
                    "405_method_not_allowed" if result.is_405_error else "other_error"
                )
                if error_type not in failure_types:
                    failure_types[error_type] = []
                failure_types[error_type].append(
                    {
                        "endpoint": result.endpoint,
                        "method": result.method,
                        "status_code": result.status_code,
                        "error": result.error_message,
                    }
                )

            # Check for slow endpoints (>2 seconds)
            if result.response_time > 2000:
                slow_endpoints.append(
                    {
                        "endpoint": result.endpoint,
                        "method": result.method,
                        "response_time": result.response_time,
                    }
                )

        # Calculate average response time for successful requests
        successful_times = [
            r.response_time for r in results if r.success and r.response_time > 0
        ]
        avg_response_time = (
            sum(successful_times) / len(successful_times) if successful_times else 0
        )

        return {
            "summary": {
                "total_endpoints": total,
                "successful": successful,
                "failed": failed,
                "success_rate": (successful / total * 100) if total > 0 else 0,
                "method_not_allowed_count": method_not_allowed,
                "average_response_time": avg_response_time,
            },
            "failure_analysis": failure_types,
            "slow_endpoints": slow_endpoints,
            "critical_issues": {
                "has_405_errors": method_not_allowed > 0,
                "high_failure_rate": (
                    (failed / total * 100) > 20 if total > 0 else False
                ),
                "slow_responses": len(slow_endpoints) > 0,
            },
        }

    def save_validation_results(self, results: Dict):
        """Save validation results to file"""
        timestamp = results["timestamp"].replace(":", "-")

        # Save detailed results
        detailed_file = self.results_dir / f"api_validation_{timestamp}.json"
        with open(detailed_file, "w") as f:
            json.dump(results, f, indent=2)

        # Save summary report
        summary_file = self.results_dir / "latest_validation_summary.json"
        summary = {
            "timestamp": results["timestamp"],
            "summary": results["analysis"]["summary"],
            "critical_issues": results["analysis"]["critical_issues"],
            "method_not_allowed_endpoints": [],
        }

        # Extract 405 errors for quick reference
        for result in results["results"]:
            if result.get("is_405_error"):
                summary["method_not_allowed_endpoints"].append(
                    {
                        "endpoint": result["endpoint"],
                        "method": result["method"],
                        "error": result["error_message"],
                    }
                )

        with open(summary_file, "w") as f:
            json.dump(summary, f, indent=2)

        logger.info(f"Validation results saved to {detailed_file}")

    def generate_405_fix_report(self, results: Dict) -> str:
        """Generate a specific report for fixing 405 errors"""
        method_not_allowed = []

        for result in results["results"]:
            if result.get("is_405_error"):
                method_not_allowed.append(result)

        if not method_not_allowed:
            return "✅ No 405 Method Not Allowed errors detected!"

        report = f"""
🚨 API 405 Method Not Allowed Errors Detected

Found {len(method_not_allowed)} endpoints with 405 errors:

"""

        for error in method_not_allowed:
            report += f"❌ {error['method']} {error['endpoint']}\n"
            report += f"   Error: {error['error_message']}\n\n"

        report += """
🔧 How to Fix 405 Errors:

1. Check FastAPI route definitions in your API files
2. Ensure HTTP methods are correctly specified in @app.method() decorators
3. Verify that all required HTTP methods are implemented
4. Check for typos in route paths
5. Ensure middleware isn't blocking certain methods

Example fixes:
- Missing POST method: Add @app.post("/api/v1/endpoint")
- Wrong method name: Change @app.get() to @app.post() for POST endpoints
- Route conflicts: Check for overlapping route patterns

🔍 Files to check:
- backend/main.py
- backend/api/v1/*.py
- backend/api/v1/endpoints/*.py
"""

        return report

    async def run_validation(self) -> Dict:
        """Run complete API validation"""
        logger.info("Starting comprehensive API endpoint validation...")

        try:
            results = await self.validate_all_endpoints()

            # Save results
            self.save_validation_results(results)

            # Log summary
            analysis = results["analysis"]
            summary = analysis["summary"]

            logger.info(f"Validation complete:")
            logger.info(f"- Total endpoints tested: {summary['total_endpoints']}")
            logger.info(f"- Success rate: {summary['success_rate']:.1f}%")
            logger.info(
                f"- 405 Method Not Allowed errors: {summary['method_not_allowed_count']}"
            )
            logger.info(
                f"- Average response time: {summary['average_response_time']:.0f}ms"
            )

            # Generate and save 405 fix report
            if summary["method_not_allowed_count"] > 0:
                fix_report = self.generate_405_fix_report(results)
                fix_report_file = self.results_dir / "405_errors_fix_guide.md"
                with open(fix_report_file, "w") as f:
                    f.write(fix_report)

                logger.error(f"Found {summary['method_not_allowed_count']} 405 errors!")
                logger.error(f"Fix guide saved to: {fix_report_file}")
                print(fix_report)
            else:
                logger.info("✅ No 405 Method Not Allowed errors detected!")

            return results

        except Exception as e:
            logger.error(f"API validation failed: {e}")
            raise


async def main():
    """Main validation function"""
    validator = APIEndpointValidator()

    try:
        results = await validator.run_validation()

        # Return success/failure based on critical issues
        critical_issues = results["analysis"]["critical_issues"]
        if critical_issues["has_405_errors"]:
            exit(1)  # Exit with error code if 405 errors found
        elif critical_issues["high_failure_rate"]:
            exit(2)  # Exit with different error code for high failure rate
        else:
            exit(0)  # Success

    except Exception as e:
        logger.error(f"Validation failed: {e}")
        exit(3)


if __name__ == "__main__":
    asyncio.run(main())
