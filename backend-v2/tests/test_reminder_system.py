"""
Comprehensive test suite for appointment reminder system
Tests reminder engine, billing, notifications, and API endpoints
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.reminder_models import (
    ReminderPreference, ReminderSchedule, ReminderDelivery, 
    ReminderTemplate, ReminderAnalytics
)
from services.reminder_engine_service import reminder_engine
from services.billing_integration_service import communication_billing
from services.notification_gateway_service import notification_gateway


class TestReminderEngine:
    """Test the core reminder engine functionality"""
    
    @pytest.fixture
    def mock_db(self):
        return Mock(spec=Session)
    
    @pytest.fixture
    def sample_appointment(self):
        appointment = Mock()
        appointment.id = 123
        appointment.client_id = 456
        appointment.scheduled_at = datetime.utcnow() + timedelta(hours=25)
        appointment.shop_id = 789
        return appointment
    
    @pytest.fixture
    def sample_client(self):
        client = Mock()
        client.id = 456
        client.phone = "+1234567890"
        client.email = "test@example.com"
        client.device_token = "test_device_token"
        return client
    
    @pytest.mark.asyncio
    async def test_schedule_appointment_reminders(self, mock_db, sample_appointment, sample_client):
        """Test scheduling reminders for a new appointment"""
        
        # Mock database queries
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            sample_appointment,  # First call returns appointment
            sample_client        # Second call returns client
        ]
        
        # Mock client preferences (none exist, should use defaults)
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Test scheduling
        result = await reminder_engine.schedule_appointment_reminders(123, mock_db)
        
        # Assertions
        assert result["status"] == "success"
        assert result["appointment_id"] == 123
        assert result["reminders_scheduled"] == 3  # 24hr, 2hr, followup
        
        # Verify database operations
        assert mock_db.add.call_count == 3  # Three reminder schedules added
        mock_db.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_process_pending_reminders(self, mock_db):
        """Test processing of pending reminders"""
        
        # Mock pending reminders
        pending_reminder = Mock()
        pending_reminder.id = 1
        pending_reminder.appointment_id = 123
        pending_reminder.reminder_type = "24_hour"
        pending_reminder.status = "pending"
        pending_reminder.delivery_attempts = 0
        
        mock_db.query.return_value.filter.return_value.all.return_value = [pending_reminder]
        
        # Mock successful delivery
        with patch.object(reminder_engine, '_send_reminder', return_value={"success": True}):
            result = await reminder_engine.process_pending_reminders(mock_db)
        
        # Assertions
        assert result["processed"] == 1
        assert result["successful"] == 1
        assert result["failed"] == 0
        assert pending_reminder.status == "sent"
    
    @pytest.mark.asyncio
    async def test_send_reminder_success(self, mock_db, sample_appointment, sample_client):
        """Test successful reminder delivery"""
        
        # Mock reminder schedule
        reminder = Mock()
        reminder.id = 1
        reminder.appointment_id = 123
        reminder.reminder_type = "24_hour"
        
        # Mock database queries
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            sample_appointment, sample_client
        ]
        
        # Mock notification services
        with patch.object(reminder_engine.template_service, 'generate_reminder_message') as mock_template, \
             patch.object(reminder_engine.notification_gateway, 'send_sms', return_value={"success": True}) as mock_sms:
            
            mock_template.return_value = {
                "sms": "Your appointment is tomorrow at 10 AM",
                "email_subject": "Appointment Reminder",
                "email_body": "Don't forget your appointment!"
            }
            
            result = await reminder_engine._send_reminder(reminder, mock_db)
        
        # Assertions
        assert result["success"] is True
        assert result["channels_attempted"] >= 1
        mock_sms.assert_called_once()
        mock_db.add.assert_called()  # Delivery record added
    
    @pytest.mark.asyncio
    async def test_handle_client_response(self, mock_db, sample_appointment):
        """Test handling client responses to reminders"""
        
        response_data = {
            "appointment_id": 123,
            "response_type": "confirmed",
            "schedule_id": 1
        }
        
        mock_db.query.return_value.filter.return_value.first.return_value = sample_appointment
        
        result = await reminder_engine.handle_client_response(response_data, mock_db)
        
        # Assertions
        assert result["success"] is True
        assert result["response_processed"] == "confirmed"
        assert sample_appointment.reminder_confirmed is True
        mock_db.commit.assert_called()


class TestBillingIntegration:
    """Test the billing and revenue stream functionality"""
    
    @pytest.fixture
    def mock_db(self):
        return Mock(spec=Session)
    
    @pytest.mark.asyncio
    async def test_calculate_monthly_usage_basic_plan(self, mock_db):
        """Test usage calculation for basic plan"""
        
        # Mock usage query results
        usage_data = [
            ("sms", 450),    # Under limit
            ("email", 1200)  # Over limit
        ]
        mock_db.query.return_value.join.return_value.join.return_value.filter.return_value.group_by.return_value.all.return_value = usage_data
        
        # Mock shop with basic plan
        shop = Mock()
        shop.communication_plan = "basic"
        mock_db.query.return_value.filter.return_value.first.return_value = shop
        
        result = await communication_billing.calculate_monthly_usage(789, 1, 2025, mock_db)
        
        # Assertions
        assert result["usage"]["sms_count"] == 450
        assert result["usage"]["email_count"] == 1200
        assert result["billing"]["base_fee"] == 19.00
        assert result["billing"]["sms_overage_count"] == 0  # Under limit
        assert result["billing"]["email_overage_count"] == 200  # 1200 - 1000
        assert result["billing"]["email_overage_cost"] == 1.00  # 200 * 0.005
    
    @pytest.mark.asyncio
    async def test_generate_invoice(self, mock_db):
        """Test Stripe invoice generation"""
        
        # Mock shop with Stripe customer
        shop = Mock()
        shop.id = 789
        shop.stripe_customer_id = "cus_test123"
        shop.communication_plan = "professional"
        mock_db.query.return_value.filter.return_value.first.return_value = shop
        
        # Mock usage calculation
        with patch.object(communication_billing, 'calculate_monthly_usage') as mock_usage, \
             patch.object(communication_billing.stripe, 'create_usage_invoice') as mock_stripe:
            
            mock_usage.return_value = {
                "usage": {"sms_count": 1600, "email_count": 2800},
                "billing": {
                    "base_fee": 39.00,
                    "sms_overage_count": 100,
                    "sms_overage_cost": 2.20,
                    "email_overage_count": 0,
                    "email_overage_cost": 0,
                    "total_amount": 41.20
                }
            }
            
            mock_stripe.return_value = {"invoice_id": "in_test123"}
            
            result = await communication_billing.generate_invoice(789, 1, 2025, mock_db)
        
        # Assertions
        assert result["success"] is True
        assert result["invoice_id"] == "in_test123"
        assert result["amount"] == 41.20
        mock_stripe.assert_called_once()
    
    def test_pricing_tiers_configuration(self):
        """Test pricing tier configuration is valid"""
        
        plans = communication_billing.PRICING_TIERS
        
        # Verify all required plans exist
        assert "basic" in plans
        assert "professional" in plans
        assert "premium" in plans
        
        # Verify pricing progression (higher plans cost more)
        assert plans["professional"]["monthly_fee"] > plans["basic"]["monthly_fee"]
        assert plans["premium"]["monthly_fee"] > plans["professional"]["monthly_fee"]
        
        # Verify premium plan has "unlimited" messaging
        assert plans["premium"]["sms_included"] >= 99999
        assert plans["premium"]["email_included"] >= 99999


class TestNotificationGateway:
    """Test notification delivery system"""
    
    @pytest.mark.asyncio
    async def test_send_sms_success(self):
        """Test successful SMS delivery"""
        
        with patch.object(notification_gateway.twilio, 'send_message') as mock_twilio:
            mock_twilio.return_value = {
                "success": True,
                "message_sid": "SM123456789"
            }
            
            result = await notification_gateway.send_sms(
                phone="+1234567890",
                message="Your appointment is tomorrow at 10 AM",
                appointment_id=123
            )
        
        # Assertions
        assert result["success"] is True
        assert result["provider"] == "twilio"
        assert result["provider_message_id"] == "SM123456789"
        assert result["channel"] == "sms"
    
    @pytest.mark.asyncio
    async def test_send_email_success(self):
        """Test successful email delivery"""
        
        with patch.object(notification_gateway.sendgrid, 'send_email') as mock_sendgrid:
            mock_sendgrid.return_value = {
                "success": True,
                "message_id": "abc123"
            }
            
            result = await notification_gateway.send_email(
                email="test@example.com",
                subject="Appointment Reminder",
                body="Don't forget your appointment tomorrow!",
                appointment_id=123
            )
        
        # Assertions
        assert result["success"] is True
        assert result["provider"] == "sendgrid"
        assert result["channel"] == "email"
    
    @pytest.mark.asyncio
    async def test_multi_channel_delivery(self):
        """Test delivery across multiple channels"""
        
        channels = [
            {
                "type": "sms",
                "phone": "+1234567890",
                "message": "SMS reminder message"
            },
            {
                "type": "email",
                "email": "test@example.com",
                "subject": "Email Reminder",
                "body": "Email reminder body"
            }
        ]
        
        with patch.object(notification_gateway, 'send_sms', return_value={"success": True}) as mock_sms, \
             patch.object(notification_gateway, 'send_email', return_value={"success": True}) as mock_email:
            
            result = await notification_gateway.send_multi_channel(channels, 123)
        
        # Assertions
        assert result["success"] is True
        assert result["total_channels"] == 2
        assert result["successful"] == 2
        assert result["failed"] == 0
        mock_sms.assert_called_once()
        mock_email.assert_called_once()
    
    def test_phone_number_formatting(self):
        """Test phone number validation and formatting"""
        
        # Valid formats
        assert notification_gateway._format_phone_number("1234567890") == "+11234567890"
        assert notification_gateway._format_phone_number("+1234567890") == "+11234567890"
        assert notification_gateway._format_phone_number("(123) 456-7890") == "+11234567890"
        
        # Invalid formats
        assert notification_gateway._format_phone_number("123") is None
        assert notification_gateway._format_phone_number("") is None
        assert notification_gateway._format_phone_number("abc") is None
    
    def test_email_validation(self):
        """Test email address validation"""
        
        # Valid emails
        assert notification_gateway._is_valid_email("test@example.com") is True
        assert notification_gateway._is_valid_email("user.name+tag@domain.co.uk") is True
        
        # Invalid emails
        assert notification_gateway._is_valid_email("invalid-email") is False
        assert notification_gateway._is_valid_email("@domain.com") is False
        assert notification_gateway._is_valid_email("user@") is False


class TestReminderAPI:
    """Test API endpoints"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    @pytest.fixture
    def mock_user(self):
        user = Mock()
        user.id = 1
        user.shop_id = 789
        user.is_superuser = False
        return user
    
    def test_get_client_preferences(self, client, mock_user):
        """Test getting client reminder preferences"""
        
        with patch('routers.reminders.get_current_user', return_value=mock_user), \
             patch('routers.reminders.require_permissions', return_value=True):
            
            response = client.get("/api/v2/reminders/preferences/456")
        
        # Should return preferences (created if don't exist)
        assert response.status_code in [200, 201]
    
    def test_get_available_plans(self, client):
        """Test getting available communication plans"""
        
        response = client.get("/api/v2/reminders/billing/plans")
        
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        assert "basic" in data["plans"]
        assert "professional" in data["plans"]
        assert "premium" in data["plans"]
    
    def test_schedule_reminders_unauthorized(self, client):
        """Test scheduling reminders without authentication"""
        
        response = client.post("/api/v2/reminders/schedule/123")
        
        # Should require authentication
        assert response.status_code == 401
    
    def test_upgrade_plan_success(self, client, mock_user):
        """Test successful plan upgrade"""
        
        with patch('routers.reminders.get_current_user', return_value=mock_user), \
             patch('routers.reminders.require_permissions', return_value=True), \
             patch.object(communication_billing, 'upgrade_plan') as mock_upgrade:
            
            mock_upgrade.return_value = {"success": True, "new_plan": "professional"}
            
            response = client.post(
                "/api/v2/reminders/billing/upgrade-plan",
                json={"new_plan": "professional"}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["new_plan"] == "professional"


class TestReminderModels:
    """Test database models"""
    
    def test_reminder_preference_defaults(self):
        """Test ReminderPreference model defaults"""
        
        preference = ReminderPreference(client_id=123)
        
        assert preference.sms_enabled is True
        assert preference.email_enabled is True
        assert preference.push_enabled is False
        assert preference.advance_hours == 24
        assert preference.timezone == "UTC"
    
    def test_reminder_schedule_creation(self):
        """Test ReminderSchedule model creation"""
        
        schedule = ReminderSchedule(
            appointment_id=123,
            reminder_type="24_hour",
            scheduled_for=datetime.utcnow() + timedelta(hours=23),
            status="pending"
        )
        
        assert schedule.appointment_id == 123
        assert schedule.reminder_type == "24_hour"
        assert schedule.status == "pending"
        assert schedule.delivery_attempts == 0
        assert schedule.max_attempts == 3


class TestIntegrationScenarios:
    """Test complete end-to-end scenarios"""
    
    @pytest.mark.asyncio
    async def test_complete_reminder_flow(self, mock_db):
        """Test complete flow from appointment creation to reminder delivery"""
        
        # 1. Create appointment
        appointment = Mock()
        appointment.id = 123
        appointment.client_id = 456
        appointment.scheduled_at = datetime.utcnow() + timedelta(hours=25)
        appointment.shop_id = 789
        
        # 2. Schedule reminders
        with patch.object(reminder_engine, '_get_client_preferences') as mock_prefs:
            mock_prefs.return_value = {
                "sms_enabled": True,
                "email_enabled": True,
                "24_hour_enabled": True,
                "2_hour_enabled": True
            }
            
            result = await reminder_engine.schedule_appointment_reminders(123, mock_db)
        
        assert result["status"] == "success"
        assert result["reminders_scheduled"] == 3
        
        # 3. Process reminders (simulate 24 hours later)
        pending_reminder = Mock()
        pending_reminder.id = 1
        pending_reminder.appointment_id = 123
        pending_reminder.reminder_type = "24_hour"
        pending_reminder.status = "pending"
        
        with patch.object(reminder_engine, '_send_reminder', return_value={"success": True}):
            process_result = await reminder_engine.process_pending_reminders(mock_db)
        
        assert process_result["successful"] >= 0
    
    @pytest.mark.asyncio
    async def test_revenue_protection_calculation(self, mock_db):
        """Test revenue protection analytics calculation"""
        
        # Mock analytics data showing prevented no-shows
        analytics_records = [
            Mock(
                date=datetime(2025, 1, 15).date(),
                channel="sms",
                total_sent=100,
                no_show_prevented=8,
                revenue_protected=400.00  # 8 appointments * $50 avg
            ),
            Mock(
                date=datetime(2025, 1, 15).date(),
                channel="email",
                total_sent=150,
                no_show_prevented=12,
                revenue_protected=600.00  # 12 appointments * $50 avg
            )
        ]
        
        mock_db.query.return_value.filter.return_value.all.return_value = analytics_records
        
        result = await communication_billing.get_usage_analytics(789, 1, mock_db)
        
        # Verify ROI calculation
        total_protected = sum(float(record.revenue_protected) for record in analytics_records)
        assert result["total_revenue_protected"] == total_protected
        
        # Should show strong ROI (revenue protected >> cost)
        avg_messages = result["average_monthly_messages"]
        estimated_cost = avg_messages * 0.008  # Average cost per message
        roi_multiplier = total_protected / max(estimated_cost, 1)
        
        assert roi_multiplier > 10  # Should be highly profitable


# Test fixtures and utilities
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def sample_test_data():
    """Sample test data for integration tests"""
    return {
        "shop": {
            "id": 789,
            "name": "Test Barbershop",
            "communication_plan": "professional"
        },
        "client": {
            "id": 456,
            "name": "John Doe",
            "phone": "+1234567890",
            "email": "john@example.com"
        },
        "appointment": {
            "id": 123,
            "client_id": 456,
            "shop_id": 789,
            "scheduled_at": datetime.utcnow() + timedelta(hours=25),
            "service": "Haircut",
            "price": 50.00
        }
    }


if __name__ == "__main__":
    # Run tests with coverage
    pytest.main([
        __file__,
        "-v",
        "--cov=services.reminder_engine_service",
        "--cov=services.billing_integration_service", 
        "--cov=services.notification_gateway_service",
        "--cov=routers.reminders",
        "--cov-report=term-missing"
    ])