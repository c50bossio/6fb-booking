"""
Multi-Factor Authentication (MFA) schemas for BookedBarber V2.
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum


class MFAMethod(str, Enum):
    """Supported MFA methods."""
    totp = "totp"
    sms = "sms"
    email = "email"
    backup_codes = "backup_codes"


class MFASetupRequest(BaseModel):
    """Schema for MFA setup request."""
    method: MFAMethod
    phone_number: Optional[str] = Field(None, description="Required for SMS method")
    
    @validator('phone_number')
    def validate_phone_for_sms(cls, v, values):
        if values.get('method') == MFAMethod.sms and not v:
            raise ValueError('Phone number is required for SMS MFA')
        return v


class MFASetupResponse(BaseModel):
    """Schema for MFA setup response."""
    method: MFAMethod
    qr_code: Optional[str] = Field(None, description="Base64 encoded QR code for TOTP")
    secret: Optional[str] = Field(None, description="Secret key for manual TOTP setup")
    backup_codes: Optional[List[str]] = Field(None, description="One-time backup codes")
    message: str
    requires_verification: bool = True
    setup_id: str = Field(..., description="Temporary setup ID for verification")


class MFAEnableRequest(BaseModel):
    """Schema for enabling MFA after setup verification."""
    setup_id: str
    verification_code: str
    trust_device: bool = False


class MFAEnableResponse(BaseModel):
    """Schema for MFA enable response."""
    message: str
    enabled: bool
    method: MFAMethod
    backup_codes_count: int
    device_token: Optional[str] = Field(None, description="Token for trusted device")


class MFAVerificationRequest(BaseModel):
    """Schema for MFA verification during login."""
    code: str
    method: Optional[MFAMethod] = None
    remember_device: bool = False
    device_name: Optional[str] = Field(None, description="Name for the device to remember")


class MFAVerificationResponse(BaseModel):
    """Schema for MFA verification response."""
    verified: bool
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    device_token: Optional[str] = Field(None, description="Token for trusted device")
    mfa_session_token: Optional[str] = Field(None, description="MFA session token for admin operations")
    message: str


class MFADisableRequest(BaseModel):
    """Schema for disabling MFA."""
    password: str
    verification_code: Optional[str] = Field(None, description="Current MFA code for security")


class MFADisableResponse(BaseModel):
    """Schema for MFA disable response."""
    message: str
    disabled: bool


class BackupCodesRequest(BaseModel):
    """Schema for generating new backup codes."""
    password: str
    current_mfa_code: Optional[str] = Field(None, description="Required if MFA is enabled")


class BackupCodesResponse(BaseModel):
    """Schema for backup codes response."""
    backup_codes: List[str]
    generated_at: datetime
    message: str
    warning: str = "Store these codes securely. Each can only be used once."
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class BackupCodeVerificationRequest(BaseModel):
    """Schema for verifying a backup code."""
    backup_code: str
    remember_device: bool = False
    device_name: Optional[str] = None


class TrustedDeviceRequest(BaseModel):
    """Schema for managing trusted devices."""
    action: str = Field(..., pattern="^(list|revoke|revoke_all)$")
    device_token: Optional[str] = Field(None, description="Required for revoke action")


class TrustedDevice(BaseModel):
    """Schema for trusted device information."""
    id: str
    name: str
    last_used: datetime
    created_at: datetime
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class TrustedDevicesResponse(BaseModel):
    """Schema for trusted devices list response."""
    devices: List[TrustedDevice]
    total: int


class MFAStatusResponse(BaseModel):
    """Schema for MFA status check response."""
    enabled: bool
    method: Optional[MFAMethod] = None
    backup_codes_remaining: Optional[int] = None
    trusted_devices_count: int
    last_verified: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class MFAChallengeRequest(BaseModel):
    """Schema for initiating MFA challenge (for methods like SMS/Email)."""
    method: MFAMethod
    resend: bool = False


class MFAChallengeResponse(BaseModel):
    """Schema for MFA challenge response."""
    challenge_id: str
    method: MFAMethod
    message: str
    expires_in: int = Field(..., description="Seconds until challenge expires")
    can_resend_in: Optional[int] = Field(None, description="Seconds until resend is allowed")


class MFAMethodsResponse(BaseModel):
    """Schema for available MFA methods response."""
    available_methods: List[MFAMethod]
    enabled_method: Optional[MFAMethod] = None
    recommended_method: MFAMethod = MFAMethod.totp


class MFARecoveryRequest(BaseModel):
    """Schema for MFA recovery request."""
    email: str
    recovery_method: str = Field(..., pattern="^(email|support)$")


class MFARecoveryResponse(BaseModel):
    """Schema for MFA recovery response."""
    message: str
    recovery_id: Optional[str] = None
    next_steps: List[str]


class MFAConfigUpdate(BaseModel):
    """Schema for updating MFA configuration."""
    require_mfa_for_role: Optional[Dict[str, bool]] = Field(
        None, 
        description="Role-based MFA requirements"
    )
    allowed_methods: Optional[List[MFAMethod]] = None
    totp_issuer: Optional[str] = Field(None, description="TOTP issuer name")
    backup_codes_count: Optional[int] = Field(None, ge=5, le=20)
    device_trust_duration_days: Optional[int] = Field(None, ge=1, le=365)


class MFAConfigResponse(BaseModel):
    """Schema for MFA configuration response."""
    require_mfa_for_role: Dict[str, bool]
    allowed_methods: List[MFAMethod]
    totp_issuer: str
    backup_codes_count: int
    device_trust_duration_days: int
    sms_provider_configured: bool
    email_provider_configured: bool


class MFAEventLog(BaseModel):
    """Schema for MFA event logging."""
    event_type: str
    timestamp: datetime
    success: bool
    method: Optional[MFAMethod] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    error_message: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class MFAEventLogsResponse(BaseModel):
    """Schema for MFA event logs response."""
    events: List[MFAEventLog]
    total: int
    page: int
    per_page: int