"""
Simple Rate Limiting Service for Public API

A simplified rate limiting service that provides essential rate limiting
functionality without complex Redis operations.

Features:
- Basic request counting and limits
- Per-API key rate limiting
- Usage analytics
- Configurable limits by tier
"""

import time
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, Any
from dataclasses import dataclass
from enum import Enum
import logging
from sqlalchemy.orm import Session

from services.redis_service import cache_service
from models.api_key import APIKey
from utils.audit_logger_bypass import get_audit_logger

logger = logging.getLogger(__name__)
audit_logger = get_audit_logger()


class RateLimitTier(str, Enum):
    """Rate limit tiers for different API key types."""
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


@dataclass
class RateLimitResult:
    """Result of a rate limit check."""
    allowed: bool
    current_usage: int
    limit: int
    reset_time: datetime
    tier: Optional[RateLimitTier] = None
    retry_after: Optional[int] = None


class SimpleRateLimitingService:
    """Simple rate limiting service with essential functionality."""
    
    def __init__(self):
        self.cache_service = cache_service
        self.audit_logger = audit_logger
        
        # Rate limit configurations by tier (requests per hour)
        self.hourly_limits = {
            RateLimitTier.FREE: 100,
            RateLimitTier.BASIC: 1000,
            RateLimitTier.PREMIUM: 5000,
            RateLimitTier.ENTERPRISE: 20000
        }
        
        # Daily limits
        self.daily_limits = {
            RateLimitTier.FREE: 1000,
            RateLimitTier.BASIC: 10000,
            RateLimitTier.PREMIUM: 50000,
            RateLimitTier.ENTERPRISE: 200000
        }
        
        logger.info("🚦 Simple Rate Limiting Service initialized")
    
    async def get_api_key_tier(self, api_key_id: int, db: Session) -> RateLimitTier:
        """Get the rate limit tier for an API key."""
        try:
            # Check cache first
            cache_key = f"api_key_tier:{api_key_id}"
            cached_tier = self.cache_service.get(cache_key)
            if cached_tier:
                return RateLimitTier(cached_tier)
            
            # Query database
            api_key = db.query(APIKey).filter(APIKey.id == api_key_id).first()
            if not api_key:
                tier = RateLimitTier.FREE
            else:
                # Determine tier based on API key metadata or user plan
                metadata = api_key.metadata or {}
                tier_name = metadata.get("tier", "free")
                tier_mapping = {
                    "free": RateLimitTier.FREE,
                    "basic": RateLimitTier.BASIC,
                    "premium": RateLimitTier.PREMIUM,
                    "enterprise": RateLimitTier.ENTERPRISE
                }
                tier = tier_mapping.get(tier_name, RateLimitTier.FREE)
            
            # Cache the result for 5 minutes
            self.cache_service.set(cache_key, tier.value, ttl=300)
            return tier
            
        except Exception as e:
            logger.error(f"Failed to get API key tier: {e}")
            return RateLimitTier.FREE
    
    async def check_rate_limit(
        self,
        api_key_id: int,
        endpoint: str,
        method: str,
        db: Session,
        ip_address: Optional[str] = None
    ) -> RateLimitResult:
        """
        Check if a request is within rate limits.
        Uses simple hourly and daily counters.
        """
        try:
            tier = await self.get_api_key_tier(api_key_id, db)
            
            # Get current time info
            now = datetime.utcnow()
            hour_key = f"rate_limit:{api_key_id}:hour:{now.strftime('%Y-%m-%d-%H')}"
            day_key = f"rate_limit:{api_key_id}:day:{now.strftime('%Y-%m-%d')}"
            
            # Get current usage
            hourly_usage = int(self.cache_service.get(hour_key) or 0)
            daily_usage = int(self.cache_service.get(day_key) or 0)
            
            # Check limits
            hourly_limit = self.hourly_limits[tier]
            daily_limit = self.daily_limits[tier]
            
            # Calculate reset times
            next_hour = (now + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
            next_day = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Check hourly limit
            if hourly_usage >= hourly_limit:
                return RateLimitResult(
                    allowed=False,
                    current_usage=hourly_usage,
                    limit=hourly_limit,
                    reset_time=next_hour,
                    tier=tier,
                    retry_after=int((next_hour - now).total_seconds())
                )
            
            # Check daily limit
            if daily_usage >= daily_limit:
                return RateLimitResult(
                    allowed=False,
                    current_usage=daily_usage,
                    limit=daily_limit,
                    reset_time=next_day,
                    tier=tier,
                    retry_after=int((next_day - now).total_seconds())
                )
            
            # Increment counters
            self.cache_service.increment(hour_key, ttl=3600)  # 1 hour TTL
            self.cache_service.increment(day_key, ttl=86400)  # 1 day TTL
            
            # Log usage
            await self._log_api_usage(api_key_id, endpoint, method, tier)
            
            return RateLimitResult(
                allowed=True,
                current_usage=hourly_usage + 1,
                limit=hourly_limit,
                reset_time=next_hour,
                tier=tier
            )
            
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            # Fail open - allow request
            return RateLimitResult(
                allowed=True,
                current_usage=0,
                limit=1000,
                reset_time=datetime.utcnow() + timedelta(hours=1)
            )
    
    async def _log_api_usage(
        self,
        api_key_id: int,
        endpoint: str,
        method: str,
        tier: RateLimitTier
    ):
        """Log API usage for analytics."""
        try:
            now = datetime.utcnow()
            usage_data = {
                "api_key_id": api_key_id,
                "endpoint": endpoint,
                "method": method,
                "tier": tier.value,
                "timestamp": now.isoformat()
            }
            
            # Store recent usage for analytics
            usage_key = f"usage_log:{api_key_id}"
            usage_list = self.cache_service.get(usage_key) or []
            if not isinstance(usage_list, list):
                usage_list = []
            
            usage_list.append(usage_data)
            
            # Keep only last 100 requests
            if len(usage_list) > 100:
                usage_list = usage_list[-100:]
            
            # Store with 7-day TTL
            self.cache_service.set(usage_key, usage_list, ttl=7 * 86400)
            
            # Increment endpoint counters
            endpoint_key = f"endpoint_usage:{api_key_id}:{endpoint}:{method}"
            self.cache_service.increment(endpoint_key, ttl=30 * 86400)  # 30 days
            
        except Exception as e:
            logger.error(f"Failed to log API usage: {e}")
    
    async def get_usage_analytics(
        self,
        api_key_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get usage analytics for an API key."""
        try:
            # Get basic usage stats
            now = datetime.utcnow()
            today = now.strftime('%Y-%m-%d')
            this_hour = now.strftime('%Y-%m-%d-%H')
            
            # Current usage
            hourly_usage = int(self.cache_service.get(f"rate_limit:{api_key_id}:hour:{this_hour}") or 0)
            daily_usage = int(self.cache_service.get(f"rate_limit:{api_key_id}:day:{today}") or 0)
            
            # Recent usage log
            usage_log = self.cache_service.get(f"usage_log:{api_key_id}") or []
            
            # Endpoint breakdown
            endpoint_stats = {}
            for entry in usage_log:
                if isinstance(entry, dict):
                    endpoint = entry.get('endpoint', 'unknown')
                    method = entry.get('method', 'unknown')
                    key = f"{method} {endpoint}"
                    endpoint_stats[key] = endpoint_stats.get(key, 0) + 1
            
            # Time series data (last 7 days)
            time_series = []
            for i in range(7):
                date = (now - timedelta(days=i)).strftime('%Y-%m-%d')
                day_usage = int(self.cache_service.get(f"rate_limit:{api_key_id}:day:{date}") or 0)
                time_series.append({
                    "date": date,
                    "requests": day_usage
                })
            
            return {
                "api_key_id": api_key_id,
                "period": {
                    "start": (now - timedelta(days=7)).isoformat(),
                    "end": now.isoformat()
                },
                "usage_summary": {
                    "requests_this_hour": hourly_usage,
                    "requests_today": daily_usage,
                    "total_requests": len(usage_log)
                },
                "endpoint_breakdown": [
                    {"endpoint": endpoint, "requests": count}
                    for endpoint, count in sorted(endpoint_stats.items(), key=lambda x: x[1], reverse=True)
                ],
                "time_series": list(reversed(time_series)),  # Most recent first
                "recent_requests": usage_log[-20:] if usage_log else []  # Last 20 requests
            }
            
        except Exception as e:
            logger.error(f"Failed to get usage analytics: {e}")
            return {"error": "Failed to generate analytics"}
    
    async def get_current_limits(self, api_key_id: int, db: Session) -> Dict[str, Any]:
        """Get current rate limits and usage for an API key."""
        try:
            tier = await self.get_api_key_tier(api_key_id, db)
            
            # Get current usage
            now = datetime.utcnow()
            hour_key = f"rate_limit:{api_key_id}:hour:{now.strftime('%Y-%m-%d-%H')}"
            day_key = f"rate_limit:{api_key_id}:day:{now.strftime('%Y-%m-%d')}"
            
            hourly_usage = int(self.cache_service.get(hour_key) or 0)
            daily_usage = int(self.cache_service.get(day_key) or 0)
            
            # Calculate reset times
            next_hour = (now + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
            next_day = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            
            return {
                "tier": tier.value,
                "limits": [
                    {
                        "type": "hourly",
                        "limit": self.hourly_limits[tier],
                        "current_usage": hourly_usage,
                        "remaining": max(0, self.hourly_limits[tier] - hourly_usage),
                        "reset_time": next_hour.isoformat()
                    },
                    {
                        "type": "daily",
                        "limit": self.daily_limits[tier],
                        "current_usage": daily_usage,
                        "remaining": max(0, self.daily_limits[tier] - daily_usage),
                        "reset_time": next_day.isoformat()
                    }
                ]
            }
            
        except Exception as e:
            logger.error(f"Failed to get current limits: {e}")
            return {"error": "Failed to get current limits"}


# Global service instance
simple_rate_limiting_service = SimpleRateLimitingService()