from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import timedelta
import logging
from db import get_db
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
from services.mfa_service import MFAService
from services.suspicious_login_detection import get_suspicious_login_detector
from services.password_security import validate_password_strength, password_security_service
from models.mfa import UserMFASecret
from utils.audit_logger_bypass import get_audit_logger
import schemas
import models

logger = logging.getLogger(__name__)
audit_logger = get_audit_logger()

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.get("/test")
async def test_auth_route():
    """Simple test endpoint to verify auth router is working"""
    return {"status": "ok", "message": "Auth router is responding"}

@router.post("/login", response_model=schemas.Token)
@login_rate_limit  # CRITICAL: Rate limiting re-enabled for production security
async def login(request: Request, user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Enhanced login endpoint with MFA support."""
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "Unknown")
    
    # Authenticate user
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    
    if not user:
        # Log failed login attempt
        audit_logger.log_auth_event(
            "login_failed",
            ip_address=client_ip,
            details={"email": user_credentials.email, "reason": "invalid_credentials", "user_agent": user_agent}
        )
        
        # Check for suspicious login patterns (failed login)
        # We need to try to find the user for suspicious login detection
        user_for_detection = db.query(models.User).filter(
            models.User.email == user_credentials.email
        ).first()
        
        # Temporarily disabled for debugging
        # if user_for_detection:
        #     detector = get_suspicious_login_detector(db)
        #     suspicious_alerts = detector.detect_suspicious_login(
        #         user_id=user_for_detection.id,
        #         ip_address=client_ip,
        #         user_agent=user_agent,
        #         login_success=False
        #     )
        #     
        #     # If high-severity alerts, add additional security headers
        #     if any(alert.severity in ["critical", "high"] for alert in suspicious_alerts):
        #         raise HTTPException(
        #             status_code=status.HTTP_401_UNAUTHORIZED,
        #             detail="Authentication failed. Account security measures activated.",
        #             headers={
        #                 "WWW-Authenticate": "Bearer",
        #                 "X-Security-Alert": "true",
        #                 "X-Alert-Level": "high"
        #             }
        #         )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if email is verified
    if not user.email_verified:
        audit_logger.log_auth_event(
            "login_failed",
            user_id=user.id,
            ip_address=client_ip,
            details={"reason": "email_not_verified", "user_agent": user_agent}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address not verified. Please check your email and click the verification link to complete your account setup.",
            headers={"X-Verification-Required": "true"}
        )
    
    # Check if user has MFA enabled
    mfa_secret = db.query(UserMFASecret).filter(
        UserMFASecret.user_id == user.id,
        UserMFASecret.is_enabled == True
    ).first()
    
    if mfa_secret:
        # Check if device is trusted
        device_fingerprint = request.headers.get("X-Device-Fingerprint", "")
        trust_token = request.headers.get("X-Trust-Token", "")
        
        is_trusted = False
        if device_fingerprint and trust_token:
            is_trusted = MFAService.verify_device_trust(
                user_id=user.id,
                trust_token=trust_token,
                device_fingerprint=device_fingerprint,
                db=db
            )
        
        if not is_trusted:
            # MFA verification required
            audit_logger.log_auth_event(
                "mfa_required",
                user_id=user.id,
                ip_address=client_ip,
                details={"device_trusted": False, "user_agent": user_agent}
            )
            raise HTTPException(
                status_code=status.HTTP_202_ACCEPTED,
                detail="MFA verification required",
                headers={
                    "X-MFA-Required": "true",
                    "X-User-ID": str(user.id),
                    "X-MFA-Methods": "totp,backup_code"
                }
            )
    
    # Generate tokens for successful login
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    # Use unified_role if available, otherwise fall back to role
    user_role = user.unified_role if hasattr(user, 'unified_role') and user.unified_role else user.role
    access_token = create_access_token(
        data={"sub": user.email, "role": user_role},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": user.email}
    )
    
    # Check for suspicious login patterns (successful login)
    detector = get_suspicious_login_detector(db)
    suspicious_alerts = detector.detect_suspicious_login(
        user_id=user.id,
        ip_address=client_ip,
        user_agent=user_agent,
        login_success=True
    )
    
    # Log successful login
    audit_logger.log_auth_event(
        "login_success",
        user_id=user.id,
        ip_address=client_ip,
        details={
            "mfa_enabled": bool(mfa_secret), 
            "device_trusted": True,
            "suspicious_alerts": len(suspicious_alerts),
            "alert_types": [alert.alert_type for alert in suspicious_alerts] if suspicious_alerts else [],
            "user_agent": user_agent
        }
    )
    
    # Add security headers if suspicious activity detected
    headers = {}
    if suspicious_alerts:
        headers["X-Security-Notice"] = "Unusual login pattern detected"
        headers["X-Alert-Count"] = str(len(suspicious_alerts))
        
        # For medium/high severity alerts, recommend additional security measures
        if any(alert.severity in ["medium", "high", "critical"] for alert in suspicious_alerts):
            headers["X-Security-Recommendation"] = "Enable MFA for enhanced security"
    
    response_data = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }
    
    # Create response with cookies and headers
    from fastapi.responses import JSONResponse
    from utils.cookie_auth import set_auth_cookies, generate_csrf_token
    
    response = JSONResponse(content=response_data)
    
    # Set security headers if any
    for header, value in headers.items():
        response.headers[header] = value
    
    # Generate CSRF token for additional protection
    csrf_token = generate_csrf_token()
    
    # Set secure authentication cookies
    set_auth_cookies(response, access_token, refresh_token, csrf_token)
    
    # Add CSRF token to response data
    response_data["csrf_token"] = csrf_token
    response = JSONResponse(content=response_data)
    
    # Re-set cookies after creating new response
    set_auth_cookies(response, access_token, refresh_token, csrf_token)
    
    # Set security headers again
    for header, value in headers.items():
        response.headers[header] = value
    
    return response

@router.post("/refresh", response_model=schemas.Token)
@refresh_rate_limit
async def refresh_token(
    request: Request,
    refresh_request: schemas.RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token with enhanced security logging."""
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "Unknown")
    
    try:
        user = verify_refresh_token(refresh_request.refresh_token, db)
        
        if not user:
            # Log failed refresh attempt
            audit_logger.log_auth_event(
                "token_refresh_failed",
                ip_address=client_ip,
                details={"reason": "invalid_refresh_token"}
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Create new access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        # Use unified_role if available, otherwise fall back to role
        user_role = user.unified_role if hasattr(user, 'unified_role') and user.unified_role else user.role
        access_token = create_access_token(
            data={"sub": user.email, "role": user_role},
            expires_delta=access_token_expires
        )
        
        # Create new refresh token (rotate for security)
        new_refresh_token = create_refresh_token(
            data={"sub": user.email}
        )
        
        # Log successful token refresh
        audit_logger.log_auth_event(
            "token_refresh_success",
            user_id=user.id,
            ip_address=client_ip,
            details={"token_rotated": True}
        )
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Log unexpected errors
        audit_logger.log_auth_event(
            "token_refresh_error",
            ip_address=client_ip,
            details={"error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )

@router.get("/me", response_model=schemas.User)
async def get_me(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user information with organization details."""
    # Convert SQLAlchemy model to dict safely
    user_data = {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "phone": current_user.phone,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
        "timezone": current_user.timezone or "UTC",
        "role": current_user.role or "user",
        "unified_role": current_user.unified_role,
        "role_migrated": getattr(current_user, 'role_migrated', False),
        "user_type": current_user.user_type,
        
        # Critical onboarding fields
        "onboarding_completed": current_user.onboarding_completed if hasattr(current_user, 'onboarding_completed') else False,
        "onboarding_status": current_user.onboarding_status if hasattr(current_user, 'onboarding_status') else None,
        "is_new_user": current_user.is_new_user if hasattr(current_user, 'is_new_user') else True,
        
        # Other fields with safe defaults
        "email_verified": getattr(current_user, 'email_verified', False),
        "verified_at": getattr(current_user, 'verified_at', None),
        "primary_organization_id": getattr(current_user, 'primary_organization_id', None),
        "primary_organization": None,
        "trial_started_at": getattr(current_user, 'trial_started_at', None),
        "trial_expires_at": getattr(current_user, 'trial_expires_at', None),
        "trial_active": getattr(current_user, 'trial_active', False),
        "subscription_status": getattr(current_user, 'subscription_status', None),
        "is_trial_active": False,
        "trial_days_remaining": 0,
        
        # Permission flags based on unified_role
        "is_business_owner": False,
        "is_staff_member": False,
        "is_system_admin": False,
        "can_manage_billing": False,
        "can_manage_staff": False,
        "can_view_analytics": False,
    }
    
    # Set permission flags based on unified_role
    if current_user.unified_role:
        user_data["is_business_owner"] = current_user.unified_role in ['enterprise_owner', 'shop_owner', 'individual_barber']
        user_data["is_staff_member"] = current_user.unified_role in ['barber', 'shop_manager', 'receptionist']
        user_data["is_system_admin"] = current_user.unified_role in ['super_admin', 'platform_admin']
        user_data["can_manage_billing"] = current_user.unified_role in ['super_admin', 'enterprise_owner', 'shop_owner']
        user_data["can_manage_staff"] = current_user.unified_role in ['super_admin', 'enterprise_owner', 'shop_owner', 'shop_manager']
        user_data["can_view_analytics"] = current_user.unified_role not in ['client', 'viewer']
    
    return user_data

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
@password_reset_rate_limit  # CRITICAL: Rate limiting for password reset security
async def reset_password(
    request: Request,
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
    
    # Validate user type - clients cannot register through dashboard
    if user_data.user_type == "client":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Client registration is not allowed. Clients should book appointments through your barbershop's booking page. Please select 'Barber' or 'Barbershop Owner' to register for dashboard access."
        )
    
    # Validate password strength
    password_validation = validate_password_strength(
        user_data.password,
        user_data={
            "email": user_data.email,
            "name": user_data.name
        }
    )
    
    if not password_validation.is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Password does not meet security requirements",
                "errors": password_validation.errors,
                "warnings": password_validation.warnings,
                "recommendations": password_validation.recommendations,
                "strength_score": password_validation.strength_score,
                "strength_level": password_validation.strength_level
            }
        )
    
    # Create new user with 14-day trial
    from datetime import datetime, timedelta, timezone
    
    hashed_password = get_password_hash(user_data.password)
    trial_start = datetime.now(timezone.utc).replace(tzinfo=None)
    trial_end = trial_start + timedelta(days=14)
    
    new_user = models.User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hashed_password,
        user_type=user_data.user_type,
        trial_started_at=trial_start,
        trial_expires_at=trial_end,
        trial_active=True,
        subscription_status="trial"
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
    
    # Create test data if requested (disabled for now as schema doesn't include this field)
    # if hasattr(user_data, 'create_test_data') and user_data.create_test_data:
    #     try:
    #         from services import test_data_service
    #         test_data_service.create_test_data_for_user(db, new_user.id, include_enterprise=False)
    #         db.commit()
    #     except Exception as e:
    #         # Log error but don't fail registration
    #         logger.error(f"Failed to create test data for user {new_user.id}: {str(e)}")
    
    return {
        "message": "User successfully registered. Please check your email to verify your account before signing in.",
        "user": new_user
    }

@router.post("/register-complete", response_model=schemas.CompleteRegistrationResponse)
@register_rate_limit
async def register_complete(
    request: Request,
    registration_data: schemas.CompleteRegistrationData,
    db: Session = Depends(get_db)
):
    """Register a new user with complete business setup including organization creation."""
    client_ip = request.client.host if request.client else "unknown"
    
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == registration_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate user type - clients cannot register through dashboard
    if registration_data.user_type == "client":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Client registration is not allowed. Clients should book appointments through your barbershop's booking page. Please select 'Barber' or 'Barbershop Owner' to register for dashboard access."
        )
    
    # Validate password strength
    password_validation = validate_password_strength(
        registration_data.password,
        user_data={
            "email": registration_data.email,
            "name": f"{registration_data.firstName} {registration_data.lastName}"
        }
    )
    
    if not password_validation.is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Password does not meet security requirements",
                "errors": password_validation.errors,
                "warnings": password_validation.warnings,
                "recommendations": password_validation.recommendations,
                "strength_score": password_validation.strength_score,
                "strength_level": password_validation.strength_level
            }
        )
    
    # Create user first
    from datetime import datetime, timedelta, timezone
    
    hashed_password = get_password_hash(registration_data.password)
    trial_start = datetime.now(timezone.utc).replace(tzinfo=None)
    trial_end = trial_start + timedelta(days=14)
    
    new_user = models.User(
        email=registration_data.email,
        name=f"{registration_data.firstName} {registration_data.lastName}",
        hashed_password=hashed_password,
        role=registration_data.user_type.value if hasattr(registration_data.user_type, 'value') else registration_data.user_type,
        trial_started_at=trial_start,
        trial_expires_at=trial_end,
        trial_active=True,
        subscription_status="trial"
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create organization
    # Map business type to billing plan and organization type
    business_type_mapping = {
        "individual": ("individual", "independent"),
        "studio": ("studio", "independent"),
        "salon": ("salon", "independent"),
        "enterprise": ("enterprise", "franchise")
    }
    
    billing_plan, org_type = business_type_mapping.get(registration_data.businessType, ("individual", "independent"))
    
    # Override billing plan if pricing info is provided
    if registration_data.pricingInfo and registration_data.pricingInfo.get('tier'):
        pricing_tier = registration_data.pricingInfo.get('tier', '').lower()
        if pricing_tier in ['individual', 'studio', 'salon', 'enterprise']:
            billing_plan = pricing_tier
    
    # Calculate chair count from pricing info if available
    calculated_chairs = registration_data.chairCount
    if registration_data.pricingInfo and registration_data.pricingInfo.get('chairs'):
        calculated_chairs = registration_data.pricingInfo.get('chairs', registration_data.chairCount)
    
    # Generate slug from business name
    import re
    slug_base = re.sub(r'[^a-zA-Z0-9]+', '-', registration_data.businessName.lower()).strip('-')
    slug = slug_base
    counter = 1
    while db.query(models.Organization).filter(models.Organization.slug == slug).first():
        slug = f"{slug_base}-{counter}"
        counter += 1
    
    # Create organization
    
    # Define features based on billing plan
    plan_features = {
        "individual": {
            "max_staff": 1,
            "email_marketing": False,
            "staff_management": False,
            "inventory_management": False,
            "multi_location": False,
            "api_access": False,
            "white_label": False
        },
        "studio": {
            "max_staff": 5,
            "email_marketing": True,
            "staff_management": True,
            "inventory_management": False,
            "multi_location": False,
            "api_access": False,
            "white_label": False
        },
        "salon": {
            "max_staff": 10,
            "email_marketing": True,
            "staff_management": True,
            "inventory_management": True,
            "multi_location": False,
            "api_access": False,
            "white_label": False
        },
        "enterprise": {
            "max_staff": None,
            "email_marketing": True,
            "staff_management": True,
            "inventory_management": True,
            "multi_location": True,
            "api_access": True,
            "white_label": True
        }
    }
    
    features_enabled = plan_features.get(billing_plan, plan_features["individual"])
    
    organization = models.Organization(
        name=registration_data.businessName,
        slug=slug,
        description=registration_data.description,
        street_address=registration_data.address.get('street', ''),
        city=registration_data.address.get('city', ''),
        state=registration_data.address.get('state', ''),
        zip_code=registration_data.address.get('zipCode', ''),
        country="US",
        phone=registration_data.phone,
        email=registration_data.email,
        website=registration_data.website,
        timezone="UTC",  # TODO: Detect from location or let user set
        chairs_count=calculated_chairs,
        billing_plan=billing_plan,
        organization_type=org_type,
        billing_contact_email=registration_data.email,
        features_enabled=features_enabled,
        subscription_status='trial',
        subscription_started_at=trial_start,
        subscription_expires_at=trial_end
    )
    
    db.add(organization)
    db.commit()
    db.refresh(organization)
    
    # Add user as organization owner
    from models.organization import UserRole
    user_org = models.UserOrganization(
        user_id=new_user.id,
        organization_id=organization.id,
        role=UserRole.OWNER.value,
        is_primary=True,
        can_manage_billing=True,
        can_manage_staff=True,
        can_view_analytics=True
    )
    
    db.add(user_org)
    db.commit()
    
    # Create Stripe customer and subscription for trial
    try:
        from services.stripe_service import StripeSubscriptionService
        stripe_service = StripeSubscriptionService(db)
        
        # Create Stripe customer
        stripe_customer = stripe_service.create_stripe_customer(new_user, organization)
        organization.stripe_customer_id = stripe_customer['id']
        
        # Create subscription with trial period (no payment method required)
        subscription = stripe_service.create_subscription(
            customer_id=stripe_customer['id'],
            chairs_count=calculated_chairs,
            trial_days=14,  # 14-day trial
            payment_method_id=None  # No payment method during registration
        )
        
        organization.stripe_subscription_id = subscription['id']
        db.commit()
        
        logger.info(f"Stripe subscription created for organization {organization.id}: {subscription['id']}")
        
    except Exception as e:
        logger.error(f"Failed to create Stripe subscription for organization {organization.id}: {str(e)}")
        # Don't fail registration if Stripe setup fails - user can add payment later
        # But log the error for follow-up
    
    # Create verification token and send verification email
    try:
        verification_token = create_verification_token(db, new_user)
        send_verification_email(new_user.email, verification_token, new_user.name)
        logger.info(f"Verification email sent to {new_user.email}")
    except Exception as e:
        logger.error(f"Failed to send verification email to {new_user.email}: {str(e)}")
        # Continue with registration even if email fails
    
    # Create test data if requested
    if registration_data.consent.get('testData', False):
        try:
            from services import test_data_service
            test_data_service.create_test_data_for_user(db, new_user.id, include_enterprise=False)
            db.commit()
        except Exception as e:
            # Log error but don't fail registration
            logger.error(f"Failed to create test data for user {new_user.id}: {str(e)}")
    
    # Log successful registration
    audit_logger.log_auth_event(
        "complete_registration_success",
        user_id=new_user.id,
        ip_address=client_ip,
        details={
            "organization_id": organization.id,
            "business_type": registration_data.businessType,
            "chair_count": calculated_chairs,
            "billing_plan": billing_plan,
            "pricing_info": registration_data.pricingInfo,
            "monthly_total": registration_data.pricingInfo.get('monthlyTotal') if registration_data.pricingInfo else None,
            "stripe_customer_id": organization.stripe_customer_id,
            "stripe_subscription_id": organization.stripe_subscription_id,
            "test_data_requested": registration_data.consent.get('testData', False)
        }
    )
    
    return {
        "message": "Account and business successfully created! Please check your email to verify your account before signing in.",
        "user": new_user,
        "organization": organization
    }

@router.post("/change-password", response_model=schemas.ChangePasswordResponse)
@password_reset_rate_limit  # CRITICAL: Rate limiting for password change security
async def change_password(
    request: Request,
    password_change: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Change the password for the authenticated user with enhanced security."""
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "Unknown")
    
    # Verify current password
    if not verify_password(password_change.current_password, current_user.hashed_password):
        # Log failed password change attempt
        audit_logger.log_auth_event(
            "password_change_failed",
            user_id=current_user.id,
            ip_address=client_ip,
            details={"reason": "incorrect_current_password"}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Check if user has MFA enabled - require MFA for password changes
    mfa_secret = db.query(UserMFASecret).filter(
        UserMFASecret.user_id == current_user.id,
        UserMFASecret.is_enabled == True
    ).first()
    
    if mfa_secret and hasattr(password_change, 'mfa_code'):
        # Verify MFA code if provided
        if password_change.mfa_code:
            success, error_msg = MFAService.verify_totp_code(
                user_id=current_user.id,
                code=password_change.mfa_code,
                db=db,
                ip_address=client_ip,
                user_agent=user_agent
            )
            if not success:
                audit_logger.log_auth_event(
                    "password_change_failed",
                    user_id=current_user.id,
                    ip_address=client_ip,
                    details={"reason": "invalid_mfa_code"}
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid MFA code"
                )
        elif current_user.user_type in ["admin", "super_admin"]:
            # Require MFA for admin password changes
            audit_logger.log_auth_event(
                "password_change_failed",
                user_id=current_user.id,
                ip_address=client_ip,
                details={"reason": "mfa_required_for_admin"}
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="MFA verification required for admin password changes",
                headers={"X-MFA-Required": "true"}
            )
    
    # Validate new password strength
    password_validation = validate_password_strength(
        password_change.new_password,
        user_data={
            "email": current_user.email,
            "name": current_user.name
        }
    )
    
    if not password_validation.is_valid:
        audit_logger.log_auth_event(
            "password_change_failed",
            user_id=current_user.id,
            ip_address=client_ip,
            details={"reason": "weak_password", "strength_score": password_validation.strength_score}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "New password does not meet security requirements",
                "errors": password_validation.errors,
                "warnings": password_validation.warnings,
                "recommendations": password_validation.recommendations,
                "strength_score": password_validation.strength_score,
                "strength_level": password_validation.strength_level
            }
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(password_change.new_password)
    db.commit()
    
    # Log successful password change
    audit_logger.log_auth_event(
        "password_change_success",
        user_id=current_user.id,
        ip_address=client_ip,
        details={
            "mfa_verified": bool(mfa_secret and hasattr(password_change, 'mfa_code')),
            "user_role": current_user.user_type
        }
    )
    
    return {"message": "Password successfully changed"}

@router.post("/register-client", response_model=schemas.ClientRegistrationResponse)
@register_rate_limit
async def register_client(
    request: Request,
    client_data: schemas.ClientRegistrationData,
    db: Session = Depends(get_db)
):
    """Register a new client account for booking appointments."""
    client_ip = request.client.host if request.client else "unknown"
    
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == client_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password strength
    password_validation = validate_password_strength(
        client_data.password,
        user_data={
            "email": client_data.email,
            "name": f"{client_data.first_name} {client_data.last_name}"
        }
    )
    
    if not password_validation.is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Password does not meet security requirements",
                "errors": password_validation.errors,
                "warnings": password_validation.warnings,
                "recommendations": password_validation.recommendations,
                "strength_score": password_validation.strength_score,
                "strength_level": password_validation.strength_level
            }
        )
    
    # Create new client user
    from datetime import datetime, timezone
    
    hashed_password = get_password_hash(client_data.password)
    new_user = models.User(
        email=client_data.email,
        name=f"{client_data.first_name} {client_data.last_name}",
        hashed_password=hashed_password,
        user_type="client",
        unified_role="client",
        email_verified=True,  # For clients, we trust email immediately for better UX
        verified_at=datetime.now(timezone.utc).replace(tzinfo=None)
    )
    
    # Store phone number if provided
    if client_data.phone:
        new_user.phone = client_data.phone
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Send welcome email (not verification email)
    try:
        from utils.email_service import send_welcome_email
        send_welcome_email(new_user.email, new_user.name)
        logger.info(f"Welcome email sent to {new_user.email}")
    except Exception as e:
        logger.error(f"Failed to send welcome email to {new_user.email}: {str(e)}")
        # Continue with registration even if email fails
    
    # Log successful registration
    audit_logger.log_auth_event(
        "client_registration_success",
        user_id=new_user.id,
        ip_address=client_ip,
        details={
            "marketing_consent": client_data.marketing_consent,
            "phone_provided": bool(client_data.phone)
        }
    )
    
    # Generate tokens for auto-login
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.email, "role": "client"},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": new_user.email}
    )
    
    return {
        "message": "Welcome to BookedBarber! Your account has been created.",
        "user": new_user,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

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

@router.get("/password-policy")
async def get_password_policy():
    """Get current password policy requirements."""
    policy = password_security_service.get_password_policy()
    return {
        "policy": policy,
        "message": "Password must meet all security requirements for account protection"
    }

@router.post("/validate-password") 
@login_rate_limit  # CRITICAL: Rate limiting for password validation security
async def validate_password_endpoint(
    request: Request,
    password_data: dict,  # {"password": "string", "user_data": {...}}
    current_user: models.User = Depends(get_current_user)
):
    """Validate password strength without changing it."""
    password = password_data.get("password", "")
    
    if not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required"
        )
    
    user_data = {
        "email": current_user.email,
        "name": current_user.name
    }
    
    validation_result = validate_password_strength(password, user_data)
    
    return {
        "is_valid": validation_result.is_valid,
        "strength_score": validation_result.strength_score,
        "strength_level": validation_result.strength_level,
        "errors": validation_result.errors,
        "warnings": validation_result.warnings,
        "recommendations": validation_result.recommendations
    }

@router.post("/logout")
async def logout(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
    current_user: models.User = Depends(get_current_user)
):
    """Logout user by blacklisting their current token and clearing cookies."""
    from services.token_blacklist import blacklist_token
    from utils.cookie_auth import clear_auth_cookies
    from fastapi.responses import JSONResponse
    
    token = credentials.credentials
    client_ip = request.client.host if request.client else "unknown"
    
    # Blacklist the current token
    success = blacklist_token(token, "logout")
    
    # Create response and clear authentication cookies
    response_data = {"message": "Logged out successfully"}
    response = JSONResponse(content=response_data)
    clear_auth_cookies(response)
    
    if success:
        audit_logger.info(
            "User logout successful",
            extra={
                "user_id": current_user.id,
                "user_email": current_user.email,
                "ip_address": client_ip,
                "action": "logout",
                "token_blacklisted": True,
                "cookies_cleared": True
            }
        )
    else:
        # Even if blacklisting fails, we should still report success to the user
        # to avoid revealing internal system details
        audit_logger.warning(
            "Logout token blacklisting failed",
            extra={
                "user_id": current_user.id,
                "user_email": current_user.email,
                "ip_address": client_ip,
                "action": "logout_failed",
                "cookies_cleared": True
            }
        )
    
    return response

@router.post("/logout-all")
async def logout_all(
    request: Request,
    current_user: models.User = Depends(get_current_user)
):
    """Logout user from all devices by blacklisting all their tokens and clearing cookies."""
    from services.token_blacklist import get_token_blacklist_service
    from utils.cookie_auth import clear_auth_cookies
    from fastapi.responses import JSONResponse
    
    client_ip = request.client.host if request.client else "unknown"
    blacklist_service = get_token_blacklist_service()
    
    # Blacklist all tokens for this user
    blacklisted_count = blacklist_service.blacklist_user_tokens(
        current_user.email, 
        "logout_all"
    )
    
    # Create response and clear authentication cookies
    response_data = {"message": "Logged out from all devices successfully"}
    response = JSONResponse(content=response_data)
    clear_auth_cookies(response)
    
    audit_logger.info(
        "User logout from all devices",
        extra={
            "user_id": current_user.id,
            "user_email": current_user.email,
            "ip_address": client_ip,
            "action": "logout_all",
            "tokens_blacklisted": blacklisted_count,
            "cookies_cleared": True
        }
    )
    
    return response