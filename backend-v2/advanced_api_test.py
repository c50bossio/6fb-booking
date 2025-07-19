#!/usr/bin/env python3
"""
Advanced API Validation and Integration Test Suite for 6FB Booking System
Uses existing test users and performs comprehensive validation.
"""

import requests
import json
import time
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
import sys
import os

# API Base Configuration
BASE_URL = "http://localhost:8001"
API_V1_URL = f"{BASE_URL}/api/v1"

# Test users from setup_test_users.py
TEST_USERS = {
    "admin": {"email": "admin@sixfb.com", "password": "admin123", "role": "admin"},
    "barber": {"email": "barber@sixfb.com", "password": "barber123", "role": "barber"},
    "user": {"email": "testuser@example.com", "password": "testpass123", "role": "user"}
}

class DetailedAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.tokens = {}  # Store tokens for different user roles
        self.test_results = {
            "endpoints_tested": [],
            "authentication_tests": [],
            "authorization_tests": [],
            "schema_validation": [],
            "integration_tests": [],
            "performance_metrics": [],
            "security_tests": [],
            "cors_tests": [],
            "error_handling_tests": []
        }
        self.issues = {
            "critical": [],
            "high": [],
            "medium": [],
            "low": []
        }
        
    def log_result(self, category: str, test_name: str, status: str, details: str, response_time: float = 0):
        """Log test result with categorization."""
        result = {
            "test_name": test_name,
            "status": status,
            "details": details,
            "response_time_ms": response_time * 1000,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results[category].append(result)
        
        # Categorize issues by severity
        if status == "FAILED":
            if "authentication" in test_name.lower() or "unauthorized" in details.lower():
                self.issues["critical"].append(result)
            elif "schema" in test_name.lower() or "missing" in details.lower():
                self.issues["high"].append(result)
            elif "performance" in test_name.lower() or response_time > 2.0:
                self.issues["medium"].append(result)
            else:
                self.issues["low"].append(result)
                
    def make_authenticated_request(self, method: str, endpoint: str, user_role: str = "user", 
                                 data: Optional[Dict] = None, params: Optional[Dict] = None) -> requests.Response:
        """Make authenticated request with proper error handling."""
        token = self.tokens.get(user_role)
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        url = f"{API_V1_URL}{endpoint}"
        
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
                raise ValueError(f"Unsupported method: {method}")
                
            response_time = time.time() - start_time
            return response, response_time
        except Exception as e:
            response_time = time.time() - start_time
            return None, response_time
            
    def test_authentication_flow(self):
        """Test complete authentication flow for all user types."""
        print("Testing authentication flow...")
        
        for role, user_data in TEST_USERS.items():
            print(f"  Testing {role} authentication...")
            
            # Test login
            login_data = {
                "username": user_data["email"],
                "password": user_data["password"]
            }
            
            start_time = time.time()
            response = self.session.post(f"{API_V1_URL}/auth/login", json=login_data)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                try:
                    token_data = response.json()
                    if "access_token" in token_data:
                        self.tokens[role] = token_data["access_token"]
                        self.log_result("authentication_tests", f"{role}_login", "PASSED", 
                                      f"Successfully authenticated {role}", response_time)
                        
                        # Test /auth/me with this token
                        me_response, me_time = self.make_authenticated_request("GET", "/auth/me", role)
                        if me_response and me_response.status_code == 200:
                            user_info = me_response.json()
                            expected_role = user_data["role"]
                            actual_role = user_info.get("role")
                            if actual_role == expected_role:
                                self.log_result("authentication_tests", f"{role}_me_endpoint", "PASSED",
                                              f"User info correct for {role}", me_time)
                            else:
                                self.log_result("authentication_tests", f"{role}_me_endpoint", "FAILED",
                                              f"Role mismatch: expected {expected_role}, got {actual_role}", me_time)
                        else:
                            self.log_result("authentication_tests", f"{role}_me_endpoint", "FAILED",
                                          f"Failed to get user info for {role}", me_time)
                    else:
                        self.log_result("authentication_tests", f"{role}_login", "FAILED",
                                      f"Missing access_token in response for {role}", response_time)
                except json.JSONDecodeError:
                    self.log_result("authentication_tests", f"{role}_login", "FAILED",
                                  f"Invalid JSON response for {role}", response_time)
            else:
                self.log_result("authentication_tests", f"{role}_login", "FAILED",
                              f"Login failed for {role}: {response.status_code} - {response.text}", response_time)
                
    def test_authorization_levels(self):
        """Test role-based access control."""
        print("Testing authorization levels...")
        
        # Define endpoint access requirements
        endpoint_access = {
            "/auth/me": {"user", "barber", "admin"},
            "/bookings/slots": {"user", "barber", "admin"},
            "/bookings": {"user", "barber", "admin"},
            "/enterprise/dashboard": {"admin"},
            "/enterprise/locations": {"admin"},
            "/analytics/dashboard": {"barber", "admin"},
            "/clients": {"barber", "admin"},
            "/appointments": {"barber", "admin"}
        }
        
        for endpoint, allowed_roles in endpoint_access.items():
            for role in ["user", "barber", "admin"]:
                if role in self.tokens:
                    response, response_time = self.make_authenticated_request("GET", endpoint, role)
                    
                    if role in allowed_roles:
                        # Should be allowed
                        if response and response.status_code in [200, 201]:
                            self.log_result("authorization_tests", f"{endpoint}_{role}_allowed", "PASSED",
                                          f"{role} correctly allowed access to {endpoint}", response_time)
                        else:
                            status_code = response.status_code if response else "No response"
                            self.log_result("authorization_tests", f"{endpoint}_{role}_allowed", "FAILED",
                                          f"{role} incorrectly denied access to {endpoint}: {status_code}", response_time)
                    else:
                        # Should be denied
                        if response and response.status_code == 403:
                            self.log_result("authorization_tests", f"{endpoint}_{role}_denied", "PASSED",
                                          f"{role} correctly denied access to {endpoint}", response_time)
                        else:
                            status_code = response.status_code if response else "No response"
                            self.log_result("authorization_tests", f"{endpoint}_{role}_denied", "FAILED",
                                          f"{role} incorrectly allowed access to {endpoint}: {status_code}", response_time)
                            
    def test_api_schemas(self):
        """Test API response schemas match expected format."""
        print("Testing API schemas...")
        
        # Test /auth/me schema
        if "user" in self.tokens:
            response, response_time = self.make_authenticated_request("GET", "/auth/me", "user")
            if response and response.status_code == 200:
                try:
                    user_data = response.json()
                    required_fields = ["id", "email", "name", "role", "created_at"]
                    missing_fields = [field for field in required_fields if field not in user_data]
                    
                    if not missing_fields:
                        self.log_result("schema_validation", "auth_me_schema", "PASSED",
                                      "All required fields present in /auth/me", response_time)
                    else:
                        self.log_result("schema_validation", "auth_me_schema", "FAILED",
                                      f"Missing fields in /auth/me: {missing_fields}", response_time)
                except json.JSONDecodeError:
                    self.log_result("schema_validation", "auth_me_schema", "FAILED",
                                  "Invalid JSON response from /auth/me", response_time)
        
        # Test booking slots schema
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        response, response_time = self.make_authenticated_request("GET", f"/bookings/slots?booking_date={tomorrow}", "user")
        if response and response.status_code == 200:
            try:
                slots_data = response.json()
                if "slots" in slots_data or "available_slots" in slots_data:
                    self.log_result("schema_validation", "booking_slots_schema", "PASSED",
                                  "Booking slots response has expected structure", response_time)
                else:
                    self.log_result("schema_validation", "booking_slots_schema", "FAILED",
                                  f"Unexpected booking slots schema: {list(slots_data.keys())}", response_time)
            except json.JSONDecodeError:
                self.log_result("schema_validation", "booking_slots_schema", "FAILED",
                              "Invalid JSON response from booking slots", response_time)
                              
    def test_end_to_end_flows(self):
        """Test complete user workflows."""
        print("Testing end-to-end flows...")
        
        # Test booking creation flow
        if "user" in self.tokens:
            # Get available slots
            tomorrow = (date.today() + timedelta(days=1)).isoformat()
            slots_response, slots_time = self.make_authenticated_request(
                "GET", f"/bookings/slots?booking_date={tomorrow}", "user"
            )
            
            if slots_response and slots_response.status_code == 200:
                self.log_result("integration_tests", "get_booking_slots", "PASSED",
                              "Successfully retrieved booking slots", slots_time)
                
                # Try to create a booking
                booking_data = {
                    "date": tomorrow,
                    "time": "10:00",
                    "service": "Haircut",
                    "notes": "Test booking from API validation"
                }
                
                booking_response, booking_time = self.make_authenticated_request(
                    "POST", "/bookings", "user", data=booking_data
                )
                
                if booking_response:
                    if booking_response.status_code in [200, 201]:
                        self.log_result("integration_tests", "create_booking", "PASSED",
                                      "Successfully created booking", booking_time)
                    else:
                        self.log_result("integration_tests", "create_booking", "FAILED",
                                      f"Booking creation failed: {booking_response.status_code} - {booking_response.text}", booking_time)
                else:
                    self.log_result("integration_tests", "create_booking", "FAILED",
                                  "No response from booking creation", booking_time)
            else:
                self.log_result("integration_tests", "get_booking_slots", "FAILED",
                              "Failed to retrieve booking slots", slots_time)
                              
    def test_error_handling(self):
        """Test API error handling."""
        print("Testing error handling...")
        
        # Test invalid date format
        if "user" in self.tokens:
            response, response_time = self.make_authenticated_request(
                "GET", "/bookings/slots?booking_date=invalid-date", "user"
            )
            
            if response and response.status_code == 400:
                self.log_result("error_handling_tests", "invalid_date_format", "PASSED",
                              "Correctly rejected invalid date format", response_time)
            else:
                status = response.status_code if response else "No response"
                self.log_result("error_handling_tests", "invalid_date_format", "FAILED",
                              f"Did not handle invalid date format correctly: {status}", response_time)
        
        # Test unauthorized access
        old_tokens = self.tokens.copy()
        self.tokens.clear()
        
        response, response_time = self.make_authenticated_request("GET", "/auth/me", "user")
        if response and response.status_code == 401:
            self.log_result("error_handling_tests", "unauthorized_access", "PASSED",
                          "Correctly rejected unauthorized access", response_time)
        else:
            status = response.status_code if response else "No response"
            self.log_result("error_handling_tests", "unauthorized_access", "FAILED",
                          f"Did not handle unauthorized access correctly: {status}", response_time)
        
        self.tokens = old_tokens
        
    def test_performance_metrics(self):
        """Test API performance under various conditions."""
        print("Testing performance metrics...")
        
        # Test health endpoint performance
        response_times = []
        for i in range(10):
            start = time.time()
            response = requests.get(f"{BASE_URL}/health", timeout=10)
            end = time.time()
            response_times.append(end - start)
            
        avg_time = sum(response_times) / len(response_times)
        max_time = max(response_times)
        
        if avg_time < 0.5:  # Less than 500ms average
            self.log_result("performance_metrics", "health_endpoint_performance", "PASSED",
                          f"Health endpoint avg: {avg_time:.3f}s, max: {max_time:.3f}s", avg_time)
        else:
            self.log_result("performance_metrics", "health_endpoint_performance", "FAILED",
                          f"Health endpoint too slow - avg: {avg_time:.3f}s, max: {max_time:.3f}s", avg_time)
        
        # Test authenticated endpoint performance
        if "user" in self.tokens:
            auth_times = []
            for i in range(5):
                response, response_time = self.make_authenticated_request("GET", "/auth/me", "user")
                if response:
                    auth_times.append(response_time)
                    
            if auth_times:
                avg_auth_time = sum(auth_times) / len(auth_times)
                if avg_auth_time < 1.0:  # Less than 1 second average
                    self.log_result("performance_metrics", "auth_endpoint_performance", "PASSED",
                                  f"Auth endpoint avg: {avg_auth_time:.3f}s", avg_auth_time)
                else:
                    self.log_result("performance_metrics", "auth_endpoint_performance", "FAILED",
                                  f"Auth endpoint too slow - avg: {avg_auth_time:.3f}s", avg_auth_time)
                                  
    def test_cors_configuration(self):
        """Test CORS configuration."""
        print("Testing CORS configuration...")
        
        origins_to_test = [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://malicious-site.com"
        ]
        
        for origin in origins_to_test:
            try:
                response = requests.options(f"{API_V1_URL}/auth/me", headers={
                    "Origin": origin,
                    "Access-Control-Request-Method": "GET",
                    "Access-Control-Request-Headers": "Authorization"
                }, timeout=10)
                
                if response.status_code == 200:
                    cors_headers = {
                        "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
                        "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
                        "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers")
                    }
                    
                    if origin in ["http://localhost:3000", "http://localhost:3001"]:
                        # Should be allowed
                        if cors_headers["Access-Control-Allow-Origin"]:
                            self.log_result("cors_tests", f"cors_allow_{origin.split('//')[1]}", "PASSED",
                                          f"CORS correctly configured for {origin}", 0)
                        else:
                            self.log_result("cors_tests", f"cors_allow_{origin.split('//')[1]}", "FAILED",
                                          f"CORS not configured for allowed origin {origin}", 0)
                    else:
                        # Malicious origin - should not be explicitly allowed
                        if not cors_headers["Access-Control-Allow-Origin"] or cors_headers["Access-Control-Allow-Origin"] != origin:
                            self.log_result("cors_tests", f"cors_deny_{origin.split('//')[1]}", "PASSED",
                                          f"CORS correctly denied for {origin}", 0)
                        else:
                            self.log_result("cors_tests", f"cors_deny_{origin.split('//')[1]}", "FAILED",
                                          f"CORS incorrectly allowed for {origin}", 0)
                else:
                    self.log_result("cors_tests", f"cors_test_{origin.split('//')[1]}", "FAILED",
                                  f"CORS preflight failed for {origin}: {response.status_code}", 0)
                                  
            except Exception as e:
                self.log_result("cors_tests", f"cors_test_{origin.split('//')[1]}", "FAILED",
                              f"CORS test failed for {origin}: {str(e)}", 0)
                              
    def run_all_tests(self):
        """Run all test suites."""
        print("=" * 60)
        print("6FB BOOKING SYSTEM - ADVANCED API VALIDATION")
        print("=" * 60)
        
        self.test_authentication_flow()
        self.test_authorization_levels()
        self.test_api_schemas()
        self.test_end_to_end_flows()
        self.test_error_handling()
        self.test_performance_metrics()
        self.test_cors_configuration()
        
        return self.generate_comprehensive_report()
        
    def generate_comprehensive_report(self):
        """Generate detailed test report."""
        total_tests = sum(len(tests) for tests in self.test_results.values())
        total_passed = sum(len([t for t in tests if t["status"] == "PASSED"]) for tests in self.test_results.values())
        total_failed = sum(len([t for t in tests if t["status"] == "FAILED"]) for tests in self.test_results.values())
        
        report = {
            "summary": {
                "total_tests": total_tests,
                "passed": total_passed,
                "failed": total_failed,
                "success_rate": f"{(total_passed/total_tests)*100:.1f}%" if total_tests > 0 else "0%",
                "test_completion_time": datetime.now().isoformat()
            },
            "test_results": self.test_results,
            "issues_by_severity": self.issues,
            "recommendations": self.generate_recommendations()
        }
        
        return report
        
    def generate_recommendations(self):
        """Generate recommendations based on test results."""
        recommendations = []
        
        # Check for critical issues
        if self.issues["critical"]:
            recommendations.append({
                "priority": "CRITICAL",
                "category": "Security",
                "issue": "Authentication/Authorization failures detected",
                "recommendation": "Review and fix authentication mechanisms immediately"
            })
            
        # Check for schema issues
        schema_failures = [test for test in self.test_results["schema_validation"] if test["status"] == "FAILED"]
        if schema_failures:
            recommendations.append({
                "priority": "HIGH",
                "category": "API Contract",
                "issue": "Schema validation failures detected",
                "recommendation": "Update API documentation and ensure frontend/backend schema consistency"
            })
            
        # Check for performance issues
        perf_failures = [test for test in self.test_results["performance_metrics"] if test["status"] == "FAILED"]
        if perf_failures:
            recommendations.append({
                "priority": "MEDIUM",
                "category": "Performance",
                "issue": "Performance benchmarks not met",
                "recommendation": "Optimize slow endpoints and consider caching strategies"
            })
            
        # Check for CORS issues
        cors_failures = [test for test in self.test_results["cors_tests"] if test["status"] == "FAILED"]
        if cors_failures:
            recommendations.append({
                "priority": "MEDIUM",
                "category": "Security",
                "issue": "CORS configuration issues detected",
                "recommendation": "Review and update CORS settings for production security"
            })
            
        return recommendations

def main():
    """Main function to run advanced API tests."""
    tester = DetailedAPITester()
    
    try:
        report = tester.run_all_tests()
        
        # Print summary
        print("\n" + "=" * 60)
        print("API VALIDATION SUMMARY")
        print("=" * 60)
        
        summary = report["summary"]
        print(f"Total Tests: {summary['total_tests']}")
        print(f"Passed: {summary['passed']}")
        print(f"Failed: {summary['failed']}")
        print(f"Success Rate: {summary['success_rate']}")
        
        # Print issues by severity
        for severity, issues in report["issues_by_severity"].items():
            if issues:
                print(f"\n{severity.upper()} ISSUES ({len(issues)}):")
                for issue in issues[:5]:  # Show first 5 issues
                    print(f"  - {issue['test_name']}: {issue['details']}")
                if len(issues) > 5:
                    print(f"  ... and {len(issues) - 5} more")
        
        # Print recommendations
        if report["recommendations"]:
            print(f"\nRECOMMENDATIONS:")
            for rec in report["recommendations"]:
                print(f"  [{rec['priority']}] {rec['category']}: {rec['recommendation']}")
        
        # Save detailed report
        with open("advanced_api_validation_report.json", "w") as f:
            json.dump(report, f, indent=2)
        
        print(f"\nDetailed report saved to: advanced_api_validation_report.json")
        
        # Overall health assessment
        success_rate = float(summary['success_rate'].rstrip('%'))
        if success_rate >= 90:
            health_status = "EXCELLENT"
        elif success_rate >= 75:
            health_status = "GOOD"
        elif success_rate >= 50:
            health_status = "FAIR"
        else:
            health_status = "POOR"
            
        print(f"\nOVERALL API HEALTH: {health_status}")
        
        return report
        
    except Exception as e:
        print(f"Test execution failed: {str(e)}")
        return None

if __name__ == "__main__":
    main()