"""
Enhanced Multi-Factor Authentication Service for BookedBarber V2

Advanced MFA system with device trust, biometric authentication support,
adaptive security, and improved user experience while maintaining
enterprise-grade security standards.
"""

import json
import logging
import secrets
import base64
import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import redis
import pyotp
import qrcode
import io
from sqlalchemy.orm import Session

from models import User
from utils.encryption import encrypt_data, decrypt_data
from utils.logging_config import get_audit_logger
from services.notification_service import NotificationService

logger = logging.getLogger(__name__)
audit_logger = get_audit_logger()


class MFAMethod(Enum):
    """Multi-factor authentication methods"""
    TOTP = "totp"                    # Time-based OTP (Google Authenticator, etc.)
    SMS = "sms"                      # SMS verification
    EMAIL = "email"                  # Email verification
    PUSH_NOTIFICATION = "push"       # Push notification
    BIOMETRIC = "biometric"          # Biometric authentication
    HARDWARE_TOKEN = "hardware"      # Hardware security key (WebAuthn)
    BACKUP_CODES = "backup_codes"    # Backup recovery codes


class DeviceTrustLevel(Enum):
    """Device trust levels"""
    UNTRUSTED = "untrusted"          # Unknown/new device
    RECOGNIZED = "recognized"        # Previously seen device
    TRUSTED = "trusted"              # Explicitly trusted device
    MANAGED = "managed"              # Enterprise-managed device


class BiometricType(Enum):
    """Supported biometric authentication types"""
    FINGERPRINT = "fingerprint"
    FACE_ID = "face_id"
    VOICE = "voice"
    TOUCH_ID = "touch_id"


@dataclass
class TrustedDevice:
    """Trusted device information"""
    device_id: str
    user_id: int
    device_name: str
    device_fingerprint: str
    trust_level: DeviceTrustLevel
    platform: str                   # iOS, Android, Web, etc.
    user_agent: str
    ip_address: str
    location: Optional[str]
    first_seen: datetime
    last_seen: datetime
    trusted_at: Optional[datetime]
    expires_at: Optional[datetime]
    is_active: bool = True


@dataclass
class MFAChallenge:
    """MFA challenge structure"""
    challenge_id: str
    user_id: int
    method: MFAMethod
    challenge_data: Dict[str, Any]
    created_at: datetime
    expires_at: datetime
    attempts: int = 0
    max_attempts: int = 3
    is_verified: bool = False


@dataclass
class BiometricTemplate:
    """Biometric authentication template"""
    template_id: str
    user_id: int
    biometric_type: BiometricType
    template_hash: str               # Hashed biometric template
    device_id: str
    created_at: datetime
    last_used: Optional[datetime]
    usage_count: int = 0
    is_active: bool = True


@dataclass
class MFAConfiguration:
    """User MFA configuration"""
    user_id: int
    primary_method: MFAMethod
    backup_methods: List[MFAMethod]
    device_trust_enabled: bool
    biometric_enabled: bool
    adaptive_security: bool          # Risk-based authentication
    remember_device_duration: int    # Days to remember trusted devices
    require_mfa_for: List[str]       # Actions requiring MFA
    last_updated: datetime


class EnhancedMFAService:
    """
    Enhanced Multi-Factor Authentication service with device trust,
    biometric support, and adaptive security
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client
        
        # MFA configuration
        self.config = {
            "totp_issuer": "BookedBarber",
            "totp_window": 1,                    # Time window for TOTP validation
            "sms_code_length": 6,
            "email_code_length": 8,
            "challenge_expiry_minutes": 10,
            "device_trust_duration_days": 30,
            "backup_codes_count": 10,
            "max_failed_attempts": 3,
            "lockout_duration_minutes": 15,
            "biometric_confidence_threshold": 0.85,
            "adaptive_security_threshold": 0.7
        }
        
        # Risk factors for adaptive authentication
        self.risk_factors = {
            "unknown_device": 0.4,
            "unusual_location": 0.3,
            "unusual_time": 0.2,
            "high_value_action": 0.5,
            "recent_password_change": 0.3,
            "multiple_failed_attempts": 0.6
        }
        
    async def setup_mfa_for_user(
        self,
        user_id: int,
        primary_method: MFAMethod,
        device_info: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """
        Set up MFA for a user with the specified primary method
        
        Args:
            user_id: User ID
            primary_method: Primary MFA method
            device_info: Device information for trust establishment
            db: Database session
            
        Returns:
            Setup information including QR codes, backup codes, etc.
        """
        
        try:
            setup_data = {}
            
            # Generate MFA configuration
            mfa_config = MFAConfiguration(
                user_id=user_id,
                primary_method=primary_method,
                backup_methods=[MFAMethod.BACKUP_CODES, MFAMethod.EMAIL],
                device_trust_enabled=True,
                biometric_enabled=True,
                adaptive_security=True,
                remember_device_duration=self.config["device_trust_duration_days"],
                require_mfa_for=["login", "payment", "settings_change", "admin_access"],
                last_updated=datetime.utcnow()
            )
            
            # Set up TOTP if selected
            if primary_method == MFAMethod.TOTP:
                totp_setup = await self._setup_totp(user_id)
                setup_data.update(totp_setup)
            
            # Set up SMS if selected
            elif primary_method == MFAMethod.SMS:
                sms_setup = await self._setup_sms(user_id, db)
                setup_data.update(sms_setup)
            
            # Set up biometric if supported
            if primary_method == MFAMethod.BIOMETRIC:
                biometric_setup = await self._setup_biometric(user_id, device_info)
                setup_data.update(biometric_setup)
            
            # Generate backup codes
            backup_codes = await self._generate_backup_codes(user_id)
            setup_data["backup_codes"] = backup_codes
            
            # Register current device as trusted
            trusted_device = await self._register_trusted_device(user_id, device_info)
            setup_data["trusted_device"] = asdict(trusted_device)
            
            # Store MFA configuration
            await self._store_mfa_configuration(mfa_config)
            
            # Log MFA setup
            audit_logger.log_security_event(
                "mfa_setup_completed",
                user_id=user_id,
                details={
                    "primary_method": primary_method.value,
                    "device_trust_enabled": True,
                    "biometric_enabled": True
                }
            )
            
            return {
                "success": True,
                "message": "MFA setup completed successfully",
                "setup_data": setup_data,
                "configuration": asdict(mfa_config)
            }
            
        except Exception as e:
            logger.error(f"Error setting up MFA for user {user_id}: {e}")
            raise
    
    async def initiate_mfa_challenge(
        self,
        user_id: int,
        action: str,
        device_info: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """
        Initiate MFA challenge based on risk assessment and user configuration
        
        Args:
            user_id: User ID
            action: Action requiring MFA (login, payment, etc.)
            device_info: Current device information
            db: Database session
            
        Returns:
            Challenge information and required MFA methods
        """
        
        try:
            # Get user MFA configuration
            mfa_config = await self._get_mfa_configuration(user_id)
            if not mfa_config:
                return {"success": False, "error": "MFA not configured"}
            
            # Assess device trust
            device_trust = await self._assess_device_trust(user_id, device_info)
            
            # Perform risk assessment
            risk_score = await self._assess_authentication_risk(user_id, action, device_info)
            
            # Determine required MFA methods based on risk and configuration
            required_methods = await self._determine_required_mfa_methods(
                mfa_config, device_trust, risk_score, action
            )
            
            if not required_methods:
                # Low risk, trusted device - no additional MFA required
                return {
                    "success": True,
                    "mfa_required": False,
                    "reason": "Trusted device and low risk",
                    "device_trust_level": device_trust.trust_level.value if device_trust else "untrusted"
                }
            
            # Create MFA challenges
            challenges = []
            for method in required_methods:
                challenge = await self._create_mfa_challenge(user_id, method, action)
                challenges.append(challenge)
            
            return {
                "success": True,
                "mfa_required": True,
                "challenges": [asdict(challenge) for challenge in challenges],
                "risk_score": risk_score,
                "device_trust_level": device_trust.trust_level.value if device_trust else "untrusted",
                "expires_in_minutes": self.config["challenge_expiry_minutes"]
            }
            
        except Exception as e:
            logger.error(f"Error initiating MFA challenge for user {user_id}: {e}")
            raise
    
    async def verify_mfa_challenge(
        self,
        challenge_id: str,
        verification_data: Dict[str, Any],
        device_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Verify MFA challenge response
        
        Args:
            challenge_id: Challenge ID
            verification_data: Verification data (code, biometric, etc.)
            device_info: Device information
            
        Returns:
            Verification result
        """
        
        try:
            # Get challenge
            challenge = await self._get_mfa_challenge(challenge_id)
            if not challenge:
                return {"success": False, "error": "Challenge not found or expired"}
            
            # Check if challenge is still valid
            if datetime.utcnow() > challenge.expires_at:
                return {"success": False, "error": "Challenge expired"}
            
            # Check attempt limit
            if challenge.attempts >= challenge.max_attempts:
                return {"success": False, "error": "Maximum attempts exceeded"}
            
            # Increment attempt counter
            challenge.attempts += 1
            await self._update_mfa_challenge(challenge)
            
            # Verify based on method
            verification_result = await self._verify_mfa_method(
                challenge, verification_data, device_info
            )
            
            if verification_result["success"]:
                # Mark challenge as verified
                challenge.is_verified = True
                await self._update_mfa_challenge(challenge)
                
                # Update device trust if applicable
                if verification_result.get("trust_device", False):
                    await self._update_device_trust(challenge.user_id, device_info)
                
                # Log successful verification
                audit_logger.log_security_event(
                    "mfa_verification_success",
                    user_id=challenge.user_id,
                    details={
                        "method": challenge.method.value,
                        "challenge_id": challenge_id,
                        "attempts": challenge.attempts
                    }
                )
            else:
                # Log failed verification
                audit_logger.log_security_event(
                    "mfa_verification_failed",
                    user_id=challenge.user_id,
                    details={
                        "method": challenge.method.value,
                        "challenge_id": challenge_id,
                        "attempts": challenge.attempts,
                        "reason": verification_result.get("error", "Unknown")
                    }
                )
            
            return verification_result
            
        except Exception as e:
            logger.error(f"Error verifying MFA challenge {challenge_id}: {e}")
            raise
    
    async def _setup_totp(self, user_id: int) -> Dict[str, Any]:
        """Set up TOTP (Time-based OTP) for user"""
        
        # Generate secret key
        secret = pyotp.random_base32()
        
        # Create TOTP instance
        totp = pyotp.TOTP(secret)
        
        # Generate provisioning URI for QR code
        provisioning_uri = totp.provisioning_uri(
            name=f"user_{user_id}",
            issuer_name=self.config["totp_issuer"]
        )
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        # Create QR code image
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64 for frontend
        img_buffer = io.BytesIO()
        qr_img.save(img_buffer, format='PNG')
        qr_code_base64 = base64.b64encode(img_buffer.getvalue()).decode()
        
        # Store encrypted secret
        if self.redis_client:
            encrypted_secret = encrypt_data(secret)
            self.redis_client.setex(
                f"totp_secret:{user_id}",
                86400 * 365,  # 1 year
                encrypted_secret
            )
        
        return {
            "totp_secret": secret,
            "qr_code": qr_code_base64,
            "provisioning_uri": provisioning_uri,
            "manual_entry_key": secret
        }
    
    async def _setup_sms(self, user_id: int, db: Session) -> Dict[str, Any]:
        """Set up SMS MFA for user"""
        
        # Get user phone number from database
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.phone:
            raise ValueError("User phone number required for SMS MFA")
        
        # Validate phone number format
        # In production, would use phone number validation library
        
        return {
            "phone_number": user.phone,
            "message": "SMS MFA configured successfully",
            "note": "Verification codes will be sent to your registered phone number"
        }
    
    async def _setup_biometric(
        self,
        user_id: int,
        device_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Set up biometric authentication for user"""
        
        device_id = device_info.get("device_id", "")
        platform = device_info.get("platform", "")
        
        # Check if device supports biometric authentication
        if platform not in ["ios", "android"]:
            return {
                "biometric_available": False,
                "message": "Biometric authentication not available on this platform"
            }
        
        # Generate biometric challenge token
        challenge_token = secrets.token_urlsafe(32)
        
        if self.redis_client:
            self.redis_client.setex(
                f"biometric_setup:{user_id}:{device_id}",
                300,  # 5 minutes
                challenge_token
            )
        
        return {
            "biometric_available": True,
            "challenge_token": challenge_token,
            "setup_instructions": "Use your device's biometric sensor to complete setup",
            "supported_types": ["fingerprint", "face_id", "touch_id"]
        }
    
    async def _generate_backup_codes(self, user_id: int) -> List[str]:
        """Generate backup recovery codes"""
        
        codes = []
        for _ in range(self.config["backup_codes_count"]):
            code = secrets.token_hex(4).upper()  # 8-character hex codes
            codes.append(code)
        
        # Store encrypted backup codes
        if self.redis_client:
            encrypted_codes = encrypt_data(json.dumps(codes))
            self.redis_client.setex(
                f"backup_codes:{user_id}",
                86400 * 365,  # 1 year
                encrypted_codes
            )
        
        return codes
    
    async def _register_trusted_device(
        self,
        user_id: int,
        device_info: Dict[str, Any]
    ) -> TrustedDevice:
        """Register a device as trusted"""
        
        device_id = device_info.get("device_id", "")
        if not device_id:
            device_id = self._generate_device_fingerprint(device_info)
        
        trusted_device = TrustedDevice(
            device_id=device_id,
            user_id=user_id,
            device_name=device_info.get("name", "Unknown Device"),
            device_fingerprint=self._generate_device_fingerprint(device_info),
            trust_level=DeviceTrustLevel.TRUSTED,
            platform=device_info.get("platform", "unknown"),
            user_agent=device_info.get("user_agent", ""),
            ip_address=device_info.get("ip_address", ""),
            location=device_info.get("location"),
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow(),
            trusted_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=self.config["device_trust_duration_days"])
        )
        
        # Store trusted device
        if self.redis_client:
            device_data = asdict(trusted_device)
            # Convert datetime objects to ISO format
            for key, value in device_data.items():
                if isinstance(value, datetime):
                    device_data[key] = value.isoformat()
                elif isinstance(value, DeviceTrustLevel):
                    device_data[key] = value.value
            
            self.redis_client.setex(
                f"trusted_device:{user_id}:{device_id}",
                86400 * self.config["device_trust_duration_days"],
                json.dumps(device_data)
            )
        
        return trusted_device
    
    def _generate_device_fingerprint(self, device_info: Dict[str, Any]) -> str:
        """Generate unique device fingerprint"""
        
        fingerprint_data = {
            "user_agent": device_info.get("user_agent", ""),
            "platform": device_info.get("platform", ""),
            "screen_resolution": device_info.get("screen_resolution", ""),
            "timezone": device_info.get("timezone", ""),
            "language": device_info.get("language", "")
        }
        
        fingerprint_string = json.dumps(fingerprint_data, sort_keys=True)
        return hashlib.sha256(fingerprint_string.encode()).hexdigest()
    
    async def _assess_device_trust(
        self,
        user_id: int,
        device_info: Dict[str, Any]
    ) -> Optional[TrustedDevice]:
        """Assess trust level of current device"""
        
        device_fingerprint = self._generate_device_fingerprint(device_info)
        
        if self.redis_client:
            # Check for existing trusted device
            device_keys = self.redis_client.keys(f"trusted_device:{user_id}:*")
            
            for key in device_keys:
                device_data = self.redis_client.get(key)
                if device_data:
                    try:
                        device_dict = json.loads(device_data)
                        if device_dict.get("device_fingerprint") == device_fingerprint:
                            # Reconstruct TrustedDevice object
                            device_dict["trust_level"] = DeviceTrustLevel(device_dict["trust_level"])
                            for date_field in ["first_seen", "last_seen", "trusted_at", "expires_at"]:
                                if device_dict.get(date_field):
                                    device_dict[date_field] = datetime.fromisoformat(device_dict[date_field])
                            
                            return TrustedDevice(**device_dict)
                    except Exception as e:
                        logger.error(f"Error parsing trusted device data: {e}")
        
        return None
    
    async def _assess_authentication_risk(
        self,
        user_id: int,
        action: str,
        device_info: Dict[str, Any]
    ) -> float:
        """Assess authentication risk score (0.0 - 1.0)"""
        
        risk_score = 0.0
        
        # Check device trust
        device_trust = await self._assess_device_trust(user_id, device_info)
        if not device_trust:
            risk_score += self.risk_factors["unknown_device"]
        
        # Check for unusual time
        current_hour = datetime.utcnow().hour
        if current_hour < 6 or current_hour > 23:
            risk_score += self.risk_factors["unusual_time"]
        
        # Check action risk level
        high_risk_actions = ["payment", "admin_access", "settings_change"]
        if action in high_risk_actions:
            risk_score += self.risk_factors["high_value_action"]
        
        # Check for recent failed attempts
        if self.redis_client:
            failed_attempts = self.redis_client.get(f"failed_mfa_attempts:{user_id}")
            if failed_attempts and int(failed_attempts) > 2:
                risk_score += self.risk_factors["multiple_failed_attempts"]
        
        return min(risk_score, 1.0)
    
    async def _determine_required_mfa_methods(
        self,
        mfa_config: MFAConfiguration,
        device_trust: Optional[TrustedDevice],
        risk_score: float,
        action: str
    ) -> List[MFAMethod]:
        """Determine required MFA methods based on risk and configuration"""
        
        required_methods = []
        
        # Check if MFA is required for this action
        if action not in mfa_config.require_mfa_for:
            return required_methods
        
        # If adaptive security is enabled and risk is low with trusted device
        if (mfa_config.adaptive_security and 
            risk_score < self.config["adaptive_security_threshold"] and
            device_trust and device_trust.trust_level == DeviceTrustLevel.TRUSTED):
            return required_methods  # No additional MFA required
        
        # For high-risk scenarios, require primary method
        if risk_score > 0.7:
            required_methods.append(mfa_config.primary_method)
            
            # For very high risk, require additional method
            if risk_score > 0.9 and mfa_config.backup_methods:
                required_methods.append(mfa_config.backup_methods[0])
        else:
            # Standard risk, require primary method
            required_methods.append(mfa_config.primary_method)
        
        return required_methods
    
    async def _create_mfa_challenge(
        self,
        user_id: int,
        method: MFAMethod,
        action: str
    ) -> MFAChallenge:
        """Create MFA challenge for specified method"""
        
        challenge_id = f"mfa_{secrets.token_urlsafe(16)}"
        
        challenge_data = {}
        
        if method == MFAMethod.TOTP:
            challenge_data = {"method": "totp", "message": "Enter code from authenticator app"}
        
        elif method == MFAMethod.SMS:
            # Generate and send SMS code
            sms_code = self._generate_numeric_code(self.config["sms_code_length"])
            challenge_data = {
                "method": "sms",
                "message": "Enter code sent to your phone",
                "code_length": self.config["sms_code_length"]
            }
            
            # Store code for verification
            if self.redis_client:
                self.redis_client.setex(f"sms_code:{challenge_id}", 300, sms_code)
            
            # Send SMS (would integrate with SMS provider)
            await self._send_sms_code(user_id, sms_code)
        
        elif method == MFAMethod.EMAIL:
            # Generate and send email code
            email_code = self._generate_alphanumeric_code(self.config["email_code_length"])
            challenge_data = {
                "method": "email",
                "message": "Enter code sent to your email",
                "code_length": self.config["email_code_length"]
            }
            
            # Store code for verification
            if self.redis_client:
                self.redis_client.setex(f"email_code:{challenge_id}", 600, email_code)
            
            # Send email (would integrate with email service)
            await self._send_email_code(user_id, email_code)
        
        elif method == MFAMethod.BIOMETRIC:
            challenge_data = {
                "method": "biometric",
                "message": "Use biometric authentication",
                "challenge_token": secrets.token_urlsafe(32)
            }
        
        challenge = MFAChallenge(
            challenge_id=challenge_id,
            user_id=user_id,
            method=method,
            challenge_data=challenge_data,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(minutes=self.config["challenge_expiry_minutes"])
        )
        
        # Store challenge
        if self.redis_client:
            challenge_dict = asdict(challenge)
            challenge_dict["created_at"] = challenge.created_at.isoformat()
            challenge_dict["expires_at"] = challenge.expires_at.isoformat()
            challenge_dict["method"] = challenge.method.value
            
            self.redis_client.setex(
                f"mfa_challenge:{challenge_id}",
                self.config["challenge_expiry_minutes"] * 60,
                json.dumps(challenge_dict)
            )
        
        return challenge
    
    def _generate_numeric_code(self, length: int) -> str:
        """Generate numeric verification code"""
        return ''.join(secrets.choice('0123456789') for _ in range(length))
    
    def _generate_alphanumeric_code(self, length: int) -> str:
        """Generate alphanumeric verification code"""
        return ''.join(secrets.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') for _ in range(length))
    
    async def _send_sms_code(self, user_id: int, code: str):
        """Send SMS verification code"""
        # In production, would integrate with Twilio or similar SMS service
        logger.info(f"SMS code {code} would be sent to user {user_id}")
    
    async def _send_email_code(self, user_id: int, code: str):
        """Send email verification code"""
        # In production, would integrate with email service
        logger.info(f"Email code {code} would be sent to user {user_id}")
    
    async def _verify_mfa_method(
        self,
        challenge: MFAChallenge,
        verification_data: Dict[str, Any],
        device_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Verify MFA challenge based on method"""
        
        if challenge.method == MFAMethod.TOTP:
            return await self._verify_totp(challenge, verification_data)
        
        elif challenge.method == MFAMethod.SMS:
            return await self._verify_sms(challenge, verification_data)
        
        elif challenge.method == MFAMethod.EMAIL:
            return await self._verify_email(challenge, verification_data)
        
        elif challenge.method == MFAMethod.BIOMETRIC:
            return await self._verify_biometric(challenge, verification_data, device_info)
        
        elif challenge.method == MFAMethod.BACKUP_CODES:
            return await self._verify_backup_code(challenge, verification_data)
        
        else:
            return {"success": False, "error": "Unsupported MFA method"}
    
    async def _verify_totp(
        self,
        challenge: MFAChallenge,
        verification_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Verify TOTP code"""
        
        user_code = verification_data.get("code", "")
        
        if self.redis_client:
            # Get stored TOTP secret
            encrypted_secret = self.redis_client.get(f"totp_secret:{challenge.user_id}")
            if encrypted_secret:
                try:
                    secret = decrypt_data(encrypted_secret)
                    totp = pyotp.TOTP(secret)
                    
                    # Verify code with time window
                    if totp.verify(user_code, valid_window=self.config["totp_window"]):
                        return {"success": True, "trust_device": True}
                    else:
                        return {"success": False, "error": "Invalid TOTP code"}
                        
                except Exception as e:
                    logger.error(f"Error verifying TOTP: {e}")
                    return {"success": False, "error": "TOTP verification failed"}
        
        return {"success": False, "error": "TOTP not configured"}
    
    async def _verify_sms(
        self,
        challenge: MFAChallenge,
        verification_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Verify SMS code"""
        
        user_code = verification_data.get("code", "")
        
        if self.redis_client:
            stored_code = self.redis_client.get(f"sms_code:{challenge.challenge_id}")
            if stored_code and stored_code.decode() == user_code:
                # Delete used code
                self.redis_client.delete(f"sms_code:{challenge.challenge_id}")
                return {"success": True, "trust_device": False}
        
        return {"success": False, "error": "Invalid SMS code"}
    
    async def _verify_email(
        self,
        challenge: MFAChallenge,
        verification_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Verify email code"""
        
        user_code = verification_data.get("code", "").upper()
        
        if self.redis_client:
            stored_code = self.redis_client.get(f"email_code:{challenge.challenge_id}")
            if stored_code and stored_code.decode() == user_code:
                # Delete used code
                self.redis_client.delete(f"email_code:{challenge.challenge_id}")
                return {"success": True, "trust_device": False}
        
        return {"success": False, "error": "Invalid email code"}
    
    async def _verify_biometric(
        self,
        challenge: MFAChallenge,
        verification_data: Dict[str, Any],
        device_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Verify biometric authentication"""
        
        # In production, would validate biometric template
        # For now, simulate successful biometric verification
        
        biometric_result = verification_data.get("biometric_result", False)
        confidence = verification_data.get("confidence", 0.0)
        
        if biometric_result and confidence >= self.config["biometric_confidence_threshold"]:
            return {"success": True, "trust_device": True}
        else:
            return {"success": False, "error": "Biometric verification failed"}
    
    async def _verify_backup_code(
        self,
        challenge: MFAChallenge,
        verification_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Verify backup recovery code"""
        
        user_code = verification_data.get("code", "").upper()
        
        if self.redis_client:
            encrypted_codes = self.redis_client.get(f"backup_codes:{challenge.user_id}")
            if encrypted_codes:
                try:
                    codes_json = decrypt_data(encrypted_codes)
                    codes = json.loads(codes_json)
                    
                    if user_code in codes:
                        # Remove used code
                        codes.remove(user_code)
                        
                        # Update stored codes
                        updated_codes_json = json.dumps(codes)
                        encrypted_updated = encrypt_data(updated_codes_json)
                        self.redis_client.setex(
                            f"backup_codes:{challenge.user_id}",
                            86400 * 365,
                            encrypted_updated
                        )
                        
                        return {"success": True, "trust_device": False}
                        
                except Exception as e:
                    logger.error(f"Error verifying backup code: {e}")
        
        return {"success": False, "error": "Invalid backup code"}
    
    async def _get_mfa_configuration(self, user_id: int) -> Optional[MFAConfiguration]:
        """Get user MFA configuration"""
        
        if self.redis_client:
            config_data = self.redis_client.get(f"mfa_config:{user_id}")
            if config_data:
                try:
                    config_dict = json.loads(config_data)
                    config_dict["primary_method"] = MFAMethod(config_dict["primary_method"])
                    config_dict["backup_methods"] = [MFAMethod(m) for m in config_dict["backup_methods"]]
                    config_dict["last_updated"] = datetime.fromisoformat(config_dict["last_updated"])
                    
                    return MFAConfiguration(**config_dict)
                except Exception as e:
                    logger.error(f"Error parsing MFA configuration: {e}")
        
        return None
    
    async def _store_mfa_configuration(self, config: MFAConfiguration):
        """Store MFA configuration"""
        
        if self.redis_client:
            config_dict = asdict(config)
            config_dict["primary_method"] = config.primary_method.value
            config_dict["backup_methods"] = [m.value for m in config.backup_methods]
            config_dict["last_updated"] = config.last_updated.isoformat()
            
            self.redis_client.setex(
                f"mfa_config:{config.user_id}",
                86400 * 365,  # 1 year
                json.dumps(config_dict)
            )
    
    async def _get_mfa_challenge(self, challenge_id: str) -> Optional[MFAChallenge]:
        """Get MFA challenge by ID"""
        
        if self.redis_client:
            challenge_data = self.redis_client.get(f"mfa_challenge:{challenge_id}")
            if challenge_data:
                try:
                    challenge_dict = json.loads(challenge_data)
                    challenge_dict["method"] = MFAMethod(challenge_dict["method"])
                    challenge_dict["created_at"] = datetime.fromisoformat(challenge_dict["created_at"])
                    challenge_dict["expires_at"] = datetime.fromisoformat(challenge_dict["expires_at"])
                    
                    return MFAChallenge(**challenge_dict)
                except Exception as e:
                    logger.error(f"Error parsing MFA challenge: {e}")
        
        return None
    
    async def _update_mfa_challenge(self, challenge: MFAChallenge):
        """Update MFA challenge"""
        
        if self.redis_client:
            challenge_dict = asdict(challenge)
            challenge_dict["created_at"] = challenge.created_at.isoformat()
            challenge_dict["expires_at"] = challenge.expires_at.isoformat()
            challenge_dict["method"] = challenge.method.value
            
            ttl = self.redis_client.ttl(f"mfa_challenge:{challenge.challenge_id}")
            if ttl > 0:
                self.redis_client.setex(
                    f"mfa_challenge:{challenge.challenge_id}",
                    ttl,
                    json.dumps(challenge_dict)
                )
    
    async def _update_device_trust(self, user_id: int, device_info: Dict[str, Any]):
        """Update device trust level"""
        
        # Register or update trusted device
        await self._register_trusted_device(user_id, device_info)


# Create singleton instance
enhanced_mfa_service = EnhancedMFAService()