"""
End-to-end tests for the hybrid payment system.

Tests complete payment flows from appointment creation to commission collection.
"""

import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, Mock

from sqlalchemy.orm import Session

from models import User, Appointment
from models.hybrid_payment import (
    PaymentMode, ExternalPaymentProcessor, 
    PaymentProcessorConnection, ExternalTransaction,
    PlatformCollection
)

from services.hybrid_payment_router import HybridPaymentRouter
from services.external_payment_service import ExternalPaymentService
from services.platform_collection_service import PlatformCollectionService
from services.unified_payment_analytics_service import UnifiedPaymentAnalyticsService

from tests.factories import (
    UserFactory, AppointmentFactory, PaymentFactory,
    PaymentProcessorConnectionFactory, ExternalTransactionFactory,
    PlatformCollectionFactory
)


class TestHybridPaymentEndToEnd:
    """Test complete end-to-end payment flows."""
    
    def test_centralized_payment_flow_complete(self, db):
        """Test complete centralized payment flow from appointment to analytics."""
        # Create centralized barber
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.CENTRALIZED.value,
            commission_rate=0.20
        )
        
        # Create appointment
        appointment = AppointmentFactory.create_appointment(
            user_id=barber.id,
            price=Decimal('75.00')
        )
        
        db.add_all([barber, appointment])
        db.commit()
        
        # Test payment routing
        router = HybridPaymentRouter(db)
        routing_decision, routing_details = router.route_payment(
            appointment_id=appointment.id,
            amount=Decimal('75.00'),
            currency='USD'
        )
        
        # Should route to centralized
        assert routing_decision.value == 'centralized'
        assert routing_details['processor'] == 'stripe_platform'
        
        # Simulate centralized payment
        payment = PaymentFactory.create_payment(
            barber_id=barber.id,
            appointment_id=appointment.id,
            amount=75.0,
            platform_fee=15.0,  # 20% commission
            barber_amount=60.0,
            status='completed'
        )
        
        db.add(payment)
        db.commit()
        
        # Test analytics aggregation
        analytics_service = UnifiedPaymentAnalyticsService(db)
        analytics = analytics_service.get_unified_analytics(barber.id)
        
        # Verify analytics
        assert analytics['centralized_payments']['total_transactions'] == 1
        assert analytics['centralized_payments']['total_volume'] == 75.0
        assert analytics['centralized_payments']['net_earnings'] == 60.0
        assert analytics['combined_metrics']['total_transactions'] == 1
        assert analytics['combined_metrics']['total_volume'] == 75.0
    
    def test_decentralized_payment_flow_complete(self, db):
        """Test complete decentralized payment flow with commission collection."""
        # Create decentralized barber
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.DECENTRALIZED.value,
            commission_rate=0.25
        )
        
        # Create payment processor connection
        connection = PaymentProcessorConnectionFactory.create_stripe_connection(
            barber_id=barber.id
        )
        
        # Create appointment
        appointment = AppointmentFactory.create_appointment(
            user_id=barber.id,
            price=Decimal('100.00')
        )
        
        db.add_all([barber, connection, appointment])
        db.commit()
        
        # Test payment routing
        router = HybridPaymentRouter(db)
        routing_decision, routing_details = router.route_payment(
            appointment_id=appointment.id,
            amount=Decimal('100.00'),
            currency='USD'
        )
        
        # Should route to external processor
        assert routing_decision.value == 'external'
        assert routing_details['processor'] == 'stripe'
        assert routing_details['connection_id'] == connection.id
        
        # Simulate external payment processing
        external_tx = ExternalTransactionFactory.create_stripe_transaction(
            connection_id=connection.id,
            barber_id=barber.id,
            amount=Decimal('100.00'),
            status='completed'
        )
        
        db.add(external_tx)
        db.commit()
        
        # Test commission collection
        collection_service = PlatformCollectionService(db)
        commission_collection = collection_service.collect_commission(
            barber_id=barber.id,
            external_transaction_ids=[external_tx.external_transaction_id]
        )
        
        # Verify commission collection
        assert commission_collection.amount == Decimal('25.00')  # 25% of $100
        assert commission_collection.barber_id == barber.id
        assert external_tx.external_transaction_id in commission_collection.external_transaction_ids
        
        # Test analytics aggregation
        analytics_service = UnifiedPaymentAnalyticsService(db)
        analytics = analytics_service.get_unified_analytics(barber.id)
        
        # Verify analytics include external transactions and commission
        assert analytics['decentralized_payments']['total_transactions'] == 1
        assert analytics['decentralized_payments']['total_volume'] == 100.0
        assert analytics['commission_data']['total_amount'] >= 25.0
        assert analytics['combined_metrics']['total_transactions'] == 1
        assert analytics['combined_metrics']['total_volume'] == 100.0
    
    def test_hybrid_barber_with_mixed_payments(self, db):
        """Test barber using both centralized and decentralized payments."""
        # Create barber (initially centralized, later switches to decentralized)
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.CENTRALIZED.value,
            commission_rate=0.22
        )
        
        # Create centralized payment (historical)
        centralized_payment = PaymentFactory.create_payment(
            barber_id=barber.id,
            amount=80.0,
            platform_fee=17.60,  # 22% commission
            barber_amount=62.40,
            status='completed',
            created_at=datetime.now(timezone.utc) - timedelta(days=30)
        )
        
        # Switch to decentralized mode
        barber.payment_mode = PaymentMode.DECENTRALIZED.value
        
        # Create external connection
        connection = PaymentProcessorConnectionFactory.create_square_connection(
            barber_id=barber.id
        )
        
        # Create external transaction (recent)
        external_tx = ExternalTransactionFactory.create_square_transaction(
            connection_id=connection.id,
            barber_id=barber.id,
            amount=Decimal('120.00'),
            status='completed',
            created_at=datetime.now(timezone.utc) - timedelta(days=5)
        )
        
        # Create commission collection
        commission_collection = PlatformCollectionFactory.create_commission_collection(
            barber_id=barber.id,
            amount=Decimal('26.40'),  # 22% of $120
            external_transaction_ids=[external_tx.external_transaction_id],
            commission_rate=22.0,
            status='completed'
        )
        
        db.add_all([
            barber, centralized_payment, connection, external_tx, commission_collection
        ])
        db.commit()
        
        # Test unified analytics
        analytics_service = UnifiedPaymentAnalyticsService(db)
        analytics = analytics_service.get_unified_analytics(barber.id)
        
        # Verify both payment modes are captured
        assert analytics['centralized_payments']['total_transactions'] == 1
        assert analytics['centralized_payments']['total_volume'] == 80.0
        assert analytics['decentralized_payments']['total_transactions'] == 1
        assert analytics['decentralized_payments']['total_volume'] == 120.0
        
        # Verify combined metrics
        combined = analytics['combined_metrics']
        assert combined['total_transactions'] == 2
        assert combined['total_volume'] == 200.0  # $80 + $120
        assert combined['total_commission_activity'] == 26.40
        
        # Verify mode comparison
        comparison = analytics['mode_comparison']
        assert comparison['optimal_mode'] == 'decentralized'  # Better efficiency
        assert 'volume_distribution' in comparison
    
    def test_payment_failure_handling_and_recovery(self, db):
        """Test handling of payment failures and recovery scenarios."""
        # Create decentralized barber
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.DECENTRALIZED.value,
            commission_rate=0.20
        )
        
        # Create connection
        connection = PaymentProcessorConnectionFactory.create_stripe_connection(
            barber_id=barber.id
        )
        
        db.add_all([barber, connection])
        db.commit()
        
        # Create failed external transaction
        failed_tx = ExternalTransactionFactory.create_stripe_transaction(
            connection_id=connection.id,
            barber_id=barber.id,
            amount=Decimal('90.00'),
            status='failed'
        )
        
        # Create successful transaction (retry)
        successful_tx = ExternalTransactionFactory.create_stripe_transaction(
            connection_id=connection.id,
            barber_id=barber.id,
            amount=Decimal('90.00'),
            status='completed'
        )
        
        db.add_all([failed_tx, successful_tx])
        db.commit()
        
        # Test commission collection (should only include successful transactions)
        collection_service = PlatformCollectionService(db)
        commission_collection = collection_service.collect_commission(
            barber_id=barber.id,
            external_transaction_ids=[
                failed_tx.external_transaction_id,
                successful_tx.external_transaction_id
            ]
        )
        
        # Should only collect commission on successful transaction
        assert commission_collection.amount == Decimal('18.00')  # 20% of $90
        assert len(commission_collection.external_transaction_ids) == 1
        assert successful_tx.external_transaction_id in commission_collection.external_transaction_ids
        assert failed_tx.external_transaction_id not in commission_collection.external_transaction_ids
        
        # Test analytics (should show proper success rates)
        analytics_service = UnifiedPaymentAnalyticsService(db)
        analytics = analytics_service.get_unified_analytics(barber.id)
        
        # Success rate should be 50% (1 successful out of 2 total)
        assert analytics['decentralized_payments']['success_rate'] == 50.0
        assert analytics['decentralized_payments']['total_transactions'] == 2
        assert analytics['decentralized_payments']['total_volume'] == 180.0  # Both transactions counted in volume
    
    @patch('services.external_payment_service.requests.post')
    def test_external_api_integration_flow(self, mock_post, db):
        """Test integration with external payment processor APIs."""
        # Mock successful API responses
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            'status': 'succeeded',
            'amount': 10000,  # $100.00 in cents
            'currency': 'usd'
        }
        
        # Create barber and connection
        barber = UserFactory.create_barber(
            payment_mode=PaymentMode.DECENTRALIZED.value
        )
        
        connection = PaymentProcessorConnectionFactory.create_stripe_connection(
            barber_id=barber.id
        )
        
        db.add_all([barber, connection])
        db.commit()
        
        # Test external payment service
        external_service = ExternalPaymentService(db)
        
        # Test connection validation
        is_valid = external_service.validate_connection(connection.id)
        assert is_valid is True
        
        # Test payment processing simulation
        payment_result = external_service.process_payment(
            connection_id=connection.id,
            amount=Decimal('100.00'),
            currency='USD'
        )
        
        # Verify payment processing
        assert payment_result['status'] == 'succeeded'
        assert payment_result['amount'] == Decimal('100.00')
        
        # Verify API was called
        mock_post.assert_called()
    
    def test_six_figure_barber_methodology_integration(self, db):
        """Test Six Figure Barber methodology integration across payment modes."""
        # Create barber with mixed payment history
        barber = UserFactory.create_barber(commission_rate=0.20)
        
        # Create payments across different modes to total $6,000/month
        # Centralized payments: $3,000
        for i in range(6):
            payment = PaymentFactory.create_payment(
                barber_id=barber.id,
                amount=625.0,  # Gross amount
                platform_fee=125.0,  # 20% commission
                barber_amount=500.0,  # Net to barber
                status='completed'
            )
            db.add(payment)
        
        # External transactions: $3,000 gross
        connection = PaymentProcessorConnectionFactory.create_stripe_connection(
            barber_id=barber.id
        )
        
        external_transactions = []
        for i in range(4):
            tx = ExternalTransactionFactory.create_stripe_transaction(
                connection_id=connection.id,
                barber_id=barber.id,
                amount=Decimal('750.00'),  # $3,000 total
                status='completed'
            )
            external_transactions.append(tx)
            db.add(tx)
        
        # Commission collection: 20% of $3,000 = $600
        commission_collection = PlatformCollectionFactory.create_commission_collection(
            barber_id=barber.id,
            amount=Decimal('600.00'),
            external_transaction_ids=[tx.external_transaction_id for tx in external_transactions],
            commission_rate=20.0,
            status='completed'
        )
        
        db.add_all([barber, connection, commission_collection])
        db.commit()
        
        # Test Six Figure Barber insights
        analytics_service = UnifiedPaymentAnalyticsService(db)
        analytics = analytics_service.get_unified_analytics(
            barber_id=barber.id,
            include_projections=True
        )
        
        # Verify Six Figure insights
        six_figure = analytics['six_figure_insights']
        
        # Net earnings: $3,000 (centralized) + $2,400 (external - commission) = $5,400
        current_monthly = six_figure['current_monthly_revenue']
        assert current_monthly == 5400.0  # 6 * $500 + (4 * $750 - $600)
        
        # Progress toward $100K annually ($8,333.33/month target)
        target_monthly = six_figure['target_monthly_revenue']
        assert target_monthly == 8333.33
        
        progress_percentage = six_figure['progress_percentage']
        expected_progress = (5400.0 / 8333.33) * 100
        assert abs(progress_percentage - expected_progress) < 1.0
        
        # Verify recommendations include mode optimization
        recommendations = analytics['recommendations']
        assert len(recommendations) > 0
        
        # Verify projected annual
        projected_annual = six_figure['projected_annual']
        assert projected_annual == 64800.0  # $5,400 * 12 months


if __name__ == "__main__":
    # Run with: python -m pytest tests/e2e/test_hybrid_payment_end_to_end.py -v
    pytest.main([__file__, "-v", "--tb=short"])