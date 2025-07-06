"""
Example API endpoints for MFA functionality

This file demonstrates how to integrate the MFA service into API endpoints.
You can copy and adapt these patterns for your actual authentication flow.
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from services.mfa_service import mfa_service
from api.v1.auth import get_current_user
from models import User

router = APIRouter(prefix="/mfa", tags=["mfa"])


# Request/Response models
class MFASetupResponse(BaseModel):
    qr_code: str
    secret: str
    backup_codes: list[str]
    totp_uri: str


class MFAVerifyRequest(BaseModel):
    code: str


class MFATrustDeviceRequest(BaseModel):
    device_name: Optional[str] = None
    trust_device: bool = False


class MFABackupCodeRegenerateResponse(BaseModel):
    backup_codes: list[str]


# API Endpoints

@router.post("/setup", response_model=MFASetupResponse)
async def setup_mfa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Set up MFA for the current user.
    Returns QR code and backup codes.
    """
    try:
        result = mfa_service.setup_mfa(
            user_id=current_user.id,
            db=db
        )
        return MFASetupResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set up MFA"
        )


@router.post("/verify-setup")
async def verify_and_enable_mfa(
    request: MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify TOTP code and enable MFA.
    """
    success = mfa_service.verify_and_enable_mfa(
        user_id=current_user.id,
        code=request.code,
        db=db
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid code. Please try again."
        )
    
    return {"message": "MFA enabled successfully"}


@router.post("/verify")
async def verify_mfa_code(
    request: MFAVerifyRequest,
    req: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify MFA code during login.
    """
    # Get client info for logging
    client_ip = req.client.host if req.client else None
    user_agent = req.headers.get("user-agent")
    
    success, error = mfa_service.verify_totp_code(
        user_id=current_user.id,
        code=request.code,
        db=db,
        ip_address=client_ip,
        user_agent=user_agent
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error or "Invalid code"
        )
    
    return {"message": "MFA verification successful"}


@router.post("/verify-backup")
async def verify_backup_code(
    request: MFAVerifyRequest,
    req: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify backup code for MFA.
    """
    # Get client info for logging
    client_ip = req.client.host if req.client else None
    user_agent = req.headers.get("user-agent")
    
    success, error = mfa_service.verify_backup_code(
        user_id=current_user.id,
        code=request.code,
        db=db,
        ip_address=client_ip,
        user_agent=user_agent
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error or "Invalid backup code"
        )
    
    # Get remaining backup codes count
    status = mfa_service.get_mfa_status(current_user.id, db)
    
    return {
        "message": "Backup code verified successfully",
        "remaining_codes": status.get("backup_codes_remaining", 0)
    }


@router.post("/trust-device")
async def trust_device(
    request: MFATrustDeviceRequest,
    req: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Trust the current device for MFA.
    """
    if not request.trust_device:
        return {"trusted": False}
    
    # Generate device fingerprint (in production, use a proper fingerprinting library)
    user_agent = req.headers.get("user-agent", "")
    device_fingerprint = hashlib.sha256(
        f"{user_agent}{current_user.id}".encode()
    ).hexdigest()
    
    # Get client info
    client_ip = req.client.host if req.client else None
    
    # Parse user agent for browser/platform (simplified)
    browser = "Unknown"
    platform = "Unknown"
    if "Chrome" in user_agent:
        browser = "Chrome"
    elif "Firefox" in user_agent:
        browser = "Firefox"
    elif "Safari" in user_agent:
        browser = "Safari"
    
    if "Windows" in user_agent:
        platform = "Windows"
    elif "Mac" in user_agent:
        platform = "macOS"
    elif "Linux" in user_agent:
        platform = "Linux"
    
    trust_token = mfa_service.trust_device(
        user_id=current_user.id,
        device_fingerprint=device_fingerprint,
        device_name=request.device_name,
        browser=browser,
        platform=platform,
        ip_address=client_ip,
        db=db
    )
    
    return {
        "trusted": True,
        "trust_token": trust_token,
        "device_fingerprint": device_fingerprint
    }


@router.get("/status")
async def get_mfa_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get MFA status for the current user.
    """
    return mfa_service.get_mfa_status(current_user.id, db)


@router.get("/trusted-devices")
async def list_trusted_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all trusted devices for the current user.
    """
    return {
        "devices": mfa_service.list_trusted_devices(current_user.id, db)
    }


@router.delete("/trusted-devices/{device_id}")
async def revoke_device_trust(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Revoke trust for a specific device.
    """
    count = mfa_service.revoke_device_trust(
        user_id=current_user.id,
        device_id=device_id,
        reason="User revoked",
        db=db
    )
    
    if count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    return {"message": "Device trust revoked"}


@router.delete("/trusted-devices")
async def revoke_all_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Revoke trust for all devices.
    """
    count = mfa_service.revoke_device_trust(
        user_id=current_user.id,
        revoke_all=True,
        reason="User revoked all",
        db=db
    )
    
    return {
        "message": f"Revoked trust for {count} devices"
    }


@router.post("/regenerate-backup-codes", response_model=MFABackupCodeRegenerateResponse)
async def regenerate_backup_codes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Regenerate backup codes for MFA.
    """
    try:
        backup_codes = mfa_service.regenerate_backup_codes(
            user_id=current_user.id,
            db=db
        )
        return MFABackupCodeRegenerateResponse(backup_codes=backup_codes)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/disable")
async def disable_mfa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disable MFA for the current user.
    """
    success = mfa_service.disable_mfa(
        user_id=current_user.id,
        reason="User requested",
        db=db
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled"
        )
    
    return {"message": "MFA disabled successfully"}


@router.get("/events")
async def get_mfa_events(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get recent MFA events for the current user.
    """
    return {
        "events": mfa_service.get_mfa_events(
            user_id=current_user.id,
            limit=limit,
            db=db
        )
    }


# Integration example for login flow
import hashlib

def check_device_trust(
    user_id: int,
    trust_token: Optional[str],
    device_fingerprint: str,
    db: Session
) -> bool:
    """
    Check if device is trusted (to be used in login flow).
    """
    if not trust_token:
        return False
    
    return mfa_service.verify_device_trust(
        user_id=user_id,
        trust_token=trust_token,
        device_fingerprint=device_fingerprint,
        db=db
    )


# Example of how to integrate into existing login endpoint:
"""
@router.post("/login")
async def login(
    credentials: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    # ... verify username/password ...
    
    # Check if MFA is enabled
    mfa_status = mfa_service.get_mfa_status(user.id, db)
    
    if mfa_status["enabled"]:
        # Check device trust
        device_fingerprint = generate_device_fingerprint(request)
        trust_token = request.cookies.get("mfa_trust_token")
        
        if check_device_trust(user.id, trust_token, device_fingerprint, db):
            # Device is trusted, skip MFA
            return generate_tokens(user)
        else:
            # Require MFA verification
            return {
                "mfa_required": True,
                "temp_token": generate_temp_token(user)  # Short-lived token for MFA verification
            }
    
    # No MFA, proceed with normal login
    return generate_tokens(user)
"""