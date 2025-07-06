#!/usr/bin/env python3
"""
Google Tag Manager (GTM) Integration Test
BookedBarber V2 - Test GTM and GA4 Integration

This test file verifies that:
1. GTM configuration loads correctly
2. GTM service initializes properly
3. Events can be tracked through GTM
4. GTM integrates with existing GA4 setup
5. Error handling works as expected
"""

import asyncio
import json
import logging
import sys
import os
from datetime import datetime, timezone
from typing import Dict, Any

# Add the backend path to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import our GTM service and configuration
from services.gtm_service import (
    GTMService, 
    GTMEvent, 
    GTMEventType, 
    GTMEcommerceItem,
    gtm_service,
    track_gtm_event,
    track_gtm_page_view,
    track_gtm_appointment_booked,
    track_gtm_payment_completed,
    track_gtm_user_registration,
    track_gtm_custom_event
)
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class GTMIntegrationTest:
    """Test suite for GTM integration"""
    
    def __init__(self):
        self.test_client_id = "test_client_123456789"
        self.test_user_id = "test_user_456"
        self.test_session_id = "test_session_789"
        self.test_results = []
        
    def log_test_result(self, test_name: str, success: bool, message: str = ""):
        """Log test result"""
        status = "PASS" if success else "FAIL"
        self.test_results.append({
            "test": test_name,
            "status": status,
            "message": message,
            "timestamp": datetime.now().isoformat()
        })
        logger.info(f"[{status}] {test_name}: {message}")
    
    def test_configuration_loading(self) -> bool:
        """Test that GTM configuration loads correctly from environment"""
        try:
            # Check that settings object has GTM attributes
            gtm_attrs = [attr for attr in dir(settings) if attr.startswith('gtm_')]
            
            if len(gtm_attrs) < 10:
                self.log_test_result(
                    "Configuration Loading", 
                    False, 
                    f"Only {len(gtm_attrs)} GTM settings found, expected more"
                )
                return False
            
            # Check specific configuration values
            config_checks = {
                "gtm_debug_mode": bool,
                "gtm_batch_events": bool,
                "gtm_event_timeout": int,
                "gtm_datalayer_name": str,
                "gtm_consent_mode": bool
            }
            
            for attr, expected_type in config_checks.items():
                value = getattr(settings, attr, None)
                if value is None:
                    self.log_test_result(
                        "Configuration Loading", 
                        False, 
                        f"Missing configuration: {attr}"
                    )
                    return False
                
                if not isinstance(value, expected_type):
                    self.log_test_result(
                        "Configuration Loading", 
                        False, 
                        f"Wrong type for {attr}: expected {expected_type}, got {type(value)}"
                    )
                    return False
            
            self.log_test_result(
                "Configuration Loading", 
                True, 
                f"Found {len(gtm_attrs)} GTM configuration settings"
            )
            return True
            
        except Exception as e:
            self.log_test_result(
                "Configuration Loading", 
                False, 
                f"Exception: {str(e)}"
            )
            return False
    
    def test_gtm_service_initialization(self) -> bool:
        """Test GTM service initialization"""
        try:
            # Test global service instance
            if gtm_service is None:
                self.log_test_result(
                    "Service Initialization", 
                    False, 
                    "Global GTM service instance is None"
                )
                return False
            
            # Test service configuration
            container_info = gtm_service.get_container_info()
            
            required_info = ['debug_mode', 'test_mode', 'batch_events', 'batch_size']
            for key in required_info:
                if key not in container_info:
                    self.log_test_result(
                        "Service Initialization", 
                        False, 
                        f"Missing container info: {key}"
                    )
                    return False
            
            # Test custom dimensions parsing
            custom_dimensions = gtm_service.custom_dimensions
            custom_metrics = gtm_service.custom_metrics
            
            self.log_test_result(
                "Service Initialization", 
                True, 
                f"Service initialized with {len(custom_dimensions)} dimensions, {len(custom_metrics)} metrics"
            )
            return True
            
        except Exception as e:
            self.log_test_result(
                "Service Initialization", 
                False, 
                f"Exception: {str(e)}"
            )
            return False
    
    async def test_event_validation(self) -> bool:
        """Test event validation functionality"""
        try:
            # Test valid event
            valid_event = GTMEvent(
                event_name="test_event",
                event_type=GTMEventType.CUSTOM_EVENT,
                client_id=self.test_client_id,
                timestamp=datetime.now(timezone.utc),
                user_id=self.test_user_id
            )
            
            is_valid = gtm_service._validate_event(valid_event)
            if not is_valid:
                self.log_test_result(
                    "Event Validation", 
                    False, 
                    "Valid event failed validation"
                )
                return False
            
            # Test invalid event (missing client_id)
            invalid_event = GTMEvent(
                event_name="test_event",
                event_type=GTMEventType.CUSTOM_EVENT,
                client_id="",  # Empty client_id should fail
                timestamp=datetime.now(timezone.utc)
            )
            
            is_invalid = gtm_service._validate_event(invalid_event)
            if is_invalid:
                self.log_test_result(
                    "Event Validation", 
                    False, 
                    "Invalid event passed validation"
                )
                return False
            
            # Test ecommerce item validation
            ecommerce_event = GTMEvent(
                event_name="purchase",
                event_type=GTMEventType.APPOINTMENT_BOOKED,
                client_id=self.test_client_id,
                timestamp=datetime.now(timezone.utc),
                ecommerce_items=[
                    GTMEcommerceItem(
                        item_id="",  # Empty item_id should fail
                        item_name="Test Service",
                        item_category="Appointment"
                    )
                ]
            )
            
            is_ecommerce_invalid = gtm_service._validate_event(ecommerce_event)
            if is_ecommerce_invalid:
                self.log_test_result(
                    "Event Validation", 
                    False, 
                    "Invalid ecommerce event passed validation"
                )
                return False
            
            self.log_test_result(
                "Event Validation", 
                True, 
                "All validation tests passed"
            )
            return True
            
        except Exception as e:
            self.log_test_result(
                "Event Validation", 
                False, 
                f"Exception: {str(e)}"
            )
            return False
    
    async def test_page_view_tracking(self) -> bool:
        """Test page view event tracking"""
        try:
            success = await track_gtm_page_view(
                client_id=self.test_client_id,
                page_url="https://app.bookedbarber.com/test",
                page_title="Test Page",
                user_id=self.test_user_id,
                session_id=self.test_session_id,
                referrer="https://google.com",
                custom_dimensions={
                    "user_role": "customer",
                    "location_id": "test_location_123"
                }
            )
            
            if not success:
                self.log_test_result(
                    "Page View Tracking", 
                    False, 
                    "Page view tracking failed"
                )
                return False
            
            self.log_test_result(
                "Page View Tracking", 
                True, 
                "Page view tracked successfully"
            )
            return True
            
        except Exception as e:
            self.log_test_result(
                "Page View Tracking", 
                False, 
                f"Exception: {str(e)}"
            )
            return False
    
    async def test_appointment_booking_tracking(self) -> bool:
        """Test appointment booking event tracking"""
        try:
            success = await track_gtm_appointment_booked(
                client_id=self.test_client_id,
                appointment_id="apt_test_123",
                barber_id="barber_test_456",
                service_id="service_test_789",
                appointment_value=75.00,
                user_id=self.test_user_id,
                session_id=self.test_session_id,
                location_id="location_test_123",
                custom_dimensions={
                    "booking_method": "web",
                    "appointment_time": "2024-01-15T14:00:00Z"
                }
            )
            
            if not success:
                self.log_test_result(
                    "Appointment Booking Tracking", 
                    False, 
                    "Appointment booking tracking failed"
                )
                return False
            
            self.log_test_result(
                "Appointment Booking Tracking", 
                True, 
                "Appointment booking tracked successfully"
            )
            return True
            
        except Exception as e:
            self.log_test_result(
                "Appointment Booking Tracking", 
                False, 
                f"Exception: {str(e)}"
            )
            return False
    
    async def test_payment_tracking(self) -> bool:
        """Test payment completion event tracking"""
        try:
            success = await track_gtm_payment_completed(
                client_id=self.test_client_id,
                payment_id="pay_test_123",
                appointment_id="apt_test_123",
                amount=75.00,
                payment_method="card",
                user_id=self.test_user_id,
                session_id=self.test_session_id,
                custom_dimensions={
                    "processing_time": 2.5
                }
            )
            
            if not success:
                self.log_test_result(
                    "Payment Tracking", 
                    False, 
                    "Payment tracking failed"
                )
                return False
            
            self.log_test_result(
                "Payment Tracking", 
                True, 
                "Payment tracked successfully"
            )
            return True
            
        except Exception as e:
            self.log_test_result(
                "Payment Tracking", 
                False, 
                f"Exception: {str(e)}"
            )
            return False
    
    async def test_user_registration_tracking(self) -> bool:
        """Test user registration event tracking"""
        try:
            success = await track_gtm_user_registration(
                client_id=self.test_client_id,
                user_id=self.test_user_id,
                registration_method="email",
                user_role="customer",
                session_id=self.test_session_id,
                custom_dimensions={
                    "location_id": "location_test_123"
                }
            )
            
            if not success:
                self.log_test_result(
                    "User Registration Tracking", 
                    False, 
                    "User registration tracking failed"
                )
                return False
            
            self.log_test_result(
                "User Registration Tracking", 
                True, 
                "User registration tracked successfully"
            )
            return True
            
        except Exception as e:
            self.log_test_result(
                "User Registration Tracking", 
                False, 
                f"Exception: {str(e)}"
            )
            return False
    
    async def test_custom_event_tracking(self) -> bool:
        """Test custom event tracking"""
        try:
            # Test with ecommerce items
            ecommerce_items = [
                GTMEcommerceItem(
                    item_id="service_123",
                    item_name="Premium Haircut",
                    item_category="Service",
                    item_brand="BookedBarber",
                    price=45.00,
                    quantity=1,
                    location_id="location_test_123"
                )
            ]
            
            success = await track_gtm_custom_event(
                event_name="service_viewed",
                client_id=self.test_client_id,
                event_parameters={
                    "service_type": "haircut",
                    "duration": 30,
                    "category": "premium"
                },
                user_id=self.test_user_id,
                session_id=self.test_session_id,
                custom_dimensions={
                    "location_id": "location_test_123",
                    "barber_id": "barber_test_456"
                },
                custom_metrics={
                    "service_rating": 4.8,
                    "view_duration": 45
                },
                ecommerce_items=ecommerce_items
            )
            
            if not success:
                self.log_test_result(
                    "Custom Event Tracking", 
                    False, 
                    "Custom event tracking failed"
                )
                return False
            
            self.log_test_result(
                "Custom Event Tracking", 
                True, 
                "Custom event tracked successfully"
            )
            return True
            
        except Exception as e:
            self.log_test_result(
                "Custom Event Tracking", 
                False, 
                f"Exception: {str(e)}"
            )
            return False
    
    async def test_batch_functionality(self) -> bool:
        """Test event batching functionality"""
        try:
            # Track multiple events to test batching
            events_to_track = 5
            
            for i in range(events_to_track):
                await track_gtm_custom_event(
                    event_name=f"batch_test_event_{i}",
                    client_id=self.test_client_id,
                    event_parameters={"event_number": i},
                    user_id=self.test_user_id,
                    session_id=self.test_session_id
                )
            
            # Force flush batch
            flush_success = await gtm_service.flush_batch()
            
            if not flush_success:
                self.log_test_result(
                    "Batch Functionality", 
                    False, 
                    "Batch flush failed"
                )
                return False
            
            self.log_test_result(
                "Batch Functionality", 
                True, 
                f"Successfully batched and flushed {events_to_track} events"
            )
            return True
            
        except Exception as e:
            self.log_test_result(
                "Batch Functionality", 
                False, 
                f"Exception: {str(e)}"
            )
            return False
    
    async def test_error_handling(self) -> bool:
        """Test error handling and fallback functionality"""
        try:
            # Test with invalid data that should trigger error handling
            invalid_event = GTMEvent(
                event_name="",  # Empty event name
                event_type=GTMEventType.CUSTOM_EVENT,
                client_id="",  # Empty client ID
                timestamp=datetime.now(timezone.utc)
            )
            
            # This should fail gracefully
            success = await gtm_service.track_event(invalid_event)
            
            # We expect this to fail, so success = False is actually good
            if success:
                self.log_test_result(
                    "Error Handling", 
                    False, 
                    "Invalid event was accepted (should have been rejected)"
                )
                return False
            
            self.log_test_result(
                "Error Handling", 
                True, 
                "Invalid event was properly rejected"
            )
            return True
            
        except Exception as e:
            # Exceptions during error handling are bad
            self.log_test_result(
                "Error Handling", 
                False, 
                f"Exception during error handling: {str(e)}"
            )
            return False
    
    def test_ga4_integration_compatibility(self) -> bool:
        """Test that GTM integrates well with existing GA4 setup"""
        try:
            # Check that GA4 settings exist alongside GTM settings
            ga4_attrs = [attr for attr in dir(settings) if attr.startswith('ga4_')]
            gtm_attrs = [attr for attr in dir(settings) if attr.startswith('gtm_')]
            
            if len(ga4_attrs) == 0:
                self.log_test_result(
                    "GA4 Integration Compatibility", 
                    False, 
                    "No GA4 settings found - integration may not work"
                )
                return False
            
            if len(gtm_attrs) == 0:
                self.log_test_result(
                    "GA4 Integration Compatibility", 
                    False, 
                    "No GTM settings found"
                )
                return False
            
            # Check that GTM has GA4 integration enabled
            gtm_ga4_integration = getattr(settings, 'gtm_ga4_integration', False)
            
            if not gtm_ga4_integration:
                self.log_test_result(
                    "GA4 Integration Compatibility", 
                    False, 
                    "GTM GA4 integration is disabled"
                )
                return False
            
            # Check for potential conflicts
            conflicts = []
            
            # Both have their own measurement IDs - this is OK if GTM manages GA4
            if settings.ga4_measurement_id and settings.gtm_ga4_measurement_id:
                if settings.ga4_measurement_id != settings.gtm_ga4_measurement_id:
                    conflicts.append("Different GA4 measurement IDs in GA4 and GTM configs")
            
            if conflicts:
                self.log_test_result(
                    "GA4 Integration Compatibility", 
                    False, 
                    f"Configuration conflicts: {', '.join(conflicts)}"
                )
                return False
            
            self.log_test_result(
                "GA4 Integration Compatibility", 
                True, 
                f"GA4 ({len(ga4_attrs)} settings) and GTM ({len(gtm_attrs)} settings) are compatible"
            )
            return True
            
        except Exception as e:
            self.log_test_result(
                "GA4 Integration Compatibility", 
                False, 
                f"Exception: {str(e)}"
            )
            return False
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all tests and return results"""
        logger.info("Starting GTM Integration Test Suite")
        logger.info("=" * 60)
        
        # Configuration tests
        self.test_configuration_loading()
        self.test_gtm_service_initialization()
        self.test_ga4_integration_compatibility()
        
        # Functionality tests
        await self.test_event_validation()
        await self.test_page_view_tracking()
        await self.test_appointment_booking_tracking()
        await self.test_payment_tracking()
        await self.test_user_registration_tracking()
        await self.test_custom_event_tracking()
        await self.test_batch_functionality()
        await self.test_error_handling()
        
        # Clean up
        await gtm_service.close()
        
        # Calculate results
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["status"] == "PASS"])
        failed_tests = total_tests - passed_tests
        
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        results = {
            "total_tests": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "success_rate": round(success_rate, 2),
            "test_results": self.test_results,
            "timestamp": datetime.now().isoformat(),
            "overall_status": "PASS" if failed_tests == 0 else "FAIL"
        }
        
        logger.info("=" * 60)
        logger.info(f"GTM Integration Test Results:")
        logger.info(f"Total Tests: {total_tests}")
        logger.info(f"Passed: {passed_tests}")
        logger.info(f"Failed: {failed_tests}")
        logger.info(f"Success Rate: {success_rate}%")
        logger.info(f"Overall Status: {results['overall_status']}")
        
        return results

async def main():
    """Main test runner"""
    try:
        # Create test instance
        test_suite = GTMIntegrationTest()
        
        # Run tests
        results = await test_suite.run_all_tests()
        
        # Save results to file
        with open("gtm_integration_test_results.json", "w") as f:
            json.dump(results, f, indent=2)
        
        logger.info(f"Test results saved to gtm_integration_test_results.json")
        
        # Exit with appropriate code
        sys.exit(0 if results["overall_status"] == "PASS" else 1)
        
    except Exception as e:
        logger.error(f"Test suite failed with exception: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())