"""
Optimized Middleware Stack for BookedBarber V2
Performance-focused middleware consolidation and routing

Reduces 13+ middleware layers to 3-5 optimized layers
Target: 200-400ms → 50-100ms middleware latency reduction
"""

import time
import logging
import re
from typing import Dict, List, Optional, Callable
from fastapi import Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware
from starlette.middleware.base import RequestResponseEndpoint
import asyncio
from collections import defaultdict
import psutil
import os

logger = logging.getLogger(__name__)

class MiddlewarePerformanceTracker:
    """Track middleware performance and identify bottlenecks"""
    
    def __init__(self):
        self.middleware_metrics = defaultdict(list)
        self.request_count = 0
        self.total_processing_time = 0
        
    def track_middleware_performance(self, middleware_name: str, execution_time: float):
        """Track execution time for specific middleware"""
        self.middleware_metrics[middleware_name].append(execution_time)
        
    def track_request_performance(self, total_time: float):
        """Track overall request performance"""
        self.request_count += 1
        self.total_processing_time += total_time
        
    def get_middleware_stats(self) -> Dict:
        """Get performance statistics for all middleware"""
        stats = {}
        for middleware, times in self.middleware_metrics.items():
            if times:
                stats[middleware] = {
                    'avg_time': sum(times) / len(times),
                    'max_time': max(times),
                    'min_time': min(times),
                    'total_calls': len(times)
                }
        return stats
        
    def get_overall_stats(self) -> Dict:
        """Get overall request processing statistics"""
        avg_time = (self.total_processing_time / self.request_count) if self.request_count > 0 else 0
        return {
            'total_requests': self.request_count,
            'avg_processing_time': avg_time,
            'total_processing_time': self.total_processing_time
        }

# Global performance tracker
performance_tracker = MiddlewarePerformanceTracker()

class SmartMiddlewareRouter:
    """Route requests to appropriate middleware based on path and method"""
    
    def __init__(self):
        self.route_middleware_map = {
            # Authentication endpoints - security + MFA + rate limiting
            r"/api/v2/auth/.*": ["security", "mfa", "rate_limiting"],
            
            # Payment endpoints - security + financial + rate limiting  
            r"/api/v2/payments/.*": ["security", "financial", "rate_limiting"],
            
            # Appointment endpoints - security + cache + rate limiting
            r"/api/v2/appointments/.*": ["security", "cache", "rate_limiting"],
            
            # Analytics endpoints - security + cache (no rate limiting for internal)
            r"/api/v2/analytics/.*": ["security", "cache"],
            
            # Public endpoints - minimal middleware
            r"/api/v2/public/.*": ["rate_limiting", "security_headers"],
            
            # Health endpoints - no middleware for performance
            r"/health.*": [],
            
            # Webhook endpoints - security + webhook validation
            r"/api/v2/webhooks/.*": ["security", "webhook", "rate_limiting"],
            
            # Default for all other endpoints
            r".*": ["security", "rate_limiting"]
        }
        
        # Compile regex patterns for faster matching
        self.compiled_patterns = {
            re.compile(pattern): middleware 
            for pattern, middleware in self.route_middleware_map.items()
        }
        
    def get_middleware_for_path(self, path: str) -> List[str]:
        """Get required middleware for a specific path"""
        for pattern, middleware in self.compiled_patterns.items():
            if pattern.match(path):
                return middleware
        return self.route_middleware_map[r".*"]  # Default

# Global middleware router
middleware_router = SmartMiddlewareRouter()

class ConsolidatedSecurityMiddleware(BaseHTTPMiddleware):
    """
    Consolidated security middleware combining:
    - SecurityHeadersMiddleware
    - EnhancedSecurityMiddleware  
    - RequestValidationMiddleware
    - CSRFMiddleware
    """
    
    def __init__(self, app, environment: str = "development"):
        super().__init__(app)
        self.environment = environment
        self.security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        }
        
        # CSRF exempt paths
        self.csrf_exempt_paths = ["/health", "/api/v2/webhooks/", "/api/v2/public/"]
        
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start_time = time.time()
        
        try:
            # Input validation
            await self._validate_request(request)
            
            # CSRF protection (if applicable)
            if await self._requires_csrf_protection(request):
                await self._validate_csrf_token(request)
            
            # Process request
            response = await call_next(request)
            
            # Add security headers
            self._add_security_headers(response)
            
            # Track performance
            execution_time = (time.time() - start_time) * 1000
            performance_tracker.track_middleware_performance("consolidated_security", execution_time)
            
            return response
            
        except Exception as e:
            logger.error(f"Security middleware error: {e}")
            # Create error response with security headers
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Security validation failed")
    
    async def _validate_request(self, request: Request):
        """Validate request format and size"""
        # Content length validation
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 10 * 1024 * 1024:  # 10MB limit
            raise ValueError("Request too large")
            
        # Content type validation for POST/PUT requests
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            allowed_types = ["application/json", "application/x-www-form-urlencoded", "multipart/form-data"]
            if not any(allowed_type in content_type for allowed_type in allowed_types):
                raise ValueError("Invalid content type")
    
    async def _requires_csrf_protection(self, request: Request) -> bool:
        """Check if request requires CSRF protection"""
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return False
            
        path = request.url.path
        return not any(exempt_path in path for exempt_path in self.csrf_exempt_paths)
    
    async def _validate_csrf_token(self, request: Request):
        """Validate CSRF token for protected requests"""
        csrf_token = request.headers.get("X-CSRFToken") or request.headers.get("X-CSRF-Token")
        if not csrf_token:
            # Check for token in form data for non-JSON requests
            if request.headers.get("content-type", "").startswith("application/x-www-form-urlencoded"):
                form_data = await request.form()
                csrf_token = form_data.get("csrf_token")
        
        if not csrf_token:
            raise ValueError("CSRF token missing")
        
        # Token validation logic would go here
        # For now, just check if token exists and is not empty
        if len(csrf_token) < 10:
            raise ValueError("Invalid CSRF token")
    
    def _add_security_headers(self, response: Response):
        """Add security headers to response"""
        for header, value in self.security_headers.items():
            response.headers[header] = value

class ConsolidatedAuthMiddleware(BaseHTTPMiddleware):
    """
    Consolidated authentication middleware combining:
    - MFAEnforcementMiddleware
    - MultiTenancyMiddleware
    - FinancialSecurityMiddleware (for payment endpoints)
    """
    
    def __init__(self, app):
        super().__init__(app)
        
        # MFA required paths
        self.mfa_required_paths = [
            "/api/v2/admin/",
            "/api/v2/payments/refund",
            "/api/v2/users/delete",
            "/api/v2/settings/security"
        ]
        
        # Financial security paths
        self.financial_paths = ["/api/v2/payments/", "/api/v2/billing/"]
        
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start_time = time.time()
        
        try:
            path = request.url.path
            
            # Skip auth for public endpoints
            if self._is_public_endpoint(path):
                response = await call_next(request)
            else:
                # Authenticate user
                user = await self._authenticate_user(request)
                request.state.user = user
                
                # Check MFA if required
                if self._requires_mfa(path) and not await self._validate_mfa(request, user):
                    from fastapi import HTTPException
                    raise HTTPException(status_code=403, detail="MFA required")
                
                # Multi-tenancy validation
                if not await self._validate_tenant_access(request, user):
                    from fastapi import HTTPException
                    raise HTTPException(status_code=403, detail="Tenant access denied")
                
                # Financial security for payment endpoints
                if self._is_financial_endpoint(path):
                    await self._validate_financial_access(request, user)
                
                response = await call_next(request)
            
            # Track performance
            execution_time = (time.time() - start_time) * 1000
            performance_tracker.track_middleware_performance("consolidated_auth", execution_time)
            
            return response
            
        except Exception as e:
            logger.error(f"Auth middleware error: {e}")
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail="Authentication failed")
    
    def _is_public_endpoint(self, path: str) -> bool:
        """Check if endpoint is public (no auth required)"""
        public_paths = ["/health", "/api/v2/public/", "/docs", "/openapi.json"]
        return any(public_path in path for public_path in public_paths)
    
    def _is_financial_endpoint(self, path: str) -> bool:
        """Check if endpoint requires financial security"""
        return any(financial_path in path for financial_path in self.financial_paths)
    
    def _requires_mfa(self, path: str) -> bool:
        """Check if path requires MFA"""
        return any(mfa_path in path for mfa_path in self.mfa_required_paths)
    
    async def _authenticate_user(self, request: Request):
        """Authenticate user from JWT token"""
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise ValueError("Missing or invalid authorization header")
        
        token = auth_header.split(" ")[1]
        # JWT validation logic would go here
        # For now, return mock user
        return {"id": 1, "email": "user@example.com", "role": "barber"}
    
    async def _validate_mfa(self, request: Request, user: dict) -> bool:
        """Validate MFA token if required"""
        mfa_token = request.headers.get("X-MFA-Token")
        if not mfa_token:
            return False
        
        # MFA validation logic would go here
        return len(mfa_token) > 10  # Simple validation for now
    
    async def _validate_tenant_access(self, request: Request, user: dict) -> bool:
        """Validate user has access to requested tenant/location"""
        location_id = request.headers.get("X-Location-Id")
        if not location_id:
            return True  # No tenant restriction
        
        # Multi-tenancy validation logic would go here
        return True  # Allow for now
    
    async def _validate_financial_access(self, request: Request, user: dict):
        """Additional security for financial endpoints"""
        if request.method in ["POST", "PUT", "DELETE"]:
            # Require additional verification for financial operations
            verification_token = request.headers.get("X-Financial-Verification")
            if not verification_token:
                raise ValueError("Financial verification required")

class OptimizedCacheMiddleware(BaseHTTPMiddleware):
    """
    Optimized caching middleware with intelligent cache strategies
    """
    
    def __init__(self, app, enable_cache: bool = True):
        super().__init__(app)
        self.enable_cache = enable_cache
        self.cache_strategies = {
            # Analytics endpoints - long cache
            r"/api/v2/analytics/.*": {"ttl": 300, "strategy": "aggressive"},
            
            # Appointment availability - medium cache
            r"/api/v2/appointments/availability.*": {"ttl": 60, "strategy": "conditional"},
            
            # User profile - short cache
            r"/api/v2/users/profile": {"ttl": 30, "strategy": "user_based"},
            
            # Public data - long cache
            r"/api/v2/public/.*": {"ttl": 600, "strategy": "aggressive"}
        }
        
        # Compile regex patterns
        self.compiled_cache_patterns = {
            re.compile(pattern): config 
            for pattern, config in self.cache_strategies.items()
        }
        
        # In-memory cache for development (Redis in production)
        self.memory_cache = {}
        
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not self.enable_cache or request.method != "GET":
            return await call_next(request)
        
        start_time = time.time()
        
        try:
            cache_config = self._get_cache_config(request.url.path)
            if not cache_config:
                response = await call_next(request)
            else:
                # Try to get from cache
                cache_key = self._generate_cache_key(request)
                cached_response = await self._get_from_cache(cache_key)
                
                if cached_response:
                    response = cached_response
                    response.headers["X-Cache"] = "HIT"
                else:
                    response = await call_next(request)
                    # Cache successful responses
                    if response.status_code == 200:
                        await self._store_in_cache(cache_key, response, cache_config["ttl"])
                        response.headers["X-Cache"] = "MISS"
            
            # Track performance
            execution_time = (time.time() - start_time) * 1000
            performance_tracker.track_middleware_performance("optimized_cache", execution_time)
            
            return response
            
        except Exception as e:
            logger.error(f"Cache middleware error: {e}")
            return await call_next(request)
    
    def _get_cache_config(self, path: str) -> Optional[Dict]:
        """Get cache configuration for path"""
        for pattern, config in self.compiled_cache_patterns.items():
            if pattern.match(path):
                return config
        return None
    
    def _generate_cache_key(self, request: Request) -> str:
        """Generate cache key for request"""
        # Include path, query params, and relevant headers
        key_parts = [
            request.url.path,
            str(sorted(request.query_params.items())),
            request.headers.get("X-Location-Id", ""),
            request.headers.get("Authorization", "")[:20]  # First 20 chars for user identity
        ]
        return "|".join(key_parts)
    
    async def _get_from_cache(self, cache_key: str):
        """Get response from cache"""
        # Simple in-memory cache for now (Redis implementation needed)
        cached_data = self.memory_cache.get(cache_key)
        if cached_data and cached_data["expires"] > time.time():
            from fastapi import Response
            return Response(
                content=cached_data["content"],
                status_code=cached_data["status_code"],
                headers=cached_data["headers"]
            )
        return None
    
    async def _store_in_cache(self, cache_key: str, response: Response, ttl: int):
        """Store response in cache"""
        # Read response body
        response_body = b""
        async for chunk in response.body_iterator:
            response_body += chunk
        
        # Store in cache
        self.memory_cache[cache_key] = {
            "content": response_body,
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "expires": time.time() + ttl
        }
        
        # Recreate response with new body
        from fastapi import Response
        new_response = Response(
            content=response_body,
            status_code=response.status_code,
            headers=response.headers
        )
        return new_response

class OptimizedRateLimitingMiddleware(BaseHTTPMiddleware):
    """
    Optimized rate limiting with path-specific limits
    """
    
    def __init__(self, app):
        super().__init__(app)
        
        # Rate limits per path pattern (requests per minute)
        self.rate_limits = {
            r"/api/v2/auth/login": 10,
            r"/api/v2/auth/register": 5,
            r"/api/v2/payments/.*": 20,
            r"/api/v2/appointments/.*": 100,
            r"/api/v2/analytics/.*": 50,
            r"/api/v2/public/.*": 200,
            r".*": 60  # Default limit
        }
        
        # Compile patterns
        self.compiled_rate_patterns = {
            re.compile(pattern): limit 
            for pattern, limit in self.rate_limits.items()
        }
        
        # In-memory rate limiting store (Redis in production)
        self.rate_store = defaultdict(list)
        
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start_time = time.time()
        
        try:
            # Get rate limit for path
            rate_limit = self._get_rate_limit(request.url.path)
            
            # Generate client key (IP + user)
            client_key = self._generate_client_key(request)
            
            # Check rate limit
            if not await self._check_rate_limit(client_key, rate_limit):
                from fastapi import HTTPException
                raise HTTPException(status_code=429, detail="Rate limit exceeded")
            
            response = await call_next(request)
            
            # Track performance
            execution_time = (time.time() - start_time) * 1000
            performance_tracker.track_middleware_performance("optimized_rate_limiting", execution_time)
            
            return response
            
        except Exception as e:
            if "Rate limit exceeded" in str(e):
                raise
            logger.error(f"Rate limiting middleware error: {e}")
            return await call_next(request)
    
    def _get_rate_limit(self, path: str) -> int:
        """Get rate limit for path"""
        for pattern, limit in self.compiled_rate_patterns.items():
            if pattern.match(path):
                return limit
        return self.rate_limits[r".*"]
    
    def _generate_client_key(self, request: Request) -> str:
        """Generate client identifier for rate limiting"""
        # Use IP + user ID if authenticated
        client_ip = request.client.host if request.client else "unknown"
        user_id = getattr(request.state, 'user', {}).get('id', 'anonymous')
        return f"{client_ip}:{user_id}"
    
    async def _check_rate_limit(self, client_key: str, rate_limit: int) -> bool:
        """Check if client has exceeded rate limit"""
        now = time.time()
        window_start = now - 60  # 1 minute window
        
        # Clean old entries
        self.rate_store[client_key] = [
            timestamp for timestamp in self.rate_store[client_key] 
            if timestamp > window_start
        ]
        
        # Check if limit exceeded
        if len(self.rate_store[client_key]) >= rate_limit:
            return False
        
        # Add current request
        self.rate_store[client_key].append(now)
        return True

class MiddlewareOrchestrator:
    """
    Orchestrates optimized middleware stack based on request characteristics
    """
    
    def __init__(self, app):
        self.app = app
        self.middleware_router = SmartMiddlewareRouter()
        
        # Initialize middleware instances
        self.middleware_instances = {
            "security": ConsolidatedSecurityMiddleware(app),
            "auth": ConsolidatedAuthMiddleware(app),
            "cache": OptimizedCacheMiddleware(app),
            "rate_limiting": OptimizedRateLimitingMiddleware(app),
        }
        
    def get_middleware_stack(self, path: str) -> List[str]:
        """Get optimized middleware stack for path"""
        return self.middleware_router.get_middleware_for_path(path)
    
    async def process_request(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Process request through optimized middleware stack"""
        start_time = time.time()
        
        # Get required middleware for this path
        required_middleware = self.get_middleware_stack(request.url.path)
        
        # Apply middleware in order
        async def middleware_chain(req: Request) -> Response:
            return await call_next(req)
        
        # Build middleware chain in reverse order
        for middleware_name in reversed(required_middleware):
            if middleware_name in self.middleware_instances:
                middleware_instance = self.middleware_instances[middleware_name]
                prev_chain = middleware_chain
                
                async def create_middleware_wrapper(middleware_inst, prev_fn):
                    async def wrapper(req: Request) -> Response:
                        return await middleware_inst.dispatch(req, prev_fn)
                    return wrapper
                
                middleware_chain = await create_middleware_wrapper(middleware_instance, prev_chain)
        
        # Execute middleware chain
        response = await middleware_chain(request)
        
        # Track overall performance
        total_time = (time.time() - start_time) * 1000
        performance_tracker.track_request_performance(total_time)
        
        # Add performance headers in development
        if os.getenv("ENVIRONMENT") == "development":
            response.headers["X-Processing-Time"] = f"{total_time:.2f}ms"
            response.headers["X-Middleware-Stack"] = ",".join(required_middleware)
        
        return response

# Performance monitoring endpoints
def get_middleware_performance_stats():
    """Get middleware performance statistics"""
    return {
        "middleware_stats": performance_tracker.get_middleware_stats(),
        "overall_stats": performance_tracker.get_overall_stats(),
        "memory_usage": {
            "process_memory": psutil.Process().memory_info().rss / 1024 / 1024,  # MB
            "system_memory": psutil.virtual_memory().percent
        }
    }

def reset_middleware_performance_stats():
    """Reset performance tracking statistics"""
    global performance_tracker
    performance_tracker = MiddlewarePerformanceTracker()
    return {"status": "reset_complete"}