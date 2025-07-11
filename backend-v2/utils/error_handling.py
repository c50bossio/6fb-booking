"""
Centralized error handling utilities for secure error responses.
Prevents exposure of internal implementation details in production.
"""

import logging
import traceback
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from starlette.requests import Request
from sqlalchemy.exc import SQLAlchemyError
import os

logger = logging.getLogger(__name__)

# Environment check
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() in ["production", "prod"]
IS_STAGING = os.getenv("ENVIRONMENT", "development").lower() == "staging"

# User-friendly error messages
ERROR_MESSAGES = {
    "database": "A database error occurred. Please try again later.",
    "validation": "Invalid input provided. Please check your request.",
    "authentication": "Authentication failed. Please check your credentials.",
    "authorization": "You don't have permission to perform this action.",
    "not_found": "The requested resource was not found.",
    "conflict": "A conflict occurred with the current state.",
    "rate_limit": "Too many requests. Please try again later.",
    "payment": "Payment processing error. Please try again.",
    "integration": "External service error. Please try again later.",
    "server": "An internal server error occurred. Please try again later.",
    "maintenance": "Service is temporarily unavailable for maintenance."
}

class AppError(Exception):
    """Base application error with safe message exposure"""
    
    def __init__(
        self,
        message: str,
        error_type: str = "server",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
        log_error: bool = True
    ):
        self.message = message
        self.error_type = error_type
        self.status_code = status_code
        self.details = details or {}
        self.log_error = log_error
        super().__init__(message)

class ValidationError(AppError):
    """Validation error with safe details"""
    
    def __init__(self, message: str, field: Optional[str] = None):
        details = {"field": field} if field else {}
        super().__init__(
            message=message,
            error_type="validation",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
            log_error=False
        )

class AuthenticationError(AppError):
    """Authentication error"""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            message=message,
            error_type="authentication",
            status_code=status.HTTP_401_UNAUTHORIZED,
            log_error=False
        )

class AuthorizationError(AppError):
    """Authorization error"""
    
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            message=message,
            error_type="authorization",
            status_code=status.HTTP_403_FORBIDDEN,
            log_error=False
        )

class NotFoundError(AppError):
    """Resource not found error"""
    
    def __init__(self, resource: str = "Resource"):
        super().__init__(
            message=f"{resource} not found",
            error_type="not_found",
            status_code=status.HTTP_404_NOT_FOUND,
            log_error=False
        )

class ConflictError(AppError):
    """Resource conflict error"""
    
    def __init__(self, message: str):
        super().__init__(
            message=message,
            error_type="conflict",
            status_code=status.HTTP_409_CONFLICT,
            log_error=True
        )

class PaymentError(AppError):
    """Payment processing error"""
    
    def __init__(self, message: str = "Payment processing failed"):
        super().__init__(
            message=message,
            error_type="payment",
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            log_error=True
        )

class IntegrationError(AppError):
    """External integration error"""
    
    def __init__(self, service: str, message: Optional[str] = None):
        super().__init__(
            message=message or f"{service} service error",
            error_type="integration",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details={"service": service},
            log_error=True
        )

def handle_database_error(error: SQLAlchemyError) -> AppError:
    """Convert database errors to safe app errors"""
    error_str = str(error)
    
    # Log the full error internally
    logger.error(f"Database error: {error_str}", exc_info=True)
    
    # Check for specific database errors
    if "duplicate key" in error_str.lower() or "unique constraint" in error_str.lower():
        return ConflictError("A record with this information already exists")
    elif "foreign key" in error_str.lower():
        return ValidationError("Related record not found")
    elif "not null" in error_str.lower():
        return ValidationError("Required field is missing")
    
    # Generic database error
    return AppError(
        message=ERROR_MESSAGES["database"],
        error_type="database",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
    )

def safe_error_response(error: Exception, request: Optional[Request] = None) -> JSONResponse:
    """
    Convert any exception to a safe JSON response.
    In production, hides internal details. In development, includes debug info.
    """
    # Handle known app errors
    if isinstance(error, AppError):
        if error.log_error:
            logger.error(f"{error.error_type} error: {error.message}", exc_info=True)
        
        response_data = {
            "error": {
                "type": error.error_type,
                "message": error.message
            }
        }
        
        # Add field details for validation errors
        if error.details:
            response_data["error"]["details"] = error.details
        
        # Add debug info in development
        if not IS_PRODUCTION and not IS_STAGING:
            response_data["error"]["debug"] = {
                "traceback": traceback.format_exc()
            }
        
        return JSONResponse(
            status_code=error.status_code,
            content=response_data
        )
    
    # Handle FastAPI HTTPException
    if isinstance(error, HTTPException):
        return JSONResponse(
            status_code=error.status_code,
            content={
                "error": {
                    "type": "http",
                    "message": error.detail
                }
            }
        )
    
    # Handle database errors
    if isinstance(error, SQLAlchemyError):
        app_error = handle_database_error(error)
        return safe_error_response(app_error, request)
    
    # Handle all other exceptions
    logger.error(f"Unhandled exception: {type(error).__name__}: {str(error)}", exc_info=True)
    
    # Log request details if available
    if request:
        logger.error(f"Request details - Method: {request.method}, Path: {request.url.path}")
    
    # Generic error response
    response_data = {
        "error": {
            "type": "server",
            "message": ERROR_MESSAGES["server"]
        }
    }
    
    # Add debug info in development
    if not IS_PRODUCTION and not IS_STAGING:
        response_data["error"]["debug"] = {
            "exception": type(error).__name__,
            "message": str(error),
            "traceback": traceback.format_exc()
        }
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=response_data
    )

def create_error_handler(app):
    """
    Create a global error handler for the FastAPI app.
    This should be added to the main app instance.
    """
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        return safe_error_response(exc, request)
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return safe_error_response(exc, request)
    
    @app.exception_handler(SQLAlchemyError)
    async def database_exception_handler(request: Request, exc: SQLAlchemyError):
        return safe_error_response(exc, request)

# Decorator for safer endpoint error handling
def safe_endpoint(func):
    """
    Decorator to wrap endpoint functions with safe error handling.
    Catches all exceptions and returns safe error responses.
    """
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            # Try to get request from kwargs
            request = kwargs.get('request') or kwargs.get('req')
            return safe_error_response(e, request)
    
    # Preserve function metadata
    wrapper.__name__ = func.__name__
    wrapper.__doc__ = func.__doc__
    return wrapper

# Utility function to sanitize error messages
def sanitize_error_message(message: str) -> str:
    """
    Remove sensitive information from error messages.
    Used when we need to include some dynamic content in errors.
    """
    # Remove file paths
    import re
    message = re.sub(r'(/[^\s]+)+', '[path]', message)
    
    # Remove potential passwords or keys
    message = re.sub(r'(password|secret|key|token)[\s]*[=:]\s*[^\s]+', '[redacted]', message, flags=re.IGNORECASE)
    
    # Remove SQL query details
    message = re.sub(r'(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE).*', '[query]', message, flags=re.IGNORECASE)
    
    # Remove stack traces
    message = re.sub(r'File "[^"]+", line \d+.*', '[trace]', message)
    
    # Remove module paths
    message = re.sub(r'[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+', '[module]', message)
    
    return message

# Context manager for safe error handling in services
class SafeServiceOperation:
    """
    Context manager for safe service operations.
    Automatically logs and converts exceptions.
    """
    
    def __init__(self, operation_name: str, service_name: str):
        self.operation_name = operation_name
        self.service_name = service_name
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_val:
            logger.error(
                f"Error in {self.service_name}.{self.operation_name}: {exc_val}",
                exc_info=True
            )
            
            # Convert to appropriate AppError
            if isinstance(exc_val, AppError):
                return False  # Re-raise app errors
            elif isinstance(exc_val, SQLAlchemyError):
                raise handle_database_error(exc_val)
            else:
                raise AppError(
                    message=f"Error in {self.operation_name}",
                    error_type="server",
                    details={"service": self.service_name}
                )
        return False