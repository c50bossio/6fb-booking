"""
Global error handling middleware
"""
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.exc import IntegrityError, OperationalError, DisconnectionError, TimeoutError as SQLTimeoutError
import traceback
import uuid
import asyncio
from typing import Union, Dict, Any
from datetime import datetime
import json

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
            "method": request.method
        }
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
        request_id=request_id
    )
    
    return JSONResponse(
        status_code=error_response["status_code"],
        content=error_response["content"],
        headers={"X-Request-ID": request_id}
    )


def create_error_response(exc: Exception, request_id: str) -> Dict[str, Any]:
    """Create standardized error response with enhanced error categorization"""
    
    # Default error response
    error_detail = {
        "error": "Internal Server Error",
        "message": "An unexpected error occurred",
        "request_id": request_id,
        "timestamp": datetime.utcnow().isoformat(),
        "error_code": "INTERNAL_ERROR"
    }
    status_code = 500
    
    # Handle specific exception types with detailed categorization
    if isinstance(exc, HTTPException):
        status_code = exc.status_code
        error_detail["error"] = exc.detail
        error_detail["message"] = exc.detail
        error_detail["error_code"] = f"HTTP_{status_code}"
        
    elif isinstance(exc, StarletteHTTPException):
        status_code = exc.status_code
        if status_code == 404:
            error_detail["error"] = "Resource Not Found"
            error_detail["message"] = "The requested resource was not found"
            error_detail["error_code"] = "RESOURCE_NOT_FOUND"
        elif status_code == 405:
            error_detail["error"] = "Method Not Allowed"
            error_detail["message"] = "The HTTP method is not allowed for this endpoint"
            error_detail["error_code"] = "METHOD_NOT_ALLOWED"
        else:
            error_detail["error"] = "HTTP Error"
            error_detail["message"] = str(exc)
            error_detail["error_code"] = f"HTTP_{status_code}"
        
    elif isinstance(exc, RequestValidationError):
        status_code = 422
        error_detail["error"] = "Validation Error"
        error_detail["message"] = "Invalid request data provided"
        error_detail["error_code"] = "VALIDATION_ERROR"
        error_detail["validation_errors"] = _format_validation_errors(exc.errors())
        
    elif isinstance(exc, IntegrityError):
        status_code = 409
        error_detail["error"] = "Database Constraint Violation"
        error_detail["message"] = "The requested operation violates database constraints"
        error_detail["error_code"] = "CONSTRAINT_VIOLATION"
        # Extract constraint info if available
        if "UNIQUE constraint failed" in str(exc):
            error_detail["message"] = "A record with this information already exists"
            error_detail["error_code"] = "DUPLICATE_RECORD"
        elif "FOREIGN KEY constraint failed" in str(exc):
            error_detail["message"] = "Referenced record does not exist"
            error_detail["error_code"] = "INVALID_REFERENCE"
        
    elif isinstance(exc, (OperationalError, DisconnectionError)):
        status_code = 503
        error_detail["error"] = "Database Unavailable"
        error_detail["message"] = "The database is temporarily unavailable. Please try again later."
        error_detail["error_code"] = "DATABASE_UNAVAILABLE"
        error_detail["retry_after"] = 30  # Suggest retry after 30 seconds
        
    elif isinstance(exc, SQLTimeoutError):
        status_code = 504
        error_detail["error"] = "Database Timeout"
        error_detail["message"] = "The database operation timed out. Please try again."
        error_detail["error_code"] = "DATABASE_TIMEOUT"
        error_detail["retry_after"] = 10
        
    elif isinstance(exc, ValueError):
        status_code = 400
        error_detail["error"] = "Invalid Value"
        error_detail["message"] = str(exc)
        error_detail["error_code"] = "INVALID_VALUE"
        
    elif isinstance(exc, PermissionError):
        status_code = 403
        error_detail["error"] = "Permission Denied"
        error_detail["message"] = "You don't have permission to perform this action"
        error_detail["error_code"] = "PERMISSION_DENIED"
        
    elif isinstance(exc, FileNotFoundError):
        status_code = 404
        error_detail["error"] = "File Not Found"
        error_detail["message"] = "The requested file was not found"
        error_detail["error_code"] = "FILE_NOT_FOUND"
        
    elif isinstance(exc, TimeoutError):
        status_code = 504
        error_detail["error"] = "Request Timeout"
        error_detail["message"] = "The request timed out. Please try again."
        error_detail["error_code"] = "REQUEST_TIMEOUT"
        error_detail["retry_after"] = 10
        
    elif isinstance(exc, ConnectionError):
        status_code = 503
        error_detail["error"] = "Service Unavailable"
        error_detail["message"] = "An external service is temporarily unavailable"
        error_detail["error_code"] = "SERVICE_UNAVAILABLE"
        error_detail["retry_after"] = 30
        
    elif isinstance(exc, asyncio.TimeoutError):
        status_code = 504
        error_detail["error"] = "Async Timeout"
        error_detail["message"] = "The operation timed out. Please try again."
        error_detail["error_code"] = "ASYNC_TIMEOUT"
        error_detail["retry_after"] = 15
    
    # In development, include more details
    if settings.ENVIRONMENT == "development":
        error_detail["debug_info"] = {
            "exception_type": type(exc).__name__,
            "traceback": traceback.format_exc().split('\n')
        }
    
    return {
        "status_code": status_code,
        "content": error_detail
    }


def _format_validation_errors(errors: list) -> list:
    """Format validation errors for better client understanding"""
    formatted_errors = []
    for error in errors:
        formatted_error = {
            "field": ".".join(str(loc) for loc in error.get("loc", [])),
            "message": error.get("msg", "Invalid value"),
            "type": error.get("type", "value_error"),
            "input": error.get("input")
        }
        formatted_errors.append(formatted_error)
    return formatted_errors


def register_exception_handlers(app):
    """Register exception handlers with FastAPI app"""
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return await handle_exception(request, exc)
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return await handle_exception(request, exc)
    
    @app.exception_handler(StarletteHTTPException)
    async def starlette_exception_handler(request: Request, exc: StarletteHTTPException):
        return await handle_exception(request, exc)
    
    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError):
        return await handle_exception(request, exc)
    
    @app.exception_handler(OperationalError)
    async def operational_error_handler(request: Request, exc: OperationalError):
        return await handle_exception(request, exc)
    
    @app.exception_handler(DisconnectionError)
    async def disconnection_error_handler(request: Request, exc: DisconnectionError):
        return await handle_exception(request, exc)
    
    @app.exception_handler(SQLTimeoutError)
    async def sql_timeout_error_handler(request: Request, exc: SQLTimeoutError):
        return await handle_exception(request, exc)
    
    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        return await handle_exception(request, exc)
    
    @app.exception_handler(PermissionError)
    async def permission_error_handler(request: Request, exc: PermissionError):
        return await handle_exception(request, exc)
    
    @app.exception_handler(FileNotFoundError)
    async def file_not_found_error_handler(request: Request, exc: FileNotFoundError):
        return await handle_exception(request, exc)
    
    @app.exception_handler(TimeoutError)
    async def timeout_error_handler(request: Request, exc: TimeoutError):
        return await handle_exception(request, exc)
    
    @app.exception_handler(ConnectionError)
    async def connection_error_handler(request: Request, exc: ConnectionError):
        return await handle_exception(request, exc)
    
    @app.exception_handler(asyncio.TimeoutError)
    async def async_timeout_error_handler(request: Request, exc: asyncio.TimeoutError):
        return await handle_exception(request, exc)
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        return await handle_exception(request, exc)