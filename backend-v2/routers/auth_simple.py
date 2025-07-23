"""
Simplified authentication router that works with current database schema.
This is a temporary workaround for the schema mismatch issue.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import timedelta
from db import get_db
from utils.auth_simple import (
    authenticate_user_simple, 
    create_access_token,
    create_refresh_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from utils.rate_limit import login_rate_limit  # CRITICAL: Rate limiting for security
import schemas

router = APIRouter(prefix="/auth-simple", tags=["authentication-simple"])

@router.get("/test")
async def test_auth_route():
    """Simple test endpoint to verify auth router is working"""
    return {"status": "ok", "message": "Simple auth router is responding"}

@router.post("/login", response_model=schemas.Token)
@login_rate_limit  # CRITICAL: Rate limiting for login security
async def login_simple(request: Request, user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
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