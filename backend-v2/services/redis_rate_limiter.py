"""
Redis-based rate limiter for production use.
Provides distributed rate limiting across multiple server instances.
"""

from typing import Optional, Dict, Tuple
from datetime import datetime
import logging
from fastapi import Request, HTTPException

from services.redis_service import cache_service
from config.redis_config import get_redis_config

logger = logging.getLogger(__name__)


class RedisRateLimiter:
    """
    Redis-backed rate limiter with multiple window support.
    Supports per-minute, per-hour, and per-day limits.
    """
    
    def __init__(self):
        self.config = get_redis_config()
        self.cache = cache_service
        
    def _get_identifier(self, request: Request, user_id: Optional[int] = None) -> str:
        """Generate unique identifier for rate limiting."""
        if user_id:
            return f"user:{user_id}"
        
        # Use IP address for anonymous users
        client_ip = request.client.host
        # Handle proxied requests
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        return f"ip:{client_ip}"
    
    def _get_window_keys(self, identifier: str) -> Dict[str, Tuple[str, int]]:
        """Get Redis keys and TTLs for different time windows."""
        now = datetime.utcnow()
        
        # Generate keys for different windows
        minute_key = f"{self.config.prefix_rate_limit}minute:{identifier}:{now.strftime('%Y%m%d%H%M')}"
        hour_key = f"{self.config.prefix_rate_limit}hour:{identifier}:{now.strftime('%Y%m%d%H')}"
        day_key = f"{self.config.prefix_rate_limit}day:{identifier}:{now.strftime('%Y%m%d')}"
        
        return {
            'minute': (minute_key, 60),
            'hour': (hour_key, 3600),
            'day': (day_key, 86400),
        }
    
    async def check_rate_limit(
        self,
        request: Request,
        user_id: Optional[int] = None,
        resource: str = "default",
        count: int = 1
    ) -> Dict[str, int]:
        """
        Check if request is within rate limits.
        
        Args:
            request: FastAPI request object
            user_id: Optional user ID for authenticated requests
            resource: Resource being accessed (for resource-specific limits)
            count: Number of requests to count
            
        Returns:
            Dict with remaining requests for each window
            
        Raises:
            HTTPException: If rate limit exceeded
        """
        if not self.config.rate_limit_enabled:
            return {'minute': 999, 'hour': 999, 'day': 999}
        
        if not self.cache.is_available():
            # Fallback to allowing requests if Redis is down
            logger.warning("Redis unavailable, skipping rate limiting")
            return {'minute': 999, 'hour': 999, 'day': 999}
        
        identifier = self._get_identifier(request, user_id)
        window_keys = self._get_window_keys(identifier)
        
        # Get limits for resource
        limits = self._get_resource_limits(resource, user_id is not None)
        
        remaining = {}
        
        try:
            # Check each window
            for window, (key, ttl) in window_keys.items():
                limit = limits[window]
                
                # Increment counter
                current = self.cache.increment(key, count, ttl) or 0
                
                if current > limit:
                    # Rate limit exceeded
                    retry_after = ttl
                    raise HTTPException(
                        status_code=429,
                        detail=f"Rate limit exceeded. Maximum {limit} requests per {window}.",
                        headers={
                            "Retry-After": str(retry_after),
                            "X-RateLimit-Limit": str(limit),
                            "X-RateLimit-Remaining": "0",
                            "X-RateLimit-Reset": str(int(datetime.utcnow().timestamp()) + retry_after)
                        }
                    )
                
                remaining[window] = max(0, limit - current)
            
            # Add rate limit headers to response
            request.state.rate_limit_headers = {
                "X-RateLimit-Limit-Minute": str(limits['minute']),
                "X-RateLimit-Remaining-Minute": str(remaining['minute']),
                "X-RateLimit-Limit-Hour": str(limits['hour']),
                "X-RateLimit-Remaining-Hour": str(remaining['hour']),
            }
            
            return remaining
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            # Allow request on error
            return {'minute': 999, 'hour': 999, 'day': 999}
    
    def _get_resource_limits(self, resource: str, authenticated: bool) -> Dict[str, int]:
        """Get rate limits for specific resource."""
        # Higher limits for authenticated users
        multiplier = 2 if authenticated else 1
        
        # Resource-specific limits
        resource_limits = {
            'auth': {
                'minute': 5,  # Strict limit for auth endpoints
                'hour': 20,
                'day': 100,
            },
            'booking': {
                'minute': 20 * multiplier,
                'hour': 200 * multiplier,
                'day': 1000 * multiplier,
            },
            'analytics': {
                'minute': 30 * multiplier,
                'hour': 500 * multiplier,
                'day': 5000 * multiplier,
            },
            'tracking': {
                'minute': 100 * multiplier,  # High limit for pixel tracking
                'hour': 2000 * multiplier,
                'day': 20000 * multiplier,
            },
            'api': {
                'minute': 60 * multiplier,
                'hour': 1000 * multiplier,
                'day': 10000 * multiplier,
            },
            'default': {
                'minute': self.config.rate_limit_per_minute * multiplier,
                'hour': self.config.rate_limit_per_hour * multiplier,
                'day': self.config.rate_limit_per_day * multiplier,
            }
        }
        
        return resource_limits.get(resource, resource_limits['default'])
    
    async def reset_limits(self, identifier: str) -> bool:
        """Reset rate limits for an identifier (admin function)."""
        try:
            pattern = f"{self.config.prefix_rate_limit}*:{identifier}:*"
            deleted = self.cache.delete_pattern(pattern)
            logger.info(f"Reset {deleted} rate limit keys for {identifier}")
            return deleted > 0
        except Exception as e:
            logger.error(f"Failed to reset rate limits: {e}")
            return False
    
    async def get_current_usage(self, request: Request, user_id: Optional[int] = None) -> Dict[str, Dict[str, int]]:
        """Get current usage statistics for an identifier."""
        if not self.cache.is_available():
            return {}
        
        identifier = self._get_identifier(request, user_id)
        window_keys = self._get_window_keys(identifier)
        
        usage = {}
        
        try:
            for window, (key, _) in window_keys.items():
                value = self.cache.get(key)
                current = int(value) if value else 0
                limit = self._get_resource_limits('default', user_id is not None)[window]
                
                usage[window] = {
                    'current': current,
                    'limit': limit,
                    'remaining': max(0, limit - current),
                    'percentage': round((current / limit) * 100, 2) if limit > 0 else 0
                }
            
            return usage
        except Exception as e:
            logger.error(f"Failed to get usage statistics: {e}")
            return {}


class EndpointRateLimiter:
    """
    Decorator for applying rate limits to specific endpoints.
    """
    
    def __init__(self, resource: str = "default", multiplier: float = 1.0):
        self.resource = resource
        self.multiplier = multiplier
        self.rate_limiter = RedisRateLimiter()
    
    async def __call__(self, request: Request, user_id: Optional[int] = None):
        """Apply rate limiting to the endpoint."""
        count = int(1 * self.multiplier)
        await self.rate_limiter.check_rate_limit(
            request=request,
            user_id=user_id,
            resource=self.resource,
            count=count
        )


# Convenience decorators for common resources
auth_rate_limit = EndpointRateLimiter(resource="auth")
booking_rate_limit = EndpointRateLimiter(resource="booking")
analytics_rate_limit = EndpointRateLimiter(resource="analytics")
tracking_rate_limit = EndpointRateLimiter(resource="tracking")
api_rate_limit = EndpointRateLimiter(resource="api")


# Usage examples:
"""
from fastapi import Depends
from services.redis_rate_limiter import booking_rate_limit, auth_rate_limit

@router.post("/bookings")
async def create_booking(
    request: Request,
    _: None = Depends(booking_rate_limit),
    current_user: User = Depends(get_current_user)
):
    # Endpoint logic here
    pass

@router.post("/auth/login")
async def login(
    request: Request,
    _: None = Depends(auth_rate_limit)
):
    # Login logic here
    pass
"""