"""
Authentication Test Utilities and Helpers
Provides comprehensive test utilities for authentication testing
"""
import pytest
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from httpx import AsyncClient
import jwt
import bcrypt
import secrets
from unittest.mock import Mock, patch
import time

from backend.models import User
from backend.core.config import settings
from backend.core.security import create_access_token, verify_password, get_password_hash


class AuthTestData:
    """Test data factory for authentication testing"""
    
    VALID_USER = {
        "id": "user-123",
        "email": "admin@bookedbarber.com",
        "first_name": "Admin",
        "last_name": "User",
        "role": "client",
        "is_verified": True,
        "password": "Password123!",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    UNVERIFIED_USER = {
        "id": "user-456", 
        "email": "unverified@bookedbarber.com",
        "first_name": "Unverified",
        "last_name": "User",
        "role": "client",
        "is_verified": False,
        "password": "Password123!",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    VALID_CREDENTIALS = {
        "email": "admin@bookedbarber.com",
        "password": "Password123!"
    }
    
    INVALID_CREDENTIALS = {
        "email": "admin@bookedbarber.com",
        "password": "wrongpassword"
    }
    
    # Email edge cases that should be rejected by validation
    EDGE_CASE_EMAILS = [
        # Invalid emails (edge cases fixed in frontend validation)
        {"email": " admin@bookedbarber.com", "valid": False},
        {"email": "admin@bookedbarber.com ", "valid": False},
        {"email": "user..name@domain.com", "valid": False},
        {"email": ".user@domain.com", "valid": False},
        {"email": "user.@domain.com", "valid": False},
        {"email": "user@.domain.com", "valid": False},
        {"email": "user@domain.com.", "valid": False},
        {"email": "user@domain..com", "valid": False},
        {"email": "plainaddress", "valid": False},
        {"email": "@domain.com", "valid": False},
        {"email": "user@", "valid": False},
        {"email": "", "valid": False},
        
        # Valid emails
        {"email": "test@example.com", "valid": True},
        {"email": "user.name@domain.co.uk", "valid": True},
        {"email": "user+tag@domain.com", "valid": True},
        {"email": "user123@test-domain.org", "valid": True},
    ]
    
    ERROR_RESPONSES = {
        "invalid_credentials": {"status": 401, "detail": "Invalid credentials"},
        "email_not_verified": {"status": 403, "detail": "Email address not verified"},
        "user_not_found": {"status": 401, "detail": "Invalid credentials"},
        "rate_limited": {"status": 429, "detail": "Too many requests"},
        "server_error": {"status": 500, "detail": "Internal server error"},
        "validation_error": {"status": 422, "detail": "Validation failed"},
    }


class AuthTestHelpers:
    """Helper functions for authentication testing"""
    
    @staticmethod
    def create_test_user(db: Session, **kwargs) -> User:
        """Create a test user in the database"""
        user_data = AuthTestData.VALID_USER.copy()
        user_data.update(kwargs)
        
        # Hash password if provided
        if "password" in user_data:
            user_data["hashed_password"] = get_password_hash(user_data.pop("password"))
        
        user = User(**user_data)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def create_test_token(user_id: str, expired: bool = False) -> str:
        """Create a test JWT token"""
        if expired:
            expires_delta = timedelta(minutes=-30)  # Expired 30 minutes ago
        else:
            expires_delta = timedelta(minutes=30)
        
        return create_access_token(
            data={"sub": user_id},
            expires_delta=expires_delta
        )
    
    @staticmethod
    def get_auth_headers(token: str) -> Dict[str, str]:
        """Get authorization headers with token"""
        return {"Authorization": f"Bearer {token}"}
    
    @staticmethod
    def mock_rate_limiter(max_attempts: int = 5, lockout_duration: int = 300):
        """Mock rate limiter for testing"""
        attempts = {}
        
        def rate_limit_check(identifier: str):
            now = time.time()
            if identifier not in attempts:
                attempts[identifier] = {"count": 0, "last_attempt": now, "locked_until": None}
            
            attempt_data = attempts[identifier]
            
            # Check if still locked
            if attempt_data["locked_until"] and now < attempt_data["locked_until"]:
                return False, f"Rate limited until {attempt_data['locked_until']}"
            
            # Reset if lockout period has passed
            if attempt_data["locked_until"] and now >= attempt_data["locked_until"]:
                attempt_data["count"] = 0
                attempt_data["locked_until"] = None
            
            # Increment attempt count
            attempt_data["count"] += 1
            attempt_data["last_attempt"] = now
            
            # Check if exceeded max attempts
            if attempt_data["count"] > max_attempts:
                attempt_data["locked_until"] = now + lockout_duration
                return False, "Too many attempts"
            
            return True, "OK"
        
        return rate_limit_check
    
    @staticmethod
    def simulate_network_error():
        """Simulate network connectivity issues"""
        import requests.exceptions
        raise requests.exceptions.ConnectionError("Network error")
    
    @staticmethod
    def simulate_database_error():
        """Simulate database connectivity issues"""
        from sqlalchemy.exc import OperationalError
        raise OperationalError("Database connection failed", None, None)
    
    @staticmethod
    def generate_malformed_token() -> str:
        """Generate malformed JWT token for testing"""
        return "malformed.jwt.token"
    
    @staticmethod
    def generate_expired_token() -> str:
        """Generate expired JWT token"""
        payload = {
            "sub": "user-123",
            "exp": datetime.utcnow() - timedelta(hours=1)  # Expired 1 hour ago
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    
    @staticmethod
    def generate_tampered_token() -> str:
        """Generate tampered JWT token"""
        payload = {
            "sub": "user-123",
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        # Use wrong secret key
        return jwt.encode(payload, "wrong-secret", algorithm="HS256")


class AuthTestAssertions:
    """Test assertion helpers for authentication"""
    
    @staticmethod
    def assert_successful_login(response):
        """Assert successful login response"""
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert "user_id" in data
        assert data["token_type"] == "bearer"
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 0
    
    @staticmethod
    def assert_login_failure(response, expected_status: int = 401):
        """Assert login failure response"""
        assert response.status_code == expected_status
        data = response.json()
        assert "detail" in data or "message" in data
    
    @staticmethod
    def assert_email_verification_required(response):
        """Assert email verification required response"""
        assert response.status_code == 403
        data = response.json()
        error_message = data.get("detail", "").lower()
        assert any(word in error_message for word in ["verified", "verification"])
    
    @staticmethod
    def assert_rate_limited(response):
        """Assert rate limiting response"""
        assert response.status_code == 429
        data = response.json()
        assert "detail" in data
    
    @staticmethod
    def assert_validation_error(response):
        """Assert validation error response"""
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    @staticmethod
    def assert_token_valid(token: str):
        """Assert JWT token is valid"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            assert "sub" in payload
            assert "exp" in payload
            assert payload["exp"] > datetime.utcnow().timestamp()
        except jwt.InvalidTokenError:
            pytest.fail("Token is invalid")
    
    @staticmethod
    def assert_profile_response(response, expected_email: str):
        """Assert user profile response"""
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == expected_email
        assert "id" in data
        assert "role" in data
        assert "first_name" in data
        assert "last_name" in data


class AuthPerformanceHelpers:
    """Performance testing helpers for authentication"""
    
    @staticmethod
    def measure_login_performance():
        """Context manager for measuring login performance"""
        class PerformanceMeasurer:
            def __init__(self):
                self.start_time = None
                self.end_time = None
                self.duration = None
            
            def __enter__(self):
                self.start_time = time.time()
                return self
            
            def __exit__(self, exc_type, exc_val, exc_tb):
                self.end_time = time.time()
                self.duration = self.end_time - self.start_time
            
            def assert_within_bounds(self, max_seconds: float = 5.0):
                """Assert operation completed within time bounds"""
                assert self.duration is not None, "Performance measurement not completed"
                assert self.duration <= max_seconds, f"Operation took {self.duration}s, expected <= {max_seconds}s"
        
        return PerformanceMeasurer()
    
    @staticmethod
    def concurrent_login_test(client: TestClient, credentials: Dict, num_requests: int = 10):
        """Test concurrent login requests"""
        import threading
        import queue
        
        results = queue.Queue()
        
        def login_request():
            try:
                response = client.post("/api/v2/auth/login", json=credentials)
                results.put({"status": response.status_code, "success": True})
            except Exception as e:
                results.put({"error": str(e), "success": False})
        
        # Start concurrent requests
        threads = []
        for _ in range(num_requests):
            thread = threading.Thread(target=login_request)
            threads.append(thread)
            thread.start()
        
        # Wait for all to complete
        for thread in threads:
            thread.join()
        
        # Collect results
        collected_results = []
        while not results.empty():
            collected_results.append(results.get())
        
        return collected_results


class AuthSecurityHelpers:
    """Security testing helpers for authentication"""
    
    @staticmethod
    def sql_injection_payloads():
        """Common SQL injection payloads for testing"""
        return [
            "admin@example.com' OR '1'='1",
            "admin@example.com'; DROP TABLE users; --",
            "admin@example.com' UNION SELECT * FROM users --",
            "admin@example.com' AND 1=1 --",
            "admin@example.com' OR 1=1 --",
            "; DELETE FROM users WHERE 1=1 --",
            "' OR 'x'='x",
            "admin'; EXEC xp_cmdshell('dir'); --"
        ]
    
    @staticmethod
    def xss_payloads():
        """Common XSS payloads for testing"""
        return [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "<svg onload=alert('xss')>",
            "';alert('xss');//",
            "<iframe src='javascript:alert(\"xss\")'></iframe>"
        ]
    
    @staticmethod
    def timing_attack_test(client: TestClient, valid_email: str, invalid_email: str):
        """Test protection against timing attacks"""
        times = []
        
        # Test with valid email (should take consistent time)
        for _ in range(5):
            start = time.time()
            client.post("/api/v2/auth/login", json={
                "email": valid_email,
                "password": "wrongpassword"
            })
            times.append(time.time() - start)
        
        valid_email_times = times.copy()
        times.clear()
        
        # Test with invalid email (should take similar time)
        for _ in range(5):
            start = time.time()
            client.post("/api/v2/auth/login", json={
                "email": invalid_email,
                "password": "wrongpassword"
            })
            times.append(time.time() - start)
        
        invalid_email_times = times
        
        # Calculate average times
        avg_valid = sum(valid_email_times) / len(valid_email_times)
        avg_invalid = sum(invalid_email_times) / len(invalid_email_times)
        
        # Time difference should be minimal (within 20% variation)
        time_diff_ratio = abs(avg_valid - avg_invalid) / max(avg_valid, avg_invalid)
        
        return {
            "avg_valid_time": avg_valid,
            "avg_invalid_time": avg_invalid,
            "time_difference_ratio": time_diff_ratio,
            "timing_attack_protection": time_diff_ratio < 0.2
        }


class AuthTestFixtures:
    """Pytest fixtures for authentication testing"""
    
    @staticmethod
    @pytest.fixture
    def auth_client():
        """Fixture for authenticated test client"""
        from backend.main import app
        return TestClient(app)
    
    @staticmethod
    @pytest.fixture
    def test_user(db_session):
        """Fixture for test user"""
        user = AuthTestHelpers.create_test_user(db_session)
        yield user
        db_session.delete(user)
        db_session.commit()
    
    @staticmethod
    @pytest.fixture
    def unverified_user(db_session):
        """Fixture for unverified test user"""
        user = AuthTestHelpers.create_test_user(
            db_session,
            email="unverified@bookedbarber.com",
            is_verified=False
        )
        yield user
        db_session.delete(user)
        db_session.commit()
    
    @staticmethod
    @pytest.fixture
    def auth_token(test_user):
        """Fixture for valid auth token"""
        return AuthTestHelpers.create_test_token(test_user.id)
    
    @staticmethod
    @pytest.fixture
    def expired_token(test_user):
        """Fixture for expired auth token"""
        return AuthTestHelpers.create_test_token(test_user.id, expired=True)


class AuthMockHelpers:
    """Mock helpers for authentication testing"""
    
    @staticmethod
    def mock_email_service():
        """Mock email service for testing"""
        with patch('backend.services.email_service.send_verification_email') as mock:
            mock.return_value = True
            yield mock
    
    @staticmethod
    def mock_redis():
        """Mock Redis for testing rate limiting"""
        mock_redis = Mock()
        mock_redis.get.return_value = None
        mock_redis.set.return_value = True
        mock_redis.incr.return_value = 1
        mock_redis.expire.return_value = True
        return mock_redis
    
    @staticmethod
    def mock_database_failure():
        """Mock database failure"""
        from sqlalchemy.exc import OperationalError
        return Mock(side_effect=OperationalError("Database error", None, None))


# Export all helpers for easy importing
__all__ = [
    'AuthTestData',
    'AuthTestHelpers', 
    'AuthTestAssertions',
    'AuthPerformanceHelpers',
    'AuthSecurityHelpers',
    'AuthTestFixtures',
    'AuthMockHelpers'
]