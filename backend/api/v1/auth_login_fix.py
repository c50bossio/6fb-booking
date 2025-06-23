"""
Additional auth endpoints to match documented API
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import jwt

from config.database import get_db
from models.user import User
from .auth import (
    router as auth_router,
    Token,
    create_access_token,
    pwd_context,
    SECRET_KEY,
    ALGORITHM,
    UserLogin,
    log_security_event,
    get_client_ip,
    check_login_rate_limit,
    log_user_action,
)


# Add login endpoint as an alias to token
@auth_router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin, request: Request, db: Session = Depends(get_db)
):
    """
    User login endpoint - alias for /token endpoint
    This provides a more intuitive endpoint name
    """
    # Check rate limiting
    client_ip = get_client_ip(request)
    if not check_login_rate_limit(client_ip):
        log_security_event(
            event_type="login_rate_limit_exceeded",
            user_id=None,
            ip_address=client_ip,
            details={"email": credentials.email},
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
        )

    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not pwd_context.verify(credentials.password, user.hashed_password):
        log_security_event(
            event_type="login_failed",
            user_id=user.id if user else None,
            ip_address=client_ip,
            details={"email": credentials.email, "reason": "invalid_credentials"},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        log_security_event(
            event_type="login_failed",
            user_id=user.id,
            ip_address=client_ip,
            details={"reason": "account_inactive"},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support.",
        )

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id}, expires_delta=access_token_expires
    )

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Log successful login
    log_user_action(
        user_id=user.id,
        action="login",
        details={"method": "password"},
        ip_address=client_ip,
        db=db,
    )

    log_security_event(
        event_type="login_success",
        user_id=user.id,
        ip_address=client_ip,
        details={"method": "password"},
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "location_id": user.location_id,
        },
    }


# Add refresh endpoint
@auth_router.post("/refresh", response_model=Token)
async def refresh_token(
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Refresh access token
    """
    # Create new access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_user["email"], "user_id": current_user["id"]},
        expires_delta=access_token_expires,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }
