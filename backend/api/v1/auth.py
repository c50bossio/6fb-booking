"""
Authentication API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import jwt
from passlib.context import CryptContext
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from config.database import get_db
from models.user import User
from services.rbac_service import RBACService
from config.settings import settings
from pydantic import BaseModel, EmailStr
from utils.security import (
    check_login_rate_limit,
    validate_password_strength,
    get_client_ip,
)
from utils.logging import log_user_action

router = APIRouter()

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

# JWT settings
SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES


# Pydantic models
class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class MagicLinkRequest(BaseModel):
    email: EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict


class TokenData(BaseModel):
    email: Optional[str] = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: str = "barber"
    primary_location_id: Optional[int] = None


class UserResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool
    primary_location_id: Optional[int]
    permissions: Optional[list]
    created_at: datetime

    class Config:
        from_attributes = True


# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_magic_token(email: str, expires_minutes: int = 30):
    """Create a magic link token for passwordless login"""
    data = {
        "sub": email,
        "type": "magic_link",
        "exp": datetime.utcnow() + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def create_reset_token(email: str, expires_minutes: int = 30):
    """Create a password reset token"""
    data = {
        "sub": email,
        "type": "password_reset",
        "exp": datetime.utcnow() + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def send_email(to_email: str, subject: str, body: str):
    """Send email (simplified implementation - in production use proper email service)"""
    try:
        # For development, just log the email content
        print(f"\n--- EMAIL ---")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Body: {body}")
        print(f"--- END EMAIL ---\n")

        # In production, implement actual email sending:
        # smtp_server = settings.SMTP_SERVER
        # smtp_port = settings.SMTP_PORT
        # smtp_username = settings.SMTP_USERNAME
        # smtp_password = settings.SMTP_PASSWORD
        #
        # msg = MIMEMultipart()
        # msg['From'] = smtp_username
        # msg['To'] = to_email
        # msg['Subject'] = subject
        # msg.attach(MIMEText(body, 'html'))
        #
        # server = smtplib.SMTP(smtp_server, smtp_port)
        # server.starttls()
        # server.login(smtp_username, smtp_password)
        # server.send_message(msg)
        # server.quit()

        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user


# API Endpoints
@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Validate password strength
    is_valid, error_msg = validate_password_strength(user_data.password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role,
        primary_location_id=user_data.primary_location_id,
        is_active=True,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Log registration
    log_user_action(
        action="user_registered",
        user_id=new_user.id,
        details={"email": new_user.email, "role": new_user.role},
    )

    return new_user


@router.post("/token", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Login and get access token"""
    # Check rate limit
    client_ip = get_client_ip(request)
    check_login_rate_limit(client_ip)

    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled"
        )

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Log successful login
    log_user_action(
        action="user_login",
        user_id=user.id,
        details={"email": user.email},
        ip_address=client_ip,
    )

    # Get user permissions
    rbac = RBACService(db)
    permissions = rbac.get_user_permissions(user)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": f"{user.first_name} {user.last_name}",
            "role": user.role,
            "permissions": permissions,
            "primary_location_id": user.primary_location_id,
        },
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Logout user (client should discard token)"""
    # In a more complex system, you might want to blacklist the token
    # For now, we just return success and let the client handle token removal
    return {"message": "Successfully logged out"}


@router.post("/change-password")
async def change_password(
    old_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change user password"""
    if not verify_password(old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect password"
        )

    # Validate new password strength
    is_valid, error_msg = validate_password_strength(new_password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

    current_user.hashed_password = get_password_hash(new_password)
    current_user.updated_at = datetime.utcnow()
    db.commit()

    # Log password change
    log_user_action(
        action="password_changed",
        user_id=current_user.id,
        details={"email": current_user.email},
    )

    return {"message": "Password updated successfully"}


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest, db: Session = Depends(get_db)
):
    """Send password reset email"""
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        # Don't reveal if email exists or not for security
        return {
            "message": "If your email is registered, you will receive password reset instructions."
        }

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled"
        )

    # Create reset token
    reset_token = create_reset_token(user.email)

    # Create reset URL (in production, use proper frontend URL)
    reset_url = f"http://localhost:3000/reset-password?token={reset_token}"

    # Email content
    subject = "6FB Platform - Password Reset Request"
    body = f"""
    <html>
    <body>
        <h2>Password Reset Request</h2>
        <p>Hello {user.first_name},</p>
        <p>You have requested to reset your password for your 6FB Platform account.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="{reset_url}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>This link will expire in 30 minutes.</p>
        <p>If you did not request this password reset, please ignore this email.</p>
        <br>
        <p>Best regards,<br>The 6FB Platform Team</p>
    </body>
    </html>
    """

    # Send email
    email_sent = send_email(user.email, subject, body)

    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send password reset email",
        )

    # Log password reset request
    log_user_action(
        action="password_reset_requested",
        user_id=user.id,
        details={"email": user.email},
    )

    return {
        "message": "If your email is registered, you will receive password reset instructions."
    }


@router.post("/send-magic-link")
async def send_magic_link(request: MagicLinkRequest, db: Session = Depends(get_db)):
    """Send magic link for passwordless login"""
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        # Don't reveal if email exists or not for security
        return {
            "message": "If your email is registered, you will receive a secure login link."
        }

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled"
        )

    # Create magic link token
    magic_token = create_magic_token(user.email)

    # Create magic link URL (in production, use proper frontend URL)
    magic_url = f"http://localhost:3000/magic-login?token={magic_token}"

    # Email content
    subject = "6FB Platform - Secure Login Link"
    body = f"""
    <html>
    <body>
        <h2>Secure Login Link</h2>
        <p>Hello {user.first_name},</p>
        <p>You have requested to sign in to your 6FB Platform account using a secure email link.</p>
        <p>Click the link below to sign in:</p>
        <p><a href="{magic_url}" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Sign In Securely</a></p>
        <p>This link will expire in 30 minutes.</p>
        <p>If you did not request this login link, please ignore this email.</p>
        <br>
        <p>Best regards,<br>The 6FB Platform Team</p>
    </body>
    </html>
    """

    # Send email
    email_sent = send_email(user.email, subject, body)

    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send magic login link",
        )

    # Log magic link request
    log_user_action(
        action="magic_link_requested", user_id=user.id, details={"email": user.email}
    )

    return {
        "message": "If your email is registered, you will receive a secure login link."
    }


@router.get("/verify-magic-token")
async def verify_magic_token(token: str, db: Session = Depends(get_db)):
    """Verify magic link token and log user in"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        token_type = payload.get("type")

        if not email or token_type != "magic_link":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired magic link",
            )

        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled"
            )

        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )

        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()

        # Log successful magic link login
        log_user_action(
            action="magic_link_login", user_id=user.id, details={"email": user.email}
        )

        # Get user permissions
        rbac = RBACService(db)
        permissions = rbac.get_user_permissions(user)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": f"{user.first_name} {user.last_name}",
                "role": user.role,
                "permissions": permissions,
                "primary_location_id": user.primary_location_id,
            },
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Magic link has expired"
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid magic link"
        )
