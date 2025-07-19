"""
Custom Sentry Middleware for Enhanced Error Context
==================================================

This middleware enhances Sentry error reporting with:
- User context extraction from JWT tokens
- Request details and custom tags
- Business logic context (appointments, payments, locations)
- Performance monitoring with custom measurements
- Enhanced breadcrumbs for debugging
"""

import json
import time
import logging
from typing import Dict, Any, Optional, Callable
from urllib.parse import urlparse

import sentry_sdk
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from jose import jwt, JWTError

from config.sentry import add_user_context, add_business_context

logger = logging.getLogger(__name__)


class SentryEnhancementMiddleware(BaseHTTPMiddleware):
    """
    Middleware to enhance Sentry error reporting with request context and user information.
    
    This middleware:
    - Extracts user information from JWT tokens
    - Adds request context and custom tags
    - Monitors API performance
    - Captures business logic context
    - Adds custom breadcrumbs for debugging
    """
    
    def __init__(self, app: ASGIApp, secret_key: Optional[str] = None):
        super().__init__(app)
        self.secret_key = secret_key
        
        # Define endpoints that should have enhanced monitoring
        self.critical_endpoints = {
            '/api/v2/appointments',
            '/api/v2/payments',
            '/api/v2/bookings',
            '/api/v2/auth/login',
            '/api/v2/auth/register'
        }
        
        # Define sensitive endpoints that need special handling
        self.sensitive_endpoints = {
            '/api/v2/auth',
            '/api/v2/payments',
            '/api/v2/webhooks'
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and enhance Sentry context."""
        
        start_time = time.time()
        
        # Set up Sentry scope for this request
        with sentry_sdk.push_scope() as scope:
            try:
                # Add request context
                self._add_request_context(request, scope)
                
                # Extract and add user context
                await self._add_user_context(request, scope)
                
                # Add business context from request
                self._add_business_context_from_request(request, scope)
                
                # Add custom breadcrumb
                sentry_sdk.add_breadcrumb(
                    message=f"Processing {request.method} {request.url.path}",
                    category="request",
                    level="info",
                    data={
                        "method": request.method,
                        "path": request.url.path,
                        "query_params": dict(request.query_params),
                        "client_ip": self._get_client_ip(request)
                    }
                )
                
                # Process the request
                response = await call_next(request)
                
                # Calculate request duration
                duration = time.time() - start_time
                
                # Add performance measurements
                self._add_performance_measurements(request, response, duration, scope)
                
                # Monitor critical endpoints
                if self._is_critical_endpoint(request.url.path):
                    self._monitor_critical_endpoint(request, response, duration)
                
                return response
                
            except Exception as e:
                # Calculate duration for error cases
                duration = time.time() - start_time
                
                # Capture enhanced error context
                self._capture_request_error(request, e, duration, scope)
                
                # Re-raise the exception to be handled by FastAPI
                raise
    
    def _add_request_context(self, request: Request, scope) -> None:
        """Add request-specific context to Sentry scope."""
        
        # Set request tags
        scope.set_tag("method", request.method)
        scope.set_tag("endpoint", request.url.path)
        scope.set_tag("client_ip", self._get_client_ip(request))
        
        # Determine if this is a sensitive endpoint
        is_sensitive = any(sensitive in request.url.path for sensitive in self.sensitive_endpoints)
        scope.set_tag("sensitive_endpoint", is_sensitive)
        
        # Add request context
        request_context = {
            "url": str(request.url),
            "method": request.method,
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "headers": dict(request.headers) if not is_sensitive else {"content-type": request.headers.get("content-type")},
            "client_ip": self._get_client_ip(request),
            "user_agent": request.headers.get("user-agent", "Unknown")
        }
        
        scope.set_context("request", request_context)
    
    async def _add_user_context(self, request: Request, scope) -> None:
        """Extract user information from JWT token and add to Sentry context."""
        
        try:
            # Get authorization header
            auth_header = request.headers.get("authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return
            
            token = auth_header.split(" ")[1]
            
            # Decode JWT token (without verification for context only)
            if self.secret_key:
                try:
                    payload = jwt.decode(token, self.secret_key, algorithms=["HS256"])
                    
                    # Extract user information
                    user_id = payload.get("sub")
                    user_email = payload.get("email")
                    user_role = payload.get("role")
                    location_id = payload.get("location_id")
                    
                    # Add user context to Sentry
                    add_user_context(
                        user_id=int(user_id) if user_id else None,
                        user_email=user_email,
                        user_role=user_role,
                        location_id=int(location_id) if location_id else None
                    )
                    
                    # Set user tags
                    if user_id:
                        scope.set_tag("user_id", user_id)
                    if user_role:
                        scope.set_tag("user_role", user_role)
                    if location_id:
                        scope.set_tag("location_id", location_id)
                        
                except JWTError:
                    # Token is invalid, but don't fail the request
                    scope.set_tag("jwt_status", "invalid")
                    
        except Exception as e:
            # Log error but don't fail the request
            logger.warning(f"Failed to extract user context from JWT: {e}")
            scope.set_tag("jwt_extraction_error", True)
    
    def _add_business_context_from_request(self, request: Request, scope) -> None:
        """Extract business context from request path and parameters."""
        
        path = request.url.path
        query_params = dict(request.query_params)
        
        # Extract appointment ID from path
        appointment_id = None
        if "/appointments/" in path:
            path_parts = path.split("/")
            for i, part in enumerate(path_parts):
                if part == "appointments" and i + 1 < len(path_parts):
                    try:
                        appointment_id = int(path_parts[i + 1])
                        break
                    except ValueError:
                        pass
        
        # Extract payment ID from path
        payment_id = None
        if "/payments/" in path:
            path_parts = path.split("/")
            for i, part in enumerate(path_parts):
                if part == "payments" and i + 1 < len(path_parts):
                    payment_id = path_parts[i + 1]
                    break
        
        # Extract service type from query params
        service_type = query_params.get("service_type")
        
        # Extract integration type from path
        integration_type = None
        if "/integrations/" in path:
            path_parts = path.split("/")
            for i, part in enumerate(path_parts):
                if part == "integrations" and i + 1 < len(path_parts):
                    integration_type = path_parts[i + 1]
                    break
        
        # Add business context if any relevant data found
        if any([appointment_id, payment_id, service_type, integration_type]):
            add_business_context(
                appointment_id=appointment_id,
                payment_id=payment_id,
                service_type=service_type,
                integration_type=integration_type
            )
    
    def _add_performance_measurements(self, request: Request, response: Response, 
                                    duration: float, scope) -> None:
        """Add performance measurements to Sentry."""
        
        # Set performance tags
        scope.set_tag("response_status", response.status_code)
        scope.set_tag("duration_ms", int(duration * 1000))
        
        # Categorize response time
        if duration < 0.1:
            response_category = "fast"
        elif duration < 0.5:
            response_category = "normal"
        elif duration < 2.0:
            response_category = "slow"
        else:
            response_category = "very_slow"
        
        scope.set_tag("response_category", response_category)
        
        # Add performance context
        performance_context = {
            "duration_seconds": duration,
            "duration_milliseconds": int(duration * 1000),
            "status_code": response.status_code,
            "response_size": response.headers.get("content-length"),
            "category": response_category
        }
        
        scope.set_context("performance", performance_context)
        
        # Record measurement in Sentry
        sentry_sdk.set_measurement("response_time", duration, "second")
        
        # Add breadcrumb for performance
        sentry_sdk.add_breadcrumb(
            message=f"Request completed in {duration:.3f}s",
            category="performance",
            level="info",
            data=performance_context
        )
    
    def _monitor_critical_endpoint(self, request: Request, response: Response, duration: float) -> None:
        """Monitor critical endpoints for performance and errors."""
        
        endpoint = request.url.path
        
        # Log slow responses on critical endpoints
        if duration > 2.0:
            sentry_sdk.capture_message(
                f"Slow response on critical endpoint: {endpoint}",
                level="warning"
            )
        
        # Log errors on critical endpoints
        if response.status_code >= 500:
            sentry_sdk.capture_message(
                f"Server error on critical endpoint: {endpoint}",
                level="error"
            )
        
        # Monitor authentication failures
        if endpoint.startswith("/api/v2/auth") and response.status_code in [401, 403]:
            sentry_sdk.add_breadcrumb(
                message="Authentication failure",
                category="auth",
                level="warning",
                data={
                    "endpoint": endpoint,
                    "status_code": response.status_code,
                    "duration": duration
                }
            )
    
    def _capture_request_error(self, request: Request, error: Exception, 
                             duration: float, scope) -> None:
        """Capture enhanced error context for request failures."""
        
        # Add error-specific context
        error_context = {
            "error_type": type(error).__name__,
            "error_message": str(error),
            "request_duration": duration,
            "endpoint": request.url.path,
            "method": request.method
        }
        
        scope.set_context("error_details", error_context)
        
        # Determine error category
        error_category = self._categorize_error(error, request.url.path)
        scope.set_tag("error_category", error_category)
        
        # Add error breadcrumb
        sentry_sdk.add_breadcrumb(
            message=f"Request error: {type(error).__name__}",
            category="error",
            level="error",
            data=error_context
        )
        
        # Use specialized error capture based on endpoint
        if "/appointments" in request.url.path:
            from config.sentry import capture_booking_error
            capture_booking_error(error)
        elif "/payments" in request.url.path:
            from config.sentry import capture_payment_error
            capture_payment_error(error)
        elif "/integrations" in request.url.path:
            from config.sentry import capture_integration_error
            integration_type = request.url.path.split("/")[-1] if "/" in request.url.path else "unknown"
            capture_integration_error(error, integration_type)
        else:
            # Standard error capture
            sentry_sdk.capture_exception(error)
    
    def _categorize_error(self, error: Exception, endpoint: str) -> str:
        """Categorize errors for better organization."""
        
        error_name = type(error).__name__
        
        # Database errors
        if "sql" in error_name.lower() or "database" in str(error).lower():
            return "database"
        
        # Authentication errors
        elif error_name in ["HTTPException"] and "401" in str(error):
            return "authentication"
        
        # Authorization errors
        elif error_name in ["HTTPException"] and "403" in str(error):
            return "authorization"
        
        # Validation errors
        elif error_name in ["ValidationError", "ValueError", "RequestValidationError"]:
            return "validation"
        
        # Integration errors
        elif any(service in str(error).lower() for service in ["stripe", "google", "sendgrid", "twilio"]):
            return "integration"
        
        # Booking-specific errors
        elif "/appointments" in endpoint or "/bookings" in endpoint:
            return "booking"
        
        # Payment-specific errors
        elif "/payments" in endpoint:
            return "payment"
        
        # Network/timeout errors
        elif error_name in ["TimeoutError", "ConnectionError", "HTTPException"]:
            return "network"
        
        return "general"
    
    def _is_critical_endpoint(self, path: str) -> bool:
        """Check if the endpoint is considered critical."""
        return any(critical in path for critical in self.critical_endpoints)
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address from request headers."""
        
        # Check for forwarded headers first (common in production)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()
        
        # Check for real IP header
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Check for Cloudflare connecting IP
        cf_connecting_ip = request.headers.get("cf-connecting-ip")
        if cf_connecting_ip:
            return cf_connecting_ip
        
        # Fallback to client address
        if hasattr(request, "client") and request.client:
            return request.client.host
        
        return "unknown"


# Middleware factory function
def create_sentry_middleware(secret_key: Optional[str] = None) -> SentryEnhancementMiddleware:
    """
    Create Sentry enhancement middleware with optional JWT secret key.
    
    Args:
        secret_key: JWT secret key for token decoding (optional)
        
    Returns:
        Configured SentryEnhancementMiddleware instance
    """
    return SentryEnhancementMiddleware(secret_key=secret_key)


# Export middleware class
__all__ = ['SentryEnhancementMiddleware', 'create_sentry_middleware']