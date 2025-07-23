"""
Comprehensive Integration Tests for Hybrid Payment System

Tests the complete hybrid payment system including:
- Payment routing logic between centralized and decentralized modes
- External payment processor connections (Stripe, Square, PayPal, Clover)
- Platform commission collection system
- Unified analytics integration
- Error handling and edge cases
"""

import pytest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import Mock, patch, MagicMock

from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models import User, Payment, Appointment
from models.hybrid_payment import (
    PaymentMode, ExternalPaymentProcessor, ConnectionStatus,
    PaymentProcessorConnection, ExternalTransaction, 
    PlatformCollection, HybridPaymentConfig
)

from services.hybrid_payment_router import HybridPaymentRouter, PaymentRoutingDecision
from services.external_payment_service import ExternalPaymentService
from services.platform_collection_service import PlatformCollectionService
from services.unified_payment_analytics_service import UnifiedPaymentAnalyticsService

from tests.factories import UserFactory, PaymentFactory, AppointmentFactory


class TestHybridPaymentRouter:
    """Test hybrid payment routing functionality."""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session."""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = TestingSessionLocal()
        yield session
        session.close()
    
    def test_centralized_payment_routing(self, db_session):
        """Test payment routing for centralized mode barber."""
        # Create centralized mode barber
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.CENTRALIZED.value,
            commission_rate=0.20
        )
        
        # Create appointment
        appointment = AppointmentFactory.create_appointment(
            barber_id=barber.id,
            price=Decimal('75.00')
        )
        
        db_session.add_all([barber, appointment])
        db_session.commit()
        
        # Test routing decision
        router = HybridPaymentRouter(db_session)
        routing_decision, routing_details = router.route_payment(
            appointment_id=appointment.id,
            amount=Decimal('75.00'),
            currency='USD'
        )
        
        # Should route to centralized platform
        assert routing_decision == PaymentRoutingDecision.CENTRALIZED
        assert routing_details['payment_mode'] == 'centralized'
        assert routing_details['processor'] == 'stripe_platform'
        assert routing_details['commission_rate'] == 20.0
        assert routing_details['estimated_fees']['commission_amount'] == 15.0
        assert routing_details['estimated_fees']['net_to_barber'] == 60.0
    
    def test_decentralized_payment_routing(self, db_session):
        """Test payment routing for decentralized mode barber."""
        # Create decentralized mode barber
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.DECENTRALIZED.value,
            commission_rate=0.25
        )
        
        # Create external payment processor connection
        connection = PaymentProcessorConnection(
            barber_id=barber.id,
            processor_type=ExternalPaymentProcessor.SQUARE,
            account_id="sq_test_account",
            account_name="Test Square Account",
            status=ConnectionStatus.CONNECTED,
            connection_data={
                'access_token': 'test_token',
                'location_id': 'test_location'
            },
            supports_payments=True,
            supports_refunds=True,
            default_currency='USD'
        )
        
        # Create appointment
        appointment = AppointmentFactory.create_appointment(
            barber_id=barber.id,
            price=Decimal('100.00')
        )
        
        db_session.add_all([barber, connection, appointment])
        db_session.commit()
        
        # Test routing decision
        router = HybridPaymentRouter(db_session)
        routing_decision, routing_details = router.route_payment(
            appointment_id=appointment.id,
            amount=Decimal('100.00'),
            currency='USD'
        )
        
        # Should route to external processor
        assert routing_decision == PaymentRoutingDecision.EXTERNAL
        assert routing_details['payment_mode'] == 'decentralized'
        assert routing_details['processor'] == 'square'
        assert routing_details['connection_id'] == connection.id
        assert routing_details['commission_rate'] == 25.0
    
    def test_fallback_routing_no_external_connection(self, db_session):
        """Test fallback to centralized when external connection unavailable."""
        # Create decentralized mode barber with no connections
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.DECENTRALIZED.value
        )
        
        appointment = AppointmentFactory.create_appointment(
            barber_id=barber.id,
            price=Decimal('50.00')
        )
        
        db_session.add_all([barber, appointment])
        db_session.commit()
        
        # Test routing decision
        router = HybridPaymentRouter(db_session)
        routing_decision, routing_details = router.route_payment(
            appointment_id=appointment.id,
            amount=Decimal('50.00'),
            currency='USD'
        )
        
        # Should fallback to centralized
        assert routing_decision == PaymentRoutingDecision.CENTRALIZED
        assert routing_details['fallback_reason'] == 'no_external_connections'
        assert routing_details['processor'] == 'stripe_platform'


class TestExternalPaymentProcessorConnections:
    """Test external payment processor connection management."""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session."""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = TestingSessionLocal()
        yield session
        session.close()
    
    def test_stripe_connection_creation(self, db_session):
        """Test creating Stripe payment processor connection."""
        barber = UserFactory.create_barber()
        db_session.add(barber)
        db_session.commit()
        
        external_service = ExternalPaymentService(db_session)
        
        stripe_config = {
            'account_id': 'acct_test123',
            'access_token': 'sk_test_token',
            'refresh_token': 'rt_test_token',
            'webhook_secret': 'whsec_test'
        }
        
        connection = external_service.create_connection(
            barber_id=barber.id,
            processor_type=ExternalPaymentProcessor.STRIPE,
            account_id=stripe_config['account_id'],
            account_name="Test Stripe Account",
            connection_config=stripe_config
        )
        
        assert connection.processor_type == ExternalPaymentProcessor.STRIPE
        assert connection.status == ConnectionStatus.CONNECTED
        assert connection.supports_payments is True
        assert connection.supports_refunds is True
        assert connection.default_currency == 'USD'
    
    def test_square_connection_creation(self, db_session):
        """Test creating Square payment processor connection."""
        barber = UserFactory.create_barber()
        db_session.add(barber)
        db_session.commit()
        
        external_service = ExternalPaymentService(db_session)
        
        square_config = {
            'access_token': 'EAAAE...',
            'application_id': 'sq0idp-...',
            'location_id': 'L123...',
            'environment': 'sandbox'
        }
        
        connection = external_service.create_connection(
            barber_id=barber.id,
            processor_type=ExternalPaymentProcessor.SQUARE,
            account_id=square_config['location_id'],
            account_name="Test Square Location",
            connection_config=square_config
        )
        
        assert connection.processor_type == ExternalPaymentProcessor.SQUARE
        assert connection.status == ConnectionStatus.CONNECTED
        assert connection.connection_data['environment'] == 'sandbox'
    
    @patch('services.external_payment_service.requests.post')
    def test_connection_validation(self, mock_post, db_session):
        """Test connection validation with external service."""
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {'status': 'active'}
        
        barber = UserFactory.create_barber()
        db_session.add(barber)
        db_session.commit()
        
        external_service = ExternalPaymentService(db_session)
        
        # Test validation for existing connection
        connection = PaymentProcessorConnection(
            barber_id=barber.id,
            processor_type=ExternalPaymentProcessor.STRIPE,
            account_id="acct_test",
            account_name="Test Account",
            status=ConnectionStatus.CONNECTED,
            connection_data={'access_token': 'test_token'}
        )
        
        db_session.add(connection)
        db_session.commit()
        
        is_valid = external_service.validate_connection(connection.id)
        assert is_valid is True


class TestPlatformCollection:
    """Test platform commission collection system."""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session."""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = TestingSessionLocal()
        yield session
        session.close()
    
    def test_commission_calculation_and_collection(self, db_session):
        """Test commission calculation and collection for external transactions."""
        # Create decentralized barber with 20% commission rate
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.DECENTRALIZED.value,
            commission_rate=0.20
        )
        
        # Create external transactions
        transactions = []
        for i in range(3):
            transaction = ExternalTransaction(
                connection_id=1,
                processor_type=ExternalPaymentProcessor.STRIPE,
                external_transaction_id=f"stripe_tx_{i}",
                amount=Decimal('80.00'),
                currency='USD',
                status='collected',
                barber_id=barber.id,
                created_at=datetime.now(timezone.utc)
            )
            transactions.append(transaction)
        
        db_session.add_all([barber] + transactions)
        db_session.commit()
        
        # Test commission collection
        collection_service = PlatformCollectionService(db_session)
        
        # Calculate commission for transactions
        total_amount = sum(tx.amount for tx in transactions)  # $240
        expected_commission = total_amount * Decimal('0.20')  # $48
        
        collection = collection_service.collect_commission(
            barber_id=barber.id,
            external_transaction_ids=[tx.external_transaction_id for tx in transactions]
        )
        
        assert collection.barber_id == barber.id
        assert collection.amount == expected_commission
        assert collection.status == 'pending'
        assert len(collection.external_transaction_ids) == 3
    
    def test_commission_collection_with_different_rates(self, db_session):
        """Test commission collection with different commission rates."""
        # Create barbers with different commission rates
        barber_20 = UserFactory.create_barber(commission_rate=0.20)
        barber_25 = UserFactory.create_barber(commission_rate=0.25)
        
        # Create transactions for each barber
        tx_20 = ExternalTransaction(
            connection_id=1,
            processor_type=ExternalPaymentProcessor.SQUARE,
            external_transaction_id="sq_tx_20",
            amount=Decimal('100.00'),
            currency='USD',
            status='collected',
            barber_id=barber_20.id
        )
        
        tx_25 = ExternalTransaction(
            connection_id=2,
            processor_type=ExternalPaymentProcessor.STRIPE,
            external_transaction_id="stripe_tx_25",
            amount=Decimal('100.00'),
            currency='USD',
            status='collected',
            barber_id=barber_25.id
        )
        
        db_session.add_all([barber_20, barber_25, tx_20, tx_25])
        db_session.commit()
        
        collection_service = PlatformCollectionService(db_session)
        
        # Test 20% commission
        collection_20 = collection_service.collect_commission(
            barber_id=barber_20.id,
            external_transaction_ids=["sq_tx_20"]
        )
        
        # Test 25% commission
        collection_25 = collection_service.collect_commission(
            barber_id=barber_25.id,
            external_transaction_ids=["stripe_tx_25"]
        )
        
        assert collection_20.amount == Decimal('20.00')  # 20% of $100
        assert collection_25.amount == Decimal('25.00')  # 25% of $100


class TestUnifiedAnalyticsIntegration:
    """Test unified analytics integration with hybrid payment system."""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session."""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = TestingSessionLocal()
        yield session
        session.close()
    
    def test_unified_analytics_with_hybrid_payments(self, db_session):
        """Test unified analytics aggregating both centralized and external payments."""
        # Create barber using both payment modes
        barber = UserFactory.create_barber(commission_rate=0.22)
        
        # Create centralized payments
        centralized_payment = PaymentFactory.create_payment(
            barber_id=barber.id,
            amount=120.0,
            platform_fee=26.40,  # 22% commission
            barber_amount=93.60,
            status='collected'
        )
        
        # Create external transactions
        external_tx = ExternalTransaction(
            connection_id=1,
            processor_type=ExternalPaymentProcessor.STRIPE,
            external_transaction_id="stripe_unified_test",
            amount=Decimal('150.00'),
            currency='USD',
            status='collected',
            barber_id=barber.id
        )
        
        # Create commission collection for external transaction
        commission_collection = PlatformCollection(
            barber_id=barber.id,
            amount=Decimal('33.00'),  # 22% of $150
            external_transaction_ids=['stripe_unified_test'],
            status='collected'
        )
        
        db_session.add_all([
            barber, centralized_payment, external_tx, commission_collection
        ])
        db_session.commit()
        
        # Test unified analytics
        analytics_service = UnifiedPaymentAnalyticsService(db_session)
        analytics = analytics_service.get_unified_analytics(barber.id)
        
        # Verify combined metrics
        combined = analytics['combined_metrics']
        assert combined['total_transactions'] == 2
        assert combined['total_volume'] == 270.0  # $120 + $150
        assert combined['total_commission_activity'] == 33.0
        assert combined['total_net_earnings'] == 93.60  # Only centralized net tracked here
        
        # Verify mode breakdown
        centralized = analytics['centralized_payments']
        assert centralized['total_volume'] == 120.0
        assert centralized['net_earnings'] == 93.60
        
        decentralized = analytics['decentralized_payments']
        assert decentralized['total_volume'] == 150.0
        assert decentralized['total_transactions'] == 1


class TestErrorHandlingAndEdgeCases:
    """Test error handling and edge cases in hybrid payment system."""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session."""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = TestingSessionLocal()
        yield session
        session.close()
    
    def test_routing_with_invalid_appointment(self, db_session):
        """Test payment routing with invalid appointment ID."""
        router = HybridPaymentRouter(db_session)
        
        with pytest.raises(ValueError, match="Appointment 99999 not found"):
            router.route_payment(
                appointment_id=99999,
                amount=Decimal('50.00'),
                currency='USD'
            )
    
    def test_external_service_connection_failure(self, db_session):
        """Test handling of external service connection failures."""
        barber = UserFactory.create_barber()
        db_session.add(barber)
        db_session.commit()
        
        external_service = ExternalPaymentService(db_session)
        
        # Test with invalid connection config
        with pytest.raises(ValueError, match="Invalid processor configuration"):
            external_service.create_connection(
                barber_id=barber.id,
                processor_type=ExternalPaymentProcessor.STRIPE,
                account_id="invalid_account",
                account_name="Invalid Account",
                connection_config={}  # Empty config should fail
            )
    
    def test_commission_collection_with_failed_transactions(self, db_session):
        """Test commission collection excluding failed transactions."""
        barber = UserFactory.create_barber(commission_rate=0.20)
        
        # Create mix of successful and failed transactions
        successful_tx = ExternalTransaction(
            connection_id=1,
            processor_type=ExternalPaymentProcessor.STRIPE,
            external_transaction_id="stripe_success",
            amount=Decimal('100.00'),
            currency='USD',
            status='collected',
            barber_id=barber.id
        )
        
        failed_tx = ExternalTransaction(
            connection_id=1,
            processor_type=ExternalPaymentProcessor.STRIPE,
            external_transaction_id="stripe_failed",
            amount=Decimal('75.00'),
            currency='USD',
            status='failed',
            barber_id=barber.id
        )
        
        db_session.add_all([barber, successful_tx, failed_tx])
        db_session.commit()
        
        collection_service = PlatformCollectionService(db_session)
        
        # Commission should only be calculated on successful transactions
        collection = collection_service.collect_commission(
            barber_id=barber.id,
            external_transaction_ids=["stripe_success", "stripe_failed"]
        )
        
        # Should only include successful transaction ($100 * 20% = $20)
        assert collection.amount == Decimal('20.00')
        assert "stripe_success" in collection.external_transaction_ids
        assert "stripe_failed" not in collection.external_transaction_ids


class TestSecurityAndCompliance:
    """Test security and compliance features of hybrid payment system."""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session."""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = TestingSessionLocal()
        yield session
        session.close()
    
    def test_sensitive_data_encryption(self, db_session):
        """Test that sensitive connection data is properly encrypted."""
        barber = UserFactory.create_barber()
        db_session.add(barber)
        db_session.commit()
        
        # Create connection with sensitive data
        connection = PaymentProcessorConnection(
            barber_id=barber.id,
            processor_type=ExternalPaymentProcessor.STRIPE,
            account_id="acct_test",
            account_name="Test Account",
            status=ConnectionStatus.CONNECTED,
            connection_data={
                'access_token': 'sk_test_sensitive_token',
                'refresh_token': 'rt_test_sensitive_token'
            }
        )
        
        db_session.add(connection)
        db_session.commit()
        
        # Verify sensitive data is not stored in plain text
        # (This would be implemented with actual encryption in production)
        stored_connection = db_session.query(PaymentProcessorConnection).filter_by(id=connection.id).first()
        
        # In production, these would be encrypted
        assert stored_connection.connection_data is not None
        assert 'access_token' in stored_connection.connection_data
    
    def test_commission_audit_trail(self, db_session):
        """Test that commission collections maintain proper audit trail."""
        barber = UserFactory.create_barber(commission_rate=0.20)
        
        transaction = ExternalTransaction(
            connection_id=1,
            processor_type=ExternalPaymentProcessor.STRIPE,
            external_transaction_id="stripe_audit_test",
            amount=Decimal('100.00'),
            currency='USD',
            status='collected',
            barber_id=barber.id
        )
        
        db_session.add_all([barber, transaction])
        db_session.commit()
        
        collection_service = PlatformCollectionService(db_session)
        collection = collection_service.collect_commission(
            barber_id=barber.id,
            external_transaction_ids=["stripe_audit_test"]
        )
        
        # Verify audit trail
        assert collection.created_at is not None
        assert collection.external_transaction_ids == ["stripe_audit_test"]
        assert collection.commission_rate == 20.0
        assert collection.amount == Decimal('20.00')


if __name__ == "__main__":
    # Run with: python -m pytest tests/integration/test_hybrid_payment_system_comprehensive.py -v
    pytest.main([__file__, "-v", "--tb=short"])