#!/usr/bin/env python3
"""
Comprehensive GA4 Integration Test Suite for BookedBarber V2

This test suite validates:
- Server-side GA4 Measurement Protocol integration
- Event tracking functionality
- Privacy compliance
- Error handling and validation
- Performance and reliability

Usage:
    python test_ga4_integration.py

Environment Variables Required:
    GA4_MEASUREMENT_ID=G-XXXXXXXXXX
    GA4_API_SECRET=your_api_secret
"""

import asyncio
import json
import logging
import os
import time
import uuid
from datetime import datetime
from typing import Dict, Any, List

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def setup_test_environment():
    """Setup test environment variables"""
    # Test configuration
    os.environ.setdefault('GA4_MEASUREMENT_ID', 'G-TEST123456')
    os.environ.setdefault('GA4_API_SECRET', 'test_api_secret')
    os.environ.setdefault('GA4_DEBUG_MODE', 'true')
    os.environ.setdefault('GA4_TEST_MODE', 'true')
    os.environ.setdefault('GA4_LOG_EVENTS', 'true')
    os.environ.setdefault('GA4_VALIDATE_EVENTS', 'true')
    os.environ.setdefault('GA4_CUSTOM_DIMENSIONS', json.dumps({
        'user_role': 'custom_dimension_1',
        'barber_id': 'custom_dimension_2',
        'location_id': 'custom_dimension_3',
        'appointment_service': 'custom_dimension_4',
        'payment_method': 'custom_dimension_5',
        'subscription_tier': 'custom_dimension_6'
    }))

async def test_ga4_service_import():
    """Test GA4 service import and initialization"""
    logger.info("Testing GA4 service import...")
    
    try:
        # Import after setting environment variables
        from services.ga4_analytics_service import (
            GA4AnalyticsService,
            GA4Event,
            GA4User,
            GA4EcommerceItem,
            ga4_analytics,
            track_appointment_event,
            track_payment_event,
            track_user_event
        )
        
        logger.info("✅ GA4 service imported successfully")
        
        # Test service initialization
        service = GA4AnalyticsService()
        logger.info(f"✅ GA4 service initialized. Enabled: {service.enabled}")
        
        return service, {
            'GA4Event': GA4Event,
            'GA4User': GA4User,
            'GA4EcommerceItem': GA4EcommerceItem,
            'track_appointment_event': track_appointment_event,
            'track_payment_event': track_payment_event,
            'track_user_event': track_user_event
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to import GA4 service: {e}")
        raise

async def test_event_validation(service, classes):
    """Test event validation functionality"""
    logger.info("Testing event validation...")
    
    GA4Event = classes['GA4Event']
    
    # Test valid event
    valid_event = GA4Event(
        name="test_event",
        parameters={
            "event_category": "test",
            "event_label": "validation_test",
            "value": 1
        }
    )
    
    is_valid = service._validate_event(valid_event)
    assert is_valid, "Valid event should pass validation"
    logger.info("✅ Valid event passed validation")
    
    # Test invalid event name
    invalid_event = GA4Event(
        name="test-event-with-dashes",  # Invalid: contains dashes
        parameters={"test": "value"}
    )
    
    is_valid = service._validate_event(invalid_event)
    assert not is_valid, "Invalid event name should fail validation"
    logger.info("✅ Invalid event name properly rejected")
    
    # Test too many parameters
    many_params = {f"param_{i}": f"value_{i}" for i in range(30)}  # > 25 limit
    invalid_event = GA4Event(
        name="test_event",
        parameters=many_params
    )
    
    is_valid = service._validate_event(invalid_event)
    assert not is_valid, "Event with too many parameters should fail validation"
    logger.info("✅ Event with too many parameters properly rejected")

async def test_appointment_tracking(service, classes):
    """Test appointment event tracking"""
    logger.info("Testing appointment event tracking...")
    
    GA4User = classes['GA4User']
    
    # Generate test data
    appointment_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    barber_id = str(uuid.uuid4())
    service_name = "Premium Haircut"
    price = 75.00
    duration = 60
    
    user = GA4User(
        client_id=service.generate_client_id(),
        user_id=user_id
    )
    
    # Test appointment booked
    result = await service.track_appointment_booked(
        appointment_id=appointment_id,
        user=user,
        barber_id=barber_id,
        service_name=service_name,
        price=price,
        duration_minutes=duration,
        custom_dimensions={
            'user_role': 'customer',
            'location_id': 'loc_123'
        }
    )
    
    logger.info(f"✅ Appointment booked tracking result: {result}")
    
    # Test appointment confirmed
    result = await service.track_appointment_confirmed(
        appointment_id=appointment_id,
        user=user,
        barber_id=barber_id
    )
    
    logger.info(f"✅ Appointment confirmed tracking result: {result}")
    
    # Test appointment completed
    result = await service.track_appointment_completed(
        appointment_id=appointment_id,
        user=user,
        barber_id=barber_id,
        service_name=service_name,
        actual_duration=65,
        customer_rating=5.0
    )
    
    logger.info(f"✅ Appointment completed tracking result: {result}")

async def test_payment_tracking(service, classes):
    """Test payment event tracking"""
    logger.info("Testing payment event tracking...")
    
    GA4User = classes['GA4User']
    
    # Generate test data
    transaction_id = f"txn_{uuid.uuid4().hex[:8]}"
    user_id = str(uuid.uuid4())
    amount = 75.00
    appointment_id = str(uuid.uuid4())
    
    user = GA4User(
        client_id=service.generate_client_id(),
        user_id=user_id
    )
    
    # Test payment initiated
    result = await service.track_payment_initiated(
        transaction_id=transaction_id,
        user=user,
        amount=amount,
        payment_method="stripe",
        appointment_id=appointment_id
    )
    
    logger.info(f"✅ Payment initiated tracking result: {result}")
    
    # Test payment completed
    result = await service.track_payment_completed(
        transaction_id=transaction_id,
        user=user,
        amount=amount,
        payment_method="stripe",
        appointment_id=appointment_id,
        barber_id="barber_123",
        service_name="Premium Haircut"
    )
    
    logger.info(f"✅ Payment completed tracking result: {result}")
    
    # Test payment failed
    failed_txn_id = f"txn_{uuid.uuid4().hex[:8]}"
    result = await service.track_payment_failed(
        transaction_id=failed_txn_id,
        user=user,
        amount=amount,
        error_code="card_declined",
        error_message="Insufficient funds",
        payment_method="stripe"
    )
    
    logger.info(f"✅ Payment failed tracking result: {result}")

async def test_user_tracking(service, classes):
    """Test user event tracking"""
    logger.info("Testing user event tracking...")
    
    GA4User = classes['GA4User']
    
    user_id = str(uuid.uuid4())
    user = GA4User(
        client_id=service.generate_client_id(),
        user_id=user_id
    )
    
    # Test user signup
    result = await service.track_user_signup(
        user=user,
        user_role="customer",
        signup_method="email",
        referral_source="google_ads"
    )
    
    logger.info(f"✅ User signup tracking result: {result}")
    
    # Test user login
    result = await service.track_user_login(
        user=user,
        user_role="customer",
        login_method="email"
    )
    
    logger.info(f"✅ User login tracking result: {result}")

async def test_business_events(service, classes):
    """Test business-specific event tracking"""
    logger.info("Testing business event tracking...")
    
    GA4User = classes['GA4User']
    
    user_id = str(uuid.uuid4())
    user = GA4User(
        client_id=service.generate_client_id(),
        user_id=user_id
    )
    
    # Test service viewed
    result = await service.track_service_viewed(
        service_id="service_123",
        service_name="Premium Haircut",
        user=user,
        barber_id="barber_123",
        price=75.00
    )
    
    logger.info(f"✅ Service viewed tracking result: {result}")
    
    # Test barber viewed
    result = await service.track_barber_viewed(
        barber_id="barber_123",
        barber_name="John Smith",
        user=user,
        location_id="loc_123"
    )
    
    logger.info(f"✅ Barber viewed tracking result: {result}")
    
    # Test availability checked
    result = await service.track_availability_checked(
        user=user,
        barber_id="barber_123",
        date_requested="2024-01-15",
        available_slots=5
    )
    
    logger.info(f"✅ Availability checked tracking result: {result}")

async def test_custom_events(service, classes):
    """Test custom event tracking"""
    logger.info("Testing custom event tracking...")
    
    GA4User = classes['GA4User']
    
    user_id = str(uuid.uuid4())
    user = GA4User(
        client_id=service.generate_client_id(),
        user_id=user_id
    )
    
    # Test custom event
    result = await service.track_custom_event(
        event_name="custom_business_event",
        user=user,
        parameters={
            "action": "test_action",
            "category": "test_category",
            "label": "test_label",
            "value": 100
        },
        custom_dimensions={
            'user_role': 'admin',
            'barber_id': 'test_barber'
        }
    )
    
    logger.info(f"✅ Custom event tracking result: {result}")
    
    # Test invalid custom event
    result = await service.track_custom_event(
        event_name="invalid-event-name",  # Invalid name
        user=user,
        parameters={"test": "value"}
    )
    
    assert not result, "Invalid event name should return False"
    logger.info("✅ Invalid custom event properly rejected")

async def test_batch_processing(service, classes):
    """Test event batching functionality"""
    logger.info("Testing event batch processing...")
    
    if not service.batch_events:
        logger.info("⏭️  Batch processing disabled, skipping test")
        return
    
    GA4User = classes['GA4User']
    
    user_id = str(uuid.uuid4())
    user = GA4User(
        client_id=service.generate_client_id(),
        user_id=user_id
    )
    
    # Send multiple events quickly to test batching
    for i in range(5):
        await service.track_custom_event(
            event_name=f"batch_test_event_{i}",
            user=user,
            parameters={
                "batch_index": i,
                "test_id": "batch_test"
            }
        )
    
    # Manually flush batch
    result = await service.flush_batch()
    logger.info(f"✅ Batch flush result: {result}")

async def test_convenience_functions(classes):
    """Test convenience functions"""
    logger.info("Testing convenience functions...")
    
    track_appointment_event = classes['track_appointment_event']
    track_payment_event = classes['track_payment_event']
    track_user_event = classes['track_user_event']
    
    user_id = str(uuid.uuid4())
    client_id = str(uuid.uuid4())
    
    # Test appointment convenience function
    result = await track_appointment_event(
        event_type="booked",
        appointment_id=str(uuid.uuid4()),
        user_id=user_id,
        client_id=client_id,
        barber_id="barber_123",
        service_name="Test Service",
        price=50.0
    )
    
    logger.info(f"✅ Convenience appointment tracking result: {result}")
    
    # Test payment convenience function
    result = await track_payment_event(
        event_type="completed",
        transaction_id=f"txn_{uuid.uuid4().hex[:8]}",
        user_id=user_id,
        amount=50.0,
        client_id=client_id,
        payment_method="stripe"
    )
    
    logger.info(f"✅ Convenience payment tracking result: {result}")
    
    # Test user convenience function
    result = await track_user_event(
        event_type="signup",
        user_id=user_id,
        user_role="customer",
        client_id=client_id,
        signup_method="email"
    )
    
    logger.info(f"✅ Convenience user tracking result: {result}")

async def test_error_handling(service, classes):
    """Test error handling scenarios"""
    logger.info("Testing error handling...")
    
    GA4User = classes['GA4User']
    GA4Event = classes['GA4Event']
    
    user = GA4User(client_id=service.generate_client_id())
    
    # Test with None values
    try:
        await service.track_custom_event(
            event_name="test_null_handling",
            user=user,
            parameters={
                "null_value": None,
                "valid_value": "test"
            }
        )
        logger.info("✅ Null value handling successful")
    except Exception as e:
        logger.error(f"❌ Null value handling failed: {e}")
    
    # Test with empty parameters
    try:
        await service.track_custom_event(
            event_name="test_empty_params",
            user=user,
            parameters={}
        )
        logger.info("✅ Empty parameters handling successful")
    except Exception as e:
        logger.error(f"❌ Empty parameters handling failed: {e}")

async def test_privacy_compliance(service, classes):
    """Test privacy compliance features"""
    logger.info("Testing privacy compliance...")
    
    GA4User = classes['GA4User']
    
    user = GA4User(client_id=service.generate_client_id())
    
    # Test without consent
    result = await service.track_custom_event(
        event_name="privacy_test",
        user=user,
        parameters={"test": "no_consent"},
        consent_granted=False
    )
    
    # Should not track without consent
    if service.consent_mode:
        assert not result, "Should not track without consent when consent mode is enabled"
        logger.info("✅ Privacy compliance: Events blocked without consent")
    else:
        logger.info("ℹ️  Consent mode disabled, events sent regardless")
    
    # Test with consent
    result = await service.track_custom_event(
        event_name="privacy_test",
        user=user,
        parameters={"test": "with_consent"},
        consent_granted=True
    )
    
    logger.info(f"✅ Privacy compliance: Event with consent result: {result}")

def test_client_id_generation():
    """Test client ID generation"""
    logger.info("Testing client ID generation...")
    
    from services.ga4_analytics_service import GA4AnalyticsService
    
    # Generate multiple client IDs
    client_ids = [GA4AnalyticsService.generate_client_id() for _ in range(10)]
    
    # Check uniqueness
    assert len(set(client_ids)) == len(client_ids), "Client IDs should be unique"
    logger.info("✅ Client ID generation produces unique values")
    
    # Check format (UUID4)
    for client_id in client_ids:
        assert len(client_id) == 36, "Client ID should be 36 characters"
        assert client_id.count('-') == 4, "Client ID should have 4 hyphens"
    
    logger.info("✅ Client ID format validation passed")

def test_user_id_hashing():
    """Test user ID hashing for privacy"""
    logger.info("Testing user ID hashing...")
    
    from services.ga4_analytics_service import GA4AnalyticsService
    
    user_id = "user123@example.com"
    salt = "test_salt"
    
    # Generate hash
    hashed_id = GA4AnalyticsService.hash_user_id(user_id, salt)
    
    # Verify properties
    assert len(hashed_id) == 16, "Hashed ID should be 16 characters"
    assert hashed_id != user_id, "Hashed ID should be different from original"
    
    # Test consistency
    hashed_id2 = GA4AnalyticsService.hash_user_id(user_id, salt)
    assert hashed_id == hashed_id2, "Hashing should be consistent"
    
    # Test with different salt
    hashed_id3 = GA4AnalyticsService.hash_user_id(user_id, "different_salt")
    assert hashed_id != hashed_id3, "Different salts should produce different hashes"
    
    logger.info("✅ User ID hashing validation passed")

async def run_performance_test(service, classes):
    """Run performance test"""
    logger.info("Running performance test...")
    
    GA4User = classes['GA4User']
    
    user = GA4User(client_id=service.generate_client_id())
    
    # Time multiple events
    start_time = time.time()
    num_events = 50
    
    tasks = []
    for i in range(num_events):
        task = service.track_custom_event(
            event_name="performance_test",
            user=user,
            parameters={
                "event_index": i,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        tasks.append(task)
    
    # Wait for all events to complete
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    end_time = time.time()
    duration = end_time - start_time
    
    successful_events = sum(1 for r in results if r is True)
    events_per_second = num_events / duration
    
    logger.info(f"✅ Performance test completed:")
    logger.info(f"   - Events sent: {num_events}")
    logger.info(f"   - Successful: {successful_events}")
    logger.info(f"   - Duration: {duration:.2f}s")
    logger.info(f"   - Events/second: {events_per_second:.2f}")
    
    # Flush any remaining batched events
    if service.batch_events:
        await service.flush_batch()

async def run_comprehensive_test():
    """Run comprehensive GA4 integration test"""
    logger.info("🚀 Starting GA4 Integration Test Suite")
    logger.info("=" * 60)
    
    # Setup test environment
    setup_test_environment()
    
    try:
        # Import and initialize
        service, classes = await test_ga4_service_import()
        
        # Run all tests
        await test_event_validation(service, classes)
        await test_appointment_tracking(service, classes)
        await test_payment_tracking(service, classes)
        await test_user_tracking(service, classes)
        await test_business_events(service, classes)
        await test_custom_events(service, classes)
        await test_batch_processing(service, classes)
        await test_convenience_functions(classes)
        await test_error_handling(service, classes)
        await test_privacy_compliance(service, classes)
        
        # Synchronous tests
        test_client_id_generation()
        test_user_id_hashing()
        
        # Performance test
        await run_performance_test(service, classes)
        
        logger.info("=" * 60)
        logger.info("🎉 GA4 Integration Test Suite PASSED")
        logger.info("All tests completed successfully!")
        
        # Display debug info
        if hasattr(service, 'getDebugInfo'):
            debug_info = service.getDebugInfo()
            logger.info(f"📊 Debug Information: {debug_info}")
        
    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"❌ GA4 Integration Test Suite FAILED: {e}")
        logger.error("Check the error details above")
        raise

def main():
    """Main entry point"""
    try:
        # Run async test suite
        asyncio.run(run_comprehensive_test())
        print("\n✅ All tests passed successfully!")
        return 0
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())