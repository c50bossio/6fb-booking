"""
Revenue-Optimized Scheduling Service for Six Figure Barber Methodology

This service implements intelligent appointment scheduling that maximizes revenue
through strategic time slot allocation, client tier-based prioritization,
and dynamic pricing optimization.

Integrates with:
- ClientTierService for personalized scheduling
- Booking service for appointment creation
- Calendar service for availability management
"""

from datetime import datetime, timedelta, time
from typing import Dict, List, Optional, Tuple, Any, Literal
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
import logging

from models import Appointment, Service, Client, User, BarberAvailability
from services.client_tier_service import ClientTierService, ClientTier

logger = logging.getLogger(__name__)

# Revenue optimization strategies
PricingStrategy = Literal['peak', 'standard', 'off_peak', 'premium']
SlotPriority = Literal['high', 'medium', 'low']

class RevenueOptimizedSchedulingService:
    """
    Six Figure Barber Revenue-Optimized Scheduling Service
    
    Provides intelligent appointment scheduling recommendations that maximize
    revenue through strategic time allocation and tier-based prioritization.
    """
    
    # Peak hours for revenue optimization (can be configured per location)
    PEAK_HOURS = {
        'morning': (9, 12),    # 9 AM - 12 PM
        'afternoon': (13, 17), # 1 PM - 5 PM
        'evening': (18, 20)    # 6 PM - 8 PM
    }
    
    # Revenue multipliers for different time slots
    REVENUE_MULTIPLIERS = {
        'peak': 1.3,      # 30% premium for peak hours
        'standard': 1.0,  # Standard pricing
        'off_peak': 0.9,  # 10% discount for off-peak
        'premium': 1.5    # 50% premium for premium services
    }
    
    # Client tier priority weights
    TIER_PRIORITY_WEIGHTS = {
        'platinum': 1.0,  # Highest priority
        'gold': 0.8,
        'silver': 0.6,
        'bronze': 0.4,
        'new': 0.2        # Lowest priority
    }
    
    def __init__(self, db: Session):
        self.db = db
        self.client_tier_service = ClientTierService(db)
        
    def get_revenue_optimized_slots(
        self,
        date: datetime.date,
        service: Service,
        client: Optional[Client] = None,
        duration_minutes: int = 60,
        preferred_times: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get available time slots optimized for revenue generation
        
        Returns slots ranked by revenue potential considering:
        - Peak/off-peak pricing
        - Client tier priority
        - Service profitability
        - Historical booking patterns
        """
        
        # Get base available slots
        available_slots = self._get_base_available_slots(date, duration_minutes)
        
        if not available_slots:
            return []
        
        # Get client tier information for personalization
        client_tier_data = None
        if client:
            try:
                client_tier_data = self.client_tier_service.calculate_client_tier(client)
            except Exception as e:
                logger.warning(f"Failed to get client tier for {client.id}: {e}")
        
        # Calculate revenue optimization scores for each slot
        optimized_slots = []
        for slot in available_slots:
            slot_score = self._calculate_slot_revenue_score(
                slot,
                service,
                client_tier_data,
                preferred_times
            )
            
            optimized_slots.append({
                **slot,
                'revenue_score': slot_score['total_score'],
                'pricing_strategy': slot_score['pricing_strategy'],
                'revenue_multiplier': slot_score['revenue_multiplier'],
                'optimized_price': slot_score['optimized_price'],
                'priority_level': slot_score['priority_level'],
                'tier_bonus': slot_score.get('tier_bonus', 0),
                'peak_bonus': slot_score.get('peak_bonus', 0),
                'recommendations': slot_score.get('recommendations', [])
            })
        
        # Sort by revenue score (highest first)
        optimized_slots.sort(key=lambda x: x['revenue_score'], reverse=True)
        
        return optimized_slots
    
    def _get_base_available_slots(
        self,
        date: datetime.date,
        duration_minutes: int
    ) -> List[Dict[str, Any]]:
        """Get basic available time slots for the given date"""
        
        # Query barber availability for the date
        day_of_week = date.weekday()  # 0 = Monday, 6 = Sunday
        
        availability_slots = self.db.query(BarberAvailability).filter(
            BarberAvailability.day_of_week == day_of_week
        ).all()
        
        if not availability_slots:
            return []
        
        # Get existing appointments for the date to exclude busy times
        existing_appointments = self.db.query(Appointment).filter(
            and_(
                func.date(Appointment.start_time) == date,
                Appointment.status.in_(['confirmed', 'completed'])
            )
        ).all()
        
        # Generate available slots
        available_slots = []
        slot_duration = timedelta(minutes=duration_minutes)
        
        for availability in availability_slots:
            current_time = datetime.combine(date, availability.start_time)
            end_time = datetime.combine(date, availability.end_time)
            
            # Generate slots within availability window
            while current_time + slot_duration <= end_time:
                slot_end = current_time + slot_duration
                
                # Check if slot conflicts with existing appointments
                conflicts = any(
                    (apt.start_time <= current_time < apt.end_time) or
                    (current_time < apt.start_time < slot_end)
                    for apt in existing_appointments
                )
                
                if not conflicts:
                    available_slots.append({
                        'start_time': current_time,
                        'end_time': slot_end,
                        'time': current_time.strftime('%H:%M'),
                        'date': date.isoformat(),
                        'duration_minutes': duration_minutes,
                        'barber_id': availability.barber_id,
                        'available': True
                    })
                
                # Move to next slot (15-minute intervals)
                current_time += timedelta(minutes=15)
        
        return available_slots
    
    def _calculate_slot_revenue_score(
        self,
        slot: Dict[str, Any],
        service: Service,
        client_tier_data: Optional[Dict[str, Any]],
        preferred_times: Optional[List[str]]
    ) -> Dict[str, Any]:
        """Calculate revenue optimization score for a time slot"""
        
        start_time = slot['start_time']
        hour = start_time.hour
        
        # Base service price
        base_price = service.base_price
        
        # 1. Time-based pricing strategy
        pricing_strategy = self._get_pricing_strategy(hour)
        time_multiplier = self.REVENUE_MULTIPLIERS[pricing_strategy]
        
        # 2. Client tier bonus
        tier_bonus = 0
        tier_multiplier = 1.0
        client_tier = 'new'  # Default
        
        if client_tier_data:
            client_tier = client_tier_data.get('primary_tier', 'new')
            tier_weight = self.TIER_PRIORITY_WEIGHTS.get(client_tier, 0.2)
            tier_bonus = tier_weight * 0.2  # Up to 20% tier bonus
            
            # High-value clients get premium time access
            if client_tier in ['platinum', 'gold']:
                tier_multiplier = 1.1  # 10% premium for premium clients
        
        # 3. Preferred time bonus
        preference_bonus = 0
        if preferred_times and slot['time'] in preferred_times:
            preference_bonus = 0.15  # 15% bonus for preferred times
        
        # 4. Service profitability factor
        service_multiplier = 1.0
        if service.base_price >= 75:  # Premium services
            service_multiplier = 1.2
        elif service.base_price >= 50:  # Mid-tier services
            service_multiplier = 1.1
        
        # 5. Peak demand bonus (based on historical data)
        peak_bonus = self._calculate_peak_demand_bonus(hour, start_time.weekday())
        
        # Calculate total score
        total_multiplier = (
            time_multiplier * 
            tier_multiplier * 
            service_multiplier * 
            (1 + tier_bonus + preference_bonus + peak_bonus)
        )
        
        optimized_price = base_price * total_multiplier
        
        # Priority level for scheduling
        priority_level = self._get_priority_level(
            pricing_strategy, 
            client_tier, 
            preference_bonus > 0
        )
        
        # Generate recommendations
        recommendations = self._generate_slot_recommendations(
            pricing_strategy,
            client_tier,
            service,
            total_multiplier
        )
        
        return {
            'total_score': optimized_price,  # Higher price = higher score
            'pricing_strategy': pricing_strategy,
            'revenue_multiplier': total_multiplier,
            'optimized_price': round(optimized_price, 2),
            'priority_level': priority_level,
            'tier_bonus': tier_bonus,
            'peak_bonus': peak_bonus,
            'preference_bonus': preference_bonus,
            'recommendations': recommendations
        }
    
    def _get_pricing_strategy(self, hour: int) -> PricingStrategy:
        """Determine pricing strategy based on time of day"""
        
        # Check if hour falls in peak periods
        for period, (start, end) in self.PEAK_HOURS.items():
            if start <= hour <= end:
                return 'peak'
        
        # Off-peak hours (early morning, late evening)
        if hour < 9 or hour > 20:
            return 'off_peak'
        
        # Premium evening slots (dinner time)
        if 17 <= hour <= 19:
            return 'premium'
        
        return 'standard'
    
    def _calculate_peak_demand_bonus(self, hour: int, weekday: int) -> float:
        """Calculate peak demand bonus based on historical patterns"""
        
        # Weekend bonus
        weekend_bonus = 0.1 if weekday >= 5 else 0  # Saturday/Sunday
        
        # Popular time slots bonus
        popular_hours = [10, 11, 14, 15, 16]  # Based on typical barbershop patterns
        popular_bonus = 0.05 if hour in popular_hours else 0
        
        # Friday bonus (popular day)
        friday_bonus = 0.08 if weekday == 4 else 0
        
        return weekend_bonus + popular_bonus + friday_bonus
    
    def _get_priority_level(
        self,
        pricing_strategy: PricingStrategy,
        client_tier: ClientTier,
        is_preferred_time: bool
    ) -> SlotPriority:
        """Determine priority level for scheduling"""
        
        # VIP clients get high priority
        if client_tier in ['platinum', 'gold']:
            return 'high'
        
        # Premium and peak times are medium priority
        if pricing_strategy in ['premium', 'peak'] or is_preferred_time:
            return 'medium'
        
        return 'low'
    
    def _generate_slot_recommendations(
        self,
        pricing_strategy: PricingStrategy,
        client_tier: ClientTier,
        service: Service,
        multiplier: float
    ) -> List[str]:
        """Generate optimization recommendations for the slot"""
        
        recommendations = []
        
        # Pricing recommendations
        if pricing_strategy == 'peak':
            recommendations.append("Peak hour premium pricing active")
        elif pricing_strategy == 'premium':
            recommendations.append("Premium evening slot - ideal for high-value services")
        elif pricing_strategy == 'off_peak':
            recommendations.append("Off-peak discount opportunity to fill schedule")
        
        # Client tier recommendations
        if client_tier == 'platinum':
            recommendations.append("VIP client - ensure premium experience delivery")
        elif client_tier == 'gold':
            recommendations.append("High-value client - opportunity for service upgrades")
        elif client_tier == 'new':
            recommendations.append("New client - focus on exceptional first impression")
        
        # Service recommendations
        if service.base_price >= 75:
            recommendations.append("Premium service - maximize value presentation")
        
        # Revenue optimization suggestions
        if multiplier > 1.2:
            recommendations.append("High revenue potential slot - prioritize booking")
        elif multiplier < 1.0:
            recommendations.append("Consider bundling with additional services")
        
        return recommendations
    
    def get_optimal_reschedule_slots(
        self,
        original_appointment: Appointment,
        new_date_range: Tuple[datetime.date, datetime.date],
        client_preferences: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Find optimal rescheduling slots that maintain or improve revenue
        """
        
        optimal_slots = []
        
        # Get original appointment revenue metrics
        original_service = self.db.query(Service).filter(
            Service.id == original_appointment.service_id
        ).first()
        
        original_client = self.db.query(Client).filter(
            Client.id == original_appointment.client_id
        ).first()
        
        if not original_service:
            return []
        
        # Search for slots in the date range
        current_date = new_date_range[0]
        end_date = new_date_range[1]
        
        while current_date <= end_date:
            daily_slots = self.get_revenue_optimized_slots(
                current_date,
                original_service,
                original_client,
                60,  # Duration
                client_preferences.get('preferred_times') if client_preferences else None
            )
            
            # Filter for slots that maintain or improve revenue
            for slot in daily_slots:
                if slot['optimized_price'] >= original_service.base_price:
                    slot['reschedule_benefit'] = {
                        'revenue_improvement': slot['optimized_price'] - original_service.base_price,
                        'original_price': original_service.base_price,
                        'improvement_percentage': ((slot['optimized_price'] / original_service.base_price) - 1) * 100
                    }
                    optimal_slots.append(slot)
            
            current_date += timedelta(days=1)
        
        # Sort by revenue improvement
        optimal_slots.sort(
            key=lambda x: x['reschedule_benefit']['revenue_improvement'],
            reverse=True
        )
        
        return optimal_slots[:10]  # Return top 10 options
    
    def analyze_schedule_optimization(
        self,
        date_range: Tuple[datetime.date, datetime.date],
        barber_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Analyze schedule for revenue optimization opportunities
        """
        
        start_date, end_date = date_range
        
        # Get appointments in date range
        query = self.db.query(Appointment).filter(
            and_(
                func.date(Appointment.start_time) >= start_date,
                func.date(Appointment.start_time) <= end_date,
                Appointment.status.in_(['confirmed', 'completed'])
            )
        )
        
        if barber_id:
            query = query.filter(Appointment.barber_id == barber_id)
        
        appointments = query.all()
        
        # Analysis metrics
        total_revenue = sum(apt.price for apt in appointments if apt.price)
        total_slots = len(appointments)
        
        # Time distribution analysis
        time_distribution = self._analyze_time_distribution(appointments)
        
        # Peak utilization analysis
        peak_utilization = self._analyze_peak_utilization(appointments)
        
        # Client tier distribution
        tier_distribution = self._analyze_client_tier_distribution(appointments)
        
        # Revenue optimization opportunities
        opportunities = self._identify_optimization_opportunities(
            appointments, start_date, end_date
        )
        
        return {
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days_analyzed': (end_date - start_date).days + 1
            },
            'summary': {
                'total_revenue': total_revenue,
                'total_appointments': total_slots,
                'average_revenue_per_slot': total_revenue / total_slots if total_slots > 0 else 0,
                'peak_utilization_rate': peak_utilization['rate'],
                'off_peak_utilization_rate': peak_utilization['off_peak_rate']
            },
            'time_distribution': time_distribution,
            'peak_analysis': peak_utilization,
            'client_tier_distribution': tier_distribution,
            'optimization_opportunities': opportunities,
            'recommendations': self._generate_schedule_recommendations(
                time_distribution, peak_utilization, tier_distribution, opportunities
            )
        }
    
    def _analyze_time_distribution(self, appointments: List[Appointment]) -> Dict[str, Any]:
        """Analyze appointment distribution across time periods"""
        
        time_buckets = {
            'early_morning': 0,  # 6-9 AM
            'morning': 0,        # 9-12 PM
            'afternoon': 0,      # 12-5 PM
            'evening': 0,        # 5-8 PM
            'late': 0           # 8+ PM
        }
        
        for apt in appointments:
            hour = apt.start_time.hour
            if 6 <= hour < 9:
                time_buckets['early_morning'] += 1
            elif 9 <= hour < 12:
                time_buckets['morning'] += 1
            elif 12 <= hour < 17:
                time_buckets['afternoon'] += 1
            elif 17 <= hour < 20:
                time_buckets['evening'] += 1
            else:
                time_buckets['late'] += 1
        
        total = len(appointments)
        return {
            'distribution': time_buckets,
            'percentages': {
                period: (count / total * 100) if total > 0 else 0
                for period, count in time_buckets.items()
            }
        }
    
    def _analyze_peak_utilization(self, appointments: List[Appointment]) -> Dict[str, Any]:
        """Analyze utilization during peak vs off-peak hours"""
        
        peak_appointments = sum(1 for apt in appointments if self._is_peak_hour(apt.start_time.hour))
        total_appointments = len(appointments)
        
        return {
            'peak_appointments': peak_appointments,
            'off_peak_appointments': total_appointments - peak_appointments,
            'rate': (peak_appointments / total_appointments * 100) if total_appointments > 0 else 0,
            'off_peak_rate': ((total_appointments - peak_appointments) / total_appointments * 100) if total_appointments > 0 else 0
        }
    
    def _analyze_client_tier_distribution(self, appointments: List[Appointment]) -> Dict[str, Any]:
        """Analyze client tier distribution in appointments"""
        
        tier_counts = {
            'platinum': 0, 'gold': 0, 'silver': 0, 'bronze': 0, 'new': 0, 'unknown': 0
        }
        
        for apt in appointments:
            if apt.client_id:
                try:
                    client = self.db.query(Client).filter(Client.id == apt.client_id).first()
                    if client:
                        tier_data = self.client_tier_service.calculate_client_tier(client)
                        tier = tier_data.get('primary_tier', 'unknown')
                        tier_counts[tier] = tier_counts.get(tier, 0) + 1
                    else:
                        tier_counts['unknown'] += 1
                except Exception:
                    tier_counts['unknown'] += 1
            else:
                tier_counts['unknown'] += 1
        
        total = len(appointments)
        return {
            'distribution': tier_counts,
            'percentages': {
                tier: (count / total * 100) if total > 0 else 0
                for tier, count in tier_counts.items()
            }
        }
    
    def _identify_optimization_opportunities(
        self,
        appointments: List[Appointment],
        start_date: datetime.date,
        end_date: datetime.date
    ) -> List[Dict[str, Any]]:
        """Identify specific revenue optimization opportunities"""
        
        opportunities = []
        
        # 1. Underutilized peak hours
        peak_slots_available = self._count_available_peak_slots(start_date, end_date)
        if peak_slots_available > 0:
            opportunities.append({
                'type': 'peak_utilization',
                'title': 'Underutilized Peak Hours',
                'description': f'{peak_slots_available} available peak hour slots detected',
                'potential_revenue': peak_slots_available * 75,  # Estimated premium service price
                'priority': 'high'
            })
        
        # 2. Off-peak promotional opportunities
        off_peak_utilization = len([apt for apt in appointments if not self._is_peak_hour(apt.start_time.hour)])
        total_off_peak_capacity = self._estimate_off_peak_capacity(start_date, end_date)
        
        if off_peak_utilization / total_off_peak_capacity < 0.6:  # Less than 60% utilized
            opportunities.append({
                'type': 'off_peak_promotion',
                'title': 'Off-Peak Promotion Opportunity',
                'description': 'Low off-peak utilization - consider promotional pricing',
                'potential_revenue': (total_off_peak_capacity - off_peak_utilization) * 45,
                'priority': 'medium'
            })
        
        # 3. Client tier upgrade opportunities
        bronze_silver_clients = [
            apt for apt in appointments 
            if apt.client_id and self._get_appointment_client_tier(apt) in ['bronze', 'silver']
        ]
        
        if len(bronze_silver_clients) > 5:
            opportunities.append({
                'type': 'tier_upgrade',
                'title': 'Client Tier Upgrade Campaign',
                'description': f'{len(bronze_silver_clients)} clients eligible for tier advancement',
                'potential_revenue': len(bronze_silver_clients) * 25,  # Average upgrade value
                'priority': 'medium'
            })
        
        return opportunities
    
    def _is_peak_hour(self, hour: int) -> bool:
        """Check if hour is considered peak time"""
        for period, (start, end) in self.PEAK_HOURS.items():
            if start <= hour <= end:
                return True
        return False
    
    def _count_available_peak_slots(self, start_date: datetime.date, end_date: datetime.date) -> int:
        """Estimate available peak hour slots in date range"""
        # Simplified estimation - would need more complex logic in production
        business_days = max(1, (end_date - start_date).days)
        peak_hours_per_day = 8  # Approximate peak hours
        slots_per_hour = 4  # 15-minute slots
        return business_days * peak_hours_per_day * slots_per_hour
    
    def _estimate_off_peak_capacity(self, start_date: datetime.date, end_date: datetime.date) -> int:
        """Estimate off-peak scheduling capacity"""
        business_days = max(1, (end_date - start_date).days)
        off_peak_hours_per_day = 4  # Approximate off-peak hours
        slots_per_hour = 4
        return business_days * off_peak_hours_per_day * slots_per_hour
    
    def _get_appointment_client_tier(self, appointment: Appointment) -> str:
        """Get client tier for appointment"""
        try:
            if appointment.client_id:
                client = self.db.query(Client).filter(Client.id == appointment.client_id).first()
                if client:
                    tier_data = self.client_tier_service.calculate_client_tier(client)
                    return tier_data.get('primary_tier', 'unknown')
        except Exception:
            pass
        return 'unknown'
    
    def _generate_schedule_recommendations(
        self,
        time_distribution: Dict[str, Any],
        peak_utilization: Dict[str, Any],
        tier_distribution: Dict[str, Any],
        opportunities: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate actionable scheduling recommendations"""
        
        recommendations = []
        
        # Peak utilization recommendations
        if peak_utilization['rate'] < 70:
            recommendations.append("Increase peak hour utilization through targeted marketing and premium service promotion")
        
        # Time distribution recommendations
        if time_distribution['percentages']['evening'] < 20:
            recommendations.append("Consider extending evening hours to capture after-work clientele")
        
        # Client tier recommendations
        high_value_percentage = (
            tier_distribution['percentages'].get('platinum', 0) + 
            tier_distribution['percentages'].get('gold', 0)
        )
        
        if high_value_percentage < 30:
            recommendations.append("Focus on client tier advancement programs to increase high-value client percentage")
        
        # Opportunity-based recommendations
        for opp in opportunities[:3]:  # Top 3 opportunities
            if opp['priority'] == 'high':
                recommendations.append(f"Priority: {opp['title']} - {opp['description']}")
        
        return recommendations