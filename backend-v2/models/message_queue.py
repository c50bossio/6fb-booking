"""
Message Queue Models for BookedBarber V2
Comprehensive message queue models for different types of messages and processing
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, Enum, ForeignKey, Index, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import enum
import uuid
import hashlib

from models.base import Base

def utcnow():
    return datetime.utcnow()


class MessageQueueType(enum.Enum):
    """Types of message queues"""
    NOTIFICATION = "notification"
    PAYMENT_WEBHOOK = "payment_webhook"
    EMAIL_CAMPAIGN = "email_campaign"
    ANALYTICS = "analytics"
    FILE_PROCESSING = "file_processing"
    CALENDAR_SYNC = "calendar_sync"
    MARKETING_AUTOMATION = "marketing_automation"
    SYSTEM_ALERT = "system_alert"


class MessagePriority(enum.Enum):
    """Message priority levels"""
    CRITICAL = "critical"
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"


class MessageStatus(enum.Enum):
    """Message processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    DEAD_LETTER = "dead_letter"
    CANCELLED = "cancelled"


class MessageQueue(Base):
    """
    Universal message queue for all types of asynchronous processing
    """
    __tablename__ = "message_queue"
    
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String(64), unique=True, index=True, nullable=False)  # UUID for deduplication
    queue_type = Column(Enum(MessageQueueType), nullable=False, index=True)
    priority = Column(Enum(MessagePriority), default=MessagePriority.NORMAL, index=True)
    status = Column(Enum(MessageStatus), default=MessageStatus.PENDING, index=True)
    
    # Message content
    task_name = Column(String(255), nullable=False, index=True)
    task_args = Column(JSON, nullable=True)  # Task arguments
    task_kwargs = Column(JSON, nullable=True)  # Task keyword arguments
    
    # Metadata
    source = Column(String(100), nullable=True)  # Source system/component
    correlation_id = Column(String(64), nullable=True, index=True)  # For tracking related messages
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True, index=True)
    
    # Scheduling and timing
    scheduled_for = Column(DateTime, default=utcnow, index=True)
    expires_at = Column(DateTime, nullable=True, index=True)
    
    # Processing information
    attempts = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    retry_delay = Column(Integer, default=60)  # Seconds
    
    # Execution tracking
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    worker_id = Column(String(100), nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    error_traceback = Column(Text, nullable=True)
    
    # Idempotency and deduplication
    idempotency_key = Column(String(128), nullable=True, index=True)
    content_hash = Column(String(64), nullable=True, index=True)  # Hash of message content
    
    # Audit fields
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User", backref="message_queue_items")
    appointment = relationship("Appointment", backref="message_queue_items")
    dead_letter_record = relationship("DeadLetterQueue", back_populates="original_message", uselist=False)
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_message_queue_processing', 'status', 'scheduled_for', 'priority'),
        Index('idx_message_queue_retry', 'status', 'attempts', 'max_retries'),
        Index('idx_message_queue_cleanup', 'status', 'completed_at'),
        Index('idx_message_queue_dedup', 'idempotency_key', 'content_hash'),
        UniqueConstraint('idempotency_key', name='uq_message_idempotency'),
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.message_id:
            self.message_id = str(uuid.uuid4())
        if not self.content_hash:
            self.content_hash = self._generate_content_hash()
    
    def _generate_content_hash(self) -> str:
        """Generate a hash of the message content for deduplication"""
        content = f"{self.task_name}:{self.task_args}:{self.task_kwargs}"
        return hashlib.sha256(content.encode()).hexdigest()
    
    def can_retry(self) -> bool:
        """Check if message can be retried"""
        return (
            self.status in [MessageStatus.FAILED, MessageStatus.RETRYING] and
            self.attempts < self.max_retries and
            (not self.expires_at or self.expires_at > utcnow())
        )
    
    def is_expired(self) -> bool:
        """Check if message has expired"""
        return self.expires_at and self.expires_at < utcnow()
    
    def mark_processing(self, worker_id: str = None):
        """Mark message as being processed"""
        self.status = MessageStatus.PROCESSING
        self.started_at = utcnow()
        self.worker_id = worker_id
        self.attempts += 1
    
    def mark_completed(self):
        """Mark message as completed"""
        self.status = MessageStatus.COMPLETED
        self.completed_at = utcnow()
    
    def mark_failed(self, error_message: str = None, error_traceback: str = None):
        """Mark message as failed"""
        self.status = MessageStatus.FAILED
        self.error_message = error_message
        self.error_traceback = error_traceback
        self.completed_at = utcnow()
    
    def mark_retrying(self):
        """Mark message for retry"""
        self.status = MessageStatus.RETRYING
        # Calculate next retry time with exponential backoff
        delay = min(self.retry_delay * (2 ** (self.attempts - 1)), 3600)  # Max 1 hour
        self.scheduled_for = utcnow() + timedelta(seconds=delay)


class DeadLetterQueue(Base):
    """
    Dead Letter Queue for messages that have permanently failed
    """
    __tablename__ = "dead_letter_queue"
    
    id = Column(Integer, primary_key=True, index=True)
    original_message_id = Column(Integer, ForeignKey("message_queue.id"), nullable=False, index=True)
    
    # Original message data (preserved for analysis)
    original_task_name = Column(String(255), nullable=False)
    original_task_args = Column(JSON, nullable=True)
    original_task_kwargs = Column(JSON, nullable=True)
    original_queue_type = Column(Enum(MessageQueueType), nullable=False)
    original_priority = Column(Enum(MessagePriority), nullable=False)
    
    # Failure information
    failure_reason = Column(String(500), nullable=False)
    final_error_message = Column(Text, nullable=True)
    final_error_traceback = Column(Text, nullable=True)
    total_attempts = Column(Integer, nullable=False)
    
    # Dead letter processing
    dlq_status = Column(Enum(MessageStatus), default=MessageStatus.PENDING, index=True)
    manual_review_required = Column(Boolean, default=False, index=True)
    can_be_retried = Column(Boolean, default=True, index=True)
    
    # Resolution tracking
    resolution_action = Column(String(100), nullable=True)  # retry, archive, fix_and_retry
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(100), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # Audit fields
    created_at = Column(DateTime, default=utcnow, index=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    original_message = relationship("MessageQueue", back_populates="dead_letter_record")
    
    # Indexes
    __table_args__ = (
        Index('idx_dlq_processing', 'dlq_status', 'manual_review_required'),
        Index('idx_dlq_cleanup', 'created_at', 'dlq_status'),
    )


class QueueMetrics(Base):
    """
    Queue monitoring and metrics
    """
    __tablename__ = "queue_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    queue_type = Column(Enum(MessageQueueType), nullable=False, index=True)
    metric_timestamp = Column(DateTime, default=utcnow, index=True)
    
    # Queue depth metrics
    pending_count = Column(Integer, default=0)
    processing_count = Column(Integer, default=0)
    completed_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    dead_letter_count = Column(Integer, default=0)
    
    # Performance metrics
    avg_processing_time = Column(Integer, nullable=True)  # Seconds
    max_processing_time = Column(Integer, nullable=True)  # Seconds
    throughput_per_minute = Column(Integer, default=0)
    
    # Health indicators
    error_rate = Column(Integer, default=0)  # Percentage
    retry_rate = Column(Integer, default=0)  # Percentage
    backlog_warning = Column(Boolean, default=False)
    
    # Worker information
    active_workers = Column(Integer, default=0)
    worker_utilization = Column(Integer, default=0)  # Percentage
    
    # Additional metadata
    queue_metadata = Column(JSON, nullable=True)
    
    # Indexes
    __table_args__ = (
        Index('idx_queue_metrics_lookup', 'queue_type', 'metric_timestamp'),
        Index('idx_queue_metrics_cleanup', 'metric_timestamp'),
    )


class MessageTemplate(Base):
    """
    Templates for generating queue messages
    """
    __tablename__ = "message_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    template_name = Column(String(100), unique=True, nullable=False, index=True)
    queue_type = Column(Enum(MessageQueueType), nullable=False, index=True)
    
    # Template configuration
    task_name = Column(String(255), nullable=False)
    default_priority = Column(Enum(MessagePriority), default=MessagePriority.NORMAL)
    default_max_retries = Column(Integer, default=3)
    default_retry_delay = Column(Integer, default=60)
    
    # Template content
    description = Column(Text, nullable=True)
    template_args = Column(JSON, nullable=True)  # Template for args
    template_kwargs = Column(JSON, nullable=True)  # Template for kwargs
    
    # Validation and constraints
    required_fields = Column(JSON, nullable=True)  # List of required fields
    validation_schema = Column(JSON, nullable=True)  # JSON schema for validation
    
    # Scheduling
    default_delay_seconds = Column(Integer, default=0)
    default_expiry_hours = Column(Integer, nullable=True)
    
    # Status and metadata
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Indexes
    __table_args__ = (
        Index('idx_message_templates_active', 'is_active', 'queue_type'),
    )