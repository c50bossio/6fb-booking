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
    pass


class AuthorizationError(BookedBarberException):
    """Raised when user lacks required permissions"""
    pass


class InvalidTokenError(AuthenticationError):
    """Raised when JWT token is invalid or expired"""
    pass


class UserNotFoundError(AuthenticationError):
    """Raised when user is not found"""
    pass


class InvalidCredentialsError(AuthenticationError):
    """Raised when login credentials are invalid"""
    pass


# Booking-related Exceptions
class BookingError(BookedBarberException):
    """Base exception for booking-related errors"""
    pass


class AppointmentNotFoundError(BookingError):
    """Raised when appointment is not found"""
    pass


class AppointmentConflictError(BookingError):
    """Raised when appointment time conflicts with existing booking"""
    pass


class InvalidTimeSlotError(BookingError):
    """Raised when requested time slot is invalid or unavailable"""
    pass


class AppointmentAlreadyCancelledError(BookingError):
    """Raised when trying to cancel an already cancelled appointment"""
    pass


class AppointmentTooLateToModifyError(BookingError):
    """Raised when trying to modify appointment too close to start time"""
    pass


# Payment-related Exceptions
class PaymentError(BookedBarberException):
    """Base exception for payment-related errors"""
    pass


class PaymentNotFoundError(PaymentError):
    """Raised when payment is not found"""
    pass


class PaymentFailedError(PaymentError):
    """Raised when payment processing fails"""
    pass


class RefundError(PaymentError):
    """Raised when refund processing fails"""
    pass


class InsufficientFundsError(PaymentError):
    """Raised when payment method has insufficient funds"""
    pass


class PaymentAlreadyProcessedError(PaymentError):
    """Raised when trying to process an already processed payment"""
    pass


# Service-related Exceptions
class ServiceError(BookedBarberException):
    """Base exception for service-related errors"""
    pass


class ServiceNotFoundError(ServiceError):
    """Raised when service is not found"""
    pass


class ServiceUnavailableError(ServiceError):
    """Raised when service is temporarily unavailable"""
    pass


class ExternalServiceError(ServiceError):
    """Raised when external service call fails"""
    pass


# User and Business Exceptions
class UserError(BookedBarberException):
    """Base exception for user-related errors"""
    pass


class UserAlreadyExistsError(UserError):
    """Raised when trying to create user that already exists"""
    pass


class InvalidUserRoleError(UserError):
    """Raised when user role is invalid for operation"""
    pass


class BarberNotFoundError(UserError):
    """Raised when barber is not found"""
    pass


class ClientNotFoundError(UserError):
    """Raised when client is not found"""
    pass


# Validation Exceptions
class ValidationError(BookedBarberException):
    """Base exception for validation errors"""
    pass


class InvalidEmailError(ValidationError):
    """Raised when email format is invalid"""
    pass


class InvalidPhoneError(ValidationError):
    """Raised when phone number format is invalid"""
    pass


class InvalidDateRangeError(ValidationError):
    """Raised when date range is invalid"""
    pass


class InvalidPriceError(ValidationError):
    """Raised when price value is invalid"""
    pass


class RequiredFieldError(ValidationError):
    """Raised when required field is missing"""
    pass


# Database Exceptions
class DatabaseError(BookedBarberException):
    """Base exception for database-related errors"""
    pass


class RecordNotFoundError(DatabaseError):
    """Raised when database record is not found"""
    pass


class DuplicateRecordError(DatabaseError):
    """Raised when trying to create duplicate record"""
    pass


class DatabaseConnectionError(DatabaseError):
    """Raised when database connection fails"""
    pass


class TransactionError(DatabaseError):
    """Raised when database transaction fails"""
    pass


# Configuration Exceptions
class ConfigurationError(BookedBarberException):
    """Base exception for configuration-related errors"""
    pass


class MissingConfigurationError(ConfigurationError):
    """Raised when required configuration is missing"""
    pass


class InvalidConfigurationError(ConfigurationError):
    """Raised when configuration value is invalid"""
    pass


# Rate Limiting Exceptions
class RateLimitError(BookedBarberException):
    """Raised when rate limit is exceeded"""
    pass


class TooManyRequestsError(RateLimitError):
    """Raised when too many requests are made"""
    pass


# File and Storage Exceptions
class FileError(BookedBarberException):
    """Base exception for file-related errors"""
    pass


class FileNotFoundError(FileError):
    """Raised when file is not found"""
    pass


class InvalidFileTypeError(FileError):
    """Raised when file type is not allowed"""
    pass


class FileSizeExceededError(FileError):
    """Raised when file size exceeds limit"""
    pass


class StorageError(FileError):
    """Raised when file storage operation fails"""
    pass


# Integration Exceptions
class IntegrationError(BookedBarberException):
    """Base exception for third-party integration errors"""
    pass


class CalendarIntegrationError(IntegrationError):
    """Raised when calendar integration fails"""
    pass


class EmailServiceError(IntegrationError):
    """Raised when email service fails"""
    pass


class SMSServiceError(IntegrationError):
    """Raised when SMS service fails"""
    pass


class StripeIntegrationError(IntegrationError):
    """Raised when Stripe integration fails"""
    pass


# Cache Exceptions
class CacheError(BookedBarberException):
    """Base exception for cache-related errors"""
    pass


class CacheConnectionError(CacheError):
    """Raised when cache connection fails"""
    pass


class CacheKeyError(CacheError):
    """Raised when cache key is invalid"""
    pass


# Business Logic Exceptions
class BusinessRuleError(BookedBarberException):
    """Base exception for business rule violations"""
    pass


class SixFigureBarberRuleError(BusinessRuleError):
    """Raised when Six Figure Barber methodology rule is violated"""
    pass


class WorkingHoursError(BusinessRuleError):
    """Raised when operation is outside working hours"""
    pass


class CapacityExceededError(BusinessRuleError):
    """Raised when capacity limits are exceeded"""
    pass


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