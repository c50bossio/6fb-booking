"""
Gateway Selection Logic
Intelligently routes payments to the optimal gateway based on various factors
"""

import logging
from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from .base_gateway import GatewayType, PaymentGateway

logger = logging.getLogger(__name__)


class SelectionStrategy(Enum):
    """Gateway selection strategies"""
    LOWEST_COST = "lowest_cost"
    HIGHEST_SUCCESS_RATE = "highest_success_rate"
    ROUND_ROBIN = "round_robin"
    FAILOVER = "failover"
    GEOGRAPHIC = "geographic"
    CUSTOMER_PREFERENCE = "customer_preference"
    A_B_TEST = "a_b_test"


@dataclass
class GatewayMetrics:
    """Metrics for gateway performance tracking"""
    success_rate: float  # 0.0 to 1.0
    average_response_time: float  # milliseconds
    uptime: float  # 0.0 to 1.0
    transaction_fee: Decimal  # Fee per transaction
    percentage_fee: Decimal  # Percentage fee (e.g., 2.9%)
    last_health_check: float  # timestamp
    total_transactions: int
    failed_transactions: int
    
    @property
    def failure_rate(self) -> float:
        """Calculate failure rate"""
        return 1.0 - self.success_rate
    
    @property
    def is_healthy(self) -> bool:
        """Check if gateway is considered healthy"""
        return (
            self.success_rate >= 0.95 and  # 95% success rate
            self.uptime >= 0.99 and        # 99% uptime
            self.average_response_time <= 2000  # 2 second response time
        )


@dataclass
class SelectionContext:
    """Context for gateway selection"""
    amount: Decimal
    currency: str = "usd"
    customer_id: Optional[str] = None
    customer_country: Optional[str] = None
    payment_method_type: Optional[str] = None
    user_id: Optional[int] = None
    organization_id: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None
    
    # A/B testing
    test_group: Optional[str] = None
    
    # Risk factors
    is_high_risk: bool = False
    risk_score: float = 0.0


class GatewaySelector:
    """Intelligent gateway selection engine"""
    
    def __init__(self):
        self.gateway_metrics: Dict[GatewayType, GatewayMetrics] = {}
        self.gateway_configs: Dict[GatewayType, Dict[str, Any]] = {}
        self.selection_history: List[Tuple[GatewayType, float]] = []  # (gateway, timestamp)
        self.round_robin_index = 0
        
    def register_gateway_metrics(self, gateway_type: GatewayType, metrics: GatewayMetrics):
        """Register metrics for a gateway"""
        self.gateway_metrics[gateway_type] = metrics
        logger.info(f"Registered metrics for gateway: {gateway_type.value}")
    
    def update_gateway_config(self, gateway_type: GatewayType, config: Dict[str, Any]):
        """Update configuration for a gateway"""
        self.gateway_configs[gateway_type] = config
        logger.info(f"Updated config for gateway: {gateway_type.value}")
    
    def select_gateway(
        self,
        available_gateways: List[GatewayType],
        context: SelectionContext,
        strategy: SelectionStrategy = SelectionStrategy.LOWEST_COST
    ) -> GatewayType:
        """
        Select the optimal gateway for a payment.
        
        Args:
            available_gateways: List of available gateway types
            context: Payment context
            strategy: Selection strategy to use
            
        Returns:
            GatewayType: Selected gateway type
            
        Raises:
            ValueError: If no suitable gateway is found
        """
        if not available_gateways:
            raise ValueError("No available gateways")
        
        # Filter healthy gateways
        healthy_gateways = self._filter_healthy_gateways(available_gateways)
        if not healthy_gateways:
            logger.warning("No healthy gateways available, using all available")
            healthy_gateways = available_gateways
        
        # Apply strategy-specific selection
        if strategy == SelectionStrategy.LOWEST_COST:
            selected = self._select_lowest_cost(healthy_gateways, context)
        elif strategy == SelectionStrategy.HIGHEST_SUCCESS_RATE:
            selected = self._select_highest_success_rate(healthy_gateways, context)
        elif strategy == SelectionStrategy.ROUND_ROBIN:
            selected = self._select_round_robin(healthy_gateways)
        elif strategy == SelectionStrategy.FAILOVER:
            selected = self._select_failover(healthy_gateways, context)
        elif strategy == SelectionStrategy.GEOGRAPHIC:
            selected = self._select_geographic(healthy_gateways, context)
        elif strategy == SelectionStrategy.CUSTOMER_PREFERENCE:
            selected = self._select_customer_preference(healthy_gateways, context)
        elif strategy == SelectionStrategy.A_B_TEST:
            selected = self._select_a_b_test(healthy_gateways, context)
        else:
            selected = healthy_gateways[0]  # Default to first available
        
        # Record selection
        import time
        self.selection_history.append((selected, time.time()))
        
        logger.info(
            f"Selected gateway {selected.value} using strategy {strategy.value} "
            f"for amount {context.amount} {context.currency}"
        )
        
        return selected
    
    def _filter_healthy_gateways(self, gateways: List[GatewayType]) -> List[GatewayType]:
        """Filter to only healthy gateways"""
        healthy = []
        for gateway in gateways:
            if gateway in self.gateway_metrics:
                if self.gateway_metrics[gateway].is_healthy:
                    healthy.append(gateway)
            else:
                # If no metrics available, assume healthy
                healthy.append(gateway)
        return healthy
    
    def _select_lowest_cost(self, gateways: List[GatewayType], context: SelectionContext) -> GatewayType:
        """Select gateway with lowest cost for this transaction"""
        best_gateway = gateways[0]
        lowest_cost = float('inf')
        
        for gateway in gateways:
            cost = self._calculate_transaction_cost(gateway, context.amount)
            if cost < lowest_cost:
                lowest_cost = cost
                best_gateway = gateway
        
        return best_gateway
    
    def _select_highest_success_rate(self, gateways: List[GatewayType], context: SelectionContext) -> GatewayType:
        """Select gateway with highest success rate"""
        best_gateway = gateways[0]
        highest_rate = 0.0
        
        for gateway in gateways:
            if gateway in self.gateway_metrics:
                rate = self.gateway_metrics[gateway].success_rate
                if rate > highest_rate:
                    highest_rate = rate
                    best_gateway = gateway
        
        return best_gateway
    
    def _select_round_robin(self, gateways: List[GatewayType]) -> GatewayType:
        """Select gateway using round-robin strategy"""
        if not gateways:
            raise ValueError("No gateways available for round-robin")
        
        selected = gateways[self.round_robin_index % len(gateways)]
        self.round_robin_index += 1
        return selected
    
    def _select_failover(self, gateways: List[GatewayType], context: SelectionContext) -> GatewayType:
        """Select primary gateway, with automatic failover"""
        # Sort by priority (assuming first in list is primary)
        primary_order = [GatewayType.STRIPE, GatewayType.TILLED]  # Configure as needed
        
        for preferred in primary_order:
            if preferred in gateways:
                if preferred in self.gateway_metrics:
                    if self.gateway_metrics[preferred].is_healthy:
                        return preferred
                else:
                    return preferred  # No metrics, assume healthy
        
        # If no preferred gateway is healthy, return first available
        return gateways[0]
    
    def _select_geographic(self, gateways: List[GatewayType], context: SelectionContext) -> GatewayType:
        """Select gateway based on customer geography"""
        country = context.customer_country
        
        # Geographic preferences (example)
        if country in ["US", "CA", "MX"]:
            # North America - prefer Stripe or Tilled
            for gateway in [GatewayType.STRIPE, GatewayType.TILLED]:
                if gateway in gateways:
                    return gateway
        elif country in ["GB", "DE", "FR", "ES", "IT"]:
            # Europe - prefer Stripe
            if GatewayType.STRIPE in gateways:
                return GatewayType.STRIPE
        
        # Default fallback
        return gateways[0]
    
    def _select_customer_preference(self, gateways: List[GatewayType], context: SelectionContext) -> GatewayType:
        """Select gateway based on customer preference or history"""
        # This would typically look up customer's preferred gateway
        # For now, just use first available
        return gateways[0]
    
    def _select_a_b_test(self, gateways: List[GatewayType], context: SelectionContext) -> GatewayType:
        """Select gateway for A/B testing"""
        if not context.test_group:
            # No test group, use default selection
            return self._select_lowest_cost(gateways, context)
        
        # Simple A/B test based on test group
        if context.test_group == "A" and GatewayType.STRIPE in gateways:
            return GatewayType.STRIPE
        elif context.test_group == "B" and GatewayType.TILLED in gateways:
            return GatewayType.TILLED
        
        return gateways[0]
    
    def _calculate_transaction_cost(self, gateway_type: GatewayType, amount: Decimal) -> Decimal:
        """Calculate total cost for a transaction"""
        if gateway_type not in self.gateway_metrics:
            return Decimal("0")  # No metrics, assume no cost
        
        metrics = self.gateway_metrics[gateway_type]
        
        # Calculate fees: fixed + percentage
        fixed_fee = metrics.transaction_fee
        percentage_fee = amount * (metrics.percentage_fee / 100)
        
        return fixed_fee + percentage_fee
    
    def get_gateway_stats(self) -> Dict[str, Any]:
        """Get selection statistics"""
        import time
        from collections import Counter
        
        # Count selections in last hour
        one_hour_ago = time.time() - 3600
        recent_selections = [
            selection[0] for selection in self.selection_history
            if selection[1] >= one_hour_ago
        ]
        
        selection_counts = Counter(recent_selections)
        
        return {
            "total_selections": len(self.selection_history),
            "recent_selections": len(recent_selections),
            "selection_distribution": dict(selection_counts),
            "gateway_health": {
                gateway.value: metrics.is_healthy
                for gateway, metrics in self.gateway_metrics.items()
            }
        }
    
    def force_gateway_offline(self, gateway_type: GatewayType, reason: str = "Manual override"):
        """Temporarily mark a gateway as offline"""
        if gateway_type in self.gateway_metrics:
            self.gateway_metrics[gateway_type].uptime = 0.0
            logger.warning(f"Forced gateway {gateway_type.value} offline: {reason}")
    
    def restore_gateway_online(self, gateway_type: GatewayType):
        """Restore a gateway to online status"""
        if gateway_type in self.gateway_metrics:
            self.gateway_metrics[gateway_type].uptime = 1.0
            logger.info(f"Restored gateway {gateway_type.value} online")


# Default gateway metrics for testing/development
DEFAULT_GATEWAY_METRICS = {
    GatewayType.STRIPE: GatewayMetrics(
        success_rate=0.98,
        average_response_time=800,
        uptime=0.999,
        transaction_fee=Decimal("0.30"),
        percentage_fee=Decimal("2.9"),
        last_health_check=0,
        total_transactions=10000,
        failed_transactions=200
    ),
    GatewayType.TILLED: GatewayMetrics(
        success_rate=0.99,
        average_response_time=600,
        uptime=0.999,
        transaction_fee=Decimal("0.15"),
        percentage_fee=Decimal("2.5"),
        last_health_check=0,
        total_transactions=5000,
        failed_transactions=50
    )
}