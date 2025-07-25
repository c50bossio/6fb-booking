"""
Comprehensive tests for the payment service module.

This test suite covers payment intent creation, confirmation, refunds,
gift certificate handling, and security validations.
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
import stripe

from sqlalchemy.orm import Session
from services.payment_service import PaymentService
from services.payment_security import PaymentSecurity
from models import Payment, GiftCertificate, Refund, Payout
from tests.factories import (
    UserFactory, AppointmentFactory, PaymentFactory
)


class TestPaymentIntentCreation:
    """Test payment intent creation functionality."""
    
    @patch('services.payment_service.stripe.PaymentIntent.create')
    def test_create_payment_intent_success(self, mock_stripe_create, db: Session):
        """Test successful payment intent creation."""
        # Setup test data
        barber = UserFactory.create_barber(commission_rate=0.25)
        appointment = AppointmentFactory.create_appointment(
            user_id=barber.id,
            barber_id=barber.id,
            price=50.0,
            status="pending"
        )
        db.add_all([barber, appointment])
        db.commit()
        
        # Mock Stripe response
        mock_stripe_create.return_value = MagicMock(
            id="pi_test_123",
            client_secret="pi_test_123_secret",
            amount=5000,
            currency="usd"
        )
        
        # Create payment intent
        result = PaymentService.create_payment_intent(
            amount=50.0,
            booking_id=appointment.id,
            db=db,
            user_id=barber.id
        )
        
        # Verify result
        assert result["payment_intent_id"] == "pi_test_123"
        assert result["client_secret"] == "pi_test_123_secret"
        assert result["amount"] == 50.0
        assert result["original_amount"] == 50.0
        assert result["gift_certificate_used"] == 0
        
        # Verify Stripe was called correctly
        mock_stripe_create.assert_called_once_with(
            amount=5000,  # $50.00 in cents
            currency='usd',
            metadata={
                'booking_id': str(appointment.id),
                'original_amount': '50.0',
                'gift_cert_used': '0'
            }
        )
        
        # Verify payment record created
        payment = db.query(Payment).filter(
            Payment.appointment_id == appointment.id
        ).first()
        assert payment is not None
        assert payment.amount == 50.0
        assert payment.status == "pending"
        assert payment.platform_fee == 12.5  # 25% of $50
        assert payment.barber_amount == 37.5  # $50 - $12.50
        assert payment.commission_rate == 0.25
    
    def test_create_payment_intent_invalid_amount(self, db: Session):
        """Test payment intent creation with invalid amount."""
        appointment = AppointmentFactory.create_appointment()
        db.add(appointment)
        db.commit()
        
        # Test negative amount
        with pytest.raises(ValueError, match="Invalid payment amount"):
            PaymentService.create_payment_intent(
                amount=-10.0,
                booking_id=appointment.id,
                db=db
            )
        
        # Test zero amount without gift certificate
        with pytest.raises(ValueError, match="Invalid payment amount"):
            PaymentService.create_payment_intent(
                amount=0,
                booking_id=appointment.id,
                db=db
            )
    
    def test_create_payment_intent_appointment_not_found(self, db: Session):
        """Test payment intent creation with non-existent appointment."""
        with pytest.raises(ValueError, match="Appointment 9999 not found"):
            PaymentService.create_payment_intent(
                amount=50.0,
                booking_id=9999,
                db=db
            )
    
    @patch('services.payment_service.PaymentSecurity.validate_appointment_payment_eligibility')
    def test_create_payment_intent_ineligible_appointment(
        self, mock_validate, db: Session
    ):
        """Test payment intent creation with ineligible appointment."""
        appointment = AppointmentFactory.create_appointment(status="cancelled")
        db.add(appointment)
        db.commit()
        
        # Mock ineligible appointment
        mock_validate.return_value = {
            "eligible": False,
            "reason": "Appointment is cancelled"
        }
        
        with pytest.raises(ValueError, match="Appointment is cancelled"):
            PaymentService.create_payment_intent(
                amount=50.0,
                booking_id=appointment.id,
                db=db
            )
    
    def test_create_payment_intent_unauthorized_user(self, db: Session):
        """Test payment intent creation by unauthorized user."""
        user1 = UserFactory.create_user()
        user2 = UserFactory.create_user()
        appointment = AppointmentFactory.create_appointment(
            user_id=user1.id,
            status="pending"
        )
        db.add_all([user1, user2, appointment])
        db.commit()
        
        # User2 trying to pay for User1's appointment
        with pytest.raises(ValueError, match="Not authorized to pay for this appointment"):
            PaymentService.create_payment_intent(
                amount=50.0,
                booking_id=appointment.id,
                db=db,
                user_id=user2.id
            )
    
    @patch('services.payment_service.stripe.PaymentIntent.create')
    def test_create_payment_intent_with_gift_certificate(
        self, mock_stripe_create, db: Session
    ):
        """Test payment intent creation with gift certificate."""
        barber = UserFactory.create_barber()
        appointment = AppointmentFactory.create_appointment(
            barber_id=barber.id,
            price=100.0
        )
        
        # Create gift certificate with $30 balance
        gift_cert = GiftCertificate(
            code="GIFT30",
            amount=50.0,
            balance=30.0,
            valid_until=datetime.now(timezone.utc) + timedelta(days=30),
            status="active"
        )
        db.add_all([barber, appointment, gift_cert])
        db.commit()
        
        # Mock Stripe response
        mock_stripe_create.return_value = MagicMock(
            id="pi_test_456",
            client_secret="pi_test_456_secret"
        )
        
        # Mock gift certificate validation
        with patch.object(PaymentService, 'validate_gift_certificate') as mock_validate_gc:
            mock_validate_gc.return_value = gift_cert
            
            result = PaymentService.create_payment_intent(
                amount=100.0,
                booking_id=appointment.id,
                db=db,
                gift_certificate_code="GIFT30"
            )
        
        # Verify result
        assert result["amount"] == 70.0  # $100 - $30 gift cert
        assert result["original_amount"] == 100.0
        assert result["gift_certificate_used"] == 30.0
        
        # Verify Stripe called with reduced amount
        mock_stripe_create.assert_called_once_with(
            amount=7000,  # $70 in cents
            currency='usd',
            metadata={
                'booking_id': str(appointment.id),
                'original_amount': '100.0',
                'gift_cert_used': '30.0'
            }
        )
        
        # Verify payment record
        payment = db.query(Payment).filter(
            Payment.appointment_id == appointment.id
        ).first()
        assert payment.gift_certificate_id == gift_cert.id
        assert payment.gift_certificate_amount_used == 30.0
    
    @patch('services.payment_service.stripe.PaymentIntent.create')
    def test_create_payment_intent_gift_certificate_covers_full_amount(
        self, mock_stripe_create, db: Session
    ):
        """Test payment when gift certificate covers full amount."""
        appointment = AppointmentFactory.create_appointment(price=50.0)
        gift_cert = GiftCertificate(
            code="GIFT100",
            balance=100.0,
            valid_until=datetime.now(timezone.utc) + timedelta(days=30),
            status="active"
        )
        db.add_all([appointment, gift_cert])
        db.commit()
        
        with patch.object(PaymentService, 'validate_gift_certificate') as mock_validate:
            mock_validate.return_value = gift_cert
            
            result = PaymentService.create_payment_intent(
                amount=50.0,
                booking_id=appointment.id,
                db=db,
                gift_certificate_code="GIFT100"
            )
        
        # No Stripe payment intent should be created
        mock_stripe_create.assert_not_called()
        
        # Verify result
        assert result["amount"] == 0
        assert result["gift_certificate_used"] == 50.0
        assert result["payment_intent_id"] is None
        assert result["client_secret"] is None
        
        # Payment record should still be created
        payment = db.query(Payment).first()
        assert payment is not None
        assert payment.status == "pending"
        assert payment.gift_certificate_amount_used == 50.0
    
    @patch('services.payment_service.stripe.PaymentIntent.create')
    def test_create_payment_intent_stripe_error(self, mock_stripe_create, db: Session):
        """Test handling of Stripe API errors."""
        appointment = AppointmentFactory.create_appointment()
        db.add(appointment)
        db.commit()
        
        # Mock Stripe error
        mock_stripe_create.side_effect = stripe.error.StripeError("Connection error")
        
        with pytest.raises(Exception, match="Payment processing error"):
            PaymentService.create_payment_intent(
                amount=50.0,
                booking_id=appointment.id,
                db=db
            )
        
        # Verify no payment record was created
        payment = db.query(Payment).first()
        assert payment is None
    
    def test_create_payment_intent_invalid_gift_certificate_format(self, db: Session):
        """Test payment with invalid gift certificate code format."""
        appointment = AppointmentFactory.create_appointment()
        db.add(appointment)
        db.commit()
        
        # Mock security validation to fail
        with patch.object(
            PaymentSecurity, 
            'validate_gift_certificate_code',
            return_value=False
        ):
            with pytest.raises(ValueError, match="Invalid gift certificate code format"):
                PaymentService.create_payment_intent(
                    amount=50.0,
                    booking_id=appointment.id,
                    db=db,
                    gift_certificate_code="INVALID!@#"
                )
    
    @patch('services.payment_service.stripe.PaymentIntent.create')
    def test_create_payment_intent_commission_calculation(
        self, mock_stripe_create, db: Session
    ):
        """Test correct commission calculation for different rates."""
        # Test with 30% commission rate
        barber = UserFactory.create_barber(commission_rate=0.30)
        appointment = AppointmentFactory.create_appointment(
            barber_id=barber.id,
            price=100.0
        )
        db.add_all([barber, appointment])
        db.commit()
        
        mock_stripe_create.return_value = MagicMock(
            id="pi_test_789",
            client_secret="secret"
        )
        
        result = PaymentService.create_payment_intent(
            amount=100.0,
            booking_id=appointment.id,
            db=db
        )
        
        # Verify commission calculation
        payment = db.query(Payment).first()
        assert payment.commission_rate == 0.30
        assert payment.platform_fee == 30.0  # 30% of $100
        assert payment.barber_amount == 70.0  # $100 - $30


class TestPaymentConfirmation:
    """Test payment confirmation functionality."""
    
    @patch('services.payment_service.stripe.PaymentIntent.retrieve')
    def test_confirm_payment_success(self, mock_stripe_retrieve, db: Session):
        """Test successful payment confirmation."""
        # Create pending payment
        appointment = AppointmentFactory.create_appointment(status="pending")
        payment = PaymentFactory.create_payment(
            appointment_id=appointment.id,
            stripe_payment_intent_id="pi_test_123",
            status="pending"
        )
        db.add_all([appointment, payment])
        db.commit()
        
        # Mock successful Stripe payment
        mock_stripe_retrieve.return_value = MagicMock(
            id="pi_test_123",
            status="succeeded"
        )
        
        result = PaymentService.confirm_payment(
            payment_intent_id="pi_test_123",
            booking_id=appointment.id,
            db=db
        )
        
        # Verify result
        assert result["success"] is True
        assert result["appointment_id"] == appointment.id
        assert result["payment_id"] == payment.id
        
        # Verify payment updated
        db.refresh(payment)
        assert payment.status == "completed"
        assert payment.stripe_payment_id == "pi_test_123"
        
        # Verify appointment confirmed
        db.refresh(appointment)
        assert appointment.status == "confirmed"
    
    def test_confirm_payment_not_found(self, db: Session):
        """Test confirming payment that doesn't exist."""
        with pytest.raises(ValueError, match="Payment record not found"):
            PaymentService.confirm_payment(
                payment_intent_id="pi_test_123",
                booking_id=9999,
                db=db
            )
    
    @patch('services.payment_service.stripe.PaymentIntent.retrieve')
    def test_confirm_payment_stripe_failed(self, mock_stripe_retrieve, db: Session):
        """Test confirmation when Stripe payment failed."""
        appointment = AppointmentFactory.create_appointment()
        payment = PaymentFactory.create_payment(
            appointment_id=appointment.id,
            stripe_payment_intent_id="pi_test_123"
        )
        db.add_all([appointment, payment])
        db.commit()
        
        # Mock failed Stripe payment
        mock_stripe_retrieve.return_value = MagicMock(
            id="pi_test_123",
            status="failed"
        )
        
        with pytest.raises(ValueError, match="Payment not successful. Status: failed"):
            PaymentService.confirm_payment(
                payment_intent_id="pi_test_123",
                booking_id=appointment.id,
                db=db
            )
    
    def test_confirm_payment_with_gift_certificate(self, db: Session):
        """Test confirming payment that used gift certificate."""
        appointment = AppointmentFactory.create_appointment()
        gift_cert = GiftCertificate(
            code="GIFT50",
            balance=50.0,
            status="active"
        )
        db.add_all([appointment, gift_cert])
        db.commit()
        
        payment = PaymentFactory.create_payment(
            appointment_id=appointment.id,
            gift_certificate_id=gift_cert.id,
            gift_certificate_amount_used=30.0,
            stripe_payment_intent_id=None  # Fully covered by gift cert
        )
        db.add(payment)
        db.commit()
        
        result = PaymentService.confirm_payment(
            payment_intent_id=None,
            booking_id=appointment.id,
            db=db
        )
        
        # Verify gift certificate balance updated
        db.refresh(gift_cert)
        assert gift_cert.balance == 20.0  # $50 - $30
        assert gift_cert.status == "active"  # Still has balance
        
        # Verify payment completed
        db.refresh(payment)
        assert payment.status == "completed"
    
    def test_confirm_payment_gift_certificate_fully_used(self, db: Session):
        """Test gift certificate marked as used when balance depleted."""
        appointment = AppointmentFactory.create_appointment()
        gift_cert = GiftCertificate(
            code="GIFT25",
            balance=25.0,
            status="active"
        )
        db.add_all([appointment, gift_cert])
        db.commit()
        
        payment = PaymentFactory.create_payment(
            appointment_id=appointment.id,
            gift_certificate_id=gift_cert.id,
            gift_certificate_amount_used=25.0
        )
        db.add(payment)
        db.commit()
        
        PaymentService.confirm_payment(
            payment_intent_id=None,
            booking_id=appointment.id,
            db=db
        )
        
        # Verify gift certificate fully used
        db.refresh(gift_cert)
        assert gift_cert.balance == 0
        assert gift_cert.status == "used"
        assert gift_cert.used_at is not None


class TestPaymentRefunds:
    """Test payment refund functionality."""
    
    @patch('services.payment_service.stripe.Refund.create')
    def test_process_refund_full_amount(self, mock_stripe_refund, db: Session):
        """Test processing full refund."""
        # Create completed payment
        appointment = AppointmentFactory.create_appointment(status="confirmed")
        payment = PaymentFactory.create_payment(
            appointment_id=appointment.id,
            amount=100.0,
            status="completed",
            stripe_payment_intent_id="pi_test_123"
        )
        admin = UserFactory.create_admin()
        db.add_all([appointment, payment, admin])
        db.commit()
        
        # Mock Stripe refund
        mock_stripe_refund.return_value = MagicMock(
            id="re_test_123",
            amount=10000,
            status="succeeded"
        )
        
        result = PaymentService.process_refund(
            payment_id=payment.id,
            amount=100.0,
            reason="Customer request",
            initiated_by_id=admin.id,
            db=db
        )
        
        # Verify result
        assert result["amount"] == 100.0
        assert result["status"] == "completed"
        assert result["stripe_refund_id"] == "re_test_123"
        
        # Verify Stripe called correctly
        mock_stripe_refund.assert_called_once_with(
            payment_intent="pi_test_123",
            amount=10000,  # $100 in cents
            metadata={
                'refund_id': str(result["refund_id"]),
                'reason': "Customer request"
            }
        )
        
        # Verify payment updated
        db.refresh(payment)
        assert payment.status == "refunded"
        assert payment.refund_amount == 100.0
        assert payment.refund_reason == "Customer request"
        assert payment.refunded_at is not None
        
        # Verify appointment cancelled
        db.refresh(appointment)
        assert appointment.status == "cancelled"
        
        # Verify refund record created
        refund = db.query(Refund).filter(
            Refund.payment_id == payment.id
        ).first()
        assert refund is not None
        assert refund.amount == 100.0
        assert refund.status == "completed"
        assert refund.initiated_by_id == admin.id
    
    @patch('services.payment_service.stripe.Refund.create')
    def test_process_refund_partial_amount(self, mock_stripe_refund, db: Session):
        """Test processing partial refund."""
        payment = PaymentFactory.create_payment(
            amount=100.0,
            status="completed",
            stripe_payment_intent_id="pi_test_456"
        )
        admin = UserFactory.create_admin()
        db.add_all([payment, admin])
        db.commit()
        
        mock_stripe_refund.return_value = MagicMock(id="re_test_456")
        
        # Process 30% refund
        result = PaymentService.process_refund(
            payment_id=payment.id,
            amount=30.0,
            reason="Service adjustment",
            initiated_by_id=admin.id,
            db=db
        )
        
        # Verify partial refund
        db.refresh(payment)
        assert payment.status == "partially_refunded"
        assert payment.refund_amount == 30.0
        
        # Process another partial refund
        mock_stripe_refund.return_value = MagicMock(id="re_test_789")
        
        result2 = PaymentService.process_refund(
            payment_id=payment.id,
            amount=40.0,
            reason="Additional adjustment",
            initiated_by_id=admin.id,
            db=db
        )
        
        # Still partially refunded (total $70 of $100)
        db.refresh(payment)
        assert payment.status == "partially_refunded"
        assert payment.refund_amount == 70.0
    
    def test_process_refund_invalid_amount(self, db: Session):
        """Test refund with invalid amount."""
        payment = PaymentFactory.create_payment(amount=50.0)
        admin = UserFactory.create_admin()
        db.add_all([payment, admin])
        db.commit()
        
        # Test negative amount
        with pytest.raises(ValueError, match="Invalid refund amount"):
            PaymentService.process_refund(
                payment_id=payment.id,
                amount=-10.0,
                reason="Invalid",
                initiated_by_id=admin.id,
                db=db
            )
    
    def test_process_refund_payment_not_found(self, db: Session):
        """Test refund for non-existent payment."""
        admin = UserFactory.create_admin()
        db.add(admin)
        db.commit()
        
        with pytest.raises(ValueError, match="Payment not found"):
            PaymentService.process_refund(
                payment_id=9999,
                amount=50.0,
                reason="Test",
                initiated_by_id=admin.id,
                db=db
            )
    
    @patch('services.payment_service.PaymentSecurity.validate_refund_eligibility')
    def test_process_refund_ineligible(self, mock_validate, db: Session):
        """Test refund for ineligible payment."""
        payment = PaymentFactory.create_payment()
        admin = UserFactory.create_admin()
        db.add_all([payment, admin])
        db.commit()
        
        mock_validate.return_value = {
            "eligible": False,
            "reason": "Refund period expired"
        }
        
        with pytest.raises(ValueError, match="Refund period expired"):
            PaymentService.process_refund(
                payment_id=payment.id,
                amount=50.0,
                reason="Late request",
                initiated_by_id=admin.id,
                db=db
            )
    
    def test_process_refund_gift_certificate_payment(self, db: Session):
        """Test refund for payment made with gift certificate."""
        payment = PaymentFactory.create_payment(
            amount=100.0,
            gift_certificate_amount_used=100.0,
            stripe_payment_intent_id=None,  # No Stripe payment
            status="completed"
        )
        admin = UserFactory.create_admin()
        db.add_all([payment, admin])
        db.commit()
        
        # Should process refund without calling Stripe
        result = PaymentService.process_refund(
            payment_id=payment.id,
            amount=100.0,
            reason="Gift certificate refund",
            initiated_by_id=admin.id,
            db=db
        )
        
        assert result["stripe_refund_id"] is None
        assert result["status"] == "completed"
        
        # Payment should be marked as refunded
        db.refresh(payment)
        assert payment.status == "refunded"
    
    @patch('services.payment_service.stripe.Refund.create')
    def test_process_refund_stripe_error(self, mock_stripe_refund, db: Session):
        """Test handling Stripe errors during refund."""
        payment = PaymentFactory.create_payment(
            amount=50.0,
            stripe_payment_intent_id="pi_test_error",
            status="completed"
        )
        admin = UserFactory.create_admin()
        db.add_all([payment, admin])
        db.commit()
        
        # Mock Stripe error
        mock_stripe_refund.side_effect = stripe.error.StripeError("Refund failed")
        
        with pytest.raises(Exception, match="Refund processing error"):
            PaymentService.process_refund(
                payment_id=payment.id,
                amount=50.0,
                reason="Test",
                initiated_by_id=admin.id,
                db=db
            )
        
        # Verify no refund record created
        refund = db.query(Refund).first()
        assert refund is None


class TestGiftCertificates:
    """Test gift certificate functionality."""
    
    def test_create_gift_certificate(self, db: Session):
        """Test creating a new gift certificate."""
        admin = UserFactory.create_admin()
        db.add(admin)
        db.commit()
        
        result = PaymentService.create_gift_certificate(
            amount=100.0,
            purchaser_name="John Doe",
            purchaser_email="john@example.com",
            recipient_name="Jane Smith",
            recipient_email="jane@example.com",
            message="Happy Birthday!",
            validity_months=12,
            created_by_id=admin.id,
            db=db
        )
        
        # Verify result
        assert result["amount"] == 100.0
        assert result["balance"] == 100.0
        assert result["status"] == "active"
        assert len(result["code"]) > 0
        
        # Verify in database
        gift_cert = db.query(GiftCertificate).filter(
            GiftCertificate.code == result["code"]
        ).first()
        assert gift_cert is not None
        assert gift_cert.purchaser_name == "John Doe"
        assert gift_cert.recipient_name == "Jane Smith"
        assert gift_cert.message == "Happy Birthday!"
    
    def test_validate_gift_certificate_valid(self, db: Session):
        """Test validating a valid gift certificate."""
        # Create active gift certificate
        gift_cert = GiftCertificate(
            code="TESTGIFT123",
            balance=50.0,
            status="active",
            valid_until=datetime.now(timezone.utc) + timedelta(days=30)
        )
        db.add(gift_cert)
        db.commit()
        
        # Validate
        result = PaymentService.validate_gift_certificate("TESTGIFT123", db)
        assert result is not None
        assert result.id == gift_cert.id
        assert result.balance == 50.0
    
    def test_validate_gift_certificate_expired(self, db: Session):
        """Test validating an expired gift certificate."""
        gift_cert = GiftCertificate(
            code="EXPIRED123",
            balance=50.0,
            status="active",
            valid_until=datetime.now(timezone.utc) - timedelta(days=1)
        )
        db.add(gift_cert)
        db.commit()
        
        result = PaymentService.validate_gift_certificate("EXPIRED123", db)
        assert result is None  # Should not validate expired certificate
    
    def test_validate_gift_certificate_used(self, db: Session):
        """Test validating a used gift certificate."""
        gift_cert = GiftCertificate(
            code="USED123",
            balance=0,
            status="used",
            valid_until=datetime.now(timezone.utc) + timedelta(days=30)
        )
        db.add(gift_cert)
        db.commit()
        
        result = PaymentService.validate_gift_certificate("USED123", db)
        assert result is None  # Should not validate used certificate


class TestPaymentSecurity:
    """Test payment security and validation functions."""
    
    def test_validate_payment_amount(self):
        """Test payment amount validation."""
        # Valid amounts
        assert PaymentSecurity.validate_payment_amount(10.0) is True
        assert PaymentSecurity.validate_payment_amount(0.01) is True
        assert PaymentSecurity.validate_payment_amount(9999.99) is True
        
        # Invalid amounts
        assert PaymentSecurity.validate_payment_amount(0) is False
        assert PaymentSecurity.validate_payment_amount(-10) is False
        assert PaymentSecurity.validate_payment_amount(10001) is False  # Over max
        assert PaymentSecurity.validate_payment_amount(None) is False
    
    def test_validate_appointment_payment_eligibility(self, db: Session):
        """Test appointment payment eligibility validation."""
        # Eligible appointment
        eligible_apt = AppointmentFactory.create_appointment(
            status="pending",
            start_time=datetime.now(timezone.utc) + timedelta(hours=2)
        )
        result = PaymentSecurity.validate_appointment_payment_eligibility(eligible_apt)
        assert result["eligible"] is True
        
        # Cancelled appointment
        cancelled_apt = AppointmentFactory.create_appointment(status="cancelled")
        result = PaymentSecurity.validate_appointment_payment_eligibility(cancelled_apt)
        assert result["eligible"] is False
        assert "cancelled" in result["reason"].lower()
        
        # Past appointment
        past_apt = AppointmentFactory.create_appointment(
            start_time=datetime.now(timezone.utc) - timedelta(days=1)
        )
        result = PaymentSecurity.validate_appointment_payment_eligibility(past_apt)
        assert result["eligible"] is False
        assert "past" in result["reason"].lower()
    
    def test_validate_refund_eligibility(self, db: Session):
        """Test refund eligibility validation."""
        # Eligible for full refund
        recent_payment = PaymentFactory.create_payment(
            amount=100.0,
            status="completed",
            created_at=datetime.now(timezone.utc) - timedelta(hours=1)
        )
        result = PaymentSecurity.validate_refund_eligibility(recent_payment, 100.0)
        assert result["eligible"] is True
        
        # Already fully refunded
        refunded_payment = PaymentFactory.create_payment(
            amount=100.0,
            refund_amount=100.0,
            status="refunded"
        )
        result = PaymentSecurity.validate_refund_eligibility(refunded_payment, 10.0)
        assert result["eligible"] is False
        assert "already fully refunded" in result["reason"].lower()
        
        # Refund amount exceeds payment
        payment = PaymentFactory.create_payment(amount=50.0)
        result = PaymentSecurity.validate_refund_eligibility(payment, 60.0)
        assert result["eligible"] is False
        assert "exceeds" in result["reason"].lower()
    
    def test_validate_gift_certificate_code(self):
        """Test gift certificate code format validation."""
        # Valid codes
        assert PaymentSecurity.validate_gift_certificate_code("GIFT123") is True
        assert PaymentSecurity.validate_gift_certificate_code("SAVE20OFF") is True
        
        # Invalid codes
        assert PaymentSecurity.validate_gift_certificate_code("") is False
        assert PaymentSecurity.validate_gift_certificate_code("ABC") is False  # Too short
        assert PaymentSecurity.validate_gift_certificate_code("!@#$%") is False
        assert PaymentSecurity.validate_gift_certificate_code("A" * 21) is False  # Too long


class TestPaymentCalculations:
    """Test payment amount calculations and commission logic."""
    
    def test_commission_calculations_inline(self, db: Session):
        """Test commission calculations are done correctly inline in payment service."""
        # The PaymentService doesn't have standalone calculation methods,
        # so we'll test the calculations through the payment intent creation
        
        # Test 1: Standard 20% commission
        barber1 = UserFactory.create_barber(commission_rate=0.20)
        apt1 = AppointmentFactory.create_appointment(barber_id=barber1.id, price=100.0)
        db.add_all([barber1, apt1])
        db.commit()
        
        with patch('services.payment_service.stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = MagicMock(id="pi_1", client_secret="secret")
            PaymentService.create_payment_intent(100.0, apt1.id, db)
        
        payment1 = db.query(Payment).filter(Payment.appointment_id == apt1.id).first()
        assert payment1.platform_fee == 20.0  # 20% of $100
        assert payment1.barber_amount == 80.0  # $100 - $20
        assert payment1.commission_rate == 0.20
        
        # Test 2: 25% commission
        barber2 = UserFactory.create_barber(commission_rate=0.25)
        apt2 = AppointmentFactory.create_appointment(barber_id=barber2.id, price=80.0)
        db.add_all([barber2, apt2])
        db.commit()
        
        with patch('services.payment_service.stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = MagicMock(id="pi_2", client_secret="secret")
            PaymentService.create_payment_intent(80.0, apt2.id, db)
        
        payment2 = db.query(Payment).filter(Payment.appointment_id == apt2.id).first()
        assert payment2.platform_fee == 20.0  # 25% of $80
        assert payment2.barber_amount == 60.0  # $80 - $20
        
        # Test 3: 15% commission with decimal amount
        barber3 = UserFactory.create_barber(commission_rate=0.15)
        apt3 = AppointmentFactory.create_appointment(barber_id=barber3.id, price=33.33)
        db.add_all([barber3, apt3])
        db.commit()
        
        with patch('services.payment_service.stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = MagicMock(id="pi_3", client_secret="secret")
            PaymentService.create_payment_intent(33.33, apt3.id, db)
        
        payment3 = db.query(Payment).filter(Payment.appointment_id == apt3.id).first()
        assert round(payment3.platform_fee, 2) == 5.00  # 15% of $33.33
        assert round(payment3.barber_amount, 2) == 28.33  # $33.33 - $5.00
    
    def test_commission_with_gift_certificate(self, db: Session):
        """Test commission calculation when gift certificate is used."""
        barber = UserFactory.create_barber(commission_rate=0.25)
        appointment = AppointmentFactory.create_appointment(
            barber_id=barber.id,
            price=100.0
        )
        gift_cert = GiftCertificate(
            code="GIFT50",
            balance=50.0,
            status="active",
            valid_until=datetime.now(timezone.utc) + timedelta(days=30)
        )
        db.add_all([barber, appointment, gift_cert])
        db.commit()
        
        with patch('services.payment_service.stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = MagicMock(id="pi_test", client_secret="secret")
            
            with patch.object(PaymentService, 'validate_gift_certificate') as mock_validate:
                mock_validate.return_value = gift_cert
                
                PaymentService.create_payment_intent(
                    100.0, appointment.id, db, gift_certificate_code="GIFT50"
                )
        
        payment = db.query(Payment).first()
        # Commission should be calculated on the final amount after gift certificate
        # Final amount = $100 - $50 = $50
        assert payment.platform_fee == 12.5  # 25% of $50 (not $100)
        assert payment.barber_amount == 37.5  # $50 - $12.50
        assert payment.gift_certificate_amount_used == 50.0
    
    def test_zero_commission_rate(self, db: Session):
        """Test handling of zero commission rate (special promotional barbers)."""
        barber = UserFactory.create_barber(commission_rate=0.0)
        appointment = AppointmentFactory.create_appointment(
            barber_id=barber.id,
            price=100.0
        )
        db.add_all([barber, appointment])
        db.commit()
        
        with patch('services.payment_service.stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = MagicMock(id="pi_test", client_secret="secret")
            PaymentService.create_payment_intent(100.0, appointment.id, db)
        
        payment = db.query(Payment).first()
        assert payment.platform_fee == 0.0
        assert payment.barber_amount == 100.0  # Barber gets full amount
        assert payment.commission_rate == 0.0
    
    def test_high_commission_rate(self, db: Session):
        """Test handling of high commission rates."""
        barber = UserFactory.create_barber(commission_rate=0.50)  # 50% commission
        appointment = AppointmentFactory.create_appointment(
            barber_id=barber.id,
            price=200.0
        )
        db.add_all([barber, appointment])
        db.commit()
        
        with patch('services.payment_service.stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = MagicMock(id="pi_test", client_secret="secret")
            PaymentService.create_payment_intent(200.0, appointment.id, db)
        
        payment = db.query(Payment).first()
        assert payment.platform_fee == 100.0  # 50% of $200
        assert payment.barber_amount == 100.0  # $200 - $100
    
    def test_default_commission_when_no_barber_assigned(self, db: Session):
        """Test default commission rate when no barber is assigned."""
        # Create appointment without barber
        appointment = AppointmentFactory.create_appointment(
            barber_id=None,
            price=100.0
        )
        db.add(appointment)
        db.commit()
        
        with patch('services.payment_service.stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = MagicMock(id="pi_test", client_secret="secret")
            PaymentService.create_payment_intent(100.0, appointment.id, db)
        
        payment = db.query(Payment).first()
        # Should use default 20% commission
        assert payment.commission_rate == 0.20
        assert payment.platform_fee == 20.0
        assert payment.barber_amount == 80.0


class TestPayoutProcessing:
    """Test barber payout processing functionality."""
    
    @patch('services.payment_service.stripe.Transfer.create')
    def test_process_barber_payout_success(self, mock_transfer, db: Session):
        """Test successful barber payout processing."""
        # Create barber with Stripe account
        barber = UserFactory.create_barber(
            stripe_account_id="acct_test_123",
            stripe_account_status="active"
        )
        
        # Create completed payments for the barber
        start_date = datetime.now(timezone.utc) - timedelta(days=7)
        end_date = datetime.now(timezone.utc)
        
        payments = []
        for i in range(3):
            payment = PaymentFactory.create_payment(
                barber_id=barber.id,
                barber_amount=100.0,
                status="completed",
                created_at=start_date + timedelta(days=i)
            )
            payments.append(payment)
        
        db.add(barber)
        db.add_all(payments)
        db.commit()
        
        # Mock Stripe transfer
        mock_transfer.return_value = MagicMock(
            id="tr_test_123",
            amount=30000,  # $300 in cents
            status="paid"
        )
        
        result = PaymentService.process_barber_payout(
            barber_id=barber.id,
            start_date=start_date,
            end_date=end_date,
            db=db
        )
        
        # Verify result
        assert result["amount"] == 300.0  # 3 payments × $100
        assert result["payment_count"] == 3
        assert result["stripe_transfer_id"] == "tr_test_123"
        assert result["status"] == "completed"
        
        # Verify Stripe called correctly
        mock_transfer.assert_called_once_with(
            amount=30000,
            currency="usd",
            destination="acct_test_123",
            metadata={
                "payout_id": str(result["payout_id"]),
                "barber_id": str(barber.id),
                "period_start": start_date.isoformat(),
                "period_end": end_date.isoformat()
            }
        )
        
        # Verify payout record created
        payout = db.query(Payout).filter(Payout.id == result["payout_id"]).first()
        assert payout is not None
        assert payout.amount == 300.0
        assert payout.status == "completed"
        assert payout.stripe_transfer_id == "tr_test_123"
    
    def test_process_payout_no_payments(self, db: Session):
        """Test payout processing when no payments exist."""
        barber = UserFactory.create_barber(stripe_account_id="acct_test_123")
        db.add(barber)
        db.commit()
        
        with pytest.raises(ValueError, match="No payments found for the specified period"):
            PaymentService.process_barber_payout(
                barber_id=barber.id,
                start_date=datetime.now(timezone.utc) - timedelta(days=7),
                end_date=datetime.now(timezone.utc),
                db=db
            )
    
    @patch('services.payment_service.PaymentSecurity.validate_payout_eligibility')
    def test_process_payout_ineligible(self, mock_validate, db: Session):
        """Test payout processing for ineligible barber."""
        barber = UserFactory.create_barber()
        payment = PaymentFactory.create_payment(
            barber_id=barber.id,
            barber_amount=100.0,
            status="completed"
        )
        db.add_all([barber, payment])
        db.commit()
        
        mock_validate.return_value = {
            "eligible": False,
            "reason": "Stripe account not connected"
        }
        
        with pytest.raises(ValueError, match="Stripe account not connected"):
            PaymentService.process_barber_payout(
                barber_id=barber.id,
                start_date=datetime.now(timezone.utc) - timedelta(days=7),
                end_date=datetime.now(timezone.utc),
                db=db
            )
    
    @patch('services.payment_service.stripe.Transfer.create')
    def test_process_payout_stripe_error(self, mock_transfer, db: Session):
        """Test handling of Stripe errors during payout."""
        barber = UserFactory.create_barber(
            stripe_account_id="acct_test_123",
            stripe_account_status="active"
        )
        payment = PaymentFactory.create_payment(
            barber_id=barber.id,
            barber_amount=100.0,
            status="completed"
        )
        db.add_all([barber, payment])
        db.commit()
        
        # Mock Stripe error
        mock_transfer.side_effect = stripe.error.StripeError("Transfer failed")
        
        with pytest.raises(Exception, match="Payout processing error"):
            PaymentService.process_barber_payout(
                barber_id=barber.id,
                start_date=datetime.now(timezone.utc) - timedelta(days=7),
                end_date=datetime.now(timezone.utc),
                db=db
            )
        
        # Verify no payout record created
        payout = db.query(Payout).first()
        assert payout is None


class TestStripeConnect:
    """Test Stripe Connect account management."""
    
    @patch('services.payment_service.stripe.AccountLink.create')
    @patch('services.payment_service.stripe.Account.create')
    def test_create_stripe_connect_account(self, mock_account_create, mock_link_create, db: Session):
        """Test creating a Stripe Connect account for a barber."""
        barber = UserFactory.create_barber(stripe_account_id=None)
        db.add(barber)
        db.commit()
        
        # Mock Stripe responses
        mock_account_create.return_value = MagicMock(
            id="acct_new_123",
            type="express"
        )
        mock_link_create.return_value = MagicMock(
            url="https://connect.stripe.com/onboarding/123"
        )
        
        result = PaymentService.create_stripe_connect_account(barber, db)
        
        # Verify result
        assert result["account_id"] == "acct_new_123"
        assert "https://connect.stripe.com" in result["onboarding_url"]
        assert "Complete your Stripe Connect onboarding" in result["message"]
        
        # Verify barber updated
        db.refresh(barber)
        assert barber.stripe_account_id == "acct_new_123"
        assert barber.stripe_account_status == "pending"
    
    def test_create_stripe_account_non_barber(self, db: Session):
        """Test that non-barbers cannot create Stripe accounts."""
        user = UserFactory.create_user()  # Regular user, not barber
        db.add(user)
        db.commit()
        
        with pytest.raises(ValueError, match="Only barbers can create Stripe Connect accounts"):
            PaymentService.create_stripe_connect_account(user, db)
    
    def test_create_stripe_account_already_exists(self, db: Session):
        """Test error when barber already has Stripe account."""
        barber = UserFactory.create_barber(stripe_account_id="acct_existing")
        db.add(barber)
        db.commit()
        
        with pytest.raises(ValueError, match="User already has a Stripe Connect account"):
            PaymentService.create_stripe_connect_account(barber, db)
    
    @patch('services.payment_service.stripe.Account.retrieve')
    def test_get_stripe_connect_status(self, mock_retrieve, db: Session):
        """Test getting Stripe Connect account status."""
        barber = UserFactory.create_barber(stripe_account_id="acct_test_123")
        db.add(barber)
        db.commit()
        
        # Mock Stripe account details
        mock_retrieve.return_value = MagicMock(
            id="acct_test_123",
            details_submitted=True,
            payouts_enabled=True,
            charges_enabled=True
        )
        
        result = PaymentService.get_stripe_connect_status(barber)
        
        assert result["connected"] is True
        assert result["account_id"] == "acct_test_123"
        assert result["payouts_enabled"] is True
        assert result["details_submitted"] is True
        assert result["charges_enabled"] is True
        assert result["onboarding_url"] is None
    
    def test_get_stripe_status_no_account(self):
        """Test getting status when no Stripe account exists."""
        barber = UserFactory.create_barber(stripe_account_id=None)
        
        result = PaymentService.get_stripe_connect_status(barber)
        
        assert result["connected"] is False
        assert result["account_id"] is None
        assert result["payouts_enabled"] is False
        assert result["details_submitted"] is False