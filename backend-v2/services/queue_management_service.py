"""
Queue Management Service for BookedBarber V2
Provides high-level queue management and producer functions
"""

import logging
import json
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func

from models.message_queue import (
    MessageQueue, DeadLetterQueue, MessageStatus, MessageQueueType, 
    MessagePriority, QueueMetrics, MessageTemplate
)
from config import settings

logger = logging.getLogger(__name__)


class QueueManagementService:
    """Service for managing message queues and publishing messages"""
    
    def __init__(self):
        self.default_expiry_hours = 24
        self.max_retry_attempts = 5
    
    def publish_message(
        self,
        db: Session,
        queue_type: MessageQueueType,
        task_name: str,
        task_args: List[Any] = None,
        task_kwargs: Dict[str, Any] = None,
        priority: MessagePriority = MessagePriority.NORMAL,
        scheduled_for: datetime = None,
        expires_at: datetime = None,
        max_retries: int = None,
        retry_delay: int = 60,
        source: str = None,
        correlation_id: str = None,
        user_id: int = None,
        appointment_id: int = None,
        idempotency_key: str = None
    ) -> MessageQueue:
        """
        Publish a message to a queue with comprehensive options
        """
        
        # Set defaults
        if scheduled_for is None:
            scheduled_for = datetime.utcnow()
        
        if expires_at is None:
            expires_at = datetime.utcnow() + timedelta(hours=self.default_expiry_hours)
        
        if max_retries is None:
            max_retries = self._get_default_max_retries(queue_type)
        
        # Generate content hash for deduplication
        content_hash = self._generate_content_hash(task_name, task_args, task_kwargs)
        
        # Check for duplicate messages if idempotency key provided
        if idempotency_key:
            existing_message = db.query(MessageQueue).filter(
                and_(
                    MessageQueue.idempotency_key == idempotency_key,
                    MessageQueue.status.in_([
                        MessageStatus.PENDING, 
                        MessageStatus.PROCESSING,
                        MessageStatus.COMPLETED
                    ])
                )
            ).first()
            
            if existing_message:
                logger.info(f"Duplicate message detected, returning existing: {existing_message.id}")
                return existing_message
        
        # Create message
        message = MessageQueue(
            queue_type=queue_type,
            priority=priority,
            task_name=task_name,
            task_args=task_args or [],
            task_kwargs=task_kwargs or {},
            source=source,
            correlation_id=correlation_id,
            user_id=user_id,
            appointment_id=appointment_id,
            scheduled_for=scheduled_for,
            expires_at=expires_at,
            max_retries=max_retries,
            retry_delay=retry_delay,
            idempotency_key=idempotency_key,
            content_hash=content_hash
        )
        
        db.add(message)
        db.commit()
        db.refresh(message)
        
        logger.info(f"Message published: {message.id} - {queue_type.value} - {task_name}")
        return message
    
    def publish_payment_webhook(
        self,
        db: Session,
        webhook_payload: Dict[str, Any],
        signature: str,
        endpoint_secret: str,
        correlation_id: str = None
    ) -> MessageQueue:
        """Publish a Stripe webhook for processing"""
        
        return self.publish_message(
            db=db,
            queue_type=MessageQueueType.PAYMENT_WEBHOOK,
            task_name="workers.payment_worker.process_stripe_webhook",
            task_args=[webhook_payload, signature, endpoint_secret],
            priority=MessagePriority.CRITICAL,
            max_retries=5,
            retry_delay=30,
            source="stripe_webhook",
            correlation_id=correlation_id,
            idempotency_key=webhook_payload.get('id')  # Use Stripe event ID
        )
    
    def publish_email_campaign(
        self,
        db: Session,
        campaign_id: int,
        batch_size: int = 100,
        scheduled_for: datetime = None,
        correlation_id: str = None
    ) -> MessageQueue:
        """Publish an email campaign for processing"""
        
        return self.publish_message(
            db=db,
            queue_type=MessageQueueType.EMAIL_CAMPAIGN,
            task_name="workers.marketing_worker.process_email_campaign",
            task_args=[campaign_id, batch_size],
            priority=MessagePriority.NORMAL,
            scheduled_for=scheduled_for,
            max_retries=3,
            retry_delay=300,  # 5 minutes
            source="marketing_automation",
            correlation_id=correlation_id,
            idempotency_key=f"campaign_{campaign_id}_{scheduled_for.isoformat() if scheduled_for else 'immediate'}"
        )
    
    def publish_notification(
        self,
        db: Session,
        user_id: int,
        template_name: str,
        context: Dict[str, Any],
        priority: MessagePriority = MessagePriority.NORMAL,
        appointment_id: int = None,
        scheduled_for: datetime = None
    ) -> MessageQueue:
        """Publish a notification for processing"""
        
        task_name = "workers.notification_worker.send_immediate_notification"
        if priority == MessagePriority.CRITICAL:
            task_name = "workers.notification_worker.send_immediate_notification"
        
        return self.publish_message(
            db=db,
            queue_type=MessageQueueType.NOTIFICATION,
            task_name=task_name,
            task_args=[user_id, template_name, context],
            priority=priority,
            scheduled_for=scheduled_for,
            max_retries=3,
            retry_delay=60,
            source="notification_system",
            user_id=user_id,
            appointment_id=appointment_id,
            idempotency_key=f"notification_{user_id}_{template_name}_{hashlib.md5(json.dumps(context, sort_keys=True).encode()).hexdigest()[:8]}"
        )
    
    def publish_analytics_processing(
        self,
        db: Session,
        analytics_type: str,
        data: Dict[str, Any],
        priority: MessagePriority = MessagePriority.NORMAL
    ) -> MessageQueue:
        """Publish analytics data for processing"""
        
        task_mapping = {
            "booking_analytics": "workers.analytics_worker.process_booking_analytics",
            "revenue_metrics": "workers.analytics_worker.update_revenue_metrics",
            "user_behavior": "workers.analytics_worker.process_user_behavior",
            "daily_reports": "workers.analytics_worker.generate_daily_reports"
        }
        
        task_name = task_mapping.get(analytics_type, "workers.analytics_worker.process_booking_analytics")
        
        return self.publish_message(
            db=db,
            queue_type=MessageQueueType.ANALYTICS,
            task_name=task_name,
            task_kwargs=data,
            priority=priority,
            max_retries=2,
            retry_delay=300,
            source="analytics_system",
            correlation_id=data.get('correlation_id')
        )
    
    def publish_file_processing(
        self,
        db: Session,
        file_path: str,
        processing_type: str,
        user_id: int = None,
        metadata: Dict[str, Any] = None
    ) -> MessageQueue:
        """Publish file processing task"""
        
        task_mapping = {
            "image_upload": "workers.file_worker.process_image_upload",
            "resize_optimize": "workers.file_worker.resize_and_optimize_image",
            "generate_thumbnails": "workers.file_worker.generate_thumbnails",
            "malware_scan": "workers.file_worker.scan_for_malware"
        }
        
        task_name = task_mapping.get(processing_type, "workers.file_worker.process_image_upload")
        
        return self.publish_message(
            db=db,
            queue_type=MessageQueueType.FILE_PROCESSING,
            task_name=task_name,
            task_args=[file_path],
            task_kwargs=metadata or {},
            priority=MessagePriority.NORMAL,
            max_retries=2,
            retry_delay=120,
            source="file_system",
            user_id=user_id,
            idempotency_key=f"file_{processing_type}_{hashlib.md5(file_path.encode()).hexdigest()[:8]}"
        )
    
    def publish_calendar_sync(
        self,
        db: Session,
        sync_type: str,
        user_id: int,
        appointment_id: int = None,
        calendar_data: Dict[str, Any] = None
    ) -> MessageQueue:
        """Publish calendar synchronization task"""
        
        task_mapping = {
            "sync_google": "workers.calendar_worker.sync_google_calendar",
            "create_event": "workers.calendar_worker.create_calendar_event",
            "update_event": "workers.calendar_worker.update_calendar_event",
            "delete_event": "workers.calendar_worker.delete_calendar_event",
            "webhook": "workers.calendar_worker.handle_calendar_webhook"
        }
        
        task_name = task_mapping.get(sync_type, "workers.calendar_worker.sync_google_calendar")
        
        return self.publish_message(
            db=db,
            queue_type=MessageQueueType.CALENDAR_SYNC,
            task_name=task_name,
            task_args=[user_id],
            task_kwargs=calendar_data or {},
            priority=MessagePriority.NORMAL,
            max_retries=3,
            retry_delay=180,
            source="calendar_system",
            user_id=user_id,
            appointment_id=appointment_id
        )
    
    def get_queue_status(self, db: Session, queue_type: MessageQueueType = None) -> Dict[str, Any]:
        """Get current queue status and metrics"""
        
        if queue_type:
            queue_types = [queue_type]
        else:
            queue_types = list(MessageQueueType)
        
        status = {
            "timestamp": datetime.utcnow().isoformat(),
            "queues": {}
        }
        
        for qt in queue_types:
            # Get counts by status
            pending = db.query(MessageQueue).filter(
                and_(
                    MessageQueue.queue_type == qt,
                    MessageQueue.status == MessageStatus.PENDING,
                    MessageQueue.scheduled_for <= datetime.utcnow()
                )
            ).count()
            
            processing = db.query(MessageQueue).filter(
                and_(
                    MessageQueue.queue_type == qt,
                    MessageQueue.status == MessageStatus.PROCESSING
                )
            ).count()
            
            failed = db.query(MessageQueue).filter(
                and_(
                    MessageQueue.queue_type == qt,
                    MessageQueue.status == MessageStatus.FAILED
                )
            ).count()
            
            dead_letter = db.query(MessageQueue).filter(
                and_(
                    MessageQueue.queue_type == qt,
                    MessageQueue.status == MessageStatus.DEAD_LETTER
                )
            ).count()
            
            # Get oldest pending message
            oldest_pending = db.query(MessageQueue).filter(
                and_(
                    MessageQueue.queue_type == qt,
                    MessageQueue.status == MessageStatus.PENDING
                )
            ).order_by(MessageQueue.created_at).first()
            
            oldest_age = None
            if oldest_pending:
                age_delta = datetime.utcnow() - oldest_pending.created_at
                oldest_age = int(age_delta.total_seconds())
            
            status["queues"][qt.value] = {
                "pending": pending,
                "processing": processing,
                "failed": failed,
                "dead_letter": dead_letter,
                "oldest_pending_age_seconds": oldest_age
            }
        
        return status
    
    def get_message_details(self, db: Session, message_id: int) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific message"""
        
        message = db.query(MessageQueue).filter(MessageQueue.id == message_id).first()
        if not message:
            return None
        
        details = {
            "id": message.id,
            "message_id": message.message_id,
            "queue_type": message.queue_type.value,
            "priority": message.priority.value,
            "status": message.status.value,
            "task_name": message.task_name,
            "task_args": message.task_args,
            "task_kwargs": message.task_kwargs,
            "source": message.source,
            "correlation_id": message.correlation_id,
            "user_id": message.user_id,
            "appointment_id": message.appointment_id,
            "scheduled_for": message.scheduled_for.isoformat() if message.scheduled_for else None,
            "expires_at": message.expires_at.isoformat() if message.expires_at else None,
            "attempts": message.attempts,
            "max_retries": message.max_retries,
            "retry_delay": message.retry_delay,
            "started_at": message.started_at.isoformat() if message.started_at else None,
            "completed_at": message.completed_at.isoformat() if message.completed_at else None,
            "worker_id": message.worker_id,
            "error_message": message.error_message,
            "idempotency_key": message.idempotency_key,
            "created_at": message.created_at.isoformat(),
            "updated_at": message.updated_at.isoformat()
        }
        
        # Add DLQ information if applicable
        if message.dead_letter_record:
            dlq = message.dead_letter_record
            details["dead_letter_info"] = {
                "id": dlq.id,
                "failure_reason": dlq.failure_reason,
                "manual_review_required": dlq.manual_review_required,
                "can_be_retried": dlq.can_be_retried,
                "resolution_action": dlq.resolution_action,
                "resolved_at": dlq.resolved_at.isoformat() if dlq.resolved_at else None,
                "resolved_by": dlq.resolved_by
            }
        
        return details
    
    def cancel_message(self, db: Session, message_id: int, reason: str = None) -> bool:
        """Cancel a pending message"""
        
        message = db.query(MessageQueue).filter(
            and_(
                MessageQueue.id == message_id,
                MessageQueue.status.in_([MessageStatus.PENDING, MessageStatus.RETRYING])
            )
        ).first()
        
        if not message:
            return False
        
        message.status = MessageStatus.CANCELLED
        message.completed_at = datetime.utcnow()
        message.error_message = f"Cancelled: {reason}" if reason else "Cancelled by user"
        
        db.commit()
        
        logger.info(f"Message {message_id} cancelled: {reason}")
        return True
    
    def retry_failed_message(self, db: Session, message_id: int, reset_attempts: bool = False) -> bool:
        """Manually retry a failed message"""
        
        message = db.query(MessageQueue).filter(
            and_(
                MessageQueue.id == message_id,
                MessageQueue.status == MessageStatus.FAILED
            )
        ).first()
        
        if not message:
            return False
        
        if reset_attempts:
            message.attempts = 0
        
        message.status = MessageStatus.PENDING
        message.scheduled_for = datetime.utcnow()
        message.error_message = None
        message.error_traceback = None
        
        db.commit()
        
        logger.info(f"Message {message_id} manually retried")
        return True
    
    def get_dlq_entries(
        self, 
        db: Session, 
        manual_review_only: bool = False,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get dead letter queue entries"""
        
        query = db.query(DeadLetterQueue)
        
        if manual_review_only:
            query = query.filter(
                and_(
                    DeadLetterQueue.manual_review_required == True,
                    DeadLetterQueue.resolved_at.is_(None)
                )
            )
        
        dlq_entries = query.order_by(desc(DeadLetterQueue.created_at)).offset(offset).limit(limit).all()
        
        result = []
        for entry in dlq_entries:
            result.append({
                "id": entry.id,
                "original_message_id": entry.original_message_id,
                "original_task_name": entry.original_task_name,
                "original_queue_type": entry.original_queue_type.value,
                "original_priority": entry.original_priority.value,
                "failure_reason": entry.failure_reason,
                "total_attempts": entry.total_attempts,
                "manual_review_required": entry.manual_review_required,
                "can_be_retried": entry.can_be_retried,
                "resolution_action": entry.resolution_action,
                "resolved_at": entry.resolved_at.isoformat() if entry.resolved_at else None,
                "created_at": entry.created_at.isoformat()
            })
        
        return result
    
    def _get_default_max_retries(self, queue_type: MessageQueueType) -> int:
        """Get default max retries for queue type"""
        retry_config = {
            MessageQueueType.PAYMENT_WEBHOOK: 5,
            MessageQueueType.NOTIFICATION: 3,
            MessageQueueType.EMAIL_CAMPAIGN: 2,
            MessageQueueType.ANALYTICS: 2,
            MessageQueueType.FILE_PROCESSING: 2,
            MessageQueueType.CALENDAR_SYNC: 3,
            MessageQueueType.MARKETING_AUTOMATION: 2,
            MessageQueueType.SYSTEM_ALERT: 5
        }
        
        return retry_config.get(queue_type, 3)
    
    def _generate_content_hash(self, task_name: str, task_args: List[Any], task_kwargs: Dict[str, Any]) -> str:
        """Generate content hash for deduplication"""
        content = f"{task_name}:{json.dumps(task_args, sort_keys=True)}:{json.dumps(task_kwargs, sort_keys=True)}"
        return hashlib.sha256(content.encode()).hexdigest()


# Create singleton instance
queue_management_service = QueueManagementService()