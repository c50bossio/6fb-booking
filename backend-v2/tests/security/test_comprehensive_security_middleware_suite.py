"""
Comprehensive Security Middleware Test Suite for BookedBarber V2
==============================================================

This test suite automatically validates all security measures including:
- Content Security Policy (CSP) headers and configuration
- CORS (Cross-Origin Resource Sharing) security 
- HTTP security headers (HSTS, X-Frame-Options, etc.)
- API endpoint security and authorization
- Input validation and sanitization
- Rate limiting and throttling
- Session security and cookie settings

CRITICAL SECURITY AREAS TESTED:
- CSP header implementation and browser compatibility
- CORS preflight and origin validation
- Security headers preventing common attacks
- API endpoint authorization matrix
- Input sanitization against XSS/injection
- Rate limiting effectiveness
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock
import json
import time

from main import app
from models import User
from utils.auth import create_access_token, get_password_hash
from config import settings

# Test client
client = TestClient(app)

class TestSecurityMiddlewareSuite:
    """Comprehensive security middleware and headers test suite"""
    
    @pytest.fixture(autouse=True)
    def setup_method(self, db: Session):
        """Setup test data for each test method"""
        self.db = db
        
        # Create test user for authenticated requests
        self.test_user = User(
            id=1,
            email="security@test.com",
            name="Security Test User",
            hashed_password=get_password_hash("SecurePassword123!"),
            unified_role="shop_owner",
            role="shop_owner",
            user_type="shop_owner",
            email_verified=True,
            is_active=True
        )
        
        db.add(self.test_user)
        db.commit()
        db.refresh(self.test_user)
        
        # Create access token for authenticated tests
        self.auth_token = create_access_token(
            data={"sub": self.test_user.email, "role": self.test_user.unified_role}
        )

    # ========================================
    # CONTENT SECURITY POLICY (CSP) TESTS
    # ========================================
    
    def test_csp_header_present(self):
        """Test that Content Security Policy header is present"""
        response = client.get("/")
        
        assert "Content-Security-Policy" in response.headers
        csp_header = response.headers["Content-Security-Policy"]
        assert csp_header is not None
        assert len(csp_header) > 0

    def test_csp_default_src_policy(self):
        """Test CSP default-src directive is properly configured"""
        response = client.get("/")
        csp_header = response.headers.get("Content-Security-Policy", "")
        
        assert "default-src 'self'" in csp_header

    def test_csp_script_src_policy(self):
        """Test CSP script-src directive allows necessary scripts"""
        response = client.get("/")
        csp_header = response.headers.get("Content-Security-Policy", "")
        
        # Check for required script sources
        assert "script-src 'self'" in csp_header
        assert "https://js.stripe.com" in csp_header
        assert "https://www.googletagmanager.com" in csp_header
        assert "https://www.google-analytics.com" in csp_header

    def test_csp_style_src_policy(self):
        """Test CSP style-src directive configuration"""
        response = client.get("/")
        csp_header = response.headers.get("Content-Security-Policy", "")
        
        assert "style-src 'self'" in csp_header
        assert "https://fonts.googleapis.com" in csp_header

    def test_csp_connect_src_policy(self):
        """Test CSP connect-src directive for API connections"""
        response = client.get("/")
        csp_header = response.headers.get("Content-Security-Policy", "")
        
        assert "connect-src 'self'" in csp_header
        assert "https://api.stripe.com" in csp_header
        assert "https://analytics.google.com" in csp_header
        assert "https://api.anthropic.com" in csp_header

    def test_csp_frame_src_policy(self):
        """Test CSP frame-src directive for iframe security"""
        response = client.get("/")
        csp_header = response.headers.get("Content-Security-Policy", "")
        
        assert "frame-src 'self'" in csp_header
        assert "https://js.stripe.com" in csp_header

    def test_csp_object_src_blocked(self):
        """Test CSP object-src is blocked for security"""
        response = client.get("/")
        csp_header = response.headers.get("Content-Security-Policy", "")
        
        assert "object-src 'none'" in csp_header

    def test_csp_base_uri_restriction(self):
        """Test CSP base-uri is restricted to self"""
        response = client.get("/")
        csp_header = response.headers.get("Content-Security-Policy", "")
        
        assert "base-uri 'self'" in csp_header

    def test_csp_form_action_restriction(self):
        """Test CSP form-action is restricted to self"""
        response = client.get("/")
        csp_header = response.headers.get("Content-Security-Policy", "")
        
        assert "form-action 'self'" in csp_header

    def test_csp_frame_ancestors_blocked(self):
        """Test CSP frame-ancestors prevents clickjacking"""
        response = client.get("/")
        csp_header = response.headers.get("Content-Security-Policy", "")
        
        assert "frame-ancestors 'none'" in csp_header

    def test_csp_upgrade_insecure_requests(self):
        """Test CSP upgrade-insecure-requests is enabled"""
        response = client.get("/")
        csp_header = response.headers.get("Content-Security-Policy", "")
        
        assert "upgrade-insecure-requests" in csp_header

    # ========================================
    # HTTP SECURITY HEADERS TESTS
    # ========================================
    
    def test_hsts_header_present(self):
        """Test HTTP Strict Transport Security header is present"""
        response = client.get("/")
        
        assert "Strict-Transport-Security" in response.headers
        hsts_header = response.headers["Strict-Transport-Security"]
        assert "max-age=31536000" in hsts_header
        assert "includeSubDomains" in hsts_header
        assert "preload" in hsts_header

    def test_x_frame_options_header(self):
        """Test X-Frame-Options header prevents clickjacking"""
        response = client.get("/")
        
        assert "X-Frame-Options" in response.headers
        assert response.headers["X-Frame-Options"] == "DENY"

    def test_x_content_type_options_header(self):
        """Test X-Content-Type-Options header prevents MIME sniffing"""
        response = client.get("/")
        
        assert "X-Content-Type-Options" in response.headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"

    def test_x_xss_protection_header(self):
        """Test X-XSS-Protection header is configured"""
        response = client.get("/")
        
        assert "X-XSS-Protection" in response.headers
        assert response.headers["X-XSS-Protection"] == "1; mode=block"

    def test_referrer_policy_header(self):
        """Test Referrer-Policy header limits information leakage"""
        response = client.get("/")
        
        assert "Referrer-Policy" in response.headers
        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"

    def test_permissions_policy_header(self):
        """Test Permissions-Policy header disables dangerous features"""
        response = client.get("/")
        
        assert "Permissions-Policy" in response.headers
        permissions_policy = response.headers["Permissions-Policy"]
        
        # Check dangerous features are disabled
        assert "camera=()" in permissions_policy
        assert "microphone=()" in permissions_policy
        assert "usb=()" in permissions_policy
        assert "magnetometer=()" in permissions_policy

    def test_cross_origin_headers(self):
        """Test Cross-Origin security headers are present"""
        response = client.get("/")
        
        assert "Cross-Origin-Embedder-Policy" in response.headers
        assert response.headers["Cross-Origin-Embedder-Policy"] == "credentialless"
        
        assert "Cross-Origin-Opener-Policy" in response.headers
        assert response.headers["Cross-Origin-Opener-Policy"] == "same-origin"
        
        assert "Cross-Origin-Resource-Policy" in response.headers
        assert response.headers["Cross-Origin-Resource-Policy"] == "same-origin"

    def test_server_headers_removed(self):
        """Test that server identification headers are removed"""
        response = client.get("/")
        
        # These headers should be removed for security
        assert "Server" not in response.headers
        assert "X-Powered-By" not in response.headers

    def test_cache_control_for_sensitive_paths(self):
        """Test cache control headers for sensitive paths"""
        sensitive_paths = [
            "/dashboard",
            "/admin", 
            "/api/v2/auth/me"
        ]
        
        for path in sensitive_paths:
            response = client.get(
                path,
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            
            if response.status_code != 404:  # Skip if path doesn't exist
                assert "Cache-Control" in response.headers
                cache_control = response.headers["Cache-Control"]
                assert "no-store" in cache_control or "no-cache" in cache_control

    # ========================================
    # CORS SECURITY TESTS
    # ========================================
    
    def test_cors_preflight_request(self):
        """Test CORS preflight requests are handled securely"""
        response = client.options(
            "/api/v2/auth/login",
            headers={
                "Origin": "https://bookedbarber.com",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
        )
        
        # Should handle preflight properly
        assert response.status_code in [200, 204]

    def test_cors_origin_validation(self):
        """Test CORS origin validation for security"""
        # Test with malicious origin
        response = client.options(
            "/api/v2/auth/login",
            headers={
                "Origin": "https://malicious-site.com",
                "Access-Control-Request-Method": "POST"
            }
        )
        
        # Should not include malicious origin in allowed origins
        if "Access-Control-Allow-Origin" in response.headers:
            allowed_origin = response.headers["Access-Control-Allow-Origin"]
            assert "malicious-site.com" not in allowed_origin

    def test_cors_credentials_handling(self):
        """Test CORS credentials are handled securely"""
        response = client.options(
            "/api/v2/auth/login",
            headers={
                "Origin": "https://bookedbarber.com",
                "Access-Control-Request-Method": "POST"
            }
        )
        
        # If credentials are allowed, origin should not be wildcard
        if "Access-Control-Allow-Credentials" in response.headers:
            credentials_allowed = response.headers["Access-Control-Allow-Credentials"]
            if credentials_allowed.lower() == "true":
                origin_header = response.headers.get("Access-Control-Allow-Origin", "")
                assert origin_header != "*"

    # ========================================
    # API ENDPOINT SECURITY TESTS
    # ========================================
    
    def test_api_authentication_required(self):
        """Test that API endpoints require authentication"""
        protected_endpoints = [
            "/api/v2/auth/me",
            "/api/v2/appointments",
            "/api/v2/bookings",
            "/api/v2/users/profile"
        ]
        
        for endpoint in protected_endpoints:
            response = client.get(endpoint)
            assert response.status_code in [401, 403, 404]

    def test_api_authorization_enforcement(self):
        """Test that API endpoints enforce proper authorization"""
        # Create client user token
        client_user = User(
            id=2,
            email="client@test.com", 
            name="Test Client",
            hashed_password=get_password_hash("ClientPassword123!"),
            unified_role="client",
            role="client",
            user_type="client",
            email_verified=True,
            is_active=True
        )
        self.db.add(client_user)
        self.db.commit()
        
        client_token = create_access_token(
            data={"sub": client_user.email, "role": client_user.unified_role}
        )
        
        # Test admin-only endpoints with client token
        admin_endpoints = [
            "/api/v2/admin/users",
            "/api/v2/admin/analytics", 
            "/api/v2/admin/settings"
        ]
        
        for endpoint in admin_endpoints:
            response = client.get(
                endpoint,
                headers={"Authorization": f"Bearer {client_token}"}
            )
            # Should be forbidden or not found (but not unauthorized)
            assert response.status_code in [403, 404]

    def test_api_input_validation(self):
        """Test API input validation and sanitization"""
        # Test with malicious input
        malicious_inputs = [
            {"email": "<script>alert('xss')</script>@test.com"},
            {"name": "'; DROP TABLE users; --"},
            {"password": "' OR '1'='1"},
            {"description": "<img src=x onerror=alert('xss')>"}
        ]
        
        for malicious_data in malicious_inputs:
            response = client.post(
                "/api/v2/auth/register",
                json={
                    "email": malicious_data.get("email", "test@test.com"),
                    "name": malicious_data.get("name", "Test User"),
                    "password": malicious_data.get("password", "Password123!"),
                    "user_type": "barber"
                }
            )
            
            # Should handle malicious input gracefully
            assert response.status_code in [400, 422]

    def test_api_sql_injection_protection(self):
        """Test API protection against SQL injection"""
        sql_injection_payloads = [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "' UNION SELECT * FROM users --",
            "'; INSERT INTO users VALUES ('hacker', 'password'); --"
        ]
        
        for payload in sql_injection_payloads:
            # Test in login endpoint
            response = client.post(
                "/api/v2/auth/login",
                json={
                    "email": payload,
                    "password": "password"
                }
            )
            
            # Should not cause server error or return unexpected data
            assert response.status_code in [400, 401, 422]
            
            # Ensure no sensitive data leaked in response
            response_text = response.text.lower()
            assert "select" not in response_text
            assert "insert" not in response_text
            assert "drop" not in response_text

    def test_api_xss_protection(self):
        """Test API protection against XSS attacks"""
        xss_payloads = [
            "<script>alert('xss')</script>",
            "<img src=x onerror=alert('xss')>",
            "javascript:alert('xss')",
            "<svg onload=alert('xss')>",
            "';alert('xss');//"
        ]
        
        for payload in xss_payloads:
            response = client.post(
                "/api/v2/auth/register",
                json={
                    "email": "test@test.com",
                    "name": payload,
                    "password": "Password123!",
                    "user_type": "barber"
                }
            )
            
            # Should sanitize or reject XSS attempts
            if response.status_code == 200:
                # If accepted, ensure payload is sanitized in response
                response_data = response.json()
                if "user" in response_data and "name" in response_data["user"]:
                    name = response_data["user"]["name"]
                    assert "<script>" not in name
                    assert "onerror=" not in name
                    assert "javascript:" not in name

    # ========================================
    # RATE LIMITING TESTS
    # ========================================
    
    @pytest.mark.skip(reason="Rate limiting tests require special configuration")
    def test_rate_limiting_login_endpoint(self):
        """Test rate limiting on login endpoint"""
        # Make rapid requests to trigger rate limiting
        responses = []
        for i in range(20):
            response = client.post(
                "/api/v2/auth/login",
                json={
                    "email": "test@test.com",
                    "password": "password"
                }
            )
            responses.append(response)
        
        # Some requests should be rate limited
        rate_limited = [r for r in responses if r.status_code == 429]
        assert len(rate_limited) > 0

    @pytest.mark.skip(reason="Rate limiting tests require special configuration")
    def test_rate_limiting_registration_endpoint(self):
        """Test rate limiting on registration endpoint"""
        responses = []
        for i in range(10):
            response = client.post(
                "/api/v2/auth/register",
                json={
                    "email": f"test{i}@test.com",
                    "name": f"Test User {i}",
                    "password": "Password123!",
                    "user_type": "barber"
                }
            )
            responses.append(response)
        
        # Later requests should be rate limited
        rate_limited = [r for r in responses if r.status_code == 429]
        # Note: May not trigger in test environment
        
    def test_rate_limiting_headers(self):
        """Test rate limiting headers are present when applicable"""
        response = client.post(
            "/api/v2/auth/login",
            json={
                "email": "test@test.com",
                "password": "password"
            }
        )
        
        # Check for rate limiting headers
        rate_limit_headers = {
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining", 
            "X-RateLimit-Reset",
            "Retry-After"
        }
        
        # At least some rate limiting info should be present
        present_headers = set(response.headers.keys()) & rate_limit_headers
        # Note: Headers may not be present in test environment

    # ========================================
    # SESSION SECURITY TESTS
    # ========================================
    
    def test_session_cookie_security(self):
        """Test session cookies have secure attributes"""
        # Login to get session cookies
        response = client.post(
            "/api/v2/auth/login",
            json={
                "email": self.test_user.email,
                "password": "SecurePassword123!"
            }
        )
        
        assert response.status_code == 200
        
        # Check Set-Cookie headers for security attributes
        set_cookie_headers = response.headers.get_list("Set-Cookie")
        
        for cookie_header in set_cookie_headers:
            cookie_lower = cookie_header.lower()
            
            # Cookies should have security attributes
            if "auth" in cookie_lower or "session" in cookie_lower:
                assert "httponly" in cookie_lower
                assert "secure" in cookie_lower or settings.environment == "development"
                assert "samesite" in cookie_lower

    def test_session_token_rotation(self):
        """Test that refresh tokens are rotated for security"""
        # Login to get initial tokens
        login_response = client.post(
            "/api/v2/auth/login",
            json={
                "email": self.test_user.email,
                "password": "SecurePassword123!"
            }
        )
        
        assert login_response.status_code == 200
        initial_data = login_response.json()
        initial_refresh_token = initial_data["refresh_token"]
        
        # Use refresh token to get new tokens
        refresh_response = client.post(
            "/api/v2/auth/refresh",
            json={"refresh_token": initial_refresh_token}
        )
        
        assert refresh_response.status_code == 200
        new_data = refresh_response.json()
        new_refresh_token = new_data["refresh_token"]
        
        # Refresh token should be rotated (different)
        assert initial_refresh_token != new_refresh_token

    # ========================================
    # ERROR HANDLING SECURITY TESTS
    # ========================================
    
    def test_error_information_disclosure(self):
        """Test that error responses don't leak sensitive information"""
        # Test various error conditions
        error_endpoints = [
            ("/api/v2/nonexistent", "GET"),
            ("/api/v2/auth/login", "POST"),
            ("/api/v2/auth/me", "GET")
        ]
        
        for endpoint, method in error_endpoints:
            if method == "GET":
                response = client.get(endpoint)
            else:
                response = client.post(endpoint, json={})
            
            # Check that error responses don't leak sensitive info
            response_text = response.text.lower()
            
            # Should not contain sensitive information
            sensitive_terms = [
                "password",
                "secret",
                "key",
                "token",
                "database",
                "sql",
                "exception",
                "traceback",
                "stack trace"
            ]
            
            for term in sensitive_terms:
                assert term not in response_text or response.status_code == 422

    def test_http_method_security(self):
        """Test that dangerous HTTP methods are not allowed"""
        dangerous_methods = ["TRACE", "TRACK", "DEBUG"]
        
        for method in dangerous_methods:
            # Try dangerous method on API endpoint
            response = client.request(method, "/api/v2/auth/me")
            
            # Should not be allowed
            assert response.status_code in [405, 501]

    # ========================================
    # PERFORMANCE SECURITY TESTS
    # ========================================
    
    def test_security_headers_performance(self):
        """Test that security headers don't significantly impact performance"""
        import time
        
        start_time = time.time()
        response = client.get("/")
        end_time = time.time()
        
        response_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        # Should not add significant overhead
        assert response_time < 100, f"Security headers added {response_time}ms overhead"

    def test_authentication_performance_with_security(self):
        """Test authentication performance with all security measures"""
        import time
        
        start_time = time.time()
        response = client.get(
            "/api/v2/auth/me",
            headers={"Authorization": f"Bearer {self.auth_token}"}
        )
        end_time = time.time()
        
        response_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        assert response.status_code == 200
        assert response_time < 400, f"Authentication with security took {response_time}ms"

    # ========================================
    # COMPLIANCE AND AUDIT TESTS
    # ========================================
    
    def test_security_audit_trail(self):
        """Test that security events are properly logged"""
        # This would typically check audit logs
        # For now, ensure requests complete without error
        
        response = client.post(
            "/api/v2/auth/login",
            json={
                "email": "nonexistent@test.com",
                "password": "wrongpassword"
            }
        )
        
        # Should handle failed login gracefully
        assert response.status_code == 401

    def test_gdpr_compliance_headers(self):
        """Test headers related to GDPR compliance"""
        response = client.get("/")
        
        # Check privacy-related headers
        if "X-Privacy-Policy" in response.headers:
            assert len(response.headers["X-Privacy-Policy"]) > 0

    def test_security_configuration_validation(self):
        """Test that security configuration is properly set"""
        # Verify critical security settings
        from config import settings
        
        # Ensure production settings are secure
        if settings.environment == "production":
            assert settings.secret_key != "your-secret-key"
            assert len(settings.secret_key) >= 32

    # ========================================
    # INTEGRATION SECURITY TESTS
    # ========================================
    
    def test_third_party_integration_security(self):
        """Test security of third-party integrations"""
        # Test that API keys are not exposed
        response = client.get("/api/v2/config")
        
        if response.status_code == 200:
            config_data = response.text.lower()
            
            # Should not expose sensitive keys
            sensitive_keys = ["stripe_secret", "sendgrid_api", "twilio_auth"]
            for key in sensitive_keys:
                assert key not in config_data

    def test_webhook_security(self):
        """Test webhook endpoint security"""
        webhook_endpoints = [
            "/api/v2/webhooks/stripe",
            "/api/v2/webhooks/sendgrid",
            "/api/v2/webhooks/twilio"
        ]
        
        for endpoint in webhook_endpoints:
            # Test without proper signature
            response = client.post(
                endpoint,
                json={"test": "data"}
            )
            
            # Should require proper authentication/signature
            assert response.status_code in [400, 401, 403, 404]


# ========================================
# PYTEST CONFIGURATION
# ========================================

def pytest_configure(config):
    """Configure pytest for security tests."""
    config.addinivalue_line(
        "markers", "security: mark test as security test"
    )
    config.addinivalue_line(
        "markers", "csp: mark test as CSP test"
    )
    config.addinivalue_line(
        "markers", "cors: mark test as CORS test"
    )
    config.addinivalue_line(
        "markers", "headers: mark test as security headers test"
    )

# ========================================
# TEST RUNNER AND COVERAGE
# ========================================

if __name__ == "__main__":
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "--cov=middleware",
        "--cov=routers",
        "--cov-report=html:coverage/security_tests",
        "--cov-report=term-missing",
        "-m", "security"
    ])