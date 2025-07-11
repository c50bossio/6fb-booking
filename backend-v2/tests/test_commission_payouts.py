"""
Comprehensive tests for commission payout calculations.
Tests unified commission framework, payout processing, and commission analytics.
"""

import pytest
from datetime import datetime, timedelta, date
from decimal import Decimal
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models import User, Payment, Appointment, Payout
from models.product import Order, OrderItem, POSTransaction, Product
from services.base_commission import UnifiedCommissionService, CommissionType
from services.commission_service import CommissionService
from services.commission_rate_manager import CommissionRateManager
from services.payment_service import PaymentService
from schemas import PayoutCreate


@pytest.fixture
def test_db():
    """Create a test database"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def barber_user(test_db):
    """Create a test barber user"""
    barber = User(
        id=1,
        email="test.barber@example.com",
        name="Test Barber",
        role="barber",
        commission_rate=0.20,
        stripe_account_id="acct_test123",
        stripe_account_status="active",
        hashed_password="hashed_test"
    )
    test_db.add(barber)
    test_db.commit()
    return barber


@pytest.fixture
def admin_user(test_db):
    """Create a test admin user"""
    admin = User(
        id=2,
        email="admin@example.com",
        name="Admin User",
        role="admin",
        hashed_password="hashed_test"
    )
    test_db.add(admin)
    test_db.commit()
    return admin


@pytest.fixture
def sample_appointment(test_db, barber_user):
    """Create a sample appointment"""
    appointment = Appointment(
        id=1,
        user_id=3,  # Client
        barber_id=barber_user.id,
        service_name="Premium Haircut",
        start_time=datetime.utcnow(),
        duration_minutes=45,
        price=50.00,
        status="confirmed"
    )
    test_db.add(appointment)
    test_db.commit()
    return appointment


@pytest.fixture
def sample_payment(test_db, barber_user, sample_appointment):
    """Create a sample payment"""
    payment = Payment(
        id=1,
        user_id=sample_appointment.user_id,
        appointment_id=sample_appointment.id,
        barber_id=barber_user.id,
        amount=50.00,
        status="completed",
        stripe_payment_intent_id="pi_test123",
        platform_fee=10.00,
        barber_amount=40.00,
        commission_rate=0.20,
        created_at=datetime.utcnow()
    )
    test_db.add(payment)
    test_db.commit()
    return payment


@pytest.fixture
def sample_order(test_db, barber_user):
    """Create a sample order with items"""
    order = Order(
        id=1,
        order_number="ORD-001",
        customer_id=3,
        source="online",
        status="fulfilled",
        financial_status="paid",
        subtotal=100.00,
        total_amount=100.00,
        commission_barber_id=barber_user.id,
        processed_at=datetime.utcnow()
    )
    test_db.add(order)
    test_db.commit()
    return order


@pytest.fixture
def sample_order_item(test_db, sample_order):
    """Create a sample order item"""
    item = OrderItem(
        id=1,
        order_id=sample_order.id,
        product_id=1,
        title="Premium Hair Product",
        price=25.00,
        quantity=2,
        line_total=50.00,
        commission_rate=0.10,
        commission_amount=5.00,
        commission_paid=False
    )
    test_db.add(item)
    test_db.commit()
    return item


@pytest.fixture
def sample_pos_transaction(test_db, barber_user):
    """Create a sample POS transaction"""
    transaction = POSTransaction(
        id=1,
        transaction_number="POS-001",
        location_id=1,
        barber_id=barber_user.id,
        subtotal=100.00,
        total_amount=100.00,
        payment_method="card",
        commission_rate=0.08,
        commission_amount=8.00,
        commission_paid=False,
        transacted_at=datetime.utcnow()
    )
    test_db.add(transaction)
    test_db.commit()
    return transaction


class TestUnifiedCommissionFramework:
    """Test the unified commission calculation framework"""
    
    def test_service_commission_calculation(self):
        """Test service commission calculations"""
        commission_service = UnifiedCommissionService()
        
        result = commission_service.calculate_commission(
            commission_type=CommissionType.SERVICE,
            amount=Decimal('100.00'),
            rate=Decimal('0.20')
        )
        
        assert result['total_amount'] == Decimal('100.00')
        assert result['platform_fee'] == Decimal('20.00')
        assert result['barber_amount'] == Decimal('80.00')
        assert result['commission_rate'] == Decimal('0.20')
        assert result['commission_type'] == 'service'
    
    def test_retail_commission_calculation(self):
        """Test retail commission calculations"""
        commission_service = UnifiedCommissionService()
        
        result = commission_service.calculate_commission(
            commission_type=CommissionType.RETAIL,
            amount=Decimal('50.00'),
            rate=Decimal('0.10'),
            quantity=2
        )
        
        assert result['line_total'] == Decimal('50.00')
        assert result['commission_amount'] == Decimal('5.00')
        assert result['remaining_amount'] == Decimal('45.00')
        assert result['commission_type'] == 'retail'
    
    def test_pos_commission_calculation(self):
        """Test POS commission calculations"""
        commission_service = UnifiedCommissionService()
        
        result = commission_service.calculate_commission(
            commission_type=CommissionType.POS,
            amount=Decimal('100.00'),
            rate=Decimal('0.08')
        )
        
        assert result['subtotal'] == Decimal('100.00')
        assert result['commission_amount'] == Decimal('8.00')
        assert result['remaining_amount'] == Decimal('92.00')
        assert result['commission_type'] == 'pos'
    
    def test_commission_rate_validation(self):
        """Test commission rate validation"""
        commission_service = UnifiedCommissionService()
        
        # Valid service rate
        assert commission_service.validate_commission_setup(
            CommissionType.SERVICE, Decimal('0.20')
        )['valid'] is True
        
        # Invalid service rate (too high)
        assert commission_service.validate_commission_setup(
            CommissionType.SERVICE, Decimal('0.60')
        )['valid'] is False
        
        # Valid retail rate
        assert commission_service.validate_commission_setup(
            CommissionType.RETAIL, Decimal('0.10')
        )['valid'] is True


class TestCommissionService:
    """Test the commission service for orders and POS"""
    
    def test_order_commission_calculation(self, test_db, sample_order, sample_order_item):
        """Test calculating commissions for an order"""
        commission_service = CommissionService(test_db)
        
        total_commission = commission_service.calculate_order_commissions(sample_order)
        
        assert total_commission == Decimal('5.00')
        
        # Verify order item was updated
        test_db.refresh(sample_order_item)
        assert sample_order_item.commission_amount == Decimal('5.00')
    
    def test_pos_transaction_commission(self, test_db, sample_pos_transaction):
        """Test calculating commission for POS transaction"""
        commission_service = CommissionService(test_db)
        
        commission = commission_service.calculate_pos_transaction_commission(
            sample_pos_transaction
        )
        
        assert commission == Decimal('8.00')
        assert sample_pos_transaction.commission_amount == Decimal('8.00')
    
    def test_get_barber_retail_commissions(self, test_db, barber_user, sample_order_item, sample_pos_transaction):
        """Test getting retail commissions for a barber"""
        commission_service = CommissionService(test_db)
        
        result = commission_service.get_barber_retail_commissions(
            barber_user.id,
            unpaid_only=True
        )
        
        assert result['barber_id'] == barber_user.id
        assert result['order_commission'] == Decimal('5.00')
        assert result['pos_commission'] == Decimal('8.00')
        assert result['total_retail_commission'] == Decimal('13.00')
        assert result['order_items_count'] == 1
        assert result['pos_transactions_count'] == 1
    
    def test_mark_retail_commissions_paid(self, test_db, barber_user, sample_order_item, sample_pos_transaction):
        """Test marking retail commissions as paid"""
        commission_service = CommissionService(test_db)
        
        success = commission_service.mark_retail_commissions_paid(
            barber_user.id,
            payout_id=1,
            order_item_ids=[sample_order_item.id],
            pos_transaction_ids=[sample_pos_transaction.id]
        )
        
        assert success is True
        
        # Verify items marked as paid
        test_db.refresh(sample_order_item)
        test_db.refresh(sample_pos_transaction)
        assert sample_order_item.commission_paid is True
        assert sample_pos_transaction.commission_paid is True


class TestCommissionRateManager:
    """Test the commission rate management system"""
    
    def test_get_barber_commission_rate(self, test_db, barber_user):
        """Test getting commission rates for different types"""
        rate_manager = CommissionRateManager(test_db)
        
        # Service rate should match barber's rate
        service_rate = rate_manager.get_barber_commission_rate(
            barber_user.id, CommissionType.SERVICE
        )
        assert service_rate == Decimal('0.20')
        
        # POS rate should be 80% of service rate
        pos_rate = rate_manager.get_barber_commission_rate(
            barber_user.id, CommissionType.POS
        )
        assert pos_rate == Decimal('0.16')  # 0.20 * 0.8
        
        # Retail rate defaults to barber's rate
        retail_rate = rate_manager.get_barber_commission_rate(
            barber_user.id, CommissionType.RETAIL
        )
        assert retail_rate == Decimal('0.20')
    
    def test_tiered_commission_rates(self, test_db, barber_user):
        """Test tiered rates based on transaction amount"""
        rate_manager = CommissionRateManager(test_db)
        
        # High amount service should get bonus rate
        high_rate = rate_manager.get_barber_commission_rate(
            barber_user.id, 
            CommissionType.SERVICE,
            amount=Decimal('250.00')
        )
        assert high_rate == Decimal('0.22')  # 0.20 * 1.1
        
        # Low amount should get base rate
        low_rate = rate_manager.get_barber_commission_rate(
            barber_user.id,
            CommissionType.SERVICE,
            amount=Decimal('50.00')
        )
        assert low_rate == Decimal('0.20')
    
    def test_set_barber_commission_rate(self, test_db, barber_user):
        """Test setting commission rate for a barber"""
        rate_manager = CommissionRateManager(test_db)
        
        success = rate_manager.set_barber_commission_rate(
            barber_user.id,
            Decimal('0.25')
        )
        
        assert success is True
        
        # Verify rate was updated
        test_db.refresh(barber_user)
        assert barber_user.commission_rate == 0.25


class TestPaymentServicePayout:
    """Test the payment service payout functionality"""
    
    @patch('stripe.Transfer.create')
    def test_process_barber_payout_service_only(self, mock_transfer, test_db, barber_user, sample_payment):
        """Test processing payout for service payments only"""
        mock_transfer.return_value = Mock(id='tr_test123')
        
        result = PaymentService.process_barber_payout(
            barber_id=barber_user.id,
            start_date=datetime.utcnow() - timedelta(days=7),
            end_date=datetime.utcnow(),
            db=test_db,
            include_retail=False
        )
        
        assert result['amount'] == 40.00  # Barber amount from payment
        assert result['payment_count'] == 1
        assert result['stripe_transfer_id'] == 'tr_test123'
        assert result['status'] == 'completed'
        
        # Verify payout record created
        payout = test_db.query(Payout).first()
        assert payout is not None
        assert payout.barber_id == barber_user.id
        assert payout.amount == 40.00
        assert payout.status == 'completed'
    
    @patch('stripe.Transfer.create')
    def test_process_barber_payout_with_retail(self, mock_transfer, test_db, barber_user, sample_payment, sample_order_item, sample_pos_transaction):
        """Test processing payout including retail commissions"""
        mock_transfer.return_value = Mock(id='tr_test123')
        
        result = PaymentService.process_barber_payout(
            barber_id=barber_user.id,
            start_date=datetime.utcnow() - timedelta(days=7),
            end_date=datetime.utcnow(),
            db=test_db,
            include_retail=True
        )
        
        # Service: 40.00 + Retail: 5.00 + POS: 8.00 = 53.00
        assert result['amount'] == 53.00
        assert result['service_amount'] == 40.00
        assert result['retail_amount'] == 13.00
        assert result['payment_count'] == 1
        assert 'retail_breakdown' in result
        
        # Verify retail commissions marked as paid
        test_db.refresh(sample_order_item)
        test_db.refresh(sample_pos_transaction)
        assert sample_order_item.commission_paid is True
        assert sample_pos_transaction.commission_paid is True
    
    def test_process_payout_no_payments(self, test_db, barber_user):
        """Test processing payout with no payments"""
        with pytest.raises(ValueError, match="No payments found"):
            PaymentService.process_barber_payout(
                barber_id=barber_user.id,
                start_date=datetime.utcnow() - timedelta(days=7),
                end_date=datetime.utcnow(),
                db=test_db,
                include_retail=False
            )
    
    def test_process_payout_invalid_barber(self, test_db):
        """Test processing payout for invalid barber"""
        with pytest.raises(ValueError, match="Barber 999 not found"):
            PaymentService.process_barber_payout(
                barber_id=999,
                start_date=datetime.utcnow() - timedelta(days=7),
                end_date=datetime.utcnow(),
                db=test_db,
                include_retail=False
            )


class TestCommissionAnalytics:
    """Test commission analytics functionality"""
    
    def test_commission_analytics_calculation(self, test_db, barber_user, sample_payment):
        """Test basic commission analytics calculation"""
        # This would test the analytics endpoints
        # Since we're testing the service layer, we'll simulate the calculations
        
        # Get service commissions
        service_payments = test_db.query(Payment).filter(
            Payment.barber_id == barber_user.id,
            Payment.status == "completed"
        ).all()
        
        service_commission = sum(p.barber_amount or 0 for p in service_payments)
        assert service_commission == 40.00
        
        # Verify counts
        assert len(service_payments) == 1
    
    def test_commission_trends_calculation(self, test_db, barber_user, sample_payment):
        """Test commission trend calculations"""
        # Add more payments over time
        for i in range(1, 4):
            payment = Payment(
                id=i + 1,
                user_id=3,
                appointment_id=i + 1,
                barber_id=barber_user.id,
                amount=50.00 + (i * 10),
                status="completed",
                platform_fee=10.00 + (i * 2),
                barber_amount=40.00 + (i * 8),
                commission_rate=0.20,
                created_at=datetime.utcnow() - timedelta(days=i * 7)
            )
            test_db.add(payment)
        test_db.commit()
        
        # Get all payments
        all_payments = test_db.query(Payment).filter(
            Payment.barber_id == barber_user.id
        ).order_by(Payment.created_at).all()
        
        # Verify we have trending data
        assert len(all_payments) == 4
        
        # Calculate growth
        first_amount = all_payments[0].barber_amount
        last_amount = all_payments[-1].barber_amount
        growth = last_amount - first_amount
        
        assert growth > 0  # Should show positive growth


class TestEdgeCases:
    """Test edge cases and error scenarios"""
    
    def test_refunded_payment_exclusion(self, test_db, barber_user, sample_payment):
        """Test that refunded payments are excluded from payouts"""
        # Mark payment as refunded
        sample_payment.status = "refunded"
        test_db.commit()
        
        # Try to process payout
        with pytest.raises(ValueError, match="No payments found"):
            PaymentService.process_barber_payout(
                barber_id=barber_user.id,
                start_date=datetime.utcnow() - timedelta(days=7),
                end_date=datetime.utcnow(),
                db=test_db,
                include_retail=False
            )
    
    def test_partial_commission_payment(self, test_db, barber_user):
        """Test handling of partial commission amounts"""
        commission_service = UnifiedCommissionService()
        
        # Very small amount
        result = commission_service.calculate_commission(
            commission_type=CommissionType.SERVICE,
            amount=Decimal('0.01'),
            rate=Decimal('0.20')
        )
        
        assert result['platform_fee'] == Decimal('0.00')  # Rounds down
        assert result['barber_amount'] == Decimal('0.01')
    
    def test_invalid_commission_type(self):
        """Test handling of invalid commission type"""
        commission_service = UnifiedCommissionService()
        
        with pytest.raises(ValueError):
            commission_service.calculate_commission(
                commission_type="invalid_type",  # Invalid enum
                amount=Decimal('100.00'),
                rate=Decimal('0.20')
            )
    
    def test_negative_amount_validation(self):
        """Test validation of negative amounts"""
        commission_service = UnifiedCommissionService()
        
        with pytest.raises(ValueError, match="Amount cannot be negative"):
            commission_service.calculate_commission(
                commission_type=CommissionType.SERVICE,
                amount=Decimal('-100.00'),
                rate=Decimal('0.20')
            )
    
    def test_commission_rate_out_of_range(self):
        """Test validation of out-of-range commission rates"""
        commission_service = UnifiedCommissionService()
        
        # Rate too high
        with pytest.raises(ValueError, match="Invalid commission rate"):
            commission_service.calculate_commission(
                commission_type=CommissionType.SERVICE,
                amount=Decimal('100.00'),
                rate=Decimal('1.50')  # 150% - invalid
            )
        
        # Rate negative
        with pytest.raises(ValueError, match="Commission rate must be between"):
            commission_service.calculate_commission(
                commission_type=CommissionType.SERVICE,
                amount=Decimal('100.00'),
                rate=Decimal('-0.10')
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])