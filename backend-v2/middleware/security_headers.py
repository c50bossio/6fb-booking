
import os
from fastapi import Request
from fastapi.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Comprehensive security headers middleware"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # HSTS Header
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
        # Content Security Policy - Environment-aware configuration
        is_development = os.getenv("ENVIRONMENT", "development").lower() in ["development", "dev", "local"]
        
        # Base CSP directives
        base_connect_src = "'self' https://api.stripe.com https://www.google-analytics.com https://www.googletagmanager.com"
        
        # Add localhost URLs for development
        if is_development:
            base_connect_src += " http://localhost:8000 http://127.0.0.1:8000 http://localhost:* http://127.0.0.1:* ws: wss:"
        
        csp_policy = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' "
            "https://js.stripe.com https://checkout.stripe.com "
            "https://www.googletagmanager.com https://connect.facebook.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https: https://www.google-analytics.com; "
            f"connect-src {base_connect_src}; "
            "frame-src 'self' https://js.stripe.com https://hooks.stripe.com; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        response.headers["Content-Security-Policy"] = csp_policy
        
        # Additional security headers
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=(), payment=(self)"
        
        # Remove server information
        response.headers.pop("Server", None)
        response.headers["Server"] = "BookedBarber/2.0"
        
        return response
