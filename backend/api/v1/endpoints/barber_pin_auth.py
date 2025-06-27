"""
Barber PIN Authentication API Endpoints
Provides secure PIN-based authentication for POS access with comprehensive session management.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from config.database import get_db
from services.barber_pin_service import (
    BarberPINService,
    PINError,
    PINValidationError,
    PINLockoutError,
)
from models.barber import Barber

router = APIRouter(prefix="/barber-pin", tags=["Barber PIN Authentication"])
security = HTTPBearer()


# Request/Response Models
class PINSetupRequest(BaseModel):
    barber_id: int = Field(..., description="Barber ID")
    pin: str = Field(..., min_length=4, max_length=6, description="4-6 digit PIN")

    @validator("pin")
    def validate_pin(cls, v):
        if not v.isdigit():
            raise ValueError("PIN must contain only digits")
        return v


class PINAuthRequest(BaseModel):
    barber_id: int = Field(..., description="Barber ID")
    pin: str = Field(..., min_length=4, max_length=6, description="4-6 digit PIN")
    device_info: Optional[str] = Field(None, description="Device/browser information")


class PINChangeRequest(BaseModel):
    barber_id: int = Field(..., description="Barber ID")
    current_pin: str = Field(..., min_length=4, max_length=6, description="Current PIN")
    new_pin: str = Field(..., min_length=4, max_length=6, description="New PIN")

    @validator("new_pin")
    def validate_new_pin(cls, v):
        if not v.isdigit():
            raise ValueError("PIN must contain only digits")
        return v


class SessionValidationRequest(BaseModel):
    session_token: str = Field(..., description="POS session token")


class SessionExtendRequest(BaseModel):
    session_token: str = Field(..., description="POS session token")
    hours: int = Field(default=4, ge=1, le=8, description="Hours to extend (1-8)")


class PINResetRequest(BaseModel):
    barber_id: int = Field(..., description="Barber ID")
    admin_token: str = Field(..., description="Admin authorization token")


# Response Models
class PINSetupResponse(BaseModel):
    success: bool
    message: str


class PINAuthResponse(BaseModel):
    success: bool
    session_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    message: Optional[str] = None


class PINStatusResponse(BaseModel):
    has_pin: bool
    pin_attempts: int
    is_locked: bool
    locked_until: Optional[datetime] = None
    last_used: Optional[datetime] = None
    max_attempts: int


class SessionInfoResponse(BaseModel):
    valid: bool
    barber_id: Optional[int] = None
    device_info: Optional[str] = None
    expires_at: Optional[datetime] = None
    last_activity: Optional[datetime] = None


class ActiveSessionsResponse(BaseModel):
    sessions: list
    count: int


def get_client_ip(request: Request) -> str:
    """Extract client IP address from request"""
    return request.client.host


def get_pin_service(db: Session = Depends(get_db)) -> BarberPINService:
    """Dependency to get PIN service instance"""
    return BarberPINService(db)


@router.post("/setup", response_model=PINSetupResponse)
async def setup_pin(
    request: PINSetupRequest, pin_service: BarberPINService = Depends(get_pin_service)
):
    """
    Set up PIN for barber POS access
    """
    try:
        pin_service.set_pin(request.barber_id, request.pin)
        return PINSetupResponse(success=True, message="PIN set up successfully")
    except PINValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PINError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/authenticate", response_model=PINAuthResponse)
async def authenticate_pin(
    request: PINAuthRequest,
    http_request: Request,
    pin_service: BarberPINService = Depends(get_pin_service),
):
    """
    Authenticate barber with PIN for POS access
    """
    try:
        success, error_message = pin_service.verify_pin(request.barber_id, request.pin)

        if success:
            # Create POS session
            client_ip = get_client_ip(http_request)
            session_token = pin_service.create_pos_session(
                barber_id=request.barber_id,
                device_info=request.device_info,
                ip_address=client_ip,
            )

            # Get session info for response
            _, session_info = pin_service.validate_session(session_token)

            return PINAuthResponse(
                success=True,
                session_token=session_token,
                expires_at=session_info["expires_at"],
                message="Authentication successful",
            )
        else:
            return PINAuthResponse(success=False, message=error_message)

    except PINError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/change", response_model=PINSetupResponse)
async def change_pin(
    request: PINChangeRequest, pin_service: BarberPINService = Depends(get_pin_service)
):
    """
    Change PIN for barber (requires current PIN verification)
    """
    try:
        # Verify current PIN first
        success, error_message = pin_service.verify_pin(
            request.barber_id, request.current_pin
        )

        if not success:
            return PINSetupResponse(
                success=False,
                message=f"Current PIN verification failed: {error_message}",
            )

        # Set new PIN
        pin_service.set_pin(request.barber_id, request.new_pin)

        # Logout all existing sessions for security
        pin_service.logout_all_sessions(request.barber_id, "pin_changed")

        return PINSetupResponse(
            success=True,
            message="PIN changed successfully. All sessions have been logged out.",
        )

    except PINValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PINError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/validate-session", response_model=SessionInfoResponse)
async def validate_session(
    request: SessionValidationRequest,
    pin_service: BarberPINService = Depends(get_pin_service),
):
    """
    Validate POS session token
    """
    is_valid, session_info = pin_service.validate_session(request.session_token)

    if is_valid:
        return SessionInfoResponse(
            valid=True,
            barber_id=session_info["barber_id"],
            device_info=session_info["device_info"],
            expires_at=session_info["expires_at"],
            last_activity=session_info["last_activity"],
        )
    else:
        return SessionInfoResponse(valid=False)


@router.post("/extend-session")
async def extend_session(
    request: SessionExtendRequest,
    pin_service: BarberPINService = Depends(get_pin_service),
):
    """
    Extend POS session duration
    """
    success = pin_service.extend_session(request.session_token, request.hours)

    if success:
        return {
            "success": True,
            "message": f"Session extended by {request.hours} hours",
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or already expired",
        )


@router.post("/logout")
async def logout_session(
    request: SessionValidationRequest,
    pin_service: BarberPINService = Depends(get_pin_service),
):
    """
    Logout from POS session
    """
    success = pin_service.logout_session(request.session_token, "manual")

    if success:
        return {"success": True, "message": "Logged out successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )


@router.post("/logout-all/{barber_id}")
async def logout_all_sessions(
    barber_id: int, pin_service: BarberPINService = Depends(get_pin_service)
):
    """
    Logout all active sessions for a barber
    """
    count = pin_service.logout_all_sessions(barber_id, "manual_all")

    return {
        "success": True,
        "message": f"Logged out {count} active sessions",
        "sessions_logged_out": count,
    }


@router.get("/sessions/{barber_id}", response_model=ActiveSessionsResponse)
async def get_active_sessions(
    barber_id: int, pin_service: BarberPINService = Depends(get_pin_service)
):
    """
    Get all active POS sessions for a barber
    """
    sessions = pin_service.get_active_sessions(barber_id)

    return ActiveSessionsResponse(sessions=sessions, count=len(sessions))


@router.get("/status/{barber_id}", response_model=PINStatusResponse)
async def get_pin_status(
    barber_id: int, pin_service: BarberPINService = Depends(get_pin_service)
):
    """
    Get PIN status information for a barber
    """
    try:
        status_info = pin_service.get_pin_status(barber_id)

        return PINStatusResponse(
            has_pin=status_info["has_pin"],
            pin_attempts=status_info["pin_attempts"],
            is_locked=status_info["is_locked"],
            locked_until=status_info["locked_until"],
            last_used=status_info["last_used"],
            max_attempts=status_info["max_attempts"],
        )

    except PINError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/reset")
async def reset_pin_attempts(
    request: PINResetRequest, pin_service: BarberPINService = Depends(get_pin_service)
):
    """
    Reset PIN attempts (admin function)
    Note: In production, this should be protected with proper admin authentication
    """
    # TODO: Add proper admin authentication
    # For now, just check if admin_token is provided
    if not request.admin_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin token required"
        )

    success = pin_service.reset_pin_attempts(request.barber_id)

    if success:
        return {"success": True, "message": "PIN attempts reset successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )


@router.post("/cleanup-sessions")
async def cleanup_expired_sessions(
    pin_service: BarberPINService = Depends(get_pin_service),
):
    """
    Cleanup expired POS sessions (maintenance endpoint)
    Note: This should be called periodically or protected with admin auth
    """
    count = pin_service.cleanup_expired_sessions()

    return {
        "success": True,
        "message": f"Cleaned up {count} expired sessions",
        "sessions_cleaned": count,
    }


# Middleware endpoint for POS access verification
@router.get("/verify-access")
async def verify_pos_access(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    pin_service: BarberPINService = Depends(get_pin_service),
):
    """
    Verify POS access token (middleware endpoint)
    Used by POS system to verify session validity
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
        )

    session_token = credentials.credentials
    is_valid, session_info = pin_service.validate_session(session_token)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    return {
        "authorized": True,
        "barber_id": session_info["barber_id"],
        "expires_at": session_info["expires_at"],
    }
