"""
GDPR compliance models for managing user consents, cookie preferences,
data processing logs, and privacy-related requests.
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, ForeignKey, Enum as SQLEnum, BigInteger
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, timedelta
import enum
import uuid
import sys
import os

# Add parent directory to path to resolve imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import Base


def utcnow():
    """Helper function for UTC datetime (replaces deprecated utcnow())"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def generate_request_id():
    """Generate a unique request ID"""
    return f"GDPR-{uuid.uuid4().hex[:8].upper()}-{datetime.now().strftime('%Y%m%d')}"


class ConsentType(enum.Enum):
    """Types of consents that can be tracked"""
    TERMS_OF_SERVICE = "terms_of_service"
    PRIVACY_POLICY = "privacy_policy"
    MARKETING_EMAILS = "marketing_emails"
    MARKETING_SMS = "marketing_sms"
    DATA_PROCESSING = "data_processing"
    THIRD_PARTY_SHARING = "third_party_sharing"
    # Cross-user AI analytics consent types
    AGGREGATE_ANALYTICS = "aggregate_analytics"
    BENCHMARKING = "benchmarking"
    PREDICTIVE_INSIGHTS = "predictive_insights"
    AI_COACHING = "ai_coaching"


class ConsentStatus(enum.Enum):
    """Status of user consent"""
    GRANTED = "granted"
    DENIED = "denied"
    PENDING = "pending"
    WITHDRAWN = "withdrawn"


class CookieCategory(enum.Enum):
    """Cookie categories for granular consent"""
    FUNCTIONAL = "functional"
    ANALYTICS = "analytics"
    MARKETING = "marketing"
    PREFERENCES = "preferences"


class DataProcessingPurpose(enum.Enum):
    """Legal purposes for data processing"""
    SERVICE_PROVISION = "service_provision"
    ANALYTICS = "analytics"
    MARKETING = "marketing"
    LEGAL_COMPLIANCE = "legal_compliance"
    CONSENT_MANAGEMENT = "consent_management"
    DATA_EXPORT = "data_export"


class ExportStatus(enum.Enum):
    """Status of data export requests"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"


class UserConsent(Base):
    """
    Tracks general user consents for terms, privacy policy, marketing, etc.
    Maintains a complete history of consent changes for legal compliance.
    """
    __tablename__ = "user_consents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    consent_type = Column(SQLEnum(ConsentType), nullable=False)
    status = Column(SQLEnum(ConsentStatus), nullable=False, default=ConsentStatus.PENDING)
    
    # Consent tracking
    consent_date = Column(DateTime, nullable=False, default=utcnow)
    withdrawal_date = Column(DateTime, nullable=True)
    
    # Audit information
    ip_address = Column(String(45), nullable=True)  # Supports IPv6
    user_agent = Column(Text, nullable=True)
    version = Column(String(50), nullable=True)  # Version of terms/policy
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User", backref="consents")
    
    def __repr__(self):
        return f"<UserConsent(id={self.id}, user_id={self.user_id}, type={self.consent_type.value}, status={self.status.value})>"
    
    def grant(self, ip_address=None, user_agent=None):
        """Grant consent"""
        self.status = ConsentStatus.GRANTED
        self.consent_date = utcnow()
        self.withdrawal_date = None
        if ip_address:
            self.ip_address = ip_address
        if user_agent:
            self.user_agent = user_agent
        self.updated_at = utcnow()
    
    def withdraw(self, ip_address=None, user_agent=None):
        """Withdraw consent"""
        self.status = ConsentStatus.WITHDRAWN
        self.withdrawal_date = utcnow()
        if ip_address:
            self.ip_address = ip_address
        if user_agent:
            self.user_agent = user_agent
        self.updated_at = utcnow()


class CookieConsent(Base):
    """
    Tracks cookie consent preferences by category.
    Can be associated with a user or tracked anonymously by session.
    """
    __tablename__ = "cookie_consents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    session_id = Column(String(255), nullable=False, index=True)
    
    # Cookie categories (GDPR compliant)
    functional = Column(Boolean, nullable=False, default=True)  # Always required
    analytics = Column(Boolean, nullable=False, default=False)
    marketing = Column(Boolean, nullable=False, default=False)
    preferences = Column(Boolean, nullable=False, default=False)
    
    # Tracking
    consent_date = Column(DateTime, nullable=False, default=utcnow)
    expiry_date = Column(DateTime, nullable=False, default=lambda: utcnow() + timedelta(days=365))
    
    # Audit information
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User", backref="cookie_consents")
    
    def __repr__(self):
        return f"<CookieConsent(id={self.id}, session_id={self.session_id}, analytics={self.analytics}, marketing={self.marketing})>"
    
    def is_expired(self):
        """Check if consent has expired"""
        return utcnow() > self.expiry_date
    
    def update_preferences(self, analytics=None, marketing=None, preferences=None):
        """Update cookie preferences"""
        if analytics is not None:
            self.analytics = analytics
        if marketing is not None:
            self.marketing = marketing
        if preferences is not None:
            self.preferences = preferences
        self.consent_date = utcnow()
        self.expiry_date = utcnow() + timedelta(days=365)
        self.updated_at = utcnow()


class DataProcessingLog(Base):
    """
    Logs all data processing activities for GDPR compliance.
    Required for demonstrating lawful basis and maintaining processing records.
    """
    __tablename__ = "data_processing_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Processing details
    purpose = Column(SQLEnum(DataProcessingPurpose), nullable=False)
    operation = Column(String(255), nullable=False)  # e.g., "appointment_created", "payment_processed"
    data_categories = Column(JSON, nullable=True)  # ["name", "email", "phone"]
    
    # Legal basis
    legal_basis = Column(String(255), nullable=True)  # e.g., "contract", "consent", "legitimate_interest"
    retention_period_days = Column(Integer, nullable=True)
    
    # Third party involvement
    third_party_involved = Column(Boolean, nullable=False, default=False)
    third_party_details = Column(JSON, nullable=True)  # {"name": "Stripe", "purpose": "payment_processing"}
    
    # Audit
    processing_date = Column(DateTime, nullable=False, default=utcnow)
    ip_address = Column(String(45), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=utcnow)
    
    # Relationships
    user = relationship("User", backref="data_processing_logs")
    
    def __repr__(self):
        return f"<DataProcessingLog(id={self.id}, user_id={self.user_id}, purpose={self.purpose.value}, operation={self.operation})>"


class DataExportRequest(Base):
    """
    Manages user data export requests (GDPR Article 20 - Right to data portability).
    Tracks the full lifecycle of export requests.
    """
    __tablename__ = "data_export_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    request_id = Column(String(255), nullable=False, unique=True, default=generate_request_id)
    
    # Request status
    status = Column(SQLEnum(ExportStatus), nullable=False, default=ExportStatus.PENDING)
    
    # Timeline
    requested_at = Column(DateTime, nullable=False, default=utcnow)
    completed_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)  # When download link expires
    
    # Export details
    file_url = Column(Text, nullable=True)  # Secure download URL
    file_size_bytes = Column(BigInteger, nullable=True)
    data_categories = Column(JSON, nullable=True)  # Categories included in export
    format = Column(String(50), nullable=True, default="json")  # json, csv, xml
    
    # Audit
    ip_address = Column(String(45), nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User", backref="data_export_requests")
    
    def __repr__(self):
        return f"<DataExportRequest(id={self.id}, request_id={self.request_id}, user_id={self.user_id}, status={self.status.value})>"
    
    def mark_processing(self):
        """Mark request as being processed"""
        self.status = ExportStatus.PROCESSING
        self.updated_at = utcnow()
    
    def mark_completed(self, file_url, file_size, expiry_hours=48):
        """Mark request as completed with download details"""
        self.status = ExportStatus.COMPLETED
        self.completed_at = utcnow()
        self.file_url = file_url
        self.file_size_bytes = file_size
        self.expires_at = utcnow() + timedelta(hours=expiry_hours)
        self.updated_at = utcnow()
    
    def mark_failed(self, error_message):
        """Mark request as failed"""
        self.status = ExportStatus.FAILED
        self.error_message = error_message
        self.updated_at = utcnow()
    
    def is_expired(self):
        """Check if download link has expired"""
        if self.expires_at:
            return utcnow() > self.expires_at
        return False


class LegalConsentAudit(Base):
    """
    Comprehensive audit trail for all consent-related changes.
    Provides immutable record for legal compliance and dispute resolution.
    """
    __tablename__ = "legal_consent_audit"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    consent_id = Column(Integer, nullable=True)  # Reference to specific consent record
    
    # Action details
    action = Column(String(50), nullable=False)  # e.g., "consent_granted", "consent_withdrawn", "data_exported"
    consent_type = Column(String(100), nullable=True)
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    
    # Context
    reason = Column(Text, nullable=True)
    audit_metadata = Column(JSON, nullable=True)  # Additional context data
    
    # Audit information
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    performed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Immutable timestamp
    timestamp = Column(DateTime, nullable=False, default=utcnow, index=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="consent_audits")
    performer = relationship("User", foreign_keys=[performed_by])
    
    def __repr__(self):
        return f"<LegalConsentAudit(id={self.id}, user_id={self.user_id}, action={self.action}, timestamp={self.timestamp})>"