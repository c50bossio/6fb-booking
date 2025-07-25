"""
Unified Commission Framework for BookedBarber V2
Provides a single source of truth for all commission calculations.
"""

from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Dict, Any, List, Union
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class CommissionType(Enum):
    """Types of commission calculations"""
    SERVICE = "service"           # Commission from appointments/services
    RETAIL = "retail"            # Commission from product sales (orders)
    POS = "pos"                  # Commission from POS transactions
    GIFT_CERTIFICATE = "gift_certificate"  # Commission from gift certificate sales


class CommissionCalculationMode(Enum):
    """Commission calculation modes"""
    PERCENTAGE = "percentage"     # Percentage of total amount
    FIXED = "fixed"              # Fixed amount per transaction
    TIERED = "tiered"            # Tiered percentage based on volume
    HYBRID = "hybrid"            # Combination of fixed + percentage


class BaseCommissionCalculator(ABC):
    """
    Abstract base class for all commission calculations.
    Provides consistent interface and validation.
    """
    
    def __init__(self):
        self.commission_type = None
        self.calculation_mode = CommissionCalculationMode.PERCENTAGE
        
    @abstractmethod
    def calculate_commission(self, amount: Decimal, rate: Decimal, **kwargs) -> Dict[str, Decimal]:
        """
        Calculate commission for a given amount and rate.
        
        Args:
            amount: The base amount to calculate commission on
            rate: The commission rate (percentage or fixed amount)
            **kwargs: Additional parameters specific to commission type
            
        Returns:
            Dict containing commission breakdown
        """
        
    @abstractmethod
    def validate_rate(self, rate: Decimal) -> bool:
        """Validate commission rate for this calculator type"""
        
    def _validate_amount(self, amount: Union[Decimal, float]) -> Decimal:
        """Validate and convert amount to Decimal"""
        if isinstance(amount, float):
            amount = Decimal(str(amount))
        elif not isinstance(amount, Decimal):
            amount = Decimal(str(amount))
            
        if amount < 0:
            raise ValueError("Amount cannot be negative")
            
        return amount.quantize(Decimal('0.01'))
        
    def _validate_percentage_rate(self, rate: Union[Decimal, float]) -> Decimal:
        """Validate percentage rate (0.0 to 1.0)"""
        if isinstance(rate, float):
            rate = Decimal(str(rate))
        elif not isinstance(rate, Decimal):
            rate = Decimal(str(rate))
            
        if rate < 0 or rate > 1:
            raise ValueError("Commission rate must be between 0.0 and 1.0")
            
        return rate.quantize(Decimal('0.0001'))


class ServiceCommissionCalculator(BaseCommissionCalculator):
    """
    Calculator for service-based commissions (appointments).
    Uses percentage-based calculation with platform fee and barber amount.
    """
    
    def __init__(self):
        super().__init__()
        self.commission_type = CommissionType.SERVICE
        
    def calculate_commission(self, amount: Decimal, rate: Decimal, **kwargs) -> Dict[str, Decimal]:
        """
        Calculate service commission.
        
        Args:
            amount: Service amount (appointment price)
            rate: Commission rate (percentage)
            
        Returns:
            Dict with platform_fee, barber_amount, total_amount
        """
        amount = self._validate_amount(amount)
        rate = self._validate_percentage_rate(rate)
        
        platform_fee = amount * rate
        barber_amount = amount - platform_fee
        
        result = {
            'total_amount': amount,
            'platform_fee': platform_fee.quantize(Decimal('0.01')),
            'barber_amount': barber_amount.quantize(Decimal('0.01')),
            'commission_rate': rate,
            'commission_type': self.commission_type.value
        }
        
        logger.debug(f"Service commission calculated: {result}")
        return result
        
    def validate_rate(self, rate: Decimal) -> bool:
        """Validate service commission rate (typically 0.10 to 0.50)"""
        try:
            rate = self._validate_percentage_rate(rate)
            return 0.05 <= rate <= 0.50  # 5% to 50% is reasonable range
        except ValueError:
            return False


class RetailCommissionCalculator(BaseCommissionCalculator):
    """
    Calculator for retail product commissions.
    Supports both percentage and fixed amount calculations.
    """
    
    def __init__(self):
        super().__init__()
        self.commission_type = CommissionType.RETAIL
        
    def calculate_commission(self, amount: Decimal, rate: Decimal, **kwargs) -> Dict[str, Decimal]:
        """
        Calculate retail commission.
        
        Args:
            amount: Line total for the item
            rate: Commission rate (percentage or fixed amount)
            quantity: Number of items (optional, default 1)
            
        Returns:
            Dict with commission_amount, remaining_amount, etc.
        """
        amount = self._validate_amount(amount)
        quantity = kwargs.get('quantity', 1)
        
        if self.calculation_mode == CommissionCalculationMode.PERCENTAGE:
            rate = self._validate_percentage_rate(rate)
            commission_amount = amount * rate
        elif self.calculation_mode == CommissionCalculationMode.FIXED:
            # Fixed amount per item
            commission_amount = self._validate_amount(rate) * quantity
        else:
            raise ValueError(f"Unsupported calculation mode: {self.calculation_mode}")
            
        remaining_amount = amount - commission_amount
        
        result = {
            'line_total': amount,
            'commission_amount': commission_amount.quantize(Decimal('0.01')),
            'remaining_amount': remaining_amount.quantize(Decimal('0.01')),
            'commission_rate': rate,
            'quantity': quantity,
            'commission_type': self.commission_type.value
        }
        
        logger.debug(f"Retail commission calculated: {result}")
        return result
        
    def validate_rate(self, rate: Decimal) -> bool:
        """Validate retail commission rate"""
        try:
            if self.calculation_mode == CommissionCalculationMode.PERCENTAGE:
                rate = self._validate_percentage_rate(rate)
                return 0.01 <= rate <= 0.30  # 1% to 30% is reasonable for retail
            elif self.calculation_mode == CommissionCalculationMode.FIXED:
                rate = self._validate_amount(rate)
                return 0.01 <= rate <= 100.00  # $0.01 to $100 per item
            return False
        except ValueError:
            return False


class POSCommissionCalculator(BaseCommissionCalculator):
    """
    Calculator for Point of Sale transaction commissions.
    Similar to retail but for in-person transactions.
    """
    
    def __init__(self):
        super().__init__()
        self.commission_type = CommissionType.POS
        
    def calculate_commission(self, amount: Decimal, rate: Decimal, **kwargs) -> Dict[str, Decimal]:
        """
        Calculate POS transaction commission.
        
        Args:
            amount: Transaction subtotal
            rate: Commission rate (percentage)
            transaction_type: Type of POS transaction (optional)
            
        Returns:
            Dict with commission breakdown
        """
        amount = self._validate_amount(amount)
        rate = self._validate_percentage_rate(rate)
        transaction_type = kwargs.get('transaction_type', 'standard')
        
        commission_amount = amount * rate
        remaining_amount = amount - commission_amount
        
        result = {
            'subtotal': amount,
            'commission_amount': commission_amount.quantize(Decimal('0.01')),
            'remaining_amount': remaining_amount.quantize(Decimal('0.01')),
            'commission_rate': rate,
            'transaction_type': transaction_type,
            'commission_type': self.commission_type.value
        }
        
        logger.debug(f"POS commission calculated: {result}")
        return result
        
    def validate_rate(self, rate: Decimal) -> bool:
        """Validate POS commission rate"""
        try:
            rate = self._validate_percentage_rate(rate)
            return 0.01 <= rate <= 0.25  # 1% to 25% for POS transactions
        except ValueError:
            return False


class UnifiedCommissionService:
    """
    Unified service for all commission calculations.
    Provides a single interface for different commission types.
    """
    
    def __init__(self):
        self.calculators = {
            CommissionType.SERVICE: ServiceCommissionCalculator(),
            CommissionType.RETAIL: RetailCommissionCalculator(),
            CommissionType.POS: POSCommissionCalculator()
        }
        
    def calculate_commission(
        self, 
        commission_type: CommissionType, 
        amount: Decimal, 
        rate: Decimal, 
        **kwargs
    ) -> Dict[str, Decimal]:
        """
        Calculate commission using the appropriate calculator.
        
        Args:
            commission_type: Type of commission to calculate
            amount: Base amount
            rate: Commission rate
            **kwargs: Additional parameters
            
        Returns:
            Commission calculation results
        """
        if commission_type not in self.calculators:
            raise ValueError(f"Unsupported commission type: {commission_type}")
            
        calculator = self.calculators[commission_type]
        
        # Validate rate before calculation
        if not calculator.validate_rate(rate):
            raise ValueError(f"Invalid commission rate {rate} for type {commission_type.value}")
            
        return calculator.calculate_commission(amount, rate, **kwargs)
        
    def get_default_rates(self) -> Dict[str, Decimal]:
        """Get default commission rates for different types"""
        return {
            CommissionType.SERVICE.value: Decimal('0.20'),      # 20% for services
            CommissionType.RETAIL.value: Decimal('0.10'),       # 10% for retail
            CommissionType.POS.value: Decimal('0.08')           # 8% for POS
        }
        
    def validate_commission_setup(
        self, 
        commission_type: CommissionType, 
        rate: Decimal
    ) -> Dict[str, Any]:
        """
        Validate commission setup for a given type and rate.
        
        Returns:
            Dict with validation results and recommendations
        """
        if commission_type not in self.calculators:
            return {
                'valid': False,
                'error': f"Unsupported commission type: {commission_type}",
                'recommendations': []
            }
            
        calculator = self.calculators[commission_type]
        is_valid = calculator.validate_rate(rate)
        
        recommendations = []
        if not is_valid:
            default_rates = self.get_default_rates()
            default_rate = default_rates.get(commission_type.value)
            recommendations.append(f"Consider using default rate: {default_rate}")
            
        return {
            'valid': is_valid,
            'commission_type': commission_type.value,
            'rate': rate,
            'error': None if is_valid else f"Invalid rate {rate} for {commission_type.value}",
            'recommendations': recommendations
        }
        
    def calculate_total_commissions(
        self, 
        commission_items: List[Dict[str, Any]]
    ) -> Dict[str, Decimal]:
        """
        Calculate total commissions across multiple items.
        
        Args:
            commission_items: List of items with commission details
            
        Returns:
            Aggregated commission totals by type
        """
        totals = {
            'service_commission': Decimal('0.00'),
            'retail_commission': Decimal('0.00'),
            'pos_commission': Decimal('0.00'),
            'total_commission': Decimal('0.00'),
            'total_amount': Decimal('0.00')
        }
        
        for item in commission_items:
            commission_type = CommissionType(item['commission_type'])
            amount = item['amount']
            rate = item['rate']
            
            result = self.calculate_commission(commission_type, amount, rate, **item.get('kwargs', {}))
            
            if commission_type == CommissionType.SERVICE:
                totals['service_commission'] += result['platform_fee']
                totals['total_amount'] += result['total_amount']
            elif commission_type == CommissionType.RETAIL:
                totals['retail_commission'] += result['commission_amount']
                totals['total_amount'] += result['line_total']
            elif commission_type == CommissionType.POS:
                totals['pos_commission'] += result['commission_amount']
                totals['total_amount'] += result['subtotal']
                
        totals['total_commission'] = (
            totals['service_commission'] + 
            totals['retail_commission'] + 
            totals['pos_commission']
        )
        
        return totals


# Factory function for easy access
def get_commission_service() -> UnifiedCommissionService:
    """Get instance of unified commission service"""
    return UnifiedCommissionService()


# Export main classes and functions
__all__ = [
    'UnifiedCommissionService',
    'CommissionType',
    'CommissionCalculationMode',
    'BaseCommissionCalculator',
    'ServiceCommissionCalculator', 
    'RetailCommissionCalculator',
    'POSCommissionCalculator',
    'get_commission_service'
]