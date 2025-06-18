"""
Unit tests for authentication endpoints
"""
import pytest
from datetime import datetime, timedelta
from jose import jwt

from api.v1.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token
)
from config.settings import settings


class TestAuthUtils:
    """Test authentication utility functions"""
    
    def test_password_hashing(self):
        """Test password hashing and verification"""
        password = "testpassword123"
        hashed = get_password_hash(password)
        
        assert hashed != password
        assert verify_password(password, hashed)
        assert not verify_password("wrongpassword", hashed)
    
    def test_create_access_token(self):
        """Test access token creation"""
        data = {"sub": "test@example.com"}
        token = create_access_token(data)
        
        # Decode token
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        assert payload["sub"] == "test@example.com"
        assert "exp" in payload
    
    def test_create_refresh_token(self):
        """Test refresh token creation"""
        data = {"sub": "test@example.com"}
        token = create_refresh_token(data)
        
        # Decode token
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        assert payload["sub"] == "test@example.com"
        assert "exp" in payload


class TestAuthEndpoints:
    """Test authentication API endpoints"""
    
    def test_login_success(self, client, test_user):
        """Test successful login"""
        # Create user
        from models.user import User
        from sqlalchemy.orm import Session
        from tests.conftest import TestingSessionLocal
        
        db = TestingSessionLocal()
        db_user = User(
            email=test_user["email"],
            hashed_password=get_password_hash(test_user["password"]),
            first_name=test_user["first_name"],
            last_name=test_user["last_name"],
            role=test_user["role"],
            is_active=True
        )
        db.add(db_user)
        db.commit()
        db.close()
        
        # Login
        response = client.post(
            "/api/v1/auth/token",
            data={
                "username": test_user["email"],
                "password": test_user["password"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == test_user["email"]
    
    def test_login_invalid_email(self, client):
        """Test login with invalid email"""
        response = client.post(
            "/api/v1/auth/token",
            data={
                "username": "nonexistent@example.com",
                "password": "password123"
            }
        )
        
        assert response.status_code == 401
        assert response.json()["detail"] == "Incorrect email or password"
    
    def test_login_invalid_password(self, client, test_user):
        """Test login with invalid password"""
        # Create user
        from models.user import User
        from tests.conftest import TestingSessionLocal
        
        db = TestingSessionLocal()
        db_user = User(
            email=test_user["email"],
            hashed_password=get_password_hash(test_user["password"]),
            first_name=test_user["first_name"],
            last_name=test_user["last_name"],
            role=test_user["role"],
            is_active=True
        )
        db.add(db_user)
        db.commit()
        db.close()
        
        # Login with wrong password
        response = client.post(
            "/api/v1/auth/token",
            data={
                "username": test_user["email"],
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401
        assert response.json()["detail"] == "Incorrect email or password"
    
    def test_get_current_user(self, client, auth_headers):
        """Test getting current user"""
        response = client.get("/api/v1/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "id" in data
        assert "role" in data
    
    def test_get_current_user_no_auth(self, client):
        """Test getting current user without authentication"""
        response = client.get("/api/v1/auth/me")
        
        assert response.status_code == 401
        assert response.json()["detail"] == "Not authenticated"
    
    def test_refresh_token(self, client, test_user):
        """Test token refresh"""
        # Create user and login
        from models.user import User
        from tests.conftest import TestingSessionLocal
        
        db = TestingSessionLocal()
        db_user = User(
            email=test_user["email"],
            hashed_password=get_password_hash(test_user["password"]),
            first_name=test_user["first_name"],
            last_name=test_user["last_name"],
            role=test_user["role"],
            is_active=True
        )
        db.add(db_user)
        db.commit()
        db.close()
        
        # Login
        login_response = client.post(
            "/api/v1/auth/token",
            data={
                "username": test_user["email"],
                "password": test_user["password"]
            }
        )
        refresh_token = login_response.json()["refresh_token"]
        
        # Refresh token
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "token_type" in data
    
    def test_inactive_user_login(self, client, test_user):
        """Test login with inactive user"""
        # Create inactive user
        from models.user import User
        from tests.conftest import TestingSessionLocal
        
        db = TestingSessionLocal()
        db_user = User(
            email=test_user["email"],
            hashed_password=get_password_hash(test_user["password"]),
            first_name=test_user["first_name"],
            last_name=test_user["last_name"],
            role=test_user["role"],
            is_active=False  # Inactive user
        )
        db.add(db_user)
        db.commit()
        db.close()
        
        # Try to login
        response = client.post(
            "/api/v1/auth/token",
            data={
                "username": test_user["email"],
                "password": test_user["password"]
            }
        )
        
        assert response.status_code == 401