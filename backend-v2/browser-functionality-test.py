#!/usr/bin/env python3
"""
Comprehensive Browser-Based Functionality Test for BookedBarber
Tests all navigation items and identifies broken functionality
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

class BookedBarberTester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.test_results = {
            "timestamp": datetime.now().isoformat(),
            "public_pages": [],
            "protected_pages": [],
            "api_endpoints": [],
            "broken_features": [],
            "working_features": []
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
    
    def test_public_pages(self):
        """Test public pages that should work without auth"""
        print("\n🌐 Testing Public Pages...")
        public_pages = [
            ("/", "Home"),
            ("/login", "Login"),
            ("/register", "Register"),
            ("/forgot-password", "Forgot Password"),
            ("/terms", "Terms"),
            ("/privacy", "Privacy"),
            ("/cookies", "Cookies")
        ]
        
        for path, name in public_pages:
            response = requests.get(f"{FRONTEND_URL}{path}")
            status = response.status_code
            result = {
                "path": path,
                "name": name,
                "status": status,
                "working": status == 200
            }
            self.test_results["public_pages"].append(result)
            
            if status == 200:
                print(f"✅ {name} ({path}) - {status}")
                self.test_results["working_features"].append(f"Public page: {name}")
            else:
                print(f"❌ {name} ({path}) - {status}")
                self.test_results["broken_features"].append(f"Public page: {name} - Status {status}")
    
    def test_api_endpoints(self):
        """Test API endpoints with authentication"""
        print("\n🔌 Testing API Endpoints...")
        
        # API endpoints to test
        endpoints = [
            ("/api/v2/auth/me", "GET", "User Profile"),
            ("/api/v2/appointments", "GET", "Appointments List"),
            ("/api/v2/services", "GET", "Services"),
            ("/api/v2/analytics/overview", "GET", "Analytics Overview"),
            ("/api/v2/analytics/appointments", "GET", "Appointment Analytics"),
            ("/api/v2/payments/history", "GET", "Payment History"),
            ("/api/v2/clients", "GET", "Clients List"),
            ("/api/v2/notifications/stats", "GET", "Notification Stats"),
            ("/api/v2/barbers", "GET", "Barbers List"),
            ("/api/v2/bookings/my-bookings", "GET", "My Bookings"),
            ("/api/v2/integrations", "GET", "Integrations"),
            ("/api/v2/reviews", "GET", "Reviews"),
            ("/api/v2/marketing/campaigns", "GET", "Marketing Campaigns")
        ]
        
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
                    result["response_sample"] = str(data)[:100] + "..." if len(str(data)) > 100 else str(data)
                except:
                    result["response_sample"] = response.text[:100]
                
                self.test_results["api_endpoints"].append(result)
                
                if status in [200, 201]:
                    print(f"✅ {name} ({endpoint}) - {status}")
                    self.test_results["working_features"].append(f"API: {name}")
                else:
                    print(f"❌ {name} ({endpoint}) - {status}")
                    self.test_results["broken_features"].append(f"API: {name} - Status {status}")
                    
            except Exception as e:
                print(f"❌ {name} ({endpoint}) - Error: {str(e)}")
                self.test_results["broken_features"].append(f"API: {name} - Error: {str(e)}")
    
    def test_protected_pages(self):
        """Test protected pages that require authentication"""
        print("\n🔐 Testing Protected Pages (navigation items)...")
        
        # Based on the navigation.ts file
        protected_pages = [
            ("/dashboard", "Dashboard"),
            ("/calendar", "Calendar View"),
            ("/bookings", "My Bookings"),
            ("/barber-availability", "Availability"),
            ("/recurring", "Recurring Appointments"),
            ("/clients", "Clients"),
            ("/notifications", "Communication"),
            ("/marketing", "Marketing Suite"),
            ("/marketing/campaigns", "Campaigns"),
            ("/marketing/templates", "Templates"),
            ("/marketing/contacts", "Contacts"),
            ("/marketing/analytics", "Marketing Analytics"),
            ("/marketing/billing", "Usage & Billing"),
            ("/payments", "Payment Overview"),
            ("/barber/earnings", "Earnings"),
            ("/payments/gift-certificates", "Gift Certificates"),
            ("/analytics", "Analytics"),
            ("/enterprise/dashboard", "Enterprise Dashboard"),
            ("/admin", "Admin Overview"),
            ("/admin/services", "Services"),
            ("/dashboard/staff/invitations", "Staff Invitations"),
            ("/admin/booking-rules", "Booking Rules"),
            ("/admin/webhooks", "Webhooks"),
            ("/import", "Import Data"),
            ("/export", "Export Data"),
            ("/settings", "Settings"),
            ("/settings/profile", "Profile Settings"),
            ("/settings/calendar", "Calendar Sync"),
            ("/settings/notifications", "Notification Settings"),
            ("/settings/integrations", "Integrations"),
            ("/settings/tracking-pixels", "Tracking Pixels")
        ]
        
        for path, name in protected_pages:
            # We can't directly test frontend routes, but we can check if corresponding API exists
            print(f"📍 {name} ({path}) - Frontend route registered")
            self.test_results["protected_pages"].append({
                "path": path,
                "name": name,
                "note": "Frontend route - requires browser testing"
            })
    
    def generate_report(self):
        """Generate comprehensive test report"""
        print("\n" + "="*60)
        print("📊 BOOKEDBARBER FUNCTIONALITY TEST REPORT")
        print("="*60)
        print(f"Test Date: {self.test_results['timestamp']}")
        
        print("\n✅ WORKING FEATURES:")
        for feature in self.test_results["working_features"]:
            print(f"  • {feature}")
        
        print("\n❌ BROKEN FEATURES:")
        for feature in self.test_results["broken_features"]:
            print(f"  • {feature}")
        
        print("\n📱 FRONTEND ROUTES (require browser testing):")
        for page in self.test_results["protected_pages"][:10]:  # Show first 10
            print(f"  • {page['name']} ({page['path']})")
        
        # Save detailed report
        with open("functionality-test-report.json", "w") as f:
            json.dump(self.test_results, f, indent=2)
        
        print("\n📄 Detailed report saved to: functionality-test-report.json")
        
        # Summary
        working_count = len(self.test_results["working_features"])
        broken_count = len(self.test_results["broken_features"])
        total_count = working_count + broken_count
        
        print(f"\n📈 SUMMARY:")
        print(f"  • Total features tested: {total_count}")
        print(f"  • Working: {working_count} ({working_count/total_count*100:.1f}%)")
        print(f"  • Broken: {broken_count} ({broken_count/total_count*100:.1f}%)")

def main():
    tester = BookedBarberTester()
    
    # Test public pages first
    tester.test_public_pages()
    
    # Login
    if tester.login():
        # Test API endpoints
        tester.test_api_endpoints()
        
        # List protected pages
        tester.test_protected_pages()
    
    # Generate report
    tester.generate_report()

if __name__ == "__main__":
    main()