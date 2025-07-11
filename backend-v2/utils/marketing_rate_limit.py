"""
Marketing Analytics Rate Limiting
=================================

Provides specialized rate limiting for marketing analytics endpoints
to prevent abuse and ensure fair usage.
"""

from typing import Optional
from fastapi import Request, HTTPException
from utils.rate_limiter import RateLimiter
import logging

logger = logging.getLogger(__name__)


class MarketingRateLimiter:
    """
    Specialized rate limiter for marketing analytics endpoints.
    
    Different endpoints have different rate limits based on:
    - Computational complexity
    - Real-time requirements
    - Data export capabilities
    """
    
    def __init__(self):
        # Define rate limits for different endpoint categories
        self.limits = {
            # Standard analytics queries
            "overview": 30,          # 30 requests per minute
            "trends": 30,            # 30 requests per minute
            "channels": 30,          # 30 requests per minute
            "funnel": 30,            # 30 requests per minute
            
            # Real-time endpoints (higher limit for dashboard refresh)
            "realtime": 120,         # 120 requests per minute (every 0.5s)
            "health": 120,           # 120 requests per minute
            
            # Resource-intensive operations
            "export": 5,             # 5 exports per minute
            "campaigns": 60,         # 60 requests per minute
            
            # Default for unknown endpoints
            "default": 20            # 20 requests per minute
        }
        
        # Create rate limiter instances for each category
        self.limiters = {
            key: RateLimiter(requests_per_minute=limit)
            for key, limit in self.limits.items()
        }
        
        logger.info(f"Marketing rate limiter initialized with limits: {self.limits}")
    
    async def check_limit(
        self, 
        request: Request, 
        endpoint: str, 
        user_id: int,
        organization_id: Optional[int] = None
    ):
        """
        Check rate limit for specific marketing endpoint.
        
        Args:
            request: FastAPI request object
            endpoint: Endpoint category (e.g., 'overview', 'realtime')
            user_id: User making the request
            organization_id: Optional organization ID for org-level limits
            
        Raises:
            HTTPException: If rate limit exceeded
        """
        # Use default limit if endpoint not recognized
        if endpoint not in self.limiters:
            logger.warning(f"Unknown endpoint category '{endpoint}', using default limit")
            endpoint = "default"
        
        # Create unique key for rate limiting
        # Can be per-user or per-organization
        if organization_id:
            limit_key = f"marketing_{endpoint}_org_{organization_id}"
        else:
            limit_key = f"marketing_{endpoint}_user_{user_id}"
        
        # Get the appropriate limiter
        limiter = self.limiters[endpoint]
        
        try:
            # Check rate limit
            await limiter.check_rate_limit(request, limit_key)
            
            # Log successful request
            logger.debug(f"Rate limit check passed for {limit_key}")
            
        except HTTPException as e:
            # Log rate limit violation
            logger.warning(
                f"Rate limit exceeded for {limit_key}: "
                f"{self.limits[endpoint]} requests per minute"
            )
            
            # Add helpful headers to response
            e.headers = {
                "X-RateLimit-Limit": str(self.limits[endpoint]),
                "X-RateLimit-Endpoint": endpoint,
                "X-RateLimit-Reset": "60",  # Reset in 60 seconds
                "Retry-After": "60"
            }
            raise e
    
    def get_limits_info(self) -> dict:
        """
        Get information about current rate limits.
        
        Returns:
            Dictionary with rate limit information
        """
        return {
            "limits": self.limits,
            "window": "60 seconds",
            "strategy": "sliding window",
            "enforcement": "per-user or per-organization"
        }


# Create singleton instance
marketing_rate_limiter = MarketingRateLimiter()


async def check_marketing_rate_limit(
    request: Request,
    endpoint: str,
    user_id: int,
    organization_id: Optional[int] = None
):
    """
    Convenience function to check marketing rate limits.
    
    This can be used as a dependency in FastAPI endpoints.
    """
    await marketing_rate_limiter.check_limit(
        request=request,
        endpoint=endpoint,
        user_id=user_id,
        organization_id=organization_id
    )