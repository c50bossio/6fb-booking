"""
Cache Middleware for FastAPI
Provides automatic response caching with ETags, conditional requests,
smart cache key generation, and cache invalidation on mutations.
"""

import json
import hashlib
import time
from typing import Dict, List, Set, Optional, Callable, Any
from dataclasses import dataclass
import logging
import re
from urllib.parse import urlencode, parse_qs

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from services.enhanced_cache_service import cache_service, CacheLevel
from config.cache_config import cache_key_manager

logger = logging.getLogger(__name__)


@dataclass
class CacheRule:
    """Cache rule configuration"""
    path_pattern: str
    methods: Set[str]
    ttl: int
    tags: Set[str]
    cache_level: CacheLevel
    etag_enabled: bool = True
    vary_headers: List[str] = None
    cache_key_func: Optional[Callable] = None
    skip_if_authenticated: bool = False
    skip_query_params: Set[str] = None
    
    def __post_init__(self):
        if self.vary_headers is None:
            self.vary_headers = []
        if self.skip_query_params is None:
            self.skip_query_params = set()
        self.path_regex = re.compile(self.path_pattern)
    
    def matches(self, path: str, method: str) -> bool:
        """Check if rule matches request path and method"""
        return method in self.methods and bool(self.path_regex.match(path))


class CacheKeyGenerator:
    """Generates cache keys for HTTP requests"""
    
    @staticmethod
    def generate_key(request: Request, rule: CacheRule) -> str:
        """Generate cache key for request"""
        if rule.cache_key_func:
            return rule.cache_key_func(request)
        
        # Default key generation
        key_parts = []
        
        # Add method and path
        key_parts.append(request.method)
        key_parts.append(request.url.path)
        
        # Add query parameters (excluding sensitive ones)
        if request.url.query:
            query_params = parse_qs(request.url.query)
            # Filter out sensitive or dynamic parameters
            filtered_params = {
                k: v for k, v in query_params.items()
                if k not in rule.skip_query_params and not k.startswith('_')
            }
            if filtered_params:
                # Sort for consistent keys
                sorted_params = sorted(filtered_params.items())
                key_parts.append(urlencode(sorted_params, doseq=True))
        
        # Add vary headers
        for header in rule.vary_headers:
            header_value = request.headers.get(header.lower())
            if header_value:
                key_parts.append(f"{header}:{header_value}")
        
        # Add user context if needed
        if not rule.skip_if_authenticated:
            # Add user ID if authenticated
            user_id = getattr(request.state, 'user_id', None)
            if user_id:
                key_parts.append(f"user:{user_id}")
        
        # Create hash of combined key parts
        key_string = "|".join(key_parts)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    @staticmethod
    def generate_etag(content: bytes) -> str:
        """Generate ETag for response content"""
        return f'"{hashlib.md5(content).hexdigest()}"'


class CacheMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware for automatic response caching"""
    
    def __init__(
        self,
        app: ASGIApp,
        enabled: bool = True,
        default_ttl: int = 3600,
        default_cache_level: CacheLevel = CacheLevel.BOTH,
        max_response_size: int = 1024 * 1024,  # 1MB
        debug: bool = False
    ):
        super().__init__(app)
        self.enabled = enabled
        self.default_ttl = default_ttl
        self.default_cache_level = default_cache_level
        self.max_response_size = max_response_size
        self.debug = debug
        
        # Cache rules
        self.rules: List[CacheRule] = []
        self.key_generator = CacheKeyGenerator()
        
        # Performance counters
        self.hits = 0
        self.misses = 0
        self.bypasses = 0
        self.errors = 0
        
        # Default cache rules
        self._setup_default_rules()
        
        logger.info(f"Cache middleware initialized (enabled={enabled})")
    
    def _setup_default_rules(self):
        """Setup default caching rules"""
        # Cache GET requests to common API endpoints
        self.add_rule(CacheRule(
            path_pattern=r"/api/v1/.*",
            methods={"GET"},
            ttl=300,  # 5 minutes
            tags={"api"},
            cache_level=CacheLevel.BOTH,
            skip_query_params={"timestamp", "nocache", "_t"},
            vary_headers=["Authorization", "Accept-Language"]
        ))
        
        # Cache public endpoints longer
        self.add_rule(CacheRule(
            path_pattern=r"/api/v1/public/.*",
            methods={"GET"},
            ttl=1800,  # 30 minutes
            tags={"public"},
            cache_level=CacheLevel.BOTH,
            skip_if_authenticated=False
        ))
        
        # Cache static data endpoints
        self.add_rule(CacheRule(
            path_pattern=r"/api/v1/(services|pricing|availability)",
            methods={"GET"},
            ttl=3600,  # 1 hour
            tags={"static"},
            cache_level=CacheLevel.BOTH
        ))
        
        # Cache analytics endpoints with shorter TTL
        self.add_rule(CacheRule(
            path_pattern=r"/api/v1/analytics/.*",
            methods={"GET"},
            ttl=600,  # 10 minutes
            tags={"analytics"},
            cache_level=CacheLevel.REDIS,  # Redis only for analytics
            vary_headers=["Authorization"]
        ))
    
    def add_rule(self, rule: CacheRule):
        """Add cache rule"""
        self.rules.append(rule)
        if self.debug:
            logger.debug(f"Added cache rule: {rule.path_pattern} -> {rule.ttl}s")
    
    def remove_rules_by_tag(self, tag: str):
        """Remove cache rules by tag"""
        self.rules = [rule for rule in self.rules if tag not in rule.tags]
    
    async def dispatch(self, request: Request, call_next):
        """Main middleware dispatch method"""
        if not self.enabled:
            return await call_next(request)
        
        start_time = time.time()
        
        try:
            # Find matching cache rule
            cache_rule = self._find_matching_rule(request)
            
            if not cache_rule:
                self.bypasses += 1
                return await call_next(request)
            
            # Check if request should bypass cache
            if self._should_bypass_cache(request, cache_rule):
                self.bypasses += 1
                return await call_next(request)
            
            # Generate cache key
            cache_key = self.key_generator.generate_key(request, cache_rule)
            
            # Check for conditional requests (If-None-Match)
            if_none_match = request.headers.get("if-none-match")
            
            # Try to get cached response
            cached_response = cache_service.get(
                f"response:{cache_key}",
                cache_level=cache_rule.cache_level
            )
            
            if cached_response:
                # Check ETag for conditional requests
                cached_etag = cached_response.get("etag")
                if if_none_match and cached_etag == if_none_match:
                    # Return 304 Not Modified
                    response = Response(status_code=304)
                    response.headers["etag"] = cached_etag
                    self._add_cache_headers(response, cache_rule, hit=True)
                    self.hits += 1
                    return response
                
                # Return cached response
                response = self._create_response_from_cache(cached_response)
                self._add_cache_headers(response, cache_rule, hit=True)
                self.hits += 1
                
                if self.debug:
                    logger.debug(f"Cache HIT: {request.method} {request.url.path} (key: {cache_key})")
                
                return response
            
            # Cache miss - execute request
            self.misses += 1
            response = await call_next(request)
            
            # Cache the response if appropriate
            if self._should_cache_response(response, cache_rule):
                await self._cache_response(response, cache_key, cache_rule)
            
                if self.debug:
                    logger.debug(f"Cache MISS: {request.method} {request.url.path} (key: {cache_key})")
            
            # Add cache headers
            self._add_cache_headers(response, cache_rule, hit=False)
            
            return response
            
        except Exception as e:
            logger.error(f"Cache middleware error: {e}")
            self.errors += 1
            return await call_next(request)
        
        finally:
            # Log performance
            elapsed = time.time() - start_time
            if elapsed > 0.1:  # Log slow requests
                logger.warning(f"Slow cache middleware operation: {elapsed:.3f}s")
    
    def _find_matching_rule(self, request: Request) -> Optional[CacheRule]:
        """Find matching cache rule for request"""
        for rule in self.rules:
            if rule.matches(request.url.path, request.method):
                return rule
        return None
    
    def _should_bypass_cache(self, request: Request, rule: CacheRule) -> bool:
        """Check if request should bypass cache"""
        # Check for cache bypass headers
        if request.headers.get("cache-control") == "no-cache":
            return True
        
        if request.headers.get("pragma") == "no-cache":
            return True
        
        # Check for nocache query parameter
        if "nocache" in request.query_params:
            return True
        
        # Check authentication bypass
        if rule.skip_if_authenticated:
            auth_header = request.headers.get("authorization")
            if auth_header:
                return True
        
        # Check for mutation methods
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            return True
        
        return False
    
    def _should_cache_response(self, response: Response, rule: CacheRule) -> bool:
        """Check if response should be cached"""
        # Only cache successful responses
        if response.status_code not in {200, 301, 302, 304}:
            return False
        
        # Check response size
        if hasattr(response, 'body') and len(response.body) > self.max_response_size:
            return False
        
        # Check cache-control headers
        cache_control = response.headers.get("cache-control", "")
        if "no-cache" in cache_control or "no-store" in cache_control:
            return False
        
        return True
    
    async def _cache_response(self, response: Response, cache_key: str, rule: CacheRule):
        """Cache response data"""
        try:
            # Get response body
            body = b""
            if hasattr(response, 'body'):
                body = response.body
            elif hasattr(response, 'body_iterator'):
                # For streaming responses, we can't cache easily
                return
            
            # Generate ETag
            etag = self.key_generator.generate_etag(body) if rule.etag_enabled else None
            
            # Prepare cached response data
            cached_data = {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "body": body.decode("utf-8", errors="ignore") if isinstance(body, bytes) else str(body),
                "etag": etag,
                "cached_at": time.time()
            }
            
            # Add ETag to headers
            if etag and rule.etag_enabled:
                response.headers["etag"] = etag
            
            # Cache the response
            cache_service.set(
                f"response:{cache_key}",
                cached_data,
                ttl=rule.ttl,
                tags=rule.tags.union({"http_response"}),
                cache_level=rule.cache_level
            )
            
        except Exception as e:
            logger.error(f"Failed to cache response: {e}")
    
    def _create_response_from_cache(self, cached_data: Dict[str, Any]) -> Response:
        """Create response from cached data"""
        # Create response
        if cached_data.get("headers", {}).get("content-type", "").startswith("application/json"):
            try:
                # Try to parse as JSON for JSONResponse
                body_data = json.loads(cached_data["body"])
                response = JSONResponse(
                    content=body_data,
                    status_code=cached_data["status_code"]
                )
            except (json.JSONDecodeError, TypeError):
                # Fallback to regular response
                response = Response(
                    content=cached_data["body"],
                    status_code=cached_data["status_code"]
                )
        else:
            response = Response(
                content=cached_data["body"],
                status_code=cached_data["status_code"]
            )
        
        # Restore headers (excluding problematic ones)
        skip_headers = {"content-length", "transfer-encoding"}
        for key, value in cached_data.get("headers", {}).items():
            if key.lower() not in skip_headers:
                response.headers[key] = value
        
        # Add ETag if present
        if cached_data.get("etag"):
            response.headers["etag"] = cached_data["etag"]
        
        return response
    
    def _add_cache_headers(self, response: Response, rule: CacheRule, hit: bool):
        """Add cache-related headers to response"""
        # Add cache status
        response.headers["x-cache"] = "HIT" if hit else "MISS"
        
        # Add cache-control headers
        if rule.ttl > 0:
            response.headers["cache-control"] = f"max-age={rule.ttl}, public"
        else:
            response.headers["cache-control"] = "no-cache"
        
        # Add vary headers
        if rule.vary_headers:
            response.headers["vary"] = ", ".join(rule.vary_headers)
        
        # Add timestamp
        response.headers["x-cache-timestamp"] = str(int(time.time()))
    
    def invalidate_by_tags(self, tags: Set[str]) -> int:
        """Invalidate cached responses by tags"""
        return cache_service.invalidate_by_tags(tags.union({"http_response"}))
    
    def invalidate_by_pattern(self, pattern: str) -> int:
        """Invalidate cached responses by key pattern"""
        return cache_service.invalidate_by_pattern(f"response:{pattern}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get middleware statistics"""
        total_requests = self.hits + self.misses + self.bypasses
        hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0
        
        return {
            "enabled": self.enabled,
            "total_requests": total_requests,
            "hits": self.hits,
            "misses": self.misses,
            "bypasses": self.bypasses,
            "errors": self.errors,
            "hit_rate_percent": round(hit_rate, 2),
            "cache_rules_count": len(self.rules)
        }
    
    def clear_stats(self):
        """Clear middleware statistics"""
        self.hits = 0
        self.misses = 0
        self.bypasses = 0
        self.errors = 0


# Utility functions for cache invalidation
def invalidate_endpoint_cache(path_pattern: str, methods: Optional[Set[str]] = None):
    """Invalidate cache for specific endpoint pattern"""
    if methods is None:
        methods = {"GET"}
    
    # This is a simplified version - in practice, you'd need access to the middleware instance
    # through dependency injection or global state
    cache_service.invalidate_by_pattern(f"*{path_pattern}*")


def invalidate_user_cache(user_id: int):
    """Invalidate all cached responses for a specific user"""
    cache_service.invalidate_by_pattern(f"*user:{user_id}*")


def invalidate_cache_by_tags(tags: Set[str]):
    """Invalidate cache by tags"""
    cache_service.invalidate_by_tags(tags)


# Cache warming utilities
class CacheWarmer:
    """Utility for warming cache with common requests"""
    
    def __init__(self, cache_middleware: CacheMiddleware):
        self.middleware = cache_middleware
    
    async def warm_common_endpoints(self, base_url: str = "http://localhost:8000"):
        """Warm cache for common endpoints"""
        import httpx
        
        common_endpoints = [
            "/api/v1/public/services",
            "/api/v1/public/pricing",
            "/api/v1/public/availability",
            "/api/v1/analytics/dashboard",
        ]
        
        async with httpx.AsyncClient() as client:
            for endpoint in common_endpoints:
                try:
                    await client.get(f"{base_url}{endpoint}")
                    logger.info(f"Warmed cache for {endpoint}")
                except Exception as e:
                    logger.warning(f"Failed to warm cache for {endpoint}: {e}")


# Export public interface
__all__ = [
    "CacheMiddleware",
    "CacheRule",
    "CacheKeyGenerator",
    "CacheWarmer",
    "invalidate_endpoint_cache",
    "invalidate_user_cache", 
    "invalidate_cache_by_tags"
]