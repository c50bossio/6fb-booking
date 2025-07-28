from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Header
from sqlalchemy.orm import Session
from db import get_db
from config import settings
from models import User

# SECURITY ENHANCEMENT: Import secure JWT management
from utils.jwt_security import create_access_token, verify_token, get_key_manager

# SECURITY FIX: Import cookie-based authentication
from utils.cookie_auth import cookie_security

# Security settings - legacy for backward compatibility
SECRET_KEY = settings.secret_key  # Kept for non-JWT operations
ALGORITHM = "RS256"  # SECURITY FIX: Use asymmetric algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# SECURITY FIX: Use cookie-aware bearer token security  
security = cookie_security

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)

def create_access_token_legacy(data: dict, expires_delta: Optional[timedelta] = None):
    """DEPRECATED: Create a JWT access token using symmetric keys."""
    # This function is kept for backward compatibility only
    return create_access_token(data, expires_delta)

# SECURITY FIX: Use secure asymmetric token creation
# The create_access_token function is now imported from jwt_security module

def create_refresh_token(data: dict):
    """Create a JWT refresh token using secure asymmetric signing."""
    expires_delta = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = data.copy()
    to_encode.update({"type": "refresh"})
    
    # SECURITY FIX: Use secure asymmetric token creation
    return create_access_token(to_encode, expires_delta)

def decode_token(token: str):
    """Decode and validate a JWT token using secure asymmetric verification."""
    try:
        # SECURITY FIX: Use secure asymmetric token verification
        payload = verify_token(token)
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get the current authenticated user from JWT token with blacklist checking."""
    token = credentials.credentials
    
    # Check if token is blacklisted first
    from services.token_blacklist import is_token_blacklisted
    if is_token_blacklisted(token):
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
    
    # Add timeout protection and error handling for database query
    try:
        # Query user with error handling
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user
    except HTTPException:
        # Re-raise HTTP exceptions (like User not found)
        raise
    except Exception as e:
        # Log the error for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error loading user {email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during authentication",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get the current authenticated user from JWT token if provided, otherwise return None."""
    if not authorization:
        return None
    
    # Extract token from Authorization header
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return None
    except ValueError:
        return None
        
    try:
        payload = decode_token(token)
        email: str = payload.get("sub")
        if email is None:
            return None
            
        user = db.query(User).filter(User.email == email).first()
        return user
    except (JWTError, HTTPException):
        return None


async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get the current user and verify they have admin privileges."""
    # Check if user has admin role (adjust based on your role system)
    if current_user.role not in ["admin", "super_admin", "platform_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Admin access required."
        )
    return current_user

def authenticate_user(db: Session, email: str, password: str):
    """Authenticate a user by email and password."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def verify_refresh_token(token: str, db: Session) -> User:
    """Verify a refresh token and return the user."""
    try:
        payload = decode_token(token)
        token_type = payload.get("type")
        
        if token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        return user
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

def require_admin_role(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to ensure current user has admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def verify_admin_or_barber(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to ensure current user has admin or barber role."""
    if current_user.role not in ["admin", "barber"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or barber access required"
        )
    return current_user

def require_barber_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to ensure current user has barber or admin role."""
    if current_user.role not in ["barber", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Barber or admin access required"
        )
    return current_user