"""
Simple rate limiter for conversion tracking endpoints.
Uses in-memory storage for simplicity (can be replaced with Redis in production).
"""

from fastapi import Request, HTTPException
from datetime import datetime, timedelta
from typing import Dict, List
import asyncio


class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, List[datetime]] = {}
        self.cleanup_interval = 60  # Clean up old entries every minute
        self._cleanup_task = None
    
    async def check_rate_limit(self, request: Request, key: str, count: int = 1):
        """
        Check if the request is within rate limits.
        
        Args:
            request: FastAPI request object
            key: Unique key for rate limiting (e.g., user ID)
            count: Number of requests to count (for batch operations)
        
        Raises:
            HTTPException: If rate limit is exceeded
        """
        now = datetime.utcnow()
        minute_ago = now - timedelta(minutes=1)
        
        # Initialize key if not exists
        if key not in self.requests:
            self.requests[key] = []
        
        # Remove old requests
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if req_time > minute_ago
        ]
        
        # Check if adding new requests would exceed limit
        if len(self.requests[key]) + count > self.requests_per_minute:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Maximum {self.requests_per_minute} requests per minute."
            )
        
        # Add new request timestamps
        for _ in range(count):
            self.requests[key].append(now)
        
        # Start cleanup task if not running
        if not self._cleanup_task:
            self._cleanup_task = asyncio.create_task(self._cleanup_old_entries())
    
    async def _cleanup_old_entries(self):
        """Periodically clean up old entries to prevent memory bloat"""
        while True:
            await asyncio.sleep(self.cleanup_interval)
            now = datetime.utcnow()
            minute_ago = now - timedelta(minutes=1)
            
            # Clean up old entries
            keys_to_remove = []
            for key, timestamps in self.requests.items():
                self.requests[key] = [
                    ts for ts in timestamps if ts > minute_ago
                ]
                if not self.requests[key]:
                    keys_to_remove.append(key)
            
            # Remove empty keys
            for key in keys_to_remove:
                del self.requests[key]