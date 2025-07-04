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
    def validate_payment_amount(amount: float, user_id: Optional[int] = None, db: Optional[Session] = None) -> Dict[str, Any]:
        """Enhanced payment amount validation with risk assessment"""
        result = {
            "valid": False,
            "risk_level": "low",
            "risk_factors": [],
            "max_allowed": 10000.0,
            "warnings": []
        }
        
        if not isinstance(amount, (int, float)):
            result["risk_factors"].append("invalid_type")
            return result
        
        # Check minimum amount (e.g., $0.01)
        if amount < 0.01:
            result["risk_factors"].append("below_minimum")
            result["warnings"].append("Amount below minimum $0.01")
            return result
        
        # Check for reasonable decimal places (max 2)
        if len(str(amount).split('.')[-1]) > 2 and '.' in str(amount):
            result["risk_factors"].append("excessive_decimals")
            result["warnings"].append("Too many decimal places")
            return result
        
        # Risk-based amount limits
        daily_limit = 10000.0  # Default daily limit
        single_tx_limit = 5000.0  # Default single transaction limit
        
        # Check user-specific limits if user_id provided
        if user_id and db:
            user_limits = PaymentSecurity._get_user_payment_limits(user_id, db)
            daily_limit = user_limits.get("daily_limit", daily_limit)
            single_tx_limit = user_limits.get("single_tx_limit", single_tx_limit)
        
        # Single transaction limit
        if amount > single_tx_limit:
            result["risk_factors"].append("exceeds_single_limit")
            result["risk_level"] = "high"
            result["warnings"].append(f"Amount exceeds single transaction limit of ${single_tx_limit}")
            return result
        
        # High amount warning threshold
        if amount > 1000.0:
            result["risk_level"] = "medium"
            result["risk_factors"].append("high_amount")
            result["warnings"].append("High value transaction")
        
        # Suspicious amount patterns
        if PaymentSecurity._is_suspicious_amount(amount):
            result["risk_factors"].append("suspicious_pattern")
            result["risk_level"] = "medium"
            result["warnings"].append("Amount matches suspicious pattern")
        
        # Check daily spending if user provided
        if user_id and db:
            daily_spent = PaymentSecurity._get_user_daily_spending(user_id, db)
            if daily_spent + amount > daily_limit:
                result["risk_factors"].append("exceeds_daily_limit")
                result["risk_level"] = "high"
                result["warnings"].append(f"Would exceed daily limit of ${daily_limit}")
                return result
        
        result["valid"] = True
        result["max_allowed"] = single_tx_limit
        return result
    
    @staticmethod
    def _get_user_payment_limits(user_id: int, db: Session) -> Dict[str, float]:
        """Get user-specific payment limits based on history and profile"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return {"daily_limit": 1000.0, "single_tx_limit": 500.0}
            
            # Role-based limits
            role_limits = {
                "user": {"daily_limit": 2000.0, "single_tx_limit": 1000.0},
                "barber": {"daily_limit": 5000.0, "single_tx_limit": 2500.0},
                "admin": {"daily_limit": 10000.0, "single_tx_limit": 5000.0},
                "super_admin": {"daily_limit": 50000.0, "single_tx_limit": 25000.0}
            }
            
            return role_limits.get(user.role, role_limits["user"])
            
        except Exception as e:
            logger.error(f"Error getting user payment limits: {e}")
            return {"daily_limit": 1000.0, "single_tx_limit": 500.0}
    
    @staticmethod
    def _get_user_daily_spending(user_id: int, db: Session) -> float:
        """Get user's spending for current day"""
        try:
            from datetime import datetime, timedelta
            
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)
            
            payments = db.query(Payment).filter(
                Payment.user_id == user_id,
                Payment.status.in_(["completed", "pending"]),
                Payment.created_at >= today_start,
                Payment.created_at < today_end
            ).all()
            
            return sum(p.amount for p in payments)
            
        except Exception as e:
            logger.error(f"Error getting user daily spending: {e}")
            return 0.0
    
    @staticmethod
    def _is_suspicious_amount(amount: float) -> bool:
        """Check if amount matches suspicious patterns"""
        # Common suspicious amounts (card testing, etc.)
        suspicious_amounts = [
            1.00, 1.01, 1.11, 2.22, 3.33, 4.44, 5.55,  # Testing amounts
            9999.99, 9999.00, 10000.00,  # Max amount testing
            100.00, 200.00, 300.00, 400.00, 500.00,  # Round number testing
        ]
        
        # Check exact matches
        if amount in suspicious_amounts:
            return True
        
        # Check patterns
        amount_str = f"{amount:.2f}"
        
        # Repeated digits pattern (but allow normal amounts with some repetition)
        digits_only = amount_str.replace('.', '')
        unique_digits = len(set(digits_only))
        
        # Only flag if there are very few unique digits AND it's a suspicious pattern
        if unique_digits <= 2 and len(digits_only) >= 4:
            # Allow common legitimate patterns like 1234.56
            if digits_only in ['123456', '234567', '345678']:
                return False
            return True
        
        # Sequential digits (but only flag obviously suspicious patterns)
        digits = amount_str.replace('.', '')
        if len(digits) >= 4:  # Only check longer sequences
            consecutive_count = 0
            for i in range(len(digits) - 1):
                if int(digits[i]) + 1 == int(digits[i+1]):
                    consecutive_count += 1
                else:
                    consecutive_count = 0
                
                # Only flag if we have 3+ consecutive digits (like 1234 or 5678)
                if consecutive_count >= 3:
                    # Allow common legitimate patterns
                    if digits in ['123456', '234567', '345678', '456789']:
                        return False
                    return True
        
        return False
    
    @staticmethod
    def detect_suspicious_payment_activity(user_id: int, db: Session, window_hours: int = 24) -> Dict[str, Any]:
        """Detect suspicious payment patterns for a user"""
        try:
            from datetime import datetime, timedelta
            
            window_start = datetime.utcnow() - timedelta(hours=window_hours)
            
            # Get recent payments
            recent_payments = db.query(Payment).filter(
                Payment.user_id == user_id,
                Payment.created_at >= window_start,
                Payment.status.in_(["completed", "pending", "failed"])
            ).order_by(Payment.created_at.desc()).all()
            
            suspicion_score = 0
            suspicious_patterns = []
            
            if len(recent_payments) == 0:
                return {
                    "is_suspicious": False,
                    "suspicion_score": 0,
                    "patterns": [],
                    "recommendation": "normal"
                }
            
            # Pattern 1: Rapid succession of payments
            if len(recent_payments) > 10:
                suspicion_score += 30
                suspicious_patterns.append("rapid_payments")
            
            # Pattern 2: Multiple failed attempts followed by success
            failed_count = len([p for p in recent_payments[:10] if p.status == "failed"])
            if failed_count >= 3:
                suspicion_score += 25
                suspicious_patterns.append("multiple_failures")
            
            # Pattern 3: Escalating amounts
            amounts = [p.amount for p in recent_payments[:5]]
            if len(amounts) >= 3:
                escalating = all(amounts[i] < amounts[i+1] for i in range(len(amounts)-1))
                if escalating:
                    suspicion_score += 20
                    suspicious_patterns.append("escalating_amounts")
            
            # Pattern 4: Round number testing
            round_amounts = [p.amount for p in recent_payments if p.amount in [1.0, 10.0, 100.0, 1000.0]]
            if len(round_amounts) >= 2:
                suspicion_score += 15
                suspicious_patterns.append("round_number_testing")
            
            # Pattern 5: Identical amounts (possible automated testing)
            if len(recent_payments) >= 3:
                amount_counts = {}
                for p in recent_payments[:10]:
                    amount_counts[p.amount] = amount_counts.get(p.amount, 0) + 1
                
                max_identical = max(amount_counts.values())
                if max_identical >= 3:
                    suspicion_score += 20
                    suspicious_patterns.append("identical_amounts")
            
            # Pattern 6: Very small amounts (card testing)
            small_amounts = [p.amount for p in recent_payments if p.amount <= 5.0]
            if len(small_amounts) >= 3:
                suspicion_score += 15
                suspicious_patterns.append("small_amount_testing")
            
            # Determine recommendation based on score
            if suspicion_score >= 50:
                recommendation = "block"
            elif suspicion_score >= 30:
                recommendation = "review"
            elif suspicion_score >= 15:
                recommendation = "monitor"
            else:
                recommendation = "normal"
            
            return {
                "is_suspicious": suspicion_score >= 30,
                "suspicion_score": suspicion_score,
                "patterns": suspicious_patterns,
                "recommendation": recommendation,
                "recent_payment_count": len(recent_payments),
                "failed_payment_count": failed_count
            }
            
        except Exception as e:
            logger.error(f"Error detecting suspicious payment activity: {e}")
            return {
                "is_suspicious": False,
                "suspicion_score": 0,
                "patterns": [],
                "recommendation": "error"
            }
    
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