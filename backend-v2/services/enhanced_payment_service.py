"""
Enhanced Payment Service
Integrates with the new multi-gateway payment system while maintaining compatibility
with the existing BookedBarber payment system.
"""

import asyncio
import logging
from decimal import Decimal
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from sqlalchemy.orm import Session

from models import Payment, Appointment, User, Refund, Payout, GiftCertificate
from services.payment_security import PaymentSecurity
from utils.logging_config import get_audit_logger
from utils.security_logging import get_security_logger, SecurityEventType

# Import the new gateway system
from .payment_gateways import (
    PaymentGatewayManager, PaymentGateway, GatewayType, GatewayError,
    SelectionContext, SelectionStrategy
)
from .payment_gateways.config_manager import get_config_manager, get_current_config

logger = logging.getLogger(__name__)
financial_audit_logger = get_audit_logger()


class EnhancedPaymentService:
    """
    Enhanced payment service that uses the multi-gateway system
    while maintaining compatibility with existing BookedBarber functionality.
    """
    
    def __init__(self):
        self._gateway_manager: Optional[PaymentGatewayManager] = None
        self._initialized = False
    
    async def _ensure_initialized(self):
        """Ensure the gateway manager is initialized"""
        if not self._initialized:
            config = get_current_config()
            
            # Convert config to manager format
            manager_config = {
                'gateways': {},
                'default_selection_strategy': config.default_selection_strategy.value,
                'failover_enabled': config.failover_enabled,
                'auto_health_checks': config.auto_health_checks,
                'health_check_interval': config.health_check_interval
            }
            
            # Add gateway configurations
            for gateway_type, gateway_config in config.gateways.items():
                if gateway_config.enabled and gateway_config.api_key:
                    manager_config['gateways'][gateway_type.value] = gateway_config.get_config_for_environment(
                        get_config_manager().environment
                    )
            
            self._gateway_manager = PaymentGatewayManager(manager_config)
            self._initialized = True
            
            logger.info("Initialized enhanced payment service with multi-gateway support")
    
    async def create_payment_intent(
        self,
        amount: float,
        booking_id: int,
        db: Session,
        gift_certificate_code: Optional[str] = None,
        user_id: Optional[int] = None,
        idempotency_key: Optional[str] = None,
        preferred_gateway: Optional[str] = None,
        selection_strategy: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a payment intent using the multi-gateway system.
        
        Maintains compatibility with existing PaymentService.create_payment_intent
        while adding multi-gateway capabilities.
        """
        await self._ensure_initialized()
        
        try:
            # Enhanced payment amount validation with risk assessment
            amount_validation = PaymentSecurity.validate_payment_amount(amount, user_id, db)
            if not amount_validation["valid"]:
                risk_factors = ", ".join(amount_validation["risk_factors"])
                warnings = "; ".join(amount_validation["warnings"])
                raise ValueError(f"Payment amount validation failed: {warnings} (Risk factors: {risk_factors})")
            
            # Log high-risk transactions
            if amount_validation["risk_level"] in ["medium", "high"]:
                logger.warning(
                    f"High-risk payment intent - User: {user_id}, Amount: ${amount}, "
                    f"Risk Level: {amount_validation['risk_level']}, "
                    f"Factors: {amount_validation['risk_factors']}"
                )
                
                security_logger = get_security_logger(db)
                security_logger.log_payment_security_event(
                    event_type=SecurityEventType.HIGH_RISK_PAYMENT,
                    user_id=user_id,
                    amount=amount,
                    risk_factors=amount_validation['risk_factors'],
                    details={
                        "risk_level": amount_validation['risk_level'],
                        "booking_id": booking_id,
                        "warnings": amount_validation['warnings']
                    }
                )
            
            # Check for suspicious payment activity patterns
            if user_id:
                suspicious_activity = PaymentSecurity.detect_suspicious_payment_activity(user_id, db)
                if suspicious_activity["is_suspicious"]:
                    if suspicious_activity["recommendation"] == "block":
                        security_logger = get_security_logger(db)
                        security_logger.log_payment_security_event(
                            event_type=SecurityEventType.PAYMENT_BLOCKED,
                            user_id=user_id,
                            amount=amount,
                            risk_factors=suspicious_activity['patterns'],
                            details={
                                "suspicion_score": suspicious_activity['suspicion_score'],
                                "booking_id": booking_id,
                                "recommendation": suspicious_activity['recommendation']
                            }
                        )
                        raise ValueError("Payment blocked due to suspicious activity. Please contact support.")
            
            # Get the appointment
            appointment = db.query(Appointment).filter(Appointment.id == booking_id).first()
            if not appointment:
                raise ValueError(f"Appointment {booking_id} not found")
            
            # Validate appointment eligibility for payment
            eligibility = PaymentSecurity.validate_appointment_payment_eligibility(appointment)
            if not eligibility["eligible"]:
                raise ValueError(eligibility["reason"])
            
            # Additional user validation if provided
            if user_id and appointment.user_id != user_id:
                security_logger = get_security_logger(db)
                security_logger.log_payment_security_event(
                    event_type=SecurityEventType.UNAUTHORIZED_ACCESS,
                    user_id=user_id,
                    details={
                        "attempted_appointment_id": booking_id,
                        "actual_appointment_owner": appointment.user_id,
                        "action": "unauthorized_payment_attempt"
                    }
                )
                raise ValueError("Not authorized to pay for this appointment")
            
            # Handle gift certificate if provided
            gift_cert = None
            gift_cert_amount_used = 0
            final_amount = amount
            
            if gift_certificate_code:
                if not PaymentSecurity.validate_gift_certificate_code(gift_certificate_code):
                    raise ValueError("Invalid gift certificate code format")
                
                # Use legacy method for gift certificate validation
                from services.payment_service import PaymentService
                gift_cert = PaymentService.validate_gift_certificate(gift_certificate_code, db)
                if not gift_cert:
                    raise ValueError("Invalid or expired gift certificate")
                
                gift_cert_amount_used = min(gift_cert.balance, amount)
                final_amount = max(0, amount - gift_cert_amount_used)
            
            # Create selection context for gateway selection
            selection_context = SelectionContext(
                amount=Decimal(str(final_amount)),
                currency="usd",
                customer_id=str(user_id) if user_id else None,
                user_id=user_id,
                metadata={
                    'booking_id': str(booking_id),
                    'original_amount': str(amount),
                    'gift_cert_used': str(gift_cert_amount_used)
                }
            )
            
            # Determine selection strategy
            strategy = None
            if selection_strategy:
                try:
                    strategy = SelectionStrategy(selection_strategy)
                except ValueError:
                    logger.warning(f"Invalid selection strategy: {selection_strategy}")
            
            # Determine preferred gateway
            preferred_gateway_type = None
            if preferred_gateway:
                try:
                    preferred_gateway_type = GatewayType(preferred_gateway.lower())
                except ValueError:
                    logger.warning(f"Invalid preferred gateway: {preferred_gateway}")
            
            # Create payment intent through gateway manager
            payment_intent = None
            if final_amount > 0:
                payment_intent = await self._gateway_manager.create_payment_intent(
                    amount=Decimal(str(final_amount)),
                    currency="usd",
                    metadata=selection_context.metadata,
                    selection_context=selection_context,
                    preferred_gateway=preferred_gateway_type,
                    strategy=strategy
                )
            
            # Get barber commission rate and calculate splits
            barber = None
            commission_rate = 0.20  # Default 20%
            platform_fee = Decimal('0.00')
            barber_amount = Decimal('0.00')
            
            if appointment.barber_id:
                barber = db.query(User).filter(User.id == appointment.barber_id).first()
                if barber:
                    commission_rate = barber.commission_rate
            
            # Calculate commission splits if there's an amount to charge
            if final_amount > 0:
                try:
                    from services.base_commission import UnifiedCommissionService, CommissionType
                    commission_service = UnifiedCommissionService()
                    
                    commission_result = commission_service.calculate_commission(
                        commission_type=CommissionType.SERVICE,
                        amount=Decimal(str(final_amount)),
                        rate=Decimal(str(commission_rate))
                    )
                    
                    platform_fee = commission_result['platform_fee']
                    barber_amount = commission_result['barber_amount']
                    
                except ImportError:
                    # Fallback to traditional calculation
                    platform_fee = Decimal(str(final_amount)) * Decimal(str(commission_rate))
                    barber_amount = Decimal(str(final_amount)) - platform_fee
            
            # Create payment record in database
            payment = Payment(
                user_id=appointment.user_id,
                appointment_id=booking_id,
                barber_id=appointment.barber_id,
                amount=amount,
                status="pending",
                stripe_payment_intent_id=payment_intent.id if payment_intent else None,
                platform_fee=float(platform_fee),
                barber_amount=float(barber_amount),
                commission_rate=commission_rate,
                gift_certificate_id=gift_cert.id if gift_cert else None,
                gift_certificate_amount_used=gift_cert_amount_used
            )
            
            # Add gateway information to payment metadata
            if payment_intent and hasattr(payment_intent, 'metadata'):
                gateway_type = payment_intent.metadata.get('gateway_type')
                if gateway_type:
                    # Store gateway type in a custom field or metadata
                    # For now, we'll use the existing stripe_payment_intent_id field
                    # but in production, you might want to add a gateway_type field
                    payment.stripe_payment_intent_id = f"{gateway_type}:{payment_intent.id}"
            
            db.add(payment)
            db.commit()
            db.refresh(payment)
            
            # Log order creation
            financial_audit_logger.log_order_creation(
                user_id=str(appointment.user_id),
                order_id=f"appointment_{booking_id}",
                order_type="service_booking",
                total_amount=float(amount),
                items_count=1,
                payment_method=payment_intent.metadata.get('gateway_type', 'stripe') if payment_intent else "gift_certificate",
                success=True,
                details={
                    "appointment_id": appointment.id,
                    "barber_id": appointment.barber_id,
                    "service_name": getattr(appointment, 'service_name', 'Barber Service'),
                    "original_amount": float(amount),
                    "final_amount": float(final_amount),
                    "gift_certificate_used": float(gift_cert_amount_used),
                    "platform_fee": float(platform_fee),
                    "barber_amount": float(barber_amount),
                    "commission_rate": float(commission_rate),
                    "gateway_type": payment_intent.metadata.get('gateway_type') if payment_intent else None,
                    "payment_intent_id": payment_intent.id if payment_intent else None
                }
            )
            
            # Prepare response
            result = {
                "payment_id": payment.id,
                "amount": final_amount,
                "gift_certificate_used": gift_cert_amount_used,
                "gateway_type": payment_intent.metadata.get('gateway_type') if payment_intent else None
            }
            
            if payment_intent:
                result.update({
                    "client_secret": payment_intent.client_secret,
                    "payment_intent_id": payment_intent.id
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Enhanced payment intent creation failed: {e}")
            if isinstance(e, (ValueError, GatewayError)):
                raise
            raise ValueError(f"Payment intent creation failed: {str(e)}")
    
    async def confirm_payment(
        self,
        payment_intent_id: str,
        booking_id: int,
        db: Session,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Confirm payment using the multi-gateway system.
        
        Maintains compatibility with existing PaymentService.confirm_payment
        """
        await self._ensure_initialized()
        
        try:
            # Determine gateway type from payment intent ID
            gateway_type = None
            actual_intent_id = payment_intent_id
            
            if ":" in payment_intent_id:
                gateway_str, actual_intent_id = payment_intent_id.split(":", 1)
                try:
                    gateway_type = GatewayType(gateway_str)
                except ValueError:
                    pass
            
            # Confirm payment through gateway manager
            result = await self._gateway_manager.confirm_payment(
                payment_intent_id=actual_intent_id,
                gateway_type=gateway_type
            )
            
            # Update payment record in database
            payment = db.query(Payment).filter(
                Payment.stripe_payment_intent_id.like(f"%{actual_intent_id}")
            ).first()
            
            if not payment:
                raise ValueError("Payment record not found")
            
            # Update payment status and details
            payment.status = "completed"
            payment.stripe_payment_id = result.gateway_transaction_id
            
            # Update appointment status
            appointment = db.query(Appointment).filter(
                Appointment.id == booking_id
            ).first()
            
            if appointment:
                appointment.status = "confirmed"
                appointment.payment_status = "paid"
            
            db.commit()
            
            # Return response in expected format
            return {
                "payment_id": payment.id,
                "appointment_id": booking_id,
                "amount_charged": float(result.amount),
                "gift_certificate_used": payment.gift_certificate_amount_used,
                "gateway_type": result.gateway_data.get('gateway_type') if result.gateway_data else None,
                "transaction_id": result.gateway_transaction_id
            }
            
        except Exception as e:
            logger.error(f"Enhanced payment confirmation failed: {e}")
            if isinstance(e, (ValueError, GatewayError)):
                raise
            raise ValueError(f"Payment confirmation failed: {str(e)}")
    
    async def process_refund(
        self,
        payment_id: int,
        amount: float,
        reason: str,
        initiated_by_id: int,
        db: Session,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process refund using the multi-gateway system.
        """
        await self._ensure_initialized()
        
        try:
            # Get payment record
            payment = db.query(Payment).filter(Payment.id == payment_id).first()
            if not payment:
                raise ValueError("Payment not found")
            
            # Determine gateway and payment ID
            gateway_type = None
            gateway_payment_id = payment.stripe_payment_id
            
            if payment.stripe_payment_intent_id and ":" in payment.stripe_payment_intent_id:
                gateway_str, _ = payment.stripe_payment_intent_id.split(":", 1)
                try:
                    gateway_type = GatewayType(gateway_str)
                except ValueError:
                    pass
            
            if not gateway_payment_id:
                raise ValueError("No gateway payment ID found")
            
            # Create refund through gateway manager
            refund_result = await self._gateway_manager.create_refund(
                payment_id=gateway_payment_id,
                amount=Decimal(str(amount)) if amount else None,
                reason=reason,
                gateway_type=gateway_type
            )
            
            # Create refund record in database
            refund = Refund(
                payment_id=payment_id,
                amount=amount,
                reason=reason,
                status="completed",
                stripe_refund_id=refund_result.gateway_refund_id,
                initiated_by_id=initiated_by_id,
                processed_at=datetime.utcnow()
            )
            
            db.add(refund)
            
            # Update payment refund tracking
            payment.refund_amount = (payment.refund_amount or 0) + amount
            if payment.refund_amount >= payment.amount:
                payment.status = "refunded"
            else:
                payment.status = "partially_refunded"
            
            payment.refund_reason = reason
            payment.refunded_at = datetime.utcnow()
            payment.stripe_refund_id = refund_result.gateway_refund_id
            
            db.commit()
            db.refresh(refund)
            
            return {
                "refund_id": refund.id,
                "amount": float(refund_result.amount),
                "status": refund_result.status.value,
                "gateway_refund_id": refund_result.gateway_refund_id,
                "gateway_type": gateway_type.value if gateway_type else None
            }
            
        except Exception as e:
            logger.error(f"Enhanced refund processing failed: {e}")
            if isinstance(e, (ValueError, GatewayError)):
                raise
            raise ValueError(f"Refund processing failed: {str(e)}")
    
    async def get_gateway_stats(self) -> Dict[str, Any]:
        """Get comprehensive gateway statistics"""
        await self._ensure_initialized()
        return self._gateway_manager.get_gateway_stats()
    
    async def health_check_all_gateways(self) -> Dict[str, Any]:
        """Run health checks on all gateways"""
        await self._ensure_initialized()
        return await self._gateway_manager.health_check_all()
    
    def get_available_gateways(self) -> List[str]:
        """Get list of available payment gateways"""
        config_manager = get_config_manager()
        enabled_gateways = config_manager.get_enabled_gateways()
        return [gateway.value for gateway in enabled_gateways]
    
    def get_gateway_config_summary(self) -> Dict[str, Any]:
        """Get summary of gateway configuration"""
        config_manager = get_config_manager()
        return config_manager.export_config()


# Create a singleton instance for backward compatibility
enhanced_payment_service = EnhancedPaymentService()


# Convenience functions that can be used to gradually migrate from the old service
async def create_payment_intent_enhanced(
    amount: float,
    booking_id: int,
    db: Session,
    gift_certificate_code: Optional[str] = None,
    user_id: Optional[int] = None,
    idempotency_key: Optional[str] = None,
    preferred_gateway: Optional[str] = None,
    selection_strategy: Optional[str] = None
) -> Dict[str, Any]:
    """Enhanced version of create_payment_intent with multi-gateway support"""
    return await enhanced_payment_service.create_payment_intent(
        amount=amount,
        booking_id=booking_id,
        db=db,
        gift_certificate_code=gift_certificate_code,
        user_id=user_id,
        idempotency_key=idempotency_key,
        preferred_gateway=preferred_gateway,
        selection_strategy=selection_strategy
    )


async def confirm_payment_enhanced(
    payment_intent_id: str,
    booking_id: int,
    db: Session,
    idempotency_key: Optional[str] = None
) -> Dict[str, Any]:
    """Enhanced version of confirm_payment with multi-gateway support"""
    return await enhanced_payment_service.confirm_payment(
        payment_intent_id=payment_intent_id,
        booking_id=booking_id,
        db=db,
        idempotency_key=idempotency_key
    )


async def process_refund_enhanced(
    payment_id: int,
    amount: float,
    reason: str,
    initiated_by_id: int,
    db: Session,
    idempotency_key: Optional[str] = None
) -> Dict[str, Any]:
    """Enhanced version of process_refund with multi-gateway support"""
    return await enhanced_payment_service.process_refund(
        payment_id=payment_id,
        amount=amount,
        reason=reason,
        initiated_by_id=initiated_by_id,
        db=db,
        idempotency_key=idempotency_key
    )