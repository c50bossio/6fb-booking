#!/usr/bin/env python3
"""
Rate Limiting Performance Impact Analysis
Tests API performance with and without rate limiting active
"""

import time
import requests
import json
import concurrent.futures
import statistics
from datetime import datetime
from collections import defaultdict


class RateLimitPerformanceAnalyzer:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.results = defaultdict(list)

    def single_request_test(self, endpoint, description=""):
        """Test a single request and measure response time"""
        start_time = time.time()
        try:
            response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
            end_time = time.time()

            response_time = (end_time - start_time) * 1000  # Convert to ms

            rate_limit_headers = {
                "limit": response.headers.get("X-RateLimit-Limit", "N/A"),
                "remaining": response.headers.get("X-RateLimit-Remaining", "N/A"),
                "reset": response.headers.get("X-RateLimit-Reset", "N/A"),
                "window": response.headers.get("X-RateLimit-Window", "N/A"),
            }

            return {
                "endpoint": endpoint,
                "description": description,
                "status_code": response.status_code,
                "response_time_ms": response_time,
                "rate_limit_headers": rate_limit_headers,
                "success": response.status_code < 400,
                "rate_limited": response.status_code == 429,
            }
        except Exception as e:
            return {
                "endpoint": endpoint,
                "description": description,
                "error": str(e),
                "success": False,
                "rate_limited": False,
                "response_time_ms": 0,
            }

    def burst_test(self, endpoint, num_requests=20, description=""):
        """Test burst requests to trigger rate limiting"""
        print(f"\n🔥 Burst Testing: {description}")
        print(f"   Endpoint: {endpoint}")
        print(f"   Requests: {num_requests}")

        results = []
        start_time = time.time()

        for i in range(num_requests):
            result = self.single_request_test(endpoint, f"Burst #{i+1}")
            results.append(result)

            if result.get("rate_limited"):
                print(f"   💥 Rate limited at request #{i+1}")
                break

            # Small delay to avoid overwhelming
            time.sleep(0.1)

        total_time = time.time() - start_time
        successful_requests = sum(1 for r in results if r["success"])
        rate_limited_requests = sum(1 for r in results if r.get("rate_limited"))

        if successful_requests > 0:
            response_times = [r["response_time_ms"] for r in results if r["success"]]
            avg_response_time = statistics.mean(response_times)
            max_response_time = max(response_times)
            min_response_time = min(response_times)
        else:
            avg_response_time = max_response_time = min_response_time = 0

        return {
            "endpoint": endpoint,
            "description": description,
            "total_requests": num_requests,
            "successful_requests": successful_requests,
            "rate_limited_requests": rate_limited_requests,
            "total_time_seconds": total_time,
            "avg_response_time_ms": avg_response_time,
            "max_response_time_ms": max_response_time,
            "min_response_time_ms": min_response_time,
            "requests_per_second": num_requests / total_time if total_time > 0 else 0,
            "success_rate": (successful_requests / num_requests) * 100,
        }

    def concurrent_load_test(self, endpoint, concurrent_users=5, requests_per_user=10):
        """Test concurrent users to see rate limiting behavior"""
        print(f"\n👥 Concurrent Load Test")
        print(f"   Endpoint: {endpoint}")
        print(f"   Concurrent Users: {concurrent_users}")
        print(f"   Requests per User: {requests_per_user}")

        def user_requests(user_id):
            user_results = []
            for i in range(requests_per_user):
                result = self.single_request_test(
                    endpoint, f"User {user_id} Request #{i+1}"
                )
                user_results.append(result)
                time.sleep(0.5)  # Space out requests
            return user_results

        start_time = time.time()
        all_results = []

        with concurrent.futures.ThreadPoolExecutor(
            max_workers=concurrent_users
        ) as executor:
            futures = [
                executor.submit(user_requests, i) for i in range(concurrent_users)
            ]

            for future in concurrent.futures.as_completed(futures):
                user_results = future.result()
                all_results.extend(user_results)

        total_time = time.time() - start_time
        successful_requests = sum(1 for r in all_results if r["success"])
        rate_limited_requests = sum(1 for r in all_results if r.get("rate_limited"))
        total_requests = len(all_results)

        if successful_requests > 0:
            response_times = [
                r["response_time_ms"] for r in all_results if r["success"]
            ]
            avg_response_time = statistics.mean(response_times)
        else:
            avg_response_time = 0

        return {
            "endpoint": endpoint,
            "concurrent_users": concurrent_users,
            "requests_per_user": requests_per_user,
            "total_requests": total_requests,
            "successful_requests": successful_requests,
            "rate_limited_requests": rate_limited_requests,
            "total_time_seconds": total_time,
            "avg_response_time_ms": avg_response_time,
            "success_rate": (
                (successful_requests / total_requests) * 100
                if total_requests > 0
                else 0
            ),
            "requests_per_second": total_requests / total_time if total_time > 0 else 0,
        }

    def test_different_endpoints(self):
        """Test different endpoint types with their respective rate limits"""
        print("=" * 60)
        print("🚀 6FB BOOKING RATE LIMITING PERFORMANCE ANALYSIS")
        print("=" * 60)

        # Test different endpoint types according to rate limiting rules
        endpoints_to_test = [
            ("/health", "Health Check (200/min)", 10),
            (
                "/api/v1/auth/me",
                "Auth Endpoint (5/5min)",
                6,
            ),  # Should trigger rate limit
        ]

        results = {}

        for endpoint, description, burst_size in endpoints_to_test:
            print(f"\n📊 Testing {description}")

            # Single request test
            single_result = self.single_request_test(endpoint, description)
            print(
                f"   Single Request: {single_result['response_time_ms']:.2f}ms - Status: {single_result['status_code']}"
            )

            if single_result.get("rate_limit_headers"):
                headers = single_result["rate_limit_headers"]
                print(
                    f"   Rate Limit Headers: {headers['remaining']}/{headers['limit']} remaining"
                )

            # Burst test
            burst_result = self.burst_test(endpoint, burst_size, description)

            # Small concurrent test
            concurrent_result = self.concurrent_load_test(endpoint, 2, 3)

            results[endpoint] = {
                "single": single_result,
                "burst": burst_result,
                "concurrent": concurrent_result,
            }

            time.sleep(2)  # Cooldown between endpoint tests

        return results

    def generate_report(self, results):
        """Generate comprehensive performance report"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "rate_limiting_analysis": {},
            "performance_summary": {},
            "recommendations": [],
        }

        print("\n" + "=" * 60)
        print("📈 RATE LIMITING PERFORMANCE REPORT")
        print("=" * 60)

        for endpoint, tests in results.items():
            single = tests["single"]
            burst = tests["burst"]
            concurrent = tests["concurrent"]

            print(f"\n🎯 {endpoint}")
            print(f"   Single Request: {single['response_time_ms']:.2f}ms")
            print(
                f"   Burst Test: {burst['success_rate']:.1f}% success, {burst['avg_response_time_ms']:.2f}ms avg"
            )
            print(
                f"   Rate Limited: {burst['rate_limited_requests']}/{burst['total_requests']} requests"
            )
            print(
                f"   Concurrent Test: {concurrent['success_rate']:.1f}% success, {concurrent['avg_response_time_ms']:.2f}ms avg"
            )

            # Analyze impact
            if burst["rate_limited_requests"] > 0:
                print(
                    f"   ⚠️  Rate limiting triggered after {burst['successful_requests']} requests"
                )
            else:
                print(f"   ✅ No rate limiting in {burst['total_requests']} requests")

            report["rate_limiting_analysis"][endpoint] = {
                "single_request_ms": single["response_time_ms"],
                "burst_success_rate": burst["success_rate"],
                "burst_avg_response_ms": burst["avg_response_time_ms"],
                "rate_limited_count": burst["rate_limited_requests"],
                "concurrent_success_rate": concurrent["success_rate"],
                "rate_limiting_effective": burst["rate_limited_requests"] > 0,
            }

        # Overall performance impact analysis
        avg_response_times = []
        rate_limiting_effectiveness = 0

        for endpoint_data in report["rate_limiting_analysis"].values():
            if endpoint_data["single_request_ms"] > 0:
                avg_response_times.append(endpoint_data["single_request_ms"])
            if endpoint_data["rate_limiting_effective"]:
                rate_limiting_effectiveness += 1

        if avg_response_times:
            overall_avg_response = statistics.mean(avg_response_times)
        else:
            overall_avg_response = 0

        performance_impact = (
            "Low"
            if overall_avg_response < 100
            else "Medium" if overall_avg_response < 500 else "High"
        )

        report["performance_summary"] = {
            "overall_avg_response_time_ms": overall_avg_response,
            "performance_impact": performance_impact,
            "rate_limiting_effective": rate_limiting_effectiveness > 0,
            "endpoints_with_rate_limiting": rate_limiting_effectiveness,
            "total_endpoints_tested": len(results),
        }

        print(f"\n🏆 OVERALL PERFORMANCE IMPACT")
        print(f"   Average Response Time: {overall_avg_response:.2f}ms")
        print(f"   Performance Impact: {performance_impact}")
        print(
            f"   Rate Limiting Working: {'✅ Yes' if rate_limiting_effectiveness > 0 else '❌ No'}"
        )

        # Recommendations
        recommendations = []

        if overall_avg_response > 200:
            recommendations.append("Consider optimizing API response times")

        if rate_limiting_effectiveness == 0:
            recommendations.append("Rate limiting may not be properly configured")
        else:
            recommendations.append("Rate limiting is working effectively")

        if overall_avg_response < 50:
            recommendations.append(
                "Excellent API performance - rate limiting has minimal impact"
            )

        report["recommendations"] = recommendations

        print(f"\n💡 RECOMMENDATIONS:")
        for rec in recommendations:
            print(f"   • {rec}")

        return report


def main():
    analyzer = RateLimitPerformanceAnalyzer()

    # Check if server is running
    try:
        response = requests.get(f"{analyzer.base_url}/health", timeout=5)
        print(f"✅ Server is running (Status: {response.status_code})")
    except:
        print("❌ Server is not running. Please start the backend server first.")
        print("   Run: python -m uvicorn main:app --host 0.0.0.0 --port 8000")
        return

    # Run tests
    results = analyzer.test_different_endpoints()

    # Generate report
    report = analyzer.generate_report(results)

    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"/Users/bossio/6fb-booking/backend/rate_limiting_performance_report_{timestamp}.json"

    with open(report_file, "w") as f:
        json.dump(report, f, indent=2, default=str)

    print(f"\n📄 Report saved to: {report_file}")
    print("\n🎉 Rate limiting performance analysis complete!")


if __name__ == "__main__":
    main()
