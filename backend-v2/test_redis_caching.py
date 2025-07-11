#!/usr/bin/env python
"""
Test script to verify Redis caching implementation is working correctly
"""

import time
import asyncio
from datetime import datetime, date
from sqlalchemy.orm import Session

# Import necessary components
from database import SessionLocal
from services.analytics_service import AnalyticsService
from services.appointment_cache_service import AppointmentCacheService
from services.cache_invalidation import cache_invalidator
from services.redis_service import cache_service
from utils.cache_decorators import cache_result, invalidate_pattern


def test_redis_connection():
    """Test Redis connection"""
    print("\n=== Testing Redis Connection ===")
    if cache_service.is_available():
        print("✅ Redis is connected and available")
        stats = cache_service.get_stats()
        print(f"   Memory used: {stats.get('memory_used_human', 'N/A')}")
        print(f"   Number of keys: {stats.get('db_keys', 'N/A')}")
    else:
        print("❌ Redis is not available")
        return False
    return True


def test_basic_caching():
    """Test basic caching operations"""
    print("\n=== Testing Basic Caching ===")
    
    # Test set and get
    test_key = "test:key:1"
    test_value = {"data": "test_value", "timestamp": datetime.now().isoformat()}
    
    # Set value
    if cache_service.set(test_key, test_value, ttl=60):
        print("✅ Successfully set cache value")
    else:
        print("❌ Failed to set cache value")
        return False
    
    # Get value
    retrieved = cache_service.get(test_key)
    if retrieved and retrieved["data"] == test_value["data"]:
        print("✅ Successfully retrieved cache value")
    else:
        print("❌ Failed to retrieve cache value")
        return False
    
    # Delete value
    if cache_service.delete(test_key):
        print("✅ Successfully deleted cache value")
    else:
        print("❌ Failed to delete cache value")
        return False
    
    return True


def test_cache_decorators():
    """Test cache decorators"""
    print("\n=== Testing Cache Decorators ===")
    
    @cache_result(ttl=30)
    def expensive_function(x: int, y: int) -> int:
        """Simulate expensive computation"""
        time.sleep(0.1)  # Simulate work
        return x + y
    
    # First call (cache miss)
    start = time.time()
    result1 = expensive_function(5, 10)
    duration1 = time.time() - start
    print(f"✅ First call (cache miss): {result1} in {duration1:.3f}s")
    
    # Second call (cache hit)
    start = time.time()
    result2 = expensive_function(5, 10)
    duration2 = time.time() - start
    print(f"✅ Second call (cache hit): {result2} in {duration2:.3f}s")
    
    if duration2 < duration1 / 2:
        print("✅ Cache hit is significantly faster")
    else:
        print("❌ Cache hit is not faster (caching might not be working)")
        return False
    
    # Invalidate cache
    expensive_function.invalidate(5, 10)
    print("✅ Cache invalidated")
    
    return True


def test_analytics_caching(db: Session):
    """Test analytics service caching"""
    print("\n=== Testing Analytics Caching ===")
    
    analytics = AnalyticsService(db)
    
    # Test Six Figure Barber metrics caching
    user_id = 1  # Assuming test user exists
    
    # First call (should cache)
    start = time.time()
    metrics1 = analytics.calculate_six_figure_barber_metrics(user_id)
    duration1 = time.time() - start
    print(f"✅ First analytics call: {duration1:.3f}s")
    
    # Second call (should hit cache)
    start = time.time()
    metrics2 = analytics.calculate_six_figure_barber_metrics(user_id)
    duration2 = time.time() - start
    print(f"✅ Second analytics call (cached): {duration2:.3f}s")
    
    if duration2 < duration1 / 2:
        print("✅ Analytics cache is working")
    else:
        print("⚠️  Analytics cache might not be working optimally")
    
    # Invalidate analytics cache
    count = invalidate_pattern(f"analytics:*user_id:{user_id}*")
    print(f"✅ Invalidated {count} analytics cache keys")
    
    return True


def test_appointment_caching(db: Session):
    """Test appointment cache service"""
    print("\n=== Testing Appointment Caching ===")
    
    cache_service_obj = AppointmentCacheService(db)
    
    barber_id = 1  # Assuming test barber exists
    test_date = date.today()
    
    # Test availability slots caching
    slots = [
        {"time": "09:00", "available": True},
        {"time": "09:30", "available": True},
        {"time": "10:00", "available": False}
    ]
    
    # Cache slots
    if cache_service_obj.cache_availability_slots(barber_id, test_date, 30, slots):
        print("✅ Successfully cached availability slots")
    else:
        print("❌ Failed to cache availability slots")
        return False
    
    # Retrieve cached slots
    cached_slots = cache_service_obj.get_cached_availability_slots(barber_id, test_date, 30)
    if cached_slots and len(cached_slots) == len(slots):
        print("✅ Successfully retrieved cached slots")
    else:
        print("❌ Failed to retrieve cached slots")
        return False
    
    # Test booked slots caching
    booked_slots = {"09:00", "10:30", "14:00"}
    if cache_service_obj.cache_booked_slots(barber_id, test_date, booked_slots):
        print("✅ Successfully cached booked slots")
    else:
        print("❌ Failed to cache booked slots")
        return False
    
    # Invalidate barber availability cache
    count = cache_service_obj.invalidate_barber_availability_cache(barber_id)
    print(f"✅ Invalidated {count} availability cache keys for barber {barber_id}")
    
    return True


def test_cache_invalidation():
    """Test cache invalidation service"""
    print("\n=== Testing Cache Invalidation ===")
    
    # Test user data invalidation
    user_id = 1
    count = cache_invalidator.invalidate_user_data(user_id)
    print(f"✅ Invalidated {count} cache keys for user {user_id}")
    
    # Test appointment data invalidation
    appointment_id = 1
    count = cache_invalidator.invalidate_appointment_data(
        appointment_id=appointment_id,
        user_id=user_id,
        barber_id=1,
        date=date.today()
    )
    print(f"✅ Invalidated {count} cache keys for appointment {appointment_id}")
    
    # Test payment data invalidation
    payment_id = 1
    count = cache_invalidator.invalidate_payment_data(
        payment_id=payment_id,
        user_id=user_id,
        appointment_id=appointment_id
    )
    print(f"✅ Invalidated {count} cache keys for payment {payment_id}")
    
    # Test analytics cache invalidation
    count = cache_invalidator.invalidate_analytics_cache()
    print(f"✅ Invalidated {count} analytics cache keys")
    
    return True


def test_cache_stats():
    """Display cache statistics"""
    print("\n=== Cache Statistics ===")
    
    stats = cache_service.get_stats()
    if stats.get('available'):
        print(f"✅ Redis Version: {stats.get('redis_version', 'N/A')}")
        print(f"✅ Memory Used: {stats.get('memory_used_human', 'N/A')}")
        print(f"✅ Total Keys: {stats.get('db_keys', 'N/A')}")
        print(f"✅ Connected Clients: {stats.get('connected_clients', 'N/A')}")
        print(f"✅ Commands Processed: {stats.get('total_commands_processed', 'N/A')}")
        
        # Show key pattern distribution
        patterns = [
            "analytics:*",
            "user:*",
            "appointment:*",
            "availability:*",
            "booked_slots:*",
            "func:*"
        ]
        
        print("\n📊 Key Pattern Distribution:")
        for pattern in patterns:
            count = len(cache_service.keys(pattern))
            print(f"   {pattern}: {count} keys")
    else:
        print("❌ Redis stats not available")
    
    return True


def main():
    """Run all Redis caching tests"""
    print("🚀 Starting Redis Caching Tests")
    print("=" * 50)
    
    all_passed = True
    
    # Test Redis connection
    if not test_redis_connection():
        print("\n❌ Redis connection failed. Aborting tests.")
        return
    
    # Run tests
    tests = [
        ("Basic Caching", test_basic_caching),
        ("Cache Decorators", test_cache_decorators),
    ]
    
    # Database-dependent tests
    db = SessionLocal()
    try:
        db_tests = [
            ("Analytics Caching", lambda: test_analytics_caching(db)),
            ("Appointment Caching", lambda: test_appointment_caching(db)),
        ]
        tests.extend(db_tests)
    finally:
        db.close()
    
    # Run cache invalidation and stats tests
    tests.extend([
        ("Cache Invalidation", test_cache_invalidation),
        ("Cache Statistics", test_cache_stats)
    ])
    
    # Execute all tests
    for test_name, test_func in tests:
        try:
            if not test_func():
                all_passed = False
                print(f"\n❌ Test '{test_name}' failed")
        except Exception as e:
            all_passed = False
            print(f"\n❌ Test '{test_name}' raised exception: {e}")
    
    # Summary
    print("\n" + "=" * 50)
    if all_passed:
        print("✅ All Redis caching tests passed!")
    else:
        print("❌ Some tests failed. Check the output above.")
    
    # Clear test keys
    print("\n🧹 Cleaning up test keys...")
    test_patterns = ["test:*"]
    for pattern in test_patterns:
        count = invalidate_pattern(pattern)
        if count > 0:
            print(f"   Cleaned {count} keys matching '{pattern}'")


if __name__ == "__main__":
    main()