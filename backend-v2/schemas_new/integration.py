"""
Pydantic schemas for integration management.
Handles validation for OAuth flows, health checks, and integration CRUD operations.
"""

from pydantic import BaseModel, Field, field_validator, HttpUrl, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class IntegrationType(str, Enum):
    """Supported integration types"""
    GOOGLE_CALENDAR = "google_calendar"
    GOOGLE_MY_BUSINESS = "google_my_business"
    STRIPE = "stripe"
    SENDGRID = "sendgrid"
    TWILIO = "twilio"
    SQUARE = "square"
    ACUITY = "acuity"
    BOOKSY = "booksy"
    EMAIL_MARKETING = "email_marketing"
    SMS_MARKETING = "sms_marketing"
    CUSTOM = "custom"

class IntegrationStatus(str, Enum):
    """Integration health status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    PENDING = "pending"
    EXPIRED = "expired"
    SUSPENDED = "suspended"

class IntegrationBase(BaseModel):
    """Base integration schema"""
    name: str = Field(..., min_length=1, max_length=255, description="User-friendly name for the integration")
    integration_type: IntegrationType
    config: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Integration-specific configuration")
    is_active: bool = True

class IntegrationCreate(IntegrationBase):
    """Schema for creating a new integration"""
    api_key: Optional[str] = Field(None, description="API key for non-OAuth integrations")
    api_secret: Optional[str] = Field(None, description="API secret for non-OAuth integrations")
    webhook_url: Optional[HttpUrl] = Field(None, description="Webhook URL for receiving events")
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Integration name cannot be empty')
        return v.strip()

class IntegrationUpdate(BaseModel):
    """Schema for updating an integration"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    webhook_url: Optional[HttpUrl] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Integration name cannot be empty')
        return v.strip() if v else v

class IntegrationResponse(IntegrationBase):
    """Schema for integration responses"""
    id: int
    user_id: int
    status: IntegrationStatus
    scopes: List[str] = Field(default_factory=list)
    webhook_url: Optional[str] = None
    last_sync_at: Optional[datetime] = None
    last_error: Optional[str] = None
    error_count: int = 0
    created_at: datetime
    updated_at: datetime
    is_connected: bool = Field(default=False, description="Whether the integration has valid credentials")
    
    model_config = ConfigDict(from_attributes=True)
        
    @field_validator('is_connected')
    @classmethod
    def compute_is_connected(cls, v, info):
        """Determine if integration is properly connected"""
        if info.data:
            status = info.data.get('status')
            return status in [IntegrationStatus.ACTIVE, IntegrationStatus.PENDING]
        return v

class OAuthInitiateRequest(BaseModel):
    """Request to initiate OAuth flow"""
    integration_type: IntegrationType
    redirect_uri: Optional[HttpUrl] = Field(None, description="Custom redirect URI after OAuth completion")
    scopes: Optional[List[str]] = Field(default_factory=list, description="Additional OAuth scopes to request")
    state: Optional[str] = Field(None, description="State parameter for OAuth security")

class OAuthCallbackRequest(BaseModel):
    """OAuth callback parameters"""
    code: str = Field(..., description="Authorization code from OAuth provider")
    state: Optional[str] = Field(None, description="State parameter for validation")
    error: Optional[str] = Field(None, description="Error from OAuth provider")
    error_description: Optional[str] = Field(None, description="Error description from OAuth provider")

class OAuthCallbackResponse(BaseModel):
    """Response after OAuth callback processing"""
    success: bool
    integration_id: Optional[int] = None
    message: str
    redirect_url: Optional[str] = Field(None, description="URL to redirect user after OAuth completion")

class IntegrationHealthCheck(BaseModel):
    """Health check response for an integration"""
    integration_id: int
    integration_type: IntegrationType
    name: str
    status: IntegrationStatus
    healthy: bool
    last_check: datetime
    details: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None
    
    model_config = ConfigDict(
        from_attributes = True
)

class IntegrationHealthSummary(BaseModel):
    """Summary of all integration health checks"""
    total_integrations: int
    healthy_count: int
    error_count: int
    inactive_count: int
    integrations: List[IntegrationHealthCheck]
    checked_at: datetime = Field(default_factory=datetime.utcnow)

class IntegrationDisconnectResponse(BaseModel):
    """Response after disconnecting an integration"""
    success: bool
    message: str
    integration_id: int

class IntegrationTokenRefreshRequest(BaseModel):
    """Request to refresh OAuth tokens"""
    integration_id: int
    force: bool = Field(False, description="Force token refresh even if not expired")

class IntegrationTokenRefreshResponse(BaseModel):
    """Response after token refresh"""
    success: bool
    message: str
    expires_at: Optional[datetime] = None

class IntegrationSyncRequest(BaseModel):
    """Request to sync data from an integration"""
    integration_id: int
    sync_type: Optional[str] = Field(None, description="Type of sync to perform (integration-specific)")
    options: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Sync options")

class IntegrationSyncResponse(BaseModel):
    """Response after sync operation"""
    success: bool
    message: str
    synced_at: datetime
    items_synced: Optional[int] = None
    errors: List[str] = Field(default_factory=list)