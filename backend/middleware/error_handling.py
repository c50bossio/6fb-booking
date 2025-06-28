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
    """Create standardized error response"""

    # Default error response
    error_detail = {
        "error": "Internal Server Error",
        "message": "An unexpected error occurred",
        "request_id": request_id,
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
        error_detail["details"] = exc.errors()

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
        error_detail["message"] = str(exc)

    elif isinstance(exc, PermissionError):
        status_code = 403
        error_detail["error"] = "Permission Denied"
        error_detail["message"] = "You don't have permission to perform this action"

    # In development, include more details
    if settings.ENVIRONMENT == "development":
        error_detail["exception_type"] = type(exc).__name__
        error_detail["traceback"] = traceback.format_exc().split("\n")

    return {"status_code": status_code, "content": error_detail}


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
