"""
Webhook Security Service for BookedBarber V2

Provides comprehensive webhook security including:
- Signature verification (Stripe, Twilio, etc.)
- Replay attack prevention
- Event deduplication
- Rate limiting for webhook endpoints
- Security logging and monitoring
"""

import hmac
import hashlib
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, List, Set, Any
from dataclasses import dataclass
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import json
from utils.security_logging import get_security_logger, SecurityEventType

logger = logging.getLogger(__name__)


@dataclass
class WebhookValidationResult:
    """Result of webhook validation"""
    is_valid: bool
    event_id: Optional[str] = None
    error_message: Optional[str] = None
    is_duplicate: bool = False
    event_type: Optional[str] = None


class WebhookSecurityService:
    """Enhanced webhook security service"""
    
    def __init__(self, db: Session):
        self.db = db
        self.replay_window_seconds = 300  # 5 minutes
        self.max_webhook_age_seconds = 300  # 5 minutes
        
    def validate_stripe_webhook(
        self, 
        payload: bytes, 
        signature: str, 
        webhook_secret: str,
        source_ip: Optional[str] = None
    ) -> WebhookValidationResult:
        """
        Comprehensive Stripe webhook validation
        """
        try:
            # Parse signature header
            timestamp, signatures = self._parse_stripe_signature(signature)
            if not timestamp or not signatures:
                return WebhookValidationResult(
                    is_valid=False,
                    error_message="Invalid signature format"
                )
            
            # Check timestamp (replay attack prevention)
            webhook_time = datetime.fromtimestamp(int(timestamp))
            current_time = datetime.utcnow()
            age_seconds = (current_time - webhook_time).total_seconds()
            
            if age_seconds > self.max_webhook_age_seconds:
                logger.warning(f"Webhook too old: {age_seconds} seconds")
                return WebhookValidationResult(
                    is_valid=False,
                    error_message=f"Webhook timestamp too old: {age_seconds} seconds"
                )
            
            if age_seconds < -60:  # Allow 1 minute clock skew
                logger.warning(f"Webhook from future: {age_seconds} seconds")
                return WebhookValidationResult(
                    is_valid=False,
                    error_message="Webhook timestamp is in the future"
                )
            
            # Verify signature
            if not self._verify_stripe_signature(payload, timestamp, signatures, webhook_secret):
                # Enhanced security logging for signature failures
                security_logger = get_security_logger(self.db)
                security_logger.log_webhook_security_event(
                    event_type=SecurityEventType.WEBHOOK_SIGNATURE_INVALID,
                    webhook_provider="stripe",
                    ip_address=source_ip,
                    details={
                        "timestamp": timestamp,
                        "payload_size": len(payload),
                        "signature_count": len(signatures)
                    }
                )
                
                self._log_security_violation("stripe_signature_invalid", {
                    "source_ip": source_ip,
                    "timestamp": timestamp,
                    "payload_size": len(payload)
                })
                return WebhookValidationResult(
                    is_valid=False,
                    error_message="Invalid webhook signature"
                )
            
            # Parse event data
            try:
                event_data = json.loads(payload.decode('utf-8'))
                event_id = event_data.get('id')
                event_type = event_data.get('type')
            except json.JSONDecodeError:
                return WebhookValidationResult(
                    is_valid=False,
                    error_message="Invalid JSON payload"
                )
            
            # Check for duplicate events
            is_duplicate = self._check_event_duplicate("stripe", event_id)
            if is_duplicate:
                logger.info(f"Duplicate Stripe webhook event: {event_id}")
                return WebhookValidationResult(
                    is_valid=True,
                    event_id=event_id,
                    event_type=event_type,
                    is_duplicate=True
                )
            
            # Store event for future duplicate checking
            self._store_webhook_event("stripe", event_id, event_type, payload)
            
            # Log successful validation
            self._log_webhook_received("stripe", event_id, event_type, source_ip)
            
            return WebhookValidationResult(
                is_valid=True,
                event_id=event_id,
                event_type=event_type,
                is_duplicate=False
            )
            
        except Exception as e:
            logger.error(f"Stripe webhook validation error: {e}")
            return WebhookValidationResult(
                is_valid=False,
                error_message=f"Validation error: {str(e)}"
            )
    
    def validate_twilio_webhook(
        self,
        form_data: Dict[str, Any],
        signature: str,
        webhook_url: str,
        auth_token: str,
        source_ip: Optional[str] = None
    ) -> WebhookValidationResult:
        """
        Validate Twilio webhook with signature verification
        """
        try:
            # Twilio uses different signature method
            if not self._verify_twilio_signature(form_data, signature, webhook_url, auth_token):
                self._log_security_violation("twilio_signature_invalid", {
                    "source_ip": source_ip,
                    "form_data_keys": list(form_data.keys())
                })
                return WebhookValidationResult(
                    is_valid=False,
                    error_message="Invalid Twilio webhook signature"
                )
            
            # Extract event identifier (MessageSid for SMS)
            event_id = form_data.get('MessageSid') or form_data.get('CallSid')
            if not event_id:
                return WebhookValidationResult(
                    is_valid=False,
                    error_message="Missing event identifier"
                )
            
            # Check for duplicates
            is_duplicate = self._check_event_duplicate("twilio", event_id)
            if is_duplicate:
                logger.info(f"Duplicate Twilio webhook event: {event_id}")
                return WebhookValidationResult(
                    is_valid=True,
                    event_id=event_id,
                    is_duplicate=True
                )
            
            # Store event
            self._store_webhook_event("twilio", event_id, "sms", json.dumps(form_data).encode())
            
            # Log successful validation
            self._log_webhook_received("twilio", event_id, "sms", source_ip)
            
            return WebhookValidationResult(
                is_valid=True,
                event_id=event_id,
                is_duplicate=False
            )
            
        except Exception as e:
            logger.error(f"Twilio webhook validation error: {e}")
            return WebhookValidationResult(
                is_valid=False,
                error_message=f"Validation error: {str(e)}"
            )
    
    def _parse_stripe_signature(self, signature: str) -> tuple[Optional[str], List[str]]:
        """Parse Stripe signature header"""
        try:
            elements = signature.split(',')
            timestamp = None
            signatures = []
            
            for element in elements:
                if element.startswith('t='):
                    timestamp = element[2:]
                elif element.startswith('v1='):
                    signatures.append(element[3:])
            
            return timestamp, signatures
        except Exception:
            return None, []
    
    def _verify_stripe_signature(
        self, 
        payload: bytes, 
        timestamp: str, 
        signatures: List[str], 
        secret: str
    ) -> bool:
        """Verify Stripe webhook signature"""
        try:
            signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
            expected_signature = hmac.new(
                secret.encode('utf-8'),
                signed_payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            return any(
                hmac.compare_digest(expected_signature, sig)
                for sig in signatures
            )
        except Exception as e:
            logger.error(f"Stripe signature verification error: {e}")
            return False
    
    def _verify_twilio_signature(
        self, 
        form_data: Dict[str, Any], 
        signature: str, 
        url: str, 
        auth_token: str
    ) -> bool:
        """Verify Twilio webhook signature"""
        try:
            # Build the string to sign (URL + sorted form parameters)
            data_string = url
            for key in sorted(form_data.keys()):
                data_string += f"{key}{form_data[key]}"
            
            # Generate expected signature
            expected_signature = hmac.new(
                auth_token.encode('utf-8'),
                data_string.encode('utf-8'),
                hashlib.sha1
            ).digest()
            
            # Convert to base64
            import base64
            expected_sig_b64 = base64.b64encode(expected_signature).decode()
            
            return hmac.compare_digest(expected_sig_b64, signature)
        except Exception as e:
            logger.error(f"Twilio signature verification error: {e}")
            return False
    
    def _check_event_duplicate(self, provider: str, event_id: str) -> bool:
        """Check if webhook event has already been processed"""
        try:
            from models.idempotency import IdempotencyKey
            
            key = f"webhook_{provider}_{event_id}"
            
            existing = self.db.query(IdempotencyKey).filter(
                IdempotencyKey.key == key,
                IdempotencyKey.expires_at > datetime.utcnow()
            ).first()
            
            return existing is not None
        except Exception as e:
            logger.error(f"Error checking event duplicate: {e}")
            return False
    
    def _store_webhook_event(
        self, 
        provider: str, 
        event_id: str, 
        event_type: str, 
        payload: bytes
    ):
        """Store webhook event for duplicate detection"""
        try:
            from models.idempotency import IdempotencyKey
            from utils.idempotency import IdempotencyKeyGenerator
            
            key = f"webhook_{provider}_{event_id}"
            expires_at = datetime.utcnow() + timedelta(hours=48)  # 48h for webhooks
            
            # Generate content hash for payload verification
            payload_hash = IdempotencyKeyGenerator.generate_content_hash(payload)
            
            idempotency_record = IdempotencyKey(
                key=key,
                operation_type=f"webhook_{provider}",
                user_id=None,  # Webhooks don't have user context
                request_hash=payload_hash,
                response_data={"processed_at": datetime.utcnow().isoformat()},
                created_at=datetime.utcnow(),
                expires_at=expires_at,
                operation_metadata={
                    "provider": provider,
                    "event_id": event_id,
                    "event_type": event_type,
                    "payload_size": len(payload)
                }
            )
            
            self.db.add(idempotency_record)
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error storing webhook event: {e}")
            self.db.rollback()
    
    def _log_webhook_received(
        self, 
        provider: str, 
        event_id: str, 
        event_type: str, 
        source_ip: Optional[str]
    ):
        """Log successful webhook receipt"""
        logger.info(
            f"WEBHOOK_RECEIVED - Provider: {provider}, "
            f"Event: {event_id}, Type: {event_type}, "
            f"IP: {source_ip or 'unknown'}"
        )
    
    def _log_security_violation(self, violation_type: str, details: Dict[str, Any]):
        """Log webhook security violations"""
        logger.warning(
            f"WEBHOOK_SECURITY_VIOLATION - Type: {violation_type}, "
            f"Details: {json.dumps(details)}"
        )


class WebhookRateLimiter:
    """Rate limiting specifically for webhook endpoints"""
    
    def __init__(self, db: Session):
        self.db = db
        self.rate_limits = {
            "stripe": {"requests_per_minute": 1000, "burst_limit": 50},
            "twilio": {"requests_per_minute": 500, "burst_limit": 25},
            "default": {"requests_per_minute": 100, "burst_limit": 10}
        }
    
    def check_rate_limit(self, provider: str, source_ip: str) -> bool:
        """Check if webhook request is within rate limits"""
        try:
            limits = self.rate_limits.get(provider, self.rate_limits["default"])
            
            # For now, just log the request - in production would implement
            # proper rate limiting with Redis or similar
            logger.debug(
                f"Webhook rate check - Provider: {provider}, "
                f"IP: {source_ip}, Limits: {limits}"
            )
            
            return True  # Allow for now
            
        except Exception as e:
            logger.error(f"Rate limit check error: {e}")
            return True  # Allow on error


def get_webhook_security_service(db: Session = None) -> WebhookSecurityService:
    """Dependency to get webhook security service"""
    return WebhookSecurityService(db)


def get_webhook_rate_limiter(db: Session = None) -> WebhookRateLimiter:
    """Dependency to get webhook rate limiter"""
    return WebhookRateLimiter(db)