"""
Marketing Automation Queue Worker for BookedBarber V2
Handles email campaigns, drip sequences, and marketing automation
"""

import os
import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from celery import Celery
from datetime import datetime, timedelta
import logging
import json
from contextlib import contextmanager
from typing import Dict, Any, List, Optional
from sqlalchemy import and_, or_

from db import SessionLocal
from config import settings
from models import User, Appointment, NotificationQueue
from models.message_queue import MessageQueue, MessageStatus, MessageQueueType, MessagePriority
from services.notification_service import notification_service
from services.sendgrid_marketing_service import sendgrid_marketing_service
from services.analytics_service import analytics_service
from services.sentry_monitoring import celery_monitor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import Sentry monitoring if available
try:
    SENTRY_MONITORING_AVAILABLE = True
except ImportError:
    SENTRY_MONITORING_AVAILABLE = False


@contextmanager
def get_db_session():
    """Context manager for database sessions"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def monitor_task(task_name: str):
    """Decorator for monitoring tasks with Sentry"""
    def decorator(func):
        if SENTRY_MONITORING_AVAILABLE:
            return celery_monitor.monitor_task_execution(task_name)(func)
        return func
    return decorator


# Import from main celery app
from celery_app import celery_app


@celery_app.task(bind=True, max_retries=3)
@monitor_task("process_email_campaign")
def process_email_campaign(self, campaign_id: int, batch_size: int = 100):
    """
    Process scheduled email campaigns in batches
    """
    try:
        with get_db_session() as db:
            # Get campaign details
            campaign = _get_campaign_details(db, campaign_id)
            if not campaign:
                logger.error(f"Campaign not found: {campaign_id}")
                return {"status": "error", "message": "Campaign not found"}
            
            # Check if campaign is ready to send
            if not _is_campaign_ready(campaign):
                logger.info(f"Campaign {campaign_id} not ready for sending")
                return {"status": "postponed", "campaign_id": campaign_id}
            
            # Get target audience
            recipients = _get_campaign_recipients(db, campaign)
            if not recipients:
                logger.warning(f"No recipients found for campaign {campaign_id}")
                return {"status": "no_recipients", "campaign_id": campaign_id}
            
            # Process in batches
            total_sent = 0
            total_failed = 0
            
            for i in range(0, len(recipients), batch_size):
                batch = recipients[i:i + batch_size]
                
                try:
                    batch_result = _send_campaign_batch(db, campaign, batch)
                    total_sent += batch_result.get('sent', 0)
                    total_failed += batch_result.get('failed', 0)
                    
                    # Brief pause between batches to avoid rate limiting
                    if i + batch_size < len(recipients):
                        import time
                        time.sleep(1)
                        
                except Exception as e:
                    logger.error(f"Error processing batch {i//batch_size + 1}: {e}")
                    total_failed += len(batch)
            
            # Update campaign status
            _update_campaign_status(db, campaign_id, total_sent, total_failed)
            
            # Track analytics
            analytics_service.track_campaign_sent(
                db=db,
                campaign_id=campaign_id,
                recipients_count=len(recipients),
                sent_count=total_sent,
                failed_count=total_failed
            )
            
            logger.info(f"Campaign {campaign_id} processed: {total_sent} sent, {total_failed} failed")
            return {
                "status": "completed",
                "campaign_id": campaign_id,
                "total_recipients": len(recipients),
                "sent": total_sent,
                "failed": total_failed
            }
            
    except Exception as e:
        logger.error(f"Error processing email campaign {campaign_id}: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 300 * (2 ** self.request.retries)  # 5, 10, 20 minutes
            raise self.retry(countdown=countdown, exc=e)
        else:
            # Mark campaign as failed
            with get_db_session() as db:
                _mark_campaign_failed(db, campaign_id, str(e))
            raise


@celery_app.task(bind=True, max_retries=2)
@monitor_task("send_drip_email")
def send_drip_email(self, user_id: int, sequence_id: int, email_step: int):
    """
    Send individual drip sequence email
    """
    try:
        with get_db_session() as db:
            # Get user
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                logger.error(f"User not found: {user_id}")
                return {"status": "error", "message": "User not found"}
            
            # Check if user is still eligible for drip sequence
            if not _is_user_eligible_for_drip(db, user, sequence_id):
                logger.info(f"User {user_id} no longer eligible for drip sequence {sequence_id}")
                return {"status": "skipped", "reason": "user_not_eligible"}
            
            # Get drip sequence email content
            email_content = _get_drip_email_content(db, sequence_id, email_step)
            if not email_content:
                logger.error(f"Drip email content not found: sequence {sequence_id}, step {email_step}")
                return {"status": "error", "message": "Email content not found"}
            
            # Personalize email content
            personalized_content = _personalize_drip_email(db, user, email_content)
            
            # Queue the email
            notifications = notification_service.queue_notification(
                db=db,
                user=user,
                template_name="drip_sequence_email",
                context=personalized_content
            )
            
            # Schedule next email in sequence if applicable
            _schedule_next_drip_email(db, user_id, sequence_id, email_step + 1)
            
            # Track drip sequence engagement
            analytics_service.track_drip_email_sent(
                db=db,
                user_id=user_id,
                sequence_id=sequence_id,
                email_step=email_step
            )
            
            logger.info(f"Drip email sent: user {user_id}, sequence {sequence_id}, step {email_step}")
            return {
                "status": "sent",
                "user_id": user_id,
                "sequence_id": sequence_id,
                "email_step": email_step,
                "notifications_queued": len(notifications)
            }
            
    except Exception as e:
        logger.error(f"Error sending drip email: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 600 * (2 ** self.request.retries)  # 10, 20 minutes
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=2)
@monitor_task("process_segment_update")
def process_segment_update(self, segment_id: int, update_criteria: Dict[str, Any]):
    """
    Update user segments based on behavior and criteria
    """
    try:
        with get_db_session() as db:
            # Get current segment members
            current_members = _get_segment_members(db, segment_id)
            
            # Calculate new segment members based on criteria
            new_members = _calculate_segment_members(db, update_criteria)
            
            # Find additions and removals
            current_member_ids = set(user.id for user in current_members)
            new_member_ids = set(user.id for user in new_members)
            
            added_ids = new_member_ids - current_member_ids
            removed_ids = current_member_ids - new_member_ids
            
            # Update segment membership
            if added_ids or removed_ids:
                _update_segment_membership(db, segment_id, added_ids, removed_ids)
                
                # Trigger welcome sequences for new members
                if added_ids:
                    _trigger_segment_welcome_sequence(db, segment_id, list(added_ids))
                
                # Track segment changes
                analytics_service.track_segment_update(
                    db=db,
                    segment_id=segment_id,
                    added_count=len(added_ids),
                    removed_count=len(removed_ids),
                    total_members=len(new_member_ids)
                )
            
            logger.info(f"Segment {segment_id} updated: +{len(added_ids)}, -{len(removed_ids)} members")
            return {
                "status": "updated",
                "segment_id": segment_id,
                "added_members": len(added_ids),
                "removed_members": len(removed_ids),
                "total_members": len(new_member_ids)
            }
            
    except Exception as e:
        logger.error(f"Error updating segment {segment_id}: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 300 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=2)
@monitor_task("track_email_engagement")
def track_email_engagement(self, tracking_data: Dict[str, Any]):
    """
    Track email engagement metrics (opens, clicks, unsubscribes)
    """
    try:
        with get_db_session() as db:
            event_type = tracking_data.get('event_type')
            user_email = tracking_data.get('email')
            message_id = tracking_data.get('message_id')
            timestamp = tracking_data.get('timestamp', datetime.utcnow())
            
            # Find user by email
            user = db.query(User).filter(User.email == user_email).first()
            if not user:
                logger.warning(f"User not found for email engagement tracking: {user_email}")
                return {"status": "user_not_found", "email": user_email}
            
            # Record engagement event
            engagement_record = _record_email_engagement(
                db, user.id, event_type, message_id, timestamp, tracking_data
            )
            
            # Update user engagement score
            _update_user_engagement_score(db, user.id, event_type)
            
            # Handle specific event types
            if event_type == 'unsubscribe':
                _handle_unsubscribe(db, user.id, tracking_data)
            elif event_type == 'click':
                _handle_email_click(db, user.id, tracking_data)
            elif event_type == 'open':
                _handle_email_open(db, user.id, tracking_data)
            
            # Track analytics
            analytics_service.track_email_engagement_event(
                db=db,
                user_id=user.id,
                event_type=event_type,
                message_id=message_id,
                metadata=tracking_data
            )
            
            logger.info(f"Email engagement tracked: {event_type} for user {user.id}")
            return {
                "status": "tracked",
                "user_id": user.id,
                "event_type": event_type,
                "message_id": message_id
            }
            
    except Exception as e:
        logger.error(f"Error tracking email engagement: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 120 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=1)
@monitor_task("generate_campaign_report")
def generate_campaign_report(self, campaign_id: int, report_type: str = "detailed"):
    """
    Generate campaign performance reports
    """
    try:
        with get_db_session() as db:
            # Get campaign performance data
            campaign_stats = analytics_service.get_campaign_statistics(db, campaign_id)
            
            if report_type == "summary":
                report_data = _generate_summary_report(db, campaign_id, campaign_stats)
            elif report_type == "detailed":
                report_data = _generate_detailed_report(db, campaign_id, campaign_stats)
            elif report_type == "comparison":
                report_data = _generate_comparison_report(db, campaign_id, campaign_stats)
            else:
                raise ValueError(f"Unknown report type: {report_type}")
            
            # Store report data
            report_id = _store_campaign_report(db, campaign_id, report_type, report_data)
            
            # Notify stakeholders if configured
            if settings.email_campaign_reports_enabled:
                _notify_campaign_stakeholders(db, campaign_id, report_id, report_data)
            
            logger.info(f"Campaign report generated: {campaign_id} - {report_type}")
            return {
                "status": "generated",
                "campaign_id": campaign_id,
                "report_id": report_id,
                "report_type": report_type
            }
            
    except Exception as e:
        logger.error(f"Error generating campaign report: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 600
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


# Helper functions
def _get_campaign_details(db, campaign_id: int) -> Optional[Dict[str, Any]]:
    """Get campaign configuration and details"""
    # This would query your campaign management system
    # Placeholder implementation
    return {
        "id": campaign_id,
        "name": f"Campaign {campaign_id}",
        "status": "scheduled",
        "scheduled_time": datetime.utcnow(),
        "template_id": 1,
        "target_segment": "all_users"
    }


def _is_campaign_ready(campaign: Dict[str, Any]) -> bool:
    """Check if campaign is ready to send"""
    scheduled_time = campaign.get('scheduled_time')
    if scheduled_time and scheduled_time > datetime.utcnow():
        return False
    return campaign.get('status') == 'scheduled'


def _get_campaign_recipients(db, campaign: Dict[str, Any]) -> List[User]:
    """Get list of users who should receive the campaign"""
    target_segment = campaign.get('target_segment', 'all_users')
    
    query = db.query(User).filter(
        User.email_enabled == True,
        User.marketing_consent == True
    )
    
    if target_segment == 'recent_customers':
        # Users who made appointments in last 30 days
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        query = query.join(Appointment).filter(
            Appointment.created_at >= cutoff_date
        )
    elif target_segment == 'inactive_users':
        # Users who haven't booked in 60+ days
        cutoff_date = datetime.utcnow() - timedelta(days=60)
        query = query.outerjoin(Appointment).group_by(User.id).having(
            or_(
                db.func.max(Appointment.created_at) < cutoff_date,
                db.func.max(Appointment.created_at).is_(None)
            )
        )
    
    return query.all()


def _send_campaign_batch(db, campaign: Dict[str, Any], recipients: List[User]) -> Dict[str, int]:
    """Send campaign to a batch of recipients"""
    sent = 0
    failed = 0
    
    for user in recipients:
        try:
            # Queue the campaign email
            notification_service.queue_notification(
                db=db,
                user=user,
                template_name="marketing_campaign",
                context={
                    "campaign_id": campaign['id'],
                    "campaign_name": campaign['name'],
                    "user_name": user.name,
                    "unsubscribe_url": f"{settings.frontend_url}/unsubscribe/{user.unsubscribe_token}"
                }
            )
            sent += 1
        except Exception as e:
            logger.error(f"Failed to queue campaign email for user {user.id}: {e}")
            failed += 1
    
    return {"sent": sent, "failed": failed}


def _update_campaign_status(db, campaign_id: int, sent_count: int, failed_count: int):
    """Update campaign status after processing"""
    # Placeholder - would update campaign in your system
    logger.info(f"Campaign {campaign_id} completed: {sent_count} sent, {failed_count} failed")


def _mark_campaign_failed(db, campaign_id: int, error_message: str):
    """Mark campaign as failed"""
    # Placeholder - would update campaign status in your system
    logger.error(f"Campaign {campaign_id} marked as failed: {error_message}")


# Health check task
@celery_app.task
def marketing_worker_health_check():
    """Health check for marketing worker"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "worker_type": "marketing_worker",
        "sendgrid_configured": bool(settings.sendgrid_api_key),
        "worker_id": os.getpid()
    }