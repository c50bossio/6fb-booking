#!/usr/bin/env python3
"""
Comprehensive End-to-End System Test
Tests the complete user journey from registration to review
"""

import requests
import json
import random
import string
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import sys
import os
import time

# Add backend to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Test configuration
BASE_URL = "http://localhost:8000"
API_V1 = f"{BASE_URL}/api/v1"

class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

class TestResult:
    """Store test results"""
    def __init__(self, name: str):
        self.name = name
        self.steps = []
        self.passed = True
        self.error_message = None
    
    def add_step(self, step: str, success: bool, details: str = ""):
        self.steps.append({
            "step": step,
            "success": success,
            "details": details
        })
        if not success:
            self.passed = False
            if not self.error_message:
                self.error_message = f"Failed at: {step}"

class EndToEndTester:
    def __init__(self):
        self.client_token = None
        self.client_data = None
        self.services = []
        self.barbers = []
        self.selected_service = None
        self.selected_barber = None
        self.booking_data = None
        self.appointment_id = None
        self.results = []
        
    def generate_test_email(self) -> str:
        """Generate unique test email"""
        random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        return f"test_client_{random_str}@example.com"
    
    def print_header(self, text: str):
        """Print formatted header"""
        print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.BLUE}{text.center(60)}{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}\n")
    
    def print_step(self, step: str, status: str = "TESTING"):
        """Print step status"""
        color = Colors.YELLOW if status == "TESTING" else Colors.GREEN if status == "PASSED" else Colors.RED
        print(f"{color}[{status}]{Colors.RESET} {step}")
    
    def print_detail(self, detail: str):
        """Print step detail"""
        print(f"  {Colors.CYAN}→{Colors.RESET} {detail}")
    
    def test_1_register_client(self) -> TestResult:
        """Test 1: Register a new client"""
        result = TestResult("Client Registration")
        self.print_header("TEST 1: Client Registration")
        
        try:
            # Generate test data
            email = self.generate_test_email()
            password = "TestPassword123!"
            
            self.print_step("Creating new client account")
            self.print_detail(f"Email: {email}")
            
            # Register client
            response = requests.post(
                f"{API_V1}/auth/register",
                json={
                    "email": email,
                    "password": password,
                    "full_name": "Test Client",
                    "phone": "+1234567890",
                    "user_type": "client"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.client_token = data["access_token"]
                self.client_data = {
                    "email": email,
                    "password": password,
                    "user_id": data.get("user", {}).get("id")
                }
                result.add_step("Client registration", True, f"User ID: {self.client_data['user_id']}")
                self.print_step("Client registration", "PASSED")
                self.print_detail(f"Successfully created client with ID: {self.client_data['user_id']}")
            else:
                result.add_step("Client registration", False, f"Status: {response.status_code}, Error: {response.text}")
                self.print_step("Client registration", "FAILED")
                self.print_detail(f"Error: {response.text}")
            
            # Test login
            if self.client_token:
                self.print_step("Testing client login")
                
                login_response = requests.post(
                    f"{API_V1}/auth/login",
                    data={
                        "username": email,
                        "password": password
                    }
                )
                
                if login_response.status_code == 200:
                    result.add_step("Client login", True)
                    self.print_step("Client login", "PASSED")
                else:
                    result.add_step("Client login", False, f"Status: {login_response.status_code}")
                    self.print_step("Client login", "FAILED")
                
        except Exception as e:
            result.add_step("Registration test", False, str(e))
            self.print_step("Registration test", "FAILED")
            self.print_detail(f"Exception: {str(e)}")
        
        return result
    
    def test_2_browse_services(self) -> TestResult:
        """Test 2: Browse available services"""
        result = TestResult("Browse Services")
        self.print_header("TEST 2: Browse Available Services")
        
        try:
            headers = {"Authorization": f"Bearer {self.client_token}"} if self.client_token else {}
            
            # Get service categories
            self.print_step("Fetching service categories")
            categories_response = requests.get(f"{API_V1}/booking/categories", headers=headers)
            
            if categories_response.status_code == 200:
                categories = categories_response.json()
                result.add_step("Fetch categories", True, f"Found {len(categories)} categories")
                self.print_step("Fetch categories", "PASSED")
                self.print_detail(f"Found {len(categories)} service categories")
                
                for cat in categories[:3]:  # Show first 3
                    self.print_detail(f"  - {cat.get('name', 'Unknown')}")
            else:
                result.add_step("Fetch categories", False, f"Status: {categories_response.status_code}")
                self.print_step("Fetch categories", "FAILED")
            
            # Get all services
            self.print_step("Fetching available services")
            services_response = requests.get(f"{API_V1}/booking/services", headers=headers)
            
            if services_response.status_code == 200:
                self.services = services_response.json()
                result.add_step("Fetch services", True, f"Found {len(self.services)} services")
                self.print_step("Fetch services", "PASSED")
                self.print_detail(f"Found {len(self.services)} available services")
                
                # Select a service for booking
                if self.services:
                    self.selected_service = self.services[0]
                    self.print_detail(f"Selected service: {self.selected_service.get('name')} - ${self.selected_service.get('price')}")
                    
                    # Show first few services
                    for service in self.services[:3]:
                        self.print_detail(f"  - {service.get('name')} (${service.get('price')}, {service.get('duration_minutes')} min)")
            else:
                result.add_step("Fetch services", False, f"Status: {services_response.status_code}")
                self.print_step("Fetch services", "FAILED")
                
        except Exception as e:
            result.add_step("Browse services test", False, str(e))
            self.print_step("Browse services test", "FAILED")
            self.print_detail(f"Exception: {str(e)}")
        
        return result
    
    def test_3_check_availability(self) -> TestResult:
        """Test 3: Check barber availability"""
        result = TestResult("Check Availability")
        self.print_header("TEST 3: Check Barber Availability")
        
        try:
            headers = {"Authorization": f"Bearer {self.client_token}"} if self.client_token else {}
            
            # Get all barbers
            self.print_step("Fetching available barbers")
            barbers_response = requests.get(f"{API_V1}/barbers", headers=headers)
            
            if barbers_response.status_code == 200:
                self.barbers = barbers_response.json()
                result.add_step("Fetch barbers", True, f"Found {len(self.barbers)} barbers")
                self.print_step("Fetch barbers", "PASSED")
                self.print_detail(f"Found {len(self.barbers)} available barbers")
                
                # Select a barber
                if self.barbers:
                    self.selected_barber = self.barbers[0]
                    self.print_detail(f"Selected barber: {self.selected_barber.get('name', 'Unknown')}")
                    
                    # Show barber details
                    for barber in self.barbers[:3]:
                        self.print_detail(f"  - {barber.get('name')} at {barber.get('location', {}).get('name', 'Unknown location')}")
            else:
                result.add_step("Fetch barbers", False, f"Status: {barbers_response.status_code}")
                self.print_step("Fetch barbers", "FAILED")
            
            # Check availability for selected barber and service
            if self.selected_barber and self.selected_service:
                self.print_step("Checking barber availability")
                
                # Get availability for next 7 days
                start_date = datetime.now().date()
                end_date = start_date + timedelta(days=7)
                
                availability_response = requests.get(
                    f"{API_V1}/booking/availability",
                    params={
                        "barber_id": self.selected_barber.get("id"),
                        "service_id": self.selected_service.get("id"),
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat()
                    },
                    headers=headers
                )
                
                if availability_response.status_code == 200:
                    availability = availability_response.json()
                    result.add_step("Check availability", True, f"Found availability data")
                    self.print_step("Check availability", "PASSED")
                    
                    # Show first available slots
                    if availability.get("available_slots"):
                        self.print_detail(f"Found {len(availability['available_slots'])} available time slots")
                        for slot in availability["available_slots"][:3]:
                            self.print_detail(f"  - {slot}")
                    else:
                        self.print_detail("No available slots found in the next 7 days")
                else:
                    result.add_step("Check availability", False, f"Status: {availability_response.status_code}")
                    self.print_step("Check availability", "FAILED")
                    self.print_detail(f"Error: {availability_response.text}")
                    
        except Exception as e:
            result.add_step("Availability test", False, str(e))
            self.print_step("Availability test", "FAILED")
            self.print_detail(f"Exception: {str(e)}")
        
        return result
    
    def test_4_create_booking(self) -> TestResult:
        """Test 4: Create a booking"""
        result = TestResult("Create Booking")
        self.print_header("TEST 4: Create Booking")
        
        try:
            if not self.client_token:
                result.add_step("Create booking", False, "No client token available")
                self.print_step("Create booking", "FAILED")
                self.print_detail("Cannot create booking without authentication")
                return result
            
            if not self.selected_service or not self.selected_barber:
                result.add_step("Create booking", False, "No service or barber selected")
                self.print_step("Create booking", "FAILED")
                self.print_detail("Cannot create booking without service and barber")
                return result
            
            headers = {"Authorization": f"Bearer {self.client_token}"}
            
            # Create booking for tomorrow at 2 PM
            booking_date = datetime.now() + timedelta(days=1)
            booking_time = booking_date.replace(hour=14, minute=0, second=0, microsecond=0)
            
            self.print_step("Creating booking")
            self.print_detail(f"Date/Time: {booking_time.isoformat()}")
            self.print_detail(f"Service: {self.selected_service.get('name')}")
            self.print_detail(f"Barber: {self.selected_barber.get('name')}")
            
            booking_data = {
                "service_id": self.selected_service.get("id"),
                "barber_id": self.selected_barber.get("id"),
                "start_time": booking_time.isoformat(),
                "notes": "Test booking from end-to-end test"
            }
            
            booking_response = requests.post(
                f"{API_V1}/booking/appointments",
                json=booking_data,
                headers=headers
            )
            
            if booking_response.status_code == 200:
                self.booking_data = booking_response.json()
                self.appointment_id = self.booking_data.get("id")
                result.add_step("Create booking", True, f"Booking ID: {self.appointment_id}")
                self.print_step("Create booking", "PASSED")
                self.print_detail(f"Successfully created booking with ID: {self.appointment_id}")
                self.print_detail(f"Status: {self.booking_data.get('status', 'unknown')}")
            else:
                result.add_step("Create booking", False, f"Status: {booking_response.status_code}, Error: {booking_response.text}")
                self.print_step("Create booking", "FAILED")
                self.print_detail(f"Error: {booking_response.text}")
                
        except Exception as e:
            result.add_step("Booking test", False, str(e))
            self.print_step("Booking test", "FAILED")
            self.print_detail(f"Exception: {str(e)}")
        
        return result
    
    def test_5_process_payment(self) -> TestResult:
        """Test 5: Process payment (simulate if Stripe not configured)"""
        result = TestResult("Process Payment")
        self.print_header("TEST 5: Process Payment")
        
        try:
            if not self.appointment_id:
                result.add_step("Process payment", False, "No appointment ID available")
                self.print_step("Process payment", "FAILED")
                self.print_detail("Cannot process payment without appointment")
                return result
            
            headers = {"Authorization": f"Bearer {self.client_token}"}
            
            # Check if Stripe is configured
            self.print_step("Checking payment configuration")
            
            # Try to create payment intent
            payment_data = {
                "appointment_id": self.appointment_id,
                "amount": self.selected_service.get("price", 0) * 100,  # Convert to cents
                "currency": "usd"
            }
            
            payment_response = requests.post(
                f"{API_V1}/payments/create-intent",
                json=payment_data,
                headers=headers
            )
            
            if payment_response.status_code == 200:
                payment_intent = payment_response.json()
                result.add_step("Create payment intent", True, f"Intent ID: {payment_intent.get('client_secret', 'N/A')[:20]}...")
                self.print_step("Create payment intent", "PASSED")
                self.print_detail(f"Payment intent created successfully")
                self.print_detail(f"Amount: ${payment_data['amount'] / 100:.2f}")
                
                # Simulate payment confirmation (in real scenario, this would be done client-side)
                self.print_step("Simulating payment confirmation")
                self.print_detail("Note: In production, payment would be confirmed via Stripe.js")
                result.add_step("Payment simulation", True, "Payment flow available")
                
            elif payment_response.status_code == 500 and "Stripe" in payment_response.text:
                result.add_step("Payment configuration", False, "Stripe not configured")
                self.print_step("Payment configuration", "SKIPPED")
                self.print_detail("Stripe is not configured - payment processing would fail in production")
                self.print_detail("To enable payments, configure STRIPE_SECRET_KEY in .env")
            else:
                result.add_step("Create payment intent", False, f"Status: {payment_response.status_code}")
                self.print_step("Create payment intent", "FAILED")
                self.print_detail(f"Error: {payment_response.text}")
                
        except Exception as e:
            result.add_step("Payment test", False, str(e))
            self.print_step("Payment test", "FAILED")
            self.print_detail(f"Exception: {str(e)}")
        
        return result
    
    def test_6_check_appointment(self) -> TestResult:
        """Test 6: Check appointment details"""
        result = TestResult("Check Appointment")
        self.print_header("TEST 6: Check Appointment Details")
        
        try:
            if not self.appointment_id:
                result.add_step("Check appointment", False, "No appointment ID available")
                self.print_step("Check appointment", "FAILED")
                self.print_detail("Cannot check appointment without ID")
                return result
            
            headers = {"Authorization": f"Bearer {self.client_token}"}
            
            # Get appointment details
            self.print_step("Fetching appointment details")
            
            appointment_response = requests.get(
                f"{API_V1}/appointments/{self.appointment_id}",
                headers=headers
            )
            
            if appointment_response.status_code == 200:
                appointment = appointment_response.json()
                result.add_step("Fetch appointment", True, f"Status: {appointment.get('status')}")
                self.print_step("Fetch appointment", "PASSED")
                self.print_detail(f"Appointment ID: {appointment.get('id')}")
                self.print_detail(f"Status: {appointment.get('status')}")
                self.print_detail(f"Service: {appointment.get('service', {}).get('name', 'Unknown')}")
                self.print_detail(f"Barber: {appointment.get('barber', {}).get('name', 'Unknown')}")
                self.print_detail(f"Date/Time: {appointment.get('start_time')}")
                self.print_detail(f"Total Cost: ${appointment.get('total_cost', 0):.2f}")
            else:
                result.add_step("Fetch appointment", False, f"Status: {appointment_response.status_code}")
                self.print_step("Fetch appointment", "FAILED")
                self.print_detail(f"Error: {appointment_response.text}")
            
            # Get all client appointments
            self.print_step("Fetching all client appointments")
            
            all_appointments_response = requests.get(
                f"{API_V1}/appointments",
                headers=headers
            )
            
            if all_appointments_response.status_code == 200:
                appointments = all_appointments_response.json()
                result.add_step("Fetch all appointments", True, f"Found {len(appointments)} appointments")
                self.print_step("Fetch all appointments", "PASSED")
                self.print_detail(f"Client has {len(appointments)} total appointments")
            else:
                result.add_step("Fetch all appointments", False, f"Status: {all_appointments_response.status_code}")
                self.print_step("Fetch all appointments", "FAILED")
                
        except Exception as e:
            result.add_step("Appointment check test", False, str(e))
            self.print_step("Appointment check test", "FAILED")
            self.print_detail(f"Exception: {str(e)}")
        
        return result
    
    def test_7_leave_review(self) -> TestResult:
        """Test 7: Leave a review"""
        result = TestResult("Leave Review")
        self.print_header("TEST 7: Leave Review")
        
        try:
            if not self.appointment_id:
                result.add_step("Leave review", False, "No appointment ID available")
                self.print_step("Leave review", "FAILED")
                self.print_detail("Cannot leave review without appointment")
                return result
            
            headers = {"Authorization": f"Bearer {self.client_token}"}
            
            # Submit review
            self.print_step("Submitting review")
            
            review_data = {
                "appointment_id": self.appointment_id,
                "rating": 5,
                "comment": "Excellent service! This is a test review from the end-to-end test."
            }
            
            review_response = requests.post(
                f"{API_V1}/booking/reviews",
                json=review_data,
                headers=headers
            )
            
            if review_response.status_code == 200:
                review = review_response.json()
                result.add_step("Submit review", True, f"Review ID: {review.get('id')}")
                self.print_step("Submit review", "PASSED")
                self.print_detail(f"Successfully submitted {review_data['rating']}-star review")
                self.print_detail(f"Review ID: {review.get('id')}")
            else:
                result.add_step("Submit review", False, f"Status: {review_response.status_code}")
                self.print_step("Submit review", "FAILED")
                self.print_detail(f"Error: {review_response.text}")
            
            # Get barber reviews
            if self.selected_barber:
                self.print_step("Fetching barber reviews")
                
                reviews_response = requests.get(
                    f"{API_V1}/booking/barbers/{self.selected_barber.get('id')}/reviews",
                    headers=headers
                )
                
                if reviews_response.status_code == 200:
                    reviews = reviews_response.json()
                    result.add_step("Fetch reviews", True, f"Found {len(reviews)} reviews")
                    self.print_step("Fetch reviews", "PASSED")
                    self.print_detail(f"Barber has {len(reviews)} total reviews")
                    
                    # Calculate average rating
                    if reviews:
                        avg_rating = sum(r.get('rating', 0) for r in reviews) / len(reviews)
                        self.print_detail(f"Average rating: {avg_rating:.1f}/5.0")
                else:
                    result.add_step("Fetch reviews", False, f"Status: {reviews_response.status_code}")
                    self.print_step("Fetch reviews", "FAILED")
                    
        except Exception as e:
            result.add_step("Review test", False, str(e))
            self.print_step("Review test", "FAILED")
            self.print_detail(f"Exception: {str(e)}")
        
        return result
    
    def test_8_analytics(self) -> TestResult:
        """Test 8: Test analytics endpoints"""
        result = TestResult("Analytics")
        self.print_header("TEST 8: Analytics Endpoints")
        
        try:
            # For analytics, we need admin token. Try to login as admin
            self.print_step("Testing analytics endpoints")
            self.print_detail("Note: Full analytics require admin privileges")
            
            headers = {"Authorization": f"Bearer {self.client_token}"}
            
            # Test public analytics endpoints
            analytics_endpoints = [
                ("/analytics/summary", "Analytics Summary"),
                ("/analytics/revenue", "Revenue Analytics"),
                ("/barbers/top-performers", "Top Performers"),
                ("/locations", "Location Analytics")
            ]
            
            for endpoint, name in analytics_endpoints:
                self.print_step(f"Testing {name}")
                
                response = requests.get(f"{API_V1}{endpoint}", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    result.add_step(name, True, f"Data retrieved")
                    self.print_step(name, "PASSED")
                    
                    # Show sample data
                    if isinstance(data, dict):
                        for key in list(data.keys())[:3]:
                            self.print_detail(f"  - {key}: {data[key]}")
                    elif isinstance(data, list):
                        self.print_detail(f"  Found {len(data)} items")
                        
                elif response.status_code == 403:
                    result.add_step(name, False, "Requires admin access")
                    self.print_step(name, "RESTRICTED")
                    self.print_detail("This endpoint requires admin privileges")
                else:
                    result.add_step(name, False, f"Status: {response.status_code}")
                    self.print_step(name, "FAILED")
                    
        except Exception as e:
            result.add_step("Analytics test", False, str(e))
            self.print_step("Analytics test", "FAILED")
            self.print_detail(f"Exception: {str(e)}")
        
        return result
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        self.print_header("6FB BOOKING SYSTEM - END-TO-END TEST")
        print(f"{Colors.CYAN}Testing API at: {BASE_URL}{Colors.RESET}")
        print(f"{Colors.CYAN}Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.RESET}\n")
        
        # Check if server is running
        try:
            response = requests.get(f"{BASE_URL}/health")
            if response.status_code != 200:
                print(f"{Colors.RED}ERROR: Server is not responding at {BASE_URL}{Colors.RESET}")
                print(f"{Colors.YELLOW}Please ensure the backend server is running:{Colors.RESET}")
                print(f"{Colors.CYAN}  cd /Users/bossio/6fb-booking/backend{Colors.RESET}")
                print(f"{Colors.CYAN}  uvicorn main:app --reload{Colors.RESET}")
                return
        except requests.exceptions.ConnectionError:
            print(f"{Colors.RED}ERROR: Cannot connect to server at {BASE_URL}{Colors.RESET}")
            print(f"{Colors.YELLOW}Please start the backend server first:{Colors.RESET}")
            print(f"{Colors.CYAN}  cd /Users/bossio/6fb-booking/backend{Colors.RESET}")
            print(f"{Colors.CYAN}  uvicorn main:app --reload{Colors.RESET}")
            return
        
        # Run all tests
        tests = [
            self.test_1_register_client,
            self.test_2_browse_services,
            self.test_3_check_availability,
            self.test_4_create_booking,
            self.test_5_process_payment,
            self.test_6_check_appointment,
            self.test_7_leave_review,
            self.test_8_analytics
        ]
        
        for test_func in tests:
            result = test_func()
            self.results.append(result)
            time.sleep(1)  # Small delay between tests
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        self.print_header("TEST SUMMARY")
        
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r.passed)
        failed_tests = total_tests - passed_tests
        
        print(f"{Colors.BOLD}Total Tests: {total_tests}{Colors.RESET}")
        print(f"{Colors.GREEN}Passed: {passed_tests}{Colors.RESET}")
        print(f"{Colors.RED}Failed: {failed_tests}{Colors.RESET}")
        print()
        
        # Detailed results
        print(f"{Colors.BOLD}Detailed Results:{Colors.RESET}")
        for i, result in enumerate(self.results, 1):
            status_color = Colors.GREEN if result.passed else Colors.RED
            status_text = "PASSED" if result.passed else "FAILED"
            print(f"\n{i}. {result.name}: {status_color}{status_text}{Colors.RESET}")
            
            for step in result.steps:
                step_color = Colors.GREEN if step['success'] else Colors.RED
                step_status = "✓" if step['success'] else "✗"
                print(f"   {step_color}{step_status}{Colors.RESET} {step['step']}")
                if step['details'] and not step['success']:
                    print(f"     {Colors.YELLOW}{step['details']}{Colors.RESET}")
        
        # Configuration recommendations
        print(f"\n{Colors.BOLD}Configuration Recommendations:{Colors.RESET}")
        
        recommendations = []
        
        # Check for Stripe configuration
        payment_test = next((r for r in self.results if r.name == "Process Payment"), None)
        if payment_test and not payment_test.passed:
            recommendations.append({
                "issue": "Stripe not configured",
                "solution": "Add STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, and STRIPE_WEBHOOK_SECRET to .env file",
                "impact": "Payment processing will not work"
            })
        
        # Check for missing data
        if not self.services:
            recommendations.append({
                "issue": "No services found in database",
                "solution": "Run: python scripts/seed_booking_data.py",
                "impact": "Cannot create bookings without services"
            })
        
        if not self.barbers:
            recommendations.append({
                "issue": "No barbers found in database",
                "solution": "Create barbers through the admin interface or seed script",
                "impact": "Cannot create bookings without barbers"
            })
        
        if recommendations:
            for rec in recommendations:
                print(f"\n{Colors.YELLOW}⚠ {rec['issue']}{Colors.RESET}")
                print(f"  Solution: {rec['solution']}")
                print(f"  Impact: {rec['impact']}")
        else:
            print(f"{Colors.GREEN}✓ All systems operational!{Colors.RESET}")
        
        # Quick start guide
        print(f"\n{Colors.BOLD}Quick Start Guide:{Colors.RESET}")
        print("1. Ensure all environment variables are set in .env")
        print("2. Run database migrations: alembic upgrade head")
        print("3. Seed test data: python scripts/seed_booking_data.py")
        print("4. Configure Stripe for payment processing")
        print("5. Start the backend: uvicorn main:app --reload")
        print("6. Start the frontend: cd ../frontend && npm run dev")

def main():
    """Main entry point"""
    tester = EndToEndTester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()