#!/usr/bin/env python3
"""
Comprehensive API Testing Script for BookedBarber V2
This script performs extensive testing of all critical backend API endpoints
"""

import requests
import json
import time
import sqlite3
import sys
from datetime import datetime
from typing import Dict, List, Optional

class BookedBarberAPITester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = {
            "api_health": {},
            "database_status": {},
            "authentication": {},
            "crud_operations": {},
            "integrations": {},
            "performance": {},
            "errors": [],
            "recommendations": []
        }
        
    def log_result(self, category: str, test_name: str, success: bool, details: str = None, response_time: float = None):
        """Log test results in structured format"""
        result = {
            "test_name": test_name,
            "success": success,
            "timestamp": datetime.now().isoformat(),
            "details": details or ""
        }
        if response_time:
            result["response_time_ms"] = round(response_time * 1000, 2)
            
        if category not in self.test_results:
            self.test_results[category] = {}
        self.test_results[category][test_name] = result
        
        # Print real-time feedback
        status = "✅ PASS" if success else "❌ FAIL"
        time_str = f" ({result.get('response_time_ms', 0):.0f}ms)" if response_time else ""
        print(f"{status} {category}.{test_name}{time_str}")
        if not success and details:
            print(f"   Details: {details}")

    def test_basic_connectivity(self):
        """Test basic API connectivity and health checks"""
        print("\n🔍 Testing Basic API Connectivity...")
        
        # Test root endpoint
        try:
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                success = "6FB Booking API v2" in data.get("message", "")
                self.log_result("api_health", "root_endpoint", success, 
                               f"Status: {response.status_code}, Message: {data.get('message')}", response_time)
            else:
                self.log_result("api_health", "root_endpoint", False, 
                               f"Status: {response.status_code}", response_time)
        except Exception as e:
            self.log_result("api_health", "root_endpoint", False, str(e))

        # Test health endpoint
        try:
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/health", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                success = "status" in data
                self.log_result("api_health", "health_endpoint", success, 
                               f"Health data: {json.dumps(data, indent=2)}", response_time)
            else:
                self.log_result("api_health", "health_endpoint", False, 
                               f"Status: {response.status_code}, Response: {response.text[:200]}", response_time)
        except Exception as e:
            self.log_result("api_health", "health_endpoint", False, str(e))

        # Test OpenAPI docs
        try:
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/openapi.json", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                endpoint_count = len([path for path in data.get("paths", {}).values() for method in path.keys()])
                success = endpoint_count > 50  # Expect many endpoints
                self.log_result("api_health", "openapi_spec", success, 
                               f"Total endpoints: {endpoint_count}", response_time)
            else:
                self.log_result("api_health", "openapi_spec", False, 
                               f"Status: {response.status_code}", response_time)
        except Exception as e:
            self.log_result("api_health", "openapi_spec", False, str(e))

    def test_database_connectivity(self):
        """Test database connectivity and basic schema"""
        print("\n🗄️ Testing Database Connectivity...")
        
        try:
            # Connect to SQLite database
            conn = sqlite3.connect("6fb_booking.db")
            cursor = conn.cursor()
            
            # Test database connection
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            table_count = len(tables)
            
            success = table_count > 10  # Expect many tables
            self.log_result("database_status", "table_count", success, 
                           f"Found {table_count} tables")
            
            # Test critical tables exist
            critical_tables = ["users", "appointments", "payments", "services", "barbers"]
            existing_tables = [table[0] for table in tables]
            
            for table in critical_tables:
                exists = table in existing_tables
                self.log_result("database_status", f"table_{table}_exists", exists,
                               f"Table {table} {'found' if exists else 'missing'}")
            
            # Test data counts
            for table in critical_tables:
                if table in existing_tables:
                    try:
                        cursor.execute(f"SELECT COUNT(*) FROM {table};")
                        count = cursor.fetchone()[0]
                        self.log_result("database_status", f"table_{table}_data", count > 0,
                                       f"{table} has {count} records")
                    except Exception as e:
                        self.log_result("database_status", f"table_{table}_data", False, str(e))
            
            conn.close()
            
        except Exception as e:
            self.log_result("database_status", "database_connection", False, str(e))

    def test_authentication_endpoints(self):
        """Test authentication flow"""
        print("\n🔐 Testing Authentication System...")
        
        # Test login with existing user
        login_data = {
            "email": "admin@example.com",
            "password": "admin123"  # Common test password
        }
        
        try:
            start_time = time.time()
            response = self.session.post(
                f"{self.base_url}/api/v1/auth/login",
                json=login_data,
                timeout=30
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.auth_token = data["access_token"]
                    self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                    self.log_result("authentication", "login_success", True, 
                                   "Login successful, token received", response_time)
                else:
                    self.log_result("authentication", "login_success", False, 
                                   "No access token in response", response_time)
            else:
                self.log_result("authentication", "login_success", False, 
                               f"Status: {response.status_code}, Response: {response.text[:200]}", response_time)
                
        except Exception as e:
            self.log_result("authentication", "login_success", False, str(e))

        # Test protected endpoint access
        if self.auth_token:
            try:
                start_time = time.time()
                response = self.session.get(f"{self.base_url}/api/v1/users/me", timeout=10)
                response_time = time.time() - start_time
                
                success = response.status_code == 200
                self.log_result("authentication", "protected_endpoint_access", success,
                               f"Status: {response.status_code}", response_time)
            except Exception as e:
                self.log_result("authentication", "protected_endpoint_access", False, str(e))

    def test_crud_operations(self):
        """Test CRUD operations on key endpoints"""
        print("\n📝 Testing CRUD Operations...")
        
        if not self.auth_token:
            self.log_result("crud_operations", "auth_required", False, "No authentication token available")
            return
        
        # Test services endpoint
        try:
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/api/v1/services", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                service_count = len(data) if isinstance(data, list) else 0
                self.log_result("crud_operations", "get_services", True,
                               f"Retrieved {service_count} services", response_time)
            else:
                self.log_result("crud_operations", "get_services", False,
                               f"Status: {response.status_code}", response_time)
        except Exception as e:
            self.log_result("crud_operations", "get_services", False, str(e))

        # Test appointments endpoint
        try:
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/api/v1/appointments", timeout=10)
            response_time = time.time() - start_time
            
            success = response.status_code in [200, 404]  # 404 might be normal if no appointments
            if response.status_code == 200:
                data = response.json()
                appointment_count = len(data) if isinstance(data, list) else 0
                self.log_result("crud_operations", "get_appointments", True,
                               f"Retrieved {appointment_count} appointments", response_time)
            else:
                self.log_result("crud_operations", "get_appointments", success,
                               f"Status: {response.status_code}", response_time)
        except Exception as e:
            self.log_result("crud_operations", "get_appointments", False, str(e))

    def test_integration_endpoints(self):
        """Test integration-related endpoints"""
        print("\n🔗 Testing Integration Endpoints...")
        
        if not self.auth_token:
            self.log_result("integrations", "auth_required", False, "No authentication token available")
            return
        
        # Test Stripe integration endpoint
        try:
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/api/v1/payments/config", timeout=10)
            response_time = time.time() - start_time
            
            success = response.status_code in [200, 401, 403]  # May require specific permissions
            self.log_result("integrations", "stripe_config", success,
                           f"Status: {response.status_code}", response_time)
        except Exception as e:
            self.log_result("integrations", "stripe_config", False, str(e))

        # Test calendar integration endpoint
        try:
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/api/v1/calendar/availability", timeout=10)
            response_time = time.time() - start_time
            
            success = response.status_code in [200, 400, 401, 403]
            self.log_result("integrations", "calendar_availability", success,
                           f"Status: {response.status_code}", response_time)
        except Exception as e:
            self.log_result("integrations", "calendar_availability", False, str(e))

    def test_performance_benchmarks(self):
        """Test API performance benchmarks"""
        print("\n⚡ Testing Performance Benchmarks...")
        
        endpoints_to_test = [
            ("/", "root"),
            ("/api/v1/services", "services"),
            ("/openapi.json", "openapi")
        ]
        
        for endpoint, name in endpoints_to_test:
            response_times = []
            for i in range(5):  # Test 5 times
                try:
                    start_time = time.time()
                    response = self.session.get(f"{self.base_url}{endpoint}", timeout=10)
                    response_time = time.time() - start_time
                    response_times.append(response_time)
                except Exception:
                    pass
            
            if response_times:
                avg_time = sum(response_times) / len(response_times)
                max_time = max(response_times)
                success = avg_time < 1.0  # Should respond within 1 second
                self.log_result("performance", f"{name}_avg_response", success,
                               f"Avg: {avg_time*1000:.0f}ms, Max: {max_time*1000:.0f}ms")

    def generate_recommendations(self):
        """Generate recommendations based on test results"""
        print("\n📋 Generating Recommendations...")
        
        recommendations = []
        
        # Check API health
        if not self.test_results.get("api_health", {}).get("root_endpoint", {}).get("success"):
            recommendations.append("❌ CRITICAL: Root API endpoint not responding")
        
        # Check database
        db_results = self.test_results.get("database_status", {})
        table_issues = [k for k, v in db_results.items() if "table_" in k and not v.get("success")]
        if table_issues:
            recommendations.append(f"⚠️  Database issues detected: {len(table_issues)} table problems")
        
        # Check authentication
        if not self.test_results.get("authentication", {}).get("login_success", {}).get("success"):
            recommendations.append("🔐 Authentication system needs attention")
        
        # Check performance
        perf_results = self.test_results.get("performance", {})
        slow_endpoints = [k for k, v in perf_results.items() if not v.get("success")]
        if slow_endpoints:
            recommendations.append(f"⚡ Performance issues: {len(slow_endpoints)} slow endpoints")
        
        # Add positive recommendations
        if not recommendations:
            recommendations.append("✅ All critical systems appear to be functioning well")
        
        self.test_results["recommendations"] = recommendations
        
        for rec in recommendations:
            print(f"  {rec}")

    def print_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "="*80)
        print("📊 BOOKEDBARBER V2 API TEST SUMMARY")
        print("="*80)
        
        total_tests = 0
        passed_tests = 0
        
        for category, tests in self.test_results.items():
            if category in ["recommendations", "errors"]:
                continue
                
            category_total = len(tests)
            category_passed = sum(1 for test in tests.values() if test.get("success"))
            
            total_tests += category_total
            passed_tests += category_passed
            
            if category_total > 0:
                success_rate = (category_passed / category_total) * 100
                print(f"\n📁 {category.replace('_', ' ').title()}: {category_passed}/{category_total} ({success_rate:.1f}%)")
                
                for test_name, result in tests.items():
                    status = "✅" if result.get("success") else "❌"
                    time_info = f" ({result.get('response_time_ms', 0):.0f}ms)" if result.get("response_time_ms") else ""
                    print(f"   {status} {test_name}{time_info}")
                    if not result.get("success") and result.get("details"):
                        print(f"      └─ {result['details']}")
        
        overall_success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        print(f"\n🎯 OVERALL SUCCESS RATE: {passed_tests}/{total_tests} ({overall_success_rate:.1f}%)")
        
        # Print recommendations
        if self.test_results.get("recommendations"):
            print(f"\n💡 RECOMMENDATIONS:")
            for rec in self.test_results["recommendations"]:
                print(f"   {rec}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Comprehensive BookedBarber V2 API Testing")
        print("="*80)
        
        start_time = time.time()
        
        # Run test suites
        self.test_basic_connectivity()
        self.test_database_connectivity()
        self.test_authentication_endpoints()
        self.test_crud_operations()
        self.test_integration_endpoints()
        self.test_performance_benchmarks()
        
        # Generate insights
        self.generate_recommendations()
        
        # Print summary
        self.print_summary()
        
        total_time = time.time() - start_time
        print(f"\n⏱️  Total testing time: {total_time:.2f} seconds")
        
        # Save detailed results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"api_test_report_{timestamp}.json"
        with open(report_file, 'w') as f:
            json.dump(self.test_results, f, indent=2)
        print(f"📄 Detailed report saved to: {report_file}")

if __name__ == "__main__":
    # Check if custom URL provided
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    
    tester = BookedBarberAPITester(base_url)
    tester.run_all_tests()