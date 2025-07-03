"""
Unit tests for Google Ads integration service.
Tests OAuth flow, campaign management, and conversion tracking.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from decimal import Decimal

from services.google_ads_service import GoogleAdsService
from models.integration import Integration, IntegrationType, IntegrationStatus
from models.tracking import ConversionEvent, ConversionStatus, EventType
from models import User, Client, Appointment


@pytest.fixture
def mock_db():
    """Mock database session"""
    return MagicMock()


@pytest.fixture
def google_ads_service(mock_db):
    """Create GoogleAdsService instance"""
    return GoogleAdsService(mock_db)


@pytest.fixture
def mock_integration():
    """Mock integration object"""
    integration = MagicMock(spec=Integration)
    integration.id = 1
    integration.user_id = 1
    integration.integration_type = IntegrationType.GOOGLE_ADS
    integration.access_token = "encrypted_access_token"
    integration.refresh_token = "encrypted_refresh_token"
    integration.config = {"customer_id": "1234567890"}
    integration.status = IntegrationStatus.ACTIVE
    integration.is_token_expired.return_value = False
    return integration


class TestGoogleAdsService:
    """Test Google Ads service functionality"""
    
    def test_integration_type(self, google_ads_service):
        """Test that service returns correct integration type"""
        assert google_ads_service.integration_type == IntegrationType.GOOGLE_ADS
    
    def test_required_scopes(self, google_ads_service):
        """Test that service defines required OAuth scopes"""
        assert "https://www.googleapis.com/auth/adwords" in google_ads_service.required_scopes
    
    def test_get_oauth_url(self, google_ads_service):
        """Test OAuth URL generation"""
        with patch.object(google_ads_service, '_client_id', 'test_client_id'):
            redirect_uri = "http://localhost:8000/callback"
            state = "test_state"
            
            url = google_ads_service.get_oauth_url(redirect_uri, state)
            
            assert "https://accounts.google.com/o/oauth2/v2/auth" in url
            assert "client_id=test_client_id" in url
            assert f"redirect_uri={redirect_uri}" in url
            assert f"state={state}" in url
            assert "scope=https://www.googleapis.com/auth/adwords" in url
    
    @pytest.mark.asyncio
    async def test_exchange_code_for_tokens(self, google_ads_service):
        """Test OAuth code exchange"""
        with patch.object(google_ads_service, '_client_id', 'test_client_id'), \
             patch.object(google_ads_service, '_client_secret', 'test_secret'), \
             patch('httpx.AsyncClient') as mock_client:
            
            # Mock successful token response
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "access_token": "new_access_token",
                "refresh_token": "new_refresh_token",
                "expires_in": 3600
            }
            
            mock_client_instance = AsyncMock()
            mock_client_instance.post.return_value = mock_response
            mock_client.return_value.__aenter__.return_value = mock_client_instance
            
            result = await google_ads_service.exchange_code_for_tokens(
                "auth_code", "http://localhost:8000/callback"
            )
            
            assert result["access_token"] == "new_access_token"
            assert result["refresh_token"] == "new_refresh_token"
    
    @pytest.mark.asyncio
    async def test_create_campaign(self, google_ads_service, mock_integration):
        """Test campaign creation"""
        with patch.object(google_ads_service, 'get_authenticated_headers') as mock_headers, \
             patch('httpx.AsyncClient') as mock_client:
            
            mock_headers.return_value = {
                "Authorization": "Bearer token",
                "developer-token": "dev_token"
            }
            
            # Mock successful campaign creation
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "results": [
                    {"resourceName": "customers/1234567890/campaignBudgets/123"},
                    {"resourceName": "customers/1234567890/campaigns/456"}
                ]
            }
            
            mock_client_instance = AsyncMock()
            mock_client_instance.post.return_value = mock_response
            mock_client.return_value.__aenter__.return_value = mock_client_instance
            
            result = await google_ads_service.create_campaign(
                mock_integration,
                "Test Campaign",
                Decimal("100.00"),
                "SEARCH",
                "PAUSED"
            )
            
            assert result["success"] is True
            assert "campaign_id" in result
            assert "budget_id" in result
    
    @pytest.mark.asyncio
    async def test_upload_offline_conversions(self, google_ads_service, mock_integration):
        """Test offline conversion upload"""
        mock_integration.config = {
            "customer_id": "1234567890",
            "conversion_action_id": "987654321"
        }
        
        conversions = [
            {
                "gclid": "test_gclid_1",
                "conversion_time": "2024-01-01T10:00:00Z",
                "value": 50.0,
                "currency": "USD"
            }
        ]
        
        with patch.object(google_ads_service, 'get_authenticated_headers') as mock_headers, \
             patch('httpx.AsyncClient') as mock_client:
            
            mock_headers.return_value = {"Authorization": "Bearer token"}
            
            # Mock successful upload
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "results": [{"resourceName": "customers/1234567890/conversionActions/987654321"}]
            }
            
            mock_client_instance = AsyncMock()
            mock_client_instance.post.return_value = mock_response
            mock_client.return_value.__aenter__.return_value = mock_client_instance
            
            result = await google_ads_service.upload_offline_conversions(
                mock_integration, conversions
            )
            
            assert result["success"] is True
            assert result["uploaded_count"] == 1
            assert result["total_count"] == 1
    
    @pytest.mark.asyncio
    async def test_sync_conversions_from_tracking(self, google_ads_service, mock_integration, mock_db):
        """Test syncing conversions from tracking system"""
        # Mock conversion events
        mock_conversion = MagicMock(spec=ConversionEvent)
        mock_conversion.created_at = datetime.utcnow()
        mock_conversion.event_data = {"gclid": "test_gclid"}
        mock_conversion.event_value = 75.0
        mock_conversion.event_currency = "USD"
        mock_conversion.user_id = 1
        mock_conversion.event_name = "purchase"
        mock_conversion.event_type = EventType.PURCHASE
        mock_conversion.google_ads_synced = False
        
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = [mock_conversion]
        mock_db.query.return_value = mock_query
        
        with patch.object(google_ads_service, 'upload_offline_conversions') as mock_upload:
            mock_upload.return_value = {
                "success": True,
                "uploaded_count": 1,
                "total_count": 1
            }
            
            result = await google_ads_service.sync_conversions_from_tracking(
                mock_integration,
                datetime.utcnow() - timedelta(days=1),
                datetime.utcnow()
            )
            
            assert result["success"] is True
            assert mock_conversion.google_ads_synced is True
            assert mock_conversion.status == ConversionStatus.TRACKED
            mock_db.commit.assert_called()
    
    @pytest.mark.asyncio
    async def test_create_customer_match_audience(self, google_ads_service, mock_integration):
        """Test customer match audience creation"""
        customer_data = [
            {
                "email": "test@example.com",
                "phone": "+1234567890",
                "first_name": "John",
                "last_name": "Doe",
                "postal_code": "12345",
                "country_code": "US"
            }
        ]
        
        with patch.object(google_ads_service, 'get_authenticated_headers') as mock_headers, \
             patch('httpx.AsyncClient') as mock_client:
            
            mock_headers.return_value = {"Authorization": "Bearer token"}
            
            # Mock user list creation
            mock_response1 = MagicMock()
            mock_response1.status_code = 200
            mock_response1.json.return_value = {
                "results": [{"resourceName": "customers/1234567890/userLists/123"}]
            }
            
            # Mock member upload
            mock_response2 = MagicMock()
            mock_response2.status_code = 200
            
            mock_client_instance = AsyncMock()
            mock_client_instance.post.side_effect = [mock_response1, mock_response2]
            mock_client.return_value.__aenter__.return_value = mock_client_instance
            
            result = await google_ads_service.create_customer_match_audience(
                mock_integration,
                "Test Audience",
                customer_data,
                30
            )
            
            assert result["success"] is True
            assert result["members_added"] == 1
            assert result["audience_name"] == "Test Audience"
    
    @pytest.mark.asyncio
    async def test_get_campaign_performance(self, google_ads_service, mock_integration):
        """Test campaign performance retrieval"""
        with patch.object(google_ads_service, 'get_authenticated_headers') as mock_headers, \
             patch('httpx.AsyncClient') as mock_client:
            
            mock_headers.return_value = {"Authorization": "Bearer token"}
            
            # Mock performance data
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "results": [{
                    "campaign": {
                        "id": "123",
                        "name": "Test Campaign",
                        "status": "ENABLED"
                    },
                    "metrics": {
                        "impressions": "1000",
                        "clicks": "50",
                        "costMicros": "50000000",
                        "conversions": 5,
                        "conversionValue": 250.0
                    }
                }]
            }
            
            mock_client_instance = AsyncMock()
            mock_client_instance.post.return_value = mock_response
            mock_client.return_value.__aenter__.return_value = mock_client_instance
            
            result = await google_ads_service.get_campaign_performance(
                mock_integration,
                date_range="LAST_30_DAYS"
            )
            
            assert result["success"] is True
            assert len(result["campaigns"]) == 1
            assert result["campaigns"][0]["campaign_name"] == "Test Campaign"
            assert result["totals"]["impressions"] == 1000
            assert result["totals"]["clicks"] == 50
    
    def test_normalize_and_hash(self, google_ads_service):
        """Test data normalization and hashing"""
        # Test email hashing
        email_hash = google_ads_service._normalize_and_hash("TEST@EXAMPLE.COM")
        expected_hash = google_ads_service._normalize_and_hash("test@example.com")
        assert email_hash == expected_hash
        
        # Test phone number normalization
        phone_hash1 = google_ads_service._normalize_and_hash("+1 (234) 567-8900")
        phone_hash2 = google_ads_service._normalize_and_hash("12345678900")
        assert phone_hash1 == phone_hash2
    
    @pytest.mark.asyncio
    async def test_error_handling(self, google_ads_service, mock_integration):
        """Test error handling in various scenarios"""
        with patch.object(google_ads_service, 'get_authenticated_headers') as mock_headers, \
             patch('httpx.AsyncClient') as mock_client:
            
            mock_headers.return_value = {"Authorization": "Bearer token"}
            
            # Mock API error
            mock_response = MagicMock()
            mock_response.status_code = 400
            mock_response.text = "Invalid request"
            
            mock_client_instance = AsyncMock()
            mock_client_instance.post.return_value = mock_response
            mock_client.return_value.__aenter__.return_value = mock_client_instance
            
            with pytest.raises(Exception) as exc_info:
                await google_ads_service.create_campaign(
                    mock_integration,
                    "Test Campaign",
                    Decimal("100.00")
                )
            
            assert "Failed to create campaign" in str(exc_info.value)