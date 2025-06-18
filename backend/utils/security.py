"""
Security utilities and middleware
"""
from fastapi import HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
import time
from collections import defaultdict
from datetime import datetime, timedelta
import re


class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = defaultdict(list)
    
    def is_allowed(self, identifier: str) -> bool:
        """Check if request is allowed based on rate limit"""
        now = time.time()
        
        # Clean old requests
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if now - req_time < self.window_seconds
        ]
        
        # Check if under limit
        if len(self.requests[identifier]) < self.max_requests:
            self.requests[identifier].append(now)
            return True
        
        return False
    
    def get_reset_time(self, identifier: str) -> int:
        """Get time until rate limit resets"""
        if not self.requests[identifier]:
            return 0
        
        oldest_request = min(self.requests[identifier])
        reset_time = int(oldest_request + self.window_seconds - time.time())
        return max(0, reset_time)


# Global rate limiters
login_rate_limiter = RateLimiter(max_requests=5, window_seconds=300)  # 5 attempts per 5 minutes
api_rate_limiter = RateLimiter(max_requests=100, window_seconds=60)  # 100 requests per minute


def check_login_rate_limit(identifier: str):
    """Check login rate limit"""
    if not login_rate_limiter.is_allowed(identifier):
        reset_time = login_rate_limiter.get_reset_time(identifier)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Please try again in {reset_time} seconds."
        )


def check_api_rate_limit(identifier: str):
    """Check API rate limit"""
    if not api_rate_limiter.is_allowed(identifier):
        reset_time = api_rate_limiter.get_reset_time(identifier)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Please try again in {reset_time} seconds.",
            headers={"Retry-After": str(reset_time)}
        )


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password strength
    Returns: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"
    
    return True, None


def sanitize_output(data: Any) -> Any:
    """Remove sensitive fields from output"""
    if isinstance(data, dict):
        # Fields to remove from output
        sensitive_fields = {'password', 'hashed_password', 'token', 'secret'}
        
        # Create a copy to avoid modifying the original
        cleaned = {}
        for key, value in data.items():
            if key.lower() not in sensitive_fields:
                cleaned[key] = sanitize_output(value)
        return cleaned
    
    elif isinstance(data, list):
        return [sanitize_output(item) for item in data]
    
    else:
        return data


def get_client_ip(request: Request) -> str:
    """Get client IP address from request"""
    # Check for proxy headers
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback to direct connection
    if request.client:
        return request.client.host
    
    return "unknown"