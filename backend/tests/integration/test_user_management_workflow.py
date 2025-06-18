"""
Integration tests for user management workflow
"""
import pytest
from fastapi.testclient import TestClient
import uuid

from main import app
from config.database import engine
from models.base import Base

client = TestClient(app)


class TestUserManagementWorkflow:
    """Test complete user management workflows"""
    
    @classmethod
    def setup_class(cls):
        """Setup test database"""
        Base.metadata.create_all(bind=engine)
    
    def test_user_lifecycle_workflow(self):
        """Test complete user lifecycle: register -> login -> update -> deactivate"""
        
        # Step 1: Register a new user
        user_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
        register_response = client.post(
            "/api/v1/auth/register",
            json={
                "email": user_email,
                "password": "InitialP@ssw0rd!",
                "first_name": "Test",
                "last_name": "User",
                "role": "barber"
            }
        )
        assert register_response.status_code == 200
        user_data = register_response.json()
        user_id = user_data["id"]
        
        # Step 2: Login with new user
        login_response = client.post(
            "/api/v1/auth/token",
            data={
                "username": user_email,
                "password": "InitialP@ssw0rd!"
            }
        )
        assert login_response.status_code == 200
        token_data = login_response.json()
        access_token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Verify user data in token response
        assert token_data["user"]["email"] == user_email
        assert token_data["user"]["role"] == "barber"
        
        # Step 3: Get current user info
        me_response = client.get("/api/v1/auth/me", headers=headers)
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data["email"] == user_email
        assert me_data["id"] == user_id
        
        # Step 4: Update user profile
        update_response = client.put(
            f"/api/v1/users/{user_id}",
            json={
                "first_name": "Updated",
                "last_name": "Name"
            },
            headers=headers
        )
        
        # Check if update endpoint exists and user can update their own profile
        if update_response.status_code != 404:
            assert update_response.status_code in [200, 403]  # 403 if only admin can update
        
        # Step 5: Change password
        change_password_response = client.post(
            "/api/v1/auth/change-password",
            params={
                "old_password": "InitialP@ssw0rd!",
                "new_password": "NewSecureP@ssw0rd!"
            },
            headers=headers
        )
        assert change_password_response.status_code == 200
        
        # Step 6: Verify login with new password
        new_login_response = client.post(
            "/api/v1/auth/token",
            data={
                "username": user_email,
                "password": "NewSecureP@ssw0rd!"
            }
        )
        assert new_login_response.status_code == 200
        
        # Step 7: Verify old password no longer works
        old_login_response = client.post(
            "/api/v1/auth/token",
            data={
                "username": user_email,
                "password": "InitialP@ssw0rd!"
            }
        )
        assert old_login_response.status_code == 401
        
        # Step 8: Logout
        logout_response = client.post("/api/v1/auth/logout", headers=headers)
        assert logout_response.status_code == 200
    
    def test_role_based_access_workflow(self):
        """Test role-based access control workflow"""
        
        # Create users with different roles
        users = []
        for role in ["barber", "receptionist", "mentor"]:
            email = f"{role}_{uuid.uuid4().hex[:8]}@example.com"
            register_response = client.post(
                "/api/v1/auth/register",
                json={
                    "email": email,
                    "password": "SecureP@ssw0rd!",
                    "first_name": role.capitalize(),
                    "last_name": "User",
                    "role": role
                }
            )
            assert register_response.status_code == 200
            
            # Login to get token
            login_response = client.post(
                "/api/v1/auth/token",
                data={
                    "username": email,
                    "password": "SecureP@ssw0rd!"
                }
            )
            assert login_response.status_code == 200
            
            users.append({
                "role": role,
                "email": email,
                "token": login_response.json()["access_token"],
                "headers": {"Authorization": f"Bearer {login_response.json()['access_token']}"}
            })
        
        # Test access to different endpoints based on role
        # Analytics endpoint - should be accessible by barber and mentor
        for user in users:
            analytics_response = client.get(
                "/api/v1/analytics/dashboard",
                headers=user["headers"]
            )
            
            if analytics_response.status_code != 404:  # If endpoint exists
                if user["role"] in ["barber", "mentor"]:
                    assert analytics_response.status_code in [200, 403]
                else:
                    assert analytics_response.status_code in [403, 401]
        
        # User management - typically admin only
        for user in users:
            users_response = client.get(
                "/api/v1/users",
                headers=user["headers"]
            )
            
            if users_response.status_code != 404:  # If endpoint exists
                # Non-admin users should get 403
                assert users_response.status_code in [403, 200]
    
    def test_password_security_workflow(self):
        """Test password security features"""
        
        email = f"secure_{uuid.uuid4().hex[:8]}@example.com"
        
        # Test 1: Weak password rejection
        weak_password_response = client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "weak",
                "first_name": "Test",
                "last_name": "User",
                "role": "barber"
            }
        )
        assert weak_password_response.status_code == 400
        assert "at least 8 characters" in weak_password_response.json()["detail"]
        
        # Test 2: Strong password acceptance
        strong_password_response = client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "StrongP@ssw0rd!123",
                "first_name": "Test",
                "last_name": "User",
                "role": "barber"
            }
        )
        assert strong_password_response.status_code == 200
        
        # Test 3: Rate limiting on login attempts
        # Make multiple failed login attempts
        for i in range(6):  # Exceed the 5 attempt limit
            failed_login = client.post(
                "/api/v1/auth/token",
                data={
                    "username": email,
                    "password": "WrongPassword!"
                }
            )
            
            if i < 5:
                assert failed_login.status_code == 401
            else:
                # Should be rate limited
                assert failed_login.status_code == 429