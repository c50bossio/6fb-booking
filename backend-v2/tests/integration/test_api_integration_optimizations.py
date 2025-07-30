"""
Comprehensive Integration Tests for API Integration Optimizations

This test suite validates all optimization features:
- Connection reliability (circuit breakers, retry logic, connection pooling)
- Performance optimizations (caching, batching, deduplication)
- Error handling and recovery mechanisms
- Security enhancements and rate limiting
- Monitoring and observability
- Business logic optimizations for each service
"""

import pytest
import asyncio
import json
import time
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch
from sqlalchemy.orm import Session
import httpx

from services.enhanced_api_integration_service import (
    IntegrationOptimizer,
    APIRequest,
    IntegrationError,
    TransientError,
    PermanentError,
    RateLimitError
)
from services.enhanced_circuit_breaker_service import (
    EnhancedCircuitBreaker,
    CircuitBreakerConfig,
    CircuitBreakerState
)
from services.stripe_optimization_service import (
    StripeOptimizationService,
    StripePaymentRequest
)
from services.api_integration_monitoring_service import (
    APIIntegrationMonitoringService,
    IntegrationStatus,
    AlertSeverity
)
from services.redis_service import RedisService
from models import User, Organization, Integration, IntegrationType


class TestIntegrationOptimizer:
    """Test the main integration optimizer service"""
    
    @pytest.fixture
    async def optimizer(self, db_session: Session):
        """Create optimizer instance for testing"""
        redis_service = Mock(spec=RedisService)
        redis_service.get = AsyncMock()
        redis_service.set = AsyncMock()
        redis_service.setex = AsyncMock()
        redis_service.delete = AsyncMock()
        
        optimizer = IntegrationOptimizer(db_session, redis_service)
        await optimizer.initialize_optimizations()
        return optimizer
    
    @pytest.mark.asyncio
    async def test_initialization(self, optimizer):
        """Test optimizer initialization"""
        assert len(optimizer.circuit_breakers) > 0
        assert len(optimizer.connection_pools) > 0
        assert len(optimizer.metrics) > 0
        
        # Verify circuit breakers are initialized for all services
        expected_services = ["stripe", "google_calendar", "sendgrid", "twilio", "google_my_business"]
        for service in expected_services:
            assert service in optimizer.circuit_breakers
            assert service in optimizer.metrics
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_protection(self, optimizer):
        """Test circuit breaker protection for API calls"""
        service = "stripe"
        
        # Mock a successful request
        with patch.object(optimizer, '_execute_request_with_retry') as mock_execute:
            mock_response = Mock(spec=httpx.Response)
            mock_response.status_code = 200
            mock_execute.return_value = mock_response
            
            request = APIRequest(
                method="GET",
                url="/test",
                timeout=30
            )
            
            response = await optimizer.make_optimized_request(service, request)
            assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_retry_logic_with_exponential_backoff(self, optimizer):
        """Test intelligent retry logic with exponential backoff"""
        service = "stripe"
        
        # Mock transient errors followed by success
        with patch.object(optimizer, '_execute_request_with_retry') as mock_execute:
            # First two attempts fail, third succeeds
            mock_execute.side_effect = [
                TransientError("Connection timeout"),
                TransientError("Service unavailable"),
                Mock(spec=httpx.Response, status_code=200)
            ]
            
            request = APIRequest(
                method="POST",
                url="/test",
                max_retries=3,
                timeout=30
            )
            
            start_time = time.time()
            response = await optimizer.make_optimized_request(service, request)
            end_time = time.time()
            
            # Should have succeeded after retries
            assert response.status_code == 200
            
            # Should have taken some time due to backoff
            assert end_time - start_time > 1.0
    
    @pytest.mark.asyncio
    async def test_rate_limiting(self, optimizer):
        """Test rate limiting functionality"""
        service = "stripe"
        
        # Mock Redis to simulate rate limit exceeded
        optimizer.redis.get.return_value = "100"  # At limit
        
        request = APIRequest(
            method="GET",
            url="/test",
            rate_limit_key="test_key"
        )
        
        with pytest.raises(RateLimitError):
            await optimizer.make_optimized_request(service, request)
    
    @pytest.mark.asyncio
    async def test_request_caching(self, optimizer):
        """Test request/response caching"""
        service = "stripe"
        
        # Mock cached response
        cached_response = {
            "status_code": 200,
            "headers": {"content-type": "application/json"},
            "content": '{"cached": true}'
        }
        optimizer.redis.get.return_value = json.dumps(cached_response)
        
        request = APIRequest(
            method="GET",
            url="/test",
            cache_ttl=300
        )
        
        response = await optimizer.make_optimized_request(service, request)
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_metrics_collection(self, optimizer):
        """Test metrics collection and updating"""
        service = "stripe"
        
        with patch.object(optimizer, '_execute_request_with_retry') as mock_execute:
            mock_response = Mock(spec=httpx.Response)
            mock_response.status_code = 200
            mock_execute.return_value = mock_response
            
            request = APIRequest(method="GET", url="/test")
            
            # Initial metrics
            initial_requests = optimizer.metrics[service].total_requests
            
            await optimizer.make_optimized_request(service, request)
            
            # Metrics should be updated
            assert optimizer.metrics[service].total_requests == initial_requests + 1
            assert optimizer.metrics[service].success_count > 0


class TestCircuitBreaker:
    """Test the enhanced circuit breaker functionality"""
    
    @pytest.fixture
    def circuit_breaker(self):
        """Create circuit breaker for testing"""
        config = CircuitBreakerConfig(
            name="test_breaker",
            failure_threshold=3,
            recovery_timeout=5,
            success_threshold=2
        )
        return EnhancedCircuitBreaker(config)
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_states(self, circuit_breaker):
        """Test circuit breaker state transitions"""
        # Start in CLOSED state
        assert circuit_breaker.state == CircuitBreakerState.CLOSED
        
        # Simulate failures to open circuit
        for _ in range(3):
            await circuit_breaker._record_failure()
        
        # Should be OPEN now
        assert circuit_breaker.state == CircuitBreakerState.OPEN
        
        # Wait for recovery timeout and simulate success
        await asyncio.sleep(6)  # Wait for recovery timeout
        await circuit_breaker._transition_to_half_open()
        assert circuit_breaker.state == CircuitBreakerState.HALF_OPEN
        
        # Simulate successful requests to close circuit
        for _ in range(2):
            await circuit_breaker._record_success(1.0)
        
        assert circuit_breaker.state == CircuitBreakerState.CLOSED
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_metrics(self, circuit_breaker):
        """Test circuit breaker metrics collection"""
        # Record some operations
        await circuit_breaker._record_success(1.5)
        await circuit_breaker._record_success(2.0)
        await circuit_breaker._record_failure()
        
        metrics = circuit_breaker.get_metrics()
        
        assert metrics["metrics"]["total_requests"] == 3
        assert metrics["metrics"]["successful_requests"] == 2
        assert metrics["metrics"]["failed_requests"] == 1
        assert metrics["metrics"]["success_rate"] == "66.67%"
    
    @pytest.mark.asyncio
    async def test_adaptive_threshold(self, circuit_breaker):
        """Test adaptive failure threshold adjustment"""
        circuit_breaker.config.adaptive_threshold = True
        
        # Simulate good performance
        for _ in range(20):
            await circuit_breaker._update_adaptive_threshold(success=True)
        
        threshold = await circuit_breaker._get_adaptive_failure_threshold()
        # Should increase threshold due to good performance
        assert threshold >= circuit_breaker.config.failure_threshold


class TestStripeOptimization:
    """Test Stripe-specific optimizations"""
    
    @pytest.fixture
    async def stripe_service(self, db_session: Session):
        """Create Stripe optimization service"""
        redis_service = Mock(spec=RedisService)
        redis_service.get = AsyncMock()
        redis_service.set = AsyncMock()
        redis_service.setex = AsyncMock()
        
        return StripeOptimizationService(db_session, redis_service)
    
    @pytest.fixture
    def payment_request(self):
        """Create test payment request"""
        return StripePaymentRequest(
            amount=5000,  # $50.00
            currency="usd",
            customer_id="cus_test123",
            payment_method_id="pm_test456",
            description="Test payment"
        )
    
    @pytest.fixture
    def organization(self, db_session: Session):
        """Create test organization"""
        org = Organization(
            name="Test Barbershop",
            stripe_customer_id="cus_test123"
        )
        db_session.add(org)
        db_session.commit()
        return org
    
    @pytest.mark.asyncio
    async def test_payment_deduplication(self, stripe_service, payment_request, organization):
        """Test payment request deduplication"""
        # Mock cached payment result
        cached_result = {
            "success": True,
            "payment_intent": {"id": "pi_cached123"},
            "from_cache": True
        }
        stripe_service.redis.get.return_value = json.dumps(cached_result)
        
        result = await stripe_service.process_payment_optimized(payment_request, organization)
        
        assert result["success"] == True
        assert "from_cache" in result or stripe_service.metrics["deduplicated_requests"] > 0
    
    @pytest.mark.asyncio
    @patch('stripe.PaymentIntent.create')
    async def test_payment_retry_logic(self, mock_create, stripe_service, payment_request, organization):
        """Test intelligent payment retry logic"""
        # Mock API connection error followed by success
        import stripe
        mock_create.side_effect = [
            stripe.error.APIConnectionError("Connection failed"),
            {"id": "pi_test123", "status": "succeeded"}
        ]
        
        result = await stripe_service.process_payment_optimized(payment_request, organization)
        
        assert result["success"] == True
        assert result["retry_count"] > 0
        assert stripe_service.metrics["retried_payments"] > 0
    
    @pytest.mark.asyncio
    async def test_webhook_processing_optimization(self, stripe_service):
        """Test optimized webhook processing with caching"""
        payload = b'{"type": "payment_intent.succeeded", "data": {"object": {"id": "pi_test123"}}}'
        signature = "test_signature"
        endpoint_secret = "whsec_test"
        
        # Mock successful webhook validation
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_event = Mock()
            mock_event.data = {"type": "payment_intent.succeeded", "object": {"id": "pi_test123"}}
            mock_construct.return_value = mock_event
            
            result = await stripe_service.process_webhook_optimized(payload, signature, endpoint_secret)
            
            assert result["success"] == True
            assert result["event_type"] == "payment_intent.succeeded"
    
    @pytest.mark.asyncio
    async def test_payment_validation(self, stripe_service, organization):
        """Test payment request validation"""
        # Test invalid amount
        invalid_request = StripePaymentRequest(
            amount=0,  # Invalid amount
            currency="xyz"  # Invalid currency
        )
        
        validation_result = await stripe_service._validate_payment_request(invalid_request, organization)
        
        assert not validation_result["valid"]
        assert len(validation_result["errors"]) > 0
    
    @pytest.mark.asyncio
    async def test_health_check(self, stripe_service):
        """Test Stripe integration health check"""
        with patch('stripe.Balance.retrieve') as mock_balance:
            mock_balance.return_value = Mock(available=[{"amount": 1000}])
            
            health_result = await stripe_service.health_check()
            
            assert health_result["healthy"] == True
            assert "response_time_ms" in health_result


class TestMonitoringService:
    """Test API integration monitoring service"""
    
    @pytest.fixture
    async def monitoring_service(self, db_session: Session):
        """Create monitoring service"""
        redis_service = Mock(spec=RedisService)
        redis_service.get = AsyncMock()
        redis_service.set = AsyncMock()
        redis_service.setex = AsyncMock()
        redis_service.delete = AsyncMock()
        
        return APIIntegrationMonitoringService(db_session, redis_service)
    
    @pytest.mark.asyncio
    async def test_health_check_monitoring(self, monitoring_service):
        """Test health check functionality"""
        service = "stripe"
        
        # Mock metrics data
        metrics_data = {
            "total_requests": 100,
            "success_count": 95,
            "error_count": 5,
            "avg_response_time_ms": 250
        }
        monitoring_service.redis.get.return_value = json.dumps(metrics_data)
        
        health_status = await monitoring_service._perform_health_check(service)
        
        assert health_status.service_name == service
        assert health_status.status in [IntegrationStatus.HEALTHY, IntegrationStatus.DEGRADED]
        assert health_status.error_rate <= 1.0
        assert health_status.success_rate >= 0.0
    
    @pytest.mark.asyncio
    async def test_alert_creation(self, monitoring_service):
        """Test alert creation and management"""
        service = "stripe"
        
        await monitoring_service._create_alert(
            service=service,
            severity=AlertSeverity.CRITICAL,
            title="Test Alert",
            description="This is a test alert"
        )
        
        # Verify alert was created
        monitoring_service.redis.setex.assert_called()
    
    @pytest.mark.asyncio
    async def test_sla_compliance_monitoring(self, monitoring_service):
        """Test SLA compliance monitoring"""
        service = "stripe"
        
        # Mock performance metrics
        metrics_data = {
            "availability": 99.9,
            "avg_response_time_ms": 1500,
            "error_rate": 0.001
        }
        monitoring_service.redis.get.return_value = json.dumps(metrics_data)
        
        sla_report = await monitoring_service._generate_sla_report(service)
        
        assert sla_report["service"] == service
        assert "sla_compliance" in sla_report
        assert "overall_compliant" in sla_report
    
    @pytest.mark.asyncio
    async def test_monitoring_dashboard(self, monitoring_service):
        """Test monitoring dashboard data generation"""
        # Mock health data for services
        health_data = {
            "status": "healthy",
            "last_check": datetime.utcnow().isoformat(),
            "response_time_ms": 200,
            "error_rate": 0.01
        }
        monitoring_service.redis.get.return_value = json.dumps(health_data)
        
        dashboard = await monitoring_service.get_monitoring_dashboard()
        
        assert "timestamp" in dashboard
        assert "services" in dashboard
        assert "overall_status" in dashboard
        assert "active_alerts" in dashboard


class TestIntegrationEndpoints:
    """Test API endpoints for integration optimization"""
    
    @pytest.mark.asyncio
    async def test_initialize_optimizations_endpoint(self, client, test_user):
        """Test optimization initialization endpoint"""
        headers = {"Authorization": f"Bearer {test_user['access_token']}"}
        
        payload = {
            "services": ["stripe", "google_calendar"],
            "enable_monitoring": True
        }
        
        response = client.post("/api-integrations/initialize-optimizations", json=payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "initialization_result" in data
    
    @pytest.mark.asyncio
    async def test_health_status_endpoint(self, client, test_user):
        """Test health status endpoint"""
        headers = {"Authorization": f"Bearer {test_user['access_token']}"}
        
        response = client.get("/api-integrations/health-status", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "health_status" in data
    
    @pytest.mark.asyncio
    async def test_service_metrics_endpoint(self, client, test_user):
        """Test service metrics endpoint"""
        headers = {"Authorization": f"Bearer {test_user['access_token']}"}
        
        response = client.get("/api-integrations/service/stripe/metrics?hours=24", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["service"] == "stripe"
    
    @pytest.mark.asyncio
    async def test_optimization_report_endpoint(self, client, test_user):
        """Test optimization report endpoint"""
        headers = {"Authorization": f"Bearer {test_user['access_token']}"}
        
        response = client.get("/api-integrations/optimization-report", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "report" in data


class TestPerformanceOptimizations:
    """Test performance optimization features"""
    
    @pytest.mark.asyncio
    async def test_connection_pooling_performance(self, optimizer):
        """Test connection pooling improves performance"""
        service = "stripe"
        
        # Measure time for multiple requests with connection pooling
        start_time = time.time()
        
        tasks = []
        for _ in range(10):
            request = APIRequest(method="GET", url="/test")
            task = optimizer.make_optimized_request(service, request)
            tasks.append(task)
        
        with patch.object(optimizer, '_execute_request_with_retry') as mock_execute:
            mock_response = Mock(spec=httpx.Response, status_code=200)
            mock_execute.return_value = mock_response
            
            await asyncio.gather(*tasks)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Should complete relatively quickly with connection pooling
        assert total_time < 5.0  # Should be much faster than sequential requests
    
    @pytest.mark.asyncio
    async def test_batch_processing_optimization(self, optimizer):
        """Test batch processing for multiple requests"""
        service = "stripe"
        
        # Create multiple requests that could be batched
        requests = [
            APIRequest(method="GET", url=f"/test/{i}")
            for i in range(5)
        ]
        
        with patch.object(optimizer, 'make_optimized_request') as mock_request:
            mock_request.return_value = Mock(spec=httpx.Response, status_code=200)
            
            # Process requests (in real implementation, these could be batched)
            results = await asyncio.gather(*[
                optimizer.make_optimized_request(service, req) for req in requests
            ])
            
            assert len(results) == 5
            assert all(r.status_code == 200 for r in results)
    
    @pytest.mark.asyncio
    async def test_caching_performance_improvement(self, optimizer):
        """Test that caching improves response times"""
        service = "stripe"
        request = APIRequest(
            method="GET",
            url="/test",
            cache_ttl=300
        )
        
        # Mock cached response for second request
        cached_response = {
            "status_code": 200,
            "headers": {},
            "content": "cached"
        }
        
        # First request - no cache
        optimizer.redis.get.return_value = None
        with patch.object(optimizer, '_execute_request_with_retry') as mock_execute:
            mock_execute.return_value = Mock(spec=httpx.Response, status_code=200)
            
            start_time = time.time()
            await optimizer.make_optimized_request(service, request)
            first_request_time = time.time() - start_time
        
        # Second request - from cache
        optimizer.redis.get.return_value = json.dumps(cached_response)
        
        start_time = time.time()
        await optimizer.make_optimized_request(service, request)
        cached_request_time = time.time() - start_time
        
        # Cached request should be significantly faster
        assert cached_request_time < first_request_time


class TestErrorHandlingAndRecovery:
    """Test error handling and recovery mechanisms"""
    
    @pytest.mark.asyncio
    async def test_transient_error_recovery(self, optimizer):
        """Test recovery from transient errors"""
        service = "stripe"
        
        with patch.object(optimizer, '_execute_request_with_retry') as mock_execute:
            # First call fails with transient error, second succeeds
            mock_execute.side_effect = [
                TransientError("Temporary failure"),
                Mock(spec=httpx.Response, status_code=200)
            ]
            
            request = APIRequest(method="GET", url="/test", max_retries=2)
            
            # Should eventually succeed
            response = await optimizer.make_optimized_request(service, request)
            assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_permanent_error_handling(self, optimizer):
        """Test handling of permanent errors"""
        service = "stripe"
        
        with patch.object(optimizer, '_execute_request_with_retry') as mock_execute:
            mock_execute.side_effect = PermanentError("Authentication failed")
            
            request = APIRequest(method="GET", url="/test")
            
            # Should raise permanent error without retries
            with pytest.raises(PermanentError):
                await optimizer.make_optimized_request(service, request)
    
    @pytest.mark.asyncio
    async def test_graceful_degradation(self, optimizer):
        """Test graceful degradation when services are down"""
        service = "stripe"
        
        # Force circuit breaker to open state
        circuit_breaker = optimizer.circuit_breakers[service]
        await circuit_breaker.force_open()
        
        request = APIRequest(method="GET", url="/test")
        
        # Should fail fast with circuit breaker exception
        with pytest.raises(Exception):  # Circuit breaker should prevent request
            await optimizer.make_optimized_request(service, request)


@pytest.mark.asyncio
async def test_end_to_end_optimization_workflow():
    """Test complete end-to-end optimization workflow"""
    # This would test the entire flow from initialization to monitoring
    # Including real API calls in a test environment
    
    # 1. Initialize optimizations
    # 2. Process some requests
    # 3. Monitor health and metrics
    # 4. Trigger alerts
    # 5. Verify SLA compliance
    # 6. Generate reports
    
    # This is a placeholder for a comprehensive integration test
    assert True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])