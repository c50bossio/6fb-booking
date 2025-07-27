"""
Gamified Data-Driven Pricing Tier Service

This service calculates barber pricing tiers based on objective performance metrics:
- Utilization Rate (40% weight)
- Booking Lead Time (30% weight) 
- Demand Velocity (20% weight)
- Client Satisfaction (10% weight)

Updates pricing tiers weekly using 30-day trailing data to avoid surge pricing feel.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class PricingTier(Enum):
    """Pricing tiers with their base rates and thresholds"""
    STANDARD = {"name": "Standard", "rate": 45, "min_score": 0, "max_score": 50, "emoji": "🔰"}
    POPULAR = {"name": "Popular", "rate": 55, "min_score": 51, "max_score": 70, "emoji": "⭐"}
    PREMIUM = {"name": "Premium", "rate": 65, "min_score": 71, "max_score": 85, "emoji": "🏆"}
    ELITE = {"name": "Elite", "rate": 75, "min_score": 86, "max_score": 100, "emoji": "💎"}


@dataclass
class BarberMetrics:
    """Data class for barber performance metrics"""
    barber_id: int
    utilization_rate: float  # Percentage of available hours booked
    avg_lead_time_days: float  # Average days between booking and appointment
    demand_velocity: float  # New bookings per week
    client_satisfaction: float  # Average rating out of 5
    total_bookings: int
    repeat_client_rate: float
    cancellation_rate: float
    calculation_date: datetime


@dataclass
class TierCalculationResult:
    """Result of tier calculation with detailed breakdown"""
    barber_id: int
    current_tier: PricingTier
    tier_score: float
    utilization_score: float
    lead_time_score: float
    demand_score: float
    satisfaction_score: float
    rate: float
    next_tier: Optional[PricingTier]
    progress_to_next: float
    tier_change: Optional[str]  # "up", "down", "same"


class PricingTierService:
    """Service for calculating and managing barber pricing tiers"""
    
    def __init__(self):
        self.weights = {
            'utilization': 0.40,
            'lead_time': 0.30,
            'demand': 0.20,
            'satisfaction': 0.10
        }
    
    def calculate_utilization_score(self, utilization_rate: float) -> float:
        """
        Convert utilization rate to 0-100 score
        95%+ utilization = 100 points
        70% utilization = 50 points
        50% utilization = 0 points
        """
        if utilization_rate >= 0.95:
            return 100.0
        elif utilization_rate >= 0.70:
            # Linear scale from 50-100 points between 70-95%
            return 50 + ((utilization_rate - 0.70) / 0.25) * 50
        else:
            # Linear scale from 0-50 points between 0-70%
            return max(0, (utilization_rate / 0.70) * 50)
    
    def calculate_lead_time_score(self, avg_lead_time_days: float) -> float:
        """
        Convert average lead time to 0-100 score
        21+ days = 100 points
        14 days = 75 points
        7 days = 50 points
        0-3 days = 0 points
        """
        if avg_lead_time_days >= 21:
            return 100.0
        elif avg_lead_time_days >= 14:
            return 75 + ((avg_lead_time_days - 14) / 7) * 25
        elif avg_lead_time_days >= 7:
            return 50 + ((avg_lead_time_days - 7) / 7) * 25
        elif avg_lead_time_days >= 3:
            return ((avg_lead_time_days - 3) / 4) * 50
        else:
            return 0.0
    
    def calculate_demand_score(self, demand_velocity: float, total_bookings: int) -> float:
        """
        Calculate demand score based on booking velocity and volume
        High velocity + high volume = high demand
        """
        # Normalize based on typical weekly booking patterns
        velocity_score = min(100, (demand_velocity / 20) * 100)  # 20+ bookings/week = max
        volume_score = min(100, (total_bookings / 100) * 100)   # 100+ total bookings = max
        
        # Weighted average of velocity and volume
        return (velocity_score * 0.7) + (volume_score * 0.3)
    
    def calculate_satisfaction_score(self, client_satisfaction: float) -> float:
        """
        Convert client satisfaction rating to 0-100 score
        5.0 rating = 100 points
        4.5 rating = 75 points
        4.0 rating = 50 points
        3.5 rating = 25 points
        """
        if client_satisfaction >= 5.0:
            return 100.0
        elif client_satisfaction >= 4.5:
            return 75 + ((client_satisfaction - 4.5) / 0.5) * 25
        elif client_satisfaction >= 4.0:
            return 50 + ((client_satisfaction - 4.0) / 0.5) * 25
        elif client_satisfaction >= 3.5:
            return 25 + ((client_satisfaction - 3.5) / 0.5) * 25
        else:
            return max(0, (client_satisfaction / 3.5) * 25)
    
    def calculate_tier_score(self, metrics: BarberMetrics) -> float:
        """Calculate overall tier score using weighted metrics"""
        utilization_score = self.calculate_utilization_score(metrics.utilization_rate)
        lead_time_score = self.calculate_lead_time_score(metrics.avg_lead_time_days)
        demand_score = self.calculate_demand_score(metrics.demand_velocity, metrics.total_bookings)
        satisfaction_score = self.calculate_satisfaction_score(metrics.client_satisfaction)
        
        total_score = (
            utilization_score * self.weights['utilization'] +
            lead_time_score * self.weights['lead_time'] +
            demand_score * self.weights['demand'] +
            satisfaction_score * self.weights['satisfaction']
        )
        
        return round(total_score, 1)
    
    def determine_tier(self, tier_score: float) -> PricingTier:
        """Determine pricing tier based on calculated score"""
        for tier in [PricingTier.ELITE, PricingTier.PREMIUM, PricingTier.POPULAR, PricingTier.STANDARD]:
            tier_data = tier.value
            if tier_data["min_score"] <= tier_score <= tier_data["max_score"]:
                return tier
        return PricingTier.STANDARD
    
    def get_next_tier(self, current_tier: PricingTier) -> Optional[PricingTier]:
        """Get the next tier above current tier"""
        tier_order = [PricingTier.STANDARD, PricingTier.POPULAR, PricingTier.PREMIUM, PricingTier.ELITE]
        current_index = tier_order.index(current_tier)
        
        if current_index < len(tier_order) - 1:
            return tier_order[current_index + 1]
        return None
    
    def calculate_progress_to_next_tier(self, tier_score: float, current_tier: PricingTier, next_tier: Optional[PricingTier]) -> float:
        """Calculate progress percentage to next tier"""
        if not next_tier:
            return 100.0  # Already at max tier
        
        current_min = current_tier.value["min_score"]
        current_max = current_tier.value["max_score"]
        next_min = next_tier.value["min_score"]
        
        # Progress within current tier
        current_progress = (tier_score - current_min) / (current_max - current_min)
        
        # Progress toward next tier threshold
        total_range = next_min - current_min
        current_position = tier_score - current_min
        
        return min(100.0, (current_position / total_range) * 100)
    
    def calculate_barber_tier(self, metrics: BarberMetrics, previous_tier: Optional[PricingTier] = None) -> TierCalculationResult:
        """Calculate complete tier result for a barber"""
        
        # Calculate individual scores
        utilization_score = self.calculate_utilization_score(metrics.utilization_rate)
        lead_time_score = self.calculate_lead_time_score(metrics.avg_lead_time_days)
        demand_score = self.calculate_demand_score(metrics.demand_velocity, metrics.total_bookings)
        satisfaction_score = self.calculate_satisfaction_score(metrics.client_satisfaction)
        
        # Calculate overall tier score
        tier_score = self.calculate_tier_score(metrics)
        
        # Determine tier and next tier
        current_tier = self.determine_tier(tier_score)
        next_tier = self.get_next_tier(current_tier)
        
        # Calculate progress to next tier
        progress_to_next = self.calculate_progress_to_next_tier(tier_score, current_tier, next_tier)
        
        # Determine tier change
        tier_change = None
        if previous_tier:
            if current_tier.value["min_score"] > previous_tier.value["min_score"]:
                tier_change = "up"
            elif current_tier.value["min_score"] < previous_tier.value["min_score"]:
                tier_change = "down"
            else:
                tier_change = "same"
        
        return TierCalculationResult(
            barber_id=metrics.barber_id,
            current_tier=current_tier,
            tier_score=tier_score,
            utilization_score=utilization_score,
            lead_time_score=lead_time_score,
            demand_score=demand_score,
            satisfaction_score=satisfaction_score,
            rate=current_tier.value["rate"],
            next_tier=next_tier,
            progress_to_next=progress_to_next,
            tier_change=tier_change
        )
    
    async def get_barber_metrics_from_db(self, barber_id: int, days: int = 30) -> BarberMetrics:
        """
        Fetch barber metrics from database for the specified time period
        This would integrate with your actual database
        """
        # TODO: Implement actual database queries
        # For now, return demo data
        from datetime import datetime
        
        return BarberMetrics(
            barber_id=barber_id,
            utilization_rate=0.87,  # 87% utilization
            avg_lead_time_days=14.5,  # 2+ weeks average lead time
            demand_velocity=15.2,  # 15.2 new bookings per week
            client_satisfaction=4.8,  # 4.8/5 rating
            total_bookings=85,
            repeat_client_rate=0.75,
            cancellation_rate=0.05,
            calculation_date=datetime.now()
        )
    
    async def update_all_barber_tiers(self) -> List[TierCalculationResult]:
        """Update pricing tiers for all barbers - run weekly"""
        # TODO: Get list of all active barbers from database
        barber_ids = [1, 2, 3]  # Demo data
        
        results = []
        for barber_id in barber_ids:
            try:
                metrics = await self.get_barber_metrics_from_db(barber_id)
                result = self.calculate_barber_tier(metrics)
                results.append(result)
                
                logger.info(f"Updated tier for barber {barber_id}: {result.current_tier.value['name']} (Score: {result.tier_score})")
                
                # TODO: Save tier change to database
                # TODO: Send notification if tier changed
                
            except Exception as e:
                logger.error(f"Failed to update tier for barber {barber_id}: {e}")
        
        return results


# Demo usage and testing
if __name__ == "__main__":
    service = PricingTierService()
    
    # Demo metrics for different performance levels
    demo_metrics = [
        BarberMetrics(1, 0.87, 14.5, 15.2, 4.8, 85, 0.75, 0.05, datetime.now()),  # Premium tier
        BarberMetrics(2, 0.76, 10.2, 12.5, 4.6, 60, 0.68, 0.08, datetime.now()),  # Popular tier
        BarberMetrics(3, 0.65, 5.5, 8.2, 4.2, 35, 0.55, 0.12, datetime.now()),     # Standard tier
    ]
    
    for metrics in demo_metrics:
        result = service.calculate_barber_tier(metrics)
        print(f"\nBarber {metrics.barber_id}:")
        print(f"  Tier: {result.current_tier.value['name']} ({result.current_tier.value['emoji']})")
        print(f"  Rate: ${result.rate}")
        print(f"  Score: {result.tier_score}/100")
        print(f"  Progress to next: {result.progress_to_next:.1f}%")
        if result.next_tier:
            print(f"  Next tier: {result.next_tier.value['name']}")