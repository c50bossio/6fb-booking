"""
Event Processors for BookedBarber V2 Event Streaming.

Contains specialized event processors for different event types:
- Marketing analytics processor
- Real-time dashboard updates
- Conversion tracking processor
- User behavior analytics
- System monitoring processor
"""

import logging
import json
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from database import get_db
from models.tracking import ConversionEvent, EventType
from models import User, Appointment, Client
from services.event_streaming_service import StreamEvent, event_streaming_service
from services.marketing_analytics_service import MarketingAnalyticsService
from services.conversion_tracking_service import ConversionTrackingService

logger = logging.getLogger(__name__)


class MarketingEventProcessor:
    """
    Processes marketing events for real-time analytics and attribution.
    """
    
    def __init__(self):
        self.db_session = None
        self.analytics_service = None
        self.conversion_service = ConversionTrackingService()
    
    async def process_event(self, event: StreamEvent):
        """Process a marketing event"""
        try:
            # Get database session
            db = next(get_db())
            
            if not self.analytics_service:
                self.analytics_service = MarketingAnalyticsService(db)
            
            logger.info(f"Processing marketing event: {event.event_type}")
            
            # Process different marketing event types
            if event.event_type == "page_view":
                await self._process_page_view(db, event)
            elif event.event_type == "conversion":
                await self._process_conversion(db, event)
            elif event.event_type == "campaign_interaction":
                await self._process_campaign_interaction(db, event)
            elif event.event_type == "email_open":
                await self._process_email_event(db, event, "opened")
            elif event.event_type == "email_click":
                await self._process_email_event(db, event, "clicked")
            elif event.event_type == "sms_delivered":
                await self._process_sms_event(db, event, "delivered")
            elif event.event_type == "social_engagement":
                await self._process_social_engagement(db, event)
            
        except Exception as e:
            logger.error(f"Error processing marketing event: {e}")
        finally:
            if db:
                db.close()
    
    async def _process_page_view(self, db: Session, event: StreamEvent):
        """Process page view events for analytics"""
        try:
            # Create conversion event for tracking
            conversion_event = ConversionEvent(
                user_id=event.user_id,
                organization_id=event.organization_id,
                event_type=EventType.PAGE_VIEW,
                event_name="Page View",
                source_url=event.data.get("page_url", ""),
                utm_source=event.data.get("utm_source"),
                utm_medium=event.data.get("utm_medium"),
                utm_campaign=event.data.get("utm_campaign"),
                utm_content=event.data.get("utm_content"),
                utm_term=event.data.get("utm_term"),
                channel=event.data.get("channel", "direct"),
                session_id=event.data.get("session_id"),
                client_id=event.data.get("client_id"),
                ip_address=event.data.get("ip_address"),
                user_agent=event.data.get("user_agent")
            )
            
            db.add(conversion_event)
            db.commit()
            
            # Update real-time analytics cache
            await self._update_realtime_metrics(event.organization_id, "page_views", 1)
            
        except Exception as e:
            logger.error(f"Error processing page view: {e}")
            db.rollback()
    
    async def _process_conversion(self, db: Session, event: StreamEvent):
        """Process conversion events"""
        try:
            # Create conversion event
            conversion_event = ConversionEvent(
                user_id=event.user_id,
                organization_id=event.organization_id,
                event_type=EventType.PURCHASE,
                event_name=f"Conversion: {event.data.get('conversion_type', 'unknown')}",
                event_value=event.data.get("conversion_value", 0),
                currency=event.data.get("currency", "USD"),
                source_url=event.data.get("source_url", ""),
                utm_source=event.data.get("utm_source"),
                utm_medium=event.data.get("utm_medium"),
                utm_campaign=event.data.get("utm_campaign"),
                channel=event.data.get("channel", "direct"),
                session_id=event.data.get("session_id"),
                client_id=event.data.get("client_id"),
                appointment_id=event.data.get("appointment_id"),
                ip_address=event.data.get("ip_address"),
                user_agent=event.data.get("user_agent")
            )
            
            db.add(conversion_event)
            db.commit()
            
            # Update real-time metrics
            await self._update_realtime_metrics(
                event.organization_id, 
                "conversions", 
                1
            )
            await self._update_realtime_metrics(
                event.organization_id, 
                "revenue", 
                event.data.get("conversion_value", 0)
            )
            
            # Trigger attribution analysis
            if event.data.get("client_id"):
                await self._trigger_attribution_update(db, event.data["client_id"])
            
        except Exception as e:
            logger.error(f"Error processing conversion: {e}")
            db.rollback()
    
    async def _process_campaign_interaction(self, db: Session, event: StreamEvent):
        """Process campaign interaction events"""
        try:
            # Create interaction event
            conversion_event = ConversionEvent(
                user_id=event.user_id,
                organization_id=event.organization_id,
                event_type=EventType.CLICK,
                event_name=f"Campaign Interaction: {event.data.get('interaction_type', 'click')}",
                utm_source=event.data.get("utm_source"),
                utm_medium=event.data.get("utm_medium"),
                utm_campaign=event.data.get("utm_campaign"),
                channel=event.data.get("channel", "unknown"),
                session_id=event.data.get("session_id"),
                client_id=event.data.get("client_id"),
                metadata={
                    "campaign_id": event.data.get("campaign_id"),
                    "creative_id": event.data.get("creative_id"),
                    "placement": event.data.get("placement")
                }
            )
            
            db.add(conversion_event)
            db.commit()
            
            # Update campaign metrics
            await self._update_campaign_metrics(
                event.data.get("campaign_id"),
                event.data.get("interaction_type", "click")
            )
            
        except Exception as e:
            logger.error(f"Error processing campaign interaction: {e}")
            db.rollback()
    
    async def _process_email_event(self, db: Session, event: StreamEvent, action: str):
        """Process email marketing events"""
        try:
            # Create email event
            conversion_event = ConversionEvent(
                user_id=event.user_id,
                organization_id=event.organization_id,
                event_type=EventType.CLICK if action == "clicked" else EventType.VIEW,
                event_name=f"Email {action.title()}",
                channel="email",
                utm_source="email",
                utm_medium="email",
                utm_campaign=event.data.get("campaign_name"),
                client_id=event.data.get("client_id"),
                metadata={
                    "email_id": event.data.get("email_id"),
                    "template_id": event.data.get("template_id"),
                    "subject_line": event.data.get("subject_line"),
                    "link_url": event.data.get("link_url") if action == "clicked" else None
                }
            )
            
            db.add(conversion_event)
            db.commit()
            
            # Update email campaign metrics
            await self._update_email_metrics(
                event.data.get("campaign_name"),
                action
            )
            
        except Exception as e:
            logger.error(f"Error processing email event: {e}")
            db.rollback()
    
    async def _process_sms_event(self, db: Session, event: StreamEvent, action: str):
        """Process SMS marketing events"""
        try:
            # Create SMS event
            conversion_event = ConversionEvent(
                user_id=event.user_id,
                organization_id=event.organization_id,
                event_type=EventType.VIEW,
                event_name=f"SMS {action.title()}",
                channel="sms",
                utm_source="sms",
                utm_medium="sms",
                utm_campaign=event.data.get("campaign_name"),
                client_id=event.data.get("client_id"),
                metadata={
                    "message_id": event.data.get("message_id"),
                    "phone_number": event.data.get("phone_number"),
                    "message_content": event.data.get("message_content")
                }
            )
            
            db.add(conversion_event)
            db.commit()
            
        except Exception as e:
            logger.error(f"Error processing SMS event: {e}")
            db.rollback()
    
    async def _process_social_engagement(self, db: Session, event: StreamEvent):
        """Process social media engagement events"""
        try:
            # Create social engagement event
            conversion_event = ConversionEvent(
                user_id=event.user_id,
                organization_id=event.organization_id,
                event_type=EventType.CLICK,
                event_name=f"Social Engagement: {event.data.get('engagement_type', 'interaction')}",
                channel="social",
                utm_source=event.data.get("platform", "social"),
                utm_medium="social",
                utm_campaign=event.data.get("campaign_name"),
                client_id=event.data.get("client_id"),
                metadata={
                    "platform": event.data.get("platform"),
                    "post_id": event.data.get("post_id"),
                    "engagement_type": event.data.get("engagement_type"),
                    "content_type": event.data.get("content_type")
                }
            )
            
            db.add(conversion_event)
            db.commit()
            
        except Exception as e:
            logger.error(f"Error processing social engagement: {e}")
            db.rollback()
    
    async def _update_realtime_metrics(self, organization_id: int, metric: str, value: float):
        """Update real-time metrics in Redis cache"""
        try:
            if not event_streaming_service.redis_client:
                return
            
            # Update hourly metrics
            hour_key = f"realtime:metrics:{organization_id}:{datetime.utcnow().strftime('%Y%m%d%H')}"
            await event_streaming_service.redis_client.hincrby(hour_key, metric, int(value))
            await event_streaming_service.redis_client.expire(hour_key, 86400)  # Expire after 24 hours
            
            # Update daily metrics
            day_key = f"realtime:metrics:{organization_id}:{datetime.utcnow().strftime('%Y%m%d')}"
            await event_streaming_service.redis_client.hincrby(day_key, metric, int(value))
            await event_streaming_service.redis_client.expire(day_key, 604800)  # Expire after 7 days
            
        except Exception as e:
            logger.error(f"Error updating realtime metrics: {e}")
    
    async def _update_campaign_metrics(self, campaign_id: str, interaction_type: str):
        """Update campaign-specific metrics"""
        try:
            if not event_streaming_service.redis_client or not campaign_id:
                return
            
            # Update campaign interaction counts
            campaign_key = f"campaign:metrics:{campaign_id}:{datetime.utcnow().strftime('%Y%m%d')}"
            await event_streaming_service.redis_client.hincrby(campaign_key, interaction_type, 1)
            await event_streaming_service.redis_client.hincrby(campaign_key, "total_interactions", 1)
            await event_streaming_service.redis_client.expire(campaign_key, 2592000)  # 30 days
            
        except Exception as e:
            logger.error(f"Error updating campaign metrics: {e}")
    
    async def _update_email_metrics(self, campaign_name: str, action: str):
        """Update email campaign metrics"""
        try:
            if not event_streaming_service.redis_client or not campaign_name:
                return
            
            # Update email metrics
            email_key = f"email:metrics:{campaign_name}:{datetime.utcnow().strftime('%Y%m%d')}"
            await event_streaming_service.redis_client.hincrby(email_key, f"total_{action}", 1)
            await event_streaming_service.redis_client.expire(email_key, 2592000)  # 30 days
            
        except Exception as e:
            logger.error(f"Error updating email metrics: {e}")
    
    async def _trigger_attribution_update(self, db: Session, client_id: int):
        """Trigger multi-touch attribution analysis for a client"""
        try:
            # This would trigger the multi-touch attribution service
            # to recalculate attribution for this client's journey
            
            # For now, we'll just publish an event to trigger attribution processing
            await event_streaming_service.publish_event(
                stream=event_streaming_service.StreamName.ANALYTICS,
                event=StreamEvent(
                    event_type="attribution_update_required",
                    timestamp=datetime.utcnow(),
                    data={"client_id": client_id}
                )
            )
            
        except Exception as e:
            logger.error(f"Error triggering attribution update: {e}")


class UserBehaviorProcessor:
    """
    Processes user behavior events for analytics and personalization.
    """
    
    def __init__(self):
        self.db_session = None
    
    async def process_event(self, event: StreamEvent):
        """Process a user behavior event"""
        try:
            db = next(get_db())
            
            logger.info(f"Processing user behavior event: {event.event_type}")
            
            # Process different behavior event types
            if event.event_type == "session_start":
                await self._process_session_start(db, event)
            elif event.event_type == "session_end":
                await self._process_session_end(db, event)
            elif event.event_type == "feature_usage":
                await self._process_feature_usage(db, event)
            elif event.event_type == "booking_flow_step":
                await self._process_booking_flow(db, event)
            elif event.event_type == "search_performed":
                await self._process_search(db, event)
            elif event.event_type == "error_encountered":
                await self._process_error(db, event)
            
        except Exception as e:
            logger.error(f"Error processing user behavior event: {e}")
        finally:
            if db:
                db.close()
    
    async def _process_session_start(self, db: Session, event: StreamEvent):
        """Process session start events"""
        try:
            # Update session tracking in Redis
            if event_streaming_service.redis_client:
                session_key = f"session:{event.data.get('session_id')}:{event.user_id}"
                session_data = {
                    "user_id": str(event.user_id),
                    "start_time": event.timestamp.isoformat(),
                    "page_url": event.data.get("page_url", ""),
                    "user_agent": event.data.get("user_agent", ""),
                    "ip_address": event.data.get("ip_address", "")
                }
                
                await event_streaming_service.redis_client.hmset(session_key, session_data)
                await event_streaming_service.redis_client.expire(session_key, 3600)  # 1 hour
            
        except Exception as e:
            logger.error(f"Error processing session start: {e}")
    
    async def _process_session_end(self, db: Session, event: StreamEvent):
        """Process session end events"""
        try:
            # Calculate session duration and update analytics
            if event_streaming_service.redis_client:
                session_key = f"session:{event.data.get('session_id')}:{event.user_id}"
                session_data = await event_streaming_service.redis_client.hgetall(session_key)
                
                if session_data and session_data.get("start_time"):
                    start_time = datetime.fromisoformat(session_data["start_time"].decode())
                    duration = (event.timestamp - start_time).total_seconds()
                    
                    # Update session duration metrics
                    org_key = f"behavior:sessions:{event.organization_id}:{datetime.utcnow().strftime('%Y%m%d')}"
                    await event_streaming_service.redis_client.hincrby(org_key, "total_sessions", 1)
                    await event_streaming_service.redis_client.hincrby(org_key, "total_duration", int(duration))
                    await event_streaming_service.redis_client.expire(org_key, 604800)  # 7 days
            
        except Exception as e:
            logger.error(f"Error processing session end: {e}")
    
    async def _process_feature_usage(self, db: Session, event: StreamEvent):
        """Process feature usage events"""
        try:
            feature_name = event.data.get("feature_name")
            if not feature_name:
                return
            
            # Track feature usage in Redis
            if event_streaming_service.redis_client:
                feature_key = f"features:{event.organization_id}:{datetime.utcnow().strftime('%Y%m%d')}"
                await event_streaming_service.redis_client.hincrby(feature_key, feature_name, 1)
                await event_streaming_service.redis_client.expire(feature_key, 604800)  # 7 days
            
        except Exception as e:
            logger.error(f"Error processing feature usage: {e}")
    
    async def _process_booking_flow(self, db: Session, event: StreamEvent):
        """Process booking flow step events"""
        try:
            step_name = event.data.get("step_name")
            if not step_name:
                return
            
            # Track booking funnel steps
            if event_streaming_service.redis_client:
                funnel_key = f"booking:funnel:{event.organization_id}:{datetime.utcnow().strftime('%Y%m%d')}"
                await event_streaming_service.redis_client.hincrby(funnel_key, step_name, 1)
                await event_streaming_service.redis_client.expire(funnel_key, 604800)  # 7 days
            
        except Exception as e:
            logger.error(f"Error processing booking flow: {e}")
    
    async def _process_search(self, db: Session, event: StreamEvent):
        """Process search events"""
        try:
            search_term = event.data.get("search_term")
            if not search_term:
                return
            
            # Track popular search terms
            if event_streaming_service.redis_client:
                search_key = f"searches:{event.organization_id}:{datetime.utcnow().strftime('%Y%m%d')}"
                await event_streaming_service.redis_client.zincrby(search_key, 1, search_term)
                await event_streaming_service.redis_client.expire(search_key, 604800)  # 7 days
            
        except Exception as e:
            logger.error(f"Error processing search: {e}")
    
    async def _process_error(self, db: Session, event: StreamEvent):
        """Process error events for monitoring"""
        try:
            error_type = event.data.get("error_type", "unknown")
            error_message = event.data.get("error_message", "")
            
            # Track errors for monitoring
            if event_streaming_service.redis_client:
                error_key = f"errors:{event.organization_id}:{datetime.utcnow().strftime('%Y%m%d')}"
                await event_streaming_service.redis_client.hincrby(error_key, error_type, 1)
                await event_streaming_service.redis_client.expire(error_key, 604800)  # 7 days
                
                # Also track recent errors with details
                recent_key = f"errors:recent:{event.organization_id}"
                error_detail = {
                    "timestamp": event.timestamp.isoformat(),
                    "user_id": str(event.user_id),
                    "error_type": error_type,
                    "error_message": error_message,
                    "page_url": event.data.get("page_url", ""),
                    "user_agent": event.data.get("user_agent", "")
                }
                
                await event_streaming_service.redis_client.lpush(recent_key, json.dumps(error_detail))
                await event_streaming_service.redis_client.ltrim(recent_key, 0, 99)  # Keep last 100 errors
                await event_streaming_service.redis_client.expire(recent_key, 86400)  # 24 hours
            
        except Exception as e:
            logger.error(f"Error processing error event: {e}")


class NotificationProcessor:
    """
    Processes notification events for real-time delivery.
    """
    
    async def process_event(self, event: StreamEvent):
        """Process a notification event"""
        try:
            logger.info(f"Processing notification event: {event.event_type}")
            
            # Process different notification types
            if event.event_type == "appointment_reminder":
                await self._process_appointment_reminder(event)
            elif event.event_type == "system_alert":
                await self._process_system_alert(event)
            elif event.event_type == "marketing_notification":
                await self._process_marketing_notification(event)
            elif event.event_type == "real_time_update":
                await self._process_real_time_update(event)
            
        except Exception as e:
            logger.error(f"Error processing notification event: {e}")
    
    async def _process_appointment_reminder(self, event: StreamEvent):
        """Process appointment reminder notifications"""
        try:
            # This would integrate with your notification service
            # to send SMS/email reminders
            logger.info(f"Sending appointment reminder to user {event.user_id}")
            
        except Exception as e:
            logger.error(f"Error processing appointment reminder: {e}")
    
    async def _process_system_alert(self, event: StreamEvent):
        """Process system alert notifications"""
        try:
            # This would handle system alerts and notifications
            # for administrators or monitoring systems
            logger.warning(f"System alert: {event.data.get('message', 'Unknown alert')}")
            
        except Exception as e:
            logger.error(f"Error processing system alert: {e}")
    
    async def _process_marketing_notification(self, event: StreamEvent):
        """Process marketing notifications"""
        try:
            # This would handle marketing notifications
            # like campaign performance alerts
            logger.info(f"Marketing notification: {event.data.get('message', 'Unknown notification')}")
            
        except Exception as e:
            logger.error(f"Error processing marketing notification: {e}")
    
    async def _process_real_time_update(self, event: StreamEvent):
        """Process real-time UI updates"""
        try:
            # This would send real-time updates to connected clients
            # via WebSockets or Server-Sent Events
            logger.info(f"Real-time update for user {event.user_id}: {event.data}")
            
        except Exception as e:
            logger.error(f"Error processing real-time update: {e}")


# Global processor instances
marketing_processor = MarketingEventProcessor()
behavior_processor = UserBehaviorProcessor()
notification_processor = NotificationProcessor()


# Event handler registration functions
async def handle_marketing_event(event: StreamEvent):
    """Handler for marketing events"""
    await marketing_processor.process_event(event)


async def handle_user_behavior_event(event: StreamEvent):
    """Handler for user behavior events"""
    await behavior_processor.process_event(event)


async def handle_notification_event(event: StreamEvent):
    """Handler for notification events"""
    await notification_processor.process_event(event)