import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta
from unittest.mock import patch, AsyncMock
from decimal import Decimal
import json

from main import app
from models import User
from models.tracking import (
    ConversionEvent, ConversionGoal, CampaignSource,
    UserLifetimeValue, ConversionAttribution
)


@pytest.fixture
async def authenticated_client(async_client: AsyncClient, test_user: User):
    """Create authenticated client with test user token"""
    # Login to get token
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "testpassword123"}
    )
    token = response.json()["access_token"]
    
    # Add auth header
    async_client.headers["Authorization"] = f"Bearer {token}"
    return async_client


@pytest.fixture
async def admin_client(async_client: AsyncClient, admin_user: User):
    """Create authenticated client with admin user token"""
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": admin_user.email, "password": "adminpassword123"}
    )
    token = response.json()["access_token"]
    
    async_client.headers["Authorization"] = f"Bearer {token}"
    return async_client


class TestTrackingEndpoints:
    """Test conversion tracking API endpoints"""
    
    async def test_track_event_success(self, authenticated_client: AsyncClient):
        """Test successful event tracking"""
        # Arrange
        event_data = {
            "event_type": "appointment_booked",
            "event_value": 75.0,
            "event_properties": {
                "service_id": 1,
                "barber_id": 2,
                "appointment_date": "2025-01-15"
            },
            "utm_source": "google",
            "utm_medium": "cpc",
            "utm_campaign": "january-promo"
        }
        
        # Act
        response = await authenticated_client.post(
            "/api/v1/tracking/events",
            json=event_data
        )
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["event_type"] == "appointment_booked"
        assert data["event_value"] == 75.0
        assert data["channel"] == "paid_search"
        assert "event_id" in data
        assert "timestamp" in data
    
    async def test_track_event_with_idempotency(self, authenticated_client: AsyncClient):
        """Test event tracking with idempotency key"""
        # Arrange
        event_data = {
            "event_type": "purchase",
            "event_value": 100.0,
            "idempotency_key": "unique-purchase-123"
        }
        
        # Act - First request
        response1 = await authenticated_client.post(
            "/api/v1/tracking/events",
            json=event_data
        )
        
        # Act - Duplicate request
        response2 = await authenticated_client.post(
            "/api/v1/tracking/events",
            json=event_data
        )
        
        # Assert
        assert response1.status_code == 201
        assert response2.status_code == 200  # Returns existing
        assert response1.json()["event_id"] == response2.json()["event_id"]
    
    async def test_track_event_validation_error(self, authenticated_client: AsyncClient):
        """Test event tracking with invalid data"""
        # Arrange
        invalid_data = {
            "event_type": "",  # Empty event type
            "event_value": -50  # Negative value
        }
        
        # Act
        response = await authenticated_client.post(
            "/api/v1/tracking/events",
            json=invalid_data
        )
        
        # Assert
        assert response.status_code == 422
        errors = response.json()["detail"]
        assert any(error["loc"] == ["body", "event_type"] for error in errors)
    
    async def test_track_batch_events(self, authenticated_client: AsyncClient):
        """Test batch event tracking"""
        # Arrange
        batch_data = {
            "events": [
                {
                    "event_type": "page_view",
                    "event_properties": {"page": "/services"}
                },
                {
                    "event_type": "button_click",
                    "event_properties": {"button_id": "book-now"}
                },
                {
                    "event_type": "form_start",
                    "event_properties": {"form_id": "booking-form"}
                }
            ]
        }
        
        # Act
        response = await authenticated_client.post(
            "/api/v1/tracking/events/batch",
            json=batch_data
        )
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert len(data["events"]) == 3
        assert data["total_tracked"] == 3
        assert all("event_id" in event for event in data["events"])
    
    async def test_track_event_rate_limiting(self, authenticated_client: AsyncClient):
        """Test rate limiting on event tracking"""
        # Arrange
        event_data = {"event_type": "test_event"}
        
        # Act - Send many requests quickly
        responses = []
        for _ in range(15):  # Assuming rate limit is 10 per minute
            response = await authenticated_client.post(
                "/api/v1/tracking/events",
                json=event_data
            )
            responses.append(response)
        
        # Assert
        status_codes = [r.status_code for r in responses]
        assert 429 in status_codes  # Rate limit exceeded
        
        # Check rate limit headers
        limited_response = next(r for r in responses if r.status_code == 429)
        assert "X-RateLimit-Limit" in limited_response.headers
        assert "X-RateLimit-Remaining" in limited_response.headers


class TestAnalyticsEndpoints:
    """Test analytics and reporting endpoints"""
    
    async def test_get_analytics_summary(self, authenticated_client: AsyncClient):
        """Test retrieving analytics summary"""
        # Act
        response = await authenticated_client.get(
            "/api/v1/tracking/analytics/summary",
            params={
                "start_date": "2025-01-01",
                "end_date": "2025-01-31"
            }
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "total_events" in data
        assert "total_conversions" in data
        assert "conversion_rate" in data
        assert "total_revenue" in data
        assert "top_channels" in data
        assert "conversion_funnel" in data
    
    async def test_get_channel_performance(self, authenticated_client: AsyncClient):
        """Test channel performance analytics"""
        # Act
        response = await authenticated_client.get(
            "/api/v1/tracking/analytics/channels",
            params={"period": "last_30_days"}
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "channels" in data
        for channel in data["channels"]:
            assert "channel_name" in channel
            assert "sessions" in channel
            assert "conversions" in channel
            assert "revenue" in channel
            assert "conversion_rate" in channel
            assert "avg_order_value" in channel
    
    async def test_get_attribution_report(self, authenticated_client: AsyncClient):
        """Test attribution reporting"""
        # Act
        response = await authenticated_client.get(
            "/api/v1/tracking/analytics/attribution",
            params={
                "model": "linear",
                "start_date": "2025-01-01",
                "end_date": "2025-01-31"
            }
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "attribution_model" in data
        assert data["attribution_model"] == "linear"
        assert "touchpoints" in data
        assert "total_attributed_revenue" in data
        assert "channel_attribution" in data
    
    async def test_get_user_journey_analytics(self, authenticated_client: AsyncClient):
        """Test user journey analytics"""
        # Act
        response = await authenticated_client.get(
            "/api/v1/tracking/analytics/user-journeys",
            params={"cohort": "2025-01"}
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "journeys" in data
        assert "avg_touchpoints" in data
        assert "avg_time_to_conversion" in data
        assert "top_paths" in data


class TestGoalManagement:
    """Test conversion goal management endpoints"""
    
    async def test_create_conversion_goal(self, admin_client: AsyncClient):
        """Test creating a conversion goal"""
        # Arrange
        goal_data = {
            "name": "Premium Service Booking",
            "event_type": "appointment_booked",
            "target_value": 100.0,
            "description": "Track bookings for premium services over $100"
        }
        
        # Act
        response = await admin_client.post(
            "/api/v1/tracking/goals",
            json=goal_data
        )
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Premium Service Booking"
        assert data["event_type"] == "appointment_booked"
        assert data["target_value"] == 100.0
        assert data["is_active"] is True
        assert "id" in data
    
    async def test_list_conversion_goals(self, authenticated_client: AsyncClient):
        """Test listing conversion goals"""
        # Act
        response = await authenticated_client.get("/api/v1/tracking/goals")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "goals" in data
        assert isinstance(data["goals"], list)
        assert "total" in data
    
    async def test_update_conversion_goal(self, admin_client: AsyncClient, db_session):
        """Test updating a conversion goal"""
        # Arrange - Create a goal first
        goal = ConversionGoal(
            name="Test Goal",
            event_type="test_event",
            target_value=50.0
        )
        db_session.add(goal)
        await db_session.commit()
        
        update_data = {
            "name": "Updated Goal Name",
            "target_value": 75.0,
            "is_active": False
        }
        
        # Act
        response = await admin_client.put(
            f"/api/v1/tracking/goals/{goal.id}",
            json=update_data
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Goal Name"
        assert data["target_value"] == 75.0
        assert data["is_active"] is False
    
    async def test_delete_conversion_goal(self, admin_client: AsyncClient, db_session):
        """Test deleting a conversion goal"""
        # Arrange
        goal = ConversionGoal(
            name="Goal to Delete",
            event_type="test_event"
        )
        db_session.add(goal)
        await db_session.commit()
        
        # Act
        response = await admin_client.delete(f"/api/v1/tracking/goals/{goal.id}")
        
        # Assert
        assert response.status_code == 204
        
        # Verify deletion
        get_response = await admin_client.get(f"/api/v1/tracking/goals/{goal.id}")
        assert get_response.status_code == 404


class TestCampaignTracking:
    """Test campaign source tracking endpoints"""
    
    async def test_create_campaign_source(self, admin_client: AsyncClient):
        """Test creating a campaign source"""
        # Arrange
        campaign_data = {
            "name": "Summer 2025 Promotion",
            "utm_source": "google",
            "utm_medium": "cpc",
            "utm_campaign": "summer-2025",
            "budget": 5000.0,
            "start_date": "2025-06-01",
            "end_date": "2025-08-31"
        }
        
        # Act
        response = await admin_client.post(
            "/api/v1/tracking/campaigns",
            json=campaign_data
        )
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Summer 2025 Promotion"
        assert data["utm_campaign"] == "summer-2025"
        assert data["budget"] == 5000.0
        assert data["is_active"] is True
    
    async def test_get_campaign_performance(self, authenticated_client: AsyncClient, db_session):
        """Test retrieving campaign performance metrics"""
        # Arrange - Create campaign with some events
        campaign = CampaignSource(
            name="Test Campaign",
            utm_source="facebook",
            utm_medium="social",
            utm_campaign="test-campaign",
            budget=1000.0
        )
        db_session.add(campaign)
        await db_session.commit()
        
        # Act
        response = await authenticated_client.get(
            f"/api/v1/tracking/campaigns/{campaign.id}/performance"
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "campaign_id" in data
        assert "impressions" in data
        assert "clicks" in data
        assert "conversions" in data
        assert "spend" in data
        assert "revenue" in data
        assert "roi" in data
        assert "conversion_rate" in data


class TestUserLTVEndpoints:
    """Test user lifetime value endpoints"""
    
    async def test_get_user_ltv(self, authenticated_client: AsyncClient):
        """Test retrieving user LTV"""
        # Act
        response = await authenticated_client.get("/api/v1/tracking/users/ltv")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "total_revenue" in data
        assert "total_appointments" in data
        assert "average_order_value" in data
        assert "days_since_first_purchase" in data
        assert "purchase_frequency" in data
    
    async def test_get_ltv_segments(self, admin_client: AsyncClient):
        """Test retrieving LTV segments"""
        # Act
        response = await admin_client.get("/api/v1/tracking/analytics/ltv-segments")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "segments" in data
        expected_segments = ["high_value", "medium_value", "low_value", "at_risk"]
        for segment in expected_segments:
            assert any(s["segment_name"] == segment for s in data["segments"])


class TestConfigurationEndpoints:
    """Test tracking configuration endpoints"""
    
    async def test_get_tracking_config(self, admin_client: AsyncClient):
        """Test retrieving tracking configuration"""
        # Act
        response = await admin_client.get("/api/v1/tracking/config")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "gtm_enabled" in data
        assert "gtm_container_id" in data
        assert "meta_enabled" in data
        assert "meta_pixel_id" in data
        assert "attribution_window_days" in data
        assert "default_attribution_model" in data
    
    async def test_update_tracking_config(self, admin_client: AsyncClient):
        """Test updating tracking configuration"""
        # Arrange
        config_update = {
            "gtm_enabled": True,
            "gtm_container_id": "GTM-ABC123",
            "meta_enabled": False,
            "attribution_window_days": 60,
            "default_attribution_model": "time_decay"
        }
        
        # Act
        response = await admin_client.put(
            "/api/v1/tracking/config",
            json=config_update
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["gtm_container_id"] == "GTM-ABC123"
        assert data["meta_enabled"] is False
        assert data["attribution_window_days"] == 60
    
    async def test_test_platform_connection(self, admin_client: AsyncClient):
        """Test platform connection testing endpoint"""
        # Act
        response = await admin_client.post(
            "/api/v1/tracking/config/test-connection",
            json={"platform": "gtm"}
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "platform" in data
        assert "status" in data
        assert "message" in data
        assert data["status"] in ["success", "error"]


class TestExportEndpoints:
    """Test data export endpoints"""
    
    async def test_export_events_csv(self, authenticated_client: AsyncClient):
        """Test exporting events as CSV"""
        # Act
        response = await authenticated_client.get(
            "/api/v1/tracking/export/events",
            params={
                "format": "csv",
                "start_date": "2025-01-01",
                "end_date": "2025-01-31"
            }
        )
        
        # Assert
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv"
        assert "content-disposition" in response.headers
        assert "events_export" in response.headers["content-disposition"]
    
    async def test_export_attribution_report(self, admin_client: AsyncClient):
        """Test exporting attribution report"""
        # Act
        response = await admin_client.get(
            "/api/v1/tracking/export/attribution",
            params={
                "format": "json",
                "model": "linear",
                "period": "last_30_days"
            }
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "export_date" in data
        assert "attribution_model" in data
        assert "period" in data
        assert "data" in data


class TestWebhookEndpoints:
    """Test webhook endpoints for platform integrations"""
    
    async def test_gtm_webhook(self, async_client: AsyncClient):
        """Test Google Tag Manager webhook"""
        # Arrange
        webhook_data = {
            "event": "container_published",
            "container_id": "GTM-ABC123",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Act
        response = await async_client.post(
            "/api/v1/tracking/webhooks/gtm",
            json=webhook_data,
            headers={"X-GTM-Signature": "mock-signature"}
        )
        
        # Assert
        assert response.status_code == 200
        assert response.json()["status"] == "processed"
    
    async def test_meta_webhook(self, async_client: AsyncClient):
        """Test Meta webhook"""
        # Arrange
        webhook_data = {
            "entry": [{
                "id": "123",
                "time": int(datetime.utcnow().timestamp()),
                "changes": [{
                    "field": "leadgen",
                    "value": {"leadgen_id": "456"}
                }]
            }]
        }
        
        # Act
        response = await async_client.post(
            "/api/v1/tracking/webhooks/meta",
            json=webhook_data,
            headers={"X-Hub-Signature": "sha1=mock-signature"}
        )
        
        # Assert
        assert response.status_code == 200


class TestPermissions:
    """Test permission controls on tracking endpoints"""
    
    async def test_regular_user_cannot_access_admin_endpoints(self, authenticated_client: AsyncClient):
        """Test that regular users cannot access admin-only endpoints"""
        # Try to create a goal (admin only)
        response = await authenticated_client.post(
            "/api/v1/tracking/goals",
            json={"name": "Test", "event_type": "test"}
        )
        assert response.status_code == 403
        
        # Try to update config (admin only)
        response = await authenticated_client.put(
            "/api/v1/tracking/config",
            json={"gtm_enabled": False}
        )
        assert response.status_code == 403
    
    async def test_unauthenticated_access_denied(self, async_client: AsyncClient):
        """Test that unauthenticated requests are denied"""
        # Try to track event without auth
        response = await async_client.post(
            "/api/v1/tracking/events",
            json={"event_type": "test"}
        )
        assert response.status_code == 401