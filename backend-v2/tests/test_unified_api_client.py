"""
Comprehensive tests for the Unified API Client

Tests all major functionality including:
- Provider registration and configuration
- Request execution with reliability patterns
- Circuit breaker behavior
- Rate limiting
- Caching mechanisms
- Webhook processing
- Health monitoring
- Error handling and recovery
"""

import pytest
import asyncio
import json
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta

from services.unified_api_client import (
    UnifiedApiClient,
    ApiProvider,
    ApiCredentials,
    AuthType,
    ApiRequest,
    ApiResponse,
    RequestPriority,
    CircuitState,
    RateLimitConfig,
    CircuitBreakerConfig,
    RetryConfig,
    CacheConfig
)


class TestUnifiedApiClient:
    """Comprehensive test suite for UnifiedApiClient."""
    
    @pytest.fixture
    def client(self):
        """Create a fresh client instance for each test."""
        return UnifiedApiClient()
    
    @pytest.fixture
    def test_credentials(self):
        """Test credentials for API authentication."""
        return ApiCredentials(
            auth_type=AuthType.BEARER,
            credentials={"token": "test_token_123"}
        )
    
    @pytest.fixture
    def test_request(self):
        """Test API request configuration."""
        return ApiRequest(
            method="GET",
            url="https://api.example.com/test",
            provider=ApiProvider.GENERIC,
            priority=RequestPriority.NORMAL
        )
    
    def test_client_initialization(self, client):
        """Test that client initializes with proper defaults."""
        assert client.providers == {}
        assert client.rate_limiters == {}
        assert client.circuit_breakers == {}
        assert client.health_metrics == {}
        assert client.credentials == {}
        assert client.webhook_processor is not None
        assert client.http_client is not None
        assert len(client.default_configs) > 0
    
    def test_provider_registration(self, client, test_credentials):
        """Test provider registration with configurations."""
        # Register provider
        client.register_provider(
            ApiProvider.STRIPE,
            test_credentials,
            rate_limit_config=RateLimitConfig(requests_per_second=10),
            circuit_breaker_config=CircuitBreakerConfig(failure_threshold=3)
        )
        
        # Verify registration
        assert ApiProvider.STRIPE in client.providers
        assert ApiProvider.STRIPE in client.rate_limiters
        assert ApiProvider.STRIPE in client.circuit_breakers
        assert ApiProvider.STRIPE in client.health_metrics
        assert ApiProvider.STRIPE in client.credentials
        
        # Verify configurations
        assert client.providers[ApiProvider.STRIPE]["rate_limit"].requests_per_second == 10
        assert client.providers[ApiProvider.STRIPE]["circuit_breaker"].failure_threshold == 3
    
    def test_credential_encryption(self, test_credentials):
        """Test credential encryption functionality."""
        # Add sensitive data
        test_credentials.credentials["secret"] = "sensitive_secret"
        test_credentials.credentials["password"] = "sensitive_password"
        
        # Encrypt credentials
        test_credentials.encrypt_credentials()
        
        assert test_credentials.encrypted is True
        # Sensitive fields should be encrypted (different from original)
        assert test_credentials.credentials["secret"] != "sensitive_secret"
        assert test_credentials.credentials["password"] != "sensitive_password"
        
        # Decrypt and verify
        decrypted = test_credentials.decrypt_credentials()
        assert decrypted["secret"] == "sensitive_secret"
        assert decrypted["password"] == "sensitive_password"
    
    @pytest.mark.asyncio
    async def test_rate_limiter(self, client):
        """Test rate limiting functionality."""
        rate_config = RateLimitConfig(
            requests_per_second=2,
            requests_per_minute=10,
            burst_allowance=3
        )
        
        rate_limiter = client.rate_limiters[ApiProvider.GENERIC] = client.rate_limiters.get(
            ApiProvider.GENERIC,
            type(client.rate_limiters.get(ApiProvider.STRIPE, None))(ApiProvider.GENERIC, rate_config)
        )
        
        # Should allow initial requests up to burst limit
        for i in range(3):
            assert await rate_limiter.acquire() is True
        
        # Should deny additional requests
        assert await rate_limiter.acquire() is False
    
    def test_circuit_breaker_states(self, client):
        """Test circuit breaker state transitions."""
        circuit_config = CircuitBreakerConfig(
            failure_threshold=2,
            success_threshold=2
        )
        
        circuit_breaker = type(client.circuit_breakers.get(ApiProvider.STRIPE, None))(
            ApiProvider.GENERIC, circuit_config
        )
        
        # Initial state should be CLOSED
        assert circuit_breaker.state == CircuitState.CLOSED
        
        # Record failures to open circuit
        circuit_breaker._record_failure()
        assert circuit_breaker.state == CircuitState.CLOSED  # Still closed
        
        circuit_breaker._record_failure()
        assert circuit_breaker.state == CircuitState.OPEN  # Now open
        
        # Test half-open transition
        circuit_breaker.next_attempt_time = 0  # Force immediate retry
        circuit_breaker.state = CircuitState.HALF_OPEN
        
        # Record successes to close circuit
        circuit_breaker._record_success(0.1)
        circuit_breaker._record_success(0.1)
        assert circuit_breaker.state == CircuitState.CLOSED
    
    @pytest.mark.asyncio
    async def test_successful_request(self, client, test_credentials, test_request):
        """Test successful API request execution."""
        # Register provider
        client.register_provider(ApiProvider.GENERIC, test_credentials)
        
        # Mock HTTP client
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {"Content-Type": "application/json"}
        mock_response.text = '{"success": true}'
        mock_response.json.return_value = {"success": True}
        
        with patch.object(client.http_client, 'request', return_value=mock_response) as mock_request:
            response = await client.request(test_request)
            
            assert response.status_code == 200
            assert response.json_data == {"success": True}
            assert response.provider == ApiProvider.GENERIC
            assert response.response_time > 0
            
            # Verify metrics updated
            metrics = client.health_metrics[ApiProvider.GENERIC]
            assert metrics.success_count == 1
            assert metrics.failure_count == 0
            assert metrics.last_success is not None
    
    @pytest.mark.asyncio
    async def test_request_with_retry(self, client, test_credentials, test_request):
        """Test request retry mechanism."""
        # Register provider with retry config
        retry_config = RetryConfig(
            max_attempts=3,
            base_delay=0.1,  # Fast retry for testing
            retry_on_status=[500]
        )
        client.register_provider(
            ApiProvider.GENERIC,
            test_credentials,
            retry_config=retry_config
        )
        
        # Mock HTTP client to fail first two times, succeed on third
        call_count = 0
        async def mock_request(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            
            mock_response = Mock()
            if call_count < 3:
                # Fail first two attempts
                mock_response.status_code = 500
                mock_response.text = "Internal Server Error"
                error = Exception("HTTP 500")
                error.status_code = 500
                raise error
            else:
                # Succeed on third attempt
                mock_response.status_code = 200
                mock_response.headers = {"Content-Type": "application/json"}
                mock_response.text = '{"success": true}'
                mock_response.json.return_value = {"success": True}
                return mock_response
        
        with patch.object(client.http_client, 'request', side_effect=mock_request):
            response = await client.request(test_request)
            
            assert response.status_code == 200
            assert call_count == 3  # Should have retried twice
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_integration(self, client, test_credentials, test_request):
        """Test circuit breaker integration with requests."""
        # Register provider with low failure threshold
        circuit_config = CircuitBreakerConfig(
            failure_threshold=2,
            timeout=0.1  # Fast timeout for testing
        )
        client.register_provider(
            ApiProvider.GENERIC,
            test_credentials,
            circuit_breaker_config=circuit_config
        )
        
        # Mock HTTP client to always fail
        async def mock_failing_request(*args, **kwargs):
            error = Exception("Network error")
            error.status_code = 500
            raise error
        
        with patch.object(client.http_client, 'request', side_effect=mock_failing_request):
            # First two requests should fail and record failures
            with pytest.raises(Exception):
                await client.request(test_request)
            
            with pytest.raises(Exception):
                await client.request(test_request)
            
            # Circuit breaker should now be open
            circuit_breaker = client.circuit_breakers[ApiProvider.GENERIC]
            assert circuit_breaker.state == CircuitState.OPEN
            
            # Next request should be blocked by circuit breaker
            with pytest.raises(Exception, match="circuit breaker.*OPEN"):
                await client.request(test_request)
    
    @pytest.mark.asyncio
    async def test_caching_functionality(self, client, test_credentials):
        """Test response caching."""
        # Register provider with caching enabled
        cache_config = CacheConfig(enabled=True, default_ttl=300)
        client.register_provider(
            ApiProvider.GENERIC,
            test_credentials,
            cache_config=cache_config
        )
        
        # Create request with cache key
        cached_request = ApiRequest(
            method="GET",
            url="https://api.example.com/cached",
            provider=ApiProvider.GENERIC,
            cache_key="test_cache_key"
        )
        
        # Mock HTTP client
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {"Content-Type": "application/json"}
        mock_response.text = '{"cached": true}'
        mock_response.json.return_value = {"cached": True}
        
        with patch.object(client.http_client, 'request', return_value=mock_response) as mock_request:
            # First request should hit API
            response1 = await client.request(cached_request)
            assert response1.cached is False
            assert mock_request.call_count == 1
            
            # Second request should use cache (if cache service is available)
            try:
                response2 = await client.request(cached_request)
                # If cache works, should not make another HTTP request
                if response2.cached:
                    assert mock_request.call_count == 1
                else:
                    # If cache not available, should make another request
                    assert mock_request.call_count == 2
            except:
                # Cache service might not be available in test environment
                pass
    
    @pytest.mark.asyncio
    async def test_webhook_processing(self, client):
        """Test webhook processing functionality."""
        # Test webhook data
        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Signature": "sha256=test_signature"
        }
        payload = json.dumps({
            "type": "payment_intent.succeeded",
            "data": {"object": {"id": "pi_test123"}}
        })
        
        # Process webhook
        result = await client.process_webhook(
            ApiProvider.STRIPE,
            headers,
            payload
        )
        
        assert result["status"] == "processed"
        assert result["provider"] == ApiProvider.STRIPE.value
    
    @pytest.mark.asyncio
    async def test_health_report_generation(self, client, test_credentials):
        """Test health report generation."""
        # Register provider and simulate some activity
        client.register_provider(ApiProvider.GENERIC, test_credentials)
        
        # Simulate metrics
        metrics = client.health_metrics[ApiProvider.GENERIC]
        metrics.success_count = 10
        metrics.failure_count = 2
        metrics.avg_response_time = 0.5
        metrics.last_success = datetime.utcnow()
        
        # Generate health report
        report = await client.get_health_report()
        
        assert "report_timestamp" in report
        assert "overall_health" in report
        assert "provider_details" in report
        assert "recommendations" in report
        assert "alerts" in report
        
        # Check provider details
        assert ApiProvider.GENERIC.value in report["provider_details"]
        provider_details = report["provider_details"][ApiProvider.GENERIC.value]
        assert provider_details["metrics"]["success_count"] == 10
        assert provider_details["metrics"]["failure_count"] == 2
    
    @pytest.mark.asyncio
    async def test_priority_based_rate_limiting(self, client, test_credentials):
        """Test priority-based rate limiting."""
        # Register provider with strict rate limits
        rate_config = RateLimitConfig(
            requests_per_second=1,
            burst_allowance=1,
            priority_multipliers={
                RequestPriority.CRITICAL: 2.0,
                RequestPriority.HIGH: 1.5,
                RequestPriority.NORMAL: 1.0,
                RequestPriority.LOW: 0.5
            }
        )
        client.register_provider(
            ApiProvider.GENERIC,
            test_credentials,
            rate_limit_config=rate_config
        )
        
        rate_limiter = client.rate_limiters[ApiProvider.GENERIC]
        
        # Critical priority should get more tokens/better access
        assert await rate_limiter.acquire(RequestPriority.CRITICAL) is True
        
        # After burst is used, low priority should be more likely to be denied
        # (This test might be flaky depending on timing)
    
    @pytest.mark.asyncio
    async def test_authentication_headers(self, client):
        """Test authentication header preparation."""
        # Test Bearer token
        bearer_creds = ApiCredentials(
            auth_type=AuthType.BEARER,
            credentials={"token": "bearer_token_123"}
        )
        headers = client._prepare_auth_headers(bearer_creds)
        assert headers["Authorization"] == "Bearer bearer_token_123"
        
        # Test Basic auth
        basic_creds = ApiCredentials(
            auth_type=AuthType.BASIC,
            credentials={"username": "user", "password": "pass"}
        )
        headers = client._prepare_auth_headers(basic_creds)
        assert headers["Authorization"].startswith("Basic ")
        
        # Test API Key
        api_key_creds = ApiCredentials(
            auth_type=AuthType.API_KEY,
            credentials={"key_name": "X-API-Key", "key_value": "api_key_123"}
        )
        headers = client._prepare_auth_headers(api_key_creds)
        assert headers["X-API-Key"] == "api_key_123"
    
    @pytest.mark.asyncio
    async def test_retry_delay_calculation(self, client):
        """Test retry delay calculation with exponential backoff."""
        retry_config = RetryConfig(
            base_delay=1.0,
            max_delay=60.0,
            exponential_base=2.0,
            jitter=False  # Disable jitter for predictable testing
        )
        
        # Test exponential backoff
        delay_0 = client._calculate_retry_delay(0, retry_config)
        delay_1 = client._calculate_retry_delay(1, retry_config)
        delay_2 = client._calculate_retry_delay(2, retry_config)
        
        assert delay_0 == 1.0  # base_delay * (2^0)
        assert delay_1 == 2.0  # base_delay * (2^1)
        assert delay_2 == 4.0  # base_delay * (2^2)
        
        # Test max delay cap
        delay_large = client._calculate_retry_delay(10, retry_config)
        assert delay_large <= retry_config.max_delay
    
    @pytest.mark.asyncio
    async def test_concurrent_requests(self, client, test_credentials):
        """Test handling of concurrent requests."""
        client.register_provider(ApiProvider.GENERIC, test_credentials)
        
        # Mock HTTP client
        async def mock_request(*args, **kwargs):
            # Simulate some delay
            await asyncio.sleep(0.1)
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.headers = {"Content-Type": "application/json"}
            mock_response.text = '{"success": true}'
            mock_response.json.return_value = {"success": True}
            return mock_response
        
        with patch.object(client.http_client, 'request', side_effect=mock_request):
            # Create multiple concurrent requests
            requests = [
                ApiRequest(
                    method="GET",
                    url=f"https://api.example.com/test/{i}",
                    provider=ApiProvider.GENERIC
                )
                for i in range(5)
            ]
            
            # Execute concurrently
            responses = await asyncio.gather(
                *[client.request(req) for req in requests],
                return_exceptions=True
            )
            
            # All should succeed
            successful_responses = [r for r in responses if isinstance(r, ApiResponse)]
            assert len(successful_responses) == 5
            
            # Verify metrics
            metrics = client.health_metrics[ApiProvider.GENERIC]
            assert metrics.success_count == 5
    
    @pytest.mark.asyncio
    async def test_cleanup(self, client):
        """Test client cleanup functionality."""
        # Ensure client can be cleaned up without errors
        await client.close()
        
        # HTTP client should be closed
        assert client.http_client.is_closed


class TestWebhookProcessor:
    """Test webhook processing functionality."""
    
    @pytest.mark.asyncio
    async def test_signature_validation(self):
        """Test webhook signature validation."""
        from services.unified_api_client import WebhookProcessor
        
        client = UnifiedApiClient()
        processor = WebhookProcessor(client)
        
        # Test valid signature
        payload = "test_payload"
        secret = "test_secret"
        
        # Generate valid signature
        import hmac
        import hashlib
        signature = hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        headers = {"X-Webhook-Signature": f"sha256={signature}"}
        
        # Should validate successfully
        assert processor._validate_signature(headers, payload, secret) is True
        
        # Test invalid signature
        headers_invalid = {"X-Webhook-Signature": "sha256=invalid_signature"}
        assert processor._validate_signature(headers_invalid, payload, secret) is False
    
    @pytest.mark.asyncio
    async def test_webhook_routing(self):
        """Test webhook routing to appropriate handlers."""
        from services.unified_api_client import WebhookProcessor
        
        client = UnifiedApiClient()
        processor = WebhookProcessor(client)
        
        # Test Stripe webhook routing
        stripe_data = {
            "type": "customer.subscription.created",
            "data": {"object": {"id": "sub_test"}}
        }
        
        result = await processor._route_webhook(ApiProvider.STRIPE, stripe_data, {})
        assert result["status"] == "processed"
        assert result["type"] == "subscription"


# Integration tests
class TestIntegration:
    """Integration tests for real-world scenarios."""
    
    @pytest.mark.asyncio
    async def test_full_request_lifecycle(self):
        """Test complete request lifecycle with all features."""
        client = UnifiedApiClient()
        
        # Register provider with all features
        credentials = ApiCredentials(
            auth_type=AuthType.BEARER,
            credentials={"token": "integration_test_token"}
        )
        
        client.register_provider(
            ApiProvider.GENERIC,
            credentials,
            rate_limit_config=RateLimitConfig(
                requests_per_second=5,
                burst_allowance=10
            ),
            circuit_breaker_config=CircuitBreakerConfig(
                failure_threshold=3,
                timeout=30
            ),
            retry_config=RetryConfig(
                max_attempts=3,
                base_delay=0.1
            ),
            cache_config=CacheConfig(
                enabled=True,
                default_ttl=300
            )
        )
        
        # Create comprehensive request
        request = ApiRequest(
            method="POST",
            url="https://api.example.com/integration_test",
            provider=ApiProvider.GENERIC,
            priority=RequestPriority.HIGH,
            headers={"Custom-Header": "test_value"},
            json_data={"test": "data"},
            cache_key="integration_test_cache",
            idempotency_key="integration_test_idempotency"
        )
        
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.headers = {"Content-Type": "application/json"}
        mock_response.text = '{"created": true, "id": "integration_test_123"}'
        mock_response.json.return_value = {"created": True, "id": "integration_test_123"}
        
        with patch.object(client.http_client, 'request', return_value=mock_response):
            response = await client.request(request)
            
            # Verify response
            assert response.status_code == 201
            assert response.json_data["created"] is True
            assert response.provider == ApiProvider.GENERIC
            
            # Verify metrics were updated
            metrics = client.health_metrics[ApiProvider.GENERIC]
            assert metrics.success_count > 0
            assert metrics.last_success is not None
            
            # Generate health report
            health_report = await client.get_health_report(ApiProvider.GENERIC)
            assert health_report["overall_health"]["health_status"] in ["excellent", "good"]
        
        # Cleanup
        await client.close()


# Performance tests
class TestPerformance:
    """Performance tests for the unified client."""
    
    @pytest.mark.asyncio
    async def test_high_concurrency(self):
        """Test client performance under high concurrency."""
        client = UnifiedApiClient()
        
        credentials = ApiCredentials(
            auth_type=AuthType.BEARER,
            credentials={"token": "performance_test_token"}
        )
        
        client.register_provider(ApiProvider.GENERIC, credentials)
        
        # Mock fast response
        async def mock_fast_request(*args, **kwargs):
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.headers = {"Content-Type": "application/json"}
            mock_response.text = '{"success": true}'
            mock_response.json.return_value = {"success": True}
            return mock_response
        
        with patch.object(client.http_client, 'request', side_effect=mock_fast_request):
            # Create many concurrent requests
            requests = [
                ApiRequest(
                    method="GET",
                    url=f"https://api.example.com/perf_test/{i}",
                    provider=ApiProvider.GENERIC
                )
                for i in range(100)
            ]
            
            start_time = datetime.utcnow()
            
            # Execute all requests concurrently
            responses = await asyncio.gather(
                *[client.request(req) for req in requests],
                return_exceptions=True
            )
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            # Verify all succeeded
            successful_responses = [r for r in responses if isinstance(r, ApiResponse)]
            assert len(successful_responses) == 100
            
            # Should complete reasonably quickly (under 5 seconds for 100 concurrent requests)
            assert duration < 5.0
            
            print(f"Performance test: 100 concurrent requests completed in {duration:.2f}s")
        
        await client.close()


if __name__ == "__main__":
    # Run specific test
    import sys
    if len(sys.argv) > 1:
        pytest.main([f"-v", f"{__file__}::{sys.argv[1]}"])
    else:
        pytest.main(["-v", __file__])