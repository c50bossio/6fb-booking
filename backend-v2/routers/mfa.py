"""
Multi-Factor Authentication (MFA) API Router

Handles all MFA-related endpoints including setup, verification,
backup codes, trusted devices, and audit logging.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from db import get_db
from dependencies import get_current_user
from models import User
from models.mfa import UserMFASecret, MFABackupCode, MFADeviceTrust, MFAEvent
from schemas_new.mfa import (
    MFASetupRequest,
    MFASetupResponse,
    MFAEnableRequest,
    MFAEnableResponse,
    MFAVerificationRequest,
    MFAVerificationResponse,
    MFADisableRequest,
    MFADisableResponse,
    BackupCodesRequest,
    BackupCodesResponse,
    TrustedDevice,
    TrustedDevicesResponse,
    MFAStatusResponse,
    MFAEventLog,
    MFAEventLogsResponse,
    MFAMethod
)
from services.mfa_service import MFAService
from utils.auth import verify_password, create_access_token, create_refresh_token
import secrets

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mfa", tags=["Multi-Factor Authentication"])

@router.post("/setup", response_model=MFASetupResponse)
async def setup_mfa(
    request: MFASetupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initialize MFA setup for the current user.
    
    Currently supports TOTP method. Returns QR code and secret for manual entry.
    Backup codes are generated but not active until MFA is enabled.
    """
    try:
        # Currently only supporting TOTP
        if request.method != MFAMethod.totp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"MFA method '{request.method}' is not currently supported"
            )
        
        # Check if MFA is already enabled
        existing_mfa = db.query(UserMFASecret).filter(
            UserMFASecret.user_id == current_user.id,
            UserMFASecret.is_enabled == True
        ).first()
        
        if existing_mfa:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MFA is already enabled for this account"
            )
        
        # Set up MFA
        setup_result = MFAService.setup_mfa(current_user.id, db)
        
        # Generate a temporary setup ID for verification
        setup_id = secrets.token_urlsafe(32)
        
        # Store setup ID temporarily (in production, use Redis with TTL)
        # For now, we'll use the secret as the setup ID validation
        
        return MFASetupResponse(
            method=MFAMethod.totp,
            qr_code=setup_result["qr_code"],
            secret=setup_result["secret"],
            backup_codes=setup_result["backup_codes"],
            message="Scan the QR code with your authenticator app and verify with a code",
            requires_verification=True,
            setup_id=setup_id
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error setting up MFA: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to setup MFA"
        )

@router.post("/enable", response_model=MFAEnableResponse)
async def enable_mfa(
    request: MFAEnableRequest,
    req: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify the setup code and enable MFA for the user.
    
    This endpoint completes the MFA setup process by verifying
    the user can generate valid TOTP codes.
    """
    try:
        # Verify and enable MFA
        success = MFAService.verify_and_enable_mfa(
            user_id=current_user.id,
            code=request.verification_code,
            db=db
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code"
            )
        
        # Get backup codes count
        backup_codes_count = db.query(MFABackupCode).filter(
            MFABackupCode.user_id == current_user.id,
            MFABackupCode.is_used == False
        ).count()
        
        # Generate device token if requested
        device_token = None
        if request.trust_device:
            # Generate device fingerprint (in production, use more sophisticated fingerprinting)
            device_fingerprint = f"{req.client.host}:{req.headers.get('user-agent', 'Unknown')}"
            device_fingerprint_hash = secrets.token_urlsafe(16)
            
            device_token = MFAService.trust_device(
                user_id=current_user.id,
                device_fingerprint=device_fingerprint_hash,
                device_name=f"Device at {req.client.host}",
                browser=req.headers.get("user-agent", "Unknown").split('/')[0] if req.headers.get("user-agent") else None,
                platform=None,  # Could parse from user-agent
                ip_address=req.client.host,
                db=db
            )
        
        return MFAEnableResponse(
            message="MFA has been successfully enabled",
            enabled=True,
            method=MFAMethod.totp,
            backup_codes_count=backup_codes_count,
            device_token=device_token
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error enabling MFA: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to enable MFA"
        )

@router.post("/verify", response_model=MFAVerificationResponse)
async def verify_mfa(
    request: MFAVerificationRequest,
    req: Request,
    db: Session = Depends(get_db),
    # Note: This endpoint is called during login, so we get user_id from session/context
    user_id: int = Query(..., description="User ID from login session")
):
    """
    Verify MFA code during login process.
    
    This endpoint is called after initial password authentication
    to complete the login with 2FA verification.
    """
    try:
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check if code is a backup code
        is_backup_code = len(request.code.replace("-", "")) > 6
        
        if is_backup_code:
            # Verify backup code
            success, error_msg = MFAService.verify_backup_code(
                user_id=user_id,
                code=request.code,
                db=db,
                ip_address=req.client.host,
                user_agent=req.headers.get("user-agent", "Unknown")
            )
            
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=error_msg or "Invalid backup code"
                )
        else:
            # Verify TOTP code
            success, error_msg = MFAService.verify_totp_code(
                user_id=user_id,
                code=request.code,
                db=db,
                ip_address=req.client.host,
                user_agent=req.headers.get("user-agent", "Unknown")
            )
            
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=error_msg or "Invalid verification code"
                )
        
        # Generate tokens after successful MFA
        access_token = create_access_token(
            data={"sub": user.email, "role": user.role}
        )
        refresh_token = create_refresh_token(
            data={"sub": user.email}
        )
        
        # Create MFA session for admin users
        mfa_session_token = None
        if user.role in ["admin", "super_admin"]:
            from middleware.mfa_enforcement import MFASessionManager
            # Get the middleware instance from app state
            mfa_middleware = getattr(req.app.state, 'mfa_middleware', None)
            if mfa_middleware:
                session_manager = MFASessionManager(mfa_middleware)
                mfa_session_token = session_manager.create_session(
                    user_id=user_id,
                    ip_address=req.client.host,
                    user_agent=req.headers.get("user-agent", "Unknown")
                )
        
        # Handle device trust
        device_token = None
        if request.remember_device:
            # Generate device fingerprint (in production, use more sophisticated fingerprinting)
            device_fingerprint = f"{req.client.host}:{req.headers.get('user-agent', 'Unknown')}"
            device_fingerprint_hash = secrets.token_urlsafe(16)
            
            device_token = MFAService.trust_device(
                user_id=user_id,
                device_fingerprint=device_fingerprint_hash,
                device_name=request.device_name or f"Device at {req.client.host}",
                browser=req.headers.get("user-agent", "Unknown").split('/')[0] if req.headers.get("user-agent") else None,
                platform=None,  # Could parse from user-agent
                ip_address=req.client.host,
                db=db
            )
        
        return MFAVerificationResponse(
            verified=True,
            access_token=access_token,
            refresh_token=refresh_token,
            device_token=device_token,
            mfa_session_token=mfa_session_token,
            message="MFA verification successful"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying MFA: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify MFA"
        )

@router.post("/disable", response_model=MFADisableResponse)
async def disable_mfa(
    request: MFADisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disable MFA for the current user.
    
    Requires password confirmation and optionally current MFA code
    for additional security.
    """
    try:
        # Verify password
        if not verify_password(request.password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password"
            )
        
        # If MFA is enabled, verify the code
        if request.verification_code:
            success, error_msg = MFAService.verify_totp_code(
                user_id=current_user.id,
                code=request.verification_code,
                db=db
            )
            
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid MFA code"
                )
        
        # Disable MFA
        success = MFAService.disable_mfa(
            user_id=current_user.id,
            reason="User requested",
            db=db
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MFA is not enabled for this account"
            )
        
        return MFADisableResponse(
            message="MFA has been successfully disabled",
            disabled=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disabling MFA: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disable MFA"
        )

@router.get("/status", response_model=MFAStatusResponse)
async def get_mfa_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the current MFA status for the user.
    
    Returns information about MFA enablement, backup codes,
    and trusted devices.
    """
    try:
        # Get MFA status
        mfa_secret = db.query(UserMFASecret).filter(
            UserMFASecret.user_id == current_user.id
        ).first()
        
        if not mfa_secret or not mfa_secret.is_enabled:
            return MFAStatusResponse(
                enabled=False,
                method=None,
                backup_codes_remaining=None,
                trusted_devices_count=0,
                last_verified=None
            )
        
        # Get backup codes count
        backup_codes_remaining = db.query(MFABackupCode).filter(
            MFABackupCode.user_id == current_user.id,
            MFABackupCode.is_used == False
        ).count()
        
        # Get trusted devices count
        trusted_devices_count = db.query(MFADeviceTrust).filter(
            MFADeviceTrust.user_id == current_user.id,
            MFADeviceTrust.is_revoked == False,
            MFADeviceTrust.expires_at > datetime.utcnow()
        ).count()
        
        return MFAStatusResponse(
            enabled=True,
            method=MFAMethod.totp,
            backup_codes_remaining=backup_codes_remaining,
            trusted_devices_count=trusted_devices_count,
            last_verified=mfa_secret.last_used_at
        )
        
    except Exception as e:
        logger.error(f"Error getting MFA status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get MFA status"
        )

@router.post("/backup-codes", response_model=BackupCodesResponse)
async def regenerate_backup_codes(
    request: BackupCodesRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate new backup codes for the user.
    
    This will invalidate all existing unused backup codes.
    Requires password and MFA verification.
    """
    try:
        # Verify password
        if not verify_password(request.password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password"
            )
        
        # Verify MFA code if provided
        if request.current_mfa_code:
            success, error_msg = MFAService.verify_totp_code(
                user_id=current_user.id,
                code=request.current_mfa_code,
                db=db
            )
            
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid MFA code"
                )
        
        # Generate new backup codes
        backup_codes = MFAService.regenerate_backup_codes(current_user.id, db)
        
        return BackupCodesResponse(
            backup_codes=backup_codes,
            generated_at=datetime.utcnow(),
            message="New backup codes generated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error regenerating backup codes: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to regenerate backup codes"
        )

@router.get("/trusted-devices", response_model=TrustedDevicesResponse)
async def list_trusted_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all trusted devices for the current user.
    
    Returns active devices that have been trusted for MFA bypass.
    """
    try:
        # Get trusted devices
        devices = db.query(MFADeviceTrust).filter(
            MFADeviceTrust.user_id == current_user.id,
            MFADeviceTrust.revoked_at == None,
            MFADeviceTrust.trusted_until > datetime.utcnow()
        ).order_by(MFADeviceTrust.last_used_at.desc()).all()
        
        # Convert to response format
        device_list = []
        for device in devices:
            device_list.append(TrustedDevice(
                id=device.trust_token[:8],  # Show partial token as ID
                name=device.device_name,
                last_used=device.last_used_at,
                created_at=device.created_at,
                user_agent=device.browser,
                ip_address=device.ip_address
            ))
        
        return TrustedDevicesResponse(
            devices=device_list,
            total=len(device_list)
        )
        
    except Exception as e:
        logger.error(f"Error listing trusted devices: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list trusted devices"
        )

@router.delete("/trusted-devices/{device_id}")
async def revoke_trusted_device(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Revoke trust for a specific device.
    
    The device will need to complete MFA verification on next login.
    """
    try:
        # Find device by partial token match
        devices = db.query(MFADeviceTrust).filter(
            MFADeviceTrust.user_id == current_user.id,
            MFADeviceTrust.revoked_at == None
        ).all()
        
        device_to_revoke = None
        for device in devices:
            if device.trust_token.startswith(device_id):
                device_to_revoke = device
                break
        
        if not device_to_revoke:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Device not found"
            )
        
        # Revoke device
        revoked_count = MFAService.revoke_device_trust(
            user_id=current_user.id,
            device_id=device_to_revoke.id,
            revoke_all=False,
            reason="User requested revocation",
            db=db
        )
        
        if revoked_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to revoke device trust"
            )
        
        return {"message": "Device trust revoked successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking device trust: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke device trust"
        )

@router.get("/events", response_model=MFAEventLogsResponse)
async def get_mfa_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, gt=0),
    per_page: int = Query(20, gt=0, le=100)
):
    """
    Get MFA audit events for the current user.
    
    Returns a paginated list of MFA-related security events.
    """
    try:
        # Calculate offset
        offset = (page - 1) * per_page
        
        # Get total count
        total = db.query(MFAEvent).filter(
            MFAEvent.user_id == current_user.id
        ).count()
        
        # Get events
        events = db.query(MFAEvent).filter(
            MFAEvent.user_id == current_user.id
        ).order_by(MFAEvent.created_at.desc()).offset(offset).limit(per_page).all()
        
        # Convert to response format
        event_list = []
        for event in events:
            event_list.append(MFAEventLog(
                event_type=event.event_type,
                timestamp=event.created_at,
                success=event.event_status == "success",
                method=MFAMethod.totp if event.event_type.startswith("totp") else None,
                ip_address=event.ip_address,
                user_agent=event.user_agent,
                error_message=event.event_details if event.event_status == "failure" else None
            ))
        
        return MFAEventLogsResponse(
            events=event_list,
            total=total,
            page=page,
            per_page=per_page
        )
        
    except Exception as e:
        logger.error(f"Error getting MFA events: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get MFA events"
        )