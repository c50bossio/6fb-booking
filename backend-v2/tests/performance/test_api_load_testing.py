"""
Load Testing Strategies for API Integration Improvements

Comprehensive load testing for:
- Bulk operations performance
- Rate limiting behavior under load
- Circuit breaker resilience
- Database connection pooling
- Redis performance under concurrent access
"""

import pytest
import asyncio
import aiohttp
import time
import statistics
import random
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Any
import json
import psutil
import redis

from services.enterprise_api_reliability import (
    EnterpriseAPIReliability, 
    APIProvider, 
    BulkConfig, 
    RetryConfig
)
from services.enhanced_webhook_security import EnhancedWebhookSecurity
from services.circuit_breaker_service import CircuitBreakerService
from config.settings import get_settings

settings = get_settings()


class LoadTestMetrics:
    """Collect and analyze load test metrics"""
    
    def __init__(self):
        self.response_times = []
        self.success_count = 0
        self.failure_count = 0
        self.start_time = None
        self.end_time = None
        self.error_details = []
        self.throughput_samples = []
        self.cpu_samples = []
        self.memory_samples = []
    
    def start_test(self):
        """Start collecting metrics"""
        self.start_time = time.time()
        self.response_times = []
        self.success_count = 0
        self.failure_count = 0
        self.error_details = []
        self.throughput_samples = []
        self.cpu_samples = []
        self.memory_samples = []
    
    def record_request(self, response_time: float, success: bool, error: str = None):
        """Record individual request metrics"""
        self.response_times.append(response_time)
        if success:
            self.success_count += 1
        else:
            self.failure_count += 1
            if error:
                self.error_details.append(error)
    
    def sample_system_metrics(self):
        """Sample system resource usage"""
        self.cpu_samples.append(psutil.cpu_percent())
        self.memory_samples.append(psutil.virtual_memory().percent)
    
    def finish_test(self):
        """Finish collecting metrics and calculate results"""
        self.end_time = time.time()
    
    def get_summary(self) -> Dict[str, Any]:
        """Get comprehensive test results summary"""
        if not self.response_times:
            return {"error": "No data collected"}
        
        total_requests = self.success_count + self.failure_count
        duration = self.end_time - self.start_time if self.end_time and self.start_time else 0
        
        return {
            "duration_seconds": duration,
            "total_requests": total_requests,
            "successful_requests": self.success_count,
            "failed_requests": self.failure_count,
            "success_rate": self.success_count / total_requests if total_requests > 0 else 0,
            "requests_per_second": total_requests / duration if duration > 0 else 0,
            "response_times": {
                "min": min(self.response_times),
                "max": max(self.response_times),
                "mean": statistics.mean(self.response_times),
                "median": statistics.median(self.response_times),
                "p95": self._percentile(self.response_times, 95),
                "p99": self._percentile(self.response_times, 99)
            },
            "system_resources": {
                "avg_cpu_percent": statistics.mean(self.cpu_samples) if self.cpu_samples else 0,
                "max_cpu_percent": max(self.cpu_samples) if self.cpu_samples else 0,
                "avg_memory_percent": statistics.mean(self.memory_samples) if self.memory_samples else 0,
                "max_memory_percent": max(self.memory_samples) if self.memory_samples else 0
            },
            "error_breakdown": self._analyze_errors()
        }
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile"""
        return sorted(data)[int(len(data) * percentile / 100)]
    
    def _analyze_errors(self) -> Dict[str, int]:
        """Analyze error patterns"""
        error_counts = {}
        for error in self.error_details:
            error_type = error.split(':')[0] if ':' in error else error
            error_counts[error_type] = error_counts.get(error_type, 0) + 1
        return error_counts


@pytest.mark.load_test
class TestBulkOperationLoadTesting:
    """Load tests for bulk API operations"""
    
    @pytest.fixture(scope="class")
    def api_reliability(self, db_session):
        """API reliability service for load testing"""
        return EnterpriseAPIReliability(db_session)
    
    @pytest.fixture(scope="class")
    def redis_client(self):
        """Redis client for load testing"""
        try:
            client = redis.Redis(
                host=settings.REDIS_HOST or "localhost",
                port=settings.REDIS_PORT or 6379,
                db=settings.REDIS_TEST_DB or 1
            )
            client.ping()
            return client
        except redis.ConnectionError:
            pytest.skip("Redis not available for load tests")
    
    @pytest.mark.asyncio
    async def test_stripe_bulk_customer_creation_load(self, api_reliability):
        """Load test Stripe bulk customer creation"""
        metrics = LoadTestMetrics()
        metrics.start_test()
        
        # Generate test data for bulk customer creation
        customer_data = [
            {
                "email": f"loadtest{i}@example.com",
                "name": f"Load Test Customer {i}",
                "metadata": {"test": "load_test", "batch": i // 100}
            }
            for i in range(1000)  # 1000 customers
        ]
        
        async def mock_create_customer(customer):
            """Mock Stripe customer creation with realistic timing"""
            await asyncio.sleep(random.uniform(0.1, 0.3))  # Simulate API latency
            if random.random() < 0.02:  # 2% failure rate
                raise Exception("Rate limit exceeded")
            return {"id": f"cus_load_test_{customer['email']}", **customer}
        
        # Configure for high throughput
        bulk_config = BulkConfig(
            batch_size=50,
            max_concurrent_batches=10,
            delay_between_batches=0.05,
            auto_adjust_batch_size=True
        )
        
        # Start system monitoring
        monitoring_task = asyncio.create_task(self._monitor_system_resources(metrics))
        
        try:
            # Execute bulk operation
            result = await api_reliability.execute_bulk_operation(
                provider=APIProvider.STRIPE,
                operation_name="create_customer_load_test",
                items=customer_data,
                api_call=mock_create_customer,
                bulk_config=bulk_config
            )
            
            metrics.finish_test()
            
            # Record results
            metrics.success_count = result.successful_items
            metrics.failure_count = result.failed_items
            metrics.response_times = [result.average_response_time] * result.total_items
            
            # Assertions for load test requirements
            assert result.success_rate > 0.95, f"Success rate too low: {result.success_rate}"
            assert result.total_time < 120, f"Total time too high: {result.total_time}s"
            assert result.average_response_time < 2.0, f"Average response time too high: {result.average_response_time}s"
            
            # Performance assertions
            summary = metrics.get_summary()
            assert summary["requests_per_second"] > 8, f"Throughput too low: {summary['requests_per_second']} req/s"
            assert surprise["system_resources"]["max_cpu_percent"] < 80, "CPU usage too high"
            
            print(f"Bulk Customer Creation Load Test Results:")
            print(f"- Total Items: {result.total_items}")
            print(f"- Success Rate: {result.success_rate:.2%}")
            print(f"- Total Time: {result.total_time:.2f}s")
            print(f"- Throughput: {summary['requests_per_second']:.2f} req/s")
            print(f"- Average CPU: {summary['system_resources']['avg_cpu_percent']:.1f}%")
            
        finally:
            monitoring_task.cancel()
    
    @pytest.mark.asyncio
    async def test_twilio_bulk_sms_load(self, api_reliability):
        """Load test Twilio bulk SMS operations"""
        metrics = LoadTestMetrics()
        metrics.start_test()
        
        # Generate SMS data for load testing
        sms_data = [
            {
                "to": f"+1555{1000000 + i:07d}",
                "body": f"Load test message {i}",
                "from": "+15551234567"
            }
            for i in range(500)  # 500 SMS messages
        ]
        
        async def mock_send_sms(sms):
            """Mock Twilio SMS with realistic performance characteristics"""
            # Simulate variable latency
            latency = random.gauss(0.2, 0.05)  # Mean 200ms, std dev 50ms
            await asyncio.sleep(max(0.05, latency))
            
            # Simulate occasional failures
            if random.random() < 0.01:  # 1% failure rate
                raise Exception("Message delivery failed")
            
            return {"sid": f"SM{hash(sms['to'])}", "status": "sent"}
        
        # Configure for SMS throughput limits
        bulk_config = BulkConfig(
            batch_size=25,  # Smaller batches for SMS
            max_concurrent_batches=8,
            delay_between_batches=0.1,
            auto_adjust_batch_size=True
        )
        
        # Execute bulk SMS operation
        result = await api_reliability.execute_bulk_operation(
            provider=APIProvider.TWILIO,
            operation_name="send_sms_load_test",
            items=sms_data,
            api_call=mock_send_sms,
            bulk_config=bulk_config
        )
        
        metrics.finish_test()
        
        # Performance requirements for SMS
        assert result.success_rate > 0.98, f"SMS success rate too low: {result.success_rate}"
        assert result.total_time < 60, f"SMS bulk operation too slow: {result.total_time}s"
        
        print(f"Bulk SMS Load Test Results:")
        print(f"- Messages Sent: {result.successful_items}/{result.total_items}")
        print(f"- Success Rate: {result.success_rate:.2%}")
        print(f"- Messages per Second: {result.total_items / result.total_time:.2f}")
    
    @pytest.mark.asyncio
    async def test_sendgrid_bulk_email_load(self, api_reliability):
        """Load test SendGrid bulk email operations"""
        metrics = LoadTestMetrics()
        metrics.start_test()
        
        # Generate email data
        email_data = [
            {
                "to": f"loadtest{i}@example.com",
                "subject": f"Load Test Email {i}",
                "html": f"<p>This is load test email #{i}</p>",
                "from": "noreply@bookedbarber.com"
            }
            for i in range(200)  # 200 emails
        ]
        
        async def mock_send_email(email):
            """Mock SendGrid email sending"""
            await asyncio.sleep(random.uniform(0.05, 0.15))  # Fast email API
            
            if random.random() < 0.005:  # 0.5% failure rate
                raise Exception("Email bounced")
            
            return {"message_id": f"msg_{hash(email['to'])}", "status": "sent"}
        
        # Email-optimized bulk configuration
        bulk_config = BulkConfig(
            batch_size=100,  # Larger batches for email
            max_concurrent_batches=3,
            delay_between_batches=0.5,  # Respect SendGrid limits
            auto_adjust_batch_size=True
        )
        
        result = await api_reliability.execute_bulk_operation(
            provider=APIProvider.SENDGRID,
            operation_name="send_email_load_test",
            items=email_data,
            api_call=mock_send_email,
            bulk_config=bulk_config
        )
        
        metrics.finish_test()
        
        # Email-specific performance requirements
        assert result.success_rate > 0.99, f"Email success rate too low: {result.success_rate}"
        assert result.total_time < 30, f"Email bulk operation too slow: {result.total_time}s"
        
        print(f"Bulk Email Load Test Results:")
        print(f"- Emails Sent: {result.successful_items}/{result.total_items}")
        print(f"- Success Rate: {result.success_rate:.2%}")
        print(f"- Emails per Second: {result.total_items / result.total_time:.2f}")
    
    @pytest.mark.asyncio
    async def test_adaptive_batch_sizing_under_load(self, api_reliability):
        """Test adaptive batch sizing behavior under varying load conditions"""
        metrics = LoadTestMetrics()
        batch_size_history = []
        
        # Test data
        test_items = [{"id": i, "data": f"item_{i}"} for i in range(300)]
        
        async def variable_performance_api(item):
            """API with variable performance to test adaptation"""
            # Simulate performance degradation over time
            item_id = item["id"]
            if item_id < 100:
                await asyncio.sleep(0.1)  # Fast performance
            elif item_id < 200:
                await asyncio.sleep(0.3)  # Degraded performance
                if random.random() < 0.1:  # 10% failure rate
                    raise Exception("Performance degraded")
            else:
                await asyncio.sleep(0.2)  # Improved performance
            
            return {"processed": True, "id": item_id}
        
        # Enable adaptive batch sizing
        bulk_config = BulkConfig(
            batch_size=50,
            auto_adjust_batch_size=True,
            min_batch_size=10,
            max_batch_size=100
        )
        
        # Track batch size changes during execution
        original_get_adaptive_batch_size = api_reliability._get_adaptive_batch_size
        
        def track_batch_size(provider, operation, config):
            size = original_get_adaptive_batch_size(provider, operation, config)
            batch_size_history.append(size)
            return size
        
        api_reliability._get_adaptive_batch_size = track_batch_size
        
        result = await api_reliability.execute_bulk_operation(
            provider=APIProvider.CUSTOM,
            operation_name="adaptive_test",
            items=test_items,
            api_call=variable_performance_api,
            bulk_config=bulk_config
        )
        
        # Verify adaptive behavior
        assert len(batch_size_history) > 1, "Batch size should have been adapted"
        assert min(batch_size_history) < max(batch_size_history), "Batch size should have varied"
        
        print(f"Adaptive Batch Sizing Results:")
        print(f"- Batch Size Range: {min(batch_size_history)} - {max(batch_size_history)}")
        print(f"- Success Rate: {result.success_rate:.2%}")
        print(f"- Total Time: {result.total_time:.2f}s")
    
    async def _monitor_system_resources(self, metrics: LoadTestMetrics):
        """Monitor system resources during load test"""
        while True:
            try:
                metrics.sample_system_metrics()
                await asyncio.sleep(1)  # Sample every second
            except asyncio.CancelledError:
                break


@pytest.mark.load_test
class TestWebhookSecurityLoadTesting:
    """Load tests for webhook security under high traffic"""
    
    @pytest.fixture(scope="class")
    def webhook_security(self, db_session, redis_client):
        """Webhook security service for load testing"""
        return EnhancedWebhookSecurity(db_session, redis_client)
    
    @pytest.mark.asyncio
    async def test_concurrent_webhook_validation_load(self, webhook_security, redis_client):
        """Test webhook validation under concurrent load"""
        metrics = LoadTestMetrics()
        metrics.start_test()
        
        # Clear Redis state
        redis_client.flushdb()
        
        async def validate_webhook_concurrent(webhook_id: int):
            """Simulate concurrent webhook validation"""
            start_time = time.time()
            
            try:
                # Generate test webhook data
                payload = json.dumps({
                    "id": f"evt_load_test_{webhook_id}",
                    "type": "payment_intent.succeeded",
                    "data": {"object": {"amount": 1000}}
                }).encode('utf-8')
                
                result = webhook_security.validate_webhook_comprehensive(
                    provider="stripe",
                    payload=payload,
                    signature="t=1234567890,v1=test_signature",
                    source_ip="3.18.12.63",  # Valid Stripe IP
                    webhook_secret="test_secret"
                )
                
                response_time = time.time() - start_time
                metrics.record_request(response_time, result.is_valid, result.error_message)
                
                return result
                
            except Exception as e:
                response_time = time.time() - start_time
                metrics.record_request(response_time, False, str(e))
                raise
        
        # Run concurrent webhook validations
        concurrent_webhooks = 100
        tasks = [
            validate_webhook_concurrent(i) 
            for i in range(concurrent_webhooks)
        ]
        
        # Execute all webhooks concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        metrics.finish_test()
        summary = metrics.get_summary()
        
        # Performance requirements
        assert summary["success_rate"] > 0.95, f"Webhook validation success rate too low: {summary['success_rate']}"
        assert summary["response_times"]["p95"] < 1.0, f"P95 response time too high: {summary['response_times']['p95']}s"
        assert summary["requests_per_second"] > 50, f"Throughput too low: {summary['requests_per_second']} req/s"
        
        print(f"Concurrent Webhook Validation Results:")
        print(f"- Total Validations: {summary['total_requests']}")
        print(f"- Success Rate: {summary['success_rate']:.2%}")
        print(f"- P95 Response Time: {summary['response_times']['p95']:.3f}s")
        print(f"- Throughput: {summary['requests_per_second']:.2f} validations/s")
    
    @pytest.mark.asyncio
    async def test_rate_limiting_under_sustained_load(self, webhook_security, redis_client):
        """Test rate limiting behavior under sustained high load"""
        metrics = LoadTestMetrics()
        rate_limited_count = 0
        
        # Clear rate limiting data
        redis_client.flushdb()
        
        async def make_rate_limited_request(request_id: int):
            """Make request that may hit rate limits"""
            nonlocal rate_limited_count
            
            result = webhook_security._check_advanced_rate_limit("stripe", "3.18.12.63")
            
            if not result["allowed"]:
                rate_limited_count += 1
            
            return result
        
        # Generate sustained load
        total_requests = 1000
        batch_size = 50
        
        for batch_start in range(0, total_requests, batch_size):
            batch_end = min(batch_start + batch_size, total_requests)
            batch_tasks = [
                make_rate_limited_request(i) 
                for i in range(batch_start, batch_end)
            ]
            
            await asyncio.gather(*batch_tasks)
            await asyncio.sleep(0.1)  # Small delay between batches
        
        # Verify rate limiting worked properly
        rate_limited_percentage = rate_limited_count / total_requests
        
        print(f"Rate Limiting Under Load Results:")
        print(f"- Total Requests: {total_requests}")
        print(f"- Rate Limited: {rate_limited_count} ({rate_limited_percentage:.2%})")
        
        # Should have some rate limiting under sustained load
        assert rate_limited_count > 0, "Rate limiting should have triggered under sustained load"
        assert rate_limited_percentage < 0.9, "Rate limiting should not block everything"
    
    def test_redis_performance_under_load(self, redis_client):
        """Test Redis performance characteristics under webhook load"""
        metrics = LoadTestMetrics()
        metrics.start_test()
        
        # Simulate webhook data storage patterns
        def redis_operations_batch():
            """Perform typical webhook Redis operations"""
            start_time = time.time()
            
            try:
                # Rate limiting operations
                pipe = redis_client.pipeline()
                pipe.zremrangebyscore("rate_test", 0, time.time() - 60)
                pipe.zadd("rate_test", {str(time.time()): time.time()})
                pipe.expire("rate_test", 120)
                pipe.execute()
                
                # IP reputation operations
                redis_client.hincrby("ip_rep_test", "successful_webhooks", 1)
                redis_client.expire("ip_rep_test", 3600)
                
                # Duplicate detection
                redis_client.hset("dup_test", "payload_hash", "abc123")
                redis_client.expire("dup_test", 900)
                
                response_time = time.time() - start_time
                metrics.record_request(response_time, True)
                
            except Exception as e:
                response_time = time.time() - start_time
                metrics.record_request(response_time, False, str(e))
        
        # Run Redis operations in parallel
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [
                executor.submit(redis_operations_batch)
                for _ in range(1000)
            ]
            
            # Wait for completion
            for future in futures:
                future.result()
        
        metrics.finish_test()
        summary = metrics.get_summary()
        
        # Redis performance requirements
        assert summary["success_rate"] > 0.99, f"Redis success rate too low: {summary['success_rate']}"
        assert summary["response_times"]["p95"] < 0.05, f"Redis P95 too high: {summary['response_times']['p95']}s"
        
        print(f"Redis Performance Under Load:")
        print(f"- Operations: {summary['total_requests']}")
        print(f"- Success Rate: {summary['success_rate']:.2%}")
        print(f"- P95 Response Time: {summary['response_times']['p95']:.4f}s")
        print(f"- Operations/Second: {summary['requests_per_second']:.2f}")


@pytest.mark.load_test
class TestCircuitBreakerLoadTesting:
    """Load tests for circuit breaker behavior"""
    
    @pytest.fixture
    def circuit_breaker(self):
        """Circuit breaker for load testing"""
        return CircuitBreakerService()
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_under_failure_load(self, circuit_breaker):
        """Test circuit breaker behavior under high failure rates"""
        service_key = "load_test_service"
        metrics = LoadTestMetrics()
        metrics.start_test()
        
        async def failing_service_call():
            """Simulate a failing service"""
            if circuit_breaker.can_execute(service_key):
                # Simulate high failure rate
                if random.random() < 0.7:  # 70% failure rate
                    circuit_breaker.record_failure(service_key)
                    raise Exception("Service failure")
                else:
                    circuit_breaker.record_success(service_key)
                    return {"status": "success"}
            else:
                raise Exception("Circuit breaker open")
        
        # Make many requests to trigger circuit breaker
        total_requests = 200
        open_circuit_count = 0
        
        for i in range(total_requests):
            start_time = time.time()
            
            try:
                result = await failing_service_call()
                response_time = time.time() - start_time
                metrics.record_request(response_time, True)
                
            except Exception as e:
                response_time = time.time() - start_time
                error_msg = str(e)
                metrics.record_request(response_time, False, error_msg)
                
                if "circuit breaker open" in error_msg:
                    open_circuit_count += 1
            
            # Small delay between requests
            await asyncio.sleep(0.01)
        
        metrics.finish_test()
        summary = metrics.get_summary()
        
        # Verify circuit breaker activated
        assert open_circuit_count > 0, "Circuit breaker should have opened under high failure rate"
        
        # Circuit breaker should have protected from making too many failing calls
        actual_failure_rate = summary["failed_requests"] / summary["total_requests"]
        
        print(f"Circuit Breaker Load Test Results:")
        print(f"- Total Requests: {summary['total_requests']}")
        print(f"- Circuit Breaker Activations: {open_circuit_count}")
        print(f"- Final Failure Rate: {actual_failure_rate:.2%}")
        print(f"- Final Circuit State: {circuit_breaker.get_state(service_key)}")


def run_load_tests():
    """Run all load tests with performance reporting"""
    print("Starting API Integration Load Tests...")
    print("=" * 50)
    
    # Run load tests
    pytest.main([
        __file__,
        "-v",
        "-m", "load_test",
        "--tb=short",
        "--durations=10",
        "-s"  # Show print statements
    ])


if __name__ == "__main__":
    run_load_tests()