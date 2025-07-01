"""
Simple authentication test to verify basic functionality
"""

import pytest
from sqlalchemy.orm import Session
from models import User
from utils.auth import get_password_hash


def test_register_user(client, db: Session, mock_notification_service, disable_rate_limiting):
    """Test user registration"""
    # Ensure user doesn't exist
    existing = db.query(User).filter(User.email == "newuser@example.com").first()
    if existing:
        db.delete(existing)
        db.commit()
    
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "TestPass123!",
            "name": "New User"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "User successfully registered"
    assert data["user"]["email"] == "newuser@example.com"
    assert data["user"]["name"] == "New User"


def test_login_user(client, db: Session, disable_rate_limiting):
    """Test user login"""
    # First create a user
    existing = db.query(User).filter(User.email == "logintest@example.com").first()
    if existing:
        db.delete(existing)
        db.commit()
        
    user = User(
        email="logintest@example.com",
        name="Login Test",
        hashed_password=get_password_hash("testpass123")
    )
    db.add(user)
    db.commit()
    
    # Now try to login
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "logintest@example.com",
            "password": "testpass123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_get_current_user(client, db: Session, disable_rate_limiting):
    """Test getting current user info"""
    # Create user first
    existing = db.query(User).filter(User.email == "currentuser@example.com").first()
    if existing:
        db.delete(existing)
        db.commit()
        
    user = User(
        email="currentuser@example.com",
        name="Current User",
        hashed_password=get_password_hash("testpass123")
    )
    db.add(user)
    db.commit()
    
    # Login
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "currentuser@example.com",
            "password": "testpass123"
        }
    )
    token = login_response.json()["access_token"]
    
    # Get user info
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "currentuser@example.com"
    assert data["name"] == "Current User"


def test_unauthorized_access(client):
    """Test accessing protected endpoint without token"""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 403  # FastAPI returns 403 for missing credentials


def test_invalid_login(client, disable_rate_limiting):
    """Test login with wrong password"""
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "wrong@example.com",
            "password": "wrongpass"
        }
    )
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]