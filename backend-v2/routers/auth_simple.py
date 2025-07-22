"""
Simplified authentication router that works with current database schema.
This is a temporary workaround for the schema mismatch issue.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import timedelta
from database import get_db
from utils.auth_simple import (
    authenticate_user_simple, 
    create_access_token,
    create_refresh_token,
    get_user_from_token_simple,
    decode_token_simple,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from pydantic import BaseModel, EmailStr
from typing import Optional

# Simple schemas to avoid circular import issues
class SimpleUserLogin(BaseModel):
    email: EmailStr
    password: str

class SimpleToken(BaseModel):
    access_token: str
    refresh_token: str = None
    token_type: str = "bearer"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# Bearer token security for the simple auth system
security = HTTPBearer()

router = APIRouter(prefix="/auth-simple", tags=["authentication-simple"])

@router.get("/test")
async def test_auth_route():
    """Simple test endpoint to verify auth router is working"""
    return {"status": "ok", "message": "Simple auth router is responding"}

@router.get("/me")
async def get_current_user_simple(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get current user profile - simple version with JWT validation"""
    token = credentials.credentials
    
    # Validate token and get user data
    user_data = get_user_from_token_simple(token, db)
    
    return user_data

@router.post("/login", response_model=SimpleToken)
async def login_simple(request: Request, user_credentials: SimpleUserLogin, db: Session = Depends(get_db)):
    """Simple login endpoint that works with current database schema."""
    user = authenticate_user_simple(db, user_credentials.email, user_credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"]},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": user["email"]}
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=SimpleToken)
async def refresh_token_simple(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token."""
    try:
        # Validate refresh token
        payload = decode_token_simple(request.refresh_token)
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
        
        # Verify user still exists and is active
        from sqlalchemy import text
        result = db.execute(
            text("SELECT role FROM users WHERE email = :email AND is_active = true"),
            {"email": email}
        )
        user_row = result.fetchone()
        
        if not user_row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Create new tokens
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        new_access_token = create_access_token(
            data={"sub": email, "role": user_row.role},
            expires_delta=access_token_expires
        )
        new_refresh_token = create_refresh_token(
            data={"sub": email}
        )
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        print(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed"
        )