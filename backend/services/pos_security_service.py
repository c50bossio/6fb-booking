"""
POS Security Service
Handles comprehensive security features for POS operations including rate limiting,
session management, audit logging, and CSRF protection.
"""

import logging
import secrets
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple, List, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from redis import Redis
import hashlib
import hmac

from models.base import BaseModel
from config.settings import settings
from utils.redis_client import get_redis_client

logger = logging.getLogger(__name__)

# Security constants
PIN_RATE_LIMIT_WINDOW = 60  # 1 minute window
PIN_RATE_LIMIT_MAX_ATTEMPTS = 5  # Max attempts per window
SESSION_WARNING_TIME = 25  # Minutes before warning
SESSION_TIMEOUT = 30  # Total session timeout in minutes
CSRF_TOKEN_LENGTH = 32
AUDIT_LOG_RETENTION_DAYS = 90


class POSSecurityService:
    """Service for managing POS security features"""

    def __init__(self, db: Session):
        self.db = db
        self.redis = get_redis_client()

    # Rate Limiting Methods
    def check_pin_rate_limit(
        self, barber_id: int, client_ip: str
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check PIN login rate limit for barber
        Returns (is_allowed, rate_limit_info)
        """
        # Create unique rate limit key combining barber_id and IP
        rate_limit_key = f"pin_rate_limit:{barber_id}:{client_ip}"

        try:
            # Get current attempt count
            current_attempts = self.redis.get(rate_limit_key)

            if current_attempts is None:
                # First attempt in window
                self.redis.setex(rate_limit_key, PIN_RATE_LIMIT_WINDOW, 1)
                return True, {
                    "attempts": 1,
                    "max_attempts": PIN_RATE_LIMIT_MAX_ATTEMPTS,
                    "window_seconds": PIN_RATE_LIMIT_WINDOW,
                    "reset_at": datetime.utcnow()
                    + timedelta(seconds=PIN_RATE_LIMIT_WINDOW),
                }

            current_attempts = int(current_attempts)

            if current_attempts >= PIN_RATE_LIMIT_MAX_ATTEMPTS:
                # Rate limit exceeded
                ttl = self.redis.ttl(rate_limit_key)
                return False, {
                    "attempts": current_attempts,
                    "max_attempts": PIN_RATE_LIMIT_MAX_ATTEMPTS,
                    "window_seconds": PIN_RATE_LIMIT_WINDOW,
                    "reset_at": datetime.utcnow() + timedelta(seconds=ttl),
                    "retry_after": ttl,
                }

            # Increment attempt count
            new_count = self.redis.incr(rate_limit_key)
            ttl = self.redis.ttl(rate_limit_key)

            return True, {
                "attempts": new_count,
                "max_attempts": PIN_RATE_LIMIT_MAX_ATTEMPTS,
                "window_seconds": PIN_RATE_LIMIT_WINDOW,
                "reset_at": datetime.utcnow() + timedelta(seconds=ttl),
            }

        except Exception as e:
            logger.error(f"Error checking PIN rate limit: {e}")
            # Fail open in case of Redis issues, but log the event
            self._log_security_event(
                "rate_limit_check_failed",
                {"barber_id": barber_id, "client_ip": client_ip, "error": str(e)},
            )
            return True, {"error": "Rate limit check failed", "attempts": 0}

    def reset_pin_rate_limit(self, barber_id: int, client_ip: str) -> bool:
        """Reset rate limit for successful authentication"""
        try:
            rate_limit_key = f"pin_rate_limit:{barber_id}:{client_ip}"
            self.redis.delete(rate_limit_key)
            return True
        except Exception as e:
            logger.error(f"Error resetting PIN rate limit: {e}")
            return False

    # Session Timeout Management
    def check_session_timeout_status(self, session_token: str) -> Dict[str, Any]:
        """
        Check session timeout status and determine if warning should be shown
        Returns session status including warning state
        """
        from models.pos_session import POSSession

        session = (
            self.db.query(POSSession)
            .filter(
                POSSession.session_token == session_token, POSSession.is_active == True
            )
            .first()
        )

        if not session:
            return {
                "valid": False,
                "expired": True,
                "warning": False,
                "remaining_minutes": 0,
            }

        now = datetime.utcnow()
        time_until_expiry = session.expires_at - now
        remaining_minutes = time_until_expiry.total_seconds() / 60

        # Check if session is expired
        if remaining_minutes <= 0:
            session.is_active = False
            session.logout_reason = "timeout"
            self.db.commit()

            self._create_audit_log(
                "session_timeout",
                session.barber_id,
                {"session_token": session_token[:8] + "..."},
            )

            return {
                "valid": False,
                "expired": True,
                "warning": False,
                "remaining_minutes": 0,
            }

        # Check if warning should be shown
        should_warn = remaining_minutes <= SESSION_WARNING_TIME

        # Update last activity
        session.last_activity = func.now()
        self.db.commit()

        return {
            "valid": True,
            "expired": False,
            "warning": should_warn,
            "remaining_minutes": int(remaining_minutes),
            "warning_threshold": SESSION_WARNING_TIME,
            "expires_at": session.expires_at.isoformat(),
        }

    def extend_session_with_activity(self, session_token: str) -> bool:
        """
        Extend session based on activity (sliding window)
        Only extends if session has been active
        """
        from models.pos_session import POSSession

        session = (
            self.db.query(POSSession)
            .filter(
                POSSession.session_token == session_token, POSSession.is_active == True
            )
            .first()
        )

        if not session:
            return False

        # Only extend if there's been recent activity (within last 5 minutes)
        now = datetime.utcnow()
        if (
            session.last_activity
            and (now - session.last_activity).total_seconds() < 300
        ):
            # Extend by 30 minutes from now
            session.expires_at = now + timedelta(minutes=SESSION_TIMEOUT)
            session.last_activity = now
            self.db.commit()

            self._create_audit_log(
                "session_extended",
                session.barber_id,
                {"session_token": session_token[:8] + "...", "extended_by": "activity"},
            )

            return True

        return False

    # CSRF Protection
    def generate_csrf_token(self, session_token: str) -> str:
        """Generate CSRF token for session"""
        csrf_token = secrets.token_urlsafe(CSRF_TOKEN_LENGTH)

        # Store in Redis with session binding
        csrf_key = f"csrf_token:{session_token}"
        self.redis.setex(
            csrf_key, SESSION_TIMEOUT * 60, csrf_token  # Same timeout as session
        )

        return csrf_token

    def validate_csrf_token(self, session_token: str, csrf_token: str) -> bool:
        """Validate CSRF token for session"""
        if not csrf_token:
            return False

        csrf_key = f"csrf_token:{session_token}"
        stored_token = self.redis.get(csrf_key)

        if not stored_token:
            return False

        # Constant time comparison to prevent timing attacks
        return hmac.compare_digest(
            stored_token.decode() if isinstance(stored_token, bytes) else stored_token,
            csrf_token,
        )

    # Audit Logging
    def _create_audit_log(
        self,
        event_type: str,
        barber_id: int,
        event_data: Dict[str, Any],
        client_ip: Optional[str] = None,
    ):
        """Create audit log entry"""
        try:
            # Store in Redis with expiration
            audit_key = f"audit_log:{datetime.utcnow().strftime('%Y%m%d')}:{secrets.token_hex(8)}"
            audit_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "event_type": event_type,
                "barber_id": barber_id,
                "event_data": event_data,
                "client_ip": client_ip,
            }

            # Store with retention period
            self.redis.setex(
                audit_key,
                AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60,
                json.dumps(audit_entry),
            )

            # Also add to daily audit set for easy retrieval
            daily_set_key = f"audit_log_set:{datetime.utcnow().strftime('%Y%m%d')}"
            self.redis.sadd(daily_set_key, audit_key)
            self.redis.expire(daily_set_key, AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60)

        except Exception as e:
            logger.error(f"Error creating audit log: {e}")

    def log_pos_transaction(
        self,
        transaction_type: str,
        barber_id: int,
        transaction_data: Dict[str, Any],
        client_ip: Optional[str] = None,
    ):
        """
        Log POS transaction with security filtering
        Removes sensitive data before logging
        """
        # Filter sensitive data
        safe_data = self._filter_sensitive_data(transaction_data)

        # Create audit log
        self._create_audit_log(
            f"pos_transaction_{transaction_type}", barber_id, safe_data, client_ip
        )

        # Log summary to standard logs (no sensitive data)
        logger.info(
            f"POS Transaction: {transaction_type} by barber {barber_id}",
            extra={
                "barber_id": barber_id,
                "transaction_type": transaction_type,
                "amount": safe_data.get("amount"),
                "item_count": safe_data.get("item_count"),
            },
        )

    def _filter_sensitive_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Filter out sensitive data from logs"""
        sensitive_fields = [
            "card_number",
            "cvv",
            "pin",
            "password",
            "ssn",
            "tax_id",
            "bank_account",
            "routing_number",
            "full_card_number",
            "card_details",
            "payment_method_details",
            "customer_email",
            "customer_phone",
            "customer_address",
        ]

        safe_data = {}
        for key, value in data.items():
            if any(sensitive in key.lower() for sensitive in sensitive_fields):
                # Mask sensitive fields
                if isinstance(value, str) and len(value) > 4:
                    safe_data[key] = f"***{value[-4:]}"
                else:
                    safe_data[key] = "***"
            elif isinstance(value, dict):
                # Recursively filter nested dicts
                safe_data[key] = self._filter_sensitive_data(value)
            elif isinstance(value, list):
                # Filter lists
                safe_data[key] = [
                    (
                        self._filter_sensitive_data(item)
                        if isinstance(item, dict)
                        else item
                    )
                    for item in value
                ]
            else:
                safe_data[key] = value

        return safe_data

    def get_audit_logs(
        self,
        date: Optional[datetime] = None,
        barber_id: Optional[int] = None,
        event_type: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Retrieve audit logs with filtering"""
        if not date:
            date = datetime.utcnow()

        daily_set_key = f"audit_log_set:{date.strftime('%Y%m%d')}"
        audit_keys = self.redis.smembers(daily_set_key)

        logs = []
        for key in audit_keys:
            if isinstance(key, bytes):
                key = key.decode()

            log_data = self.redis.get(key)
            if log_data:
                if isinstance(log_data, bytes):
                    log_data = log_data.decode()

                log_entry = json.loads(log_data)

                # Apply filters
                if barber_id and log_entry.get("barber_id") != barber_id:
                    continue
                if event_type and not log_entry.get("event_type", "").startswith(
                    event_type
                ):
                    continue

                logs.append(log_entry)

        # Sort by timestamp and limit
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return logs[:limit]

    def _log_security_event(self, event_type: str, event_data: Dict[str, Any]):
        """Log security-related events"""
        logger.warning(
            f"Security Event: {event_type}",
            extra={"event_type": event_type, "event_data": event_data},
        )

        # Also create audit log
        self._create_audit_log(
            f"security_{event_type}",
            event_data.get("barber_id", 0),
            event_data,
            event_data.get("client_ip"),
        )

    def validate_receipt_request(self, receipt_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and sanitize receipt data before processing
        Ensures no sensitive data is exposed in receipts
        """
        # Define allowed fields for receipts
        allowed_fields = [
            "transaction_id",
            "amount",
            "date",
            "items",
            "barber_name",
            "location_name",
            "receipt_number",
            "payment_type",
        ]

        # Create sanitized receipt data
        sanitized_data = {}
        for field in allowed_fields:
            if field in receipt_data:
                if field == "items" and isinstance(receipt_data[field], list):
                    # Sanitize item data
                    sanitized_items = []
                    for item in receipt_data[field]:
                        sanitized_item = {
                            "name": item.get("name", "Unknown"),
                            "quantity": item.get("quantity", 1),
                            "price": item.get("price", 0),
                        }
                        sanitized_items.append(sanitized_item)
                    sanitized_data[field] = sanitized_items
                else:
                    sanitized_data[field] = receipt_data[field]

        return sanitized_data
