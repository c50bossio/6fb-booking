"""
Webhook event tracking models for idempotency and error recovery
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class WebhookEvent(Base):
    """
    Tracks all incoming webhook events for idempotency and debugging
    """
    __tablename__ = "webhook_events"
    
    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(50), nullable=False, index=True)  # stripe, twilio, etc.
    event_type = Column(String(100), nullable=False)  # payment.succeeded, etc.
    event_id = Column(String(255), nullable=False, unique=True, index=True)  # External event ID
    
    # Request data
    payload = Column(Text)  # JSON string of the full payload
    headers = Column(Text)  # JSON string of headers
    source_ip = Column(String(45))
    
    # Processing status
    status = Column(String(20), default="pending", index=True)  # pending, processing, processed, failed
    retry_count = Column(Integer, default=0)
    
    # Results
    result = Column(Text)  # JSON string of processing result
    error = Column(Text)  # JSON string of error details
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    processed_at = Column(DateTime)
    failed_at = Column(DateTime)
    
    # Relationships
    retries = relationship("WebhookRetry", back_populates="webhook_event", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<WebhookEvent {self.source}/{self.event_type}/{self.event_id}>"


class WebhookRetry(Base):
    """
    Tracks webhook retry attempts for failed events
    """
    __tablename__ = "webhook_retries"
    
    id = Column(Integer, primary_key=True, index=True)
    webhook_event_id = Column(Integer, ForeignKey("webhook_events.id"), nullable=False)
    
    # Retry scheduling
    retry_at = Column(DateTime, nullable=False, index=True)
    attempt_number = Column(Integer, nullable=False)
    
    # Execution details
    executed_at = Column(DateTime)
    success = Column(Boolean)
    error_message = Column(Text)
    
    # Relationships
    webhook_event = relationship("WebhookEvent", back_populates="retries")
    
    def __repr__(self):
        return f"<WebhookRetry event_id={self.webhook_event_id} attempt={self.attempt_number}>"


class WebhookDeadLetter(Base):
    """
    Stores webhooks that failed all retry attempts for manual investigation
    """
    __tablename__ = "webhook_dead_letters"
    
    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(50), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    event_id = Column(String(255), nullable=False)
    
    # Full request data for debugging
    payload = Column(Text)
    headers = Column(Text)
    
    # Error information
    final_error = Column(Text)
    total_attempts = Column(Integer)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)  # For manual investigation notes
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    resolved_by = Column(String(100))
    
    def __repr__(self):
        return f"<WebhookDeadLetter {self.source}/{self.event_id}>"