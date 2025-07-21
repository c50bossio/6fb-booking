"""
Comprehensive tests for Payment Error Handling System.

Tests structured error codes, error message generation,
logging, and client-friendly error responses.
"""

import pytest
import json
import logging
from datetime import datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch
from fastapi import HTTPException, status

from utils.payment_errors import (
    PaymentErrorCode, PaymentError, PaymentErrorHandler,
    handle_stripe_error, handle_validation_error, handle_business_logic_error,
    payment_error_handler
)


class TestPaymentErrorCodes:
    """Test payment error code definitions and categorization."""
    
    def test_error_code_categories(self):
        """Test that error codes are properly categorized."""
        # Authentication & Authorization (4000-4099)
        auth_codes = [
            PaymentErrorCode.AUTHENTICATION_REQUIRED,
            PaymentErrorCode.INSUFFICIENT_PERMISSIONS,
            PaymentErrorCode.INVALID_API_KEY,
            PaymentErrorCode.SESSION_EXPIRED
        ]
        
        for code in auth_codes:
            assert code.value.startswith("PAY_40")
        
        # Validation Errors (4100-4199)
        validation_codes = [
            PaymentErrorCode.INVALID_AMOUNT,
            PaymentErrorCode.AMOUNT_TOO_SMALL,
            PaymentErrorCode.AMOUNT_TOO_LARGE,
            PaymentErrorCode.INVALID_CURRENCY
        ]
        
        for code in validation_codes:
            assert code.value.startswith("PAY_41")
        
        # Business Logic Errors (4200-4299)
        business_codes = [
            PaymentErrorCode.APPOINTMENT_NOT_FOUND,
            PaymentErrorCode.PAYMENT_ALREADY_PROCESSED,
            PaymentErrorCode.GIFT_CERTIFICATE_EXPIRED
        ]
        
        for code in business_codes:
            assert code.value.startswith("PAY_42")
        
        # Payment Provider Errors (4300-4399)
        provider_codes = [
            PaymentErrorCode.STRIPE_CARD_DECLINED,
            PaymentErrorCode.STRIPE_INSUFFICIENT_FUNDS,
            PaymentErrorCode.STRIPE_3DS_REQUIRED
        ]
        
        for code in provider_codes:
            assert code.value.startswith("PAY_43")
    
    def test_error_code_uniqueness(self):
        """Test that all error codes are unique."""
        all_codes = [code.value for code in PaymentErrorCode]
        unique_codes = set(all_codes)
        
        assert len(all_codes) == len(unique_codes), "Duplicate error codes found"


class TestPaymentError:
    """Test PaymentError dataclass functionality."""
    
    def test_payment_error_creation(self):
        """Test creating a payment error with all fields."""
        error = PaymentError(
            code=PaymentErrorCode.INVALID_AMOUNT,
            message="Internal: Invalid payment amount",
            user_message="Please enter a valid payment amount",
            http_status=400,
            details={"amount": "invalid_value"},
            retry_after=60,
            correlation_id="corr_123"
        )
        
        assert error.code == PaymentErrorCode.INVALID_AMOUNT
        assert error.message == "Internal: Invalid payment amount"
        assert error.user_message == "Please enter a valid payment amount"
        assert error.http_status == 400
        assert error.details == {"amount": "invalid_value"}
        assert error.retry_after == 60
        assert error.correlation_id == "corr_123"
        assert error.timestamp is not None
    
    def test_payment_error_defaults(self):
        """Test payment error creation with minimal fields."""
        error = PaymentError(
            code=PaymentErrorCode.DATABASE_ERROR,
            message="Database connection failed",
            user_message="A temporary error occurred",
            http_status=500
        )
        
        assert error.details == {}
        assert error.retry_after is None
        assert error.correlation_id is None
        assert error.timestamp is not None
        assert isinstance(error.timestamp, datetime)


class TestPaymentErrorHandler:
    """Test PaymentErrorHandler functionality."""
    
    def test_create_error_with_defaults(self):
        """Test creating error with default configuration."""
        error = PaymentErrorHandler.create_error(
            error_code=PaymentErrorCode.INVALID_AMOUNT,
            correlation_id="test_123"
        )
        
        assert error.code == PaymentErrorCode.INVALID_AMOUNT
        assert error.message == "Invalid payment amount specified"
        assert error.user_message == "Please enter a valid payment amount"
        assert error.http_status == status.HTTP_400_BAD_REQUEST
        assert error.correlation_id == "test_123"
    
    def test_create_error_with_overrides(self):
        """Test creating error with custom messages."""
        error = PaymentErrorHandler.create_error(
            error_code=PaymentErrorCode.APPOINTMENT_NOT_FOUND,
            internal_message="Custom internal message",
            user_message="Custom user message",
            details={"appointment_id": 123}
        )
        
        assert error.message == "Custom internal message"
        assert error.user_message == "Custom user message"
        assert error.details == {"appointment_id": 123}
        assert error.http_status == status.HTTP_404_NOT_FOUND
    
    def test_create_error_unknown_code(self):
        """Test creating error with unknown error code uses defaults."""
        # Create a mock unknown error code
        with patch.object(PaymentErrorHandler, '_get_error_config') as mock_get_config:
            mock_get_config.return_value = {
                "default_message": "An unexpected payment error occurred",
                "user_message": "We encountered an unexpected error",
                "http_status": 500
            }
            
            error = PaymentErrorHandler.create_error(
                error_code=PaymentErrorCode.STRIPE_CARD_DECLINED  # This will use mocked config
            )
        
        assert error.message == "An unexpected payment error occurred"
        assert error.user_message == "We encountered an unexpected error"
        assert error.http_status == 500
    
    def test_log_error_with_context(self):
        """Test error logging with context information."""
        error = PaymentError(
            code=PaymentErrorCode.STRIPE_CARD_DECLINED,
            message="Card was declined by issuer",
            user_message="Your card was declined",
            http_status=402,
            details={"decline_code": "insufficient_funds"},
            correlation_id="test_log_123"
        )
        
        with patch('utils.payment_errors.logger') as mock_logger:
            PaymentErrorHandler.log_error(
                error=error,
                context={"payment_id": 456},
                user_id="user_123",
                payment_id="payment_456"
            )
        
        # Should log as warning (400-level error)
        mock_logger.warning.assert_called_once()
        
        # Check logged message and context
        call_args = mock_logger.warning.call_args
        assert "Card was declined by issuer" in call_args[0][0]
        
        # Check extra context
        extra_context = call_args[1]["extra"]
        assert extra_context["error_code"] == "PAY_4301"
        assert extra_context["user_id"] == "user_123"
        assert extra_context["payment_id"] == "payment_456"
        assert extra_context["decline_code"] == "insufficient_funds"
    
    def test_log_error_sanitization(self):
        """Test that sensitive information is sanitized from logs."""
        error = PaymentError(
            code=PaymentErrorCode.STRIPE_PROCESSING_ERROR,
            message="Processing error with sensitive data",
            user_message="Payment processing failed",
            http_status=500,
            details={
                "card_number": "4242424242424242",
                "cvv": "123",
                "stripe_secret_key": "sk_test_secret",
                "normal_field": "safe_value"
            }
        )
        
        with patch('utils.payment_errors.logger') as mock_logger:
            PaymentErrorHandler.log_error(error)
        
        # Get the logged context
        call_args = mock_logger.error.call_args
        extra_context = call_args[1]["extra"]
        
        # Sensitive fields should be redacted
        assert extra_context["card_number"] == "[REDACTED]"
        assert extra_context["cvv"] == "[REDACTED]"
        assert extra_context["stripe_secret_key"] == "[REDACTED]"
        assert extra_context["normal_field"] == "safe_value"
    
    def test_to_http_exception(self):
        """Test converting PaymentError to HTTPException."""
        error = PaymentError(
            code=PaymentErrorCode.RATE_LIMIT_EXCEEDED,
            message="Too many requests",
            user_message="Please wait before trying again",
            http_status=429,
            retry_after=300,
            correlation_id="rate_limit_123",
            details={"limit": "10 per minute"}
        )
        
        http_exception = PaymentErrorHandler.to_http_exception(error)
        
        assert isinstance(http_exception, HTTPException)
        assert http_exception.status_code == 429
        
        detail = http_exception.detail
        assert detail["error_code"] == "PAY_4402"
        assert detail["message"] == "Please wait before trying again"
        assert detail["correlation_id"] == "rate_limit_123"
        assert detail["retry_after"] == 300
        assert detail["details"]["limit"] == "10 per minute"
        
        # Check Retry-After header
        assert http_exception.headers["Retry-After"] == "300"


class TestStripeErrorHandling:
    """Test Stripe-specific error handling."""
    
    def test_handle_card_error(self):
        """Test handling Stripe CardError."""
        import stripe
        
        stripe_error = stripe.error.CardError(
            message="Your card was declined.",
            param="card",
            code="card_declined",
            decline_code="insufficient_funds"
        )
        stripe_error.decline_code = "insufficient_funds"
        
        payment_error = handle_stripe_error(stripe_error, "stripe_123")
        
        assert payment_error.code == PaymentErrorCode.STRIPE_INSUFFICIENT_FUNDS
        assert "Stripe error:" in payment_error.message
        assert payment_error.details["decline_code"] == "insufficient_funds"
        assert payment_error.correlation_id == "stripe_123"
    
    def test_handle_rate_limit_error(self):
        """Test handling Stripe RateLimitError."""
        import stripe
        
        stripe_error = stripe.error.RateLimitError(
            message="Too many requests"
        )
        
        payment_error = handle_stripe_error(stripe_error)
        
        assert payment_error.code == PaymentErrorCode.RATE_LIMIT_EXCEEDED
        assert "Stripe error:" in payment_error.message
    
    def test_handle_authentication_error(self):
        """Test handling Stripe AuthenticationError."""
        import stripe
        
        stripe_error = stripe.error.AuthenticationError(
            message="Invalid API key"
        )
        
        payment_error = handle_stripe_error(stripe_error)
        
        assert payment_error.code == PaymentErrorCode.INVALID_API_KEY
        assert "Stripe error:" in payment_error.message
    
    def test_handle_api_connection_error(self):
        """Test handling Stripe APIConnectionError."""
        import stripe
        
        stripe_error = stripe.error.APIConnectionError(
            message="Network communication failed"
        )
        
        payment_error = handle_stripe_error(stripe_error)
        
        assert payment_error.code == PaymentErrorCode.STRIPE_CONNECTION_ERROR
        assert "Stripe error:" in payment_error.message
    
    def test_handle_generic_stripe_error(self):
        """Test handling generic StripeError."""
        import stripe
        
        stripe_error = stripe.error.StripeError(
            message="Unknown Stripe error"
        )
        
        payment_error = handle_stripe_error(stripe_error)
        
        assert payment_error.code == PaymentErrorCode.STRIPE_PROCESSING_ERROR
        assert "Stripe error:" in payment_error.message
    
    def test_handle_card_error_with_specific_decline_codes(self):
        """Test handling CardError with specific decline codes."""
        import stripe
        
        # Test expired card
        expired_card_error = stripe.error.CardError(
            message="Your card has expired.",
            param="card",
            code="card_declined",
            decline_code="expired_card"
        )
        expired_card_error.decline_code = "expired_card"
        
        payment_error = handle_stripe_error(expired_card_error)
        assert payment_error.code == PaymentErrorCode.STRIPE_CARD_EXPIRED
        
        # Test CVC failure
        cvc_error = stripe.error.CardError(
            message="Your card's security code is incorrect.",
            param="card",
            code="card_declined",
            decline_code="incorrect_cvc"
        )
        cvc_error.decline_code = "incorrect_cvc"
        
        payment_error = handle_stripe_error(cvc_error)
        assert payment_error.code == PaymentErrorCode.STRIPE_CVC_CHECK_FAILED
        assert "security code (CVC)" in payment_error.user_message


class TestValidationErrorHandling:
    """Test validation error handling."""
    
    def test_handle_validation_error(self):
        """Test creating validation error."""
        error = handle_validation_error(
            field_name="amount",
            field_value="invalid",
            validation_message="Must be a valid decimal"
        )
        
        assert error.code == PaymentErrorCode.INVALID_FIELD_FORMAT
        assert "Validation failed for amount" in error.message
        assert error.details["field_name"] == "amount"
        assert error.details["field_value"] == "invalid"
        assert error.details["validation_message"] == "Must be a valid decimal"
    
    def test_handle_validation_error_complex_value(self):
        """Test validation error with complex field value."""
        error = handle_validation_error(
            field_name="payment_data",
            field_value={"amount": 100, "currency": "USD"},
            validation_message="Invalid payment structure"
        )
        
        assert error.details["field_value"] == "[COMPLEX_TYPE]"


class TestBusinessLogicErrorHandling:
    """Test business logic error handling."""
    
    def test_handle_business_logic_error(self):
        """Test creating business logic error."""
        error = handle_business_logic_error(
            error_code=PaymentErrorCode.APPOINTMENT_ALREADY_PAID,
            context={"appointment_id": 123, "payment_id": 456}
        )
        
        assert error.code == PaymentErrorCode.APPOINTMENT_ALREADY_PAID
        assert error.message == "Appointment has already been paid"
        assert error.user_message == "This appointment has already been paid for"
        assert error.details == {"appointment_id": 123, "payment_id": 456}
    
    def test_handle_business_logic_error_no_context(self):
        """Test business logic error without context."""
        error = handle_business_logic_error(
            error_code=PaymentErrorCode.INSUFFICIENT_BALANCE
        )
        
        assert error.code == PaymentErrorCode.INSUFFICIENT_BALANCE
        assert error.details == {}


class TestPaymentErrorDecorator:
    """Test payment error handling decorator."""
    
    def test_decorator_with_payment_error(self):
        """Test decorator handling PaymentError."""
        @payment_error_handler()
        def test_function():
            raise PaymentError(
                code=PaymentErrorCode.INVALID_AMOUNT,
                message="Test payment error",
                user_message="Test user message",
                http_status=400
            )
        
        with pytest.raises(HTTPException) as exc_info:
            test_function()
        
        assert exc_info.value.status_code == 400
        assert exc_info.value.detail["error_code"] == "PAY_4101"
        assert exc_info.value.detail["message"] == "Test user message"
    
    def test_decorator_with_generic_exception(self):
        """Test decorator converting generic exception to PaymentError."""
        @payment_error_handler()
        def test_function():
            raise ValueError("Generic error")
        
        with pytest.raises(HTTPException) as exc_info:
            test_function()
        
        # Should convert to database error
        assert exc_info.value.status_code == 500
        assert exc_info.value.detail["error_code"] == "PAY_5001"
        assert "An error occurred" in exc_info.value.detail["message"]
    
    def test_decorator_with_correlation_id(self):
        """Test decorator with correlation ID function."""
        def get_correlation_id(*args, **kwargs):
            return "decorator_test_123"
        
        @payment_error_handler(correlation_id_func=get_correlation_id)
        def test_function():
            raise ValueError("Test error with correlation ID")
        
        with pytest.raises(HTTPException) as exc_info:
            test_function()
        
        assert exc_info.value.detail["correlation_id"] == "decorator_test_123"
    
    def test_decorator_success_case(self):
        """Test decorator allows successful function execution."""
        @payment_error_handler()
        def test_function():
            return {"status": "success", "data": "test_data"}
        
        result = test_function()
        assert result == {"status": "success", "data": "test_data"}


class TestErrorResponseFormats:
    """Test error response formats for different scenarios."""
    
    def test_client_error_response_format(self):
        """Test client error (4xx) response format."""
        error = PaymentError(
            code=PaymentErrorCode.INVALID_AMOUNT,
            message="Internal validation message",
            user_message="Please enter a valid amount",
            http_status=400,
            correlation_id="client_123"
        )
        
        http_exception = PaymentErrorHandler.to_http_exception(error)
        detail = http_exception.detail
        
        # Client errors should have user-friendly messages
        assert detail["message"] == "Please enter a valid amount"
        assert detail["error_code"] == "PAY_4101"
        assert "correlation_id" in detail
        assert detail["correlation_id"] == "client_123"
    
    def test_server_error_response_format(self):
        """Test server error (5xx) response format."""
        error = PaymentError(
            code=PaymentErrorCode.DATABASE_ERROR,
            message="Internal database connection failed",
            user_message="A temporary error occurred",
            http_status=500,
            retry_after=60
        )
        
        http_exception = PaymentErrorHandler.to_http_exception(error)
        detail = http_exception.detail
        
        # Server errors should hide internal details
        assert detail["message"] == "A temporary error occurred"
        assert detail["error_code"] == "PAY_5001"
        assert detail["retry_after"] == 60
        assert http_exception.headers["Retry-After"] == "60"
    
    def test_rate_limit_response_format(self):
        """Test rate limit error response format."""
        error = PaymentError(
            code=PaymentErrorCode.RATE_LIMIT_EXCEEDED,
            message="Rate limit exceeded for payment operations",
            user_message="Too many payment attempts. Please wait.",
            http_status=429,
            retry_after=300
        )
        
        http_exception = PaymentErrorHandler.to_http_exception(error)
        
        assert http_exception.status_code == 429
        assert http_exception.detail["retry_after"] == 300
        assert http_exception.headers["Retry-After"] == "300"
    
    def test_security_error_response_format(self):
        """Test security error response format."""
        error = PaymentError(
            code=PaymentErrorCode.FRAUD_DETECTED,
            message="Fraud detection triggered for user 123",
            user_message="This transaction cannot be processed for security reasons",
            http_status=403,
            details={"fraud_score": 0.95}
        )
        
        http_exception = PaymentErrorHandler.to_http_exception(error)
        detail = http_exception.detail
        
        # Security errors should sanitize details
        assert detail["message"] == "This transaction cannot be processed for security reasons"
        assert detail["error_code"] == "PAY_4404"
        # Fraud score should be sanitized from client response
        assert "fraud_score" not in detail.get("details", {})


class TestErrorHandlingIntegration:
    """Test error handling integration with the broader system."""
    
    def test_error_logging_levels(self):
        """Test that different error types log at appropriate levels."""
        with patch('utils.payment_errors.logger') as mock_logger:
            # 4xx errors should log as warnings
            client_error = PaymentError(
                code=PaymentErrorCode.INVALID_AMOUNT,
                message="Client error",
                user_message="Invalid input",
                http_status=400
            )
            PaymentErrorHandler.log_error(client_error)
            mock_logger.warning.assert_called()
            
            # 5xx errors should log as errors
            server_error = PaymentError(
                code=PaymentErrorCode.DATABASE_ERROR,
                message="Server error",
                user_message="System error",
                http_status=500
            )
            PaymentErrorHandler.log_error(server_error)
            mock_logger.error.assert_called()
    
    def test_error_metrics_integration(self):
        """Test that errors can be integrated with monitoring systems."""
        error = PaymentError(
            code=PaymentErrorCode.STRIPE_CARD_DECLINED,
            message="Card declined",
            user_message="Payment failed",
            http_status=402,
            details={"decline_code": "insufficient_funds"}
        )
        
        # Mock metrics collection
        with patch('utils.payment_errors.logger') as mock_logger:
            PaymentErrorHandler.log_error(
                error,
                context={"payment_amount": 50.00, "user_location": "US"},
                user_id="user_123",
                payment_id="payment_456"
            )
        
        # Verify that metrics-relevant information is logged
        call_args = mock_logger.warning.call_args
        extra_context = call_args[1]["extra"]
        
        assert extra_context["error_code"] == "PAY_4301"
        assert extra_context["user_id"] == "user_123"
        assert extra_context["payment_id"] == "payment_456"
        assert extra_context["decline_code"] == "insufficient_funds"
        assert extra_context["payment_amount"] == 50.00