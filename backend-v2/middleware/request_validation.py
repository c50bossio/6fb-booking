"""
Request validation middleware for enhanced API security.
Provides comprehensive request validation, sanitization, and security headers.
"""

import json
import re
import time
from typing import Optional, Dict, Any, List, Set
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import logging
from datetime import datetime
import hashlib
import secrets

from utils.sanitization import sanitize_plain_text, sanitize_url
from utils.logging_config import get_audit_logger, generate_request_id

logger = logging.getLogger(__name__)
audit_logger = get_audit_logger()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # Content Security Policy
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data:",
            "connect-src 'self' https://api.stripe.com wss://",
            "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)
        
        # Remove server header
        if "Server" in response.headers:
            del response.headers["Server"]
        
        return response


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive request validation middleware.
    Validates and sanitizes all incoming requests.
    """
    
    def __init__(self, app, max_body_size: int = 10 * 1024 * 1024):  # 10MB default
        super().__init__(app)
        self.max_body_size = max_body_size
        self.sql_injection_patterns = [
            r"(\bunion\b.*\bselect\b|\bselect\b.*\bunion\b)",
            r"(;|'|\")\s*(drop|delete|truncate|update|insert)\s",
            r"(\bor\b|\band\b)\s*\d+\s*=\s*\d+",
            r"(--|#|\/\*|\*\/)",
            r"(xp_|sp_|exec\s|execute\s)",
            r"(script|javascript|vbscript):",
        ]
        self.path_traversal_patterns = [
            r"\.\./",
            r"\.\.\\"
        ]
        
    async def dispatch(self, request: Request, call_next):
        # Generate request ID for tracking
        request_id = generate_request_id()
        request.state.request_id = request_id
        
        # Start timing
        start_time = time.time()
        
        try:
            # Validate request
            await self._validate_request(request)
            
            # Process request
            response = await call_next(request)
            
            # Log successful request
            process_time = time.time() - start_time
            self._log_request(request, response.status_code, process_time, request_id)
            
            # Add request ID to response
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except HTTPException as e:
            # Log failed request
            process_time = time.time() - start_time
            self._log_request(request, e.status_code, process_time, request_id, error=str(e))
            
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail, "request_id": request_id}
            )
            
        except Exception as e:
            # Log unexpected error
            process_time = time.time() - start_time
            self._log_request(request, 500, process_time, request_id, error=str(e))
            logger.error(f"Unexpected error in request validation: {str(e)}")
            
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Internal server error", "request_id": request_id}
            )
    
    async def _validate_request(self, request: Request):
        """Validate incoming request for security threats."""
        
        # Validate HTTP method
        if request.method not in ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]:
            raise HTTPException(
                status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
                detail=f"Method {request.method} not allowed"
            )
        
        # Validate path
        self._validate_path(request.url.path)
        
        # Validate query parameters
        self._validate_query_params(request.query_params)
        
        # Validate headers
        self._validate_headers(request.headers)
        
        # Validate body for POST/PUT/PATCH
        if request.method in ["POST", "PUT", "PATCH"]:
            await self._validate_body(request)
    
    def _validate_path(self, path: str):
        """Validate URL path for security threats."""
        # Check for path traversal
        for pattern in self.path_traversal_patterns:
            if re.search(pattern, path, re.IGNORECASE):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid path: potential path traversal detected"
                )
        
        # Check path length
        if len(path) > 2048:
            raise HTTPException(
                status_code=status.HTTP_414_URI_TOO_LONG,
                detail="URI too long"
            )
    
    def _validate_query_params(self, query_params):
        """Validate query parameters for injection attacks."""
        for key, value in query_params.items():
            # Check parameter name
            if not re.match(r'^[a-zA-Z0-9_\-\[\]]+$', key):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid query parameter name: {key}"
                )
            
            # Check for SQL injection in value
            self._check_sql_injection(value)
            
            # Check length
            if len(value) > 1024:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Query parameter value too long: {key}"
                )
    
    def _validate_headers(self, headers):
        """Validate request headers."""
        # Check for required headers
        if "user-agent" not in headers:
            logger.warning("Request without User-Agent header")
        
        # Check header sizes
        for name, value in headers.items():
            if len(name) > 256 or len(value) > 8192:
                raise HTTPException(
                    status_code=status.HTTP_431_REQUEST_HEADER_FIELDS_TOO_LARGE,
                    detail="Request header too large"
                )
            
            # Check for header injection
            if '\n' in value or '\r' in value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid header value"
                )
    
    async def _validate_body(self, request: Request):
        """Validate request body."""
        # Check content type
        content_type = request.headers.get("content-type", "")
        
        if not content_type:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Content-Type header required"
            )
        
        # Read body
        body = await request.body()
        
        # Check body size
        if len(body) > self.max_body_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Request body too large. Maximum size: {self.max_body_size} bytes"
            )
        
        # Validate based on content type
        if "application/json" in content_type:
            await self._validate_json_body(body)
        elif "application/x-www-form-urlencoded" in content_type:
            await self._validate_form_body(body)
        elif "multipart/form-data" in content_type:
            # Multipart validation handled by FastAPI
            pass
        else:
            # Check for suspicious content in other types
            try:
                body_str = body.decode('utf-8')
                self._check_sql_injection(body_str)
            except UnicodeDecodeError:
                # Binary content, skip string validation
                pass
    
    async def _validate_json_body(self, body: bytes):
        """Validate JSON request body."""
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON in request body"
            )
        
        # Recursively validate JSON data
        self._validate_json_data(data)
    
    def _validate_json_data(self, data: Any, depth: int = 0):
        """Recursively validate JSON data structure."""
        # Prevent deep nesting attacks
        if depth > 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="JSON nesting too deep"
            )
        
        if isinstance(data, dict):
            # Check number of keys
            if len(data) > 1000:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Too many fields in JSON object"
                )
            
            for key, value in data.items():
                # Validate key
                if not isinstance(key, str):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="JSON keys must be strings"
                    )
                
                if len(key) > 256:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="JSON key too long"
                    )
                
                # Validate value
                self._validate_json_data(value, depth + 1)
                
        elif isinstance(data, list):
            # Check array size
            if len(data) > 10000:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="JSON array too large"
                )
            
            for item in data:
                self._validate_json_data(item, depth + 1)
                
        elif isinstance(data, str):
            # Check string length
            if len(data) > 1048576:  # 1MB
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="String value too long"
                )
            
            # Check for SQL injection
            self._check_sql_injection(data)
    
    async def _validate_form_body(self, body: bytes):
        """Validate form-encoded request body."""
        try:
            body_str = body.decode('utf-8')
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid encoding in form data"
            )
        
        # Parse form data
        params = {}
        for param in body_str.split('&'):
            if '=' in param:
                key, value = param.split('=', 1)
                params[key] = value
        
        # Validate each parameter
        for key, value in params.items():
            if len(key) > 256 or len(value) > 8192:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Form parameter too long"
                )
            
            self._check_sql_injection(value)
    
    def _check_sql_injection(self, value: str):
        """Check for potential SQL injection patterns."""
        if not value:
            return
        
        # Convert to lowercase for pattern matching
        value_lower = value.lower()
        
        for pattern in self.sql_injection_patterns:
            if re.search(pattern, value_lower, re.IGNORECASE):
                audit_logger.log_security_event(
                    "potential_sql_injection",
                    details={"pattern": pattern, "value_preview": value[:100]}
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid input detected"
                )
    
    def _log_request(self, request: Request, status_code: int, process_time: float, 
                     request_id: str, error: Optional[str] = None):
        """Log request details for monitoring and auditing."""
        log_data = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": status_code,
            "process_time": round(process_time, 3),
            "client_host": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
        }
        
        if error:
            log_data["error"] = error
            logger.warning(f"Request failed: {log_data}")
        else:
            logger.info(f"Request completed: {log_data}")


class APIKeyValidationMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive API key validation middleware for external integrations.
    
    Features:
    - Database-backed API key validation using existing APIKey model
    - Permission-based access control
    - Rate limiting per API key
    - IP whitelisting support
    - Usage tracking and analytics
    """
    
    def __init__(self, app, protected_paths: Optional[Set[str]] = None):
        super().__init__(app)
        self.protected_paths = protected_paths or {
            "/api/v1/webhooks",
            "/api/v1/internal",
            "/api/v1/external",
            "/api/v1/integrations",
        }
        
        # In-memory cache for API keys (production should use Redis)
        self.api_key_cache = {}
        self.rate_limit_cache = {}
        
        # Rate limits per key type (requests per minute)
        self.rate_limits = {
            'webhook': 200,    # Webhook endpoints (higher limit)
            'integration': 100, # Integration endpoints
            'internal': 500,   # Internal service calls
            'default': 50      # Default limit
        }
    
    async def dispatch(self, request: Request, call_next):
        # Check if path requires API key
        if not any(request.url.path.startswith(path) for path in self.protected_paths):
            return await call_next(request)
        
        # Extract API key from request
        api_key = self._extract_api_key(request)
        if not api_key:
            return self._unauthorized_response("API key required")
        
        # Validate API key against database
        key_info = await self._validate_api_key(api_key, request)
        if not key_info:
            return self._forbidden_response("Invalid or expired API key")
        
        # Check rate limits
        if not await self._check_rate_limit(api_key, key_info):
            return self._rate_limit_response()
        
        # Check IP whitelist if configured
        if not self._check_ip_whitelist(request, key_info):
            return self._forbidden_response("IP address not whitelisted")
        
        # Log API usage
        await self._log_api_usage(api_key, key_info, request)
        
        # Add key info to request state for use in endpoints
        request.state.api_key_info = key_info
        
        response = await call_next(request)
        
        # Add API key usage headers
        response.headers["X-API-Key-Usage"] = str(key_info.get('usage_count', 0))
        response.headers["X-API-Rate-Limit"] = str(self._get_rate_limit(key_info))
        
        return response
    
    def _extract_api_key(self, request: Request) -> Optional[str]:
        """Extract API key from request headers"""
        # Check Authorization header (preferred)
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            return auth_header[7:]  # Remove "Bearer " prefix
        
        # Check X-API-Key header (alternative)
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return api_key
        
        # Check query parameter (least secure, for backwards compatibility)
        return request.query_params.get("api_key")
    
    async def _validate_api_key(self, api_key: str, request: Request) -> Optional[Dict]:
        """Validate API key against database"""
        # Check cache first
        if api_key in self.api_key_cache:
            key_info = self.api_key_cache[api_key]
            # Check if cached entry is still valid (15 minute cache)
            if (datetime.utcnow() - key_info.get('cached_at', datetime.min)).seconds < 900:
                return key_info
        
        # Import here to avoid circular imports
        from database import get_db
        from models.api_key import APIKey, APIKeyStatus
        
        # Validate against database
        db = next(get_db())
        try:
            # Hash the API key for database lookup
            key_hash = hashlib.sha256(api_key.encode()).hexdigest()
            
            api_key_obj = db.query(APIKey).filter(
                APIKey.key_hash == key_hash,
                APIKey.status == APIKeyStatus.ACTIVE
            ).first()
            
            if not api_key_obj or not api_key_obj.is_active:
                return None
            
            # Update last used timestamp
            api_key_obj.last_used_at = datetime.utcnow()
            api_key_obj.usage_count += 1
            db.commit()
            
            # Create key info for caching
            key_info = {
                'id': api_key_obj.id,
                'name': api_key_obj.name,
                'user_id': api_key_obj.user_id,
                'key_type': api_key_obj.key_type,
                'permissions': api_key_obj.permissions,
                'allowed_ips': api_key_obj.allowed_ips or [],
                'usage_count': api_key_obj.usage_count,
                'cached_at': datetime.utcnow(),
                'rate_limit_override': api_key_obj.rate_limit_override
            }
            
            # Cache the key info
            self.api_key_cache[api_key] = key_info
            return key_info
            
        except Exception as e:
            logger.error(f"Error validating API key: {e}")
            return None
        finally:
            db.close()
    
    def _get_rate_limit(self, key_info: Dict) -> int:
        """Get rate limit for API key"""
        # Check for custom rate limit override
        if key_info.get('rate_limit_override'):
            return key_info['rate_limit_override']
        
        # Use rate limit based on key type
        key_type = key_info.get('key_type', 'default')
        return self.rate_limits.get(key_type, self.rate_limits['default'])
    
    async def _check_rate_limit(self, api_key: str, key_info: Dict) -> bool:
        """Check if API key is within rate limits"""
        max_requests = self._get_rate_limit(key_info)
        
        # Rate limiting key (per minute)
        current_minute = datetime.utcnow().strftime('%Y-%m-%d %H:%M')
        rate_key = f"{api_key}:{current_minute}"
        
        # Get current count
        current_count = self.rate_limit_cache.get(rate_key, 0)
        
        if current_count >= max_requests:
            logger.warning(f"Rate limit exceeded for API key: {api_key[:8]}...")
            return False
        
        # Increment counter
        self.rate_limit_cache[rate_key] = current_count + 1
        
        # Cleanup old entries periodically
        if len(self.rate_limit_cache) > 10000:
            # Keep only current minute entries
            self.rate_limit_cache = {
                k: v for k, v in self.rate_limit_cache.items()
                if current_minute in k
            }
        
        return True
    
    def _check_ip_whitelist(self, request: Request, key_info: Dict) -> bool:
        """Check if client IP is whitelisted for this API key"""
        allowed_ips = key_info.get('allowed_ips', [])
        
        # If no IP restrictions, allow all
        if not allowed_ips:
            return True
        
        client_ip = request.client.host
        return client_ip in allowed_ips
    
    async def _log_api_usage(self, api_key: str, key_info: Dict, request: Request):
        """Log API key usage for analytics and monitoring"""
        audit_logger.log_security_event(
            "api_key_usage",
            details={
                "api_key_id": key_info.get('id'),
                "api_key_name": key_info.get('name'),
                "api_key_prefix": api_key[:8] + "...",
                "endpoint": request.url.path,
                "method": request.method,
                "client_ip": request.client.host,
                "user_agent": request.headers.get('user-agent', ''),
                "user_id": key_info.get('user_id'),
                "key_type": key_info.get('key_type')
            }
        )
    
    def _unauthorized_response(self, message: str) -> JSONResponse:
        """Return 401 Unauthorized response"""
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "error": "Unauthorized",
                "message": message,
                "code": "API_KEY_REQUIRED"
            },
            headers={
                "WWW-Authenticate": "Bearer",
                "X-API-Error": "unauthorized"
            }
        )
    
    def _forbidden_response(self, message: str) -> JSONResponse:
        """Return 403 Forbidden response"""
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error": "Forbidden",
                "message": message,
                "code": "INSUFFICIENT_PERMISSIONS"
            },
            headers={
                "X-API-Error": "forbidden"
            }
        )
    
    def _rate_limit_response(self) -> JSONResponse:
        """Return 429 Too Many Requests response"""
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "Too Many Requests",
                "message": "API rate limit exceeded",
                "code": "RATE_LIMIT_EXCEEDED"
            },
            headers={
                "Retry-After": "60",
                "X-API-Error": "rate_limit"
            }
        )


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """
    CSRF protection for state-changing operations.
    """
    
    def __init__(self, app, cookie_name: str = "csrf_token", header_name: str = "X-CSRF-Token"):
        super().__init__(app)
        self.cookie_name = cookie_name
        self.header_name = header_name
        self.safe_methods = {"GET", "HEAD", "OPTIONS", "TRACE"}
    
    async def dispatch(self, request: Request, call_next):
        # Skip CSRF check for safe methods
        if request.method in self.safe_methods:
            return await call_next(request)
        
        # Skip for API endpoints (they should use API keys)
        if request.url.path.startswith("/api/v1/webhooks"):
            return await call_next(request)
        
        # Get CSRF token from cookie
        csrf_cookie = request.cookies.get(self.cookie_name)
        
        # Get CSRF token from header or form
        csrf_header = request.headers.get(self.header_name)
        
        # For form submissions, check form data
        if not csrf_header and request.headers.get("content-type", "").startswith("application/x-www-form-urlencoded"):
            body = await request.body()
            request._body = body  # Reset body for downstream
            # Parse form data for CSRF token
            # Implementation depends on your form structure
        
        # Validate CSRF token
        if not csrf_cookie or csrf_cookie != csrf_header:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "CSRF validation failed"}
            )
        
        response = await call_next(request)
        
        # Generate new CSRF token for GET requests
        if request.method == "GET" and request.url.path.endswith(("/", "/login", "/register")):
            csrf_token = secrets.token_urlsafe(32)
            response.set_cookie(
                key=self.cookie_name,
                value=csrf_token,
                httponly=True,
                samesite="strict",
                secure=True,  # Only over HTTPS in production
                max_age=3600  # 1 hour
            )
        
        return response