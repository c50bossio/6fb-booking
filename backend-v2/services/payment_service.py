import stripe
from sqlalchemy.orm import Session
from models import Payment, Appointment
from config import settings
import logging

# Configure Stripe
stripe.api_key = settings.stripe_secret_key

logger = logging.getLogger(__name__)

class PaymentService:
    @staticmethod
    def create_payment_intent(amount: float, booking_id: int, db: Session):
        """Create a Stripe payment intent for a booking"""
        try:
            # Create payment intent in Stripe
            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),  # Convert to cents
                currency='usd',
                metadata={
                    'booking_id': str(booking_id)
                }
            )
            
            # Get the appointment
            appointment = db.query(Appointment).filter(Appointment.id == booking_id).first()
            if not appointment:
                raise ValueError(f"Appointment {booking_id} not found")
            
            # Create payment record in database
            payment = Payment(
                user_id=appointment.user_id,
                appointment_id=booking_id,
                amount=amount,
                status="pending",
                stripe_payment_intent_id=intent.id
            )
            db.add(payment)
            db.commit()
            db.refresh(payment)
            
            return {
                "client_secret": intent.client_secret,
                "payment_intent_id": intent.id,
                "amount": amount
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payment intent: {str(e)}")
            raise Exception(f"Payment processing error: {str(e)}")
        except Exception as e:
            logger.error(f"Error creating payment intent: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def confirm_payment(payment_intent_id: str, booking_id: int, db: Session):
        """Confirm payment and update booking status"""
        try:
            # Retrieve payment intent from Stripe
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            # Check if payment was successful
            if intent.status != 'succeeded':
                raise ValueError(f"Payment not successful. Status: {intent.status}")
            
            # Update payment record
            payment = db.query(Payment).filter(
                Payment.stripe_payment_intent_id == payment_intent_id
            ).first()
            
            if not payment:
                raise ValueError("Payment record not found")
            
            payment.status = "completed"
            payment.stripe_payment_id = intent.id
            
            # Update appointment status
            appointment = db.query(Appointment).filter(
                Appointment.id == booking_id
            ).first()
            
            if not appointment:
                raise ValueError("Appointment not found")
            
            appointment.status = "confirmed"
            
            db.commit()
            
            return {
                "success": True,
                "appointment_id": appointment.id,
                "payment_id": payment.id
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error confirming payment: {str(e)}")
            raise Exception(f"Payment confirmation error: {str(e)}")
        except Exception as e:
            logger.error(f"Error confirming payment: {str(e)}")
            db.rollback()
            raise