"""
Unit tests for security features
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
import time

from main import app
from utils.security import (
    validate_password_strength,
    RateLimiter,
    get_client_ip,
    sanitize_output
)

client = TestClient(app)


class TestPasswordValidation:
    """Test password strength validation"""
    
    def test_valid_password(self):
        """Test valid password passes all checks"""
        valid, msg = validate_password_strength("SecureP@ssw0rd!")
        assert valid is True
        assert msg is None
    
    def test_password_too_short(self):
        """Test password length validation"""
        valid, msg = validate_password_strength("Sh0rt!")
        assert valid is False
        assert "at least 8 characters" in msg
    
    def test_password_missing_uppercase(self):
        """Test uppercase requirement"""
        valid, msg = validate_password_strength("password123!")
        assert valid is False
        assert "uppercase letter" in msg
    
    def test_password_missing_lowercase(self):
        """Test lowercase requirement"""
        valid, msg = validate_password_strength("PASSWORD123!")
        assert valid is False
        assert "lowercase letter" in msg
    
    def test_password_missing_number(self):
        """Test number requirement"""
        valid, msg = validate_password_strength("SecurePassword!")
        assert valid is False
        assert "number" in msg
    
    def test_password_missing_special(self):
        """Test special character requirement"""
        valid, msg = validate_password_strength("SecurePassword123")
        assert valid is False
        assert "special character" in msg


class TestRateLimiter:
    """Test rate limiting functionality"""
    
    def test_rate_limit_allows_requests_under_limit(self):
        """Test requests under limit are allowed"""
        limiter = RateLimiter(max_requests=3, window_seconds=1)
        
        assert limiter.is_allowed("test_user") is True
        assert limiter.is_allowed("test_user") is True
        assert limiter.is_allowed("test_user") is True
    
    def test_rate_limit_blocks_excess_requests(self):
        """Test requests over limit are blocked"""
        limiter = RateLimiter(max_requests=3, window_seconds=1)
        
        # Make 3 allowed requests
        for _ in range(3):
            assert limiter.is_allowed("test_user") is True
        
        # 4th request should be blocked
        assert limiter.is_allowed("test_user") is False
    
    def test_rate_limit_resets_after_window(self):
        """Test rate limit resets after time window"""
        limiter = RateLimiter(max_requests=2, window_seconds=0.5)
        
        # Use up the limit
        assert limiter.is_allowed("test_user") is True
        assert limiter.is_allowed("test_user") is True
        assert limiter.is_allowed("test_user") is False
        
        # Wait for window to pass
        time.sleep(0.6)
        
        # Should be allowed again
        assert limiter.is_allowed("test_user") is True
    
    def test_different_users_have_separate_limits(self):
        """Test different identifiers have separate rate limits"""
        limiter = RateLimiter(max_requests=2, window_seconds=60)
        
        # User 1 uses up their limit
        assert limiter.is_allowed("user1") is True
        assert limiter.is_allowed("user1") is True
        assert limiter.is_allowed("user1") is False
        
        # User 2 should still be allowed
        assert limiter.is_allowed("user2") is True
        assert limiter.is_allowed("user2") is True


class TestSanitization:
    """Test output sanitization"""
    
    def test_sanitize_removes_sensitive_fields(self):
        """Test sensitive fields are removed"""
        data = {
            "username": "testuser",
            "password": "secret123",
            "hashed_password": "hash123",
            "token": "jwt123",
            "email": "test@example.com"
        }
        
        sanitized = sanitize_output(data)
        
        assert "username" in sanitized
        assert "email" in sanitized
        assert "password" not in sanitized
        assert "hashed_password" not in sanitized
        assert "token" not in sanitized
    
    def test_sanitize_handles_nested_data(self):
        """Test sanitization of nested structures"""
        data = {
            "user": {
                "id": 1,
                "email": "test@example.com",
                "password": "secret"
            },
            "tokens": ["token1", "token2"]
        }
        
        sanitized = sanitize_output(data)
        
        assert "password" not in sanitized["user"]
        assert sanitized["user"]["email"] == "test@example.com"
    
    def test_sanitize_handles_lists(self):
        """Test sanitization of lists"""
        data = [
            {"id": 1, "token": "secret1"},
            {"id": 2, "secret": "secret2"}
        ]
        
        sanitized = sanitize_output(data)
        
        assert "token" not in sanitized[0]
        assert "secret" not in sanitized[1]
        assert sanitized[0]["id"] == 1


class TestSecurityHeaders:
    """Test security headers are added"""
    
    def test_security_headers_present(self):
        """Test security headers are added to responses"""
        response = client.get("/health")
        
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("X-XSS-Protection") == "1; mode=block"
        assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    
    def test_process_time_header(self):
        """Test request timing header is added"""
        response = client.get("/health")
        
        assert "X-Process-Time" in response.headers
        assert float(response.headers["X-Process-Time"]) > 0


class TestLoginSecurity:
    """Test login endpoint security"""
    
    @pytest.mark.skip(reason="Rate limiting needs Redis in production")
    def test_login_rate_limiting(self):
        """Test login rate limiting"""
        # This would need a proper test setup with Redis
        pass
    
    def test_register_password_validation(self):
        """Test registration enforces password requirements"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "weak",
                "first_name": "Test",
                "last_name": "User",
                "role": "barber"
            }
        )
        
        assert response.status_code == 400
        assert "at least 8 characters" in response.json()["detail"]