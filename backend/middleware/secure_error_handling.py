"""
Secure error handling middleware that prevents information disclosure
while maintaining proper debugging capabilities server-side.
"""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.exc import IntegrityError, OperationalError, DatabaseError
import traceback
import uuid
import time
import logging
from typing import Union, Dict, Any, Optional
import sentry_sdk
from sentry_sdk import capture_exception, set_tag, set_context

from utils.logging import get_logger
from utils.security import get_client_ip
from config.settings import settings

logger = get_logger(__name__)
security_logger = logging.getLogger("security")


class SecureErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Security-focused error handling middleware that:
    1. Never exposes internal details to clients
    2. Logs comprehensive error information server-side
    3. Provides user-friendly error messages
    4. Integrates with monitoring systems
    """

    def __init__(self, app, enable_sentry: bool = True):
        super().__init__(app)
        self.enable_sentry = enable_sentry and bool(settings.SENTRY_DSN)

    async def dispatch(self, request: Request, call_next):
        # Generate request ID for tracking
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start_time = time.time()

        try:
            response = await call_next(request)

            # Add request ID to successful responses
            response.headers["X-Request-ID"] = request_id

            return response

        except Exception as exc:
            # Calculate request duration
            duration = time.time() - start_time

            return await self._handle_exception(request, exc, request_id, duration)

    async def _handle_exception(
        self, request: Request, exc: Exception, request_id: str, duration: float
    ) -> JSONResponse:
        """Handle exceptions with security-first approach"""

        client_ip = get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")

        # Determine error classification and user-safe response
        error_info = self._classify_error(exc)
        status_code = error_info["status_code"]

        # Log comprehensive error information for debugging (server-side only)
        self._log_error_details(
            request, exc, status_code, request_id, duration, client_ip, user_agent
        )

        # Send to monitoring systems if enabled
        if self.enable_sentry and status_code >= 500:
            self._send_to_sentry(request, exc, request_id, client_ip)

        # Log security events for authentication/authorization errors
        if status_code in [401, 403, 429]:
            self._log_security_event(request, exc, status_code, client_ip, user_agent)

        # Create client-safe response
        response_data = self._create_client_response(error_info, request_id)

        return JSONResponse(
            status_code=status_code,
            content=response_data,
            headers={"X-Request-ID": request_id},
        )

    def _classify_error(self, exc: Exception) -> Dict[str, Any]:
        """Classify error and return user-safe information"""

        if isinstance(exc, HTTPException):
            return {
                "status_code": exc.status_code,
                "error_type": "http_error",
                "user_message": (
                    exc.detail if exc.status_code < 500 else "Internal server error"
                ),
                "details": exc.detail if exc.status_code < 500 else None,
            }

        elif isinstance(exc, StarletteHTTPException):
            return {
                "status_code": exc.status_code,
                "error_type": "http_error",
                "user_message": self._get_http_status_message(exc.status_code),
                "details": None,
            }

        elif isinstance(exc, RequestValidationError):
            return {
                "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
                "error_type": "validation_error",
                "user_message": "Invalid request data provided",
                "details": self._sanitize_validation_errors(exc.errors()),
            }

        elif isinstance(exc, IntegrityError):
            return {
                "status_code": status.HTTP_409_CONFLICT,
                "error_type": "data_conflict",
                "user_message": "The operation conflicts with existing data",
                "details": None,
            }

        elif isinstance(exc, (OperationalError, DatabaseError)):
            return {
                "status_code": status.HTTP_503_SERVICE_UNAVAILABLE,
                "error_type": "service_unavailable",
                "user_message": "The service is temporarily unavailable. Please try again later.",
                "details": None,
            }

        elif isinstance(exc, ValueError):
            return {
                "status_code": status.HTTP_400_BAD_REQUEST,
                "error_type": "invalid_input",
                "user_message": "Invalid input provided",
                "details": None,
            }

        elif isinstance(exc, PermissionError):
            return {
                "status_code": status.HTTP_403_FORBIDDEN,
                "error_type": "permission_denied",
                "user_message": "You don't have permission to perform this action",
                "details": None,
            }

        else:
            # Generic server error - never expose internal details
            return {
                "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "error_type": "internal_error",
                "user_message": "An unexpected error occurred. Please try again later.",
                "details": None,
            }

    def _get_http_status_message(self, status_code: int) -> str:
        """Get user-friendly message for HTTP status codes"""
        messages = {
            400: "Bad request - please check your input",
            401: "Authentication required",
            403: "Access denied",
            404: "The requested resource was not found",
            405: "Method not allowed",
            409: "Conflict with existing data",
            422: "Invalid request data",
            429: "Too many requests - please try again later",
            500: "Internal server error",
            502: "Service temporarily unavailable",
            503: "Service temporarily unavailable",
            504: "Request timeout",
        }
        return messages.get(status_code, "An error occurred")

    def _sanitize_validation_errors(self, errors: list) -> list:
        """Sanitize validation errors to remove internal information"""
        sanitized_errors = []
        for error in errors:
            if isinstance(error, dict):
                # Only include essential validation information
                sanitized_error = {
                    "field": ".".join(str(loc) for loc in error.get("loc", [])),
                    "message": error.get("msg", "Validation failed"),
                    "type": error.get("type", "validation_error"),
                }
                # Never include 'input' field as it may contain sensitive data
                sanitized_errors.append(sanitized_error)
        return sanitized_errors

    def _log_error_details(
        self,
        request: Request,
        exc: Exception,
        status_code: int,
        request_id: str,
        duration: float,
        client_ip: str,
        user_agent: str,
    ):
        """Log comprehensive error details for server-side debugging"""

        # Get full traceback for server-side logging
        full_traceback = traceback.format_exc()

        error_context = {
            "request_id": request_id,
            "exception_type": type(exc).__name__,
            "exception_message": str(exc),
            "status_code": status_code,
            "method": request.method,
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "client_ip": client_ip,
            "user_agent": user_agent,
            "duration": round(duration, 3),
            "headers": dict(request.headers),
        }

        if status_code >= 500:
            # Log as error with full traceback for server errors
            logger.error(
                f"Server error: {type(exc).__name__}: {str(exc)}",
                extra={**error_context, "full_traceback": full_traceback},
            )
        elif status_code >= 400:
            # Log as warning for client errors (without traceback)
            logger.warning(
                f"Client error: {type(exc).__name__}: {str(exc)}", extra=error_context
            )
        else:
            # Informational logging for other cases
            logger.info(
                f"Request completed with exception: {type(exc).__name__}",
                extra=error_context,
            )

    def _log_security_event(
        self,
        request: Request,
        exc: Exception,
        status_code: int,
        client_ip: str,
        user_agent: str,
    ):
        """Log security-related events"""

        event_types = {
            401: "unauthorized_access_attempt",
            403: "forbidden_access_attempt",
            429: "rate_limit_exceeded",
        }

        security_context = {
            "event_type": event_types.get(status_code, "security_event"),
            "status_code": status_code,
            "method": request.method,
            "path": request.url.path,
            "client_ip": client_ip,
            "user_agent": user_agent,
            "exception": str(exc),
            "timestamp": time.time(),
        }

        security_logger.warning(
            f"Security event: {security_context['event_type']}", extra=security_context
        )

    def _send_to_sentry(
        self, request: Request, exc: Exception, request_id: str, client_ip: str
    ):
        """Send error to Sentry for monitoring"""
        try:
            # Set Sentry context
            sentry_sdk.set_tag("request_id", request_id)
            sentry_sdk.set_tag("exception_type", type(exc).__name__)

            sentry_sdk.set_context(
                "request",
                {
                    "method": request.method,
                    "url": str(request.url),
                    "query_params": dict(request.query_params),
                    "client_ip": client_ip,
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

            # Capture the exception
            capture_exception(exc)

        except Exception as sentry_error:
            logger.error(f"Failed to send error to Sentry: {sentry_error}")

    def _create_client_response(
        self, error_info: Dict[str, Any], request_id: str
    ) -> Dict[str, Any]:
        """Create client-safe error response"""

        response = {
            "error": True,
            "type": error_info["error_type"],
            "message": error_info["user_message"],
            "request_id": request_id,
            "timestamp": int(time.time()),
        }

        # Include validation errors if present and safe
        if error_info.get("details") and error_info["error_type"] == "validation_error":
            response["validation_errors"] = error_info["details"]

        # Add helpful guidance for common errors
        status_code = error_info["status_code"]
        if status_code == 401:
            response["help"] = "Please authenticate to access this resource"
        elif status_code == 403:
            response["help"] = "You don't have permission to access this resource"
        elif status_code == 404:
            response["help"] = "The requested resource was not found"
        elif status_code == 422:
            response["help"] = "Please check your input data and try again"
        elif status_code == 429:
            response["help"] = "Too many requests. Please wait before trying again"
        elif status_code >= 500:
            response["help"] = (
                "A server error occurred. Please try again later or contact support"
            )

        return response


def register_secure_exception_handlers(app):
    """Register secure exception handlers for FastAPI"""

    @app.exception_handler(HTTPException)
    async def secure_http_exception_handler(request: Request, exc: HTTPException):
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))

        # Log the error server-side
        logger.warning(
            f"HTTP Exception: {exc.status_code} - {exc.detail}",
            extra={
                "request_id": request_id,
                "status_code": exc.status_code,
                "path": request.url.path,
                "method": request.method,
            },
        )

        # Never expose internal details, even for HTTPExceptions
        user_message = exc.detail if exc.status_code < 500 else "Internal server error"

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": True,
                "type": "http_error",
                "message": user_message,
                "request_id": request_id,
                "timestamp": int(time.time()),
            },
            headers={"X-Request-ID": request_id},
        )

    @app.exception_handler(RequestValidationError)
    async def secure_validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))

        # Log validation error details server-side
        logger.warning(
            f"Validation Error: {str(exc)}",
            extra={
                "request_id": request_id,
                "validation_errors": exc.errors(),
                "path": request.url.path,
                "method": request.method,
            },
        )

        # Sanitize validation errors for client
        sanitized_errors = []
        for error in exc.errors():
            if isinstance(error, dict):
                sanitized_errors.append(
                    {
                        "field": ".".join(str(loc) for loc in error.get("loc", [])),
                        "message": error.get("msg", "Validation failed"),
                        "type": error.get("type", "validation_error"),
                    }
                )

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": True,
                "type": "validation_error",
                "message": "Invalid request data provided",
                "validation_errors": sanitized_errors,
                "request_id": request_id,
                "timestamp": int(time.time()),
                "help": "Please check your input data and try again",
            },
            headers={"X-Request-ID": request_id},
        )

    @app.exception_handler(Exception)
    async def secure_general_exception_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))

        # Log full error details server-side
        logger.error(
            f"Unhandled Exception: {type(exc).__name__}: {str(exc)}",
            exc_info=True,
            extra={
                "request_id": request_id,
                "exception_type": type(exc).__name__,
                "path": request.url.path,
                "method": request.method,
                "client_ip": get_client_ip(request),
            },
        )

        # Send to Sentry if configured
        if settings.SENTRY_DSN:
            try:
                sentry_sdk.set_tag("request_id", request_id)
                sentry_sdk.set_context(
                    "request",
                    {
                        "method": request.method,
                        "url": str(request.url),
                        "client_ip": get_client_ip(request),
                    },
                )
                capture_exception(exc)
            except Exception:
                pass  # Don't fail if Sentry fails

        # Return generic error to client (never expose internal details)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": True,
                "type": "internal_error",
                "message": "An unexpected error occurred. Please try again later.",
                "request_id": request_id,
                "timestamp": int(time.time()),
                "help": "A server error occurred. Please try again later or contact support",
            },
            headers={"X-Request-ID": request_id},
        )
