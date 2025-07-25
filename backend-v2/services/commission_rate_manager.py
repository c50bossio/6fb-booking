"""
Commission Rate Management System
Provides centralized management of commission rates for different entities and types.
"""

from sqlalchemy.orm import Session
from typing import Dict, Optional, List, Any
from decimal import Decimal
from datetime import datetime
from dataclasses import dataclass
import logging

from models import User
from models.product import Product
from services.base_commission import CommissionType, UnifiedCommissionService

logger = logging.getLogger(__name__)


@dataclass
class CommissionRateConfig:
    """Configuration for commission rates"""
    barber_id: int
    commission_type: CommissionType
    rate: Decimal
    effective_date: datetime
    expires_date: Optional[datetime] = None
    location_id: Optional[int] = None
    product_category: Optional[str] = None
    minimum_amount: Optional[Decimal] = None
    maximum_amount: Optional[Decimal] = None
    is_active: bool = True


class CommissionRateManager:
    """
    Centralized management of commission rates across the platform.
    Handles different rate configurations for barbers, products, and services.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.commission_service = UnifiedCommissionService()
        
    def get_barber_commission_rate(
        self, 
        barber_id: int, 
        commission_type: CommissionType,
        amount: Optional[Decimal] = None,
        product_id: Optional[int] = None,
        location_id: Optional[int] = None
    ) -> Decimal:
        """
        Get the applicable commission rate for a barber based on context.
        
        Args:
            barber_id: ID of the barber
            commission_type: Type of commission (service, retail, pos)
            amount: Transaction amount (for tiered rates)
            product_id: Product ID (for product-specific rates)
            location_id: Location ID (for location-specific rates)
            
        Returns:
            Applicable commission rate as Decimal
        """
        # Get barber from database
        barber = self.db.query(User).filter(
            User.id == barber_id,
            User.role == "barber"
        ).first()
        
        if not barber:
            raise ValueError(f"Barber {barber_id} not found")
        
        # Start with barber's default rate
        base_rate = Decimal(str(barber.commission_rate or 0.20))
        
        # Apply commission type-specific adjustments
        if commission_type == CommissionType.SERVICE:
            # For services, use barber's standard rate
            rate = base_rate
        elif commission_type == CommissionType.RETAIL:
            # For retail, check if there's a product-specific rate
            rate = self._get_product_commission_rate(product_id, base_rate)
        elif commission_type == CommissionType.POS:
            # For POS, use a slightly lower rate (typically 80% of service rate)
            rate = base_rate * Decimal('0.8')
        else:
            rate = base_rate
            
        # Apply amount-based tiered rates if configured
        rate = self._apply_tiered_rates(barber_id, commission_type, amount, rate)
        
        # Apply location-specific modifiers if configured
        rate = self._apply_location_modifiers(barber_id, location_id, rate)
        
        # Validate final rate
        if not self.commission_service.calculators[commission_type].validate_rate(rate):
            logger.warning(f"Invalid calculated rate {rate} for barber {barber_id}, using default")
            rate = self.commission_service.get_default_rates()[commission_type.value]
            
        logger.debug(f"Commission rate for barber {barber_id}, type {commission_type.value}: {rate}")
        return rate
        
    def _get_product_commission_rate(self, product_id: Optional[int], base_rate: Decimal) -> Decimal:
        """Get commission rate for a specific product"""
        if not product_id:
            return base_rate
            
        product = self.db.query(Product).filter(Product.id == product_id).first()
        if product and product.commission_rate:
            return Decimal(str(product.commission_rate))
            
        return base_rate
        
    def _apply_tiered_rates(
        self, 
        barber_id: int, 
        commission_type: CommissionType, 
        amount: Optional[Decimal], 
        base_rate: Decimal
    ) -> Decimal:
        """Apply tiered commission rates based on transaction amount"""
        if not amount:
            return base_rate
            
        # Define tiered rate structure (this could be configurable)
        if commission_type == CommissionType.SERVICE:
            # Higher amounts get better rates for services
            if amount >= Decimal('200'):
                return base_rate * Decimal('1.1')  # 10% bonus
            elif amount >= Decimal('100'):
                return base_rate * Decimal('1.05')  # 5% bonus
                
        elif commission_type == CommissionType.RETAIL:
            # Retail rates could be volume-based
            if amount >= Decimal('500'):
                return base_rate * Decimal('1.2')   # 20% bonus for large orders
            elif amount >= Decimal('100'):
                return base_rate * Decimal('1.1')   # 10% bonus
                
        return base_rate
        
    def _apply_location_modifiers(
        self, 
        barber_id: int, 
        location_id: Optional[int], 
        base_rate: Decimal
    ) -> Decimal:
        """Apply location-specific commission modifiers"""
        # This could be implemented to support different rates by location
        # For now, return base rate
        return base_rate
        
    def set_barber_commission_rate(
        self, 
        barber_id: int, 
        rate: Decimal, 
        commission_type: Optional[CommissionType] = None
    ) -> bool:
        """
        Set commission rate for a barber.
        
        Args:
            barber_id: ID of the barber
            rate: New commission rate
            commission_type: Specific type or None for default service rate
            
        Returns:
            True if successful
        """
        try:
            barber = self.db.query(User).filter(
                User.id == barber_id,
                User.role == "barber"
            ).first()
            
            if not barber:
                raise ValueError(f"Barber {barber_id} not found")
                
            # Validate rate
            if commission_type:
                calculator = self.commission_service.calculators[commission_type]
                if not calculator.validate_rate(rate):
                    raise ValueError(f"Invalid rate {rate} for commission type {commission_type.value}")
            else:
                # For general rate, validate against service calculator
                calculator = self.commission_service.calculators[CommissionType.SERVICE]
                if not calculator.validate_rate(rate):
                    raise ValueError(f"Invalid commission rate {rate}")
                    
            # Update barber's default rate
            barber.commission_rate = float(rate)
            self.db.commit()
            
            logger.info(f"Updated commission rate for barber {barber_id}: {rate}")
            return True
            
        except Exception as e:
            logger.error(f"Error setting commission rate for barber {barber_id}: {str(e)}")
            self.db.rollback()
            return False
            
    def set_product_commission_rate(self, product_id: int, rate: Decimal) -> bool:
        """
        Set commission rate for a specific product.
        
        Args:
            product_id: ID of the product
            rate: Commission rate for this product
            
        Returns:
            True if successful
        """
        try:
            product = self.db.query(Product).filter(Product.id == product_id).first()
            
            if not product:
                raise ValueError(f"Product {product_id} not found")
                
            # Validate rate for retail commission
            calculator = self.commission_service.calculators[CommissionType.RETAIL]
            if not calculator.validate_rate(rate):
                raise ValueError(f"Invalid commission rate {rate} for product")
                
            product.commission_rate = rate
            self.db.commit()
            
            logger.info(f"Updated commission rate for product {product_id}: {rate}")
            return True
            
        except Exception as e:
            logger.error(f"Error setting commission rate for product {product_id}: {str(e)}")
            self.db.rollback()
            return False
            
    def get_commission_summary(self, barber_id: int) -> Dict[str, Any]:
        """
        Get comprehensive commission rate summary for a barber.
        
        Args:
            barber_id: ID of the barber
            
        Returns:
            Dictionary with commission rate information
        """
        barber = self.db.query(User).filter(
            User.id == barber_id,
            User.role == "barber"
        ).first()
        
        if not barber:
            raise ValueError(f"Barber {barber_id} not found")
            
        # Get rates for different commission types
        service_rate = self.get_barber_commission_rate(barber_id, CommissionType.SERVICE)
        retail_rate = self.get_barber_commission_rate(barber_id, CommissionType.RETAIL)
        pos_rate = self.get_barber_commission_rate(barber_id, CommissionType.POS)
        
        # Calculate projected earnings for example amounts
        example_amounts = [Decimal('50'), Decimal('100'), Decimal('200')]
        projections = {}
        
        for amount in example_amounts:
            service_calc = self.commission_service.calculate_commission(
                CommissionType.SERVICE, amount, service_rate
            )
            retail_calc = self.commission_service.calculate_commission(
                CommissionType.RETAIL, amount, retail_rate
            )
            
            projections[str(amount)] = {
                'service_earning': service_calc['barber_amount'],
                'retail_commission': retail_calc['commission_amount']
            }
            
        return {
            'barber_id': barber_id,
            'barber_name': barber.name,
            'base_commission_rate': Decimal(str(barber.commission_rate or 0.20)),
            'rates': {
                'service': service_rate,
                'retail': retail_rate,
                'pos': pos_rate
            },
            'projections': projections,
            'last_updated': datetime.utcnow(),
            'rate_status': 'active'
        }
        
    def get_all_barber_rates(self) -> List[Dict[str, Any]]:
        """
        Get commission rates for all barbers.
        
        Returns:
            List of barber commission rate summaries
        """
        barbers = self.db.query(User).filter(User.role == "barber").all()
        
        summaries = []
        for barber in barbers:
            try:
                summary = self.get_commission_summary(barber.id)
                summaries.append(summary)
            except Exception as e:
                logger.error(f"Error getting commission summary for barber {barber.id}: {str(e)}")
                
        return summaries
        
    def optimize_commission_rates(self, barber_id: int) -> Dict[str, Any]:
        """
        Provide optimization recommendations for commission rates.
        
        Args:
            barber_id: ID of the barber
            
        Returns:
            Dictionary with optimization recommendations
        """
        current_summary = self.get_commission_summary(barber_id)
        default_rates = self.commission_service.get_default_rates()
        
        recommendations = []
        current_rates = current_summary['rates']
        
        # Compare with default rates
        for commission_type, current_rate in current_rates.items():
            default_rate = default_rates.get(commission_type, current_rate)
            
            if current_rate < default_rate:
                recommendations.append({
                    'type': commission_type,
                    'current_rate': current_rate,
                    'recommended_rate': default_rate,
                    'reason': 'Below market average',
                    'potential_increase': (default_rate - current_rate) * Decimal('100')  # As percentage points
                })
                
        return {
            'barber_id': barber_id,
            'current_rates': current_rates,
            'recommendations': recommendations,
            'optimization_score': max(0, 100 - len(recommendations) * 15),  # Simple scoring
            'generated_at': datetime.utcnow()
        }


# Factory function for easy access
def get_commission_rate_manager(db: Session) -> CommissionRateManager:
    """Get instance of commission rate manager"""
    return CommissionRateManager(db)


# Export main classes
__all__ = [
    'CommissionRateManager',
    'CommissionRateConfig',
    'get_commission_rate_manager'
]