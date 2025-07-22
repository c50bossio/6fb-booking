"""
Comprehensive tests for the multi-gateway payment system
"""

import pytest
import asyncio
from decimal import Decimal
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any

from services.payment_gateways import (
    PaymentGateway, PaymentIntent, PaymentResult, RefundResult,
    PayoutResult, CustomerResult, WebhookEvent, GatewayError,
    GatewayType, PaymentStatus, RefundStatus, PaymentMethod
)
from services.payment_gateways.gateway_factory import PaymentGatewayFactory
from services.payment_gateways.gateway_selector import (
    GatewaySelector, SelectionContext, SelectionStrategy, GatewayMetrics
)
from services.payment_gateways.gateway_manager import PaymentGatewayManager
from services.payment_gateways.stripe_gateway import StripeGateway
from services.payment_gateways.tilled_gateway import TilledGateway


class MockGateway(PaymentGateway):
    """Mock gateway for testing"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.gateway_type = GatewayType.STRIPE  # Mock as Stripe
        self.calls = []
        self.should_fail = config.get('should_fail', False)
        self.response_delay = config.get('response_delay', 0)
    
    @property
    def gateway_name(self) -> str:
        return "Mock Gateway"
    
    @property
    def supported_currencies(self) -> list[str]:
        return ["usd", "eur"]
    
    @property
    def supported_countries(self) -> list[str]:
        return ["US", "CA", "GB"]
    
    async def create_payment_intent(self, amount: Decimal, currency: str = "usd", **kwargs) -> PaymentIntent:
        self.calls.append(('create_payment_intent', amount, currency, kwargs))
        
        if self.response_delay:
            await asyncio.sleep(self.response_delay)
        
        if self.should_fail:
            raise GatewayError("Mock failure", code="MOCK_ERROR", gateway_type=self.gateway_type)
        
        return PaymentIntent(
            id="pi_mock_123",
            amount=amount,
            currency=currency,
            status=PaymentStatus.SUCCEEDED,
            client_secret="pi_mock_123_secret",
            metadata=kwargs.get('metadata', {})
        )
    
    async def confirm_payment(self, payment_intent_id: str, **kwargs) -> PaymentResult:
        self.calls.append(('confirm_payment', payment_intent_id, kwargs))
        
        if self.should_fail:
            raise GatewayError("Mock confirmation failure", code="MOCK_ERROR", gateway_type=self.gateway_type)
        
        return PaymentResult(
            id="ch_mock_123",
            payment_intent_id=payment_intent_id,
            amount=Decimal("10.00"),
            currency="usd",
            status=PaymentStatus.SUCCEEDED,
            gateway_transaction_id="ch_mock_123"
        )
    
    async def get_payment(self, payment_id: str) -> PaymentResult:
        return PaymentResult(
            id=payment_id,
            payment_intent_id="pi_mock_123",
            amount=Decimal("10.00"),
            currency="usd",
            status=PaymentStatus.SUCCEEDED
        )
    
    async def create_refund(self, payment_id: str, amount: Decimal = None, **kwargs) -> RefundResult:
        self.calls.append(('create_refund', payment_id, amount, kwargs))
        
        return RefundResult(
            id="re_mock_123",
            payment_id=payment_id,
            amount=amount or Decimal("10.00"),
            currency="usd",
            status=RefundStatus.SUCCEEDED
        )
    
    async def get_refund(self, refund_id: str) -> RefundResult:
        return RefundResult(
            id=refund_id,
            payment_id="ch_mock_123",
            amount=Decimal("10.00"),
            currency="usd",
            status=RefundStatus.SUCCEEDED
        )
    
    async def create_customer(self, email: str = None, **kwargs) -> CustomerResult:
        return CustomerResult(
            id="cus_mock_123",
            email=email,
            gateway_customer_id="cus_mock_123"
        )
    
    async def get_customer(self, customer_id: str) -> CustomerResult:
        return CustomerResult(
            id=customer_id,
            gateway_customer_id=customer_id
        )
    
    async def create_payout(self, amount: Decimal, destination_account: str, **kwargs) -> PayoutResult:
        return PayoutResult(
            id="po_mock_123",
            amount=amount,
            currency="usd",
            status="completed",
            destination_account=destination_account
        )
    
    async def verify_webhook(self, payload: bytes, signature: str, secret: str) -> bool:
        return True
    
    async def parse_webhook_event(self, payload: bytes, signature: str, secret: str) -> WebhookEvent:
        return WebhookEvent(
            id="evt_mock_123",
            type="payment_intent.succeeded",
            data={},
            created=datetime.now(),
            livemode=False,
            gateway_type=self.gateway_type,
            raw_event={}
        )
    
    async def health_check(self) -> Dict[str, Any]:
        return {
            "healthy": not self.should_fail,
            "response_time_ms": 100,
            "calls": len(self.calls)
        }
    
    async def get_supported_features(self) -> Dict[str, bool]:
        return {
            "payment_intents": True,
            "refunds": True,
            "customers": True
        }


@pytest.fixture
def mock_gateway_config():
    return {
        'api_key': 'test_key',
        'webhook_secret': 'test_secret',
        'test_mode': True
    }


@pytest.fixture
def failing_gateway_config():
    return {
        'api_key': 'test_key',
        'webhook_secret': 'test_secret',
        'test_mode': True,
        'should_fail': True
    }


@pytest.fixture
def slow_gateway_config():
    return {
        'api_key': 'test_key',
        'webhook_secret': 'test_secret',
        'test_mode': True,
        'response_delay': 0.1
    }


class TestPaymentGatewayFactory:
    """Test gateway factory functionality"""
    
    def test_register_gateway(self):
        """Test gateway registration"""
        factory = PaymentGatewayFactory()
        factory.register_gateway(GatewayType.STRIPE, MockGateway)
        
        assert GatewayType.STRIPE in factory._gateways
        assert factory.is_gateway_registered(GatewayType.STRIPE)
    
    def test_create_gateway(self, mock_gateway_config):
        """Test gateway creation"""
        factory = PaymentGatewayFactory()
        factory.register_gateway(GatewayType.STRIPE, MockGateway)
        
        gateway = factory.create_gateway(GatewayType.STRIPE, mock_gateway_config)
        
        assert isinstance(gateway, MockGateway)
        assert gateway.config == mock_gateway_config
    
    def test_create_unregistered_gateway(self, mock_gateway_config):
        """Test creating unregistered gateway raises error"""
        factory = PaymentGatewayFactory()
        
        with pytest.raises(GatewayError) as exc_info:
            factory.create_gateway(GatewayType.TILLED, mock_gateway_config)
        
        assert "not registered" in str(exc_info.value)
    
    def test_gateway_caching(self, mock_gateway_config):
        """Test gateway instance caching"""
        factory = PaymentGatewayFactory()
        factory.register_gateway(GatewayType.STRIPE, MockGateway)
        
        gateway1 = factory.create_gateway(GatewayType.STRIPE, mock_gateway_config, "test_instance")
        gateway2 = factory.create_gateway(GatewayType.STRIPE, mock_gateway_config, "test_instance")
        
        assert gateway1 is gateway2  # Same instance
    
    def test_clear_cache(self, mock_gateway_config):
        """Test cache clearing"""
        factory = PaymentGatewayFactory()
        factory.register_gateway(GatewayType.STRIPE, MockGateway)
        
        gateway1 = factory.create_gateway(GatewayType.STRIPE, mock_gateway_config, "test_instance")
        factory.clear_cache("test_instance")
        gateway2 = factory.create_gateway(GatewayType.STRIPE, mock_gateway_config, "test_instance")
        
        assert gateway1 is not gateway2  # Different instances


class TestGatewaySelector:
    """Test gateway selection logic"""
    
    def test_register_gateway_metrics(self):
        """Test registering gateway metrics"""
        selector = GatewaySelector()
        metrics = GatewayMetrics(
            success_rate=0.99,
            average_response_time=500,
            uptime=0.999,
            transaction_fee=Decimal("0.30"),
            percentage_fee=Decimal("2.9"),
            last_health_check=0,
            total_transactions=1000,
            failed_transactions=10
        )
        
        selector.register_gateway_metrics(GatewayType.STRIPE, metrics)
        
        assert GatewayType.STRIPE in selector.gateway_metrics
        assert selector.gateway_metrics[GatewayType.STRIPE].is_healthy
    
    def test_select_lowest_cost(self):
        """Test lowest cost selection strategy"""
        selector = GatewaySelector()
        
        # Register Stripe with higher fees
        stripe_metrics = GatewayMetrics(
            success_rate=0.99,
            average_response_time=500,
            uptime=0.999,
            transaction_fee=Decimal("0.30"),
            percentage_fee=Decimal("2.9"),
            last_health_check=0,
            total_transactions=1000,
            failed_transactions=10
        )
        selector.register_gateway_metrics(GatewayType.STRIPE, stripe_metrics)
        
        # Register Tilled with lower fees
        tilled_metrics = GatewayMetrics(
            success_rate=0.99,
            average_response_time=400,
            uptime=0.999,
            transaction_fee=Decimal("0.15"),
            percentage_fee=Decimal("2.5"),
            last_health_check=0,
            total_transactions=500,
            failed_transactions=5
        )
        selector.register_gateway_metrics(GatewayType.TILLED, tilled_metrics)
        
        context = SelectionContext(amount=Decimal("100.00"))
        selected = selector.select_gateway(
            [GatewayType.STRIPE, GatewayType.TILLED],
            context,
            SelectionStrategy.LOWEST_COST
        )
        
        assert selected == GatewayType.TILLED  # Lower cost option
    
    def test_select_highest_success_rate(self):
        """Test highest success rate selection strategy"""
        selector = GatewaySelector()
        
        # Register gateways with different success rates
        stripe_metrics = GatewayMetrics(
            success_rate=0.95,  # Lower success rate
            average_response_time=500,
            uptime=0.999,
            transaction_fee=Decimal("0.30"),
            percentage_fee=Decimal("2.9"),
            last_health_check=0,
            total_transactions=1000,
            failed_transactions=50
        )
        selector.register_gateway_metrics(GatewayType.STRIPE, stripe_metrics)
        
        tilled_metrics = GatewayMetrics(
            success_rate=0.99,  # Higher success rate
            average_response_time=400,
            uptime=0.999,
            transaction_fee=Decimal("0.15"),
            percentage_fee=Decimal("2.5"),
            last_health_check=0,
            total_transactions=500,
            failed_transactions=5
        )
        selector.register_gateway_metrics(GatewayType.TILLED, tilled_metrics)
        
        context = SelectionContext(amount=Decimal("100.00"))
        selected = selector.select_gateway(
            [GatewayType.STRIPE, GatewayType.TILLED],
            context,
            SelectionStrategy.HIGHEST_SUCCESS_RATE
        )
        
        assert selected == GatewayType.TILLED  # Higher success rate
    
    def test_round_robin_selection(self):
        """Test round robin selection strategy"""
        selector = GatewaySelector()
        
        available_gateways = [GatewayType.STRIPE, GatewayType.TILLED]
        context = SelectionContext(amount=Decimal("100.00"))
        
        # Test round robin behavior
        first = selector.select_gateway(available_gateways, context, SelectionStrategy.ROUND_ROBIN)
        second = selector.select_gateway(available_gateways, context, SelectionStrategy.ROUND_ROBIN)
        third = selector.select_gateway(available_gateways, context, SelectionStrategy.ROUND_ROBIN)
        
        assert first != second
        assert first == third  # Should cycle back
    
    def test_force_gateway_offline(self):
        """Test forcing gateway offline"""
        selector = GatewaySelector()
        
        metrics = GatewayMetrics(
            success_rate=0.99,
            average_response_time=500,
            uptime=0.999,
            transaction_fee=Decimal("0.30"),
            percentage_fee=Decimal("2.9"),
            last_health_check=0,
            total_transactions=1000,
            failed_transactions=10
        )
        selector.register_gateway_metrics(GatewayType.STRIPE, metrics)
        
        assert selector.gateway_metrics[GatewayType.STRIPE].is_healthy
        
        selector.force_gateway_offline(GatewayType.STRIPE, "Testing")
        
        assert not selector.gateway_metrics[GatewayType.STRIPE].is_healthy


class TestPaymentGatewayManager:
    """Test payment gateway manager"""
    
    @pytest.fixture
    def manager_config(self):
        return {
            'gateways': {
                'stripe': {
                    'api_key': 'test_stripe_key',
                    'webhook_secret': 'test_stripe_secret',
                    'test_mode': True
                },
                'tilled': {
                    'api_key': 'test_tilled_key',
                    'webhook_secret': 'test_tilled_secret',
                    'test_mode': True
                }
            },
            'default_selection_strategy': 'lowest_cost',
            'failover_enabled': True,
            'auto_health_checks': False  # Disable for testing
        }
    
    @pytest.fixture
    def manager_with_mocks(self, manager_config):
        """Create manager with mock gateways"""
        # Register mock gateways
        PaymentGatewayFactory.register_gateway(GatewayType.STRIPE, MockGateway)
        PaymentGatewayFactory.register_gateway(GatewayType.TILLED, MockGateway)
        
        return PaymentGatewayManager(manager_config)
    
    @pytest.mark.asyncio
    async def test_create_payment_intent(self, manager_with_mocks):
        """Test payment intent creation through manager"""
        manager = manager_with_mocks
        
        result = await manager.create_payment_intent(
            amount=Decimal("10.00"),
            currency="usd",
            metadata={'test': 'data'}
        )
        
        assert isinstance(result, PaymentIntent)
        assert result.amount == Decimal("10.00")
        assert result.currency == "usd"
        assert result.metadata['test'] == 'data'
    
    @pytest.mark.asyncio
    async def test_payment_intent_with_preferred_gateway(self, manager_with_mocks):
        """Test payment intent creation with preferred gateway"""
        manager = manager_with_mocks
        
        result = await manager.create_payment_intent(
            amount=Decimal("10.00"),
            preferred_gateway=GatewayType.TILLED
        )
        
        assert isinstance(result, PaymentIntent)
        assert result.metadata.get('gateway_type') == 'tilled'
    
    @pytest.mark.asyncio
    async def test_failover_on_gateway_failure(self):
        """Test failover when primary gateway fails"""
        config = {
            'gateways': {
                'stripe': {
                    'api_key': 'test_key',
                    'should_fail': True  # Make this gateway fail
                },
                'tilled': {
                    'api_key': 'test_key',
                    'should_fail': False  # This should work
                }
            },
            'failover_enabled': True,
            'auto_health_checks': False
        }
        
        # Register mock gateways
        PaymentGatewayFactory.register_gateway(GatewayType.STRIPE, MockGateway)
        PaymentGatewayFactory.register_gateway(GatewayType.TILLED, MockGateway)
        
        manager = PaymentGatewayManager(config)
        
        # Should succeed via failover to Tilled
        result = await manager.create_payment_intent(
            amount=Decimal("10.00"),
            preferred_gateway=GatewayType.STRIPE  # This will fail and trigger failover
        )
        
        assert isinstance(result, PaymentIntent)
    
    @pytest.mark.asyncio
    async def test_confirm_payment(self, manager_with_mocks):
        """Test payment confirmation through manager"""
        manager = manager_with_mocks
        
        result = await manager.confirm_payment("pi_test_123")
        
        assert isinstance(result, PaymentResult)
        assert result.payment_intent_id == "pi_test_123"
        assert result.status == PaymentStatus.SUCCEEDED
    
    @pytest.mark.asyncio
    async def test_create_refund(self, manager_with_mocks):
        """Test refund creation through manager"""
        manager = manager_with_mocks
        
        result = await manager.create_refund(
            payment_id="ch_test_123",
            amount=Decimal("5.00"),
            reason="customer_request"
        )
        
        assert isinstance(result, RefundResult)
        assert result.amount == Decimal("5.00")
        assert result.payment_id == "ch_test_123"
    
    @pytest.mark.asyncio
    async def test_health_check_all(self, manager_with_mocks):
        """Test health check for all gateways"""
        manager = manager_with_mocks
        
        results = await manager.health_check_all()
        
        assert isinstance(results, dict)
        assert len(results) >= 1  # At least one gateway
        
        for gateway_type, result in results.items():
            assert 'healthy' in result
            assert isinstance(result['healthy'], bool)
    
    def test_get_gateway_stats(self, manager_with_mocks):
        """Test getting gateway statistics"""
        manager = manager_with_mocks
        
        stats = manager.get_gateway_stats()
        
        assert isinstance(stats, dict)
        assert 'available_gateways' in stats
        assert 'selection_stats' in stats
        assert 'gateway_metrics' in stats


class TestStripeGateway:
    """Test Stripe gateway implementation"""
    
    @pytest.fixture
    def stripe_config(self):
        return {
            'api_key': 'sk_test_123',
            'webhook_secret': 'whsec_test',
            'api_version': '2023-10-16',
            'test_mode': True
        }
    
    def test_stripe_gateway_initialization(self, stripe_config):
        """Test Stripe gateway initialization"""
        gateway = StripeGateway(stripe_config)
        
        assert gateway.gateway_name == "Stripe"
        assert gateway.gateway_type == GatewayType.STRIPE
        assert "usd" in gateway.supported_currencies
        assert "US" in gateway.supported_countries
    
    def test_amount_validation(self, stripe_config):
        """Test amount validation"""
        gateway = StripeGateway(stripe_config)
        
        assert gateway.validate_amount(Decimal("1.00"), "usd")
        assert not gateway.validate_amount(Decimal("0.25"), "usd")  # Below minimum
        assert gateway.validate_amount(Decimal("999999.99"), "usd")
    
    def test_amount_formatting(self, stripe_config):
        """Test amount formatting for Stripe API"""
        gateway = StripeGateway(stripe_config)
        
        # USD should be in cents
        assert gateway.format_amount_for_gateway(Decimal("10.00"), "usd") == 1000
        assert gateway.format_amount_from_gateway(1000, "usd") == Decimal("10.00")
    
    @pytest.mark.asyncio
    async def test_supported_features(self, stripe_config):
        """Test getting supported features"""
        gateway = StripeGateway(stripe_config)
        
        features = await gateway.get_supported_features()
        
        assert features['payment_intents']
        assert features['refunds']
        assert features['customers']
        assert features['webhooks']
        assert features['marketplace']


class TestTilledGateway:
    """Test Tilled gateway implementation"""
    
    @pytest.fixture
    def tilled_config(self):
        return {
            'api_key': 'tld_test_123',
            'webhook_secret': 'tld_whsec_test',
            'environment': 'sandbox',
            'account_id': 'acct_test',
            'test_mode': True
        }
    
    def test_tilled_gateway_initialization(self, tilled_config):
        """Test Tilled gateway initialization"""
        gateway = TilledGateway(tilled_config)
        
        assert gateway.gateway_name == "Tilled"
        assert gateway.gateway_type == GatewayType.TILLED
        assert gateway.supported_currencies == ["usd"]
        assert gateway.supported_countries == ["US"]
        assert "sandbox-api.tilled.com" in gateway.base_url
    
    def test_amount_validation(self, tilled_config):
        """Test Tilled amount validation (USD only)"""
        gateway = TilledGateway(tilled_config)
        
        assert gateway.validate_amount(Decimal("1.00"), "usd")
        assert not gateway.validate_amount(Decimal("0.25"), "usd")  # Below minimum
        assert not gateway.validate_amount(Decimal("10.00"), "eur")  # Unsupported currency
    
    @pytest.mark.asyncio
    async def test_supported_features(self, tilled_config):
        """Test getting Tilled supported features"""
        gateway = TilledGateway(tilled_config)
        
        features = await gateway.get_supported_features()
        
        assert features['payment_intents']
        assert features['refunds']
        assert features['customers']
        assert features['webhooks']
        assert features['marketplace']
        assert not features['subscriptions']  # Not supported by Tilled yet


class TestGatewayIntegration:
    """Integration tests for the complete gateway system"""
    
    @pytest.mark.asyncio
    async def test_end_to_end_payment_flow(self):
        """Test complete payment flow from intent to confirmation"""
        # Setup
        PaymentGatewayFactory.register_gateway(GatewayType.STRIPE, MockGateway)
        
        config = {
            'gateways': {
                'stripe': {
                    'api_key': 'test_key',
                    'webhook_secret': 'test_secret'
                }
            },
            'auto_health_checks': False
        }
        
        manager = PaymentGatewayManager(config)
        
        # Create payment intent
        intent = await manager.create_payment_intent(
            amount=Decimal("25.50"),
            currency="usd",
            metadata={'order_id': '12345'}
        )
        
        assert intent.amount == Decimal("25.50")
        assert intent.currency == "usd"
        
        # Confirm payment
        result = await manager.confirm_payment(intent.id)
        
        assert result.payment_intent_id == intent.id
        assert result.status == PaymentStatus.SUCCEEDED
        
        # Create refund
        refund = await manager.create_refund(
            payment_id=result.id,
            amount=Decimal("10.00"),
            reason="customer_request"
        )
        
        assert refund.amount == Decimal("10.00")
        assert refund.payment_id == result.id
    
    @pytest.mark.asyncio
    async def test_webhook_processing(self):
        """Test webhook event processing"""
        PaymentGatewayFactory.register_gateway(GatewayType.STRIPE, MockGateway)
        
        config = {
            'gateways': {
                'stripe': {
                    'api_key': 'test_key',
                    'webhook_secret': 'test_secret'
                }
            },
            'auto_health_checks': False
        }
        
        manager = PaymentGatewayManager(config)
        
        # Test webhook processing
        webhook_event = await manager.handle_webhook(
            payload=b'{"type": "payment_intent.succeeded"}',
            signature="test_signature",
            gateway_type=GatewayType.STRIPE,
            secret="test_secret"
        )
        
        assert isinstance(webhook_event, WebhookEvent)
        assert webhook_event.gateway_type == GatewayType.STRIPE
    
    @pytest.mark.asyncio
    async def test_gateway_selection_strategies(self):
        """Test different gateway selection strategies"""
        PaymentGatewayFactory.register_gateway(GatewayType.STRIPE, MockGateway)
        PaymentGatewayFactory.register_gateway(GatewayType.TILLED, MockGateway)
        
        config = {
            'gateways': {
                'stripe': {'api_key': 'test_key1'},
                'tilled': {'api_key': 'test_key2'}
            },
            'auto_health_checks': False
        }
        
        manager = PaymentGatewayManager(config)
        
        # Test with different strategies
        strategies = [
            SelectionStrategy.LOWEST_COST,
            SelectionStrategy.ROUND_ROBIN,
            SelectionStrategy.HIGHEST_SUCCESS_RATE
        ]
        
        for strategy in strategies:
            intent = await manager.create_payment_intent(
                amount=Decimal("10.00"),
                strategy=strategy
            )
            
            assert isinstance(intent, PaymentIntent)
            assert intent.amount == Decimal("10.00")


@pytest.mark.asyncio
async def test_performance_and_concurrency():
    """Test gateway system performance under concurrent load"""
    PaymentGatewayFactory.register_gateway(GatewayType.STRIPE, MockGateway)
    
    config = {
        'gateways': {
            'stripe': {
                'api_key': 'test_key',
                'response_delay': 0.01  # Small delay to simulate network
            }
        },
        'auto_health_checks': False
    }
    
    manager = PaymentGatewayManager(config)
    
    # Create multiple concurrent payment intents
    tasks = []
    for i in range(10):
        task = manager.create_payment_intent(
            amount=Decimal(f"{i + 10}.00"),
            metadata={'test_id': str(i)}
        )
        tasks.append(task)
    
    # Execute all tasks concurrently
    results = await asyncio.gather(*tasks)
    
    # Verify all succeeded
    assert len(results) == 10
    for i, result in enumerate(results):
        assert isinstance(result, PaymentIntent)
        assert result.amount == Decimal(f"{i + 10}.00")
        assert result.metadata['test_id'] == str(i)


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])