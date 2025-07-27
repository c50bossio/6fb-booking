"""
Performance regression tests for Six Figure Barber methodology components.
Ensures critical business flows maintain acceptable performance standards.
"""
import pytest
import time
import asyncio
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from decimal import Decimal
import psutil
import gc

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import Mock, patch

from main import app
from services.six_figure_barber_core_service import SixFigureBarberCoreService
from services.analytics_service import AnalyticsService
from services.calendar_service import CalendarService


class PerformanceBenchmark:
    """Base class for performance benchmarking."""
    
    def __init__(self, test_name: str, target_time: float, tolerance: float = 0.2):
        self.test_name = test_name
        self.target_time = target_time  # seconds
        self.tolerance = tolerance  # 20% tolerance by default
        self.measurements = []
    
    def measure(self, func, *args, **kwargs):
        """Measure function execution time."""
        gc.collect()  # Clean up before measurement
        start_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        
        start_time = time.perf_counter()
        result = func(*args, **kwargs)
        end_time = time.perf_counter()
        
        end_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        
        execution_time = end_time - start_time
        memory_used = end_memory - start_memory
        
        self.measurements.append({
            'execution_time': execution_time,
            'memory_used': memory_used,
            'timestamp': datetime.now()
        })
        
        return result, execution_time, memory_used
    
    def assert_performance(self, execution_time: float):
        """Assert performance meets benchmarks."""
        max_allowed = self.target_time * (1 + self.tolerance)
        assert execution_time <= max_allowed, (
            f"{self.test_name} took {execution_time:.3f}s, "
            f"expected <= {max_allowed:.3f}s (target: {self.target_time:.3f}s)"
        )
    
    def get_statistics(self):
        """Get performance statistics."""
        if not self.measurements:
            return None
        
        times = [m['execution_time'] for m in self.measurements]
        memory_usage = [m['memory_used'] for m in self.measurements]
        
        return {
            'avg_time': statistics.mean(times),
            'median_time': statistics.median(times),
            'max_time': max(times),
            'min_time': min(times),
            'std_time': statistics.stdev(times) if len(times) > 1 else 0,
            'avg_memory': statistics.mean(memory_usage),
            'max_memory': max(memory_usage),
            'measurements_count': len(times)
        }


class TestSixFigureBarberPerformance:
    """Performance regression tests for Six Figure Barber core functionality."""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    @pytest.fixture
    def mock_db_session(self):
        return Mock(spec=Session)
    
    @pytest.fixture
    def six_figure_service(self, mock_db_session):
        return SixFigureBarberCoreService(mock_db_session)
    
    @pytest.fixture
    def large_dataset(self):
        """Generate large dataset for performance testing."""
        return {
            'clients': [
                {
                    'id': i,
                    'total_spent': Decimal(f"{500 + (i * 25)}.00"),
                    'visit_frequency': 3 + (i % 4),
                    'satisfaction_scores': [4.2 + (i % 3) * 0.2] * 10,
                    'last_visit': datetime.now() - timedelta(days=i % 30)
                }
                for i in range(1000)
            ],
            'revenue_metrics': [
                {
                    'date': datetime.now() - timedelta(days=i),
                    'revenue': Decimal(f"{200 + (i % 100)}.00"),
                    'hours_worked': 8 + (i % 4),
                    'client_count': 10 + (i % 5)
                }
                for i in range(365)  # Full year of data
            ]
        }

    def test_revenue_calculation_performance(self, six_figure_service, large_dataset):
        """Test revenue calculation performance with large dataset."""
        benchmark = PerformanceBenchmark("Revenue Calculation", target_time=0.1)
        
        # Mock database queries to return large dataset
        six_figure_service.db.query.return_value.filter.return_value.all.return_value = \
            large_dataset['revenue_metrics']
        
        # Measure performance over multiple runs
        for _ in range(10):
            result, exec_time, memory = benchmark.measure(
                six_figure_service.calculate_revenue_per_hour,
                barber_id=1,
                period_days=365
            )
            benchmark.assert_performance(exec_time)
        
        stats = benchmark.get_statistics()
        assert stats['avg_time'] < 0.1, f"Average execution time too high: {stats['avg_time']:.3f}s"
        assert stats['max_memory'] < 50, f"Memory usage too high: {stats['max_memory']:.2f}MB"

    def test_client_value_scoring_performance(self, six_figure_service, large_dataset):
        """Test client value scoring performance with large client base."""
        benchmark = PerformanceBenchmark("Client Value Scoring", target_time=0.05)
        
        # Test with various client profiles
        client_profiles = large_dataset['clients'][:100]  # Sample of 100 clients
        
        for client_data in client_profiles[:10]:  # Test first 10 for detailed measurement
            result, exec_time, memory = benchmark.measure(
                six_figure_service.track_client_value_score,
                client_data
            )
            benchmark.assert_performance(exec_time)
        
        stats = benchmark.get_statistics()
        assert stats['avg_time'] < 0.05, f"Client scoring too slow: {stats['avg_time']:.3f}s"

    def test_dashboard_data_aggregation_performance(self, six_figure_service, large_dataset):
        """Test Six Figure dashboard data aggregation performance."""
        benchmark = PerformanceBenchmark("Dashboard Aggregation", target_time=0.2)
        
        # Mock various data queries for dashboard
        six_figure_service.db.query.return_value.filter.return_value.all.side_effect = [
            large_dataset['revenue_metrics'],
            large_dataset['clients'],
            []  # goals
        ]
        
        result, exec_time, memory = benchmark.measure(
            six_figure_service.get_six_figure_progress_dashboard,
            barber_id=1
        )
        
        benchmark.assert_performance(exec_time)
        assert result['success'] is True

    def test_concurrent_revenue_calculations(self, six_figure_service, large_dataset):
        """Test performance under concurrent load."""
        benchmark = PerformanceBenchmark("Concurrent Revenue Calculations", target_time=0.5)
        
        # Mock data for concurrent tests
        six_figure_service.db.query.return_value.filter.return_value.all.return_value = \
            large_dataset['revenue_metrics']
        
        def calculate_revenue_for_barber(barber_id):
            return six_figure_service.calculate_revenue_per_hour(barber_id, 30)
        
        # Test with 20 concurrent calculations
        barber_ids = list(range(1, 21))
        
        start_time = time.perf_counter()
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [
                executor.submit(calculate_revenue_for_barber, barber_id)
                for barber_id in barber_ids
            ]
            
            results = [future.result() for future in as_completed(futures)]
        
        end_time = time.perf_counter()
        total_time = end_time - start_time
        
        # Should complete 20 calculations in under 0.5 seconds
        assert total_time < 0.5, f"Concurrent calculations too slow: {total_time:.3f}s"
        assert all(result['success'] for result in results)

    def test_memory_efficiency_large_dataset(self, six_figure_service, large_dataset):
        """Test memory efficiency with large datasets."""
        initial_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        
        # Process large dataset
        six_figure_service.db.query.return_value.filter.return_value.all.return_value = \
            large_dataset['revenue_metrics']
        
        # Run multiple operations
        for _ in range(5):
            six_figure_service.calculate_revenue_per_hour(1, 365)
            six_figure_service.get_six_figure_progress_dashboard(1)
        
        peak_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        memory_increase = peak_memory - initial_memory
        
        # Should not increase memory by more than 100MB
        assert memory_increase < 100, f"Memory increase too high: {memory_increase:.2f}MB"
        
        # Force garbage collection and check for memory leaks
        gc.collect()
        final_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        
        # Memory should return close to initial after GC
        memory_retained = final_memory - initial_memory
        assert memory_retained < 20, f"Potential memory leak: {memory_retained:.2f}MB retained"


class TestAnalyticsPerformance:
    """Performance tests for analytics components."""
    
    @pytest.fixture
    def analytics_service(self, mock_db_session):
        return AnalyticsService(mock_db_session)
    
    def test_analytics_query_performance(self, client):
        """Test analytics API endpoint performance."""
        benchmark = PerformanceBenchmark("Analytics Query", target_time=1.0)
        
        # Mock authentication
        with patch('middleware.auth_middleware.verify_token') as mock_auth:
            mock_auth.return_value = {'user_id': 1, 'role': 'BARBER'}
            
            result, exec_time, memory = benchmark.measure(
                client.get,
                '/api/v2/six-figure-barber/analytics/1',
                headers={'Authorization': 'Bearer test_token'}
            )
            
            benchmark.assert_performance(exec_time)
            assert result.status_code == 200

    def test_real_time_analytics_performance(self, client):
        """Test real-time analytics update performance."""
        benchmark = PerformanceBenchmark("Real-time Analytics", target_time=0.3)
        
        with patch('middleware.auth_middleware.verify_token') as mock_auth:
            mock_auth.return_value = {'user_id': 1, 'role': 'BARBER'}
            
            # Test multiple rapid requests (simulating real-time updates)
            for _ in range(5):
                result, exec_time, memory = benchmark.measure(
                    client.get,
                    '/api/v2/six-figure-barber/revenue/1',
                    headers={'Authorization': 'Bearer test_token'}
                )
                benchmark.assert_performance(exec_time)
        
        stats = benchmark.get_statistics()
        assert stats['avg_time'] < 0.3, f"Real-time updates too slow: {stats['avg_time']:.3f}s"

    def test_chart_data_generation_performance(self, analytics_service):
        """Test chart data generation performance."""
        benchmark = PerformanceBenchmark("Chart Data Generation", target_time=0.15)
        
        # Mock large dataset for chart generation
        chart_data = [
            {'date': datetime.now() - timedelta(days=i), 'value': 100 + i}
            for i in range(365)
        ]
        
        analytics_service.db.query.return_value.all.return_value = chart_data
        
        result, exec_time, memory = benchmark.measure(
            analytics_service.generate_revenue_chart_data,
            barber_id=1,
            period='1year'
        )
        
        benchmark.assert_performance(exec_time)
        assert len(result['data']) > 0


class TestCalendarPerformance:
    """Performance tests for calendar components."""
    
    @pytest.fixture
    def calendar_service(self, mock_db_session):
        return CalendarService(mock_db_session)
    
    def test_availability_calculation_performance(self, calendar_service):
        """Test availability calculation performance."""
        benchmark = PerformanceBenchmark("Availability Calculation", target_time=0.1)
        
        # Mock large number of existing appointments
        existing_appointments = [
            Mock(
                start_time=datetime.now() + timedelta(hours=i),
                end_time=datetime.now() + timedelta(hours=i+1),
                status='CONFIRMED'
            )
            for i in range(100)
        ]
        
        calendar_service.db.query.return_value.filter.return_value.all.return_value = \
            existing_appointments
        
        result, exec_time, memory = benchmark.measure(
            calendar_service.get_available_slots,
            barber_id=1,
            date=datetime.now().date(),
            service_duration=60
        )
        
        benchmark.assert_performance(exec_time)
        assert isinstance(result, list)

    def test_calendar_view_loading_performance(self, client):
        """Test calendar view loading performance."""
        benchmark = PerformanceBenchmark("Calendar View Loading", target_time=0.5)
        
        with patch('middleware.auth_middleware.verify_token') as mock_auth:
            mock_auth.return_value = {'user_id': 1, 'role': 'BARBER'}
            
            result, exec_time, memory = benchmark.measure(
                client.get,
                '/api/v2/calendar/month/2024/03',
                headers={'Authorization': 'Bearer test_token'}
            )
            
            benchmark.assert_performance(exec_time)
            assert result.status_code == 200

    def test_appointment_conflict_detection_performance(self, calendar_service):
        """Test appointment conflict detection performance."""
        benchmark = PerformanceBenchmark("Conflict Detection", target_time=0.05)
        
        # Create scenario with many overlapping time slots
        potential_conflicts = [
            Mock(
                start_time=datetime.now() + timedelta(minutes=i*30),
                end_time=datetime.now() + timedelta(minutes=i*30 + 45),
                barber_id=1
            )
            for i in range(50)
        ]
        
        calendar_service.db.query.return_value.filter.return_value.all.return_value = \
            potential_conflicts
        
        new_appointment = {
            'start_time': datetime.now() + timedelta(hours=12),
            'end_time': datetime.now() + timedelta(hours=13),
            'barber_id': 1
        }
        
        result, exec_time, memory = benchmark.measure(
            calendar_service.check_appointment_conflicts,
            new_appointment
        )
        
        benchmark.assert_performance(exec_time)


class TestLoadAndStressTests:
    """Load and stress testing for Six Figure Barber system."""
    
    def test_api_endpoint_load_test(self, client):
        """Test API endpoints under load."""
        endpoint_benchmarks = {
            '/api/v2/services': PerformanceBenchmark("Services List", 0.2),
            '/api/v2/six-figure-barber/revenue/1': PerformanceBenchmark("Revenue API", 0.3),
            '/api/v2/analytics/1': PerformanceBenchmark("Analytics API", 0.5),
        }
        
        with patch('middleware.auth_middleware.verify_token') as mock_auth:
            mock_auth.return_value = {'user_id': 1, 'role': 'BARBER'}
            
            # Simulate 50 concurrent requests to each endpoint
            for endpoint, benchmark in endpoint_benchmarks.items():
                with ThreadPoolExecutor(max_workers=10) as executor:
                    futures = [
                        executor.submit(
                            client.get,
                            endpoint,
                            headers={'Authorization': 'Bearer test_token'}
                        )
                        for _ in range(50)
                    ]
                    
                    start_time = time.perf_counter()
                    results = [future.result() for future in as_completed(futures)]
                    end_time = time.perf_counter()
                    
                    total_time = end_time - start_time
                    avg_response_time = total_time / len(results)
                    
                    # All requests should complete within reasonable time
                    assert total_time < 5.0, f"{endpoint} load test too slow: {total_time:.3f}s"
                    assert avg_response_time < 0.5, f"{endpoint} avg response too slow: {avg_response_time:.3f}s"
                    assert all(r.status_code == 200 for r in results), f"{endpoint} had failures"

    def test_database_connection_pool_performance(self, client):
        """Test database connection pool under stress."""
        # Test rapid sequential database operations
        operations_count = 100
        max_time_per_operation = 0.1
        
        with patch('middleware.auth_middleware.verify_token') as mock_auth:
            mock_auth.return_value = {'user_id': 1, 'role': 'BARBER'}
            
            start_time = time.perf_counter()
            
            for i in range(operations_count):
                response = client.get(
                    f'/api/v2/six-figure-barber/revenue/1?cache_bust={i}',
                    headers={'Authorization': 'Bearer test_token'}
                )
                assert response.status_code == 200
            
            end_time = time.perf_counter()
            total_time = end_time - start_time
            avg_time_per_operation = total_time / operations_count
            
            assert avg_time_per_operation < max_time_per_operation, \
                f"DB operations too slow: {avg_time_per_operation:.3f}s per operation"


class TestPerformanceRegression:
    """Tests to catch performance regressions in core functionality."""
    
    PERFORMANCE_BASELINES = {
        'revenue_calculation': 0.1,  # seconds
        'client_value_scoring': 0.05,
        'analytics_query': 1.0,
        'calendar_loading': 0.5,
        'dashboard_aggregation': 0.2,
    }
    
    def test_performance_baseline_compliance(self, six_figure_service, large_dataset):
        """Ensure all critical operations meet baseline performance."""
        
        # Test revenue calculation baseline
        six_figure_service.db.query.return_value.filter.return_value.all.return_value = \
            large_dataset['revenue_metrics']
        
        start_time = time.perf_counter()
        result = six_figure_service.calculate_revenue_per_hour(1, 30)
        execution_time = time.perf_counter() - start_time
        
        assert execution_time <= self.PERFORMANCE_BASELINES['revenue_calculation'], \
            f"Revenue calculation regression: {execution_time:.3f}s > {self.PERFORMANCE_BASELINES['revenue_calculation']}s"
        
        # Test client value scoring baseline
        client_data = large_dataset['clients'][0]
        
        start_time = time.perf_counter()
        result = six_figure_service.track_client_value_score(client_data)
        execution_time = time.perf_counter() - start_time
        
        assert execution_time <= self.PERFORMANCE_BASELINES['client_value_scoring'], \
            f"Client scoring regression: {execution_time:.3f}s > {self.PERFORMANCE_BASELINES['client_value_scoring']}s"

    def test_memory_usage_baselines(self, six_figure_service, large_dataset):
        """Test memory usage doesn't exceed baselines."""
        initial_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        
        # Perform memory-intensive operations
        six_figure_service.db.query.return_value.filter.return_value.all.return_value = \
            large_dataset['revenue_metrics']
        
        for _ in range(10):
            six_figure_service.calculate_revenue_per_hour(1, 365)
            six_figure_service.get_six_figure_progress_dashboard(1)
        
        peak_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        memory_increase = peak_memory - initial_memory
        
        # Memory increase should not exceed 50MB for these operations
        assert memory_increase < 50, f"Memory usage regression: {memory_increase:.2f}MB increase"


if __name__ == "__main__":
    pytest.main([
        __file__, 
        "-v", 
        "--tb=short",
        "--benchmark-sort=mean",
        "--benchmark-columns=min,max,mean,stddev",
        "--benchmark-disable-gc",
        "--benchmark-warmup=on"
    ])