"""
Password reset functionality
"""
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from typing import Optional
import models

# Token configuration
TOKEN_LENGTH = 32  # Characters in reset token
TOKEN_EXPIRY_HOURS = 1  # Token expires in 1 hour

def generate_reset_token() -> str:
    """Generate a secure random token for password reset"""
    return secrets.token_urlsafe(TOKEN_LENGTH)

def create_password_reset_token(db: Session, user: models.User) -> models.PasswordResetToken:
    """Create a password reset token for a user"""
    # Invalidate any existing tokens for this user
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user.id,
        models.PasswordResetToken.used == False
    ).update({"used": True})
    
    # Create new token
    token = generate_reset_token()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS)
    
    reset_token = models.PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at
    )
    
    db.add(reset_token)
    db.commit()
    db.refresh(reset_token)
    
    return reset_token

def verify_reset_token(db: Session, token: str) -> Optional[models.User]:
    """Verify a password reset token and return the associated user"""
    reset_token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == token
    ).first()
    
    if not reset_token:
        return None
    
    if not reset_token.is_valid():
        return None
    
    return reset_token.user

def use_reset_token(db: Session, token: str) -> bool:
    """Mark a reset token as used"""
    reset_token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == token
    ).first()
    
    if not reset_token:
        return False
    
    reset_token.used = True
    db.commit()
    
    return True

def send_reset_email(email: str, reset_token: str, user_name: str = None):
    """Send password reset email using notification service"""
    from services.notification_service import NotificationService
    from config import settings
    
    # Use environment-based URL
    base_url = settings.frontend_url if hasattr(settings, 'frontend_url') else "http://localhost:3000"
    reset_url = f"{base_url}/reset-password?token={reset_token}"
    
    # If notification service is available, use it
    try:
        notification_service = NotificationService()
        
        # Prepare context for template
        context = {
            "user_name": user_name or email.split('@')[0],
            "reset_url": reset_url,
            "expiry_hours": TOKEN_EXPIRY_HOURS
        }
        
        # Read template files
        from pathlib import Path
        template_dir = Path(__file__).parent.parent / "templates" / "notifications"
        
        html_template = None
        text_template = None
        
        html_path = template_dir / "password_reset.html"
        text_path = template_dir / "password_reset.txt"
        
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
Reset Your Password

Hi {context['user_name']},

Click the link below to reset your password:
{reset_url}

This link will expire in {TOKEN_EXPIRY_HOURS} hour(s).

If you didn't request this, please ignore this email.
"""
        
        # Send email if SendGrid is configured
        if notification_service.sendgrid_client:
            result = notification_service.send_email(
                to_email=email,
                subject="Reset Your Password - 6FB",
                body=html_body or text_body
            )
            print(f"Password reset email sent to {email}")
            return result
        else:
            # Fallback to console output
            print(f"""
    ========== PASSWORD RESET EMAIL ==========
    To: {email}
    Subject: Reset Your Password - 6FB
    
    {text_body}
    ==========================================
    """)
            
    except Exception as e:
        # Fallback to console output if notification service fails
        print(f"Failed to send email via notification service: {e}")
        print(f"""
    ========== PASSWORD RESET EMAIL ==========
    To: {email}
    Subject: Password Reset Request
    
    Click the link below to reset your password:
    {reset_url}
    
    This link will expire in {TOKEN_EXPIRY_HOURS} hour(s).
    
    If you didn't request this, please ignore this email.
    ==========================================
    """)