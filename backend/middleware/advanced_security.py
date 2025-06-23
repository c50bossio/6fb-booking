"""
Advanced security middleware integrating all security features
"""
import time
import json
from typing import Callable, Dict, Any, Optional
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from utils.security import get_client_ip
from utils.secure_logging import get_secure_logger
from utils.input_validation import SQLInjectionValidator, URLValidator
from services.security_monitoring_enhanced import get_security_monitor
from config.database import get_db


class AdvancedSecurityMiddleware(BaseHTTPMiddleware):
    """
    Advanced security middleware that provides:
    - Real-time threat detection
    - Input validation
    - Request monitoring
    - Automatic threat response
    """
    
    def __init__(self, app, enable_monitoring: bool = True):
        super().__init__(app)
        self.logger = get_secure_logger("security.middleware")
        self.enable_monitoring = enable_monitoring
        
        # Endpoints that require special security attention
        self.high_security_endpoints = {
            '/api/v1/auth/',
            '/api/v1/payments/',
            '/api/v1/webhooks/',
            '/api/v1/users/',
            '/api/v1/admin/'
        }
        
        # Endpoints to skip monitoring (static files, health checks)
        self.skip_monitoring = {
            '/health',
            '/docs',
            '/redoc',
            '/openapi.json',
            '/static/',
            '/favicon.ico'
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Main middleware dispatch method"""
        start_time = time.time()
        
        # Skip monitoring for certain endpoints
        if self._should_skip_monitoring(request):
            return await call_next(request)
        
        # Get client information
        client_ip = get_client_ip(request)
        user_agent = request.headers.get('User-Agent', '')
        
        # Extract request data
        request_data = await self._extract_request_data(request)
        
        try:
            # Perform security checks
            await self._perform_security_checks(request, request_data, client_ip)
            
            # Process request
            response = await call_next(request)
            
            # Monitor successful request
            if self.enable_monitoring:
                await self._monitor_request(
                    request, request_data, client_ip, response.status_code, 
                    time.time() - start_time
                )
            
            # Add security headers
            self._add_security_headers(response, request)
            
            return response
            
        except HTTPException as e:
            # Log security violation
            self.logger.warning(
                f"Security check failed for {client_ip}: {e.detail}",
                extra={
                    'ip_address': client_ip,
                    'endpoint': str(request.url.path),
                    'user_agent': user_agent,
                    'status_code': e.status_code
                }
            )
            
            # Monitor failed request
            if self.enable_monitoring:
                await self._monitor_request(
                    request, request_data, client_ip, e.status_code,
                    time.time() - start_time, error=str(e.detail)
                )
            
            # Return error response
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail},
                headers={"X-Security-Block": "true"}
            )
        
        except Exception as e:
            # Log unexpected error
            self.logger.error(
                f"Unexpected error in security middleware: {str(e)}",
                extra={'ip_address': client_ip, 'endpoint': str(request.url.path)}
            )
            
            # Continue with request processing
            return await call_next(request)
    
    def _should_skip_monitoring(self, request: Request) -> bool:
        """Check if request should skip security monitoring"""
        path = request.url.path
        return any(skip_path in path for skip_path in self.skip_monitoring)
    
    async def _extract_request_data(self, request: Request) -> Dict[str, Any]:
        """Safely extract request data for analysis"""
        data = {
            'method': request.method,
            'path': request.url.path,
            'query_params': dict(request.query_params),
            'headers': dict(request.headers),
            'body': None
        }
        
        # Extract body for POST/PUT requests
        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                body = await request.body()
                if body:
                    # Try to parse as JSON
                    try:
                        data['body'] = json.loads(body.decode('utf-8'))
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        # Store as string if not JSON
                        data['body'] = body.decode('utf-8', errors='ignore')[:1000]  # Limit size
            except Exception:
                # If body reading fails, continue without it
                pass
        
        return data
    
    async def _perform_security_checks(
        self, 
        request: Request, 
        request_data: Dict[str, Any], 
        client_ip: str
    ):
        """Perform comprehensive security checks"""
        
        # 1. SQL Injection Detection
        await self._check_sql_injection(request_data, client_ip)
        
        # 2. XSS Detection
        await self._check_xss_attempts(request_data, client_ip)
        
        # 3. Path Traversal Detection
        await self._check_path_traversal(request_data, client_ip)
        
        # 4. Suspicious User Agent Detection
        await self._check_user_agent(request_data, client_ip)
        
        # 5. Rate Limit Validation (enhanced)
        await self._check_enhanced_rate_limits(request, client_ip)
        
        # 6. Authentication Security
        await self._check_authentication_security(request, request_data, client_ip)
    
    async def _check_sql_injection(self, request_data: Dict[str, Any], client_ip: str):
        """Check for SQL injection attempts"""
        check_values = []
        
        # Collect all string values from request
        if request_data.get('query_params'):
            check_values.extend([str(v) for v in request_data['query_params'].values()])
        
        if request_data.get('body') and isinstance(request_data['body'], dict):
            check_values.extend([str(v) for v in request_data['body'].values() if isinstance(v, (str, int, float))])
        elif request_data.get('body') and isinstance(request_data['body'], str):
            check_values.append(request_data['body'])
        
        # Check each value
        for value in check_values:
            try:
                SQLInjectionValidator.validate_query_string(value)
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Potential SQL injection detected"
                )
    
    async def _check_xss_attempts(self, request_data: Dict[str, Any], client_ip: str):
        """Check for XSS attempts"""
        import re
        
        xss_patterns = [
            r'<script[^>]*>',
            r'javascript\s*:',
            r'on\w+\s*=',
            r'<iframe[^>]*>',
            r'<object[^>]*>',
            r'<embed[^>]*>',
        ]
        
        check_values = []
        
        # Collect all string values
        if request_data.get('query_params'):
            check_values.extend([str(v) for v in request_data['query_params'].values()])
        
        if request_data.get('body') and isinstance(request_data['body'], dict):
            check_values.extend([str(v) for v in request_data['body'].values() if isinstance(v, (str, int, float))])
        elif request_data.get('body') and isinstance(request_data['body'], str):
            check_values.append(request_data['body'])
        
        # Check for XSS patterns
        for value in check_values:
            value_str = str(value).lower()
            for pattern in xss_patterns:
                if re.search(pattern, value_str, re.IGNORECASE):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Potential XSS attempt detected"
                    )
    
    async def _check_path_traversal(self, request_data: Dict[str, Any], client_ip: str):
        """Check for path traversal attempts"""
        import re
        
        path_traversal_patterns = [
            r'\.\./',
            r'\.\.\\',
            r'%2e%2e%2f',
            r'%2e%2e%5c',
        ]
        
        # Check URL path and query parameters
        path = request_data.get('path', '')
        for pattern in path_traversal_patterns:
            if re.search(pattern, path.lower()):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Path traversal attempt detected"
                )
        
        # Check query parameters
        if request_data.get('query_params'):
            for value in request_data['query_params'].values():
                value_str = str(value).lower()
                for pattern in path_traversal_patterns:
                    if re.search(pattern, value_str):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Path traversal attempt detected"
                        )
    
    async def _check_user_agent(self, request_data: Dict[str, Any], client_ip: str):
        """Check for suspicious user agents"""
        user_agent = request_data.get('headers', {}).get('user-agent', '').lower()
        
        if not user_agent:
            # Missing user agent is suspicious
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing User-Agent header"
            )
        
        suspicious_agents = [
            'sqlmap', 'nikto', 'nmap', 'masscan', 'burp', 'owasp',
            'scanner', 'hack', 'exploit', 'attack'
        ]
        
        for suspicious in suspicious_agents:
            if suspicious in user_agent:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Suspicious user agent detected"
                )
    
    async def _check_enhanced_rate_limits(self, request: Request, client_ip: str):
        """Enhanced rate limiting checks"""
        # This would integrate with the existing rate limiting system
        # but add more sophisticated detection for distributed attacks
        pass
    
    async def _check_authentication_security(
        self, 
        request: Request, 
        request_data: Dict[str, Any], 
        client_ip: str
    ):
        """Enhanced authentication security checks"""
        # Check for authentication endpoints
        if '/api/v1/auth/' in request_data.get('path', ''):
            # Additional checks for authentication requests
            
            # Check for suspicious login patterns
            if request_data.get('body') and isinstance(request_data['body'], dict):
                username = request_data['body'].get('username', '')
                password = request_data['body'].get('password', '')
                
                # Check for common attack usernames
                suspicious_usernames = [
                    'admin', 'administrator', 'root', 'test', 'guest',
                    'user', 'demo', 'sa', 'oracle', 'postgres'
                ]
                
                if username.lower() in suspicious_usernames:
                    self.logger.warning(
                        f"Suspicious login attempt with common username: {username}",
                        extra={'ip_address': client_ip, 'username': username}
                    )
                
                # Check for extremely weak passwords (common attack patterns)
                weak_passwords = [
                    'password', '123456', 'admin', 'root', 'test',
                    'guest', 'password123', 'admin123'
                ]
                
                if password.lower() in weak_passwords:
                    self.logger.warning(
                        f"Login attempt with weak password pattern",
                        extra={'ip_address': client_ip, 'username': username}
                    )
    
    async def _monitor_request(
        self,
        request: Request,
        request_data: Dict[str, Any],
        client_ip: str,
        status_code: int,
        duration: float,
        error: Optional[str] = None
    ):
        """Monitor request using security monitoring service"""
        try:
            # Get database session
            db = next(get_db())
            
            # Get security monitor
            security_monitor = get_security_monitor(db)
            
            # Extract user ID if available (from JWT token)
            user_id = None
            auth_header = request_data.get('headers', {}).get('authorization', '')
            if auth_header.startswith('Bearer '):
                # In production, decode JWT to get user ID
                # user_id = decode_jwt_user_id(auth_header)
                pass
            
            # Process the request
            security_monitor.process_request(
                ip_address=client_ip,
                endpoint=request_data['path'],
                method=request_data['method'],
                headers=request_data['headers'],
                query_params=request_data['query_params'],
                body_data=request_data.get('body'),
                user_id=user_id
            )
            
        except Exception as e:
            self.logger.error(f"Error in request monitoring: {str(e)}")
    
    def _add_security_headers(self, response: Response, request: Request):
        """Add additional security headers"""
        # Add security monitoring header
        response.headers["X-Security-Scan"] = "passed"
        
        # Add request ID for tracking
        response.headers["X-Request-ID"] = f"{int(time.time() * 1000)}"
        
        # Add security policy reminder
        if request.url.path.startswith('/api/'):
            response.headers["X-API-Security"] = "monitored"


class SecurityHeadersEnhancedMiddleware(BaseHTTPMiddleware):
    """Enhanced security headers middleware"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Get settings
        settings = request.app.state.settings
        
        # Basic security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Enhanced security headers for production
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
            response.headers["Expect-CT"] = "max-age=86400, enforce"
            
        # Content Security Policy
        if settings.SECURITY_HEADERS_STRICT:
            csp = "default-src 'self'; script-src 'self' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com https://*.sentry.io; frame-src 'self' https://js.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self'"
            if settings.CSP_REPORT_URI:
                csp += f"; report-uri {settings.CSP_REPORT_URI}"
            response.headers["Content-Security-Policy"] = csp
        
        # Feature Policy / Permissions Policy
        permissions_policy = "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(self), usb=()"
        response.headers["Permissions-Policy"] = permissions_policy
        
        return response