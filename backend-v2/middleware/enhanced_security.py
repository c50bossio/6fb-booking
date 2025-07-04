"""
Enhanced Security Middleware for BookedBarber V2
Enhances existing middleware with production security features
"""

from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import time
import redis
import json
from typing import Dict, Optional, List
import logging
from datetime import datetime, timedelta
import hashlib
import secrets

from config.security_config import SecurityConfig

logger = logging.getLogger(__name__)

class EnhancedSecurityMiddleware(BaseHTTPMiddleware):
    """Enhanced security middleware that works with existing middleware"""
    
    def __init__(self, app, environment: str = "production"):
        super().__init__(app)
        self.config = SecurityConfig.get_environment_specific_config(environment)
        self.security_headers = self.config["SECURITY_HEADERS"]
        self.rate_limits = self.config["RATE_LIMITS"]
        
        # Initialize Redis for rate limiting (fallback to memory)
        try:
            self.redis_client = redis.from_url("redis://localhost:6379/1")
            self.redis_client.ping()
            self.use_redis = True
        except:
            self.use_redis = False
            self.memory_store = {}
            logger.warning("Redis not available, using memory for rate limiting")
    
    async def dispatch(self, request: Request, call_next):
        """Enhanced security checks for existing application"""
        start_time = time.time()
        
        # 1. Rate limiting check
        if not await self._check_rate_limit(request):
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        
        # 2. Security headers and validation
        if not self._validate_request_security(request):
            raise HTTPException(status_code=400, detail="Security validation failed")
        
        # 3. Process request
        response = await call_next(request)
        
        # 4. Add security headers to response
        self._add_security_headers(response)
        
        # 5. Log security events
        self._log_security_event(request, response, time.time() - start_time)
        
        return response
    
    async def _check_rate_limit(self, request: Request) -> bool:
        """Enhanced rate limiting for existing endpoints"""
        client_ip = request.client.host
        path = request.url.path
        method = request.method
        
        # Determine rate limit based on endpoint
        rate_limit = self._get_rate_limit_for_endpoint(path, method)
        if not rate_limit:
            return True
        
        # Parse rate limit (e.g., "20/minute")
        limit, period = rate_limit.split("/")
        limit = int(limit)
        
        # Convert period to seconds
        period_seconds = {
            "second": 1,
            "minute": 60,
            "hour": 3600
        }.get(period, 60)
        
        # Check rate limit
        key = f"rate_limit:{client_ip}:{path}:{method}"
        
        if self.use_redis:
            return await self._redis_rate_limit(key, limit, period_seconds)
        else:
            return self._memory_rate_limit(key, limit, period_seconds)
    
    def _get_rate_limit_for_endpoint(self, path: str, method: str) -> Optional[str]:
        """Get rate limit for specific endpoint"""
        # Authentication endpoints
        if "/auth/login" in path:
            return self.rate_limits.get("AUTH_LOGIN")
        elif "/auth/register" in path:
            return self.rate_limits.get("AUTH_REGISTER")
        elif "/auth/password-reset" in path:
            return self.rate_limits.get("PASSWORD_RESET")
        
        # Payment endpoints
        elif "/payments/" in path:
            return self.rate_limits.get("PAYMENTS")
        
        # Notification endpoints
        elif "/notifications/" in path and "email" in path:
            return self.rate_limits.get("EMAIL_NOTIFICATIONS")
        elif "/notifications/" in path and "sms" in path:
            return self.rate_limits.get("SMS_NOTIFICATIONS")
        
        # Default API rate limit
        else:
            return self.rate_limits.get("API_GENERAL")
    
    async def _redis_rate_limit(self, key: str, limit: int, period_seconds: int) -> bool:
        """Redis-based rate limiting"""
        try:
            pipe = self.redis_client.pipeline()
            pipe.incr(key)
            pipe.expire(key, period_seconds)
            results = pipe.execute()
            
            current_count = results[0]
            return current_count <= limit
        except Exception as e:
            logger.error(f"Redis rate limiting error: {e}")
            return True  # Fail open
    
    def _memory_rate_limit(self, key: str, limit: int, period_seconds: int) -> bool:
        """Memory-based rate limiting (fallback)"""
        now = time.time()
        
        # Clean old entries
        self.memory_store = {
            k: v for k, v in self.memory_store.items()
            if now - v["timestamp"] < period_seconds
        }
        
        # Check current count
        if key not in self.memory_store:
            self.memory_store[key] = {"count": 1, "timestamp": now}
            return True
        
        entry = self.memory_store[key]
        if now - entry["timestamp"] >= period_seconds:
            # Reset window
            self.memory_store[key] = {"count": 1, "timestamp": now}
            return True
        else:
            # Increment count
            entry["count"] += 1
            return entry["count"] <= limit
    
    def _validate_request_security(self, request: Request) -> bool:
        """Enhanced request validation"""
        # 1. Check for common attack patterns
        user_agent = request.headers.get("user-agent", "").lower()
        if any(bot in user_agent for bot in ["sqlmap", "nikto", "nessus", "masscan"]):
            logger.warning(f"Suspicious user agent detected: {user_agent}")
            return False
        
        # 2. Validate content length
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 10 * 1024 * 1024:  # 10MB
            logger.warning(f"Large request detected: {content_length} bytes")
            return False
        
        # 3. Check for injection patterns in URL
        path = request.url.path.lower()
        if any(pattern in path for pattern in ["../", "..\\", "<script", "javascript:", "data:"]):
            logger.warning(f"Suspicious path detected: {path}")
            return False
        
        return True
    
    def _add_security_headers(self, response: Response):
        """Add security headers to response"""
        for header, value in self.security_headers.items():
            response.headers[header] = value
        
        # Remove server header for security
        if "server" in response.headers:
            del response.headers["server"]
    
    def _log_security_event(self, request: Request, response: Response, duration: float):
        """Log security-relevant events"""
        client_ip = request.client.host
        user_agent = request.headers.get("user-agent", "")
        path = request.url.path
        method = request.method
        status_code = response.status_code
        
        # Log failed authentication attempts
        if "/auth/" in path and status_code in [401, 403]:
            logger.warning(
                f"Failed auth attempt: IP={client_ip}, path={path}, "
                f"method={method}, status={status_code}, UA={user_agent}"
            )
        
        # Log slow requests (potential DoS)
        if duration > 5.0:  # 5 seconds
            logger.warning(
                f"Slow request: IP={client_ip}, path={path}, "
                f"duration={duration:.2f}s, status={status_code}"
            )
        
        # Log 5xx errors
        if 500 <= status_code < 600:
            logger.error(
                f"Server error: IP={client_ip}, path={path}, "
                f"method={method}, status={status_code}, duration={duration:.2f}s"
            )

class WebhookSecurityMiddleware(BaseHTTPMiddleware):
    """Enhanced webhook security for existing webhook handlers"""
    
    def __init__(self, app, webhook_secrets: Dict[str, str]):
        super().__init__(app)
        self.webhook_secrets = webhook_secrets
    
    async def dispatch(self, request: Request, call_next):
        """Validate webhook signatures"""
        if "/webhooks/" in request.url.path:
            if not await self._validate_webhook_signature(request):
                raise HTTPException(status_code=401, detail="Invalid webhook signature")
        
        return await call_next(request)
    
    async def _validate_webhook_signature(self, request: Request) -> bool:
        """Validate webhook signature for existing webhook endpoints"""
        path = request.url.path
        
        # Stripe webhook validation (existing handler)
        if "/webhooks/stripe" in path:
            return await self._validate_stripe_webhook(request)
        
        # Generic webhook validation
        signature = request.headers.get("x-signature")
        if not signature:
            return False
        
        # Get body for signature validation
        body = await request.body()
        
        # Validate signature (implement based on webhook provider)
        return self._validate_generic_signature(body, signature, path)
    
    async def _validate_stripe_webhook(self, request: Request) -> bool:
        """Validate Stripe webhook signature (enhance existing)"""
        stripe_signature = request.headers.get("stripe-signature")
        if not stripe_signature:
            return False
        
        # This would integrate with existing Stripe webhook validation
        # The existing StripeIntegrationService should handle this
        return True  # Delegate to existing service
    
    def _validate_generic_signature(self, body: bytes, signature: str, path: str) -> bool:
        """Validate generic webhook signature"""
        # Get secret for this webhook path
        secret = self.webhook_secrets.get(path)
        if not secret:
            return False
        
        # Calculate expected signature
        expected = hashlib.sha256(secret.encode() + body).hexdigest()
        return secrets.compare_digest(signature, expected)

def create_security_middleware_stack(app, environment: str = "production"):
    """Create enhanced security middleware stack for existing app"""
    
    # Get webhook secrets (would be configured per environment)
    webhook_secrets = {
        "/webhooks/stripe": "stripe_webhook_secret",  # From existing Stripe config
        "/webhooks/sendgrid": "sendgrid_webhook_secret",  # If needed
        "/webhooks/twilio": "twilio_webhook_secret"  # If needed
    }
    
    # Add enhanced security middleware
    app.add_middleware(EnhancedSecurityMiddleware, environment=environment)
    app.add_middleware(WebhookSecurityMiddleware, webhook_secrets=webhook_secrets)
    
    return app