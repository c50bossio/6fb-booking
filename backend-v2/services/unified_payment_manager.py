"""
Unified Payment Manager Service

This service consolidates all payment-related functionality from multiple services:
- payment_service.py (core payment processing)
- payment_security.py (security validation and fraud detection)
- stripe_service.py (Stripe subscriptions and payment methods)
- stripe_integration_service.py (Stripe Connect and integrations)

Provides a single, unified interface for all payment operations while maintaining
backward compatibility and enhancing security throughout.
"""

from datetime import datetime
from typing import Dict, Optional, Any
from sqlalchemy.orm import Session
import logging
import stripe

# Models
from models import User, Payment, Appointment, GiftCertificate, Organization
from models.base import Subscription

# Core services (to be gradually replaced)
from services.payment_service import PaymentService
from services.stripe_service import StripeSubscriptionService
import services.payment_security as payment_security

# Utilities
from config import settings
from utils.cache_decorators import cache_result
from utils.idempotency import ensure_idempotent

logger = logging.getLogger(__name__)

class PaymentManager:
    """
    Unified payment service that orchestrates all payment-related operations.
    
    This class provides a comprehensive payment interface for:
    - Payment processing (one-time and recurring)
    - Security validation and fraud detection
    - Subscription management
    - Gift certificates and payouts
    - Refunds and financial reporting
    - Stripe Connect integration
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.payment_service = PaymentService()
        self.stripe_service = StripeSubscriptionService(db)
        
        # Configure Stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
    
    # ==========================================
    # PAYMENT INTENT & PROCESSING
    # ==========================================
    
    def create_payment_intent(
        self,
        amount: float,
        currency: str = "usd",
        appointment_id: Optional[int] = None,
        user_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a Stripe payment intent with comprehensive security validation.
        
        Enhanced with fraud detection and business rule validation.
        """
        try:
            # Security validation first
            security_result = payment_security.validate_payment_amount(
                amount, user_id, self.db
            )
            if not security_result["valid"]:
                return {
                    "success": False,
                    "error": security_result["error"],
                    "security_flags": security_result.get("flags", [])
                }
            
            # Check for suspicious activity
            if user_id:
                activity_check = payment_security.detect_suspicious_payment_activity(
                    user_id, self.db
                )
                if activity_check["suspicious"]:
                    logger.warning(f"Suspicious payment activity detected for user {user_id}")
                    return {
                        "success": False,
                        "error": "Payment cannot be processed at this time",
                        "security_flags": ["suspicious_activity"]
                    }
            
            # Validate appointment payment eligibility if appointment provided
            if appointment_id:
                appointment = self.db.query(Appointment).filter(
                    Appointment.id == appointment_id
                ).first()
                
                if appointment:
                    eligibility = payment_security.validate_appointment_payment_eligibility(appointment)
                    if not eligibility["eligible"]:
                        return {
                            "success": False,
                            "error": eligibility["reason"]
                        }
            
            # Create payment intent using original service
            result = self.payment_service.create_payment_intent(
                amount=amount,
                currency=currency,
                appointment_id=appointment_id,
                user_id=user_id,
                metadata=metadata or {},
                db=self.db,
                idempotency_key=idempotency_key
            )
            
            # Log the payment event for security monitoring
            payment_security.log_payment_event(
                event_type="payment_intent_created",
                user_id=user_id,
                amount=amount,
                appointment_id=appointment_id,
                metadata={"payment_intent_id": result.get("payment_intent_id")},
                db=self.db
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error creating payment intent: {str(e)}")
            return {
                "success": False,
                "error": "Failed to create payment intent",
                "technical_error": str(e)
            }
    
    @ensure_idempotent
    def confirm_payment(
        self,
        payment_intent_id: str,
        booking_id: int,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Confirm a payment with enhanced security and validation.
        """
        try:
            # Use original payment service with added logging
            result = PaymentService.confirm_payment(
                payment_intent_id, booking_id, self.db, idempotency_key
            )
            
            # Log payment confirmation
            if result.get("success"):
                payment_security.log_payment_event(
                    event_type="payment_confirmed",
                    user_id=result.get("user_id"),
                    amount=result.get("amount"),
                    appointment_id=booking_id,
                    metadata={"payment_intent_id": payment_intent_id},
                    db=self.db
                )
            
            return result
            
        except Exception as e:
            logger.error(f"Error confirming payment: {str(e)}")
            return {
                "success": False,
                "error": "Failed to confirm payment"
            }
    
    # ==========================================
    # REFUNDS & CANCELLATIONS
    # ==========================================
    
    def process_refund(
        self,
        payment_id: int,
        refund_amount: Optional[float] = None,
        reason: Optional[str] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Process a refund with security validation and eligibility checks.
        """
        try:
            # Get the payment record
            payment = self.db.query(Payment).filter(Payment.id == payment_id).first()
            if not payment:
                return {
                    "success": False,
                    "error": "Payment not found"
                }
            
            # Validate refund eligibility
            eligibility = payment_security.validate_refund_eligibility(
                payment, refund_amount or payment.amount
            )
            if not eligibility["eligible"]:
                return {
                    "success": False,
                    "error": eligibility["reason"]
                }
            
            # Process refund using original service
            result = self.payment_service.process_refund(
                payment_id=payment_id,
                refund_amount=refund_amount,
                reason=reason,
                db=self.db
            )
            
            # Log refund event
            if result.get("success"):
                payment_security.log_payment_event(
                    event_type="refund_processed",
                    user_id=user_id or payment.appointment.user_id,
                    amount=refund_amount or payment.amount,
                    appointment_id=payment.appointment_id,
                    metadata={
                        "payment_id": payment_id,
                        "refund_reason": reason
                    },
                    db=self.db
                )
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing refund: {str(e)}")
            return {
                "success": False,
                "error": "Failed to process refund"
            }
    
    # ==========================================
    # SUBSCRIPTION MANAGEMENT
    # ==========================================
    
    def create_subscription(
        self,
        user_id: int,
        organization_id: int,
        price_id: str,
        payment_method_id: Optional[str] = None,
        trial_days: int = 14
    ) -> Dict[str, Any]:
        """
        Create a subscription with enhanced validation and setup.
        """
        try:
            # Get user and organization
            user = self.db.query(User).filter(User.id == user_id).first()
            organization = self.db.query(Organization).filter(
                Organization.id == organization_id
            ).first()
            
            if not user or not organization:
                return {
                    "success": False,
                    "error": "User or organization not found"
                }
            
            # Create Stripe customer if needed
            customer_result = self.stripe_service.create_stripe_customer(user, organization)
            if not customer_result.get("success"):
                return customer_result
            
            # Create subscription
            subscription_result = self.stripe_service.create_subscription(
                customer_id=customer_result["customer_id"],
                price_id=price_id,
                payment_method_id=payment_method_id,
                trial_days=trial_days
            )
            
            # Log subscription creation
            if subscription_result.get("success"):
                payment_security.log_payment_event(
                    event_type="subscription_created",
                    user_id=user_id,
                    amount=0,  # Amount tracked separately in subscription
                    metadata={
                        "subscription_id": subscription_result.get("subscription_id"),
                        "price_id": price_id,
                        "trial_days": trial_days
                    },
                    db=self.db
                )
            
            return subscription_result
            
        except Exception as e:
            logger.error(f"Error creating subscription: {str(e)}")
            return {
                "success": False,
                "error": "Failed to create subscription"
            }
    
    def cancel_subscription(
        self,
        subscription_id: str,
        user_id: Optional[int] = None,
        immediate: bool = False
    ) -> Dict[str, Any]:
        """Cancel a subscription with proper logging."""
        try:
            result = self.stripe_service.cancel_subscription(subscription_id, immediate)
            
            # Log cancellation
            if result.get("success"):
                payment_security.log_payment_event(
                    event_type="subscription_cancelled",
                    user_id=user_id,
                    amount=0,
                    metadata={
                        "subscription_id": subscription_id,
                        "immediate": immediate
                    },
                    db=self.db
                )
            
            return result
            
        except Exception as e:
            logger.error(f"Error cancelling subscription: {str(e)}")
            return {
                "success": False,
                "error": "Failed to cancel subscription"
            }
    
    # ==========================================
    # GIFT CERTIFICATES
    # ==========================================
    
    def create_gift_certificate(
        self,
        amount: float,
        recipient_email: str,
        purchaser_id: Optional[int] = None,
        message: Optional[str] = None,
        expires_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Create a gift certificate with security validation."""
        try:
            # Validate amount
            if purchaser_id:
                security_result = payment_security.validate_payment_amount(
                    amount, purchaser_id, self.db
                )
                if not security_result["valid"]:
                    return {
                        "success": False,
                        "error": security_result["error"]
                    }
            
            # Create gift certificate using original service
            result = self.payment_service.create_gift_certificate(
                amount=amount,
                recipient_email=recipient_email,
                purchaser_id=purchaser_id,
                message=message,
                expires_at=expires_at,
                db=self.db
            )
            
            # Log gift certificate creation
            if result.get("success"):
                payment_security.log_payment_event(
                    event_type="gift_certificate_created",
                    user_id=purchaser_id,
                    amount=amount,
                    metadata={
                        "certificate_code": result.get("certificate_code"),
                        "recipient_email": recipient_email
                    },
                    db=self.db
                )
            
            return result
            
        except Exception as e:
            logger.error(f"Error creating gift certificate: {str(e)}")
            return {
                "success": False,
                "error": "Failed to create gift certificate"
            }
    
    def validate_gift_certificate(self, code: str) -> Optional[GiftCertificate]:
        """Validate a gift certificate code with security checks."""
        try:
            # Basic format validation
            if not payment_security.validate_gift_certificate_code(code):
                return None
            
            # Get certificate from database
            return PaymentService.validate_gift_certificate(code, self.db)
            
        except Exception as e:
            logger.error(f"Error validating gift certificate: {str(e)}")
            return None
    
    # ==========================================
    # PAYOUT MANAGEMENT
    # ==========================================
    
    def process_barber_payout(
        self,
        barber_id: int,
        amount: float,
        payout_period_start: datetime,
        payout_period_end: datetime,
        admin_user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Process barber payout with security validation."""
        try:
            # Get barber user
            barber = self.db.query(User).filter(User.id == barber_id).first()
            if not barber:
                return {
                    "success": False,
                    "error": "Barber not found"
                }
            
            # Validate payout eligibility
            eligibility = payment_security.validate_payout_eligibility(barber, amount)
            if not eligibility["eligible"]:
                return {
                    "success": False,
                    "error": eligibility["reason"]
                }
            
            # Process payout using original service
            result = self.payment_service.process_barber_payout(
                barber_id=barber_id,
                amount=amount,
                payout_period_start=payout_period_start,
                payout_period_end=payout_period_end,
                db=self.db
            )
            
            # Log payout
            if result.get("success"):
                payment_security.log_payment_event(
                    event_type="barber_payout_processed",
                    user_id=admin_user_id,
                    amount=amount,
                    metadata={
                        "barber_id": barber_id,
                        "payout_period_start": payout_period_start.isoformat(),
                        "payout_period_end": payout_period_end.isoformat()
                    },
                    db=self.db
                )
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing barber payout: {str(e)}")
            return {
                "success": False,
                "error": "Failed to process payout"
            }
    
    # ==========================================
    # FINANCIAL REPORTING
    # ==========================================
    
    @cache_result(ttl=3600)  # Cache for 1 hour
    def get_payment_reports(
        self,
        start_date: datetime,
        end_date: datetime,
        user_id: Optional[int] = None,
        report_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get comprehensive payment reports with caching."""
        try:
            return self.payment_service.get_payment_reports(
                start_date=start_date,
                end_date=end_date,
                user_id=user_id,
                report_type=report_type,
                db=self.db
            )
        except Exception as e:
            logger.error(f"Error generating payment reports: {str(e)}")
            return {
                "success": False,
                "error": "Failed to generate reports"
            }
    
    def get_payment_history(
        self,
        user_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
        status_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get paginated payment history."""
        try:
            return self.payment_service.get_payment_history(
                user_id=user_id,
                limit=limit,
                offset=offset,
                status_filter=status_filter,
                db=self.db
            )
        except Exception as e:
            logger.error(f"Error getting payment history: {str(e)}")
            return {
                "success": False,
                "error": "Failed to get payment history",
                "payments": []
            }
    
    # ==========================================
    # SECURITY & FRAUD DETECTION
    # ==========================================
    
    def check_payment_security(
        self,
        user_id: int,
        amount: float,
        additional_checks: bool = True
    ) -> Dict[str, Any]:
        """Comprehensive payment security check."""
        try:
            results = {
                "secure": True,
                "flags": [],
                "recommendations": []
            }
            
            # Amount validation
            amount_check = payment_security.validate_payment_amount(amount, user_id, self.db)
            if not amount_check["valid"]:
                results["secure"] = False
                results["flags"].append("invalid_amount")
                results["recommendations"].append(amount_check["error"])
            
            # Suspicious activity check
            activity_check = payment_security.detect_suspicious_payment_activity(
                user_id, self.db
            )
            if activity_check["suspicious"]:
                results["secure"] = False
                results["flags"].extend(activity_check["flags"])
                results["recommendations"].append("Account flagged for suspicious activity")
            
            # Rate limiting check
            if not payment_security.rate_limit_check(user_id, "payment", self.db):
                results["secure"] = False
                results["flags"].append("rate_limited")
                results["recommendations"].append("Too many payment attempts")
            
            return results
            
        except Exception as e:
            logger.error(f"Error checking payment security: {str(e)}")
            return {
                "secure": False,
                "flags": ["security_check_failed"],
                "recommendations": ["Security validation failed"]
            }
    
    # ==========================================
    # WEBHOOK HANDLING
    # ==========================================
    
    def handle_stripe_webhook(
        self,
        event_type: str,
        event_data: Dict[str, Any],
        signature: str,
        payload: bytes
    ) -> Dict[str, Any]:
        """Handle Stripe webhook with signature verification."""
        try:
            # Verify webhook signature
            if not payment_security.verify_webhook_signature(
                payload, signature, settings.STRIPE_WEBHOOK_SECRET
            ):
                return {
                    "success": False,
                    "error": "Invalid webhook signature"
                }
            
            # Process webhook based on event type
            if event_type == "payment_intent.succeeded":
                return self._handle_payment_succeeded(event_data)
            elif event_type == "payment_intent.payment_failed":
                return self._handle_payment_failed(event_data)
            elif event_type == "invoice.payment_succeeded":
                return self._handle_subscription_payment(event_data)
            else:
                logger.info(f"Unhandled webhook event type: {event_type}")
                return {"success": True, "message": "Event acknowledged"}
            
        except Exception as e:
            logger.error(f"Error handling Stripe webhook: {str(e)}")
            return {
                "success": False,
                "error": "Webhook processing failed"
            }
    
    def _handle_payment_succeeded(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle successful payment webhook."""
        try:
            payment_intent_id = event_data.get("id")
            if not payment_intent_id:
                return {"success": False, "error": "Missing payment intent ID"}
            
            # Update payment status in database
            payment = self.db.query(Payment).filter(
                Payment.stripe_payment_intent_id == payment_intent_id
            ).first()
            
            if payment:
                payment.status = "completed"
                payment.completed_at = datetime.utcnow()
                self.db.commit()
                
                # Log successful payment
                payment_security.log_payment_event(
                    event_type="payment_webhook_succeeded",
                    user_id=payment.appointment.user_id if payment.appointment else None,
                    amount=payment.amount,
                    metadata={"payment_intent_id": payment_intent_id},
                    db=self.db
                )
            
            return {"success": True, "message": "Payment updated"}
            
        except Exception as e:
            logger.error(f"Error handling successful payment webhook: {str(e)}")
            return {"success": False, "error": "Failed to update payment"}
    
    def _handle_payment_failed(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle failed payment webhook."""
        try:
            payment_intent_id = event_data.get("id")
            if not payment_intent_id:
                return {"success": False, "error": "Missing payment intent ID"}
            
            # Update payment status
            payment = self.db.query(Payment).filter(
                Payment.stripe_payment_intent_id == payment_intent_id
            ).first()
            
            if payment:
                payment.status = "failed"
                payment.failure_reason = event_data.get("last_payment_error", {}).get("message")
                self.db.commit()
                
                # Log failed payment
                payment_security.log_payment_event(
                    event_type="payment_webhook_failed",
                    user_id=payment.appointment.user_id if payment.appointment else None,
                    amount=payment.amount,
                    metadata={
                        "payment_intent_id": payment_intent_id,
                        "failure_reason": payment.failure_reason
                    },
                    db=self.db
                )
            
            return {"success": True, "message": "Payment failure recorded"}
            
        except Exception as e:
            logger.error(f"Error handling failed payment webhook: {str(e)}")
            return {"success": False, "error": "Failed to update payment"}
    
    def _handle_subscription_payment(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle subscription payment webhook."""
        try:
            subscription_id = event_data.get("subscription")
            if not subscription_id:
                return {"success": False, "error": "Missing subscription ID"}
            
            # Update subscription payment status
            subscription = self.db.query(Subscription).filter(
                Subscription.stripe_subscription_id == subscription_id
            ).first()
            
            if subscription:
                subscription.last_payment_at = datetime.utcnow()
                subscription.status = "active"
                self.db.commit()
                
                # Log subscription payment
                payment_security.log_payment_event(
                    event_type="subscription_payment_succeeded",
                    user_id=subscription.user_id,
                    amount=event_data.get("amount_paid", 0) / 100,  # Convert from cents
                    metadata={"subscription_id": subscription_id},
                    db=self.db
                )
            
            return {"success": True, "message": "Subscription payment recorded"}
            
        except Exception as e:
            logger.error(f"Error handling subscription payment webhook: {str(e)}")
            return {"success": False, "error": "Failed to update subscription"}

# ==========================================
# FACTORY FUNCTION
# ==========================================

def get_payment_manager(db: Session) -> PaymentManager:
    """Factory function to get PaymentManager instance."""
    return PaymentManager(db)

# ==========================================
# BACKWARD COMPATIBILITY FUNCTIONS
# ==========================================

def create_payment_intent_unified(db: Session, **kwargs) -> Dict[str, Any]:
    """Backward compatible function for existing code."""
    manager = get_payment_manager(db)
    return manager.create_payment_intent(**kwargs)

def process_refund_unified(db: Session, **kwargs) -> Dict[str, Any]:
    """Backward compatible function for existing code."""
    manager = get_payment_manager(db)
    return manager.process_refund(**kwargs)

def create_subscription_unified(db: Session, **kwargs) -> Dict[str, Any]:
    """Backward compatible function for existing code."""
    manager = get_payment_manager(db)
    return manager.create_subscription(**kwargs)