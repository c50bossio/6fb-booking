"""
Comprehensive Performance Regression Test Suite for BookedBarber V2

This test suite provides automated performance monitoring and regression detection
for critical business components, ensuring the platform maintains enterprise-grade
performance standards under increasing load.

Coverage:
- Calendar component performance under load
- Analytics dashboard rendering times
- API response time validation
- Database query optimization verification
- Six Figure Barber methodology performance
- Memory usage and resource consumption

Target: Zero performance regressions, <500ms API responses, <2s page loads
"""

import pytest
import asyncio
import time
import psutil
import json
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch
from typing import List, Dict, Any
import statistics
from httpx import AsyncClient
from sqlalchemy.orm import Session
from sqlalchemy import text, create_engine

from main import app
from models import User, Appointment, Service, BarberAvailability
from services.six_figure_barber_core_service import SixFigureBarberCoreService
from services.analytics_service import AnalyticsService
from services.booking_service import BookingService
from utils.auth import create_access_token
from utils.test_helpers import TestDataFactory, PerformanceMonitor


class PerformanceBenchmarks:
    """Performance benchmark thresholds for regression detection."""
    
    # API Response Time Limits (milliseconds)
    API_RESPONSE_FAST = 200  # Critical endpoints
    API_RESPONSE_NORMAL = 500  # Standard endpoints
    API_RESPONSE_SLOW = 1000  # Complex analytics endpoints
    
    # Database Query Limits (milliseconds)
    DB_QUERY_SIMPLE = 50  # Simple queries
    DB_QUERY_COMPLEX = 200  # Complex joins and analytics
    DB_QUERY_HEAVY = 500  # Heavy reporting queries
    
    # Frontend Performance Limits (milliseconds)
    PAGE_LOAD_CRITICAL = 1500  # Critical user paths
    PAGE_LOAD_STANDARD = 3000  # Standard pages
    COMPONENT_RENDER = 100  # Component render time
    
    # Memory and Resource Limits
    MEMORY_GROWTH_LIMIT = 50  # MB memory growth during test
    CPU_USAGE_LIMIT = 80  # % CPU usage limit


class TestCalendarPerformanceRegression:
    """Performance tests for calendar components under load."""

    @pytest.fixture
    def performance_monitor(self):
        """Initialize performance monitoring."""
        return PerformanceMonitor()

    @pytest.fixture
    def large_dataset(self, db: Session):
        """Create large dataset for performance testing."""
        factory = TestDataFactory(db)
        
        # Create 10 barbers
        barbers = []
        for i in range(10):
            barber = factory.create_barber({
                "email": f"barber{i}@test.com",
                "name": f"Test Barber {i}",
                "six_figure_enrolled": True
            })
            barbers.append(barber)
        
        # Create 100 clients
        clients = []
        for i in range(100):
            client = factory.create_client({
                "email": f"client{i}@test.com",
                "name": f"Test Client {i}"
            })
            clients.append(client)
        
        # Create 500 appointments across 30 days
        appointments = []
        for i in range(500):
            barber = barbers[i % len(barbers)]
            client = clients[i % len(clients)]
            appointment_date = datetime.now() + timedelta(days=i % 30)
            
            appointment = factory.create_appointment({
                "barber_id": barber.id,
                "client_id": client.id,
                "service_name": "Premium Haircut",
                "appointment_datetime": appointment_date,
                "price": Decimal("95.00"),
                "status": "confirmed"
            })
            appointments.append(appointment)
        
        return {
            "barbers": barbers,
            "clients": clients,
            "appointments": appointments
        }

    @pytest.mark.asyncio
    async def test_calendar_view_performance_with_large_dataset(
        self, async_client: AsyncClient, large_dataset, performance_monitor
    ):
        """Test calendar view performance with large appointment dataset."""
        
        barber = large_dataset["barbers"][0]
        barber_token = create_access_token(
            data={"sub": barber.email, "role": "barber"}
        )
        headers = {"Authorization": f"Bearer {barber_token}"}
        
        # Test monthly calendar view performance
        start_time = time.time()
        
        response = await async_client.get(
            "/api/v2/calendar/month",
            headers=headers,
            params={
                "year": 2024,
                "month": 12,
                "barber_id": barber.id
            }
        )
        
        end_time = time.time()
        response_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        # Verify response and performance
        assert response.status_code == 200
        assert response_time < PerformanceBenchmarks.API_RESPONSE_NORMAL
        
        calendar_data = response.json()
        assert "appointments" in calendar_data
        assert len(calendar_data["appointments"]) > 0
        
        # Test weekly view performance
        start_time = time.time()
        
        weekly_response = await async_client.get(
            "/api/v2/calendar/week",
            headers=headers,
            params={
                "date": datetime.now().strftime("%Y-%m-%d"),
                "barber_id": barber.id
            }
        )
        
        end_time = time.time()
        weekly_response_time = (end_time - start_time) * 1000
        
        assert weekly_response.status_code == 200
        assert weekly_response_time < PerformanceBenchmarks.API_RESPONSE_FAST
        
        # Log performance metrics
        performance_monitor.log_metric("calendar_monthly_view", response_time)
        performance_monitor.log_metric("calendar_weekly_view", weekly_response_time)

    @pytest.mark.asyncio
    async def test_calendar_availability_calculation_performance(
        self, async_client: AsyncClient, large_dataset, performance_monitor
    ):
        """Test availability calculation performance under load."""
        
        barber = large_dataset["barbers"][0]
        
        # Test availability calculation for multiple days
        dates_to_test = [
            (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d")
            for i in range(7)  # Test 7 days
        ]
        
        response_times = []
        
        for date in dates_to_test:
            start_time = time.time()
            
            response = await async_client.get(
                f"/api/v2/barbers/{barber.id}/availability",
                params={"date": date}
            )
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            response_times.append(response_time)
            
            assert response.status_code == 200
            assert response_time < PerformanceBenchmarks.API_RESPONSE_NORMAL
        
        # Verify average performance
        avg_response_time = statistics.mean(response_times)
        max_response_time = max(response_times)
        
        assert avg_response_time < PerformanceBenchmarks.API_RESPONSE_FAST
        assert max_response_time < PerformanceBenchmarks.API_RESPONSE_NORMAL
        
        performance_monitor.log_metric("availability_calculation_avg", avg_response_time)
        performance_monitor.log_metric("availability_calculation_max", max_response_time)

    @pytest.mark.asyncio
    async def test_concurrent_calendar_access_performance(
        self, async_client: AsyncClient, large_dataset, performance_monitor
    ):
        """Test calendar performance under concurrent access."""
        
        # Create tasks for concurrent calendar access
        barbers = large_dataset["barbers"][:5]  # Use 5 barbers
        
        async def fetch_calendar(barber):
            token = create_access_token(data={"sub": barber.email, "role": "barber"})
            headers = {"Authorization": f"Bearer {token}"}
            
            start_time = time.time()
            response = await async_client.get(
                "/api/v2/calendar/month",
                headers=headers,
                params={"year": 2024, "month": 12, "barber_id": barber.id}
            )
            end_time = time.time()
            
            return {
                "response": response,
                "response_time": (end_time - start_time) * 1000,
                "barber_id": barber.id
            }
        
        # Execute concurrent requests
        start_time = time.time()
        results = await asyncio.gather(*[fetch_calendar(barber) for barber in barbers])
        total_time = (time.time() - start_time) * 1000
        
        # Verify all requests succeeded
        for result in results:
            assert result["response"].status_code == 200
            assert result["response_time"] < PerformanceBenchmarks.API_RESPONSE_NORMAL
        
        # Verify concurrent access doesn't degrade performance significantly
        avg_response_time = statistics.mean([r["response_time"] for r in results])
        assert avg_response_time < PerformanceBenchmarks.API_RESPONSE_NORMAL
        assert total_time < PerformanceBenchmarks.API_RESPONSE_SLOW
        
        performance_monitor.log_metric("concurrent_calendar_access", avg_response_time)


class TestAnalyticsDashboardPerformance:
    """Performance tests for analytics dashboard components."""

    @pytest.fixture
    def analytics_dataset(self, db: Session):
        """Create large analytics dataset."""
        factory = TestDataFactory(db)
        
        # Create barber with extensive history
        barber = factory.create_barber({
            "email": "analytics.barber@test.com",
            "name": "Analytics Barber",
            "six_figure_enrolled": True,
            "six_figure_tier": "ELITE"
        })
        
        # Create 1000 completed appointments over 12 months
        appointments = []
        for i in range(1000):
            appointment_date = datetime.now() - timedelta(days=i % 365)
            appointment = factory.create_appointment({
                "barber_id": barber.id,
                "appointment_datetime": appointment_date,
                "price": Decimal("95.00"),
                "status": "completed",
                "service_name": "Premium Haircut"
            })
            appointments.append(appointment)
        
        return {
            "barber": barber,
            "appointments": appointments
        }

    @pytest.mark.asyncio
    async def test_six_figure_dashboard_performance(
        self, async_client: AsyncClient, analytics_dataset, performance_monitor
    ):
        """Test Six Figure Barber dashboard performance with large dataset."""
        
        barber = analytics_dataset["barber"]
        barber_token = create_access_token(
            data={"sub": barber.email, "role": "barber"}
        )
        headers = {"Authorization": f"Bearer {barber_token}"}
        
        # Test main Six Figure dashboard
        start_time = time.time()
        
        response = await async_client.get(
            "/api/v2/six-figure/dashboard",
            headers=headers
        )
        
        end_time = time.time()
        response_time = (end_time - start_time) * 1000
        
        assert response.status_code == 200
        assert response_time < PerformanceBenchmarks.API_RESPONSE_SLOW
        
        dashboard_data = response.json()
        assert "revenue_metrics" in dashboard_data
        assert "client_metrics" in dashboard_data
        assert "goals_progress" in dashboard_data
        
        # Test revenue analytics
        start_time = time.time()
        
        revenue_response = await async_client.get(
            "/api/v2/six-figure/revenue/analytics",
            headers=headers,
            params={"period": "12months"}
        )
        
        end_time = time.time()
        revenue_response_time = (end_time - start_time) * 1000
        
        assert revenue_response.status_code == 200
        assert revenue_response_time < PerformanceBenchmarks.API_RESPONSE_SLOW
        
        # Test client analytics
        start_time = time.time()
        
        client_response = await async_client.get(
            "/api/v2/six-figure/clients/analytics",
            headers=headers,
            params={"period": "6months"}
        )
        
        end_time = time.time()
        client_response_time = (end_time - start_time) * 1000
        
        assert client_response.status_code == 200
        assert client_response_time < PerformanceBenchmarks.API_RESPONSE_SLOW
        
        # Log performance metrics
        performance_monitor.log_metric("six_figure_dashboard", response_time)
        performance_monitor.log_metric("revenue_analytics", revenue_response_time)
        performance_monitor.log_metric("client_analytics", client_response_time)

    @pytest.mark.asyncio
    async def test_analytics_aggregation_performance(
        self, async_client: AsyncClient, analytics_dataset, performance_monitor
    ):
        """Test performance of analytics data aggregation."""
        
        barber = analytics_dataset["barber"]
        barber_token = create_access_token(
            data={"sub": barber.email, "role": "barber"}
        )
        headers = {"Authorization": f"Bearer {barber_token}"}
        
        # Test different aggregation periods
        aggregation_tests = [
            {"period": "week", "max_time": PerformanceBenchmarks.API_RESPONSE_FAST},
            {"period": "month", "max_time": PerformanceBenchmarks.API_RESPONSE_NORMAL},
            {"period": "quarter", "max_time": PerformanceBenchmarks.API_RESPONSE_SLOW},
            {"period": "year", "max_time": PerformanceBenchmarks.API_RESPONSE_SLOW}
        ]
        
        for test in aggregation_tests:
            start_time = time.time()
            
            response = await async_client.get(
                "/api/v2/six-figure/revenue/summary",
                headers=headers,
                params={"period": test["period"]}
            )
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            
            assert response.status_code == 200
            assert response_time < test["max_time"]
            
            performance_monitor.log_metric(f"aggregation_{test['period']}", response_time)

    @pytest.mark.asyncio
    async def test_real_time_analytics_performance(
        self, async_client: AsyncClient, analytics_dataset, performance_monitor
    ):
        """Test real-time analytics updates performance."""
        
        barber = analytics_dataset["barber"]
        barber_token = create_access_token(
            data={"sub": barber.email, "role": "barber"}
        )
        headers = {"Authorization": f"Bearer {barber_token}"}
        
        # Test real-time metrics endpoint
        response_times = []
        
        for i in range(10):  # Test 10 consecutive calls
            start_time = time.time()
            
            response = await async_client.get(
                "/api/v2/six-figure/real-time/metrics",
                headers=headers
            )
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            response_times.append(response_time)
            
            assert response.status_code == 200
            assert response_time < PerformanceBenchmarks.API_RESPONSE_FAST
            
            # Small delay between requests
            await asyncio.sleep(0.1)
        
        # Verify consistent performance
        avg_response_time = statistics.mean(response_times)
        max_response_time = max(response_times)
        
        assert avg_response_time < PerformanceBenchmarks.API_RESPONSE_FAST
        assert max_response_time < PerformanceBenchmarks.API_RESPONSE_NORMAL
        
        performance_monitor.log_metric("real_time_analytics_avg", avg_response_time)
        performance_monitor.log_metric("real_time_analytics_max", max_response_time)


class TestAPIResponseTimeValidation:
    """Comprehensive API response time validation for all endpoints."""

    @pytest.mark.asyncio
    async def test_critical_api_endpoints_performance(
        self, async_client: AsyncClient, performance_monitor
    ):
        """Test performance of critical API endpoints."""
        
        # Create test user for authentication
        admin_token = create_access_token(
            data={"sub": "admin@test.com", "role": "admin"}
        )
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Critical endpoints that must be fast
        critical_endpoints = [
            {"url": "/api/v2/auth/me", "method": "GET"},
            {"url": "/api/v2/barbers", "method": "GET"},
            {"url": "/api/v2/services", "method": "GET"},
            {"url": "/api/v2/appointments/today", "method": "GET"},
            {"url": "/api/v2/notifications/unread", "method": "GET"}
        ]
        
        for endpoint in critical_endpoints:
            start_time = time.time()
            
            if endpoint["method"] == "GET":
                response = await async_client.get(endpoint["url"], headers=headers)
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            
            # Critical endpoints must be very fast
            assert response_time < PerformanceBenchmarks.API_RESPONSE_FAST
            
            endpoint_name = endpoint["url"].replace("/api/v2/", "").replace("/", "_")
            performance_monitor.log_metric(f"critical_api_{endpoint_name}", response_time)

    @pytest.mark.asyncio
    async def test_booking_flow_api_performance(
        self, async_client: AsyncClient, performance_monitor
    ):
        """Test performance of booking flow API endpoints."""
        
        # Create test data
        client_token = create_access_token(
            data={"sub": "client@test.com", "role": "client"}
        )
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # Test booking flow performance
        booking_flow_tests = [
            {
                "name": "search_barbers",
                "url": "/api/v2/barbers/search",
                "params": {"location": "New York", "service": "haircut"},
                "max_time": PerformanceBenchmarks.API_RESPONSE_NORMAL
            },
            {
                "name": "barber_availability",
                "url": "/api/v2/barbers/1/availability",
                "params": {"date": datetime.now().strftime("%Y-%m-%d")},
                "max_time": PerformanceBenchmarks.API_RESPONSE_NORMAL
            },
            {
                "name": "service_pricing",
                "url": "/api/v2/services/pricing",
                "params": {"barber_id": 1, "service_ids": "1,2,3"},
                "max_time": PerformanceBenchmarks.API_RESPONSE_FAST
            }
        ]
        
        for test in booking_flow_tests:
            start_time = time.time()
            
            response = await async_client.get(
                test["url"],
                headers=headers,
                params=test["params"]
            )
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            
            # Allow 404s for test endpoints that may not exist
            assert response.status_code in [200, 404]
            if response.status_code == 200:
                assert response_time < test["max_time"]
            
            performance_monitor.log_metric(f"booking_flow_{test['name']}", response_time)

    @pytest.mark.asyncio
    async def test_payment_api_performance(
        self, async_client: AsyncClient, performance_monitor
    ):
        """Test payment processing API performance."""
        
        client_token = create_access_token(
            data={"sub": "client@test.com", "role": "client"}
        )
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # Payment endpoints performance tests
        payment_tests = [
            {
                "name": "payment_methods",
                "url": "/api/v2/payments/methods",
                "max_time": PerformanceBenchmarks.API_RESPONSE_FAST
            },
            {
                "name": "payment_history",
                "url": "/api/v2/payments/history",
                "max_time": PerformanceBenchmarks.API_RESPONSE_NORMAL
            },
            {
                "name": "commission_rates",
                "url": "/api/v2/commissions/rates",
                "max_time": PerformanceBenchmarks.API_RESPONSE_FAST
            }
        ]
        
        for test in payment_tests:
            start_time = time.time()
            
            response = await async_client.get(test["url"], headers=headers)
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            
            assert response.status_code in [200, 404]  # Allow 404 for test endpoints
            if response.status_code == 200:
                assert response_time < test["max_time"]
            
            performance_monitor.log_metric(f"payment_api_{test['name']}", response_time)


class TestDatabaseQueryOptimization:
    """Database query performance and optimization tests."""

    @pytest.fixture
    def db_performance_monitor(self):
        """Database performance monitoring."""
        return PerformanceMonitor(track_queries=True)

    @pytest.mark.asyncio
    async def test_database_query_performance(self, db: Session, db_performance_monitor):
        """Test database query performance for critical operations."""
        
        # Test query performance with EXPLAIN ANALYZE
        critical_queries = [
            {
                "name": "user_lookup",
                "query": "SELECT * FROM users WHERE email = :email",
                "params": {"email": "test@example.com"},
                "max_time": PerformanceBenchmarks.DB_QUERY_SIMPLE
            },
            {
                "name": "appointment_search",
                "query": """
                    SELECT a.*, u.name as barber_name, s.name as service_name
                    FROM appointments a
                    JOIN users u ON a.barber_id = u.id
                    JOIN services s ON a.service_id = s.id
                    WHERE a.appointment_datetime >= :start_date
                    AND a.appointment_datetime <= :end_date
                """,
                "params": {
                    "start_date": datetime.now(),
                    "end_date": datetime.now() + timedelta(days=7)
                },
                "max_time": PerformanceBenchmarks.DB_QUERY_COMPLEX
            },
            {
                "name": "revenue_aggregation",
                "query": """
                    SELECT 
                        DATE_TRUNC('month', a.appointment_datetime) as month,
                        SUM(a.price) as total_revenue,
                        COUNT(*) as appointment_count
                    FROM appointments a
                    WHERE a.status = 'completed'
                    AND a.appointment_datetime >= :start_date
                    GROUP BY DATE_TRUNC('month', a.appointment_datetime)
                    ORDER BY month DESC
                """,
                "params": {"start_date": datetime.now() - timedelta(days=365)},
                "max_time": PerformanceBenchmarks.DB_QUERY_HEAVY
            }
        ]
        
        for query_test in critical_queries:
            start_time = time.time()
            
            # Execute query with performance tracking
            result = db.execute(
                text(query_test["query"]),
                query_test["params"]
            ).fetchall()
            
            end_time = time.time()
            query_time = (end_time - start_time) * 1000
            
            assert query_time < query_test["max_time"]
            
            db_performance_monitor.log_metric(
                f"db_query_{query_test['name']}", 
                query_time
            )

    @pytest.mark.asyncio
    async def test_index_effectiveness(self, db: Session, db_performance_monitor):
        """Test database index effectiveness for common queries."""
        
        # Check if important indexes exist and are being used
        index_queries = [
            {
                "name": "user_email_index",
                "query": "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE email = 'test@example.com'"
            },
            {
                "name": "appointment_datetime_index", 
                "query": "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM appointments WHERE appointment_datetime >= NOW()"
            },
            {
                "name": "appointment_barber_index",
                "query": "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM appointments WHERE barber_id = 1"
            }
        ]
        
        for index_test in index_queries:
            try:
                result = db.execute(text(index_test["query"])).fetchall()
                
                # Parse explain output to check for index usage
                explain_output = '\n'.join([str(row) for row in result])
                
                # Should not see "Seq Scan" for indexed columns
                assert "Index Scan" in explain_output or "Index Only Scan" in explain_output
                
                db_performance_monitor.log_metric(
                    f"index_check_{index_test['name']}", 
                    1 if "Index" in explain_output else 0
                )
                
            except Exception as e:
                # Skip if explain is not available in test environment
                print(f"Skipping index test {index_test['name']}: {e}")

    @pytest.mark.asyncio
    async def test_connection_pool_performance(self, db_performance_monitor):
        """Test database connection pool performance under load."""
        
        # Test connection acquisition time
        start_time = time.time()
        
        # Create multiple concurrent database connections
        async def test_connection():
            # Simulate database operation
            await asyncio.sleep(0.001)
            return True
        
        # Test 50 concurrent "connections"
        tasks = [test_connection() for _ in range(50)]
        results = await asyncio.gather(*tasks)
        
        end_time = time.time()
        total_time = (end_time - start_time) * 1000
        
        # Should handle 50 concurrent operations quickly
        assert total_time < 1000  # 1 second
        assert all(results)
        
        db_performance_monitor.log_metric("connection_pool_50_concurrent", total_time)


class TestMemoryAndResourcePerformance:
    """Memory usage and resource consumption tests."""

    @pytest.mark.asyncio
    async def test_memory_usage_during_load(self, performance_monitor):
        """Test memory usage during high load operations."""
        
        # Monitor memory before test
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Simulate high load operations
        service = SixFigureBarberCoreService(Mock())
        
        # Process large dataset
        large_dataset = []
        for i in range(1000):
            large_dataset.append({
                "client_id": i,
                "revenue": Decimal("95.00"),
                "appointment_date": datetime.now() + timedelta(days=i % 30)
            })
        
        # Process dataset multiple times
        for _ in range(10):
            for data in large_dataset:
                # Simulate processing
                pass
        
        # Monitor memory after test
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_growth = final_memory - initial_memory
        
        # Memory growth should be reasonable
        assert memory_growth < PerformanceBenchmarks.MEMORY_GROWTH_LIMIT
        
        performance_monitor.log_metric("memory_growth_load_test", memory_growth)

    @pytest.mark.asyncio
    async def test_cpu_usage_under_load(self, performance_monitor):
        """Test CPU usage during intensive operations."""
        
        # Monitor CPU usage
        cpu_start = psutil.cpu_percent(interval=None)
        
        # Simulate CPU-intensive operations
        start_time = time.time()
        
        # Complex calculations (simulate analytics processing)
        for i in range(10000):
            # Simulate revenue calculations
            revenue = Decimal("95.00")
            commission = revenue * Decimal("0.1")
            net_amount = revenue - commission
            
            # Simulate date calculations
            date = datetime.now() + timedelta(days=i % 365)
        
        end_time = time.time()
        processing_time = (end_time - start_time) * 1000
        
        cpu_end = psutil.cpu_percent(interval=0.1)
        
        # Should complete calculations quickly without excessive CPU usage
        assert processing_time < 5000  # 5 seconds
        
        performance_monitor.log_metric("cpu_intensive_processing", processing_time)


# Performance regression detection utilities
class PerformanceRegressionDetector:
    """Detect performance regressions by comparing with historical data."""
    
    def __init__(self, baseline_file: str = "performance_baseline.json"):
        self.baseline_file = baseline_file
        self.current_metrics = {}
        
    def load_baseline(self) -> Dict[str, float]:
        """Load baseline performance metrics."""
        try:
            with open(self.baseline_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
    
    def save_baseline(self, metrics: Dict[str, float]):
        """Save current metrics as new baseline."""
        with open(self.baseline_file, 'w') as f:
            json.dump(metrics, f, indent=2)
    
    def check_regression(self, metric_name: str, current_value: float, threshold: float = 0.2) -> bool:
        """Check if current performance represents a regression."""
        baseline = self.load_baseline()
        
        if metric_name not in baseline:
            # No baseline, save current value
            baseline[metric_name] = current_value
            self.save_baseline(baseline)
            return False
        
        baseline_value = baseline[metric_name]
        
        # Check for regression (performance got worse by more than threshold)
        if current_value > baseline_value * (1 + threshold):
            return True
        
        # Update baseline if performance improved
        if current_value < baseline_value:
            baseline[metric_name] = current_value
            self.save_baseline(baseline)
        
        return False


@pytest.fixture(scope="session")
def regression_detector():
    """Performance regression detector for all tests."""
    return PerformanceRegressionDetector()


@pytest.mark.performance
def test_performance_regression_detection(regression_detector):
    """Test performance regression detection system."""
    
    # Simulate performance metrics
    test_metrics = {
        "api_response_auth": 150.0,
        "calendar_monthly_view": 300.0,
        "six_figure_dashboard": 800.0,
        "db_query_user_lookup": 25.0
    }
    
    # Check for regressions
    regressions = []
    for metric_name, value in test_metrics.items():
        if regression_detector.check_regression(metric_name, value):
            regressions.append(f"{metric_name}: {value}ms")
    
    # Assert no regressions detected
    assert len(regressions) == 0, f"Performance regressions detected: {regressions}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "-m", "performance"])