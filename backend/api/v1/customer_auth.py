"""
Customer Authentication API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import jwt
from passlib.context import CryptContext
import logging
import os

from config.database import get_db
from models.customer import Customer
from services.email_service import email_service
from config.settings import settings
from pydantic import BaseModel, EmailStr
from utils.security import (
    check_login_rate_limit,
    validate_password_strength,
    get_client_ip,
)
from utils.logging import log_user_action
from utils.secure_logging import get_secure_logger, log_security_event

router = APIRouter()
logger = get_secure_logger(__name__)

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# JWT settings
SECRET_KEY = settings.JWT_SECRET_KEY.get_secret_value()
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES


# Pydantic models
class CustomerLogin(BaseModel):
    email: EmailStr
    password: str


class CustomerRegister(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    newsletter_subscription: bool = True


class CustomerResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    full_name: str
    phone: Optional[str]
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime]
    last_login: Optional[datetime]
    newsletter_subscription: bool
    preferred_barber_id: Optional[int]
    preferred_location_id: Optional[int]
    avatar_url: Optional[str]

    class Config:
        from_attributes = True


class CustomerToken(BaseModel):
    access_token: str
    token_type: str
    customer: CustomerResponse


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    newsletter_subscription: Optional[bool] = None
    preferred_barber_id: Optional[int] = None
    preferred_location_id: Optional[int] = None


# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_customer_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire, "type": "customer"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_customer_reset_token(email: str, expires_minutes: int = 30):
    """Create a password reset token for customers"""
    data = {
        "sub": email,
        "type": "customer_password_reset",
        "exp": datetime.utcnow() + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_customer(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credentials.credentials

        # Validate token format first
        if not token or token == "null" or token == "undefined":
            logger.warning(f"Invalid customer token format received: {token}")
            raise credentials_exception

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")

        if email is None or token_type != "customer":
            logger.warning(f"Invalid customer token payload: {payload}")
            raise credentials_exception

    except jwt.ExpiredSignatureError:
        logger.warning(
            f"Customer token expired: {payload.get('sub', 'unknown') if 'payload' in locals() else 'unknown'}"
        )
        raise credentials_exception
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid customer JWT token: {str(e)}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"Unexpected error validating customer JWT: {str(e)}")
        raise credentials_exception

    customer = db.query(Customer).filter(Customer.email == email).first()
    if customer is None:
        logger.warning(f"Customer not found for email: {email}")
        raise credentials_exception

    if not customer.is_active:
        logger.warning(f"Inactive customer attempted access: {customer.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Customer account is disabled"
        )

    return customer


# API Endpoints
@router.post("/register", response_model=CustomerResponse)
async def register_customer(
    customer_data: CustomerRegister, db: Session = Depends(get_db)
):
    """Register a new customer"""
    # Validate password strength
    is_valid, error_msg = validate_password_strength(customer_data.password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

    # Check if customer exists
    existing_customer = (
        db.query(Customer).filter(Customer.email == customer_data.email).first()
    )
    if existing_customer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Create new customer
    hashed_password = get_password_hash(customer_data.password)
    new_customer = Customer(
        email=customer_data.email,
        hashed_password=hashed_password,
        first_name=customer_data.first_name,
        last_name=customer_data.last_name,
        phone=customer_data.phone,
        newsletter_subscription=customer_data.newsletter_subscription,
        is_active=True,
    )

    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)

    # Log registration
    log_user_action(
        action="customer_registered",
        user_id=new_customer.id,
        details={"email": new_customer.email},
    )

    return new_customer


@router.post("/login", response_model=CustomerToken)
async def login_customer(
    request: Request,
    credentials: CustomerLogin,
    db: Session = Depends(get_db),
):
    """Login customer and get access token"""
    # Check rate limit
    client_ip = get_client_ip(request)
    check_login_rate_limit(client_ip)

    customer = db.query(Customer).filter(Customer.email == credentials.email).first()

    if not customer or not verify_password(
        credentials.password, customer.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not customer.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Customer account is disabled"
        )

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_customer_access_token(
        data={"sub": customer.email}, expires_delta=access_token_expires
    )

    # Update last login
    customer.last_login = datetime.utcnow()
    db.commit()

    # Log successful login
    log_user_action(
        action="customer_login",
        user_id=customer.id,
        details={"email": customer.email},
        ip_address=client_ip,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "customer": customer,
    }


@router.get("/me", response_model=CustomerResponse)
async def get_current_customer_info(
    current_customer: Customer = Depends(get_current_customer),
):
    """Get current customer information"""
    return current_customer


@router.put("/profile", response_model=CustomerResponse)
async def update_customer_profile(
    profile_data: UpdateProfileRequest,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    """Update customer profile"""
    # Update fields if provided
    if profile_data.first_name is not None:
        current_customer.first_name = profile_data.first_name
    if profile_data.last_name is not None:
        current_customer.last_name = profile_data.last_name
    if profile_data.phone is not None:
        current_customer.phone = profile_data.phone
    if profile_data.newsletter_subscription is not None:
        current_customer.newsletter_subscription = profile_data.newsletter_subscription
    if profile_data.preferred_barber_id is not None:
        current_customer.preferred_barber_id = profile_data.preferred_barber_id
    if profile_data.preferred_location_id is not None:
        current_customer.preferred_location_id = profile_data.preferred_location_id

    current_customer.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_customer)

    # Log profile update
    log_user_action(
        action="customer_profile_updated",
        user_id=current_customer.id,
        details={"email": current_customer.email},
    )

    return current_customer


@router.post("/change-password")
async def change_customer_password(
    password_data: ChangePasswordRequest,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    """Change customer password"""
    if not verify_password(
        password_data.old_password, current_customer.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password"
        )

    # Validate new password strength
    is_valid, error_msg = validate_password_strength(password_data.new_password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

    current_customer.hashed_password = get_password_hash(password_data.new_password)
    current_customer.updated_at = datetime.utcnow()
    db.commit()

    # Log password change
    log_user_action(
        action="customer_password_changed",
        user_id=current_customer.id,
        details={"email": current_customer.email},
    )

    return {"message": "Password updated successfully"}


@router.post("/forgot-password")
async def forgot_customer_password(
    request: ForgotPasswordRequest, db: Session = Depends(get_db)
):
    """Send password reset email to customer"""
    customer = db.query(Customer).filter(Customer.email == request.email).first()

    if not customer:
        # Don't reveal if email exists or not for security
        return {
            "message": "If your email is registered, you will receive password reset instructions."
        }

    if not customer.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Customer account is disabled"
        )

    # Create reset token
    reset_token = create_customer_reset_token(customer.email)

    # Send password reset email using proper email service
    # Note: This would need to be implemented in email_service for customers
    try:
        # Create reset URL for customer portal
        reset_url = f"http://localhost:3000/customer/reset-password?token={reset_token}"

        # Email content for customers
        subject = "6FB Booking - Reset Your Password"
        html_content = f"""
        <html>
        <body>
            <h2>Reset Your Password</h2>
            <p>Hello {customer.first_name},</p>
            <p>You have requested to reset your password for your 6FB Booking account.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="{reset_url}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
            <p>This link will expire in 30 minutes.</p>
            <p>If you did not request this password reset, please ignore this email.</p>
            <br>
            <p>Best regards,<br>The 6FB Booking Team</p>
        </body>
        </html>
        """

        # In production, implement actual email sending
        # For now, just log it in development
        environment = os.getenv("ENVIRONMENT", "development").lower()
        if environment == "development":
            logger.info(
                f"Customer password reset email would be sent to {customer.email}"
            )
            logger.info(f"Reset URL: {reset_url}")

        email_sent = True  # Assume success for development

    except Exception as e:
        logger.error(f"Failed to send customer password reset email: {str(e)}")
        email_sent = False

    # In development, we always return success even if email fails
    environment = os.getenv("ENVIRONMENT", "development").lower()
    if not email_sent and environment == "production":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send password reset email",
        )

    # Log password reset request
    log_user_action(
        action="customer_password_reset_requested",
        user_id=customer.id,
        details={"email": customer.email},
    )

    return {
        "message": "If your email is registered, you will receive password reset instructions."
    }


@router.post("/reset-password")
async def reset_customer_password(
    request: ResetPasswordRequest, db: Session = Depends(get_db)
):
    """Reset customer password using token"""
    try:
        # Decode and validate the reset token
        payload = jwt.decode(request.token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        token_type = payload.get("type")

        if not email or token_type != "customer_password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token",
            )

        customer = db.query(Customer).filter(Customer.email == email).first()
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
            )

        if not customer.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Customer account is disabled",
            )

        # Validate new password strength
        is_valid, error_msg = validate_password_strength(request.new_password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg
            )

        # Update password
        customer.hashed_password = get_password_hash(request.new_password)
        customer.updated_at = datetime.utcnow()
        db.commit()

        # Log password reset
        log_user_action(
            action="customer_password_reset_completed",
            user_id=customer.id,
            details={"email": customer.email},
        )

        return {"message": "Password has been reset successfully"}

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired. Please request a new reset link.",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token"
        )


@router.post("/logout")
async def logout_customer(current_customer: Customer = Depends(get_current_customer)):
    """Logout customer (client should discard token)"""
    # In a more complex system, you might want to blacklist the token
    # For now, we just return success and let the client handle token removal

    # Log logout
    log_user_action(
        action="customer_logout",
        user_id=current_customer.id,
        details={"email": current_customer.email},
    )

    return {"message": "Successfully logged out"}


@router.post("/verify-email")
async def verify_customer_email(token: str, db: Session = Depends(get_db)):
    """Verify customer email with token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        token_type = payload.get("type")

        if not email or token_type != "customer_email_verification":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token",
            )

        customer = db.query(Customer).filter(Customer.email == email).first()
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
            )

        customer.is_verified = True
        customer.updated_at = datetime.utcnow()
        db.commit()

        return {"message": "Email verified successfully"}

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification token"
        )


@router.post("/resend-verification")
async def resend_customer_verification(
    current_customer: Customer = Depends(get_current_customer),
):
    """Resend email verification for customer"""
    if current_customer.is_verified:
        return {"message": "Email is already verified"}

    # Create verification token and send email
    # This would be implemented similar to forgot password

    return {"message": "Verification email sent"}
