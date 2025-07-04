#!/usr/bin/env python3
"""
Comprehensive E2E Test Suite for BookedBarber V2
Tests all major features with real API interactions
"""

import asyncio
import json
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

import httpx
import stripe


class ComprehensiveE2ETests:
    """Comprehensive end-to-end test suite"""
    
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.frontend_url = "http://localhost:3000"
        self.test_results = {}
        self.performance_metrics = []
        self.error_log = []
        
        # Initialize clients
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=30.0,
            follow_redirects=True
        )
        
        # Test data storage
        self.test_data = {
            'user': None,
            'token': None,
            'business': None,
            'appointment': None
        }
        
    async def setup(self):
        """Initialize test environment"""
        print("🔧 Setting up comprehensive test environment...")
        
        # Initialize Stripe
        stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
        if stripe.api_key and stripe.api_key.startswith('sk_test_'):
            print("✅ Stripe configured in test mode")
        else:
            print("⚠️  Stripe configuration issue")
            
        # Check server health
        try:
            health_response = await self.client.get("/")
            if health_response.status_code == 200:
                print("✅ Backend server is healthy")
            else:
                print(f"⚠️  Backend health check returned: {health_response.status_code}")
        except Exception as e:
            print(f"❌ Backend server not responding: {e}")
            
    async def test_user_registration_and_auth(self):
        """Test user registration and authentication flow"""
        print("\n👤 Testing User Registration & Authentication...")
        
        results = {
            'registration': False,
            'login': False,
            'token_refresh': False,
            'profile_access': False,
            'logout': False
        }
        
        try:
            # 1. Register new user
            test_email = f"test_{int(time.time())}@bookedbarber.com"
            register_data = {
                "email": test_email,
                "password": "SecureTest123!",
                "name": "E2E Test User",
                "role": "client"
            }
            
            start_time = time.time()
            register_response = await self.client.post(
                "/api/v1/auth/register",
                json=register_data
            )
            response_time = time.time() - start_time
            self.performance_metrics.append(('auth/register', response_time))
            
            if register_response.status_code in [200, 201]:
                response_data = register_response.json()
                if 'user' in response_data:
                    self.test_data['user'] = response_data['user']
                else:
                    self.test_data['user'] = response_data
                results['registration'] = True
                print("  ✅ User registration successful")
                
                # Note: In a real test environment, we would verify the email
                # For now, we'll proceed with login attempts
            else:
                print(f"  ❌ Registration failed: {register_response.status_code}")
                print(f"     Response: {register_response.text}")
                
            # 2. Login
            login_response = await self.client.post(
                "/api/v1/auth/login",
                data={
                    "username": test_email,
                    "password": "SecureTest123!"
                }
            )
            
            if login_response.status_code == 200:
                tokens = login_response.json()
                self.test_data['token'] = tokens['access_token']
                results['login'] = True
                print("  ✅ User login successful")
                
                # 3. Test token refresh
                refresh_response = await self.client.post(
                    "/api/v1/auth/refresh",
                    json={"refresh_token": tokens.get('refresh_token')}
                )
                
                if refresh_response.status_code == 200:
                    results['token_refresh'] = True
                    print("  ✅ Token refresh working")
                    
                # 4. Access protected endpoint
                headers = {"Authorization": f"Bearer {self.test_data['token']}"}
                profile_response = await self.client.get(
                    "/api/v1/users/me",
                    headers=headers
                )
                
                if profile_response.status_code == 200:
                    results['profile_access'] = True
                    print("  ✅ Profile access successful")
                    
                # 5. Logout
                logout_response = await self.client.post(
                    "/api/v1/auth/logout",
                    headers=headers
                )
                
                if logout_response.status_code in [200, 204]:
                    results['logout'] = True
                    print("  ✅ Logout successful")
                    
        except Exception as e:
            self.error_log.append(('auth_test', str(e)))
            print(f"  ❌ Error during auth testing: {e}")
            
        self.test_results['authentication'] = results
        return results
    
    async def test_business_operations(self):
        """Test business CRUD operations"""
        print("\n🏪 Testing Business Operations...")
        
        results = {
            'create_business': False,
            'update_business': False,
            'add_services': False,
            'add_barbers': False,
            'business_analytics': False
        }
        
        # Ensure we have authentication
        if not self.test_data.get('token'):
            print("  ⚠️  Skipping - no authentication token")
            return results
            
        headers = {"Authorization": f"Bearer {self.test_data['token']}"}
        
        try:
            # 1. Create business
            business_data = {
                "name": f"Test Barbershop {int(time.time())}",
                "address": "123 Test Street, New York, NY 10001",
                "phone": "+15551234568",
                "description": "E2E Test Barbershop",
                "timezone": "America/New_York"
            }
            
            create_response = await self.client.post(
                "/api/v1/businesses",
                headers=headers,
                json=business_data
            )
            
            if create_response.status_code in [200, 201]:
                self.test_data['business'] = create_response.json()
                results['create_business'] = True
                print("  ✅ Business created successfully")
                
                business_id = self.test_data['business']['id']
                
                # 2. Update business
                update_data = {
                    "description": "Updated E2E Test Barbershop",
                    "hours": {
                        "monday": {"open": "09:00", "close": "18:00"},
                        "tuesday": {"open": "09:00", "close": "18:00"}
                    }
                }
                
                update_response = await self.client.put(
                    f"/api/v1/businesses/{business_id}",
                    headers=headers,
                    json=update_data
                )
                
                if update_response.status_code == 200:
                    results['update_business'] = True
                    print("  ✅ Business updated successfully")
                    
                # 3. Add services
                services = [
                    {"name": "Haircut", "price": 35.00, "duration": 30},
                    {"name": "Beard Trim", "price": 20.00, "duration": 15}
                ]
                
                services_added = 0
                for service in services:
                    service_response = await self.client.post(
                        f"/api/v1/businesses/{business_id}/services",
                        headers=headers,
                        json=service
                    )
                    if service_response.status_code == 201:
                        services_added += 1
                        
                if services_added == len(services):
                    results['add_services'] = True
                    print("  ✅ Services added successfully")
                    
                # 4. Add barber
                barber_data = {
                    "name": "Test Barber",
                    "email": f"barber_{int(time.time())}@test.com",
                    "phone": "+15551234569"
                }
                
                barber_response = await self.client.post(
                    f"/api/v1/businesses/{business_id}/barbers",
                    headers=headers,
                    json=barber_data
                )
                
                if barber_response.status_code == 201:
                    results['add_barbers'] = True
                    print("  ✅ Barber added successfully")
                    
                # 5. Check analytics
                analytics_response = await self.client.get(
                    f"/api/v1/businesses/{business_id}/analytics",
                    headers=headers
                )
                
                if analytics_response.status_code == 200:
                    results['business_analytics'] = True
                    print("  ✅ Analytics endpoint working")
                    
        except Exception as e:
            self.error_log.append(('business_test', str(e)))
            print(f"  ❌ Error during business testing: {e}")
            
        self.test_results['business_operations'] = results
        return results
    
    async def test_appointment_booking(self):
        """Test appointment booking flow"""
        print("\n📅 Testing Appointment Booking...")
        
        results = {
            'search_availability': False,
            'create_appointment': False,
            'update_appointment': False,
            'cancel_appointment': False,
            'appointment_reminders': False
        }
        
        if not self.test_data.get('token'):
            print("  ⚠️  Skipping - no authentication token")
            return results
            
        headers = {"Authorization": f"Bearer {self.test_data['token']}"}
        
        try:
            # 1. Search for availability
            tomorrow = (datetime.now() + timedelta(days=1)).date()
            availability_response = await self.client.get(
                "/api/v1/appointments/availability",
                headers=headers,
                params={
                    "date": tomorrow.isoformat(),
                    "service_id": 1
                }
            )
            
            if availability_response.status_code == 200:
                results['search_availability'] = True
                print("  ✅ Availability search working")
                
                # 2. Create appointment
                appointment_data = {
                    "service_id": 1,
                    "start_time": f"{tomorrow}T14:00:00",
                    "client_name": "E2E Test Client",
                    "client_email": "test@bookedbarber.com",
                    "client_phone": "+15551234567",
                    "notes": "E2E Test Appointment"
                }
                
                if self.test_data.get('business'):
                    appointment_data['business_id'] = self.test_data['business']['id']
                    
                create_response = await self.client.post(
                    "/api/v1/appointments",
                    headers=headers,
                    json=appointment_data
                )
                
                if create_response.status_code in [200, 201]:
                    self.test_data['appointment'] = create_response.json()
                    results['create_appointment'] = True
                    print("  ✅ Appointment created successfully")
                    
                    appointment_id = self.test_data['appointment']['id']
                    
                    # 3. Update appointment
                    update_response = await self.client.patch(
                        f"/api/v1/appointments/{appointment_id}",
                        headers=headers,
                        json={"notes": "Updated E2E Test Appointment"}
                    )
                    
                    if update_response.status_code == 200:
                        results['update_appointment'] = True
                        print("  ✅ Appointment updated successfully")
                        
                    # 4. Check reminders
                    reminders_response = await self.client.get(
                        f"/api/v1/appointments/{appointment_id}/reminders",
                        headers=headers
                    )
                    
                    if reminders_response.status_code == 200:
                        results['appointment_reminders'] = True
                        print("  ✅ Appointment reminders configured")
                        
                    # 5. Cancel appointment
                    cancel_response = await self.client.delete(
                        f"/api/v1/appointments/{appointment_id}",
                        headers=headers
                    )
                    
                    if cancel_response.status_code in [200, 204]:
                        results['cancel_appointment'] = True
                        print("  ✅ Appointment cancelled successfully")
                        
        except Exception as e:
            self.error_log.append(('appointment_test', str(e)))
            print(f"  ❌ Error during appointment testing: {e}")
            
        self.test_results['appointment_booking'] = results
        return results
    
    async def test_payment_processing(self):
        """Test payment processing with Stripe"""
        print("\n💳 Testing Payment Processing...")
        
        results = {
            'create_payment_intent': False,
            'process_payment': False,
            'webhook_handling': False,
            'refund_processing': False,
            'payment_history': False
        }
        
        if not self.test_data.get('token'):
            print("  ⚠️  Skipping - no authentication token")
            return results
            
        headers = {"Authorization": f"Bearer {self.test_data['token']}"}
        
        try:
            # 1. Create payment intent
            payment_data = {
                "amount": 3500,  # $35.00
                "currency": "usd",
                "description": "E2E Test Payment"
            }
            
            if self.test_data.get('appointment'):
                payment_data['appointment_id'] = self.test_data['appointment']['id']
                
            intent_response = await self.client.post(
                "/api/v1/payments/create-intent",
                headers=headers,
                json=payment_data
            )
            
            if intent_response.status_code == 200:
                intent = intent_response.json()
                results['create_payment_intent'] = True
                print("  ✅ Payment intent created")
                
                # 2. Simulate payment confirmation
                confirm_data = {
                    "payment_intent_id": intent.get('id', 'test_intent'),
                    "payment_method": "pm_card_visa"
                }
                
                confirm_response = await self.client.post(
                    "/api/v1/payments/confirm",
                    headers=headers,
                    json=confirm_data
                )
                
                if confirm_response.status_code in [200, 201]:
                    results['process_payment'] = True
                    print("  ✅ Payment processed successfully")
                    
                # 3. Test webhook endpoint
                webhook_data = {
                    "type": "payment_intent.succeeded",
                    "data": {
                        "object": {
                            "id": intent.get('id', 'test_intent'),
                            "amount": 3500,
                            "status": "succeeded"
                        }
                    }
                }
                
                webhook_response = await self.client.post(
                    "/api/v1/webhooks/stripe",
                    json=webhook_data,
                    headers={"Stripe-Signature": "test_signature"}
                )
                
                if webhook_response.status_code in [200, 202]:
                    results['webhook_handling'] = True
                    print("  ✅ Webhook handling working")
                    
                # 4. Payment history
                history_response = await self.client.get(
                    "/api/v1/payments/history",
                    headers=headers
                )
                
                if history_response.status_code == 200:
                    results['payment_history'] = True
                    print("  ✅ Payment history accessible")
                    
        except Exception as e:
            self.error_log.append(('payment_test', str(e)))
            print(f"  ❌ Error during payment testing: {e}")
            
        self.test_results['payment_processing'] = results
        return results
    
    async def test_integrations(self):
        """Test external integrations"""
        print("\n🔌 Testing External Integrations...")
        
        results = {
            'google_oauth': False,
            'calendar_endpoints': False,
            'gmb_endpoints': False,
            'notification_endpoints': False,
            'analytics_tracking': False
        }
        
        try:
            # 1. Google OAuth endpoints
            oauth_response = await self.client.get("/api/v1/auth/google/login")
            if oauth_response.status_code == 200:
                results['google_oauth'] = True
                print("  ✅ Google OAuth endpoints configured")
                
            # 2. Calendar endpoints
            calendar_response = await self.client.get("/api/v1/calendar/auth")
            if calendar_response.status_code in [200, 401]:
                results['calendar_endpoints'] = True
                print("  ✅ Calendar endpoints available")
                
            # 3. GMB endpoints
            gmb_response = await self.client.get("/api/v1/integrations/gmb/auth")
            if gmb_response.status_code in [200, 401]:
                results['gmb_endpoints'] = True
                print("  ✅ GMB endpoints available")
                
            # 4. Notification endpoints
            notification_response = await self.client.get("/api/v1/notifications/templates")
            if notification_response.status_code in [200, 401]:
                results['notification_endpoints'] = True
                print("  ✅ Notification endpoints available")
                
            # 5. Analytics tracking
            analytics_response = await self.client.post(
                "/api/v1/analytics/track",
                json={
                    "event": "page_view",
                    "properties": {"page": "test"}
                }
            )
            if analytics_response.status_code in [200, 202, 401]:
                results['analytics_tracking'] = True
                print("  ✅ Analytics tracking available")
                
        except Exception as e:
            self.error_log.append(('integration_test', str(e)))
            print(f"  ❌ Error during integration testing: {e}")
            
        self.test_results['integrations'] = results
        return results
    
    async def test_performance(self):
        """Test API performance"""
        print("\n⚡ Testing Performance...")
        
        endpoints = [
            ("/", "Root Endpoint"),
            ("/api/v1/services", "Services List"),
            ("/api/v1/businesses", "Business List"),
            ("/docs", "API Documentation")
        ]
        
        performance_results = {}
        
        for endpoint, name in endpoints:
            timings = []
            
            # Make 10 requests
            for _ in range(10):
                start = time.time()
                try:
                    response = await self.client.get(endpoint)
                    elapsed = time.time() - start
                    timings.append(elapsed)
                except:
                    timings.append(float('inf'))
                    
            avg_time = sum(timings) / len(timings)
            max_time = max(timings)
            min_time = min(timings)
            
            # Check if meets SLA (200ms)
            meets_sla = avg_time < 0.2
            
            performance_results[name] = {
                'avg_ms': f"{avg_time*1000:.0f}",
                'min_ms': f"{min_time*1000:.0f}",
                'max_ms': f"{max_time*1000:.0f}",
                'meets_sla': meets_sla
            }
            
            status = "✅" if meets_sla else "⚠️"
            print(f"  {status} {name}: {avg_time*1000:.0f}ms avg")
            
        self.test_results['performance'] = performance_results
        return performance_results
    
    async def test_error_handling(self):
        """Test error handling and edge cases"""
        print("\n🛡️ Testing Error Handling...")
        
        results = {
            'invalid_auth': False,
            'rate_limiting': False,
            'validation_errors': False,
            'not_found_errors': False,
            'server_errors': False
        }
        
        try:
            # 1. Invalid authentication
            invalid_response = await self.client.get(
                "/api/v1/users/me",
                headers={"Authorization": "Bearer invalid_token"}
            )
            if invalid_response.status_code == 401:
                results['invalid_auth'] = True
                print("  ✅ Invalid auth handled correctly")
                
            # 2. Validation errors
            validation_response = await self.client.post(
                "/api/v1/auth/register",
                json={"email": "invalid", "password": "123"}
            )
            if validation_response.status_code == 422:
                results['validation_errors'] = True
                print("  ✅ Validation errors handled correctly")
                
            # 3. Not found errors
            not_found_response = await self.client.get("/api/v1/users/99999")
            if not_found_response.status_code == 404:
                results['not_found_errors'] = True
                print("  ✅ Not found errors handled correctly")
                
            # 4. Rate limiting (make many requests)
            for i in range(200):
                await self.client.get("/api/v1/auth/login")
                if i > 100:  # Check after threshold
                    rate_response = await self.client.get("/api/v1/auth/login")
                    if rate_response.status_code == 429:
                        results['rate_limiting'] = True
                        print("  ✅ Rate limiting working")
                        break
                        
        except Exception as e:
            self.error_log.append(('error_handling_test', str(e)))
            print(f"  ❌ Error during error handling test: {e}")
            
        self.test_results['error_handling'] = results
        return results
    
    async def generate_report(self):
        """Generate comprehensive test report"""
        total_tests = 0
        passed_tests = 0
        
        for category, results in self.test_results.items():
            if isinstance(results, dict):
                for test, passed in results.items():
                    total_tests += 1
                    if passed:
                        passed_tests += 1
                        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        # Calculate average performance
        if self.performance_metrics:
            avg_response_time = sum(t[1] for t in self.performance_metrics) / len(self.performance_metrics)
        else:
            avg_response_time = 0
            
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_tests': total_tests,
                'passed': passed_tests,
                'failed': total_tests - passed_tests,
                'success_rate': f"{success_rate:.1f}%",
                'avg_response_time': f"{avg_response_time*1000:.0f}ms"
            },
            'detailed_results': self.test_results,
            'performance_metrics': self.performance_metrics,
            'errors': self.error_log,
            'production_readiness': self._assess_readiness()
        }
        
        return report
    
    def _assess_readiness(self):
        """Assess production readiness"""
        critical_features = {
            'Authentication': self.test_results.get('authentication', {}).get('login', False),
            'Business Management': self.test_results.get('business_operations', {}).get('create_business', False),
            'Appointment Booking': self.test_results.get('appointment_booking', {}).get('create_appointment', False),
            'Payment Processing': self.test_results.get('payment_processing', {}).get('create_payment_intent', False),
            'Error Handling': self.test_results.get('error_handling', {}).get('validation_errors', False)
        }
        
        ready_count = sum(1 for v in critical_features.values() if v)
        readiness_score = (ready_count / len(critical_features)) * 100
        
        return {
            'score': f"{readiness_score:.0f}%",
            'critical_features': critical_features,
            'recommendation': 'Ready for staging' if readiness_score >= 80 else 'Needs improvements'
        }
    
    async def run_all_tests(self):
        """Run all tests"""
        await self.setup()
        
        # Run test suites
        await self.test_user_registration_and_auth()
        await self.test_business_operations()
        await self.test_appointment_booking()
        await self.test_payment_processing()
        await self.test_integrations()
        await self.test_performance()
        await self.test_error_handling()
        
        # Generate report
        report = await self.generate_report()
        
        # Display report
        print("\n" + "="*80)
        print("📊 COMPREHENSIVE E2E TEST REPORT")
        print("="*80)
        
        summary = report['summary']
        print(f"\n📈 SUMMARY:")
        print(f"  Total Tests: {summary['total_tests']}")
        print(f"  Passed: {summary['passed']} ✅")
        print(f"  Failed: {summary['failed']} ❌")
        print(f"  Success Rate: {summary['success_rate']}")
        print(f"  Avg Response Time: {summary['avg_response_time']}")
        
        readiness = report['production_readiness']
        print(f"\n🚀 PRODUCTION READINESS:")
        print(f"  Score: {readiness['score']}")
        print(f"  Recommendation: {readiness['recommendation']}")
        
        for feature, ready in readiness['critical_features'].items():
            status = "✅" if ready else "❌"
            print(f"  {status} {feature}")
            
        # Save report
        with open('comprehensive_e2e_report.json', 'w') as f:
            json.dump(report, f, indent=2)
            
        print(f"\n📄 Detailed report saved to: comprehensive_e2e_report.json")
        
        await self.client.aclose()
        
        return report


async def main():
    """Main entry point"""
    print("🚀 BookedBarber V2 - Comprehensive E2E Testing")
    print("📅 " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    tester = ComprehensiveE2ETests()
    report = await tester.run_all_tests()
    
    # Exit with appropriate code
    success_rate = float(report['summary']['success_rate'].rstrip('%'))
    if success_rate >= 80:
        print("\n✅ Tests PASSED - System ready for deployment")
        sys.exit(0)
    else:
        print("\n❌ Tests FAILED - System needs improvements")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())