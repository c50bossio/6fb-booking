"""
Production-ready error handling middleware for 6FB Booking Platform
Provides comprehensive error handling, logging, and monitoring integration
"""

import logging
import traceback
import time
import uuid
from typing import Dict, Any, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from fastapi import HTTPException, status
import sentry_sdk
from sentry_sdk import capture_exception, set_tag, set_context

from config.settings import settings
from config.environment import env_config

logger = logging.getLogger(__name__)
security_logger = logging.getLogger("security")
performance_logger = logging.getLogger("performance")


class ProductionErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Production-ready error handling middleware with comprehensive logging,
    monitoring integration, and security considerations
    """

    def __init__(self, app, enable_detailed_errors: bool = False):
        super().__init__(app)
        self.enable_detailed_errors = (
            enable_detailed_errors or not settings.is_production
        )
        self.sentry_enabled = bool(settings.SENTRY_DSN)

    async def dispatch(self, request: Request, call_next):
        """Main middleware dispatch method"""
        request_id = str(uuid.uuid4())
        start_time = time.time()

        # Add request ID to context
        request.state.request_id = request_id

        # Set Sentry context
        if self.sentry_enabled:
            sentry_sdk.set_tag("request_id", request_id)
            sentry_sdk.set_context(
                "request",
                {
                    "method": request.method,
                    "url": str(request.url),
                    "headers": dict(request.headers),
                    "client_ip": self._get_client_ip(request),
                },
            )

        try:
            # Process request
            response = await call_next(request)

            # Log successful requests
            duration = time.time() - start_time
            self._log_request(request, response.status_code, duration, request_id)

            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id

            return response

        except Exception as exc:
            # Handle all exceptions
            duration = time.time() - start_time
            return await self._handle_exception(request, exc, duration, request_id)

    async def _handle_exception(
        self, request: Request, exc: Exception, duration: float, request_id: str
    ) -> JSONResponse:
        """Handle exceptions with proper logging and response formatting"""

        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")

        # Determine error type and status code
        if isinstance(exc, HTTPException):
            status_code = exc.status_code
            error_type = "http_exception"
            error_message = exc.detail
        elif isinstance(exc, ValueError):
            status_code = status.HTTP_400_BAD_REQUEST
            error_type = "validation_error"
            error_message = "Invalid request data"
        elif isinstance(exc, PermissionError):
            status_code = status.HTTP_403_FORBIDDEN
            error_type = "permission_error"
            error_message = "Access denied"
        elif isinstance(exc, FileNotFoundError):
            status_code = status.HTTP_404_NOT_FOUND
            error_type = "not_found_error"
            error_message = "Resource not found"
        else:
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            error_type = "internal_error"
            error_message = "Internal server error"

        # Log the error
        self._log_error(
            request,
            exc,
            status_code,
            duration,
            request_id,
            error_type,
            client_ip,
            user_agent,
        )

        # Send to Sentry for monitoring
        if self.sentry_enabled and status_code >= 500:
            self._send_to_sentry(request, exc, status_code, request_id)

        # Log security events
        if status_code in [401, 403, 429]:
            self._log_security_event(request, exc, status_code, client_ip, user_agent)

        # Format error response
        error_response = self._format_error_response(
            exc, status_code, error_type, error_message, request_id
        )

        return JSONResponse(
            status_code=status_code,
            content=error_response,
            headers={"X-Request-ID": request_id},
        )

    def _log_request(
        self, request: Request, status_code: int, duration: float, request_id: str
    ):
        """Log request details"""
        client_ip = self._get_client_ip(request)

        log_data = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": status_code,
            "duration": round(duration, 3),
            "client_ip": client_ip,
            "user_agent": request.headers.get("user-agent", ""),
            "content_length": request.headers.get("content-length", 0),
        }

        # Log level based on status code
        if status_code >= 500:
            logger.error("Request completed with server error", extra=log_data)
        elif status_code >= 400:
            logger.warning("Request completed with client error", extra=log_data)
        else:
            logger.info("Request completed successfully", extra=log_data)

        # Log slow requests
        if duration > 2.0:  # Requests taking more than 2 seconds
            performance_logger.warning(
                f"Slow request: {request.method} {request.url.path}",
                extra={**log_data, "threshold": 2.0},
            )

    def _log_error(
        self,
        request: Request,
        exc: Exception,
        status_code: int,
        duration: float,
        request_id: str,
        error_type: str,
        client_ip: str,
        user_agent: str,
    ):
        """Log error details comprehensively"""
        error_data = {
            "request_id": request_id,
            "error_type": error_type,
            "exception_type": type(exc).__name__,
            "error_message": str(exc),
            "method": request.method,
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "status_code": status_code,
            "duration": round(duration, 3),
            "client_ip": client_ip,
            "user_agent": user_agent,
        }

        # Add traceback for server errors
        if status_code >= 500:
            error_data["traceback"] = traceback.format_exc()
            logger.error(f"Server error: {str(exc)}", extra=error_data)
        else:
            logger.warning(f"Client error: {str(exc)}", extra=error_data)

    def _log_security_event(
        self,
        request: Request,
        exc: Exception,
        status_code: int,
        client_ip: str,
        user_agent: str,
    ):
        """Log security-related events"""
        security_data = {
            "event_type": "security_error",
            "status_code": status_code,
            "method": request.method,
            "path": request.url.path,
            "client_ip": client_ip,
            "user_agent": user_agent,
            "error_message": str(exc),
            "timestamp": time.time(),
        }

        if status_code == 401:
            security_data["event_type"] = "unauthorized_access"
        elif status_code == 403:
            security_data["event_type"] = "forbidden_access"
        elif status_code == 429:
            security_data["event_type"] = "rate_limit_exceeded"

        security_logger.warning("Security event detected", extra=security_data)

    def _send_to_sentry(
        self, request: Request, exc: Exception, status_code: int, request_id: str
    ):
        """Send error to Sentry for monitoring"""
        try:
            sentry_sdk.set_tag("status_code", status_code)
            sentry_sdk.set_tag("request_id", request_id)
            sentry_sdk.set_tag("error_type", type(exc).__name__)

            sentry_sdk.set_context(
                "request_details",
                {
                    "method": request.method,
                    "url": str(request.url),
                    "query_params": dict(request.query_params),
                    "client_ip": self._get_client_ip(request),
                    "user_agent": request.headers.get("user-agent", ""),
                },
            )

            # Add user context if available
            if hasattr(request.state, "user") and request.state.user:
                sentry_sdk.set_context(
                    "user",
                    {
                        "id": getattr(request.state.user, "id", None),
                        "email": getattr(request.state.user, "email", None),
                        "role": getattr(request.state.user, "role", None),
                    },
                )

            capture_exception(exc)

        except Exception as sentry_error:
            logger.error(f"Failed to send error to Sentry: {sentry_error}")

    def _format_error_response(
        self,
        exc: Exception,
        status_code: int,
        error_type: str,
        error_message: str,
        request_id: str,
    ) -> Dict[str, Any]:
        """Format error response for client"""

        response = {
            "error": True,
            "type": error_type,
            "message": error_message,
            "request_id": request_id,
            "timestamp": time.time(),
        }

        # Add detailed information in development or for HTTPExceptions
        if self.enable_detailed_errors or isinstance(exc, HTTPException):
            if isinstance(exc, HTTPException) and hasattr(exc, "detail"):
                response["detail"] = exc.detail

            # Add validation errors for Pydantic ValidationError
            if hasattr(exc, "errors"):
                response["validation_errors"] = exc.errors()

        # Add status code for client reference
        response["status_code"] = status_code

        # Add help information for common errors
        if status_code == 401:
            response["help"] = "Please provide valid authentication credentials"
        elif status_code == 403:
            response["help"] = "You don't have permission to access this resource"
        elif status_code == 404:
            response["help"] = "The requested resource was not found"
        elif status_code == 429:
            response["help"] = "Rate limit exceeded. Please try again later"
        elif status_code >= 500:
            response["help"] = (
                "An internal server error occurred. Please try again later"
            )

        return response

    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address, handling proxies"""
        # Check for forwarded headers (when behind a proxy)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take the first IP if multiple are present
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fallback to direct client IP
        if request.client:
            return request.client.host

        return "unknown"


class RateLimitExceededError(HTTPException):
    """Custom exception for rate limiting"""

    def __init__(self, detail: str = "Rate limit exceeded"):
        super().__init__(status_code=429, detail=detail)


class ValidationError(HTTPException):
    """Custom exception for validation errors"""

    def __init__(self, detail: str = "Validation failed"):
        super().__init__(status_code=400, detail=detail)


class AuthenticationError(HTTPException):
    """Custom exception for authentication errors"""

    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(status_code=401, detail=detail)


class AuthorizationError(HTTPException):
    """Custom exception for authorization errors"""

    def __init__(self, detail: str = "Access denied"):
        super().__init__(status_code=403, detail=detail)


# Global exception handlers for FastAPI
def configure_exception_handlers(app):
    """Configure global exception handlers for the FastAPI app"""

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """Handle HTTP exceptions"""
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": True,
                "type": "http_exception",
                "message": exc.detail,
                "status_code": exc.status_code,
                "request_id": getattr(request.state, "request_id", "unknown"),
            },
        )

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        """Handle value errors"""
        return JSONResponse(
            status_code=400,
            content={
                "error": True,
                "type": "validation_error",
                "message": "Invalid request data",
                "detail": str(exc) if env_config.is_development else None,
                "status_code": 400,
                "request_id": getattr(request.state, "request_id", "unknown"),
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Handle all other exceptions"""
        logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)

        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "type": "internal_error",
                "message": "Internal server error",
                "detail": str(exc) if env_config.is_development else None,
                "status_code": 500,
                "request_id": getattr(request.state, "request_id", "unknown"),
            },
        )
