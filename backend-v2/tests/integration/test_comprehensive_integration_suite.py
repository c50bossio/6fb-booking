"""
Comprehensive Integration Test Suite for 6FB Booking Platform
Tests Stripe Connect, Google Calendar, SendGrid, Twilio, and other external integrations
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import json
import stripe
from google.oauth2.credentials import Credentials

from main import app
from services.stripe_integration_service import StripeIntegrationService
from services.google_calendar_service import GoogleCalendarService
from services.sendgrid_marketing_service import SendGridMarketingService
from services.twilio_sms_service import TwilioSMSService
from services.gmb_service import GMBService
from services.meta_business_service import MetaBusinessService

client = TestClient(app)

class TestStripeIntegration:
    """Test Stripe Connect payment processing integration"""
    
    @pytest.fixture
    def stripe_service(self):
        """Create Stripe service instance with mock configuration"""
        service = StripeIntegrationService()
        service.api_key = "sk_test_mock_key"
        return service
    
    @pytest.mark.asyncio
    async def test_payment_intent_creation(self, stripe_service):
        """Test creating payment intents for appointments"""
        payment_data = {
            "amount": 7500,  # $75.00
            "currency": "usd",
            "customer_email": "client@example.com",
            "appointment_id": 123,
            "service_name": "Premium Haircut & Beard Trim",
            "barber_id": 456
        }
        
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = Mock(
                id="pi_test_123",
                client_secret="pi_test_123_secret_456",
                status="requires_payment_method",
                amount=7500,
                currency="usd"
            )
            
            result = await stripe_service.create_payment_intent(payment_data)
            
            assert result["success"] is True
            assert result["payment_intent_id"] == "pi_test_123"
            assert result["client_secret"] == "pi_test_123_secret_456"
            assert result["amount"] == 7500
            
            mock_create.assert_called_once()
            call_args = mock_create.call_args[1]
            assert call_args["amount"] == 7500
            assert call_args["currency"] == "usd"
            assert "appointment_id" in call_args["metadata"]
    
    @pytest.mark.asyncio
    async def test_stripe_connect_onboarding(self, stripe_service):
        """Test Stripe Connect account onboarding for barbers"""
        barber_data = {
            "barber_id": 789,
            "email": "barber@example.com",
            "first_name": "John",
            "last_name": "Smith",
            "business_name": "John's Barbershop",
            "phone": "+1234567890",
            "country": "US"
        }
        
        with patch('stripe.Account.create') as mock_create_account, \
             patch('stripe.AccountLink.create') as mock_create_link:
            
            mock_create_account.return_value = Mock(
                id="acct_test_123",
                details_submitted=False,
                charges_enabled=False
            )
            
            mock_create_link.return_value = Mock(
                url="https://connect.stripe.com/oauth/authorize?scope=read_write&client_id=ca_123"
            )
            
            result = await stripe_service.create_connect_account(barber_data)
            
            assert result["success"] is True
            assert result["account_id"] == "acct_test_123"
            assert result["onboarding_url"].startswith("https://connect.stripe.com")
            
            mock_create_account.assert_called_once()
            mock_create_link.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_commission_split_payments(self, stripe_service):
        """Test commission split between platform and barber"""
        payment_data = {
            "payment_intent_id": "pi_test_123",
            "total_amount": 10000,  # $100.00
            "platform_fee": 500,   # $5.00 (5%)
            "barber_amount": 9500,  # $95.00
            "barber_account_id": "acct_barber_123"
        }
        
        with patch('stripe.Transfer.create') as mock_transfer:
            mock_transfer.return_value = Mock(
                id="tr_test_123",
                amount=9500,
                destination="acct_barber_123"
            )
            
            result = await stripe_service.process_commission_split(payment_data)
            
            assert result["success"] is True
            assert result["transfer_id"] == "tr_test_123"
            assert result["barber_amount"] == 9500
            
            mock_transfer.assert_called_once()
            call_args = mock_transfer.call_args[1]
            assert call_args["amount"] == 9500
            assert call_args["destination"] == "acct_barber_123"
    
    @pytest.mark.asyncio
    async def test_webhook_signature_verification(self, stripe_service):
        """Test Stripe webhook signature verification"""
        # Mock webhook payload and signature
        payload = json.dumps({
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_test_123",
                    "status": "succeeded",
                    "amount": 7500
                }
            }
        })
        
        # Mock webhook signature
        mock_signature = "t=1234567890,v1=mock_signature_hash"
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = {
                "type": "payment_intent.succeeded",
                "data": {"object": {"id": "pi_test_123", "status": "succeeded"}}
            }
            
            result = await stripe_service.verify_webhook_signature(
                payload, mock_signature, "test_endpoint_secret"
            )
            
            assert result["valid"] is True
            assert result["event_type"] == "payment_intent.succeeded"
            mock_construct.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_refund_processing(self, stripe_service):
        """Test payment refund processing"""
        refund_data = {
            "payment_intent_id": "pi_test_123",
            "amount": 7500,  # Full refund
            "reason": "requested_by_customer",
            "appointment_id": 123
        }
        
        with patch('stripe.Refund.create') as mock_refund:
            mock_refund.return_value = Mock(
                id="re_test_123",
                payment_intent="pi_test_123",
                amount=7500,
                status="succeeded"
            )
            
            result = await stripe_service.process_refund(refund_data)
            
            assert result["success"] is True
            assert result["refund_id"] == "re_test_123"
            assert result["amount"] == 7500
            
            mock_refund.assert_called_once()


class TestGoogleCalendarIntegration:
    """Test Google Calendar synchronization and webhook handling"""
    
    @pytest.fixture
    def calendar_service(self):
        """Create Google Calendar service instance"""
        return GoogleCalendarService()
    
    @pytest.mark.asyncio
    async def test_oauth_credential_management(self, calendar_service):
        """Test OAuth credential storage and refresh"""
        mock_credentials = Mock(spec=Credentials)
        mock_credentials.token = "access_token_123"
        mock_credentials.refresh_token = "refresh_token_456"
        mock_credentials.expired = False
        
        user_id = 1
        await calendar_service.store_credentials(user_id, mock_credentials)
        
        # Test credential retrieval
        retrieved_creds = await calendar_service.get_credentials(user_id)
        assert retrieved_creds is not None
        assert retrieved_creds.token == "access_token_123"
    
    @pytest.mark.asyncio
    async def test_appointment_sync_to_google_calendar(self, calendar_service):
        """Test syncing 6FB appointments to Google Calendar"""
        appointment_data = {
            "id": 123,
            "client_name": "Jane Doe",
            "client_email": "jane@example.com",
            "service_name": "Haircut & Style",
            "appointment_date": datetime(2024, 12, 15, 14, 30),
            "duration_minutes": 60,
            "barber_name": "John Smith",
            "notes": "First time client, prefers shorter style"
        }
        
        with patch.object(calendar_service, '_get_calendar_service') as mock_service:
            mock_calendar = Mock()
            mock_service.return_value = mock_calendar
            
            mock_calendar.events().insert().execute.return_value = {
                "id": "google_event_123",
                "htmlLink": "https://calendar.google.com/event?eid=123"
            }
            
            result = await calendar_service.create_appointment_event(
                user_id=1, appointment_data=appointment_data
            )
            
            assert result["success"] is True
            assert result["google_event_id"] == "google_event_123"
            assert "htmlLink" in result
            
            # Verify event creation call
            mock_calendar.events().insert.assert_called_once()
            call_args = mock_calendar.events().insert.call_args[1]
            assert call_args["body"]["summary"] == "Haircut & Style - Jane Doe"
            assert "jane@example.com" in [attendee["email"] for attendee in call_args["body"]["attendees"]]
    
    @pytest.mark.asyncio
    async def test_two_way_calendar_sync(self, calendar_service):
        """Test bidirectional calendar synchronization"""
        # Test Google Calendar event creation reflecting in 6FB
        google_event = {
            "id": "google_event_456",
            "summary": "Personal Appointment",
            "start": {"dateTime": "2024-12-15T10:00:00Z"},
            "end": {"dateTime": "2024-12-15T11:00:00Z"},
            "creator": {"email": "barber@example.com"}
        }
        
        with patch.object(calendar_service, '_get_calendar_service') as mock_service:
            mock_calendar = Mock()
            mock_service.return_value = mock_calendar
            
            result = await calendar_service.sync_external_event_to_6fb(
                user_id=1, google_event=google_event
            )
            
            assert result["success"] is True
            assert result["blocked_time_created"] is True
            assert result["start_time"] == datetime(2024, 12, 15, 10, 0)
            assert result["duration_minutes"] == 60
    
    @pytest.mark.asyncio
    async def test_webhook_event_processing(self, calendar_service):
        """Test Google Calendar webhook event processing"""
        webhook_payload = {
            "resourceId": "calendar_resource_123",
            "resourceState": "updated",
            "resourceUri": "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            "channelId": "webhook_channel_456"
        }
        
        with patch.object(calendar_service, '_fetch_calendar_changes') as mock_fetch:
            mock_fetch.return_value = [
                {
                    "id": "updated_event_123",
                    "summary": "Updated Appointment",
                    "start": {"dateTime": "2024-12-15T15:00:00Z"},
                    "status": "confirmed"
                }
            ]
            
            result = await calendar_service.process_webhook_notification(webhook_payload)
            
            assert result["success"] is True
            assert result["changes_processed"] == 1
            mock_fetch.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_availability_blocking(self, calendar_service):
        """Test automatic availability blocking based on Google Calendar"""
        barber_id = 1
        calendar_events = [
            {
                "start": {"dateTime": "2024-12-15T09:00:00Z"},
                "end": {"dateTime": "2024-12-15T10:30:00Z"},
                "summary": "Personal Meeting"
            },
            {
                "start": {"dateTime": "2024-12-15T14:00:00Z"},
                "end": {"dateTime": "2024-12-15T15:00:00Z"},
                "summary": "Lunch Break"
            }
        ]
        
        result = await calendar_service.update_availability_from_calendar(
            barber_id, calendar_events
        )
        
        assert result["success"] is True
        assert result["blocked_slots"] == 2
        assert len(result["blocked_times"]) == 2


class TestSendGridIntegration:
    """Test SendGrid email marketing and transactional email integration"""
    
    @pytest.fixture
    def sendgrid_service(self):
        """Create SendGrid service instance"""
        return SendGridMarketingService()
    
    @pytest.mark.asyncio
    async def test_transactional_email_sending(self, sendgrid_service):
        """Test sending transactional emails (appointment confirmations, etc.)"""
        email_data = {
            "to_email": "client@example.com",
            "to_name": "Jane Doe",
            "template_id": "appointment_confirmation",
            "template_data": {
                "client_name": "Jane",
                "appointment_date": "December 15, 2024",
                "appointment_time": "2:30 PM",
                "service_name": "Haircut & Style",
                "barber_name": "John Smith",
                "barbershop_name": "Elite Cuts",
                "confirmation_link": "https://app.bookedbarber.com/confirm/123"
            }
        }
        
        with patch('sendgrid.SendGridAPIClient.send') as mock_send:
            mock_send.return_value = Mock(status_code=202, body="", headers={})
            
            result = await sendgrid_service.send_transactional_email(email_data)
            
            assert result["success"] is True
            assert result["status_code"] == 202
            mock_send.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_marketing_campaign_creation(self, sendgrid_service):
        """Test creating and sending marketing campaigns"""
        campaign_data = {
            "subject": "20% Off Your Next Appointment",
            "sender_name": "Elite Cuts",
            "sender_email": "hello@elitecuts.com",
            "template_id": "promotion_template",
            "list_ids": ["marketing_list_123"],
            "campaign_data": {
                "discount_code": "SAVE20",
                "expiration_date": "December 31, 2024",
                "booking_link": "https://app.bookedbarber.com/book"
            }
        }
        
        with patch.object(sendgrid_service, '_create_campaign') as mock_create, \
             patch.object(sendgrid_service, '_send_campaign') as mock_send:
            
            mock_create.return_value = {"id": "campaign_123"}
            mock_send.return_value = {"success": True}
            
            result = await sendgrid_service.create_and_send_campaign(campaign_data)
            
            assert result["success"] is True
            assert result["campaign_id"] == "campaign_123"
    
    @pytest.mark.asyncio
    async def test_contact_list_management(self, sendgrid_service):
        """Test managing contact lists and segmentation"""
        # Test adding client to marketing list
        client_data = {
            "email": "newclient@example.com",
            "first_name": "New",
            "last_name": "Client",
            "custom_fields": {
                "last_visit": "2024-11-15",
                "preferred_barber": "John Smith",
                "service_preference": "haircut"
            }
        }
        
        with patch.object(sendgrid_service, '_add_to_list') as mock_add:
            mock_add.return_value = {"success": True, "contact_id": "contact_123"}
            
            result = await sendgrid_service.add_client_to_marketing_list(
                client_data, list_id="marketing_list_123"
            )
            
            assert result["success"] is True
            assert result["contact_id"] == "contact_123"
    
    @pytest.mark.asyncio
    async def test_email_analytics_tracking(self, sendgrid_service):
        """Test email analytics and engagement tracking"""
        with patch.object(sendgrid_service, '_get_campaign_stats') as mock_stats:
            mock_stats.return_value = {
                "delivered": 950,
                "opens": 380,
                "clicks": 95,
                "bounces": 12,
                "spam_reports": 3,
                "unsubscribes": 5
            }
            
            analytics = await sendgrid_service.get_campaign_analytics("campaign_123")
            
            assert analytics["delivery_rate"] > 0.95
            assert analytics["open_rate"] == 0.40  # 380/950
            assert analytics["click_rate"] == 0.25  # 95/380
            assert analytics["engagement_score"] > 0.6
    
    @pytest.mark.asyncio
    async def test_webhook_event_processing(self, sendgrid_service):
        """Test processing SendGrid webhook events"""
        webhook_events = [
            {
                "event": "delivered",
                "email": "client@example.com",
                "timestamp": 1701234567,
                "sg_message_id": "msg_123"
            },
            {
                "event": "open",
                "email": "client@example.com",
                "timestamp": 1701234600,
                "sg_message_id": "msg_123"
            },
            {
                "event": "click",
                "email": "client@example.com",
                "timestamp": 1701234650,
                "url": "https://app.bookedbarber.com/book",
                "sg_message_id": "msg_123"
            }
        ]
        
        result = await sendgrid_service.process_webhook_events(webhook_events)
        
        assert result["success"] is True
        assert result["events_processed"] == 3
        assert result["unique_recipients"] == 1


class TestTwilioSMSIntegration:
    """Test Twilio SMS integration for notifications and marketing"""
    
    @pytest.fixture
    def twilio_service(self):
        """Create Twilio SMS service instance"""
        return TwilioSMSService()
    
    @pytest.mark.asyncio
    async def test_appointment_reminder_sms(self, twilio_service):
        """Test sending appointment reminder SMS messages"""
        reminder_data = {
            "to_phone": "+1234567890",
            "client_name": "Jane",
            "appointment_date": "December 15",
            "appointment_time": "2:30 PM",
            "barber_name": "John",
            "barbershop_name": "Elite Cuts",
            "confirmation_needed": True
        }
        
        with patch.object(twilio_service, '_send_sms') as mock_send:
            mock_send.return_value = {
                "success": True,
                "message_sid": "SM123456789",
                "status": "queued"
            }
            
            result = await twilio_service.send_appointment_reminder(reminder_data)
            
            assert result["success"] is True
            assert result["message_sid"] == "SM123456789"
            assert "Elite Cuts" in result["message_content"]
            assert "December 15" in result["message_content"]
    
    @pytest.mark.asyncio
    async def test_bulk_sms_marketing(self, twilio_service):
        """Test bulk SMS marketing campaigns"""
        campaign_data = {
            "message_template": "Hi {name}! 🎉 Get 20% off your next visit at {barbershop}. Book now: {link}",
            "recipients": [
                {"phone": "+1234567890", "name": "Jane", "barbershop": "Elite Cuts"},
                {"phone": "+1234567891", "name": "Mike", "barbershop": "Elite Cuts"},
                {"phone": "+1234567892", "name": "Sarah", "barbershop": "Elite Cuts"}
            ],
            "booking_link": "https://app.bookedbarber.com/book",
            "send_rate_limit": 10  # messages per second
        }
        
        with patch.object(twilio_service, '_send_bulk_sms') as mock_bulk_send:
            mock_bulk_send.return_value = {
                "total_sent": 3,
                "successful": 3,
                "failed": 0,
                "message_sids": ["SM111", "SM222", "SM333"]
            }
            
            result = await twilio_service.send_bulk_marketing_sms(campaign_data)
            
            assert result["success"] is True
            assert result["total_sent"] == 3
            assert result["success_rate"] == 1.0
    
    @pytest.mark.asyncio
    async def test_sms_conversation_handling(self, twilio_service):
        """Test handling incoming SMS responses and conversations"""
        incoming_sms = {
            "from_phone": "+1234567890",
            "to_phone": "+1987654321",
            "message_body": "YES to confirm my appointment tomorrow",
            "message_sid": "SM987654321"
        }
        
        with patch.object(twilio_service, '_parse_intent') as mock_parse:
            mock_parse.return_value = {
                "intent": "appointment_confirmation",
                "confidence": 0.95,
                "entities": {"response": "yes", "timeframe": "tomorrow"}
            }
            
            result = await twilio_service.handle_incoming_sms(incoming_sms)
            
            assert result["success"] is True
            assert result["intent"] == "appointment_confirmation"
            assert result["action_taken"] == "appointment_confirmed"
    
    @pytest.mark.asyncio
    async def test_sms_delivery_tracking(self, twilio_service):
        """Test SMS delivery status tracking and analytics"""
        message_sids = ["SM111", "SM222", "SM333", "SM444"]
        
        with patch.object(twilio_service, '_get_message_status') as mock_status:
            mock_status.side_effect = [
                {"status": "delivered", "price": "0.0075"},
                {"status": "delivered", "price": "0.0075"},
                {"status": "failed", "error_code": "30008"},
                {"status": "sent", "price": "0.0075"}
            ]
            
            analytics = await twilio_service.get_campaign_analytics(message_sids)
            
            assert analytics["total_messages"] == 4
            assert analytics["delivered"] == 2
            assert analytics["failed"] == 1
            assert analytics["pending"] == 1
            assert analytics["delivery_rate"] == 0.5  # 2/4
            assert analytics["total_cost"] == 0.0225  # 3 * $0.0075


class TestGoogleMyBusinessIntegration:
    """Test Google My Business integration for local SEO and reviews"""
    
    @pytest.fixture
    def gmb_service(self):
        """Create Google My Business service instance"""
        return GMBService()
    
    @pytest.mark.asyncio
    async def test_business_profile_management(self, gmb_service):
        """Test managing Google My Business profile information"""
        profile_data = {
            "business_name": "Elite Cuts Barbershop",
            "address": {
                "street": "123 Main Street",
                "city": "New York",
                "state": "NY",
                "zip_code": "10001"
            },
            "phone": "+1234567890",
            "website": "https://elitecuts.com",
            "business_hours": {
                "monday": {"open": "09:00", "close": "18:00"},
                "tuesday": {"open": "09:00", "close": "18:00"},
                "wednesday": {"open": "09:00", "close": "18:00"},
                "thursday": {"open": "09:00", "close": "19:00"},
                "friday": {"open": "09:00", "close": "19:00"},
                "saturday": {"open": "08:00", "close": "17:00"},
                "sunday": {"closed": True}
            }
        }
        
        with patch.object(gmb_service, '_update_business_info') as mock_update:
            mock_update.return_value = {"success": True, "location_id": "location_123"}
            
            result = await gmb_service.update_business_profile(profile_data)
            
            assert result["success"] is True
            assert result["location_id"] == "location_123"
    
    @pytest.mark.asyncio
    async def test_review_management(self, gmb_service):
        """Test managing Google My Business reviews"""
        with patch.object(gmb_service, '_get_reviews') as mock_get_reviews:
            mock_get_reviews.return_value = [
                {
                    "review_id": "review_123",
                    "reviewer_name": "Happy Customer",
                    "rating": 5,
                    "comment": "Great service and atmosphere!",
                    "create_time": "2024-11-15T10:30:00Z"
                },
                {
                    "review_id": "review_456",
                    "reviewer_name": "Another Client",
                    "rating": 4,
                    "comment": "Good cut, friendly staff",
                    "create_time": "2024-11-10T14:15:00Z"
                }
            ]
            
            reviews = await gmb_service.get_recent_reviews("location_123")
            
            assert len(reviews) == 2
            assert reviews[0]["rating"] == 5
            assert "Great service" in reviews[0]["comment"]
            
            # Test review response
            response_data = {
                "review_id": "review_123",
                "response_text": "Thank you for the wonderful review! We're thrilled you enjoyed your experience at Elite Cuts."
            }
            
            with patch.object(gmb_service, '_reply_to_review') as mock_reply:
                mock_reply.return_value = {"success": True}
                
                reply_result = await gmb_service.respond_to_review(response_data)
                assert reply_result["success"] is True
    
    @pytest.mark.asyncio
    async def test_posts_and_updates(self, gmb_service):
        """Test creating Google My Business posts and updates"""
        post_data = {
            "post_type": "offer",
            "summary": "Holiday Special - 20% Off All Services",
            "content": "Book your holiday appointment now and save 20% on all services. Perfect time for a fresh new look!",
            "image_url": "https://elitecuts.com/images/holiday-special.jpg",
            "call_to_action": {
                "type": "BOOK",
                "url": "https://app.bookedbarber.com/book"
            },
            "offer_details": {
                "coupon_code": "HOLIDAY20",
                "terms": "Valid through December 31, 2024"
            }
        }
        
        with patch.object(gmb_service, '_create_post') as mock_create_post:
            mock_create_post.return_value = {
                "success": True,
                "post_id": "post_123",
                "state": "LIVE"
            }
            
            result = await gmb_service.create_business_post(post_data)
            
            assert result["success"] is True
            assert result["post_id"] == "post_123"
            assert result["state"] == "LIVE"


class TestMetaBusinessIntegration:
    """Test Meta (Facebook/Instagram) Business integration"""
    
    @pytest.fixture
    def meta_service(self):
        """Create Meta Business service instance"""
        return MetaBusinessService()
    
    @pytest.mark.asyncio
    async def test_facebook_ad_campaign_creation(self, meta_service):
        """Test creating Facebook advertising campaigns"""
        campaign_data = {
            "campaign_name": "Holiday Booking Drive",
            "objective": "CONVERSIONS",
            "budget_type": "DAILY",
            "daily_budget": 5000,  # $50.00
            "target_audience": {
                "age_min": 18,
                "age_max": 65,
                "genders": ["male"],
                "geo_locations": {
                    "cities": [{"key": "2490299", "name": "New York"}]
                },
                "interests": ["barbershop", "men's grooming", "hair styling"]
            },
            "ad_creative": {
                "headline": "Book Your Perfect Cut Today",
                "description": "Professional barbershop services. Book online and save time!",
                "image_url": "https://elitecuts.com/images/ad-creative.jpg",
                "call_to_action": "BOOK_TRAVEL"
            }
        }
        
        with patch.object(meta_service, '_create_campaign') as mock_create:
            mock_create.return_value = {
                "success": True,
                "campaign_id": "campaign_123",
                "status": "ACTIVE"
            }
            
            result = await meta_service.create_ad_campaign(campaign_data)
            
            assert result["success"] is True
            assert result["campaign_id"] == "campaign_123"
    
    @pytest.mark.asyncio
    async def test_instagram_business_posting(self, meta_service):
        """Test posting to Instagram Business account"""
        post_data = {
            "image_url": "https://elitecuts.com/images/before-after.jpg",
            "caption": "Another amazing transformation! ✂️ Book your appointment today. #barbershop #transformation #mensstyle",
            "hashtags": ["#barbershop", "#mensstyle", "#transformation", "#booknow"],
            "location_id": "instagram_location_123"
        }
        
        with patch.object(meta_service, '_create_instagram_post') as mock_post:
            mock_post.return_value = {
                "success": True,
                "post_id": "instagram_post_123",
                "permalink": "https://instagram.com/p/abc123"
            }
            
            result = await meta_service.create_instagram_post(post_data)
            
            assert result["success"] is True
            assert result["post_id"] == "instagram_post_123"
    
    @pytest.mark.asyncio
    async def test_conversion_tracking(self, meta_service):
        """Test Meta Pixel conversion tracking"""
        conversion_data = {
            "event_name": "Purchase",
            "event_time": int(datetime.now().timestamp()),
            "user_data": {
                "email_hash": "hashed_email_123",
                "phone_hash": "hashed_phone_456"
            },
            "custom_data": {
                "currency": "USD",
                "value": 75.00,
                "content_type": "service",
                "content_name": "Premium Haircut"
            }
        }
        
        with patch.object(meta_service, '_send_conversion_event') as mock_conversion:
            mock_conversion.return_value = {"success": True, "events_received": 1}
            
            result = await meta_service.track_conversion(conversion_data)
            
            assert result["success"] is True
            assert result["events_received"] == 1


class TestIntegrationErrorHandling:
    """Test error handling and resilience across all integrations"""
    
    @pytest.mark.asyncio
    async def test_api_timeout_handling(self):
        """Test handling of API timeouts across integrations"""
        services = [
            StripeIntegrationService(),
            GoogleCalendarService(),
            SendGridMarketingService(),
            TwilioSMSService()
        ]
        
        for service in services:
            with patch.object(service, '_make_api_request') as mock_request:
                mock_request.side_effect = asyncio.TimeoutError("Request timeout")
                
                # Test that timeout is handled gracefully
                result = await service.handle_api_timeout()
                
                assert result["success"] is False
                assert "timeout" in result["error"].lower()
                assert "retry" in result
    
    @pytest.mark.asyncio
    async def test_rate_limit_handling(self):
        """Test handling of API rate limits"""
        stripe_service = StripeIntegrationService()
        
        with patch('stripe.PaymentIntent.create') as mock_create:
            # Simulate rate limit error
            mock_create.side_effect = stripe.error.RateLimitError("Rate limit exceeded")
            
            result = await stripe_service.create_payment_intent_with_retry({
                "amount": 1000,
                "currency": "usd"
            })
            
            assert result["success"] is False
            assert "rate limit" in result["error"].lower()
            assert result["retry_after"] > 0
    
    @pytest.mark.asyncio
    async def test_webhook_replay_protection(self):
        """Test webhook replay attack protection"""
        stripe_service = StripeIntegrationService()
        
        # Same webhook payload sent twice
        payload = '{"type": "payment_intent.succeeded", "id": "evt_123"}'
        signature = "test_signature"
        
        # First request should succeed
        result1 = await stripe_service.process_webhook(payload, signature)
        
        # Second identical request should be rejected as replay
        result2 = await stripe_service.process_webhook(payload, signature)
        
        assert result1["success"] is True
        assert result2["success"] is False
        assert "replay" in result2["error"].lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "--asyncio-mode=auto"])