#!/usr/bin/env python3
"""
Comprehensive API Validation and Integration Test Suite for 6FB Booking System
This script tests all major API endpoints and validates integration between frontend and backend.
"""

import requests
import json
import time
from datetime import datetime, date, timedelta
from typing import Dict, Optional, Any

# API Base Configuration
BASE_URL = "http://localhost:8001"
API_V1_URL = f"{BASE_URL}/api/v1"

class APITestResults:
    def __init__(self):
        self.results = []
        self.failed_tests = []
        self.security_issues = []
        self.performance_issues = []
        self.schema_mismatches = []
        
    def add_result(self, endpoint: str, method: str, status: str, response_time: float, 
                   details: str = "", expected_status: int = 200, actual_status: int = 0):
        result = {
            "endpoint": endpoint,
            "method": method,
            "status": status,
            "response_time_ms": response_time * 1000,
            "details": details,
            "expected_status": expected_status,
            "actual_status": actual_status,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        
        if status == "FAILED":
            self.failed_tests.append(result)
        if response_time > 2.0:  # Slow response (>2 seconds)
            self.performance_issues.append(result)
            
    def add_security_issue(self, endpoint: str, issue: str):
        self.security_issues.append({
            "endpoint": endpoint,
            "issue": issue,
            "severity": "HIGH" if "unauthorized access" in issue.lower() else "MEDIUM"
        })
        
    def add_schema_mismatch(self, endpoint: str, issue: str, expected: Any, actual: Any):
        self.schema_mismatches.append({
            "endpoint": endpoint,
            "issue": issue,
            "expected": expected,
            "actual": actual
        })
        
    def generate_report(self) -> Dict:
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if r["status"] == "PASSED"])
        failed_tests = len(self.failed_tests)
        
        return {
            "summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "success_rate": f"{(passed_tests/total_tests)*100:.1f}%" if total_tests > 0 else "0%",
                "avg_response_time_ms": sum(r["response_time_ms"] for r in self.results) / total_tests if total_tests > 0 else 0
            },
            "detailed_results": self.results,
            "failed_tests": self.failed_tests,
            "security_issues": self.security_issues,
            "performance_issues": self.performance_issues,
            "schema_mismatches": self.schema_mismatches
        }

class APITester:
    def __init__(self):
        self.results = APITestResults()
        self.session = requests.Session()
        self.auth_token = None
        self.refresh_token = None
        self.test_user_data = {
            "email": "testuser@example.com",
            "password": "TestPassword123",
            "name": "Test User"
        }
        
    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    params: Optional[Dict] = None, headers: Optional[Dict] = None,
                    expected_status: int = 200) -> requests.Response:
        """Make HTTP request with timing and error handling."""
        url = f"{API_V1_URL}{endpoint}"
        
        # Add auth header if token exists
        if self.auth_token and headers is None:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
        elif self.auth_token and headers is not None:
            headers["Authorization"] = f"Bearer {self.auth_token}"
            
        start_time = time.time()
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, params=params, headers=headers)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            response_time = time.time() - start_time
            
            status = "PASSED" if response.status_code == expected_status else "FAILED"
            details = f"Response: {response.status_code} - {response.text[:200]}..." if len(response.text) > 200 else f"Response: {response.status_code} - {response.text}"
            
            self.results.add_result(
                endpoint=endpoint,
                method=method.upper(),
                status=status,
                response_time=response_time,
                details=details,
                expected_status=expected_status,
                actual_status=response.status_code
            )
            
            return response
            
        except requests.exceptions.RequestException as e:
            response_time = time.time() - start_time
            self.results.add_result(
                endpoint=endpoint,
                method=method.upper(),
                status="FAILED",
                response_time=response_time,
                details=f"Request failed: {str(e)}",
                expected_status=expected_status,
                actual_status=0
            )
            return None
            
    def test_health_endpoints(self):
        """Test basic health and root endpoints."""
        print("Testing health endpoints...")
        
        # Test root endpoint
        response = requests.get(BASE_URL)
        start_time = time.time()
        response_time = time.time() - start_time
        
        if response.status_code == 200:
            self.results.add_result("/", "GET", "PASSED", response_time, "Root endpoint accessible")
        else:
            self.results.add_result("/", "GET", "FAILED", response_time, f"Root endpoint failed: {response.status_code}")
            
        # Test health endpoint
        response = requests.get(f"{BASE_URL}/health")
        start_time = time.time()
        response_time = time.time() - start_time
        
        if response.status_code == 200:
            self.results.add_result("/health", "GET", "PASSED", response_time, "Health check passed")
        else:
            self.results.add_result("/health", "GET", "FAILED", response_time, f"Health check failed: {response.status_code}")
        
    def test_authentication_endpoints(self):
        """Test authentication flow: register, login, token refresh, me endpoint."""
        print("Testing authentication endpoints...")
        
        # Test registration (if endpoint exists)
        register_response = self.make_request("POST", "/auth/register", self.test_user_data, expected_status=201)
        
        # Test login
        login_data = {
            "username": self.test_user_data["email"],
            "password": self.test_user_data["password"]
        }
        login_response = self.make_request("POST", "/auth/login", login_data)
        
        if login_response and login_response.status_code == 200:
            try:
                token_data = login_response.json()
                if "access_token" in token_data:
                    self.auth_token = token_data["access_token"]
                    if "refresh_token" in token_data:
                        self.refresh_token = token_data["refresh_token"]
                else:
                    self.results.add_schema_mismatch("/auth/login", "Missing access_token in response", "access_token", token_data)
            except json.JSONDecodeError:
                self.results.add_schema_mismatch("/auth/login", "Invalid JSON response", "valid JSON", login_response.text)
        
        # Test /auth/me endpoint
        me_response = self.make_request("GET", "/auth/me")
        if me_response and me_response.status_code == 200:
            try:
                user_data = me_response.json()
                required_fields = ["id", "email", "name"]
                for field in required_fields:
                    if field not in user_data:
                        self.results.add_schema_mismatch("/auth/me", f"Missing required field: {field}", field, user_data)
            except json.JSONDecodeError:
                self.results.add_schema_mismatch("/auth/me", "Invalid JSON response", "valid JSON", me_response.text)
        
        # Test token refresh if we have a refresh token
        if self.refresh_token:
            refresh_data = {"refresh_token": self.refresh_token}
            refresh_response = self.make_request("POST", "/auth/refresh", refresh_data)
            if refresh_response and refresh_response.status_code == 200:
                try:
                    new_token_data = refresh_response.json()
                    if "access_token" in new_token_data:
                        self.auth_token = new_token_data["access_token"]
                except json.JSONDecodeError:
                    self.results.add_schema_mismatch("/auth/refresh", "Invalid JSON response", "valid JSON", refresh_response.text)
        
        # Test password reset request
        reset_data = {"email": self.test_user_data["email"]}
        self.make_request("POST", "/auth/forgot-password", reset_data)
        
    def test_security_endpoints(self):
        """Test security measures: unauthorized access, rate limiting."""
        print("Testing security measures...")
        
        # Test protected endpoint without auth
        old_token = self.auth_token
        self.auth_token = None
        
        response = self.make_request("GET", "/auth/me", expected_status=401)
        if response and response.status_code != 401:
            self.results.add_security_issue("/auth/me", "Unauthorized access allowed - endpoint should require authentication")
        
        # Test with invalid token
        self.auth_token = "invalid_token_12345"
        response = self.make_request("GET", "/auth/me", expected_status=401)
        if response and response.status_code != 401:
            self.results.add_security_issue("/auth/me", "Invalid token accepted - should reject invalid tokens")
        
        # Restore valid token
        self.auth_token = old_token
        
        # Test rate limiting on login endpoint (multiple rapid requests)
        print("Testing rate limiting...")
        for i in range(10):
            login_data = {
                "email": "test@example.com",
                "password": "wrongpassword"
            }
            response = self.make_request("POST", "/auth/login", login_data, expected_status=401)
            if response and response.status_code == 429:
                print(f"Rate limiting detected after {i+1} requests")
                break
            time.sleep(0.1)
        
    def test_booking_endpoints(self):
        """Test booking-related endpoints."""
        print("Testing booking endpoints...")
        
        # Test get available slots
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        slots_response = self.make_request("GET", f"/bookings/slots?booking_date={tomorrow}")
        
        if slots_response and slots_response.status_code == 200:
            try:
                slots_data = slots_response.json()
                expected_fields = ["available_slots", "booking_date"]
                for field in expected_fields:
                    if field not in slots_data:
                        self.results.add_schema_mismatch("/bookings/slots", f"Missing field: {field}", field, slots_data)
            except json.JSONDecodeError:
                self.results.add_schema_mismatch("/bookings/slots", "Invalid JSON response", "valid JSON", slots_response.text)
        
        # Test create booking (with mock data)
        booking_data = {
            "date": tomorrow,
            "time": "10:00",
            "service": "Haircut",
            "notes": "Test booking"
        }
        self.make_request("POST", "/bookings", booking_data, expected_status=201)
        
        # Test get bookings list
        self.make_request("GET", "/bookings")
        
    def test_enterprise_endpoints(self):
        """Test enterprise/admin endpoints."""
        print("Testing enterprise endpoints...")
        
        # Test enterprise dashboard
        dashboard_response = self.make_request("GET", "/enterprise/dashboard")
        
        if dashboard_response and dashboard_response.status_code == 200:
            try:
                dashboard_data = dashboard_response.json()
                # Check for expected dashboard fields
                if "revenue" not in dashboard_data and "total_revenue" not in dashboard_data:
                    self.results.add_schema_mismatch("/enterprise/dashboard", "Missing revenue data", "revenue data", dashboard_data)
            except json.JSONDecodeError:
                self.results.add_schema_mismatch("/enterprise/dashboard", "Invalid JSON response", "valid JSON", dashboard_response.text)
        
        # Test locations endpoint
        self.make_request("GET", "/enterprise/locations")
        
    def test_other_endpoints(self):
        """Test other important endpoints."""
        print("Testing additional endpoints...")
        
        # Test appointments
        self.make_request("GET", "/appointments")
        
        # Test clients
        self.make_request("GET", "/clients")
        
        # Test analytics
        self.make_request("GET", "/analytics/dashboard")
        
        # Test services
        self.make_request("GET", "/services")
        
        # Test timezones
        self.make_request("GET", "/timezones")
        
    def test_cors_configuration(self):
        """Test CORS configuration."""
        print("Testing CORS configuration...")
        
        # Test OPTIONS request
        try:
            response = requests.options(f"{API_V1_URL}/auth/me", headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Authorization"
            })
            
            if response.status_code == 200:
                headers = response.headers
                if "Access-Control-Allow-Origin" in headers:
                    self.results.add_result("/auth/me", "OPTIONS", "PASSED", 0, "CORS preflight successful")
                else:
                    self.results.add_result("/auth/me", "OPTIONS", "FAILED", 0, "CORS headers missing")
            else:
                self.results.add_result("/auth/me", "OPTIONS", "FAILED", 0, f"CORS preflight failed: {response.status_code}")
        except Exception as e:
            self.results.add_result("/auth/me", "OPTIONS", "FAILED", 0, f"CORS test failed: {str(e)}")
            
    def test_performance(self):
        """Test API performance under load."""
        print("Testing API performance...")
        
        # Test multiple concurrent requests to health endpoint
        response_times = []
        for i in range(10):
            start = time.time()
            response = requests.get(f"{BASE_URL}/health")
            end = time.time()
            response_times.append(end - start)
            
        avg_response_time = sum(response_times) / len(response_times)
        max_response_time = max(response_times)
        
        if avg_response_time > 1.0:
            self.results.performance_issues.append({
                "endpoint": "/health",
                "issue": f"Average response time too high: {avg_response_time:.2f}s",
                "avg_time": avg_response_time,
                "max_time": max_response_time
            })
        
    def run_all_tests(self):
        """Run all API tests."""
        print("Starting comprehensive API testing...")
        
        self.test_health_endpoints()
        self.test_authentication_endpoints()
        self.test_security_endpoints()
        self.test_booking_endpoints()
        self.test_enterprise_endpoints()
        self.test_other_endpoints()
        self.test_cors_configuration()
        self.test_performance()
        
        print("All tests completed!")
        return self.results.generate_report()

def main():
    """Main function to run API tests and generate report."""
    tester = APITester()
    
    print("6FB Booking System - Comprehensive API Validation")
    print("=" * 50)
    
    # Run all tests
    report = tester.run_all_tests()
    
    # Generate detailed report
    print("\n" + "=" * 50)
    print("API VALIDATION REPORT")
    print("=" * 50)
    
    # Summary
    summary = report["summary"]
    print(f"Total Tests: {summary['total_tests']}")
    print(f"Passed: {summary['passed']}")
    print(f"Failed: {summary['failed']}")
    print(f"Success Rate: {summary['success_rate']}")
    print(f"Average Response Time: {summary['avg_response_time_ms']:.2f}ms")
    
    # Failed tests
    if report["failed_tests"]:
        print(f"\nFAILED TESTS ({len(report['failed_tests'])}):")
        for test in report["failed_tests"]:
            print(f"  - {test['method']} {test['endpoint']}: {test['details']}")
            
    # Security issues
    if report["security_issues"]:
        print(f"\nSECURITY ISSUES ({len(report['security_issues'])}):")
        for issue in report["security_issues"]:
            print(f"  - {issue['endpoint']}: {issue['issue']} (Severity: {issue['severity']})")
            
    # Performance issues
    if report["performance_issues"]:
        print(f"\nPERFORMANCE ISSUES ({len(report['performance_issues'])}):")
        for perf in report["performance_issues"]:
            print(f"  - {perf['endpoint']}: {perf['response_time_ms']:.2f}ms")
            
    # Schema mismatches
    if report["schema_mismatches"]:
        print(f"\nSCHEMA MISMATCHES ({len(report['schema_mismatches'])}):")
        for mismatch in report["schema_mismatches"]:
            print(f"  - {mismatch['endpoint']}: {mismatch['issue']}")
    
    # Overall health assessment
    print(f"\nOVERALL API HEALTH STATUS:")
    success_rate = float(summary['success_rate'].rstrip('%'))
    if success_rate >= 90:
        status = "EXCELLENT"
    elif success_rate >= 75:
        status = "GOOD"
    elif success_rate >= 50:
        status = "FAIR"
    else:
        status = "POOR"
    
    print(f"Status: {status}")
    
    # Save detailed report to file
    with open("api_validation_report.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\nDetailed report saved to: api_validation_report.json")
    
    return report

if __name__ == "__main__":
    main()