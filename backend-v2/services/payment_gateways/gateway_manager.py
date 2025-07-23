"""
Payment Gateway Manager
High-level interface for managing multiple payment gateways
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Union
from decimal import Decimal
from datetime import datetime, timedelta

from .base_gateway import (
    PaymentGateway, PaymentIntent, PaymentResult, RefundResult,
    PayoutResult, CustomerResult, WebhookEvent, GatewayType, GatewayError
)
from .gateway_factory import PaymentGatewayFactory
from .gateway_selector import GatewaySelector, SelectionContext, SelectionStrategy, GatewayMetrics

logger = logging.getLogger(__name__)


class PaymentGatewayManager:
    """
    Manages multiple payment gateways with intelligent routing,
    failover, and performance monitoring.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the gateway manager.
        
        Args:
            config: Configuration for all gateways and manager settings
        """
        self.config = config
        self.gateways: Dict[GatewayType, PaymentGateway] = {}
        self.selector = GatewaySelector()
        self.health_check_interval = config.get('health_check_interval', 300)  # 5 minutes
        self.last_health_check = {}
        self.failover_enabled = config.get('failover_enabled', True)
        self.default_strategy = SelectionStrategy(
            config.get('default_selection_strategy', 'lowest_cost')
        )
        
        # Initialize gateways from config
        self._initialize_gateways()
        
        # Start background tasks
        if config.get('auto_health_checks', True):
            asyncio.create_task(self._health_check_loop())
    
    def _initialize_gateways(self):
        """Initialize all configured gateways"""
        gateway_configs = self.config.get('gateways', {})
        
        for gateway_name, gateway_config in gateway_configs.items():
            try:
                gateway_type = GatewayType(gateway_name.lower())
                
                # Create gateway instance
                gateway = PaymentGatewayFactory.create_gateway(
                    gateway_type, 
                    gateway_config,
                    instance_name=f"{gateway_name}_primary"
                )
                
                self.gateways[gateway_type] = gateway
                
                # Initialize metrics
                self.selector.register_gateway_metrics(
                    gateway_type,
                    self._get_default_metrics(gateway_type)
                )
                
                logger.info(f"Initialized gateway: {gateway_name}")
                
            except Exception as e:
                logger.error(f"Failed to initialize gateway {gateway_name}: {e}")
                if gateway_config.get('required', True):
                    raise
    
    def _get_default_metrics(self, gateway_type: GatewayType) -> GatewayMetrics:
        """Get default metrics for a gateway type"""
        # These would typically come from historical data or configuration
        default_metrics = {
            GatewayType.STRIPE: GatewayMetrics(
                success_rate=0.98,
                average_response_time=800,
                uptime=0.999,
                transaction_fee=Decimal("0.30"),
                percentage_fee=Decimal("2.9"),
                last_health_check=0,
                total_transactions=0,
                failed_transactions=0
            ),
            GatewayType.TILLED: GatewayMetrics(
                success_rate=0.99,
                average_response_time=600,
                uptime=0.999,
                transaction_fee=Decimal("0.15"),
                percentage_fee=Decimal("2.5"),
                last_health_check=0,
                total_transactions=0,
                failed_transactions=0
            )
        }
        
        return default_metrics.get(gateway_type, GatewayMetrics(
            success_rate=0.95,
            average_response_time=1000,
            uptime=0.99,
            transaction_fee=Decimal("0.30"),
            percentage_fee=Decimal("2.9"),
            last_health_check=0,
            total_transactions=0,
            failed_transactions=0
        ))
    
    async def create_payment_intent(
        self,
        amount: Decimal,
        currency: str = "usd",
        metadata: Optional[Dict[str, Any]] = None,
        customer_id: Optional[str] = None,
        payment_method_types: Optional[List[str]] = None,
        selection_context: Optional[SelectionContext] = None,
        preferred_gateway: Optional[GatewayType] = None,
        strategy: Optional[SelectionStrategy] = None,
        **kwargs
    ) -> PaymentIntent:
        """
        Create a payment intent using the optimal gateway.
        
        Args:
            amount: Payment amount
            currency: Currency code
            metadata: Additional metadata
            customer_id: Customer ID
            payment_method_types: Allowed payment method types
            selection_context: Context for gateway selection
            preferred_gateway: Preferred gateway (if available)
            strategy: Selection strategy to use
            **kwargs: Additional gateway-specific parameters
            
        Returns:
            PaymentIntent: Created payment intent
            
        Raises:
            GatewayError: If payment intent creation fails
        """
        # Create selection context if not provided
        if not selection_context:
            selection_context = SelectionContext(
                amount=amount,
                currency=currency,
                customer_id=customer_id,
                metadata=metadata
            )
        
        # Select gateway
        available_gateways = list(self.gateways.keys())
        if preferred_gateway and preferred_gateway in available_gateways:
            selected_gateway_type = preferred_gateway
        else:
            strategy = strategy or self.default_strategy
            selected_gateway_type = self.selector.select_gateway(
                available_gateways, selection_context, strategy
            )
        
        gateway = self.gateways[selected_gateway_type]
        
        try:
            # Create payment intent
            start_time = datetime.now()
            payment_intent = await gateway.create_payment_intent(
                amount=amount,
                currency=currency,
                metadata=metadata,
                customer_id=customer_id,
                payment_method_types=payment_method_types,
                **kwargs
            )
            
            # Update metrics
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            self._update_gateway_metrics(selected_gateway_type, success=True, response_time=response_time)
            
            # Add gateway info to metadata
            if not payment_intent.metadata:
                payment_intent.metadata = {}
            payment_intent.metadata['gateway_type'] = selected_gateway_type.value
            payment_intent.metadata['selection_strategy'] = strategy.value if strategy else self.default_strategy.value
            
            return payment_intent
            
        except Exception as e:
            # Update metrics for failure
            self._update_gateway_metrics(selected_gateway_type, success=False)
            
            # Try failover if enabled
            if self.failover_enabled and len(available_gateways) > 1:
                logger.warning(f"Payment intent creation failed on {selected_gateway_type.value}, trying failover")
                return await self._create_payment_intent_failover(
                    amount, currency, metadata, customer_id, payment_method_types,
                    exclude_gateway=selected_gateway_type, **kwargs
                )
            
            raise GatewayError(
                f"Payment intent creation failed on {selected_gateway_type.value}: {str(e)}",
                code="PAYMENT_INTENT_FAILED",
                gateway_type=selected_gateway_type
            ) from e
    
    async def confirm_payment(
        self,
        payment_intent_id: str,
        gateway_type: Optional[GatewayType] = None,
        payment_method: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> PaymentResult:
        """
        Confirm a payment intent.
        
        Args:
            payment_intent_id: ID of the payment intent
            gateway_type: Gateway type (if known, otherwise will determine from intent)
            payment_method: Payment method details
            metadata: Additional metadata
            **kwargs: Gateway-specific parameters
            
        Returns:
            PaymentResult: Result of payment confirmation
            
        Raises:
            GatewayError: If payment confirmation fails
        """
        # Determine gateway if not provided
        if not gateway_type:
            gateway_type = self._determine_gateway_from_intent_id(payment_intent_id)
        
        gateway = self.gateways.get(gateway_type)
        if not gateway:
            raise GatewayError(
                f"Gateway {gateway_type.value} not available",
                code="GATEWAY_NOT_AVAILABLE",
                gateway_type=gateway_type
            )
        
        try:
            start_time = datetime.now()
            result = await gateway.confirm_payment(
                payment_intent_id=payment_intent_id,
                payment_method=payment_method,
                metadata=metadata,
                **kwargs
            )
            
            # Update metrics
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            self._update_gateway_metrics(gateway_type, success=True, response_time=response_time)
            
            return result
            
        except Exception as e:
            self._update_gateway_metrics(gateway_type, success=False)
            raise GatewayError(
                f"Payment confirmation failed on {gateway_type.value}: {str(e)}",
                code="PAYMENT_CONFIRMATION_FAILED",
                gateway_type=gateway_type
            ) from e
    
    async def create_refund(
        self,
        payment_id: str,
        amount: Optional[Decimal] = None,
        reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        gateway_type: Optional[GatewayType] = None,
        **kwargs
    ) -> RefundResult:
        """
        Create a refund for a payment.
        
        Args:
            payment_id: ID of the payment to refund
            amount: Amount to refund (full refund if None)
            reason: Reason for refund
            metadata: Additional metadata
            gateway_type: Gateway type (if known)
            **kwargs: Gateway-specific parameters
            
        Returns:
            RefundResult: Result of refund creation
            
        Raises:
            GatewayError: If refund creation fails
        """
        # Determine gateway if not provided
        if not gateway_type:
            gateway_type = self._determine_gateway_from_payment_id(payment_id)
        
        gateway = self.gateways.get(gateway_type)
        if not gateway:
            raise GatewayError(
                f"Gateway {gateway_type.value} not available",
                code="GATEWAY_NOT_AVAILABLE",
                gateway_type=gateway_type
            )
        
        try:
            result = await gateway.create_refund(
                payment_id=payment_id,
                amount=amount,
                reason=reason,
                metadata=metadata,
                **kwargs
            )
            
            self._update_gateway_metrics(gateway_type, success=True)
            return result
            
        except Exception as e:
            self._update_gateway_metrics(gateway_type, success=False)
            raise GatewayError(
                f"Refund creation failed on {gateway_type.value}: {str(e)}",
                code="REFUND_CREATION_FAILED",
                gateway_type=gateway_type
            ) from e
    
    async def handle_webhook(
        self,
        payload: bytes,
        signature: str,
        gateway_type: GatewayType,
        secret: Optional[str] = None
    ) -> WebhookEvent:
        """
        Handle a webhook event from a specific gateway.
        
        Args:
            payload: Raw webhook payload
            signature: Webhook signature
            gateway_type: Type of gateway sending webhook
            secret: Webhook secret (if not in config)
            
        Returns:
            WebhookEvent: Parsed webhook event
            
        Raises:
            GatewayError: If webhook processing fails
        """
        gateway = self.gateways.get(gateway_type)
        if not gateway:
            raise GatewayError(
                f"Gateway {gateway_type.value} not available for webhook",
                code="GATEWAY_NOT_AVAILABLE",
                gateway_type=gateway_type
            )
        
        # Use configured secret if not provided
        if not secret:
            secret = self.config.get('gateways', {}).get(gateway_type.value, {}).get('webhook_secret')
        
        try:
            event = await gateway.parse_webhook_event(payload, signature, secret)
            logger.info(f"Processed webhook event {event.type} from {gateway_type.value}")
            return event
            
        except Exception as e:
            logger.error(f"Webhook processing failed for {gateway_type.value}: {e}")
            raise GatewayError(
                f"Webhook processing failed on {gateway_type.value}: {str(e)}",
                code="WEBHOOK_PROCESSING_FAILED",
                gateway_type=gateway_type
            ) from e
    
    async def health_check_all(self) -> Dict[GatewayType, Dict[str, Any]]:
        """
        Run health checks on all gateways.
        
        Returns:
            Dict mapping gateway types to health check results
        """
        results = {}
        
        for gateway_type, gateway in self.gateways.items():
            try:
                start_time = datetime.now()
                health_result = await gateway.health_check()
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                
                results[gateway_type] = {
                    "healthy": True,
                    "response_time": response_time,
                    "details": health_result
                }
                
                # Update metrics
                self._update_gateway_health(gateway_type, True, response_time)
                
            except Exception as e:
                results[gateway_type] = {
                    "healthy": False,
                    "error": str(e),
                    "response_time": None
                }
                
                # Update metrics
                self._update_gateway_health(gateway_type, False)
                
                logger.error(f"Health check failed for {gateway_type.value}: {e}")
        
        return results
    
    def get_gateway_stats(self) -> Dict[str, Any]:
        """Get comprehensive gateway statistics"""
        return {
            "available_gateways": [gt.value for gt in self.gateways.keys()],
            "selection_stats": self.selector.get_gateway_stats(),
            "gateway_metrics": {
                gt.value: {
                    "success_rate": metrics.success_rate,
                    "average_response_time": metrics.average_response_time,
                    "uptime": metrics.uptime,
                    "is_healthy": metrics.is_healthy,
                    "total_transactions": metrics.total_transactions,
                    "failed_transactions": metrics.failed_transactions
                }
                for gt, metrics in self.selector.gateway_metrics.items()
            }
        }
    
    def force_gateway_offline(self, gateway_type: GatewayType, reason: str = "Manual override"):
        """Force a gateway offline"""
        self.selector.force_gateway_offline(gateway_type, reason)
        logger.warning(f"Forced gateway {gateway_type.value} offline: {reason}")
    
    def restore_gateway_online(self, gateway_type: GatewayType):
        """Restore a gateway to online status"""
        self.selector.restore_gateway_online(gateway_type)
        logger.info(f"Restored gateway {gateway_type.value} online")
    
    # Private helper methods
    
    async def _create_payment_intent_failover(
        self,
        amount: Decimal,
        currency: str,
        metadata: Optional[Dict[str, Any]],
        customer_id: Optional[str],
        payment_method_types: Optional[List[str]],
        exclude_gateway: GatewayType,
        **kwargs
    ) -> PaymentIntent:
        """Create payment intent with failover logic"""
        available_gateways = [gt for gt in self.gateways.keys() if gt != exclude_gateway]
        
        if not available_gateways:
            raise GatewayError(
                "No failover gateways available",
                code="NO_FAILOVER_GATEWAYS"
            )
        
        # Try each remaining gateway
        for gateway_type in available_gateways:
            try:
                gateway = self.gateways[gateway_type]
                payment_intent = await gateway.create_payment_intent(
                    amount=amount,
                    currency=currency,
                    metadata=metadata,
                    customer_id=customer_id,
                    payment_method_types=payment_method_types,
                    **kwargs
                )
                
                logger.info(f"Failover successful to {gateway_type.value}")
                return payment_intent
                
            except Exception as e:
                logger.warning(f"Failover to {gateway_type.value} failed: {e}")
                self._update_gateway_metrics(gateway_type, success=False)
                continue
        
        raise GatewayError("All failover attempts failed", code="ALL_FAILOVERS_FAILED")
    
    def _determine_gateway_from_intent_id(self, intent_id: str) -> GatewayType:
        """Determine gateway type from payment intent ID format"""
        # Stripe intents start with 'pi_'
        if intent_id.startswith('pi_'):
            return GatewayType.STRIPE
        # Tilled intents typically start with different prefix
        elif intent_id.startswith('tld_'):
            return GatewayType.TILLED
        
        # Default to first available gateway
        return list(self.gateways.keys())[0]
    
    def _determine_gateway_from_payment_id(self, payment_id: str) -> GatewayType:
        """Determine gateway type from payment ID format"""
        # Similar logic to intent ID determination
        if payment_id.startswith('ch_') or payment_id.startswith('py_'):
            return GatewayType.STRIPE
        elif payment_id.startswith('tld_'):
            return GatewayType.TILLED
        
        return list(self.gateways.keys())[0]
    
    def _update_gateway_metrics(
        self,
        gateway_type: GatewayType,
        success: bool,
        response_time: Optional[float] = None
    ):
        """Update gateway performance metrics"""
        if gateway_type not in self.selector.gateway_metrics:
            return
        
        metrics = self.selector.gateway_metrics[gateway_type]
        
        # Update transaction counts
        metrics.total_transactions += 1
        if not success:
            metrics.failed_transactions += 1
        
        # Update success rate (using exponential moving average)
        new_success_rate = 1.0 if success else 0.0
        alpha = 0.1  # Smoothing factor
        metrics.success_rate = (1 - alpha) * metrics.success_rate + alpha * new_success_rate
        
        # Update response time
        if response_time is not None:
            metrics.average_response_time = (
                (1 - alpha) * metrics.average_response_time + alpha * response_time
            )
    
    def _update_gateway_health(
        self,
        gateway_type: GatewayType,
        is_healthy: bool,
        response_time: Optional[float] = None
    ):
        """Update gateway health metrics"""
        if gateway_type not in self.selector.gateway_metrics:
            return
        
        metrics = self.selector.gateway_metrics[gateway_type]
        
        # Update uptime
        metrics.uptime = 1.0 if is_healthy else 0.0
        metrics.last_health_check = datetime.now().timestamp()
        
        if response_time is not None:
            alpha = 0.1
            metrics.average_response_time = (
                (1 - alpha) * metrics.average_response_time + alpha * response_time
            )
    
    async def _health_check_loop(self):
        """Background task for periodic health checks"""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                await self.health_check_all()
            except Exception as e:
                logger.error(f"Health check loop error: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying