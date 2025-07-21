"""
Structured Payment Error Handling for BookedBarber V2

Provides comprehensive, structured error codes and handling for payment operations.
Enables better client-side error handling, user experience, and debugging.

CRITICAL FEATURES:
- Standardized error codes for all payment operations
- Client-friendly error messages with actionable guidance
- Detailed logging with transaction context
- Security-aware error responses (no sensitive data exposure)
- Integration with monitoring and alerting systems
"""

from enum import Enum
from typing import Dict, Any, Optional
from dataclasses import dataclass
import logging
from datetime import datetime
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


class PaymentErrorCode(Enum):
    """Standardized payment error codes"""
    
    # Authentication & Authorization Errors (4000-4099)
    AUTHENTICATION_REQUIRED = "PAY_4001"
    INSUFFICIENT_PERMISSIONS = "PAY_4002" 
    INVALID_API_KEY = "PAY_4003"
    SESSION_EXPIRED = "PAY_4004"
    
    # Validation Errors (4100-4199)  
    INVALID_AMOUNT = "PAY_4101"
    AMOUNT_TOO_SMALL = "PAY_4102"
    AMOUNT_TOO_LARGE = "PAY_4103" 
    INVALID_CURRENCY = "PAY_4104"
    INVALID_PAYMENT_METHOD = "PAY_4105"
    MISSING_REQUIRED_FIELD = "PAY_4106"
    INVALID_FIELD_FORMAT = "PAY_4107"
    INVALID_APPOINTMENT_ID = "PAY_4108"
    INVALID_GIFT_CERTIFICATE = "PAY_4109"
    
    # Business Logic Errors (4200-4299)
    APPOINTMENT_NOT_FOUND = "PAY_4201"
    APPOINTMENT_ALREADY_PAID = "PAY_4202"
    APPOINTMENT_CANCELLED = "PAY_4203"
    APPOINTMENT_EXPIRED = "PAY_4204"
    PAYMENT_NOT_FOUND = "PAY_4205"
    PAYMENT_ALREADY_PROCESSED = "PAY_4206"
    PAYMENT_ALREADY_REFUNDED = "PAY_4207"
    REFUND_EXCEEDS_PAYMENT = "PAY_4208"
    GIFT_CERTIFICATE_EXPIRED = "PAY_4209"
    GIFT_CERTIFICATE_DEPLETED = "PAY_4210"
    INSUFFICIENT_BALANCE = "PAY_4211"
    
    # Payment Provider Errors (4300-4399)
    STRIPE_CARD_DECLINED = "PAY_4301"
    STRIPE_INSUFFICIENT_FUNDS = "PAY_4302"
    STRIPE_CARD_EXPIRED = "PAY_4303"
    STRIPE_CVC_CHECK_FAILED = "PAY_4304"
    STRIPE_PROCESSING_ERROR = "PAY_4305"
    STRIPE_3DS_REQUIRED = "PAY_4306"
    STRIPE_CONNECTION_ERROR = "PAY_4307"
    PAYMENT_METHOD_NOT_SUPPORTED = "PAY_4308"
    
    # Security & Fraud Errors (4400-4499)
    SUSPICIOUS_ACTIVITY_DETECTED = "PAY_4401"
    RATE_LIMIT_EXCEEDED = "PAY_4402"
    IP_ADDRESS_BLOCKED = "PAY_4403"
    FRAUD_DETECTED = "PAY_4404"
    AMOUNT_VERIFICATION_FAILED = "PAY_4405"
    WEBHOOK_SIGNATURE_INVALID = "PAY_4406"
    DUPLICATE_TRANSACTION = "PAY_4407"
    
    # Internal Server Errors (5000-5099)
    DATABASE_ERROR = "PAY_5001" 
    EXTERNAL_SERVICE_UNAVAILABLE = "PAY_5002"
    CONFIGURATION_ERROR = "PAY_5003"
    RECONCILIATION_ERROR = "PAY_5004"
    AUDIT_LOG_FAILURE = "PAY_5005"
    CACHE_ERROR = "PAY_5006"
    
    # Reconciliation Specific Errors (5100-5199)
    RECONCILIATION_MISMATCH = "PAY_5101"
    STRIPE_RECORD_NOT_FOUND = "PAY_5102"
    AMOUNT_DISCREPANCY = "PAY_5103" 
    STATUS_MISMATCH = "PAY_5104"
    RECONCILIATION_TIMEOUT = "PAY_5105"


@dataclass
class PaymentError:
    """Structured payment error with context"""
    code: PaymentErrorCode
    message: str
    user_message: str  # Safe message for end users
    http_status: int
    details: Dict[str, Any] = None
    retry_after: Optional[int] = None  # Seconds to wait before retry
    correlation_id: Optional[str] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()
        if self.details is None:
            self.details = {}


class PaymentErrorHandler:
    """Centralized payment error handling and logging"""
    
    @staticmethod
    def create_error(
        error_code: PaymentErrorCode,
        internal_message: str = None,
        user_message: str = None,
        details: Dict[str, Any] = None,
        correlation_id: str = None
    ) -> PaymentError:
        """Create a structured payment error"""
        
        error_config = PaymentErrorHandler._get_error_config(error_code)
        
        return PaymentError(
            code=error_code,
            message=internal_message or error_config["default_message"],
            user_message=user_message or error_config["user_message"],
            http_status=error_config["http_status"],
            details=details or {},
            retry_after=error_config.get("retry_after"),
            correlation_id=correlation_id
        )
    
    @staticmethod
    def _get_error_config(error_code: PaymentErrorCode) -> Dict[str, Any]:
        """Get configuration for specific error code"""
        
        error_configs = {
            # Authentication & Authorization
            PaymentErrorCode.AUTHENTICATION_REQUIRED: {
                "default_message": "Authentication required for payment operation",
                "user_message": "Please log in to continue with your payment",
                "http_status": status.HTTP_401_UNAUTHORIZED
            },
            PaymentErrorCode.INSUFFICIENT_PERMISSIONS: {
                "default_message": "Insufficient permissions for payment operation",
                "user_message": "You don't have permission to perform this action",
                "http_status": status.HTTP_403_FORBIDDEN
            },
            
            # Validation Errors
            PaymentErrorCode.INVALID_AMOUNT: {
                "default_message": "Invalid payment amount specified",
                "user_message": "Please enter a valid payment amount",
                "http_status": status.HTTP_400_BAD_REQUEST
            },
            PaymentErrorCode.AMOUNT_TOO_SMALL: {
                "default_message": "Payment amount below minimum threshold",
                "user_message": "Payment amount must be at least $0.50",
                "http_status": status.HTTP_400_BAD_REQUEST
            },
            PaymentErrorCode.AMOUNT_TOO_LARGE: {
                "default_message": "Payment amount exceeds maximum limit",
                "user_message": "Payment amount cannot exceed $10,000",
                "http_status": status.HTTP_400_BAD_REQUEST
            },
            PaymentErrorCode.INVALID_APPOINTMENT_ID: {
                "default_message": "Invalid appointment ID provided",
                "user_message": "The selected appointment is no longer valid",
                "http_status": status.HTTP_400_BAD_REQUEST
            },
            
            # Business Logic Errors
            PaymentErrorCode.APPOINTMENT_NOT_FOUND: {
                "default_message": "Appointment not found for payment",
                "user_message": "We couldn't find your appointment. Please check your booking details",
                "http_status": status.HTTP_404_NOT_FOUND
            },
            PaymentErrorCode.APPOINTMENT_ALREADY_PAID: {
                "default_message": "Appointment has already been paid",
                "user_message": "This appointment has already been paid for",
                "http_status": status.HTTP_409_CONFLICT
            },
            PaymentErrorCode.GIFT_CERTIFICATE_EXPIRED: {
                "default_message": "Gift certificate has expired",
                "user_message": "This gift certificate has expired and cannot be used",
                "http_status": status.HTTP_400_BAD_REQUEST
            },
            PaymentErrorCode.INSUFFICIENT_BALANCE: {
                "default_message": "Insufficient gift certificate balance",
                "user_message": "Your gift certificate doesn't have enough balance for this purchase",
                "http_status": status.HTTP_400_BAD_REQUEST
            },
            
            # Payment Provider Errors
            PaymentErrorCode.STRIPE_CARD_DECLINED: {
                "default_message": "Card payment was declined by Stripe",
                "user_message": "Your card was declined. Please try a different payment method or contact your bank",
                "http_status": status.HTTP_402_PAYMENT_REQUIRED
            },
            PaymentErrorCode.STRIPE_INSUFFICIENT_FUNDS: {
                "default_message": "Insufficient funds on payment method",
                "user_message": "Your card has insufficient funds. Please try a different payment method",
                "http_status": status.HTTP_402_PAYMENT_REQUIRED
            },
            PaymentErrorCode.STRIPE_CARD_EXPIRED: {
                "default_message": "Payment card has expired",
                "user_message": "Your card has expired. Please update your payment method",
                "http_status": status.HTTP_402_PAYMENT_REQUIRED
            },
            PaymentErrorCode.STRIPE_3DS_REQUIRED: {
                "default_message": "3D Secure authentication required",
                "user_message": "Additional authentication is required. Please complete the verification process",
                "http_status": status.HTTP_402_PAYMENT_REQUIRED
            },
            
            # Security & Fraud Errors
            PaymentErrorCode.SUSPICIOUS_ACTIVITY_DETECTED: {
                "default_message": "Suspicious payment activity detected",
                "user_message": "For security reasons, this transaction has been blocked. Please contact support",
                "http_status": status.HTTP_403_FORBIDDEN
            },
            PaymentErrorCode.RATE_LIMIT_EXCEEDED: {
                "default_message": "Payment rate limit exceeded",
                "user_message": "Too many payment attempts. Please wait a few minutes before trying again",
                "http_status": status.HTTP_429_TOO_MANY_REQUESTS,
                "retry_after": 300  # 5 minutes
            },
            PaymentErrorCode.FRAUD_DETECTED: {
                "default_message": "Payment flagged by fraud detection",
                "user_message": "This transaction cannot be processed for security reasons. Please contact support",
                "http_status": status.HTTP_403_FORBIDDEN
            },
            
            # Internal Server Errors
            PaymentErrorCode.DATABASE_ERROR: {
                "default_message": "Database error during payment processing",
                "user_message": "A temporary error occurred. Please try again in a few moments",
                "http_status": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "retry_after": 60
            },
            PaymentErrorCode.EXTERNAL_SERVICE_UNAVAILABLE: {
                "default_message": "Payment service temporarily unavailable",
                "user_message": "Payment processing is temporarily unavailable. Please try again later",
                "http_status": status.HTTP_503_SERVICE_UNAVAILABLE,
                "retry_after": 120
            },
            PaymentErrorCode.RECONCILIATION_MISMATCH: {
                "default_message": "Payment reconciliation discrepancy detected",
                "user_message": "A payment verification issue occurred. Our team has been notified",
                "http_status": status.HTTP_500_INTERNAL_SERVER_ERROR
            }
        }
        
        # Default configuration for unknown errors
        default_config = {
            "default_message": "An unexpected payment error occurred",
            "user_message": "We encountered an unexpected error. Please try again or contact support",
            "http_status": status.HTTP_500_INTERNAL_SERVER_ERROR
        }
        
        return error_configs.get(error_code, default_config)
    
    @staticmethod
    def log_error(
        error: PaymentError, 
        context: Dict[str, Any] = None,
        user_id: str = None,
        payment_id: str = None
    ):
        """Log payment error with full context"""
        
        log_context = {
            "error_code": error.code.value,
            "correlation_id": error.correlation_id,
            "timestamp": error.timestamp.isoformat(),
            "user_id": user_id,
            "payment_id": payment_id,
            **error.details,
            **(context or {})
        }
        
        # Remove sensitive information from logs
        safe_context = PaymentErrorHandler._sanitize_log_context(log_context)
        
        if error.http_status >= 500:
            logger.error(f"Payment system error: {error.message}", extra=safe_context)
        elif error.http_status >= 400:
            logger.warning(f"Payment client error: {error.message}", extra=safe_context)
        else:
            logger.info(f"Payment info: {error.message}", extra=safe_context)
    
    @staticmethod
    def _sanitize_log_context(context: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive information from log context"""
        sensitive_keys = {
            'card_number', 'cvv', 'cvc', 'ssn', 'password', 'token', 
            'api_key', 'secret', 'stripe_secret_key', 'payment_method'
        }
        
        sanitized = {}
        for key, value in context.items():
            if any(sensitive_key in key.lower() for sensitive_key in sensitive_keys):
                sanitized[key] = "[REDACTED]"
            else:
                sanitized[key] = value
        
        return sanitized
    
    @staticmethod
    def to_http_exception(error: PaymentError) -> HTTPException:
        """Convert PaymentError to FastAPI HTTPException"""
        
        detail = {
            "error_code": error.code.value,
            "message": error.user_message,
            "timestamp": error.timestamp.isoformat(),
            "correlation_id": error.correlation_id
        }
        
        # Add retry information if available
        if error.retry_after:
            detail["retry_after"] = error.retry_after
        
        # Add safe details (no sensitive information)
        if error.details:
            safe_details = PaymentErrorHandler._sanitize_log_context(error.details)
            detail["details"] = safe_details
        
        headers = {}
        if error.retry_after:
            headers["Retry-After"] = str(error.retry_after)
        
        return HTTPException(
            status_code=error.http_status,
            detail=detail,
            headers=headers if headers else None
        )


def handle_stripe_error(stripe_error: Exception, correlation_id: str = None) -> PaymentError:
    """Convert Stripe errors to structured PaymentError"""
    
    import stripe
    
    error_mapping = {
        stripe.error.CardError: PaymentErrorCode.STRIPE_CARD_DECLINED,
        stripe.error.RateLimitError: PaymentErrorCode.RATE_LIMIT_EXCEEDED,
        stripe.error.InvalidRequestError: PaymentErrorCode.STRIPE_PROCESSING_ERROR,
        stripe.error.AuthenticationError: PaymentErrorCode.INVALID_API_KEY,
        stripe.error.APIConnectionError: PaymentErrorCode.STRIPE_CONNECTION_ERROR,
        stripe.error.StripeError: PaymentErrorCode.STRIPE_PROCESSING_ERROR
    }
    
    error_code = error_mapping.get(type(stripe_error), PaymentErrorCode.STRIPE_PROCESSING_ERROR)
    
    # Extract specific decline codes for better user experience
    details = {}
    user_message = None
    
    if hasattr(stripe_error, 'decline_code'):
        decline_code = stripe_error.decline_code
        details["decline_code"] = decline_code
        
        if decline_code == 'insufficient_funds':
            error_code = PaymentErrorCode.STRIPE_INSUFFICIENT_FUNDS
        elif decline_code == 'expired_card':
            error_code = PaymentErrorCode.STRIPE_CARD_EXPIRED
        elif decline_code in ['incorrect_cvc', 'cvc_check_failed']:
            error_code = PaymentErrorCode.STRIPE_CVC_CHECK_FAILED
            user_message = "The security code (CVC) on your card is incorrect"
    
    return PaymentErrorHandler.create_error(
        error_code=error_code,
        internal_message=f"Stripe error: {str(stripe_error)}",
        user_message=user_message,
        details=details,
        correlation_id=correlation_id
    )


def handle_validation_error(field_name: str, field_value: Any, validation_message: str) -> PaymentError:
    """Create validation error with field context"""
    
    return PaymentErrorHandler.create_error(
        error_code=PaymentErrorCode.INVALID_FIELD_FORMAT,
        internal_message=f"Validation failed for {field_name}: {validation_message}",
        details={
            "field_name": field_name,
            "field_value": str(field_value) if not isinstance(field_value, (dict, list)) else "[COMPLEX_TYPE]",
            "validation_message": validation_message
        }
    )


def handle_business_logic_error(error_code: PaymentErrorCode, context: Dict[str, Any] = None) -> PaymentError:
    """Create business logic error with context"""
    
    return PaymentErrorHandler.create_error(
        error_code=error_code,
        details=context or {}
    )


# Decorator for automatic error handling
def payment_error_handler(correlation_id_func=None):
    """Decorator to automatically handle and log payment errors"""
    
    def decorator(func):
        def wrapper(*args, **kwargs):
            correlation_id = None
            if correlation_id_func:
                correlation_id = correlation_id_func(*args, **kwargs)
            
            try:
                return func(*args, **kwargs)
            except PaymentError as pe:
                PaymentErrorHandler.log_error(pe, correlation_id=correlation_id)
                raise PaymentErrorHandler.to_http_exception(pe)
            except Exception as e:
                # Convert unexpected errors to structured payment errors
                payment_error = PaymentErrorHandler.create_error(
                    error_code=PaymentErrorCode.DATABASE_ERROR,
                    internal_message=f"Unexpected error in {func.__name__}: {str(e)}",
                    correlation_id=correlation_id
                )
                PaymentErrorHandler.log_error(payment_error)
                raise PaymentErrorHandler.to_http_exception(payment_error)
        
        return wrapper
    return decorator