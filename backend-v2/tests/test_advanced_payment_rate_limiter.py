"""
Tests for Advanced Payment Rate Limiter

This test suite verifies the advanced payment rate limiting functionality
including multi-dimensional security checks, fraud detection, and environment-aware limits.
"""

import pytest
import asyncio
import time
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import Mock, AsyncMock, patch

from fastapi import Request, HTTPException, status
from sqlalchemy.orm import Session

# Import the modules under test
from services.advanced_payment_rate_limiter import (
    AdvancedPaymentRateLimiter, 
    RateLimitViolationType, 
    PaymentRateLimit, 
    PaymentAttempt
)
from dependencies.payment_rate_limiter import (
    check_payment_intent_rate_limit,
    check_payment_confirmation_rate_limit,
    get_rate_limit_status
)
from models import User, Payment, Appointment
from config.payment_config import get_payment_config


class TestAdvancedPaymentRateLimiter:
    """Test suite for AdvancedPaymentRateLimiter class."""
    
    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        db = Mock(spec=Session)
        return db
    
    @pytest.fixture
    def mock_redis(self):
        """Create a mock Redis client."""
        redis_client = Mock()
        # Mock basic Redis operations
        redis_client.get.return_value = None
        redis_client.set.return_value = True
        redis_client.incr.return_value = 1
        redis_client.expire.return_value = True
        redis_client.pipeline.return_value.__enter__.return_value = redis_client
        redis_client.execute.return_value = [1, True]
        return redis_client
    
    @pytest.fixture
    def mock_user(self):
        """Create a mock user for testing."""
        user = Mock(spec=User)
        user.id = 123
        user.email = "test@example.com"
        user.role = "user"
        return user
    
    @pytest.fixture
    def mock_request(self):
        """Create a mock FastAPI request."""
        request = Mock(spec=Request)
        request.client.host = "192.168.1.1"
        request.headers = {"User-Agent": "test-browser"}
        return request
    
    @pytest.fixture
    def rate_limiter(self, mock_db, mock_redis):
        """Create an AdvancedPaymentRateLimiter instance for testing."""
        with patch('config.payment_config.get_payment_config') as mock_config:
            # Mock configuration for development environment
            config = Mock()
            config.environment = "development"
            config.testing_mode = True
            config.debug_logging = True
            mock_config.return_value = config
            
            limiter = AdvancedPaymentRateLimiter(mock_db, mock_redis)
            return limiter
    
    def test_rate_limiter_initialization(self, mock_db, mock_redis):
        """Test that rate limiter initializes correctly with environment-specific limits."""
        with patch('config.payment_config.get_payment_config') as mock_config:
            config = Mock()
            config.environment = "production"
            mock_config.return_value = config
            
            limiter = AdvancedPaymentRateLimiter(mock_db, mock_redis)
            
            # Production should have stricter limits
            assert limiter.rate_limits.requests_per_minute == 10
            assert limiter.rate_limits.requests_per_hour == 50
            assert limiter.rate_limits.max_amount_per_hour == Decimal("2000.00")
    
    def test_development_environment_limits(self, rate_limiter):
        """Test that development environment has more lenient limits."""
        # Development limits should be higher
        assert rate_limiter.rate_limits.requests_per_minute == 100
        assert rate_limiter.rate_limits.requests_per_hour == 500
        assert rate_limiter.rate_limits.max_amount_per_day == Decimal("100000.00")
    
    @pytest.mark.asyncio
    async def test_frequency_limit_check_passes(self, rate_limiter, mock_request, mock_user):
        """Test that frequency limits allow normal usage."""
        payment_method_info = {"type": "card", "last4": "4242"}
        
        allowed, violation_type, message = await rate_limiter.check_payment_rate_limit(
            request=mock_request,
            user=mock_user,
            amount=Decimal("50.00"),
            payment_method_info=payment_method_info
        )
        
        assert allowed is True
        assert violation_type is None
        assert message is None
    
    @pytest.mark.asyncio
    async def test_amount_limit_exceeded(self, rate_limiter, mock_request, mock_user):
        """Test that excessive amounts are blocked."""
        payment_method_info = {"type": "card", "last4": "4242"}
        
        # Try to pay an amount exceeding daily limits
        excessive_amount = Decimal("200000.00")  # Exceeds dev limit of 100k
        
        allowed, violation_type, message = await rate_limiter.check_payment_rate_limit(
            request=mock_request,
            user=mock_user,
            amount=excessive_amount,
            payment_method_info=payment_method_info
        )
        
        assert allowed is False
        assert violation_type == RateLimitViolationType.AMOUNT_EXCEEDED
        assert "per day limit" in message
    
    @pytest.mark.asyncio
    async def test_velocity_pattern_detection(self, rate_limiter, mock_request, mock_user):
        """Test detection of suspicious velocity patterns."""
        # Mock recent payment history showing rapid-fire payments
        mock_payments = []
        base_time = datetime.utcnow()
        
        # Create 6 recent payments within a short window (should trigger velocity check)
        for i in range(6):
            payment = Mock()
            payment.timestamp = base_time - timedelta(minutes=i)
            payment.amount = Decimal("25.00")
            mock_payments.append(payment)
        
        with patch.object(rate_limiter, '_get_recent_payment_history', return_value=mock_payments):
            payment_method_info = {"type": "card", "last4": "4242"}
            
            allowed, violation_type, message = await rate_limiter.check_payment_rate_limit(
                request=mock_request,
                user=mock_user,
                amount=Decimal("25.00"),
                payment_method_info=payment_method_info
            )
            
            assert allowed is False
            assert violation_type == RateLimitViolationType.VELOCITY_ANOMALY
            assert "rapid payment pattern" in message
    
    @pytest.mark.asyncio
    async def test_payment_method_abuse_detection(self, rate_limiter, mock_request, mock_user):
        """Test detection of payment method abuse."""
        # Mock Redis to simulate many transactions with same payment method
        rate_limiter.redis_client.incr.return_value = 25  # Exceeds limit of 20 for dev
        
        payment_method_info = {"type": "card", "last4": "4242", "brand": "visa"}
        
        allowed, violation_type, message = await rate_limiter.check_payment_rate_limit(
            request=mock_request,
            user=mock_user,
            amount=Decimal("50.00"),
            payment_method_info=payment_method_info
        )
        
        assert allowed is False
        assert violation_type == RateLimitViolationType.PAYMENT_METHOD_ABUSE
        assert "payment method per day" in message
    
    @pytest.mark.asyncio
    async def test_record_payment_result_success(self, rate_limiter, mock_request, mock_user):
        """Test recording successful payment results."""
        await rate_limiter.record_payment_result(
            request=mock_request,
            user=mock_user,
            amount=Decimal("100.00"),
            status="success"
        )
        
        # Should clear failure count for successful payments
        rate_limiter.redis_client.delete.assert_called()
    
    @pytest.mark.asyncio
    async def test_record_payment_result_failure(self, rate_limiter, mock_request, mock_user):
        """Test recording failed payment results."""
        await rate_limiter.record_payment_result(
            request=mock_request,
            user=mock_user,
            amount=Decimal("100.00"),
            status="failed",
            failure_reason="card_declined"
        )
        
        # Should increment failure count
        rate_limiter.redis_client.incr.assert_called()
    
    @pytest.mark.asyncio
    async def test_memory_fallback_when_redis_unavailable(self, mock_db):
        """Test that rate limiter works with memory fallback when Redis is unavailable."""
        # Create rate limiter without Redis
        with patch('config.payment_config.get_payment_config') as mock_config:
            config = Mock()
            config.environment = "development"
            mock_config.return_value = config
            
            limiter = AdvancedPaymentRateLimiter(mock_db, None)
            
            # Should still work with memory-based rate limiting
            mock_request = Mock(spec=Request)
            mock_request.client.host = "127.0.0.1"
            mock_user = Mock(spec=User)
            mock_user.id = 456
            
            payment_method_info = {"type": "card"}
            
            allowed, violation_type, message = await limiter.check_payment_rate_limit(
                request=mock_request,
                user=mock_user,
                amount=Decimal("25.00"),
                payment_method_info=payment_method_info
            )
            
            assert allowed is True
    
    @pytest.mark.asyncio
    async def test_get_rate_limit_status(self, rate_limiter, mock_request, mock_user):
        """Test retrieving rate limit status information."""
        # Mock Redis responses for status checking
        rate_limiter.redis_client.get.return_value = "5"  # 5 requests this minute
        
        status_info = await rate_limiter.get_rate_limit_status(mock_request, mock_user)
        
        assert "environment" in status_info
        assert "current_usage" in status_info
        assert "limits" in status_info
        assert "remaining" in status_info
        assert status_info["environment"] == "development"
    
    def test_payment_fingerprint_generation(self, rate_limiter):
        """Test generation of payment method fingerprints."""
        payment_info = {
            "type": "card",
            "last4": "4242",
            "brand": "visa",
            "exp_month": "12",
            "exp_year": "2025"
        }
        
        fingerprint = rate_limiter._generate_payment_fingerprint(payment_info)
        
        assert isinstance(fingerprint, str)
        assert len(fingerprint) == 16  # SHA256 truncated to 16 chars
        
        # Same input should produce same fingerprint
        fingerprint2 = rate_limiter._generate_payment_fingerprint(payment_info)
        assert fingerprint == fingerprint2
    
    def test_client_ip_extraction(self, rate_limiter):
        """Test extraction of client IP addresses from requests."""
        # Test with X-Forwarded-For header
        request1 = Mock()
        request1.headers = {"X-Forwarded-For": "203.0.113.1, 198.51.100.1"}
        
        ip1 = rate_limiter._get_client_ip(request1)
        assert ip1 == "203.0.113.1"
        
        # Test with X-Real-IP header
        request2 = Mock()
        request2.headers = {"X-Real-IP": "198.51.100.1"}
        
        ip2 = rate_limiter._get_client_ip(request2)
        assert ip2 == "198.51.100.1"
        
        # Test with direct client connection
        request3 = Mock()
        request3.headers = {}
        request3.client.host = "127.0.0.1"
        
        ip3 = rate_limiter._get_client_ip(request3)
        assert ip3 == "127.0.0.1"


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])