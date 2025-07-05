"""
SSL/HTTPS redirect middleware for production.
Ensures all traffic uses HTTPS and applies security headers.
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import RedirectResponse
import logging
from typing import Optional

from config.ssl_config import get_ssl_config

logger = logging.getLogger(__name__)


class SSLRedirectMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle SSL/HTTPS redirection and security headers.
    """
    
    def __init__(self, app, force_ssl: Optional[bool] = None):
        super().__init__(app)
        self.ssl_config = get_ssl_config()
        
        # Allow override for testing
        if force_ssl is not None:
            self.ssl_enabled = force_ssl
        else:
            self.ssl_enabled = self.ssl_config.ssl_enabled and self.ssl_config.ssl_redirect
        
        logger.info(f"SSL redirect middleware initialized: enabled={self.ssl_enabled}")
    
    async def dispatch(self, request: Request, call_next):
        # Check if request is already HTTPS
        is_https = self._is_https(request)
        
        # Redirect to HTTPS if needed
        if self.ssl_enabled and not is_https:
            return self._redirect_to_https(request)
        
        # Process request
        response = await call_next(request)
        
        # Add security headers
        if self.ssl_enabled or is_https:
            self._add_security_headers(response)
        
        return response
    
    def _is_https(self, request: Request) -> bool:
        """Check if request is using HTTPS."""
        # Check scheme
        if request.url.scheme == "https":
            return True
        
        # Check X-Forwarded-Proto header (for proxies/load balancers)
        forwarded_proto = request.headers.get("X-Forwarded-Proto", "").lower()
        if forwarded_proto == "https":
            return True
        
        # Check X-Forwarded-SSL header (some proxies)
        forwarded_ssl = request.headers.get("X-Forwarded-SSL", "").lower()
        if forwarded_ssl == "on":
            return True
        
        # Check CloudFlare header
        cf_visitor = request.headers.get("CF-Visitor", "")
        if '"scheme":"https"' in cf_visitor:
            return True
        
        return False
    
    def _redirect_to_https(self, request: Request) -> RedirectResponse:
        """Redirect HTTP request to HTTPS."""
        # Build HTTPS URL
        url = str(request.url)
        https_url = url.replace("http://", "https://", 1)
        
        # Handle custom port
        if self.ssl_config.ssl_port != 443:
            # Remove default HTTP port if present
            https_url = https_url.replace(":80/", f":{self.ssl_config.ssl_port}/")
            # Add custom port if not present
            if f":{self.ssl_config.ssl_port}" not in https_url:
                parts = https_url.split("/", 3)
                if len(parts) >= 3:
                    parts[2] = f"{parts[2]}:{self.ssl_config.ssl_port}"
                    https_url = "/".join(parts)
        
        logger.info(f"Redirecting HTTP to HTTPS: {url} -> {https_url}")
        
        # Use 301 permanent redirect for SEO
        return RedirectResponse(url=https_url, status_code=301)
    
    def _add_security_headers(self, response):
        """Add security headers to response."""
        # HSTS header
        if self.ssl_config.hsts_enabled:
            hsts_value = self.ssl_config.get_hsts_header()
            if hsts_value:
                response.headers["Strict-Transport-Security"] = hsts_value
        
        # Additional security headers for HTTPS connections
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Content Security Policy upgrade
        if "Content-Security-Policy" in response.headers:
            csp = response.headers["Content-Security-Policy"]
            if "upgrade-insecure-requests" not in csp:
                response.headers["Content-Security-Policy"] = f"{csp} upgrade-insecure-requests;"


class ProxyHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle proxy headers correctly.
    Processes X-Forwarded-* headers from trusted proxies.
    """
    
    def __init__(self, app, trusted_hosts: Optional[list] = None):
        super().__init__(app)
        self.trusted_hosts = trusted_hosts or ["127.0.0.1", "::1"]
    
    async def dispatch(self, request: Request, call_next):
        # Check if request is from trusted proxy
        client_host = request.client.host if request.client else None
        
        if client_host in self.trusted_hosts:
            # Update request with forwarded headers
            self._process_forwarded_headers(request)
        
        return await call_next(request)
    
    def _process_forwarded_headers(self, request: Request):
        """Process X-Forwarded-* headers."""
        # X-Forwarded-For (client IP)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Use the first IP in the chain
            client_ip = forwarded_for.split(",")[0].strip()
            # Update request client (this is a hack, but works for our needs)
            if hasattr(request, "_client"):
                request._client = (client_ip, request.client.port if request.client else 0)
        
        # X-Forwarded-Proto (protocol)
        forwarded_proto = request.headers.get("X-Forwarded-Proto")
        if forwarded_proto:
            # Update URL scheme (another hack)
            if hasattr(request.url, "_url"):
                request.url._url = request.url._url._replace(scheme=forwarded_proto.lower())
        
        # X-Forwarded-Host (original host)
        forwarded_host = request.headers.get("X-Forwarded-Host")
        if forwarded_host:
            # Update URL host
            if hasattr(request.url, "_url"):
                request.url._url = request.url._url._replace(netloc=forwarded_host)


# Usage in main.py:
"""
from middleware.ssl_redirect import SSLRedirectMiddleware, ProxyHeadersMiddleware

# Add proxy headers middleware first (if behind proxy)
if settings.behind_proxy:
    app.add_middleware(
        ProxyHeadersMiddleware,
        trusted_hosts=settings.trusted_proxy_hosts
    )

# Add SSL redirect middleware
app.add_middleware(SSLRedirectMiddleware)
"""