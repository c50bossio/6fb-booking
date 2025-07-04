from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import timedelta
import logging
from database import get_db
from utils.rate_limit import login_rate_limit, refresh_rate_limit, password_reset_rate_limit, register_rate_limit
from utils.auth import (
    authenticate_user, 
    create_access_token,
    create_refresh_token,
    verify_refresh_token, 
    get_current_user,
    get_password_hash,
    verify_password,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from utils.password_reset import (
    create_password_reset_token,
    verify_reset_token,
    use_reset_token,
    send_reset_email
)
from utils.email_verification import (
    create_verification_token,
    verify_email_token,
    send_verification_email,
    resend_verification_email
)
import schemas
import models

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.get("/test")
async def test_auth_route():
    """Simple test endpoint to verify auth router is working"""
    return {"status": "ok", "message": "Auth router is responding"}

@router.post("/login", response_model=schemas.Token)
# @login_rate_limit  # Temporarily disabled for debugging
async def login(request: Request, user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login endpoint that returns a JWT access token."""
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if email is verified
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address not verified. Please check your email and click the verification link to complete your account setup.",
            headers={"X-Verification-Required": "true"}
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": user.email}
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=schemas.Token)
@refresh_rate_limit
async def refresh_token(
    request: Request,
    refresh_request: schemas.RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token."""
    user = verify_refresh_token(refresh_request.refresh_token, db)
    
    # Create new access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role},
        expires_delta=access_token_expires
    )
    
    # Create new refresh token (rotate for security)
    new_refresh_token = create_refresh_token(
        data={"sub": user.email}
    )
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=schemas.User)
async def get_me(current_user: models.User = Depends(get_current_user)):
    """Get current user information."""
    return current_user

@router.post("/forgot-password", response_model=schemas.PasswordResetResponse)
@password_reset_rate_limit
async def forgot_password(
    request: Request,
    reset_request: schemas.PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """Request a password reset token via email."""
    # Find user by email
    user = db.query(models.User).filter(models.User.email == reset_request.email).first()
    
    # Always return success even if user not found (security best practice)
    if not user:
        return {"message": "If the email exists, a reset link has been sent"}
    
    # Create reset token
    reset_token = create_password_reset_token(db, user)
    
    # Send email (in production, this would be async)
    send_reset_email(user.email, reset_token.token, user.name)
    
    return {"message": "If the email exists, a reset link has been sent"}

@router.post("/reset-password", response_model=schemas.PasswordResetResponse)
async def reset_password(
    reset_confirm: schemas.PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """Reset password using a valid reset token."""
    # Verify token and get user
    user = verify_reset_token(db, reset_confirm.token)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Update password
    user.hashed_password = get_password_hash(reset_confirm.new_password)
    
    # Mark token as used
    use_reset_token(db, reset_confirm.token)
    
    db.commit()
    
    return {"message": "Password successfully reset"}

@router.post("/register", response_model=schemas.RegistrationResponse)
@register_rate_limit
async def register(
    request: Request,
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user."""
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = models.User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hashed_password
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create verification token and send verification email
    try:
        verification_token = create_verification_token(db, new_user)
        send_verification_email(new_user.email, verification_token, new_user.name)
        logger.info(f"Verification email sent to {new_user.email}")
    except Exception as e:
        logger.error(f"Failed to send verification email to {new_user.email}: {str(e)}")
        # Continue with registration even if email fails
    
    # Create test data if requested
    if user_data.create_test_data:
        try:
            from services import test_data_service
            test_data_service.create_test_data_for_user(db, new_user.id, include_enterprise=False)
            db.commit()
        except Exception as e:
            # Log error but don't fail registration
            logger.error(f"Failed to create test data for user {new_user.id}: {str(e)}")
    
    return {
        "message": "User successfully registered. Please check your email to verify your account before signing in.",
        "user": new_user
    }

@router.post("/change-password", response_model=schemas.ChangePasswordResponse)
async def change_password(
    password_change: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Change the password for the authenticated user."""
    # Verify current password
    if not verify_password(password_change.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(password_change.new_password)
    db.commit()
    
    return {"message": "Password successfully changed"}

@router.put("/timezone", response_model=schemas.User)
async def update_user_timezone(
    timezone_update: schemas.TimezoneUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update the user's preferred timezone."""
    import pytz
    
    # Validate timezone
    if timezone_update.timezone not in pytz.all_timezones:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid timezone: {timezone_update.timezone}"
        )
    
    # Update user timezone
    current_user.timezone = timezone_update.timezone
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.get("/verify-email", response_model=schemas.EmailVerificationResponse)
async def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify email address using verification token."""
    user = verify_email_token(db, token)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    return {
        "message": "Email successfully verified! You can now log in to your account.",
        "detail": f"Welcome to BookedBarber, {user.name}!"
    }

@router.post("/resend-verification", response_model=schemas.EmailVerificationResponse)
async def resend_verification(
    request: Request,
    verification_request: schemas.EmailVerificationRequest,
    db: Session = Depends(get_db)
):
    """Resend verification email to user."""
    # Find user by email
    user = db.query(models.User).filter(models.User.email == verification_request.email).first()
    
    if not user:
        # Return success even if user not found (security best practice)
        return {"message": "If the email exists and is unverified, a verification email has been sent"}
    
    if user.email_verified:
        return {
            "message": "Email address is already verified",
            "detail": "You can log in to your account"
        }
    
    # Resend verification email
    success = resend_verification_email(db, user)
    
    if success:
        return {"message": "Verification email sent successfully"}
    else:
        return {"message": "Unable to send verification email at this time"}

@router.get("/verification-status", response_model=schemas.VerificationStatusResponse)
async def get_verification_status(
    current_user: models.User = Depends(get_current_user)
):
    """Get email verification status for current user."""
    return {
        "email_verified": current_user.email_verified,
        "verification_required": not current_user.email_verified
    }