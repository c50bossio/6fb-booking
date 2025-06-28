"""
Global error handling middleware
"""

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.exc import IntegrityError, OperationalError
import traceback
import uuid
from typing import Union, Dict, Any

from utils.logging import get_logger, log_api_request
from utils.security import get_client_ip
from config.settings import settings

logger = get_logger(__name__)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware to handle all exceptions globally"""

    async def dispatch(self, request: Request, call_next):
        # Generate request ID for tracking
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            return await handle_exception(request, exc)


async def handle_exception(request: Request, exc: Exception) -> JSONResponse:
    """Handle different types of exceptions"""

    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    client_ip = get_client_ip(request)

    # Log the exception
    logger.error(
        f"Unhandled exception: {type(exc).__name__}",
        exc_info=True,
        extra={
            "request_id": request_id,
            "ip_address": client_ip,
            "path": request.url.path,
            "method": request.method,
        },
    )

    # Prepare error response
    error_response = create_error_response(exc, request_id)

    # Log API request
    log_api_request(
        method=request.method,
        path=str(request.url.path),
        status_code=error_response["status_code"],
        duration=0,  # Duration will be tracked by request logging middleware
        ip_address=client_ip,
        request_id=request_id,
    )

    return JSONResponse(
        status_code=error_response["status_code"],
        content=error_response["content"],
        headers={"X-Request-ID": request_id},
    )


def create_error_response(exc: Exception, request_id: str) -> Dict[str, Any]:
    """Create standardized error response with security-first approach"""

    # Default error response
    error_detail = {
        "error": "Internal Server Error",
        "message": "An unexpected error occurred",
        "request_id": request_id,
        "timestamp": traceback.format_exc(),  # Store full traceback for server logging only
    }
    status_code = 500

    # Handle specific exception types
    if isinstance(exc, HTTPException):
        status_code = exc.status_code
        error_detail["error"] = exc.detail
        error_detail["message"] = exc.detail

    elif isinstance(exc, StarletteHTTPException):
        status_code = exc.status_code
        error_detail["error"] = "Not Found" if status_code == 404 else "HTTP Error"
        error_detail["message"] = (
            "The requested resource was not found" if status_code == 404 else str(exc)
        )

    elif isinstance(exc, RequestValidationError):
        status_code = 422
        error_detail["error"] = "Validation Error"
        error_detail["message"] = "Invalid request data"
        # Only include sanitized validation details
        error_detail["details"] = _sanitize_validation_errors(exc.errors())

    elif isinstance(exc, IntegrityError):
        status_code = 409
        error_detail["error"] = "Database Constraint Violation"
        error_detail["message"] = (
            "The requested operation violates database constraints"
        )

    elif isinstance(exc, OperationalError):
        status_code = 503
        error_detail["error"] = "Database Unavailable"
        error_detail["message"] = "The database is temporarily unavailable"

    elif isinstance(exc, ValueError):
        status_code = 400
        error_detail["error"] = "Invalid Value"
        error_detail["message"] = "Invalid request data provided"

    elif isinstance(exc, PermissionError):
        status_code = 403
        error_detail["error"] = "Permission Denied"
        error_detail["message"] = "You don't have permission to perform this action"

    # Store full traceback for server-side logging only
    full_traceback = error_detail.pop("timestamp", "")

    # Log the full error details server-side for debugging
    logger.error(
        f"Exception occurred: {type(exc).__name__}: {str(exc)}",
        extra={
            "request_id": request_id,
            "exception_type": type(exc).__name__,
            "status_code": status_code,
            "full_traceback": full_traceback,
        },
    )

    # SECURITY: Never expose internal details to client - even in development
    # Only include basic error information in the response
    client_safe_response = {
        "error": error_detail["error"],
        "message": error_detail["message"],
        "request_id": request_id,
        "status_code": status_code,
    }

    # Only include validation details for client if they're safe
    if "details" in error_detail and status_code == 422:
        client_safe_response["validation_errors"] = error_detail["details"]

    return {"status_code": status_code, "content": client_safe_response}


def _sanitize_validation_errors(errors: list) -> list:
    """Sanitize validation errors to remove internal path information"""
    sanitized_errors = []
    for error in errors:
        if isinstance(error, dict):
            # Remove internal file paths and keep only essential validation info
            sanitized_error = {
                "field": ".".join(str(loc) for loc in error.get("loc", [])),
                "message": error.get("msg", "Validation failed"),
                "type": error.get("type", "validation_error"),
            }
            # Don't include 'input' as it might contain sensitive data
            sanitized_errors.append(sanitized_error)
    return sanitized_errors


def register_exception_handlers(app):
    """Register exception handlers with FastAPI app"""

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return await handle_exception(request, exc)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        return await handle_exception(request, exc)

    @app.exception_handler(StarletteHTTPException)
    async def starlette_exception_handler(
        request: Request, exc: StarletteHTTPException
    ):
        return await handle_exception(request, exc)

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError):
        return await handle_exception(request, exc)

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        return await handle_exception(request, exc)
