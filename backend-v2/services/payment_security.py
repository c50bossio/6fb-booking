"""
Payment security utilities and validation
"""
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import Payment, User, Appointment
import re
import hashlib
import hmac

logger = logging.getLogger(__name__)

class PaymentSecurity:
    """Payment security and validation utilities"""
    
    @staticmethod
    def validate_payment_amount(amount: float) -> bool:
        """Validate payment amount is within acceptable limits"""
        if not isinstance(amount, (int, float)):
            return False
        
        # Check minimum amount (e.g., $0.01)
        if amount < 0.01:
            return False
        
        # Check maximum amount (e.g., $10,000)
        if amount > 10000.0:
            return False
        
        # Check for reasonable decimal places (max 2)
        # Use string formatting to avoid floating point precision issues
        if len(str(amount).split('.')[-1]) > 2 and '.' in str(amount):
            return False
        
        return True
    
    @staticmethod
    def validate_refund_eligibility(payment: Payment, refund_amount: float) -> Dict[str, Any]:
        """Validate if a payment is eligible for refund"""
        result = {
            "eligible": False,
            "reason": "",
            "max_refundable": 0.0
        }
        
        if not payment:
            result["reason"] = "Payment not found"
            return result
        
        if payment.status not in ["completed", "partially_refunded"]:
            if payment.status == "refunded":
                result["reason"] = "Already fully refunded"
            else:
                result["reason"] = f"Payment status '{payment.status}' is not eligible for refund"
            return result
        
        # Check if payment is too old (e.g., 90 days)
        # Handle both timezone-aware and naive datetimes
        payment_created_at = payment.created_at
        if payment_created_at.tzinfo is not None:
            # Convert timezone-aware to naive for comparison
            payment_created_at = payment_created_at.replace(tzinfo=None)
        
        if payment_created_at < datetime.utcnow() - timedelta(days=90):
            result["reason"] = "Payment is too old for refund (>90 days)"
            return result
        
        # Calculate maximum refundable amount
        total_refunded = sum(r.amount for r in payment.refunds if r.status == "completed")
        max_refundable = payment.amount - total_refunded
        
        if refund_amount > max_refundable:
            result["reason"] = f"Refund amount ${refund_amount} exceeds refundable amount ${max_refundable}"
            return result
        
        if max_refundable <= 0:
            result["reason"] = "No refundable amount remaining"
            return result
        
        result["eligible"] = True
        result["max_refundable"] = max_refundable
        return result
    
    @staticmethod
    def validate_gift_certificate_code(code: str) -> bool:
        """Validate gift certificate code format"""
        if not code or not isinstance(code, str):
            return False
        
        # Check length
        if len(code) < 6 or len(code) > 20:
            return False
        
        # Check format (alphanumeric, no special characters except hyphens)
        if not re.match(r'^[A-Z0-9-]+$', code.upper()):
            return False
        
        return True
    
    @staticmethod
    def rate_limit_check(user_id: int, action: str, db: Session) -> bool:
        """Check if user has exceeded rate limits for payment actions"""
        # Define rate limits per action
        limits = {
            "payment_intent": {"count": 10, "window_minutes": 60},
            "refund_request": {"count": 5, "window_minutes": 60},
            "gift_certificate_create": {"count": 3, "window_minutes": 60},
            "gift_certificate_validate": {"count": 20, "window_minutes": 60}
        }
        
        if action not in limits:
            return True  # No limit defined, allow
        
        limit_config = limits[action]
        window_start = datetime.utcnow() - timedelta(minutes=limit_config["window_minutes"])
        
        # Count recent actions (this would need a rate_limit table in real implementation)
        # For now, return True (no rate limiting)
        # In production, implement proper rate limiting with Redis or database
        
        return True
    
    @staticmethod
    def sanitize_payment_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize payment data to remove/mask sensitive information"""
        sanitized = data.copy()
        
        # Fields to mask completely
        sensitive_fields = [
            "stripe_payment_intent_id",
            "stripe_payment_id",
            "stripe_refund_id",
            "stripe_transfer_id"
        ]
        
        for field in sensitive_fields:
            if field in sanitized and sanitized[field]:
                # Keep only first 4 and last 4 characters
                value = str(sanitized[field])
                if len(value) > 8:
                    sanitized[field] = f"{value[:4]}****{value[-4:]}"
        
        # Fields to round for privacy
        amount_fields = ["amount", "platform_fee", "barber_amount", "refund_amount"]
        for field in amount_fields:
            if field in sanitized and sanitized[field] is not None:
                sanitized[field] = round(float(sanitized[field]), 2)
        
        return sanitized
    
    @staticmethod
    def validate_payout_eligibility(barber: User, amount: float) -> Dict[str, Any]:
        """Validate if a barber is eligible for payout"""
        result = {
            "eligible": False,
            "reason": "",
            "requirements": []
        }
        
        if not barber:
            result["reason"] = "Barber not found"
            return result
        
        if barber.role != "barber":
            result["reason"] = "User is not a barber"
            return result
        
        if not barber.stripe_account_id:
            result["reason"] = "Barber has no Stripe Connect account"
            result["requirements"].append("stripe_connect_setup")
            return result
        
        if barber.stripe_account_status != "active":
            result["reason"] = f"Stripe account status is '{barber.stripe_account_status}'"
            result["requirements"].append("stripe_account_verification")
            return result
        
        # Minimum payout amount check
        if amount < 10.0:  # $10 minimum
            result["reason"] = f"Payout amount ${amount} is below minimum $10"
            return result
        
        result["eligible"] = True
        return result
    
    @staticmethod
    def log_payment_event(
        event_type: str,
        user_id: Optional[int],
        payment_id: Optional[int] = None,
        amount: Optional[float] = None,
        details: Optional[Dict[str, Any]] = None,
        db: Session = None
    ):
        """Log payment events for audit trail"""
        log_data = {
            "event_type": event_type,
            "user_id": user_id,
            "payment_id": payment_id,
            "amount": amount,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details or {}
        }
        
        # In production, this would write to an audit log table
        logger.info(f"Payment Event: {log_data}")
    
    @staticmethod
    def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
        """Verify Stripe webhook signature"""
        try:
            # Extract timestamp and signature from header
            elements = signature.split(',')
            timestamp = None
            signatures = []
            
            for element in elements:
                if element.startswith('t='):
                    timestamp = element[2:]
                elif element.startswith('v1='):
                    signatures.append(element[3:])
            
            if not timestamp or not signatures:
                return False
            
            # Check timestamp (webhook should be recent)
            webhook_time = datetime.fromtimestamp(int(timestamp))
            current_time = datetime.utcnow()
            if current_time - webhook_time > timedelta(minutes=5):
                return False
            
            # Verify signature
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
            logger.error(f"Webhook signature verification error: {str(e)}")
            return False
    
    @staticmethod
    def validate_appointment_payment_eligibility(appointment: Appointment) -> Dict[str, Any]:
        """Validate if an appointment is eligible for payment"""
        result = {
            "eligible": False,
            "reason": ""
        }
        
        if not appointment:
            result["reason"] = "Appointment not found"
            return result
        
        if appointment.status not in ["pending"]:
            result["reason"] = f"Appointment status '{appointment.status}' is not eligible for payment"
            return result
        
        # Check if appointment is in the future
        # Handle both timezone-aware and naive datetimes
        appointment_start = appointment.start_time
        if appointment_start.tzinfo is not None:
            # Convert timezone-aware to naive for comparison
            appointment_start = appointment_start.replace(tzinfo=None)
        
        current_time = datetime.utcnow()
        if appointment_start <= current_time:
            result["reason"] = "Cannot pay for past appointments"
            return result
        
        # Check if appointment is too far in the future (e.g., 1 year)
        if appointment_start > current_time + timedelta(days=365):
            result["reason"] = "Appointment is too far in the future"
            return result
        
        # Check if payment already exists
        if appointment.payment and appointment.payment.status in ["completed", "pending"]:
            result["reason"] = "Payment already exists for this appointment"
            return result
        
        result["eligible"] = True
        return result
    
    @staticmethod
    def mask_sensitive_data(data: str) -> str:
        """Mask sensitive data for logging"""
        if not data or len(data) <= 8:
            return "****"
        
        return f"{data[:2]}****{data[-2:]}"


class PaymentAuditLogger:
    """Dedicated audit logger for payment operations"""
    
    def __init__(self):
        self.logger = logging.getLogger("payment_audit")
        
        # Configure audit logger with specific format
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - PAYMENT_AUDIT - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
    
    def log_payment_intent_created(self, user_id: int, amount: float, appointment_id: int):
        """Log payment intent creation"""
        self.logger.info(
            f"PAYMENT_INTENT_CREATED - User: {user_id}, Amount: ${amount}, Appointment: {appointment_id}"
        )
    
    def log_payment_confirmed(self, user_id: int, payment_id: int, amount: float):
        """Log payment confirmation"""
        self.logger.info(
            f"PAYMENT_CONFIRMED - User: {user_id}, Payment: {payment_id}, Amount: ${amount}"
        )
    
    def log_refund_processed(self, initiated_by: int, payment_id: int, amount: float, reason: str):
        """Log refund processing"""
        self.logger.info(
            f"REFUND_PROCESSED - Initiated by: {initiated_by}, Payment: {payment_id}, "
            f"Amount: ${amount}, Reason: {reason}"
        )
    
    def log_gift_certificate_created(self, created_by: int, amount: float, code: str):
        """Log gift certificate creation"""
        self.logger.info(
            f"GIFT_CERTIFICATE_CREATED - Created by: {created_by}, Amount: ${amount}, "
            f"Code: {PaymentSecurity.mask_sensitive_data(code)}"
        )
    
    def log_gift_certificate_used(self, payment_id: int, code: str, amount_used: float):
        """Log gift certificate usage"""
        self.logger.info(
            f"GIFT_CERTIFICATE_USED - Payment: {payment_id}, "
            f"Code: {PaymentSecurity.mask_sensitive_data(code)}, Amount: ${amount_used}"
        )
    
    def log_payout_processed(self, barber_id: int, amount: float, payment_count: int):
        """Log payout processing"""
        self.logger.info(
            f"PAYOUT_PROCESSED - Barber: {barber_id}, Amount: ${amount}, Payments: {payment_count}"
        )
    
    def log_security_violation(self, user_id: int, violation_type: str, details: str):
        """Log security violations"""
        self.logger.warning(
            f"SECURITY_VIOLATION - User: {user_id}, Type: {violation_type}, Details: {details}"
        )


# Global audit logger instance
audit_logger = PaymentAuditLogger()