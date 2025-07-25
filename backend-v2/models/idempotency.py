"""
Database model for idempotency key tracking.

This model stores idempotency keys and their associated responses to prevent
duplicate operations in critical financial processes.
"""

from sqlalchemy import Column, Integer, String, DateTime, JSON, Index, UniqueConstraint
from datetime import datetime
import enum

from db import Base


class IdempotencyKey(Base):
    """
    Model for tracking idempotency keys and their responses.
    
    This table stores:
    - Unique idempotency keys
    - Operation type and user context
    - Request fingerprint for validation
    - Cached response data
    - Expiration information
    """
    __tablename__ = "idempotency_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # The unique idempotency key provided by client
    key = Column(String(255), nullable=False, unique=True, index=True)
    
    # Type of operation (payment_intent, payout, commission_calc, etc.)
    operation_type = Column(String(100), nullable=False, index=True)
    
    # User who initiated the operation (optional for webhooks)
    user_id = Column(Integer, nullable=True, index=True)
    
    # Hash of the request data to detect key reuse with different data
    request_hash = Column(String(64), nullable=False)
    
    # Cached response data as JSON
    response_data = Column(JSON, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    
    # Additional context (optional)
    operation_metadata = Column(JSON, nullable=True)
    
    # Constraints
    __table_args__ = (
        # Index for cleanup queries
        Index('ix_idempotency_expires_created', 'expires_at', 'created_at'),
        
        # Index for operation type queries
        Index('ix_idempotency_operation_user', 'operation_type', 'user_id'),
        
        # Ensure uniqueness
        UniqueConstraint('key', name='uq_idempotency_key'),
    )
    
    def __repr__(self):
        return f"<IdempotencyKey(key='{self.key}', operation='{self.operation_type}', expires='{self.expires_at}')>"
    
    @property
    def is_expired(self) -> bool:
        """Check if the idempotency key has expired"""
        return datetime.utcnow() > self.expires_at
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'key': self.key,
            'operation_type': self.operation_type,
            'user_id': self.user_id,
            'request_hash': self.request_hash,
            'response_data': self.response_data,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'operation_metadata': self.operation_metadata,
            'is_expired': self.is_expired
        }


class IdempotencyOperationType(enum.Enum):
    """Enumeration of operation types that support idempotency"""
    
    # Payment operations
    PAYMENT_INTENT = "payment_intent"
    PAYMENT_CONFIRM = "payment_confirm"
    PAYMENT_REFUND = "payment_refund"
    
    # Commission operations
    COMMISSION_CALCULATION = "commission_calculation"
    COMMISSION_PAYOUT = "commission_payout"
    
    # Payout operations  
    BARBER_PAYOUT = "barber_payout"
    ENHANCED_PAYOUT = "enhanced_payout"
    
    # Order operations
    ORDER_CREATE = "order_create"
    POS_TRANSACTION = "pos_transaction"
    
    # Webhook operations
    WEBHOOK_STRIPE = "webhook_stripe"
    WEBHOOK_SMS = "webhook_sms"
    WEBHOOK_SHOPIFY = "webhook_shopify"
    
    # Integration operations
    INTEGRATION_SYNC = "integration_sync"
    REVIEW_RESPONSE = "review_response"
    
    # Gift certificate operations
    GIFT_CERTIFICATE_CREATE = "gift_certificate_create"
    GIFT_CERTIFICATE_REDEEM = "gift_certificate_redeem"


# Add validation methods
def validate_idempotency_key_format(key: str) -> bool:
    """Validate idempotency key format"""
    if not key or not isinstance(key, str):
        return False
    
    if len(key) < 10 or len(key) > 255:
        return False
    
    # Check for valid characters (alphanumeric, hyphens, underscores)
    import re
    pattern = r'^[a-zA-Z0-9_-]+$'
    return bool(re.match(pattern, key))


def generate_operation_specific_key(operation_type: str, context: dict = None) -> str:
    """Generate an operation-specific idempotency key"""
    import uuid
    import hashlib
    
    base_key = f"{operation_type}_{uuid.uuid4()}"
    
    if context:
        # Add context hash for additional uniqueness
        context_str = str(sorted(context.items()))
        context_hash = hashlib.md5(context_str.encode()).hexdigest()[:8]
        base_key = f"{base_key}_{context_hash}"
    
    return base_key