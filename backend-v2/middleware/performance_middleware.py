import gzip
import time
import logging
from typing import Callable, Dict, Any
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
import asyncio
from collections import defaultdict, deque
from datetime import datetime, timedelta
import json
import uuid

logger = logging.getLogger(__name__)

class CompressionMiddleware(BaseHTTPMiddleware):
    """Middleware to compress responses for better performance"""
    
    def __init__(self, app: FastAPI, minimum_size: int = 1024):
        super().__init__(app)
        self.minimum_size = minimum_size
        self.compressible_types = {
            'application/json',
            'text/html',
            'text/css',
            'text/javascript',
            'application/javascript',
            'text/plain',
            'application/xml',
            'text/xml'
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Check if client accepts gzip compression
        accept_encoding = request.headers.get('accept-encoding', '')
        if 'gzip' not in accept_encoding.lower():
            return response
        
        # Check content type
        content_type = response.headers.get('content-type', '').split(';')[0]
        if content_type not in self.compressible_types:
            return response
        
        # Get response body
        body = b''
        async for chunk in response.body_iterator:
            body += chunk
        
        # Only compress if body is large enough
        if len(body) < self.minimum_size:
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=content_type
            )
        
        # Compress the body
        compressed_body = gzip.compress(body)
        
        # Update headers
        headers = dict(response.headers)
        headers['content-encoding'] = 'gzip'
        headers['content-length'] = str(len(compressed_body))
        
        return Response(
            content=compressed_body,
            status_code=response.status_code,
            headers=headers,
            media_type=content_type
        )

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Advanced rate limiting middleware with different limits per endpoint type"""
    
    def __init__(self, app: FastAPI):
        super().__init__(app)
        self.requests = defaultdict(lambda: deque())
        self.cleanup_interval = 300  # 5 minutes
        self.last_cleanup = time.time()
        
        # Different rate limits based on endpoint patterns
        self.rate_limits = {
            # Authentication endpoints - stricter limits
            '/api/v2/auth/login': {'requests': 5, 'window': 60},
            '/api/v2/auth/register': {'requests': 3, 'window': 60},
            '/api/v2/auth/forgot-password': {'requests': 3, 'window': 300},
            
            # API endpoints - moderate limits
            '/api/v2/appointments': {'requests': 100, 'window': 60},
            '/api/v2/users': {'requests': 50, 'window': 60},
            '/api/v2/calendar': {'requests': 200, 'window': 60},
            
            # Analytics endpoints - higher limits
            '/api/v2/analytics': {'requests': 50, 'window': 60},
            
            # Default limits
            'default': {'requests': 200, 'window': 60}
        }
    
    def _get_client_id(self, request: Request) -> str:
        """Get unique client identifier"""
        # Try to get user ID from request if authenticated
        user_id = getattr(request.state, 'user_id', None)
        if user_id:
            return f"user_{user_id}"
        
        # Fall back to IP address
        forwarded_for = request.headers.get('x-forwarded-for')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        return request.client.host if request.client else 'unknown'
    
    def _get_rate_limit(self, path: str) -> Dict[str, int]:
        """Get rate limit configuration for path"""
        # Check for exact match first
        if path in self.rate_limits:
            return self.rate_limits[path]
        
        # Check for pattern matches
        for pattern, config in self.rate_limits.items():
            if pattern != 'default' and pattern in path:
                return config
        
        return self.rate_limits['default']
    
    def _cleanup_old_requests(self):
        """Remove old request records to prevent memory leaks"""
        if time.time() - self.last_cleanup < self.cleanup_interval:
            return
        
        current_time = time.time()
        for client_id in list(self.requests.keys()):
            # Remove requests older than 1 hour
            client_requests = self.requests[client_id]
            while client_requests and current_time - client_requests[0] > 3600:
                client_requests.popleft()
            
            # Remove empty entries
            if not client_requests:
                del self.requests[client_id]
        
        self.last_cleanup = current_time
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for health checks and static files
        if request.url.path in ['/health', '/metrics'] or request.url.path.startswith('/static'):
            return await call_next(request)
        
        client_id = self._get_client_id(request)
        path = request.url.path
        rate_limit = self._get_rate_limit(path)
        
        current_time = time.time()
        window_start = current_time - rate_limit['window']
        
        # Clean up old requests periodically
        self._cleanup_old_requests()
        
        # Get client's recent requests
        client_requests = self.requests[client_id]
        
        # Remove requests outside the current window
        while client_requests and client_requests[0] < window_start:
            client_requests.popleft()
        
        # Check if rate limit exceeded
        if len(client_requests) >= rate_limit['requests']:
            logger.warning(f"Rate limit exceeded for {client_id} on {path}")
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "retry_after": rate_limit['window'],
                    "limit": rate_limit['requests']
                },
                headers={
                    "Retry-After": str(rate_limit['window']),
                    "X-RateLimit-Limit": str(rate_limit['requests']),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(current_time + rate_limit['window']))
                }
            )
        
        # Record this request
        client_requests.append(current_time)
        
        # Process the request
        response = await call_next(request)
        
        # Add rate limit headers to response
        remaining = rate_limit['requests'] - len(client_requests)
        response.headers["X-RateLimit-Limit"] = str(rate_limit['requests'])
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(window_start + rate_limit['window']))
        
        return response

class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware to monitor API performance and log slow requests"""
    
    def __init__(self, app: FastAPI, slow_request_threshold: float = 2.0):
        super().__init__(app)
        self.slow_request_threshold = slow_request_threshold
        self.request_metrics = defaultdict(list)
        self.max_metrics_per_endpoint = 100
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate request ID for tracing
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id
        
        start_time = time.time()
        
        # Log request start
        logger.info(f"[{request_id}] {request.method} {request.url.path} - Start")
        
        try:
            response = await call_next(request)
            
            # Calculate response time
            response_time = time.time() - start_time
            
            # Log slow requests
            if response_time > self.slow_request_threshold:
                logger.warning(
                    f"[{request_id}] Slow request: {request.method} {request.url.path} "
                    f"- {response_time:.2f}s (Status: {response.status_code})"
                )
            
            # Store metrics
            endpoint = f"{request.method} {request.url.path}"
            metrics = self.request_metrics[endpoint]
            metrics.append({
                'timestamp': datetime.now(),
                'response_time': response_time,
                'status_code': response.status_code,
                'request_id': request_id
            })
            
            # Keep only recent metrics
            if len(metrics) > self.max_metrics_per_endpoint:
                metrics.pop(0)
            
            # Add performance headers
            response.headers["X-Response-Time"] = f"{response_time:.3f}s"
            response.headers["X-Request-ID"] = request_id
            
            logger.info(
                f"[{request_id}] {request.method} {request.url.path} "
                f"- {response_time:.3f}s (Status: {response.status_code})"
            )
            
            return response
            
        except Exception as e:
            response_time = time.time() - start_time
            logger.error(
                f"[{request_id}] Error in {request.method} {request.url.path} "
                f"- {response_time:.3f}s: {str(e)}"
            )
            raise
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get performance metrics for all endpoints"""
        metrics_summary = {}
        
        for endpoint, requests in self.request_metrics.items():
            if not requests:
                continue
            
            response_times = [r['response_time'] for r in requests]
            status_codes = [r['status_code'] for r in requests]
            
            metrics_summary[endpoint] = {
                'total_requests': len(requests),
                'avg_response_time': sum(response_times) / len(response_times),
                'max_response_time': max(response_times),
                'min_response_time': min(response_times),
                'error_rate': len([s for s in status_codes if s >= 400]) / len(status_codes),
                'recent_requests': requests[-10:]  # Last 10 requests
            }
        
        return metrics_summary

class CacheControlMiddleware(BaseHTTPMiddleware):
    """Middleware to add appropriate cache control headers"""
    
    def __init__(self, app: FastAPI):
        super().__init__(app)
        self.cache_policies = {
            # Static assets - long cache
            '/static': 'public, max-age=31536000, immutable',
            '/favicon.ico': 'public, max-age=86400',
            
            # API endpoints - no cache for most
            '/api/v2/auth': 'no-cache, no-store, must-revalidate',
            '/api/v2/appointments': 'no-cache, must-revalidate',
            '/api/v2/calendar': 'private, max-age=300',  # 5 minutes
            '/api/v2/analytics': 'private, max-age=600',  # 10 minutes
            
            # Public pages - moderate cache
            '/': 'public, max-age=3600',
            '/book': 'public, max-age=1800',
        }
    
    def _get_cache_policy(self, path: str) -> str:
        """Get cache policy for path"""
        for pattern, policy in self.cache_policies.items():
            if path.startswith(pattern):
                return policy
        
        # Default: no cache for dynamic content
        return 'no-cache, must-revalidate'
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Only add cache headers if not already present
        if 'cache-control' not in response.headers:
            cache_policy = self._get_cache_policy(request.url.path)
            response.headers['cache-control'] = cache_policy
        
        return response

def setup_performance_middleware(app: FastAPI):
    """Set up all performance middleware in the correct order"""
    
    # Order matters - these should be applied in reverse order of execution
    app.add_middleware(CacheControlMiddleware)
    app.add_middleware(PerformanceMonitoringMiddleware, slow_request_threshold=2.0)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(CompressionMiddleware, minimum_size=1024)
    
    logger.info("Performance middleware configured successfully")
    
    return app

# Global performance monitoring instance (for accessing metrics)
performance_monitor = PerformanceMonitoringMiddleware(None)

def get_performance_metrics() -> Dict[str, Any]:
    """Get current performance metrics"""
    return performance_monitor.get_metrics()