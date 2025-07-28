"""
Google Calendar Webhook Endpoints for BookedBarber V2
Handles real-time push notifications from Google Calendar for immediate synchronization
"""

import json
import hmac
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, Response, Depends, HTTPException, BackgroundTasks
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from db import get_db
from models import (
    User, GoogleCalendarWebhookSubscription, GoogleCalendarWebhookNotification,
    GoogleCalendarSyncEvent, GoogleCalendarSettings
)
from services.google_calendar_webhook_service import GoogleCalendarWebhookService
from services.google_calendar_service import GoogleCalendarService
from core.security import verify_google_webhook_signature
import os

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v2/webhooks", tags=["Google Calendar Webhooks"])


@router.post("/google-calendar")
async def google_calendar_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Handle Google Calendar push notifications for real-time synchronization.
    This endpoint receives webhook notifications when calendar events change.
    
    Google Calendar sends notifications with these headers:
    - X-Goog-Channel-ID: The channel ID we provided when subscribing
    - X-Goog-Channel-Token: Optional token for additional verification
    - X-Goog-Resource-ID: Google's resource ID for the calendar
    - X-Goog-Resource-URI: The URI being watched
    - X-Goog-Resource-State: The type of change (exists, not_exists, sync)
    - X-Goog-Message-Number: Sequential message number
    - X-Goog-Channel-Expiration: When the subscription expires
    """
    try:
        # Get headers
        headers = dict(request.headers)
        
        # Extract Google-specific headers
        channel_id = headers.get("x-goog-channel-id")
        channel_token = headers.get("x-goog-channel-token")
        resource_id = headers.get("x-goog-resource-id")
        resource_uri = headers.get("x-goog-resource-uri")
        resource_state = headers.get("x-goog-resource-state")
        message_number = headers.get("x-goog-message-number")
        expiration_time = headers.get("x-goog-channel-expiration")
        
        # Get request body
        body = await request.body()
        body_text = body.decode('utf-8') if body else ""
        
        logger.info(f"Received Google Calendar webhook - Channel: {channel_id}, State: {resource_state}")
        
        # Validate required headers
        if not channel_id or not resource_id:
            logger.error(f"Missing required headers - Channel ID: {channel_id}, Resource ID: {resource_id}")
            raise HTTPException(status_code=400, detail="Missing required Google webhook headers")
        
        # Find the subscription
        subscription = db.query(GoogleCalendarWebhookSubscription).filter(
            GoogleCalendarWebhookSubscription.google_subscription_id == channel_id,
            GoogleCalendarWebhookSubscription.google_resource_id == resource_id,
            GoogleCalendarWebhookSubscription.is_active == True
        ).first()
        
        if not subscription:
            logger.warning(f"Received webhook for unknown subscription - Channel: {channel_id}")
            # Return 200 to prevent Google from retrying
            return {"status": "ok", "message": "Subscription not found"}
        
        # Verify webhook token if configured
        if subscription.webhook_token and channel_token != subscription.webhook_token:
            logger.error(f"Invalid webhook token for subscription {subscription.id}")
            raise HTTPException(status_code=401, detail="Invalid webhook token")
        
        # Additional security verification (if configured)
        webhook_secret = os.getenv("GOOGLE_WEBHOOK_SECRET")
        if webhook_secret:
            if not verify_google_webhook_signature(body, headers.get("x-goog-signature", ""), webhook_secret):
                logger.error(f"Invalid webhook signature for subscription {subscription.id}")
                raise HTTPException(status_code=401, detail="Invalid webhook signature")
        
        # Create notification record
        notification = GoogleCalendarWebhookNotification(
            subscription_id=subscription.id,
            google_channel_id=channel_id,
            google_resource_id=resource_id,
            google_resource_uri=resource_uri,
            google_resource_state=resource_state,
            message_number=int(message_number) if message_number else None,
            expiration_time=datetime.fromisoformat(expiration_time.replace('Z', '+00:00')) if expiration_time else None,
            raw_headers=json.dumps(headers),
            raw_body=body_text,
            status="pending"
        )
        db.add(notification)
        
        # Update subscription stats
        subscription.last_notification_received = datetime.utcnow()
        subscription.notification_count += 1
        
        db.commit()
        
        # Process webhook asynchronously
        background_tasks.add_task(
            process_webhook_notification,
            db_session=db,
            notification_id=notification.id,
            subscription_id=subscription.id
        )
        
        logger.info(f"Successfully received webhook notification {notification.id}")
        
        # Google expects a 200 response to acknowledge receipt
        return {"status": "ok", "notification_id": notification.id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing Google Calendar webhook: {str(e)}")
        # Return 500 so Google will retry
        raise HTTPException(status_code=500, detail="Internal server error processing webhook")


async def process_webhook_notification(db_session: Session, notification_id: int, subscription_id: int):
    """
    Process webhook notification in the background to avoid blocking the webhook response.
    This function handles the actual calendar synchronization triggered by the webhook.
    """
    try:
        # Get fresh database session for background task
        from db import SessionLocal
        db = SessionLocal()
        
        try:
            # Get notification and subscription
            notification = db.query(GoogleCalendarWebhookNotification).filter(
                GoogleCalendarWebhookNotification.id == notification_id
            ).first()
            
            if not notification:
                logger.error(f"Notification {notification_id} not found for processing")
                return
            
            subscription = db.query(GoogleCalendarWebhookSubscription).filter(
                GoogleCalendarWebhookSubscription.id == subscription_id
            ).first()
            
            if not subscription:
                logger.error(f"Subscription {subscription_id} not found for processing")
                return
            
            # Mark notification as processing
            notification.status = "processing"
            notification.processed_at = datetime.utcnow()
            db.commit()
            
            # Initialize webhook service
            webhook_service = GoogleCalendarWebhookService(db)
            
            # Process the notification based on resource state
            if notification.google_resource_state == "sync":
                # Initial sync notification - perform full sync
                logger.info(f"Processing sync notification for subscription {subscription.id}")
                result = await webhook_service.handle_sync_notification(notification, subscription)
                
            elif notification.google_resource_state == "exists":
                # Event change notification - perform incremental sync
                logger.info(f"Processing change notification for subscription {subscription.id}")
                result = await webhook_service.handle_change_notification(notification, subscription)
                
            elif notification.google_resource_state == "not_exists":
                # Resource deleted - clean up
                logger.info(f"Processing deletion notification for subscription {subscription.id}")
                result = await webhook_service.handle_deletion_notification(notification, subscription)
                
            else:
                logger.warning(f"Unknown resource state: {notification.google_resource_state}")
                result = {"status": "skipped", "reason": "unknown_resource_state"}
            
            # Update notification with results
            notification.status = "processed" if result.get("status") == "success" else "failed"
            notification.events_processed = result.get("events_processed", 0)
            notification.events_created = result.get("events_created", 0)
            notification.events_updated = result.get("events_updated", 0)
            notification.events_deleted = result.get("events_deleted", 0)
            notification.sync_triggered = result.get("sync_triggered", False)
            
            if result.get("error"):
                notification.error_message = result["error"]
                subscription.error_count += 1
                subscription.last_error = result["error"]
                subscription.last_error_at = datetime.utcnow()
            else:
                # Reset error count on successful processing
                subscription.error_count = 0
                subscription.last_error = None
                subscription.last_sync_at = datetime.utcnow()
            
            db.commit()
            
            logger.info(f"Successfully processed webhook notification {notification_id}")
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error in background webhook processing: {str(e)}")
        # Update notification status on error
        try:
            from db import SessionLocal
            db = SessionLocal()
            notification = db.query(GoogleCalendarWebhookNotification).filter(
                GoogleCalendarWebhookNotification.id == notification_id
            ).first()
            if notification:
                notification.status = "failed"
                notification.error_message = str(e)
                notification.retry_count += 1
                db.commit()
            db.close()
        except:
            pass  # Don't let error handling itself fail


@router.get("/google-calendar/health")
async def webhook_health_check():
    """
    Simple health check endpoint for webhook infrastructure.
    """
    return {
        "status": "healthy",
        "service": "google-calendar-webhook",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0"
    }


@router.get("/google-calendar/subscriptions/{user_id}")
async def get_user_webhook_subscriptions(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Get webhook subscriptions for a specific user.
    Useful for debugging and monitoring webhook status.
    """
    try:
        subscriptions = db.query(GoogleCalendarWebhookSubscription).filter(
            GoogleCalendarWebhookSubscription.user_id == user_id
        ).all()
        
        return {
            "user_id": user_id,
            "subscriptions": [
                {
                    "id": sub.id,
                    "google_subscription_id": sub.google_subscription_id,
                    "google_calendar_id": sub.google_calendar_id,
                    "is_active": sub.is_active,
                    "expiration_time": sub.expiration_time,
                    "notification_count": sub.notification_count,
                    "last_notification_received": sub.last_notification_received,
                    "error_count": sub.error_count,
                    "last_error": sub.last_error
                }
                for sub in subscriptions
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting webhook subscriptions for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/google-calendar/test")
async def test_webhook_endpoint(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Test endpoint for webhook functionality.
    Only available in development/staging environments.
    """
    if os.getenv("ENVIRONMENT", "production") == "production":
        raise HTTPException(status_code=404, detail="Test endpoint not available in production")
    
    headers = dict(request.headers)
    body = await request.body()
    
    return {
        "status": "test_received",
        "headers": headers,
        "body": body.decode('utf-8') if body else "",
        "timestamp": datetime.utcnow().isoformat()
    }