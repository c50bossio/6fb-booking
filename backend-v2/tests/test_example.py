"""
Fixed example tests using proper fixtures from conftest
"""

import pytest
from fastapi import status


class TestHealthCheck:
    """Test the health check endpoint."""
    
    def test_health_check(self, client):
        """Test that health check returns success."""
        response = client.get("/health")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "healthy"
        # timestamp is optional in the health check


class TestAuthentication:
    """Test authentication endpoints."""
    
    def test_login_invalid_credentials(self, client, disable_rate_limiting):
        """Test login with invalid credentials."""
        login_data = {
            "username": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        
        response = client.post(
            "/api/v1/auth/login",
            json=login_data
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Incorrect username or password" in response.json()["detail"]