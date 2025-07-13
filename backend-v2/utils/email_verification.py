"""
Email verification functionality for user registration
"""
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from typing import Optional
import models

# Token configuration
TOKEN_LENGTH = 32  # Characters in verification token
TOKEN_EXPIRY_HOURS = 24  # Token expires in 24 hours

def generate_verification_token() -> str:
    """Generate a secure random token for email verification"""
    return secrets.token_urlsafe(TOKEN_LENGTH)

def create_verification_token(db: Session, user: models.User) -> str:
    """Create a verification token for a user"""
    # Generate new token
    token = generate_verification_token()
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS)).replace(tzinfo=None)  # Store as naive datetime for SQLite compatibility
    
    # Update user with verification token
    user.verification_token = token
    user.verification_token_expires = expires_at
    
    db.commit()
    
    return token

def verify_email_token(db: Session, token: str) -> Optional[models.User]:
    """Verify an email verification token and mark email as verified"""
    user = db.query(models.User).filter(
        models.User.verification_token == token
    ).first()
    
    if not user:
        return None
    
    # Check if token is expired
    if user.verification_token_expires:
        # Handle both timezone-aware and timezone-naive datetimes
        now = datetime.now(timezone.utc)
        expiry = user.verification_token_expires
        
        # If expiry time is timezone-naive, assume it's UTC
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        
        if expiry < now:
            return None
    
    # Mark email as verified
    user.email_verified = True
    user.verified_at = datetime.now(timezone.utc).replace(tzinfo=None)  # Store as naive datetime for SQLite compatibility
    user.verification_token = None  # Clear the token
    user.verification_token_expires = None
    
    db.commit()
    db.refresh(user)
    
    return user

def is_verification_token_valid(user: models.User) -> bool:
    """Check if a user's verification token is valid (exists and not expired)"""
    if not user.verification_token:
        return False
    
    if user.verification_token_expires and user.verification_token_expires < datetime.now(timezone.utc):
        return False
        
    return True

def send_verification_email(email: str, verification_token: str, user_name: str = None):
    """Send email verification email using notification service"""
    from services.notification_service import NotificationService
    from config import settings
    
    # Use environment-based URL
    base_url = getattr(settings, 'frontend_url', "http://localhost:3000")
    verification_url = f"{base_url}/verify-email?token={verification_token}"
    
    # If notification service is available, use it
    try:
        notification_service = NotificationService()
        
        # Prepare context for template
        context = {
            "user_name": user_name or email.split('@')[0],
            "verification_url": verification_url,
            "expiry_hours": TOKEN_EXPIRY_HOURS
        }
        
        # Read template files
        from pathlib import Path
        template_dir = Path(__file__).parent.parent / "templates" / "notifications"
        
        html_template = None
        text_template = None
        
        html_path = template_dir / "email_verification.html"
        text_path = template_dir / "email_verification.txt"
        
        if html_path.exists():
            with open(html_path, 'r') as f:
                from jinja2 import Template
                html_template = Template(f.read())
                html_body = html_template.render(**context)
        else:
            html_body = None
            
        if text_path.exists():
            with open(text_path, 'r') as f:
                from jinja2 import Template
                text_template = Template(f.read())
                text_body = text_template.render(**context)
        else:
            # Fallback text
            text_body = f"""
Verify Your Email Address

Hi {context['user_name']},

Welcome to BookedBarber! To complete your account setup, please verify your email address by clicking the link below:

{verification_url}

This link will expire in {TOKEN_EXPIRY_HOURS} hours.

If you didn't create an account with us, please ignore this email.

Best regards,
The BookedBarber Team
"""
        
        # Send email if SendGrid is configured
        if hasattr(notification_service, 'sendgrid_client') and notification_service.sendgrid_client:
            result = notification_service.send_email(
                to_email=email,
                subject="Verify Your Email Address - BookedBarber",
                body=html_body or text_body
            )
            print(f"Verification email sent to {email}")
            return result
        else:
            # Fallback to console output
            print(f"""
    ========== EMAIL VERIFICATION EMAIL ==========
    To: {email}
    Subject: Verify Your Email Address - BookedBarber
    
    {text_body}
    ===============================================
    """)
            
    except Exception as e:
        # Fallback to console output if notification service fails
        print(f"Failed to send email via notification service: {e}")
        print(f"""
    ========== EMAIL VERIFICATION EMAIL ==========
    To: {email}
    Subject: Verify Your Email Address - BookedBarber
    
    Hi {user_name or email.split('@')[0]},
    
    Welcome to BookedBarber! To complete your account setup, please verify your email address by clicking the link below:
    
    {verification_url}
    
    This link will expire in {TOKEN_EXPIRY_HOURS} hours.
    
    If you didn't create an account with us, please ignore this email.
    
    Best regards,
    The BookedBarber Team
    ===============================================
    """)

def resend_verification_email(db: Session, user: models.User) -> bool:
    """Resend verification email to user"""
    if user.email_verified:
        return False  # Already verified
    
    # Create new verification token
    token = create_verification_token(db, user)
    
    # Send verification email
    send_verification_email(user.email, token, user.name)
    
    return True