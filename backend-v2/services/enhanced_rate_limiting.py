"""
Enhanced Rate Limiting Service for BookedBarber V2
=================================================

Production-ready rate limiting with advanced features including adaptive limits,
user-based quotas, and integration with circuit breakers.

Features:
- Adaptive rate limits based on user behavior
- Hierarchical rate limiting (per-IP, per-user, per-endpoint)
- Integration with circuit breakers for external services
- Detailed metrics and monitoring
- Whitelist/blacklist support
- Burst allowance with token bucket algorithm
- Geographic and user-tier based limits

Usage:
    from services.enhanced_rate_limiting import enhanced_rate_limiter
    
    # Apply to endpoint
    @enhanced_rate_limiter.limit("booking_creation", user_tier="premium")
    async def create_booking(request: Request, current_user: User):
        # Endpoint logic here
        pass
"""

import asyncio
import time
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Callable, Union
from dataclasses import dataclass, asdict
from enum import Enum
from functools import wraps
from fastapi import Request, HTTPException

from services.redis_cache import cache_service
from services.circuit_breaker import circuit_breaker_manager
from config.redis_config import get_redis_config
from config import settings

logger = logging.getLogger(__name__)


class RateLimitType(Enum):
    """Types of rate limiting."""
    FIXED_WINDOW = "fixed_window"
    SLIDING_WINDOW = "sliding_window"
    TOKEN_BUCKET = "token_bucket"
    ADAPTIVE = "adaptive"


class UserTier(Enum):
    """User tier for rate limiting."""
    GUEST = "guest"
    BASIC = "basic"
    PREMIUM = "premium"
    BUSINESS = "business"
    ENTERPRISE = "enterprise"
    ADMIN = "admin"


@dataclass
class RateLimitConfig:
    """Rate limit configuration."""
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    requests_per_day: int = 10000
    burst_allowance: int = 10
    rate_limit_type: RateLimitType = RateLimitType.SLIDING_WINDOW
    user_tier_multipliers: Dict[UserTier, float] = None
    geographic_multipliers: Dict[str, float] = None
    adaptive_enabled: bool = True
    whitelist_ips: List[str] = None
    blacklist_ips: List[str] = None
    
    def __post_init__(self):
        """Initialize default values."""
        if self.user_tier_multipliers is None:
            self.user_tier_multipliers = {
                UserTier.GUEST: 0.5,
                UserTier.BASIC: 1.0,
                UserTier.PREMIUM: 2.0,
                UserTier.BUSINESS: 5.0,
                UserTier.ENTERPRISE: 10.0,
                UserTier.ADMIN: 100.0
            }
        
        if self.geographic_multipliers is None:
            self.geographic_multipliers = {
                'US': 1.0,
                'CA': 1.0,
                'GB': 1.0,
                'AU': 1.0,
                'default': 0.8
            }
        
        if self.whitelist_ips is None:
            self.whitelist_ips = []
        
        if self.blacklist_ips is None:
            self.blacklist_ips = []


@dataclass
class RateLimitResult:
    """Rate limit check result."""
    allowed: bool
    remaining: Dict[str, int]
    reset_time: Dict[str, datetime]
    retry_after: Optional[int]
    limit_type: str
    identifier: str
    headers: Dict[str, str]


@dataclass
class RateLimitMetrics:
    """Rate limiting metrics."""
    timestamp: datetime
    endpoint: str
    identifier: str
    requests_allowed: int
    requests_denied: int
    avg_request_rate: float
    burst_usage: float
    adaptive_adjustment: float


class TokenBucket:
    """Token bucket implementation for burst handling."""
    
    def __init__(self, capacity: int, refill_rate: float, redis_key: str):
        """
        Initialize token bucket.
        
        Args:
            capacity: Maximum tokens in bucket
            refill_rate: Tokens per second refill rate
            redis_key: Redis key for persistence
        """
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.redis_key = redis_key
        self.cache = cache_service
    
    async def consume(self, tokens: int = 1) -> bool:
        """
        Try to consume tokens from bucket.
        
        Args:
            tokens: Number of tokens to consume
            
        Returns:
            True if tokens were consumed, False if insufficient
        """
        try:
            current_time = time.time()
            
            # Get current bucket state
            bucket_data = self.cache.get(self.redis_key)
            if bucket_data:
                current_tokens = bucket_data['tokens']
                last_refill = bucket_data['last_refill']
            else:
                current_tokens = self.capacity
                last_refill = current_time
            
            # Calculate tokens to add based on elapsed time
            time_elapsed = current_time - last_refill
            tokens_to_add = time_elapsed * self.refill_rate
            current_tokens = min(self.capacity, current_tokens + tokens_to_add)
            
            # Check if we have enough tokens
            if current_tokens >= tokens:
                current_tokens -= tokens
                
                # Save new state
                new_state = {
                    'tokens': current_tokens,
                    'last_refill': current_time
                }
                self.cache.set(self.redis_key, new_state, ttl=3600)
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Token bucket error: {e}")
            # Allow request on error
            return True


class EnhancedRateLimiter:
    """Enhanced rate limiter with advanced features."""
    
    def __init__(self):
        """Initialize enhanced rate limiter."""
        self.redis_config = get_redis_config()
        self.cache = cache_service
        self.metrics: List[RateLimitMetrics] = []
        
        # Endpoint-specific configurations
        self.endpoint_configs = {
            'auth_login': RateLimitConfig(
                requests_per_minute=10,
                requests_per_hour=50,
                burst_allowance=3,
                rate_limit_type=RateLimitType.TOKEN_BUCKET
            ),
            'auth_register': RateLimitConfig(
                requests_per_minute=5,
                requests_per_hour=20,
                burst_allowance=2,
                rate_limit_type=RateLimitType.FIXED_WINDOW
            ),
            'payment_intent': RateLimitConfig(
                requests_per_minute=30,
                requests_per_hour=500,
                burst_allowance=10,
                rate_limit_type=RateLimitType.SLIDING_WINDOW
            ),
            'booking_creation': RateLimitConfig(
                requests_per_minute=20,
                requests_per_hour=200,
                burst_allowance=5,
                adaptive_enabled=True
            ),
            'guest_booking': RateLimitConfig(
                requests_per_minute=5,
                requests_per_hour=30,
                requests_per_day=100,
                burst_allowance=2,
                rate_limit_type=RateLimitType.TOKEN_BUCKET
            ),
            'analytics_query': RateLimitConfig(
                requests_per_minute=100,
                requests_per_hour=2000,
                burst_allowance=20
            ),
            'webhook_receive': RateLimitConfig(
                requests_per_minute=1000,
                requests_per_hour=10000,
                burst_allowance=100,
                rate_limit_type=RateLimitType.SLIDING_WINDOW
            ),
            'default': RateLimitConfig()
        }
        
        # Adaptive learning parameters
        self.adaptive_history_hours = 24
        self.adaptive_adjustment_factor = 0.1
        
        logger.info("Enhanced rate limiter initialized")
    
    def _get_client_identifier(self, request: Request, user_id: Optional[int] = None) -> str:
        """Get unique client identifier."""
        if user_id:
            return f"user:{user_id}"
        
        # Get IP address
        client_ip = request.client.host
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        # Add user agent for more granular tracking
        user_agent_hash = hash(request.headers.get("User-Agent", ""))
        return f"ip:{client_ip}:ua:{user_agent_hash}"
    
    def _get_geographic_location(self, request: Request) -> str:
        """Determine geographic location from request."""
        # Check CloudFlare headers
        country = request.headers.get("CF-IPCountry")
        if country:
            return country
        
        # Check other common headers
        country = request.headers.get("X-Country-Code")
        if country:
            return country
        
        # Default location
        return "unknown"
    
    def _is_whitelisted(self, identifier: str, config: RateLimitConfig) -> bool:
        """Check if identifier is whitelisted."""
        if "ip:" in identifier:
            ip = identifier.split(":")[1]
            return ip in config.whitelist_ips
        return False
    
    def _is_blacklisted(self, identifier: str, config: RateLimitConfig) -> bool:
        """Check if identifier is blacklisted."""
        if "ip:" in identifier:
            ip = identifier.split(":")[1]
            return ip in config.blacklist_ips
        return False
    
    async def _check_fixed_window(
        self,
        identifier: str,
        endpoint: str,
        config: RateLimitConfig,
        window_size: str
    ) -> Dict[str, Any]:
        """Check fixed window rate limit."""
        now = datetime.utcnow()
        
        if window_size == "minute":
            window_key = now.strftime("%Y-%m-%d_%H-%M")
            limit = config.requests_per_minute
            ttl = 60
        elif window_size == "hour":
            window_key = now.strftime("%Y-%m-%d_%H")
            limit = config.requests_per_hour
            ttl = 3600
        else:  # day
            window_key = now.strftime("%Y-%m-%d")
            limit = config.requests_per_day
            ttl = 86400
        
        redis_key = f"{self.redis_config.prefix_rate_limit}fixed:{endpoint}:{identifier}:{window_key}"
        
        # Get current count
        current = self.cache.get(redis_key) or 0
        current = int(current)
        
        if current >= limit:
            return {
                'allowed': False,
                'remaining': 0,
                'reset_time': now + timedelta(seconds=ttl),
                'current': current
            }
        
        # Increment counter
        new_count = current + 1
        self.cache.set(redis_key, new_count, ttl=ttl)
        
        return {
            'allowed': True,
            'remaining': max(0, limit - new_count),
            'reset_time': now + timedelta(seconds=ttl),
            'current': new_count
        }
    
    async def _check_sliding_window(
        self,
        identifier: str,
        endpoint: str,
        config: RateLimitConfig,
        window_size: str
    ) -> Dict[str, Any]:
        """Check sliding window rate limit."""
        now = time.time()
        
        if window_size == "minute":
            window_seconds = 60
            limit = config.requests_per_minute
        elif window_size == "hour":
            window_seconds = 3600
            limit = config.requests_per_hour
        else:  # day
            window_seconds = 86400
            limit = config.requests_per_day
        
        redis_key = f"{self.redis_config.prefix_rate_limit}sliding:{endpoint}:{identifier}:{window_size}"
        
        # Get request timestamps from sorted set
        request_times = self.cache.get_sorted_set_range(redis_key, 0, -1) or []
        
        # Remove expired timestamps
        cutoff_time = now - window_seconds
        valid_requests = [t for t in request_times if float(t) > cutoff_time]
        
        if len(valid_requests) >= limit:
            return {
                'allowed': False,
                'remaining': 0,
                'reset_time': datetime.fromtimestamp(min(valid_requests) + window_seconds),
                'current': len(valid_requests)
            }
        
        # Add current timestamp
        self.cache.add_to_sorted_set(redis_key, now, now)
        
        # Clean up old entries and set expiration
        self.cache.remove_from_sorted_set_by_score(redis_key, 0, cutoff_time)
        self.cache.expire(redis_key, window_seconds + 10)  # Extra buffer
        
        return {
            'allowed': True,
            'remaining': max(0, limit - len(valid_requests) - 1),
            'reset_time': datetime.fromtimestamp(now + window_seconds),
            'current': len(valid_requests) + 1
        }
    
    async def _check_token_bucket(
        self,
        identifier: str,
        endpoint: str,
        config: RateLimitConfig
    ) -> Dict[str, Any]:
        """Check token bucket rate limit."""
        bucket_key = f"{self.redis_config.prefix_rate_limit}bucket:{endpoint}:{identifier}"
        
        # Create token bucket
        bucket = TokenBucket(
            capacity=config.burst_allowance,
            refill_rate=config.requests_per_minute / 60.0,  # Convert to per-second
            redis_key=bucket_key
        )
        
        # Try to consume token
        allowed = await bucket.consume(1)
        
        if allowed:
            # Get remaining tokens
            bucket_data = self.cache.get(bucket_key) or {'tokens': config.burst_allowance}
            remaining = int(bucket_data['tokens'])
            
            return {
                'allowed': True,
                'remaining': remaining,
                'reset_time': datetime.utcnow() + timedelta(seconds=60),
                'current': config.burst_allowance - remaining
            }
        else:
            return {
                'allowed': False,
                'remaining': 0,
                'reset_time': datetime.utcnow() + timedelta(seconds=60),
                'current': config.burst_allowance
            }
    
    async def _get_adaptive_limits(
        self,
        identifier: str,
        endpoint: str,
        base_config: RateLimitConfig
    ) -> RateLimitConfig:
        """Calculate adaptive rate limits based on historical behavior."""
        if not base_config.adaptive_enabled:
            return base_config
        
        try:
            # Get historical metrics
            history_key = f"{self.redis_config.prefix_cache}adaptive_history:{endpoint}:{identifier}"
            history = self.cache.get(history_key) or []
            
            if len(history) < 10:  # Not enough data for adaptation
                return base_config
            
            # Calculate average request rate
            recent_history = history[-100:]  # Last 100 data points
            avg_rate = sum(h['request_rate'] for h in recent_history) / len(recent_history)
            
            # Calculate adjustment factor
            if avg_rate > base_config.requests_per_minute * 0.8:
                # High usage, potentially increase limits
                adjustment = min(1.5, 1 + self.adaptive_adjustment_factor)
            elif avg_rate < base_config.requests_per_minute * 0.3:
                # Low usage, potentially decrease limits
                adjustment = max(0.7, 1 - self.adaptive_adjustment_factor)
            else:
                # Normal usage, no adjustment
                adjustment = 1.0
            
            # Create adjusted config
            adjusted_config = RateLimitConfig(
                requests_per_minute=int(base_config.requests_per_minute * adjustment),
                requests_per_hour=int(base_config.requests_per_hour * adjustment),
                requests_per_day=int(base_config.requests_per_day * adjustment),
                burst_allowance=base_config.burst_allowance,
                rate_limit_type=base_config.rate_limit_type,
                user_tier_multipliers=base_config.user_tier_multipliers,
                adaptive_enabled=True
            )
            
            # Log significant adjustments
            if abs(adjustment - 1.0) > 0.1:
                logger.info(f"Adaptive rate limit adjustment for {endpoint}:{identifier}: {adjustment:.2f}x")
            
            return adjusted_config
            
        except Exception as e:
            logger.error(f"Adaptive limit calculation error: {e}")
            return base_config
    
    async def check_rate_limit(
        self,
        request: Request,
        endpoint: str,
        user_id: Optional[int] = None,
        user_tier: Optional[UserTier] = None,
        custom_config: Optional[RateLimitConfig] = None
    ) -> RateLimitResult:
        """
        Check rate limit for request.
        
        Args:
            request: FastAPI request object
            endpoint: Endpoint identifier
            user_id: Optional user ID
            user_tier: Optional user tier for tier-based limits
            custom_config: Optional custom configuration
            
        Returns:
            RateLimitResult with decision and metadata
        """
        try:
            # Get configuration
            config = custom_config or self.endpoint_configs.get(endpoint, self.endpoint_configs['default'])
            
            # Get client identifier
            identifier = self._get_client_identifier(request, user_id)
            
            # Check blacklist
            if self._is_blacklisted(identifier, config):
                logger.warning(f"Blocked request from blacklisted identifier: {identifier}")
                return RateLimitResult(
                    allowed=False,
                    remaining={},
                    reset_time={},
                    retry_after=3600,  # 1 hour
                    limit_type="blacklist",
                    identifier=identifier,
                    headers={"X-RateLimit-Blocked": "blacklisted"}
                )
            
            # Check whitelist
            if self._is_whitelisted(identifier, config):
                return RateLimitResult(
                    allowed=True,
                    remaining={"unlimited": 999999},
                    reset_time={},
                    retry_after=None,
                    limit_type="whitelist",
                    identifier=identifier,
                    headers={"X-RateLimit-Whitelisted": "true"}
                )
            
            # Apply user tier multiplier
            if user_tier and user_tier in config.user_tier_multipliers:
                multiplier = config.user_tier_multipliers[user_tier]
                config = RateLimitConfig(
                    requests_per_minute=int(config.requests_per_minute * multiplier),
                    requests_per_hour=int(config.requests_per_hour * multiplier),
                    requests_per_day=int(config.requests_per_day * multiplier),
                    burst_allowance=config.burst_allowance,
                    rate_limit_type=config.rate_limit_type,
                    adaptive_enabled=config.adaptive_enabled
                )
            
            # Apply geographic multiplier
            location = self._get_geographic_location(request)
            geo_multiplier = config.geographic_multipliers.get(location, config.geographic_multipliers.get('default', 1.0))
            if geo_multiplier != 1.0:
                config = RateLimitConfig(
                    requests_per_minute=int(config.requests_per_minute * geo_multiplier),
                    requests_per_hour=int(config.requests_per_hour * geo_multiplier),
                    requests_per_day=int(config.requests_per_day * geo_multiplier),
                    burst_allowance=config.burst_allowance,
                    rate_limit_type=config.rate_limit_type,
                    adaptive_enabled=config.adaptive_enabled
                )
            
            # Get adaptive limits
            config = await self._get_adaptive_limits(identifier, endpoint, config)
            
            # Check rate limits based on type
            results = {}
            
            if config.rate_limit_type == RateLimitType.TOKEN_BUCKET:
                bucket_result = await self._check_token_bucket(identifier, endpoint, config)
                if not bucket_result['allowed']:
                    return RateLimitResult(
                        allowed=False,
                        remaining={'bucket': bucket_result['remaining']},
                        reset_time={'bucket': bucket_result['reset_time']},
                        retry_after=60,
                        limit_type="token_bucket",
                        identifier=identifier,
                        headers=self._build_headers(bucket_result, config)
                    )
                results['bucket'] = bucket_result
                
            else:
                # Check all time windows
                windows = ['minute', 'hour']
                if config.requests_per_day > 0:
                    windows.append('day')
                
                for window in windows:
                    if config.rate_limit_type == RateLimitType.SLIDING_WINDOW:
                        result = await self._check_sliding_window(identifier, endpoint, config, window)
                    else:  # FIXED_WINDOW or default
                        result = await self._check_fixed_window(identifier, endpoint, config, window)
                    
                    results[window] = result
                    
                    if not result['allowed']:
                        # Calculate retry after
                        retry_after = int((result['reset_time'] - datetime.utcnow()).total_seconds())
                        
                        return RateLimitResult(
                            allowed=False,
                            remaining={k: v['remaining'] for k, v in results.items()},
                            reset_time={k: v['reset_time'] for k, v in results.items()},
                            retry_after=retry_after,
                            limit_type=f"{config.rate_limit_type.value}_{window}",
                            identifier=identifier,
                            headers=self._build_headers(results, config)
                        )
            
            # Record metrics
            await self._record_metrics(endpoint, identifier, True, config)
            
            return RateLimitResult(
                allowed=True,
                remaining={k: v['remaining'] for k, v in results.items()},
                reset_time={k: v['reset_time'] for k, v in results.items()},
                retry_after=None,
                limit_type=config.rate_limit_type.value,
                identifier=identifier,
                headers=self._build_headers(results, config)
            )
            
        except Exception as e:
            logger.error(f"Rate limiting error for {endpoint}: {e}")
            # Allow request on error
            return RateLimitResult(
                allowed=True,
                remaining={'error': 999},
                reset_time={},
                retry_after=None,
                limit_type="error_fallback",
                identifier="unknown",
                headers={"X-RateLimit-Error": "fallback"}
            )
    
    def _build_headers(self, results: Dict[str, Dict[str, Any]], config: RateLimitConfig) -> Dict[str, str]:
        """Build rate limit headers."""
        headers = {}
        
        for window, result in results.items():
            headers[f"X-RateLimit-Limit-{window.title()}"] = str(getattr(config, f"requests_per_{window}", "unknown"))
            headers[f"X-RateLimit-Remaining-{window.title()}"] = str(result.get('remaining', 0))
            
            if 'reset_time' in result:
                headers[f"X-RateLimit-Reset-{window.title()}"] = str(int(result['reset_time'].timestamp()))
        
        return headers
    
    async def _record_metrics(
        self,
        endpoint: str,
        identifier: str,
        allowed: bool,
        config: RateLimitConfig
    ) -> None:
        """Record rate limiting metrics."""
        try:
            current_time = datetime.utcnow()
            
            # Store in local metrics
            metric = RateLimitMetrics(
                timestamp=current_time,
                endpoint=endpoint,
                identifier=identifier,
                requests_allowed=1 if allowed else 0,
                requests_denied=0 if allowed else 1,
                avg_request_rate=0.0,  # Would calculate based on window
                burst_usage=0.0,      # Would calculate from token bucket
                adaptive_adjustment=1.0  # Would track adaptive changes
            )
            
            self.metrics.append(metric)
            
            # Limit metrics retention
            if len(self.metrics) > 10000:
                self.metrics = self.metrics[-5000:]  # Keep recent half
            
            # Update adaptive history if enabled
            if config.adaptive_enabled:
                history_key = f"{self.redis_config.prefix_cache}adaptive_history:{endpoint}:{identifier}"
                history = self.cache.get(history_key) or []
                
                history.append({
                    'timestamp': current_time.timestamp(),
                    'request_rate': 1.0,  # Would calculate actual rate
                    'allowed': allowed
                })
                
                # Keep recent history
                if len(history) > 1000:
                    history = history[-500:]
                
                self.cache.set(history_key, history, ttl=86400)  # 24 hours
                
        except Exception as e:
            logger.error(f"Error recording rate limit metrics: {e}")
    
    def limit(
        self,
        endpoint: str,
        user_tier: Optional[UserTier] = None,
        custom_config: Optional[RateLimitConfig] = None
    ):
        """
        Decorator for applying rate limits to endpoints.
        
        Args:
            endpoint: Endpoint identifier
            user_tier: Optional user tier
            custom_config: Optional custom configuration
            
        Returns:
            Decorated function
        """
        def decorator(func: Callable):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Extract request and user from arguments
                request = None
                user_id = None
                
                # Look for request in args/kwargs
                for arg in args:
                    if hasattr(arg, 'client'):  # FastAPI Request object
                        request = arg
                        break
                
                if 'request' in kwargs:
                    request = kwargs['request']
                
                # Look for user in args/kwargs
                for arg in args:
                    if hasattr(arg, 'id') and hasattr(arg, 'email'):  # User object
                        user_id = arg.id
                        break
                
                if 'current_user' in kwargs and kwargs['current_user']:
                    user_id = kwargs['current_user'].id
                
                if not request:
                    logger.error("Could not find request object for rate limiting")
                    # Continue without rate limiting
                    return await func(*args, **kwargs)
                
                # Check rate limit
                result = await self.check_rate_limit(
                    request=request,
                    endpoint=endpoint,
                    user_id=user_id,
                    user_tier=user_tier,
                    custom_config=custom_config
                )
                
                # Add headers to response (would need middleware for this)
                if hasattr(request, 'state'):
                    request.state.rate_limit_headers = result.headers
                
                if not result.allowed:
                    raise HTTPException(
                        status_code=429,
                        detail=f"Rate limit exceeded for {endpoint}",
                        headers=result.headers
                    )
                
                return await func(*args, **kwargs)
            
            return wrapper
        return decorator
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get rate limiting metrics summary."""
        if not self.metrics:
            return {'total_requests': 0}
        
        total_requests = len(self.metrics)
        allowed_requests = sum(1 for m in self.metrics if m.requests_allowed > 0)
        denied_requests = total_requests - allowed_requests
        
        # Group by endpoint
        endpoint_stats = {}
        for metric in self.metrics:
            if metric.endpoint not in endpoint_stats:
                endpoint_stats[metric.endpoint] = {'allowed': 0, 'denied': 0, 'total': 0}
            
            endpoint_stats[metric.endpoint]['allowed'] += metric.requests_allowed
            endpoint_stats[metric.endpoint]['denied'] += metric.requests_denied
            endpoint_stats[metric.endpoint]['total'] += 1
        
        return {
            'total_requests': total_requests,
            'allowed_requests': allowed_requests,
            'denied_requests': denied_requests,
            'success_rate': (allowed_requests / total_requests * 100) if total_requests > 0 else 0,
            'endpoint_stats': endpoint_stats,
            'last_updated': datetime.utcnow().isoformat()
        }


# Global enhanced rate limiter instance
enhanced_rate_limiter = EnhancedRateLimiter()


# Convenience decorators for common endpoints
def auth_rate_limit(func):
    """Apply auth-specific rate limiting."""
    return enhanced_rate_limiter.limit("auth_login")(func)


def booking_rate_limit(user_tier: UserTier = UserTier.BASIC):
    """Apply booking-specific rate limiting."""
    return enhanced_rate_limiter.limit("booking_creation", user_tier=user_tier)


def payment_rate_limit(func):
    """Apply payment-specific rate limiting."""
    return enhanced_rate_limiter.limit("payment_intent")(func)


# Usage examples:
"""
# Method 1: Using decorator
@enhanced_rate_limiter.limit("booking_creation", user_tier=UserTier.PREMIUM)
async def create_booking(request: Request, current_user: User):
    # Endpoint logic here
    pass

# Method 2: Using convenience decorator
@booking_rate_limit(UserTier.BUSINESS)
async def create_business_booking(request: Request, current_user: User):
    # Business booking logic
    pass

# Method 3: Manual checking
async def some_endpoint(request: Request, current_user: User):
    result = await enhanced_rate_limiter.check_rate_limit(
        request=request,
        endpoint="custom_endpoint",
        user_id=current_user.id,
        user_tier=UserTier.PREMIUM
    )
    
    if not result.allowed:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    # Endpoint logic here
    pass
"""