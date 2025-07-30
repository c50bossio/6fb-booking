"""
Request Correlation Middleware
Adds correlation IDs to track requests across services and logs
"""

import uuid
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import sentry_sdk

logger = logging.getLogger(__name__)


class RequestCorrelationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add correlation IDs to requests for distributed tracing
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate or extract correlation ID
        correlation_id = (
            request.headers.get("x-correlation-id") or
            request.headers.get("correlation-id") or
            str(uuid.uuid4())
        )
        
        # Store in request state
        request.state.correlation_id = correlation_id
        
        # Add to Sentry scope for error correlation
        try:
            sentry_sdk.set_tag("correlation_id", correlation_id)
            sentry_sdk.set_context("request", {
                "correlation_id": correlation_id,
                "method": request.method,
                "url": str(request.url),
                "user_agent": request.headers.get("user-agent"),
                "ip": request.client.host if request.client else None
            })
        except Exception as e:
            logger.warning(f"Failed to set Sentry context: {e}")
        
        # Add to logging context
        logger.info(
            f"Request started: {request.method} {request.url.path}",
            extra={
                "correlation_id": correlation_id,
                "method": request.method,
                "path": request.url.path,
                "query_params": dict(request.query_params),
                "user_agent": request.headers.get("user-agent"),
                "ip_address": request.client.host if request.client else None
            }
        )
        
        try:
            # Process request
            response = await call_next(request)
            
            # Add correlation ID to response headers
            response.headers["X-Correlation-ID"] = correlation_id
            
            # Log successful response
            logger.info(
                f"Request completed: {request.method} {request.url.path} - {response.status_code}",
                extra={
                    "correlation_id": correlation_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code
                }
            )
            
            return response
            
        except Exception as e:
            # Log error with correlation ID
            logger.error(
                f"Request failed: {request.method} {request.url.path} - {str(e)}",
                extra={
                    "correlation_id": correlation_id,
                    "method": request.method,
                    "path": request.url.path,
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            
            # Ensure Sentry captures the correlation ID
            sentry_sdk.set_tag("correlation_id", correlation_id)
            sentry_sdk.capture_exception(e)
            
            # Re-raise to let error handlers deal with it
            raise


def get_correlation_id(request: Request) -> str:
    """
    Get the correlation ID from request state
    
    Args:
        request: FastAPI Request object
        
    Returns:
        Correlation ID string
    """
    return getattr(request.state, 'correlation_id', 'unknown')


def add_correlation_to_logs(correlation_id: str, extra_data: dict = None):
    """
    Add correlation ID to log entries
    
    Args:
        correlation_id: The correlation ID to add
        extra_data: Additional data to include in logs
    """
    log_data = {"correlation_id": correlation_id}
    if extra_data:
        log_data.update(extra_data)
    
    return log_data


class CorrelatedLogger:
    """
    Logger wrapper that automatically includes correlation ID
    """
    
    def __init__(self, logger_name: str):
        self.logger = logging.getLogger(logger_name)
        self.correlation_id = None
    
    def set_correlation_id(self, correlation_id: str):
        """Set the correlation ID for this logger instance"""
        self.correlation_id = correlation_id
    
    def _log_with_correlation(self, level: str, message: str, **kwargs):
        """Internal method to add correlation ID to logs"""
        extra = kwargs.get('extra', {})
        if self.correlation_id:
            extra['correlation_id'] = self.correlation_id
        kwargs['extra'] = extra
        
        getattr(self.logger, level)(message, **kwargs)
    
    def info(self, message: str, **kwargs):
        """Log info message with correlation ID"""
        self._log_with_correlation('info', message, **kwargs)
    
    def error(self, message: str, **kwargs):
        """Log error message with correlation ID"""
        self._log_with_correlation('error', message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message with correlation ID"""
        self._log_with_correlation('warning', message, **kwargs)
    
    def debug(self, message: str, **kwargs):
        """Log debug message with correlation ID"""
        self._log_with_correlation('debug', message, **kwargs)


def get_correlated_logger(name: str, correlation_id: str = None) -> CorrelatedLogger:
    """
    Get a logger instance that includes correlation ID in all log entries
    
    Args:
        name: Logger name
        correlation_id: Optional correlation ID to set
        
    Returns:
        CorrelatedLogger instance
    """
    logger = CorrelatedLogger(name)
    if correlation_id:
        logger.set_correlation_id(correlation_id)
    return logger