"""
Barber PIN Authentication Service
Handles secure PIN-based authentication for POS access with comprehensive security features.
"""

import secrets
import re
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.barber import Barber
from models.pos_session import POSSession
from config.settings import settings

# PIN-specific security context
pin_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security constants
MAX_PIN_ATTEMPTS = 5
PIN_LOCKOUT_DURATION = timedelta(minutes=30)
SESSION_DURATION = timedelta(hours=8)  # 8-hour POS sessions
MIN_PIN_LENGTH = 4
MAX_PIN_LENGTH = 6


class PINError(Exception):
    """Base exception for PIN-related errors"""

    pass


class PINValidationError(PINError):
    """Raised when PIN format is invalid"""

    pass


class PINLockoutError(PINError):
    """Raised when PIN is locked due to too many attempts"""

    pass


class SessionExpiredError(PINError):
    """Raised when POS session has expired"""

    pass


class BarberPINService:
    """Service for handling barber PIN authentication and POS session management"""

    def __init__(self, db: Session):
        self.db = db

    def _validate_pin_format(self, pin: str) -> bool:
        """
        Validate PIN format requirements
        - 4-6 digits only
        - No sequential numbers (1234, 6543)
        - No repeated digits (1111, 2222)
        """
        if not pin.isdigit():
            raise PINValidationError("PIN must contain only digits")

        if len(pin) < MIN_PIN_LENGTH or len(pin) > MAX_PIN_LENGTH:
            raise PINValidationError(
                f"PIN must be {MIN_PIN_LENGTH}-{MAX_PIN_LENGTH} digits long"
            )

        # Check for sequential numbers
        if self._is_sequential(pin):
            raise PINValidationError("PIN cannot contain sequential digits")

        # Check for repeated digits
        if len(set(pin)) == 1:
            raise PINValidationError("PIN cannot contain all identical digits")

        return True

    def _is_sequential(self, pin: str) -> bool:
        """Check if PIN contains sequential digits (ascending or descending)"""
        for i in range(len(pin) - 2):
            if int(pin[i]) + 1 == int(pin[i + 1]) and int(pin[i + 1]) + 1 == int(
                pin[i + 2]
            ):
                return True
            if int(pin[i]) - 1 == int(pin[i + 1]) and int(pin[i + 1]) - 1 == int(
                pin[i + 2]
            ):
                return True
        return False

    def set_pin(self, barber_id: int, pin: str) -> bool:
        """
        Set or update PIN for a barber
        Returns True if successful, raises exception if validation fails
        """
        self._validate_pin_format(pin)

        barber = self.db.query(Barber).filter(Barber.id == barber_id).first()
        if not barber:
            raise PINError("Barber not found")

        # Hash the PIN
        pin_hash = pin_context.hash(pin)

        # Update barber record
        barber.pin_hash = pin_hash
        barber.pin_attempts = 0
        barber.pin_locked_until = None
        barber.updated_at = func.now()

        self.db.commit()
        return True

    def verify_pin(self, barber_id: int, pin: str) -> Tuple[bool, Optional[str]]:
        """
        Verify PIN for barber
        Returns (success, error_message)
        """
        barber = self.db.query(Barber).filter(Barber.id == barber_id).first()
        if not barber:
            return False, "Barber not found"

        if not barber.pin_hash:
            return False, "PIN not set for this barber"

        # Check if PIN is locked
        if self._is_pin_locked(barber):
            lockout_time = barber.pin_locked_until
            return (
                False,
                f"PIN locked until {lockout_time.strftime('%H:%M')} due to failed attempts",
            )

        # Verify PIN
        if pin_context.verify(pin, barber.pin_hash):
            # Successful verification - reset attempts and update last used
            barber.pin_attempts = 0
            barber.pin_locked_until = None
            barber.pin_last_used = func.now()
            self.db.commit()
            return True, None
        else:
            # Failed verification - increment attempts
            barber.pin_attempts += 1

            # Lock PIN if max attempts reached
            if barber.pin_attempts >= MAX_PIN_ATTEMPTS:
                barber.pin_locked_until = datetime.utcnow() + PIN_LOCKOUT_DURATION
                self.db.commit()
                return False, "PIN locked due to too many failed attempts"

            self.db.commit()
            remaining_attempts = MAX_PIN_ATTEMPTS - barber.pin_attempts
            return False, f"Invalid PIN. {remaining_attempts} attempts remaining"

    def _is_pin_locked(self, barber: Barber) -> bool:
        """Check if PIN is currently locked"""
        if not barber.pin_locked_until:
            return False
        return datetime.utcnow() < barber.pin_locked_until

    def create_pos_session(
        self,
        barber_id: int,
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> str:
        """
        Create a new POS session for authenticated barber
        Returns session token
        """
        # Generate secure session token
        session_token = secrets.token_urlsafe(32)

        # Create session record
        session = POSSession(
            session_token=session_token,
            barber_id=barber_id,
            device_info=device_info,
            ip_address=ip_address,
            expires_at=datetime.utcnow() + SESSION_DURATION,
            login_method="pin",
        )

        self.db.add(session)
        self.db.commit()

        return session_token

    def validate_session(
        self, session_token: str
    ) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Validate POS session token
        Returns (is_valid, session_info)
        """
        session = (
            self.db.query(POSSession)
            .filter(
                POSSession.session_token == session_token, POSSession.is_active == True
            )
            .first()
        )

        if not session:
            return False, None

        # Check expiration
        if datetime.utcnow() > session.expires_at:
            # Mark session as expired
            session.is_active = False
            session.logout_reason = "timeout"
            self.db.commit()
            return False, None

        # Update last activity
        session.last_activity = func.now()
        self.db.commit()

        # Return session info
        session_info = {
            "barber_id": session.barber_id,
            "device_info": session.device_info,
            "expires_at": session.expires_at,
            "last_activity": session.last_activity,
        }

        return True, session_info

    def extend_session(self, session_token: str, hours: int = 4) -> bool:
        """
        Extend POS session by specified hours
        Returns True if successful
        """
        session = (
            self.db.query(POSSession)
            .filter(
                POSSession.session_token == session_token, POSSession.is_active == True
            )
            .first()
        )

        if not session:
            return False

        # Extend expiration
        session.expires_at = datetime.utcnow() + timedelta(hours=hours)
        session.last_activity = func.now()
        self.db.commit()

        return True

    def logout_session(self, session_token: str, reason: str = "manual") -> bool:
        """
        Logout POS session
        Returns True if successful
        """
        session = (
            self.db.query(POSSession)
            .filter(
                POSSession.session_token == session_token, POSSession.is_active == True
            )
            .first()
        )

        if not session:
            return False

        # Mark session as inactive
        session.is_active = False
        session.logout_reason = reason
        self.db.commit()

        return True

    def logout_all_sessions(self, barber_id: int, reason: str = "security") -> int:
        """
        Logout all active sessions for a barber
        Returns number of sessions logged out
        """
        sessions = (
            self.db.query(POSSession)
            .filter(POSSession.barber_id == barber_id, POSSession.is_active == True)
            .all()
        )

        count = 0
        for session in sessions:
            session.is_active = False
            session.logout_reason = reason
            count += 1

        self.db.commit()
        return count

    def get_active_sessions(self, barber_id: int) -> list:
        """
        Get all active POS sessions for a barber
        """
        sessions = (
            self.db.query(POSSession)
            .filter(
                POSSession.barber_id == barber_id,
                POSSession.is_active == True,
                POSSession.expires_at > datetime.utcnow(),
            )
            .all()
        )

        return [
            {
                "session_token": session.session_token[:8]
                + "...",  # Truncated for security
                "device_info": session.device_info,
                "ip_address": session.ip_address,
                "created_at": session.created_at,
                "expires_at": session.expires_at,
                "last_activity": session.last_activity,
            }
            for session in sessions
        ]

    def reset_pin_attempts(self, barber_id: int) -> bool:
        """
        Reset PIN attempts (admin function)
        Returns True if successful
        """
        barber = self.db.query(Barber).filter(Barber.id == barber_id).first()
        if not barber:
            return False

        barber.pin_attempts = 0
        barber.pin_locked_until = None
        self.db.commit()
        return True

    def cleanup_expired_sessions(self) -> int:
        """
        Cleanup expired POS sessions (maintenance function)
        Returns number of sessions cleaned up
        """
        expired_sessions = (
            self.db.query(POSSession)
            .filter(
                POSSession.expires_at < datetime.utcnow(), POSSession.is_active == True
            )
            .all()
        )

        count = 0
        for session in expired_sessions:
            session.is_active = False
            session.logout_reason = "expired"
            count += 1

        self.db.commit()
        return count

    def get_pin_status(self, barber_id: int) -> Dict[str, Any]:
        """
        Get PIN status information for a barber
        """
        barber = self.db.query(Barber).filter(Barber.id == barber_id).first()
        if not barber:
            raise PINError("Barber not found")

        return {
            "has_pin": bool(barber.pin_hash),
            "pin_attempts": barber.pin_attempts,
            "is_locked": self._is_pin_locked(barber),
            "locked_until": barber.pin_locked_until,
            "last_used": barber.pin_last_used,
            "max_attempts": MAX_PIN_ATTEMPTS,
        }
