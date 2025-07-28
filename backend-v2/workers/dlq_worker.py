"""
Dead Letter Queue Worker for BookedBarber V2
Handles failed messages, retry logic, and permanent failure archiving
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
import traceback
from contextlib import contextmanager
from typing import Dict, Any, List, Optional
from sqlalchemy import and_, or_, func

from db import SessionLocal
from config import settings
from models.message_queue import (
    MessageQueue, DeadLetterQueue, MessageStatus, MessageQueueType, 
    MessagePriority, QueueMetrics
)
from services.notification_service import notification_service
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


@celery_app.task(bind=True, max_retries=1)
@monitor_task("process_failed_task")
def process_failed_task(self, batch_size: int = 50):
    """
    Process failed messages and determine retry eligibility
    """
    try:
        with get_db_session() as db:
            # Get failed messages that haven't been processed for DLQ
            failed_messages = db.query(MessageQueue).filter(
                and_(
                    MessageQueue.status == MessageStatus.FAILED,
                    ~MessageQueue.dead_letter_record.has()  # No DLQ record yet
                )
            ).limit(batch_size).all()
            
            if not failed_messages:
                logger.info("No failed messages to process")
                return {"status": "no_messages", "processed": 0}
            
            processed = 0
            sent_to_dlq = 0
            marked_for_retry = 0
            
            for message in failed_messages:
                try:
                    decision = _analyze_failure(db, message)
                    
                    if decision['action'] == 'send_to_dlq':
                        _create_dlq_entry(db, message, decision['reason'])
                        sent_to_dlq += 1
                    elif decision['action'] == 'mark_for_retry':
                        _mark_for_retry(db, message, decision.get('retry_delay', 300))
                        marked_for_retry += 1
                    elif decision['action'] == 'archive':
                        _archive_message(db, message, decision['reason'])
                    
                    processed += 1
                    
                except Exception as e:
                    logger.error(f"Error processing failed message {message.id}: {e}")
                    continue
            
            db.commit()
            
            logger.info(f"Processed {processed} failed messages: {sent_to_dlq} to DLQ, {marked_for_retry} for retry")
            return {
                "status": "completed",
                "processed": processed,
                "sent_to_dlq": sent_to_dlq,
                "marked_for_retry": marked_for_retry
            }
            
    except Exception as e:
        logger.error(f"Error processing failed tasks: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 600  # 10 minutes
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=2)
@monitor_task("retry_failed_message")
def retry_failed_message(self, batch_size: int = 25):
    """
    Retry messages marked for retry
    """
    try:
        with get_db_session() as db:
            # Get messages marked for retry that are due
            retry_messages = db.query(MessageQueue).filter(
                and_(
                    MessageQueue.status == MessageStatus.RETRYING,
                    MessageQueue.scheduled_for <= datetime.utcnow(),
                    MessageQueue.can_retry()
                )
            ).limit(batch_size).all()
            
            if not retry_messages:
                logger.info("No messages ready for retry")
                return {"status": "no_messages", "retried": 0}
            
            retried = 0
            failed_permanently = 0
            
            for message in retry_messages:
                try:
                    # Attempt to requeue the original task
                    success = _requeue_message(db, message)
                    
                    if success:
                        message.status = MessageStatus.PENDING
                        message.attempts += 1
                        retried += 1
                        logger.info(f"Message {message.id} requeued successfully")
                    else:
                        # Check if max retries reached
                        if message.attempts >= message.max_retries:
                            _create_dlq_entry(db, message, "Max retries exceeded during retry attempt")
                            failed_permanently += 1
                        else:
                            # Mark for another retry with longer delay
                            message.mark_retrying()
                            delay = min(message.retry_delay * (2 ** message.attempts), 3600)
                            message.scheduled_for = datetime.utcnow() + timedelta(seconds=delay)
                    
                except Exception as e:
                    logger.error(f"Error retrying message {message.id}: {e}")
                    
                    # If we can't even retry, send to DLQ
                    if message.attempts >= message.max_retries:
                        _create_dlq_entry(db, message, f"Retry failed: {str(e)}")
                        failed_permanently += 1
                    
                    continue
            
            db.commit()
            
            logger.info(f"Retry batch completed: {retried} retried, {failed_permanently} sent to DLQ")
            return {
                "status": "completed",
                "retried": retried,
                "failed_permanently": failed_permanently
            }
            
    except Exception as e:
        logger.error(f"Error retrying failed messages: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 300 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=1)
@monitor_task("archive_permanently_failed")
def archive_permanently_failed(self, days_to_keep: int = 30):
    """
    Archive permanently failed messages older than specified days
    """
    try:
        with get_db_session() as db:
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
            
            # Find DLQ entries that are resolved or very old
            dlq_entries = db.query(DeadLetterQueue).filter(
                or_(
                    and_(
                        DeadLetterQueue.resolved_at.isnot(None),
                        DeadLetterQueue.resolved_at < cutoff_date
                    ),
                    and_(
                        DeadLetterQueue.created_at < cutoff_date,
                        DeadLetterQueue.manual_review_required == False,
                        DeadLetterQueue.can_be_retried == False
                    )
                )
            ).all()
            
            archived_count = 0
            
            for dlq_entry in dlq_entries:
                try:
                    # Archive the DLQ entry
                    _archive_dlq_entry(db, dlq_entry)
                    archived_count += 1
                    
                except Exception as e:
                    logger.error(f"Error archiving DLQ entry {dlq_entry.id}: {e}")
                    continue
            
            # Also clean up very old message queue entries that are completed
            old_messages = db.query(MessageQueue).filter(
                and_(
                    MessageQueue.status.in_([MessageStatus.COMPLETED, MessageStatus.CANCELLED]),
                    MessageQueue.completed_at < cutoff_date
                )
            ).all()
            
            cleaned_messages = 0
            for message in old_messages:
                try:
                    db.delete(message)
                    cleaned_messages += 1
                except Exception as e:
                    logger.error(f"Error deleting old message {message.id}: {e}")
                    continue
            
            db.commit()
            
            logger.info(f"Archive completed: {archived_count} DLQ entries, {cleaned_messages} old messages")
            return {
                "status": "completed",
                "archived_dlq_entries": archived_count,
                "cleaned_messages": cleaned_messages
            }
            
    except Exception as e:
        logger.error(f"Error archiving permanently failed messages: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 1800  # 30 minutes
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=1)
@monitor_task("manual_dlq_retry")
def manual_dlq_retry(self, dlq_entry_id: int, retry_options: Dict[str, Any] = None):
    """
    Manually retry a dead letter queue entry
    """
    try:
        with get_db_session() as db:
            dlq_entry = db.query(DeadLetterQueue).filter(
                DeadLetterQueue.id == dlq_entry_id
            ).first()
            
            if not dlq_entry:
                logger.error(f"DLQ entry not found: {dlq_entry_id}")
                return {"status": "error", "message": "DLQ entry not found"}
            
            if not dlq_entry.can_be_retried:
                logger.error(f"DLQ entry {dlq_entry_id} cannot be retried")
                return {"status": "error", "message": "Entry cannot be retried"}
            
            # Apply retry options if provided
            task_args = dlq_entry.original_task_args
            task_kwargs = dlq_entry.original_task_kwargs
            
            if retry_options:
                # Merge retry options into kwargs
                if isinstance(task_kwargs, dict):
                    task_kwargs.update(retry_options)
                else:
                    task_kwargs = retry_options
            
            # Create new message queue entry
            retry_message = MessageQueue(
                queue_type=dlq_entry.original_queue_type,
                priority=MessagePriority.HIGH,  # Give manual retries high priority
                task_name=dlq_entry.original_task_name,
                task_args=task_args,
                task_kwargs=task_kwargs,
                source="dlq_manual_retry",
                max_retries=3,  # Fresh retry count
                correlation_id=f"dlq_retry_{dlq_entry_id}"
            )
            
            db.add(retry_message)
            
            # Update DLQ entry
            dlq_entry.resolution_action = "manual_retry"
            dlq_entry.resolved_at = datetime.utcnow()
            dlq_entry.resolved_by = retry_options.get('resolved_by', 'system')
            dlq_entry.resolution_notes = f"Manually retried as message {retry_message.id}"
            dlq_entry.dlq_status = MessageStatus.COMPLETED
            
            db.commit()
            
            logger.info(f"DLQ entry {dlq_entry_id} manually retried as message {retry_message.id}")
            return {
                "status": "retried",
                "dlq_entry_id": dlq_entry_id,
                "new_message_id": retry_message.id
            }
            
    except Exception as e:
        logger.error(f"Error manually retrying DLQ entry {dlq_entry_id}: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 300
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


# Helper functions
def _analyze_failure(db, message: MessageQueue) -> Dict[str, Any]:
    """Analyze why a message failed and determine next action"""
    
    # Check if max retries exceeded
    if message.attempts >= message.max_retries:
        return {
            "action": "send_to_dlq",
            "reason": "Max retries exceeded"
        }
    
    # Check if message has expired
    if message.is_expired():
        return {
            "action": "archive",
            "reason": "Message expired"
        }
    
    # Analyze error patterns
    error_message = message.error_message or ""
    
    # Permanent errors (don't retry)
    permanent_errors = [
        "ValidationError",
        "ValueError",
        "TypeError",
        "PermissionError",
        "User not found",
        "Invalid configuration"
    ]
    
    for permanent_error in permanent_errors:
        if permanent_error in error_message:
            return {
                "action": "send_to_dlq",
                "reason": f"Permanent error detected: {permanent_error}"
            }
    
    # Transient errors (retry with backoff)
    transient_errors = [
        "ConnectionError",
        "TimeoutError",
        "TemporaryFailure",
        "ServiceUnavailable",
        "RateLimitExceeded"
    ]
    
    for transient_error in transient_errors:
        if transient_error in error_message:
            retry_delay = min(300 * (2 ** message.attempts), 3600)  # Exponential backoff, max 1 hour
            return {
                "action": "mark_for_retry",
                "reason": f"Transient error detected: {transient_error}",
                "retry_delay": retry_delay
            }
    
    # Default: retry if under max attempts
    if message.attempts < message.max_retries:
        return {
            "action": "mark_for_retry",
            "reason": "Generic failure, eligible for retry",
            "retry_delay": 600  # 10 minutes default
        }
    else:
        return {
            "action": "send_to_dlq",
            "reason": "Max retries reached"
        }


def _create_dlq_entry(db, message: MessageQueue, failure_reason: str):
    """Create a dead letter queue entry for a failed message"""
    
    dlq_entry = DeadLetterQueue(
        original_message_id=message.id,
        original_task_name=message.task_name,
        original_task_args=message.task_args,
        original_task_kwargs=message.task_kwargs,
        original_queue_type=message.queue_type,
        original_priority=message.priority,
        failure_reason=failure_reason,
        final_error_message=message.error_message,
        final_error_traceback=message.error_traceback,
        total_attempts=message.attempts,
        manual_review_required=_requires_manual_review(message),
        can_be_retried=_can_be_retried_safely(message)
    )
    
    db.add(dlq_entry)
    message.status = MessageStatus.DEAD_LETTER
    
    logger.info(f"Message {message.id} sent to dead letter queue: {failure_reason}")


def _mark_for_retry(db, message: MessageQueue, retry_delay: int):
    """Mark a message for retry"""
    message.mark_retrying()
    message.scheduled_for = datetime.utcnow() + timedelta(seconds=retry_delay)
    logger.info(f"Message {message.id} marked for retry in {retry_delay} seconds")


def _archive_message(db, message: MessageQueue, reason: str):
    """Archive a message that doesn't need DLQ processing"""
    message.status = MessageStatus.CANCELLED
    message.completed_at = datetime.utcnow()
    message.error_message = f"Archived: {reason}"
    logger.info(f"Message {message.id} archived: {reason}")


def _requeue_message(db, message: MessageQueue) -> bool:
    """Attempt to requeue a message for processing"""
    try:
        # Import celery app to send task
        from celery_app import celery_app
        
        # Send the task to appropriate queue
        task_name = message.task_name
        args = message.task_args or []
        kwargs = message.task_kwargs or {}
        
        # Determine queue based on task name
        queue_name = _get_queue_for_task(task_name)
        
        celery_app.send_task(
            task_name,
            args=args,
            kwargs=kwargs,
            queue=queue_name,
            retry=True
        )
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to requeue message {message.id}: {e}")
        return False


def _requires_manual_review(message: MessageQueue) -> bool:
    """Determine if a failed message requires manual review"""
    # Payment-related failures always need review
    if message.queue_type == MessageQueueType.PAYMENT_WEBHOOK:
        return True
    
    # Critical priority messages need review
    if message.priority == MessagePriority.CRITICAL:
        return True
    
    # Multiple failures might indicate a systemic issue
    if message.attempts >= 3:
        return True
    
    return False


def _can_be_retried_safely(message: MessageQueue) -> bool:
    """Determine if a message can be safely retried"""
    # Check for idempotency
    if not message.idempotency_key:
        return False
    
    # Some message types are not safe to retry
    unsafe_tasks = [
        "process_payment",
        "send_money_transfer",
        "create_invoice"
    ]
    
    if any(unsafe_task in message.task_name for unsafe_task in unsafe_tasks):
        return False
    
    return True


def _get_queue_for_task(task_name: str) -> str:
    """Get appropriate queue name for a task"""
    queue_mapping = {
        "payment": "payment_processing",
        "notification": "notifications",
        "marketing": "marketing_automation",
        "analytics": "analytics_processing",
        "file": "file_processing",
        "calendar": "calendar_sync"
    }
    
    for keyword, queue in queue_mapping.items():
        if keyword in task_name.lower():
            return queue
    
    return "default"


def _archive_dlq_entry(db, dlq_entry: DeadLetterQueue):
    """Archive a DLQ entry"""
    # In a real implementation, you might move this to cold storage
    # For now, just mark it as archived
    dlq_entry.resolution_action = "archived"
    dlq_entry.resolved_at = datetime.utcnow()
    dlq_entry.resolved_by = "system_archiver"
    dlq_entry.dlq_status = MessageStatus.COMPLETED


# Health check task
@celery_app.task
def dlq_worker_health_check():
    """Health check for DLQ worker"""
    with get_db_session() as db:
        # Get DLQ statistics
        dlq_count = db.query(DeadLetterQueue).filter(
            DeadLetterQueue.dlq_status == MessageStatus.PENDING
        ).count()
        
        retry_count = db.query(MessageQueue).filter(
            MessageQueue.status == MessageStatus.RETRYING
        ).count()
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "worker_type": "dlq_worker",
        "pending_dlq_entries": dlq_count,
        "retry_queue_size": retry_count,
        "worker_id": os.getpid()
    }