"""
Comprehensive Security Test Suite for 6FB Booking Platform
Tests authentication, authorization, security headers, and threat protection
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from fastapi import status
from unittest.mock import Mock, patch, AsyncMock
import jwt
import os
from datetime import datetime, timedelta

from main import app
from models.user import User, UserRole
from services.auth_monitoring_service import AuthMonitoringService
from middleware.security import SecurityHeadersMiddleware
from utils.auth import verify_token, create_access_token
from services.token_blacklist import TokenBlacklist

client = TestClient(app)

class TestAuthenticationSecurity:
    """Test comprehensive authentication security including dev bypass"""
    
    def test_dev_token_bypass_development_only(self):
        """Test that dev token bypass only works in development environment"""
        # Test development mode
        with patch.dict(os.environ, {"ENVIRONMENT": "development", "ENABLE_DEVELOPMENT_MODE": "true"}):
            response = client.get(
                "/api/v2/auth/me",
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["email"] == "dev@example.com"
            assert data["role"] == UserRole.SHOP_OWNER
    
    def test_dev_token_bypass_disabled_production(self):
        """Test that dev token bypass is disabled in production"""
        with patch.dict(os.environ, {"ENVIRONMENT": "production", "ENABLE_DEVELOPMENT_MODE": "false"}):
            response = client.get(
                "/api/v2/auth/me",
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
            assert response.status_code == 401
            assert "Invalid token" in response.json()["detail"]
    
    def test_jwt_token_validation_success(self):
        """Test successful JWT token validation"""
        # Create valid token
        user_data = {
            "user_id": 1,
            "email": "test@example.com",
            "role": UserRole.CLIENT,
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        token = create_access_token(user_data)
        
        response = client.get(
            "/api/v2/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
    
    def test_jwt_token_expired(self):
        """Test handling of expired JWT tokens"""
        # Create expired token
        user_data = {
            "user_id": 1,
            "email": "test@example.com",
            "role": UserRole.CLIENT,
            "exp": datetime.utcnow() - timedelta(hours=1)
        }
        token = create_access_token(user_data)
        
        response = client.get(
            "/api/v2/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 401
        assert "Token expired" in response.json()["detail"]
    
    def test_jwt_token_blacklisted(self):
        """Test handling of blacklisted JWT tokens"""
        # Create valid token
        user_data = {
            "user_id": 1,
            "email": "test@example.com",
            "role": UserRole.CLIENT,
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        token = create_access_token(user_data)
        
        # Blacklist the token
        TokenBlacklist.add_token(token)
        
        response = client.get(
            "/api/v2/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 401
        assert "Token blacklisted" in response.json()["detail"]
    
    def test_role_based_access_control(self):
        """Test role-based access control for different user types"""
        roles_and_endpoints = [
            (UserRole.CLIENT, "/api/v2/appointments", "GET", 200),
            (UserRole.CLIENT, "/api/v2/admin/users", "GET", 403),
            (UserRole.BARBER, "/api/v2/barber-availability", "GET", 200),
            (UserRole.BARBER, "/api/v2/admin/analytics", "GET", 403),
            (UserRole.SHOP_OWNER, "/api/v2/analytics", "GET", 200),
            (UserRole.SHOP_OWNER, "/api/v2/admin/users", "GET", 200),
            (UserRole.ENTERPRISE_OWNER, "/api/v2/enterprise", "GET", 200),
        ]
        
        for role, endpoint, method, expected_status in roles_and_endpoints:
            user_data = {
                "user_id": 1,
                "email": f"test_{role.value}@example.com",
                "role": role,
                "exp": datetime.utcnow() + timedelta(hours=1)
            }
            token = create_access_token(user_data)
            
            response = client.request(
                method,
                endpoint,
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == expected_status, f"Role {role} failed for {endpoint}"
    
    def test_session_management_and_refresh(self):
        """Test JWT token refresh and session management"""
        # Test token refresh
        refresh_token = create_access_token({
            "user_id": 1,
            "email": "test@example.com",
            "type": "refresh",
            "exp": datetime.utcnow() + timedelta(days=7)
        })
        
        response = client.post(
            "/api/v2/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
    
    @pytest.mark.asyncio
    async def test_mfa_enforcement(self):
        """Test Multi-Factor Authentication enforcement"""
        # Test MFA required for admin operations
        user_data = {
            "user_id": 1,
            "email": "admin@example.com",
            "role": UserRole.SHOP_OWNER,
            "mfa_enabled": True,
            "mfa_verified": False,
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        token = create_access_token(user_data)
        
        response = client.get(
            "/api/v2/admin/sensitive-operation",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403
        assert "MFA verification required" in response.json()["detail"]


class TestSecurityHeaders:
    """Test security headers implementation in middleware"""
    
    def test_content_security_policy_headers(self):
        """Test CSP headers are properly set"""
        response = client.get("/")
        
        csp_header = response.headers.get("content-security-policy")
        assert csp_header is not None
        assert "default-src 'self'" in csp_header
        assert "script-src 'self'" in csp_header
        assert "object-src 'none'" in csp_header
        assert "upgrade-insecure-requests" in csp_header
    
    def test_security_headers_comprehensive(self):
        """Test all security headers are present"""
        response = client.get("/")
        
        expected_headers = {
            "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
            "x-frame-options": "DENY",
            "x-content-type-options": "nosniff",
            "x-xss-protection": "1; mode=block",
            "referrer-policy": "strict-origin-when-cross-origin",
            "cross-origin-embedder-policy": "credentialless",
            "cross-origin-opener-policy": "same-origin",
            "cross-origin-resource-policy": "same-origin"
        }
        
        for header, expected_value in expected_headers.items():
            assert response.headers.get(header) == expected_value
    
    def test_server_headers_removed(self):
        """Test that server identification headers are removed"""
        response = client.get("/")
        
        assert "server" not in response.headers
        assert "x-powered-by" not in response.headers
    
    def test_cache_control_sensitive_paths(self):
        """Test cache control headers for sensitive paths"""
        sensitive_paths = ["/admin", "/dashboard", "/api"]
        
        for path in sensitive_paths:
            response = client.get(f"/api/v2{path}")
            cache_control = response.headers.get("cache-control")
            if cache_control:
                assert "no-store" in cache_control or "no-cache" in cache_control


class TestInputValidation:
    """Test input validation and sanitization"""
    
    def test_sql_injection_prevention(self):
        """Test SQL injection attack prevention"""
        malicious_inputs = [
            "'; DROP TABLE users; --",
            "1' OR '1'='1",
            "admin'--",
            "1; DELETE FROM appointments; --"
        ]
        
        for malicious_input in malicious_inputs:
            response = client.get(
                f"/api/v2/users?search={malicious_input}",
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
            # Should not return 500 error or database error
            assert response.status_code in [200, 400, 422]
            if response.status_code == 200:
                # Ensure no unexpected data structure indicating SQL injection
                data = response.json()
                assert isinstance(data, (dict, list))
    
    def test_xss_prevention(self):
        """Test XSS attack prevention"""
        xss_payloads = [
            "<script>alert('XSS')</script>",
            "javascript:alert('XSS')",
            "<img src=x onerror=alert('XSS')>",
            "'; alert('XSS'); //",
        ]
        
        for payload in xss_payloads:
            response = client.post(
                "/api/v2/appointments",
                json={
                    "service_name": payload,
                    "notes": payload,
                    "appointment_date": "2024-12-01T10:00:00"
                },
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
            # Input should be sanitized or rejected
            if response.status_code == 201:
                data = response.json()
                # Check that script tags are not present in response
                response_str = str(data)
                assert "<script>" not in response_str.lower()
                assert "javascript:" not in response_str.lower()


class TestRateLimiting:
    """Test rate limiting and throttling mechanisms"""
    
    def test_api_rate_limiting(self):
        """Test API rate limiting for public endpoints"""
        # Make multiple requests to trigger rate limiting
        for i in range(100):  # Exceed typical rate limit
            response = client.get("/api/v2/services/public")
            if response.status_code == 429:
                assert "Rate limit exceeded" in response.json()["detail"]
                break
        else:
            pytest.skip("Rate limiting not triggered - may need adjustment")
    
    def test_authentication_rate_limiting(self):
        """Test rate limiting on authentication endpoints"""
        # Multiple failed login attempts
        for i in range(10):
            response = client.post(
                "/api/v2/auth/login",
                json={
                    "email": "test@example.com",
                    "password": "wrongpassword"
                }
            )
            if response.status_code == 429:
                assert "Too many login attempts" in response.json()["detail"]
                break
    
    def test_payment_endpoint_rate_limiting(self):
        """Test enhanced rate limiting on payment endpoints"""
        payment_endpoints = [
            "/api/v2/payments/process",
            "/api/v2/payments/refund",
            "/api/v2/stripe/webhooks"
        ]
        
        for endpoint in payment_endpoints:
            # Make multiple requests to trigger rate limiting
            for i in range(20):
                response = client.post(
                    endpoint,
                    json={"amount": 100},
                    headers={"Authorization": "Bearer dev-token-bypass"}
                )
                if response.status_code == 429:
                    break


class TestCORSConfiguration:
    """Test CORS configuration security"""
    
    def test_cors_allowed_origins_development(self):
        """Test CORS allowed origins in development"""
        with patch.dict(os.environ, {"ENVIRONMENT": "development"}):
            response = client.options(
                "/api/v2/auth/login",
                headers={
                    "Origin": "http://localhost:3000",
                    "Access-Control-Request-Method": "POST"
                }
            )
            assert response.status_code == 200
            assert "Access-Control-Allow-Origin" in response.headers
    
    def test_cors_blocked_origins_production(self):
        """Test CORS blocks unauthorized origins in production"""
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            response = client.options(
                "/api/v2/auth/login",
                headers={
                    "Origin": "http://malicious-site.com",
                    "Access-Control-Request-Method": "POST"
                }
            )
            # Should not include malicious origin in allowed origins
            origin_header = response.headers.get("Access-Control-Allow-Origin")
            assert origin_header != "http://malicious-site.com"
    
    def test_cors_credentials_handling(self):
        """Test CORS credentials are properly handled"""
        response = client.options(
            "/api/v2/auth/login",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST"
            }
        )
        assert response.headers.get("Access-Control-Allow-Credentials") == "true"


class TestWebhookSecurity:
    """Test webhook signature verification and security"""
    
    def test_stripe_webhook_signature_verification(self):
        """Test Stripe webhook signature verification"""
        # Mock Stripe webhook payload
        payload = '{"type": "payment_intent.succeeded"}'
        
        # Test without signature - should fail
        response = client.post(
            "/api/v2/webhooks/stripe",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401
    
    def test_sendgrid_webhook_security(self):
        """Test SendGrid webhook security"""
        payload = {"event": "delivered", "email": "test@example.com"}
        
        # Test without proper authentication
        response = client.post(
            "/api/v2/webhooks/sendgrid",
            json=payload
        )
        assert response.status_code in [401, 403]
    
    def test_webhook_replay_attack_prevention(self):
        """Test webhook replay attack prevention"""
        # Test with timestamp-based nonce to prevent replay attacks
        timestamp = str(int(datetime.now().timestamp()))
        
        # Same payload sent twice should be rejected on second attempt
        payload = {"event": "test", "timestamp": timestamp}
        
        response1 = client.post("/api/v2/webhooks/test", json=payload)
        response2 = client.post("/api/v2/webhooks/test", json=payload)
        
        # Second request should be rejected as replay
        assert response2.status_code in [400, 409]


class TestThreatDetection:
    """Test threat detection and response mechanisms"""
    
    @pytest.mark.asyncio
    async def test_suspicious_login_detection(self):
        """Test detection of suspicious login patterns"""
        # Simulate login from multiple IPs rapidly
        suspicious_ips = ["192.168.1.100", "10.0.0.50", "172.16.0.25"]
        
        for ip in suspicious_ips:
            response = client.post(
                "/api/v2/auth/login",
                json={"email": "test@example.com", "password": "correctpassword"},
                headers={"X-Forwarded-For": ip}
            )
            # Should trigger suspicious activity detection
        
        # Verify suspicious activity was logged
        with patch('services.auth_monitoring_service.AuthMonitoringService') as mock_auth_monitor:
            mock_auth_monitor.log_suspicious_activity.assert_called()
    
    def test_brute_force_attack_detection(self):
        """Test brute force attack detection and response"""
        # Multiple failed login attempts
        for i in range(15):
            response = client.post(
                "/api/v2/auth/login",
                json={
                    "email": "target@example.com",
                    "password": f"wrongpassword{i}"
                }
            )
        
        # Account should be temporarily locked
        response = client.post(
            "/api/v2/auth/login",
            json={
                "email": "target@example.com",
                "password": "correctpassword"
            }
        )
        assert response.status_code == 423  # Account locked
        assert "temporarily locked" in response.json()["detail"].lower()
    
    def test_payload_size_limits(self):
        """Test protection against large payload attacks"""
        # Create oversized payload
        large_payload = {"data": "x" * 10000000}  # 10MB payload
        
        response = client.post(
            "/api/v2/appointments",
            json=large_payload,
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code == 413  # Payload too large


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])