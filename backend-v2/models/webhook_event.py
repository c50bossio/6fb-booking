"""
Webhook Event Model for audit trail and debugging.
Stores webhook events for staging and production environments.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timezone
from database import Base

class WebhookEvent(Base):
    """
    Model for storing webhook events for audit trail and debugging.
    
    Stores both staging and production webhook events with:
    - Event metadata (provider, type, event_id)
    - Request details (headers, payload, signature)
    - Processing results (status, response, errors)
    - Performance metrics (received_at, processed_at, duration)
    """
    __tablename__ = "webhook_events"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Event identification
    provider = Column(String(50), nullable=False, index=True)  # stripe, twilio, etc.
    event_id = Column(String(255), nullable=False, index=True)  # External event ID
    event_type = Column(String(100), nullable=False, index=True)  # payment_intent.succeeded, etc.
    environment = Column(String(20), nullable=False, default="staging")  # staging, production
    
    # Request details
    source_ip = Column(String(45))  # IPv4/IPv6 address
    user_agent = Column(Text)
    headers = Column(JSON)  # All request headers
    payload = Column(Text)  # Raw webhook payload
    signature = Column(Text)  # Webhook signature for verification
    content_length = Column(Integer)
    
    # Processing details
    status = Column(String(20), nullable=False, default="received")  # received, processed, failed, duplicate
    processing_result = Column(JSON)  # Response data or error details
    error_message = Column(Text)  # Error details if processing failed
    signature_valid = Column(Boolean, default=False)
    is_duplicate = Column(Boolean, default=False)
    
    # Performance metrics
    received_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    processed_at = Column(DateTime(timezone=True))
    processing_duration_ms = Column(Integer)  # Processing time in milliseconds
    
    # Metadata
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    def __repr__(self):
        return f"<WebhookEvent(provider='{self.provider}', event_id='{self.event_id}', status='{self.status}', environment='{self.environment}')>"
    
    @property
    def is_processed(self) -> bool:
        """Check if webhook event has been processed successfully"""
        return self.status == "processed"
    
    @property
    def is_failed(self) -> bool:
        """Check if webhook event processing failed"""
        return self.status == "failed"
    
    def mark_as_processed(self, result: dict, duration_ms: int = None):
        """Mark webhook as successfully processed"""
        self.status = "processed"
        self.processed_at = datetime.now(timezone.utc)
        self.processing_result = result
        if duration_ms:
            self.processing_duration_ms = duration_ms
    
    def mark_as_failed(self, error_msg: str, duration_ms: int = None):
        """Mark webhook as failed with error details"""
        self.status = "failed"
        self.processed_at = datetime.now(timezone.utc)
        self.error_message = error_msg
        if duration_ms:
            self.processing_duration_ms = duration_ms
    
    def mark_as_duplicate(self):
        """Mark webhook as duplicate event"""
        self.status = "duplicate"
        self.is_duplicate = True
        self.processed_at = datetime.now(timezone.utc)


class WebhookEventService:
    """Service for managing webhook event persistence"""
    
    def __init__(self, db_session):
        self.db = db_session
    
    def create_webhook_event(
        self,
        provider: str,
        event_id: str,
        event_type: str,
        environment: str,
        source_ip: str = None,
        user_agent: str = None,
        headers: dict = None,
        payload: str = None,
        signature: str = None,
        signature_valid: bool = False
    ) -> WebhookEvent:
        """Create a new webhook event record"""
        
        webhook_event = WebhookEvent(
            provider=provider,
            event_id=event_id,
            event_type=event_type,
            environment=environment,
            source_ip=source_ip,
            user_agent=user_agent,
            headers=headers,
            payload=payload,
            signature=signature,
            signature_valid=signature_valid,
            content_length=len(payload) if payload else 0
        )
        
        self.db.add(webhook_event)
        self.db.commit()
        self.db.refresh(webhook_event)
        
        return webhook_event
    
    def get_webhook_events(
        self,
        provider: str = None,
        environment: str = None,
        status: str = None,
        limit: int = 100
    ) -> list[WebhookEvent]:
        """Retrieve webhook events with optional filtering"""
        
        query = self.db.query(WebhookEvent)
        
        if provider:
            query = query.filter(WebhookEvent.provider == provider)
        if environment:
            query = query.filter(WebhookEvent.environment == environment)
        if status:
            query = query.filter(WebhookEvent.status == status)
        
        return query.order_by(WebhookEvent.received_at.desc()).limit(limit).all()
    
    def get_duplicate_events(self, provider: str, event_id: str, environment: str) -> list[WebhookEvent]:
        """Check for duplicate webhook events"""
        return self.db.query(WebhookEvent).filter(
            WebhookEvent.provider == provider,
            WebhookEvent.event_id == event_id,
            WebhookEvent.environment == environment
        ).all()
    
    def get_webhook_stats(self, environment: str = None) -> dict:
        """Get webhook processing statistics"""
        
        query = self.db.query(WebhookEvent)
        if environment:
            query = query.filter(WebhookEvent.environment == environment)
        
        total = query.count()
        processed = query.filter(WebhookEvent.status == "processed").count()
        failed = query.filter(WebhookEvent.status == "failed").count()
        duplicates = query.filter(WebhookEvent.status == "duplicate").count()
        
        # Average processing time (for non-duplicate events)
        processing_times = [
            event.processing_duration_ms 
            for event in query.filter(
                WebhookEvent.processing_duration_ms.isnot(None),
                WebhookEvent.status != "duplicate"
            ).all()
        ]
        
        avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0
        
        return {
            "total_events": total,
            "processed": processed,
            "failed": failed,
            "duplicates": duplicates,
            "success_rate": (processed / total * 100) if total > 0 else 0,
            "average_processing_time_ms": avg_processing_time,
            "environment": environment or "all"
        }
    
    def cleanup_old_events(self, days_to_keep: int = 30) -> int:
        """Clean up old webhook events (keep only recent events)"""
        from datetime import timedelta
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
        
        deleted_count = self.db.query(WebhookEvent).filter(
            WebhookEvent.created_at < cutoff_date
        ).delete()
        
        self.db.commit()
        return deleted_count