"""
Rate Limiting Administration Endpoints
Provides management interface for the enhanced rate limiting system
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

from config.database import get_db
from api.v1.auth import get_current_user
from models.user import User
from services.rate_limiting_service import rate_limiting_service
from utils.security import get_client_ip
from utils.secure_logging import get_secure_logger, log_security_event

router = APIRouter()
logger = get_secure_logger(__name__)


class AdminBypassRequest(BaseModel):
    ip_address: str
    reason: Optional[str] = None


class UnlockAccountRequest(BaseModel):
    email: EmailStr
    admin_override: bool = False
    reason: Optional[str] = None


class UnblockIPRequest(BaseModel):
    ip_address: str
    admin_override: bool = False
    reason: Optional[str] = None


def require_admin_user(current_user: User = Depends(get_current_user)):
    """Ensure current user has admin privileges"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required",
        )
    return current_user


@router.get("/stats")
async def get_rate_limiting_stats(admin_user: User = Depends(require_admin_user)):
    """Get comprehensive rate limiting statistics"""
    try:
        stats = rate_limiting_service.get_stats()

        return {
            "success": True,
            "stats": stats,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to get rate limiting stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve statistics",
        )


@router.get("/account-status/{email}")
async def get_account_status(
    email: str, admin_user: User = Depends(require_admin_user)
):
    """Get detailed status for a specific user account"""
    try:
        status_info = rate_limiting_service.get_account_status(email)

        return {
            "success": True,
            "email": email,
            "status": status_info,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to get account status for {email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve account status",
        )


@router.get("/ip-status/{ip_address}")
async def get_ip_status(
    ip_address: str, admin_user: User = Depends(require_admin_user)
):
    """Get detailed status for a specific IP address"""
    try:
        status_info = rate_limiting_service.get_ip_status(ip_address)

        return {
            "success": True,
            "ip_address": ip_address,
            "status": status_info,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to get IP status for {ip_address}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve IP status",
        )


@router.post("/unlock-account")
async def unlock_account(
    request: UnlockAccountRequest,
    admin_user: User = Depends(require_admin_user),
    http_request: Request = None,
):
    """Manually unlock a user account"""
    try:
        success = rate_limiting_service.unlock_account(
            email=request.email, admin_override=request.admin_override
        )

        if success:
            # Log admin action
            log_security_event(
                event_type="admin_account_unlock",
                description=f"Admin {admin_user.email} unlocked account {request.email}",
                user_id=admin_user.id,
                ip_address=get_client_ip(http_request) if http_request else None,
                additional_data={
                    "target_email": request.email,
                    "admin_email": admin_user.email,
                    "admin_override": request.admin_override,
                    "reason": request.reason,
                },
                severity="INFO",
            )

            logger.info(f"Admin {admin_user.email} unlocked account {request.email}")

            return {
                "success": True,
                "message": f"Account {request.email} has been unlocked",
                "admin_override": request.admin_override,
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to unlock account",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to unlock account {request.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unlock account",
        )


@router.post("/unblock-ip")
async def unblock_ip(
    request: UnblockIPRequest,
    admin_user: User = Depends(require_admin_user),
    http_request: Request = None,
):
    """Manually unblock an IP address"""
    try:
        success = rate_limiting_service.unblock_ip(
            ip_address=request.ip_address, admin_override=request.admin_override
        )

        if success:
            # Log admin action
            log_security_event(
                event_type="admin_ip_unblock",
                description=f"Admin {admin_user.email} unblocked IP {request.ip_address}",
                user_id=admin_user.id,
                ip_address=get_client_ip(http_request) if http_request else None,
                additional_data={
                    "target_ip": request.ip_address,
                    "admin_email": admin_user.email,
                    "admin_override": request.admin_override,
                    "reason": request.reason,
                },
                severity="INFO",
            )

            logger.info(f"Admin {admin_user.email} unblocked IP {request.ip_address}")

            return {
                "success": True,
                "message": f"IP {request.ip_address} has been unblocked",
                "admin_override": request.admin_override,
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to unblock IP address",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to unblock IP {request.ip_address}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unblock IP address",
        )


@router.post("/add-admin-bypass")
async def add_admin_bypass(
    request: AdminBypassRequest,
    admin_user: User = Depends(require_admin_user),
    http_request: Request = None,
):
    """Add IP to admin bypass list"""
    try:
        success = rate_limiting_service.add_admin_bypass_ip(request.ip_address)

        if success:
            # Log admin action
            log_security_event(
                event_type="admin_bypass_added",
                description=f"Admin {admin_user.email} added bypass for IP {request.ip_address}",
                user_id=admin_user.id,
                ip_address=get_client_ip(http_request) if http_request else None,
                additional_data={
                    "bypass_ip": request.ip_address,
                    "admin_email": admin_user.email,
                    "reason": request.reason,
                },
                severity="INFO",
            )

            logger.info(
                f"Admin {admin_user.email} added bypass for IP {request.ip_address}"
            )

            return {
                "success": True,
                "message": f"Admin bypass added for IP {request.ip_address}",
                "reason": request.reason,
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to add admin bypass",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add admin bypass for {request.ip_address}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add admin bypass",
        )


@router.delete("/remove-admin-bypass/{ip_address}")
async def remove_admin_bypass(
    ip_address: str,
    admin_user: User = Depends(require_admin_user),
    http_request: Request = None,
):
    """Remove IP from admin bypass list"""
    try:
        success = rate_limiting_service.remove_admin_bypass_ip(ip_address)

        if success:
            # Log admin action
            log_security_event(
                event_type="admin_bypass_removed",
                description=f"Admin {admin_user.email} removed bypass for IP {ip_address}",
                user_id=admin_user.id,
                ip_address=get_client_ip(http_request) if http_request else None,
                additional_data={
                    "bypass_ip": ip_address,
                    "admin_email": admin_user.email,
                },
                severity="INFO",
            )

            logger.info(f"Admin {admin_user.email} removed bypass for IP {ip_address}")

            return {
                "success": True,
                "message": f"Admin bypass removed for IP {ip_address}",
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to remove admin bypass",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to remove admin bypass for {ip_address}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove admin bypass",
        )


@router.get("/recent-blocks")
async def get_recent_blocks(
    limit: int = 50, admin_user: User = Depends(require_admin_user)
):
    """Get recent rate limiting blocks and violations"""
    try:
        # This would typically query a database or log system
        # For now, return basic stats from the service
        stats = rate_limiting_service.get_stats()

        return {
            "success": True,
            "recent_blocks": {
                "total_blocked_requests": stats["total_blocked_requests"],
                "total_user_lockouts": stats["total_user_lockouts"],
                "total_ip_blocks": stats["total_ip_blocks"],
                "currently_locked_accounts": stats["currently_locked_accounts"],
                "currently_blocked_ips": stats["currently_blocked_ips"],
                "recent_attempts_last_hour": stats["recent_attempts_last_hour"],
                "recent_failed_attempts_last_hour": stats[
                    "recent_failed_attempts_last_hour"
                ],
            },
            "limit": limit,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to get recent blocks: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve recent blocks",
        )


@router.get("/config")
async def get_rate_limiting_config(admin_user: User = Depends(require_admin_user)):
    """Get current rate limiting configuration"""
    try:
        # Return current configuration from the service
        config = {
            "login_rate_limit": {
                "max_requests": rate_limiting_service.rules["login"].max_requests,
                "window_seconds": rate_limiting_service.rules["login"].window_seconds,
                "block_duration_seconds": rate_limiting_service.rules[
                    "login"
                ].block_duration_seconds,
            },
            "register_rate_limit": {
                "max_requests": rate_limiting_service.rules["register"].max_requests,
                "window_seconds": rate_limiting_service.rules[
                    "register"
                ].window_seconds,
                "block_duration_seconds": rate_limiting_service.rules[
                    "register"
                ].block_duration_seconds,
            },
            "forgot_password_rate_limit": {
                "max_requests": rate_limiting_service.rules[
                    "forgot_password"
                ].max_requests,
                "window_seconds": rate_limiting_service.rules[
                    "forgot_password"
                ].window_seconds,
                "block_duration_seconds": rate_limiting_service.rules[
                    "forgot_password"
                ].block_duration_seconds,
            },
            "account_lockout_config": rate_limiting_service.account_lockout_config,
            "ip_blocking_config": rate_limiting_service.ip_blocking_config,
        }

        return {
            "success": True,
            "config": config,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to get rate limiting config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve configuration",
        )
