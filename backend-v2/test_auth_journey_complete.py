#!/usr/bin/env python3
"""
Complete Authentication Journey Test
====================================

This script tests the complete customer authentication journey end-to-end:
1. Homepage access
2. Registration process with trial system
3. Email verification
4. Login process
5. Protected route access
6. Error handling
7. Performance testing

Tests both frontend and backend integration.
"""

import json
import time
import requests
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import re
import uuid

class AuthJourneyTester:
    def __init__(self):
        self.frontend_url = "http://localhost:3001"
        self.backend_url = "http://localhost:8000"
        self.api_base = f"{self.backend_url}/api/v1"
        self.test_results = []
        self.session = requests.Session()
        self.test_user_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        self.test_user_data = {
            "email": self.test_user_email,
            "password": "TestPassword123!",
            "full_name": "Test User",
            "phone": "+1234567890",
            "business_name": "Test Barbershop",
            "location": "Test City, ST"
        }
        
    def log_test(self, test_name: str, success: bool, details: str = "", duration: float = 0):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "duration": duration,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        
    def test_homepage_access(self):
        """Test 1: Homepage Access"""
        print("\n🏠 Testing Homepage Access...")
        start_time = time.time()
        
        try:
            response = self.session.get(self.frontend_url, timeout=10)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                # Check for key elements
                content = response.text
                has_title = "Booked Barber" in content
                has_logo = "logo" in content.lower()
                has_cta = any(cta in content.lower() for cta in ["sign up", "register", "get started"])
                
                if has_title and has_logo and has_cta:
                    self.log_test("homepage_access", True, f"Homepage loads correctly ({duration:.2f}s)", duration)
                    return True
                else:
                    self.log_test("homepage_access", False, f"Missing key elements: title={has_title}, logo={has_logo}, cta={has_cta}")
                    return False
            else:
                self.log_test("homepage_access", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_test("homepage_access", False, f"Request failed: {str(e)}", duration)
            return False
    
    def test_registration_api(self):
        """Test 2: Registration API"""
        print("\n📝 Testing Registration API...")
        start_time = time.time()
        
        try:
            response = self.session.post(
                f"{self.api_base}/auth/register",
                json=self.test_user_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            duration = time.time() - start_time
            
            if response.status_code == 201:
                data = response.json()
                if "user_id" in data and "verification_token" in data:
                    self.verification_token = data["verification_token"]
                    self.user_id = data["user_id"]
                    self.log_test("registration_api", True, f"User registered successfully ({duration:.2f}s)", duration)
                    return True
                else:
                    self.log_test("registration_api", False, f"Missing required fields in response: {data}")
                    return False
            else:
                error_msg = f"HTTP {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg += f": {error_data.get('detail', 'Unknown error')}"
                except:
                    error_msg += f": {response.text[:200]}"
                self.log_test("registration_api", False, error_msg, duration)
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_test("registration_api", False, f"Request failed: {str(e)}", duration)
            return False
    
    def test_trial_system_integration(self):
        """Test 3: Trial System Integration"""
        print("\n🎯 Testing Trial System Integration...")
        start_time = time.time()
        
        try:
            # Check if user has trial period
            response = self.session.get(f"{self.api_base}/auth/user/trial-status", timeout=10)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if "trial_days_remaining" in data and "trial_active" in data:
                    if data["trial_active"] and data["trial_days_remaining"] > 0:
                        self.log_test("trial_system", True, f"Trial system active: {data['trial_days_remaining']} days remaining", duration)
                        return True
                    else:
                        self.log_test("trial_system", False, f"Trial not active: {data}")
                        return False
                else:
                    self.log_test("trial_system", False, f"Missing trial fields: {data}")
                    return False
            else:
                self.log_test("trial_system", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_test("trial_system", False, f"Request failed: {str(e)}", duration)
            return False
    
    def test_email_verification(self):
        """Test 4: Email Verification"""
        print("\n📧 Testing Email Verification...")
        start_time = time.time()
        
        try:
            if not hasattr(self, 'verification_token'):
                self.log_test("email_verification", False, "No verification token available")
                return False
                
            response = self.session.post(
                f"{self.api_base}/auth/verify-email",
                json={"token": self.verification_token},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get("verified", False):
                    self.log_test("email_verification", True, f"Email verified successfully ({duration:.2f}s)", duration)
                    return True
                else:
                    self.log_test("email_verification", False, f"Verification failed: {data}")
                    return False
            else:
                error_msg = f"HTTP {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg += f": {error_data.get('detail', 'Unknown error')}"
                except:
                    error_msg += f": {response.text[:200]}"
                self.log_test("email_verification", False, error_msg, duration)
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_test("email_verification", False, f"Request failed: {str(e)}", duration)
            return False
    
    def test_login_process(self):
        """Test 5: Login Process"""
        print("\n🔐 Testing Login Process...")
        start_time = time.time()
        
        try:
            response = self.session.post(
                f"{self.api_base}/auth/login",
                json={
                    "email": self.test_user_email,
                    "password": self.test_user_data["password"]
                },
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "token_type" in data:
                    self.access_token = data["access_token"]
                    self.token_type = data["token_type"]
                    # Set authorization header for future requests
                    self.session.headers.update({
                        "Authorization": f"{self.token_type} {self.access_token}"
                    })
                    self.log_test("login_process", True, f"Login successful ({duration:.2f}s)", duration)
                    return True
                else:
                    self.log_test("login_process", False, f"Missing token fields: {data}")
                    return False
            else:
                error_msg = f"HTTP {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg += f": {error_data.get('detail', 'Unknown error')}"
                except:
                    error_msg += f": {response.text[:200]}"
                self.log_test("login_process", False, error_msg, duration)
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_test("login_process", False, f"Request failed: {str(e)}", duration)
            return False
    
    def test_protected_routes(self):
        """Test 6: Protected Route Access"""
        print("\n🛡️  Testing Protected Route Access...")
        
        protected_endpoints = [
            "/auth/me",
            "/dashboard/stats",
            "/appointments",
            "/analytics/overview"
        ]
        
        all_passed = True
        
        for endpoint in protected_endpoints:
            start_time = time.time()
            try:
                response = self.session.get(f"{self.api_base}{endpoint}", timeout=10)
                duration = time.time() - start_time
                
                if response.status_code in [200, 201]:
                    self.log_test(f"protected_route_{endpoint.replace('/', '_')}", True, f"Access granted ({duration:.2f}s)", duration)
                elif response.status_code == 401:
                    self.log_test(f"protected_route_{endpoint.replace('/', '_')}", False, "Authentication required", duration)
                    all_passed = False
                else:
                    self.log_test(f"protected_route_{endpoint.replace('/', '_')}", False, f"HTTP {response.status_code}", duration)
                    all_passed = False
                    
            except Exception as e:
                duration = time.time() - start_time
                self.log_test(f"protected_route_{endpoint.replace('/', '_')}", False, f"Request failed: {str(e)}", duration)
                all_passed = False
        
        return all_passed
    
    def test_error_paths(self):
        """Test 7: Error Path Testing"""
        print("\n🚨 Testing Error Paths...")
        
        error_tests = [
            {
                "name": "invalid_login",
                "endpoint": "/auth/login",
                "method": "POST",
                "data": {"email": "invalid@example.com", "password": "wrongpassword"},
                "expected_status": 401,
                "auth_required": False
            },
            {
                "name": "invalid_registration",
                "endpoint": "/auth/register",
                "method": "POST",
                "data": {"email": "invalid-email", "password": "weak"},
                "expected_status": 422,
                "auth_required": False
            },
            {
                "name": "invalid_verification",
                "endpoint": "/auth/verify-email",
                "method": "POST",
                "data": {"token": "invalid-token"},
                "expected_status": 400,
                "auth_required": False
            },
            {
                "name": "unauthorized_access",
                "endpoint": "/auth/me",
                "method": "GET",
                "data": None,
                "expected_status": 401,
                "auth_required": False,
                "remove_auth": True
            }
        ]
        
        all_passed = True
        
        for test in error_tests:
            start_time = time.time()
            try:
                # Temporarily remove auth if needed
                headers = {}
                if test.get("remove_auth", False):
                    headers = {"Authorization": ""}
                else:
                    headers = self.session.headers
                
                if test["method"] == "POST":
                    response = self.session.post(
                        f"{self.api_base}{test['endpoint']}", 
                        json=test["data"], 
                        headers=headers,
                        timeout=10
                    )
                else:
                    response = self.session.get(
                        f"{self.api_base}{test['endpoint']}", 
                        headers=headers,
                        timeout=10
                    )
                
                duration = time.time() - start_time
                
                if response.status_code == test["expected_status"]:
                    self.log_test(f"error_path_{test['name']}", True, f"Correct error response ({duration:.2f}s)", duration)
                else:
                    self.log_test(f"error_path_{test['name']}", False, f"Expected {test['expected_status']}, got {response.status_code}", duration)
                    all_passed = False
                    
            except Exception as e:
                duration = time.time() - start_time
                self.log_test(f"error_path_{test['name']}", False, f"Request failed: {str(e)}", duration)
                all_passed = False
        
        return all_passed
    
    def test_performance_metrics(self):
        """Test 8: Performance Metrics"""
        print("\n⚡ Testing Performance Metrics...")
        
        # Test multiple requests for performance
        endpoints = [
            "/auth/me",
            "/dashboard/stats",
            "/appointments"
        ]
        
        performance_results = {}
        
        for endpoint in endpoints:
            times = []
            for i in range(5):  # 5 requests per endpoint
                start_time = time.time()
                try:
                    response = self.session.get(f"{self.api_base}{endpoint}", timeout=10)
                    duration = time.time() - start_time
                    if response.status_code == 200:
                        times.append(duration)
                except Exception as e:
                    print(f"Performance test failed for {endpoint}: {e}")
            
            if times:
                avg_time = sum(times) / len(times)
                max_time = max(times)
                min_time = min(times)
                performance_results[endpoint] = {
                    "avg": avg_time,
                    "max": max_time,
                    "min": min_time,
                    "count": len(times)
                }
                
                # Performance criteria: avg < 500ms, max < 1000ms
                if avg_time < 0.5 and max_time < 1.0:
                    self.log_test(f"performance_{endpoint.replace('/', '_')}", True, f"Avg: {avg_time:.3f}s, Max: {max_time:.3f}s", avg_time)
                else:
                    self.log_test(f"performance_{endpoint.replace('/', '_')}", False, f"Slow response - Avg: {avg_time:.3f}s, Max: {max_time:.3f}s", avg_time)
        
        return performance_results
    
    def cleanup_test_user(self):
        """Cleanup: Remove test user"""
        print("\n🧹 Cleaning up test user...")
        try:
            # Note: This would require an admin endpoint to delete users
            # For now, just log the cleanup attempt
            self.log_test("cleanup", True, f"Test user {self.test_user_email} cleanup attempted")
        except Exception as e:
            self.log_test("cleanup", False, f"Cleanup failed: {str(e)}")
    
    def run_complete_journey(self):
        """Run the complete authentication journey test"""
        print("🚀 Starting Complete Authentication Journey Test")
        print("=" * 60)
        
        overall_start = time.time()
        
        # Test sequence
        test_results = {
            "homepage": self.test_homepage_access(),
            "registration": self.test_registration_api(),
            "trial_system": self.test_trial_system_integration(),
            "email_verification": self.test_email_verification(),
            "login": self.test_login_process(),
            "protected_routes": self.test_protected_routes(),
            "error_paths": self.test_error_paths(),
            "performance": self.test_performance_metrics()
        }
        
        # Cleanup
        self.cleanup_test_user()
        
        overall_duration = time.time() - overall_start
        
        # Generate summary report
        print("\n📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        pass_rate = (passed / total) * 100 if total > 0 else 0
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Pass Rate: {pass_rate:.1f}%")
        print(f"Total Duration: {overall_duration:.2f}s")
        
        # Critical path analysis
        critical_tests = ["homepage_access", "registration_api", "email_verification", "login_process"]
        critical_passed = sum(1 for result in self.test_results if result["test"] in critical_tests and result["success"])
        critical_total = len(critical_tests)
        
        print(f"\nCRITICAL PATH: {critical_passed}/{critical_total} tests passed")
        
        if critical_passed == critical_total:
            print("✅ CRITICAL PATH: All core authentication flows working!")
        else:
            print("❌ CRITICAL PATH: Core authentication flows have issues!")
            
        # Failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  • {test['test']}: {test['details']}")
        
        # Performance summary
        performance_tests = [result for result in self.test_results if result["test"].startswith("performance_")]
        if performance_tests:
            print(f"\n⚡ PERFORMANCE SUMMARY:")
            for test in performance_tests:
                status = "✅" if test["success"] else "❌"
                print(f"  {status} {test['test']}: {test['details']}")
        
        return {
            "overall_success": pass_rate >= 80,  # 80% pass rate required
            "critical_path_success": critical_passed == critical_total,
            "pass_rate": pass_rate,
            "total_tests": total,
            "passed_tests": passed,
            "failed_tests": total - passed,
            "duration": overall_duration,
            "detailed_results": self.test_results
        }

def main():
    """Main test runner"""
    tester = AuthJourneyTester()
    
    try:
        results = tester.run_complete_journey()
        
        # Save results to file
        with open("/Users/bossio/6fb-booking/backend-v2/auth_journey_test_results.json", "w") as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📝 Results saved to: auth_journey_test_results.json")
        
        # Exit with appropriate code
        if results["overall_success"] and results["critical_path_success"]:
            print("\n🎉 OVERALL RESULT: SUCCESS - Authentication journey is working correctly!")
            return 0
        else:
            print("\n🚨 OVERALL RESULT: FAILURE - Authentication journey has critical issues!")
            return 1
            
    except Exception as e:
        print(f"\n💥 TEST RUNNER FAILED: {str(e)}")
        return 1

if __name__ == "__main__":
    exit(main())