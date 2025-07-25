"""
Custom Exception Classes for BookedBarber V2

This module defines application-specific exceptions that provide
better error handling and debugging capabilities.
"""

from typing import Optional, Dict, Any
from datetime import datetime


class BookedBarberException(Exception):
    """Base exception for all BookedBarber application errors"""
    
    def __init__(self, message: str, error_code: str = None, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}
        self.timestamp = datetime.utcnow()
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses"""
        return {
            "error": {
                "message": self.message,
                "code": self.error_code,
                "details": self.details,
                "timestamp": self.timestamp.isoformat()
            }
        }


# Authentication and Authorization Exceptions
class AuthenticationError(BookedBarberException):
    """Raised when authentication fails"""


class AuthorizationError(BookedBarberException):
    """Raised when user lacks required permissions"""


class InvalidTokenError(AuthenticationError):
    """Raised when JWT token is invalid or expired"""


class UserNotFoundError(AuthenticationError):
    """Raised when user is not found"""


class InvalidCredentialsError(AuthenticationError):
    """Raised when login credentials are invalid"""


# Booking-related Exceptions
class BookingError(BookedBarberException):
    """Base exception for booking-related errors"""


class AppointmentNotFoundError(BookingError):
    """Raised when appointment is not found"""


class AppointmentConflictError(BookingError):
    """Raised when appointment time conflicts with existing booking"""


class InvalidTimeSlotError(BookingError):
    """Raised when requested time slot is invalid or unavailable"""


class AppointmentAlreadyCancelledError(BookingError):
    """Raised when trying to cancel an already cancelled appointment"""


class AppointmentTooLateToModifyError(BookingError):
    """Raised when trying to modify appointment too close to start time"""


# Payment-related Exceptions
class PaymentError(BookedBarberException):
    """Base exception for payment-related errors"""


class PaymentNotFoundError(PaymentError):
    """Raised when payment is not found"""


class PaymentFailedError(PaymentError):
    """Raised when payment processing fails"""


class RefundError(PaymentError):
    """Raised when refund processing fails"""


class InsufficientFundsError(PaymentError):
    """Raised when payment method has insufficient funds"""


class PaymentAlreadyProcessedError(PaymentError):
    """Raised when trying to process an already processed payment"""


# Service-related Exceptions
class ServiceError(BookedBarberException):
    """Base exception for service-related errors"""


class ServiceNotFoundError(ServiceError):
    """Raised when service is not found"""


class ServiceUnavailableError(ServiceError):
    """Raised when service is temporarily unavailable"""


class ExternalServiceError(ServiceError):
    """Raised when external service call fails"""


# User and Business Exceptions
class UserError(BookedBarberException):
    """Base exception for user-related errors"""


class UserAlreadyExistsError(UserError):
    """Raised when trying to create user that already exists"""


class InvalidUserRoleError(UserError):
    """Raised when user role is invalid for operation"""


class BarberNotFoundError(UserError):
    """Raised when barber is not found"""


class ClientNotFoundError(UserError):
    """Raised when client is not found"""


# Validation Exceptions
class ValidationError(BookedBarberException):
    """Base exception for validation errors"""


class InvalidEmailError(ValidationError):
    """Raised when email format is invalid"""


class InvalidPhoneError(ValidationError):
    """Raised when phone number format is invalid"""


class InvalidDateRangeError(ValidationError):
    """Raised when date range is invalid"""


class InvalidPriceError(ValidationError):
    """Raised when price value is invalid"""


class RequiredFieldError(ValidationError):
    """Raised when required field is missing"""


# Database Exceptions
class DatabaseError(BookedBarberException):
    """Base exception for database-related errors"""


class RecordNotFoundError(DatabaseError):
    """Raised when database record is not found"""


class DuplicateRecordError(DatabaseError):
    """Raised when trying to create duplicate record"""


class DatabaseConnectionError(DatabaseError):
    """Raised when database connection fails"""


class TransactionError(DatabaseError):
    """Raised when database transaction fails"""


# Configuration Exceptions
class ConfigurationError(BookedBarberException):
    """Base exception for configuration-related errors"""


class MissingConfigurationError(ConfigurationError):
    """Raised when required configuration is missing"""


class InvalidConfigurationError(ConfigurationError):
    """Raised when configuration value is invalid"""


# Rate Limiting Exceptions
class RateLimitError(BookedBarberException):
    """Raised when rate limit is exceeded"""


class TooManyRequestsError(RateLimitError):
    """Raised when too many requests are made"""


# File and Storage Exceptions
class FileError(BookedBarberException):
    """Base exception for file-related errors"""


class FileNotFoundError(FileError):
    """Raised when file is not found"""


class InvalidFileTypeError(FileError):
    """Raised when file type is not allowed"""


class FileSizeExceededError(FileError):
    """Raised when file size exceeds limit"""


class StorageError(FileError):
    """Raised when file storage operation fails"""


# Integration Exceptions
class IntegrationError(BookedBarberException):
    """Base exception for third-party integration errors"""


class CalendarIntegrationError(IntegrationError):
    """Raised when calendar integration fails"""


class EmailServiceError(IntegrationError):
    """Raised when email service fails"""


class SMSServiceError(IntegrationError):
    """Raised when SMS service fails"""


class StripeIntegrationError(IntegrationError):
    """Raised when Stripe integration fails"""


# Cache Exceptions
class CacheError(BookedBarberException):
    """Base exception for cache-related errors"""


class CacheConnectionError(CacheError):
    """Raised when cache connection fails"""


class CacheKeyError(CacheError):
    """Raised when cache key is invalid"""


# Business Logic Exceptions
class BusinessRuleError(BookedBarberException):
    """Base exception for business rule violations"""


class SixFigureBarberRuleError(BusinessRuleError):
    """Raised when Six Figure Barber methodology rule is violated"""


class WorkingHoursError(BusinessRuleError):
    """Raised when operation is outside working hours"""


class CapacityExceededError(BusinessRuleError):
    """Raised when capacity limits are exceeded"""


# Exception Factory Functions
def create_validation_error(field: str, value: Any, expected: str) -> ValidationError:
    """Create validation error with standard format"""
    return ValidationError(
        message=f"Invalid value for field '{field}': {value}. Expected: {expected}",
        error_code="VALIDATION_ERROR",
        details={"field": field, "value": str(value), "expected": expected}
    )


def create_not_found_error(resource: str, identifier: str) -> RecordNotFoundError:
    """Create not found error with standard format"""
    return RecordNotFoundError(
        message=f"{resource} not found with identifier: {identifier}",
        error_code="RECORD_NOT_FOUND",
        details={"resource": resource, "identifier": identifier}
    )


def create_permission_error(user_id: str, action: str, resource: str) -> AuthorizationError:
    """Create permission error with standard format"""
    return AuthorizationError(
        message=f"User {user_id} does not have permission to {action} {resource}",
        error_code="INSUFFICIENT_PERMISSIONS",
        details={"user_id": user_id, "action": action, "resource": resource}
    )


def create_external_service_error(service: str, operation: str, reason: str) -> ExternalServiceError:
    """Create external service error with standard format"""
    return ExternalServiceError(
        message=f"External service '{service}' failed during '{operation}': {reason}",
        error_code="EXTERNAL_SERVICE_ERROR",
        details={"service": service, "operation": operation, "reason": reason}
    )


# Error Code Constants
class ErrorCodes:
    """Standard error codes used throughout the application"""
    
    # Authentication/Authorization
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED"
    INVALID_TOKEN = "INVALID_TOKEN"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    USER_NOT_FOUND = "USER_NOT_FOUND"
    
    # Validation
    VALIDATION_ERROR = "VALIDATION_ERROR"
    REQUIRED_FIELD_MISSING = "REQUIRED_FIELD_MISSING"
    INVALID_FORMAT = "INVALID_FORMAT"
    
    # Business Logic
    APPOINTMENT_CONFLICT = "APPOINTMENT_CONFLICT"
    INVALID_TIME_SLOT = "INVALID_TIME_SLOT"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    
    # System Errors
    DATABASE_ERROR = "DATABASE_ERROR"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    CONFIGURATION_ERROR = "CONFIGURATION_ERROR"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    
    # File/Storage
    FILE_NOT_FOUND = "FILE_NOT_FOUND"
    INVALID_FILE_TYPE = "INVALID_FILE_TYPE"
    FILE_SIZE_EXCEEDED = "FILE_SIZE_EXCEEDED"


# HTTP Status Code Mapping
HTTP_STATUS_MAPPING = {
    AuthenticationError: 401,
    AuthorizationError: 403,
    InvalidTokenError: 401,
    UserNotFoundError: 404,
    
    AppointmentNotFoundError: 404,
    AppointmentConflictError: 409,
    InvalidTimeSlotError: 400,
    
    PaymentFailedError: 402,
    InsufficientFundsError: 402,
    
    ValidationError: 400,
    RequiredFieldError: 400,
    InvalidEmailError: 400,
    InvalidPhoneError: 400,
    
    RecordNotFoundError: 404,
    DuplicateRecordError: 409,
    
    RateLimitError: 429,
    TooManyRequestsError: 429,
    
    FileNotFoundError: 404,
    InvalidFileTypeError: 400,
    FileSizeExceededError: 413,
    
    ExternalServiceError: 502,
    ServiceUnavailableError: 503,
    
    DatabaseConnectionError: 503,
    ConfigurationError: 500,
}


def get_http_status_code(exception: Exception) -> int:
    """Get appropriate HTTP status code for exception"""
    return HTTP_STATUS_MAPPING.get(type(exception), 500)