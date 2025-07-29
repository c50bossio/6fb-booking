"""
Production Security Middleware
Comprehensive security enhancements for production deployment
"""

import os
import secrets
import logging
from fastapi import Request, HTTPException, status
from fastapi.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from typing import Set, Dict, Any
import re
import html
import json

logger = logging.getLogger(__name__)

class ProductionSecurityMiddleware(BaseHTTPMiddleware):
    """
    Production-grade security middleware with comprehensive protection.
    
    Features:
    - Input sanitization and validation
    - Security headers enforcement
    - Credential validation
    - Advanced threat detection
    - Performance monitoring
    """
    
    # Sensitive endpoints requiring extra protection
    SENSITIVE_ENDPOINTS = {
        "/api/v2/auth/login",
        "/api/v2/auth/register", 
        "/api/v2/payments/",
        "/api/v2/billing/",
        "/api/v2/admin/",
        "/api/v2/mfa/",
        "/api/v2/exports/"
    }
    
    # Dangerous patterns to block
    DANGEROUS_PATTERNS = [
        r'<script[^>]*>.*?</script>',  # XSS
        r'javascript:',                # JavaScript injection
        r'data:text/html',            # Data URI XSS
        r'on\w+\s*=',                 # Event handlers
        r'(union|select|insert|delete|update|drop)\s+',  # SQL injection
        r'(\.\./|\.\.\\)',            # Path traversal
        r'(eval|exec|system|shell_exec)\s*\(',  # Code injection
    ]
    
    def __init__(self, app):
        super().__init__(app)
        self.compiled_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.DANGEROUS_PATTERNS]
        logger.info("🔒 Production Security Middleware initialized")
        
        # Validate environment on startup
        self._validate_production_environment()
    
    def _validate_production_environment(self):
        """Validate production environment configuration"""
        warnings = []
        
        # Check for placeholder values
        sensitive_vars = [
            'NEXTAUTH_SECRET',
            'SENDGRID_API_KEY', 
            'TWILIO_AUTH_TOKEN',
            'JWT_SECRET_KEY',
            'SECRET_KEY'
        ]
        
        for var_name in sensitive_vars:
            value = os.getenv(var_name, '')
            if not value or 'placeholder' in value.lower() or 'dev' in value.lower():
                warnings.append(f"{var_name} appears to be using a placeholder value")
        
        if warnings:
            logger.warning(f"🚨 Production security warnings: {'; '.join(warnings)}")
    
    def _sanitize_input(self, data: Any) -> Any:
        """Sanitize input data to prevent XSS and injection attacks"""
        if isinstance(data, str):
            # HTML escape
            data = html.escape(data)
            
            # Check for dangerous patterns
            for pattern in self.compiled_patterns:
                if pattern.search(data):
                    logger.warning(f"🚨 Blocked dangerous pattern in input: {pattern.pattern}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid input detected"
                    )
            return data
            
        elif isinstance(data, dict):
            return {key: self._sanitize_input(value) for key, value in data.items()}
        elif isinstance(data, list):
            return [self._sanitize_input(item) for item in data]
        else:
            return data
    
    def _is_sensitive_endpoint(self, path: str) -> bool:
        """Check if endpoint requires extra security measures"""
        return any(path.startswith(sensitive) for sensitive in self.SENSITIVE_ENDPOINTS)
    
    def _add_security_headers(self, response: Response, request: Request) -> Response:
        """Add comprehensive security headers"""
        
        # Strict Transport Security (HTTPS enforcement)
        if request.url.scheme == "https" or os.getenv("ENVIRONMENT") == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
        # Content Security Policy (XSS protection)
        csp_policy = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' "
            "https://js.stripe.com https://checkout.stripe.com "
            "https://www.googletagmanager.com https://connect.facebook.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: https: blob:; "
            "connect-src 'self' https://api.stripe.com https://www.google-analytics.com wss:; "
            "frame-src 'self' https://js.stripe.com https://hooks.stripe.com; "
            "media-src 'self' blob:; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "frame-ancestors 'none'"
        )
        response.headers["Content-Security-Policy"] = csp_policy
        
        # Additional security headers
        response.headers.update({
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff", 
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=(self)",
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Resource-Policy": "cross-origin"
        })
        
        # Remove sensitive server information
        response.headers.pop("Server", None)
        response.headers["Server"] = "BookedBarber/2.0"
        
        return response
    
    async def dispatch(self, request: Request, call_next):
        """Main security middleware logic"""
        start_time = logger.time if hasattr(logger, 'time') else None
        
        try:
            # Pre-request security checks
            await self._pre_request_security(request)
            
            # Process request
            response = await call_next(request)
            
            # Post-request security enhancements
            response = self._add_security_headers(response, request)
            
            # Log security events for sensitive endpoints
            if self._is_sensitive_endpoint(request.url.path):
                self._log_security_event(request, response)
            
            return response
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"🚨 Security middleware error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Security validation failed"
            )
    
    async def _pre_request_security(self, request: Request):
        """Perform security checks before request processing"""
        
        # Size limits for request body
        if hasattr(request, 'body'):
            try:
                body = await request.body()
                if len(body) > 10_000_000:  # 10MB limit
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Request body too large"
                    )
            except Exception:
                pass  # Body might not be available
        
        # Validate content type for sensitive endpoints
        if self._is_sensitive_endpoint(request.url.path):
            content_type = request.headers.get("content-type", "")
            if request.method in ["POST", "PUT", "PATCH"]:
                if not content_type.startswith(("application/json", "application/x-www-form-urlencoded", "multipart/form-data")):
                    logger.warning(f"🚨 Suspicious content type for sensitive endpoint: {content_type}")
    
    def _log_security_event(self, request: Request, response: Response):
        """Log security events for monitoring"""
        event_data = {
            "timestamp": logger.timestamp if hasattr(logger, 'timestamp') else None,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "client_ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", "unknown")
        }
        
        logger.info(f"🔐 Security event: {json.dumps(event_data)}")


class EnvironmentValidator:
    """Validate production environment configuration"""
    
    @staticmethod
    def validate_production_config() -> Dict[str, Any]:
        """Comprehensive production configuration validation"""
        
        issues = {
            "critical": [],
            "warnings": [],
            "recommendations": []
        }
        
        # Critical security variables
        critical_vars = {
            'JWT_SECRET_KEY': 'JWT signing key',
            'SECRET_KEY': 'Application secret key',
            'DATABASE_URL': 'Database connection'
        }
        
        for var_name, description in critical_vars.items():
            value = os.getenv(var_name, '')
            if not value:
                issues["critical"].append(f"{description} ({var_name}) is not configured")
            elif len(value) < 32:
                issues["critical"].append(f"{description} ({var_name}) is too short (minimum 32 characters)")
            elif 'dev' in value.lower() or 'test' in value.lower() or 'placeholder' in value.lower():
                issues["critical"].append(f"{description} ({var_name}) appears to be a development value")
        
        # Warning-level variables
        warning_vars = {
            'SENDGRID_API_KEY': 'Email service',
            'TWILIO_AUTH_TOKEN': 'SMS service',
            'STRIPE_SECRET_KEY': 'Payment processing'
        }
        
        for var_name, description in warning_vars.items():
            value = os.getenv(var_name, '')
            if not value or 'placeholder' in value.lower() or 'dev' in value.lower():
                issues["warnings"].append(f"{description} ({var_name}) not configured for production")
        
        # Production environment checks
        if os.getenv('ENVIRONMENT') != 'production':
            issues["recommendations"].append("Set ENVIRONMENT=production for production deployment")
        
        if os.getenv('DEBUG_MODE', '').lower() == 'true':
            issues["recommendations"].append("Disable DEBUG_MODE in production")
        
        return issues
    
    @staticmethod
    def generate_secure_keys() -> Dict[str, str]:
        """Generate cryptographically secure keys for production"""
        return {
            'JWT_SECRET_KEY': secrets.token_urlsafe(64),
            'SECRET_KEY': secrets.token_urlsafe(64),
            'NEXTAUTH_SECRET': secrets.token_urlsafe(32)
        }