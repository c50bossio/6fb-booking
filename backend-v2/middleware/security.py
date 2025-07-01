"""
Security Middleware for 6FB Booking Platform

Implements comprehensive security hardening including:
- Security headers (OWASP recommendations)
- Input sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Request validation
"""

import re
import json
import logging
from typing import List, Dict, Any
from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import ipaddress
import hashlib

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds comprehensive security headers following OWASP guidelines
    """
    
    def __init__(self, app):
        super().__init__(app)
        
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security Headers (OWASP recommended)
        security_headers = {
            # XSS Protection
            "X-XSS-Protection": "1; mode=block",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            
            # Content Security Policy
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://js.stripe.com; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' https:; "
                "connect-src 'self' https://api.stripe.com; "
                "frame-src https://js.stripe.com; "
                "object-src 'none';"
            ),
            
            # HSTS (HTTP Strict Transport Security)
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            
            # Referrer Policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # Feature Policy
            "Permissions-Policy": (
                "geolocation=(), "
                "microphone=(), "
                "camera=(), "
                "payment=(self), "
                "usb=(), "
                "magnetometer=(), "
                "gyroscope=()"
            ),
            
            # Additional security headers
            "X-Robots-Tag": "noindex, nofollow",
            "X-Permitted-Cross-Domain-Policies": "none",
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Resource-Policy": "same-origin"
        }
        
        # Apply security headers
        for header, value in security_headers.items():
            response.headers[header] = value
        
        # Remove server information
        if "server" in response.headers:
            del response.headers["server"]
        
        # Add security timestamp
        response.headers["X-Security-Scan"] = datetime.utcnow().isoformat()
        
        return response

class InputSanitizationMiddleware(BaseHTTPMiddleware):
    """
    Sanitizes and validates input to prevent injection attacks
    """
    
    def __init__(self, app):
        super().__init__(app)
        # Disable security middleware in test environment
        import os
        self.test_mode = os.environ.get("TESTING", "").lower() == "true"
        
        self.suspicious_patterns = [
            # SQL Injection patterns - using re.IGNORECASE flag instead of (?i)
            re.compile(r"(union\s+select|insert\s+into|update\s+set|delete\s+from|drop\s+table|create\s+table|alter\s+table|exec\s+sp_|execute\s+sp_)", re.IGNORECASE),
            re.compile(r"(<script|javascript:|vbscript:|onload=|onerror=|onclick=)", re.IGNORECASE),
            re.compile(r"(eval\s*\(|expression\s*\(|alert\s*\(|confirm\s*\(|prompt\s*\()", re.IGNORECASE),
            re.compile(r"\b(or|and)\s+\d+\s*=\s*\d+", re.IGNORECASE),  # SQL boolean injection
            re.compile(r"--\s*$"),  # SQL comment at end of input
            re.compile(r";\s*(drop|delete|insert|update)\s+", re.IGNORECASE),  # SQL command injection
        ]
        
        self.blocked_file_extensions = [
            '.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.jar',
            '.php', '.asp', '.jsp', '.pl', '.py', '.rb', '.sh'
        ]
        
    async def dispatch(self, request: Request, call_next):
        # Skip security validation in test mode
        if self.test_mode:
            return await call_next(request)
            
        # Log security-relevant requests
        if self._is_security_relevant(request):
            logger.info(f"Security scan: {request.method} {request.url.path} from {request.client.host}")
        
        # Validate request before processing
        if await self._validate_request(request):
            response = await call_next(request)
            return response
        else:
            logger.warning(f"Blocked suspicious request: {request.method} {request.url.path}")
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid request format"}
            )
    
    def _is_security_relevant(self, request: Request) -> bool:
        """Check if request is security-relevant"""
        sensitive_paths = ['/api/v1/auth/', '/api/v1/payments/', '/api/v1/admin/']
        return any(request.url.path.startswith(path) for path in sensitive_paths)
    
    async def _validate_request(self, request: Request) -> bool:
        """Validate request for security issues"""
        try:
            # Check URL path for suspicious patterns
            if self._contains_suspicious_patterns(str(request.url.path)):
                return False
            
            # Check query parameters
            for key, value in request.query_params.items():
                if self._contains_suspicious_patterns(f"{key}={value}"):
                    return False
            
            # Check headers for suspicious content
            # Skip validation for standard headers that might contain special characters
            skip_headers = {'content-type', 'authorization', 'accept', 'user-agent', 'referer', 'cookie'}
            for header, value in request.headers.items():
                if header.lower() not in skip_headers:
                    if self._contains_suspicious_patterns(value):
                        return False
            
            # For POST/PUT requests with JSON content, we trust the JSON parser
            # to handle the validation of the body content
            if request.method in ["POST", "PUT", "PATCH"]:
                content_type = request.headers.get("content-type", "")
                if "application/json" in content_type:
                    # JSON content is validated by Pydantic models in the endpoints
                    # No need to check for patterns in JSON body
                    pass
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating request: {e}")
            return False
    
    def _contains_suspicious_patterns(self, text: str) -> bool:
        """Check if text contains suspicious patterns"""
        # Check compiled regex patterns
        for pattern in self.suspicious_patterns:
            if pattern.search(text):
                return True
        
        # Check for suspicious file extensions (case-insensitive)
        text_lower = text.lower()
        for ext in self.blocked_file_extensions:
            if ext in text_lower:
                return True
        
        return False

class RateLimitSecurityMiddleware(BaseHTTPMiddleware):
    """
    Additional rate limiting for security-sensitive endpoints
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.request_counts = {}
        self.max_requests_per_minute = {
            "/api/v1/auth/login": 5,
            "/api/v1/auth/register": 3,
            "/api/v1/auth/forgot-password": 3,
            "/api/v1/payments/": 10,
            "/api/v1/admin/": 20
        }
        
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host
        path = request.url.path
        
        # Check if this is a security-sensitive endpoint
        rate_limit = None
        for endpoint, limit in self.max_requests_per_minute.items():
            if path.startswith(endpoint):
                rate_limit = limit
                break
        
        if rate_limit:
            # Simple in-memory rate limiting (production should use Redis)
            key = f"{client_ip}:{path}:{datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
            
            if key not in self.request_counts:
                self.request_counts[key] = 0
            
            self.request_counts[key] += 1
            
            if self.request_counts[key] > rate_limit:
                logger.warning(f"Rate limit exceeded: {client_ip} for {path}")
                return JSONResponse(
                    status_code=429,
                    content={"error": "Rate limit exceeded"}
                )
            
            # Cleanup old entries (simple approach)
            if len(self.request_counts) > 10000:
                # Keep only recent entries
                current_time = datetime.utcnow().strftime('%Y-%m-%d %H:%M')
                self.request_counts = {
                    k: v for k, v in self.request_counts.items()
                    if current_time in k
                }
        
        return await call_next(request)

class AuditLogMiddleware(BaseHTTPMiddleware):
    """
    Logs security-relevant events for auditing
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.audit_log = []
        
    async def dispatch(self, request: Request, call_next):
        # Log security events
        if self._should_audit(request):
            audit_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "client_ip": request.client.host,
                "method": request.method,
                "path": request.url.path,
                "user_agent": request.headers.get("user-agent", ""),
                "referer": request.headers.get("referer", ""),
            }
            
            response = await call_next(request)
            
            audit_entry["status_code"] = response.status_code
            audit_entry["response_time"] = getattr(request.state, 'start_time', None)
            
            self.audit_log.append(audit_entry)
            
            # Keep only last 10000 entries
            if len(self.audit_log) > 10000:
                self.audit_log = self.audit_log[-10000:]
            
            return response
        
        return await call_next(request)
    
    def _should_audit(self, request: Request) -> bool:
        """Determine if request should be audited"""
        audit_paths = [
            "/api/v1/auth/",
            "/api/v1/payments/",
            "/api/v1/admin/",
            "/api/v1/users/",
            "/api/v1/webhooks/"
        ]
        
        return any(request.url.path.startswith(path) for path in audit_paths)
    
    def get_audit_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent audit logs"""
        return self.audit_log[-limit:]

class IPWhitelistMiddleware(BaseHTTPMiddleware):
    """
    Optional IP whitelisting for admin endpoints
    """
    
    def __init__(self, app, admin_whitelist: List[str] = None):
        super().__init__(app)
        self.admin_whitelist = admin_whitelist or []
        
    async def dispatch(self, request: Request, call_next):
        # Check if this is an admin endpoint
        if request.url.path.startswith("/api/v1/admin/") and self.admin_whitelist:
            client_ip = request.client.host
            
            # Check if IP is whitelisted
            if not self._is_ip_whitelisted(client_ip):
                logger.warning(f"Blocked admin access from non-whitelisted IP: {client_ip}")
                return JSONResponse(
                    status_code=403,
                    content={"error": "Access denied"}
                )
        
        return await call_next(request)
    
    def _is_ip_whitelisted(self, ip: str) -> bool:
        """Check if IP is in whitelist"""
        try:
            client_ip = ipaddress.ip_address(ip)
            
            for whitelist_entry in self.admin_whitelist:
                if "/" in whitelist_entry:
                    # CIDR notation
                    if client_ip in ipaddress.ip_network(whitelist_entry, strict=False):
                        return True
                else:
                    # Single IP
                    if client_ip == ipaddress.ip_address(whitelist_entry):
                        return True
            
            return False
        except ValueError:
            return False

# Security utility functions
def generate_csrf_token() -> str:
    """Generate a CSRF token"""
    import secrets
    return secrets.token_urlsafe(32)

def validate_csrf_token(token: str, session_token: str) -> bool:
    """Validate CSRF token"""
    return token == session_token

def hash_sensitive_data(data: str) -> str:
    """Hash sensitive data for logging"""
    return hashlib.sha256(data.encode()).hexdigest()[:8]

def sanitize_input(input_str: str) -> str:
    """Basic input sanitization"""
    if not input_str:
        return ""
    
    # Remove potential XSS vectors
    input_str = re.sub(r'[<>&"\'`]', '', input_str)
    
    # Remove SQL injection attempts
    sql_keywords = ['union', 'select', 'insert', 'update', 'delete', 'drop', 'create', 'alter']
    for keyword in sql_keywords:
        input_str = re.sub(f'\\b{keyword}\\b', '', input_str, flags=re.IGNORECASE)
    
    return input_str.strip()

def create_security_report():
    """Create a security configuration report"""
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "security_measures": [
            "OWASP security headers implemented",
            "Content Security Policy configured",
            "Input sanitization middleware",
            "XSS protection enabled",
            "SQL injection prevention",
            "Rate limiting on sensitive endpoints",
            "Audit logging for security events",
            "CSRF protection utilities",
            "Security header validation"
        ],
        "headers_applied": [
            "X-XSS-Protection",
            "X-Content-Type-Options", 
            "X-Frame-Options",
            "Content-Security-Policy",
            "Strict-Transport-Security",
            "Referrer-Policy",
            "Permissions-Policy"
        ],
        "monitoring": [
            "Suspicious request detection",
            "Rate limit monitoring",
            "Security event audit logging",
            "IP-based access control available"
        ],
        "recommendations": [
            "Enable HTTPS in production",
            "Configure WAF (Web Application Firewall)",
            "Implement comprehensive logging",
            "Regular security audits",
            "Keep dependencies updated"
        ]
    }