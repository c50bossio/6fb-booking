"""
FastAPI Cache Middleware for BookedBarber V2
Provides automatic request/response caching with intelligent cache management.
"""

import json
import hashlib
import logging
from typing import List, Optional, Callable
from datetime import datetime

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from services.redis_cache import cache_service
from config import settings

logger = logging.getLogger(__name__)

class CacheableRoute:
    """Configuration for cacheable routes"""
    
    def __init__(
        self,
        path_pattern: str,
        methods: List[str] = ["GET"],
        ttl: int = 300,
        cache_key_generator: Optional[Callable] = None,
        cache_condition: Optional[Callable] = None,
        vary_headers: Optional[List[str]] = None,
        invalidation_patterns: Optional[List[str]] = None
    ):
        self.path_pattern = path_pattern
        self.methods = methods
        self.ttl = ttl
        self.cache_key_generator = cache_key_generator
        self.cache_condition = cache_condition
        self.vary_headers = vary_headers or []
        self.invalidation_patterns = invalidation_patterns or []

class SmartCacheMiddleware(BaseHTTPMiddleware):
    """Intelligent caching middleware with automatic cache management"""
    
    def __init__(
        self,
        app: ASGIApp,
        enable_cache: bool = True,
        default_ttl: int = 300,
        cache_prefix: str = "api_cache"
    ):
        super().__init__(app)
        self.enable_cache = enable_cache
        self.default_ttl = default_ttl
        self.cache_prefix = cache_prefix
        
        # Define cacheable routes with specific configurations
        self.cacheable_routes = [
            # User and authentication routes
            CacheableRoute(
                "/api/v1/users/me",
                methods=["GET"],
                ttl=60,  # 1 minute for user data
                vary_headers=["Authorization"]
            ),
            
            # Appointment slots (high-frequency, short TTL)
            CacheableRoute(
                "/api/v1/appointments/slots",
                methods=["GET"],
                ttl=300,  # 5 minutes for availability
                cache_key_generator=self._generate_slots_cache_key,
                invalidation_patterns=["slots", "appointments"]
            ),
            
            # Business analytics (expensive queries, longer TTL)
            CacheableRoute(
                "/api/v1/analytics/",
                methods=["GET"],
                ttl=1800,  # 30 minutes for analytics
                cache_condition=self._should_cache_analytics,
                vary_headers=["Authorization"]
            ),
            
            # Service listings (rarely changes)
            CacheableRoute(
                "/api/v1/services",
                methods=["GET"],
                ttl=3600,  # 1 hour for services
                invalidation_patterns=["services"]
            ),
            
            # Location data (rarely changes)
            CacheableRoute(
                "/api/v1/locations",
                methods=["GET"],
                ttl=3600,  # 1 hour for locations
                invalidation_patterns=["locations"]
            ),
            
            # Reviews (moderate frequency)
            CacheableRoute(
                "/api/v1/reviews",
                methods=["GET"],
                ttl=600,  # 10 minutes for reviews
                invalidation_patterns=["reviews"]
            ),
            
            # Health checks (very short TTL)
            CacheableRoute(
                "/api/v2/health",
                methods=["GET"],
                ttl=30,  # 30 seconds for health
                cache_condition=lambda req: True  # Always cache health checks
            ),
        ]
        
        # Routes that invalidate cache when modified
        self.cache_invalidating_routes = {
            "/api/v1/appointments": ["appointments", "slots"],
            "/api/v1/services": ["services"],
            "/api/v1/locations": ["locations"],
            "/api/v1/reviews": ["reviews"],
            "/api/v1/users": ["users"],
        }
        
        # Headers to exclude from caching
        self.exclude_headers = {
            "authorization", "cookie", "set-cookie", "x-request-id", 
            "x-correlation-id", "date", "server"
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Main middleware dispatch method"""
        
        if not self.enable_cache:
            return await call_next(request)
        
        # Check if this route is cacheable
        cache_config = self._get_cache_config(request)
        
        if cache_config and request.method in cache_config.methods:
            return await self._handle_cacheable_request(request, call_next, cache_config)
        
        # Handle cache invalidation for non-cacheable routes
        if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            response = await call_next(request)
            await self._handle_cache_invalidation(request, response)
            return response
        
        # Non-cacheable request
        return await call_next(request)
    
    def _get_cache_config(self, request: Request) -> Optional[CacheableRoute]:
        """Get cache configuration for the request path"""
        for config in self.cacheable_routes:
            if self._path_matches(request.url.path, config.path_pattern):
                return config
        return None
    
    def _path_matches(self, path: str, pattern: str) -> bool:
        """Check if path matches pattern (simple prefix matching)"""
        return path.startswith(pattern.rstrip("/"))
    
    async def _handle_cacheable_request(
        self, 
        request: Request, 
        call_next: Callable, 
        config: CacheableRoute
    ) -> Response:
        """Handle a cacheable request"""
        
        # Check cache condition
        if config.cache_condition and not config.cache_condition(request):
            return await call_next(request)
        
        # Generate cache key
        cache_key = await self._generate_cache_key(request, config)
        
        # Try to get from cache
        cached_response = await cache_service.get(cache_key)
        
        if cached_response:
            logger.debug(f"Cache HIT for {request.url.path}")
            return JSONResponse(
                content=cached_response["content"],
                status_code=cached_response["status_code"],
                headers={
                    **cached_response["headers"],
                    "X-Cache-Status": "HIT",
                    "X-Cache-Key": cache_key[:16] + "..."
                }
            )
        
        # Execute request
        response = await call_next(request)
        
        # Cache response if successful
        if response.status_code < 400:
            await self._cache_response(cache_key, response, config.ttl)
            
            # Add cache headers
            response.headers["X-Cache-Status"] = "MISS"
            response.headers["X-Cache-TTL"] = str(config.ttl)
        
        logger.debug(f"Cache MISS for {request.url.path}")
        return response
    
    async def _generate_cache_key(self, request: Request, config: CacheableRoute) -> str:
        """Generate cache key for request"""
        
        if config.cache_key_generator:
            return config.cache_key_generator(request)
        
        # Default cache key generation
        key_components = [
            self.cache_prefix,
            request.method,
            request.url.path,
            str(sorted(request.query_params.items()))
        ]
        
        # Include specified headers in cache key
        for header_name in config.vary_headers:
            header_value = request.headers.get(header_name, "")
            if header_name.lower() == "authorization" and header_value:
                # Hash authorization for privacy
                header_value = hashlib.md5(header_value.encode()).hexdigest()[:12]
            key_components.append(f"{header_name}:{header_value}")
        
        # Generate hash
        key_string = "|".join(key_components)
        key_hash = hashlib.sha256(key_string.encode()).hexdigest()[:16]
        
        return f"{self.cache_prefix}:request:{key_hash}"
    
    async def _cache_response(self, cache_key: str, response: Response, ttl: int):
        """Cache response data"""
        try:
            # Extract response data
            if hasattr(response, 'body'):
                # For StreamingResponse and other response types
                body = response.body
                if isinstance(body, bytes):
                    content = json.loads(body.decode())
                else:
                    content = body
            else:
                # For JSONResponse
                content = getattr(response, 'content', {})
            
            # Filter headers
            headers = {
                k: v for k, v in response.headers.items()
                if k.lower() not in self.exclude_headers
            }
            
            cache_data = {
                "content": content,
                "status_code": response.status_code,
                "headers": headers,
                "cached_at": datetime.now().isoformat()
            }
            
            await cache_service.set(cache_key, cache_data, ttl)
            
        except Exception as e:
            logger.warning(f"Failed to cache response for key {cache_key}: {e}")
    
    async def _handle_cache_invalidation(self, request: Request, response: Response):
        """Handle cache invalidation after modifying operations"""
        
        if response.status_code >= 400:
            return  # Don't invalidate on errors
        
        # Find invalidation patterns for this route
        for route_pattern, patterns in self.cache_invalidating_routes.items():
            if self._path_matches(request.url.path, route_pattern):
                for pattern in patterns:
                    await cache_service.clear_pattern(f"{self.cache_prefix}:*:{pattern}:*")
                    logger.debug(f"Invalidated cache pattern: {pattern}")
                break
    
    def _generate_slots_cache_key(self, request: Request) -> str:
        """Specialized cache key generator for appointment slots"""
        barber_id = request.query_params.get("barber_id", "all")
        date = request.query_params.get("date", "today")
        location_id = request.query_params.get("location_id", "default")
        
        # Include user context for personalized availability
        user_context = ""
        if auth_header := request.headers.get("authorization"):
            user_context = hashlib.md5(auth_header.encode()).hexdigest()[:8]
        
        return f"{self.cache_prefix}:slots:barber:{barber_id}:date:{date}:loc:{location_id}:user:{user_context}"
    
    def _should_cache_analytics(self, request: Request) -> bool:
        """Determine if analytics request should be cached"""
        # Cache analytics only for date ranges (not real-time data)
        return bool(request.query_params.get("start_date") and request.query_params.get("end_date"))

class CacheControlMiddleware(BaseHTTPMiddleware):
    """Additional middleware for cache control headers"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        
        # Define cache control policies by route pattern
        self.cache_policies = {
            "/api/v2/health": "public, max-age=30",
            "/api/v1/services": "public, max-age=3600",
            "/api/v1/locations": "public, max-age=3600",
            "/api/v1/users/me": "private, max-age=60",
            "/api/v1/appointments/slots": "private, max-age=300",
            "/api/v1/analytics": "private, max-age=1800",
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Add appropriate cache control headers"""
        response = await call_next(request)
        
        # Find matching cache policy
        for path_pattern, policy in self.cache_policies.items():
            if request.url.path.startswith(path_pattern):
                response.headers["Cache-Control"] = policy
                
                # Add ETag for GET requests
                if request.method == "GET" and hasattr(response, 'body'):
                    etag = hashlib.md5(response.body).hexdigest()[:16]
                    response.headers["ETag"] = f'"{etag}"'
                
                break
        else:
            # Default: no cache for unspecified routes
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        
        return response

# Cache warming utility
class CacheWarmer:
    """Utility for warming up cache with commonly accessed data"""
    
    @staticmethod
    async def warm_common_endpoints():
        """Warm up cache for commonly accessed endpoints"""
        try:
            import httpx
            
            base_url = settings.backend_url
            common_endpoints = [
                "/api/v2/health",
                "/api/v1/services",
                "/api/v1/locations",
            ]
            
            async with httpx.AsyncClient() as client:
                for endpoint in common_endpoints:
                    try:
                        response = await client.get(f"{base_url}{endpoint}")
                        if response.status_code == 200:
                            logger.info(f"Warmed cache for {endpoint}")
                    except Exception as e:
                        logger.warning(f"Failed to warm cache for {endpoint}: {e}")
                        
        except Exception as e:
            logger.error(f"Cache warming failed: {e}")

# Export middleware classes
__all__ = ["SmartCacheMiddleware", "CacheControlMiddleware", "CacheWarmer"]