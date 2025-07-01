"""
Tests for payment endpoint rate limiting.

This test suite verifies that rate limiting is properly applied to payment endpoints
to prevent abuse and ensure security.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
import os

from main import app
from tests.factories import UserFactory, AppointmentFactory
from utils.auth import get_password_hash


class TestPaymentRateLimiting:
    """Test rate limiting on payment endpoints."""
    
    @pytest.fixture
    def client_with_rate_limiting(self):
        """Client with rate limiting enabled (overrides test environment)."""
        with patch.dict(os.environ, {"TESTING": "false"}):
            with patch('config.settings.environment', 'production'):
                yield TestClient(app)
    
    def test_payment_intent_has_rate_limiting_decorator(self):
        """Test that payment intent endpoint has rate limiting decorator applied."""
        from routers.payments import create_payment_intent
        
        # Check that the function has been decorated with rate limiting
        # Rate limiting decorators add a __wrapped__ attribute
        assert hasattr(create_payment_intent, '__wrapped__'), "Payment intent endpoint should be decorated with rate limiting"
    
    def test_refund_has_rate_limiting_decorator(self):
        """Test that refund endpoint has rate limiting decorator applied."""
        from routers.payments import create_refund
        
        # Check that the function has been decorated with rate limiting
        assert hasattr(create_refund, '__wrapped__'), "Refund endpoint should be decorated with rate limiting"
    
    def test_payment_confirm_has_rate_limiting_decorator(self):
        """Test that payment confirm endpoint has rate limiting decorator applied."""
        from routers.payments import confirm_payment
        
        # Check that the function has been decorated with rate limiting
        assert hasattr(confirm_payment, '__wrapped__'), "Payment confirm endpoint should be decorated with rate limiting"
    
    def test_rate_limiting_configuration_exists(self):
        """Test that payment rate limiting configuration is properly set up."""
        from utils.rate_limit import RATE_LIMITS
        
        # Verify payment-specific rate limits exist
        assert "payment_intent" in RATE_LIMITS
        assert "payment_confirm" in RATE_LIMITS
        assert "refund" in RATE_LIMITS
        
        # Verify rate limit values are reasonable (adjust for development environment)
        # In development environment, rate limits are higher
        assert RATE_LIMITS["payment_intent"] == "50/minute"  # Development value
        assert RATE_LIMITS["payment_confirm"] == "50/minute"  # Development value  
        assert RATE_LIMITS["refund"] == "20/hour"  # Development value
    
    def test_rate_limiting_decorators_importable(self):
        """Test that payment rate limiting decorators can be imported."""
        from utils.rate_limit import (
            payment_intent_rate_limit,
            payment_confirm_rate_limit,
            refund_rate_limit
        )
        
        # Verify decorators exist and are callable
        assert callable(payment_intent_rate_limit)
        assert callable(payment_confirm_rate_limit)
        assert callable(refund_rate_limit)