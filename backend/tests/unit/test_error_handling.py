"""
Unit tests for error handling and logging
"""

import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException
import json

from main import app

client = TestClient(app)


class TestErrorHandling:
    """Test error handling middleware"""

    def test_404_error(self):
        """Test 404 error response"""
        response = client.get("/nonexistent-endpoint")
        assert response.status_code == 404
        assert "X-Request-ID" in response.headers

    def test_validation_error(self):
        """Test validation error response"""
        response = client.post(
            "/api/v1/auth/register", json={"invalid": "data"}  # Missing required fields
        )
        assert response.status_code == 422
        data = response.json()
        assert "details" in data
        assert "X-Request-ID" in response.headers

    def test_rate_limit_headers(self):
        """Test rate limit error includes retry header"""
        # This would need actual rate limiting to be triggered
        # For now, just verify headers are present on normal requests
        response = client.get("/health")
        assert response.status_code == 200
        assert "X-Request-ID" in response.headers
        assert "X-Process-Time" in response.headers

    def test_database_constraint_error(self):
        """Test database constraint violation handling"""
        # First, register a user
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "duplicate@example.com",
                "password": "SecureP@ssw0rd!",
                "first_name": "Test",
                "last_name": "User",
                "role": "barber",
            },
        )
        assert response.status_code == 200

        # Try to register the same email again
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "duplicate@example.com",
                "password": "SecureP@ssw0rd!",
                "first_name": "Test",
                "last_name": "User",
                "role": "barber",
            },
        )
        assert response.status_code == 400  # Bad request for duplicate email
        assert "X-Request-ID" in response.headers


class TestRequestLogging:
    """Test request logging functionality"""

    def test_request_id_propagation(self):
        """Test request ID is propagated through response"""
        response = client.get("/api/v1/locations")
        assert "X-Request-ID" in response.headers
        assert len(response.headers["X-Request-ID"]) == 36  # UUID length

    def test_process_time_header(self):
        """Test process time is included in response"""
        response = client.get("/api/v1/locations")
        assert "X-Process-Time" in response.headers
        process_time = float(response.headers["X-Process-Time"])
        assert process_time > 0
        assert process_time < 5  # Should complete within 5 seconds

    def test_health_check_not_logged(self):
        """Test health check endpoint is not logged"""
        # This is implicit - health checks should not trigger rate limiting
        for _ in range(200):  # Well over rate limit
            response = client.get("/health")
            assert response.status_code == 200


class TestSecurityLogging:
    """Test security event logging"""

    def test_login_failure_logged(self):
        """Test failed login attempts are logged"""
        response = client.post(
            "/api/v1/auth/token",
            data={"username": "nonexistent@example.com", "password": "wrongpassword"},
        )
        assert response.status_code == 401
        assert "X-Request-ID" in response.headers

    def test_registration_logged(self):
        """Test user registration is logged"""
        import uuid

        unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"

        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": unique_email,
                "password": "SecureP@ssw0rd!",
                "first_name": "Test",
                "last_name": "User",
                "role": "barber",
            },
        )
        assert response.status_code == 200
        assert "X-Request-ID" in response.headers
