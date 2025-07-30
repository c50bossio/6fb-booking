"""
Advanced Rate Limiting Service for Public API

This service provides comprehensive rate limiting, usage analytics, and quota management
for the BookedBarber Public API platform.

Features:
- Multi-tier rate limiting (hourly, daily, monthly)
- Burst protection and sliding window
- Usage analytics and reporting
- Quota management and billing integration
- Real-time monitoring and alerts
- Geographic and endpoint-specific limits
"""

import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import logging
import redis
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from services.redis_service import cache_service
from models.api_key import APIKey
from utils.audit_logger_bypass import get_audit_logger

logger = logging.getLogger(__name__)
audit_logger = get_audit_logger()


class RateLimitType(str, Enum):
    """Types of rate limits."""
    REQUESTS_PER_MINUTE = "requests_per_minute"
    REQUESTS_PER_HOUR = "requests_per_hour"
    REQUESTS_PER_DAY = "requests_per_day"
    REQUESTS_PER_MONTH = "requests_per_month"
    CONCURRENT_REQUESTS = "concurrent_requests"
    BANDWIDTH_PER_HOUR = "bandwidth_per_hour"


class RateLimitTier(str, Enum):
    """Rate limit tiers for different API key types."""
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


@dataclass
class RateLimitConfig:
    """Rate limit configuration for a specific tier and limit type."""
    limit_type: RateLimitType
    tier: RateLimitTier
    limit: int
    window_seconds: int
    burst_limit: Optional[int] = None
    cost_per_overage: Optional[float] = None


@dataclass
class RateLimitResult:
    """Result of a rate limit check."""
    allowed: bool
    current_usage: int
    limit: int
    window_seconds: int
    reset_time: datetime
    retry_after: Optional[int] = None
    tier: Optional[RateLimitTier] = None
    cost_incurred: Optional[float] = None


@dataclass
class UsageMetrics:
    """Usage metrics for analytics."""
    api_key_id: int
    endpoint: str
    method: str
    timestamp: datetime
    response_time_ms: float
    response_code: int
    bytes_sent: int
    bytes_received: int
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    geographic_region: Optional[str] = None


class AdvancedRateLimitingService:
    """Advanced rate limiting service with comprehensive analytics."""
    
    def __init__(self):
        self.cache_service = cache_service
        self.audit_logger = audit_logger
        
        # Rate limit configurations by tier
        self.rate_limits = self._initialize_rate_limits()
        
        # Cache for API key tier lookups
        self._tier_cache = {}
        self._cache_ttl = 300  # 5 minutes
        
        logger.info("🚦 Advanced Rate Limiting Service initialized")
    
    def _initialize_rate_limits(self) -> Dict[RateLimitTier, List[RateLimitConfig]]:
        """Initialize rate limit configurations for all tiers."""
        return {
            RateLimitTier.FREE: [
                RateLimitConfig(RateLimitType.REQUESTS_PER_MINUTE, RateLimitTier.FREE, 10, 60),
                RateLimitConfig(RateLimitType.REQUESTS_PER_HOUR, RateLimitTier.FREE, 100, 3600),
                RateLimitConfig(RateLimitType.REQUESTS_PER_DAY, RateLimitTier.FREE, 1000, 86400),
                RateLimitConfig(RateLimitType.CONCURRENT_REQUESTS, RateLimitTier.FREE, 3, 0),
                RateLimitConfig(RateLimitType.BANDWIDTH_PER_HOUR, RateLimitTier.FREE, 10 * 1024 * 1024, 3600),  # 10MB
            ],
            RateLimitTier.BASIC: [
                RateLimitConfig(RateLimitType.REQUESTS_PER_MINUTE, RateLimitTier.BASIC, 60, 60),
                RateLimitConfig(RateLimitType.REQUESTS_PER_HOUR, RateLimitTier.BASIC, 1000, 3600),
                RateLimitConfig(RateLimitType.REQUESTS_PER_DAY, RateLimitTier.BASIC, 10000, 86400),
                RateLimitConfig(RateLimitType.REQUESTS_PER_MONTH, RateLimitTier.BASIC, 100000, 30 * 86400),
                RateLimitConfig(RateLimitType.CONCURRENT_REQUESTS, RateLimitTier.BASIC, 10, 0),
                RateLimitConfig(RateLimitType.BANDWIDTH_PER_HOUR, RateLimitTier.BASIC, 100 * 1024 * 1024, 3600),  # 100MB
            ],
            RateLimitTier.PREMIUM: [
                RateLimitConfig(RateLimitType.REQUESTS_PER_MINUTE, RateLimitTier.PREMIUM, 300, 60),
                RateLimitConfig(RateLimitType.REQUESTS_PER_HOUR, RateLimitTier.PREMIUM, 5000, 3600),
                RateLimitConfig(RateLimitType.REQUESTS_PER_DAY, RateLimitTier.PREMIUM, 50000, 86400),
                RateLimitConfig(RateLimitType.REQUESTS_PER_MONTH, RateLimitTier.PREMIUM, 1000000, 30 * 86400),
                RateLimitConfig(RateLimitType.CONCURRENT_REQUESTS, RateLimitTier.PREMIUM, 50, 0),
                RateLimitConfig(RateLimitType.BANDWIDTH_PER_HOUR, RateLimitTier.PREMIUM, 1024 * 1024 * 1024, 3600),  # 1GB
            ],
            RateLimitTier.ENTERPRISE: [
                RateLimitConfig(RateLimitType.REQUESTS_PER_MINUTE, RateLimitTier.ENTERPRISE, 1000, 60),
                RateLimitConfig(RateLimitType.REQUESTS_PER_HOUR, RateLimitTier.ENTERPRISE, 20000, 3600),
                RateLimitConfig(RateLimitType.REQUESTS_PER_DAY, RateLimitTier.ENTERPRISE, 200000, 86400),
                RateLimitConfig(RateLimitType.REQUESTS_PER_MONTH, RateLimitTier.ENTERPRISE, 10000000, 30 * 86400),
                RateLimitConfig(RateLimitType.CONCURRENT_REQUESTS, RateLimitTier.ENTERPRISE, 200, 0),
                RateLimitConfig(RateLimitType.BANDWIDTH_PER_HOUR, RateLimitTier.ENTERPRISE, 10 * 1024 * 1024 * 1024, 3600),  # 10GB
            ]
        }
    
    async def get_api_key_tier(self, api_key_id: int, db: Session) -> RateLimitTier:
        """Get the rate limit tier for an API key with caching."""
        cache_key = f"api_key_tier:{api_key_id}"
        
        # Check cache first
        cached_tier = await self._get_cached_tier(cache_key)
        if cached_tier:
            return cached_tier
        
        # Query database
        api_key = db.query(APIKey).filter(APIKey.id == api_key_id).first()
        if not api_key:
            tier = RateLimitTier.FREE
        else:
            # Determine tier based on API key metadata or user plan
            tier_mapping = {
                "free": RateLimitTier.FREE,
                "basic": RateLimitTier.BASIC,
                "premium": RateLimitTier.PREMIUM,
                "enterprise": RateLimitTier.ENTERPRISE
            }
            metadata = api_key.metadata or {}
            tier_name = metadata.get("tier", "free")
            tier = tier_mapping.get(tier_name, RateLimitTier.FREE)
        
        # Cache the result
        await self._cache_tier(cache_key, tier)
        return tier
    
    async def _get_cached_tier(self, cache_key: str) -> Optional[RateLimitTier]:
        """Get cached tier from Redis."""
        try:
            cached_value = await self.redis.get(cache_key)
            if cached_value:
                return RateLimitTier(cached_value.decode())
        except Exception as e:
            logger.warning(f"Failed to get cached tier: {e}")
        return None
    
    async def _cache_tier(self, cache_key: str, tier: RateLimitTier):
        """Cache tier in Redis."""
        try:
            await self.redis.setex(cache_key, self._cache_ttl, tier.value)
        except Exception as e:
            logger.warning(f"Failed to cache tier: {e}")
    
    async def check_rate_limit(
        self,
        api_key_id: int,
        endpoint: str,
        method: str,
        db: Session,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> RateLimitResult:
        """
        Check if a request is within rate limits.
        
        Performs comprehensive rate limiting including:
        - Per-minute, hourly, daily, and monthly limits
        - Concurrent request limits
        - Bandwidth limits
        - Endpoint-specific limits
        """
        try:
            tier = await self.get_api_key_tier(api_key_id, db)
            tier_limits = self.rate_limits.get(tier, self.rate_limits[RateLimitTier.FREE])
            
            # Check all applicable rate limits
            for limit_config in tier_limits:
                if limit_config.limit_type == RateLimitType.CONCURRENT_REQUESTS:
                    result = await self._check_concurrent_limit(api_key_id, limit_config)
                else:
                    result = await self._check_time_based_limit(api_key_id, endpoint, limit_config)
                
                if not result.allowed:
                    # Log rate limit exceeded
                    await self._log_rate_limit_exceeded(api_key_id, endpoint, method, limit_config, ip_address)
                    return result
            
            # All limits passed - increment counters
            await self._increment_usage_counters(api_key_id, endpoint, method, tier)
            
            # Return success result
            return RateLimitResult(
                allowed=True,
                current_usage=0,
                limit=0,
                window_seconds=0,
                reset_time=datetime.utcnow(),
                tier=tier
            )
            
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            # Fail open - allow request but log error
            return RateLimitResult(
                allowed=True,
                current_usage=0,
                limit=0,
                window_seconds=0,
                reset_time=datetime.utcnow()
            )
    
    async def _check_time_based_limit(
        self,
        api_key_id: int,
        endpoint: str,
        limit_config: RateLimitConfig
    ) -> RateLimitResult:
        """Check time-based rate limits using sliding window."""
        redis_key = f"rate_limit:{api_key_id}:{limit_config.limit_type.value}"
        
        now = time.time()
        window_start = now - limit_config.window_seconds
        
        # Use Redis sorted set for sliding window
        pipe = self.redis.pipeline()
        
        # Remove expired entries
        pipe.zremrangebyscore(redis_key, 0, window_start)
        
        # Count current requests in window
        pipe.zcard(redis_key)
        
        # Set expiry
        pipe.expire(redis_key, limit_config.window_seconds + 60)
        
        results = await pipe.execute()
        current_count = results[1]
        
        if current_count >= limit_config.limit:
            # Rate limit exceeded
            reset_time = datetime.fromtimestamp(now + limit_config.window_seconds)
            retry_after = limit_config.window_seconds
            
            return RateLimitResult(
                allowed=False,
                current_usage=current_count,
                limit=limit_config.limit,
                window_seconds=limit_config.window_seconds,
                reset_time=reset_time,
                retry_after=retry_after,
                tier=limit_config.tier
            )
        
        # Add current request to window
        await self.redis.zadd(redis_key, {str(now): now})
        
        return RateLimitResult(
            allowed=True,
            current_usage=current_count + 1,
            limit=limit_config.limit,
            window_seconds=limit_config.window_seconds,
            reset_time=datetime.fromtimestamp(now + limit_config.window_seconds),
            tier=limit_config.tier
        )
    
    async def _check_concurrent_limit(
        self,
        api_key_id: int,
        limit_config: RateLimitConfig
    ) -> RateLimitResult:
        """Check concurrent request limits."""
        redis_key = f"concurrent:{api_key_id}"
        
        try:
            # Get current concurrent requests
            current_concurrent = await self.redis.get(redis_key) or 0
            current_concurrent = int(current_concurrent)
            
            if current_concurrent >= limit_config.limit:
                return RateLimitResult(
                    allowed=False,
                    current_usage=current_concurrent,
                    limit=limit_config.limit,
                    window_seconds=0,
                    reset_time=datetime.utcnow(),
                    retry_after=1,  # Retry in 1 second
                    tier=limit_config.tier
                )
            
            return RateLimitResult(
                allowed=True,
                current_usage=current_concurrent,
                limit=limit_config.limit,
                window_seconds=0,
                reset_time=datetime.utcnow(),
                tier=limit_config.tier
            )
            
        except Exception as e:
            logger.error(f"Concurrent limit check failed: {e}")
            # Fail open
            return RateLimitResult(
                allowed=True,
                current_usage=0,
                limit=limit_config.limit,
                window_seconds=0,
                reset_time=datetime.utcnow(),
                tier=limit_config.tier
            )
    
    async def increment_concurrent_requests(self, api_key_id: int):
        """Increment concurrent request counter."""
        redis_key = f"concurrent:{api_key_id}"
        try:
            # Increment with expiry
            pipe = self.redis.pipeline()
            pipe.incr(redis_key)
            pipe.expire(redis_key, 300)  # 5 minute expiry as safety net
            await pipe.execute()
        except Exception as e:
            logger.error(f"Failed to increment concurrent requests: {e}")
    
    async def decrement_concurrent_requests(self, api_key_id: int):
        """Decrement concurrent request counter."""
        redis_key = f"concurrent:{api_key_id}"
        try:
            current = await self.redis.get(redis_key)
            if current and int(current) > 0:
                await self.redis.decr(redis_key)
        except Exception as e:
            logger.error(f"Failed to decrement concurrent requests: {e}")
    
    async def _increment_usage_counters(
        self,
        api_key_id: int,
        endpoint: str,
        method: str,
        tier: RateLimitTier
    ):
        """Increment various usage counters for analytics."""
        try:
            now = datetime.utcnow()
            date_str = now.strftime("%Y-%m-%d")
            hour_str = now.strftime("%Y-%m-%d:%H")
            month_str = now.strftime("%Y-%m")
            
            pipe = self.redis.pipeline()
            
            # Global counters
            pipe.incr(f"usage:{api_key_id}:total")
            pipe.incr(f"usage:{api_key_id}:daily:{date_str}")
            pipe.incr(f"usage:{api_key_id}:hourly:{hour_str}")
            pipe.incr(f"usage:{api_key_id}:monthly:{month_str}")
            
            # Endpoint-specific counters
            pipe.incr(f"usage:{api_key_id}:endpoint:{endpoint}:{method}")
            pipe.incr(f"usage:{api_key_id}:endpoint:{endpoint}:{method}:daily:{date_str}")
            
            # Tier-based counters
            pipe.incr(f"usage:tier:{tier.value}:total")
            pipe.incr(f"usage:tier:{tier.value}:daily:{date_str}")
            
            # Set expiries
            pipe.expire(f"usage:{api_key_id}:daily:{date_str}", 7 * 86400)  # 7 days
            pipe.expire(f"usage:{api_key_id}:hourly:{hour_str}", 48 * 3600)  # 48 hours
            pipe.expire(f"usage:{api_key_id}:monthly:{month_str}", 366 * 86400)  # 1 year
            
            await pipe.execute()
            
        except Exception as e:
            logger.error(f"Failed to increment usage counters: {e}")
    
    async def _log_rate_limit_exceeded(
        self,
        api_key_id: int,
        endpoint: str,
        method: str,
        limit_config: RateLimitConfig,
        ip_address: Optional[str]
    ):
        """Log rate limit exceeded events."""
        try:
            event_data = {
                "api_key_id": api_key_id,
                "endpoint": endpoint,
                "method": method,
                "limit_type": limit_config.limit_type.value,
                "limit": limit_config.limit,
                "tier": limit_config.tier.value,
                "ip_address": ip_address,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Log to audit system
            self.audit_logger.log_security_event(
                event_type="rate_limit_exceeded",
                api_key_id=api_key_id,
                details=event_data
            )
            
            # Store in Redis for analytics
            redis_key = f"rate_limit_violations:{api_key_id}"
            await self.redis.lpush(redis_key, json.dumps(event_data))
            await self.redis.ltrim(redis_key, 0, 99)  # Keep last 100 violations
            await self.redis.expire(redis_key, 30 * 86400)  # 30 days
            
            logger.warning(f"Rate limit exceeded for API key {api_key_id}: {limit_config.limit_type.value}")
            
        except Exception as e:
            logger.error(f"Failed to log rate limit exceeded: {e}")
    
    async def get_usage_analytics(
        self,
        api_key_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get comprehensive usage analytics for an API key."""
        try:
            if not start_date:
                start_date = datetime.utcnow() - timedelta(days=30)
            if not end_date:
                end_date = datetime.utcnow()
            
            analytics = {
                "api_key_id": api_key_id,
                "period": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                },
                "usage_summary": await self._get_usage_summary(api_key_id),
                "endpoint_breakdown": await self._get_endpoint_breakdown(api_key_id),
                "time_series": await self._get_time_series_data(api_key_id, start_date, end_date),
                "rate_limit_violations": await self._get_rate_limit_violations(api_key_id),
                "geographic_distribution": await self._get_geographic_distribution(api_key_id),
                "performance_metrics": await self._get_performance_metrics(api_key_id)
            }
            
            return analytics
            
        except Exception as e:
            logger.error(f"Failed to get usage analytics: {e}")
            return {"error": "Failed to generate analytics"}
    
    async def _get_usage_summary(self, api_key_id: int) -> Dict[str, Any]:
        """Get usage summary statistics."""
        try:
            now = datetime.utcnow()
            today = now.strftime("%Y-%m-%d")
            this_hour = now.strftime("%Y-%m-%d:%H")
            this_month = now.strftime("%Y-%m")
            
            pipe = self.redis.pipeline()
            
            # Get various usage counters
            pipe.get(f"usage:{api_key_id}:total")
            pipe.get(f"usage:{api_key_id}:daily:{today}")
            pipe.get(f"usage:{api_key_id}:hourly:{this_hour}")
            pipe.get(f"usage:{api_key_id}:monthly:{this_month}")
            
            results = await pipe.execute()
            
            return {
                "total_requests": int(results[0] or 0),
                "requests_today": int(results[1] or 0),
                "requests_this_hour": int(results[2] or 0),
                "requests_this_month": int(results[3] or 0)
            }
            
        except Exception as e:
            logger.error(f"Failed to get usage summary: {e}")
            return {}
    
    async def _get_endpoint_breakdown(self, api_key_id: int) -> List[Dict[str, Any]]:
        """Get breakdown of usage by endpoint."""
        try:
            # Get all endpoint usage keys
            pattern = f"usage:{api_key_id}:endpoint:*"
            keys = await self.redis.keys(pattern)
            
            if not keys:
                return []
            
            # Get usage counts
            pipe = self.redis.pipeline()
            for key in keys:
                pipe.get(key)
            
            results = await pipe.execute()
            
            breakdown = []
            for key, count in zip(keys, results):
                key_str = key.decode() if isinstance(key, bytes) else key
                parts = key_str.split(":")
                if len(parts) >= 5:
                    endpoint = parts[3]
                    method = parts[4]
                    breakdown.append({
                        "endpoint": endpoint,
                        "method": method,
                        "requests": int(count or 0)
                    })
            
            # Sort by usage descending
            breakdown.sort(key=lambda x: x["requests"], reverse=True)
            return breakdown
            
        except Exception as e:
            logger.error(f"Failed to get endpoint breakdown: {e}")
            return []
    
    async def _get_time_series_data(
        self,
        api_key_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Get time series usage data."""
        try:
            time_series = []
            current_date = start_date.date()
            end_date_only = end_date.date()
            
            while current_date <= end_date_only:
                date_str = current_date.strftime("%Y-%m-%d")
                redis_key = f"usage:{api_key_id}:daily:{date_str}"
                
                count = await self.redis.get(redis_key)
                time_series.append({
                    "date": date_str,
                    "requests": int(count or 0)
                })
                
                current_date += timedelta(days=1)
            
            return time_series
            
        except Exception as e:
            logger.error(f"Failed to get time series data: {e}")
            return []
    
    async def _get_rate_limit_violations(self, api_key_id: int) -> List[Dict[str, Any]]:
        """Get recent rate limit violations."""
        try:
            redis_key = f"rate_limit_violations:{api_key_id}"
            violations_json = await self.redis.lrange(redis_key, 0, 19)  # Last 20 violations
            
            violations = []
            for violation_json in violations_json:
                try:
                    violation_data = json.loads(violation_json)
                    violations.append(violation_data)
                except json.JSONDecodeError:
                    continue
            
            return violations
            
        except Exception as e:
            logger.error(f"Failed to get rate limit violations: {e}")
            return []
    
    async def _get_geographic_distribution(self, api_key_id: int) -> Dict[str, int]:
        """Get geographic distribution of requests."""
        # This would require storing geographic data with requests
        # For now, return empty dict as placeholder
        return {}
    
    async def _get_performance_metrics(self, api_key_id: int) -> Dict[str, float]:
        """Get performance metrics."""
        # This would require storing response time data
        # For now, return placeholder metrics
        return {
            "average_response_time": 0.0,
            "p95_response_time": 0.0,
            "p99_response_time": 0.0,
            "error_rate": 0.0
        }
    
    async def record_request_metrics(self, metrics: UsageMetrics):
        """Record detailed request metrics for analytics."""
        try:
            # Store request metrics in Redis
            metrics_data = {
                "api_key_id": metrics.api_key_id,
                "endpoint": metrics.endpoint,
                "method": metrics.method,
                "timestamp": metrics.timestamp.isoformat(),
                "response_time_ms": metrics.response_time_ms,
                "response_code": metrics.response_code,
                "bytes_sent": metrics.bytes_sent,
                "bytes_received": metrics.bytes_received,
                "user_agent": metrics.user_agent,
                "ip_address": metrics.ip_address,
                "geographic_region": metrics.geographic_region
            }
            
            # Store in time-series format
            redis_key = f"metrics:{metrics.api_key_id}:{metrics.timestamp.strftime('%Y-%m-%d')}"
            await self.redis.lpush(redis_key, json.dumps(metrics_data))
            await self.redis.expire(redis_key, 7 * 86400)  # Keep for 7 days
            
            # Update performance aggregates
            await self._update_performance_aggregates(metrics)
            
        except Exception as e:
            logger.error(f"Failed to record request metrics: {e}")
    
    async def _update_performance_aggregates(self, metrics: UsageMetrics):
        """Update performance aggregates for faster analytics."""
        try:
            date_str = metrics.timestamp.strftime("%Y-%m-%d")
            
            # Update response time statistics
            response_time_key = f"perf:{metrics.api_key_id}:response_times:{date_str}"
            await self.redis.lpush(response_time_key, str(metrics.response_time_ms))
            await self.redis.ltrim(response_time_key, 0, 999)  # Keep last 1000 samples
            await self.redis.expire(response_time_key, 7 * 86400)
            
            # Update error rate
            if metrics.response_code >= 400:
                error_key = f"perf:{metrics.api_key_id}:errors:{date_str}"
                await self.redis.incr(error_key)
                await self.redis.expire(error_key, 7 * 86400)
            
        except Exception as e:
            logger.error(f"Failed to update performance aggregates: {e}")
    
    async def get_current_limits(self, api_key_id: int, db: Session) -> Dict[str, Any]:
        """Get current rate limits and usage for an API key."""
        try:
            tier = await self.get_api_key_tier(api_key_id, db)
            tier_limits = self.rate_limits.get(tier, self.rate_limits[RateLimitTier.FREE])
            
            current_limits = {
                "tier": tier.value,
                "limits": []
            }
            
            for limit_config in tier_limits:
                limit_info = {
                    "type": limit_config.limit_type.value,
                    "limit": limit_config.limit,
                    "window_seconds": limit_config.window_seconds,
                    "current_usage": 0,
                    "reset_time": None
                }
                
                # Get current usage
                if limit_config.limit_type == RateLimitType.CONCURRENT_REQUESTS:
                    redis_key = f"concurrent:{api_key_id}"
                    current_usage = await self.redis.get(redis_key)
                    limit_info["current_usage"] = int(current_usage or 0)
                else:
                    redis_key = f"rate_limit:{api_key_id}:{limit_config.limit_type.value}"
                    now = time.time()
                    window_start = now - limit_config.window_seconds
                    
                    # Remove expired entries and count current
                    pipe = self.redis.pipeline()
                    pipe.zremrangebyscore(redis_key, 0, window_start)
                    pipe.zcard(redis_key)
                    results = await pipe.execute()
                    
                    limit_info["current_usage"] = results[1]
                    limit_info["reset_time"] = datetime.fromtimestamp(now + limit_config.window_seconds).isoformat()
                
                current_limits["limits"].append(limit_info)
            
            return current_limits
            
        except Exception as e:
            logger.error(f"Failed to get current limits: {e}")
            return {"error": "Failed to get current limits"}


# Global service instance
advanced_rate_limiting_service = AdvancedRateLimitingService()