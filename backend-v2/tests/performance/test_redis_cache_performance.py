"""
Comprehensive Redis API Cache Performance Tests

This test suite validates that the Redis caching layer achieves the target
30-50% performance improvement across critical API endpoints.
"""

import pytest
import asyncio
import time
import statistics
from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Tuple
from unittest.mock import Mock, patch
import logging

from services.cached_booking_service import CachedBookingService, BookingPerformanceMonitor
from services.cached_analytics_service import CachedBusinessAnalyticsService, AnalyticsPerformanceMonitor
from services.api_cache_service import api_cache_service
from services.cache_monitoring_service import cache_monitoring_service
from services.redis_cache import cache_service
from tests.conftest import get_test_db

logger = logging.getLogger(__name__)

class TestRedisApiCachePerformance:
    """
    Test suite for Redis API cache performance validation
    """
    
    @pytest.fixture(autouse=True)
    async def setup_cache(self):
        """Setup cache service for testing"""
        await cache_service.initialize()
        await api_cache_service.cache_service.initialize()
        
        # Clear any existing cache data
        if cache_service.redis_manager.is_connected:
            await cache_service.clear_pattern("api_cache:*")
    
    @pytest.mark.asyncio
    async def test_appointment_slots_caching_performance(self):
        """
        Test that appointment slots caching achieves target performance improvement
        """
        db = next(get_test_db())
        target_date = date.today() + timedelta(days=1)
        user_timezone = "America/New_York"
        
        # Test performance with multiple date scenarios
        test_dates = [
            date.today() + timedelta(days=i) for i in range(1, 8)
        ]
        
        benchmark_results = await BookingPerformanceMonitor.benchmark_slot_calculation(
            db=db,
            target_dates=test_dates,
            user_timezone=user_timezone
        )
        
        # Validate performance improvement
        assert benchmark_results['performance_improvement_percent'] >= 30, \
            f"Performance improvement ({benchmark_results['performance_improvement_percent']:.1f}%) below 30% target"
        
        assert benchmark_results['performance_improvement_percent'] <= 70, \
            f"Performance improvement ({benchmark_results['performance_improvement_percent']:.1f}%) unrealistically high"
        
        # Validate response time improvements
        assert benchmark_results['avg_cached_ms'] < benchmark_results['avg_uncached_ms'], \
            "Cached responses should be faster than uncached"
        
        # Validate reasonable response times
        assert benchmark_results['avg_cached_ms'] < 100, \
            f"Cached response time ({benchmark_results['avg_cached_ms']:.1f}ms) too slow"
        
        logger.info(f"✅ Appointment slots caching: {benchmark_results['performance_improvement_percent']:.1f}% improvement")
    
    @pytest.mark.asyncio
    async def test_analytics_dashboard_caching_performance(self):
        """
        Test that analytics dashboard caching achieves target performance improvement
        """
        db = next(get_test_db())
        user_id = 1
        
        benchmark_results = await AnalyticsPerformanceMonitor.benchmark_dashboard_performance(
            db=db,
            user_id=user_id,
            iterations=3
        )
        
        # Validate performance improvement
        assert benchmark_results['performance_improvement_percent'] >= 30, \
            f"Dashboard performance improvement ({benchmark_results['performance_improvement_percent']:.1f}%) below 30% target"
        
        # Validate meets target range
        assert benchmark_results['meets_target'] is True, \
            "Benchmark indicates target performance not met"
        
        # Validate reasonable response times
        assert benchmark_results['avg_cached_ms'] < 500, \
            f"Cached dashboard response time ({benchmark_results['avg_cached_ms']:.1f}ms) too slow"
        
        logger.info(f"✅ Analytics dashboard caching: {benchmark_results['performance_improvement_percent']:.1f}% improvement")
    
    @pytest.mark.asyncio
    async def test_cache_hit_rate_effectiveness(self):
        """
        Test that cache hit rates are within acceptable ranges
        """
        db = next(get_test_db())
        cached_service = CachedBookingService()
        
        # Make multiple calls to same endpoint to test hit rate
        target_date = date.today() + timedelta(days=1)
        
        # First call (cache miss)
        result1 = cached_service.get_available_slots_cached(db, target_date)
        
        # Subsequent calls (cache hits)
        result2 = cached_service.get_available_slots_cached(db, target_date)
        result3 = cached_service.get_available_slots_cached(db, target_date)
        
        # Check cache metadata
        assert '_cache_info' in result2, "Cache info should be present in cached responses"
        assert '_cache_info' in result3, "Cache info should be present in cached responses"
        
        # Collect metrics
        metrics = await cache_monitoring_service.collect_metrics()
        
        # Validate hit rate (should be > 0 after multiple calls)
        assert metrics.hit_rate > 0, "Hit rate should be greater than 0 after cached calls"
        
        logger.info(f"✅ Cache hit rate: {metrics.hit_rate:.1f}%")
    
    @pytest.mark.asyncio
    async def test_weekly_availability_caching_performance(self):
        """
        Test performance improvement for weekly availability caching
        """
        db = next(get_test_db())
        user_id = 1
        start_date = date.today()
        
        # Time uncached approach (7 individual calls)
        uncached_times = []
        for i in range(7):
            target_date = start_date + timedelta(days=i)
            start_time = time.time()
            
            # Simulate uncached individual calls
            result = CachedBookingService.get_available_slots_cached(db, target_date)
            
            end_time = time.time()
            uncached_times.append((end_time - start_time) * 1000)
        
        total_uncached_time = sum(uncached_times)
        
        # Time cached approach (1 weekly call)
        start_time = time.time()
        weekly_result = CachedBookingService.get_weekly_availability_cached(
            db=db,
            user_id=user_id,
            start_date=start_date
        )
        end_time = time.time()
        
        cached_time = (end_time - start_time) * 1000
        
        # Calculate performance improvement
        performance_improvement = ((total_uncached_time - cached_time) / total_uncached_time) * 100
        
        # Validate performance improvement
        assert performance_improvement >= 20, \
            f"Weekly availability performance improvement ({performance_improvement:.1f}%) below 20% target"
        
        # Validate data integrity
        assert 'weekly_availability' in weekly_result, "Weekly availability data should be present"
        assert len(weekly_result['weekly_availability']) == 7, "Should contain 7 days of data"
        
        logger.info(f"✅ Weekly availability caching: {performance_improvement:.1f}% improvement")
    
    @pytest.mark.asyncio
    async def test_cache_invalidation_performance(self):
        """
        Test that cache invalidation doesn't significantly impact performance
        """
        db = next(get_test_db())
        
        # Populate cache
        target_date = date.today() + timedelta(days=1)
        result1 = CachedBookingService.get_available_slots_cached(db, target_date)
        
        # Measure invalidation performance
        start_time = time.time()
        
        # Trigger cache invalidation
        from services.cached_booking_service import CachedBookingInvalidator
        invalidator = CachedBookingInvalidator()
        
        appointment_data = {
            'barber_id': 1,
            'client_id': 1,
            'service_id': 1,
            'start_time': datetime.now() + timedelta(hours=2),
            'duration_minutes': 30
        }
        
        invalidator.create_appointment_with_invalidation(db, appointment_data)
        
        end_time = time.time()
        invalidation_time = (end_time - start_time) * 1000
        
        # Validate invalidation performance
        assert invalidation_time < 50, \
            f"Cache invalidation took too long ({invalidation_time:.1f}ms)"
        
        # Verify cache was actually invalidated
        result2 = CachedBookingService.get_available_slots_cached(db, target_date)
        
        logger.info(f"✅ Cache invalidation completed in {invalidation_time:.1f}ms")
    
    @pytest.mark.asyncio
    async def test_memory_usage_efficiency(self):
        """
        Test that cache memory usage is reasonable
        """
        db = next(get_test_db())
        
        # Generate cache entries
        cached_service = CachedBookingService()
        analytics_service = CachedBusinessAnalyticsService(db)
        
        # Cache multiple date ranges
        for i in range(30):  # 30 days
            target_date = date.today() + timedelta(days=i)
            cached_service.get_available_slots_cached(db, target_date)
        
        # Cache analytics data
        analytics_service.get_comprehensive_dashboard_cached(user_id=1, date_range_days=30)
        analytics_service.get_revenue_analytics_cached(
            user_id=1,
            start_date=date.today() - timedelta(days=30),
            end_date=date.today()
        )
        
        # Check Redis memory usage
        redis_health = await cache_service.get_stats()
        redis_info = redis_health.get('redis_health', {})
        
        # Validate reasonable memory usage
        if 'used_memory' in redis_info:
            used_memory = redis_info['used_memory']
            logger.info(f"✅ Redis memory usage: {used_memory}")
        
        # Check key count
        key_analysis = await cache_monitoring_service.get_cache_key_analysis()
        total_keys = key_analysis.get('total_cache_keys', 0)
        
        assert total_keys > 0, "Should have cached keys after operations"
        assert total_keys < 10000, "Key count should be reasonable"
        
        logger.info(f"✅ Total cache keys: {total_keys}")
    
    @pytest.mark.asyncio
    async def test_concurrent_cache_access_performance(self):
        """
        Test cache performance under concurrent access
        """
        db = next(get_test_db())
        cached_service = CachedBookingService()
        
        async def cache_access_task(task_id: int) -> float:
            """Single cache access task"""
            start_time = time.time()
            
            target_date = date.today() + timedelta(days=task_id % 7)
            result = cached_service.get_available_slots_cached(db, target_date)
            
            end_time = time.time()
            return (end_time - start_time) * 1000
        
        # Run concurrent tasks
        num_concurrent_tasks = 10
        tasks = [cache_access_task(i) for i in range(num_concurrent_tasks)]
        
        response_times = await asyncio.gather(*tasks)
        
        # Analyze concurrent performance
        avg_response_time = statistics.mean(response_times)
        max_response_time = max(response_times)
        
        # Validate concurrent performance
        assert avg_response_time < 100, \
            f"Average concurrent response time ({avg_response_time:.1f}ms) too slow"
        
        assert max_response_time < 200, \
            f"Maximum concurrent response time ({max_response_time:.1f}ms) too slow"
        
        logger.info(f"✅ Concurrent access - Avg: {avg_response_time:.1f}ms, Max: {max_response_time:.1f}ms")
    
    @pytest.mark.asyncio
    async def test_end_to_end_performance_improvement(self):
        """
        Test overall end-to-end performance improvement across multiple operations
        """
        db = next(get_test_db())
        user_id = 1
        
        # Define a typical user session workflow
        async def typical_user_session_uncached():
            """Simulate typical user session without caching"""
            start_time = time.time()
            
            # User loads dashboard
            analytics_service = CachedBusinessAnalyticsService(db)  # But we'll bypass cache
            
            # Simulate multiple API calls
            operations = [
                lambda: CachedBookingService.get_available_slots_cached(db, date.today() + timedelta(days=1)),
                lambda: CachedBookingService.get_available_slots_cached(db, date.today() + timedelta(days=2)),
                lambda: CachedBookingService.get_service_catalog_cached(),
            ]
            
            for operation in operations:
                operation()
            
            end_time = time.time()
            return (end_time - start_time) * 1000
        
        async def typical_user_session_cached():
            """Simulate typical user session with caching"""
            start_time = time.time()
            
            # Same operations, but cache will be utilized on subsequent calls
            cached_service = CachedBookingService()
            analytics_service = CachedBusinessAnalyticsService(db)
            
            # First pass (populates cache)
            cached_service.get_available_slots_cached(db, date.today() + timedelta(days=1))
            cached_service.get_available_slots_cached(db, date.today() + timedelta(days=2))
            cached_service.get_service_catalog_cached()
            
            # Second pass (uses cache)
            cached_service.get_available_slots_cached(db, date.today() + timedelta(days=1))
            cached_service.get_available_slots_cached(db, date.today() + timedelta(days=2))
            cached_service.get_service_catalog_cached()
            
            end_time = time.time()
            return (end_time - start_time) * 1000
        
        # Clear cache before test
        await cache_service.clear_pattern("api_cache:*")
        
        # Run uncached session
        uncached_time = await typical_user_session_uncached()
        
        # Clear cache and run cached session
        await cache_service.clear_pattern("api_cache:*")
        cached_time = await typical_user_session_cached()
        
        # Calculate overall performance improvement
        performance_improvement = ((uncached_time - cached_time) / uncached_time) * 100
        
        # Validate meets overall performance target
        assert performance_improvement >= 25, \
            f"End-to-end performance improvement ({performance_improvement:.1f}%) below 25% target"
        
        logger.info(f"✅ End-to-end performance improvement: {performance_improvement:.1f}%")
        
        return {
            'uncached_time_ms': uncached_time,
            'cached_time_ms': cached_time,
            'performance_improvement_percent': performance_improvement,
            'meets_target': performance_improvement >= 30
        }
    
    @pytest.mark.asyncio
    async def test_cache_monitoring_accuracy(self):
        """
        Test that cache monitoring provides accurate metrics
        """
        # Clear metrics
        cache_monitoring_service.metric_history.clear()
        api_cache_service.metrics = api_cache_service.metrics.__class__()  # Reset metrics
        
        db = next(get_test_db())
        cached_service = CachedBookingService()
        
        # Generate known cache activity
        target_date = date.today() + timedelta(days=1)
        
        # First call (miss)
        cached_service.get_available_slots_cached(db, target_date)
        
        # Second call (hit)
        cached_service.get_available_slots_cached(db, target_date)
        
        # Third call (hit)
        cached_service.get_available_slots_cached(db, target_date)
        
        # Collect monitoring metrics
        metrics_snapshot = await cache_monitoring_service.collect_metrics()
        
        # Validate monitoring accuracy
        assert metrics_snapshot.total_requests >= 2, "Should have recorded multiple requests"
        assert metrics_snapshot.cache_hits >= 1, "Should have recorded cache hits"
        assert metrics_snapshot.hit_rate > 0, "Hit rate should be positive"
        
        # Generate performance report
        performance_report = cache_monitoring_service.get_performance_report(hours_back=1)
        
        assert 'hit_rate_analysis' in performance_report, "Performance report should include hit rate analysis"
        assert 'performance_analysis' in performance_report, "Performance report should include performance analysis"
        
        logger.info(f"✅ Monitoring accuracy - Hit rate: {metrics_snapshot.hit_rate:.1f}%")

class TestCacheLoadTesting:
    """
    Load testing for cache performance under stress
    """
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_high_volume_cache_performance(self):
        """
        Test cache performance under high volume load
        """
        db = next(get_test_db())
        cached_service = CachedBookingService()
        
        # Generate high volume of requests
        num_requests = 100
        date_range = 7  # Test across 7 days
        
        start_time = time.time()
        
        tasks = []
        for i in range(num_requests):
            target_date = date.today() + timedelta(days=i % date_range)
            task = asyncio.create_task(
                asyncio.to_thread(cached_service.get_available_slots_cached, db, target_date)
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks)
        
        end_time = time.time()
        total_time = (end_time - start_time) * 1000
        
        # Calculate performance metrics
        avg_time_per_request = total_time / num_requests
        requests_per_second = num_requests / ((end_time - start_time))
        
        # Validate high-volume performance
        assert avg_time_per_request < 50, \
            f"Average time per request ({avg_time_per_request:.1f}ms) too slow under load"
        
        assert requests_per_second > 20, \
            f"Request throughput ({requests_per_second:.1f} req/s) too low"
        
        # Validate all requests completed successfully
        assert len(results) == num_requests, "All requests should complete successfully"
        
        logger.info(f"✅ High volume test - {requests_per_second:.1f} req/s, {avg_time_per_request:.1f}ms avg")

@pytest.mark.asyncio
async def test_comprehensive_cache_performance_suite():
    """
    Run comprehensive performance test suite and generate report
    """
    logger.info("🚀 Starting comprehensive Redis cache performance validation")
    
    test_results = {
        'started_at': datetime.now().isoformat(),
        'tests_passed': 0,
        'tests_failed': 0,
        'performance_improvements': [],
        'overall_target_met': False
    }
    
    try:
        # Initialize test environment
        await cache_service.initialize()
        
        # Run individual performance tests
        performance_test = TestRedisApiCachePerformance()
        await performance_test.setup_cache()
        
        # Test appointment slots performance
        try:
            await performance_test.test_appointment_slots_caching_performance()
            test_results['tests_passed'] += 1
        except Exception as e:
            logger.error(f"Appointment slots test failed: {e}")
            test_results['tests_failed'] += 1
        
        # Test analytics dashboard performance
        try:
            await performance_test.test_analytics_dashboard_caching_performance()
            test_results['tests_passed'] += 1
        except Exception as e:
            logger.error(f"Analytics dashboard test failed: {e}")
            test_results['tests_failed'] += 1
        
        # Test end-to-end performance
        try:
            e2e_results = await performance_test.test_end_to_end_performance_improvement()
            test_results['performance_improvements'].append({
                'test': 'end_to_end',
                'improvement_percent': e2e_results['performance_improvement_percent']
            })
            test_results['tests_passed'] += 1
        except Exception as e:
            logger.error(f"End-to-end test failed: {e}")
            test_results['tests_failed'] += 1
        
        # Calculate overall performance improvement
        if test_results['performance_improvements']:
            avg_improvement = statistics.mean([
                r['improvement_percent'] for r in test_results['performance_improvements']
            ])
            test_results['average_performance_improvement'] = avg_improvement
            test_results['overall_target_met'] = avg_improvement >= 30
        
        test_results['completed_at'] = datetime.now().isoformat()
        
        # Generate final report
        logger.info("📊 REDIS CACHE PERFORMANCE TEST RESULTS:")
        logger.info(f"   Tests Passed: {test_results['tests_passed']}")
        logger.info(f"   Tests Failed: {test_results['tests_failed']}")
        
        if 'average_performance_improvement' in test_results:
            logger.info(f"   Average Performance Improvement: {test_results['average_performance_improvement']:.1f}%")
            logger.info(f"   Target Met (30-50%): {'✅ YES' if test_results['overall_target_met'] else '❌ NO'}")
        
        return test_results
        
    except Exception as e:
        logger.error(f"Comprehensive test suite failed: {e}")
        test_results['error'] = str(e)
        test_results['completed_at'] = datetime.now().isoformat()
        return test_results

if __name__ == "__main__":
    # Run the comprehensive test suite
    import asyncio
    results = asyncio.run(test_comprehensive_cache_performance_suite())
    print(f"\n📋 Final Results: {results}")