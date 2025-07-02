import stripe
from sqlalchemy.orm import Session
from models import Payment, Appointment, User, Refund, Payout, GiftCertificate
from config import settings
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import secrets
import string
from services.payment_security import PaymentSecurity, audit_logger
from utils.logging_config import get_audit_logger

# Configure Stripe
stripe.api_key = settings.stripe_secret_key

logger = logging.getLogger(__name__)
financial_audit_logger = get_audit_logger()

class PaymentService:
    @staticmethod
    def create_payment_intent(
        amount: float, 
        booking_id: int, 
        db: Session, 
        gift_certificate_code: Optional[str] = None,
        user_id: Optional[int] = None
    ):
        """Create a Stripe payment intent for a booking with optional gift certificate"""
        try:
            # Validate payment amount
            if not PaymentSecurity.validate_payment_amount(amount):
                raise ValueError("Invalid payment amount")
            
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
                audit_logger.log_security_violation(
                    user_id, "unauthorized_payment_attempt", 
                    f"User {user_id} tried to pay for appointment {booking_id} belonging to user {appointment.user_id}"
                )
                raise ValueError("Not authorized to pay for this appointment")
            
            # Get barber commission rate using unified framework
            barber = None
            commission_rate = 0.20  # Default 20%
            platform_fee = Decimal('0.00')
            barber_amount = Decimal('0.00')
            
            if appointment.barber_id:
                barber = db.query(User).filter(User.id == appointment.barber_id).first()
                if barber:
                    commission_rate = barber.commission_rate
            
            # Handle gift certificate if provided
            gift_cert = None
            gift_cert_amount_used = 0
            final_amount = amount
            
            if gift_certificate_code:
                # Validate gift certificate code format
                if not PaymentSecurity.validate_gift_certificate_code(gift_certificate_code):
                    raise ValueError("Invalid gift certificate code format")
                
                gift_cert = PaymentService.validate_gift_certificate(gift_certificate_code, db)
                if not gift_cert:
                    raise ValueError("Invalid or expired gift certificate")
                
                gift_cert_amount_used = min(gift_cert.balance, amount)
                final_amount = max(0, amount - gift_cert_amount_used)
            
            # Calculate commission splits using unified framework if barber is assigned
            if appointment.barber_id and final_amount > 0:
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
                    # Fallback to traditional calculation if unified framework is not available
                    platform_fee = final_amount * commission_rate
                    barber_amount = final_amount - platform_fee
            else:
                # Traditional calculation for cases without barber or zero amount
                platform_fee = final_amount * commission_rate
                barber_amount = final_amount - platform_fee
            
            # Only create Stripe payment intent if there's remaining amount to charge
            stripe_intent_id = None
            client_secret = None
            
            if final_amount > 0:
                # Create payment intent in Stripe
                intent = stripe.PaymentIntent.create(
                    amount=int(final_amount * 100),  # Convert to cents
                    currency='usd',
                    metadata={
                        'booking_id': str(booking_id),
                        'original_amount': str(amount),
                        'gift_cert_used': str(gift_cert_amount_used)
                    }
                )
                stripe_intent_id = intent.id
                client_secret = intent.client_secret
            
            # Create payment record in database
            payment = Payment(
                user_id=appointment.user_id,
                appointment_id=booking_id,
                barber_id=appointment.barber_id,
                amount=amount,
                status="pending",
                stripe_payment_intent_id=stripe_intent_id,
                platform_fee=platform_fee,
                barber_amount=barber_amount,
                commission_rate=commission_rate,
                gift_certificate_id=gift_cert.id if gift_cert else None,
                gift_certificate_amount_used=gift_cert_amount_used
            )
            db.add(payment)
            db.commit()
            db.refresh(payment)
            
            # Log order creation for payment intent
            financial_audit_logger.log_order_creation(
                user_id=str(appointment.user_id),
                order_id=f"appointment_{booking_id}",
                order_type="service_booking",
                total_amount=float(amount),
                items_count=1,
                payment_method="stripe" if final_amount > 0 else "gift_certificate",
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
                    "stripe_intent_id": stripe_intent_id
                }
            )
            
            # Legacy audit logging for compatibility
            audit_logger.log_payment_intent_created(
                appointment.user_id, amount, appointment.id
            )
            
            if gift_cert_amount_used > 0:
                audit_logger.log_gift_certificate_used(
                    payment.id, gift_certificate_code, gift_cert_amount_used
                )
            
            return {
                "client_secret": client_secret,
                "payment_intent_id": stripe_intent_id,
                "amount": final_amount,
                "original_amount": amount,
                "gift_certificate_used": gift_cert_amount_used,
                "payment_id": payment.id
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payment intent: {str(e)}")
            raise Exception(f"Payment processing error: {str(e)}")
        except Exception as e:
            logger.error(f"Error creating payment intent: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def confirm_payment(payment_intent_id: Optional[str], booking_id: int, db: Session):
        """Confirm payment and update booking status"""
        try:
            # Get payment record
            payment = db.query(Payment).filter(
                Payment.appointment_id == booking_id
            ).first()
            
            if not payment:
                raise ValueError("Payment record not found")
            
            # If there was a Stripe payment intent, verify it
            if payment_intent_id and payment.stripe_payment_intent_id:
                # Retrieve payment intent from Stripe
                intent = stripe.PaymentIntent.retrieve(payment_intent_id)
                
                # Check if payment was successful
                if intent.status != 'succeeded':
                    raise ValueError(f"Payment not successful. Status: {intent.status}")
                
                payment.stripe_payment_id = intent.id
            
            # Update payment status
            payment.status = "completed"
            
            # Update gift certificate balance if used
            if payment.gift_certificate_id and payment.gift_certificate_amount_used > 0:
                gift_cert = db.query(GiftCertificate).filter(
                    GiftCertificate.id == payment.gift_certificate_id
                ).first()
                if gift_cert:
                    gift_cert.balance -= payment.gift_certificate_amount_used
                    if gift_cert.balance <= 0:
                        gift_cert.status = "used"
                        gift_cert.used_at = datetime.utcnow()
            
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
                "payment_id": payment.id,
                "amount_charged": payment.amount - payment.gift_certificate_amount_used,
                "gift_certificate_used": payment.gift_certificate_amount_used
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error confirming payment: {str(e)}")
            raise Exception(f"Payment confirmation error: {str(e)}")
        except Exception as e:
            logger.error(f"Error confirming payment: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def process_refund(
        payment_id: int, 
        amount: float, 
        reason: str, 
        initiated_by_id: int, 
        db: Session
    ):
        """Process a refund for a payment"""
        try:
            # Validate refund amount
            if not PaymentSecurity.validate_payment_amount(amount):
                raise ValueError("Invalid refund amount")
            
            # Get the payment record
            payment = db.query(Payment).filter(Payment.id == payment_id).first()
            if not payment:
                raise ValueError("Payment not found")
            
            # Validate refund eligibility
            eligibility = PaymentSecurity.validate_refund_eligibility(payment, amount)
            if not eligibility["eligible"]:
                raise ValueError(eligibility["reason"])
            
            # Create refund record
            refund = Refund(
                payment_id=payment_id,
                amount=amount,
                reason=reason,
                status="pending",
                initiated_by_id=initiated_by_id
            )
            db.add(refund)
            db.flush()  # Get the ID
            
            # Process refund in Stripe if there was a Stripe payment
            stripe_refund_id = None
            if payment.stripe_payment_intent_id:
                stripe_refund = stripe.Refund.create(
                    payment_intent=payment.stripe_payment_intent_id,
                    amount=int(amount * 100),  # Convert to cents
                    metadata={
                        'refund_id': str(refund.id),
                        'reason': reason
                    }
                )
                stripe_refund_id = stripe_refund.id
            
            # Update refund record
            refund.stripe_refund_id = stripe_refund_id
            refund.status = "completed"
            refund.processed_at = datetime.utcnow()
            
            # Update payment refund tracking
            payment.refund_amount += amount
            if payment.refund_amount >= payment.amount:
                payment.status = "refunded"
            else:
                payment.status = "partially_refunded"
            
            payment.refund_reason = reason
            payment.refunded_at = datetime.utcnow()
            
            # Update appointment status
            appointment = payment.appointment
            if appointment and payment.status == "refunded":
                appointment.status = "cancelled"
            
            db.commit()
            
            # Log financial adjustment for refund
            financial_audit_logger.log_financial_adjustment(
                admin_user_id=str(initiated_by_id),
                target_user_id=str(payment.user_id),
                adjustment_type="refund",
                amount=float(amount),
                reason=reason,
                reference_id=f"payment_{payment_id}",
                before_balance=None,  # Would need to track user balances
                after_balance=None,
                success=True,
                details={
                    "refund_id": refund.id,
                    "payment_id": payment_id,
                    "stripe_refund_id": stripe_refund_id,
                    "original_payment_amount": float(payment.amount),
                    "refund_amount": float(amount),
                    "appointment_id": payment.appointment_id,
                    "barber_id": payment.barber_id
                }
            )
            
            # Legacy audit logging for compatibility
            audit_logger.log_refund_processed(
                initiated_by_id, payment_id, amount, reason
            )
            
            return {
                "refund_id": refund.id,
                "amount": amount,
                "status": "completed",
                "stripe_refund_id": stripe_refund_id
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error processing refund: {str(e)}")
            db.rollback()
            raise Exception(f"Refund processing error: {str(e)}")
        except Exception as e:
            logger.error(f"Error processing refund: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def create_gift_certificate(
        amount: float,
        purchaser_name: str,
        purchaser_email: str,
        recipient_name: Optional[str] = None,
        recipient_email: Optional[str] = None,
        message: Optional[str] = None,
        validity_months: int = 12,
        created_by_id: Optional[int] = None,
        db: Session = None
    ):
        """Create a new gift certificate"""
        try:
            # Generate unique code
            code = PaymentService._generate_gift_certificate_code()
            
            # Set validity period
            valid_from = datetime.utcnow()
            valid_until = valid_from + timedelta(days=validity_months * 30)
            
            # Create gift certificate
            gift_cert = GiftCertificate(
                code=code,
                amount=amount,
                balance=amount,
                status="active",
                purchaser_name=purchaser_name,
                purchaser_email=purchaser_email,
                recipient_name=recipient_name,
                recipient_email=recipient_email,
                message=message,
                valid_from=valid_from,
                valid_until=valid_until,
                created_by_id=created_by_id
            )
            
            db.add(gift_cert)
            db.commit()
            db.refresh(gift_cert)
            
            # Log gift certificate creation
            audit_logger.log_gift_certificate_created(
                created_by_id, amount, gift_cert.code
            )
            
            return {
                "id": gift_cert.id,
                "code": gift_cert.code,
                "amount": gift_cert.amount,
                "balance": gift_cert.balance,
                "valid_until": gift_cert.valid_until.isoformat(),
                "status": gift_cert.status
            }
            
        except Exception as e:
            logger.error(f"Error creating gift certificate: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def validate_gift_certificate(code: str, db: Session) -> Optional[GiftCertificate]:
        """Validate and return gift certificate if valid"""
        try:
            gift_cert = db.query(GiftCertificate).filter(
                GiftCertificate.code == code.upper()
            ).first()
            
            if not gift_cert:
                return None
            
            if not gift_cert.is_valid():
                return None
            
            return gift_cert
            
        except Exception as e:
            logger.error(f"Error validating gift certificate: {str(e)}")
            return None
    
    @staticmethod
    def get_payment_history(
        user_id: Optional[int] = None,
        barber_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
        db: Session = None
    ):
        """Get payment history with filtering and pagination"""
        try:
            query = db.query(Payment)
            
            # Apply filters
            if user_id:
                query = query.filter(Payment.user_id == user_id)
            if barber_id:
                query = query.filter(Payment.barber_id == barber_id)
            if start_date:
                query = query.filter(Payment.created_at >= start_date)
            if end_date:
                query = query.filter(Payment.created_at <= end_date)
            if status:
                query = query.filter(Payment.status == status)
            
            # Get total count
            total = query.count()
            
            # Apply pagination
            offset = (page - 1) * page_size
            payments = query.order_by(Payment.created_at.desc()).offset(offset).limit(page_size).all()
            
            return {
                "payments": payments,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size
            }
            
        except Exception as e:
            logger.error(f"Error getting payment history: {str(e)}")
            raise
    
    @staticmethod
    def get_payment_reports(
        start_date: datetime,
        end_date: datetime,
        barber_id: Optional[int] = None,
        db: Session = None
    ):
        """Generate comprehensive payment reports"""
        try:
            query = db.query(Payment).filter(
                Payment.created_at >= start_date,
                Payment.created_at <= end_date,
                Payment.status.in_(["completed", "refunded", "partially_refunded"])
            )
            
            if barber_id:
                query = query.filter(Payment.barber_id == barber_id)
            
            payments = query.all()
            
            # Calculate totals
            total_revenue = sum(p.amount for p in payments)
            total_refunds = sum(p.refund_amount for p in payments)
            net_revenue = total_revenue - total_refunds
            total_platform_fees = sum(p.platform_fee for p in payments)
            total_barber_earnings = sum(p.barber_amount for p in payments)
            gift_cert_usage = sum(p.gift_certificate_amount_used for p in payments)
            
            # Count transactions
            completed_payments = len([p for p in payments if p.status == "completed"])
            refunded_payments = len([p for p in payments if p.status in ["refunded", "partially_refunded"]])
            
            # Average transaction values
            avg_transaction = total_revenue / len(payments) if payments else 0
            avg_refund = total_refunds / refunded_payments if refunded_payments else 0
            
            # Payment method breakdown
            stripe_payments = len([p for p in payments if p.stripe_payment_intent_id])
            gift_cert_only = len([p for p in payments if not p.stripe_payment_intent_id and p.gift_certificate_amount_used > 0])
            
            return {
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "revenue": {
                    "total_revenue": total_revenue,
                    "total_refunds": total_refunds,
                    "net_revenue": net_revenue,
                    "gift_certificate_usage": gift_cert_usage
                },
                "commissions": {
                    "total_platform_fees": total_platform_fees,
                    "total_barber_earnings": total_barber_earnings
                },
                "transactions": {
                    "total_payments": len(payments),
                    "completed_payments": completed_payments,
                    "refunded_payments": refunded_payments,
                    "stripe_payments": stripe_payments,
                    "gift_certificate_only": gift_cert_only
                },
                "averages": {
                    "avg_transaction_value": avg_transaction,
                    "avg_refund_amount": avg_refund
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating payment reports: {str(e)}")
            raise
    
    @staticmethod
    def process_barber_payout(
        barber_id: int,
        start_date: datetime,
        end_date: datetime,
        db: Session,
        include_retail: bool = False
    ):
        """Process payout for a barber for a specific period with optional retail commissions"""
        try:
            # Get barber
            barber = db.query(User).filter(User.id == barber_id, User.role == "barber").first()
            if not barber:
                raise ValueError(f"Barber {barber_id} not found")
            
            # Calculate service payments (existing logic)
            service_payments = db.query(Payment).filter(
                Payment.barber_id == barber_id,
                Payment.status == "completed",
                Payment.created_at >= start_date,
                Payment.created_at <= end_date
            ).all()
            
            service_amount = sum(p.barber_amount or 0 for p in service_payments)
            
            # Calculate retail commissions if enabled
            retail_amount = 0
            retail_breakdown = None
            order_item_ids = []
            pos_transaction_ids = []
            
            if include_retail:
                try:
                    from services.commission_service import CommissionService
                    commission_service = CommissionService(db)
                    retail_breakdown = commission_service.get_barber_retail_commissions(
                        barber_id, start_date, end_date, unpaid_only=True
                    )
                    retail_amount = float(retail_breakdown["total_retail_commission"])
                    
                    # Get IDs for marking as paid later
                    order_item_ids = [item["id"] for item in retail_breakdown["order_items"]]
                    pos_transaction_ids = [trans["id"] for trans in retail_breakdown["pos_transactions"]]
                except ImportError:
                    # Commission service not available, continue with service payments only
                    logger.warning("CommissionService not available, processing service payments only")
                    include_retail = False
            
            total_amount = service_amount + retail_amount
            
            if total_amount <= 0:
                if include_retail:
                    raise ValueError("No payments or commissions found for the specified period")
                else:
                    raise ValueError("No payments found for the specified period")
            
            # Validate payout eligibility
            eligibility = PaymentSecurity.validate_payout_eligibility(barber, total_amount)
            if not eligibility["eligible"]:
                raise ValueError(eligibility["reason"])
            
            # Create payout record
            payout = Payout(
                barber_id=barber_id,
                amount=total_amount,
                status="pending",
                period_start=start_date,
                period_end=end_date,
                payment_count=len(service_payments)
            )
            db.add(payout)
            db.flush()
            
            # Create Stripe transfer metadata
            metadata = {
                "payout_id": str(payout.id),
                "barber_id": str(barber_id),
                "period_start": start_date.isoformat(),
                "period_end": end_date.isoformat()
            }
            
            # Add retail-specific metadata if applicable
            if include_retail:
                metadata.update({
                    "service_amount": str(service_amount),
                    "retail_amount": str(retail_amount),
                    "includes_retail": "true"
                })
            
            # Create Stripe transfer
            transfer = stripe.Transfer.create(
                amount=int(total_amount * 100),  # Convert to cents
                currency="usd",
                destination=barber.stripe_account_id,
                metadata=metadata
            )
            
            # Update payout record
            payout.stripe_transfer_id = transfer.id
            payout.status = "completed"
            payout.processed_at = datetime.utcnow()
            
            # Mark retail commissions as paid if applicable
            if include_retail and (order_item_ids or pos_transaction_ids):
                try:
                    from services.commission_service import CommissionService
                    commission_service = CommissionService(db)
                    commission_service.mark_retail_commissions_paid(
                        barber_id, payout.id, order_item_ids, pos_transaction_ids
                    )
                except ImportError:
                    logger.warning("Could not mark retail commissions as paid - CommissionService not available")
            
            db.commit()
            
            # Log payout processing with enhanced details
            financial_audit_logger.log_payout_processing(
                user_id=str(barber_id),
                payout_id=str(payout.id),
                amount=float(total_amount),
                currency="USD",
                payment_method="stripe_transfer",
                status="completed",
                processing_fee=0.0,  # Stripe Connect handles fees separately
                success=True,
                details={
                    "stripe_transfer_id": transfer.id,
                    "period_start": start_date.isoformat(),
                    "period_end": end_date.isoformat(),
                    "service_payments_count": len(service_payments),
                    "service_amount": float(service_amount),
                    "retail_amount": float(retail_amount) if include_retail else 0,
                    "includes_retail": include_retail,
                    "barber_name": barber.name,
                    "barber_email": barber.email
                }
            )
            
            # Legacy audit logging for compatibility
            audit_logger.log_payout_processed(
                barber_id, total_amount, len(service_payments)
            )
            
            # Log enhanced payout details if retail was included
            if include_retail:
                logger.info(f"Enhanced payout processed: Barber {barber_id}, Service: ${service_amount}, Retail: ${retail_amount}, Total: ${total_amount}")
            
            # Build response
            response = {
                "payout_id": payout.id,
                "amount": total_amount,
                "payment_count": len(service_payments),
                "stripe_transfer_id": transfer.id,
                "status": "completed"
            }
            
            # Add retail-specific response fields if applicable
            if include_retail:
                response.update({
                    "total_amount": total_amount,
                    "service_amount": service_amount,
                    "retail_amount": retail_amount,
                    "service_payment_count": len(service_payments),
                    "retail_items_count": len(order_item_ids) + len(pos_transaction_ids),
                    "retail_breakdown": retail_breakdown
                })
            
            return response
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error processing payout: {str(e)}")
            
            # Log failed payout attempt
            financial_audit_logger.log_payout_processing(
                user_id=str(barber_id),
                payout_id=f"failed_{barber_id}_{datetime.utcnow().timestamp()}",
                amount=float(total_amount),
                currency="USD",
                payment_method="stripe_transfer",
                status="failed",
                processing_fee=0.0,
                success=False,
                details={
                    "error_type": "stripe_error",
                    "error_message": str(e),
                    "period_start": start_date.isoformat(),
                    "period_end": end_date.isoformat(),
                    "service_payments_count": len(service_payments),
                    "includes_retail": include_retail
                }
            )
            
            db.rollback()
            raise Exception(f"Payout processing error: {str(e)}")
        except Exception as e:
            logger.error(f"Error processing payout: {str(e)}")
            
            # Log general payout failure
            financial_audit_logger.log_payout_processing(
                user_id=str(barber_id),
                payout_id=f"failed_{barber_id}_{datetime.utcnow().timestamp()}",
                amount=float(total_amount),
                currency="USD",
                payment_method="stripe_transfer",
                status="error",
                processing_fee=0.0,
                success=False,
                details={
                    "error_type": "general_error",
                    "error_message": str(e),
                    "period_start": start_date.isoformat(),
                    "period_end": end_date.isoformat(),
                    "service_payments_count": len(service_payments),
                    "includes_retail": include_retail
                }
            )
            
            db.rollback()
            raise
    
    @staticmethod
    def create_stripe_connect_account(user: User, db: Session):
        """Create a Stripe Connect Express account for a barber"""
        try:
            if user.role != "barber":
                raise ValueError("Only barbers can create Stripe Connect accounts")
                
            if user.stripe_account_id:
                raise ValueError("User already has a Stripe Connect account")
            
            # Create Stripe Express account
            account = stripe.Account.create(
                type='express',
                country='US',  # You might want to make this configurable
                email=user.email,
                capabilities={
                    'card_payments': {'requested': True},
                    'transfers': {'requested': True},
                },
            )
            
            # Store account ID in database
            user.stripe_account_id = account.id
            user.stripe_account_status = 'pending'
            db.commit()
            
            # Create account link for onboarding
            account_link = stripe.AccountLink.create(
                account=account.id,
                refresh_url=f"{settings.allowed_origins}/dashboard?stripe_refresh=true",
                return_url=f"{settings.allowed_origins}/dashboard?stripe_complete=true",
                type='account_onboarding',
            )
            
            return {
                "account_id": account.id,
                "onboarding_url": account_link.url,
                "message": "Complete your Stripe Connect onboarding to receive payouts"
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating account: {str(e)}")
            db.rollback()
            raise Exception(f"Error creating Stripe account: {str(e)}")
        except Exception as e:
            logger.error(f"Error creating Stripe Connect account: {str(e)}")
            db.rollback()
            raise

    @staticmethod
    def get_stripe_connect_status(user: User):
        """Get Stripe Connect account status for a barber"""
        try:
            if not user.stripe_account_id:
                return {
                    "connected": False,
                    "account_id": None,
                    "account_status": None,
                    "payouts_enabled": False,
                    "details_submitted": False,
                    "charges_enabled": False,
                    "onboarding_url": None
                }
            
            # Get account details from Stripe
            account = stripe.Account.retrieve(user.stripe_account_id)
            
            # Update local status
            if account.details_submitted:
                user.stripe_account_status = 'active' if account.payouts_enabled else 'restricted'
            
            # Generate new onboarding link if needed
            onboarding_url = None
            if not account.details_submitted:
                account_link = stripe.AccountLink.create(
                    account=user.stripe_account_id,
                    refresh_url=f"{settings.allowed_origins}/dashboard?stripe_refresh=true",
                    return_url=f"{settings.allowed_origins}/dashboard?stripe_complete=true",
                    type='account_onboarding',
                )
                onboarding_url = account_link.url
            
            return {
                "connected": True,
                "account_id": user.stripe_account_id,
                "account_status": user.stripe_account_status,
                "payouts_enabled": account.payouts_enabled,
                "details_submitted": account.details_submitted,
                "charges_enabled": account.charges_enabled,
                "onboarding_url": onboarding_url
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error getting account status: {str(e)}")
            return {
                "connected": False,
                "account_id": user.stripe_account_id,
                "account_status": "error",
                "payouts_enabled": False,
                "details_submitted": False,
                "charges_enabled": False,
                "onboarding_url": None,
                "error": str(e)
            }


    @staticmethod
    def _generate_gift_certificate_code(length: int = 12) -> str:
        """Generate a unique gift certificate code"""
        characters = string.ascii_uppercase + string.digits
        # Remove confusing characters
        characters = characters.replace('O', '').replace('0', '').replace('I', '').replace('1', '')
        return ''.join(secrets.choice(characters) for _ in range(length))