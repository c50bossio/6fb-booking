"""
Performance tests for payment system optimizations.

Tests database query performance, indexing effectiveness,
and system scalability under load.
"""

import pytest
import time
import threading
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch
import statistics

from sqlalchemy import text
from services.optimized_payment_queries import OptimizedPaymentQueries, PaymentQueryOptimizer
from tests.factories import UserFactory, AppointmentFactory, PaymentFactory


class TestPaymentQueryPerformance:
    """Test performance of optimized payment queries."""
    
    def create_test_dataset(self, db_session, num_payments=1000):
        """Create a large test dataset for performance testing."""
        print(f"Creating test dataset with {num_payments} payments...")
        
        # Create users and appointments
        users = []
        appointments = []
        barbers = []
        
        # Create 50 barbers
        for i in range(50):
            barber = UserFactory.create_barber(
                email=f"barber{i}@test.com",
                name=f"Barber {i}"
            )
            barbers.append(barber)
            users.append(barber)
        
        # Create 100 regular users
        for i in range(100):
            user = UserFactory.create_user(
                email=f"client{i}@test.com",
                name=f"Client {i}"
            )
            users.append(user)
        
        db_session.add_all(users)
        db_session.commit()
        
        # Create appointments and payments
        payments = []
        base_time = datetime.utcnow() - timedelta(days=30)
        
        for i in range(num_payments):
            # Randomly assign to barber and client
            barber = barbers[i % len(barbers)]
            client = users[len(barbers) + (i % 100)]
            
            appointment = AppointmentFactory.create_appointment(
                user_id=client.id,
                barber_id=barber.id,
                start_time=base_time + timedelta(hours=i % 720)  # Spread over 30 days
            )
            
            # Create payment with varied status (90% successful)
            status = "completed" if i % 10 != 0 else "failed"
            payment = PaymentFactory.create_payment(
                user_id=client.id,
                barber_id=barber.id,
                appointment_id=appointment.id,
                amount=Decimal(str(20 + (i % 100))),  # Varied amounts
                status=status,
                created_at=base_time + timedelta(hours=i % 720),
                stripe_payment_intent_id=f"pi_test_{i}" if status == "completed" else None
            )
            
            appointments.append(appointment)
            payments.append(payment)
            
            # Batch insert for better performance
            if (i + 1) % 100 == 0:
                db_session.add_all(appointments[-100:])
                db_session.add_all(payments[-100:])
                db_session.commit()
                print(f"Created {i + 1} payments...")
        
        # Final commit
        db_session.add_all(appointments[-(num_payments % 100):])
        db_session.add_all(payments[-(num_payments % 100):])
        db_session.commit()
        
        print(f"Test dataset created successfully: {num_payments} payments")
        return users, appointments, payments
    
    @pytest.mark.performance
    def test_get_user_payments_paginated_performance(self, db_session):
        """Test performance of paginated user payment queries."""
        # Create test dataset
        users, appointments, payments = self.create_test_dataset(db_session, 1000)
        
        client = users[50]  # Get a client user
        
        # Test query performance
        start_time = time.time()
        
        user_payments, total_count = OptimizedPaymentQueries.get_user_payments_paginated(
            db=db_session,
            user_id=client.id,
            limit=20,
            offset=0
        )
        
        end_time = time.time()
        query_time = end_time - start_time
        
        print(f"User payments query time: {query_time:.3f} seconds")
        print(f"Found {len(user_payments)} payments out of {total_count} total")
        
        # Performance assertion: should complete under 100ms with proper indexes
        assert query_time < 0.1, f"Query too slow: {query_time:.3f}s"
        assert len(user_payments) <= 20
        assert total_count >= len(user_payments)
    
    @pytest.mark.performance
    def test_barber_earnings_summary_performance(self, db_session):
        """Test performance of barber earnings aggregation."""
        users, appointments, payments = self.create_test_dataset(db_session, 1000)
        
        barber = users[0]  # Get a barber
        start_date = datetime.utcnow() - timedelta(days=7)
        end_date = datetime.utcnow()
        
        # Test query performance
        start_time = time.time()
        
        earnings_summary = OptimizedPaymentQueries.get_barber_earnings_summary(
            db=db_session,
            barber_id=barber.id,
            start_date=start_date,
            end_date=end_date
        )
        
        end_time = time.time()
        query_time = end_time - start_time
        
        print(f"Barber earnings query time: {query_time:.3f} seconds")
        print(f"Earnings summary: {earnings_summary}")
        
        # Performance assertion
        assert query_time < 0.1, f"Earnings query too slow: {query_time:.3f}s"
        assert earnings_summary['barber_id'] == barber.id
        assert 'total_payments' in earnings_summary
        assert 'total_earnings' in earnings_summary
    
    @pytest.mark.performance
    def test_payment_dashboard_metrics_performance(self, db_session):
        """Test performance of payment dashboard metrics."""
        self.create_test_dataset(db_session, 2000)
        
        # Test query performance
        start_time = time.time()
        
        dashboard_metrics = OptimizedPaymentQueries.get_payment_metrics_dashboard(
            db=db_session,
            days_back=30
        )
        
        end_time = time.time()
        query_time = end_time - start_time
        
        print(f"Dashboard metrics query time: {query_time:.3f} seconds")
        print(f"Dashboard metrics: {dashboard_metrics}")
        
        # Performance assertion
        assert query_time < 0.2, f"Dashboard query too slow: {query_time:.3f}s"
        assert 'total_payments' in dashboard_metrics
        assert 'success_rate' in dashboard_metrics
        assert 'total_revenue' in dashboard_metrics
    
    @pytest.mark.performance
    def test_concurrent_query_performance(self, db_session):
        """Test performance under concurrent query load."""
        self.create_test_dataset(db_session, 500)
        
        def run_concurrent_queries(user_id, results):
            """Run queries concurrently and measure performance."""
            start_time = time.time()
            
            # Multiple different queries
            user_payments, _ = OptimizedPaymentQueries.get_user_payments_paginated(
                db=db_session, user_id=user_id, limit=10
            )
            
            dashboard_metrics = OptimizedPaymentQueries.get_payment_metrics_dashboard(
                db=db_session, days_back=7
            )
            
            end_time = time.time()
            results.append(end_time - start_time)
        
        # Run 10 concurrent queries
        threads = []
        results = []
        
        start_time = time.time()
        
        for i in range(10):
            user_id = 51 + (i % 50)  # Use different users
            thread = threading.Thread(target=run_concurrent_queries, args=(user_id, results))
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        total_time = time.time() - start_time
        
        print(f"Concurrent queries completed in {total_time:.3f} seconds")
        print(f"Individual query times: {[f'{t:.3f}s' for t in results]}")
        print(f"Average query time: {statistics.mean(results):.3f} seconds")
        print(f"Max query time: {max(results):.3f} seconds")
        
        # Performance assertions
        assert total_time < 5.0, f"Concurrent queries too slow: {total_time:.3f}s"
        assert max(results) < 1.0, f"Slowest query too slow: {max(results):.3f}s"
        assert len(results) == 10
    
    @pytest.mark.performance
    def test_large_dataset_query_scaling(self, db_session):
        """Test query performance scaling with large datasets."""
        # Test with progressively larger datasets
        dataset_sizes = [100, 500, 1000, 2000]
        query_times = []
        
        for size in dataset_sizes:
            # Clean up previous data
            db_session.execute(text("DELETE FROM payments"))
            db_session.execute(text("DELETE FROM appointments"))
            db_session.execute(text("DELETE FROM users"))
            db_session.commit()
            
            # Create dataset
            users, _, _ = self.create_test_dataset(db_session, size)
            
            # Test query performance
            start_time = time.time()
            
            dashboard_metrics = OptimizedPaymentQueries.get_payment_metrics_dashboard(
                db=db_session,
                days_back=30
            )
            
            query_time = time.time() - start_time
            query_times.append(query_time)
            
            print(f"Dataset size: {size}, Query time: {query_time:.3f}s")
        
        # Performance should not degrade significantly with size
        # (due to proper indexing)
        print(f"Query times for datasets {dataset_sizes}: {[f'{t:.3f}s' for t in query_times]}")
        
        # The largest dataset should not be more than 5x slower than smallest
        scaling_factor = query_times[-1] / query_times[0]
        print(f"Performance scaling factor: {scaling_factor:.2f}x")
        
        assert scaling_factor < 5.0, f"Poor performance scaling: {scaling_factor:.2f}x"
        assert all(t < 0.5 for t in query_times), "Some queries too slow"
    
    @pytest.mark.performance
    def test_complex_filtered_queries_performance(self, db_session):
        """Test performance of complex filtered queries."""
        users, appointments, payments = self.create_test_dataset(db_session, 1500)
        
        barber = users[0]
        start_date = datetime.utcnow() - timedelta(days=30)
        end_date = datetime.utcnow() - timedelta(days=1)
        
        # Test complex filtered query
        start_time = time.time()
        
        # Multiple filters applied
        filtered_payments, total_count = OptimizedPaymentQueries.get_user_payments_paginated(
            db=db_session,
            user_id=barber.id,
            limit=50,
            offset=0,
            start_date=start_date,
            end_date=end_date,
            status_filter="completed"
        )
        
        end_time = time.time()
        query_time = end_time - start_time
        
        print(f"Complex filtered query time: {query_time:.3f} seconds")
        print(f"Found {len(filtered_payments)} payments out of {total_count} total")
        
        # Performance assertion
        assert query_time < 0.15, f"Filtered query too slow: {query_time:.3f}s"
    
    @pytest.mark.performance 
    def test_high_value_payments_query_performance(self, db_session):
        """Test performance of high-value payment queries (fraud detection)."""
        self.create_test_dataset(db_session, 1000)
        
        start_date = datetime.utcnow() - timedelta(days=7)
        end_date = datetime.utcnow()
        
        # Test high-value payment query
        start_time = time.time()
        
        high_value_payments = OptimizedPaymentQueries.get_high_value_payments(
            db=db_session,
            min_amount=Decimal("100.00"),
            start_date=start_date,
            end_date=end_date,
            limit=100
        )
        
        end_time = time.time()
        query_time = end_time - start_time
        
        print(f"High-value payments query time: {query_time:.3f} seconds")
        print(f"Found {len(high_value_payments)} high-value payments")
        
        # Performance assertion
        assert query_time < 0.1, f"High-value query too slow: {query_time:.3f}s"
        
        # Verify results are correct
        for payment in high_value_payments:
            assert payment.amount >= Decimal("100.00")


class TestPaymentQueryOptimizer:
    """Test payment query optimizer functionality."""
    
    @pytest.mark.performance
    def test_query_analysis(self, db_session):
        """Test query performance analysis."""
        # Skip if not PostgreSQL (EXPLAIN ANALYZE not available in SQLite)
        if "postgresql" not in str(db_session.bind.url):
            pytest.skip("Query analysis only available with PostgreSQL")
        
        test_query = """
        SELECT COUNT(*) as payment_count, SUM(amount) as total_amount
        FROM payments 
        WHERE status = 'completed' 
          AND created_at >= NOW() - INTERVAL '7 days'
        """
        
        optimizer = PaymentQueryOptimizer()
        analysis = optimizer.analyze_query_performance(db_session, test_query)
        
        assert 'query' in analysis
        assert 'execution_plan' in analysis
        assert analysis['query'] == test_query
        print(f"Query analysis: {analysis}")
    
    @pytest.mark.performance
    def test_index_usage_stats(self, db_session):
        """Test index usage statistics."""
        # Skip if not PostgreSQL
        if "postgresql" not in str(db_session.bind.url):
            pytest.skip("Index usage stats only available with PostgreSQL")
        
        optimizer = PaymentQueryOptimizer()
        index_stats = optimizer.get_index_usage_stats(db_session)
        
        print(f"Index usage statistics: {index_stats}")
        
        # Should return list of index statistics
        assert isinstance(index_stats, list)
        
        # If indexes exist, verify structure
        if index_stats:
            for stat in index_stats:
                assert 'table' in stat
                assert 'index' in stat
                assert 'times_used' in stat
    
    def test_connection_pool_recommendations(self):
        """Test connection pool optimization recommendations."""
        optimizer = PaymentQueryOptimizer()
        recommendations = optimizer.optimize_connection_pool()
        
        assert 'recommendations' in recommendations
        assert 'production_settings' in recommendations
        
        # Verify key recommendations
        rec = recommendations['recommendations']
        assert rec['pool_size'] >= 10
        assert rec['max_overflow'] >= 20
        assert rec['pool_timeout'] >= 30
        assert rec['pool_pre_ping'] is True
        
        # Verify production settings
        prod = recommendations['production_settings']
        assert 'statement_timeout' in prod
        assert 'shared_buffers' in prod
        assert 'max_connections' in prod
        
        print(f"Connection pool recommendations: {recommendations}")


class TestMemoryUsageOptimization:
    """Test memory usage optimization in payment queries."""
    
    @pytest.mark.performance
    def test_paginated_query_memory_efficiency(self, db_session):
        """Test that paginated queries use minimal memory."""
        self.create_test_dataset(db_session, 1000)
        
        # Test large offset pagination (should still be efficient)
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        memory_before = process.memory_info().rss / 1024 / 1024  # MB
        
        # Query with large offset
        payments, total = OptimizedPaymentQueries.get_user_payments_paginated(
            db=db_session,
            user_id=51,  # Client user
            limit=20,
            offset=800  # Large offset
        )
        
        memory_after = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = memory_after - memory_before
        
        print(f"Memory usage - Before: {memory_before:.1f}MB, After: {memory_after:.1f}MB")
        print(f"Memory increase: {memory_increase:.1f}MB")
        print(f"Found {len(payments)} payments")
        
        # Memory increase should be minimal (< 50MB)
        assert memory_increase < 50, f"Excessive memory usage: {memory_increase:.1f}MB"
        assert len(payments) <= 20
    
    def create_test_dataset(self, db_session, num_payments):
        """Helper method for creating test dataset."""
        # Reuse the method from TestPaymentQueryPerformance
        test_instance = TestPaymentQueryPerformance()
        return test_instance.create_test_dataset(db_session, num_payments)


class TestQueryCacheEffectiveness:
    """Test query caching and optimization effectiveness."""
    
    @pytest.mark.performance
    def test_repeated_query_performance(self, db_session):
        """Test that repeated queries benefit from caching/optimization."""
        self.create_test_dataset(db_session, 500)
        
        barber_id = 1
        
        # Run same query multiple times and measure performance
        query_times = []
        
        for i in range(5):
            start_time = time.time()
            
            earnings = OptimizedPaymentQueries.get_barber_earnings_summary(
                db=db_session,
                barber_id=barber_id,
                start_date=datetime.utcnow() - timedelta(days=7),
                end_date=datetime.utcnow()
            )
            
            query_time = time.time() - start_time
            query_times.append(query_time)
            
            print(f"Query {i+1} time: {query_time:.3f} seconds")
        
        print(f"All query times: {[f'{t:.3f}s' for t in query_times]}")
        print(f"Average: {statistics.mean(query_times):.3f}s")
        
        # Later queries should be faster or consistent (due to caching/optimization)
        first_query = query_times[0]
        avg_later_queries = statistics.mean(query_times[1:])
        
        print(f"First query: {first_query:.3f}s, Average later: {avg_later_queries:.3f}s")
        
        # Later queries should not be significantly slower
        assert avg_later_queries <= first_query * 1.5, "Query performance degraded"
    
    def create_test_dataset(self, db_session, num_payments):
        """Helper method for creating test dataset."""
        test_instance = TestPaymentQueryPerformance()
        return test_instance.create_test_dataset(db_session, num_payments)


# Performance test markers
pytestmark = pytest.mark.performance