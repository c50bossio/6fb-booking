#!/usr/bin/env python3
"""
Comprehensive test suite for integration API endpoints.
Tests OAuth flows, CRUD operations, health checks, and error handling.
"""

import pytest
import json
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from models import User
from models.integration import Integration, IntegrationType, IntegrationStatus
from schemas.integration import (
    IntegrationType as SchemaIntegrationType,
    IntegrationStatus as SchemaIntegrationStatus
)
from main import app
from utils.auth import create_access_token
import httpx


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_integrations.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module")
def setup_database():
    """Setup test database"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    """Create a fresh database session for each test"""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def test_user(db_session):
    """Create a test user"""
    user = User(
        email="test@example.com",
        username="testuser",
        full_name="Test User",
        hashed_password="$2b$12$test_hash"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers for test user"""
    token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_integration(db_session, test_user):
    """Create a test integration"""
    integration = Integration(
        user_id=test_user.id,
        name="Test Google Calendar",
        integration_type=IntegrationType.GOOGLE_CALENDAR,
        status=IntegrationStatus.ACTIVE,
        access_token="test_access_token",
        refresh_token="test_refresh_token",
        token_expires_at=datetime.utcnow() + timedelta(hours=1),
        scopes=["https://www.googleapis.com/auth/calendar"],
        config={"calendar_id": "primary"},
        is_active=True
    )
    db_session.add(integration)
    db_session.commit()
    db_session.refresh(integration)
    return integration


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


class TestIntegrationOAuth:
    """Test OAuth flow endpoints"""

    def test_initiate_oauth_success(self, client, auth_headers, setup_database):
        """Test successful OAuth initiation"""
        response = client.post(
            "/api/v1/integrations/connect",
            headers=auth_headers,
            json={
                "integration_type": "google_calendar",
                "redirect_uri": "http://localhost:3000/integrations/callback",
                "scopes": ["https://www.googleapis.com/auth/calendar.readonly"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "authorization_url" in data
        assert "state" in data
        assert "accounts.google.com" in data["authorization_url"]
        assert "calendar" in data["authorization_url"]

    def test_initiate_oauth_invalid_type(self, client, auth_headers, setup_database):
        """Test OAuth initiation with invalid integration type"""
        response = client.post(
            "/api/v1/integrations/connect",
            headers=auth_headers,
            json={
                "integration_type": "invalid_type"
            }
        )
        
        assert response.status_code == 422  # Validation error

    def test_initiate_oauth_unauthorized(self, client, setup_database):
        """Test OAuth initiation without authentication"""
        response = client.post(
            "/api/v1/integrations/connect",
            json={"integration_type": "google_calendar"}
        )
        
        assert response.status_code == 401

    @patch('services.integration_service.IntegrationServiceFactory.create')
    def test_oauth_callback_success(self, mock_factory, client, setup_database):
        """Test successful OAuth callback"""
        # Mock the service
        mock_service = Mock()
        mock_integration = Mock()
        mock_integration.id = 1
        mock_service.handle_oauth_callback.return_value = mock_integration
        mock_factory.return_value = mock_service
        
        response = client.get(
            "/api/v1/integrations/callback",
            params={
                "code": "test_auth_code",
                "state": json.dumps({
                    "user_id": 1,
                    "timestamp": datetime.utcnow().isoformat(),
                    "nonce": "test_nonce"
                }),
                "integration_type": "google_calendar"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["integration_id"] == 1
        assert "success" in data["message"].lower()

    def test_oauth_callback_error(self, client, setup_database):
        """Test OAuth callback with error from provider"""
        response = client.get(
            "/api/v1/integrations/callback",
            params={
                "error": "access_denied",
                "error_description": "User denied access",
                "integration_type": "google_calendar",
                "state": "test_state"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "access_denied" in data["message"]

    def test_oauth_callback_missing_code(self, client, setup_database):
        """Test OAuth callback without authorization code"""
        response = client.get(
            "/api/v1/integrations/callback",
            params={
                "integration_type": "google_calendar",
                "state": "test_state"
            }
        )
        
        assert response.status_code == 422  # Missing required field


class TestIntegrationCRUD:
    """Test integration CRUD operations"""

    def test_get_integrations_success(self, client, auth_headers, test_integration, setup_database):
        """Test getting user's integrations"""
        response = client.get("/api/v1/integrations/status", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["name"] == "Test Google Calendar"
        assert data[0]["integration_type"] == "google_calendar"

    def test_get_integrations_filtered(self, client, auth_headers, test_integration, setup_database):
        """Test getting integrations filtered by type"""
        response = client.get(
            "/api/v1/integrations/status",
            headers=auth_headers,
            params={"integration_type": "google_calendar"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert all(item["integration_type"] == "google_calendar" for item in data)

    def test_get_integration_by_id(self, client, auth_headers, test_integration, setup_database):
        """Test getting specific integration by ID"""
        response = client.get(
            f"/api/v1/integrations/{test_integration.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_integration.id
        assert data["name"] == "Test Google Calendar"

    def test_get_integration_not_found(self, client, auth_headers, setup_database):
        """Test getting non-existent integration"""
        response = client.get("/api/v1/integrations/999", headers=auth_headers)
        assert response.status_code == 404

    def test_get_integration_unauthorized(self, client, test_integration, setup_database):
        """Test getting integration without authentication"""
        response = client.get(f"/api/v1/integrations/{test_integration.id}")
        assert response.status_code == 401

    def test_update_integration_success(self, client, auth_headers, test_integration, setup_database):
        """Test updating integration"""
        update_data = {
            "name": "Updated Calendar Integration",
            "is_active": False,
            "config": {"calendar_id": "secondary"}
        }
        
        response = client.put(
            f"/api/v1/integrations/{test_integration.id}",
            headers=auth_headers,
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Calendar Integration"
        assert data["is_active"] is False
        assert data["config"]["calendar_id"] == "secondary"

    def test_update_integration_not_found(self, client, auth_headers, setup_database):
        """Test updating non-existent integration"""
        response = client.put(
            "/api/v1/integrations/999",
            headers=auth_headers,
            json={"name": "Test"}
        )
        assert response.status_code == 404

    def test_delete_integration_success(self, client, auth_headers, test_integration, setup_database):
        """Test deleting integration"""
        response = client.delete(
            f"/api/v1/integrations/{test_integration.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["integration_id"] == test_integration.id

    def test_delete_integration_not_found(self, client, auth_headers, setup_database):
        """Test deleting non-existent integration"""
        response = client.delete("/api/v1/integrations/999", headers=auth_headers)
        assert response.status_code == 404


class TestIntegrationHealth:
    """Test integration health monitoring"""

    @patch('services.integration_service.IntegrationServiceFactory.create')
    def test_check_all_integrations_health(self, mock_factory, client, auth_headers, test_integration, setup_database):
        """Test checking health of all integrations"""
        # Mock the service health check
        mock_service = Mock()
        mock_health_check = Mock()
        mock_health_check.healthy = True
        mock_health_check.integration_id = test_integration.id
        mock_health_check.integration_type = test_integration.integration_type
        mock_health_check.name = test_integration.name
        mock_health_check.status = test_integration.status
        mock_health_check.last_check = datetime.utcnow()
        mock_health_check.details = {}
        mock_health_check.error = None
        
        mock_service.perform_health_check.return_value = mock_health_check
        mock_factory.return_value = mock_service
        
        response = client.get("/api/v1/integrations/health/all", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "total_integrations" in data
        assert "healthy_count" in data
        assert "error_count" in data
        assert "integrations" in data
        assert isinstance(data["integrations"], list)

    @patch('services.integration_service.IntegrationServiceFactory.create')
    def test_check_single_integration_health(self, mock_factory, client, auth_headers, test_integration, setup_database):
        """Test checking health of single integration"""
        # Mock the service health check
        mock_service = Mock()
        mock_health_check = Mock()
        mock_health_check.healthy = True
        mock_health_check.integration_id = test_integration.id
        mock_health_check.integration_type = test_integration.integration_type
        mock_health_check.name = test_integration.name
        mock_health_check.status = test_integration.status
        mock_health_check.last_check = datetime.utcnow()
        mock_health_check.details = {"message": "Connection successful"}
        mock_health_check.error = None
        
        mock_service.perform_health_check.return_value = mock_health_check
        mock_factory.return_value = mock_service
        
        response = client.get(
            f"/api/v1/integrations/health/{test_integration.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["healthy"] is True
        assert data["integration_id"] == test_integration.id

    def test_check_health_not_found(self, client, auth_headers, setup_database):
        """Test checking health of non-existent integration"""
        response = client.get("/api/v1/integrations/health/999", headers=auth_headers)
        assert response.status_code == 404

    def test_check_inactive_integration_health(self, client, auth_headers, db_session, test_user, setup_database):
        """Test checking health of inactive integration"""
        # Create inactive integration
        inactive_integration = Integration(
            user_id=test_user.id,
            name="Inactive Integration",
            integration_type=IntegrationType.GOOGLE_CALENDAR,
            status=IntegrationStatus.INACTIVE,
            is_active=False
        )
        db_session.add(inactive_integration)
        db_session.commit()
        db_session.refresh(inactive_integration)
        
        response = client.get(
            f"/api/v1/integrations/health/{inactive_integration.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["healthy"] is False
        assert data["status"] == "inactive"
        assert "disabled" in data["error"].lower()


class TestTokenManagement:
    """Test token refresh and management"""

    @patch('services.integration_service.IntegrationServiceFactory.create')
    def test_refresh_token_success(self, mock_factory, client, auth_headers, test_integration, setup_database):
        """Test successful token refresh"""
        mock_service = Mock()
        mock_service.refresh_token_if_needed.return_value = True
        mock_factory.return_value = mock_service
        
        response = client.post(
            f"/api/v1/integrations/{test_integration.id}/refresh-token",
            headers=auth_headers,
            json={"force": True}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "refreshed successfully" in data["message"]

    def test_refresh_token_no_refresh_token(self, client, auth_headers, db_session, test_user, setup_database):
        """Test token refresh when no refresh token available"""
        # Create integration without refresh token
        integration = Integration(
            user_id=test_user.id,
            name="No Refresh Token Integration",
            integration_type=IntegrationType.GOOGLE_CALENDAR,
            status=IntegrationStatus.ACTIVE,
            access_token="test_access_token",
            is_active=True
        )
        db_session.add(integration)
        db_session.commit()
        db_session.refresh(integration)
        
        response = client.post(
            f"/api/v1/integrations/{integration.id}/refresh-token",
            headers=auth_headers,
            json={"force": True}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "no refresh token" in data["message"].lower()

    def test_refresh_token_not_needed(self, client, auth_headers, test_integration, setup_database):
        """Test token refresh when token is still valid"""
        response = client.post(
            f"/api/v1/integrations/{test_integration.id}/refresh-token",
            headers=auth_headers,
            json={"force": False}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "still valid" in data["message"].lower()


class TestErrorHandling:
    """Test error handling scenarios"""

    def test_malformed_json_request(self, client, auth_headers, setup_database):
        """Test handling of malformed JSON requests"""
        response = client.post(
            "/api/v1/integrations/connect",
            headers=auth_headers,
            data="invalid json"
        )
        
        assert response.status_code == 422

    def test_missing_required_fields(self, client, auth_headers, setup_database):
        """Test handling of missing required fields"""
        response = client.post(
            "/api/v1/integrations/connect",
            headers=auth_headers,
            json={}  # Missing integration_type
        )
        
        assert response.status_code == 422

    @patch('services.integration_service.IntegrationServiceFactory.create')
    def test_service_exception_handling(self, mock_factory, client, auth_headers, setup_database):
        """Test handling of service exceptions"""
        mock_factory.side_effect = Exception("Service unavailable")
        
        response = client.post(
            "/api/v1/integrations/connect",
            headers=auth_headers,
            json={"integration_type": "google_calendar"}
        )
        
        assert response.status_code == 500
        assert "Service unavailable" in response.json()["detail"]


class TestPermissions:
    """Test access control and permissions"""

    def test_user_can_only_access_own_integrations(self, client, db_session, setup_database):
        """Test that users can only access their own integrations"""
        # Create two users
        user1 = User(email="user1@example.com", username="user1", hashed_password="hash1")
        user2 = User(email="user2@example.com", username="user2", hashed_password="hash2")
        db_session.add_all([user1, user2])
        db_session.commit()
        
        # Create integration for user1
        integration = Integration(
            user_id=user1.id,
            name="User 1 Integration",
            integration_type=IntegrationType.GOOGLE_CALENDAR,
            status=IntegrationStatus.ACTIVE,
            is_active=True
        )
        db_session.add(integration)
        db_session.commit()
        db_session.refresh(integration)
        
        # Try to access user1's integration as user2
        user2_token = create_access_token(data={"sub": user2.email})
        user2_headers = {"Authorization": f"Bearer {user2_token}"}
        
        response = client.get(
            f"/api/v1/integrations/{integration.id}",
            headers=user2_headers
        )
        
        assert response.status_code == 404  # Should not find integration

    def test_admin_access_all_integrations(self, client, db_session, setup_database):
        """Test admin access to all integrations endpoint"""
        # Create admin user
        admin_user = User(
            email="admin@example.com",
            username="admin",
            role="admin",
            hashed_password="admin_hash"
        )
        db_session.add(admin_user)
        db_session.commit()
        
        admin_token = create_access_token(data={"sub": admin_user.email})
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.get("/api/v1/integrations/admin/all", headers=admin_headers)
        assert response.status_code == 200

    def test_non_admin_cannot_access_admin_endpoints(self, client, auth_headers, setup_database):
        """Test that non-admin users cannot access admin endpoints"""
        response = client.get("/api/v1/integrations/admin/all", headers=auth_headers)
        assert response.status_code == 403


if __name__ == "__main__":
    pytest.main([__file__, "-v"])