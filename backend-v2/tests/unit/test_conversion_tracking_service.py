import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.conversion_tracking_service import ConversionTrackingService
from models.tracking import (
    ConversionEvent, ConversionGoal, CampaignSource, 
    UserLifetimeValue, ConversionAttribution
)
from models import User
from models import Appointment
from models import Payment


@pytest.fixture
async def mock_db():
    """Mock database session"""
    db = AsyncMock(spec=AsyncSession)
    return db


@pytest.fixture
async def mock_gtm_service():
    """Mock Google Tag Manager service"""
    service = Mock()
    service.send_event = AsyncMock()
    return service


@pytest.fixture
async def mock_meta_service():
    """Mock Meta Pixel service"""
    service = Mock()
    service.send_event = AsyncMock()
    return service


@pytest.fixture
async def tracking_service(mock_db, mock_gtm_service, mock_meta_service):
    """Create ConversionTrackingService instance with mocked dependencies"""
    with patch('services.conversion_tracking_service.GoogleTagManagerService', return_value=mock_gtm_service):
        with patch('services.conversion_tracking_service.MetaPixelService', return_value=mock_meta_service):
            service = ConversionTrackingService()
            return service


class TestEventTracking:
    """Test conversion event tracking functionality"""
    
    async def test_track_event_success(self, tracking_service, mock_db):
        """Test successful event tracking"""
        # Arrange
        user_id = 1
        event_data = {
            "event_type": "appointment_booked",
            "event_value": 50.0,
            "event_properties": {"service_id": 1, "barber_id": 2}
        }
        
        # Mock database queries
        mock_db.execute.return_value.scalar_one_or_none.return_value = None  # No duplicate
        mock_db.add = Mock()
        mock_db.commit = AsyncMock()
        
        # Act
        result = await tracking_service.track_event(mock_db, user_id, event_data)
        
        # Assert
        assert result is not None
        assert result["event_type"] == "appointment_booked"
        assert result["user_id"] == user_id
        assert result["event_value"] == 50.0
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
    
    async def test_track_event_with_deduplication(self, tracking_service, mock_db):
        """Test event deduplication based on idempotency key"""
        # Arrange
        user_id = 1
        event_data = {
            "event_type": "purchase",
            "event_value": 100.0,
            "idempotency_key": "unique-key-123"
        }
        
        # Mock existing event
        existing_event = ConversionEvent(
            id=1,
            user_id=user_id,
            event_type="purchase",
            idempotency_key="unique-key-123"
        )
        mock_db.execute.return_value.scalar_one_or_none.return_value = existing_event
        
        # Act
        result = await tracking_service.track_event(mock_db, user_id, event_data)
        
        # Assert
        assert result == existing_event
        mock_db.add.assert_not_called()
        mock_db.commit.assert_not_called()
    
    async def test_track_event_with_channel_determination(self, tracking_service, mock_db):
        """Test automatic channel determination from context"""
        # Arrange
        user_id = 1
        event_data = {
            "event_type": "signup",
            "utm_source": "google",
            "utm_medium": "cpc",
            "utm_campaign": "summer-promo"
        }
        
        mock_db.execute.return_value.scalar_one_or_none.return_value = None
        mock_db.add = Mock()
        mock_db.commit = AsyncMock()
        
        # Act
        result = await tracking_service.track_event(mock_db, user_id, event_data)
        
        # Assert
        assert result["channel"] == "paid_search"
        assert result["utm_source"] == "google"
        assert result["utm_medium"] == "cpc"
    
    async def test_track_event_with_goal_matching(self, tracking_service, mock_db):
        """Test event matching against conversion goals"""
        # Arrange
        user_id = 1
        event_data = {
            "event_type": "purchase",
            "event_value": 150.0
        }
        
        # Mock conversion goal
        goal = ConversionGoal(
            id=1,
            name="High Value Purchase",
            event_type="purchase",
            target_value=100.0,
            is_active=True
        )
        
        mock_db.execute.return_value.scalar_one_or_none.side_effect = [None, goal]
        mock_db.add = Mock()
        mock_db.commit = AsyncMock()
        
        # Act
        result = await tracking_service.track_event(mock_db, user_id, event_data)
        
        # Assert
        assert result["goal_id"] == 1
        mock_db.add.assert_called()


class TestAttributionCalculation:
    """Test conversion attribution calculation"""
    
    async def test_calculate_attribution_first_touch(self, tracking_service, mock_db):
        """Test first-touch attribution model"""
        # Arrange
        conversion_event = ConversionEvent(
            id=10,
            user_id=1,
            event_type="purchase",
            event_value=100.0,
            created_at=datetime.utcnow()
        )
        
        # Mock touchpoints
        touchpoints = [
            ConversionEvent(
                id=1,
                user_id=1,
                event_type="page_view",
                channel="organic_search",
                created_at=datetime.utcnow() - timedelta(days=7)
            ),
            ConversionEvent(
                id=2,
                user_id=1,
                event_type="email_click",
                channel="email",
                created_at=datetime.utcnow() - timedelta(days=3)
            )
        ]
        
        mock_db.execute.return_value.scalars.return_value.all.return_value = touchpoints
        mock_db.add = Mock()
        mock_db.commit = AsyncMock()
        
        # Act
        result = await tracking_service.calculate_attribution(
            mock_db, conversion_event, model="first_touch"
        )
        
        # Assert
        assert len(result) == 1
        assert result[0].touchpoint_id == 1
        assert result[0].attribution_weight == 1.0
        assert result[0].attributed_value == 100.0
    
    async def test_calculate_attribution_last_touch(self, tracking_service, mock_db):
        """Test last-touch attribution model"""
        # Arrange
        conversion_event = ConversionEvent(
            id=10,
            user_id=1,
            event_type="purchase",
            event_value=100.0,
            created_at=datetime.utcnow()
        )
        
        touchpoints = [
            ConversionEvent(
                id=1,
                user_id=1,
                event_type="page_view",
                channel="organic_search",
                created_at=datetime.utcnow() - timedelta(days=7)
            ),
            ConversionEvent(
                id=2,
                user_id=1,
                event_type="email_click",
                channel="email",
                created_at=datetime.utcnow() - timedelta(days=3)
            )
        ]
        
        mock_db.execute.return_value.scalars.return_value.all.return_value = touchpoints
        mock_db.add = Mock()
        mock_db.commit = AsyncMock()
        
        # Act
        result = await tracking_service.calculate_attribution(
            mock_db, conversion_event, model="last_touch"
        )
        
        # Assert
        assert len(result) == 1
        assert result[0].touchpoint_id == 2
        assert result[0].attribution_weight == 1.0
    
    async def test_calculate_attribution_linear(self, tracking_service, mock_db):
        """Test linear attribution model"""
        # Arrange
        conversion_event = ConversionEvent(
            id=10,
            user_id=1,
            event_type="purchase",
            event_value=100.0,
            created_at=datetime.utcnow()
        )
        
        touchpoints = [
            ConversionEvent(id=1, user_id=1, created_at=datetime.utcnow() - timedelta(days=7)),
            ConversionEvent(id=2, user_id=1, created_at=datetime.utcnow() - timedelta(days=3)),
            ConversionEvent(id=3, user_id=1, created_at=datetime.utcnow() - timedelta(days=1))
        ]
        
        mock_db.execute.return_value.scalars.return_value.all.return_value = touchpoints
        mock_db.add = Mock()
        mock_db.commit = AsyncMock()
        
        # Act
        result = await tracking_service.calculate_attribution(
            mock_db, conversion_event, model="linear"
        )
        
        # Assert
        assert len(result) == 3
        for attr in result:
            assert attr.attribution_weight == pytest.approx(0.333, rel=0.01)
            assert attr.attributed_value == pytest.approx(33.33, rel=0.01)
    
    async def test_calculate_attribution_time_decay(self, tracking_service, mock_db):
        """Test time-decay attribution model"""
        # Arrange
        conversion_event = ConversionEvent(
            id=10,
            user_id=1,
            event_type="purchase",
            event_value=100.0,
            created_at=datetime.utcnow()
        )
        
        touchpoints = [
            ConversionEvent(
                id=1,
                user_id=1,
                created_at=datetime.utcnow() - timedelta(days=14)  # Older
            ),
            ConversionEvent(
                id=2,
                user_id=1,
                created_at=datetime.utcnow() - timedelta(days=1)   # Recent
            )
        ]
        
        mock_db.execute.return_value.scalars.return_value.all.return_value = touchpoints
        mock_db.add = Mock()
        mock_db.commit = AsyncMock()
        
        # Act
        result = await tracking_service.calculate_attribution(
            mock_db, conversion_event, model="time_decay"
        )
        
        # Assert
        assert len(result) == 2
        # More recent touchpoint should have higher weight
        assert result[1].attribution_weight > result[0].attribution_weight
        assert result[0].attributed_value + result[1].attributed_value == pytest.approx(100.0)


class TestPlatformSyncing:
    """Test syncing events to external platforms"""
    
    async def test_sync_to_gtm(self, tracking_service, mock_gtm_service):
        """Test syncing event to Google Tag Manager"""
        # Arrange
        event = ConversionEvent(
            id=1,
            user_id=1,
            event_type="purchase",
            event_value=100.0,
            event_properties={"product_id": "123"},
            channel="paid_search"
        )
        
        # Act
        await tracking_service.sync_to_gtm(event)
        
        # Assert
        mock_gtm_service.send_event.assert_called_once()
        call_args = mock_gtm_service.send_event.call_args[0][0]
        assert call_args["event"] == "purchase"
        assert call_args["value"] == 100.0
        assert call_args["user_id"] == 1
        assert call_args["channel"] == "paid_search"
    
    async def test_sync_to_meta(self, tracking_service, mock_meta_service):
        """Test syncing event to Meta Pixel"""
        # Arrange
        event = ConversionEvent(
            id=1,
            user_id=1,
            event_type="lead",
            event_value=25.0,
            event_properties={"form_id": "contact"},
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0..."
        )
        
        # Act
        await tracking_service.sync_to_meta(event)
        
        # Assert
        mock_meta_service.send_event.assert_called_once()
        call_args = mock_meta_service.send_event.call_args[0][0]
        assert call_args["event_name"] == "Lead"
        assert call_args["custom_data"]["value"] == 25.0
        assert call_args["user_data"]["external_id"] == "1"
    
    async def test_sync_to_all_platforms(self, tracking_service, mock_gtm_service, mock_meta_service):
        """Test syncing to all configured platforms"""
        # Arrange
        event = ConversionEvent(
            id=1,
            user_id=1,
            event_type="appointment_booked",
            event_value=50.0
        )
        
        # Act
        await tracking_service.sync_to_platforms(event, platforms=["gtm", "meta"])
        
        # Assert
        mock_gtm_service.send_event.assert_called_once()
        mock_meta_service.send_event.assert_called_once()


class TestChannelDetermination:
    """Test channel determination logic"""
    
    async def test_determine_channel_from_utm(self, tracking_service):
        """Test channel determination from UTM parameters"""
        # Test cases
        test_cases = [
            ({"utm_source": "google", "utm_medium": "cpc"}, "paid_search"),
            ({"utm_source": "facebook", "utm_medium": "social"}, "paid_social"),
            ({"utm_source": "newsletter", "utm_medium": "email"}, "email"),
            ({"utm_source": "google", "utm_medium": "organic"}, "organic_search"),
            ({"utm_source": "partner-site", "utm_medium": "referral"}, "referral"),
            ({}, "direct")
        ]
        
        for utm_params, expected_channel in test_cases:
            result = await tracking_service.determine_channel(utm_params)
            assert result == expected_channel
    
    async def test_determine_channel_from_referrer(self, tracking_service):
        """Test channel determination from referrer"""
        # Test cases
        test_cases = [
            ({"referrer": "https://www.google.com/search"}, "organic_search"),
            ({"referrer": "https://www.facebook.com/"}, "social"),
            ({"referrer": "https://partner-site.com/blog"}, "referral"),
            ({"referrer": ""}, "direct")
        ]
        
        for context, expected_channel in test_cases:
            result = await tracking_service.determine_channel(context)
            assert result == expected_channel


class TestUserLTVUpdates:
    """Test user lifetime value calculations and updates"""
    
    async def test_update_user_ltv_new_user(self, tracking_service, mock_db):
        """Test LTV update for new user"""
        # Arrange
        user_id = 1
        
        # Mock no existing LTV record
        mock_db.execute.return_value.scalar_one_or_none.return_value = None
        
        # Mock user's transactions
        mock_payments = [
            Payment(amount=Decimal("50.00"), status="completed"),
            Payment(amount=Decimal("75.00"), status="completed")
        ]
        mock_db.execute.return_value.scalars.return_value.all.side_effect = [
            mock_payments,  # Payments
            [1, 2]  # Appointment IDs
        ]
        
        mock_db.add = Mock()
        mock_db.commit = AsyncMock()
        
        # Act
        result = await tracking_service.update_user_ltv(mock_db, user_id)
        
        # Assert
        assert result.user_id == user_id
        assert result.total_revenue == Decimal("125.00")
        assert result.total_appointments == 2
        assert result.average_order_value == Decimal("62.50")
        mock_db.add.assert_called_once()
    
    async def test_update_user_ltv_existing_user(self, tracking_service, mock_db):
        """Test LTV update for existing user"""
        # Arrange
        user_id = 1
        
        # Mock existing LTV record
        existing_ltv = UserLifetimeValue(
            user_id=user_id,
            total_revenue=Decimal("100.00"),
            total_appointments=2,
            average_order_value=Decimal("50.00"),
            first_purchase_date=datetime.utcnow() - timedelta(days=30),
            last_purchase_date=datetime.utcnow() - timedelta(days=7)
        )
        mock_db.execute.return_value.scalar_one_or_none.return_value = existing_ltv
        
        # Mock new transactions
        mock_payments = [
            Payment(amount=Decimal("100.00"), status="completed"),
            Payment(amount=Decimal("150.00"), status="completed"),
            Payment(amount=Decimal("50.00"), status="completed")
        ]
        mock_db.execute.return_value.scalars.return_value.all.side_effect = [
            mock_payments,
            [1, 2, 3]
        ]
        
        mock_db.commit = AsyncMock()
        
        # Act
        result = await tracking_service.update_user_ltv(mock_db, user_id)
        
        # Assert
        assert result.total_revenue == Decimal("300.00")
        assert result.total_appointments == 3
        assert result.average_order_value == Decimal("100.00")
        mock_db.add.assert_not_called()  # Should update existing, not add new


class TestErrorHandling:
    """Test error handling in conversion tracking"""
    
    async def test_track_event_database_error(self, tracking_service, mock_db):
        """Test handling of database errors during event tracking"""
        # Arrange
        mock_db.execute.side_effect = Exception("Database connection error")
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await tracking_service.track_event(mock_db, 1, {"event_type": "test"})
        
        assert "Database connection error" in str(exc_info.value)
        mock_db.rollback.assert_called_once()
    
    async def test_sync_platform_error_handling(self, tracking_service, mock_gtm_service):
        """Test handling of platform sync errors"""
        # Arrange
        event = ConversionEvent(id=1, event_type="test")
        mock_gtm_service.send_event.side_effect = Exception("API error")
        
        # Act - Should not raise, but log error
        await tracking_service.sync_to_gtm(event)
        
        # Assert
        mock_gtm_service.send_event.assert_called_once()
    
    async def test_attribution_calculation_no_touchpoints(self, tracking_service, mock_db):
        """Test attribution calculation with no touchpoints"""
        # Arrange
        conversion_event = ConversionEvent(
            id=1,
            user_id=1,
            event_type="purchase",
            event_value=100.0
        )
        
        # Mock no touchpoints
        mock_db.execute.return_value.scalars.return_value.all.return_value = []
        
        # Act
        result = await tracking_service.calculate_attribution(
            mock_db, conversion_event, model="linear"
        )
        
        # Assert
        assert result == []
        mock_db.add.assert_not_called()


class TestBatchOperations:
    """Test batch event tracking operations"""
    
    async def test_track_batch_events(self, tracking_service, mock_db):
        """Test tracking multiple events in batch"""
        # Arrange
        user_id = 1
        events = [
            {"event_type": "page_view", "page": "/services"},
            {"event_type": "button_click", "button_id": "book-now"},
            {"event_type": "form_submit", "form_id": "booking"}
        ]
        
        mock_db.execute.return_value.scalar_one_or_none.return_value = None
        mock_db.add_all = Mock()
        mock_db.commit = AsyncMock()
        
        # Act
        results = await tracking_service.track_batch_events(mock_db, user_id, events)
        
        # Assert
        assert len(results) == 3
        assert all(r["user_id"] == user_id for r in results)
        mock_db.add_all.assert_called_once()
        assert len(mock_db.add_all.call_args[0][0]) == 3


class TestConfigurationAndSettings:
    """Test tracking configuration and settings"""
    
    async def test_get_tracking_config(self, tracking_service, mock_db):
        """Test retrieving tracking configuration"""
        # Arrange
        mock_config = {
            "gtm_enabled": True,
            "meta_enabled": True,
            "attribution_window_days": 30,
            "default_attribution_model": "linear"
        }
        
        with patch.object(tracking_service, 'get_config', return_value=mock_config):
            # Act
            config = await tracking_service.get_tracking_config(mock_db)
            
            # Assert
            assert config["gtm_enabled"] is True
            assert config["attribution_window_days"] == 30
    
    async def test_update_tracking_config(self, tracking_service, mock_db):
        """Test updating tracking configuration"""
        # Arrange
        new_config = {
            "meta_enabled": False,
            "attribution_window_days": 60
        }
        
        with patch.object(tracking_service, 'update_config', return_value=new_config):
            # Act
            result = await tracking_service.update_tracking_config(mock_db, new_config)
            
            # Assert
            assert result["meta_enabled"] is False
            assert result["attribution_window_days"] == 60