"""
Comprehensive Unit Tests for API Integration Improvements

Tests for enhanced webhook security, enterprise API reliability,
circuit breaker behavior, and bulk operations.
"""

import pytest
import asyncio
import json
import time
import hmac
import hashlib
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from dataclasses import asdict

import redis.exceptions
from sqlalchemy.orm import Session

from services.api_integration_improvements import APIIntegrationImprovements
from services.enhanced_webhook_security import (
    EnhancedWebhookSecurity, 
    WebhookValidationResult,
    APIProvider
)
from services.enterprise_api_reliability import (
    EnterpriseAPIReliability, 
    RetryConfig, 
    BulkConfig, 
    APIResponse,
    BulkOperationResult,
    RetryStrategy
)
from services.circuit_breaker_service import CircuitBreakerService, CircuitState


class TestEnhancedWebhookSecurity:
    """Test cases for enhanced webhook security"""
    
    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock(spec=Session)
    
    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client"""
        redis_mock = Mock()
        redis_mock.ping.return_value = True
        redis_mock.keys.return_value = []
        redis_mock.hgetall.return_value = {}
        redis_mock.get.return_value = None
        redis_mock.pipeline.return_value = redis_mock
        redis_mock.execute.return_value = [0, 0]
        return redis_mock
    
    @pytest.fixture
    def webhook_security(self, mock_db, mock_redis):
        """Create EnhancedWebhookSecurity instance with mocked dependencies"""
        with patch('services.enhanced_webhook_security.redis.Redis', return_value=mock_redis):
            security = EnhancedWebhookSecurity(mock_db, mock_redis)
            return security
    
    def test_ip_allowlist_validation_success(self, webhook_security):
        """Test successful IP allowlist validation"""
        # Test with valid Stripe IP
        stripe_ip = "3.18.12.63"  # Known Stripe IP
        result = webhook_security._validate_source_ip("stripe", stripe_ip)
        assert result is True
        
        # Test with valid Twilio IP range
        twilio_ip = "54.172.60.100"  # Within Twilio range
        result = webhook_security._validate_source_ip("twilio", twilio_ip)
        assert result is True
    
    def test_ip_allowlist_validation_failure(self, webhook_security):
        """Test IP allowlist validation with invalid IPs"""
        # Test with invalid IP
        invalid_ip = "192.168.1.1"
        result = webhook_security._validate_source_ip("stripe", invalid_ip)
        assert result is False
        
        # Test with unsupported provider
        result = webhook_security._validate_source_ip("unknown_provider", "1.1.1.1")
        assert result is False
    
    def test_stripe_signature_validation(self, webhook_security):
        """Test Stripe webhook signature validation"""
        # Create test data
        payload = b'{"test": "data"}'
        timestamp = str(int(time.time()))
        secret = "test_secret"
        
        # Generate valid signature
        signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            signed_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Test valid signature
        result = webhook_security._verify_stripe_signature_enhanced(
            payload, timestamp, [expected_signature], secret
        )
        assert result is True
        
        # Test invalid signature
        result = webhook_security._verify_stripe_signature_enhanced(
            payload, timestamp, ["invalid_signature"], secret
        )
        assert result is False
    
    def test_payload_security_analysis(self, webhook_security):
        """Test payload security analysis"""
        # Test normal payload
        normal_payload = b'{"event": "payment.succeeded", "data": {"amount": 1000}}'
        result = webhook_security._analyze_payload_security(normal_payload)
        
        assert result["score_multiplier"] == 1.0
        assert result["is_suspicious"] is False
        assert result["analysis_performed"] is True
        
        # Test suspicious payload (too large)
        large_payload = b"x" * (2 * 1024 * 1024)  # 2MB
        result = webhook_security._analyze_payload_security(large_payload)
        
        assert result["score_multiplier"] < 1.0
        assert result["is_suspicious"] is True
        
        # Test suspicious payload (script injection)
        malicious_payload = b'{"data": "<script>alert(1)</script>"}'
        result = webhook_security._analyze_payload_security(malicious_payload)
        
        assert result["score_multiplier"] < 1.0
        assert result["is_suspicious"] is True
    
    def test_rate_limiting_with_redis(self, webhook_security, mock_redis):
        """Test advanced rate limiting functionality"""
        # Mock Redis responses for rate limiting
        mock_redis.execute.return_value = [None, 5, 5, True]  # 5 requests in window
        
        result = webhook_security._check_advanced_rate_limit("stripe", "1.2.3.4")
        
        assert "allowed" in result
        assert "current_rate" in result
        assert "remaining" in result
        
        # Test rate limit exceeded
        mock_redis.execute.return_value = [None, 1001, 1001, True]  # Exceeds limit
        
        result = webhook_security._check_advanced_rate_limit("stripe", "1.2.3.4")
        assert result["allowed"] is False
    
    def test_rate_limiting_without_redis(self, webhook_security):
        """Test rate limiting fallback when Redis is unavailable"""
        webhook_security.redis = None
        
        result = webhook_security._check_advanced_rate_limit("stripe", "1.2.3.4")
        
        assert result["allowed"] is True
        assert result["current_rate"] == 0
        assert result["limit"] == 1000
    
    def test_comprehensive_webhook_validation(self, webhook_security, mock_redis):
        """Test comprehensive webhook validation flow"""
        # Mock all dependencies
        webhook_security._validate_source_ip = Mock(return_value=True)
        webhook_security._check_advanced_rate_limit = Mock(return_value={
            "allowed": True, "current_rate": 10, "limit": 100, "remaining": 90
        })
        webhook_security._analyze_payload_security = Mock(return_value={
            "score_multiplier": 1.0, "is_suspicious": False
        })
        webhook_security._validate_stripe_enhanced = Mock(return_value=WebhookValidationResult(
            is_valid=True, event_id="evt_123", event_type="payment.succeeded"
        ))
        webhook_security._check_advanced_duplicate = Mock(return_value={
            "is_duplicate": False, "suspicious_pattern": False
        })
        webhook_security._detect_threat_patterns = Mock(return_value=1.0)
        webhook_security._get_ip_reputation = Mock(return_value="trusted")
        
        # Test successful validation
        payload = b'{"id": "evt_123", "type": "payment.succeeded"}'
        result = webhook_security.validate_webhook_comprehensive(
            provider="stripe",
            payload=payload,
            signature="t=123456789,v1=signature",
            source_ip="3.18.12.63",
            webhook_secret="test_secret"
        )
        
        assert result.is_valid is True
        assert result.event_id == "evt_123"
        assert result.event_type == "payment.succeeded"
        assert result.security_score > 0.5
        assert result.ip_reputation == "trusted"
    
    def test_threat_pattern_detection(self, webhook_security, mock_redis):
        """Test threat pattern detection"""
        # Mock Redis for threat detection
        mock_redis.execute.return_value = [None, 15, 15, True]  # High request count
        mock_redis.get.return_value = "10"  # Failed attempts
        
        threat_score = webhook_security._detect_threat_patterns(
            "stripe", "1.2.3.4", b"test payload"
        )
        
        # Should detect rapid fire and reduce score
        assert threat_score < 1.0
    
    def test_security_metrics_collection(self, webhook_security, mock_redis):
        """Test security metrics collection"""
        # Mock Redis keys and data
        mock_redis.keys.return_value = [
            "metrics:stripe:successful",
            "metrics:stripe:failed",
            "ip_reputation:1.2.3.4"
        ]
        mock_redis.get.return_value = "10"
        mock_redis.hgetall.return_value = {
            "successful_webhooks": "50",
            "failed_attempts": "2",
            "security_violations": "0"
        }
        
        metrics = webhook_security.get_security_metrics()
        
        assert "by_provider" in metrics
        assert "blocked_ips" in metrics
        assert "trusted_ips" in metrics


class TestEnterpriseAPIReliability:
    """Test cases for enterprise API reliability"""
    
    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock(spec=Session)
    
    @pytest.fixture
    def api_reliability(self, mock_db):
        """Create EnterpriseAPIReliability instance"""
        return EnterpriseAPIReliability(mock_db)
    
    def test_retry_config_initialization(self, api_reliability):
        """Test retry configuration for different providers"""
        stripe_config = api_reliability.provider_configs[APIProvider.STRIPE]["retry_config"]
        assert stripe_config.max_attempts == 5
        assert stripe_config.base_delay == 2.0
        assert stripe_config.timeout == 45.0
        
        twilio_config = api_reliability.provider_configs[APIProvider.TWILIO]["retry_config"]
        assert twilio_config.max_attempts == 4
        assert twilio_config.base_delay == 1.5
    
    def test_delay_calculation_exponential_backoff(self, api_reliability):
        """Test exponential backoff delay calculation"""
        config = RetryConfig(
            base_delay=1.0,
            exponential_base=2.0,
            strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
            jitter=False
        )
        
        # Test exponential progression
        delay1 = api_reliability._calculate_delay(1, config)
        delay2 = api_reliability._calculate_delay(2, config)
        delay3 = api_reliability._calculate_delay(3, config)
        
        assert delay1 == 1.0  # 1.0 * 2^0
        assert delay2 == 2.0  # 1.0 * 2^1
        assert delay3 == 4.0  # 1.0 * 2^2
    
    def test_delay_calculation_with_jitter(self, api_reliability):
        """Test delay calculation with jitter"""
        config = RetryConfig(
            base_delay=1.0,
            strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
            jitter=True,
            jitter_range=0.1
        )
        
        delays = [api_reliability._calculate_delay(1, config) for _ in range(10)]
        
        # All delays should be slightly different due to jitter
        assert len(set(delays)) > 1
        # All delays should be around 1.0 ± 10%
        assert all(0.9 <= delay <= 1.1 for delay in delays)
    
    def test_delay_calculation_fibonacci(self, api_reliability):
        """Test Fibonacci backoff strategy"""
        config = RetryConfig(
            base_delay=1.0,
            strategy=RetryStrategy.FIBONACCI,
            jitter=False
        )
        
        delays = [api_reliability._calculate_delay(i, config) for i in range(1, 6)]
        expected = [1.0, 1.0, 2.0, 3.0, 5.0]  # Fibonacci sequence
        
        assert delays == expected
    
    @pytest.mark.asyncio
    async def test_successful_api_call_execution(self, api_reliability):
        """Test successful API call execution"""
        # Mock successful API call
        async def mock_api_call(data):
            return {"status": "success", "data": data}
        
        response = await api_reliability.execute_with_reliability(
            provider=APIProvider.STRIPE,
            operation_name="create_customer",
            api_call=mock_api_call,
            {"customer_id": "123"}
        )
        
        assert response.success is True
        assert response.data["status"] == "success"
        assert response.attempt_count == 1
        assert response.provider == "stripe"
    
    @pytest.mark.asyncio
    async def test_api_call_with_retries(self, api_reliability):
        """Test API call that succeeds after retries"""
        call_count = 0
        
        async def mock_failing_api_call():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("Temporary failure")
            return {"status": "success"}
        
        config = RetryConfig(max_attempts=3, base_delay=0.01)  # Fast retries for testing
        
        response = await api_reliability.execute_with_reliability(
            provider=APIProvider.STRIPE,
            operation_name="test",
            api_call=mock_failing_api_call,
            retry_config=config
        )
        
        assert response.success is True
        assert response.attempt_count == 3
        assert call_count == 3
    
    @pytest.mark.asyncio
    async def test_api_call_all_retries_failed(self, api_reliability):
        """Test API call that fails all retry attempts"""
        async def mock_always_failing_api_call():
            raise Exception("Permanent failure")
        
        config = RetryConfig(max_attempts=2, base_delay=0.01)
        
        response = await api_reliability.execute_with_reliability(
            provider=APIProvider.STRIPE,
            operation_name="test",
            api_call=mock_always_failing_api_call,
            retry_config=config
        )
        
        assert response.success is False
        assert response.attempt_count == 2
        assert "All 2 attempts failed" in response.error
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_integration(self, api_reliability):
        """Test circuit breaker integration"""
        # Mock circuit breaker in open state
        api_reliability.circuit_breaker.can_execute = Mock(return_value=False)
        api_reliability.circuit_breaker.get_state = Mock(return_value=CircuitState.OPEN)
        
        async def mock_api_call():
            return {"status": "success"}
        
        response = await api_reliability.execute_with_reliability(
            provider=APIProvider.STRIPE,
            operation_name="test",
            api_call=mock_api_call
        )
        
        assert response.success is False
        assert "Circuit breaker is open" in response.error
        assert response.circuit_breaker_state == "open"
    
    @pytest.mark.asyncio
    async def test_bulk_operation_success(self, api_reliability):
        """Test successful bulk operation"""
        items = [{"id": i, "data": f"item_{i}"} for i in range(10)]
        
        async def mock_api_call(item):
            return {"processed": True, "id": item["id"]}
        
        config = BulkConfig(batch_size=5, max_concurrent_batches=2, delay_between_batches=0.01)
        
        result = await api_reliability.execute_bulk_operation(
            provider=APIProvider.STRIPE,
            operation_name="process_items",
            items=items,
            api_call=mock_api_call,
            bulk_config=config
        )
        
        assert result.total_items == 10
        assert result.successful_items == 10
        assert result.failed_items == 0
        assert result.success_rate == 1.0
        assert len(result.errors) == 0
    
    @pytest.mark.asyncio
    async def test_bulk_operation_partial_failure(self, api_reliability):
        """Test bulk operation with partial failures"""
        items = [{"id": i, "data": f"item_{i}"} for i in range(10)]
        
        async def mock_api_call(item):
            if item["id"] % 3 == 0:  # Fail every 3rd item
                raise Exception("Processing failed")
            return {"processed": True, "id": item["id"]}
        
        config = BulkConfig(batch_size=5, delay_between_batches=0.01)
        
        result = await api_reliability.execute_bulk_operation(
            provider=APIProvider.STRIPE,
            operation_name="process_items",
            items=items,
            api_call=mock_api_call,
            bulk_config=config
        )
        
        assert result.total_items == 10
        assert result.successful_items == 6  # Items 1,2,4,5,7,8 succeed
        assert result.failed_items == 4     # Items 0,3,6,9 fail
        assert result.success_rate == 0.6
        assert len(result.errors) == 4
    
    def test_adaptive_batch_sizing(self, api_reliability):
        """Test adaptive batch sizing based on performance"""
        provider = APIProvider.STRIPE
        operation = "test_operation"
        
        # Initialize with good performance
        api_reliability._update_adaptive_batch_size(provider, operation, 100, 0.98, 1.0)
        
        config = BulkConfig(batch_size=100, auto_adjust_batch_size=True, max_batch_size=200)
        new_size = api_reliability._get_adaptive_batch_size(provider, operation, config)
        
        # Should increase batch size due to good performance
        assert new_size > 100
        
        # Update with poor performance
        api_reliability._update_adaptive_batch_size(provider, operation, 100, 0.5, 5.0)
        
        new_size = api_reliability._get_adaptive_batch_size(provider, operation, config)
        
        # Should decrease batch size due to poor performance
        assert new_size < 100
    
    def test_performance_metrics_recording(self, api_reliability):
        """Test performance metrics recording"""
        provider = APIProvider.STRIPE
        operation = "test_op"
        
        # Record successful operation
        api_reliability._record_performance_metrics(provider, operation, 1.5, True)
        api_reliability._record_performance_metrics(provider, operation, 2.0, True)
        api_reliability._record_performance_metrics(provider, operation, 3.0, False)
        
        key = f"{provider.value}_{operation}"
        metrics = api_reliability.performance_metrics[key]
        
        assert metrics["total_requests"] == 3
        assert metrics["successful_requests"] == 2
        assert metrics["success_rate"] == 2/3
        assert metrics["average_response_time"] == (1.5 + 2.0 + 3.0) / 3


class TestAPIIntegrationImprovements:
    """Test cases for the main API integration improvements orchestrator"""
    
    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock(spec=Session)
    
    @pytest.fixture
    def api_improvements(self, mock_db):
        """Create APIIntegrationImprovements instance"""
        return APIIntegrationImprovements(mock_db)
    
    @pytest.mark.asyncio
    async def test_stripe_operations_enhancement(self, api_improvements):
        """Test Stripe operations enhancement"""
        # Mock existing Stripe service
        mock_stripe_service = Mock()
        mock_stripe_service.create_stripe_customer = AsyncMock(return_value={"id": "cus_123"})
        
        enhanced_create = await api_improvements.enhance_stripe_operations(mock_stripe_service)
        
        # Test enhanced customer creation
        result = await enhanced_create(
            user={"id": "user_123"},
            organization={"id": "org_123"}
        )
        
        assert result["id"] == "cus_123"
    
    @pytest.mark.asyncio
    async def test_webhook_processing_enhancement(self, api_improvements):
        """Test enhanced webhook processing"""
        # Mock webhook security validation
        api_improvements.webhook_security.validate_webhook_comprehensive = Mock(
            return_value=WebhookValidationResult(
                is_valid=True,
                event_id="evt_123",
                event_type="payment.succeeded",
                security_score=0.9
            )
        )
        
        enhanced_webhook = await api_improvements.enhance_stripe_webhooks()
        
        result = await enhanced_webhook(
            payload=b'{"id": "evt_123"}',
            signature="test_signature",
            source_ip="3.18.12.63"
        )
        
        # Should process successfully with high security score
        assert "error" not in result or result.get("security_score", 0) > 0.5
    
    @pytest.mark.asyncio
    async def test_twilio_bulk_sms_enhancement(self, api_improvements):
        """Test enhanced Twilio bulk SMS operations"""
        # Mock reliability service
        mock_bulk_result = BulkOperationResult(
            total_items=5,
            successful_items=4,
            failed_items=1,
            success_rate=0.8,
            total_time=2.0,
            average_response_time=0.4,
            errors=[{"error": "Invalid number"}]
        )
        
        api_improvements.reliability.execute_bulk_operation = AsyncMock(return_value=mock_bulk_result)
        
        enhanced_sms = await api_improvements.enhance_twilio_operations()
        
        result = await enhanced_sms(
            to_number=["1234567890", "1234567891", "1234567892"],
            message="Test message"
        )
        
        assert result["total_sent"] == 4
        assert result["failed"] == 1
        assert result["success_rate"] == 0.8
    
    @pytest.mark.asyncio
    async def test_comprehensive_health_check(self, api_improvements):
        """Test comprehensive health check across all integrations"""
        # Mock health check responses
        mock_health_responses = {
            APIProvider.STRIPE: {"status": "healthy", "response_time": 0.5},
            APIProvider.TWILIO: {"status": "healthy", "response_time": 0.3},
            APIProvider.SENDGRID: {"status": "degraded", "response_time": 2.0},
            APIProvider.GOOGLE_CALENDAR: {"status": "unhealthy", "response_time": 10.0}
        }
        
        async def mock_health_check(provider):
            return mock_health_responses[provider]
        
        api_improvements.reliability.health_check = mock_health_check
        api_improvements.reliability.get_performance_report = Mock(return_value={})
        api_improvements.webhook_security.get_security_metrics = Mock(return_value={})
        
        health_report = await api_improvements.get_all_integrations_health()
        
        assert "timestamp" in health_report
        assert "individual_services" in health_report
        assert "overall_status" in health_report
        
        # Check individual service statuses
        services = health_report["individual_services"]
        assert services["stripe"]["status"] == "healthy"
        assert services["sendgrid"]["status"] == "degraded"
        assert services["google_calendar"]["status"] == "unhealthy"


class TestCircuitBreakerIntegration:
    """Test circuit breaker integration with API reliability"""
    
    @pytest.fixture
    def circuit_breaker(self):
        """Create CircuitBreakerService instance"""
        return CircuitBreakerService()
    
    def test_circuit_breaker_states(self, circuit_breaker):
        """Test circuit breaker state transitions"""
        key = "test_service"
        
        # Initial state should be closed
        assert circuit_breaker.can_execute(key) is True
        assert circuit_breaker.get_state(key) == CircuitState.CLOSED
        
        # Record failures to trigger open state
        for _ in range(6):  # Exceed default failure threshold
            circuit_breaker.record_failure(key)
        
        assert circuit_breaker.can_execute(key) is False
        assert circuit_breaker.get_state(key) == CircuitState.OPEN
        
        # Record success to transition to half-open
        circuit_breaker.record_success(key)
        
        # State should eventually allow execution again
        assert circuit_breaker.can_execute(key) is True


@pytest.mark.integration
class TestIntegrationScenarios:
    """Integration test scenarios combining multiple components"""
    
    @pytest.fixture
    def full_stack(self, mock_db):
        """Create full stack with all components"""
        return APIIntegrationImprovements(mock_db)
    
    @pytest.mark.asyncio
    async def test_webhook_to_api_call_flow(self, full_stack):
        """Test complete flow from webhook validation to API call"""
        # Simulate webhook validation
        webhook_result = full_stack.webhook_security.validate_webhook_comprehensive(
            provider="stripe",
            payload=b'{"id": "evt_123", "type": "payment.succeeded"}',
            signature="valid_signature",
            source_ip="3.18.12.63",
            webhook_secret="test_secret"
        )
        
        if webhook_result.is_valid:
            # Process webhook with API call
            async def process_payment_event(event_data):
                return {"processed": True, "event_id": event_data.get("id")}
            
            api_response = await full_stack.reliability.execute_with_reliability(
                provider=APIProvider.STRIPE,
                operation_name="process_event",
                api_call=process_payment_event,
                {"id": "evt_123"}
            )
            
            # Verify end-to-end processing
            assert api_response.success is True
            assert api_response.data["processed"] is True


if __name__ == "__main__":
    # Run tests with coverage
    pytest.main([
        __file__,
        "-v",
        "--cov=services.api_integration_improvements",
        "--cov=services.enhanced_webhook_security",
        "--cov=services.enterprise_api_reliability",
        "--cov-report=term-missing",
        "--cov-report=html:htmlcov/unit_tests"
    ])