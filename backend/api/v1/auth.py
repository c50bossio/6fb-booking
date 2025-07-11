"""
Authentication API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from typing import Optional
import jwt
from passlib.context import CryptContext
import secrets
import smtplib
import logging
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from config.database import get_db
from models.user import User
from services.rbac_service import RBACService
from services.email_service import email_service
from services.subscription_service import SubscriptionService
from config.settings import settings
from pydantic import BaseModel, EmailStr
from utils.security import (
    check_login_rate_limit,
    validate_password_strength,
    get_client_ip,
)
from utils.logging import log_user_action
from utils.secure_logging import get_secure_logger, log_security_event
from services.token_blacklist_service import token_blacklist_service
from utils.encrypted_search import exact_match_encrypted_field
from utils.cookie_auth import (
    set_auth_cookies,
    clear_auth_cookies,
    get_token_from_cookie,
    generate_csrf_token,
    CookieJWTBearer,
    ACCESS_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_COOKIE_NAME,
)
from services.mfa_service import MFAService
from schemas.mfa import MFARequiredResponse, MFALoginRequest

router = APIRouter()
logger = get_secure_logger(__name__)

# JWT settings
SECRET_KEY = settings.JWT_SECRET_KEY.get_secret_value()
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Replace OAuth2PasswordBearer with CookieJWTBearer for cookie-based auth
cookie_scheme = CookieJWTBearer(secret_key=SECRET_KEY, algorithm=ALGORITHM)


# Pydantic models
class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserLoginForm(BaseModel):
    username: str  # Frontend sends 'username' field
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class MagicLinkRequest(BaseModel):
    email: EmailStr


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: dict
    csrf_token: str  # Add CSRF token to response


class TokenData(BaseModel):
    email: Optional[str] = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: str = "barber"
    primary_location_id: Optional[int] = None


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class MFALoginForm(BaseModel):
    email: str
    password: str
    mfa_code: Optional[str] = None
    remember_device: bool = False
    device_fingerprint: Optional[str] = None


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
    subscription_status: Optional[str] = None
    trial_start_date: Optional[datetime] = None
    trial_end_date: Optional[datetime] = None
    is_trial_active: Optional[bool] = None
    days_remaining_in_trial: Optional[int] = None

    class Config:
        from_attributes = True


# Helper functions
def verify_password(plain_password, hashed_password):
    """Verify password using bcrypt only - consistent with registration hashing
    Enhanced with timing attack protection"""
    try:
        # SECURITY FIX: Always perform verification to prevent timing attacks
        # even if the hashed_password is None or empty
        if not hashed_password:
            # Still perform a dummy bcrypt operation to maintain consistent timing
            dummy_hash = "$2b$12$dummy.hash.to.prevent.timing.attacks.abcdefghijklmnopqrstuvwxyz"
            pwd_context.verify(plain_password, dummy_hash)
            return False
        
        # Only use bcrypt for consistency with registration
        is_valid = pwd_context.verify(plain_password, hashed_password)
        logger.debug(f"Password verification completed")
        return is_valid
    except Exception as e:
        logger.error(f"Password verification error: {str(e)}")
        return False


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.utcnow(),  # issued at time for blacklist checking
        }
    )
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a refresh token with longer expiration"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
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
    import logging
    import os
    from utils.encryption import mask_email

    logger = logging.getLogger(__name__)

    try:
        # SECURITY FIX: Only log email delivery in development, never log content
        environment = os.getenv("ENVIRONMENT", "development").lower()

        if environment == "development":
            # In development, log sanitized information only
            masked_email = mask_email(to_email)
            logger.info(f"Dev email sent to {masked_email} with subject: {subject}")
            print(f"[DEV] Email would be sent to {masked_email}")
        else:
            # In production, log only successful delivery (no content)
            masked_email = mask_email(to_email)
            logger.info(f"Email sent to {masked_email}")

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
    token: str = Depends(cookie_scheme), db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Validate token format first
        if not token or token == "null" or token == "undefined":
            logger.warning(f"Invalid token format received: {token}")
            raise credentials_exception

        # Check if token is blacklisted
        if token_blacklist_service.is_blacklisted(token):
            logger.warning("Blacklisted token usage attempt")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            logger.warning(f"Token missing email subject: {payload}")
            raise credentials_exception

        # Check if user's tokens have been invalidated (e.g., after password change)
        iat = payload.get("iat")  # issued at time
        if iat:
            token_issued_at = datetime.fromtimestamp(iat)
            user_id = payload.get("user_id")
            if user_id and token_blacklist_service.is_user_tokens_invalidated(
                user_id, token_issued_at
            ):
                logger.warning(
                    f"Token issued before user token invalidation for user {user_id}"
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has been invalidated. Please login again.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

        token_data = TokenData(email=email)
    except jwt.ExpiredSignatureError:
        logger.warning(
            f"Token expired for user: {payload.get('sub', 'unknown') if 'payload' in locals() else 'unknown'}"
        )
        raise credentials_exception
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid JWT token: {str(e)}")
        raise credentials_exception
    except HTTPException:
        # Re-raise HTTP exceptions (like blacklist errors)
        raise
    except Exception as e:
        logger.error(f"Unexpected error validating JWT: {str(e)}")
        raise credentials_exception

    # Use encrypted search for email lookup
    user_query = db.query(User)
    user_query = exact_match_encrypted_field(
        user_query, "email", token_data.email, User
    )
    user = user_query.first()
    if user is None:
        logger.warning(f"User not found for email: {token_data.email}")
        raise credentials_exception

    if not user.is_active:
        logger.warning(f"Inactive user attempted access: {user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled"
        )

    return user


async def validate_refresh_token(token: str, db: Session = Depends(get_db)):
    """Validate refresh token and return user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")

        if email is None or token_type != "refresh":
            raise credentials_exception

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise credentials_exception

    # Use encrypted search for email lookup
    user_query = db.query(User)
    user_query = exact_match_encrypted_field(user_query, "email", email, User)
    user = user_query.first()
    if user is None or not user.is_active:
        raise credentials_exception

    return user


async def get_current_user_websocket(token: str, db: Session):
    """Get current user for WebSocket connections"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials for WebSocket",
    )

    try:
        if not token or token == "null" or token == "undefined":
            raise credentials_exception

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception

        # Use encrypted search for email lookup
        user_query = db.query(User)
        user_query = exact_match_encrypted_field(user_query, "email", email, User)
        user = user_query.first()
        if user is None or not user.is_active:
            raise credentials_exception

        return user

    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        raise credentials_exception
    except Exception:
        raise credentials_exception


# API Endpoints
@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Validate password strength
    is_valid, error_msg = validate_password_strength(user_data.password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

    # Check if user exists - use encrypted search
    existing_user_query = db.query(User)
    existing_user_query = exact_match_encrypted_field(
        existing_user_query, "email", user_data.email, User
    )
    existing_user = existing_user_query.first()
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

    # Ensure the transaction is fully committed before proceeding
    db.flush()
    logger.debug(f"User {new_user.id} successfully committed to database")

    # Start 30-day trial for new user using subscription service
    subscription_service = SubscriptionService(db)
    try:
        await subscription_service.start_trial(new_user, trial_days=30)

        # Log trial start with Stripe integration
        log_user_action(
            action="trial_started",
            user_id=new_user.id,
            details={
                "email": new_user.email,
                "trial_start_date": (
                    new_user.trial_start_date.isoformat()
                    if new_user.trial_start_date
                    else None
                ),
                "trial_end_date": (
                    new_user.trial_end_date.isoformat()
                    if new_user.trial_end_date
                    else None
                ),
                "trial_days": 30,
                "stripe_customer_id": new_user.customer_id,
                "stripe_subscription_id": new_user.subscription_id,
            },
        )

        logger.info(
            f"Successfully started 30-day trial with Stripe integration for user {new_user.id}"
        )

    except Exception as e:
        # Log error but don't fail registration - user can still use basic features
        logger.error(
            f"Failed to start trial with Stripe for new user {new_user.id}: {str(e)}"
        )

        # Fallback to basic trial without Stripe
        try:
            new_user.start_trial(trial_days=30)
            db.commit()
            db.refresh(new_user)
            logger.info(f"Started basic trial (no Stripe) for user {new_user.id}")
        except ValueError as fallback_error:
            logger.warning(
                f"Failed to start even basic trial for new user {new_user.id}: {str(fallback_error)}"
            )

    # Log registration
    log_user_action(
        action="user_registered",
        user_id=new_user.id,
        details={"email": new_user.email, "role": new_user.role},
    )

    # Create response with trial information
    user_response = UserResponse(
        id=new_user.id,
        email=new_user.email,
        first_name=new_user.first_name,
        last_name=new_user.last_name,
        role=new_user.role,
        is_active=new_user.is_active,
        primary_location_id=new_user.primary_location_id,
        permissions=None,  # Will be populated by RBAC if needed
        created_at=new_user.created_at,
        subscription_status=(
            new_user.subscription_status.value if new_user.subscription_status else None
        ),
        trial_start_date=new_user.trial_start_date,
        trial_end_date=new_user.trial_end_date,
        is_trial_active=new_user.is_trial_active(),
        days_remaining_in_trial=new_user.days_remaining_in_trial(),
    )

    return user_response


@router.post("/token", response_model=Token)
async def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Login and get access token - now sets httpOnly cookies"""
    # Check rate limit
    client_ip = get_client_ip(request)
    check_login_rate_limit(client_ip)

    # Find user with simplified, consistent query approach
    user = None
    email = form_data.username

    logger.debug(f"Attempting login for email: {email}")

    try:
        # Use encrypted search since email field is SearchableEncryptedString
        logger.debug(f"Searching for user with email: {email}")

        user_query = db.query(User)
        user_query = exact_match_encrypted_field(user_query, "email", email, User)
        user = user_query.first()

        if user:
            logger.debug(f"User found via encrypted search - ID: {user.id}")
        else:
            logger.debug(f"User not found with encrypted search")

    except Exception as e:
        logger.error(f"Error during encrypted user lookup: {str(e)}")
        user = None

    # Enhanced debugging for authentication failures
    if not user:
        logger.warning(f"Login failed: User not found for email {email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Login failed: Incorrect password for user {user.id} ({email})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.info(f"Login successful for user {user.id} ({email})")

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled"
        )

    # Create access token and refresh token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id}, expires_delta=access_token_expires
    )

    refresh_token_expires = timedelta(days=int(REFRESH_TOKEN_EXPIRE_DAYS))
    refresh_token = create_refresh_token(
        data={"sub": user.email}, expires_delta=refresh_token_expires
    )

    # Generate CSRF token
    csrf_token = generate_csrf_token()

    # Set httpOnly cookies
    set_auth_cookies(response, access_token, refresh_token, csrf_token)

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
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "csrf_token": csrf_token,
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
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role=current_user.role,
        is_active=current_user.is_active,
        primary_location_id=current_user.primary_location_id,
        permissions=None,  # Will be populated by RBAC if needed
        created_at=current_user.created_at,
        subscription_status=(
            current_user.subscription_status.value
            if current_user.subscription_status
            else None
        ),
        trial_start_date=current_user.trial_start_date,
        trial_end_date=current_user.trial_end_date,
        is_trial_active=current_user.is_trial_active(),
        days_remaining_in_trial=current_user.days_remaining_in_trial(),
    )


@router.post("/login", response_model=Token)
async def login_endpoint(
    request: Request,
    response: Response,
    credentials: UserLogin,
    db: Session = Depends(get_db),
):
    """Login endpoint - alternative to /token for better API consistency"""
    # Convert to OAuth2 format and call the token endpoint
    form_data = OAuth2PasswordRequestForm(
        username=credentials.email,
        password=credentials.password,
        scope="",
        client_id=None,
        client_secret=None,
    )
    return await login(request, response, form_data, db)


@router.post("/login-mfa")
async def login_with_mfa(
    request: Request,
    response: Response,
    credentials: MFALoginForm,
    db: Session = Depends(get_db),
):
    """
    Enhanced login endpoint that handles MFA verification
    """
    # Check rate limit
    client_ip = get_client_ip(request)
    check_login_rate_limit(client_ip)

    # Use encrypted search for email lookup
    user_query = db.query(User)
    user_query = exact_match_encrypted_field(
        user_query, "email", credentials.email, User
    )
    user = user_query.first()

    # SECURITY FIX: Always verify password even if user doesn't exist
    # to prevent timing attacks and user enumeration
    password_valid = verify_password(
        credentials.password, 
        user.hashed_password if user else None
    )

    if not user or not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled"
        )

    # Initialize MFA service
    mfa_service = MFAService(db)
    user_agent = request.headers.get("user-agent")

    # Check if user has MFA enabled
    if user.has_mfa_enabled():
        # Check if device is trusted (if fingerprint provided)
        device_trusted = False
        if credentials.device_fingerprint:
            device_trusted = mfa_service.check_device_trust(
                user=user, device_fingerprint=credentials.device_fingerprint
            )

        # If device is not trusted and no MFA code provided, require MFA
        if not device_trusted and not credentials.mfa_code:
            return MFARequiredResponse(
                mfa_required=True,
                message="Multi-factor authentication required",
                methods=["totp", "backup_code"],
            )

        # If MFA code provided, verify it
        if credentials.mfa_code and not device_trusted:
            try:
                mfa_result = mfa_service.verify_mfa_code(
                    user=user,
                    code=credentials.mfa_code,
                    ip_address=client_ip,
                    user_agent=user_agent,
                    remember_device=credentials.remember_device,
                )

                if not mfa_result["verified"]:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid MFA code",
                    )
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MFA code"
                )
    elif user.is_mfa_required():
        # MFA is required but not set up - redirect to setup
        return {
            "mfa_setup_required": True,
            "message": "MFA setup is required for your account",
            "user_id": user.id,
        }

    # Create access token and refresh token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id}, expires_delta=access_token_expires
    )

    refresh_token_expires = timedelta(days=int(REFRESH_TOKEN_EXPIRE_DAYS))
    refresh_token = create_refresh_token(
        data={"sub": user.email}, expires_delta=refresh_token_expires
    )

    # Generate CSRF token
    csrf_token = generate_csrf_token()

    # Set httpOnly cookies
    set_auth_cookies(response, access_token, refresh_token, csrf_token)

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Log successful login
    log_user_action(
        action="user_login_mfa",
        user_id=user.id,
        details={
            "email": user.email,
            "mfa_used": user.has_mfa_enabled(),
            "device_trusted": device_trusted if user.has_mfa_enabled() else False,
        },
        ip_address=client_ip,
    )

    # Get user permissions
    rbac = RBACService(db)
    permissions = rbac.get_user_permissions(user)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "csrf_token": csrf_token,
        "mfa_verified": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": f"{user.first_name} {user.last_name}",
            "role": user.role,
            "permissions": permissions,
            "primary_location_id": user.primary_location_id,
            "mfa_enabled": user.has_mfa_enabled(),
            "mfa_required": user.is_mfa_required(),
        },
    }


@router.options("/token")
async def token_options():
    """Handle OPTIONS request for token endpoint"""
    return {"status": "ok"}


@router.post("/refresh", response_model=Token)
async def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Refresh access token using refresh token from cookie"""
    # Get refresh token from cookie
    refresh_token = get_token_from_cookie(request, REFRESH_TOKEN_COOKIE_NAME)
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not found"
        )

    # Validate refresh token
    user = await validate_refresh_token(refresh_token, db)

    # Create new access token and refresh token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id}, expires_delta=access_token_expires
    )

    refresh_token_expires = timedelta(days=int(REFRESH_TOKEN_EXPIRE_DAYS))
    new_refresh_token = create_refresh_token(
        data={"sub": user.email}, expires_delta=refresh_token_expires
    )

    # Generate new CSRF token
    csrf_token = generate_csrf_token()

    # Set new httpOnly cookies
    set_auth_cookies(response, access_token, new_refresh_token, csrf_token)

    # Get user permissions
    rbac = RBACService(db)
    permissions = rbac.get_user_permissions(user)

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "csrf_token": csrf_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": f"{user.first_name} {user.last_name}",
            "role": user.role,
            "permissions": permissions,
            "primary_location_id": user.primary_location_id,
        },
    }


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Logout user - clears httpOnly cookies and blacklists the token"""
    # Get the token from either cookie or Authorization header
    token = None

    # Try to get token from cookie first
    token = get_token_from_cookie(request, ACCESS_TOKEN_COOKIE_NAME)

    # If not in cookie, try Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    # Blacklist the token if found
    if token:
        success = token_blacklist_service.blacklist_token(
            token=token,
            reason="logout",
            user_id=current_user.id,
            metadata={"ip": get_client_ip(request)},
        )

        if success:
            logger.info(f"User {current_user.email} logged out and token blacklisted")
        else:
            logger.warning(f"Failed to blacklist token for user {current_user.email}")

    # Clear all authentication cookies
    clear_auth_cookies(response)

    # Log logout action
    log_user_action(
        action="user_logout",
        user_id=current_user.id,
        details={"email": current_user.email},
        ip_address=get_client_ip(request),
    )

    return {"message": "Successfully logged out"}


@router.post("/change-password")
async def change_password(
    request: Request,
    old_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change user password and invalidate all existing tokens"""
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

    # Get the current token to optionally exclude it
    current_token = None
    # Try to get token from cookie first
    current_token = get_token_from_cookie(request, ACCESS_TOKEN_COOKIE_NAME)
    # If not in cookie, try Authorization header
    if not current_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            current_token = auth_header.split(" ")[1]

    # Invalidate all tokens for this user
    token_blacklist_service.blacklist_all_user_tokens(
        user_id=current_user.id, reason="password_change", except_token=current_token
    )

    # Log password change
    log_user_action(
        action="password_changed",
        user_id=current_user.id,
        details={"email": current_user.email},
    )

    # Log security event
    log_security_event(
        event_type="password_change",
        user_id=current_user.id,
        details={
            "user_email": current_user.email,
            "ip_address": get_client_ip(request),
            "tokens_invalidated": True,
        },
    )

    return {
        "message": "Password updated successfully. Please login again with your new password.",
        "require_reauth": True,
    }


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest, db: Session = Depends(get_db)
):
    """Send password reset email"""
    # Use encrypted search for email lookup
    user_query = db.query(User)
    user_query = exact_match_encrypted_field(user_query, "email", request.email, User)
    user = user_query.first()

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

    # Send password reset email using proper email service
    email_sent = email_service.send_password_reset(
        db=db, to_email=user.email, reset_token=reset_token, user_name=user.first_name
    )

    # In development, we always return success even if email fails
    environment = os.getenv("ENVIRONMENT", "development").lower()
    if not email_sent and environment == "production":
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
    # Use encrypted search for email lookup
    user_query = db.query(User)
    user_query = exact_match_encrypted_field(user_query, "email", request.email, User)
    user = user_query.first()

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
async def verify_magic_token(
    token: str, response: Response, db: Session = Depends(get_db)
):
    """Verify magic link token and log user in - sets httpOnly cookies"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        token_type = payload.get("type")

        if not email or token_type != "magic_link":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired magic link",
            )

        # Use encrypted search for email lookup
        user_query = db.query(User)
        user_query = exact_match_encrypted_field(user_query, "email", email, User)
        user = user_query.first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled"
            )

        # Create access token and refresh token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )

        refresh_token_expires = timedelta(days=int(REFRESH_TOKEN_EXPIRE_DAYS))
        refresh_token = create_refresh_token(
            data={"sub": user.email}, expires_delta=refresh_token_expires
        )

        # Generate CSRF token
        csrf_token = generate_csrf_token()

        # Set httpOnly cookies
        set_auth_cookies(response, access_token, refresh_token, csrf_token)

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
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "csrf_token": csrf_token,
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


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using token"""
    try:
        # Decode and validate the reset token
        payload = jwt.decode(request.token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        token_type = payload.get("type")

        if not email or token_type != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token",
            )

        # Use encrypted search for email lookup
        user_query = db.query(User)
        user_query = exact_match_encrypted_field(user_query, "email", email, User)
        user = user_query.first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled"
            )

        # Validate new password strength
        is_valid, error_msg = validate_password_strength(request.new_password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg
            )

        # Update password
        user.hashed_password = get_password_hash(request.new_password)
        user.updated_at = datetime.utcnow()
        db.commit()

        # Log password reset
        log_user_action(
            action="password_reset_completed",
            user_id=user.id,
            details={"email": user.email},
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


# Subscription Management Endpoints


class UpgradeRequest(BaseModel):
    price_id: str
    payment_method_id: Optional[str] = None


@router.get("/subscription/info")
async def get_subscription_info(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get current user's subscription information"""
    subscription_service = SubscriptionService(db)
    return await subscription_service.get_subscription_info(current_user)


@router.post("/subscription/upgrade")
async def upgrade_subscription(
    request: UpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upgrade from trial to paid subscription"""
    subscription_service = SubscriptionService(db)

    try:
        result = await subscription_service.upgrade_to_paid(
            current_user, request.price_id, request.payment_method_id
        )

        # Log subscription upgrade
        log_user_action(
            action="subscription_upgraded",
            user_id=current_user.id,
            details={
                "email": current_user.email,
                "price_id": request.price_id,
                "subscription_id": result["subscription_id"],
            },
        )

        return {
            "message": "Successfully upgraded to paid subscription",
            "subscription": result,
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(
            f"Error upgrading subscription for user {current_user.id}: {str(e)}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upgrade subscription",
        )


@router.post("/subscription/cancel")
async def cancel_subscription(
    reason: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel current subscription"""
    subscription_service = SubscriptionService(db)

    try:
        success = await subscription_service.cancel_subscription(current_user, reason)

        if success:
            # Log subscription cancellation
            log_user_action(
                action="subscription_cancelled",
                user_id=current_user.id,
                details={
                    "email": current_user.email,
                    "reason": reason or "No reason provided",
                },
            )

            return {"message": "Subscription cancelled successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to cancel subscription",
            )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(
            f"Error cancelling subscription for user {current_user.id}: {str(e)}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription",
        )


@router.get("/subscription/test-data")
async def get_test_subscription_data():
    """Get test price IDs and payment methods for development"""
    return {
        "test_price_ids": SubscriptionService.get_test_price_ids(),
        "test_payment_methods": SubscriptionService.get_test_payment_methods(),
        "note": "These are Stripe test IDs for development and testing only",
    }


@router.get("/health")
async def auth_health_check(db: Session = Depends(get_db)):
    """Health check endpoint for authentication service"""
    try:
        # Test database connection
        user_count = db.query(User).count()

        # Test if we can create JWT tokens
        test_token = create_access_token(data={"sub": "health_check"})

        return {
            "status": "healthy",
            "service": "authentication",
            "database_connection": "ok",
            "total_users": user_count,
            "jwt_generation": "ok",
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"Auth health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Authentication service unhealthy: {str(e)}",
        )
