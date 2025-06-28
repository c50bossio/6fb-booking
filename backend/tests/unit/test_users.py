"""
Unit tests for user endpoints
"""

import pytest
from api.v1.auth import get_password_hash


class TestUserEndpoints:
    """Test user API endpoints"""

    def test_create_user(self, client, admin_user):
        """Test creating a new user (admin only)"""
        # First create admin user and login
        from models.user import User
        from tests.conftest import TestingSessionLocal

        db = TestingSessionLocal()
        db_admin = User(
            email=admin_user["email"],
            hashed_password=get_password_hash(admin_user["password"]),
            first_name=admin_user["first_name"],
            last_name=admin_user["last_name"],
            role=admin_user["role"],
            is_active=True,
        )
        db.add(db_admin)
        db.commit()
        db.close()

        # Login as admin
        login_response = client.post(
            "/api/v1/auth/token",
            data={"username": admin_user["email"], "password": admin_user["password"]},
        )
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create new user
        new_user = {
            "email": "newuser@example.com",
            "password": "newpassword123",
            "first_name": "New",
            "last_name": "User",
            "role": "barber",
            "phone": "555-1234",
        }

        response = client.post("/api/v1/users", json=new_user, headers=headers)

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == new_user["email"]
        assert data["first_name"] == new_user["first_name"]
        assert data["role"] == new_user["role"]
        assert "id" in data
        assert "hashed_password" not in data  # Should not return password

    def test_create_duplicate_user(self, client, admin_user):
        """Test creating duplicate user"""
        # Create admin and login
        from models.user import User
        from tests.conftest import TestingSessionLocal

        db = TestingSessionLocal()
        db_admin = User(
            email=admin_user["email"],
            hashed_password=get_password_hash(admin_user["password"]),
            first_name=admin_user["first_name"],
            last_name=admin_user["last_name"],
            role=admin_user["role"],
            is_active=True,
        )
        db.add(db_admin)

        # Also create existing user
        existing_user = User(
            email="existing@example.com",
            hashed_password=get_password_hash("password123"),
            first_name="Existing",
            last_name="User",
            role="barber",
            is_active=True,
        )
        db.add(existing_user)
        db.commit()
        db.close()

        # Login as admin
        login_response = client.post(
            "/api/v1/auth/token",
            data={"username": admin_user["email"], "password": admin_user["password"]},
        )
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Try to create duplicate user
        duplicate_user = {
            "email": "existing@example.com",
            "password": "newpassword123",
            "first_name": "Duplicate",
            "last_name": "User",
            "role": "barber",
        }

        response = client.post("/api/v1/users", json=duplicate_user, headers=headers)

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    def test_get_users_list(self, client, admin_user):
        """Test getting list of users"""
        # Create admin and some users
        from models.user import User
        from tests.conftest import TestingSessionLocal

        db = TestingSessionLocal()
        db_admin = User(
            email=admin_user["email"],
            hashed_password=get_password_hash(admin_user["password"]),
            first_name=admin_user["first_name"],
            last_name=admin_user["last_name"],
            role=admin_user["role"],
            is_active=True,
        )
        db.add(db_admin)

        # Add some test users
        for i in range(3):
            user = User(
                email=f"user{i}@example.com",
                hashed_password=get_password_hash("password123"),
                first_name=f"User{i}",
                last_name="Test",
                role="barber",
                is_active=True,
            )
            db.add(user)

        db.commit()
        db.close()

        # Login as admin
        login_response = client.post(
            "/api/v1/auth/token",
            data={"username": admin_user["email"], "password": admin_user["password"]},
        )
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Get users list
        response = client.get("/api/v1/users", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 4  # Admin + 3 users

    def test_get_user_by_id(self, client, auth_headers):
        """Test getting user by ID"""
        # Get current user
        me_response = client.get("/api/v1/auth/me", headers=auth_headers)
        user_id = me_response.json()["id"]

        # Get user by ID
        response = client.get(f"/api/v1/users/{user_id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == user_id

    def test_update_user(self, client, auth_headers):
        """Test updating user"""
        # Get current user
        me_response = client.get("/api/v1/auth/me", headers=auth_headers)
        user_id = me_response.json()["id"]

        # Update user
        update_data = {
            "first_name": "Updated",
            "last_name": "Name",
            "phone": "555-9999",
        }

        response = client.put(
            f"/api/v1/users/{user_id}", json=update_data, headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Updated"
        assert data["last_name"] == "Name"
        assert data["phone"] == "555-9999"

    def test_unauthorized_access(self, client):
        """Test accessing protected endpoints without auth"""
        # Try to get users list without auth
        response = client.get("/api/v1/users")
        assert response.status_code == 401

        # Try to create user without auth
        response = client.post("/api/v1/users", json={})
        assert response.status_code == 401
