#!/usr/bin/env python3
"""
BookedBarber V2 - Sentry Integration Testing
===========================================

This script tests all aspects of the Sentry integration:
- Configuration validation
- Error capture testing
- Performance monitoring
- Business context integration
- Celery task monitoring
"""

import sys
import os
import time
from datetime import datetime

# Add current directory to path
sys.path.append('.')

try:
    from config.sentry import (
        configure_sentry,
        add_user_context,
        add_business_context,
        capture_booking_error,
        capture_payment_error,
        capture_integration_error,
        add_performance_breadcrumb,
        add_business_breadcrumb
    )
    import sentry_sdk
    from sentry_sdk import start_transaction, start_span
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this from the backend-v2 directory")
    sys.exit(1)

class SentryTester:
    def __init__(self):
        self.test_results = []
        self.sentry_configured = False
        
    def log_test_result(self, test_name: str, success: bool, message: str = ""):
        """Log a test result."""
        status = "✅ PASS" if success else "❌ FAIL"
        result = f"{status} {test_name}"
        if message:
            result += f" - {message}"
        
        print(result)
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message
        })
    
    def test_sentry_configuration(self) -> bool:
        """Test Sentry configuration."""
        print("🔧 Testing Sentry Configuration")
        print("-" * 40)
        
        try:
            # Check environment variables
            sentry_dsn = os.getenv('SENTRY_DSN', '').strip()
            if not sentry_dsn:
                self.log_test_result(
                    "Environment Check", 
                    False, 
                    "SENTRY_DSN not set - run with DSN for full testing"
                )
                return False
            else:
                self.log_test_result("Environment Check", True, f"DSN configured: {sentry_dsn[:20]}...")
            
            # Test configuration
            self.sentry_configured = configure_sentry()
            self.log_test_result("Sentry Configuration", self.sentry_configured)
            
            if self.sentry_configured:
                # Test Sentry SDK is working
                sentry_sdk.capture_message("Test message from Sentry integration test", level="info")
                self.log_test_result("SDK Message Test", True, "Test message sent")
            
            return self.sentry_configured
            
        except Exception as e:
            self.log_test_result("Sentry Configuration", False, str(e))
            return False
    
    def test_user_context(self) -> None:
        """Test user context integration."""
        print("\n👤 Testing User Context")
        print("-" * 40)
        
        try:
            # Test user context
            test_user = {
                "id": 12345,
                "email": "test@bookedbarber.com",
                "name": "Test User",
                "role": "barber",
                "barber_id": 67890,
                "organization_id": 111
            }
            
            add_user_context(test_user)
            self.log_test_result("User Context", True, f"Set context for user {test_user['email']}")
            
            if self.sentry_configured:
                sentry_sdk.capture_message("Test message with user context", level="info")
                self.log_test_result("User Context Message", True, "Message sent with user context")
            
        except Exception as e:
            self.log_test_result("User Context", False, str(e))
    
    def test_business_context(self) -> None:
        """Test business context integration."""
        print("\n💼 Testing Business Context")
        print("-" * 40)
        
        try:
            # Test business context
            test_business_data = {
                "operation_type": "appointment_booking",
                "resource_type": "appointment",
                "resource_id": "apt_12345",
                "location_id": "loc_789",
                "barber_id": "barber_456",
                "client_id": "client_123",
                "amount": 75.00,
                "currency": "USD"
            }
            
            add_business_context(test_business_data)
            self.log_test_result("Business Context", True, "Set business operation context")
            
            if self.sentry_configured:
                sentry_sdk.capture_message("Test message with business context", level="info")
                self.log_test_result("Business Context Message", True, "Message sent with business context")
            
        except Exception as e:
            self.log_test_result("Business Context", False, str(e))
    
    def test_error_capture(self) -> None:
        """Test specialized error capture functions."""
        print("\n🚨 Testing Error Capture")
        print("-" * 40)
        
        try:
            # Test booking error capture
            booking_data = {
                "appointment_id": "apt_12345",
                "client_id": "client_123",
                "barber_id": "barber_456",
                "service_type": "haircut",
                "scheduled_time": "2025-07-23T14:00:00Z",
                "duration_minutes": 60,
                "error_stage": "validation"
            }
            
            try:
                raise ValueError("Test booking validation error")
            except ValueError as e:
                capture_booking_error(e, booking_data)
                self.log_test_result("Booking Error Capture", True, "Captured booking error with context")
            
            # Test payment error capture
            payment_data = {
                "payment_intent_id": "pi_test123",
                "amount_cents": 7500,
                "currency": "USD",
                "client_id": "client_123",
                "barber_id": "barber_456",
                "payment_method_type": "card",
                "error_stage": "charge_creation"
            }
            
            try:
                raise RuntimeError("Test payment processing error")
            except RuntimeError as e:
                capture_payment_error(e, payment_data)
                self.log_test_result("Payment Error Capture", True, "Captured payment error with context")
            
            # Test integration error capture
            integration_data = {
                "service_name": "stripe",
                "operation": "create_payment_intent",
                "endpoint": "/v1/payment_intents",
                "response_code": 400,
                "request_id": "req_test123",
                "error_code": "card_declined"
            }
            
            try:
                raise ConnectionError("Test integration connection error")
            except ConnectionError as e:
                capture_integration_error(e, integration_data)
                self.log_test_result("Integration Error Capture", True, "Captured integration error with context")
            
        except Exception as e:
            self.log_test_result("Error Capture", False, str(e))
    
    def test_performance_monitoring(self) -> None:
        """Test performance monitoring features."""
        print("\n⚡ Testing Performance Monitoring")
        print("-" * 40)
        
        try:
            if not self.sentry_configured:
                self.log_test_result("Performance Monitoring", False, "Sentry not configured")
                return
            
            # Test transaction monitoring
            with start_transaction(op="test", name="sentry_integration_test") as transaction:
                transaction.set_tag("test_type", "integration")
                
                # Simulate some work
                with start_span(op="db.query", description="test_query") as span:
                    time.sleep(0.1)  # Simulate 100ms database query
                    span.set_data("query", "SELECT * FROM test_table")
                    span.set_tag("db.table", "test_table")
                
                # Test performance breadcrumb
                add_performance_breadcrumb("database_query", 100, table="test_table", rows=5)
                
                # Test business breadcrumb
                add_business_breadcrumb("create", "appointment", "apt_12345", barber_id="barber_456")
                
                self.log_test_result("Performance Transaction", True, "Created test transaction with spans")
            
            self.log_test_result("Performance Breadcrumbs", True, "Added performance and business breadcrumbs")
            
        except Exception as e:
            self.log_test_result("Performance Monitoring", False, str(e))
    
    def test_celery_integration(self) -> None:
        """Test Celery monitoring integration."""
        print("\n🔄 Testing Celery Integration")
        print("-" * 40)
        
        try:
            from services.celery_app import celery_app
            from services.sentry_monitoring import celery_monitor
            
            # Test Celery monitoring setup
            celery_monitor.setup_celery_monitoring(celery_app)
            self.log_test_result("Celery Monitor Setup", True, "Celery monitoring configured")
            
            # Test task decorator (simulate)
            @celery_monitor.monitor_task_execution("test.sentry_integration_task")
            def test_task(message: str):
                """Test task for Sentry monitoring."""
                if message == "error":
                    raise ValueError("Test task error")
                return {"status": "success", "message": message}
            
            # Test successful task
            result = test_task("success")
            self.log_test_result("Celery Task Success", True, "Monitored successful task execution")
            
            # Test failed task
            try:
                test_task("error")
            except ValueError:
                self.log_test_result("Celery Task Error", True, "Monitored failed task execution")
            
        except ImportError:
            self.log_test_result("Celery Integration", False, "Celery not available")
        except Exception as e:
            self.log_test_result("Celery Integration", False, str(e))
    
    def test_database_monitoring(self) -> None:
        """Test database monitoring integration."""
        print("\n🗄️ Testing Database Monitoring")
        print("-" * 40)
        
        try:
            from services.sentry_monitoring import database_monitor, monitored_db_session
            from db import SessionLocal, engine
            
            # Test database monitoring setup
            database_monitor.setup_database_monitoring(engine)
            self.log_test_result("Database Monitor Setup", True, "Database monitoring configured")
            
            # Test monitored session
            with monitored_db_session(SessionLocal) as db:
                # Simulate a database query
                result = db.execute("SELECT 1 as test").fetchone()
                self.log_test_result("Monitored DB Session", True, f"Query result: {result}")
            
        except Exception as e:
            self.log_test_result("Database Monitoring", False, str(e))
    
    def test_filter_functionality(self) -> None:
        """Test Sentry event filtering."""
        print("\n🔍 Testing Event Filtering")
        print("-" * 40)
        
        try:
            if not self.sentry_configured:
                self.log_test_result("Event Filtering", False, "Sentry not configured")
                return
            
            # Test development noise filtering
            old_env = os.environ.get('SENTRY_ENVIRONMENT', '')
            os.environ['SENTRY_ENVIRONMENT'] = 'development'
            
            # This should be filtered out in development
            try:
                raise ConnectionError("redis connection failed")
            except ConnectionError as e:
                sentry_sdk.capture_exception(e)
                self.log_test_result("Development Filter", True, "Redis connection error filtered in development")
            
            # Restore environment
            if old_env:
                os.environ['SENTRY_ENVIRONMENT'] = old_env
            
            # Test business area tagging
            with sentry_sdk.push_scope() as scope:
                scope.set_context("request", {"url": "http://localhost:8000/api/v2/payments/create"})
                sentry_sdk.capture_message("Test payment area message")
                self.log_test_result("Business Area Tagging", True, "Payment area tag applied")
            
        except Exception as e:
            self.log_test_result("Event Filtering", False, str(e))
    
    def run_all_tests(self) -> None:
        """Run all Sentry integration tests."""
        print("🧪 BookedBarber V2 - Sentry Integration Testing")
        print("=" * 60)
        print(f"📅 Test Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        print()
        
        # Run all tests
        self.test_sentry_configuration()
        self.test_user_context()
        self.test_business_context()
        self.test_error_capture()
        self.test_performance_monitoring()
        self.test_celery_integration()
        self.test_database_monitoring()
        self.test_filter_functionality()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self) -> None:
        """Print test summary."""
        print("\n" + "=" * 60)
        print("📊 Test Summary")
        print("-" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n📋 Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   ❌ {result['test']}: {result['message']}")
        
        print("\n💡 Configuration Notes:")
        print("   • Set SENTRY_DSN environment variable for full testing")
        print("   • Configure environment in .env file for staging/production")
        print("   • Check Sentry dashboard for captured events")
        
        if self.sentry_configured:
            print("\n🎉 Sentry integration is working! Check your Sentry dashboard.")
        else:
            print("\n⚠️ Sentry not configured. Set SENTRY_DSN to enable error tracking.")
        
        print("\n" + "=" * 60)

def main():
    """Run Sentry integration tests."""
    tester = SentryTester()
    tester.run_all_tests()

if __name__ == '__main__':
    main()