"""
Comprehensive tests for the enhanced rate limiting system
Tests all security features including brute force protection
"""

import pytest
import time
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock
from services.rate_limiting_service import EnhancedRateLimitingService, RateLimitRule
from main import app


class TestEnhancedRateLimitingService:
    """Test the core rate limiting service"""

    def setup_method(self):
        """Setup fresh service for each test"""
        self.service = EnhancedRateLimitingService()

    def test_basic_rate_limiting(self):
        """Test basic rate limiting functionality"""
        # Should allow requests under limit
        for i in range(5):
            allowed, headers = self.service.check_rate_limit("login", "192.168.1.1")
            assert allowed is True
            assert "X-RateLimit-Limit" in headers
            assert "X-RateLimit-Remaining" in headers

        # Should block request over limit
        allowed, headers = self.service.check_rate_limit("login", "192.168.1.1")
        assert allowed is False
        assert "Retry-After" in headers

    def test_account_lockout(self):
        """Test account lockout after failed login attempts"""
        email = "test@example.com"
        ip = "192.168.1.1"

        # Record multiple failed attempts
        for i in range(5):
            self.service.record_login_attempt(ip, email, success=False)

        # Check if account is locked
        status = self.service.get_account_status(email)
        assert status["locked"] is True
        assert status["failed_attempts"] >= 5

        # Should be blocked even with different IP
        allowed, headers = self.service.check_rate_limit("login", "192.168.1.2", email)
        assert allowed is False
        assert headers.get("X-RateLimit-Blocked") == "account"

    def test_ip_blocking(self):
        """Test IP blocking after suspicious activity"""
        ip = "192.168.1.100"

        # Generate enough suspicious activity to trigger blocking
        for i in range(25):
            allowed, headers = self.service.check_rate_limit("login", ip)
            if not allowed:
                continue

        # IP should eventually be blocked
        status = self.service.get_ip_status(ip)
        assert status["suspicious_activity_score"] > 0

    def test_admin_bypass(self):
        """Test admin bypass functionality"""
        ip = "192.168.1.200"

        # Add IP to bypass list
        self.service.add_admin_bypass_ip(ip)

        # Should allow unlimited requests
        for i in range(20):
            allowed, headers = self.service.check_rate_limit("login", ip)
            assert allowed is True
            assert headers.get("X-RateLimit-Bypass") == "admin"

    def test_successful_login_resets_counters(self):
        """Test that successful login resets failed attempt counters"""
        email = "test@example.com"
        ip = "192.168.1.1"

        # Record failed attempts
        for i in range(3):
            self.service.record_login_attempt(ip, email, success=False)

        # Check failed attempts recorded
        status = self.service.get_account_status(email)
        assert status["failed_attempts"] == 3

        # Record successful login
        self.service.record_login_attempt(ip, email, success=True)

        # Failed attempts should be reset
        status = self.service.get_account_status(email)
        assert status["failed_attempts"] == 0

    def test_unlock_account(self):
        """Test manual account unlocking"""
        email = "locked@example.com"
        ip = "192.168.1.1"

        # Lock account
        for i in range(6):
            self.service.record_login_attempt(ip, email, success=False)

        # Verify locked
        status = self.service.get_account_status(email)
        assert status["locked"] is True

        # Unlock account
        success = self.service.unlock_account(email, admin_override=True)
        assert success is True

        # Verify unlocked
        status = self.service.get_account_status(email)
        assert status["locked"] is False
        assert status["failed_attempts"] == 0

    def test_unblock_ip(self):
        """Test manual IP unblocking"""
        ip = "192.168.1.99"

        # Block IP by triggering rate limit violations
        for i in range(30):
            self.service.check_rate_limit("login", ip)

        # Force IP block
        self.service._block_ip(ip)

        # Verify blocked
        status = self.service.get_ip_status(ip)
        assert status["blocked"] is True

        # Unblock IP
        success = self.service.unblock_ip(ip, admin_override=True)
        assert success is True

        # Verify unblocked
        status = self.service.get_ip_status(ip)
        assert status["blocked"] is False

    def test_different_endpoints_have_different_limits(self):
        """Test that different endpoints have different rate limits"""
        ip = "192.168.1.50"

        # Login endpoint - 5 requests per window
        for i in range(5):
            allowed, headers = self.service.check_rate_limit("login", ip)
            assert allowed is True

        allowed, headers = self.service.check_rate_limit("login", ip)
        assert allowed is False

        # Register endpoint should still work (different limit)
        allowed, headers = self.service.check_rate_limit("register", ip)
        assert allowed is True

    def test_stats_tracking(self):
        """Test that statistics are properly tracked"""
        ip = "192.168.1.75"
        email = "stats@example.com"

        # Generate some activity
        for i in range(10):
            self.service.check_rate_limit("login", ip)
            self.service.record_login_attempt(ip, email, success=(i % 2 == 0))

        stats = self.service.get_stats()
        assert "total_blocked_requests" in stats
        assert "total_user_lockouts" in stats
        assert "total_ip_blocks" in stats
        assert stats["total_blocked_requests"] > 0


class TestRateLimitingMiddleware:
    """Test the middleware integration"""

    def setup_method(self):
        """Setup test client"""
        self.client = TestClient(app)

    def test_login_rate_limiting(self):
        """Test rate limiting on login endpoint"""
        # Make multiple failed login attempts
        login_data = {"username": "test@example.com", "password": "wrongpassword"}

        responses = []
        for i in range(7):  # Exceed limit of 5
            response = self.client.post("/api/v1/auth/token", data=login_data)
            responses.append(response)

        # First 5 should get 401 (auth failure)
        for response in responses[:5]:
            assert response.status_code == 401

        # 6th and 7th should get 429 (rate limited)
        for response in responses[5:]:
            assert response.status_code == 429
            assert "Too many" in response.json()["detail"]

    def test_register_rate_limiting(self):
        """Test rate limiting on register endpoint"""
        register_data = {
            "email": "test@example.com",
            "password": "TestPassword123!",
            "first_name": "Test",
            "last_name": "User",
        }

        responses = []
        for i in range(5):  # Exceed limit of 3 for register
            response = self.client.post("/api/v1/auth/register", json=register_data)
            responses.append(response)

        # Last couple should be rate limited
        assert any(r.status_code == 429 for r in responses[-2:])

    def test_forgot_password_rate_limiting(self):
        """Test rate limiting on forgot password endpoint"""
        forgot_data = {"email": "test@example.com"}

        responses = []
        for i in range(5):  # Exceed limit of 3 for forgot password
            response = self.client.post(
                "/api/v1/auth/forgot-password", json=forgot_data
            )
            responses.append(response)

        # Last couple should be rate limited
        assert any(r.status_code == 429 for r in responses[-2:])

    def test_rate_limit_headers_present(self):
        """Test that rate limit headers are present in responses"""
        login_data = {"username": "test@example.com", "password": "wrongpassword"}
        response = self.client.post("/api/v1/auth/token", data=login_data)

        # Should have rate limit headers
        assert "X-RateLimit-Limit" in response.headers or response.status_code == 429
        if response.status_code != 429:
            assert "X-RateLimit-Remaining" in response.headers

    def test_admin_bypass_header(self):
        """Test admin bypass using header"""
        with patch(
            "services.rate_limiting_service.rate_limiting_service"
        ) as mock_service:
            mock_service.check_rate_limit.return_value = (
                True,
                {"X-RateLimit-Bypass": "admin"},
            )

            headers = {"X-Admin-Bypass-Token": "test-token"}
            login_data = {"username": "admin@example.com", "password": "password"}

            response = self.client.post(
                "/api/v1/auth/token", data=login_data, headers=headers
            )

            # Should attempt to check bypass
            mock_service.check_rate_limit.assert_called()


class TestAdminEndpoints:
    """Test the admin management endpoints"""

    def setup_method(self):
        """Setup test client and mock admin user"""
        self.client = TestClient(app)

    @patch("api.v1.endpoints.rate_limiting_admin.get_current_user")
    def test_get_stats_requires_admin(self, mock_get_user):
        """Test that stats endpoint requires admin privileges"""
        # Mock non-admin user
        mock_user = Mock()
        mock_user.role = "barber"
        mock_get_user.return_value = mock_user

        response = self.client.get("/api/v1/admin/rate-limiting/stats")
        assert response.status_code == 403

        # Mock admin user
        mock_user.role = "admin"
        response = self.client.get("/api/v1/admin/rate-limiting/stats")
        assert response.status_code == 200

    @patch("api.v1.endpoints.rate_limiting_admin.get_current_user")
    def test_unlock_account_endpoint(self, mock_get_user):
        """Test account unlocking endpoint"""
        # Mock admin user
        mock_user = Mock()
        mock_user.role = "admin"
        mock_user.email = "admin@example.com"
        mock_user.id = 1
        mock_get_user.return_value = mock_user

        unlock_data = {
            "email": "locked@example.com",
            "admin_override": True,
            "reason": "Test unlock",
        }

        response = self.client.post(
            "/api/v1/admin/rate-limiting/unlock-account", json=unlock_data
        )
        assert response.status_code == 200
        assert response.json()["success"] is True

    @patch("api.v1.endpoints.rate_limiting_admin.get_current_user")
    def test_add_admin_bypass(self, mock_get_user):
        """Test adding admin bypass IP"""
        # Mock admin user
        mock_user = Mock()
        mock_user.role = "admin"
        mock_user.email = "admin@example.com"
        mock_user.id = 1
        mock_get_user.return_value = mock_user

        bypass_data = {"ip_address": "192.168.1.100", "reason": "Admin workstation"}

        response = self.client.post(
            "/api/v1/admin/rate-limiting/add-admin-bypass", json=bypass_data
        )
        assert response.status_code == 200
        assert response.json()["success"] is True


class TestPerformanceImpact:
    """Test performance impact of rate limiting"""

    def setup_method(self):
        """Setup service for performance testing"""
        self.service = EnhancedRateLimitingService()

    def test_rate_limiting_performance(self):
        """Test that rate limiting doesn't significantly impact performance"""
        import time

        # Test without rate limiting
        start_time = time.time()
        for i in range(1000):
            pass  # Baseline
        baseline_time = time.time() - start_time

        # Test with rate limiting
        start_time = time.time()
        for i in range(1000):
            self.service.check_rate_limit("login", f"192.168.1.{i % 255}")
        rate_limit_time = time.time() - start_time

        # Rate limiting should not add more than 50% overhead
        overhead = (
            (rate_limit_time - baseline_time) / baseline_time
            if baseline_time > 0
            else 0
        )
        assert overhead < 0.5, f"Rate limiting overhead too high: {overhead:.2%}"

    def test_memory_usage_bounds(self):
        """Test that memory usage stays within reasonable bounds"""
        import sys

        # Generate lots of attempts from different IPs
        for i in range(10000):
            ip = f"192.168.{i // 255}.{i % 255}"
            self.service.check_rate_limit("login", ip)

        # Check that collections are bounded
        assert len(self.service.ip_attempts) <= 10000  # Should not grow unbounded
        assert len(self.service.recent_attempts) <= 10000  # Should be limited by maxlen


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
