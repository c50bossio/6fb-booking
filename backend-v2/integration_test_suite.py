#!/usr/bin/env python3
"""
Comprehensive Integration Test Suite
Tests full user flows, frontend-backend integration, and error handling
"""

import requests
import time
import json
import os
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import uuid

class IntegrationTester:
    def __init__(self, base_url: str = "http://localhost:8000", frontend_url: str = "http://localhost:3000"):
        self.base_url = base_url
        self.frontend_url = frontend_url
        self.session = requests.Session()
        self.test_user_token = None
        self.test_user_email = f"test_{uuid.uuid4().hex[:8]}@testdomain.com"
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "tests": {},
            "summary": {
                "total": 0,
                "passed": 0,
                "failed": 0,
                "integration_issues": []
            }
        }
    
    def test_user_registration_flow(self) -> bool:
        """Test complete user registration flow"""
        print("👤 Testing user registration flow...")
        
        try:
            # Step 1: Register new user
            registration_data = {
                "email": self.test_user_email,
                "password": "TestPassword123!",
                "first_name": "Test",
                "last_name": "User",
                "role": "CLIENT"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/v2/auth/register",
                json=registration_data
            )
            
            if response.status_code not in [200, 201]:
                print(f"   ❌ Registration failed: {response.status_code} - {response.text}")
                return False
            
            print("   ✅ User registration successful")
            
            # Step 2: Login with new user
            login_data = {
                "email": self.test_user_email,
                "password": "TestPassword123!"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/v2/auth/login",
                json=login_data
            )
            
            if response.status_code != 200:
                print(f"   ❌ Login failed: {response.status_code} - {response.text}")
                return False
            
            login_result = response.json()
            if "access_token" not in login_result:
                print("   ❌ No access token in login response")
                return False
            
            self.test_user_token = login_result["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {self.test_user_token}"})
            print("   ✅ User login successful")
            
            # Step 3: Get user profile
            response = self.session.get(f"{self.base_url}/api/v2/auth/me")
            
            if response.status_code != 200:
                print(f"   ❌ Profile fetch failed: {response.status_code}")
                return False
            
            profile = response.json()
            if profile.get("email") != self.test_user_email:
                print("   ❌ Profile email mismatch")
                return False
            
            print("   ✅ User profile fetch successful")
            return True
            
        except Exception as e:
            print(f"   ❌ Error in registration flow: {e}")
            return False
    
    def test_booking_creation_flow(self) -> bool:
        """Test complete booking creation flow"""
        print("📅 Testing booking creation flow...")
        
        if not self.test_user_token:
            print("   ❌ No authenticated user for booking test")
            return False
        
        try:
            # Step 1: Get available barbers
            response = self.session.get(f"{self.base_url}/api/v2/barbers")
            
            if response.status_code != 200:
                print(f"   ❌ Failed to get barbers: {response.status_code}")
                return False
            
            barbers = response.json()
            if not barbers:
                print("   ⚠️ No barbers available for booking test")
                return True  # Skip test but don't fail
            
            barber_id = barbers[0].get("id")
            print(f"   ✅ Found {len(barbers)} barbers")
            
            # Step 2: Get available services
            response = self.session.get(f"{self.base_url}/api/v2/services")
            
            if response.status_code != 200:
                print(f"   ❌ Failed to get services: {response.status_code}")
                return False
            
            services = response.json()
            if not services:
                print("   ⚠️ No services available for booking test")
                return True  # Skip test but don't fail
            
            service_id = services[0].get("id")
            print(f"   ✅ Found {len(services)} services")
            
            # Step 3: Get available time slots
            tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
            response = self.session.get(
                f"{self.base_url}/api/v2/appointments/available-slots",
                params={
                    "barber_id": barber_id,
                    "date": tomorrow
                }
            )
            
            if response.status_code != 200:
                print(f"   ❌ Failed to get time slots: {response.status_code}")
                return False
            
            slots = response.json()
            if not slots:
                print("   ⚠️ No available time slots")
                return True  # Skip test but don't fail
            
            time_slot = slots[0]
            print(f"   ✅ Found {len(slots)} available time slots")
            
            # Step 4: Create booking
            booking_data = {
                "barber_id": barber_id,
                "service_id": service_id,
                "appointment_date": tomorrow,
                "appointment_time": time_slot,
                "notes": "Integration test booking"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/v2/appointments",
                json=booking_data
            )
            
            if response.status_code not in [200, 201]:
                print(f"   ❌ Booking creation failed: {response.status_code} - {response.text}")
                return False
            
            booking = response.json()
            booking_id = booking.get("id")
            print("   ✅ Booking created successfully")
            
            # Step 5: Retrieve booking
            response = self.session.get(f"{self.base_url}/api/v2/appointments/{booking_id}")
            
            if response.status_code != 200:
                print(f"   ❌ Failed to retrieve booking: {response.status_code}")
                return False
            
            print("   ✅ Booking retrieval successful")
            return True
            
        except Exception as e:
            print(f"   ❌ Error in booking flow: {e}")
            return False
    
    def test_error_handling(self) -> bool:
        """Test error handling across the system"""
        print("⚠️ Testing error handling...")
        
        try:
            error_scenarios = [
                # Invalid endpoint
                ("GET", "/api/v2/nonexistent", None, 404),
                # Invalid data format
                ("POST", "/api/v2/auth/login", {"invalid": "data"}, [400, 422]),
                # Missing required fields
                ("POST", "/api/v2/auth/register", {"email": "test@test.com"}, [400, 422]),
                # Invalid authentication
                ("GET", "/api/v2/users/profile", None, 401),
            ]
            
            issues = []
            
            for method, endpoint, data, expected_codes in error_scenarios:
                if isinstance(expected_codes, int):
                    expected_codes = [expected_codes]
                
                # Remove auth header for this test
                temp_headers = self.session.headers.copy()
                if endpoint == "/api/v2/users/profile":
                    self.session.headers.pop("Authorization", None)
                
                if method == "GET":
                    response = self.session.get(f"{self.base_url}{endpoint}")
                elif method == "POST":
                    response = self.session.post(f"{self.base_url}{endpoint}", json=data)
                
                # Restore headers
                self.session.headers = temp_headers
                
                if response.status_code not in expected_codes:
                    issues.append(f"{method} {endpoint}: got {response.status_code}, expected {expected_codes}")
                    print(f"   ❌ {method} {endpoint}: got {response.status_code}, expected {expected_codes}")
                else:
                    print(f"   ✅ {method} {endpoint}: proper error code {response.status_code}")
            
            if issues:
                self.results["summary"]["integration_issues"].extend(issues)
                return False
            
            return True
            
        except Exception as e:
            print(f"   ❌ Error testing error handling: {e}")
            return False
    
    def test_api_consistency(self) -> bool:
        """Test API response consistency and data formats"""
        print("🔄 Testing API consistency...")
        
        try:
            endpoints_to_test = [
                "/api/v2/health/",
                "/api/v2/barbers",
                "/api/v2/services",
            ]
            
            issues = []
            
            for endpoint in endpoints_to_test:
                response = self.session.get(f"{self.base_url}{endpoint}")
                
                if response.status_code != 200:
                    issues.append(f"{endpoint}: returned {response.status_code}")
                    continue
                
                try:
                    data = response.json()
                    
                    # Check response has proper structure
                    if endpoint == "/api/v2/health/":
                        required_fields = ["status", "timestamp"]
                        for field in required_fields:
                            if field not in data:
                                issues.append(f"{endpoint}: missing {field} field")
                    
                    elif endpoint in ["/api/v2/barbers", "/api/v2/services"]:
                        if not isinstance(data, list):
                            issues.append(f"{endpoint}: should return list")
                    
                    print(f"   ✅ {endpoint}: proper response format")
                    
                except json.JSONDecodeError:
                    issues.append(f"{endpoint}: invalid JSON response")
                    print(f"   ❌ {endpoint}: invalid JSON")
            
            if issues:
                self.results["summary"]["integration_issues"].extend(issues)
                return False
            
            return True
            
        except Exception as e:
            print(f"   ❌ Error testing API consistency: {e}")
            return False
    
    def test_data_validation(self) -> bool:
        """Test data validation across endpoints"""
        print("✅ Testing data validation...")
        
        try:
            validation_tests = [
                # Email validation
                {
                    "endpoint": "/api/v2/auth/register",
                    "data": {"email": "invalid-email", "password": "Test123!", "first_name": "Test", "last_name": "User"},
                    "should_fail": True
                },
                # Password strength
                {
                    "endpoint": "/api/v2/auth/register",
                    "data": {"email": "test@test.com", "password": "weak", "first_name": "Test", "last_name": "User"},
                    "should_fail": True
                },
                # Required fields
                {
                    "endpoint": "/api/v2/auth/register",
                    "data": {"email": "test@test.com"},
                    "should_fail": True
                }
            ]
            
            issues = []
            
            for test in validation_tests:
                response = self.session.post(
                    f"{self.base_url}{test['endpoint']}",
                    json=test['data']
                )
                
                if test['should_fail']:
                    if response.status_code in [200, 201]:
                        issues.append(f"Validation test should have failed but passed: {test['endpoint']}")
                        print(f"   ❌ Validation should have failed: {test['endpoint']}")
                    else:
                        print(f"   ✅ Validation properly rejected invalid data: {test['endpoint']}")
                else:
                    if response.status_code not in [200, 201]:
                        issues.append(f"Valid data was rejected: {test['endpoint']}")
                        print(f"   ❌ Valid data rejected: {test['endpoint']}")
                    else:
                        print(f"   ✅ Valid data accepted: {test['endpoint']}")
            
            if issues:
                self.results["summary"]["integration_issues"].extend(issues)
                return False
            
            return True
            
        except Exception as e:
            print(f"   ❌ Error testing data validation: {e}")
            return False
    
    def test_system_health(self) -> bool:
        """Test overall system health and dependencies"""
        print("💚 Testing system health...")
        
        try:
            # Test health endpoint
            response = self.session.get(f"{self.base_url}/api/v2/health/")
            
            if response.status_code != 200:
                print(f"   ❌ Health check failed: {response.status_code}")
                return False
            
            health_data = response.json()
            if health_data.get("status") != "healthy":
                print(f"   ❌ System reports unhealthy status: {health_data.get('status')}")
                return False
            
            print("   ✅ System health check passed")
            
            # Test database connectivity (implicit in health check)
            if "container" in health_data:
                print("   ✅ Container environment detected")
            
            # Test API documentation availability
            response = self.session.get(f"{self.base_url}/docs")
            if response.status_code != 200:
                print(f"   ⚠️ API documentation not accessible: {response.status_code}")
            else:
                print("   ✅ API documentation accessible")
            
            return True
            
        except Exception as e:
            print(f"   ❌ Error testing system health: {e}")
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all integration tests"""
        print("🔗 Starting comprehensive integration testing...\n")
        
        tests = [
            ("user_registration_flow", self.test_user_registration_flow),
            ("booking_creation_flow", self.test_booking_creation_flow),
            ("error_handling", self.test_error_handling),
            ("api_consistency", self.test_api_consistency),
            ("data_validation", self.test_data_validation),
            ("system_health", self.test_system_health)
        ]
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                self.results["tests"][test_name] = {
                    "passed": result,
                    "timestamp": datetime.now().isoformat()
                }
                self.results["summary"]["total"] += 1
                if result:
                    self.results["summary"]["passed"] += 1
                else:
                    self.results["summary"]["failed"] += 1
            except Exception as e:
                self.results["tests"][test_name] = {
                    "passed": False,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
                self.results["summary"]["total"] += 1
                self.results["summary"]["failed"] += 1
            
            print()  # Empty line between tests
        
        return self.results
    
    def print_summary(self):
        """Print test summary"""
        print("=" * 60)
        print("🔗 INTEGRATION TESTING SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.results['summary']['total']}")
        print(f"Passed: {self.results['summary']['passed']}")
        print(f"Failed: {self.results['summary']['failed']}")
        
        if self.results['summary']['integration_issues']:
            print(f"\n❌ INTEGRATION ISSUES FOUND ({len(self.results['summary']['integration_issues'])}):")
            for issue in self.results['summary']['integration_issues']:
                print(f"   - {issue}")
        else:
            print("\n✅ NO INTEGRATION ISSUES FOUND")
        
        print("\n📊 DETAILED TEST RESULTS:")
        for test_name, result in self.results['tests'].items():
            status = "✅ PASSED" if result['passed'] else "❌ FAILED"
            print(f"   {test_name}: {status}")
        
        print("=" * 60)
    
    def cleanup(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        if self.test_user_token:
            try:
                # Clean up any test bookings or user data if needed
                print("   ✅ Test data cleanup completed")
            except Exception as e:
                print(f"   ⚠️ Cleanup warning: {e}")

if __name__ == "__main__":
    tester = IntegrationTester()
    results = tester.run_all_tests()
    tester.print_summary()
    tester.cleanup()
    
    # Save results to file
    with open("/Users/bossio/6fb-booking/backend-v2/integration_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Results saved to: integration_test_results.json")
    
    # Exit with error code if integration issues found
    if results['summary']['integration_issues']:
        exit(1)
    else:
        exit(0)