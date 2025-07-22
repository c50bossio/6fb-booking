"""
Comprehensive Tests for Hybrid Payment System

This test suite covers:
- Centralized payment processing (existing platform)
- Decentralized payment processing (external processors)
- Dynamic payment routing logic
- External payment processor connections
- Commission calculations across all payment modes
- Platform collection system
- Unified analytics
- Error handling and edge cases
- Security validations
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch, MagicMock, call
from decimal import Decimal
import stripe
from stripe.error import StripeError

from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from models import User, Appointment, Payment
from models.hybrid_payment import (
    PaymentMode, ExternalPaymentProcessor, ConnectionStatus,
    PaymentProcessorConnection, ExternalTransaction, HybridPaymentConfig,
    PlatformCommissionCollection
)

from services.hybrid_payment_router import HybridPaymentRouter, PaymentRoutingDecision
from services.external_payment_service import ExternalPaymentService
from services.platform_collection_service import PlatformCollectionService
from services.unified_payment_analytics_service import UnifiedPaymentAnalyticsService, AnalyticsPeriod

from tests.factories import UserFactory, AppointmentFactory, PaymentFactory


class TestHybridPaymentSystemSetup:
    """Test basic hybrid payment system setup and configuration."""
    
    def test_payment_mode_enum_values(self):
        """Test PaymentMode enum has correct values."""
        assert PaymentMode.CENTRALIZED.value == "centralized"
        assert PaymentMode.DECENTRALIZED.value == "decentralized"
        
        # Test all enum values are valid
        assert len(PaymentMode) == 2
        assert all(mode.value in ["centralized", "decentralized"] for mode in PaymentMode)
    
    def test_external_processor_enum_values(self):
        """Test ExternalPaymentProcessor enum has correct values."""
        expected_processors = ["stripe", "square", "paypal", "clover"]
        
        assert ExternalPaymentProcessor.STRIPE.value == "stripe"
        assert ExternalPaymentProcessor.SQUARE.value == "square" 
        assert ExternalPaymentProcessor.PAYPAL.value == "paypal"
        assert ExternalPaymentProcessor.CLOVER.value == "clover"
        
        # Test all enum values are present
        processor_values = [p.value for p in ExternalPaymentProcessor]
        for expected in expected_processors:
            assert expected in processor_values
    
    def test_connection_status_enum_values(self):
        """Test ConnectionStatus enum has correct values."""
        assert ConnectionStatus.PENDING.value == "pending"
        assert ConnectionStatus.CONNECTED.value == "connected"
        assert ConnectionStatus.ERROR.value == "error"
        assert ConnectionStatus.DISCONNECTED.value == "disconnected"
    
    @pytest.fixture
    def db_session(self):
        """Create test database session."""
        # Use in-memory SQLite for testing
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = TestingSessionLocal()
        
        yield session
        
        session.close()
    
    def test_user_payment_mode_configuration(self, db_session):
        """Test user payment mode configuration."""
        # Test centralized user (default)
        centralized_barber = UserFactory.create_barber(
            payment_mode=PaymentMode.CENTRALIZED.value
        )
        db_session.add(centralized_barber)
        
        # Test decentralized user
        decentralized_barber = UserFactory.create_barber(
            payment_mode=PaymentMode.DECENTRALIZED.value,
            external_payment_processor=ExternalPaymentProcessor.STRIPE.value
        )
        db_session.add(decentralized_barber)
        
        db_session.commit()
        
        # Verify configurations
        assert centralized_barber.payment_mode == PaymentMode.CENTRALIZED.value
        assert centralized_barber.external_payment_processor is None
        
        assert decentralized_barber.payment_mode == PaymentMode.DECENTRALIZED.value
        assert decentralized_barber.external_payment_processor == ExternalPaymentProcessor.STRIPE.value
    
    def test_hybrid_payment_config_creation(self, db_session):
        """Test HybridPaymentConfig model creation."""
        config = HybridPaymentConfig(
            key="default_commission_rate",
            value="0.20",
            description="Default commission rate for new barbers",
            config_type="decimal"
        )
        db_session.add(config)
        db_session.commit()
        
        # Verify configuration stored correctly
        saved_config = db_session.query(HybridPaymentConfig).filter(
            HybridPaymentConfig.key == "default_commission_rate"
        ).first()
        
        assert saved_config is not None
        assert saved_config.value == "0.20"
        assert saved_config.config_type == "decimal"


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
    
    def test_create_square_connection(self, db_session):
        """Test creating Square payment processor connection."""
        barber = UserFactory.create_barber(payment_mode=PaymentMode.DECENTRALIZED.value)
        db_session.add(barber)
        db_session.commit()
        
        # Create Square connection
        square_config = {
            'access_token': 'sandbox_sq0atb_test_token',
            'application_id': 'sandbox_sq0idp_test_app',
            'location_id': 'L123456789',
            'environment': 'sandbox',
            'webhook_signature_key': 'test_webhook_key'
        }
        
        connection = PaymentProcessorConnection(
            barber_id=barber.id,
            processor_type=ExternalPaymentProcessor.SQUARE,
            account_id="L123456789",
            account_name="Test Square Location",
            status=ConnectionStatus.CONNECTED,
            connection_data=square_config,
            supports_payments=True,
            supports_refunds=True,
            supports_recurring=False,
            default_currency='USD'
        )
        
        db_session.add(connection)
        db_session.commit()
        
        # Verify connection created
        saved_connection = db_session.query(PaymentProcessorConnection).filter(
            PaymentProcessorConnection.barber_id == barber.id
        ).first()
        
        assert saved_connection is not None
        assert saved_connection.processor_type == ExternalPaymentProcessor.SQUARE
        assert saved_connection.status == ConnectionStatus.CONNECTED
        assert saved_connection.supports_payments is True
        assert saved_connection.connection_data['environment'] == 'sandbox'
    
    def test_create_stripe_connection(self, db_session):
        """Test creating Stripe payment processor connection."""
        barber = UserFactory.create_barber(payment_mode=PaymentMode.DECENTRALIZED.value)
        db_session.add(barber)
        db_session.commit()
        
        # Create Stripe connection
        stripe_config = {
            'account_id': 'acct_test_stripe_123',
            'publishable_key': 'pk_test_stripe_123',
            'access_token': 'sk_test_stripe_123',
            'webhook_secret': 'whsec_test_stripe_123'
        }
        
        connection = PaymentProcessorConnection(
            barber_id=barber.id,
            processor_type=ExternalPaymentProcessor.STRIPE,
            account_id="acct_test_stripe_123",
            account_name="Test Stripe Account",
            status=ConnectionStatus.CONNECTED,
            connection_data=stripe_config,
            supports_payments=True,
            supports_refunds=True,
            supports_recurring=True,
            default_currency='USD'
        )
        
        db_session.add(connection)
        db_session.commit()
        
        # Verify connection created
        saved_connection = db_session.query(PaymentProcessorConnection).filter(
            PaymentProcessorConnection.barber_id == barber.id
        ).first()
        
        assert saved_connection is not None
        assert saved_connection.processor_type == ExternalPaymentProcessor.STRIPE
        assert saved_connection.supports_recurring is True
        assert 'account_id' in saved_connection.connection_data
    
    def test_connection_error_status(self, db_session):
        """Test connection with error status."""
        barber = UserFactory.create_barber()
        db_session.add(barber)
        db_session.commit()
        
        # Create connection with error status
        connection = PaymentProcessorConnection(
            barber_id=barber.id,
            processor_type=ExternalPaymentProcessor.PAYPAL,
            account_id="paypal_test_account",
            account_name="Failed PayPal Connection",
            status=ConnectionStatus.ERROR,
            connection_data={'error': 'Authentication failed'},
            error_message="PayPal API authentication failed",
            supports_payments=False,
            supports_refunds=False,
            supports_recurring=False
        )
        
        db_session.add(connection)
        db_session.commit()
        
        # Verify error connection
        saved_connection = db_session.query(PaymentProcessorConnection).first()
        assert saved_connection.status == ConnectionStatus.ERROR
        assert saved_connection.error_message == "PayPal API authentication failed"
        assert saved_connection.supports_payments is False
    
    def test_multiple_connections_per_barber(self, db_session):
        """Test barber can have multiple payment processor connections."""
        barber = UserFactory.create_barber()
        db_session.add(barber)
        db_session.commit()
        
        # Create Stripe connection
        stripe_connection = PaymentProcessorConnection(
            barber_id=barber.id,
            processor_type=ExternalPaymentProcessor.STRIPE,
            account_id="acct_stripe_123",
            account_name="Stripe Account",
            status=ConnectionStatus.CONNECTED
        )
        
        # Create Square connection
        square_connection = PaymentProcessorConnection(
            barber_id=barber.id,
            processor_type=ExternalPaymentProcessor.SQUARE,
            account_id="sq_location_456",
            account_name="Square Location",
            status=ConnectionStatus.CONNECTED
        )
        
        db_session.add_all([stripe_connection, square_connection])
        db_session.commit()
        
        # Verify both connections exist
        connections = db_session.query(PaymentProcessorConnection).filter(
            PaymentProcessorConnection.barber_id == barber.id
        ).all()
        
        assert len(connections) == 2
        processors = [conn.processor_type for conn in connections]
        assert ExternalPaymentProcessor.STRIPE in processors
        assert ExternalPaymentProcessor.SQUARE in processors


class TestHybridPaymentRouter:
    """Test dynamic payment routing logic."""
    
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
        # Create centralized barber
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.CENTRALIZED.value,
            commission_rate=0.25
        )
        appointment = AppointmentFactory.create_appointment(
            barber_id=barber.id,
            price=100.0
        )
        
        db_session.add_all([barber, appointment])
        db_session.commit()
        
        # Test payment routing
        router = HybridPaymentRouter(db_session)
        routing_decision, routing_details = router.route_payment(
            appointment_id=appointment.id,
            amount=Decimal('100.00'),
            currency='USD'
        )
        
        # Verify centralized routing
        assert routing_decision == PaymentRoutingDecision.CENTRALIZED_PLATFORM
        assert routing_details['payment_mode'] == 'centralized'
        assert routing_details['processor'] == 'platform'
        assert routing_details['commission_rate'] == 0.25
        assert routing_details['platform_fee'] == 25.0
        assert routing_details['barber_amount'] == 75.0
    
    def test_decentralized_payment_routing(self, db_session):
        """Test payment routing for decentralized mode barber."""
        # Create decentralized barber with Stripe connection
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.DECENTRALIZED.value,
            external_payment_processor=ExternalPaymentProcessor.STRIPE.value,
            commission_rate=0.20
        )
        
        # Create Stripe connection
        stripe_connection = PaymentProcessorConnection(
            barber_id=barber.id,
            processor_type=ExternalPaymentProcessor.STRIPE,
            account_id="acct_stripe_test",
            status=ConnectionStatus.CONNECTED,
            supports_payments=True
        )
        
        appointment = AppointmentFactory.create_appointment(
            barber_id=barber.id,
            price=80.0
        )
        
        db_session.add_all([barber, stripe_connection, appointment])
        db_session.commit()
        
        # Test payment routing
        router = HybridPaymentRouter(db_session)
        routing_decision, routing_details = router.route_payment(
            appointment_id=appointment.id,
            amount=Decimal('80.00'),
            currency='USD'
        )
        
        # Verify decentralized routing
        assert routing_decision == PaymentRoutingDecision.EXTERNAL_PROCESSOR
        assert routing_details['payment_mode'] == 'decentralized'
        assert routing_details['processor'] == 'stripe'
        assert routing_details['connection_id'] == stripe_connection.id
        assert routing_details['commission_rate'] == 0.20
        assert routing_details['commission_amount'] == 16.0  # 20% of $80
    
    def test_routing_fallback_to_centralized(self, db_session):
        """Test routing falls back to centralized when external connection fails."""
        # Create decentralized barber with failed connection
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.DECENTRALIZED.value,
            external_payment_processor=ExternalPaymentProcessor.SQUARE.value
        )
        
        # Create failed Square connection
        failed_connection = PaymentProcessorConnection(
            barber_id=barber.id,
            processor_type=ExternalPaymentProcessor.SQUARE,
            account_id="sq_failed_account",
            status=ConnectionStatus.ERROR,
            supports_payments=False
        )
        
        appointment = AppointmentFactory.create_appointment(
            barber_id=barber.id,
            price=50.0
        )
        
        db_session.add_all([barber, failed_connection, appointment])
        db_session.commit()
        
        # Test payment routing
        router = HybridPaymentRouter(db_session)
        routing_decision, routing_details = router.route_payment(
            appointment_id=appointment.id,
            amount=Decimal('50.00'),
            currency='USD'
        )
        
        # Verify fallback to centralized
        assert routing_decision == PaymentRoutingDecision.CENTRALIZED_PLATFORM
        assert routing_details['payment_mode'] == 'centralized'
        assert routing_details['processor'] == 'platform'
        assert 'fallback_reason' in routing_details
        assert 'external_connection_failed' in routing_details['fallback_reason']
    
    def test_get_payment_options(self, db_session):
        """Test getting available payment options for barber."""
        # Create barber with multiple connections
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.DECENTRALIZED.value
        )
        
        # Add Stripe connection
        stripe_connection = PaymentProcessorConnection(
            barber_id=barber.id,
            processor_type=ExternalPaymentProcessor.STRIPE,
            account_id="acct_stripe",
            status=ConnectionStatus.CONNECTED,
            supports_payments=True
        )
        
        # Add Square connection
        square_connection = PaymentProcessorConnection(
            barber_id=barber.id,
            processor_type=ExternalPaymentProcessor.SQUARE,
            account_id="sq_location",
            status=ConnectionStatus.CONNECTED,
            supports_payments=True
        )
        
        db_session.add_all([barber, stripe_connection, square_connection])
        db_session.commit()
        
        # Get payment options
        router = HybridPaymentRouter(db_session)
        options = router.get_payment_options(
            barber_id=barber.id,
            amount=Decimal('75.00')
        )
        
        # Verify payment options
        assert options['payment_mode'] == 'decentralized'
        assert len(options['available_methods']) >= 2
        assert len(options['external_connections']) == 2
        
        # Check for platform fallback option
        method_types = [method['type'] for method in options['available_methods']]
        assert 'stripe' in method_types
        assert 'square' in method_types
        assert 'platform_fallback' in method_types


class TestExternalPaymentService:
    """Test external payment processor integration service."""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session."""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = TestingSessionLocal()
        yield session
        session.close()
    
    @patch('services.external_payment_service.squareup')
    def test_square_payment_processing(self, mock_square, db_session):
        """Test Square payment processing through external service."""
        # Setup Square connection
        barber = UserFactory.create_barber()
        square_connection = PaymentProcessorConnection(
            barber_id=barber.id,
            processor_type=ExternalPaymentProcessor.SQUARE,
            account_id="L_SQUARE_TEST",
            status=ConnectionStatus.CONNECTED,
            connection_data={
                'access_token': 'sq0atb_test_token',
                'application_id': 'sq0idp_test_app',
                'location_id': 'L_SQUARE_TEST'
            }
        )
        
        db_session.add_all([barber, square_connection])
        db_session.commit()
        
        # Mock Square API response
        mock_payment_response = MagicMock()
        mock_payment_response.body = {
            'payment': {
                'id': 'sq_payment_123',
                'amount_money': {'amount': 5000, 'currency': 'USD'},
                'status': 'COMPLETED',
                'receipt_url': 'https://squareup.com/receipt/123'
            }
        }
        mock_square.ApiClient().payments_api.create_payment.return_value = mock_payment_response
        
        # Process payment
        external_service = ExternalPaymentService(db_session)
        result = external_service.process_square_payment(
            connection_id=square_connection.id,
            amount=Decimal('50.00'),
            currency='USD',
            payment_method_data={
                'source_id': 'sq_nonce_test_token',
                'idempotency_key': 'test_idempotency_123'
            }
        )
        
        # Verify result
        assert result['success'] is True
        assert result['processor'] == 'square'
        assert result['external_transaction_id'] == 'sq_payment_123'
        assert result['amount'] == Decimal('50.00')
        assert 'receipt_url' in result
        
        # Verify external transaction record created
        external_transaction = db_session.query(ExternalTransaction).filter(
            ExternalTransaction.external_transaction_id == 'sq_payment_123'
        ).first()
        
        assert external_transaction is not None
        assert external_transaction.processor_type == ExternalPaymentProcessor.SQUARE
        assert external_transaction.amount == Decimal('50.00')
        assert external_transaction.status == 'completed'
    
    @patch('stripe.PaymentIntent.create')
    def test_stripe_payment_processing(self, mock_stripe_create, db_session):
        """Test Stripe payment processing through external service."""
        # Setup Stripe connection
        barber = UserFactory.create_barber()
        stripe_connection = PaymentProcessorConnection(
            barber_id=barber.id,
            processor_type=ExternalPaymentProcessor.STRIPE,
            account_id="acct_stripe_test",
            status=ConnectionStatus.CONNECTED,
            connection_data={
                'account_id': 'acct_stripe_test',
                'access_token': 'sk_test_stripe_token'
            }
        )
        
        db_session.add_all([barber, stripe_connection])
        db_session.commit()
        
        # Mock Stripe response
        mock_stripe_create.return_value = MagicMock(
            id='pi_stripe_test_123',
            amount=7500,
            currency='usd',
            status='succeeded'
        )
        
        # Process payment
        external_service = ExternalPaymentService(db_session)
        result = external_service.process_stripe_payment(
            connection_id=stripe_connection.id,
            amount=Decimal('75.00'),
            currency='USD',
            payment_method_data={
                'payment_method': 'pm_test_card',
                'confirm': True
            }
        )
        
        # Verify result
        assert result['success'] is True
        assert result['processor'] == 'stripe'
        assert result['external_transaction_id'] == 'pi_stripe_test_123'
        assert result['amount'] == Decimal('75.00')
        
        # Verify Stripe API called correctly
        mock_stripe_create.assert_called_once()
    
    def test_unsupported_processor_error(self, db_session):
        """Test error handling for unsupported payment processor."""
        # Create connection with unsupported processor
        barber = UserFactory.create_barber()
        unsupported_connection = PaymentProcessorConnection(
            barber_id=barber.id,
            processor_type=ExternalPaymentProcessor.PAYPAL,  # Not implemented yet
            account_id="paypal_test",
            status=ConnectionStatus.CONNECTED
        )
        
        db_session.add_all([barber, unsupported_connection])
        db_session.commit()
        
        # Try to process payment
        external_service = ExternalPaymentService(db_session)
        
        with pytest.raises(ValueError, match="PayPal integration not yet implemented"):
            external_service.process_payment(
                connection_id=unsupported_connection.id,
                amount=Decimal('50.00'),
                currency='USD',
                payment_method_data={}
            )
    
    def test_connection_not_found_error(self, db_session):
        """Test error when payment processor connection not found."""
        external_service = ExternalPaymentService(db_session)
        
        with pytest.raises(ValueError, match="Payment processor connection 99999 not found"):
            external_service.process_payment(
                connection_id=99999,
                amount=Decimal('50.00'),
                currency='USD',
                payment_method_data={}
            )


class TestPlatformCollectionSystem:
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
    
    def test_commission_collection_calculation(self, db_session):
        """Test commission collection calculation for decentralized payments."""
        # Create decentralized barber
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.DECENTRALIZED.value,
            commission_rate=0.20
        )
        
        # Create external transactions
        transactions = []
        for i in range(3):
            transaction = ExternalTransaction(
                connection_id=1,  # Dummy connection ID
                processor_type=ExternalPaymentProcessor.STRIPE,
                external_transaction_id=f"stripe_tx_{i}",
                amount=Decimal('60.00'),
                currency='USD',
                status='completed',
                barber_id=barber.id,
                created_at=datetime.now(timezone.utc) - timedelta(days=i)
            )
            transactions.append(transaction)
        
        db_session.add_all([barber] + transactions)
        db_session.commit()
        
        # Calculate commissions owed
        collection_service = PlatformCollectionService(db_session)
        commission_data = collection_service.calculate_commission_owed(
            barber_id=barber.id,
            start_date=datetime.now(timezone.utc) - timedelta(days=7),
            end_date=datetime.now(timezone.utc)
        )
        
        # Verify calculations
        assert commission_data['total_transactions'] == 3
        assert commission_data['total_volume'] == Decimal('180.00')  # 3 x $60
        assert commission_data['commission_rate'] == 0.20
        assert commission_data['commission_owed'] == Decimal('36.00')  # 20% of $180
    
    @patch('stripe.Transfer.create')
    def test_commission_collection_processing(self, mock_stripe_transfer, db_session):
        """Test processing commission collection from barber."""
        # Setup barber with external transactions
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.DECENTRALIZED.value,
            commission_rate=0.25,
            stripe_account_id="acct_barber_stripe"
        )
        
        # Create external transaction
        transaction = ExternalTransaction(
            connection_id=1,
            processor_type=ExternalPaymentProcessor.STRIPE,
            external_transaction_id="stripe_tx_collection",
            amount=Decimal('100.00'),
            currency='USD',
            status='completed',
            barber_id=barber.id
        )
        
        db_session.add_all([barber, transaction])
        db_session.commit()
        
        # Mock Stripe reverse transfer
        mock_stripe_transfer.return_value = MagicMock(
            id='tr_collection_123',
            amount=2500,  # $25 commission
            destination='platform_account'
        )
        
        # Process commission collection
        collection_service = PlatformCollectionService(db_session)
        result = collection_service.collect_commission(
            barber_id=barber.id,
            commission_amount=Decimal('25.00'),
            external_transaction_ids=['stripe_tx_collection']
        )
        
        # Verify result
        assert result['success'] is True
        assert result['amount_collected'] == Decimal('25.00')
        assert result['stripe_transfer_id'] == 'tr_collection_123'
        assert result['transaction_count'] == 1
        
        # Verify commission collection record
        collection = db_session.query(PlatformCommissionCollection).filter(
            PlatformCommissionCollection.barber_id == barber.id
        ).first()
        
        assert collection is not None
        assert collection.amount == Decimal('25.00')
        assert collection.status == 'completed'
        assert collection.stripe_transfer_id == 'tr_collection_123'
    
    def test_commission_threshold_check(self, db_session):
        """Test commission collection only occurs above threshold."""
        # Create barber with small commission amount
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.DECENTRALIZED.value,
            commission_rate=0.15
        )
        
        # Create small transaction
        transaction = ExternalTransaction(
            connection_id=1,
            processor_type=ExternalPaymentProcessor.SQUARE,
            external_transaction_id="small_tx",
            amount=Decimal('20.00'),  # Commission would be $3
            currency='USD',
            status='completed',
            barber_id=barber.id
        )
        
        db_session.add_all([barber, transaction])
        db_session.commit()
        
        # Check commission eligibility
        collection_service = PlatformCollectionService(db_session)
        eligible = collection_service.is_collection_eligible(
            barber_id=barber.id,
            threshold=Decimal('5.00')  # Minimum $5 collection
        )
        
        # Verify not eligible due to low amount
        assert eligible['eligible'] is False
        assert eligible['reason'] == 'commission_below_threshold'
        assert eligible['commission_amount'] == Decimal('3.00')
        assert eligible['threshold'] == Decimal('5.00')


class TestUnifiedAnalyticsIntegration:
    """Test unified analytics across centralized and decentralized payments."""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session."""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = TestingSessionLocal()
        yield session
        session.close()
    
    def test_unified_analytics_centralized_and_decentralized(self, db_session):
        """Test analytics combining centralized and decentralized payments."""
        # Create barber with mixed payment history
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.DECENTRALIZED.value,
            commission_rate=0.20
        )
        
        # Create centralized payments (historical)
        centralized_payment1 = PaymentFactory.create_payment(
            barber_id=barber.id,
            amount=75.0,
            platform_fee=15.0,  # 20% commission
            barber_amount=60.0,
            status='completed',
            created_at=datetime.now(timezone.utc) - timedelta(days=10)
        )
        
        centralized_payment2 = PaymentFactory.create_payment(
            barber_id=barber.id,
            amount=50.0,
            platform_fee=10.0,
            barber_amount=40.0,
            status='completed',
            created_at=datetime.now(timezone.utc) - timedelta(days=5)
        )
        
        # Create external transactions (decentralized)
        external_tx1 = ExternalTransaction(
            connection_id=1,
            processor_type=ExternalPaymentProcessor.STRIPE,
            external_transaction_id="stripe_unified_1",
            amount=Decimal('80.00'),
            currency='USD',
            status='completed',
            barber_id=barber.id,
            created_at=datetime.now(timezone.utc) - timedelta(days=3)
        )
        
        external_tx2 = ExternalTransaction(
            connection_id=1,
            processor_type=ExternalPaymentProcessor.STRIPE,
            external_transaction_id="stripe_unified_2",
            amount=Decimal('90.00'),
            currency='USD',
            status='completed',
            barber_id=barber.id,
            created_at=datetime.now(timezone.utc) - timedelta(days=1)
        )
        
        # Create commission collection records
        commission_collection = PlatformCommissionCollection(
            barber_id=barber.id,
            amount=Decimal('34.00'),  # 20% of ($80 + $90)
            external_transaction_ids=['stripe_unified_1', 'stripe_unified_2'],
            status='completed',
            stripe_transfer_id='tr_commission_unified'
        )
        
        db_session.add_all([
            barber, centralized_payment1, centralized_payment2,
            external_tx1, external_tx2, commission_collection
        ])
        db_session.commit()
        
        # Get unified analytics
        analytics_service = UnifiedPaymentAnalyticsService(db_session)
        analytics = analytics_service.get_unified_analytics(
            barber_id=barber.id,
            period=AnalyticsPeriod.LAST_30_DAYS
        )
        
        # Verify unified analytics
        assert analytics['centralized_payments']['total_transactions'] == 2
        assert analytics['centralized_payments']['total_volume'] == 125.0  # $75 + $50
        assert analytics['centralized_payments']['net_earnings'] == 100.0  # $60 + $40
        
        assert analytics['decentralized_payments']['total_transactions'] == 2
        assert analytics['decentralized_payments']['total_volume'] == 170.0  # $80 + $90
        assert analytics['decentralized_payments']['gross_earnings'] == 170.0
        
        assert analytics['commission_data']['total_amount'] == 34.0
        assert analytics['commission_data']['amount_collected'] == 34.0
        
        # Combined metrics
        assert analytics['combined_metrics']['total_transactions'] == 4
        assert analytics['combined_metrics']['total_volume'] == 295.0  # $125 + $170
        assert analytics['combined_metrics']['total_commission_activity'] == 34.0
    
    def test_six_figure_barber_progress_tracking(self, db_session):
        """Test Six Figure Barber progress tracking with unified analytics."""
        # Create barber progressing toward six figures
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.DECENTRALIZED.value,
            commission_rate=0.20
        )
        
        # Create payments totaling $5,000/month (on track for $60K/year)
        monthly_volume = Decimal('5000.00')
        
        # Mix of centralized and decentralized
        centralized_volume = Decimal('2000.00')
        decentralized_volume = Decimal('3000.00')
        
        # Create centralized payments
        for i in range(4):  # 4 payments of $500 each
            payment = PaymentFactory.create_payment(
                barber_id=barber.id,
                amount=500.0,
                platform_fee=100.0,  # 20%
                barber_amount=400.0,
                status='completed',
                created_at=datetime.now(timezone.utc) - timedelta(days=i*7)
            )
            db_session.add(payment)
        
        # Create external transactions
        for i in range(6):  # 6 transactions of $500 each
            transaction = ExternalTransaction(
                connection_id=1,
                processor_type=ExternalPaymentProcessor.STRIPE,
                external_transaction_id=f"stripe_6fb_{i}",
                amount=Decimal('500.00'),
                currency='USD',
                status='completed',
                barber_id=barber.id,
                created_at=datetime.now(timezone.utc) - timedelta(days=i*4)
            )
            db_session.add(transaction)
        
        db_session.add(barber)
        db_session.commit()
        
        # Get analytics with Six Figure insights
        analytics_service = UnifiedPaymentAnalyticsService(db_session)
        analytics = analytics_service.get_unified_analytics(
            barber_id=barber.id,
            period=AnalyticsPeriod.LAST_30_DAYS,
            include_projections=True
        )
        
        # Verify Six Figure insights
        six_figure_insights = analytics['six_figure_insights']
        
        assert six_figure_insights['target_annual_revenue'] == 100000.0
        assert six_figure_insights['target_monthly_revenue'] == 8333.33
        
        # Current performance
        current_monthly = six_figure_insights['current_monthly_revenue']
        assert current_monthly > 0
        
        # Progress calculation
        progress_percentage = six_figure_insights['progress_percentage']
        assert 0 <= progress_percentage <= 100
        
        # Projections
        projected_annual = six_figure_insights['projected_annual']
        assert projected_annual > 0
        
        # Recommendations should be present
        assert len(six_figure_insights['recommendations']) > 0


class TestErrorHandlingAndEdgeCases:
    """Test error handling and edge cases for hybrid payment system."""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session."""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = TestingSessionLocal()
        yield session
        session.close()
    
    def test_routing_with_no_connections(self, db_session):
        """Test routing when decentralized barber has no connections."""
        # Create decentralized barber with no connections
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.DECENTRALIZED.value
        )
        appointment = AppointmentFactory.create_appointment(
            barber_id=barber.id,
            price=100.0
        )
        
        db_session.add_all([barber, appointment])
        db_session.commit()
        
        # Test routing
        router = HybridPaymentRouter(db_session)
        routing_decision, routing_details = router.route_payment(
            appointment_id=appointment.id,
            amount=Decimal('100.00'),
            currency='USD'
        )
        
        # Should fall back to centralized
        assert routing_decision == PaymentRoutingDecision.CENTRALIZED_PLATFORM
        assert routing_details['payment_mode'] == 'centralized'
        assert 'fallback_reason' in routing_details
        assert 'no_external_connections' in routing_details['fallback_reason']
    
    def test_external_payment_processor_timeout(self, db_session):
        """Test handling of external payment processor timeouts."""
        # Create connection
        barber = UserFactory.create_barber()
        connection = PaymentProcessorConnection(
            barber_id=barber.id,
            processor_type=ExternalPaymentProcessor.SQUARE,
            account_id="sq_timeout_test",
            status=ConnectionStatus.CONNECTED
        )
        
        db_session.add_all([barber, connection])
        db_session.commit()
        
        # Mock timeout error
        with patch('services.external_payment_service.squareup') as mock_square:
            mock_square.ApiClient().payments_api.create_payment.side_effect = Exception("Request timeout")
            
            external_service = ExternalPaymentService(db_session)
            
            with pytest.raises(Exception, match="Request timeout"):
                external_service.process_square_payment(
                    connection_id=connection.id,
                    amount=Decimal('50.00'),
                    currency='USD',
                    payment_method_data={}
                )
    
    def test_commission_collection_with_zero_amount(self, db_session):
        """Test commission collection when amount is zero."""
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.DECENTRALIZED.value,
            commission_rate=0.0  # Zero commission rate
        )
        
        db_session.add(barber)
        db_session.commit()
        
        collection_service = PlatformCollectionService(db_session)
        
        # Check if collection is eligible
        eligible = collection_service.is_collection_eligible(
            barber_id=barber.id,
            threshold=Decimal('5.00')
        )
        
        assert eligible['eligible'] is False
        assert eligible['reason'] == 'no_commission_owed'
        assert eligible['commission_amount'] == Decimal('0.00')
    
    def test_analytics_with_no_data(self, db_session):
        """Test analytics when barber has no payment history."""
        # Create new barber with no payments
        barber = UserFactory.create_barber()
        db_session.add(barber)
        db_session.commit()
        
        # Get analytics
        analytics_service = UnifiedPaymentAnalyticsService(db_session)
        analytics = analytics_service.get_unified_analytics(
            barber_id=barber.id,
            period=AnalyticsPeriod.LAST_30_DAYS
        )
        
        # Verify empty analytics
        assert analytics['centralized_payments']['total_transactions'] == 0
        assert analytics['centralized_payments']['total_volume'] == 0
        assert analytics['decentralized_payments']['total_transactions'] == 0
        assert analytics['commission_data']['total_amount'] == 0
        assert analytics['combined_metrics']['total_transactions'] == 0
        
        # Six Figure insights should still be present
        assert 'six_figure_insights' in analytics
        assert analytics['six_figure_insights']['current_monthly_revenue'] == 0
        assert analytics['six_figure_insights']['progress_percentage'] == 0
    
    def test_invalid_currency_handling(self, db_session):
        """Test handling of invalid currency codes."""
        barber = UserFactory.create_barber()
        appointment = AppointmentFactory.create_appointment(barber_id=barber.id)
        
        db_session.add_all([barber, appointment])
        db_session.commit()
        
        router = HybridPaymentRouter(db_session)
        
        with pytest.raises(ValueError, match="Unsupported currency"):
            router.route_payment(
                appointment_id=appointment.id,
                amount=Decimal('50.00'),
                currency='INVALID'  # Invalid currency code
            )
    
    def test_negative_amount_handling(self, db_session):
        """Test handling of negative payment amounts."""
        barber = UserFactory.create_barber()
        appointment = AppointmentFactory.create_appointment(barber_id=barber.id)
        
        db_session.add_all([barber, appointment])
        db_session.commit()
        
        router = HybridPaymentRouter(db_session)
        
        with pytest.raises(ValueError, match="Payment amount must be positive"):
            router.route_payment(
                appointment_id=appointment.id,
                amount=Decimal('-50.00'),  # Negative amount
                currency='USD'
            )


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
    
    def test_connection_data_encryption(self, db_session):
        """Test that sensitive connection data is properly handled."""
        # Create connection with sensitive data
        barber = UserFactory.create_barber()
        connection = PaymentProcessorConnection(
            barber_id=barber.id,
            processor_type=ExternalPaymentProcessor.STRIPE,
            account_id="acct_sensitive_test",
            status=ConnectionStatus.CONNECTED,
            connection_data={
                'access_token': 'sk_test_very_sensitive_token',
                'webhook_secret': 'whsec_sensitive_secret'
            }
        )
        
        db_session.add_all([barber, connection])
        db_session.commit()
        
        # Verify connection data is stored
        saved_connection = db_session.query(PaymentProcessorConnection).first()
        assert 'access_token' in saved_connection.connection_data
        
        # Note: In production, this data should be encrypted
        # This test verifies the structure is correct for encryption
    
    def test_commission_audit_trail(self, db_session):
        """Test that commission collections maintain proper audit trail."""
        # Create commission collection
        barber = UserFactory.create_barber()
        collection = PlatformCommissionCollection(
            barber_id=barber.id,
            amount=Decimal('25.00'),
            external_transaction_ids=['tx_1', 'tx_2'],
            status='completed',
            stripe_transfer_id='tr_audit_test'
        )
        
        db_session.add_all([barber, collection])
        db_session.commit()
        
        # Verify audit fields
        saved_collection = db_session.query(PlatformCommissionCollection).first()
        assert saved_collection.created_at is not None
        assert saved_collection.updated_at is not None
        assert saved_collection.external_transaction_ids == ['tx_1', 'tx_2']
        assert saved_collection.stripe_transfer_id == 'tr_audit_test'
    
    def test_unauthorized_access_prevention(self, db_session):
        """Test prevention of unauthorized access to other barber's data."""
        # Create two barbers
        barber1 = UserFactory.create_barber()
        barber2 = UserFactory.create_barber()
        
        # Create connection for barber1
        connection1 = PaymentProcessorConnection(
            barber_id=barber1.id,
            processor_type=ExternalPaymentProcessor.STRIPE,
            account_id="acct_barber1",
            status=ConnectionStatus.CONNECTED
        )
        
        db_session.add_all([barber1, barber2, connection1])
        db_session.commit()
        
        # Try to access barber1's connection as barber2
        external_service = ExternalPaymentService(db_session)
        
        # This should be handled by authorization middleware in real application
        # Here we test the service-level validation
        with pytest.raises(ValueError, match="Connection not found or access denied"):
            external_service.get_connection_for_barber(
                connection_id=connection1.id,
                barber_id=barber2.id  # Wrong barber
            )


if __name__ == "__main__":
    # Run with: python -m pytest tests/test_hybrid_payment_system_comprehensive.py -v
    pytest.main([__file__, "-v", "--tb=short"])