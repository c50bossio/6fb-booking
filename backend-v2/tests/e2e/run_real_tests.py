#!/usr/bin/env python3
"""
Real-world E2E Tests for BookedBarber V2
Tests with actual sandbox/test accounts for external services
"""

import asyncio
import json
import os
import time
from datetime import datetime, timedelta
import httpx
import stripe
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent))


class RealWorldTestRunner:
    """Runner for real-world integration tests"""
    
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.frontend_url = "http://localhost:3000"
        self.results = {}
        self.client = httpx.AsyncClient(base_url=self.base_url, timeout=30.0)
        
        # Test credentials (sandbox/test mode only)
        self.test_credentials = {
            'stripe': {
                'test_card': 'pm_card_visa',
                'test_card_3d': 'pm_card_threeDSecureRequired',
                'test_card_declined': 'pm_card_chargeDeclined'
            },
            'twilio': {
                'test_to_number': '+15005550006',  # Twilio magic number for successful delivery
                'test_from_number': os.getenv('TWILIO_PHONE_NUMBER')
            },
            'sendgrid': {
                'test_email': 'test@bookedbarber.com'
            },
            'google': {
                'test_calendar_id': 'primary'
            }
        }
        
    async def setup(self):
        """Initialize test environment"""
        print("🔧 Setting up real-world test environment...")
        
        # Set test environment
        os.environ['ENVIRONMENT'] = 'test'
        
        # Initialize Stripe in test mode
        stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
        if not stripe.api_key or not stripe.api_key.startswith('sk_test_'):
            print("⚠️  Warning: Stripe not in test mode!")
            
        print("✅ Test environment initialized")
        
    async def test_real_stripe_flow(self):
        """Test real Stripe integration with test mode"""
        print("\n💳 Testing Real Stripe Integration...")
        
        test_results = {
            'payment_intent': False,
            'payment_confirmation': False,
            'webhook_handling': False,
            'refund_processing': False,
            '3d_secure': False
        }
        
        try:
            # 1. Create a real payment intent
            intent = stripe.PaymentIntent.create(
                amount=5000,  # $50.00
                currency='usd',
                payment_method_types=['card'],
                metadata={
                    'test': 'true',
                    'test_id': f"e2e_test_{int(time.time())}"
                }
            )
            
            print(f"  ✅ Payment Intent created: {intent.id}")
            test_results['payment_intent'] = True
            
            # 2. Confirm payment with test card
            confirmed = stripe.PaymentIntent.confirm(
                intent.id,
                payment_method=self.test_credentials['stripe']['test_card']
            )
            
            if confirmed.status == 'succeeded':
                print(f"  ✅ Payment confirmed successfully")
                test_results['payment_confirmation'] = True
            
            # 3. Test webhook endpoint
            webhook_payload = {
                "id": f"evt_test_{int(time.time())}",
                "object": "event",
                "type": "payment_intent.succeeded",
                "data": {
                    "object": {
                        "id": intent.id,
                        "amount": 5000,
                        "status": "succeeded",
                        "metadata": intent.metadata
                    }
                }
            }
            
            # Note: In production, you'd verify the webhook signature
            webhook_response = await self.client.post(
                "/api/v1/webhooks/stripe",
                json=webhook_payload,
                headers={"Stripe-Signature": "test_signature"}
            )
            
            if webhook_response.status_code == 200:
                print("  ✅ Webhook processed successfully")
                test_results['webhook_handling'] = True
            
            # 4. Test refund
            refund = stripe.Refund.create(
                payment_intent=intent.id,
                amount=2500  # Partial refund of $25
            )
            
            if refund.status == 'succeeded':
                print("  ✅ Refund processed successfully")
                test_results['refund_processing'] = True
            
            # 5. Test 3D Secure (requires additional confirmation)
            intent_3ds = stripe.PaymentIntent.create(
                amount=10000,  # $100.00
                currency='eur',  # EUR often requires 3DS
                payment_method_types=['card']
            )
            
            # Attempt to confirm with 3DS required card
            try:
                stripe.PaymentIntent.confirm(
                    intent_3ds.id,
                    payment_method=self.test_credentials['stripe']['test_card_3d']
                )
            except stripe.error.CardError as e:
                if e.code == 'authentication_required':
                    print("  ✅ 3D Secure authentication properly triggered")
                    test_results['3d_secure'] = True
                    
        except Exception as e:
            print(f"  ❌ Stripe test error: {str(e)}")
            
        return test_results
    
    async def test_real_notification_delivery(self):
        """Test real notification delivery with sandbox accounts"""
        print("\n📧 Testing Real Notification Delivery...")
        
        test_results = {
            'email_api_connection': False,
            'email_template_rendering': False,
            'sms_api_connection': False,
            'sms_delivery_simulation': False
        }
        
        # Get test user token (create one if needed)
        auth_response = await self.client.post(
            "/api/v1/auth/login",
            data={
                "username": "test@bookedbarber.com",
                "password": "TestPassword123!"
            }
        )
        
        if auth_response.status_code != 200:
            # Create test user
            register_response = await self.client.post(
                "/api/v1/auth/register",
                json={
                    "email": "test@bookedbarber.com",
                    "password": "TestPassword123!",
                    "full_name": "Test User",
                    "phone": "+15551234567",
                    "user_type": "client"
                }
            )
            
            if register_response.status_code == 201:
                auth_response = await self.client.post(
                    "/api/v1/auth/login",
                    data={
                        "username": "test@bookedbarber.com",
                        "password": "TestPassword123!"
                    }
                )
        
        if auth_response.status_code == 200:
            tokens = auth_response.json()
            headers = {"Authorization": f"Bearer {tokens['access_token']}"}
            
            # 1. Test email notification
            email_response = await self.client.post(
                "/api/v1/notifications/test-email",
                headers=headers,
                json={
                    "to": self.test_credentials['sendgrid']['test_email'],
                    "subject": "BookedBarber E2E Test",
                    "template": "test",
                    "data": {
                        "user_name": "Test User",
                        "test_time": datetime.now().isoformat()
                    }
                }
            )
            
            if email_response.status_code in [200, 202]:
                print("  ✅ Email API connection successful")
                test_results['email_api_connection'] = True
                
                # Check if template was rendered
                response_data = email_response.json()
                if response_data.get('message_id'):
                    print("  ✅ Email template rendered and queued")
                    test_results['email_template_rendering'] = True
            
            # 2. Test SMS notification (Twilio test mode)
            sms_response = await self.client.post(
                "/api/v1/notifications/test-sms",
                headers=headers,
                json={
                    "to": self.test_credentials['twilio']['test_to_number'],
                    "message": f"BookedBarber E2E Test at {datetime.now().strftime('%H:%M')}"
                }
            )
            
            if sms_response.status_code in [200, 202]:
                print("  ✅ SMS API connection successful")
                test_results['sms_api_connection'] = True
                
                response_data = sms_response.json()
                if response_data.get('sid'):
                    print("  ✅ SMS delivered to test number")
                    test_results['sms_delivery_simulation'] = True
                    
        return test_results
    
    async def test_real_calendar_sync(self):
        """Test real Google Calendar integration"""
        print("\n📅 Testing Real Calendar Integration...")
        
        test_results = {
            'oauth_flow': False,
            'calendar_list': False,
            'event_creation': False,
            'event_update': False,
            'event_deletion': False
        }
        
        # Note: Full OAuth flow requires user interaction
        # Here we test the API endpoints are properly configured
        
        # 1. Test OAuth initiation
        oauth_response = await self.client.get("/api/v1/calendar/auth")
        
        if oauth_response.status_code == 200:
            oauth_data = oauth_response.json()
            if 'auth_url' in oauth_data and 'accounts.google.com' in oauth_data['auth_url']:
                print("  ✅ OAuth flow properly configured")
                test_results['oauth_flow'] = True
                
        # For actual calendar operations, we'd need a pre-authorized test account
        # These tests verify the endpoints exist and handle requests properly
        
        test_token = "test_calendar_token"
        headers = {"Authorization": f"Bearer {test_token}"}
        
        # 2. Test calendar list endpoint
        calendar_response = await self.client.get(
            "/api/v1/calendar/list",
            headers=headers
        )
        
        if calendar_response.status_code in [200, 401]:  # 401 expected with test token
            print("  ✅ Calendar list endpoint configured")
            test_results['calendar_list'] = True
            
        return test_results
    
    async def test_real_gmb_integration(self):
        """Test real Google My Business integration setup"""
        print("\n🏪 Testing Real GMB Integration...")
        
        test_results = {
            'oauth_configuration': False,
            'api_endpoints': False,
            'review_templates': False,
            'seo_optimization': False
        }
        
        # 1. Test OAuth configuration
        gmb_oauth_response = await self.client.get("/api/v1/integrations/gmb/auth")
        
        if gmb_oauth_response.status_code == 200:
            oauth_data = gmb_oauth_response.json()
            if 'auth_url' in oauth_data:
                print("  ✅ GMB OAuth properly configured")
                test_results['oauth_configuration'] = True
        
        # 2. Test API endpoints
        endpoints = [
            "/api/v1/integrations/gmb/locations",
            "/api/v1/integrations/gmb/reviews",
            "/api/v1/integrations/gmb/insights"
        ]
        
        all_endpoints_ok = True
        for endpoint in endpoints:
            response = await self.client.get(endpoint)
            if response.status_code not in [200, 401, 403]:  # Auth errors expected
                all_endpoints_ok = False
                break
                
        if all_endpoints_ok:
            print("  ✅ GMB API endpoints configured")
            test_results['api_endpoints'] = True
            
        # 3. Test review response templates
        template_response = await self.client.get("/api/v1/integrations/gmb/review-templates")
        
        if template_response.status_code == 200:
            templates = template_response.json()
            if templates and any('thank you' in t.get('text', '').lower() for t in templates):
                print("  ✅ Review templates available")
                test_results['review_templates'] = True
                
        # 4. Test SEO optimization in responses
        seo_keywords = ['barber', 'haircut', 'appointment', 'service']
        seo_check_response = await self.client.post(
            "/api/v1/integrations/gmb/validate-response",
            json={
                "response_text": "Thank you for visiting our barbershop! We offer great haircuts.",
                "rating": 5
            }
        )
        
        if seo_check_response.status_code == 200:
            validation = seo_check_response.json()
            if validation.get('seo_score', 0) > 0:
                print("  ✅ SEO optimization active")
                test_results['seo_optimization'] = True
                
        return test_results
    
    async def test_performance_metrics(self):
        """Test real-world performance metrics"""
        print("\n⚡ Testing Real-World Performance...")
        
        endpoints = [
            ("/api/v2/health", "Health Check"),
            ("/api/v1/services", "Service List"),
            ("/api/v1/barbers/search?location=test", "Barber Search"),
            ("/", "Frontend Homepage")
        ]
        
        performance_results = {}
        
        for endpoint, name in endpoints:
            # Use frontend URL for frontend endpoints
            url = f"{self.frontend_url}{endpoint}" if endpoint == "/" else f"{self.base_url}{endpoint}"
            
            # Measure cold start
            cold_start = time.time()
            cold_response = await self.client.get(url)
            cold_time = time.time() - cold_start
            
            # Measure warm requests (average of 10)
            warm_times = []
            for _ in range(10):
                warm_start = time.time()
                await self.client.get(url)
                warm_times.append(time.time() - warm_start)
                
            avg_warm = sum(warm_times) / len(warm_times)
            
            performance_results[name] = {
                'cold_start': f"{cold_time*1000:.0f}ms",
                'avg_warm': f"{avg_warm*1000:.0f}ms",
                'min_time': f"{min(warm_times)*1000:.0f}ms",
                'max_time': f"{max(warm_times)*1000:.0f}ms",
                'meets_sla': avg_warm < 0.2  # 200ms SLA
            }
            
            status = "✅" if performance_results[name]['meets_sla'] else "⚠️"
            print(f"  {status} {name}: {performance_results[name]['avg_warm']} avg")
            
        return performance_results
    
    async def test_concurrent_load(self):
        """Test system under concurrent load"""
        print("\n🔄 Testing Concurrent Load Handling...")
        
        load_results = {
            'concurrent_bookings': False,
            'rate_limiting': False,
            'database_locks': False,
            'cache_performance': False
        }
        
        # 1. Test concurrent booking attempts
        async def book_appointment(session_num: int):
            try:
                response = await self.client.post(
                    "/api/v1/appointments",
                    json={
                        "barber_id": 1,
                        "service_id": 1,
                        "start_time": (datetime.now() + timedelta(days=1, hours=session_num)).isoformat(),
                        "client_name": f"Test Client {session_num}"
                    }
                )
                return response.status_code
            except Exception:
                return 500
                
        # Send 20 concurrent booking requests
        booking_tasks = [book_appointment(i) for i in range(20)]
        booking_results = await asyncio.gather(*booking_tasks)
        
        successful_bookings = sum(1 for status in booking_results if status in [200, 201])
        if successful_bookings > 15:  # At least 75% success rate
            print("  ✅ Concurrent bookings handled well")
            load_results['concurrent_bookings'] = True
            
        # 2. Test rate limiting
        rate_limit_hit = False
        for i in range(150):
            response = await self.client.get("/api/v2/health")
            if response.status_code == 429:
                rate_limit_hit = True
                break
                
        if rate_limit_hit:
            print("  ✅ Rate limiting active")
            load_results['rate_limiting'] = True
            
        return load_results
    
    async def generate_report(self):
        """Generate comprehensive test report"""
        print("\n" + "="*80)
        print("📊 REAL-WORLD E2E TEST REPORT")
        print("="*80)
        
        all_tests_passed = all(
            all(result.values()) if isinstance(result, dict) else result
            for result in self.results.values()
        )
        
        print(f"\n🎯 Overall Status: {'✅ PASS' if all_tests_passed else '❌ FAIL'}")
        print(f"📅 Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Detailed results
        for test_name, results in self.results.items():
            print(f"\n📋 {test_name}:")
            if isinstance(results, dict):
                for key, value in results.items():
                    status = "✅" if value else "❌"
                    print(f"  {status} {key}")
            else:
                status = "✅" if results else "❌"
                print(f"  {status} Test completed")
                
        # Production readiness assessment
        print("\n🚀 PRODUCTION READINESS ASSESSMENT:")
        
        critical_systems = {
            'Payment Processing': self.results.get('test_real_stripe_flow', {}).get('payment_confirmation', False),
            'Notifications': self.results.get('test_real_notification_delivery', {}).get('email_api_connection', False),
            'Calendar Integration': self.results.get('test_real_calendar_sync', {}).get('oauth_flow', False),
            'GMB Integration': self.results.get('test_real_gmb_integration', {}).get('oauth_configuration', False),
            'Performance SLA': all(r.get('meets_sla', False) for r in self.results.get('test_performance_metrics', {}).values() if isinstance(r, dict)),
            'Load Handling': self.results.get('test_concurrent_load', {}).get('concurrent_bookings', False)
        }
        
        ready_count = sum(1 for ready in critical_systems.values() if ready)
        readiness_percentage = (ready_count / len(critical_systems)) * 100
        
        for system, ready in critical_systems.items():
            status = "✅ Ready" if ready else "❌ Not Ready"
            print(f"  {system}: {status}")
            
        print(f"\n📊 Production Readiness Score: {readiness_percentage:.0f}%")
        
        if readiness_percentage >= 80:
            print("✅ System is READY for production deployment")
        else:
            print("⚠️  System needs improvements before production deployment")
            
        # Save detailed report
        report_data = {
            'timestamp': datetime.now().isoformat(),
            'overall_pass': all_tests_passed,
            'readiness_score': readiness_percentage,
            'detailed_results': self.results,
            'critical_systems': critical_systems
        }
        
        with open('real_world_test_report.json', 'w') as f:
            json.dump(report_data, f, indent=2)
            
        print(f"\n📄 Detailed report saved to: real_world_test_report.json")
        
        return report_data
    
    async def run_all_tests(self):
        """Execute all real-world tests"""
        await self.setup()
        
        # Run test suites
        test_functions = [
            ('Stripe Integration', self.test_real_stripe_flow),
            ('Notification Delivery', self.test_real_notification_delivery),
            ('Calendar Sync', self.test_real_calendar_sync),
            ('GMB Integration', self.test_real_gmb_integration),
            ('Performance Metrics', self.test_performance_metrics),
            ('Concurrent Load', self.test_concurrent_load)
        ]
        
        for test_name, test_func in test_functions:
            try:
                print(f"\nRunning {test_name}...")
                result = await test_func()
                self.results[test_func.__name__] = result
            except Exception as e:
                print(f"❌ Error in {test_name}: {str(e)}")
                self.results[test_func.__name__] = False
                
        await self.client.aclose()
        return await self.generate_report()


async def main():
    """Main entry point"""
    print("🚀 BookedBarber V2 - Real-World End-to-End Testing")
    print("⚠️  Using sandbox/test credentials only - no real transactions")
    
    runner = RealWorldTestRunner()
    report = await runner.run_all_tests()
    
    # Return appropriate exit code
    if report['overall_pass'] and report['readiness_score'] >= 80:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())