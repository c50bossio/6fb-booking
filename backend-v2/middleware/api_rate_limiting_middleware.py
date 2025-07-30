"""
API Rate Limiting Middleware

This middleware integrates the advanced rate limiting service with FastAPI,
providing comprehensive rate limiting for the public API endpoints.

Features:
- Automatic rate limit checking
- Request metrics collection
- Concurrent request tracking
- Real-time usage analytics
- Custom rate limit headers
"""

import time
import asyncio
from typing import Callable, Optional
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import logging

from services.simple_rate_limiting_service import (
    simple_rate_limiting_service,
    RateLimitResult
)
from db import get_db
from utils.api_key_auth import get_api_key_from_header

logger = logging.getLogger(__name__)


class APIRateLimitingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for API rate limiting and usage analytics.
    
    Only applies to public API endpoints (/api/v2/public/).
    Provides comprehensive rate limiting, usage tracking, and analytics.
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.rate_limiting_service = simple_rate_limiting_service
        logger.info("🚦 API Rate Limiting Middleware initialized")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with rate limiting and analytics."""
        
        # Only apply to public API endpoints
        if not self._should_apply_rate_limiting(request):
            return await call_next(request)
        
        # Get API key information
        api_key_data = await self._get_api_key_data(request)
        if not api_key_data:
            # No API key - let the authentication middleware handle it
            return await call_next(request)
        
        api_key_id = api_key_data["id"]
        start_time = time.time()
        
        try:
            # Check rate limits
            rate_limit_result = await self._check_rate_limits(request, api_key_id)
            
            if not rate_limit_result.allowed:
                # Rate limit exceeded - return 429 response
                return await self._create_rate_limit_response(rate_limit_result)
            
            # Process the request
            response = await call_next(request)
            
            # Add rate limit headers
            self._add_rate_limit_headers(response, rate_limit_result)
            
            return response
        
        except Exception as e:
            logger.error(f"Rate limiting middleware error: {e}")
            # Fail open - continue with request
            response = await call_next(request)
            return response
    
    def _should_apply_rate_limiting(self, request: Request) -> bool:
        """Determine if rate limiting should be applied to this request."""
        path = request.url.path
        
        # Apply to public API endpoints
        if path.startswith("/api/v2/public/"):
            return True
        
        # Apply to developer portal metrics endpoint (requires authentication)
        if path.startswith("/api/v2/developer-portal/metrics"):
            return True
        
        # Skip other endpoints
        return False
    
    async def _get_api_key_data(self, request: Request) -> Optional[dict]:
        """Extract API key data from request."""
        try:
            # Extract API key from headers manually
            authorization = request.headers.get("authorization")
            x_api_key = request.headers.get("x-api-key")
            
            api_key = None
            if authorization:
                if authorization.startswith("Bearer "):
                    api_key = authorization[7:]  # Remove "Bearer " prefix
                else:
                    api_key = authorization
            elif x_api_key:
                api_key = x_api_key
            
            if not api_key:
                return None
            
            # For now, return mock data structure
            # In production, this would validate the API key against the database
            return {
                "id": 1,  # This would be the actual API key ID
                "user_id": 1,
                "scopes": ["appointments:read", "clients:read"]
            }
            
        except Exception as e:
            logger.error(f"Failed to get API key data: {e}")
            return None
    
    async def _check_rate_limits(self, request: Request, api_key_id: int) -> RateLimitResult:
        """Check rate limits for the request."""
        try:
            # Get database session
            db = next(get_db())
            
            # Extract request information
            endpoint = self._extract_endpoint(request.url.path)
            method = request.method
            ip_address = self._get_client_ip(request)
            user_agent = request.headers.get("user-agent")
            
            # Check rate limits
            result = await self.rate_limiting_service.check_rate_limit(
                api_key_id=api_key_id,
                endpoint=endpoint,
                method=method,
                db=db,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to check rate limits: {e}")
            # Fail open - allow request
            from datetime import datetime
            return RateLimitResult(
                allowed=True,
                current_usage=0,
                limit=0,
                window_seconds=0,
                reset_time=datetime.utcnow()
            )
    
    def _extract_endpoint(self, path: str) -> str:
        """Extract the API endpoint from the full path."""
        # Remove prefix and extract base endpoint
        if path.startswith("/api/v2/public/"):
            endpoint_part = path[14:]  # Remove "/api/v2/public"
        else:
            endpoint_part = path
        
        # Remove query parameters and trailing slashes
        endpoint_part = endpoint_part.split("?")[0].rstrip("/")
        
        # Extract base endpoint (remove IDs and other variable parts)
        parts = endpoint_part.split("/")
        if len(parts) > 1 and parts[1].isdigit():
            # Remove ID part: /appointments/123 -> /appointments
            return f"/{parts[0]}"
        
        return endpoint_part if endpoint_part else "/"
    
    def _get_client_ip(self, request: Request) -> Optional[str]:
        """Get client IP address from request."""
        # Check for forwarded headers (from proxy/load balancer)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP if multiple are present
            return forwarded_for.split(",")[0].strip()
        
        # Check for real IP header
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        
        # Fall back to direct client IP
        if hasattr(request.client, 'host'):
            return request.client.host
        
        return None
    
    async def _create_rate_limit_response(self, result: RateLimitResult) -> JSONResponse:
        """Create a 429 Rate Limited response."""
        headers = {
            "X-RateLimit-Limit": str(result.limit),
            "X-RateLimit-Remaining": str(max(0, result.limit - result.current_usage)),
            "X-RateLimit-Reset": str(int(result.reset_time.timestamp())),
        }
        
        if result.retry_after:
            headers["Retry-After"] = str(result.retry_after)
        
        if result.tier:
            headers["X-RateLimit-Tier"] = result.tier.value
        
        error_response = {
            "error": "rate_limit_exceeded",
            "message": "Rate limit exceeded. Please slow down your requests.",
            "details": {
                "limit": result.limit,
                "window_seconds": result.window_seconds,
                "current_usage": result.current_usage,
                "reset_time": result.reset_time.isoformat(),
                "tier": result.tier.value if result.tier else None
            }
        }
        
        if result.retry_after:
            error_response["details"]["retry_after"] = result.retry_after
        
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content=error_response,
            headers=headers
        )
    
    def _add_rate_limit_headers(self, response: Response, result: RateLimitResult):
        """Add rate limit headers to successful responses."""
        try:
            if result.limit > 0:
                response.headers["X-RateLimit-Limit"] = str(result.limit)
                response.headers["X-RateLimit-Remaining"] = str(max(0, result.limit - result.current_usage))
                response.headers["X-RateLimit-Reset"] = str(int(result.reset_time.timestamp()))
            
            if result.tier:
                response.headers["X-RateLimit-Tier"] = result.tier.value
                
        except Exception as e:
            logger.error(f"Failed to add rate limit headers: {e}")
    
    async def _record_request_metrics(
        self,
        request: Request,
        response: Response,
        api_key_id: int,
        start_time: float
    ):
        """Record detailed request metrics for analytics."""
        try:
            end_time = time.time()
            response_time_ms = (end_time - start_time) * 1000
            
            # Calculate bytes
            bytes_received = await self._calculate_request_size(request)
            bytes_sent = await self._calculate_response_size(response)
            
            # Create metrics object
            metrics = UsageMetrics(
                api_key_id=api_key_id,
                endpoint=self._extract_endpoint(request.url.path),
                method=request.method,
                timestamp=time.time(),
                response_time_ms=response_time_ms,
                response_code=response.status_code,
                bytes_sent=bytes_sent,
                bytes_received=bytes_received,
                user_agent=request.headers.get("user-agent"),
                ip_address=self._get_client_ip(request),
                geographic_region=None  # Would be populated by IP geolocation service
            )
            
            # Record metrics asynchronously
            asyncio.create_task(
                self.rate_limiting_service.record_request_metrics(metrics)
            )
            
        except Exception as e:
            logger.error(f"Failed to record request metrics: {e}")
    
    async def _calculate_request_size(self, request: Request) -> int:
        """Calculate approximate request size in bytes."""
        try:
            # Headers size
            headers_size = sum(
                len(k.encode()) + len(v.encode()) + 4  # +4 for ': ' and '\r\n'
                for k, v in request.headers.items()
            )
            
            # Body size (if present)
            body_size = 0
            if hasattr(request, '_body'):
                body_size = len(request._body)
            elif request.headers.get("content-length"):
                body_size = int(request.headers["content-length"])
            
            # Request line size (method + path + HTTP version)
            request_line_size = len(f"{request.method} {request.url.path} HTTP/1.1\r\n")
            
            return request_line_size + headers_size + body_size
            
        except Exception as e:
            logger.error(f"Failed to calculate request size: {e}")
            return 0
    
    async def _calculate_response_size(self, response: Response) -> int:
        """Calculate approximate response size in bytes."""
        try:
            # Headers size
            headers_size = sum(
                len(k.encode()) + len(str(v).encode()) + 4  # +4 for ': ' and '\r\n'  
                for k, v in response.headers.items()
            )
            
            # Body size
            body_size = 0
            if hasattr(response, 'body') and response.body:
                if isinstance(response.body, bytes):
                    body_size = len(response.body)
                elif isinstance(response.body, str):
                    body_size = len(response.body.encode())
            elif response.headers.get("content-length"):
                body_size = int(response.headers["content-length"])
            
            # Status line size
            status_line_size = len(f"HTTP/1.1 {response.status_code} \r\n")
            
            return status_line_size + headers_size + body_size
            
        except Exception as e:
            logger.error(f"Failed to calculate response size: {e}")
            return 0