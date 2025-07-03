"""
Pydantic schemas for GDPR compliance and privacy management.
Handles validation for consents, cookie preferences, data exports, and privacy settings.
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ConsentType(str, Enum):
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


class ConsentStatus(str, Enum):
    """Status of user consent"""
    GRANTED = "granted"
    DENIED = "denied"
    PENDING = "pending"
    WITHDRAWN = "withdrawn"


class ExportStatus(str, Enum):
    """Status of data export requests"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"


class ExportFormat(str, Enum):
    """Available export formats"""
    JSON = "json"
    CSV = "csv"
    XML = "xml"


class CookiePreferences(BaseModel):
    """Cookie consent preferences by category"""
    functional: bool = Field(True, description="Essential cookies for basic functionality (cannot be disabled)")
    analytics: bool = Field(False, description="Analytics cookies for usage tracking")
    marketing: bool = Field(False, description="Marketing cookies for targeted advertising")
    preferences: bool = Field(False, description="Preference cookies for user customization")
    
    @field_validator('functional')
    @classmethod
    def functional_always_true(cls, v):
        """Functional cookies are always required"""
        if not v:
            raise ValueError('Functional cookies cannot be disabled')
        return True


class CookieConsentRequest(BaseModel):
    """Request to update cookie preferences"""
    preferences: CookiePreferences
    session_id: Optional[str] = Field(None, description="Session ID for anonymous tracking")


class CookieConsentResponse(BaseModel):
    """Response with current cookie preferences"""
    id: int
    user_id: Optional[int] = None
    session_id: str
    preferences: CookiePreferences
    consent_date: datetime
    expiry_date: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ConsentUpdate(BaseModel):
    """Request to update consent status"""
    consent_type: ConsentType
    status: ConsentStatus
    version: Optional[str] = Field(None, description="Version of terms/policy being consented to")
    notes: Optional[str] = Field(None, description="Additional notes about the consent")
    
    @field_validator('status')
    @classmethod
    def validate_status_transition(cls, v, info):
        """Validate consent status transitions"""
        if v == ConsentStatus.PENDING:
            raise ValueError("Cannot explicitly set consent to pending status")
        return v


class ConsentResponse(BaseModel):
    """Response with consent details"""
    id: int
    user_id: int
    consent_type: ConsentType
    status: ConsentStatus
    consent_date: datetime
    withdrawal_date: Optional[datetime] = None
    version: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class BulkConsentUpdate(BaseModel):
    """Request to update multiple consents at once"""
    consents: List[ConsentUpdate]
    accept_all: Optional[bool] = Field(None, description="Accept all consents (overrides individual settings)")


class DataExportRequest(BaseModel):
    """Request for user data export"""
    format: ExportFormat = Field(ExportFormat.JSON, description="Desired export format")
    data_categories: Optional[List[str]] = Field(
        None, 
        description="Specific data categories to include (None = all data)"
    )
    include_deleted: bool = Field(False, description="Include soft-deleted records")


class DataExportResponse(BaseModel):
    """Response for data export request"""
    request_id: str
    status: ExportStatus
    requested_at: datetime
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    file_url: Optional[str] = Field(None, description="Download URL when ready")
    file_size_bytes: Optional[int] = None
    format: ExportFormat
    message: str
    
    model_config = ConfigDict(from_attributes=True)


class DataExportStatusResponse(BaseModel):
    """Status check for data export request"""
    request_id: str
    status: ExportStatus
    progress_percentage: Optional[int] = Field(None, ge=0, le=100)
    estimated_completion: Optional[datetime] = None
    error_message: Optional[str] = None


class AccountDeletionRequest(BaseModel):
    """Request for account deletion"""
    confirmation: str = Field(..., description="User must type 'DELETE' to confirm")
    reason: Optional[str] = Field(None, description="Optional reason for deletion")
    feedback: Optional[str] = Field(None, description="Optional feedback")
    
    @field_validator('confirmation')
    @classmethod
    def validate_confirmation(cls, v):
        """Ensure user typed DELETE to confirm"""
        if v.upper() != 'DELETE':
            raise ValueError("Please type 'DELETE' to confirm account deletion")
        return v


class AccountDeletionResponse(BaseModel):
    """Response for account deletion request"""
    success: bool
    message: str
    deletion_date: datetime
    data_retention_days: int = Field(30, description="Days before permanent deletion")


class PrivacySettings(BaseModel):
    """User's current privacy settings and status"""
    user_id: int
    email: str
    consents: Dict[str, ConsentStatus] = Field(
        default_factory=dict,
        description="Current consent status by type"
    )
    cookie_preferences: Optional[CookiePreferences] = None
    data_export_available: bool = Field(True, description="Whether user can request data export")
    pending_export_request: Optional[str] = Field(None, description="Request ID if export is pending")
    last_privacy_review: Optional[datetime] = None
    gdpr_compliant: bool = Field(True, description="Whether all required consents are in place")
    
    model_config = ConfigDict(from_attributes=True)


class ConsentAuditEntry(BaseModel):
    """Audit log entry for consent changes"""
    id: int
    user_id: int
    action: str
    consent_type: Optional[str] = None
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    reason: Optional[str] = None
    ip_address: Optional[str] = None
    performed_by: Optional[int] = None
    timestamp: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ConsentAuditLog(BaseModel):
    """List of consent audit entries"""
    entries: List[ConsentAuditEntry]
    total: int
    page: int = 1
    per_page: int = 50


class DataProcessingActivity(BaseModel):
    """Record of data processing activity"""
    purpose: str
    operation: str
    data_categories: List[str]
    legal_basis: str
    retention_period_days: Optional[int] = None
    third_party_involved: bool = False
    third_party_details: Optional[Dict[str, Any]] = None
    processing_date: datetime
    
    model_config = ConfigDict(from_attributes=True)


class PrivacyComplianceReport(BaseModel):
    """Comprehensive privacy compliance report"""
    user_id: int
    report_date: datetime
    consents_summary: Dict[str, Dict[str, Any]]
    cookie_consents: List[CookieConsentResponse]
    data_processing_activities: List[DataProcessingActivity]
    export_requests: List[DataExportResponse]
    audit_log_summary: Dict[str, int]
    compliance_status: str
    recommendations: List[str] = Field(default_factory=list)