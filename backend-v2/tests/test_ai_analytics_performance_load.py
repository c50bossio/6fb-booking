"""
AI Analytics Performance and Load Testing.

Tests performance characteristics of the AI analytics system under various loads,
including differential privacy computation, k-anonymity processing, and large dataset handling.
"""

import pytest
import time
import numpy as np
import psutil
import os
import threading
import concurrent.futures
from typing import Dict, List, Any, Tuple
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
from collections import defaultdict

from services.ai_benchmarking_service import AIBenchmarkingService
from services.predictive_modeling_service import PredictiveModelingService
from services.privacy_anonymization_service import PrivacyAnonymizationService, PrivacyParameters


class PerformanceProfiler:
    """Performance profiling utility for AI analytics operations"""
    
    def __init__(self):
        self.metrics = defaultdict(list)
        self.start_times = {}
        self.process = psutil.Process(os.getpid())
    
    def start_timer(self, operation: str):
        """Start timing an operation"""
        self.start_times[operation] = time.time()
    
    def end_timer(self, operation: str) -> float:
        """End timing and record duration"""
        if operation in self.start_times:
            duration = time.time() - self.start_times[operation]
            self.metrics[f"{operation}_duration"].append(duration)
            return duration
        return 0.0
    
    def record_memory_usage(self, operation: str):
        """Record current memory usage"""
        memory_mb = self.process.memory_info().rss / 1024 / 1024
        self.metrics[f"{operation}_memory_mb"].append(memory_mb)
        return memory_mb
    
    def record_cpu_usage(self, operation: str):
        """Record current CPU usage"""
        cpu_percent = self.process.cpu_percent()
        self.metrics[f"{operation}_cpu_percent"].append(cpu_percent)
        return cpu_percent
    
    def get_summary(self, operation: str) -> Dict[str, Any]:
        """Get performance summary for an operation"""
        duration_key = f"{operation}_duration"
        memory_key = f"{operation}_memory_mb"
        cpu_key = f"{operation}_cpu_percent"
        
        summary = {}
        
        if duration_key in self.metrics:
            durations = self.metrics[duration_key]
            summary["duration"] = {
                "mean": np.mean(durations),
                "median": np.median(durations),
                "std": np.std(durations),
                "min": np.min(durations),
                "max": np.max(durations),
                "p95": np.percentile(durations, 95),
                "p99": np.percentile(durations, 99)
            }
        
        if memory_key in self.metrics:
            memory_usage = self.metrics[memory_key]
            summary["memory"] = {
                "mean_mb": np.mean(memory_usage),
                "max_mb": np.max(memory_usage),
                "peak_usage_mb": np.max(memory_usage)
            }
        
        if cpu_key in self.metrics:
            cpu_usage = self.metrics[cpu_key]
            summary["cpu"] = {
                "mean_percent": np.mean(cpu_usage),
                "max_percent": np.max(cpu_usage)
            }
        
        return summary


class TestDifferentialPrivacyPerformance:
    """Test differential privacy performance characteristics"""
    
    def setup_method(self):
        self.db_mock = Mock()
        self.privacy_service = PrivacyAnonymizationService(self.db_mock)
        self.profiler = PerformanceProfiler()
    
    def test_noise_injection_performance_single_thread(self):
        """Test differential privacy noise injection performance - single thread"""
        
        test_sizes = [100, 1000, 10000, 100000]
        
        for size in test_sizes:
            self.profiler.start_timer(f"dp_noise_{size}")
            self.profiler.record_memory_usage(f"dp_noise_{size}")
            
            # Generate test values
            values = np.random.uniform(1000, 10000, size)
            noisy_values = []
            
            # Apply differential privacy to each value
            for value in values:
                noisy_value, _ = self.privacy_service.add_differential_privacy_noise(
                    value, sensitivity=100
                )
                noisy_values.append(noisy_value)
            
            duration = self.profiler.end_timer(f"dp_noise_{size}")
            self.profiler.record_memory_usage(f"dp_noise_{size}")
            
            # Performance assertions
            assert len(noisy_values) == size
            
            # Should process at least 1000 values per second
            values_per_second = size / duration
            assert values_per_second > 1000, f"Too slow: {values_per_second:.0f} values/sec for size {size}"
            
            print(f"DP Noise {size} values: {duration:.4f}s ({values_per_second:.0f} values/sec)")
    
    def test_noise_injection_performance_multi_thread(self):
        """Test differential privacy performance with multiple threads"""
        
        size = 50000
        num_threads = 4
        chunk_size = size // num_threads
        
        def process_chunk(chunk_values):
            noisy_values = []
            for value in chunk_values:
                noisy_value, _ = self.privacy_service.add_differential_privacy_noise(
                    value, sensitivity=100
                )
                noisy_values.append(noisy_value)
            return noisy_values
        
        self.profiler.start_timer("dp_noise_multithread")
        
        # Generate test values
        values = np.random.uniform(1000, 10000, size)
        chunks = [values[i:i + chunk_size] for i in range(0, size, chunk_size)]
        
        # Process chunks in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(process_chunk, chunk) for chunk in chunks]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        duration = self.profiler.end_timer("dp_noise_multithread")
        
        # Verify results
        total_processed = sum(len(result) for result in results)
        assert total_processed == size
        
        values_per_second = size / duration
        print(f"DP Noise {size} values (multithread): {duration:.4f}s ({values_per_second:.0f} values/sec)")
        
        # Should be faster than single-threaded
        assert values_per_second > 2000, f"Multithread not fast enough: {values_per_second:.0f} values/sec"
    
    def test_epsilon_budget_impact_on_performance(self):
        """Test how different epsilon values affect performance"""
        
        epsilons = [0.1, 0.5, 1.0, 2.0, 5.0]
        test_size = 10000
        
        for epsilon in epsilons:
            privacy_service = PrivacyAnonymizationService(
                self.db_mock, 
                PrivacyParameters(epsilon=epsilon)
            )
            
            self.profiler.start_timer(f"epsilon_{epsilon}")
            
            values = np.random.uniform(1000, 10000, test_size)
            noisy_values = []
            
            for value in values:
                noisy_value, _ = privacy_service.add_differential_privacy_noise(
                    value, sensitivity=100
                )
                noisy_values.append(noisy_value)
            
            duration = self.profiler.end_timer(f"epsilon_{epsilon}")
            values_per_second = test_size / duration
            
            print(f"Epsilon {epsilon}: {duration:.4f}s ({values_per_second:.0f} values/sec)")
            
            # Performance should be consistent regardless of epsilon
            assert values_per_second > 1000, f"Slow performance for epsilon {epsilon}"
    
    def test_memory_usage_large_datasets(self):
        """Test memory usage with large datasets"""
        
        initial_memory = self.profiler.record_memory_usage("initial")
        
        # Process increasingly large datasets
        for size in [10000, 50000, 100000]:
            self.profiler.record_memory_usage(f"before_{size}")
            
            values = np.random.uniform(1000, 10000, size)
            noisy_values = []
            
            for value in values:
                noisy_value, _ = self.privacy_service.add_differential_privacy_noise(
                    value, sensitivity=100
                )
                noisy_values.append(noisy_value)
            
            peak_memory = self.profiler.record_memory_usage(f"after_{size}")
            memory_increase = peak_memory - initial_memory
            
            print(f"Memory for {size} values: {memory_increase:.2f}MB increase")
            
            # Memory usage should be reasonable (< 100MB for 100k values)
            assert memory_increase < 100, f"Excessive memory usage: {memory_increase:.2f}MB for {size} values"
            
            # Clean up
            del values, noisy_values


class TestKAnonymityPerformance:
    """Test k-anonymity performance characteristics"""
    
    def setup_method(self):
        self.db_mock = Mock()
        self.privacy_service = PrivacyAnonymizationService(self.db_mock)
        self.profiler = PerformanceProfiler()
    
    def test_k_anonymity_performance_scaling(self):
        """Test k-anonymity performance with different dataset sizes"""
        
        quasi_identifiers = ["segment", "revenue_bucket", "location"]
        k_values = [10, 50, 100]
        dataset_sizes = [1000, 5000, 10000, 50000]
        
        for k in k_values:
            for size in dataset_sizes:
                # Generate test dataset
                test_data = []
                for i in range(size):
                    test_data.append({
                        "segment": f"segment_{i % 10}",
                        "revenue_bucket": f"bucket_{i % 5}",
                        "location": f"location_{i % 20}",
                        "user_id": i,
                        "value": np.random.uniform(1000, 10000)
                    })
                
                test_name = f"k_anon_k{k}_size{size}"
                self.profiler.start_timer(test_name)
                self.profiler.record_memory_usage(test_name)
                
                # Apply k-anonymity
                anonymized_data = self.privacy_service.apply_k_anonymity(
                    test_data, quasi_identifiers, k=k
                )
                
                duration = self.profiler.end_timer(test_name)
                self.profiler.record_memory_usage(test_name)
                
                records_per_second = size / duration
                print(f"K-anonymity k={k}, size={size}: {duration:.4f}s ({records_per_second:.0f} records/sec)")
                
                # Performance requirements
                assert records_per_second > 100, f"Too slow: {records_per_second:.0f} records/sec"
                assert len(anonymized_data) <= size, "Result size should not exceed input"
                
                # Verify k-anonymity is maintained
                for record in anonymized_data:
                    assert record.get("k_anonymity_level", 0) >= k
    
    def test_k_anonymity_memory_efficiency(self):
        """Test memory efficiency of k-anonymity processing"""
        
        initial_memory = self.profiler.record_memory_usage("k_anon_initial")
        
        # Create large dataset
        size = 100000
        test_data = []
        for i in range(size):
            test_data.append({
                "segment": f"segment_{i % 100}",
                "revenue_bucket": f"bucket_{i % 10}",
                "location": f"location_{i % 50}",
                "user_id": i
            })
        
        memory_after_creation = self.profiler.record_memory_usage("k_anon_after_creation")
        creation_memory = memory_after_creation - initial_memory
        
        # Apply k-anonymity
        quasi_identifiers = ["segment", "revenue_bucket", "location"]
        
        self.profiler.start_timer("k_anon_large")
        anonymized_data = self.privacy_service.apply_k_anonymity(
            test_data, quasi_identifiers, k=100
        )
        duration = self.profiler.end_timer("k_anon_large")
        
        peak_memory = self.profiler.record_memory_usage("k_anon_peak")
        processing_memory = peak_memory - memory_after_creation
        
        print(f"K-anonymity large dataset:")
        print(f"  Data creation: {creation_memory:.2f}MB")
        print(f"  Processing overhead: {processing_memory:.2f}MB") 
        print(f"  Duration: {duration:.4f}s")
        print(f"  Result size: {len(anonymized_data)} records")
        
        # Memory overhead should be reasonable
        assert processing_memory < creation_memory * 2, "Processing memory overhead too high"
        
        # Should complete in reasonable time
        assert duration < 10.0, f"Processing too slow: {duration:.2f}s"
    
    def test_k_anonymity_group_distribution(self):
        """Test k-anonymity with different group size distributions"""
        
        # Test scenarios with different group distributions
        scenarios = [
            {
                "name": "uniform_groups",
                "group_sizes": [100] * 50,  # 50 groups of 100 each
                "expected_output_ratio": 1.0  # All should pass k=50
            },
            {
                "name": "mixed_groups", 
                "group_sizes": [200, 150, 100, 80, 60, 40, 20, 10] * 10,  # Mixed sizes
                "expected_output_ratio": 0.7  # Some groups will be filtered out
            },
            {
                "name": "many_small_groups",
                "group_sizes": [10, 15, 20, 25] * 50,  # Many small groups
                "expected_output_ratio": 0.0  # Most should be filtered with k=100
            }
        ]
        
        for scenario in scenarios:
            test_data = []
            record_id = 0
            
            # Create data according to scenario
            for group_id, group_size in enumerate(scenario["group_sizes"]):
                for _ in range(group_size):
                    test_data.append({
                        "segment": f"segment_{group_id}",
                        "revenue_bucket": "medium",
                        "location": "urban",
                        "user_id": record_id
                    })
                    record_id += 1
            
            # Shuffle to test grouping logic
            np.random.shuffle(test_data)
            
            test_name = f"k_anon_{scenario['name']}"
            self.profiler.start_timer(test_name)
            
            # Apply k-anonymity
            quasi_identifiers = ["segment", "revenue_bucket", "location"]
            anonymized_data = self.privacy_service.apply_k_anonymity(
                test_data, quasi_identifiers, k=100
            )
            
            duration = self.profiler.end_timer(test_name)
            
            output_ratio = len(anonymized_data) / len(test_data)
            
            print(f"Scenario {scenario['name']}:")
            print(f"  Input records: {len(test_data)}")
            print(f"  Output records: {len(anonymized_data)}")
            print(f"  Output ratio: {output_ratio:.2f}")
            print(f"  Duration: {duration:.4f}s")
            
            # Verify expected output ratio (with some tolerance)
            expected = scenario["expected_output_ratio"]
            assert abs(output_ratio - expected) < 0.2, f"Unexpected output ratio: {output_ratio:.2f} vs expected {expected:.2f}"


class TestBenchmarkingPerformance:
    """Test benchmarking service performance"""
    
    def setup_method(self):
        self.db_mock = Mock()
        self.benchmarking_service = AIBenchmarkingService(self.db_mock)
        self.profiler = PerformanceProfiler()
    
    def test_percentile_calculation_performance(self):
        """Test percentile calculation performance"""
        
        # Create mock benchmark with various percentile distributions
        mock_benchmark = Mock()
        mock_benchmark.percentile_10 = 1000
        mock_benchmark.percentile_25 = 2500
        mock_benchmark.percentile_50 = 5000
        mock_benchmark.percentile_75 = 7500
        mock_benchmark.percentile_90 = 9000
        
        test_sizes = [1000, 10000, 100000]
        
        for size in test_sizes:
            # Generate test values
            test_values = np.random.uniform(500, 10000, size)
            
            self.profiler.start_timer(f"percentile_calc_{size}")
            
            percentiles = []
            for value in test_values:
                percentile = self.benchmarking_service.calculate_percentile_rank(
                    value, mock_benchmark
                )
                percentiles.append(percentile)
            
            duration = self.profiler.end_timer(f"percentile_calc_{size}")
            
            calculations_per_second = size / duration
            print(f"Percentile calculation {size} values: {duration:.4f}s ({calculations_per_second:.0f} calc/sec)")
            
            # Should be very fast
            assert calculations_per_second > 10000, f"Percentile calculation too slow: {calculations_per_second:.0f} calc/sec"
            
            # Verify all percentiles are valid
            assert all(1 <= p <= 100 for p in percentiles), "Invalid percentile values"
    
    def test_benchmark_report_generation_performance(self):
        """Test comprehensive benchmark report generation performance"""
        
        # Mock all required services and data
        with patch.object(self.benchmarking_service, 'get_revenue_benchmark') as mock_revenue:
            with patch.object(self.benchmarking_service, 'get_appointment_volume_benchmark') as mock_appointments:
                with patch.object(self.benchmarking_service, 'get_efficiency_benchmark') as mock_efficiency:
                    with patch.object(self.benchmarking_service, 'get_user_business_segment') as mock_segment:
                        
                        # Setup mock returns
                        from models import BusinessSegment
                        mock_segment.return_value = BusinessSegment.SMALL_SHOP
                        
                        mock_revenue.return_value = Mock(
                            user_value=5000, percentile_rank=75, industry_median=4500,
                            industry_mean=4800, sample_size=150, benchmark_category="revenue",
                            metric_name="monthly_revenue", comparison_text="Strong performance"
                        )
                        
                        mock_appointments.return_value = Mock(
                            user_value=80, percentile_rank=70, industry_median=75,
                            industry_mean=78, sample_size=150, benchmark_category="appointments",
                            metric_name="monthly_appointments", comparison_text="Above average"
                        )
                        
                        mock_efficiency.return_value = Mock(
                            user_value=62.5, percentile_rank=80, industry_median=60,
                            industry_mean=61.5, sample_size=150, benchmark_category="efficiency",
                            metric_name="revenue_per_appointment", comparison_text="High efficiency"
                        )
                        
                        # Test report generation performance
                        num_reports = 100
                        user_ids = range(1, num_reports + 1)
                        
                        self.profiler.start_timer("benchmark_reports")
                        self.profiler.record_memory_usage("benchmark_reports")
                        
                        reports = []
                        for user_id in user_ids:
                            report = self.benchmarking_service.generate_comprehensive_benchmark_report(user_id)
                            reports.append(report)
                        
                        duration = self.profiler.end_timer("benchmark_reports")
                        self.profiler.record_memory_usage("benchmark_reports")
                        
                        reports_per_second = num_reports / duration
                        print(f"Benchmark reports {num_reports} users: {duration:.4f}s ({reports_per_second:.0f} reports/sec)")
                        
                        # Should generate reports quickly
                        assert reports_per_second > 10, f"Report generation too slow: {reports_per_second:.0f} reports/sec"
                        
                        # Verify all reports were generated
                        assert len(reports) == num_reports
                        for report in reports:
                            assert "overall_performance_score" in report
                            assert "benchmarks" in report


class TestPredictiveModelingPerformance:
    """Test predictive modeling performance"""
    
    def setup_method(self):
        self.db_mock = Mock()
        self.prediction_service = PredictiveModelingService(self.db_mock)
        self.profiler = PerformanceProfiler()
    
    def test_revenue_forecast_performance(self):
        """Test revenue forecasting performance"""
        
        # Mock historical data
        historical_data = []
        for i in range(24):  # 24 months of data
            historical_data.append({
                "month": datetime.now() - timedelta(days=30 * (24 - i)),
                "revenue": 4000 + np.random.uniform(-500, 1000),
                "appointments": 60 + np.random.randint(-10, 20)
            })
        
        forecast_horizons = [3, 6, 12, 24]  # months ahead
        
        for months_ahead in forecast_horizons:
            with patch.object(self.prediction_service, '_get_historical_revenue', return_value=historical_data):
                with patch.object(self.prediction_service.benchmarking_service, 'get_user_business_segment'):
                    with patch.object(self.prediction_service, '_get_seasonal_patterns', return_value={i: 1.0 for i in range(1, 13)}):
                        
                        self.profiler.start_timer(f"revenue_forecast_{months_ahead}")
                        
                        predictions = self.prediction_service.predict_revenue_forecast(
                            user_id=1, 
                            months_ahead=months_ahead,
                            include_seasonal=True
                        )
                        
                        duration = self.profiler.end_timer(f"revenue_forecast_{months_ahead}")
                        
                        predictions_per_second = months_ahead / duration
                        print(f"Revenue forecast {months_ahead} months: {duration:.4f}s ({predictions_per_second:.1f} months/sec)")
                        
                        # Should be fast even for long horizons
                        assert duration < 1.0, f"Forecast generation too slow: {duration:.4f}s for {months_ahead} months"
                        assert len(predictions) == months_ahead
    
    def test_churn_prediction_performance(self):
        """Test churn prediction performance with various client counts"""
        
        client_counts = [100, 500, 1000, 5000]
        
        for count in client_counts:
            # Mock client data
            mock_clients = []
            for i in range(count):
                mock_clients.append({
                    "client_id": i,
                    "client_name": f"Client {i}",
                    "last_appointment": datetime.now() - timedelta(days=np.random.randint(1, 120)),
                    "days_since_last": np.random.randint(1, 120),
                    "frequency": np.random.randint(1, 12),
                    "total_value": np.random.uniform(50, 1000)
                })
            
            with patch.object(self.prediction_service, '_get_client_rfm_data', return_value=mock_clients):
                
                self.profiler.start_timer(f"churn_prediction_{count}")
                
                churn_analysis = self.prediction_service.predict_client_churn(user_id=1)
                
                duration = self.profiler.end_timer(f"churn_prediction_{count}")
                
                clients_per_second = count / duration
                print(f"Churn prediction {count} clients: {duration:.4f}s ({clients_per_second:.0f} clients/sec)")
                
                # Should process clients quickly
                assert clients_per_second > 100, f"Churn prediction too slow: {clients_per_second:.0f} clients/sec"
                
                # Verify results structure
                assert "at_risk_clients" in churn_analysis
                assert "total_clients_analyzed" in churn_analysis
                assert churn_analysis["total_clients_analyzed"] == count


class TestConcurrentAccessPerformance:
    """Test performance under concurrent access scenarios"""
    
    def setup_method(self):
        self.db_mock = Mock()
        self.profiler = PerformanceProfiler()
    
    def test_concurrent_benchmark_requests(self):
        """Test concurrent benchmark requests performance"""
        
        num_threads = 10
        requests_per_thread = 20
        
        def make_benchmark_request(thread_id):
            service = AIBenchmarkingService(self.db_mock)
            
            # Mock database queries
            self.db_mock.query.return_value.filter.return_value.scalar.return_value = 5000 + thread_id * 100
            
            mock_benchmark = Mock()
            mock_benchmark.percentile_10 = 1000
            mock_benchmark.percentile_25 = 2500
            mock_benchmark.percentile_50 = 5000
            mock_benchmark.percentile_75 = 7500
            mock_benchmark.percentile_90 = 9000
            mock_benchmark.mean_value = 5200
            mock_benchmark.sample_size = 150
            
            self.db_mock.query.return_value.filter.return_value.order_by.return_value.first.return_value = mock_benchmark
            
            results = []
            for i in range(requests_per_thread):
                try:
                    # Simulate benchmark request
                    percentile = service.calculate_percentile_rank(5000 + i * 100, mock_benchmark)
                    results.append(percentile)
                except Exception as e:
                    results.append(f"Error: {e}")
            
            return thread_id, results
        
        self.profiler.start_timer("concurrent_benchmarks")
        
        # Execute concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [
                executor.submit(make_benchmark_request, thread_id) 
                for thread_id in range(num_threads)
            ]
            
            thread_results = [
                future.result() 
                for future in concurrent.futures.as_completed(futures)
            ]
        
        duration = self.profiler.end_timer("concurrent_benchmarks")
        
        total_requests = num_threads * requests_per_thread
        requests_per_second = total_requests / duration
        
        print(f"Concurrent benchmarks:")
        print(f"  Threads: {num_threads}")
        print(f"  Requests per thread: {requests_per_thread}")
        print(f"  Total requests: {total_requests}")
        print(f"  Duration: {duration:.4f}s")
        print(f"  Throughput: {requests_per_second:.0f} requests/sec")
        
        # Verify all threads completed successfully
        assert len(thread_results) == num_threads
        
        # Check for errors
        error_count = 0
        for thread_id, results in thread_results:
            for result in results:
                if isinstance(result, str) and result.startswith("Error"):
                    error_count += 1
        
        assert error_count == 0, f"{error_count} errors occurred during concurrent execution"
        
        # Performance should be reasonable under concurrent load
        assert requests_per_second > 50, f"Concurrent performance too low: {requests_per_second:.0f} req/sec"
    
    def test_concurrent_privacy_operations(self):
        """Test concurrent privacy operations performance"""
        
        num_threads = 5
        operations_per_thread = 1000
        
        def privacy_operations(thread_id):
            service = PrivacyAnonymizationService(self.db_mock)
            
            results = []
            for i in range(operations_per_thread):
                value = 1000 + (thread_id * operations_per_thread) + i
                noisy_value, noise = service.add_differential_privacy_noise(
                    value, sensitivity=100
                )
                results.append((value, noisy_value, noise))
            
            return thread_id, results
        
        self.profiler.start_timer("concurrent_privacy")
        
        # Execute concurrent privacy operations
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [
                executor.submit(privacy_operations, thread_id)
                for thread_id in range(num_threads)
            ]
            
            thread_results = [
                future.result()
                for future in concurrent.futures.as_completed(futures)
            ]
        
        duration = self.profiler.end_timer("concurrent_privacy")
        
        total_operations = num_threads * operations_per_thread
        operations_per_second = total_operations / duration
        
        print(f"Concurrent privacy operations:")
        print(f"  Threads: {num_threads}")
        print(f"  Operations per thread: {operations_per_thread}")
        print(f"  Total operations: {total_operations}")
        print(f"  Duration: {duration:.4f}s")
        print(f"  Throughput: {operations_per_second:.0f} ops/sec")
        
        # Verify all operations completed
        assert len(thread_results) == num_threads
        
        total_results = sum(len(results) for _, results in thread_results)
        assert total_results == total_operations
        
        # Should maintain good performance under concurrent load
        assert operations_per_second > 1000, f"Concurrent privacy performance too low: {operations_per_second:.0f} ops/sec"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])