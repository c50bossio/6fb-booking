"""
Comprehensive Performance Test Suite for 6FB Booking Platform
Tests API response times, database performance, caching, and scalability
"""

import pytest
import asyncio
import time
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock
import redis
import psutil
import json

from main import app
from services.redis_service import RedisService
from services.cache_monitoring_service import CacheMonitoringService
from services.performance_monitoring import PerformanceTracker
from services.database_monitor import DatabaseMonitor

client = TestClient(app)

class TestAPIPerformance:
    """Test API endpoint performance and response times"""
    
    def test_api_response_time_targets(self):
        """Test that API endpoints meet response time targets (<400ms)"""
        critical_endpoints = [
            ("/api/v2/health", "GET", 100),  # Health check: <100ms
            ("/api/v2/auth/me", "GET", 200),  # Auth check: <200ms
            ("/api/v2/appointments", "GET", 400),  # Appointments list: <400ms
            ("/api/v2/services", "GET", 300),  # Services list: <300ms
            ("/api/v2/barber-availability", "GET", 400),  # Availability: <400ms
        ]
        
        performance_results = []
        
        for endpoint, method, target_ms in critical_endpoints:
            times = []
            
            # Run multiple requests to get average
            for _ in range(10):
                start_time = time.time()
                
                if method == "GET":
                    response = client.get(
                        endpoint,
                        headers={"Authorization": "Bearer dev-token-bypass"}
                    )
                else:
                    response = client.request(
                        method,
                        endpoint,
                        headers={"Authorization": "Bearer dev-token-bypass"}
                    )
                
                end_time = time.time()
                response_time_ms = (end_time - start_time) * 1000
                times.append(response_time_ms)
                
                assert response.status_code in [200, 201, 404], f"Endpoint {endpoint} failed"
            
            avg_time = statistics.mean(times)
            p95_time = statistics.quantiles(times, n=20)[18]  # 95th percentile
            
            performance_results.append({
                "endpoint": endpoint,
                "avg_time": avg_time,
                "p95_time": p95_time,
                "target": target_ms
            })
            
            assert avg_time < target_ms, f"{endpoint} avg time {avg_time:.2f}ms exceeds target {target_ms}ms"
            assert p95_time < target_ms * 1.5, f"{endpoint} P95 time {p95_time:.2f}ms too high"
        
        # Log performance results for analysis
        print("\nAPI Performance Results:")
        for result in performance_results:
            print(f"{result['endpoint']}: {result['avg_time']:.2f}ms avg, {result['p95_time']:.2f}ms P95 (target: {result['target']}ms)")
    
    def test_concurrent_api_performance(self):
        """Test API performance under concurrent load"""
        endpoint = "/api/v2/appointments"
        concurrent_users = 20
        requests_per_user = 5
        
        def make_request():
            """Single request function for threading"""
            start_time = time.time()
            response = client.get(
                endpoint,
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
            end_time = time.time()
            return {
                "status_code": response.status_code,
                "response_time": (end_time - start_time) * 1000,
                "success": response.status_code == 200
            }
        
        # Execute concurrent requests
        results = []
        with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            futures = []
            
            for user in range(concurrent_users):
                for request in range(requests_per_user):
                    futures.append(executor.submit(make_request))
            
            for future in as_completed(futures):
                results.append(future.result())
        
        # Analyze results
        success_rate = sum(1 for r in results if r["success"]) / len(results)
        avg_response_time = statistics.mean([r["response_time"] for r in results])
        max_response_time = max([r["response_time"] for r in results])
        
        assert success_rate >= 0.95, f"Success rate {success_rate:.2%} below 95%"
        assert avg_response_time < 800, f"Average response time {avg_response_time:.2f}ms too high under load"
        assert max_response_time < 2000, f"Max response time {max_response_time:.2f}ms too high"
        
        print(f"\nConcurrent Load Results:")
        print(f"Requests: {len(results)}, Success rate: {success_rate:.2%}")
        print(f"Avg response time: {avg_response_time:.2f}ms, Max: {max_response_time:.2f}ms")
    
    def test_database_query_performance(self):
        """Test database query performance optimization"""
        # Test complex queries that should be optimized
        complex_queries = [
            "/api/v2/analytics/revenue?period=monthly",
            "/api/v2/appointments?date_range=30_days&include_details=true",
            "/api/v2/clients?include_stats=true&limit=100",
            "/api/v2/barbers?include_availability=true&include_stats=true"
        ]
        
        for endpoint in complex_queries:
            start_time = time.time()
            response = client.get(
                endpoint,
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
            query_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                assert query_time < 1000, f"Complex query {endpoint} took {query_time:.2f}ms (>1s)"
                
                # Verify query returns reasonable amount of data
                data = response.json()
                if isinstance(data, list):
                    assert len(data) <= 1000, f"Query returned too many records: {len(data)}"
    
    def test_api_memory_usage(self):
        """Test API memory usage stays within acceptable limits"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Make many requests to stress test memory
        endpoints = [
            "/api/v2/appointments",
            "/api/v2/clients",
            "/api/v2/services",
            "/api/v2/barber-availability"
        ]
        
        for _ in range(100):
            for endpoint in endpoints:
                response = client.get(
                    endpoint,
                    headers={"Authorization": "Bearer dev-token-bypass"}
                )
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        assert memory_increase < 100, f"Memory increased by {memory_increase:.2f}MB (should be <100MB)"
        print(f"Memory usage: {initial_memory:.2f}MB -> {final_memory:.2f}MB (increase: {memory_increase:.2f}MB)")


class TestCachingPerformance:
    """Test Redis caching performance and optimization"""
    
    @pytest.fixture
    def redis_service(self):
        """Create Redis service instance for testing"""
        return RedisService()
    
    @pytest.mark.asyncio
    async def test_cache_hit_rates(self, redis_service):
        """Test cache hit rates for frequently accessed data"""
        # Warm up cache with common queries
        cache_keys = [
            "services_list",
            "barber_availability_today",
            "popular_services",
            "business_hours"
        ]
        
        # First requests should miss cache
        for key in cache_keys:
            await redis_service.get(key)  # Cache miss
        
        # Populate cache
        test_data = {"test": "data", "timestamp": time.time()}
        for key in cache_keys:
            await redis_service.set(key, test_data, expire=300)
        
        # Test cache hits
        hit_count = 0
        total_requests = len(cache_keys) * 10
        
        for _ in range(10):
            for key in cache_keys:
                cached_data = await redis_service.get(key)
                if cached_data is not None:
                    hit_count += 1
        
        hit_rate = hit_count / total_requests
        assert hit_rate >= 0.95, f"Cache hit rate {hit_rate:.2%} below 95%"
    
    @pytest.mark.asyncio
    async def test_cache_performance_benchmarks(self, redis_service):
        """Test cache performance benchmarks"""
        # Test SET performance
        set_times = []
        for i in range(100):
            start_time = time.time()
            await redis_service.set(f"benchmark_key_{i}", {"data": f"value_{i}"})
            set_time = (time.time() - start_time) * 1000
            set_times.append(set_time)
        
        avg_set_time = statistics.mean(set_times)
        assert avg_set_time < 5, f"Average SET time {avg_set_time:.2f}ms too high"
        
        # Test GET performance
        get_times = []
        for i in range(100):
            start_time = time.time()
            await redis_service.get(f"benchmark_key_{i}")
            get_time = (time.time() - start_time) * 1000
            get_times.append(get_time)
        
        avg_get_time = statistics.mean(get_times)
        assert avg_get_time < 3, f"Average GET time {avg_get_time:.2f}ms too high"
        
        print(f"Cache Performance: SET {avg_set_time:.2f}ms, GET {avg_get_time:.2f}ms")
    
    @pytest.mark.asyncio
    async def test_cache_memory_usage(self, redis_service):
        """Test cache memory usage and optimization"""
        # Fill cache with test data
        large_data = {"data": "x" * 1000}  # 1KB per entry
        
        for i in range(1000):
            await redis_service.set(f"memory_test_{i}", large_data, expire=300)
        
        # Check memory usage
        memory_info = await redis_service.get_memory_usage()
        assert memory_info["used_memory_mb"] < 100, "Cache using too much memory"
        
        # Test cache eviction
        for i in range(2000, 3000):  # Add more data to trigger eviction
            await redis_service.set(f"memory_test_{i}", large_data, expire=300)
        
        # Verify old data was evicted
        old_data_exists = await redis_service.get("memory_test_0")
        if memory_info["used_memory_mb"] > 50:  # If memory pressure exists
            assert old_data_exists is None, "Cache eviction not working properly"
    
    @pytest.mark.asyncio
    async def test_cache_invalidation_performance(self, redis_service):
        """Test cache invalidation strategies"""
        # Create cache entries with dependencies
        cache_dependencies = {
            "user_1_appointments": ["user_1", "appointments"],
            "user_1_services": ["user_1", "services"],
            "barber_2_schedule": ["barber_2", "schedules"],
            "business_analytics": ["analytics", "revenue", "appointments"]
        }
        
        for cache_key, deps in cache_dependencies.items():
            await redis_service.set(cache_key, {"dependencies": deps})
        
        # Test bulk invalidation
        start_time = time.time()
        await redis_service.invalidate_by_pattern("user_1_*")
        invalidation_time = (time.time() - start_time) * 1000
        
        assert invalidation_time < 50, f"Cache invalidation took {invalidation_time:.2f}ms"
        
        # Verify invalidation worked
        user_appointments = await redis_service.get("user_1_appointments")
        user_services = await redis_service.get("user_1_services")
        barber_schedule = await redis_service.get("barber_2_schedule")
        
        assert user_appointments is None
        assert user_services is None
        assert barber_schedule is not None  # Should not be invalidated


class TestDatabasePerformance:
    """Test database performance and optimization"""
    
    @pytest.fixture
    def db_monitor(self):
        """Create database monitor instance"""
        return DatabaseMonitor()
    
    @pytest.mark.asyncio
    async def test_query_execution_times(self, db_monitor):
        """Test database query execution time optimization"""
        # Test common queries that should be fast
        fast_queries = [
            "SELECT COUNT(*) FROM users WHERE active = true",
            "SELECT * FROM services WHERE active = true LIMIT 20",
            "SELECT * FROM appointments WHERE appointment_date >= CURRENT_DATE LIMIT 50"
        ]
        
        for query in fast_queries:
            execution_time = await db_monitor.measure_query_time(query)
            assert execution_time < 100, f"Query took {execution_time:.2f}ms: {query}"
    
    @pytest.mark.asyncio
    async def test_index_effectiveness(self, db_monitor):
        """Test that database indexes are effective"""
        # Test queries that should use indexes
        indexed_queries = [
            ("SELECT * FROM users WHERE email = 'test@example.com'", "email_index"),
            ("SELECT * FROM appointments WHERE user_id = 1", "user_id_index"),
            ("SELECT * FROM appointments WHERE appointment_date = '2024-12-01'", "date_index")
        ]
        
        for query, expected_index in indexed_queries:
            query_plan = await db_monitor.explain_query(query)
            
            # Verify index is being used (specific implementation depends on database)
            if "Index Scan" in str(query_plan) or "index" in str(query_plan).lower():
                print(f"✓ Query using index: {expected_index}")
            else:
                pytest.warning(f"Query may not be using index {expected_index}: {query}")
    
    @pytest.mark.asyncio
    async def test_connection_pool_performance(self, db_monitor):
        """Test database connection pool performance"""
        # Test concurrent database access
        async def db_query():
            return await db_monitor.execute_query("SELECT 1")
        
        # Execute concurrent queries
        start_time = time.time()
        tasks = [db_query() for _ in range(50)]
        results = await asyncio.gather(*tasks)
        total_time = time.time() - start_time
        
        success_count = sum(1 for r in results if r is not None)
        success_rate = success_count / len(results)
        
        assert success_rate >= 0.98, f"Database connection success rate {success_rate:.2%} too low"
        assert total_time < 5, f"50 concurrent queries took {total_time:.2f}s"
        
        # Check for connection pool exhaustion
        pool_stats = await db_monitor.get_connection_pool_stats()
        assert pool_stats["active_connections"] <= pool_stats["max_connections"]
    
    @pytest.mark.asyncio
    async def test_query_optimization_suggestions(self, db_monitor):
        """Test automated query optimization suggestions"""
        # Identify slow queries
        slow_queries = await db_monitor.identify_slow_queries(threshold_ms=500)
        
        for query_info in slow_queries:
            # Get optimization suggestions
            suggestions = await db_monitor.get_optimization_suggestions(query_info["query"])
            
            assert len(suggestions) > 0, f"No optimization suggestions for slow query: {query_info['query']}"
            
            # Verify suggestions are actionable
            for suggestion in suggestions:
                assert "action" in suggestion
                assert "impact" in suggestion
                assert suggestion["impact"] in ["high", "medium", "low"]


class TestScalabilityAndLoad:
    """Test system scalability and load handling"""
    
    def test_user_scalability_simulation(self):
        """Test system behavior with increasing user load"""
        user_loads = [1, 5, 10, 20, 50]
        performance_metrics = []
        
        for user_count in user_loads:
            # Simulate concurrent users
            start_time = time.time()
            
            def user_session():
                """Simulate a user session with multiple requests"""
                session_requests = [
                    "/api/v2/auth/me",
                    "/api/v2/appointments",
                    "/api/v2/services",
                    "/api/v2/barber-availability"
                ]
                
                session_times = []
                for endpoint in session_requests:
                    req_start = time.time()
                    response = client.get(
                        endpoint,
                        headers={"Authorization": "Bearer dev-token-bypass"}
                    )
                    req_time = time.time() - req_start
                    session_times.append(req_time)
                
                return {
                    "total_time": sum(session_times),
                    "avg_time": statistics.mean(session_times),
                    "success": all(t < 2.0 for t in session_times)  # All requests under 2s
                }
            
            # Execute concurrent user sessions
            with ThreadPoolExecutor(max_workers=user_count) as executor:
                futures = [executor.submit(user_session) for _ in range(user_count)]
                results = [future.result() for future in as_completed(futures)]
            
            total_time = time.time() - start_time
            success_rate = sum(1 for r in results if r["success"]) / len(results)
            avg_session_time = statistics.mean([r["total_time"] for r in results])
            
            performance_metrics.append({
                "users": user_count,
                "success_rate": success_rate,
                "avg_session_time": avg_session_time,
                "total_time": total_time
            })
            
            # Verify performance doesn't degrade significantly
            assert success_rate >= 0.90, f"Success rate {success_rate:.2%} too low for {user_count} users"
        
        # Analyze scalability trend
        print("\nScalability Test Results:")
        for metrics in performance_metrics:
            print(f"Users: {metrics['users']}, Success: {metrics['success_rate']:.2%}, "
                  f"Avg Session: {metrics['avg_session_time']:.2f}s")
        
        # Verify reasonable scaling (performance shouldn't degrade exponentially)
        if len(performance_metrics) >= 3:
            degradation = (performance_metrics[-1]["avg_session_time"] / 
                          performance_metrics[0]["avg_session_time"])
            assert degradation < 3.0, f"Performance degraded {degradation:.1f}x with load"
    
    def test_memory_scalability(self):
        """Test memory usage scaling with load"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Simulate increasing data processing load
        data_sizes = [100, 500, 1000, 2000]  # Number of records to process
        
        for size in data_sizes:
            # Create test data
            test_data = [{"id": i, "data": f"test_data_{i}" * 10} for i in range(size)]
            
            # Process data through API
            response = client.post(
                "/api/v2/test-data/bulk-process",
                json={"records": test_data},
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
            
            current_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_per_record = (current_memory - initial_memory) / size
            
            # Memory usage should be reasonable per record
            assert memory_per_record < 0.1, f"Using {memory_per_record:.3f}MB per record"
            
            # Trigger garbage collection
            import gc
            gc.collect()
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        total_increase = final_memory - initial_memory
        
        assert total_increase < 200, f"Memory increased by {total_increase:.2f}MB total"
    
    def test_error_rate_under_load(self):
        """Test error rates remain acceptable under high load"""
        # Stress test with high concurrent load
        concurrent_requests = 100
        total_requests = 500
        
        error_counts = {"4xx": 0, "5xx": 0, "timeouts": 0, "success": 0}
        
        def make_stress_request():
            try:
                start_time = time.time()
                response = client.get(
                    "/api/v2/appointments",
                    headers={"Authorization": "Bearer dev-token-bypass"},
                    timeout=5  # 5 second timeout
                )
                response_time = time.time() - start_time
                
                if response.status_code < 400:
                    error_counts["success"] += 1
                elif response.status_code < 500:
                    error_counts["4xx"] += 1
                else:
                    error_counts["5xx"] += 1
                
                return response_time
                
            except Exception as e:
                error_counts["timeouts"] += 1
                return None
        
        # Execute stress test
        with ThreadPoolExecutor(max_workers=concurrent_requests) as executor:
            futures = [executor.submit(make_stress_request) for _ in range(total_requests)]
            response_times = [future.result() for future in as_completed(futures)]
        
        # Calculate error rates
        total_requests_made = sum(error_counts.values())
        success_rate = error_counts["success"] / total_requests_made
        error_5xx_rate = error_counts["5xx"] / total_requests_made
        timeout_rate = error_counts["timeouts"] / total_requests_made
        
        # Assert acceptable error rates
        assert success_rate >= 0.95, f"Success rate {success_rate:.2%} below 95%"
        assert error_5xx_rate <= 0.01, f"5xx error rate {error_5xx_rate:.2%} above 1%"
        assert timeout_rate <= 0.02, f"Timeout rate {timeout_rate:.2%} above 2%"
        
        print(f"\nStress Test Results (N={total_requests}):")
        print(f"Success: {error_counts['success']} ({success_rate:.2%})")
        print(f"4xx errors: {error_counts['4xx']}")
        print(f"5xx errors: {error_counts['5xx']} ({error_5xx_rate:.2%})")
        print(f"Timeouts: {error_counts['timeouts']} ({timeout_rate:.2%})")


class TestResourceMonitoring:
    """Test system resource monitoring and alerting"""
    
    @pytest.mark.asyncio
    async def test_performance_monitoring_integration(self):
        """Test integration with performance monitoring service"""
        performance_tracker = PerformanceTracker()
        
        # Start monitoring
        await performance_tracker.start_monitoring()
        
        # Generate some load
        for _ in range(10):
            response = client.get(
                "/api/v2/appointments",
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
        
        # Get performance metrics
        metrics = await performance_tracker.get_current_metrics()
        
        assert "cpu_usage" in metrics
        assert "memory_usage" in metrics
        assert "response_times" in metrics
        assert "request_count" in metrics
        
        # Verify metrics are reasonable
        assert 0 <= metrics["cpu_usage"] <= 100
        assert metrics["memory_usage"] > 0
        assert len(metrics["response_times"]) > 0
    
    @pytest.mark.asyncio
    async def test_alert_thresholds(self):
        """Test performance alert threshold detection"""
        performance_tracker = PerformanceTracker()
        
        # Configure test thresholds
        thresholds = {
            "response_time_p95": 1000,  # 1 second
            "error_rate": 0.05,  # 5%
            "cpu_usage": 80,  # 80%
            "memory_usage": 85  # 85%
        }
        
        await performance_tracker.set_alert_thresholds(thresholds)
        
        # Simulate threshold breach
        test_metrics = {
            "response_time_p95": 1200,  # Above threshold
            "error_rate": 0.03,  # Below threshold
            "cpu_usage": 85,  # Above threshold
            "memory_usage": 70  # Below threshold
        }
        
        alerts = await performance_tracker.check_thresholds(test_metrics)
        
        assert len(alerts) == 2  # Should trigger 2 alerts
        alert_types = [alert["metric"] for alert in alerts]
        assert "response_time_p95" in alert_types
        assert "cpu_usage" in alert_types
        assert "error_rate" not in alert_types
        assert "memory_usage" not in alert_types


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "--asyncio-mode=auto"])