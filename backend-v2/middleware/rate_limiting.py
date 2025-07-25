
import time
from typing import Optional
from fastapi import Request, HTTPException, status
from fastapi.middleware.base import BaseHTTPMiddleware
import redis
import logging

logger = logging.getLogger(__name__)

class RateLimitingMiddleware(BaseHTTPMiddleware):
    """Advanced rate limiting with Redis backend"""
    
    def __init__(self, app, redis_url: str = None):
        super().__init__(app)
        self.redis_client = redis.from_url(redis_url) if redis_url else None
        
        # Rate limit configuration
        self.global_limits = {
            "requests_per_minute": 60,
            "requests_per_hour": 1000,
            "requests_per_day": 10000
        }
        
        self.endpoint_limits = {
            "/api/v2/auth/login": {"requests_per_minute": 5, "lockout_duration": 300},
            "/api/v2/auth/register": {"requests_per_minute": 3},
            "/api/v2/auth/forgot-password": {"requests_per_minute": 2},
            "/api/v2/payments": {"requests_per_minute": 10},
            "/api/v2/appointments": {"requests_per_minute": 20}
        }
        
        self.blocked_ips = set()
        self.violations = {}
    
    def get_client_ip(self, request: Request) -> str:
        """Extract client IP address"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host
    
    def is_rate_limited(self, client_ip: str, endpoint: str) -> Tuple[bool, Optional[str]]:
        """Check if request should be rate limited"""
        
        # Check IP blocking
        if client_ip in self.blocked_ips:
            return True, "IP blocked due to violations"
        
        current_time = int(time.time())
        
        # Check endpoint-specific limits
        endpoint_config = self.endpoint_limits.get(endpoint)
        if endpoint_config:
            key = f"rate_limit:{client_ip}:{endpoint}:minute"
            
            if self.redis_client:
                try:
                    current_requests = self.redis_client.get(key)
                    current_requests = int(current_requests) if current_requests else 0
                    
                    if current_requests >= endpoint_config["requests_per_minute"]:
                        # Record violation
                        self.record_violation(client_ip, endpoint)
                        return True, f"Rate limit exceeded for {endpoint}"
                    
                    # Increment counter
                    pipe = self.redis_client.pipeline()
                    pipe.incr(key)
                    pipe.expire(key, 60)
                    pipe.execute()
                    
                except Exception as e:
                    logger.error(f"Redis error in rate limiting: {e}")
        
        # Check global limits
        global_key = f"rate_limit:{client_ip}:global:minute"
        if self.redis_client:
            try:
                current_requests = self.redis_client.get(global_key)
                current_requests = int(current_requests) if current_requests else 0
                
                if current_requests >= self.global_limits["requests_per_minute"]:
                    self.record_violation(client_ip, "global")
                    return True, "Global rate limit exceeded"
                
                # Increment global counter
                pipe = self.redis_client.pipeline()
                pipe.incr(global_key)
                pipe.expire(global_key, 60)
                pipe.execute()
                
            except Exception as e:
                logger.error(f"Redis error in global rate limiting: {e}")
        
        return False, None
    
    def record_violation(self, client_ip: str, endpoint: str):
        """Record rate limit violation"""
        violation_key = f"violations:{client_ip}"
        
        if client_ip not in self.violations:
            self.violations[client_ip] = []
        
        self.violations[client_ip].append({
            "endpoint": endpoint,
            "timestamp": time.time()
        })
        
        # Block IP if too many violations
        recent_violations = [
            v for v in self.violations[client_ip]
            if time.time() - v["timestamp"] < 3600  # Last hour
        ]
        
        if len(recent_violations) >= 5:
            self.blocked_ips.add(client_ip)
            logger.warning(f"IP {client_ip} blocked due to {len(recent_violations)} violations")
    
    async def dispatch(self, request: Request, call_next):
        client_ip = self.get_client_ip(request)
        endpoint = request.url.path
        
        # Check rate limiting
        is_limited, reason = self.is_rate_limited(client_ip, endpoint)
        
        if is_limited:
            logger.warning(f"Rate limit exceeded for {client_ip} on {endpoint}: {reason}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={"error": "Rate limit exceeded", "retry_after": 60}
            )
        
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = "60"
        response.headers["X-RateLimit-Remaining"] = "59"  # Simplified
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + 60)
        
        return response
