"""
Simplified authentication utilities that work with the current database schema.
This is a temporary workaround for the schema mismatch issue.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from config import settings

# Security settings
SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    """Create a JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token_simple(token: str):
    """Decode and validate a JWT token - simple version."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_user_from_token_simple(token: str, db: Session):
    """Get user information from JWT token using raw SQL."""
    try:
        # Decode and validate token
        payload = decode_token_simple(token)
        email: str = payload.get("sub")
        
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user from database using raw SQL
        result = db.execute(
            text("SELECT id, email, role, is_active, name, created_at FROM users WHERE email = :email"),
            {"email": email}
        )
        user_row = result.fetchone()
        
        if not user_row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Return user data as dict, accessing by index since it's a raw SQL result
        return {
            "id": user_row[0],
            "email": user_row[1],
            "role": user_row[2],
            "unified_role": user_row[2],  # For compatibility
            "is_active": bool(user_row[3]),
            "name": user_row[4] or user_row[1],
            "email_verified": True,  # Assume verified for simple auth
            "created_at": str(user_row[5]) if user_row[5] else None
        }
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        import traceback
        print(f"Token validation error: {e}")
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token validation failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

def authenticate_user_simple(db: Session, email: str, password: str):
    """Authenticate a user using raw SQL to avoid ORM schema issues."""
    try:
        print(f"Authenticating user: {email}")
        # Use raw SQL to query user
        result = db.execute(
            text("SELECT id, email, hashed_password, role, is_active FROM users WHERE email = :email"),
            {"email": email}
        )
        user_row = result.fetchone()
        
        if not user_row:
            print("User not found")
            return False
            
        print(f"User found, active: {user_row.is_active}")
        if not user_row.is_active:
            print("User not active")
            return False
            
        # Verify password
        print("Verifying password...")
        if not verify_password(password, user_row.hashed_password):
            print("Password verification failed")
            return False
            
        print("Authentication successful")
        # Return user data as dict
        return {
            "id": user_row.id,
            "email": user_row.email,
            "role": user_row.role,
            "is_active": user_row.is_active
        }
    except Exception as e:
        print(f"Authentication error: {e}")
        return False