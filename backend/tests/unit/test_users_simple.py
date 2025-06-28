"""
Simple unit tests for user endpoints
"""

import pytest
from api.v1.auth import get_password_hash


class TestUserEndpoints:
    """Test user CRUD operations"""

    def test_users_endpoint_requires_auth(self, client):
        """Test that users endpoint requires authentication"""
        response = client.get("/api/v1/users")
        assert response.status_code == 401

    def test_create_user_requires_auth(self, client):
        """Test that creating user requires authentication"""
        response = client.post("/api/v1/users", json={})
        assert response.status_code == 401

    def test_login_and_get_me(self, client):
        """Test login flow and getting current user"""
        # First create a user in the test database
        from models.user import User
        from tests.conftest import TestingSessionLocal

        db = TestingSessionLocal()
        test_user = User(
            email="test@example.com",
            hashed_password=get_password_hash("password123"),
            first_name="Test",
            last_name="User",
            role="barber",
            is_active=True,
        )
        db.add(test_user)
        db.commit()
        db.close()

        # Login
        response = client.post(
            "/api/v1/auth/token",
            data={"username": "test@example.com", "password": "password123"},
        )
        assert response.status_code == 200
        token_data = response.json()
        assert "access_token" in token_data

        # Get current user
        headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        response = client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 200
        user_data = response.json()
        assert user_data["email"] == "test@example.com"
        assert user_data["first_name"] == "Test"

    def test_invalid_login(self, client):
        """Test login with invalid credentials"""
        response = client.post(
            "/api/v1/auth/token",
            data={"username": "nonexistent@example.com", "password": "wrongpassword"},
        )
        assert response.status_code == 401
