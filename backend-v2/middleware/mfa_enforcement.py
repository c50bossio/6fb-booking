"""
Multi-Factor Authentication (MFA) Enforcement Middleware

Enforces MFA verification for sensitive admin routes and operations.
"""

import json
import time
import logging
from typing import Optional, Dict, Set
from datetime import datetime, timedelta
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from sqlalchemy.orm import Session
import jwt
from jwt import InvalidTokenError

from config import settings
from database import SessionLocal
from models import User
from models.mfa import UserMFASecret, MFAEvent
from services.mfa_service import MFAService

logger = logging.getLogger(__name__)


class MFAEnforcementMiddleware(BaseHTTPMiddleware):
    """
    Middleware to enforce MFA verification for sensitive admin operations.
    
    Features:
    - Requires MFA for admin-only endpoints
    - Tracks MFA session state
    - Allows grace period for MFA verification
    - Provides clear error messages for MFA requirements
    """
    
    # Endpoints that require MFA verification
    MFA_REQUIRED_PATHS = {
        # User management - high risk
        "/api/v2/users/delete",
        "/api/v2/users/bulk-delete",
        "/api/v2/users/role",
        "/api/v2/users/permissions",
        
        # Payment operations - critical
        "/api/v2/payments/refunds",
        "/api/v2/payments/payouts",
        "/api/v2/payments/manual-capture",
        "/api/v2/payments/bulk-refund",
        
        # Commission management
        "/api/v2/commissions/payout",
        "/api/v2/commissions/bulk-payout",
        "/api/v2/commissions/adjust",
        
        # System configuration
        "/api/v2/config",
        "/api/v2/settings/security",
        "/api/v2/settings/payment",
        
        # Integration management
        "/api/v2/integrations/admin",
        "/api/v2/integrations/disconnect-all",
        
        # Audit and compliance
        "/api/v2/audit/export",
        "/api/v2/privacy/data-export",
        "/api/v2/privacy/data-deletion",
        
        # API key management
        "/api/v2/api-keys/create",
        "/api/v2/api-keys/revoke",
        
        # Webhook management
        "/api/v2/webhooks/admin",
        "/api/v2/webhooks/test-all",
    }
    
    # Path prefixes that always require MFA for admins
    MFA_REQUIRED_PREFIXES = {
        "/api/v2/admin/",
        "/api/v2/super-admin/",
        "/api/v2/system/",
        "/api/v2/database/",
    }
    
    def __init__(self, app):
        super().__init__(app)
        # MFA session duration (minutes)
        self.mfa_session_duration = getattr(settings, 'MFA_SESSION_DURATION', 30)
        # Cache for MFA session validation
        self.mfa_sessions: Dict[str, Dict] = {}
        
    async def dispatch(self, request: Request, call_next):
        """Process request with MFA enforcement"""
        
        # Check if this endpoint requires MFA
        if not self._requires_mfa(request):
            return await call_next(request)
            
        # Extract user from request
        user = await self._get_user_from_request(request)
        if not user:
            return await call_next(request)
            
        # Check if user is admin
        if user.role not in ["admin", "super_admin"]:
            return await call_next(request)
            
        # Get database session
        db = SessionLocal()
        try:
            # Check if user has MFA enabled
            mfa_status = await self._get_user_mfa_status(user.id, db)
            
            if not mfa_status["enabled"]:
                # MFA not enabled - require setup
                return self._mfa_setup_required_response()
                
            # Check if user has valid MFA session
            if not await self._has_valid_mfa_session(user.id, request):
                # Log MFA verification required
                self._log_mfa_event(
                    user_id=user.id,
                    event_type="mfa_verification_required",
                    event_status="pending",
                    endpoint=str(request.url.path),
                    ip_address=self._get_client_ip(request),
                    db=db
                )
                return self._mfa_verification_required_response()
                
            # MFA verified - update session activity
            await self._update_mfa_session_activity(user.id)
            
            # Log successful MFA-protected access
            self._log_mfa_event(
                user_id=user.id,
                event_type="mfa_protected_access",
                event_status="success",
                endpoint=str(request.url.path),
                ip_address=self._get_client_ip(request),
                db=db
            )
            
        except Exception as e:
            logger.error(f"MFA enforcement error: {str(e)}")
            # Don't block on errors, but log them
        finally:
            db.close()
            
        # Process request
        return await call_next(request)
    
    def _requires_mfa(self, request: Request) -> bool:
        """Check if the requested endpoint requires MFA"""
        path = request.url.path
        
        # Check exact path matches
        if path in self.MFA_REQUIRED_PATHS:
            return True
            
        # Check prefix matches
        for prefix in self.MFA_REQUIRED_PREFIXES:
            if path.startswith(prefix):
                return True
                
        # Check if it's a destructive operation
        if request.method in ["DELETE", "PUT", "PATCH"]:
            # Additional checks for sensitive operations
            sensitive_keywords = ["user", "payment", "refund", "config", "setting", "admin"]
            path_lower = path.lower()
            if any(keyword in path_lower for keyword in sensitive_keywords):
                return True
                
        return False
    
    async def _get_user_from_request(self, request: Request) -> Optional[User]:
        """Extract user from JWT token in request"""
        try:
            # Get authorization header
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return None
                
            # Extract and decode token
            token = auth_header.split(" ")[1]
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=[settings.ALGORITHM]
            )
            
            # Get user from database
            user_email = payload.get("sub")
            if not user_email:
                return None
                
            db = SessionLocal()
            try:
                user = db.query(User).filter(User.email == user_email).first()
                return user
            finally:
                db.close()
                
        except InvalidTokenError:
            logger.warning("Invalid JWT token in MFA middleware")
            return None
        except Exception as e:
            logger.error(f"Error extracting user from request: {str(e)}")
            return None
    
    async def _get_user_mfa_status(self, user_id: int, db: Session) -> Dict:
        """Get MFA status for user"""
        try:
            mfa_secret = db.query(UserMFASecret).filter(
                UserMFASecret.user_id == user_id
            ).first()
            
            if not mfa_secret:
                return {"enabled": False, "verified": False}
                
            return {
                "enabled": mfa_secret.is_enabled,
                "verified": mfa_secret.is_verified,
                "last_used": mfa_secret.last_used_at
            }
        except Exception as e:
            logger.error(f"Error getting MFA status: {str(e)}")
            return {"enabled": False, "verified": False}
    
    async def _has_valid_mfa_session(self, user_id: int, request: Request) -> bool:
        """Check if user has valid MFA session"""
        # Check for MFA session token in header or cookie
        mfa_token = request.headers.get("X-MFA-Token")
        if not mfa_token:
            # Check cookies as fallback
            mfa_token = request.cookies.get("mfa_session")
            
        if not mfa_token:
            return False
            
        # Validate session token
        session_key = f"{user_id}:{mfa_token}"
        session_data = self.mfa_sessions.get(session_key)
        
        if not session_data:
            return False
            
        # Check if session is expired
        if datetime.utcnow() > session_data["expires_at"]:
            # Remove expired session
            del self.mfa_sessions[session_key]
            return False
            
        # Validate session properties
        request_ip = self._get_client_ip(request)
        if session_data.get("ip_address") != request_ip:
            # IP address changed - require re-verification
            logger.warning(f"MFA session IP mismatch for user {user_id}")
            return False
            
        return True
    
    async def _update_mfa_session_activity(self, user_id: int):
        """Update last activity time for MFA session"""
        # Find active session for user
        for key, session_data in self.mfa_sessions.items():
            if key.startswith(f"{user_id}:"):
                session_data["last_activity"] = datetime.utcnow()
                break
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    def _log_mfa_event(
        self,
        user_id: int,
        event_type: str,
        event_status: str,
        endpoint: str,
        ip_address: str,
        db: Session
    ):
        """Log MFA enforcement event"""
        try:
            event = MFAEvent(
                user_id=user_id,
                event_type=f"enforcement_{event_type}",
                event_status=event_status,
                event_details=f"Endpoint: {endpoint}",
                ip_address=ip_address,
                user_agent=None  # Could extract from request if needed
            )
            db.add(event)
            db.commit()
        except Exception as e:
            logger.error(f"Error logging MFA event: {str(e)}")
            db.rollback()
    
    def _mfa_setup_required_response(self) -> JSONResponse:
        """Response when MFA setup is required"""
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "detail": "Multi-Factor Authentication (MFA) is required for admin accounts",
                "error_code": "MFA_SETUP_REQUIRED",
                "action_required": "setup_mfa",
                "setup_url": "/api/v2/mfa/setup",
                "documentation": "/docs/security/mfa-setup"
            }
        )
    
    def _mfa_verification_required_response(self) -> JSONResponse:
        """Response when MFA verification is required"""
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "detail": "MFA verification required for this operation",
                "error_code": "MFA_VERIFICATION_REQUIRED",
                "action_required": "verify_mfa",
                "verification_url": "/api/v2/mfa/verify",
                "mfa_session_duration": self.mfa_session_duration
            },
            headers={
                "WWW-Authenticate": 'Bearer realm="MFA", error="mfa_required"'
            }
        )
    
    def create_mfa_session(
        self, 
        user_id: int, 
        ip_address: str,
        user_agent: Optional[str] = None
    ) -> str:
        """
        Create a new MFA session after successful verification.
        This method should be called by the MFA verification endpoint.
        """
        import secrets
        
        # Generate secure session token
        session_token = secrets.token_urlsafe(32)
        
        # Create session data
        session_data = {
            "user_id": user_id,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(minutes=self.mfa_session_duration),
            "last_activity": datetime.utcnow(),
            "ip_address": ip_address,
            "user_agent": user_agent
        }
        
        # Store session
        session_key = f"{user_id}:{session_token}"
        self.mfa_sessions[session_key] = session_data
        
        # Clean up old sessions periodically
        self._cleanup_expired_sessions()
        
        return session_token
    
    def revoke_mfa_session(self, user_id: int, session_token: Optional[str] = None):
        """
        Revoke MFA session(s) for a user.
        If session_token is provided, revoke specific session.
        Otherwise, revoke all sessions for the user.
        """
        if session_token:
            # Revoke specific session
            session_key = f"{user_id}:{session_token}"
            if session_key in self.mfa_sessions:
                del self.mfa_sessions[session_key]
        else:
            # Revoke all sessions for user
            keys_to_remove = [
                key for key in self.mfa_sessions.keys() 
                if key.startswith(f"{user_id}:")
            ]
            for key in keys_to_remove:
                del self.mfa_sessions[key]
    
    def _cleanup_expired_sessions(self):
        """Remove expired MFA sessions"""
        current_time = datetime.utcnow()
        expired_keys = [
            key for key, data in self.mfa_sessions.items()
            if data["expires_at"] < current_time
        ]
        for key in expired_keys:
            del self.mfa_sessions[key]


class MFASessionManager:
    """
    Utility class for managing MFA sessions.
    Can be used by other parts of the application to interact with MFA sessions.
    """
    
    def __init__(self, middleware: MFAEnforcementMiddleware):
        self.middleware = middleware
    
    def create_session(
        self, 
        user_id: int, 
        ip_address: str,
        user_agent: Optional[str] = None
    ) -> str:
        """Create a new MFA session"""
        return self.middleware.create_mfa_session(user_id, ip_address, user_agent)
    
    def revoke_session(self, user_id: int, session_token: Optional[str] = None):
        """Revoke MFA session(s)"""
        self.middleware.revoke_mfa_session(user_id, session_token)
    
    def is_session_valid(self, user_id: int, session_token: str) -> bool:
        """Check if MFA session is valid"""
        session_key = f"{user_id}:{session_token}"
        session_data = self.middleware.mfa_sessions.get(session_key)
        
        if not session_data:
            return False
            
        if datetime.utcnow() > session_data["expires_at"]:
            return False
            
        return True