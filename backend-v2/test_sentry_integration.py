#!/usr/bin/env python3
"""
Sentry Integration Testing Script
================================

This script tests various Sentry error reporting scenarios to ensure
comprehensive error tracking is working correctly.

Usage:
    python test_sentry_integration.py [--test-type TYPE] [--verbose]

Test Types:
    all         - Run all tests (default)
    basic       - Basic error capture tests
    database    - Database error tests
    payment     - Payment error simulation
    booking     - Booking error simulation
    integration - Integration error simulation
    performance - Performance monitoring tests
    celery      - Celery task monitoring tests
"""

import os
import sys
import time
import logging
import asyncio
import argparse
from typing import Dict, Any, List
from datetime import datetime, timedelta

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import after path setup
import sentry_sdk
from sqlalchemy import text
from sqlalchemy.orm import Session

# Import application modules
from config.sentry import (
    configure_sentry, 
    add_user_context, 
    add_business_context,
    capture_booking_error,
    capture_payment_error, 
    capture_integration_error,
    sentry_health_check
)
from database import engine, SessionLocal
from services.sentry_monitoring import (
    database_monitor,
    celery_monitor,
    redis_monitor,
    business_monitor,
    monitored_db_session
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SentryTestSuite:
    """Comprehensive Sentry integration test suite."""
    
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.test_results: List[Dict[str, Any]] = []
        
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all Sentry integration tests."""
        
        logger.info("Starting comprehensive Sentry integration tests...")
        
        # Check if Sentry is configured
        health = sentry_health_check()
        if not health.get('enabled'):
            logger.error("Sentry is not configured. Please set SENTRY_DSN in environment.")
            return {"success": False, "error": "Sentry not configured"}
        
        logger.info(f"Sentry health check: {health}")
        
        # Run test suites
        test_suites = [
            ("Basic Error Capture", self.test_basic_error_capture),
            ("Database Errors", self.test_database_errors),
            ("Payment Errors", self.test_payment_errors), 
            ("Booking Errors", self.test_booking_errors),
            ("Integration Errors", self.test_integration_errors),
            ("Performance Monitoring", self.test_performance_monitoring),
            ("User Context", self.test_user_context),
            ("Business Context", self.test_business_context),
            ("Error Filtering", self.test_error_filtering),
            ("Custom Fingerprinting", self.test_custom_fingerprinting)
        ]
        
        for suite_name, test_func in test_suites:
            try:
                logger.info(f"Running {suite_name} tests...")
                result = test_func()
                self.test_results.append({
                    "suite": suite_name,
                    "success": result.get("success", False),
                    "details": result
                })
                
                if self.verbose:
                    logger.info(f"{suite_name} result: {result}")
                    
            except Exception as e:
                logger.error(f"Test suite '{suite_name}' failed: {e}")
                self.test_results.append({
                    "suite": suite_name,
                    "success": False,
                    "error": str(e)
                })
        
        # Generate summary
        total_tests = len(self.test_results)
        successful_tests = sum(1 for result in self.test_results if result["success"])
        
        summary = {
            "success": successful_tests == total_tests,
            "total_tests": total_tests,
            "successful_tests": successful_tests,
            "failed_tests": total_tests - successful_tests,
            "test_results": self.test_results,
            "sentry_health": health
        }
        
        logger.info(f"Test summary: {successful_tests}/{total_tests} tests passed")
        return summary
    
    def test_basic_error_capture(self) -> Dict[str, Any]:
        """Test basic error capture functionality."""
        
        try:
            # Test basic exception capture
            try:
                raise ValueError("Test error for Sentry capture")
            except ValueError as e:
                event_id = sentry_sdk.capture_exception(e)
                
            # Test message capture
            message_id = sentry_sdk.capture_message("Test message from Sentry integration test", level="info")
            
            # Test with custom level
            warning_id = sentry_sdk.capture_message("Test warning message", level="warning")
            
            return {
                "success": True,
                "exception_event_id": event_id,
                "message_event_id": message_id,
                "warning_event_id": warning_id
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def test_database_errors(self) -> Dict[str, Any]:
        """Test database error monitoring."""
        
        try:
            results = []
            
            # Test slow query simulation
            with SessionLocal() as db:
                try:
                    # Simulate a slow query
                    result = db.execute(text("SELECT pg_sleep(0.1)") if "postgresql" in str(engine.url) 
                                      else text("SELECT 1"))
                    results.append("slow_query_simulated")
                except Exception as e:
                    results.append(f"slow_query_error: {e}")
            
            # Test invalid query
            try:
                with SessionLocal() as db:
                    db.execute(text("SELECT * FROM nonexistent_table_for_testing"))
            except Exception as e:
                results.append("invalid_query_captured")
                
            # Test monitored session
            try:
                with monitored_db_session(SessionLocal) as db:
                    db.execute(text("SELECT 1"))
                results.append("monitored_session_success")
            except Exception as e:
                results.append(f"monitored_session_error: {e}")
            
            return {
                "success": True,
                "tests_completed": results
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def test_payment_errors(self) -> Dict[str, Any]:
        """Test payment error capture with enhanced context."""
        
        try:
            # Simulate different payment errors
            payment_errors = [
                (ValueError("Invalid payment amount"), "payment_001", 50.00, "USD", "amount_invalid"),
                (ConnectionError("Stripe API connection failed"), "payment_002", 100.00, "USD", "api_error"),
                (Exception("Payment processing timeout"), "payment_003", 75.00, "USD", "timeout")
            ]
            
            captured_events = []
            
            for error, payment_id, amount, currency, stripe_code in payment_errors:
                try:
                    event_id = capture_payment_error(
                        error=error,
                        payment_id=payment_id,
                        amount=amount,
                        currency=currency,
                        stripe_error_code=stripe_code
                    )
                    captured_events.append(event_id)
                except Exception as e:
                    logger.warning(f"Failed to capture payment error: {e}")
            
            return {
                "success": len(captured_events) > 0,
                "captured_events": len(captured_events),
                "event_ids": captured_events
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def test_booking_errors(self) -> Dict[str, Any]:
        """Test booking error capture with enhanced context."""
        
        try:
            # Simulate booking errors
            booking_errors = [
                (ValueError("Appointment time conflict"), 123, 456, 1),
                (Exception("Barber not available"), 124, 456, 1),
                (RuntimeError("Double booking detected"), 125, 456, 1)
            ]
            
            captured_events = []
            
            for error, appointment_id, user_id, location_id in booking_errors:
                try:
                    event_id = capture_booking_error(
                        error=error,
                        appointment_id=appointment_id,
                        user_id=user_id,
                        location_id=location_id
                    )
                    captured_events.append(event_id)
                except Exception as e:
                    logger.warning(f"Failed to capture booking error: {e}")
            
            return {
                "success": len(captured_events) > 0,
                "captured_events": len(captured_events),
                "event_ids": captured_events
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def test_integration_errors(self) -> Dict[str, Any]:
        """Test integration error capture."""
        
        try:
            # Simulate integration errors
            integration_errors = [
                (ConnectionError("Google Calendar API timeout"), "google_calendar", "sync_events", "cal_123"),
                (ValueError("SendGrid API key invalid"), "sendgrid", "send_email", "email_456"),
                (Exception("Twilio SMS delivery failed"), "twilio", "send_sms", "sms_789")
            ]
            
            captured_events = []
            
            for error, integration_type, operation, external_id in integration_errors:
                try:
                    event_id = capture_integration_error(
                        error=error,
                        integration_type=integration_type,
                        operation=operation,
                        external_id=external_id
                    )
                    captured_events.append(event_id)
                except Exception as e:
                    logger.warning(f"Failed to capture integration error: {e}")
            
            return {
                "success": len(captured_events) > 0,
                "captured_events": len(captured_events),
                "event_ids": captured_events
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def test_performance_monitoring(self) -> Dict[str, Any]:
        """Test performance monitoring features."""
        
        try:
            results = []
            
            # Test performance measurement
            with sentry_sdk.start_transaction(op="test", name="performance_test"):
                start_time = time.time()
                
                # Simulate some work
                time.sleep(0.1)
                
                duration = time.time() - start_time
                sentry_sdk.set_measurement("test_duration", duration, "second")
                results.append("transaction_completed")
            
            # Test span creation
            with sentry_sdk.start_span(op="test.operation", description="test_span") as span:
                span.set_tag("test_tag", "test_value")
                span.set_data("test_data", {"key": "value"})
                time.sleep(0.05)
                results.append("span_completed")
            
            # Test business operation monitoring
            @business_monitor.monitor_booking_operation("test_booking")
            def test_booking_operation():
                time.sleep(0.02)
                return "booking_complete"
            
            result = test_booking_operation()
            results.append(f"business_monitor: {result}")
            
            return {
                "success": len(results) == 3,
                "operations_completed": results
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def test_user_context(self) -> Dict[str, Any]:
        """Test user context addition."""
        
        try:
            # Test user context setting
            add_user_context(
                user_id=12345,
                user_email="test@example.com",
                user_role="client",
                location_id=1
            )
            
            # Capture an event with user context
            event_id = sentry_sdk.capture_message("Test message with user context", level="info")
            
            # Test different user roles
            test_users = [
                (67890, "barber@example.com", "barber", 2),
                (11111, "admin@example.com", "admin", 3)
            ]
            
            captured_events = []
            
            for user_id, email, role, location in test_users:
                with sentry_sdk.push_scope():
                    add_user_context(
                        user_id=user_id,
                        user_email=email,
                        user_role=role,
                        location_id=location
                    )
                    event_id = sentry_sdk.capture_message(f"Test for {role} user", level="info")
                    captured_events.append(event_id)
            
            return {
                "success": True,
                "main_event_id": event_id,
                "role_events": len(captured_events)
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def test_business_context(self) -> Dict[str, Any]:
        """Test business context addition."""
        
        try:
            # Test business context setting
            add_business_context(
                appointment_id=12345,
                payment_id="payment_67890",
                service_type="haircut",
                integration_type="google_calendar"
            )
            
            # Capture event with business context
            event_id = sentry_sdk.capture_message("Test message with business context", level="info")
            
            return {
                "success": True,
                "event_id": event_id
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def test_error_filtering(self) -> Dict[str, Any]:
        """Test error filtering functionality."""
        
        try:
            # These errors should be filtered out (not sent to Sentry)
            filtered_errors = [
                ConnectionError("Connection aborted"),
                ValueError("Invalid JSON"),
                Exception("404 Not Found")
            ]
            
            # These errors should be captured
            captured_errors = [
                RuntimeError("Critical system error"),
                Exception("Unexpected application error")
            ]
            
            # Try to capture filtered errors (should be filtered by before_send)
            for error in filtered_errors:
                try:
                    raise error
                except Exception as e:
                    sentry_sdk.capture_exception(e)
            
            # Capture real errors
            captured_events = []
            for error in captured_errors:
                try:
                    raise error
                except Exception as e:
                    event_id = sentry_sdk.capture_exception(e)
                    captured_events.append(event_id)
            
            return {
                "success": True,
                "filtered_errors_attempted": len(filtered_errors),
                "captured_events": len(captured_events)
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def test_custom_fingerprinting(self) -> Dict[str, Any]:
        """Test custom error fingerprinting."""
        
        try:
            # Test database error fingerprinting
            try:
                raise Exception("SQLAlchemy database connection failed")
            except Exception as e:
                db_event_id = sentry_sdk.capture_exception(e)
            
            # Test payment error fingerprinting
            try:
                raise Exception("Stripe payment processing failed")
            except Exception as e:
                payment_event_id = sentry_sdk.capture_exception(e)
            
            # Test integration error fingerprinting
            try:
                raise Exception("Google Calendar API error occurred")
            except Exception as e:
                integration_event_id = sentry_sdk.capture_exception(e)
            
            return {
                "success": True,
                "database_event": db_event_id,
                "payment_event": payment_event_id,
                "integration_event": integration_event_id
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}


def main():
    """Main test execution function."""
    
    parser = argparse.ArgumentParser(description="Test Sentry integration")
    parser.add_argument("--test-type", default="all", 
                       choices=["all", "basic", "database", "payment", "booking", 
                               "integration", "performance", "user", "business"],
                       help="Type of tests to run")
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    # Initialize Sentry
    if not configure_sentry():
        logger.error("Failed to configure Sentry. Please check your configuration.")
        sys.exit(1)
    
    # Create test suite
    test_suite = SentryTestSuite(verbose=args.verbose)
    
    # Run tests based on type
    if args.test_type == "all":
        results = test_suite.run_all_tests()
    else:
        # Run specific test type
        test_methods = {
            "basic": test_suite.test_basic_error_capture,
            "database": test_suite.test_database_errors,
            "payment": test_suite.test_payment_errors,
            "booking": test_suite.test_booking_errors,
            "integration": test_suite.test_integration_errors,
            "performance": test_suite.test_performance_monitoring,
            "user": test_suite.test_user_context,
            "business": test_suite.test_business_context
        }
        
        if args.test_type in test_methods:
            logger.info(f"Running {args.test_type} tests...")
            result = test_methods[args.test_type]()
            results = {
                "success": result.get("success", False),
                "test_type": args.test_type,
                "result": result
            }
        else:
            logger.error(f"Unknown test type: {args.test_type}")
            sys.exit(1)
    
    # Print results
    print("\n" + "="*60)
    print("SENTRY INTEGRATION TEST RESULTS")
    print("="*60)
    
    if args.test_type == "all":
        print(f"Total Tests: {results['total_tests']}")
        print(f"Successful: {results['successful_tests']}")
        print(f"Failed: {results['failed_tests']}")
        print(f"Success Rate: {results['successful_tests']/results['total_tests']*100:.1f}%")
        
        if not results['success']:
            print("\nFAILED TESTS:")
            for test_result in results['test_results']:
                if not test_result['success']:
                    print(f"- {test_result['suite']}: {test_result.get('error', 'Unknown error')}")
    else:
        print(f"Test Type: {results['test_type']}")
        print(f"Success: {results['success']}")
        if args.verbose:
            print(f"Details: {results['result']}")
    
    print("\nSentry Health:")
    health = results.get('sentry_health', sentry_health_check())
    for key, value in health.items():
        print(f"  {key}: {value}")
    
    print("\nNote: Check your Sentry dashboard to verify events were captured correctly.")
    
    # Exit with appropriate code
    sys.exit(0 if results['success'] else 1)


if __name__ == "__main__":
    main()