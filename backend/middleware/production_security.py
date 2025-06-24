"""
Production Security Middleware
Enhanced security features for production deployment
"""

import os
import time
import hashlib
import hmac
import logging
import ipaddress
from typing import Dict, List, Optional, Set
from collections import defaultdict, deque
from datetime import datetime, timedelta
from fastapi import Request, Response, HTTPException, status
from fastapi.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
import redis
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class SecurityConfig:
    """Production security configuration"""
    
    # Rate limiting configuration
    RATE_LIMIT_REQUESTS_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    AUTH_RATE_LIMIT_PER_MINUTE = int(os.getenv("AUTH_RATE_LIMIT_PER_MINUTE", "5"))
    API_RATE_LIMIT_PER_MINUTE = int(os.getenv("API_RATE_LIMIT_PER_MINUTE", "100"))
    
    # IP whitelist and blacklist
    IP_WHITELIST: Set[str] = set(os.getenv("IP_WHITELIST", "").split(",") if os.getenv("IP_WHITELIST") else [])
    IP_BLACKLIST: Set[str] = set(os.getenv("IP_BLACKLIST", "").split(",") if os.getenv("IP_BLACKLIST") else [])
    
    # Geographic restrictions
    ALLOWED_COUNTRIES: Set[str] = set(os.getenv("ALLOWED_COUNTRIES", "US,CA").split(","))
    
    # Request size limits
    MAX_REQUEST_SIZE = int(os.getenv("MAX_REQUEST_SIZE", "10485760"))  # 10MB
    MAX_JSON_SIZE = int(os.getenv("MAX_JSON_SIZE", "1048576"))  # 1MB
    
    # Security headers
    SECURITY_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    }
    
    # Suspicious patterns
    SUSPICIOUS_PATTERNS = [
        r"(?i)(union|select|insert|delete|drop|create|alter|exec|script)",  # SQL injection
        r"(?i)(<script|javascript:|vbscript:|onload=|onerror=)",  # XSS
        r"(?i)(\.\.\/|\.\.\\|\/etc\/|\/proc\/|\/sys\/)",  # Path traversal
        r"(?i)(cmd|powershell|bash|sh|exec|system)",  # Command injection
    ]
    
    # Known bot patterns
    BOT_PATTERNS = [
        r"(?i)(bot|crawler|spider|scraper|scanner)",
        r"(?i)(curl|wget|python-requests|go-http-client)",
        r"(?i)(nmap|sqlmap|nikto|dirb|gobuster)",
    ]

class RateLimiter:
    """In-memory rate limiter with Redis fallback"""
    
    def __init__(self, redis_client=None):
        self.redis_client = redis_client
        self.local_cache: Dict[str, deque] = defaultdict(deque)
        self.max_cache_size = 10000
    
    def is_allowed(self, key: str, limit: int, window: int = 60) -> bool:
        """Check if request is allowed based on rate limit"""
        now = time.time()
        window_start = now - window
        
        try:
            # Try Redis first if available
            if self.redis_client:
                return self._check_redis_rate_limit(key, limit, window, now)
            else:
                return self._check_local_rate_limit(key, limit, window_start, now)
        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            # Fail open in case of error
            return True
    
    def _check_redis_rate_limit(self, key: str, limit: int, window: int, now: float) -> bool:
        """Redis-based rate limiting"""
        pipe = self.redis_client.pipeline()
        pipe.zremrangebyscore(key, 0, now - window)
        pipe.zcard(key)
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, window)
        results = pipe.execute()
        
        current_requests = results[1]
        return current_requests < limit
    
    def _check_local_rate_limit(self, key: str, limit: int, window_start: float, now: float) -> bool:
        """Local memory-based rate limiting"""
        # Clean up old entries
        requests = self.local_cache[key]
        while requests and requests[0] < window_start:
            requests.popleft()
        
        # Check if under limit
        if len(requests) >= limit:
            return False
        
        # Add current request
        requests.append(now)
        
        # Prevent memory bloat
        if len(self.local_cache) > self.max_cache_size:
            # Remove oldest keys
            keys_to_remove = list(self.local_cache.keys())[:100]
            for key_to_remove in keys_to_remove:
                del self.local_cache[key_to_remove]
        
        return True

class IPSecurityChecker:
    """IP-based security checks"""
    
    @staticmethod
    def is_ip_allowed(ip: str) -> bool:
        """Check if IP is allowed"""
        try:
            ip_obj = ipaddress.ip_address(ip)
            
            # Check whitelist first
            if SecurityConfig.IP_WHITELIST:
                for allowed_ip in SecurityConfig.IP_WHITELIST:
                    if ip_obj in ipaddress.ip_network(allowed_ip, strict=False):
                        return True
                return False
            
            # Check blacklist
            for blocked_ip in SecurityConfig.IP_BLACKLIST:
                if ip_obj in ipaddress.ip_network(blocked_ip, strict=False):
                    return False
            
            return True
        except Exception as e:
            logger.warning(f"IP validation error for {ip}: {e}")
            return True  # Fail open
    
    @staticmethod
    def is_private_ip(ip: str) -> bool:
        """Check if IP is private/internal"""
        try:
            ip_obj = ipaddress.ip_address(ip)
            return ip_obj.is_private
        except:
            return False

class RequestValidator:
    """Request validation and sanitization"""
    
    @staticmethod
    def validate_request_size(request: Request) -> bool:
        """Validate request size"""
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                size = int(content_length)
                return size <= SecurityConfig.MAX_REQUEST_SIZE
            except ValueError:
                return False
        return True
    
    @staticmethod
    def contains_suspicious_patterns(text: str) -> bool:
        """Check for suspicious patterns in request data"""
        import re
        
        for pattern in SecurityConfig.SUSPICIOUS_PATTERNS:
            if re.search(pattern, text):
                return True
        return False
    
    @staticmethod
    def is_bot_request(user_agent: str) -> bool:
        """Check if request is from a bot"""
        import re
        
        if not user_agent:
            return True
        
        for pattern in SecurityConfig.BOT_PATTERNS:
            if re.search(pattern, user_agent):
                return True
        return False

class SecurityAuditLogger:
    """Security event logging"""
    
    def __init__(self):
        self.logger = logging.getLogger("security_audit")
        
        # Configure security logger
        if not self.logger.handlers:
            handler = logging.FileHandler("logs/security.log")
            formatter = logging.Formatter(
                '%(asctime)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
    
    def log_security_event(self, event_type: str, details: Dict, request: Request):
        """Log security event"""
        event_data = {
            "event_type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "ip": self._get_client_ip(request),
            "user_agent": request.headers.get("user-agent", ""),
            "path": str(request.url.path),
            "method": request.method,
            **details
        }
        
        self.logger.warning(f"Security Event: {event_data}")
    
    @staticmethod
    def _get_client_ip(request: Request) -> str:
        """Get client IP from request"""
        # Check for forwarded headers
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"

class ProductionSecurityMiddleware(BaseHTTPMiddleware):
    """Comprehensive production security middleware"""
    
    def __init__(self, app, redis_client=None):
        super().__init__(app)
        self.rate_limiter = RateLimiter(redis_client)
        self.audit_logger = SecurityAuditLogger()
        
        # Paths that require special rate limiting
        self.auth_paths = {"/api/v1/auth/login", "/api/v1/auth/token", "/api/v1/auth/register"}
        self.api_paths = {"/api/v1/"}
        self.public_paths = {"/health", "/api/health", "/favicon.ico", "/robots.txt"}
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        try:
            # Get client IP
            client_ip = self.audit_logger._get_client_ip(request)
            
            # 1. IP-based security checks
            if not IPSecurityChecker.is_ip_allowed(client_ip):
                self.audit_logger.log_security_event(
                    "blocked_ip",
                    {"reason": "IP not allowed", "ip": client_ip},
                    request
                )
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": "Access denied"}
                )
            
            # 2. Request size validation
            if not RequestValidator.validate_request_size(request):
                self.audit_logger.log_security_event(
                    "request_too_large",
                    {"content_length": request.headers.get("content-length")},
                    request
                )
                return JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={"detail": "Request entity too large"}
                )
            
            # 3. Bot detection (for non-API endpoints)
            user_agent = request.headers.get("user-agent", "")
            if (not str(request.url.path).startswith("/api/") and 
                RequestValidator.is_bot_request(user_agent)):
                self.audit_logger.log_security_event(
                    "bot_detected",
                    {"user_agent": user_agent},
                    request
                )
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": "Bot requests not allowed"}
                )
            
            # 4. Rate limiting
            path = str(request.url.path)
            
            # Skip rate limiting for public health checks
            if path not in self.public_paths:
                rate_limit_key = f"rate_limit:{client_ip}"
                
                # Determine rate limit based on path
                if any(auth_path in path for auth_path in self.auth_paths):
                    limit = SecurityConfig.AUTH_RATE_LIMIT_PER_MINUTE
                    rate_limit_key += ":auth"
                elif path.startswith("/api/v1/"):
                    limit = SecurityConfig.API_RATE_LIMIT_PER_MINUTE
                    rate_limit_key += ":api"
                else:
                    limit = SecurityConfig.RATE_LIMIT_REQUESTS_PER_MINUTE
                
                if not self.rate_limiter.is_allowed(rate_limit_key, limit):
                    self.audit_logger.log_security_event(
                        "rate_limit_exceeded",
                        {"limit": limit, "path": path},
                        request
                    )
                    return JSONResponse(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        content={"detail": "Rate limit exceeded"},
                        headers={"Retry-After": "60"}
                    )
            
            # 5. Request content validation (for POST/PUT requests)
            if request.method in ["POST", "PUT", "PATCH"]:
                try:
                    # Read and validate request body
                    body = await request.body()
                    if body:
                        body_str = body.decode('utf-8', errors='ignore')
                        
                        # Check for suspicious patterns
                        if RequestValidator.contains_suspicious_patterns(body_str):
                            self.audit_logger.log_security_event(
                                "suspicious_request_content",
                                {"method": request.method, "path": path},
                                request
                            )
                            return JSONResponse(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                content={"detail": "Invalid request content"}
                            )
                        
                        # Validate JSON size if content-type is JSON
                        content_type = request.headers.get("content-type", "")
                        if "application/json" in content_type and len(body) > SecurityConfig.MAX_JSON_SIZE:
                            return JSONResponse(
                                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                                content={"detail": "JSON payload too large"}
                            )
                    
                    # Restore request body for downstream processing
                    async def receive():
                        return {"type": "http.request", "body": body}
                    
                    request._receive = receive
                
                except Exception as e:
                    logger.error(f"Error validating request content: {e}")
            
            # 6. Process request
            response = await call_next(request)
            
            # 7. Add security headers
            for header, value in SecurityConfig.SECURITY_HEADERS.items():
                response.headers[header] = value
            
            # 8. Add processing time header (for monitoring)
            process_time = time.time() - start_time
            response.headers["X-Process-Time"] = str(process_time)
            
            # 9. Log successful request (if enabled)
            if os.getenv("LOG_ALL_REQUESTS", "false").lower() == "true":
                self.audit_logger.log_security_event(
                    "request_processed",
                    {
                        "status_code": response.status_code,
                        "process_time": process_time,
                        "method": request.method,
                        "path": path
                    },
                    request
                )
            
            return response
            
        except Exception as e:
            logger.error(f"Security middleware error: {e}")
            self.audit_logger.log_security_event(
                "middleware_error",
                {"error": str(e)},
                request
            )
            
            # Return generic error to avoid information disclosure
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Internal server error"}
            )

def setup_security_headers_middleware(app):
    """Add security headers to all responses"""
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        
        # Add basic security headers
        for header, value in SecurityConfig.SECURITY_HEADERS.items():
            response.headers[header] = value
        
        return response

def create_security_middleware(redis_client=None):
    """Factory function to create security middleware"""
    return ProductionSecurityMiddleware(redis_client=redis_client)

# CORS configuration for production
PRODUCTION_CORS_CONFIG = {
    "allow_origins": os.getenv("ALLOWED_ORIGINS", "").split(","),
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": [
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "X-Requested-With",
        "X-CSRF-Token",
    ],
    "expose_headers": ["X-Process-Time"],
    "max_age": 86400,  # 24 hours
}