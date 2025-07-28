"""
Background Worker for Google Calendar Webhook Management
Handles subscription renewal, cleanup, and maintenance tasks
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session

from db import SessionLocal
from models import GoogleCalendarWebhookSubscription, User
from services.google_calendar_webhook_service import GoogleCalendarWebhookService

logger = logging.getLogger(__name__)


class GoogleCalendarWebhookWorker:
    """Background worker for webhook subscription lifecycle management."""
    
    def __init__(self):
        self.webhook_service = None
        self.running = False
        
    async def start(self):
        """Start the webhook worker."""
        self.running = True
        logger.info("Google Calendar webhook worker started")
        
        # Schedule periodic tasks
        asyncio.create_task(self._subscription_renewal_task())
        asyncio.create_task(self._cleanup_task())
        asyncio.create_task(self._health_check_task())
    
    async def stop(self):
        """Stop the webhook worker."""
        self.running = False
        logger.info("Google Calendar webhook worker stopped")
    
    async def _subscription_renewal_task(self):
        """Periodically check and renew expiring subscriptions."""
        while self.running:
            try:
                await self._renew_expiring_subscriptions()
                # Check every 2 hours
                await asyncio.sleep(2 * 60 * 60)
            except Exception as e:
                logger.error(f"Error in subscription renewal task: {str(e)}")
                # Wait shorter time on error
                await asyncio.sleep(30 * 60)
    
    async def _cleanup_task(self):
        """Periodically clean up expired and invalid subscriptions."""
        while self.running:
            try:
                await self._cleanup_expired_subscriptions()
                # Run cleanup once daily
                await asyncio.sleep(24 * 60 * 60)
            except Exception as e:
                logger.error(f"Error in cleanup task: {str(e)}")
                # Wait shorter time on error
                await asyncio.sleep(60 * 60)
    
    async def _health_check_task(self):
        """Periodically check webhook health and report issues."""
        while self.running:
            try:
                await self._perform_health_check()
                # Check health every 30 minutes
                await asyncio.sleep(30 * 60)
            except Exception as e:
                logger.error(f"Error in health check task: {str(e)}")
                # Wait shorter time on error
                await asyncio.sleep(10 * 60)
    
    async def _renew_expiring_subscriptions(self):
        """Find and renew subscriptions that are expiring soon."""
        db = SessionLocal()
        try:
            webhook_service = GoogleCalendarWebhookService(db)
            
            # Get subscriptions expiring in the next 2 hours
            expiring_subscriptions = webhook_service.get_expiring_subscriptions(hours_ahead=2)
            
            if not expiring_subscriptions:
                logger.debug("No expiring webhook subscriptions found")
                return
            
            logger.info(f"Found {len(expiring_subscriptions)} expiring webhook subscriptions")
            
            renewed_count = 0
            failed_count = 0
            
            for subscription in expiring_subscriptions:
                try:
                    success = webhook_service.renew_subscription(subscription)
                    if success:
                        renewed_count += 1
                        logger.info(f"Renewed webhook subscription {subscription.id} for user {subscription.user_id}")
                    else:
                        failed_count += 1
                        logger.warning(f"Failed to renew webhook subscription {subscription.id}")
                        
                except Exception as e:
                    failed_count += 1
                    logger.error(f"Error renewing webhook subscription {subscription.id}: {str(e)}")
                    
                    # Update subscription error count
                    subscription.error_count += 1
                    subscription.last_error = str(e)
                    subscription.last_error_at = datetime.utcnow()
            
            db.commit()
            
            if renewed_count > 0 or failed_count > 0:
                logger.info(f"Webhook renewal completed: {renewed_count} renewed, {failed_count} failed")
            
        except Exception as e:
            logger.error(f"Error in subscription renewal process: {str(e)}")
        finally:
            db.close()
    
    async def _cleanup_expired_subscriptions(self):
        """Clean up expired and invalid webhook subscriptions."""
        db = SessionLocal()
        try:
            webhook_service = GoogleCalendarWebhookService(db)
            
            # Clean up expired subscriptions
            cleaned_count = webhook_service.cleanup_expired_subscriptions()
            
            # Also clean up subscriptions with too many errors
            error_threshold = 10
            failed_subscriptions = db.query(GoogleCalendarWebhookSubscription).filter(
                GoogleCalendarWebhookSubscription.error_count >= error_threshold,
                GoogleCalendarWebhookSubscription.is_active == True
            ).all()
            
            disabled_count = 0
            for subscription in failed_subscriptions:
                try:
                    # Try to unsubscribe gracefully
                    user = db.query(User).filter(User.id == subscription.user_id).first()
                    if user:
                        webhook_service.unsubscribe_from_calendar_events(subscription, user)
                    else:
                        subscription.is_active = False
                    
                    disabled_count += 1
                    logger.warning(f"Disabled failed webhook subscription {subscription.id} (errors: {subscription.error_count})")
                    
                except Exception as e:
                    logger.error(f"Error disabling failed subscription {subscription.id}: {str(e)}")
            
            db.commit()
            
            if cleaned_count > 0 or disabled_count > 0:
                logger.info(f"Webhook cleanup completed: {cleaned_count} expired cleaned, {disabled_count} error-prone disabled")
            
        except Exception as e:
            logger.error(f"Error in cleanup process: {str(e)}")
        finally:
            db.close()
    
    async def _perform_health_check(self):
        """Perform health check on webhook infrastructure."""
        db = SessionLocal()
        try:
            # Count active subscriptions
            active_count = db.query(GoogleCalendarWebhookSubscription).filter(
                GoogleCalendarWebhookSubscription.is_active == True
            ).count()
            
            # Count subscriptions expiring soon
            expiring_count = db.query(GoogleCalendarWebhookSubscription).filter(
                GoogleCalendarWebhookSubscription.is_active == True,
                GoogleCalendarWebhookSubscription.expiration_time <= datetime.utcnow() + timedelta(hours=24)
            ).count()
            
            # Count subscriptions with recent errors
            error_threshold_time = datetime.utcnow() - timedelta(hours=24)
            error_count = db.query(GoogleCalendarWebhookSubscription).filter(
                GoogleCalendarWebhookSubscription.is_active == True,
                GoogleCalendarWebhookSubscription.last_error_at >= error_threshold_time
            ).count()
            
            # Count subscriptions that haven't received notifications recently
            stale_threshold_time = datetime.utcnow() - timedelta(hours=48)
            stale_count = db.query(GoogleCalendarWebhookSubscription).filter(
                GoogleCalendarWebhookSubscription.is_active == True,
                GoogleCalendarWebhookSubscription.last_notification_received < stale_threshold_time
            ).count()
            
            health_status = {
                "active_subscriptions": active_count,
                "expiring_soon": expiring_count,
                "recent_errors": error_count,
                "stale_subscriptions": stale_count,
                "health_score": self._calculate_health_score(active_count, expiring_count, error_count, stale_count)
            }
            
            # Log health status
            if health_status["health_score"] < 80:
                logger.warning(f"Webhook health below threshold: {health_status}")
            else:
                logger.debug(f"Webhook health check: {health_status}")
            
            # Alert on critical issues
            if expiring_count > active_count * 0.2:  # More than 20% expiring soon
                logger.error(f"ALERT: High number of expiring webhook subscriptions: {expiring_count}/{active_count}")
            
            if error_count > active_count * 0.1:  # More than 10% with recent errors
                logger.error(f"ALERT: High webhook error rate: {error_count}/{active_count}")
            
        except Exception as e:
            logger.error(f"Error in health check: {str(e)}")
        finally:
            db.close()
    
    def _calculate_health_score(self, active: int, expiring: int, errors: int, stale: int) -> int:
        """Calculate health score based on subscription metrics."""
        if active == 0:
            return 100  # No subscriptions, no problems
        
        score = 100
        
        # Penalize expiring subscriptions
        expiring_ratio = expiring / active
        if expiring_ratio > 0.3:
            score -= 40
        elif expiring_ratio > 0.2:
            score -= 20
        elif expiring_ratio > 0.1:
            score -= 10
        
        # Penalize error-prone subscriptions
        error_ratio = errors / active
        if error_ratio > 0.2:
            score -= 30
        elif error_ratio > 0.1:
            score -= 15
        elif error_ratio > 0.05:
            score -= 5
        
        # Penalize stale subscriptions
        stale_ratio = stale / active
        if stale_ratio > 0.3:
            score -= 20
        elif stale_ratio > 0.2:
            score -= 10
        elif stale_ratio > 0.1:
            score -= 5
        
        return max(0, score)


# Global webhook worker instance
webhook_worker = GoogleCalendarWebhookWorker()


async def start_webhook_worker():
    """Start the global webhook worker."""
    await webhook_worker.start()


async def stop_webhook_worker():
    """Stop the global webhook worker."""
    await webhook_worker.stop()


# Manual webhook management functions for admin use

async def force_renew_all_subscriptions() -> dict:
    """Force renewal of all active subscriptions (admin function)."""
    db = SessionLocal()
    try:
        webhook_service = GoogleCalendarWebhookService(db)
        
        active_subscriptions = webhook_service.get_active_subscriptions()
        
        renewed_count = 0
        failed_count = 0
        
        for subscription in active_subscriptions:
            try:
                if webhook_service.renew_subscription(subscription):
                    renewed_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                logger.error(f"Error force-renewing subscription {subscription.id}: {str(e)}")
                failed_count += 1
        
        return {
            "success": True,
            "renewed": renewed_count,
            "failed": failed_count,
            "total": len(active_subscriptions)
        }
        
    except Exception as e:
        logger.error(f"Error in force renewal: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        db.close()


async def get_webhook_health_report() -> dict:
    """Get comprehensive webhook health report (admin function)."""
    db = SessionLocal()
    try:
        # Get subscription statistics
        total_subscriptions = db.query(GoogleCalendarWebhookSubscription).count()
        active_subscriptions = db.query(GoogleCalendarWebhookSubscription).filter(
            GoogleCalendarWebhookSubscription.is_active == True
        ).count()
        
        # Get users with Google Calendar connected
        users_with_calendar = db.query(User).filter(
            User.google_calendar_credentials.isnot(None)
        ).count()
        
        # Coverage ratio
        coverage_ratio = active_subscriptions / max(users_with_calendar, 1)
        
        # Recent activity
        recent_notifications = db.query(GoogleCalendarWebhookSubscription).filter(
            GoogleCalendarWebhookSubscription.last_notification_received >= datetime.utcnow() - timedelta(hours=24)
        ).count()
        
        return {
            "total_subscriptions": total_subscriptions,
            "active_subscriptions": active_subscriptions,
            "users_with_calendar": users_with_calendar,
            "coverage_ratio": coverage_ratio,
            "recent_notifications": recent_notifications,
            "health_score": webhook_worker._calculate_health_score(
                active_subscriptions, 
                0,  # We don't have expiring count here
                0,  # We don't have error count here
                0   # We don't have stale count here
            )
        }
        
    except Exception as e:
        logger.error(f"Error generating health report: {str(e)}")
        return {
            "error": str(e)
        }
    finally:
        db.close()