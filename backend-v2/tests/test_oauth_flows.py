"""
Tests for OAuth flows across different integrations
"""

import pytest
import json
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session

from services.integration_service import BaseIntegrationService
from models.integration import Integration, IntegrationType, IntegrationStatus
from models import User


class MockIntegrationService(BaseIntegrationService):
    """Mock integration service for testing"""
    
    @property
    def integration_type(self) -> IntegrationType:
        return IntegrationType.GOOGLE_MY_BUSINESS
    
    @property
    def oauth_authorize_url(self) -> str:
        return "https://accounts.google.com/oauth/authorize"
    
    @property
    def oauth_token_url(self) -> str:
        return "https://oauth2.googleapis.com/token"
    
    @property
    def required_scopes(self) -> list:
        return ["https://www.googleapis.com/auth/business.manage"]
    
    @property
    def client_id(self) -> str:
        return "test_client_id"
    
    @property
    def client_secret(self) -> str:
        return "test_client_secret"
    
    @property
    def default_redirect_uri(self) -> str:
        return "http://localhost:3000/oauth/callback"
    
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> dict:
        return {
            "access_token": "test_access_token",
            "refresh_token": "test_refresh_token",
            "expires_in": 3600
        }
    
    async def refresh_access_token(self, refresh_token: str) -> dict:
        return {
            "access_token": "new_access_token",
            "expires_in": 3600
        }
    
    async def verify_connection(self, integration: Integration) -> tuple:
        return True, None


@pytest.mark.asyncio
class TestOAuthFlows:
    """Test OAuth authentication flows"""
    
    @pytest.fixture
    def oauth_service(self, db: Session):
        """Create mock OAuth service"""
        return MockIntegrationService(db)
    
    @pytest.fixture
    def test_integration(self, db: Session, test_user: User):
        """Create test integration"""
        integration = Integration(
            user_id=test_user.id,
            name="Test Integration",
            integration_type=IntegrationType.GOOGLE_MY_BUSINESS,
            status=IntegrationStatus.PENDING
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)
        return integration
    
    def test_generate_oauth_state(self, oauth_service, test_user: User):
        """Test OAuth state generation"""
        state = oauth_service.generate_oauth_state(test_user.id)
        
        assert state is not None
        assert isinstance(state, str)
        
        # Should be valid JSON
        state_data = json.loads(state)
        assert state_data["user_id"] == test_user.id
        assert "timestamp" in state_data
        assert "nonce" in state_data
    
    def test_verify_oauth_state_valid(self, oauth_service, test_user: User):
        """Test verifying valid OAuth state"""
        # Generate a state
        state = oauth_service.generate_oauth_state(test_user.id, 123)
        
        # Verify it
        state_data = oauth_service.verify_oauth_state(state)
        
        assert state_data["user_id"] == test_user.id
        assert state_data["integration_id"] == 123
        assert "timestamp" in state_data
        assert "nonce" in state_data
    
    def test_verify_oauth_state_invalid_json(self, oauth_service):
        """Test verifying invalid OAuth state (bad JSON)"""
        with pytest.raises(Exception):  # Should raise HTTPException but we'll catch any exception
            oauth_service.verify_oauth_state("invalid_json")
    
    def test_verify_oauth_state_expired(self, oauth_service):
        """Test verifying expired OAuth state"""
        # Create an expired state manually
        expired_state = json.dumps({
            "user_id": 1,
            "timestamp": "2020-01-01T00:00:00",  # Very old timestamp
            "nonce": "test_nonce"
        })
        
        with pytest.raises(Exception):  # Should raise HTTPException
            oauth_service.verify_oauth_state(expired_state)
    
    async def test_exchange_code_for_tokens(self, oauth_service):
        """Test exchanging authorization code for tokens"""
        result = await oauth_service.exchange_code_for_tokens("test_code", "http://localhost/callback")
        
        assert result["access_token"] == "test_access_token"
        assert result["refresh_token"] == "test_refresh_token"
        assert result["expires_in"] == 3600
    
    async def test_refresh_access_token(self, oauth_service):
        """Test refreshing access token"""
        result = await oauth_service.refresh_access_token("test_refresh_token")
        
        assert result["access_token"] == "new_access_token"
        assert result["expires_in"] == 3600
    
    async def test_handle_oauth_callback_new_integration(self, oauth_service, test_user: User):
        """Test handling OAuth callback for new integration"""
        # Generate state without integration_id (new integration)
        state = oauth_service.generate_oauth_state(test_user.id)
        
        # Handle callback
        integration = await oauth_service.handle_oauth_callback(
            code="test_code",
            state=state,
            redirect_uri="http://localhost/callback"
        )
        
        assert integration is not None
        assert integration.user_id == test_user.id
        assert integration.access_token == "test_access_token"
        assert integration.refresh_token == "test_refresh_token"
        assert integration.status == IntegrationStatus.ACTIVE
    
    async def test_handle_oauth_callback_existing_integration(self, oauth_service, test_user: User, test_integration: Integration):
        """Test handling OAuth callback for existing integration"""
        # Generate state with integration_id (existing integration)
        state = oauth_service.generate_oauth_state(test_user.id, test_integration.id)
        
        # Handle callback
        integration = await oauth_service.handle_oauth_callback(
            code="test_code",
            state=state,
            redirect_uri="http://localhost/callback"
        )
        
        assert integration.id == test_integration.id
        assert integration.access_token == "test_access_token"
        assert integration.refresh_token == "test_refresh_token"
        assert integration.status == IntegrationStatus.ACTIVE
    
    async def test_refresh_token_if_needed_not_expired(self, oauth_service, test_integration: Integration):
        """Test refresh token when token is not expired"""
        from datetime import datetime, timedelta
        
        # Set token to expire in 1 hour (not expired)
        test_integration.token_expires_at = datetime.utcnow() + timedelta(hours=1)
        test_integration.refresh_token = "test_refresh_token"
        
        result = await oauth_service.refresh_token_if_needed(test_integration)
        
        # Should not refresh since token is not expired
        assert result is False
    
    async def test_refresh_token_if_needed_expired(self, oauth_service, test_integration: Integration):
        """Test refresh token when token is expired"""
        from datetime import datetime, timedelta
        
        # Set token to expire in 1 minute (should trigger refresh)
        test_integration.token_expires_at = datetime.utcnow() + timedelta(minutes=1)
        test_integration.refresh_token = "test_refresh_token"
        
        result = await oauth_service.refresh_token_if_needed(test_integration)
        
        # Should refresh since token is about to expire
        assert result is True
        assert test_integration.access_token == "new_access_token"
    
    async def test_refresh_token_if_needed_no_refresh_token(self, oauth_service, test_integration: Integration):
        """Test refresh token when no refresh token is available"""
        from datetime import datetime, timedelta
        
        # Set token to expire but no refresh token
        test_integration.token_expires_at = datetime.utcnow() + timedelta(minutes=1)
        test_integration.refresh_token = None
        
        result = await oauth_service.refresh_token_if_needed(test_integration)
        
        # Should not refresh since no refresh token is available
        assert result is False
    
    async def test_verify_connection(self, oauth_service, test_integration: Integration):
        """Test connection verification"""
        is_valid, error = await oauth_service.verify_connection(test_integration)
        
        assert is_valid is True
        assert error is None
    
    async def test_perform_health_check(self, oauth_service, test_integration: Integration):
        """Test integration health check"""
        health_check = await oauth_service.perform_health_check(test_integration)
        
        assert health_check.integration_id == test_integration.id
        assert health_check.integration_type == test_integration.integration_type
        assert health_check.healthy is True
        assert health_check.error is None
    
    def test_oauth_configuration_properties(self, oauth_service):
        """Test that OAuth configuration properties are properly set"""
        assert oauth_service.integration_type == IntegrationType.GOOGLE_MY_BUSINESS
        assert oauth_service.oauth_authorize_url
        assert oauth_service.oauth_token_url
        assert oauth_service.client_id
        assert oauth_service.client_secret
        assert oauth_service.default_redirect_uri
        assert isinstance(oauth_service.required_scopes, list)
        assert len(oauth_service.required_scopes) > 0