#!/usr/bin/env python3
"""
Corrected Comprehensive Browser-Based Functionality Test for BookedBarber
Tests all navigation items with the correct endpoints and identifies broken functionality
"""

import requests
import json
import time
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"
TEST_ADMIN_EMAIL = "admin.test@bookedbarber.com"
TEST_ADMIN_PASSWORD = "AdminTest123"

class BookedBarberCorrectedTester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.test_results = {
            "timestamp": datetime.now().isoformat(),
            "api_endpoints": [],
            "broken_features": [],
            "working_features": [],
            "summary": {}
        }
    
    def login(self):
        """Login with test admin credentials"""
        print("🔐 Logging in as test admin...")
        response = self.session.post(
            f"{BASE_URL}/api/v2/auth/login",
            json={
                "email": TEST_ADMIN_EMAIL,
                "password": TEST_ADMIN_PASSWORD
            },
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            self.access_token = data.get("access_token")
            self.session.headers.update({
                "Authorization": f"Bearer {self.access_token}"
            })
            print("✅ Login successful!")
            return True
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
    
    def test_corrected_api_endpoints(self):
        """Test API endpoints with corrected paths"""
        print("\n🔌 Testing Corrected API Endpoints...")
        
        # Corrected API endpoints based on actual router definitions
        endpoints = [
            # Basic endpoints
            ("/api/v2/auth/me", "GET", "User Profile"),
            ("/api/v2/appointments", "GET", "Appointments List"),
            ("/api/v2/services", "GET", "Services"),
            ("/api/v2/clients", "GET", "Clients List"),
            ("/api/v2/notifications/stats", "GET", "Notification Stats"),
            ("/api/v2/barbers", "GET", "Barbers List"),
            ("/api/v2/reviews", "GET", "Reviews"),
            ("/api/v2/marketing/campaigns", "GET", "Marketing Campaigns"),
            
            # Corrected analytics endpoints
            ("/api/v2/analytics/dashboard", "GET", "Analytics Dashboard"),
            ("/api/v2/analytics/appointments", "GET", "Appointment Analytics"),
            ("/api/v2/analytics/revenue", "GET", "Revenue Analytics"),
            
            # Corrected payments endpoint
            ("/api/v2/payments/history", "GET", "Payment History"),
            
            # Corrected bookings endpoint
            ("/api/v2/bookings/my", "GET", "My Bookings"),
            
            # Corrected integrations endpoints (no prefix)
            ("/available", "GET", "Available Integrations"),
            ("/status", "GET", "Integration Status"),
            ("/health/all", "GET", "Integration Health"),
            
            # Additional important endpoints
            ("/api/v2/dashboard", "GET", "Dashboard Data"),
            ("/api/v2/calendar/events", "GET", "Calendar Events"),
            ("/api/v2/barber-availability", "GET", "Barber Availability"),
            ("/api/v2/booking-rules", "GET", "Booking Rules"),
            ("/api/v2/recurring", "GET", "Recurring Appointments"),
            ("/api/v2/imports", "GET", "Import Data"),
            ("/api/v2/exports", "GET", "Export Data"),
            ("/api/v2/admin/services", "GET", "Admin Services"),
            ("/api/v2/admin/webhooks", "GET", "Admin Webhooks"),
            ("/api/v2/organizations", "GET", "Organizations"),
            ("/api/v2/trial-monitoring", "GET", "Trial Monitoring"),
            ("/api/v2/ai-analytics/insights", "GET", "AI Analytics"),
            ("/api/v2/mfa/status", "GET", "MFA Status"),
            ("/api/v2/tracking/pixels", "GET", "Tracking Pixels"),
        ]
        
        working_count = 0
        broken_count = 0
        
        for endpoint, method, name in endpoints:
            try:
                if method == "GET":
                    response = self.session.get(f"{BASE_URL}{endpoint}")
                
                status = response.status_code
                result = {
                    "endpoint": endpoint,
                    "name": name,
                    "method": method,
                    "status": status,
                    "working": status in [200, 201]
                }
                
                # Try to parse response
                try:
                    data = response.json()
                    if len(str(data)) > 100:
                        result["response_sample"] = str(data)[:100] + "..."
                    else:
                        result["response_sample"] = str(data)
                except:
                    result["response_sample"] = response.text[:100]
                
                self.test_results["api_endpoints"].append(result)
                
                if status in [200, 201]:
                    print(f"✅ {name} ({endpoint}) - {status}")
                    self.test_results["working_features"].append(f"API: {name}")
                    working_count += 1
                else:
                    print(f"❌ {name} ({endpoint}) - {status}")
                    if status == 500:
                        print(f"   🔍 Response: {result['response_sample']}")
                    self.test_results["broken_features"].append(f"API: {name} - Status {status}")
                    broken_count += 1
                    
            except Exception as e:
                print(f"❌ {name} ({endpoint}) - Error: {str(e)}")
                self.test_results["broken_features"].append(f"API: {name} - Error: {str(e)}")
                broken_count += 1
        
        return working_count, broken_count
    
    def test_specific_broken_endpoints(self):
        """Test specific endpoints that were showing 500 errors"""
        print("\n🔍 Deep Dive: Testing 500 Error Endpoints...")
        
        problem_endpoints = [
            ("/api/v2/analytics/appointments", "Appointment Analytics"),
            ("/api/v2/payments/history", "Payment History"),
        ]
        
        for endpoint, name in problem_endpoints:
            print(f"\n📊 Testing {name} ({endpoint}):")
            try:
                response = self.session.get(f"{BASE_URL}{endpoint}")
                print(f"   Status: {response.status_code}")
                print(f"   Headers: {dict(response.headers)}")
                
                if response.status_code == 500:
                    print(f"   Error Body: {response.text}")
                else:
                    try:
                        data = response.json()
                        print(f"   Success: {len(str(data))} characters of data")
                        if isinstance(data, dict) and "error" in data:
                            print(f"   Error in data: {data.get('error')}")
                    except:
                        print(f"   Text response: {response.text[:200]}")
                        
            except Exception as e:
                print(f"   Exception: {str(e)}")
    
    def generate_detailed_report(self):
        """Generate comprehensive test report"""
        working_count = len(self.test_results["working_features"])
        broken_count = len(self.test_results["broken_features"])
        total_count = working_count + broken_count
        
        self.test_results["summary"] = {
            "total_tested": total_count,
            "working": working_count,
            "broken": broken_count,
            "success_rate": f"{working_count/total_count*100:.1f}%" if total_count > 0 else "0%"
        }
        
        print("\n" + "="*80)
        print("📊 CORRECTED BOOKEDBARBER FUNCTIONALITY TEST REPORT")
        print("="*80)
        print(f"Test Date: {self.test_results['timestamp']}")
        print(f"Total Endpoints Tested: {total_count}")
        print(f"Working: {working_count} ({working_count/total_count*100:.1f}%)")
        print(f"Broken: {broken_count} ({broken_count/total_count*100:.1f}%)")
        
        print("\n✅ WORKING FEATURES:")
        for feature in self.test_results["working_features"]:
            print(f"  • {feature}")
        
        print("\n❌ BROKEN FEATURES:")
        for feature in self.test_results["broken_features"]:
            print(f"  • {feature}")
        
        # Group broken features by type
        print("\n🔍 BROKEN FEATURES BY CATEGORY:")
        status_404 = [f for f in self.test_results["broken_features"] if "404" in f]
        status_500 = [f for f in self.test_results["broken_features"] if "500" in f]
        status_422 = [f for f in self.test_results["broken_features"] if "422" in f]
        status_403 = [f for f in self.test_results["broken_features"] if "403" in f]
        
        if status_404:
            print(f"  🔍 404 Not Found ({len(status_404)} endpoints):")
            for f in status_404:
                print(f"    - {f}")
        
        if status_500:
            print(f"  💥 500 Internal Server Error ({len(status_500)} endpoints):")
            for f in status_500:
                print(f"    - {f}")
        
        if status_422:
            print(f"  📝 422 Validation Error ({len(status_422)} endpoints):")
            for f in status_422:
                print(f"    - {f}")
        
        if status_403:
            print(f"  🔒 403 Permission Denied ({len(status_403)} endpoints):")
            for f in status_403:
                print(f"    - {f}")
        
        # Save detailed report
        with open("corrected-functionality-test-report.json", "w") as f:
            json.dump(self.test_results, f, indent=2)
        
        print("\n📄 Detailed report saved to: corrected-functionality-test-report.json")

def main():
    tester = BookedBarberCorrectedTester()
    
    # Login
    if tester.login():
        # Test corrected API endpoints
        working, broken = tester.test_corrected_api_endpoints()
        
        # Deep dive into problematic endpoints
        tester.test_specific_broken_endpoints()
    
    # Generate comprehensive report
    tester.generate_detailed_report()

if __name__ == "__main__":
    main()