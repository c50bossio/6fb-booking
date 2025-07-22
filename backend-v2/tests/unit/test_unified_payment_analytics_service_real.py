"""
Unit Tests for Unified Payment Analytics Service

Tests the unified analytics service that combines data from:
- Centralized platform payments 
- Decentralized external processor payments
- Commission collections
- Six Figure Barber methodology tracking
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch, MagicMock
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models import User, Payment
from models.hybrid_payment import (
    ExternalTransaction, PlatformCollection,
    ExternalPaymentProcessor
)

from services.unified_payment_analytics_service import (
    UnifiedPaymentAnalyticsService, AnalyticsPeriod, PaymentAnalyticsMetric
)

from tests.factories import UserFactory, PaymentFactory


class TestUnifiedPaymentAnalyticsService:
    """Test unified payment analytics service functionality."""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session."""
        engine = create_engine("sqlite:///:memory:", echo=False)
        
        # Drop all tables first, then create them
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = TestingSessionLocal()
        
        try:
            yield session
        finally:
            session.close()
            # Clean up
            Base.metadata.drop_all(engine)
            engine.dispose()
    
    def test_analytics_period_enum(self):
        """Test AnalyticsPeriod enum values."""
        assert AnalyticsPeriod.LAST_7_DAYS.value == "7_days"
        assert AnalyticsPeriod.LAST_30_DAYS.value == "30_days"
        assert AnalyticsPeriod.LAST_90_DAYS.value == "90_days"
        assert AnalyticsPeriod.LAST_6_MONTHS.value == "6_months"
        assert AnalyticsPeriod.LAST_YEAR.value == "1_year"
        assert AnalyticsPeriod.ALL_TIME.value == "all_time"
    
    def test_payment_analytics_metric_enum(self):
        """Test PaymentAnalyticsMetric enum values."""
        expected_metrics = ["revenue", "transactions", "success_rate", "commission", "net_earnings", "average_transaction"]
        
        for metric in PaymentAnalyticsMetric:
            assert metric.value in expected_metrics
    
    def test_get_unified_analytics_basic(self, db_session):
        """Test basic unified analytics functionality."""
        # Create barber with mixed payment history
        barber = UserFactory.create_barber(commission_rate=0.20)
        
        # Create centralized payments
        centralized_payment = PaymentFactory.create_payment(
            barber_id=barber.id,
            amount=100.0,
            platform_fee=20.0,
            barber_amount=80.0,
            status='completed',
            created_at=datetime.now(timezone.utc) - timedelta(days=5)
        )
        
        db_session.add_all([barber, centralized_payment])
        db_session.commit()
        
        # Get analytics
        analytics_service = UnifiedPaymentAnalyticsService(db_session)
        result = analytics_service.get_unified_analytics(
            barber_id=barber.id,
            period=AnalyticsPeriod.LAST_30_DAYS
        )
        
        # Verify basic structure
        assert 'period' in result
        assert 'date_range' in result
        assert 'centralized_payments' in result
        assert 'decentralized_payments' in result
        assert 'commission_data' in result
        assert 'combined_metrics' in result
        assert 'trend_analysis' in result
        assert 'mode_comparison' in result
        assert 'six_figure_insights' in result
        assert 'recommendations' in result
        
        # Verify centralized payments data
        centralized = result['centralized_payments']
        assert centralized['total_transactions'] == 1
        assert centralized['total_volume'] == 100.0
        assert centralized['net_earnings'] == 80.0
        assert centralized['success_rate'] == 100.0
        
        # Verify combined metrics
        combined = result['combined_metrics']
        assert combined['total_transactions'] == 1
        assert combined['total_volume'] == 100.0
        assert combined['total_net_earnings'] == 80.0
    
    def test_get_unified_analytics_with_external_transactions(self, db_session):
        """Test analytics with external payment processor transactions."""
        barber = UserFactory.create_barber(commission_rate=0.25)
        
        # Create centralized payment
        centralized_payment = PaymentFactory.create_payment(
            barber_id=barber.id,
            amount=75.0,
            platform_fee=18.75,
            barber_amount=56.25,
            status='completed'
        )
        
        # Create external transactions
        external_tx1 = ExternalTransaction(
            connection_id=1,
            processor_type=ExternalPaymentProcessor.STRIPE,
            external_transaction_id="stripe_analytics_1",
            amount=Decimal('120.00'),
            currency='USD',
            status='completed',
            barber_id=barber.id,
            created_at=datetime.now(timezone.utc) - timedelta(days=2)
        )
        
        external_tx2 = ExternalTransaction(
            connection_id=1,
            processor_type=ExternalPaymentProcessor.SQUARE,
            external_transaction_id="square_analytics_1",
            amount=Decimal('90.00'),
            currency='USD',
            status='completed',
            barber_id=barber.id,
            created_at=datetime.now(timezone.utc) - timedelta(days=1)
        )
        
        # Create commission collection
        commission_collection = PlatformCollection(
            barber_id=barber.id,
            amount=Decimal('52.50'),  # 25% of ($120 + $90)
            external_transaction_ids=['stripe_analytics_1', 'square_analytics_1'],
            status='completed'
        )
        
        db_session.add_all([
            barber, centralized_payment, external_tx1, external_tx2, commission_collection
        ])
        db_session.commit()
        
        # Get analytics
        analytics_service = UnifiedPaymentAnalyticsService(db_session)
        result = analytics_service.get_unified_analytics(
            barber_id=barber.id,
            period=AnalyticsPeriod.LAST_30_DAYS
        )
        
        # Verify centralized payments
        centralized = result['centralized_payments']
        assert centralized['total_transactions'] == 1
        assert centralized['total_volume'] == 75.0
        assert centralized['net_earnings'] == 56.25
        
        # Verify decentralized payments
        decentralized = result['decentralized_payments']
        assert decentralized['total_transactions'] == 2
        assert decentralized['total_volume'] == 210.0  # $120 + $90
        assert decentralized['success_rate'] == 100.0
        
        # Verify commission data
        commission = result['commission_data']
        assert commission['total_amount'] == 52.50
        assert commission['amount_collected'] == 52.50
        assert commission['success_rate'] == 100.0
        
        # Verify combined metrics
        combined = result['combined_metrics']
        assert combined['total_transactions'] == 3
        assert combined['total_volume'] == 285.0  # $75 + $210
        assert combined['total_commission_activity'] == 52.50
    
    def test_get_real_time_dashboard_data(self, db_session):
        """Test real-time dashboard data generation."""
        barber = UserFactory.create_barber()
        
        # Create today's payment
        today_payment = PaymentFactory.create_payment(
            barber_id=barber.id,
            amount=85.0,
            barber_amount=68.0,
            status='completed',
            created_at=datetime.now(timezone.utc)
        )
        
        # Create month-to-date external transaction
        mtd_external = ExternalTransaction(
            connection_id=1,
            processor_type=ExternalPaymentProcessor.STRIPE,
            external_transaction_id="stripe_mtd_1",
            amount=Decimal('110.00'),
            currency='USD',
            status='completed',
            barber_id=barber.id,
            created_at=datetime.now(timezone.utc) - timedelta(days=10)
        )
        
        db_session.add_all([barber, today_payment, mtd_external])
        db_session.commit()
        
        # Get real-time dashboard data
        analytics_service = UnifiedPaymentAnalyticsService(db_session)
        result = analytics_service.get_real_time_dashboard_data(barber.id)
        
        # Verify structure
        assert 'today' in result
        assert 'month_to_date' in result
        assert 'outstanding_commission' in result
        assert 'recent_transactions' in result
        assert 'last_updated' in result
        
        # Verify today's data
        today_data = result['today']
        assert today_data['total_transactions'] >= 1
        assert today_data['total_net_earnings'] >= 68.0
        
        # Verify month-to-date includes both payments
        mtd_data = result['month_to_date']
        assert mtd_data['total_transactions'] >= 2
        assert mtd_data['total_volume'] >= 195.0  # $85 + $110
    
    def test_get_revenue_optimization_insights(self, db_session):
        """Test revenue optimization insights generation."""
        # Create barber with different payment mode performance
        barber = UserFactory.create_barber(
            payment_mode='centralized',  # Currently using centralized
            commission_rate=0.20
        )
        
        # Create centralized payments (current mode)
        for i in range(3):
            payment = PaymentFactory.create_payment(
                barber_id=barber.id,
                amount=60.0,
                platform_fee=12.0,  # 20% commission
                barber_amount=48.0,
                status='completed',
                created_at=datetime.now(timezone.utc) - timedelta(days=i*5)
            )
            db_session.add(payment)
        
        # Create some external transactions (simulating potential decentralized mode)
        for i in range(2):
            transaction = ExternalTransaction(
                connection_id=1,
                processor_type=ExternalPaymentProcessor.STRIPE,
                external_transaction_id=f"stripe_opt_{i}",
                amount=Decimal('60.00'),
                currency='USD',
                status='completed',
                barber_id=barber.id,
                created_at=datetime.now(timezone.utc) - timedelta(days=i*7)
            )
            db_session.add(transaction)
        
        db_session.add(barber)
        db_session.commit()
        
        # Get optimization insights
        analytics_service = UnifiedPaymentAnalyticsService(db_session)
        result = analytics_service.get_revenue_optimization_insights(barber.id)
        
        # Verify structure
        assert 'current_mode' in result
        assert 'optimal_mode' in result
        assert 'potential_monthly_increase' in result
        assert 'switching_roi' in result
        assert 'recommendations' in result
        assert 'analysis_period' in result
        assert 'confidence_score' in result
        
        # Verify current mode detected
        assert result['current_mode'] == 'centralized'
        
        # Verify recommendations are present
        assert len(result['recommendations']) > 0
        assert isinstance(result['confidence_score'], float)
        assert 0 <= result['confidence_score'] <= 1
    
    def test_six_figure_barber_insights(self, db_session):
        """Test Six Figure Barber methodology insights."""
        barber = UserFactory.create_barber(commission_rate=0.20)
        
        # Create payments totaling $4,000/month (48K annually)
        monthly_earnings = Decimal('4000.00')
        
        # Create payments to reach this monthly total
        payments = []
        for i in range(8):  # 8 payments of $500 each
            payment = PaymentFactory.create_payment(
                barber_id=barber.id,
                amount=625.0,  # Gross amount
                platform_fee=125.0,  # 20% commission
                barber_amount=500.0,  # Net to barber
                status='completed',
                created_at=datetime.now(timezone.utc) - timedelta(days=i*3)
            )
            payments.append(payment)
        
        db_session.add_all([barber] + payments)
        db_session.commit()
        
        # Get analytics with Six Figure insights
        analytics_service = UnifiedPaymentAnalyticsService(db_session)
        result = analytics_service.get_unified_analytics(
            barber_id=barber.id,
            period=AnalyticsPeriod.LAST_30_DAYS,
            include_projections=True
        )
        
        # Verify Six Figure insights
        six_figure = result['six_figure_insights']
        
        assert six_figure['target_annual_revenue'] == 100000.0
        assert six_figure['target_monthly_revenue'] == 8333.33
        
        # Verify current progress calculation
        current_monthly = six_figure['current_monthly_revenue']
        assert current_monthly == 4000.0  # 8 payments * $500 net
        
        # Verify progress percentage
        progress = six_figure['progress_percentage']
        expected_progress = (4000.0 / 8333.33) * 100
        assert abs(progress - expected_progress) < 1.0  # Allow small rounding difference
        
        # Verify projected annual
        projected_annual = six_figure['projected_annual']
        assert projected_annual == 48000.0  # $4000 * 12 months
        
        # Verify recommendations
        recommendations = six_figure['recommendations']
        assert len(recommendations) > 0
        assert any('increase' in rec.lower() for rec in recommendations)
    
    def test_trend_analysis_calculation(self, db_session):
        """Test trend analysis with period-over-period comparison."""
        barber = UserFactory.create_barber()
        
        # Create current period payments (last 30 days)
        current_period_start = datetime.now(timezone.utc) - timedelta(days=30)
        for i in range(5):
            payment = PaymentFactory.create_payment(
                barber_id=barber.id,
                amount=100.0,
                barber_amount=80.0,
                status='completed',
                created_at=current_period_start + timedelta(days=i*6)
            )
            db_session.add(payment)
        
        # Create previous period payments (31-60 days ago) - lower volume
        previous_period_start = datetime.now(timezone.utc) - timedelta(days=60)
        for i in range(3):
            payment = PaymentFactory.create_payment(
                barber_id=barber.id,
                amount=80.0,
                barber_amount=64.0,
                status='completed',
                created_at=previous_period_start + timedelta(days=i*10)
            )
            db_session.add(payment)
        
        db_session.add(barber)
        db_session.commit()
        
        # Get analytics with trend analysis
        analytics_service = UnifiedPaymentAnalyticsService(db_session)
        result = analytics_service.get_unified_analytics(
            barber_id=barber.id,
            period=AnalyticsPeriod.LAST_30_DAYS
        )
        
        # Verify trend analysis
        trend = result['trend_analysis']
        
        # Current period: 5 payments * $100 = $500 volume
        # Previous period: 3 payments * $80 = $240 volume
        # Growth: ($500 - $240) / $240 = 108.33%
        
        assert 'total_volume_trend' in trend
        assert 'total_transactions_trend' in trend
        assert 'net_earnings_trend' in trend
        
        # Should show positive growth
        assert trend['total_volume_trend'] > 0
        assert trend['total_transactions_trend'] > 0
        assert trend['net_earnings_trend'] > 0
    
    def test_mode_comparison_analysis(self, db_session):
        """Test payment mode comparison analysis."""
        barber = UserFactory.create_barber(commission_rate=0.20)
        
        # Create centralized payments
        centralized_payments = []
        for i in range(4):
            payment = PaymentFactory.create_payment(
                barber_id=barber.id,
                amount=75.0,
                platform_fee=15.0,  # 20% commission
                barber_amount=60.0,
                status='completed'
            )
            centralized_payments.append(payment)
        
        # Create external transactions (decentralized)
        external_transactions = []
        for i in range(3):
            transaction = ExternalTransaction(
                connection_id=1,
                processor_type=ExternalPaymentProcessor.STRIPE,
                external_transaction_id=f"stripe_compare_{i}",
                amount=Decimal('85.00'),
                currency='USD',
                status='completed',
                barber_id=barber.id
            )
            external_transactions.append(transaction)
        
        # Create commission collections for external transactions
        commission_collection = PlatformCollection(
            barber_id=barber.id,
            amount=Decimal('51.00'),  # 20% of (3 * $85)
            external_transaction_ids=[f"stripe_compare_{i}" for i in range(3)],
            status='completed'
        )
        
        db_session.add_all(
            [barber] + centralized_payments + external_transactions + [commission_collection]
        )
        db_session.commit()
        
        # Get analytics
        analytics_service = UnifiedPaymentAnalyticsService(db_session)
        result = analytics_service.get_unified_analytics(
            barber_id=barber.id,
            period=AnalyticsPeriod.LAST_30_DAYS
        )
        
        # Verify mode comparison
        comparison = result['mode_comparison']
        
        assert 'centralized_efficiency' in comparison
        assert 'decentralized_efficiency' in comparison
        assert 'optimal_mode' in comparison
        assert 'volume_distribution' in comparison
        
        # Verify efficiency calculations
        # Centralized: 4 payments * $60 net = $240 net from $300 gross = 80% efficiency
        # Decentralized: 3 payments * $85 gross - $51 commission = $204 net from $255 gross = 80% efficiency
        
        centralized_eff = comparison['centralized_efficiency']
        decentralized_eff = comparison['decentralized_efficiency']
        
        assert 0 <= centralized_eff <= 1
        assert 0 <= decentralized_eff <= 1
        
        # Verify volume distribution
        distribution = comparison['volume_distribution']
        assert 'centralized_percentage' in distribution
        assert 'decentralized_percentage' in distribution
        
        # Total volume: $300 (centralized) + $255 (decentralized) = $555
        # Centralized: $300 / $555 = 54.05%
        # Decentralized: $255 / $555 = 45.95%
        
        expected_centralized_pct = (300.0 / 555.0) * 100
        expected_decentralized_pct = (255.0 / 555.0) * 100
        
        assert abs(distribution['centralized_percentage'] - expected_centralized_pct) < 1.0
        assert abs(distribution['decentralized_percentage'] - expected_decentralized_pct) < 1.0
    
    def test_analytics_period_filtering(self, db_session):
        """Test analytics period filtering works correctly."""
        barber = UserFactory.create_barber()
        
        # Create payments across different time periods
        now = datetime.now(timezone.utc)
        
        # Payment within 7 days
        recent_payment = PaymentFactory.create_payment(
            barber_id=barber.id,
            amount=100.0,
            status='completed',
            created_at=now - timedelta(days=3)
        )
        
        # Payment within 30 days but outside 7 days
        medium_payment = PaymentFactory.create_payment(
            barber_id=barber.id,
            amount=150.0,
            status='completed',
            created_at=now - timedelta(days=15)
        )
        
        # Payment outside 30 days
        old_payment = PaymentFactory.create_payment(
            barber_id=barber.id,
            amount=200.0,
            status='completed',
            created_at=now - timedelta(days=45)
        )
        
        db_session.add_all([barber, recent_payment, medium_payment, old_payment])
        db_session.commit()
        
        analytics_service = UnifiedPaymentAnalyticsService(db_session)
        
        # Test 7-day period
        result_7d = analytics_service.get_unified_analytics(
            barber_id=barber.id,
            period=AnalyticsPeriod.LAST_7_DAYS
        )
        
        # Should only include recent payment
        assert result_7d['centralized_payments']['total_transactions'] == 1
        assert result_7d['centralized_payments']['total_volume'] == 100.0
        
        # Test 30-day period
        result_30d = analytics_service.get_unified_analytics(
            barber_id=barber.id,
            period=AnalyticsPeriod.LAST_30_DAYS
        )
        
        # Should include recent and medium payments
        assert result_30d['centralized_payments']['total_transactions'] == 2
        assert result_30d['centralized_payments']['total_volume'] == 250.0
        
        # Test all-time period
        result_all = analytics_service.get_unified_analytics(
            barber_id=barber.id,
            period=AnalyticsPeriod.ALL_TIME
        )
        
        # Should include all payments
        assert result_all['centralized_payments']['total_transactions'] == 3
        assert result_all['centralized_payments']['total_volume'] == 450.0
    
    def test_error_handling_invalid_barber_id(self, db_session):
        """Test error handling for invalid barber ID."""
        analytics_service = UnifiedPaymentAnalyticsService(db_session)
        
        with pytest.raises(ValueError, match="Barber 99999 not found"):
            analytics_service.get_unified_analytics(
                barber_id=99999,
                period=AnalyticsPeriod.LAST_30_DAYS
            )
    
    def test_recommendations_generation(self, db_session):
        """Test automated recommendations generation."""
        barber = UserFactory.create_barber(
            payment_mode='centralized',
            commission_rate=0.25  # High commission rate
        )
        
        # Create centralized payments with high commission
        for i in range(5):
            payment = PaymentFactory.create_payment(
                barber_id=barber.id,
                amount=80.0,
                platform_fee=20.0,  # 25% commission
                barber_amount=60.0,
                status='completed'
            )
            db_session.add(payment)
        
        db_session.add(barber)
        db_session.commit()
        
        # Get analytics
        analytics_service = UnifiedPaymentAnalyticsService(db_session)
        result = analytics_service.get_unified_analytics(
            barber_id=barber.id,
            period=AnalyticsPeriod.LAST_30_DAYS
        )
        
        # Verify recommendations are generated
        recommendations = result['recommendations']
        assert len(recommendations) > 0
        
        # Should recommend switching to decentralized mode due to high commission
        recommendation_text = ' '.join(recommendations).lower()
        assert any(keyword in recommendation_text for keyword in ['decentralized', 'external', 'switch'])
    
    def test_success_rate_calculation(self, db_session):
        """Test success rate calculation across payment modes."""
        barber = UserFactory.create_barber()
        
        # Create mix of successful and failed payments
        successful_payment = PaymentFactory.create_payment(
            barber_id=barber.id,
            amount=100.0,
            status='completed'
        )
        
        failed_payment = PaymentFactory.create_payment(
            barber_id=barber.id,
            amount=50.0,
            status='failed'
        )
        
        # Create external transactions
        successful_external = ExternalTransaction(
            connection_id=1,
            processor_type=ExternalPaymentProcessor.STRIPE,
            external_transaction_id="stripe_success",
            amount=Decimal('75.00'),
            currency='USD',
            status='completed',
            barber_id=barber.id
        )
        
        failed_external = ExternalTransaction(
            connection_id=1,
            processor_type=ExternalPaymentProcessor.STRIPE,
            external_transaction_id="stripe_failed",
            amount=Decimal('60.00'),
            currency='USD',
            status='failed',
            barber_id=barber.id
        )
        
        db_session.add_all([
            barber, successful_payment, failed_payment,
            successful_external, failed_external
        ])
        db_session.commit()
        
        # Get analytics
        analytics_service = UnifiedPaymentAnalyticsService(db_session)
        result = analytics_service.get_unified_analytics(
            barber_id=barber.id,
            period=AnalyticsPeriod.LAST_30_DAYS
        )
        
        # Verify success rates
        centralized = result['centralized_payments']
        # 1 successful out of 2 total = 50%
        assert centralized['success_rate'] == 50.0
        
        decentralized = result['decentralized_payments']
        # 1 successful out of 2 total = 50%
        assert decentralized['success_rate'] == 50.0
        
        # Verify weighted success rate in combined metrics
        combined = result['combined_metrics']
        # 2 successful out of 4 total = 50%
        assert combined['weighted_success_rate'] == 50.0


if __name__ == "__main__":
    # Run with: python -m pytest tests/unit/test_unified_payment_analytics_service_real.py -v
    pytest.main([__file__, "-v", "--tb=short"])