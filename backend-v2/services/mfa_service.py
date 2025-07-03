"""
Multi-Factor Authentication (MFA) Service

Comprehensive service for handling TOTP-based 2FA with backup codes,
device trust management, and security event logging.
"""

import secrets
import string
import hashlib
import qrcode
import io
import base64
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import pyotp
import logging

from models.mfa import UserMFASecret, MFABackupCode, MFADeviceTrust, MFAEvent
from models.user import User
from utils.encryption import encrypt_data, decrypt_data
from utils.logging_config import get_audit_logger
from config import settings

logger = logging.getLogger(__name__)
audit_logger = get_audit_logger()


class MFAService:
    """Service for managing Multi-Factor Authentication"""
    
    # Configuration constants
    TOTP_ISSUER = "BookedBarber"
    TOTP_DIGITS = 6
    TOTP_INTERVAL = 30  # seconds
    BACKUP_CODES_COUNT = 10
    MAX_FAILED_ATTEMPTS = 5
    DEVICE_TRUST_DAYS = 30
    LOCKOUT_DURATION_MINUTES = 30
    
    @staticmethod
    def generate_totp_secret() -> str:
        """
        Generate a new TOTP secret.
        
        Returns:
            Base32 encoded secret string
        """
        return pyotp.random_base32()
    
    @staticmethod
    def create_qr_code(user_email: str, secret: str) -> str:
        """
        Create QR code for TOTP setup.
        
        Args:
            user_email: User's email address
            secret: TOTP secret
            
        Returns:
            Base64 encoded QR code image
        """
        try:
            # Create TOTP URI
            totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
                name=user_email,
                issuer_name=MFAService.TOTP_ISSUER
            )
            
            # Generate QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(totp_uri)
            qr.make(fit=True)
            
            # Create image
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            img_base64 = base64.b64encode(buffer.getvalue()).decode()
            return f"data:image/png;base64,{img_base64}"
            
        except Exception as e:
            logger.error(f"Error creating QR code: {str(e)}")
            raise
    
    @staticmethod
    def setup_mfa(
        user_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """
        Set up MFA for a user.
        
        Returns:
            Dict containing secret, QR code, and backup codes
        """
        try:
            # Check if user already has MFA
            existing_mfa = db.query(UserMFASecret).filter(
                UserMFASecret.user_id == user_id
            ).first()
            
            if existing_mfa and existing_mfa.is_enabled:
                raise ValueError("MFA is already enabled for this user")
            
            # Get user for email
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError("User not found")
            
            # Generate new secret
            secret = MFAService.generate_totp_secret()
            
            # Create or update MFA record
            if existing_mfa:
                existing_mfa.secret = encrypt_data(secret)
                existing_mfa.is_enabled = False
                existing_mfa.is_verified = False
                existing_mfa.failed_attempts = 0
                existing_mfa.updated_at = datetime.utcnow()
            else:
                existing_mfa = UserMFASecret(
                    user_id=user_id,
                    secret=encrypt_data(secret),
                    is_enabled=False,
                    is_verified=False
                )
                db.add(existing_mfa)
            
            # Generate backup codes
            backup_codes = MFAService._generate_backup_codes(user_id, db)
            
            db.commit()
            
            # Generate QR code
            qr_code = MFAService.create_qr_code(user.email, secret)
            
            # Log setup initiation
            MFAService._log_mfa_event(
                user_id=user_id,
                event_type="setup_initiated",
                event_status="success",
                db=db
            )
            
            return {
                "secret": secret,
                "qr_code": qr_code,
                "backup_codes": backup_codes,
                "totp_uri": pyotp.totp.TOTP(secret).provisioning_uri(
                    name=user.email,
                    issuer_name=MFAService.TOTP_ISSUER
                )
            }
            
        except Exception as e:
            logger.error(f"Error setting up MFA: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def verify_and_enable_mfa(
        user_id: int,
        code: str,
        db: Session
    ) -> bool:
        """
        Verify TOTP code and enable MFA.
        
        Args:
            user_id: User ID
            code: TOTP code to verify
            db: Database session
            
        Returns:
            True if verified and enabled successfully
        """
        try:
            mfa_secret = db.query(UserMFASecret).filter(
                UserMFASecret.user_id == user_id
            ).first()
            
            if not mfa_secret:
                raise ValueError("MFA not set up for this user")
            
            if mfa_secret.is_enabled:
                raise ValueError("MFA is already enabled")
            
            # Decrypt and verify code
            secret = decrypt_data(mfa_secret.secret)
            totp = pyotp.TOTP(secret)
            
            if totp.verify(code, valid_window=1):
                # Enable MFA
                mfa_secret.is_enabled = True
                mfa_secret.is_verified = True
                mfa_secret.enabled_at = datetime.utcnow()
                mfa_secret.failed_attempts = 0
                db.commit()
                
                # Log successful enablement
                MFAService._log_mfa_event(
                    user_id=user_id,
                    event_type="enabled",
                    event_status="success",
                    db=db
                )
                
                audit_logger.log_security_event(
                    "mfa_enabled",
                    details={
                        "user_id": user_id,
                        "method": "totp"
                    }
                )
                
                return True
            else:
                # Log failed attempt
                MFAService._log_mfa_event(
                    user_id=user_id,
                    event_type="enable_failed",
                    event_status="failure",
                    event_details="Invalid code during setup",
                    db=db
                )
                return False
                
        except Exception as e:
            logger.error(f"Error verifying and enabling MFA: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def verify_totp_code(
        user_id: int,
        code: str,
        db: Session,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Verify TOTP code for authentication.
        
        Returns:
            Tuple of (success, error_message)
        """
        try:
            mfa_secret = db.query(UserMFASecret).filter(
                UserMFASecret.user_id == user_id
            ).first()
            
            if not mfa_secret or not mfa_secret.is_enabled:
                return False, "MFA not enabled for this user"
            
            # Check if account is locked
            if MFAService._is_account_locked(mfa_secret):
                remaining_time = MFAService._get_lockout_remaining_time(mfa_secret)
                return False, f"Account locked. Try again in {remaining_time} minutes"
            
            # Decrypt and verify code
            secret = decrypt_data(mfa_secret.secret)
            totp = pyotp.TOTP(secret)
            
            if totp.verify(code, valid_window=1):
                # Reset failed attempts
                mfa_secret.failed_attempts = 0
                mfa_secret.last_used_at = datetime.utcnow()
                db.commit()
                
                # Log successful verification
                MFAService._log_mfa_event(
                    user_id=user_id,
                    event_type="totp_verified",
                    event_status="success",
                    ip_address=ip_address,
                    user_agent=user_agent,
                    db=db
                )
                
                return True, None
            else:
                # Increment failed attempts
                mfa_secret.failed_attempts += 1
                mfa_secret.last_failed_at = datetime.utcnow()
                db.commit()
                
                # Log failed attempt
                MFAService._log_mfa_event(
                    user_id=user_id,
                    event_type="totp_failed",
                    event_status="failure",
                    event_details=f"Failed attempt {mfa_secret.failed_attempts}",
                    ip_address=ip_address,
                    user_agent=user_agent,
                    db=db
                )
                
                if mfa_secret.failed_attempts >= MFAService.MAX_FAILED_ATTEMPTS:
                    audit_logger.log_security_event(
                        "mfa_lockout",
                        ip_address=ip_address,
                        user_agent=user_agent,
                        severity="high",
                        details={
                            "user_id": user_id,
                            "failed_attempts": mfa_secret.failed_attempts
                        }
                    )
                    return False, "Too many failed attempts. Account locked temporarily"
                
                return False, "Invalid code"
                
        except Exception as e:
            logger.error(f"Error verifying TOTP code: {str(e)}")
            return False, "Error verifying code"
    
    @staticmethod
    def verify_backup_code(
        user_id: int,
        code: str,
        db: Session,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Verify and consume a backup code.
        
        Returns:
            Tuple of (success, error_message)
        """
        try:
            # Normalize code (remove spaces and dashes)
            normalized_code = code.upper().replace(' ', '').replace('-', '')
            
            # Hash the code for comparison
            code_hash = hashlib.sha256(normalized_code.encode()).hexdigest()
            
            # Find unused backup code
            backup_code = db.query(MFABackupCode).filter(
                and_(
                    MFABackupCode.user_id == user_id,
                    MFABackupCode.code_hash == code_hash,
                    MFABackupCode.is_used == False
                )
            ).first()
            
            if backup_code:
                # Mark as used
                backup_code.is_used = True
                backup_code.used_at = datetime.utcnow()
                db.commit()
                
                # Log successful use
                MFAService._log_mfa_event(
                    user_id=user_id,
                    event_type="backup_code_used",
                    event_status="success",
                    event_details=f"Backup code {backup_code.id} used",
                    ip_address=ip_address,
                    user_agent=user_agent,
                    db=db
                )
                
                audit_logger.log_security_event(
                    "mfa_backup_code_used",
                    ip_address=ip_address,
                    user_agent=user_agent,
                    details={
                        "user_id": user_id,
                        "remaining_codes": MFAService._count_remaining_backup_codes(user_id, db)
                    }
                )
                
                return True, None
            else:
                # Log failed attempt
                MFAService._log_mfa_event(
                    user_id=user_id,
                    event_type="backup_code_failed",
                    event_status="failure",
                    ip_address=ip_address,
                    user_agent=user_agent,
                    db=db
                )
                
                return False, "Invalid backup code"
                
        except Exception as e:
            logger.error(f"Error verifying backup code: {str(e)}")
            return False, "Error verifying backup code"
    
    @staticmethod
    def regenerate_backup_codes(
        user_id: int,
        db: Session
    ) -> List[str]:
        """
        Regenerate backup codes for a user.
        
        Returns:
            List of new backup codes
        """
        try:
            # Verify MFA is enabled
            mfa_secret = db.query(UserMFASecret).filter(
                UserMFASecret.user_id == user_id
            ).first()
            
            if not mfa_secret or not mfa_secret.is_enabled:
                raise ValueError("MFA not enabled for this user")
            
            # Delete existing backup codes
            db.query(MFABackupCode).filter(
                MFABackupCode.user_id == user_id
            ).delete()
            
            # Generate new codes
            backup_codes = MFAService._generate_backup_codes(user_id, db)
            
            db.commit()
            
            # Log regeneration
            MFAService._log_mfa_event(
                user_id=user_id,
                event_type="backup_codes_regenerated",
                event_status="success",
                event_details=f"Generated {len(backup_codes)} new codes",
                db=db
            )
            
            audit_logger.log_security_event(
                "mfa_backup_codes_regenerated",
                details={
                    "user_id": user_id,
                    "codes_count": len(backup_codes)
                }
            )
            
            return backup_codes
            
        except Exception as e:
            logger.error(f"Error regenerating backup codes: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def trust_device(
        user_id: int,
        device_fingerprint: str,
        device_name: Optional[str] = None,
        browser: Optional[str] = None,
        platform: Optional[str] = None,
        ip_address: Optional[str] = None,
        db: Session = None
    ) -> str:
        """
        Create a device trust token.
        
        Returns:
            Trust token for the device
        """
        try:
            # Generate trust token
            trust_token = secrets.token_urlsafe(32)
            
            # Create device trust record
            device_trust = MFADeviceTrust(
                user_id=user_id,
                device_fingerprint=device_fingerprint,
                device_name=device_name or "Unknown Device",
                browser=browser,
                platform=platform,
                trust_token=trust_token,
                trusted_until=datetime.utcnow() + timedelta(days=MFAService.DEVICE_TRUST_DAYS),
                ip_address=ip_address
            )
            
            db.add(device_trust)
            db.commit()
            
            # Log device trust
            MFAService._log_mfa_event(
                user_id=user_id,
                event_type="device_trusted",
                event_status="success",
                event_details=f"Device: {device_name or 'Unknown'}",
                ip_address=ip_address,
                device_fingerprint=device_fingerprint,
                db=db
            )
            
            return trust_token
            
        except Exception as e:
            logger.error(f"Error trusting device: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def verify_device_trust(
        user_id: int,
        trust_token: str,
        device_fingerprint: str,
        db: Session
    ) -> bool:
        """
        Verify if a device is trusted.
        
        Returns:
            True if device is trusted and valid
        """
        try:
            device_trust = db.query(MFADeviceTrust).filter(
                and_(
                    MFADeviceTrust.user_id == user_id,
                    MFADeviceTrust.trust_token == trust_token,
                    MFADeviceTrust.device_fingerprint == device_fingerprint,
                    MFADeviceTrust.revoked_at.is_(None)
                )
            ).first()
            
            if device_trust and device_trust.is_valid:
                # Update usage stats
                device_trust.last_used_at = datetime.utcnow()
                device_trust.usage_count += 1
                db.commit()
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error verifying device trust: {str(e)}")
            return False
    
    @staticmethod
    def revoke_device_trust(
        user_id: int,
        device_id: Optional[int] = None,
        revoke_all: bool = False,
        reason: str = "User requested",
        db: Session = None
    ) -> int:
        """
        Revoke device trust.
        
        Args:
            user_id: User ID
            device_id: Specific device ID to revoke
            revoke_all: Revoke all trusted devices
            reason: Reason for revocation
            db: Database session
            
        Returns:
            Number of devices revoked
        """
        try:
            query = db.query(MFADeviceTrust).filter(
                and_(
                    MFADeviceTrust.user_id == user_id,
                    MFADeviceTrust.revoked_at.is_(None)
                )
            )
            
            if device_id and not revoke_all:
                query = query.filter(MFADeviceTrust.id == device_id)
            
            devices = query.all()
            
            for device in devices:
                device.revoked_at = datetime.utcnow()
                device.revoked_reason = reason
            
            db.commit()
            
            # Log revocation
            MFAService._log_mfa_event(
                user_id=user_id,
                event_type="devices_revoked",
                event_status="success",
                event_details=f"Revoked {len(devices)} devices: {reason}",
                db=db
            )
            
            if len(devices) > 0:
                audit_logger.log_security_event(
                    "mfa_devices_revoked",
                    details={
                        "user_id": user_id,
                        "devices_count": len(devices),
                        "reason": reason
                    }
                )
            
            return len(devices)
            
        except Exception as e:
            logger.error(f"Error revoking device trust: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def disable_mfa(
        user_id: int,
        reason: str = "User requested",
        db: Session = None
    ) -> bool:
        """
        Disable MFA for a user.
        
        Returns:
            True if disabled successfully
        """
        try:
            mfa_secret = db.query(UserMFASecret).filter(
                UserMFASecret.user_id == user_id
            ).first()
            
            if not mfa_secret or not mfa_secret.is_enabled:
                return False
            
            # Disable MFA
            mfa_secret.is_enabled = False
            mfa_secret.disabled_at = datetime.utcnow()
            
            # Revoke all trusted devices
            MFAService.revoke_device_trust(
                user_id=user_id,
                revoke_all=True,
                reason="MFA disabled",
                db=db
            )
            
            # Delete backup codes
            db.query(MFABackupCode).filter(
                MFABackupCode.user_id == user_id
            ).delete()
            
            db.commit()
            
            # Log disabling
            MFAService._log_mfa_event(
                user_id=user_id,
                event_type="disabled",
                event_status="success",
                event_details=reason,
                db=db
            )
            
            audit_logger.log_security_event(
                "mfa_disabled",
                severity="high",
                details={
                    "user_id": user_id,
                    "reason": reason
                }
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error disabling MFA: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def get_mfa_status(
        user_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """
        Get MFA status for a user.
        
        Returns:
            Dict with MFA status information
        """
        try:
            mfa_secret = db.query(UserMFASecret).filter(
                UserMFASecret.user_id == user_id
            ).first()
            
            if not mfa_secret:
                return {
                    "enabled": False,
                    "verified": False,
                    "setup_required": True
                }
            
            # Count backup codes
            backup_codes_count = MFAService._count_remaining_backup_codes(user_id, db)
            
            # Count trusted devices
            trusted_devices = db.query(MFADeviceTrust).filter(
                and_(
                    MFADeviceTrust.user_id == user_id,
                    MFADeviceTrust.revoked_at.is_(None),
                    MFADeviceTrust.trusted_until > datetime.utcnow()
                )
            ).count()
            
            return {
                "enabled": mfa_secret.is_enabled,
                "verified": mfa_secret.is_verified,
                "setup_required": not mfa_secret.is_enabled,
                "backup_codes_remaining": backup_codes_count,
                "trusted_devices": trusted_devices,
                "last_used": mfa_secret.last_used_at,
                "recovery_email": mfa_secret.recovery_email,
                "recovery_phone": mfa_secret.recovery_phone
            }
            
        except Exception as e:
            logger.error(f"Error getting MFA status: {str(e)}")
            raise
    
    @staticmethod
    def list_trusted_devices(
        user_id: int,
        db: Session
    ) -> List[Dict[str, Any]]:
        """
        List all trusted devices for a user.
        
        Returns:
            List of trusted device information
        """
        try:
            devices = db.query(MFADeviceTrust).filter(
                and_(
                    MFADeviceTrust.user_id == user_id,
                    MFADeviceTrust.revoked_at.is_(None)
                )
            ).order_by(MFADeviceTrust.created_at.desc()).all()
            
            return [
                {
                    "id": device.id,
                    "device_name": device.device_name,
                    "browser": device.browser,
                    "platform": device.platform,
                    "last_used": device.last_used_at,
                    "created": device.created_at,
                    "expires": device.trusted_until,
                    "is_valid": device.is_valid,
                    "usage_count": device.usage_count,
                    "ip_address": device.ip_address
                }
                for device in devices
            ]
            
        except Exception as e:
            logger.error(f"Error listing trusted devices: {str(e)}")
            raise
    
    @staticmethod
    def get_mfa_events(
        user_id: int,
        limit: int = 50,
        db: Session = None
    ) -> List[Dict[str, Any]]:
        """
        Get recent MFA events for a user.
        
        Returns:
            List of MFA events
        """
        try:
            events = db.query(MFAEvent).filter(
                MFAEvent.user_id == user_id
            ).order_by(
                MFAEvent.created_at.desc()
            ).limit(limit).all()
            
            return [
                {
                    "id": event.id,
                    "event_type": event.event_type,
                    "event_status": event.event_status,
                    "event_details": event.event_details,
                    "ip_address": event.ip_address,
                    "user_agent": event.user_agent,
                    "created_at": event.created_at
                }
                for event in events
            ]
            
        except Exception as e:
            logger.error(f"Error getting MFA events: {str(e)}")
            raise
    
    # Private helper methods
    
    @staticmethod
    def _generate_backup_codes(user_id: int, db: Session) -> List[str]:
        """Generate and store backup codes."""
        codes = []
        
        for _ in range(MFAService.BACKUP_CODES_COUNT):
            code = MFABackupCode.generate_backup_code()
            codes.append(code)
            
            # Store hashed code
            code_hash = hashlib.sha256(
                code.upper().replace(' ', '').replace('-', '').encode()
            ).hexdigest()
            
            backup_code = MFABackupCode(
                user_id=user_id,
                code_hash=code_hash
            )
            db.add(backup_code)
        
        return codes
    
    @staticmethod
    def _count_remaining_backup_codes(user_id: int, db: Session) -> int:
        """Count remaining unused backup codes."""
        return db.query(MFABackupCode).filter(
            and_(
                MFABackupCode.user_id == user_id,
                MFABackupCode.is_used == False
            )
        ).count()
    
    @staticmethod
    def _is_account_locked(mfa_secret: UserMFASecret) -> bool:
        """Check if account is locked due to failed attempts."""
        if mfa_secret.failed_attempts < MFAService.MAX_FAILED_ATTEMPTS:
            return False
        
        if not mfa_secret.last_failed_at:
            return False
        
        lockout_until = mfa_secret.last_failed_at + timedelta(
            minutes=MFAService.LOCKOUT_DURATION_MINUTES
        )
        
        return datetime.utcnow() < lockout_until
    
    @staticmethod
    def _get_lockout_remaining_time(mfa_secret: UserMFASecret) -> int:
        """Get remaining lockout time in minutes."""
        if not mfa_secret.last_failed_at:
            return 0
        
        lockout_until = mfa_secret.last_failed_at + timedelta(
            minutes=MFAService.LOCKOUT_DURATION_MINUTES
        )
        
        remaining = lockout_until - datetime.utcnow()
        return max(0, int(remaining.total_seconds() / 60))
    
    @staticmethod
    def _log_mfa_event(
        user_id: int,
        event_type: str,
        event_status: str,
        event_details: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        device_fingerprint: Optional[str] = None,
        db: Session = None
    ):
        """Log an MFA event."""
        try:
            event = MFAEvent(
                user_id=user_id,
                event_type=event_type,
                event_status=event_status,
                event_details=event_details,
                ip_address=ip_address,
                user_agent=user_agent,
                device_fingerprint=device_fingerprint
            )
            db.add(event)
            db.commit()
        except Exception as e:
            logger.error(f"Error logging MFA event: {str(e)}")
            # Don't raise - logging failure shouldn't break MFA operations
    
    @staticmethod
    def cleanup_expired_devices(db: Session) -> int:
        """
        Clean up expired device trusts. Should be run periodically.
        
        Returns:
            Number of devices cleaned up
        """
        try:
            expired_devices = db.query(MFADeviceTrust).filter(
                and_(
                    MFADeviceTrust.trusted_until < datetime.utcnow(),
                    MFADeviceTrust.revoked_at.is_(None)
                )
            ).all()
            
            count = len(expired_devices)
            
            for device in expired_devices:
                device.revoked_at = datetime.utcnow()
                device.revoked_reason = "Expired"
            
            db.commit()
            
            if count > 0:
                logger.info(f"Cleaned up {count} expired device trusts")
            
            return count
            
        except Exception as e:
            logger.error(f"Error cleaning up expired devices: {str(e)}")
            db.rollback()
            return 0


# Create singleton instance
mfa_service = MFAService()