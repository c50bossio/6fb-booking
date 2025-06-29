"""
Password reset functionality
"""
import secrets
from datetime import datetime, timedelta
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
    expires_at = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS)
    
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

def send_reset_email(email: str, reset_token: str):
    """Send password reset email (placeholder for actual email service)"""
    # In production, this would integrate with SendGrid or similar
    reset_url = f"http://localhost:3000/reset-password?token={reset_token}"
    
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