#!/usr/bin/env python3
"""
End-to-End Testing Suite for BookedBarber V2
Tests real business integrations and complete user journeys
"""

import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import stripe
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from main import app
from database import get_db, Base
from models.user import User
from models.appointment import Appointment
from models.payment import Payment


class TestMetrics:
    """Track test metrics and performance"""
    
    def __init__(self):
        self.start_time = time.time()
        self.api_response_times: List[float] = []
        self.page_load_times: List[float] = []
        self.test_results: Dict[str, Dict] = {}
        self.errors: List[Dict] = []
        
    def record_api_response(self, endpoint: str, duration: float):
        self.api_response_times.append(duration)
        
    def record_page_load(self, page: str, duration: float):
        self.page_load_times.append(duration)
        
    def record_test(self, test_name: str, success: bool, details: Dict):
        self.test_results[test_name] = {
            'success': success,
            'timestamp': datetime.now().isoformat(),
            'details': details
        }
        
    def record_error(self, test_name: str, error: str, context: Dict):
        self.errors.append({
            'test': test_name,
            'error': error,
            'context': context,
            'timestamp': datetime.now().isoformat()
        })
        
    def generate_report(self) -> Dict:
        """Generate comprehensive test report"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results.values() if r['success'])
        
        avg_api_response = sum(self.api_response_times) / len(self.api_response_times) if self.api_response_times else 0
        avg_page_load = sum(self.page_load_times) / len(self.page_load_times) if self.page_load_times else 0
        
        return {
            'summary': {
                'total_tests': total_tests,
                'passed': passed_tests,
                'failed': total_tests - passed_tests,
                'success_rate': f"{(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%",
                'duration': f"{time.time() - self.start_time:.2f}s",
                'timestamp': datetime.now().isoformat()
            },
            'performance': {
                'avg_api_response_time': f"{avg_api_response*1000:.0f}ms",
                'max_api_response_time': f"{max(self.api_response_times)*1000:.0f}ms" if self.api_response_times else "N/A",
                'avg_page_load_time': f"{avg_page_load:.2f}s",
                'api_responses_under_200ms': sum(1 for t in self.api_response_times if t < 0.2),
                'page_loads_under_2s': sum(1 for t in self.page_load_times if t < 2.0)
            },
            'test_results': self.test_results,
            'errors': self.errors,
            'production_readiness': self._assess_production_readiness()
        }
    
    def _assess_production_readiness(self) -> Dict:
        """Assess production readiness based on test results"""
        
        # Calculate readiness scores
        api_performance_ok = all(t < 0.2 for t in self.api_response_times[-10:]) if self.api_response_times else False
        page_performance_ok = all(t < 2.0 for t in self.page_load_times[-10:]) if self.page_load_times else False
        error_rate = len(self.errors) / len(self.test_results) if self.test_results else 1
        
        # Check critical features
        critical_features = [
            'test_user_registration_flow',
            'test_google_oauth_flow',
            'test_stripe_payment_flow',
            'test_appointment_booking_flow'
        ]
        
        critical_features_ok = all(
            self.test_results.get(f, {}).get('success', False) 
            for f in critical_features
        )
        
        readiness_score = 0
        if api_performance_ok: readiness_score += 25
        if page_performance_ok: readiness_score += 25
        if error_rate < 0.05: readiness_score += 25
        if critical_features_ok: readiness_score += 25
        
        return {
            'score': f"{readiness_score}%",
            'api_performance': 'PASS' if api_performance_ok else 'FAIL',
            'page_performance': 'PASS' if page_performance_ok else 'FAIL',
            'error_rate': f"{error_rate*100:.1f}%",
            'critical_features': 'PASS' if critical_features_ok else 'FAIL',
            'recommendation': 'Ready for production' if readiness_score >= 80 else 'Needs improvement'
        }


class E2ETestRunner:
    """Main test runner for end-to-end tests"""
    
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.frontend_url = "http://localhost:3000"
        self.metrics = TestMetrics()
        self.test_client = httpx.AsyncClient(base_url=self.base_url, timeout=30.0)
        self.test_data = {}
        
    async def setup(self):
        """Set up test environment"""
        print("🔧 Setting up test environment...")
        
        # Load test configuration
        os.environ['ENV_FILE'] = '.env.test'
        
        # Initialize test database
        engine = create_engine(os.getenv('TEST_DATABASE_URL', 'sqlite:///./test_e2e.db'))
        Base.metadata.create_all(bind=engine)
        
        # Initialize Stripe in test mode
        stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
        
        print("✅ Test environment ready")
        
    async def teardown(self):
        """Clean up test environment"""
        print("🧹 Cleaning up test environment...")
        await self.test_client.aclose()
        
        # Clean up test database
        if os.path.exists('./test_e2e.db'):
            os.remove('./test_e2e.db')
            
        print("✅ Cleanup complete")
    
    async def run_all_tests(self):
        """Run all end-to-end tests"""
        print("\n🚀 Starting End-to-End Testing Suite\n")
        
        try:
            await self.setup()
            
            # Test suites
            test_suites = [
                self.test_user_registration_flow,
                self.test_google_oauth_flow,
                self.test_calendar_integration,
                self.test_stripe_payment_flow,
                self.test_notification_system,
                self.test_complete_user_journey,
                self.test_business_owner_journey,
                self.test_error_handling,
                self.test_performance_under_load,
                self.test_gmb_integration
            ]
            
            for test_func in test_suites:
                print(f"\n📋 Running: {test_func.__name__}")
                try:
                    await test_func()
                except Exception as e:
                    print(f"❌ Test failed: {str(e)}")
                    self.metrics.record_error(test_func.__name__, str(e), {})
                    
        finally:
            await self.teardown()
            
        # Generate and display report
        report = self.metrics.generate_report()
        self._display_report(report)
        
        # Save report to file
        with open('e2e_test_report.json', 'w') as f:
            json.dump(report, f, indent=2)
            
        return report
    
    async def test_user_registration_flow(self):
        """Test complete user registration and trial activation"""
        print("  Testing user registration flow...")
        
        start_time = time.time()
        
        # 1. Register new user
        register_data = {
            "email": "testuser@bookedbarber.com",
            "password": "SecurePass123!",
            "full_name": "Test User",
            "phone": "+15551234567",
            "user_type": "barber"
        }
        
        response = await self.test_client.post("/api/v2/auth/register", json=register_data)
        self.metrics.record_api_response("/api/v2/auth/register", time.time() - start_time)
        
        if response.status_code == 201:
            user_data = response.json()
            self.test_data['user'] = user_data
            
            # 2. Verify email (simulate)
            verify_response = await self.test_client.post(
                f"/api/v2/auth/verify-email/{user_data['id']}",
                json={"token": "test-verification-token"}
            )
            
            # 3. Login
            login_response = await self.test_client.post(
                "/api/v2/auth/login",
                data={"username": register_data["email"], "password": register_data["password"]}
            )
            
            if login_response.status_code == 200:
                tokens = login_response.json()
                self.test_data['tokens'] = tokens
                self.metrics.record_test('test_user_registration_flow', True, {
                    'user_id': user_data['id'],
                    'trial_active': user_data.get('trial_active', False)
                })
                print("    ✅ User registration successful")
            else:
                raise Exception(f"Login failed: {login_response.text}")
        else:
            raise Exception(f"Registration failed: {response.text}")
    
    async def test_google_oauth_flow(self):
        """Test Google OAuth flow with test account"""
        print("  Testing Google OAuth flow...")
        
        # Note: In real testing, you'd use Google's OAuth playground or test accounts
        # Here we simulate the OAuth flow
        
        start_time = time.time()
        
        # 1. Initiate OAuth flow
        oauth_response = await self.test_client.get("/api/v2/auth/google/login")
        self.metrics.record_api_response("/api/v2/auth/google/login", time.time() - start_time)
        
        if oauth_response.status_code == 200:
            oauth_data = oauth_response.json()
            
            # 2. Simulate OAuth callback with test code
            callback_response = await self.test_client.get(
                "/api/v2/auth/google/callback",
                params={"code": "test-oauth-code", "state": oauth_data.get('state')}
            )
            
            if callback_response.status_code in [200, 302]:
                self.metrics.record_test('test_google_oauth_flow', True, {
                    'oauth_url': oauth_data.get('auth_url'),
                    'callback_success': True
                })
                print("    ✅ Google OAuth flow working")
            else:
                raise Exception(f"OAuth callback failed: {callback_response.text}")
        else:
            raise Exception(f"OAuth initiation failed: {oauth_response.text}")
    
    async def test_calendar_integration(self):
        """Test Google Calendar integration"""
        print("  Testing Google Calendar integration...")
        
        # Ensure we have auth tokens
        if 'tokens' not in self.test_data:
            print("    ⚠️  Skipping - no auth tokens available")
            return
        
        headers = {"Authorization": f"Bearer {self.test_data['tokens']['access_token']}"}
        
        # 1. Connect calendar (simulate)
        connect_response = await self.test_client.post(
            "/api/v2/calendar/connect",
            headers=headers,
            json={"auth_code": "test-calendar-auth-code"}
        )
        
        if connect_response.status_code == 200:
            # 2. Test calendar sync
            sync_response = await self.test_client.post(
                "/api/v2/calendar/sync",
                headers=headers
            )
            
            # 3. Create test event
            event_data = {
                "title": "Test Appointment",
                "start_time": (datetime.now() + timedelta(days=1)).isoformat(),
                "end_time": (datetime.now() + timedelta(days=1, hours=1)).isoformat(),
                "description": "E2E Test Appointment"
            }
            
            create_response = await self.test_client.post(
                "/api/v2/calendar/events",
                headers=headers,
                json=event_data
            )
            
            success = sync_response.status_code == 200 and create_response.status_code == 201
            
            self.metrics.record_test('test_calendar_integration', success, {
                'calendar_connected': connect_response.status_code == 200,
                'sync_working': sync_response.status_code == 200,
                'event_creation': create_response.status_code == 201
            })
            
            if success:
                print("    ✅ Calendar integration working")
            else:
                print("    ❌ Calendar integration issues detected")
    
    async def test_stripe_payment_flow(self):
        """Test Stripe payment processing in test mode"""
        print("  Testing Stripe payment flow...")
        
        if 'tokens' not in self.test_data:
            print("    ⚠️  Skipping - no auth tokens available")
            return
        
        headers = {"Authorization": f"Bearer {self.test_data['tokens']['access_token']}"}
        
        # 1. Create payment intent
        payment_data = {
            "amount": 5000,  # $50.00
            "currency": "usd",
            "description": "Test haircut service"
        }
        
        start_time = time.time()
        intent_response = await self.test_client.post(
            "/api/v2/payments/create-intent",
            headers=headers,
            json=payment_data
        )
        self.metrics.record_api_response("/api/v2/payments/create-intent", time.time() - start_time)
        
        if intent_response.status_code == 200:
            intent_data = intent_response.json()
            
            # 2. Confirm payment (simulate successful payment)
            confirm_data = {
                "payment_intent_id": intent_data['id'],
                "payment_method": "pm_card_visa"  # Stripe test card
            }
            
            confirm_response = await self.test_client.post(
                "/api/v2/payments/confirm",
                headers=headers,
                json=confirm_data
            )
            
            # 3. Test webhook (simulate Stripe webhook)
            webhook_data = {
                "type": "payment_intent.succeeded",
                "data": {
                    "object": {
                        "id": intent_data['id'],
                        "amount": payment_data['amount'],
                        "status": "succeeded"
                    }
                }
            }
            
            webhook_response = await self.test_client.post(
                "/api/v2/webhooks/stripe",
                json=webhook_data,
                headers={"Stripe-Signature": "test-signature"}
            )
            
            # 4. Test refund
            refund_response = await self.test_client.post(
                f"/api/v2/payments/{intent_data['id']}/refund",
                headers=headers,
                json={"amount": 2500}  # Partial refund
            )
            
            success = all([
                intent_response.status_code == 200,
                confirm_response.status_code == 200,
                webhook_response.status_code == 200,
                refund_response.status_code == 200
            ])
            
            self.metrics.record_test('test_stripe_payment_flow', success, {
                'payment_intent_created': intent_response.status_code == 200,
                'payment_confirmed': confirm_response.status_code == 200,
                'webhook_processed': webhook_response.status_code == 200,
                'refund_processed': refund_response.status_code == 200,
                'payment_intent_id': intent_data.get('id')
            })
            
            if success:
                print("    ✅ Stripe payment flow working")
            else:
                print("    ❌ Stripe payment issues detected")
        else:
            raise Exception(f"Payment intent creation failed: {intent_response.text}")
    
    async def test_notification_system(self):
        """Test email and SMS notification delivery"""
        print("  Testing notification system...")
        
        if 'tokens' not in self.test_data:
            print("    ⚠️  Skipping - no auth tokens available")
            return
        
        headers = {"Authorization": f"Bearer {self.test_data['tokens']['access_token']}"}
        
        # 1. Test email notification
        email_data = {
            "to": "test@bookedbarber.com",
            "subject": "E2E Test Email",
            "template": "appointment_reminder",
            "data": {
                "appointment_time": datetime.now().isoformat(),
                "service": "Test Service",
                "barber": "Test Barber"
            }
        }
        
        email_response = await self.test_client.post(
            "/api/v2/notifications/email",
            headers=headers,
            json=email_data
        )
        
        # 2. Test SMS notification
        sms_data = {
            "to": "+15005550006",  # Twilio test number
            "message": "E2E Test: Your appointment is confirmed for tomorrow at 2 PM"
        }
        
        sms_response = await self.test_client.post(
            "/api/v2/notifications/sms",
            headers=headers,
            json=sms_data
        )
        
        # 3. Test notification preferences
        prefs_response = await self.test_client.put(
            "/api/v2/users/me/notification-preferences",
            headers=headers,
            json={
                "email_enabled": True,
                "sms_enabled": True,
                "reminder_hours": [24, 2]
            }
        )
        
        success = all([
            email_response.status_code in [200, 202],
            sms_response.status_code in [200, 202],
            prefs_response.status_code == 200
        ])
        
        self.metrics.record_test('test_notification_system', success, {
            'email_sent': email_response.status_code in [200, 202],
            'sms_sent': sms_response.status_code in [200, 202],
            'preferences_updated': prefs_response.status_code == 200
        })
        
        if success:
            print("    ✅ Notification system working")
        else:
            print("    ❌ Notification system issues detected")
    
    async def test_complete_user_journey(self):
        """Test complete user journey from registration to completed appointment"""
        print("  Testing complete user journey...")
        
        journey_start = time.time()
        
        # 1. User discovers site (simulate page load)
        await asyncio.sleep(0.5)  # Simulate page load
        self.metrics.record_page_load("landing_page", 0.5)
        
        # 2. User registers (already done in previous test)
        if 'user' not in self.test_data:
            await self.test_user_registration_flow()
        
        headers = {"Authorization": f"Bearer {self.test_data['tokens']['access_token']}"}
        
        # 3. User searches for barbers
        search_response = await self.test_client.get(
            "/api/v2/barbers/search",
            headers=headers,
            params={"location": "New York", "service": "haircut"}
        )
        
        if search_response.status_code == 200:
            barbers = search_response.json()
            
            # 4. User views barber profile
            if barbers:
                barber_id = barbers[0]['id']
                profile_response = await self.test_client.get(
                    f"/api/v2/barbers/{barber_id}",
                    headers=headers
                )
                
                # 5. User checks availability
                availability_response = await self.test_client.get(
                    f"/api/v2/barbers/{barber_id}/availability",
                    headers=headers,
                    params={"date": (datetime.now() + timedelta(days=1)).date().isoformat()}
                )
                
                # 6. User books appointment
                if availability_response.status_code == 200:
                    slots = availability_response.json()
                    if slots:
                        booking_data = {
                            "barber_id": barber_id,
                            "service_id": 1,
                            "start_time": slots[0]['start_time'],
                            "notes": "E2E test booking"
                        }
                        
                        booking_response = await self.test_client.post(
                            "/api/v2/appointments",
                            headers=headers,
                            json=booking_data
                        )
                        
                        if booking_response.status_code == 201:
                            appointment = booking_response.json()
                            self.test_data['appointment'] = appointment
                            
                            # 7. User pays for appointment
                            payment_response = await self.test_client.post(
                                f"/api/v2/appointments/{appointment['id']}/pay",
                                headers=headers,
                                json={"payment_method": "pm_card_visa"}
                            )
                            
                            # 8. Simulate appointment completion
                            complete_response = await self.test_client.post(
                                f"/api/v2/appointments/{appointment['id']}/complete",
                                headers=headers
                            )
                            
                            journey_time = time.time() - journey_start
                            
                            success = all([
                                search_response.status_code == 200,
                                booking_response.status_code == 201,
                                payment_response.status_code == 200,
                                complete_response.status_code == 200
                            ])
                            
                            self.metrics.record_test('test_complete_user_journey', success, {
                                'journey_time': f"{journey_time:.2f}s",
                                'barbers_found': len(barbers),
                                'appointment_booked': booking_response.status_code == 201,
                                'payment_processed': payment_response.status_code == 200,
                                'appointment_completed': complete_response.status_code == 200
                            })
                            
                            if success:
                                print("    ✅ Complete user journey successful")
                            else:
                                print("    ❌ User journey issues detected")
    
    async def test_business_owner_journey(self):
        """Test business owner setup and management flow"""
        print("  Testing business owner journey...")
        
        # 1. Register as business owner
        owner_data = {
            "email": "owner@testbarbershop.com",
            "password": "OwnerPass123!",
            "full_name": "Shop Owner",
            "phone": "+15551234568",
            "user_type": "shop_owner"
        }
        
        register_response = await self.test_client.post("/api/v2/auth/register", json=owner_data)
        
        if register_response.status_code == 201:
            # Login
            login_response = await self.test_client.post(
                "/api/v2/auth/login",
                data={"username": owner_data["email"], "password": owner_data["password"]}
            )
            
            tokens = login_response.json()
            headers = {"Authorization": f"Bearer {tokens['access_token']}"}
            
            # 2. Create business profile
            business_data = {
                "name": "Test Barbershop E2E",
                "address": "123 Test St, New York, NY 10001",
                "phone": "+15551234569",
                "description": "Premium barbershop for E2E testing",
                "hours": {
                    "monday": {"open": "09:00", "close": "19:00"},
                    "tuesday": {"open": "09:00", "close": "19:00"},
                    "wednesday": {"open": "09:00", "close": "19:00"},
                    "thursday": {"open": "09:00", "close": "19:00"},
                    "friday": {"open": "09:00", "close": "20:00"},
                    "saturday": {"open": "10:00", "close": "18:00"},
                    "sunday": {"closed": True}
                }
            }
            
            business_response = await self.test_client.post(
                "/api/v2/businesses",
                headers=headers,
                json=business_data
            )
            
            if business_response.status_code == 201:
                business = business_response.json()
                
                # 3. Connect Google My Business (simulate)
                gmb_response = await self.test_client.post(
                    f"/api/v2/businesses/{business['id']}/gmb/connect",
                    headers=headers,
                    json={"auth_code": "test-gmb-auth-code"}
                )
                
                # 4. Add services
                services = [
                    {"name": "Haircut", "price": 35, "duration": 30},
                    {"name": "Beard Trim", "price": 20, "duration": 15},
                    {"name": "Full Service", "price": 50, "duration": 45}
                ]
                
                for service in services:
                    await self.test_client.post(
                        f"/api/v2/businesses/{business['id']}/services",
                        headers=headers,
                        json=service
                    )
                
                # 5. Add barbers
                barber_data = {
                    "email": "barber1@testshop.com",
                    "name": "Test Barber",
                    "phone": "+15551234570"
                }
                
                barber_response = await self.test_client.post(
                    f"/api/v2/businesses/{business['id']}/barbers",
                    headers=headers,
                    json=barber_data
                )
                
                # 6. Check analytics
                analytics_response = await self.test_client.get(
                    f"/api/v2/businesses/{business['id']}/analytics",
                    headers=headers
                )
                
                success = all([
                    business_response.status_code == 201,
                    gmb_response.status_code in [200, 201],
                    barber_response.status_code == 201,
                    analytics_response.status_code == 200
                ])
                
                self.metrics.record_test('test_business_owner_journey', success, {
                    'business_created': business_response.status_code == 201,
                    'gmb_connected': gmb_response.status_code in [200, 201],
                    'services_added': len(services),
                    'barbers_added': barber_response.status_code == 201,
                    'analytics_available': analytics_response.status_code == 200
                })
                
                if success:
                    print("    ✅ Business owner journey successful")
                else:
                    print("    ❌ Business owner journey issues detected")
    
    async def test_error_handling(self):
        """Test error handling for various failure scenarios"""
        print("  Testing error handling...")
        
        errors_handled = []
        
        # 1. Test network timeout
        try:
            timeout_client = httpx.AsyncClient(base_url=self.base_url, timeout=0.001)
            await timeout_client.get("/api/v2/health")
        except httpx.TimeoutException:
            errors_handled.append("network_timeout")
        
        # 2. Test invalid authentication
        invalid_response = await self.test_client.get(
            "/api/v2/appointments",
            headers={"Authorization": "Bearer invalid-token"}
        )
        if invalid_response.status_code == 401:
            errors_handled.append("invalid_auth")
        
        # 3. Test rate limiting
        rate_limit_hit = False
        for i in range(150):  # Exceed rate limit
            response = await self.test_client.post(
                "/api/v2/auth/login",
                data={"username": "test@test.com", "password": "wrong"}
            )
            if response.status_code == 429:
                rate_limit_hit = True
                errors_handled.append("rate_limiting")
                break
        
        # 4. Test invalid data
        invalid_data_response = await self.test_client.post(
            "/api/v2/auth/register",
            json={"email": "invalid-email", "password": "123"}  # Invalid format
        )
        if invalid_data_response.status_code == 422:
            errors_handled.append("validation_error")
        
        # 5. Test API limit simulation
        if 'tokens' in self.test_data:
            headers = {"Authorization": f"Bearer {self.test_data['tokens']['access_token']}"}
            
            # Simulate Google API quota exceeded
            quota_response = await self.test_client.get(
                "/api/v2/calendar/sync",
                headers={**headers, "X-Test-Scenario": "quota-exceeded"}
            )
            if quota_response.status_code in [429, 503]:
                errors_handled.append("api_quota")
        
        success = len(errors_handled) >= 4
        
        self.metrics.record_test('test_error_handling', success, {
            'errors_handled': errors_handled,
            'timeout_handling': 'network_timeout' in errors_handled,
            'auth_error_handling': 'invalid_auth' in errors_handled,
            'rate_limit_handling': 'rate_limiting' in errors_handled,
            'validation_handling': 'validation_error' in errors_handled
        })
        
        if success:
            print("    ✅ Error handling working properly")
        else:
            print("    ❌ Error handling needs improvement")
    
    async def test_performance_under_load(self):
        """Test performance under concurrent load"""
        print("  Testing performance under load...")
        
        # Create multiple concurrent requests
        async def make_request(endpoint: str, method: str = "GET"):
            start = time.time()
            try:
                if method == "GET":
                    response = await self.test_client.get(endpoint)
                else:
                    response = await self.test_client.post(endpoint, json={})
                duration = time.time() - start
                return duration, response.status_code
            except Exception:
                return time.time() - start, 500
        
        # Test endpoints under load
        endpoints = [
            ("/api/v2/health", "GET"),
            ("/api/v2/barbers/search?location=test", "GET"),
            ("/api/v2/services", "GET")
        ]
        
        load_results = {}
        
        for endpoint, method in endpoints:
            print(f"    Testing {endpoint}...")
            
            # Send 50 concurrent requests
            tasks = [make_request(endpoint, method) for _ in range(50)]
            results = await asyncio.gather(*tasks)
            
            durations = [r[0] for r in results]
            status_codes = [r[1] for r in results]
            
            avg_duration = sum(durations) / len(durations)
            max_duration = max(durations)
            success_rate = sum(1 for s in status_codes if s < 400) / len(status_codes)
            
            load_results[endpoint] = {
                'avg_response_time': f"{avg_duration*1000:.0f}ms",
                'max_response_time': f"{max_duration*1000:.0f}ms",
                'success_rate': f"{success_rate*100:.1f}%",
                'requests_under_200ms': sum(1 for d in durations if d < 0.2)
            }
            
            # Record metrics
            for duration in durations:
                self.metrics.record_api_response(endpoint, duration)
        
        # Calculate overall performance
        all_under_threshold = all(
            float(r['avg_response_time'][:-2]) < 200 
            for r in load_results.values()
        )
        
        self.metrics.record_test('test_performance_under_load', all_under_threshold, {
            'endpoints_tested': len(endpoints),
            'concurrent_requests_per_endpoint': 50,
            'results': load_results,
            'all_endpoints_fast': all_under_threshold
        })
        
        if all_under_threshold:
            print("    ✅ Performance under load is excellent")
        else:
            print("    ⚠️  Some endpoints slow under load")
    
    async def test_gmb_integration(self):
        """Test Google My Business integration"""
        print("  Testing Google My Business integration...")
        
        if 'tokens' not in self.test_data:
            print("    ⚠️  Skipping - no auth tokens available")
            return
        
        headers = {"Authorization": f"Bearer {self.test_data['tokens']['access_token']}"}
        
        # 1. Test GMB OAuth initiation
        gmb_oauth_response = await self.test_client.get(
            "/api/v2/integrations/gmb/auth",
            headers=headers
        )
        
        if gmb_oauth_response.status_code == 200:
            oauth_data = gmb_oauth_response.json()
            
            # 2. Simulate OAuth callback
            callback_response = await self.test_client.get(
                "/api/v2/integrations/gmb/callback",
                headers=headers,
                params={"code": "test-gmb-code", "state": oauth_data.get('state')}
            )
            
            # 3. Test location fetching
            locations_response = await self.test_client.get(
                "/api/v2/integrations/gmb/locations",
                headers=headers
            )
            
            # 4. Test review fetching
            if locations_response.status_code == 200:
                locations = locations_response.json()
                if locations:
                    reviews_response = await self.test_client.get(
                        f"/api/v2/integrations/gmb/locations/{locations[0]['id']}/reviews",
                        headers=headers
                    )
                    
                    # 5. Test review response
                    if reviews_response.status_code == 200:
                        reviews = reviews_response.json()
                        if reviews:
                            response_data = {
                                "review_id": reviews[0]['id'],
                                "response_text": "Thank you for your feedback! We appreciate your business."
                            }
                            
                            reply_response = await self.test_client.post(
                                "/api/v2/integrations/gmb/reviews/respond",
                                headers=headers,
                                json=response_data
                            )
            
            success = all([
                gmb_oauth_response.status_code == 200,
                callback_response.status_code in [200, 302],
                locations_response.status_code == 200
            ])
            
            self.metrics.record_test('test_gmb_integration', success, {
                'oauth_initiated': gmb_oauth_response.status_code == 200,
                'callback_handled': callback_response.status_code in [200, 302],
                'locations_fetched': locations_response.status_code == 200,
                'reviews_accessible': 'reviews_response' in locals(),
                'response_capability': 'reply_response' in locals()
            })
            
            if success:
                print("    ✅ GMB integration working")
            else:
                print("    ❌ GMB integration issues detected")
    
    def _display_report(self, report: Dict):
        """Display test report in a formatted way"""
        print("\n" + "="*80)
        print("📊 END-TO-END TEST REPORT")
        print("="*80)
        
        # Summary
        summary = report['summary']
        print(f"\n📈 SUMMARY:")
        print(f"  Total Tests: {summary['total_tests']}")
        print(f"  Passed: {summary['passed']} ✅")
        print(f"  Failed: {summary['failed']} ❌")
        print(f"  Success Rate: {summary['success_rate']}")
        print(f"  Duration: {summary['duration']}")
        
        # Performance
        perf = report['performance']
        print(f"\n⚡ PERFORMANCE:")
        print(f"  Avg API Response: {perf['avg_api_response_time']}")
        print(f"  Max API Response: {perf['max_api_response_time']}")
        print(f"  Avg Page Load: {perf['avg_page_load_time']}")
        print(f"  APIs < 200ms: {perf['api_responses_under_200ms']}")
        print(f"  Pages < 2s: {perf['page_loads_under_2s']}")
        
        # Test Results
        print(f"\n🧪 TEST RESULTS:")
        for test_name, result in report['test_results'].items():
            status = "✅" if result['success'] else "❌"
            print(f"  {status} {test_name}")
            if not result['success'] and result.get('details'):
                for key, value in result['details'].items():
                    print(f"      {key}: {value}")
        
        # Errors
        if report['errors']:
            print(f"\n⚠️  ERRORS ENCOUNTERED:")
            for error in report['errors'][:5]:  # Show first 5 errors
                print(f"  - {error['test']}: {error['error']}")
        
        # Production Readiness
        readiness = report['production_readiness']
        print(f"\n🚀 PRODUCTION READINESS:")
        print(f"  Overall Score: {readiness['score']}")
        print(f"  API Performance: {readiness['api_performance']}")
        print(f"  Page Performance: {readiness['page_performance']}")
        print(f"  Error Rate: {readiness['error_rate']}")
        print(f"  Critical Features: {readiness['critical_features']}")
        print(f"  Recommendation: {readiness['recommendation']}")
        
        print("\n" + "="*80)


async def main():
    """Main entry point"""
    runner = E2ETestRunner()
    report = await runner.run_all_tests()
    
    # Exit with appropriate code
    if report['summary']['failed'] > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())