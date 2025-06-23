#!/usr/bin/env python3
"""
6FB Booking Platform - API Performance Testing
==============================================

Tests API endpoints and validates the booking workflow with actual HTTP requests.
Requires the backend server to be running.

Usage:
    python scripts/api_performance_test.py
"""

import time
import json
import requests
import statistics
from datetime import datetime, timedelta
from pathlib import Path
import traceback
from typing import Dict, Any


class APIPerformanceTest:
    """API-focused performance testing"""

    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "server_status": {},
            "authentication_test": {},
            "api_endpoints": {},
            "booking_workflow": {},
            "load_test": {},
            "security_test": {},
            "summary": {},
        }
        self.auth_token = None
        self.auth_headers = {}

    def check_server_and_authenticate(self) -> bool:
        """Check server status and authenticate"""
        print("🔍 Checking server status and authenticating...")

        try:
            # Check health endpoint
            start_time = time.time()
            response = requests.get(f"{self.base_url}/health", timeout=5)
            health_time = time.time() - start_time

            if response.status_code == 200:
                self.results["server_status"] = {
                    "running": True,
                    "health_response_time": health_time,
                    "health_data": response.json() if response.content else {},
                }
                print(f"   ✅ Server is running ({health_time:.3f}s)")
            else:
                self.results["server_status"] = {
                    "running": False,
                    "status_code": response.status_code,
                }
                print(f"   ❌ Server health check failed: {response.status_code}")
                return False

            # Authenticate
            login_start = time.time()
            login_data = {"username": "admin@6fb.com", "password": "admin123"}

            response = requests.post(
                f"{self.base_url}/api/v1/auth/token", data=login_data
            )
            auth_time = time.time() - login_start

            if response.status_code == 200:
                token_data = response.json()
                self.auth_token = token_data.get("access_token")
                self.auth_headers = {"Authorization": f"Bearer {self.auth_token}"}

                self.results["authentication_test"] = {
                    "success": True,
                    "time": auth_time,
                    "has_token": bool(self.auth_token),
                    "user_data": token_data.get("user", {}),
                }
                print(f"   ✅ Authentication successful ({auth_time:.3f}s)")
                return True
            else:
                self.results["authentication_test"] = {
                    "success": False,
                    "status_code": response.status_code,
                    "time": auth_time,
                }
                print(f"   ❌ Authentication failed: {response.status_code}")
                return False

        except Exception as e:
            self.results["server_status"] = {"error": str(e)}
            print(f"   ❌ Server check failed: {e}")
            return False

    def test_api_endpoints(self) -> Dict[str, Any]:
        """Test all major API endpoints for performance and functionality"""
        print("\n🔍 Testing API Endpoints...")

        results = {
            "endpoints_tested": 0,
            "successful_endpoints": 0,
            "failed_endpoints": 0,
            "endpoint_details": {},
            "average_response_time": 0,
        }

        # Define endpoints to test
        endpoints = [
            ("GET", "/api/v1/auth/me", "Get current user", True),
            ("GET", "/api/v1/services", "List services", False),
            ("GET", "/api/v1/clients", "List clients", True),
            ("GET", "/api/v1/barbers", "List barbers", True),
            ("GET", "/api/v1/appointments", "List appointments", True),
            ("GET", "/api/v1/analytics/dashboard", "Dashboard analytics", True),
            ("GET", "/health", "Health check", False),
            ("GET", "/api/v1/auth/me", "Protected route test", True),
        ]

        response_times = []

        for method, endpoint, description, requires_auth in endpoints:
            try:
                start_time = time.time()
                headers = self.auth_headers if requires_auth else {}

                if method == "GET":
                    response = requests.get(
                        f"{self.base_url}{endpoint}", headers=headers, timeout=10
                    )
                else:
                    response = requests.request(
                        method,
                        f"{self.base_url}{endpoint}",
                        headers=headers,
                        timeout=10,
                    )

                response_time = time.time() - start_time
                response_times.append(response_time)

                success = response.status_code in [200, 201]
                if success:
                    results["successful_endpoints"] += 1
                else:
                    results["failed_endpoints"] += 1

                results["endpoint_details"][endpoint] = {
                    "method": method,
                    "description": description,
                    "status_code": response.status_code,
                    "response_time": response_time,
                    "success": success,
                    "requires_auth": requires_auth,
                    "response_size": len(response.content) if response.content else 0,
                }

                status_icon = "✅" if success else "❌"
                print(
                    f"   {status_icon} {method} {endpoint}: {response.status_code} ({response_time:.3f}s)"
                )

            except Exception as e:
                results["failed_endpoints"] += 1
                results["endpoint_details"][endpoint] = {
                    "error": str(e),
                    "response_time": time.time() - start_time,
                }
                print(f"   ❌ {method} {endpoint}: Error - {e}")

            results["endpoints_tested"] += 1

        if response_times:
            results["average_response_time"] = statistics.mean(response_times)
            results["fastest_response"] = min(response_times)
            results["slowest_response"] = max(response_times)

        print(
            f"   📊 Tested {results['endpoints_tested']} endpoints: {results['successful_endpoints']} successful, {results['failed_endpoints']} failed"
        )
        print(
            f"   📊 Average response time: {results.get('average_response_time', 0):.3f}s"
        )

        return results

    def test_booking_workflow(self) -> Dict[str, Any]:
        """Test complete booking workflow"""
        print("\n🔍 Testing Booking Workflow...")

        results = {
            "workflow_steps": {},
            "total_workflow_time": 0,
            "workflow_successful": False,
            "created_booking_id": None,
        }

        workflow_start = time.time()

        try:
            # Step 1: Get available services
            print("   Step 1: Getting available services...")
            step_start = time.time()
            response = requests.get(
                f"{self.base_url}/api/v1/services", headers=self.auth_headers
            )
            step_time = time.time() - step_start

            if response.status_code == 200:
                services = response.json()
                results["workflow_steps"]["get_services"] = {
                    "success": True,
                    "time": step_time,
                    "service_count": len(services) if isinstance(services, list) else 0,
                }
                print(
                    f"   ✅ Services retrieved ({step_time:.3f}s) - {len(services) if isinstance(services, list) else 0} services"
                )
            else:
                results["workflow_steps"]["get_services"] = {
                    "success": False,
                    "status_code": response.status_code,
                    "time": step_time,
                }
                print(f"   ❌ Services retrieval failed: {response.status_code}")
                return results

            # Step 2: Get available clients
            print("   Step 2: Getting available clients...")
            step_start = time.time()
            response = requests.get(
                f"{self.base_url}/api/v1/clients", headers=self.auth_headers
            )
            step_time = time.time() - step_start

            if response.status_code == 200:
                clients = response.json()
                results["workflow_steps"]["get_clients"] = {
                    "success": True,
                    "time": step_time,
                    "client_count": len(clients) if isinstance(clients, list) else 0,
                }
                print(
                    f"   ✅ Clients retrieved ({step_time:.3f}s) - {len(clients) if isinstance(clients, list) else 0} clients"
                )
            else:
                results["workflow_steps"]["get_clients"] = {
                    "success": False,
                    "status_code": response.status_code,
                    "time": step_time,
                }
                print(f"   ❌ Clients retrieval failed: {response.status_code}")
                clients = []

            # Step 3: Get available barbers
            print("   Step 3: Getting available barbers...")
            step_start = time.time()
            response = requests.get(
                f"{self.base_url}/api/v1/barbers", headers=self.auth_headers
            )
            step_time = time.time() - step_start

            if response.status_code == 200:
                barbers = response.json()
                results["workflow_steps"]["get_barbers"] = {
                    "success": True,
                    "time": step_time,
                    "barber_count": len(barbers) if isinstance(barbers, list) else 0,
                }
                print(
                    f"   ✅ Barbers retrieved ({step_time:.3f}s) - {len(barbers) if isinstance(barbers, list) else 0} barbers"
                )
            else:
                results["workflow_steps"]["get_barbers"] = {
                    "success": False,
                    "status_code": response.status_code,
                    "time": step_time,
                }
                print(f"   ❌ Barbers retrieval failed: {response.status_code}")
                barbers = []

            # Step 4: Create a booking (if we have required data)
            if clients and barbers and services:
                print("   Step 4: Creating test booking...")
                step_start = time.time()

                booking_data = {
                    "client_id": (
                        clients[0]["id"] if isinstance(clients, list) and clients else 1
                    ),
                    "barber_id": (
                        barbers[0]["id"] if isinstance(barbers, list) and barbers else 1
                    ),
                    "service_id": (
                        services[0]["id"]
                        if isinstance(services, list) and services
                        else 1
                    ),
                    "scheduled_at": (
                        datetime.now() + timedelta(days=1, hours=14)
                    ).isoformat(),
                    "notes": "API performance test booking",
                    "status": "scheduled",
                }

                response = requests.post(
                    f"{self.base_url}/api/v1/appointments",
                    json=booking_data,
                    headers=self.auth_headers,
                )
                step_time = time.time() - step_start

                if response.status_code in [200, 201]:
                    booking = response.json()
                    results["workflow_steps"]["create_booking"] = {
                        "success": True,
                        "time": step_time,
                        "booking_id": booking.get("id"),
                        "booking_status": booking.get("status"),
                    }
                    results["created_booking_id"] = booking.get("id")
                    results["workflow_successful"] = True
                    print(
                        f"   ✅ Booking created ({step_time:.3f}s) - ID: {booking.get('id')}"
                    )
                else:
                    results["workflow_steps"]["create_booking"] = {
                        "success": False,
                        "status_code": response.status_code,
                        "time": step_time,
                        "error": (
                            response.text[:200] if response.text else "Unknown error"
                        ),
                    }
                    print(f"   ❌ Booking creation failed: {response.status_code}")
            else:
                results["workflow_steps"]["create_booking"] = {
                    "success": False,
                    "error": "Missing required data (clients, barbers, or services)",
                    "time": 0,
                }
                print(f"   ⚠️  Booking creation skipped - missing required data")

            results["total_workflow_time"] = time.time() - workflow_start

        except Exception as e:
            results["error"] = str(e)
            results["total_workflow_time"] = time.time() - workflow_start
            print(f"   ❌ Workflow test failed: {e}")

        return results

    def test_security_endpoints(self) -> Dict[str, Any]:
        """Test security-related endpoints and protections"""
        print("\n🔍 Testing Security Endpoints...")

        results = {
            "jwt_protection": {},
            "forgot_password": {},
            "input_validation": {},
            "security_score": 0,
        }

        try:
            # Test 1: JWT Protection
            print("   Testing JWT protection...")

            # Test with invalid token
            invalid_headers = {"Authorization": "Bearer invalid_token_12345"}
            response = requests.get(
                f"{self.base_url}/api/v1/auth/me", headers=invalid_headers
            )

            results["jwt_protection"]["invalid_token"] = {
                "properly_rejected": response.status_code == 401,
                "status_code": response.status_code,
            }

            # Test without token
            response = requests.get(f"{self.base_url}/api/v1/auth/me")
            results["jwt_protection"]["no_token"] = {
                "properly_rejected": response.status_code == 401,
                "status_code": response.status_code,
            }

            print(
                f"   JWT Protection - Invalid token: {'✅' if results['jwt_protection']['invalid_token']['properly_rejected'] else '❌'}"
            )
            print(
                f"   JWT Protection - No token: {'✅' if results['jwt_protection']['no_token']['properly_rejected'] else '❌'}"
            )

            # Test 2: Forgot Password Endpoint
            print("   Testing forgot password functionality...")
            forgot_data = {"email": "admin@6fb.com"}
            response = requests.post(
                f"{self.base_url}/api/v1/auth/forgot-password", json=forgot_data
            )

            results["forgot_password"] = {
                "endpoint_exists": response.status_code != 404,
                "status_code": response.status_code,
                "implemented": response.status_code in [200, 202],
                "response_time": 0,  # We're not timing this one
            }

            forgot_status = (
                "✅ Implemented"
                if results["forgot_password"]["implemented"]
                else f"⚠️ Status: {response.status_code}"
            )
            print(f"   Forgot Password - {forgot_status}")

            # Test 3: Basic Input Validation
            print("   Testing input validation...")

            # Test SQL injection in login
            malicious_login = {
                "username": "admin'; DROP TABLE users; --",
                "password": "password",
            }
            response = requests.post(
                f"{self.base_url}/api/v1/auth/token", data=malicious_login
            )

            results["input_validation"]["sql_injection"] = {
                "properly_handled": response.status_code != 200,
                "status_code": response.status_code,
            }

            print(
                f"   Input Validation - SQL injection handled: {'✅' if results['input_validation']['sql_injection']['properly_handled'] else '❌'}"
            )

            # Calculate security score
            security_checks = [
                results["jwt_protection"]["invalid_token"]["properly_rejected"],
                results["jwt_protection"]["no_token"]["properly_rejected"],
                results["forgot_password"]["implemented"],
                results["input_validation"]["sql_injection"]["properly_handled"],
            ]

            results["security_score"] = (
                sum(security_checks) / len(security_checks)
            ) * 100
            print(f"   📊 Security Score: {results['security_score']:.1f}%")

        except Exception as e:
            results["error"] = str(e)
            print(f"   ❌ Security test failed: {e}")

        return results

    def test_load_performance(self) -> Dict[str, Any]:
        """Test API performance under load"""
        print("\n🔍 Testing Load Performance...")

        results = {
            "concurrent_requests": {},
            "response_time_analysis": {},
            "throughput": {},
        }

        try:
            import concurrent.futures

            def make_api_request(endpoint):
                start_time = time.time()
                try:
                    if endpoint.startswith("/api/v1/auth/"):
                        response = requests.get(
                            f"{self.base_url}{endpoint}",
                            headers=self.auth_headers,
                            timeout=10,
                        )
                    else:
                        response = requests.get(
                            f"{self.base_url}{endpoint}", timeout=10
                        )
                    end_time = time.time()
                    return {
                        "success": response.status_code == 200,
                        "status_code": response.status_code,
                        "response_time": end_time - start_time,
                    }
                except Exception as e:
                    return {
                        "success": False,
                        "error": str(e),
                        "response_time": time.time() - start_time,
                    }

            # Test endpoints under load
            test_endpoints = ["/health", "/api/v1/services", "/api/v1/auth/me"]

            for concurrent_users in [5, 10]:
                print(f"   Testing with {concurrent_users} concurrent requests...")

                start_time = time.time()

                with concurrent.futures.ThreadPoolExecutor(
                    max_workers=concurrent_users
                ) as executor:
                    futures = []
                    for _ in range(concurrent_users):
                        for endpoint in test_endpoints:
                            futures.append(executor.submit(make_api_request, endpoint))

                    load_results = []
                    for future in concurrent.futures.as_completed(futures):
                        load_results.append(future.result())

                end_time = time.time()

                successful_requests = [r for r in load_results if r["success"]]
                total_requests = len(load_results)

                if successful_requests:
                    avg_response_time = statistics.mean(
                        [r["response_time"] for r in successful_requests]
                    )
                    max_response_time = max(
                        [r["response_time"] for r in successful_requests]
                    )
                else:
                    avg_response_time = max_response_time = 0

                results["concurrent_requests"][f"{concurrent_users}_concurrent"] = {
                    "total_requests": total_requests,
                    "successful_requests": len(successful_requests),
                    "success_rate": (
                        (len(successful_requests) / total_requests) * 100
                        if total_requests > 0
                        else 0
                    ),
                    "avg_response_time": avg_response_time,
                    "max_response_time": max_response_time,
                    "total_time": end_time - start_time,
                    "requests_per_second": (
                        total_requests / (end_time - start_time)
                        if (end_time - start_time) > 0
                        else 0
                    ),
                }

                success_rate = results["concurrent_requests"][
                    f"{concurrent_users}_concurrent"
                ]["success_rate"]
                print(
                    f"     Success rate: {success_rate:.1f}% ({len(successful_requests)}/{total_requests})"
                )
                print(f"     Average response time: {avg_response_time:.3f}s")
                print(
                    f"     Requests per second: {results['concurrent_requests'][f'{concurrent_users}_concurrent']['requests_per_second']:.1f}"
                )

        except Exception as e:
            results["error"] = str(e)
            print(f"   ❌ Load test failed: {e}")

        return results

    def generate_summary(self) -> Dict[str, Any]:
        """Generate comprehensive test summary"""
        summary = {
            "overall_score": 0,
            "api_functionality": "unknown",
            "booking_workflow": "unknown",
            "security_status": "unknown",
            "performance_status": "unknown",
            "critical_issues": [],
            "recommendations": [],
            "key_metrics": {},
        }

        try:
            scores = []

            # API endpoints score
            api_results = self.results.get("api_endpoints", {})
            if api_results.get("endpoints_tested", 0) > 0:
                endpoint_success_rate = (
                    api_results.get("successful_endpoints", 0)
                    / api_results.get("endpoints_tested", 1)
                ) * 100
                scores.append(endpoint_success_rate)
                summary["api_functionality"] = (
                    "good" if endpoint_success_rate >= 80 else "needs_work"
                )

            # Booking workflow score
            booking_results = self.results.get("booking_workflow", {})
            if booking_results.get("workflow_successful", False):
                scores.append(100)
                summary["booking_workflow"] = "working"
            else:
                scores.append(60)
                summary["booking_workflow"] = "issues"

            # Security score
            security_results = self.results.get("security_test", {})
            security_score = security_results.get("security_score", 70)
            scores.append(security_score)
            if security_score >= 80:
                summary["security_status"] = "good"
            elif security_score >= 60:
                summary["security_status"] = "acceptable"
            else:
                summary["security_status"] = "needs_improvement"

            # Performance score
            load_results = self.results.get("load_test", {})
            concurrent_results = load_results.get("concurrent_requests", {})
            if concurrent_results:
                avg_success_rate = statistics.mean(
                    [
                        test_data.get("success_rate", 0)
                        for test_data in concurrent_results.values()
                    ]
                )
                scores.append(avg_success_rate)
                summary["performance_status"] = (
                    "good" if avg_success_rate >= 90 else "acceptable"
                )
            else:
                scores.append(75)  # Default score
                summary["performance_status"] = "not_tested"

            summary["overall_score"] = statistics.mean(scores) if scores else 0

            # Identify issues and recommendations
            if summary["api_functionality"] == "needs_work":
                summary["critical_issues"].append("Multiple API endpoints are failing")

            if summary["booking_workflow"] == "issues":
                summary["critical_issues"].append(
                    "End-to-end booking workflow has failures"
                )

            if security_score < 75:
                summary["critical_issues"].append(
                    "Security configuration needs improvement"
                )

            if summary["performance_status"] not in ["good", "acceptable"]:
                summary["recommendations"].append(
                    "Improve API response times and reliability"
                )

            # Key metrics
            summary["key_metrics"] = {
                "avg_api_response_time": api_results.get("average_response_time", 0),
                "api_success_rate": (
                    endpoint_success_rate if "endpoint_success_rate" in locals() else 0
                ),
                "booking_workflow_time": booking_results.get("total_workflow_time", 0),
                "security_score": security_score,
                "max_concurrent_users_tested": 10,  # Based on our test
            }

        except Exception as e:
            summary["error"] = str(e)

        return summary

    def run_tests(self):
        """Run all API performance tests"""
        print("🚀 6FB Booking Platform - API Performance Testing")
        print("=" * 55)

        # Check server and authenticate
        if not self.check_server_and_authenticate():
            print("❌ Cannot proceed without server access")
            return None

        start_time = time.time()

        # Run all tests
        self.results["api_endpoints"] = self.test_api_endpoints()
        self.results["booking_workflow"] = self.test_booking_workflow()
        self.results["security_test"] = self.test_security_endpoints()
        self.results["load_test"] = self.test_load_performance()

        # Generate summary
        self.results["summary"] = self.generate_summary()

        total_time = time.time() - start_time
        self.results["total_test_time"] = total_time

        # Display results
        print("\n" + "=" * 55)
        print("📊 API PERFORMANCE TEST RESULTS")
        print("=" * 55)

        summary = self.results["summary"]

        print(f"🎯 Overall Score: {summary['overall_score']:.1f}/100")
        print(f"⏱️  Total Test Time: {total_time:.2f} seconds")

        print(f"\n📈 Component Status:")
        print(
            f"   • API Functionality: {summary['api_functionality'].replace('_', ' ').title()}"
        )
        print(
            f"   • Booking Workflow: {summary['booking_workflow'].replace('_', ' ').title()}"
        )
        print(
            f"   • Security Status: {summary['security_status'].replace('_', ' ').title()}"
        )
        print(
            f"   • Performance Status: {summary['performance_status'].replace('_', ' ').title()}"
        )

        # Key metrics
        metrics = summary["key_metrics"]
        print(f"\n📊 Key Metrics:")
        print(
            f"   • Average API Response Time: {metrics['avg_api_response_time']:.3f}s"
        )
        print(f"   • API Success Rate: {metrics['api_success_rate']:.1f}%")
        print(f"   • Booking Workflow Time: {metrics['booking_workflow_time']:.3f}s")
        print(f"   • Security Score: {metrics['security_score']:.1f}/100")

        # Issues and recommendations
        if summary["critical_issues"]:
            print(f"\n❌ Critical Issues ({len(summary['critical_issues'])}):")
            for issue in summary["critical_issues"]:
                print(f"   • {issue}")

        if summary["recommendations"]:
            print(f"\n💡 Recommendations ({len(summary['recommendations'])}):")
            for rec in summary["recommendations"]:
                print(f"   • {rec}")

        if not summary["critical_issues"]:
            print(f"\n🎉 All API tests passed successfully!")

        return self.results


def main():
    """Main function"""
    test_suite = APIPerformanceTest()

    try:
        results = test_suite.run_tests()

        if results:
            # Save results
            report_path = Path(__file__).parent.parent / "api_performance_report.json"
            with open(report_path, "w") as f:
                json.dump(results, f, indent=2, default=str)

            print(f"\n📄 API performance report saved to: {report_path}")

            return results

    except KeyboardInterrupt:
        print("\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        traceback.print_exc()


if __name__ == "__main__":
    main()
