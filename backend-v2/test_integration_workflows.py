#!/usr/bin/env python3
"""
End-to-end integration workflow tests.
Tests complete user journeys and integration scenarios from start to finish.
"""

import pytest
import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from models import User
from models.integration import Integration, IntegrationType, IntegrationStatus
from models.review import Review, ReviewPlatform, ReviewSentiment
from services.gmb_service import GMBService
from services.integration_service import BaseIntegrationService
from main import app
from utils.auth import create_access_token
from test_fixtures import TestDataFactory, TestMockResponses, MockIntegrationService


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_workflows.db"
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
    user = TestDataFactory.create_user()
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
def client():
    """Create test client"""
    return TestClient(app)


class TestCompleteOAuthWorkflow:
    """Test complete OAuth integration workflow from start to finish"""

    @patch('services.integration_service.IntegrationServiceFactory.create')
    @patch('httpx.AsyncClient.post')
    async def test_google_calendar_oauth_complete_flow(
        self, mock_post, mock_factory, client, auth_headers, db_session, test_user, setup_database
    ):
        """Test complete Google Calendar OAuth flow"""
        
        # Setup mock service
        mock_service = MockIntegrationService(IntegrationType.GOOGLE_CALENDAR)
        mock_factory.return_value = mock_service
        
        # Step 1: Initiate OAuth flow
        response = client.post(
            "/api/v1/integrations/connect",
            headers=auth_headers,
            json={"integration_type": "google_calendar"}
        )
        
        assert response.status_code == 200
        oauth_data = response.json()
        assert "authorization_url" in oauth_data
        assert "state" in oauth_data
        
        # Verify OAuth URL contains expected parameters
        oauth_url = oauth_data["authorization_url"]
        assert "accounts.google.com" in oauth_url
        assert "client_id=test" in oauth_url
        assert f"state={oauth_data['state']}" in oauth_url
        
        # Step 2: Mock token exchange
        mock_token_response = TestMockResponses.oauth_token_response()
        mock_post.return_value = Mock(
            status_code=200,
            json=lambda: mock_token_response
        )
        
        # Step 3: Handle OAuth callback
        response = client.get(
            "/api/v1/integrations/callback",
            params={
                "code": "test_auth_code",
                "state": oauth_data["state"],
                "integration_type": "google_calendar"
            }
        )
        
        assert response.status_code == 200
        callback_data = response.json()
        assert callback_data["success"] is True
        assert "integration_id" in callback_data
        
        # Step 4: Verify integration was created in database
        integration = db_session.query(Integration).filter_by(
            user_id=test_user.id,
            integration_type=IntegrationType.GOOGLE_CALENDAR
        ).first()
        
        assert integration is not None
        assert integration.status == IntegrationStatus.ACTIVE
        assert integration.access_token is not None
        assert integration.refresh_token is not None
        assert len(integration.scopes) > 0
        
        # Step 5: Test integration status endpoint
        response = client.get("/api/v1/integrations/status", headers=auth_headers)
        assert response.status_code == 200
        integrations = response.json()
        assert len(integrations) == 1
        assert integrations[0]["integration_type"] == "google_calendar"
        assert integrations[0]["is_connected"] is True

    @patch('services.integration_service.IntegrationServiceFactory.create')
    async def test_oauth_error_handling_workflow(
        self, mock_factory, client, auth_headers, setup_database
    ):
        """Test OAuth error handling workflow"""
        
        mock_service = MockIntegrationService(IntegrationType.GOOGLE_CALENDAR)
        mock_service.set_failure_mode(True, "OAuth service temporarily unavailable")
        mock_factory.return_value = mock_service
        
        # Step 1: Attempt OAuth initiation (should fail)
        response = client.post(
            "/api/v1/integrations/connect",
            headers=auth_headers,
            json={"integration_type": "google_calendar"}
        )
        
        assert response.status_code == 500
        error_data = response.json()
        assert "OAuth service temporarily unavailable" in error_data["detail"]
        
        # Step 2: Test callback with OAuth provider error
        response = client.get(
            "/api/v1/integrations/callback",
            params={
                "error": "access_denied",
                "error_description": "User denied access",
                "state": "test_state",
                "integration_type": "google_calendar"
            }
        )
        
        assert response.status_code == 200
        callback_data = response.json()
        assert callback_data["success"] is False
        assert "access_denied" in callback_data["message"]

    @patch('services.integration_service.IntegrationServiceFactory.create')
    async def test_token_refresh_workflow(
        self, mock_factory, client, auth_headers, db_session, test_user, setup_database
    ):
        """Test automatic token refresh workflow"""
        
        # Create expired integration
        expired_integration = TestDataFactory.create_expired_integration(test_user.id)
        db_session.add(expired_integration)
        db_session.commit()
        
        mock_service = MockIntegrationService(IntegrationType.GOOGLE_CALENDAR)
        mock_factory.return_value = mock_service
        
        # Test token refresh endpoint
        response = client.post(
            f"/api/v1/integrations/{expired_integration.id}/refresh-token",
            headers=auth_headers,
            json={"force": True}
        )
        
        assert response.status_code == 200
        refresh_data = response.json()
        assert refresh_data["success"] is True
        assert "refreshed successfully" in refresh_data["message"]


class TestNonOAuthIntegrationWorkflow:
    """Test non-OAuth integration workflows (API key based)"""

    async def test_sendgrid_api_key_workflow(
        self, client, auth_headers, db_session, test_user, setup_database
    ):
        """Test complete SendGrid API key integration workflow"""
        
        # Step 1: Create integration with API key
        integration_data = {
            "name": "SendGrid Email Service",
            "integration_type": "sendgrid",
            "is_active": True,
            "api_key": "SG.test_api_key_123",
            "config": {
                "from_email": "noreply@barbershop.com",
                "template_id": "d-abc123"
            }
        }
        
        with patch('services.integration_service.IntegrationServiceFactory.create') as mock_factory:
            mock_service = MockIntegrationService(IntegrationType.SENDGRID)
            mock_factory.return_value = mock_service
            
            # Create integration
            response = client.post(
                "/api/v1/integrations",
                headers=auth_headers,
                json=integration_data
            )
            
            assert response.status_code == 201
            created_integration = response.json()
            assert created_integration["name"] == "SendGrid Email Service"
            assert created_integration["integration_type"] == "sendgrid"
            
            integration_id = created_integration["id"]
            
            # Step 2: Test connection
            response = client.post(
                f"/api/v1/integrations/{integration_id}/test",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            test_result = response.json()
            assert test_result["success"] is True
            
            # Step 3: Update configuration
            update_data = {
                "config": {
                    "from_email": "updated@barbershop.com",
                    "template_id": "d-xyz789"
                }
            }
            
            response = client.put(
                f"/api/v1/integrations/{integration_id}",
                headers=auth_headers,
                json=update_data
            )
            
            assert response.status_code == 200
            updated_integration = response.json()
            assert updated_integration["config"]["from_email"] == "updated@barbershop.com"

    async def test_api_key_validation_workflow(
        self, client, auth_headers, setup_database
    ):
        """Test API key validation workflow"""
        
        # Test with missing API key
        integration_data = {
            "name": "Invalid SendGrid",
            "integration_type": "sendgrid",
            "is_active": True
            # Missing api_key
        }
        
        response = client.post(
            "/api/v1/integrations",
            headers=auth_headers,
            json=integration_data
        )
        
        # Should fail validation
        assert response.status_code == 422 or response.status_code == 400


class TestGMBWorkflow:
    """Test Google My Business integration workflow"""

    @patch('services.gmb_service.GMBService.get_authenticated_client')
    @patch('services.gmb_service.GMBService.get_access_token')
    async def test_gmb_review_sync_workflow(
        self, mock_get_token, mock_get_client, client, auth_headers, db_session, test_user, setup_database
    ):
        """Test complete GMB review synchronization workflow"""
        
        # Setup GMB integration
        gmb_integration = TestDataFactory.create_oauth_integration(
            user_id=test_user.id,
            integration_type=IntegrationType.GOOGLE_MY_BUSINESS
        )
        db_session.add(gmb_integration)
        db_session.commit()
        
        # Mock authenticated client
        mock_client = Mock()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = TestMockResponses.gmb_reviews_response()
        mock_client.get.return_value = mock_response
        mock_get_client.return_value.__aenter__.return_value = mock_client
        mock_get_token.return_value = "valid_access_token"
        
        # Step 1: Sync reviews
        gmb_service = GMBService()
        new_count, updated_count, errors = await gmb_service.sync_reviews_for_location(
            db_session,
            gmb_integration,
            "loc_abc123"
        )
        
        assert new_count == 3  # 3 reviews in mock response
        assert updated_count == 0
        assert len(errors) == 0
        
        # Step 2: Verify reviews were created
        reviews = db_session.query(Review).filter_by(user_id=test_user.id).all()
        assert len(reviews) == 3
        
        # Check review details
        positive_review = next(r for r in reviews if r.rating == 5.0)
        assert positive_review.sentiment == ReviewSentiment.POSITIVE
        assert positive_review.platform == ReviewPlatform.GOOGLE
        
        negative_review = next(r for r in reviews if r.rating == 2.0)
        assert negative_review.sentiment == ReviewSentiment.NEGATIVE
        
        # Step 3: Test review response
        review_to_respond = positive_review
        mock_response.json.return_value = TestMockResponses.gmb_review_response_success()
        
        response_result = await gmb_service.respond_to_review(
            gmb_integration,
            "loc_abc123",
            review_to_respond.external_review_id,
            "Thank you for your wonderful review!"
        )
        
        assert "reply" in response_result
        assert "Thank you" in response_result["reply"]["comment"]

    @patch('services.gmb_service.GMBService.get_authenticated_client')
    async def test_gmb_locations_workflow(
        self, mock_get_client, db_session, test_user, setup_database
    ):
        """Test GMB business locations workflow"""
        
        gmb_integration = TestDataFactory.create_oauth_integration(
            user_id=test_user.id,
            integration_type=IntegrationType.GOOGLE_MY_BUSINESS
        )
        db_session.add(gmb_integration)
        db_session.commit()
        
        # Mock client responses
        mock_client = Mock()
        
        # Mock accounts response
        accounts_response = Mock()
        accounts_response.status_code = 200
        accounts_response.json.return_value = TestMockResponses.gmb_business_accounts_response()
        
        # Mock locations response
        locations_response = Mock()
        locations_response.status_code = 200
        locations_response.json.return_value = TestMockResponses.gmb_business_locations_response()
        
        mock_client.get.side_effect = [accounts_response, locations_response]
        mock_get_client.return_value.__aenter__.return_value = mock_client
        
        # Test workflow
        gmb_service = GMBService()
        
        # Step 1: Get business accounts
        accounts = await gmb_service.get_business_accounts(gmb_integration)
        assert len(accounts) == 2
        assert accounts[0]["accountName"] == "Downtown Barbershop"
        
        # Step 2: Get business locations
        locations = await gmb_service.get_business_locations(gmb_integration)
        assert len(locations) == 1
        assert locations[0].name == "Downtown Barbershop"
        assert locations[0].address == "123 Main Street, Downtown, NY, 10001"


class TestIntegrationHealthMonitoring:
    """Test integration health monitoring workflows"""

    @patch('services.integration_service.IntegrationServiceFactory.create')
    async def test_health_monitoring_workflow(
        self, mock_factory, client, auth_headers, db_session, test_user, setup_database
    ):
        """Test complete health monitoring workflow"""
        
        # Create multiple integrations with different states
        healthy_integration = TestDataFactory.create_oauth_integration(
            user_id=test_user.id,
            integration_type=IntegrationType.GOOGLE_CALENDAR
        )
        
        error_integration = TestDataFactory.create_error_integration(
            user_id=test_user.id,
            error_message="API rate limit exceeded"
        )
        error_integration.integration_type = IntegrationType.SENDGRID
        
        db_session.add_all([healthy_integration, error_integration])
        db_session.commit()
        
        # Setup mock services
        def create_mock_service(integration_type):
            service = MockIntegrationService(integration_type)
            if integration_type == IntegrationType.SENDGRID:
                service.set_failure_mode(True, "API rate limit exceeded")
            return service
        
        mock_factory.side_effect = lambda int_type, db: create_mock_service(int_type)
        
        # Step 1: Check all integrations health
        response = client.get("/api/v1/integrations/health/all", headers=auth_headers)
        assert response.status_code == 200
        
        health_summary = response.json()
        assert health_summary["total_integrations"] == 2
        assert health_summary["healthy_count"] == 1
        assert health_summary["error_count"] == 1
        
        # Step 2: Check specific integration health
        response = client.get(
            f"/api/v1/integrations/health/{healthy_integration.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        health_check = response.json()
        assert health_check["healthy"] is True
        
        response = client.get(
            f"/api/v1/integrations/health/{error_integration.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        health_check = response.json()
        assert health_check["healthy"] is False
        assert "rate limit" in health_check["error"]


class TestMultiUserWorkflow:
    """Test multi-user scenarios and isolation"""

    async def test_user_isolation_workflow(
        self, client, db_session, setup_database
    ):
        """Test that users can only access their own integrations"""
        
        # Create two users
        user1 = TestDataFactory.create_user(email="user1@test.com", username="user1")
        user2 = TestDataFactory.create_user(email="user2@test.com", username="user2")
        db_session.add_all([user1, user2])
        db_session.commit()
        
        # Create integrations for each user
        user1_integration = TestDataFactory.create_integration(
            user_id=user1.id,
            name="User 1 Integration"
        )
        user2_integration = TestDataFactory.create_integration(
            user_id=user2.id,
            name="User 2 Integration"
        )
        db_session.add_all([user1_integration, user2_integration])
        db_session.commit()
        
        # Create auth headers for each user
        user1_token = create_access_token(data={"sub": user1.email})
        user2_token = create_access_token(data={"sub": user2.email})
        
        user1_headers = {"Authorization": f"Bearer {user1_token}"}
        user2_headers = {"Authorization": f"Bearer {user2_token}"}
        
        # Test user1 can only see their integration
        response = client.get("/api/v1/integrations/status", headers=user1_headers)
        assert response.status_code == 200
        integrations = response.json()
        assert len(integrations) == 1
        assert integrations[0]["name"] == "User 1 Integration"
        
        # Test user2 can only see their integration
        response = client.get("/api/v1/integrations/status", headers=user2_headers)
        assert response.status_code == 200
        integrations = response.json()
        assert len(integrations) == 1
        assert integrations[0]["name"] == "User 2 Integration"
        
        # Test user1 cannot access user2's integration
        response = client.get(
            f"/api/v1/integrations/{user2_integration.id}",
            headers=user1_headers
        )
        assert response.status_code == 404


class TestErrorRecoveryWorkflow:
    """Test error recovery and resilience workflows"""

    @patch('services.integration_service.IntegrationServiceFactory.create')
    async def test_integration_recovery_workflow(
        self, mock_factory, client, auth_headers, db_session, test_user, setup_database
    ):
        """Test integration error recovery workflow"""
        
        # Create integration in error state
        error_integration = TestDataFactory.create_error_integration(
            user_id=test_user.id,
            error_message="Connection timeout"
        )
        db_session.add(error_integration)
        db_session.commit()
        
        # Setup mock service that initially fails then succeeds
        mock_service = MockIntegrationService(IntegrationType.GOOGLE_CALENDAR)
        mock_service.set_failure_mode(True, "Connection timeout")
        mock_factory.return_value = mock_service
        
        # Step 1: Health check should show error
        response = client.get(
            f"/api/v1/integrations/health/{error_integration.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        health_check = response.json()
        assert health_check["healthy"] is False
        
        # Step 2: Fix the service
        mock_service.set_failure_mode(False)
        
        # Step 3: Health check should now succeed
        response = client.get(
            f"/api/v1/integrations/health/{error_integration.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        health_check = response.json()
        assert health_check["healthy"] is True
        
        # Step 4: Verify integration status is updated
        db_session.refresh(error_integration)
        assert error_integration.status == IntegrationStatus.ACTIVE
        assert error_integration.last_error is None

    async def test_rate_limiting_workflow(
        self, client, auth_headers, db_session, test_user, setup_database
    ):
        """Test rate limiting and backoff workflow"""
        
        integration = TestDataFactory.create_oauth_integration(
            user_id=test_user.id,
            integration_type=IntegrationType.GOOGLE_CALENDAR
        )
        db_session.add(integration)
        db_session.commit()
        
        with patch('services.integration_service.IntegrationServiceFactory.create') as mock_factory:
            mock_service = MockIntegrationService(IntegrationType.GOOGLE_CALENDAR)
            mock_service.set_failure_mode(True, "Rate limit exceeded")
            mock_factory.return_value = mock_service
            
            # Multiple rapid health checks should handle rate limiting gracefully
            for i in range(5):
                response = client.get(
                    f"/api/v1/integrations/health/{integration.id}",
                    headers=auth_headers
                )
                assert response.status_code == 200
                health_check = response.json()
                assert health_check["healthy"] is False
                assert "rate limit" in health_check["error"].lower()


class TestDataConsistencyWorkflow:
    """Test data consistency across operations"""

    async def test_review_sync_consistency_workflow(
        self, db_session, test_user, setup_database
    ):
        """Test review sync maintains data consistency"""
        
        gmb_integration = TestDataFactory.create_oauth_integration(
            user_id=test_user.id,
            integration_type=IntegrationType.GOOGLE_MY_BUSINESS
        )
        db_session.add(gmb_integration)
        db_session.commit()
        
        # Create existing review
        existing_review = TestDataFactory.create_review(
            user_id=test_user.id,
            external_review_id="review_123",
            rating=4.0,
            review_text="Original review text"
        )
        db_session.add(existing_review)
        db_session.commit()
        
        with patch('services.gmb_service.GMBService.get_location_reviews') as mock_get_reviews:
            # Mock updated review data
            updated_review_data = [
                {
                    "name": "accounts/123/locations/456/reviews/review_123",
                    "reviewId": "review_123",
                    "reviewer": {"displayName": "John Doe"},
                    "starRating": "FIVE",  # Changed from 4 to 5
                    "comment": "Updated review text - even better now!",  # Updated text
                    "createTime": "2024-01-15T10:30:00Z",
                    "updateTime": "2024-01-16T15:45:00Z"  # Update timestamp
                }
            ]
            mock_get_reviews.return_value = updated_review_data
            
            # Run sync
            gmb_service = GMBService()
            new_count, updated_count, errors = await gmb_service.sync_reviews_for_location(
                db_session,
                gmb_integration,
                "456"
            )
            
            # Should update existing review, not create new one
            assert new_count == 0
            assert updated_count == 1
            assert len(errors) == 0
            
            # Verify review was updated
            db_session.refresh(existing_review)
            assert existing_review.rating == 5.0
            assert "Updated review text" in existing_review.review_text
            assert existing_review.sentiment == ReviewSentiment.POSITIVE


if __name__ == "__main__":
    pytest.main([__file__, "-v"])