"""
Secure Authentication Module - Production Ready
This module replaces the vulnerable auth.py with secure authentication handling.
Removes all development bypasses and implements proper security controls.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from db import get_db
from config import settings
from models import User
import logging

# SECURITY ENHANCEMENT: Import secure JWT management
from utils.jwt_security import create_access_token, verify_token, get_key_manager
from utils.cookie_auth import cookie_security

logger = logging.getLogger(__name__)

# Security settings with enhanced algorithms
SECRET_KEY = settings.secret_key
ALGORITHM = "RS256"  # Asymmetric algorithm for enhanced security
ACCESS_TOKEN_EXPIRE_MINUTES = 15  # Short-lived tokens
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing with enhanced security
pwd_context = CryptContext(
    schemes=["bcrypt"], 
    deprecated="auto",
    bcrypt__rounds=12  # Enhanced security rounds
)

# Secure bearer token security
security = cookie_security

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash with timing attack protection."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

def get_password_hash(password: str) -> str:
    """Hash a password with secure bcrypt implementation."""
    return pwd_context.hash(password)

def create_refresh_token(data: dict):
    """Create a JWT refresh token using secure asymmetric signing."""
    expires_delta = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = data.copy()
    to_encode.update({"type": "refresh"})
    
    return create_access_token(to_encode, expires_delta)

def decode_token(token: str):
    """Decode and validate a JWT token using secure asymmetric verification."""
    try:
        payload = verify_token(token)
        return payload
    except JWTError as e:
        logger.warning(f"Token validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get the current authenticated user from JWT token with comprehensive security checks.
    
    SECURITY NOTE: All development bypasses have been removed for production security.
    """
    token = credentials.credentials
    
    # SECURITY: Development bypass completely removed for production safety
    # No authentication bypasses allowed in any environment
    
    # Check if token is blacklisted first
    from services.token_blacklist import is_token_blacklisted
    if is_token_blacklisted(token):
        logger.warning("Attempted use of blacklisted token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = decode_token(token)
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if user is globally blacklisted
        from services.token_blacklist import get_token_blacklist_service
        blacklist_service = get_token_blacklist_service()
        if blacklist_service.is_user_blacklisted(email):
            logger.warning(f"Blacklisted user attempted access: {email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User access has been revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Enhanced database query with error handling
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            logger.warning(f"Token valid but user not found: {email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Additional user validation
        if not user.is_active:
            logger.warning(f"Inactive user attempted access: {email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return user
        
    except Exception as e:
        logger.error(f"Database error during user authentication: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service temporarily unavailable"
        )

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """
    Authenticate a user with enhanced security measures.
    
    Args:
        db: Database session
        email: User email address
        password: Plain text password
        
    Returns:
        User object if authentication successful, None otherwise
    """
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            # Perform dummy password verification to prevent timing attacks
            pwd_context.verify("dummy_password", "$2b$12$dummy.hash.to.prevent.timing.attacks")
            return None
        
        if not verify_password(password, user.hashed_password):
            return None
            
        if not user.is_active:
            logger.warning(f"Inactive user login attempt: {email}")
            return None
            
        return user
        
    except Exception as e:
        logger.error(f"Authentication error for user {email}: {e}")
        return None

class SecureAuthDependency:
    """Enhanced authentication dependency with role-based access control."""
    
    def __init__(self, required_roles: Optional[list] = None):
        self.required_roles = required_roles or []
    
    async def __call__(
        self,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        """Verify user has required roles for access."""
        if self.required_roles:
            user_role = current_user.unified_role if hasattr(current_user, 'unified_role') and current_user.unified_role else current_user.role
            
            if user_role not in self.required_roles:
                logger.warning(
                    f"Access denied for user {current_user.email} with role {user_role}. "
                    f"Required roles: {self.required_roles}"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions"
                )
        
        return current_user

# Pre-configured role dependencies for common use cases
require_admin = SecureAuthDependency(["admin", "super_admin"])
require_barber = SecureAuthDependency(["barber", "shop_owner", "enterprise_owner", "admin", "super_admin"])
require_shop_owner = SecureAuthDependency(["shop_owner", "enterprise_owner", "admin", "super_admin"])
require_enterprise = SecureAuthDependency(["enterprise_owner", "admin", "super_admin"])

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user (legacy compatibility)."""
    return current_user