"""
Error Monitoring Middleware
Automatically captures and processes all application errors
"""

import asyncio
import json
import time
from datetime import datetime
from typing import Callable, Optional, Dict, Any
import uuid
import traceback

from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from services.error_monitoring_service import (
    error_monitoring_service,
    ErrorSeverity,
    ErrorCategory,
    BusinessImpact
)


class ErrorMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware to capture and monitor all application errors"""
    
    def __init__(self, app, capture_4xx: bool = False):
        super().__init__(app)
        self.capture_4xx = capture_4xx  # Whether to capture 4xx errors
        
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate request ID for tracking
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        start_time = time.time()
        
        try:
            # Add request ID to headers for tracing
            response = await call_next(request)
            
            # Check for error status codes
            if response.status_code >= 500:
                await self._capture_http_error(
                    request, response, request_id, 
                    severity=ErrorSeverity.HIGH,
                    category=ErrorCategory.INFRASTRUCTURE
                )
            elif response.status_code >= 400 and self.capture_4xx:
                await self._capture_http_error(
                    request, response, request_id,
                    severity=ErrorSeverity.MEDIUM,
                    category=ErrorCategory.VALIDATION
                )
            
            # Add monitoring headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = str(
                round((time.time() - start_time) * 1000, 2)
            )
            
            return response
            
        except Exception as e:
            # Capture unhandled exceptions
            await self._capture_exception(request, e, request_id, start_time)
            
            # Return appropriate error response
            return await self._create_error_response(request, e, request_id)
    
    async def _capture_http_error(
        self, 
        request: Request, 
        response: Response, 
        request_id: str,
        severity: ErrorSeverity,
        category: ErrorCategory
    ):
        """Capture HTTP error responses"""
        
        # Determine business impact based on endpoint and status
        business_impact = self._assess_business_impact(
            request.url.path, 
            response.status_code
        )
        
        # Extract user context
        user_context = await self._extract_user_context(request)
        
        # Capture error
        await error_monitoring_service.capture_error(
            message=f"HTTP {response.status_code} error on {request.method} {request.url.path}",
            severity=severity,
            category=category,
            business_impact=business_impact,
            request_id=request_id,
            endpoint=str(request.url.path),
            http_method=request.method,
            http_status=response.status_code,
            user_agent=request.headers.get("user-agent"),
            ip_address=self._get_client_ip(request),
            context={
                "query_params": dict(request.query_params),
                "headers": dict(request.headers),
                "response_time_ms": response.headers.get("X-Response-Time")
            },
            **user_context
        )
    
    async def _capture_exception(
        self, 
        request: Request, 
        exception: Exception, 
        request_id: str,
        start_time: float
    ):
        """Capture unhandled exceptions"""
        
        # Determine severity based on exception type
        severity = self._determine_exception_severity(exception)
        
        # Determine category based on exception type and context
        category = self._determine_exception_category(exception, request)
        
        # Assess business impact
        business_impact = self._assess_business_impact_from_exception(
            exception, 
            request.url.path
        )
        
        # Extract user context
        user_context = await self._extract_user_context(request)
        
        # Capture error
        await error_monitoring_service.capture_error(
            message=str(exception),
            severity=severity,
            category=category,
            business_impact=business_impact,
            exception=exception,
            request_id=request_id,
            endpoint=str(request.url.path),
            http_method=request.method,
            user_agent=request.headers.get("user-agent"),
            ip_address=self._get_client_ip(request),
            error_code=getattr(exception, 'code', None),
            context={
                "query_params": dict(request.query_params),
                "exception_type": type(exception).__name__,
                "processing_time_ms": round((time.time() - start_time) * 1000, 2),
                "traceback": traceback.format_exc()
            },
            **user_context
        )
    
    def _determine_exception_severity(self, exception: Exception) -> ErrorSeverity:
        """Determine severity based on exception type"""
        
        # Critical exceptions that break core functionality
        critical_exceptions = (
            ConnectionError,
            MemoryError,
            SystemError,
        )
        
        if isinstance(exception, critical_exceptions):
            return ErrorSeverity.CRITICAL
        
        # Database/external service errors
        if "database" in str(exception).lower() or "connection" in str(exception).lower():
            return ErrorSeverity.HIGH
        
        # Authentication/authorization errors
        if isinstance(exception, (HTTPException, StarletteHTTPException)):
            if exception.status_code == 401:
                return ErrorSeverity.MEDIUM
            elif exception.status_code == 403:
                return ErrorSeverity.MEDIUM
            elif exception.status_code == 500:
                return ErrorSeverity.HIGH
            elif exception.status_code >= 400:
                return ErrorSeverity.LOW
        
        # Validation errors
        if "validation" in str(exception).lower():
            return ErrorSeverity.LOW
        
        # Default to medium for unhandled exceptions
        return ErrorSeverity.MEDIUM
    
    def _determine_exception_category(
        self, 
        exception: Exception, 
        request: Request
    ) -> ErrorCategory:
        """Determine category based on exception and request context"""
        
        path = request.url.path.lower()
        exception_str = str(exception).lower()
        
        # Authentication/Authorization
        if isinstance(exception, (HTTPException, StarletteHTTPException)):
            if exception.status_code in [401, 403]:
                return ErrorCategory.AUTHENTICATION
        
        if "auth" in path or "login" in path or "token" in exception_str:
            return ErrorCategory.AUTHENTICATION
        
        # Payment processing
        if "payment" in path or "stripe" in exception_str or "billing" in path:
            return ErrorCategory.PAYMENT
        
        # Booking system
        if "appointment" in path or "booking" in path or "calendar" in path:
            return ErrorCategory.BOOKING
        
        # Database errors
        if "database" in exception_str or "sql" in exception_str:
            return ErrorCategory.DATABASE
        
        # External API errors
        if "http" in exception_str or "request" in exception_str or "api" in path:
            return ErrorCategory.EXTERNAL_API
        
        # Validation errors
        if "validation" in exception_str or "invalid" in exception_str:
            return ErrorCategory.VALIDATION
        
        # Performance errors
        if "timeout" in exception_str or "slow" in exception_str:
            return ErrorCategory.PERFORMANCE
        
        # Security errors
        if "security" in exception_str or "unauthorized" in exception_str:
            return ErrorCategory.SECURITY
        
        return ErrorCategory.BUSINESS_LOGIC
    
    def _assess_business_impact(self, path: str, status_code: int) -> BusinessImpact:
        """Assess business impact based on endpoint and status"""
        
        path_lower = path.lower()
        
        # Revenue blocking endpoints
        revenue_endpoints = [
            "/payment", "/stripe", "/billing", "/checkout", 
            "/book", "/appointment", "/reservation"
        ]
        
        if any(endpoint in path_lower for endpoint in revenue_endpoints):
            if status_code >= 500:
                return BusinessImpact.REVENUE_BLOCKING
            elif status_code >= 400:
                return BusinessImpact.USER_BLOCKING
        
        # Critical user functionality
        user_critical_endpoints = [
            "/auth", "/login", "/register", "/dashboard", 
            "/calendar", "/client"
        ]
        
        if any(endpoint in path_lower for endpoint in user_critical_endpoints):
            if status_code >= 500:
                return BusinessImpact.USER_BLOCKING
            else:
                return BusinessImpact.EXPERIENCE_DEGRADING
        
        # Admin/operational endpoints
        admin_endpoints = ["/admin", "/analytics", "/export", "/report"]
        
        if any(endpoint in path_lower for endpoint in admin_endpoints):
            return BusinessImpact.OPERATIONAL
        
        # Monitoring endpoints
        if "/health" in path_lower or "/metrics" in path_lower:
            return BusinessImpact.MONITORING
        
        # Default based on status code
        if status_code >= 500:
            return BusinessImpact.USER_BLOCKING
        else:
            return BusinessImpact.EXPERIENCE_DEGRADING
    
    def _assess_business_impact_from_exception(
        self, 
        exception: Exception, 
        path: str
    ) -> BusinessImpact:
        """Assess business impact from exception context"""
        
        # Critical system exceptions
        critical_exceptions = (ConnectionError, MemoryError, SystemError)
        if isinstance(exception, critical_exceptions):
            return BusinessImpact.REVENUE_BLOCKING
        
        # Use HTTP status assessment if available
        if isinstance(exception, (HTTPException, StarletteHTTPException)):
            return self._assess_business_impact(path, exception.status_code)
        
        # Default assessment based on path
        return self._assess_business_impact(path, 500)
    
    async def _extract_user_context(self, request: Request) -> Dict[str, Any]:
        """Extract user context from request"""
        context = {}
        
        # Try to get user ID from JWT token
        try:
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]
                # Simple JWT decode for user ID (without verification for monitoring)
                import base64
                import json
                
                payload = token.split('.')[1]
                # Add padding if needed
                payload += '=' * (4 - len(payload) % 4)
                decoded = json.loads(base64.urlsafe_b64decode(payload))
                
                context["user_id"] = decoded.get("sub")
                context["session_id"] = decoded.get("session_id")
        except Exception:
            # Failed to decode token, continue without user context
            pass
        
        # Try to get session ID from cookies
        if "session_id" not in context:
            session_cookie = request.cookies.get("session_id")
            if session_cookie:
                context["session_id"] = session_cookie
        
        return context
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address considering proxies"""
        # Check for forwarded headers
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to client host
        if hasattr(request, "client") and request.client:
            return request.client.host
        
        return "unknown"
    
    async def _create_error_response(
        self, 
        request: Request, 
        exception: Exception, 
        request_id: str
    ) -> JSONResponse:
        """Create appropriate error response"""
        
        # Handle specific exception types
        if isinstance(exception, HTTPException):
            return JSONResponse(
                status_code=exception.status_code,
                content={
                    "error": exception.detail,
                    "request_id": request_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        
        if isinstance(exception, StarletteHTTPException):
            return JSONResponse(
                status_code=exception.status_code,
                content={
                    "error": exception.detail,
                    "request_id": request_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        
        # Generic error response for unhandled exceptions
        # Don't expose internal error details in production
        error_message = "An internal server error occurred"
        if hasattr(request.app.state, "debug") and request.app.state.debug:
            error_message = str(exception)
        
        return JSONResponse(
            status_code=500,
            content={
                "error": error_message,
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat(),
                "support_contact": "support@bookedbarber.com"
            }
        )