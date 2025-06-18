"""Stripe payment service for handling all payment operations."""
import stripe
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from config.settings import get_settings
from models.payment import (
    Payment, PaymentMethod, PaymentStatus, PaymentMethodType,
    Refund, RefundStatus, StripeCustomer, PaymentWebhookEvent
)
from models.user import User
from models.appointment import Appointment

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    """Service for handling Stripe payment operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_or_get_customer(self, user: User) -> str:
        """Create or retrieve Stripe customer for a user."""
        try:
            # Check if user already has a Stripe customer
            stripe_customer = self.db.query(StripeCustomer).filter(
                StripeCustomer.user_id == user.id
            ).first()
            
            if stripe_customer:
                return stripe_customer.stripe_customer_id
            
            # Create new Stripe customer
            customer = stripe.Customer.create(
                email=user.email,
                name=user.full_name,
                phone=user.phone,
                metadata={
                    "user_id": str(user.id),
                    "platform": "6FB"
                }
            )
            
            # Save to database
            stripe_customer = StripeCustomer(
                user_id=user.id,
                stripe_customer_id=customer.id
            )
            self.db.add(stripe_customer)
            self.db.commit()
            
            logger.info(f"Created Stripe customer {customer.id} for user {user.id}")
            return customer.id
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating customer: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error creating Stripe customer: {str(e)}")
            self.db.rollback()
            raise
    
    async def add_payment_method(
        self, 
        user: User, 
        payment_method_id: str,
        set_as_default: bool = False
    ) -> PaymentMethod:
        """Add a payment method to a user."""
        try:
            # Get or create Stripe customer
            customer_id = await self.create_or_get_customer(user)
            
            # Attach payment method to customer
            stripe_pm = stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id
            )
            
            # Set as default if requested
            if set_as_default:
                stripe.Customer.modify(
                    customer_id,
                    invoice_settings={"default_payment_method": payment_method_id}
                )
                
                # Update existing default payment methods
                self.db.query(PaymentMethod).filter(
                    PaymentMethod.user_id == user.id,
                    PaymentMethod.is_default == True
                ).update({"is_default": False})
            
            # Extract payment method details
            pm_type = PaymentMethodType(stripe_pm.type)
            pm_data = {
                "user_id": user.id,
                "stripe_payment_method_id": stripe_pm.id,
                "type": pm_type,
                "is_default": set_as_default
            }
            
            if stripe_pm.type == "card":
                pm_data.update({
                    "last_four": stripe_pm.card.last4,
                    "brand": stripe_pm.card.brand,
                    "exp_month": stripe_pm.card.exp_month,
                    "exp_year": stripe_pm.card.exp_year
                })
            elif stripe_pm.type == "us_bank_account":
                pm_data.update({
                    "bank_name": stripe_pm.us_bank_account.bank_name,
                    "account_last_four": stripe_pm.us_bank_account.last4
                })
            
            # Create payment method record
            payment_method = PaymentMethod(**pm_data)
            self.db.add(payment_method)
            self.db.commit()
            self.db.refresh(payment_method)
            
            logger.info(f"Added payment method {payment_method.id} for user {user.id}")
            return payment_method
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error adding payment method: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error adding payment method: {str(e)}")
            self.db.rollback()
            raise
    
    async def remove_payment_method(
        self, 
        user: User, 
        payment_method_id: int
    ) -> bool:
        """Remove a payment method."""
        try:
            payment_method = self.db.query(PaymentMethod).filter(
                PaymentMethod.id == payment_method_id,
                PaymentMethod.user_id == user.id
            ).first()
            
            if not payment_method:
                raise ValueError("Payment method not found")
            
            # Detach from Stripe
            stripe.PaymentMethod.detach(payment_method.stripe_payment_method_id)
            
            # Mark as inactive instead of deleting
            payment_method.is_active = False
            self.db.commit()
            
            logger.info(f"Removed payment method {payment_method_id} for user {user.id}")
            return True
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error removing payment method: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error removing payment method: {str(e)}")
            self.db.rollback()
            raise
    
    async def create_payment_intent(
        self,
        appointment: Appointment,
        user: User,
        amount: int,
        payment_method_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[Payment, str]:
        """Create a payment intent for an appointment."""
        try:
            # Get or create Stripe customer
            customer_id = await self.create_or_get_customer(user)
            
            # Prepare metadata
            intent_metadata = {
                "appointment_id": str(appointment.id),
                "user_id": str(user.id),
                "barber_id": str(appointment.barber_id),
                "platform": "6FB"
            }
            if metadata:
                intent_metadata.update(metadata)
            
            # Create payment intent
            intent_params = {
                "amount": amount,
                "currency": "usd",
                "customer": customer_id,
                "description": f"Payment for appointment on {appointment.appointment_date}",
                "metadata": intent_metadata,
                "automatic_payment_methods": {"enabled": True}
            }
            
            # Add payment method if provided
            if payment_method_id:
                payment_method = self.db.query(PaymentMethod).filter(
                    PaymentMethod.id == payment_method_id,
                    PaymentMethod.user_id == user.id,
                    PaymentMethod.is_active == True
                ).first()
                
                if payment_method:
                    intent_params["payment_method"] = payment_method.stripe_payment_method_id
                    intent_params["confirm"] = True
            
            intent = stripe.PaymentIntent.create(**intent_params)
            
            # Create payment record
            payment = Payment(
                appointment_id=appointment.id,
                user_id=user.id,
                payment_method_id=payment_method_id,
                stripe_payment_intent_id=intent.id,
                amount=amount,
                status=PaymentStatus.PENDING,
                description=intent_params["description"],
                metadata=intent_metadata
            )
            
            self.db.add(payment)
            self.db.commit()
            self.db.refresh(payment)
            
            logger.info(f"Created payment intent {intent.id} for appointment {appointment.id}")
            return payment, intent.client_secret
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payment intent: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error creating payment intent: {str(e)}")
            self.db.rollback()
            raise
    
    async def confirm_payment(
        self,
        payment_intent_id: str,
        payment_method_id: Optional[str] = None
    ) -> Payment:
        """Confirm a payment intent."""
        try:
            # Find payment record
            payment = self.db.query(Payment).filter(
                Payment.stripe_payment_intent_id == payment_intent_id
            ).first()
            
            if not payment:
                raise ValueError("Payment not found")
            
            # Confirm with Stripe
            confirm_params = {}
            if payment_method_id:
                confirm_params["payment_method"] = payment_method_id
            
            intent = stripe.PaymentIntent.confirm(
                payment_intent_id,
                **confirm_params
            )
            
            # Update payment status
            payment.status = PaymentStatus(intent.status)
            if intent.status == "succeeded":
                payment.paid_at = datetime.utcnow()
                if intent.charges.data:
                    payment.stripe_charge_id = intent.charges.data[0].id
            
            self.db.commit()
            self.db.refresh(payment)
            
            logger.info(f"Confirmed payment {payment.id} with status {payment.status}")
            return payment
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error confirming payment: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error confirming payment: {str(e)}")
            self.db.rollback()
            raise
    
    async def cancel_payment(self, payment_id: int) -> Payment:
        """Cancel a payment intent."""
        try:
            payment = self.db.query(Payment).filter(Payment.id == payment_id).first()
            if not payment:
                raise ValueError("Payment not found")
            
            # Cancel with Stripe
            stripe.PaymentIntent.cancel(payment.stripe_payment_intent_id)
            
            # Update status
            payment.status = PaymentStatus.CANCELLED
            self.db.commit()
            self.db.refresh(payment)
            
            logger.info(f"Cancelled payment {payment_id}")
            return payment
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error cancelling payment: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error cancelling payment: {str(e)}")
            self.db.rollback()
            raise
    
    async def create_refund(
        self,
        payment_id: int,
        amount: Optional[int] = None,
        reason: Optional[str] = None,
        initiated_by: User = None
    ) -> Refund:
        """Create a refund for a payment."""
        try:
            payment = self.db.query(Payment).filter(Payment.id == payment_id).first()
            if not payment:
                raise ValueError("Payment not found")
            
            if payment.status != PaymentStatus.SUCCEEDED:
                raise ValueError("Can only refund succeeded payments")
            
            # Determine refund amount
            refund_amount = amount or payment.refundable_amount
            if refund_amount <= 0:
                raise ValueError("Invalid refund amount")
            
            if refund_amount > payment.refundable_amount:
                raise ValueError("Refund amount exceeds refundable amount")
            
            # Create Stripe refund
            stripe_refund = stripe.Refund.create(
                payment_intent=payment.stripe_payment_intent_id,
                amount=refund_amount,
                reason=reason or "requested_by_customer",
                metadata={
                    "payment_id": str(payment.id),
                    "initiated_by": str(initiated_by.id) if initiated_by else "system"
                }
            )
            
            # Create refund record
            refund = Refund(
                payment_id=payment.id,
                stripe_refund_id=stripe_refund.id,
                amount=refund_amount,
                reason=reason,
                status=RefundStatus(stripe_refund.status),
                initiated_by_id=initiated_by.id if initiated_by else None,
                metadata={"stripe_reason": stripe_refund.reason}
            )
            
            if stripe_refund.status == "succeeded":
                refund.refunded_at = datetime.utcnow()
                
                # Update payment status
                if payment.refunded_amount >= payment.amount:
                    payment.status = PaymentStatus.REFUNDED
                else:
                    payment.status = PaymentStatus.PARTIALLY_REFUNDED
            
            self.db.add(refund)
            self.db.commit()
            self.db.refresh(refund)
            
            logger.info(f"Created refund {refund.id} for payment {payment_id}")
            return refund
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating refund: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error creating refund: {str(e)}")
            self.db.rollback()
            raise
    
    async def handle_webhook_event(self, event: stripe.Event) -> bool:
        """Handle incoming Stripe webhook events."""
        try:
            # Check if we've already processed this event
            existing_event = self.db.query(PaymentWebhookEvent).filter(
                PaymentWebhookEvent.stripe_event_id == event.id
            ).first()
            
            if existing_event and existing_event.processed:
                logger.info(f"Webhook event {event.id} already processed")
                return True
            
            # Create or update webhook event record
            if not existing_event:
                webhook_event = PaymentWebhookEvent(
                    stripe_event_id=event.id,
                    event_type=event.type,
                    data=event.data.object
                )
                self.db.add(webhook_event)
            else:
                webhook_event = existing_event
            
            # Process based on event type
            if event.type == "payment_intent.succeeded":
                await self._handle_payment_succeeded(event.data.object)
            elif event.type == "payment_intent.payment_failed":
                await self._handle_payment_failed(event.data.object)
            elif event.type == "charge.refunded":
                await self._handle_charge_refunded(event.data.object)
            elif event.type == "payment_method.attached":
                await self._handle_payment_method_attached(event.data.object)
            elif event.type == "payment_method.detached":
                await self._handle_payment_method_detached(event.data.object)
            else:
                logger.info(f"Unhandled webhook event type: {event.type}")
            
            # Mark as processed
            webhook_event.processed = True
            webhook_event.processed_at = datetime.utcnow()
            self.db.commit()
            
            return True
            
        except Exception as e:
            logger.error(f"Error handling webhook event: {str(e)}")
            if 'webhook_event' in locals():
                webhook_event.error = str(e)
                self.db.commit()
            raise
    
    async def _handle_payment_succeeded(self, payment_intent: Dict[str, Any]):
        """Handle successful payment."""
        payment = self.db.query(Payment).filter(
            Payment.stripe_payment_intent_id == payment_intent["id"]
        ).first()
        
        if payment:
            payment.status = PaymentStatus.SUCCEEDED
            payment.paid_at = datetime.utcnow()
            if payment_intent.get("charges", {}).get("data"):
                payment.stripe_charge_id = payment_intent["charges"]["data"][0]["id"]
            
            # Update appointment payment status
            appointment = payment.appointment
            if appointment:
                appointment.payment_status = "paid"
            
            self.db.commit()
            logger.info(f"Payment {payment.id} succeeded")
    
    async def _handle_payment_failed(self, payment_intent: Dict[str, Any]):
        """Handle failed payment."""
        payment = self.db.query(Payment).filter(
            Payment.stripe_payment_intent_id == payment_intent["id"]
        ).first()
        
        if payment:
            payment.status = PaymentStatus.FAILED
            last_error = payment_intent.get("last_payment_error", {})
            payment.failure_code = last_error.get("code")
            payment.failure_message = last_error.get("message")
            self.db.commit()
            logger.info(f"Payment {payment.id} failed")
    
    async def _handle_charge_refunded(self, charge: Dict[str, Any]):
        """Handle charge refunded event."""
        payment = self.db.query(Payment).filter(
            Payment.stripe_charge_id == charge["id"]
        ).first()
        
        if payment:
            # Check if all refunds are tracked
            for stripe_refund in charge.get("refunds", {}).get("data", []):
                existing_refund = self.db.query(Refund).filter(
                    Refund.stripe_refund_id == stripe_refund["id"]
                ).first()
                
                if not existing_refund:
                    # Create refund record
                    refund = Refund(
                        payment_id=payment.id,
                        stripe_refund_id=stripe_refund["id"],
                        amount=stripe_refund["amount"],
                        status=RefundStatus(stripe_refund["status"]),
                        reason=stripe_refund.get("reason"),
                        metadata={"source": "webhook"}
                    )
                    if stripe_refund["status"] == "succeeded":
                        refund.refunded_at = datetime.utcnow()
                    self.db.add(refund)
            
            # Update payment status
            if charge["amount_refunded"] >= charge["amount"]:
                payment.status = PaymentStatus.REFUNDED
            elif charge["amount_refunded"] > 0:
                payment.status = PaymentStatus.PARTIALLY_REFUNDED
            
            self.db.commit()
            logger.info(f"Charge refunded for payment {payment.id}")
    
    async def _handle_payment_method_attached(self, payment_method: Dict[str, Any]):
        """Handle payment method attached event."""
        # Payment method should already be in our database from add_payment_method
        logger.info(f"Payment method {payment_method['id']} attached to customer")
    
    async def _handle_payment_method_detached(self, payment_method: Dict[str, Any]):
        """Handle payment method detached event."""
        pm = self.db.query(PaymentMethod).filter(
            PaymentMethod.stripe_payment_method_id == payment_method["id"]
        ).first()
        
        if pm:
            pm.is_active = False
            self.db.commit()
            logger.info(f"Payment method {pm.id} detached")
    
    async def get_payment_history(
        self,
        user: User,
        limit: int = 50,
        offset: int = 0,
        status: Optional[PaymentStatus] = None
    ) -> List[Payment]:
        """Get payment history for a user."""
        query = self.db.query(Payment).filter(Payment.user_id == user.id)
        
        if status:
            query = query.filter(Payment.status == status)
        
        payments = query.order_by(Payment.created_at.desc()).limit(limit).offset(offset).all()
        return payments
    
    async def get_payment_methods(
        self,
        user: User,
        active_only: bool = True
    ) -> List[PaymentMethod]:
        """Get payment methods for a user."""
        query = self.db.query(PaymentMethod).filter(PaymentMethod.user_id == user.id)
        
        if active_only:
            query = query.filter(PaymentMethod.is_active == True)
        
        return query.order_by(PaymentMethod.is_default.desc(), PaymentMethod.created_at.desc()).all()