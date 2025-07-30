"""
Integration Tests for Enhanced Webhook Security

Tests real-world webhook scenarios including:
- Multi-provider webhook validation
- Rate limiting with Redis
- IP reputation tracking
- Security threat detection
- Real webhook payload processing
"""

import pytest
import asyncio
import json
import time
import hmac
import hashlib
import requests
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import redis
from sqlalchemy.orm import Session

from services.enhanced_webhook_security import (
    EnhancedWebhookSecurity, 
    WebhookValidationResult
)
from services.api_integration_improvements import APIIntegrationImprovements
from config.settings import get_settings
from db import get_db

settings = get_settings()


@pytest.mark.integration
class TestWebhookSecurityIntegration:
    """Integration tests for webhook security with Redis and database"""
    
    @pytest.fixture(scope="class")
    def redis_client(self):
        """Real Redis client for integration testing"""
        try:
            client = redis.Redis(
                host=settings.REDIS_HOST or "localhost",
                port=settings.REDIS_PORT or 6379,
                db=settings.REDIS_TEST_DB or 1,  # Use test database
                decode_responses=True
            )
            client.ping()
            yield client
            # Cleanup test data
            client.flushdb()
        except redis.ConnectionError:
            pytest.skip("Redis not available for integration tests")
    
    @pytest.fixture(scope="class")
    def db_session(self):
        """Database session for integration testing"""
        db = next(get_db())
        yield db
        db.close()
    
    @pytest.fixture
    def webhook_security(self, db_session, redis_client):
        """Enhanced webhook security with real dependencies"""
        return EnhancedWebhookSecurity(db_session, redis_client)
    
    def test_stripe_webhook_real_validation(self, webhook_security):
        """Test Stripe webhook validation with real signatures"""
        # Real Stripe webhook payload structure
        payload_data = {
            "id": "evt_1234567890abcdef",
            "object": "event",
            "api_version": "2020-08-27",
            "created": int(time.time()),
            "data": {
                "object": {
                    "id": "pi_1234567890abcdef",
                    "object": "payment_intent",
                    "amount": 2000,
                    "currency": "usd",
                    "status": "succeeded"
                }
            },
            "livemode": False,
            "pending_webhooks": 1,
            "request": {
                "id": "req_1234567890abcdef",
                "idempotency_key": None
            },
            "type": "payment_intent.succeeded"
        }
        
        payload = json.dumps(payload_data).encode('utf-8')
        timestamp = str(int(time.time()))
        secret = "whsec_test_secret_key_123456789"
        
        # Generate real Stripe signature
        signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
        signature = hmac.new(
            secret.encode('utf-8'),
            signed_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        stripe_signature_header = f"t={timestamp},v1={signature}"
        
        # Test validation with real Stripe IP
        result = webhook_security.validate_webhook_comprehensive(
            provider="stripe",
            payload=payload,
            signature=stripe_signature_header,
            source_ip="3.18.12.63",  # Real Stripe IP
            webhook_secret=secret
        )
        
        assert result.is_valid is True
        assert result.event_id == "evt_1234567890abcdef"
        assert result.event_type == "payment_intent.succeeded"
        assert result.security_score > 0.8
        assert result.ip_reputation in ["unknown", "trusted"]
    
    def test_twilio_webhook_real_validation(self, webhook_security):
        """Test Twilio webhook validation with real format"""
        # Real Twilio webhook form data
        form_data = {
            "MessageSid": "SM_test_mock_message_sid_value_here",
            "AccountSid": "AC_test_mock_account_sid_value_here",
            "From": "+15551234567",
            "To": "+15557654321",
            "Body": "Test message reply",
            "NumMedia": "0",
            "MessageStatus": "received",
            "ApiVersion": "2010-04-01"
        }
        
        webhook_url = "https://example.com/webhook/twilio"
        auth_token = "test_auth_token_123456789"
        
        # Generate real Twilio signature
        data_string = webhook_url.lower()
        for key in sorted(form_data.keys()):
            data_string += f"{key}{form_data[key]}"
        
        expected_signature = hmac.new(
            auth_token.encode('utf-8'),
            data_string.encode('utf-8'),
            hashlib.sha1
        ).digest()
        
        import base64
        signature = base64.b64encode(expected_signature).decode()
        
        # Test validation with real Twilio IP
        result = webhook_security.validate_webhook_comprehensive(
            provider="twilio",
            payload=None,
            signature=signature,
            source_ip="54.172.60.100",  # Real Twilio IP range
            webhook_secret=auth_token,
            webhook_url=webhook_url,
            form_data=form_data
        )
        
        assert result.is_valid is True
        assert result.event_id == "SM_test_mock_message_sid_value_here"
        assert result.event_type == "sms"
    
    def test_rate_limiting_integration(self, webhook_security, redis_client):
        """Test rate limiting with real Redis operations"""
        provider = "stripe"
        source_ip = "3.18.12.63"
        
        # Clear any existing rate limit data
        redis_client.delete(f"webhook_rate:{provider}:{source_ip}")
        redis_client.delete(f"webhook_burst:{provider}:{source_ip}")
        
        # Test normal rate limiting
        for i in range(5):
            result = webhook_security._check_advanced_rate_limit(provider, source_ip)
            assert result["allowed"] is True
            assert result["current_rate"] == i + 1
            assert result["remaining"] >= 0
        
        # Verify Redis data structure
        rate_key = f"webhook_rate:{provider}:{source_ip}"
        count = redis_client.zcard(rate_key)
        assert count == 5
        
        # Test burst limiting by making rapid requests
        for i in range(20):  # Exceed burst limit
            webhook_security._check_advanced_rate_limit(provider, source_ip)
        
        result = webhook_security._check_advanced_rate_limit(provider, source_ip)
        # Should still be allowed but approaching limits
        assert "current_rate" in result
        assert "burst_rate" in result
    
    def test_ip_reputation_tracking(self, webhook_security, redis_client):
        """Test IP reputation tracking with Redis persistence"""
        source_ip = "1.2.3.4"
        
        # Clear existing reputation data
        redis_client.delete(f"ip_reputation:{source_ip}")
        
        # Initially unknown reputation
        reputation = webhook_security._get_ip_reputation(source_ip)
        assert reputation == "unknown"
        
        # Record successful webhooks
        for _ in range(15):
            webhook_security._update_ip_reputation(source_ip, "successful_webhook", 0.9)
        
        reputation = webhook_security._get_ip_reputation(source_ip)
        assert reputation == "trusted"
        
        # Record security violations
        for _ in range(3):
            webhook_security._update_ip_reputation(source_ip, "security_violation", 0.1)
        
        reputation = webhook_security._get_ip_reputation(source_ip)
        assert reputation in ["suspicious", "blocked"]
        
        # Verify Redis data persistence
        reputation_data = redis_client.hgetall(f"ip_reputation:{source_ip}")
        assert int(reputation_data["successful_webhooks"]) == 15
        assert int(reputation_data["security_violations"]) == 3
    
    def test_duplicate_detection_integration(self, webhook_security, redis_client):
        """Test advanced duplicate detection with Redis"""
        provider = "stripe"
        event_id = "evt_test_duplicate"
        payload = b'{"id": "evt_test_duplicate", "type": "test"}'
        source_ip = "3.18.12.63"
        
        # Clear existing duplicate data
        redis_client.delete(f"webhook_events:{provider}:{event_id}")
        redis_client.delete(f"webhook_pattern:{provider}:{source_ip}")
        
        # First request - should not be duplicate
        result = webhook_security._check_advanced_duplicate(provider, event_id, payload, source_ip)
        assert result["is_duplicate"] is False
        assert result["suspicious_pattern"] is False
        
        # Second request with same event - should be duplicate
        result = webhook_security._check_advanced_duplicate(provider, event_id, payload, source_ip)
        assert result["is_duplicate"] is True
        assert result["duplicate_count"] >= 2
        
        # Multiple duplicates should trigger suspicious pattern
        for _ in range(5):
            webhook_security._check_advanced_duplicate(provider, event_id, payload, source_ip)
        
        result = webhook_security._check_advanced_duplicate(provider, event_id, payload, source_ip)
        assert result["is_duplicate"] is True
        assert result["suspicious_pattern"] is True
    
    def test_threat_pattern_detection_integration(self, webhook_security, redis_client):
        """Test threat pattern detection with Redis tracking"""
        provider = "stripe"
        source_ip = "192.168.1.100"  # Use non-allowlisted IP for testing
        payload = b'{"test": "data"}'
        
        # Clear existing threat data
        redis_client.delete(f"threat_rapid:{provider}:{source_ip}")
        redis_client.delete(f"threat_failed:{provider}:{source_ip}")
        
        # Normal request - should have good threat score
        threat_score = webhook_security._detect_threat_patterns(provider, source_ip, payload)
        assert threat_score == 1.0
        
        # Simulate rapid fire requests
        for _ in range(15):  # Exceed rapid fire threshold
            webhook_security._detect_threat_patterns(provider, source_ip, payload)
            time.sleep(0.01)  # Small delay to avoid overwhelming
        
        threat_score = webhook_security._detect_threat_patterns(provider, source_ip, payload)
        assert threat_score < 1.0  # Should detect rapid fire
        
        # Simulate failed signature attempts
        for _ in range(6):  # Exceed failed attempts threshold
            webhook_security._increment_failed_attempts(provider, source_ip)
        
        threat_score = webhook_security._detect_threat_patterns(provider, source_ip, payload)
        assert threat_score < 0.5  # Should detect brute force
    
    def test_comprehensive_validation_with_persistence(self, webhook_security, redis_client):
        """Test comprehensive validation with Redis persistence"""
        # Real webhook scenario
        payload = json.dumps({
            "id": "evt_integration_test",
            "type": "payment_intent.succeeded",
            "data": {"object": {"id": "pi_test", "amount": 1000}}
        }).encode('utf-8')
        
        timestamp = str(int(time.time()))
        secret = "whsec_test_secret"
        
        # Generate signature
        signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
        signature_hash = hmac.new(
            secret.encode('utf-8'),
            signed_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        signature = f"t={timestamp},v1={signature_hash}"
        
        # Test with valid Stripe IP
        result = webhook_security.validate_webhook_comprehensive(
            provider="stripe",
            payload=payload,
            signature=signature,
            source_ip="3.18.12.63",
            webhook_secret=secret
        )
        
        assert result.is_valid is True
        assert result.security_score > 0.7
        
        # Verify data was persisted to Redis
        rate_key = f"webhook_rate:stripe:3.18.12.63"
        assert redis_client.exists(rate_key)
        
        duplicate_key = f"webhook_events:stripe:evt_integration_test"
        assert redis_client.exists(duplicate_key)
        
        reputation_key = f"ip_reputation:3.18.12.63"
        assert redis_client.exists(reputation_key)
    
    def test_security_metrics_integration(self, webhook_security, redis_client):
        """Test security metrics collection from Redis"""
        # Setup test data in Redis
        redis_client.set("metrics:stripe:successful", "100")
        redis_client.set("metrics:stripe:failed", "5")
        redis_client.set("metrics:twilio:successful", "50")
        
        # Setup IP reputation data
        redis_client.hset("ip_reputation:1.2.3.4", mapping={
            "successful_webhooks": "20",
            "failed_attempts": "1",
            "security_violations": "0"
        })
        
        redis_client.hset("ip_reputation:5.6.7.8", mapping={
            "successful_webhooks": "2",
            "failed_attempts": "8",
            "security_violations": "6"
        })
        
        # Get metrics
        metrics = webhook_security.get_security_metrics()
        
        assert "by_provider" in metrics
        assert "trusted_ips" in metrics
        assert "blocked_ips" in metrics
        
        # Verify metrics reflect test data
        assert metrics["trusted_ips"] >= 1  # 1.2.3.4 should be trusted
        assert metrics["blocked_ips"] >= 1  # 5.6.7.8 should be blocked


@pytest.mark.integration
class TestWebhookEndToEndIntegration:
    """End-to-end integration tests for complete webhook processing"""
    
    @pytest.fixture
    def api_improvements(self, db_session, redis_client):
        """API improvements with real dependencies"""
        return APIIntegrationImprovements(db_session)
    
    @pytest.mark.asyncio
    async def test_stripe_webhook_end_to_end(self, api_improvements):
        """Test complete Stripe webhook processing flow"""
        # Simulate real Stripe webhook
        webhook_payload = json.dumps({
            "id": "evt_e2e_test",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_e2e_test",
                    "amount": 5000,
                    "currency": "usd",
                    "status": "succeeded",
                    "customer": "cus_test123"
                }
            }
        }).encode('utf-8')
        
        timestamp = str(int(time.time()))
        secret = "whsec_e2e_test_secret"
        
        # Generate valid signature
        signed_payload = f"{timestamp}.{webhook_payload.decode('utf-8')}"
        signature_hash = hmac.new(
            secret.encode('utf-8'),
            signed_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        stripe_signature = f"t={timestamp},v1={signature_hash}"
        
        # Get enhanced webhook processor
        enhanced_webhook = await api_improvements.enhance_stripe_webhooks()
        
        # Process webhook
        result = await enhanced_webhook(
            payload=webhook_payload,
            signature=stripe_signature,
            source_ip="3.18.12.63"
        )
        
        # Verify successful processing
        assert "error" not in result or result.get("security_score", 0) > 0.5
    
    @pytest.mark.asyncio
    async def test_twilio_sms_bulk_processing(self, api_improvements):
        """Test bulk SMS processing with Twilio integration"""
        # Mock Twilio SMS sending
        async def mock_send_sms(sms_data):
            if "invalid" in sms_data.get("to", ""):
                raise Exception("Invalid phone number")
            return {"sid": f"SM{hash(sms_data['to'])}", "status": "sent"}
        
        api_improvements._send_single_sms = mock_send_sms
        
        # Get enhanced SMS sender
        enhanced_sms = await api_improvements.enhance_twilio_operations()
        
        # Test bulk SMS
        recipients = ["+15551234567", "+15551234568", "+15551234569", "+invalid_number"]
        message = "Integration test message"
        
        result = await enhanced_sms(recipients, message)
        
        assert result["total_sent"] == 3  # 3 valid numbers
        assert result["failed"] == 1     # 1 invalid number
        assert result["success"] is True # >90% success rate
        assert len(result["errors"]) <= 5  # Limited error details
    
    @pytest.mark.asyncio
    async def test_health_check_integration(self, api_improvements):
        """Test comprehensive health check integration"""
        # Mock health check implementations
        async def mock_stripe_health():
            return {"status": "ok", "service": "stripe", "balance": 1000}
        
        async def mock_twilio_health():
            return {"status": "ok", "service": "twilio", "account": "active"}
        
        api_improvements._stripe_health_check = mock_stripe_health
        api_improvements._twilio_health_check = mock_twilio_health
        
        # Run comprehensive health check
        health_report = await api_improvements.get_all_integrations_health()
        
        assert "timestamp" in health_report
        assert "individual_services" in health_report
        assert "overall_status" in health_report
        assert "performance_summary" in health_report
        assert "security_metrics" in health_report
        
        # Verify health check results
        services = health_report["individual_services"]
        assert len(services) >= 2  # At least Stripe and Twilio
        
        overall_status = health_report["overall_status"]
        assert overall_status in ["healthy", "degraded", "unhealthy"]


@pytest.mark.integration
class TestSecurityIntegrationScenarios:
    """Security-focused integration test scenarios"""
    
    @pytest.fixture
    def webhook_security(self, db_session, redis_client):
        """Enhanced webhook security for security testing"""
        return EnhancedWebhookSecurity(db_session, redis_client)
    
    def test_security_attack_simulation(self, webhook_security, redis_client):
        """Simulate various security attacks and verify protection"""
        attacker_ip = "192.168.99.100"
        
        # Clear existing data
        redis_client.delete(f"webhook_rate:stripe:{attacker_ip}")
        redis_client.delete(f"threat_rapid:stripe:{attacker_ip}")
        redis_client.delete(f"threat_failed:stripe:{attacker_ip}")
        
        # 1. Test IP allowlist protection
        result = webhook_security.validate_webhook_comprehensive(
            provider="stripe",
            payload=b'{"test": "data"}',
            signature="invalid_signature",
            source_ip=attacker_ip,  # Not in Stripe allowlist
            webhook_secret="test_webhook_secret_for_testing"
        )
        
        assert result.is_valid is False
        assert "not in allowlist" in result.error_message
        assert result.security_score == 0.0
        
        # 2. Test signature brute force protection
        valid_stripe_ip = "3.18.12.63"
        for attempt in range(10):  # Multiple failed signature attempts
            result = webhook_security.validate_webhook_comprehensive(
                provider="stripe",
                payload=b'{"test": "data"}',
                signature=f"invalid_signature_{attempt}",
                source_ip=valid_stripe_ip,
                webhook_secret="test_webhook_secret_for_testing"
            )
            assert result.is_valid is False
        
        # Verify threat detection
        threat_score = webhook_security._detect_threat_patterns(
            "stripe", valid_stripe_ip, b'{"test": "data"}'
        )
        assert threat_score < 0.5  # Should detect brute force
        
        # 3. Test rate limiting protection
        for _ in range(200):  # Exceed rate limits
            webhook_security._check_advanced_rate_limit("stripe", valid_stripe_ip)
        
        rate_result = webhook_security._check_advanced_rate_limit("stripe", valid_stripe_ip)
        assert rate_result["allowed"] is False
    
    def test_malicious_payload_detection(self, webhook_security):
        """Test detection of malicious webhook payloads"""
        valid_ip = "3.18.12.63"
        
        # Test script injection
        malicious_payloads = [
            b'{"data": "<script>alert(1)</script>", "type": "test"}',
            b'{"code": "eval(malicious_code)", "type": "test"}',
            b'{"command": "system(rm -rf /)", "type": "test"}',
            b'x' * (2 * 1024 * 1024),  # Oversized payload
            b'',  # Empty payload
        ]
        
        for payload in malicious_payloads:
            analysis = webhook_security._analyze_payload_security(payload)
            
            # All should be flagged as suspicious
            assert analysis["is_suspicious"] is True
            assert analysis["score_multiplier"] < 1.0
    
    def test_replay_attack_protection(self, webhook_security, redis_client):
        """Test protection against replay attacks"""
        provider = "stripe"
        event_id = "evt_replay_test"
        payload = b'{"id": "evt_replay_test", "type": "test"}'
        source_ip = "3.18.12.63"
        
        # Clear existing data
        redis_client.delete(f"webhook_events:{provider}:{event_id}")
        
        # First request - should be processed
        result = webhook_security._check_advanced_duplicate(provider, event_id, payload, source_ip)
        assert result["is_duplicate"] is False
        
        # Immediate replay - should be detected
        result = webhook_security._check_advanced_duplicate(provider, event_id, payload, source_ip)
        assert result["is_duplicate"] is True
        
        # Multiple replays - should trigger suspicious pattern
        for _ in range(5):
            webhook_security._check_advanced_duplicate(provider, event_id, payload, source_ip)
        
        result = webhook_security._check_advanced_duplicate(provider, event_id, payload, source_ip)
        assert result["suspicious_pattern"] is True


if __name__ == "__main__":
    # Run integration tests
    pytest.main([
        __file__,
        "-v",
        "-m", "integration",
        "--tb=short",
        "--durations=10"
    ])