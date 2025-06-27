"""
MFA (Multi-Factor Authentication) Pydantic schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List


class MFARequiredResponse(BaseModel):
    """Response when MFA is required"""

    mfa_required: bool = True
    mfa_token: str = Field(..., description="Temporary token for MFA verification")
    message: str = "MFA verification required"


class MFALoginRequest(BaseModel):
    """Request for MFA login verification"""

    mfa_token: str = Field(..., description="Temporary MFA token")
    totp_code: Optional[str] = Field(
        None, description="TOTP code from authenticator app"
    )
    backup_code: Optional[str] = Field(None, description="Backup recovery code")


class MFASetupRequest(BaseModel):
    """Request to set up MFA for a user"""

    user_id: int = Field(..., description="User ID")


class MFASetupResponse(BaseModel):
    """Response for MFA setup"""

    secret: str = Field(..., description="TOTP secret")
    qr_code: str = Field(..., description="Base64 encoded QR code image")
    backup_codes: List[str] = Field(..., description="List of backup codes")


class MFAVerifySetupRequest(BaseModel):
    """Request to verify MFA setup"""

    secret: str = Field(..., description="TOTP secret")
    totp_code: str = Field(..., description="TOTP code from authenticator app")


class MFAStatusResponse(BaseModel):
    """Response for MFA status"""

    enabled: bool = Field(..., description="Whether MFA is enabled")
    backup_codes_remaining: int = Field(
        ..., description="Number of backup codes remaining"
    )


class MFADisableRequest(BaseModel):
    """Request to disable MFA"""

    current_password: str = Field(..., description="Current password for verification")
    totp_code: Optional[str] = Field(
        None, description="TOTP code from authenticator app"
    )
    backup_code: Optional[str] = Field(None, description="Backup recovery code")


class BackupCodeResponse(BaseModel):
    """Response for backup code generation"""

    backup_codes: List[str] = Field(..., description="List of new backup codes")
    message: str = "New backup codes generated. Store them securely."
