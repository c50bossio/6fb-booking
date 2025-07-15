"""
Production Security Configuration for BookedBarber V2
====================================================

This module provides production-grade security configurations optimized for 10,000+ concurrent users.
All configurations are hardened for production deployment with comprehensive security measures.

Key security features:
- Enhanced SSL/TLS settings
- Production-grade rate limiting
- Advanced CORS protection
- Security headers optimization
- Session security hardening
- Input validation and sanitization
- CSRF protection
- XSS prevention
- SQL injection protection
"""

import os
from typing import Dict, List, Any
from fastapi.security import HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware


class ProductionSecurityConfig:
    """Production security configuration class"""

    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.is_production = self.environment == "production"

    @property
    def ssl_settings(self) -> Dict[str, Any]:
        """SSL/TLS configuration for production"""
        return {
            "ssl_redirect": self.is_production,
            "ssl_verify": True,
            "ssl_cert_reqs": "required" if self.is_production else "none",
            "ssl_ca_certs": "/etc/ssl/certs/ca-certificates.crt",
            "ssl_check_hostname": True,
            "ssl_minimum_version": "TLSv1.2",
            "ssl_ciphers": "ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS",
            "hsts_max_age": 31536000 if self.is_production else 0,  # 1 year
            "hsts_include_subdomains": self.is_production,
            "hsts_preload": self.is_production,
        }

    @property
    def security_headers(self) -> Dict[str, str]:
        """Security headers for production deployment"""
        return {
            # Content Security Policy
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "img-src 'self' data: https: blob:; "
                "font-src 'self' https://fonts.gstatic.com; "
                "connect-src 'self' https://api.stripe.com https://www.google-analytics.com https://api.bookedbarber.com; "
                "frame-src 'self' https://js.stripe.com; "
                "object-src 'none'; "
                "base-uri 'self'; "
                "form-action 'self';"
            ),
            
            # HTTP Strict Transport Security
            "Strict-Transport-Security": f"max-age={self.ssl_settings['hsts_max_age']}; includeSubDomains; preload",
            
            # X-Frame-Options (prevent clickjacking)
            "X-Frame-Options": "DENY",
            
            # X-Content-Type-Options (prevent MIME sniffing)
            "X-Content-Type-Options": "nosniff",
            
            # X-XSS-Protection (XSS filtering)
            "X-XSS-Protection": "1; mode=block",
            
            # Referrer Policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # Permissions Policy (formerly Feature Policy)
            "Permissions-Policy": (
                "geolocation=(), "
                "microphone=(), "
                "camera=(), "
                "payment=(self), "
                "usb=(), "
                "magnetometer=(), "
                "gyroscope=(), "
                "speaker=()"
            ),
            
            # Cache Control for sensitive endpoints
            "Cache-Control": "no-store, no-cache, must-revalidate, private",
            "Pragma": "no-cache",
            "Expires": "0",
        }

    @property
    def cors_settings(self) -> Dict[str, Any]:
        """CORS settings for production"""
        allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
        
        return {
            "allow_origins": allowed_origins if self.is_production else ["*"],
            "allow_credentials": True,
            "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": [
                "Origin",
                "Content-Type",
                "Accept",
                "Authorization",
                "X-Requested-With",
                "X-CSRF-Token",
                "X-API-Key",
            ],
            "expose_headers": [
                "X-Total-Count",
                "X-Page-Count",
                "X-Rate-Limit-Remaining",
                "X-Rate-Limit-Reset",
            ],
            "max_age": 86400,  # 24 hours
        }

    @property
    def rate_limiting_config(self) -> Dict[str, Any]:
        """Production rate limiting configuration"""
        return {
            # Global rate limits (per IP)
            "global_per_minute": int(os.getenv("RATE_LIMIT_PER_MINUTE", "1200")),
            "global_per_hour": int(os.getenv("RATE_LIMIT_PER_HOUR", "36000")),
            "global_burst": int(os.getenv("RATE_LIMIT_BURST", "50")),
            
            # Authentication endpoints (stricter)
            "auth_per_minute": int(os.getenv("AUTH_RATE_LIMIT_PER_MINUTE", "20")),
            "auth_per_hour": int(os.getenv("AUTH_RATE_LIMIT_PER_HOUR", "100")),
            "auth_lockout_duration": int(os.getenv("AUTH_LOCKOUT_DURATION", "1800")),
            
            # API endpoints
            "api_per_minute": int(os.getenv("API_RATE_LIMIT_PER_MINUTE", "600")),
            "booking_per_minute": int(os.getenv("BOOKING_RATE_LIMIT_PER_MINUTE", "30")),
            "payment_per_minute": int(os.getenv("PAYMENT_RATE_LIMIT_PER_MINUTE", "10")),
            
            # Enterprise multiplier
            "enterprise_multiplier": int(os.getenv("ENTERPRISE_RATE_LIMIT_MULTIPLIER", "5")),
            
            # Storage configuration
            "storage_type": os.getenv("RATE_LIMIT_STORAGE", "redis"),
            "key_prefix": os.getenv("RATE_LIMIT_KEY_PREFIX", "ratelimit:prod:"),
        }

    @property
    def session_security(self) -> Dict[str, Any]:
        """Session security configuration for production"""
        return {
            "cookie_secure": self.is_production,  # HTTPS only in production
            "cookie_httponly": True,  # No JavaScript access
            "cookie_samesite": "strict",  # CSRF protection
            "max_age": int(os.getenv("SESSION_MAX_AGE", "3600")),  # 1 hour
            "secret_key": os.getenv("SECRET_KEY"),
            "algorithm": "HS256",
            "auto_error": True,
            "scheme_name": "Bearer",
        }

    @property
    def jwt_settings(self) -> Dict[str, Any]:
        """JWT configuration for production security"""
        return {
            "secret_key": os.getenv("JWT_SECRET_KEY"),
            "algorithm": os.getenv("JWT_ALGORITHM", "HS256"),
            "access_token_expire_minutes": int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")),
            "refresh_token_expire_days": int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")),
            "require_claims": ["exp", "iat", "sub"],
            "verify_expiration": True,
            "verify_signature": True,
            "require_expiration_time": True,
            "leeway": 0,  # No leeway for production
        }

    @property
    def password_policy(self) -> Dict[str, Any]:
        """Password policy for production"""
        return {
            "min_length": int(os.getenv("PASSWORD_MIN_LENGTH", "12")),
            "require_uppercase": os.getenv("PASSWORD_REQUIRE_UPPERCASE", "true").lower() == "true",
            "require_lowercase": os.getenv("PASSWORD_REQUIRE_LOWERCASE", "true").lower() == "true",
            "require_numbers": os.getenv("PASSWORD_REQUIRE_NUMBERS", "true").lower() == "true",
            "require_special_chars": os.getenv("PASSWORD_REQUIRE_SPECIAL_CHARS", "true").lower() == "true",
            "bcrypt_rounds": int(os.getenv("BCRYPT_ROUNDS", "14")),
            "max_attempts": 5,
            "lockout_duration": 1800,  # 30 minutes
        }

    @property
    def input_validation(self) -> Dict[str, Any]:
        """Input validation settings for production"""
        return {
            "max_request_size": 10 * 1024 * 1024,  # 10MB
            "max_json_size": 1 * 1024 * 1024,  # 1MB
            "max_form_size": 5 * 1024 * 1024,  # 5MB
            "max_file_size": 20 * 1024 * 1024,  # 20MB
            "allowed_file_types": ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx"],
            "sanitize_html": True,
            "validate_email": True,
            "validate_phone": True,
            "escape_sql": True,
            "strip_dangerous_chars": True,
        }

    def get_trusted_hosts(self) -> List[str]:
        """Get list of trusted hosts for production"""
        if not self.is_production:
            return ["*"]
        
        return [
            "bookedbarber.com",
            "www.bookedbarber.com",
            "app.bookedbarber.com",
            "api.bookedbarber.com",
            "*.bookedbarber.com",
        ]

    def get_security_middleware_stack(self) -> List[Dict[str, Any]]:
        """Get complete security middleware stack for production"""
        middleware_stack = []
        
        # HTTPS redirect (production only)
        if self.is_production:
            middleware_stack.append({
                "middleware": HTTPSRedirectMiddleware,
                "args": {},
            })
        
        # Trusted hosts
        middleware_stack.append({
            "middleware": TrustedHostMiddleware,
            "args": {"allowed_hosts": self.get_trusted_hosts()},
        })
        
        # CORS middleware
        middleware_stack.append({
            "middleware": CORSMiddleware,
            "args": self.cors_settings,
        })
        
        return middleware_stack

    def validate_production_config(self) -> List[str]:
        """Validate production configuration and return list of issues"""
        issues = []
        
        if not self.is_production:
            return issues
        
        # Check required environment variables
        required_vars = [
            "SECRET_KEY",
            "JWT_SECRET_KEY",
            "DATABASE_URL",
            "REDIS_URL",
            "ALLOWED_ORIGINS",
            "STRIPE_SECRET_KEY",
            "SENDGRID_API_KEY",
            "SENTRY_DSN",
        ]
        
        for var in required_vars:
            if not os.getenv(var):
                issues.append(f"Missing required environment variable: {var}")
            elif "CHANGE-REQUIRED" in os.getenv(var, ""):
                issues.append(f"Environment variable {var} still contains placeholder value")
        
        # Check SSL settings
        if not self.ssl_settings["ssl_redirect"]:
            issues.append("SSL redirect is disabled in production")
        
        # Check security headers
        if not self.security_headers.get("Strict-Transport-Security"):
            issues.append("HSTS header is not configured")
        
        # Check CORS settings
        if "*" in self.cors_settings["allow_origins"]:
            issues.append("CORS allows all origins - security risk")
        
        # Check rate limiting
        if self.rate_limiting_config["global_per_minute"] > 2000:
            issues.append("Global rate limit is too high for production")
        
        return issues


# Global instance for use throughout the application
production_security = ProductionSecurityConfig()


# Security utility functions
def get_security_headers_middleware():
    """Get security headers middleware for FastAPI"""
    async def add_security_headers(request, call_next):
        response = await call_next(request)
        
        # Add security headers
        for header, value in production_security.security_headers.items():
            response.headers[header] = value
        
        return response
    
    return add_security_headers


def validate_request_size(max_size: int = None):
    """Decorator to validate request size"""
    if max_size is None:
        max_size = production_security.input_validation["max_request_size"]
    
    def decorator(func):
        async def wrapper(request, *args, **kwargs):
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > max_size:
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=413,
                    detail=f"Request too large. Maximum size: {max_size} bytes"
                )
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator


def sanitize_input(data: str) -> str:
    """Sanitize user input for security"""
    import html
    import re
    
    # HTML escape
    data = html.escape(data)
    
    # Remove dangerous characters
    dangerous_chars = ['<', '>', '"', "'", '&', '\x00', '\x08', '\x0b', '\x0c', '\x0e', '\x1f']
    for char in dangerous_chars:
        data = data.replace(char, '')
    
    # Remove SQL injection patterns
    sql_patterns = [
        r'(\s*(union|select|insert|update|delete|drop|create|alter|exec|execute)\s+)',
        r'(\s*(or|and)\s+\d+\s*=\s*\d+)',
        r'(\s*;\s*)',
        r'(--|\#|/\*|\*/)',
    ]
    
    for pattern in sql_patterns:
        data = re.sub(pattern, '', data, flags=re.IGNORECASE)
    
    return data.strip()


def create_bearer_token():
    """Create HTTPBearer instance with production settings"""
    return HTTPBearer(
        scheme_name="Bearer",
        auto_error=True,
        bearerFormat="JWT",
        description="JWT token for API authentication"
    )


# Export key configurations for easy import
__all__ = [
    "ProductionSecurityConfig",
    "production_security",
    "get_security_headers_middleware",
    "validate_request_size",
    "sanitize_input",
    "create_bearer_token",
]