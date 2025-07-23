"""
Six Figure Barber Premium Pricing Service

Implements intelligent pricing based on Six Figure Barber methodology:
- Barber experience and expertise tiers
- Client tier-based pricing adjustments  
- Service premium calculations
- Revenue optimization recommendations
"""

from datetime import datetime, time, timedelta
from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
import logging

from models import User, Client, Service, Appointment
from services.client_tier_service import ClientTierService, ClientTier

logger = logging.getLogger(__name__)

class SixFigurePricingService:
    """
    Six Figure Barber pricing methodology implementation
    
    Provides dynamic pricing based on:
    - Barber expertise and experience level
    - Client tier and relationship value
    - Service complexity and demand
    - Market positioning strategy
    """
    
    # Base Six Figure Barber pricing multipliers
    BARBER_EXPERIENCE_MULTIPLIERS = {
        'junior': {
            'base_multiplier': 0.8,
            'max_hourly_rate': 45,
            'tier_bonus': {'platinum': 1.1, 'gold': 1.05, 'silver': 1.0, 'bronze': 1.0, 'new': 1.0}
        },
        'mid': {
            'base_multiplier': 1.0,
            'max_hourly_rate': 65,
            'tier_bonus': {'platinum': 1.2, 'gold': 1.15, 'silver': 1.1, 'bronze': 1.05, 'new': 1.0}
        },
        'senior': {
            'base_multiplier': 1.3,
            'max_hourly_rate': 85,
            'tier_bonus': {'platinum': 1.4, 'gold': 1.3, 'silver': 1.2, 'bronze': 1.1, 'new': 1.0}
        },
        'expert': {
            'base_multiplier': 1.6,
            'max_hourly_rate': 120,
            'tier_bonus': {'platinum': 1.8, 'gold': 1.6, 'silver': 1.4, 'bronze': 1.2, 'new': 1.1}
        }
    }
    
    # Service complexity multipliers (Six Figure Barber methodology)
    SERVICE_COMPLEXITY = {
        'haircut': {'complexity': 1.0, 'time_minutes': 30, 'skill_level': 'basic'},
        'haircut & beard': {'complexity': 1.3, 'time_minutes': 45, 'skill_level': 'intermediate'},
        'haircut & shave': {'complexity': 1.5, 'time_minutes': 60, 'skill_level': 'advanced'},
        'beard trimming': {'complexity': 0.8, 'time_minutes': 20, 'skill_level': 'basic'},
        'straight razor shave': {'complexity': 1.8, 'time_minutes': 45, 'skill_level': 'expert'},
        'scalp treatment': {'complexity': 1.4, 'time_minutes': 30, 'skill_level': 'intermediate'},
        'styling & grooming': {'complexity': 1.1, 'time_minutes': 25, 'skill_level': 'basic'},
        'consultation': {'complexity': 0.6, 'time_minutes': 15, 'skill_level': 'basic'}
    }
    
    # Premium time slot multipliers (peak demand pricing)
    TIME_SLOT_MULTIPLIERS = {
        'morning_rush': {'hours': [7, 8, 9], 'multiplier': 1.1},  # Before work rush
        'lunch_time': {'hours': [12, 13], 'multiplier': 1.15},   # Lunch break premium
        'evening_prime': {'hours': [17, 18, 19], 'multiplier': 1.2},  # After work prime
        'weekend_premium': {'days': [5, 6], 'multiplier': 1.25}  # Friday/Saturday premium
    }
    
    def __init__(self, db: Session):
        self.db = db
        self.client_tier_service = ClientTierService(db)
    
    def calculate_service_price(
        self,
        service_name: str,
        barber_id: int,
        client_id: Optional[int] = None,
        appointment_datetime: Optional[datetime] = None,
        base_price: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Calculate intelligent service pricing using Six Figure Barber methodology
        
        Args:
            service_name: Name of the service being booked
            barber_id: ID of the barber providing the service
            client_id: ID of the client (for tier-based pricing)
            appointment_datetime: When the appointment is scheduled
            base_price: Override base price if provided
            
        Returns:
            Comprehensive pricing breakdown with Six Figure Barber insights
        """
        try:
            # Get barber information
            barber = self.db.query(User).filter(User.id == barber_id).first()
            if not barber:
                raise ValueError(f"Barber not found: {barber_id}")
            
            # Determine barber experience level
            barber_experience = self._get_barber_experience_level(barber)
            
            # Get service complexity data
            service_key = service_name.lower().replace(' ', ' ')
            service_data = self.SERVICE_COMPLEXITY.get(service_key, {
                'complexity': 1.0, 
                'time_minutes': 30, 
                'skill_level': 'basic'
            })
            
            # Calculate base price
            if base_price is None:
                base_price = self._calculate_base_price(service_data, barber_experience)
            
            # Get client tier for personalized pricing
            client_tier = 'new'
            client_tier_bonus = 1.0
            if client_id:
                client = self.db.query(Client).filter(Client.id == client_id).first()
                if client:
                    tier_analysis = self.client_tier_service.calculate_client_tier(client)
                    client_tier = tier_analysis['primary_tier']
                    client_tier_bonus = self.BARBER_EXPERIENCE_MULTIPLIERS[barber_experience]['tier_bonus'][client_tier]
            
            # Apply barber experience multiplier
            experience_multiplier = self.BARBER_EXPERIENCE_MULTIPLIERS[barber_experience]['base_multiplier']
            
            # Apply service complexity multiplier
            complexity_multiplier = service_data['complexity']
            
            # Calculate time-based premium
            time_multiplier = 1.0
            time_premium_reason = None
            if appointment_datetime:
                time_multiplier, time_premium_reason = self._calculate_time_premium(appointment_datetime)
            
            # Calculate final price
            final_price = (
                base_price * 
                experience_multiplier * 
                complexity_multiplier * 
                client_tier_bonus * 
                time_multiplier
            )
            
            # Apply Six Figure Barber premium positioning (never below minimum)
            min_price = self._get_minimum_price(service_data, barber_experience)
            final_price = max(final_price, min_price)
            
            # Round to appropriate precision
            final_price = round(final_price, 2)
            
            # Calculate revenue optimization insights
            revenue_insights = self._generate_revenue_insights(
                barber_experience, client_tier, service_data, final_price
            )
            
            return {
                'service_name': service_name,
                'base_price': base_price,
                'final_price': final_price,
                'pricing_breakdown': {
                    'barber_experience_level': barber_experience,
                    'experience_multiplier': experience_multiplier,
                    'service_complexity': service_data['complexity'],
                    'client_tier': client_tier,
                    'client_tier_bonus': client_tier_bonus,
                    'time_premium': time_multiplier,
                    'time_premium_reason': time_premium_reason
                },
                'six_figure_insights': {
                    'is_premium_positioning': final_price > base_price * 1.2,
                    'revenue_category': self._categorize_revenue_level(final_price),
                    'optimization_score': revenue_insights['optimization_score'],
                    'recommended_upsells': revenue_insights['upsell_opportunities']
                },
                'service_details': {
                    'estimated_duration': service_data['time_minutes'],
                    'skill_level_required': service_data['skill_level'],
                    'barber_hourly_equivalent': round((final_price / service_data['time_minutes']) * 60, 2)
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating service price: {e}")
            # Return safe fallback
            return {
                'service_name': service_name,
                'base_price': base_price or 30.0,
                'final_price': base_price or 30.0,
                'pricing_breakdown': {},
                'six_figure_insights': {
                    'is_premium_positioning': False,
                    'revenue_category': 'standard',
                    'optimization_score': 50.0,
                    'recommended_upsells': []
                },
                'service_details': {
                    'estimated_duration': 30,
                    'skill_level_required': 'basic',
                    'barber_hourly_equivalent': 60.0
                },
                'error': str(e)
            }
    
    def get_pricing_recommendations(
        self,
        barber_id: int,
        service_analysis_period_days: int = 30
    ) -> Dict[str, Any]:
        """
        Generate Six Figure Barber pricing strategy recommendations
        
        Analyzes recent bookings and provides optimization suggestions
        """
        try:
            barber = self.db.query(User).filter(User.id == barber_id).first()
            if not barber:
                raise ValueError(f"Barber not found: {barber_id}")
            
            # Analyze recent appointments
            since_date = datetime.now() - timedelta(days=service_analysis_period_days)
            appointments = self.db.query(Appointment).filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.start_time >= since_date,
                    Appointment.status.in_(['completed', 'confirmed'])
                )
            ).all()
            
            if not appointments:
                return {
                    'recommendations': [
                        "Start tracking appointment data to generate pricing insights",
                        "Focus on establishing baseline service pricing"
                    ],
                    'current_performance': {},
                    'optimization_opportunities': []
                }
            
            # Calculate current performance metrics
            total_revenue = sum(float(apt.price) for apt in appointments if apt.price)
            avg_ticket = total_revenue / len(appointments) if appointments else 0
            total_hours = sum(apt.duration_minutes for apt in appointments) / 60
            hourly_rate = total_revenue / total_hours if total_hours > 0 else 0
            
            # Analyze client tier distribution
            client_tiers = {}
            for apt in appointments:
                if apt.client_id:
                    client = self.db.query(Client).filter(Client.id == apt.client_id).first()
                    if client:
                        tier_analysis = self.client_tier_service.calculate_client_tier(client)
                        tier = tier_analysis['primary_tier']
                        client_tiers[tier] = client_tiers.get(tier, 0) + 1
            
            # Generate recommendations
            recommendations = []
            optimization_opportunities = []
            
            barber_experience = self._get_barber_experience_level(barber)
            max_hourly = self.BARBER_EXPERIENCE_MULTIPLIERS[barber_experience]['max_hourly_rate']
            
            if hourly_rate < max_hourly * 0.7:
                recommendations.append(
                    f"Consider increasing prices - current ${hourly_rate:.0f}/hr is below optimal ${max_hourly * 0.8:.0f}/hr for {barber_experience} level"
                )
                
            if client_tiers.get('platinum', 0) + client_tiers.get('gold', 0) < len(appointments) * 0.3:
                recommendations.append(
                    "Focus on attracting higher-tier clients through premium service positioning"
                )
                
            if avg_ticket < 50:
                optimization_opportunities.append({
                    'category': 'Service Upselling',
                    'description': 'Average ticket below Six Figure Barber targets',
                    'potential_increase': f"${20:.2f} per appointment",
                    'action_items': [
                        'Introduce premium service packages',
                        'Offer add-on services (beard trim, styling)',
                        'Implement consultation upsells'
                    ]
                })
            
            return {
                'current_performance': {
                    'total_appointments': len(appointments),
                    'total_revenue': round(total_revenue, 2),
                    'average_ticket': round(avg_ticket, 2),
                    'effective_hourly_rate': round(hourly_rate, 2),
                    'client_tier_distribution': client_tiers
                },
                'six_figure_targets': {
                    'target_hourly_rate': max_hourly,
                    'target_avg_ticket': max_hourly * 0.75,  # 45-min average service
                    'premium_client_percentage': 40  # 40% gold/platinum clients
                },
                'recommendations': recommendations,
                'optimization_opportunities': optimization_opportunities
            }
            
        except Exception as e:
            logger.error(f"Error generating pricing recommendations: {e}")
            return {
                'recommendations': ["Unable to generate recommendations - please check data"],
                'current_performance': {},
                'optimization_opportunities': [],
                'error': str(e)
            }
    
    def _get_barber_experience_level(self, barber: User) -> str:
        """Determine barber experience level from profile data"""
        # This could be enhanced to use actual experience data from barber profile
        # For now, use hourly rate as proxy
        if hasattr(barber, 'hourly_rate') and barber.hourly_rate:
            rate = float(barber.hourly_rate)
            if rate >= 100:
                return 'expert'
            elif rate >= 70:
                return 'senior' 
            elif rate >= 50:
                return 'mid'
            else:
                return 'junior'
        
        # Fallback to role-based determination
        if hasattr(barber, 'experience_level'):
            return barber.experience_level
        
        return 'mid'  # Safe default
    
    def _calculate_base_price(self, service_data: Dict, barber_experience: str) -> float:
        """Calculate base service price before multipliers"""
        # Base hourly rate for experience level
        base_hourly = {
            'junior': 40, 'mid': 60, 'senior': 80, 'expert': 100
        }.get(barber_experience, 60)
        
        # Calculate based on service time
        service_price = (base_hourly / 60) * service_data['time_minutes']
        
        # Apply complexity adjustment
        service_price *= service_data['complexity']
        
        return round(service_price, 2)
    
    def _calculate_time_premium(self, appointment_datetime: datetime) -> Tuple[float, str]:
        """Calculate time-based pricing premium"""
        hour = appointment_datetime.hour
        weekday = appointment_datetime.weekday()  # 0=Monday, 6=Sunday
        
        # Check for premium time slots
        for slot_type, slot_data in self.TIME_SLOT_MULTIPLIERS.items():
            if 'hours' in slot_data and hour in slot_data['hours']:
                return slot_data['multiplier'], f"{slot_type.replace('_', ' ').title()} Premium"
            if 'days' in slot_data and weekday in slot_data['days']:
                return slot_data['multiplier'], f"{slot_type.replace('_', ' ').title()}"
        
        return 1.0, None
    
    def _get_minimum_price(self, service_data: Dict, barber_experience: str) -> float:
        """Get minimum price for service (Six Figure Barber positioning)"""
        base_minimums = {
            'junior': 25, 'mid': 35, 'senior': 45, 'expert': 60
        }
        return base_minimums.get(barber_experience, 35) * service_data['complexity']
    
    def _categorize_revenue_level(self, price: float) -> str:
        """Categorize price into Six Figure Barber revenue levels"""
        if price >= 80:
            return 'premium'
        elif price >= 60:
            return 'high-value'
        elif price >= 40:
            return 'standard'
        else:
            return 'economy'
    
    def _generate_revenue_insights(
        self, 
        barber_experience: str, 
        client_tier: str, 
        service_data: Dict, 
        final_price: float
    ) -> Dict[str, Any]:
        """Generate Six Figure Barber revenue optimization insights"""
        
        # Calculate optimization score (0-100)
        target_price = self._calculate_base_price(service_data, 'expert')
        optimization_score = min(100, (final_price / target_price) * 100)
        
        # Generate upsell opportunities
        upsell_opportunities = []
        
        if service_data['skill_level'] == 'basic' and barber_experience in ['senior', 'expert']:
            upsell_opportunities.append({
                'service': 'Premium styling consultation',
                'additional_revenue': 25,
                'rationale': 'Leverage expert-level skills for higher value'
            })
        
        if client_tier in ['gold', 'platinum']:
            upsell_opportunities.append({
                'service': 'Premium product package',
                'additional_revenue': 30,
                'rationale': 'High-tier client likely to invest in quality products'
            })
        
        return {
            'optimization_score': round(optimization_score, 1),
            'upsell_opportunities': upsell_opportunities
        }