"""Gift Certificate service for handling all gift certificate operations."""

import stripe
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from decimal import Decimal
import secrets

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_

from config.settings import get_settings
from models.gift_certificate import (
    GiftCertificate,
    GiftCertificateRedemption,
    GiftCertificateStatus,
)
from models.user import User
from models.appointment import Appointment
from models.payment import Payment, PaymentStatus
from services.stripe_service import StripeService
from services.email_service import EmailService

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class GiftCertificateService:
    """Service for handling gift certificate operations."""

    def __init__(self, db: Session):
        self.db = db
        self.stripe_service = StripeService(db)
        self.email_service = EmailService()

    async def create_gift_certificate(
        self,
        sender_name: str,
        sender_email: str,
        recipient_name: str,
        recipient_email: str,
        amount: int,  # Amount in cents
        message: Optional[str] = None,
        sender_user: Optional[User] = None,
        expiry_months: int = 12,
    ) -> GiftCertificate:
        """Create a new gift certificate."""
        try:
            # Generate unique code
            code = self._generate_unique_code()

            # Calculate expiry date
            expiry_date = datetime.utcnow() + timedelta(days=30 * expiry_months)

            # Create gift certificate
            gift_certificate = GiftCertificate(
                code=code,
                original_amount=amount,
                remaining_balance=amount,
                sender_name=sender_name,
                sender_email=sender_email,
                sender_user_id=sender_user.id if sender_user else None,
                recipient_name=recipient_name,
                recipient_email=recipient_email,
                message=message,
                expiry_date=expiry_date,
                status=GiftCertificateStatus.ACTIVE,
            )

            self.db.add(gift_certificate)
            self.db.flush()  # Get the ID without committing

            logger.info(f"Created gift certificate {code} for {amount/100:.2f}")
            return gift_certificate

        except Exception as e:
            logger.error(f"Error creating gift certificate: {str(e)}")
            raise

    async def purchase_gift_certificate(
        self,
        sender_name: str,
        sender_email: str,
        recipient_name: str,
        recipient_email: str,
        amount: int,  # Amount in cents
        payment_method_id: str,
        message: Optional[str] = None,
        sender_user: Optional[User] = None,
    ) -> Tuple[GiftCertificate, Payment]:
        """Purchase a gift certificate with Stripe payment."""
        try:
            # Create gift certificate first (not committed yet)
            gift_certificate = await self.create_gift_certificate(
                sender_name=sender_name,
                sender_email=sender_email,
                recipient_name=recipient_name,
                recipient_email=recipient_email,
                amount=amount,
                message=message,
                sender_user=sender_user,
            )

            # Create payment intent for gift certificate purchase
            customer_id = None
            if sender_user:
                customer_id = await self.stripe_service.create_or_get_customer(
                    sender_user
                )

            # Create payment intent
            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency="usd",
                payment_method=payment_method_id,
                customer=customer_id,
                confirm=True,
                metadata={
                    "type": "gift_certificate",
                    "gift_certificate_code": gift_certificate.code,
                    "sender_email": sender_email,
                    "recipient_email": recipient_email,
                },
                description=f"Gift certificate purchase - {gift_certificate.code}",
            )

            # Update gift certificate with payment info
            gift_certificate.stripe_payment_intent_id = intent.id
            if intent.charges and intent.charges.data:
                gift_certificate.stripe_charge_id = intent.charges.data[0].id

            # Create payment record (for consistency with other payments)
            payment = Payment(
                user_id=sender_user.id if sender_user else None,
                appointment_id=None,  # No appointment for gift certificate purchase
                stripe_payment_intent_id=intent.id,
                stripe_charge_id=gift_certificate.stripe_charge_id,
                amount=amount,
                currency="USD",
                status=(
                    PaymentStatus.SUCCEEDED
                    if intent.status == "succeeded"
                    else PaymentStatus.PENDING
                ),
                description=f"Gift certificate purchase - {gift_certificate.code}",
                meta_data={
                    "gift_certificate_id": gift_certificate.id,
                    "gift_certificate_code": gift_certificate.code,
                },
            )

            self.db.add(payment)
            self.db.commit()

            # Send emails asynchronously
            await self._send_purchase_confirmation(gift_certificate)
            await self._send_gift_certificate_to_recipient(gift_certificate)

            logger.info(
                f"Successfully purchased gift certificate {gift_certificate.code}"
            )
            return gift_certificate, payment

        except stripe.error.StripeError as e:
            self.db.rollback()
            logger.error(f"Stripe error purchasing gift certificate: {str(e)}")
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error purchasing gift certificate: {str(e)}")
            raise

    async def validate_gift_certificate(
        self, code: str, amount_to_use: Optional[int] = None
    ) -> Dict[str, Any]:
        """Validate a gift certificate code."""
        try:
            # Clean the code (remove spaces and dashes if any)
            clean_code = code.upper().replace(" ", "").replace("-", "")

            # Find gift certificate
            gift_certificate = (
                self.db.query(GiftCertificate)
                .filter(GiftCertificate.code == clean_code)
                .first()
            )

            if not gift_certificate:
                return {"valid": False, "error": "Invalid gift certificate code"}

            # Check if expired
            if gift_certificate.is_expired:
                return {
                    "valid": False,
                    "error": "Gift certificate has expired",
                    "expiry_date": gift_certificate.expiry_date.isoformat(),
                }

            # Check if cancelled
            if gift_certificate.status == GiftCertificateStatus.CANCELLED:
                return {"valid": False, "error": "Gift certificate has been cancelled"}

            # Check if fully used
            if gift_certificate.remaining_balance <= 0:
                return {"valid": False, "error": "Gift certificate has been fully used"}

            # Check if inactive
            if not gift_certificate.is_active:
                return {"valid": False, "error": "Gift certificate is inactive"}

            # Check amount if specified
            if amount_to_use and amount_to_use > gift_certificate.remaining_balance:
                return {
                    "valid": False,
                    "error": "Insufficient balance",
                    "remaining_balance": gift_certificate.remaining_balance,
                    "requested_amount": amount_to_use,
                }

            # Gift certificate is valid
            return {
                "valid": True,
                "gift_certificate_id": gift_certificate.id,
                "code": gift_certificate.code,
                "original_amount": gift_certificate.original_amount,
                "remaining_balance": gift_certificate.remaining_balance,
                "expiry_date": gift_certificate.expiry_date.isoformat(),
                "sender_name": gift_certificate.sender_name,
                "recipient_name": gift_certificate.recipient_name,
            }

        except Exception as e:
            logger.error(f"Error validating gift certificate: {str(e)}")
            return {"valid": False, "error": "Error validating gift certificate"}

    async def redeem_gift_certificate(
        self,
        code: str,
        appointment_id: int,
        amount_to_use: int,  # Amount in cents
        user: User,
    ) -> GiftCertificateRedemption:
        """Redeem a gift certificate for an appointment."""
        try:
            # Validate the gift certificate first
            validation = await self.validate_gift_certificate(code, amount_to_use)
            if not validation["valid"]:
                raise ValueError(validation["error"])

            # Get the gift certificate
            gift_certificate = self.db.query(GiftCertificate).get(
                validation["gift_certificate_id"]
            )

            # Get the appointment
            appointment = self.db.query(Appointment).get(appointment_id)
            if not appointment:
                raise ValueError("Appointment not found")

            # Create redemption record
            redemption = GiftCertificateRedemption(
                gift_certificate_id=gift_certificate.id,
                appointment_id=appointment_id,
                amount_used=amount_to_use,
                balance_before=gift_certificate.remaining_balance,
                balance_after=gift_certificate.remaining_balance - amount_to_use,
                redeemed_by_id=user.id,
            )

            # Update gift certificate balance
            gift_certificate.remaining_balance -= amount_to_use

            # Update status based on remaining balance
            if gift_certificate.remaining_balance == 0:
                gift_certificate.status = GiftCertificateStatus.FULLY_USED
                gift_certificate.used_date = datetime.utcnow()
            else:
                gift_certificate.status = GiftCertificateStatus.PARTIALLY_USED

            # If this is the first redemption by the recipient, link the user
            if (
                not gift_certificate.recipient_user_id
                and user.email == gift_certificate.recipient_email
            ):
                gift_certificate.recipient_user_id = user.id

            self.db.add(redemption)
            self.db.commit()

            # Send notification email
            await self._send_redemption_notification(gift_certificate, redemption)

            logger.info(
                f"Redeemed {amount_to_use/100:.2f} from gift certificate {code}"
            )
            return redemption

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error redeeming gift certificate: {str(e)}")
            raise

    async def get_user_gift_certificates(
        self,
        user: User,
        include_sent: bool = True,
        include_received: bool = True,
        active_only: bool = False,
    ) -> List[GiftCertificate]:
        """Get all gift certificates for a user."""
        try:
            conditions = []

            if include_sent and include_received:
                conditions.append(
                    or_(
                        GiftCertificate.sender_user_id == user.id,
                        GiftCertificate.recipient_user_id == user.id,
                        GiftCertificate.recipient_email == user.email,
                    )
                )
            elif include_sent:
                conditions.append(GiftCertificate.sender_user_id == user.id)
            elif include_received:
                conditions.append(
                    or_(
                        GiftCertificate.recipient_user_id == user.id,
                        GiftCertificate.recipient_email == user.email,
                    )
                )

            if active_only:
                conditions.append(GiftCertificate.is_active == True)
                conditions.append(
                    GiftCertificate.status.in_(
                        [
                            GiftCertificateStatus.ACTIVE,
                            GiftCertificateStatus.PARTIALLY_USED,
                        ]
                    )
                )
                conditions.append(GiftCertificate.expiry_date > datetime.utcnow())

            query = self.db.query(GiftCertificate)
            if conditions:
                query = query.filter(and_(*conditions))

            return query.order_by(GiftCertificate.created_at.desc()).all()

        except Exception as e:
            logger.error(f"Error getting user gift certificates: {str(e)}")
            raise

    async def cancel_gift_certificate(
        self, gift_certificate_id: int, admin_user: User, reason: str
    ) -> GiftCertificate:
        """Cancel a gift certificate (admin only)."""
        try:
            gift_certificate = self.db.query(GiftCertificate).get(gift_certificate_id)
            if not gift_certificate:
                raise ValueError("Gift certificate not found")

            if gift_certificate.status == GiftCertificateStatus.CANCELLED:
                raise ValueError("Gift certificate is already cancelled")

            if gift_certificate.status == GiftCertificateStatus.FULLY_USED:
                raise ValueError("Cannot cancel a fully used gift certificate")

            # Update status
            gift_certificate.status = GiftCertificateStatus.CANCELLED
            gift_certificate.is_active = False
            gift_certificate.meta_data = gift_certificate.meta_data or {}
            gift_certificate.meta_data["cancelled_by"] = admin_user.id
            gift_certificate.meta_data["cancelled_at"] = datetime.utcnow().isoformat()
            gift_certificate.meta_data["cancellation_reason"] = reason

            self.db.commit()

            # Send notification emails
            await self._send_cancellation_notification(gift_certificate)

            logger.info(f"Cancelled gift certificate {gift_certificate.code}")
            return gift_certificate

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error cancelling gift certificate: {str(e)}")
            raise

    def _generate_unique_code(self) -> str:
        """Generate a unique gift certificate code."""
        max_attempts = 10
        for _ in range(max_attempts):
            code = GiftCertificate.generate_unique_code()

            # Check if code already exists
            existing = (
                self.db.query(GiftCertificate)
                .filter(GiftCertificate.code == code)
                .first()
            )

            if not existing:
                return code

        raise ValueError("Failed to generate unique gift certificate code")

    async def _send_purchase_confirmation(self, gift_certificate: GiftCertificate):
        """Send purchase confirmation email to sender."""
        try:
            await self.email_service.send_email(
                to_email=gift_certificate.sender_email,
                subject="Gift Certificate Purchase Confirmation",
                template_name="gift_certificate_purchase",
                context={
                    "sender_name": gift_certificate.sender_name,
                    "recipient_name": gift_certificate.recipient_name,
                    "amount": gift_certificate.original_amount_decimal,
                    "code": gift_certificate.code,
                    "expiry_date": gift_certificate.expiry_date.strftime("%B %d, %Y"),
                    "message": gift_certificate.message,
                },
            )
        except Exception as e:
            logger.error(f"Error sending purchase confirmation: {str(e)}")

    async def _send_gift_certificate_to_recipient(
        self, gift_certificate: GiftCertificate
    ):
        """Send gift certificate to recipient."""
        try:
            await self.email_service.send_email(
                to_email=gift_certificate.recipient_email,
                subject=f"You've received a gift certificate from {gift_certificate.sender_name}!",
                template_name="gift_certificate_recipient",
                context={
                    "recipient_name": gift_certificate.recipient_name,
                    "sender_name": gift_certificate.sender_name,
                    "amount": gift_certificate.original_amount_decimal,
                    "code": gift_certificate.code,
                    "expiry_date": gift_certificate.expiry_date.strftime("%B %d, %Y"),
                    "message": gift_certificate.message,
                    "redemption_url": f"{settings.FRONTEND_URL}/redeem-gift-certificate?code={gift_certificate.code}",
                },
            )
        except Exception as e:
            logger.error(f"Error sending gift certificate to recipient: {str(e)}")

    async def _send_redemption_notification(
        self, gift_certificate: GiftCertificate, redemption: GiftCertificateRedemption
    ):
        """Send redemption notification to sender."""
        try:
            await self.email_service.send_email(
                to_email=gift_certificate.sender_email,
                subject="Your gift certificate has been redeemed",
                template_name="gift_certificate_redemption",
                context={
                    "sender_name": gift_certificate.sender_name,
                    "recipient_name": gift_certificate.recipient_name,
                    "amount_used": Decimal(redemption.amount_used) / 100,
                    "remaining_balance": Decimal(gift_certificate.remaining_balance)
                    / 100,
                    "code": gift_certificate.code,
                },
            )
        except Exception as e:
            logger.error(f"Error sending redemption notification: {str(e)}")

    async def _send_cancellation_notification(self, gift_certificate: GiftCertificate):
        """Send cancellation notification emails."""
        try:
            # Notify sender
            await self.email_service.send_email(
                to_email=gift_certificate.sender_email,
                subject="Gift Certificate Cancelled",
                template_name="gift_certificate_cancellation",
                context={
                    "name": gift_certificate.sender_name,
                    "code": gift_certificate.code,
                    "amount": gift_certificate.original_amount_decimal,
                },
            )

            # Notify recipient if they had received it
            if gift_certificate.remaining_balance < gift_certificate.original_amount:
                await self.email_service.send_email(
                    to_email=gift_certificate.recipient_email,
                    subject="Gift Certificate Cancelled",
                    template_name="gift_certificate_cancellation",
                    context={
                        "name": gift_certificate.recipient_name,
                        "code": gift_certificate.code,
                        "amount": gift_certificate.original_amount_decimal,
                    },
                )
        except Exception as e:
            logger.error(f"Error sending cancellation notifications: {str(e)}")
