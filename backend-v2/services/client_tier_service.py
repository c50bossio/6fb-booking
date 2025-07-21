"""
Client Tier Detection Service for Six Figure Barber Methodology

This service implements intelligent client classification based on:
- Spending patterns and lifetime value
- Visit frequency and loyalty indicators  
- Service preferences and upgrade patterns
- Engagement and retention metrics

Integrates with the 6FB methodology to optimize revenue through
personalized service recommendations and pricing strategies.
"""

from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Tuple, Any, Literal
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
import logging

from models import Client, Appointment, Payment, Service
from schemas import DateRange

logger = logging.getLogger(__name__)

# Six Figure Barber Client Tiers
ClientTier = Literal['platinum', 'gold', 'silver', 'bronze', 'new']

class ClientTierService:
    """
    Six Figure Barber Client Tier Detection and Management Service
    
    Provides intelligent client classification and personalized experience
    recommendations based on 6FB methodology principles.
    """
    
    # 6FB Tier Thresholds (configurable based on market/location)
    TIER_THRESHOLDS = {
        'platinum': {
            'min_lifetime_value': 2000.0,
            'min_visits': 20,
            'min_average_ticket': 75.0,
            'max_days_since_visit': 45,
            'min_frequency_score': 0.8
        },
        'gold': {
            'min_lifetime_value': 800.0,
            'min_visits': 10,
            'min_average_ticket': 55.0,
            'max_days_since_visit': 60,
            'min_frequency_score': 0.6
        },
        'silver': {
            'min_lifetime_value': 300.0,
            'min_visits': 5,
            'min_average_ticket': 40.0,
            'max_days_since_visit': 90,
            'min_frequency_score': 0.4
        },
        'bronze': {
            'min_lifetime_value': 100.0,
            'min_visits': 2,
            'min_average_ticket': 25.0,
            'max_days_since_visit': 180,
            'min_frequency_score': 0.2
        }
    }
    
    def __init__(self, db: Session):
        self.db = db
        
    def calculate_client_tier(self, client: Client) -> Dict[str, Any]:
        """
        Calculate comprehensive client tier with 6FB scoring methodology
        
        Returns detailed tier analysis including:
        - Primary tier classification
        - Tier scores for all levels
        - Revenue potential assessment
        - Personalization recommendations
        """
        # Get client metrics
        metrics = self._calculate_client_metrics(client)
        
        # Calculate tier scores
        tier_scores = self._calculate_tier_scores(metrics)
        
        # Determine primary tier
        primary_tier = self._determine_primary_tier(tier_scores, metrics)
        
        # Generate personalization recommendations
        recommendations = self._generate_personalization_recommendations(primary_tier, metrics)
        
        # Calculate revenue potential
        revenue_potential = self._calculate_revenue_potential(primary_tier, metrics)
        
        return {
            'client_id': client.id,
            'primary_tier': primary_tier,
            'tier_scores': tier_scores,
            'metrics': metrics,
            'revenue_potential': revenue_potential,
            'personalization': recommendations,
            'calculated_at': datetime.utcnow().isoformat(),
            'confidence_score': self._calculate_confidence_score(metrics)
        }
    
    def _calculate_client_metrics(self, client: Client) -> Dict[str, Any]:
        """Calculate comprehensive client metrics for tier analysis"""
        
        # Basic metrics from client record
        base_metrics = {
            'lifetime_value': client.total_spent,
            'total_visits': client.total_visits,
            'average_ticket': client.average_ticket,
            'no_show_rate': client.no_show_count / max(client.total_visits, 1),
            'cancellation_rate': client.cancellation_count / max(client.total_visits, 1)
        }
        
        # Calculate recency metrics
        days_since_last_visit = 365  # Default for new clients
        if client.last_visit_date:
            days_since_last_visit = (datetime.utcnow().date() - client.last_visit_date.date()).days
        
        # Calculate frequency score (0.0 to 1.0)
        frequency_score = 0.0
        if client.visit_frequency_days and client.visit_frequency_days > 0:
            # More frequent visits = higher score
            frequency_score = min(1.0, 60 / client.visit_frequency_days)
        
        # Get detailed appointment history
        recent_appointments = self.db.query(Appointment).filter(
            and_(
                Appointment.client_id == client.id,
                Appointment.created_at >= datetime.utcnow() - timedelta(days=180),
                Appointment.status.in_(['completed', 'confirmed'])
            )
        ).order_by(desc(Appointment.created_at)).all()
        
        # Calculate service preferences and upgrade patterns
        service_analysis = self._analyze_service_patterns(recent_appointments)
        
        # Calculate engagement metrics
        engagement_metrics = self._calculate_engagement_metrics(client, recent_appointments)
        
        return {
            **base_metrics,
            'days_since_last_visit': days_since_last_visit,
            'frequency_score': frequency_score,
            'recent_visit_count': len(recent_appointments),
            'service_preferences': service_analysis['preferences'],
            'service_upgrade_rate': service_analysis['upgrade_rate'],
            'premium_service_adoption': service_analysis['premium_adoption'],
            'engagement_score': engagement_metrics['engagement_score'],
            'loyalty_indicators': engagement_metrics['loyalty_indicators']
        }
    
    def _analyze_service_patterns(self, appointments: List[Appointment]) -> Dict[str, Any]:
        """Analyze service patterns for premium service adoption and upgrade trends"""
        
        if not appointments:
            return {
                'preferences': [],
                'upgrade_rate': 0.0,
                'premium_adoption': 0.0
            }
        
        # Service frequency analysis
        service_counts = {}
        total_appointments = len(appointments)
        premium_count = 0
        
        for appointment in appointments:
            service_name = appointment.service_name
            service_counts[service_name] = service_counts.get(service_name, 0) + 1
            
            # Count premium services (>$60 as premium threshold)
            if appointment.price and appointment.price >= 60:
                premium_count += 1
        
        # Calculate preferences (top 3 services)
        preferences = sorted(
            service_counts.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:3]
        
        # Calculate premium adoption rate
        premium_adoption = premium_count / total_appointments if total_appointments > 0 else 0.0
        
        # Calculate upgrade rate (simplified - based on price progression)
        upgrade_rate = 0.0
        if len(appointments) > 1:
            prices = [apt.price for apt in appointments if apt.price]
            if len(prices) > 1:
                # Simple trend analysis
                recent_avg = sum(prices[:3]) / min(3, len(prices))  # Last 3
                older_avg = sum(prices[-3:]) / min(3, len(prices))   # First 3
                upgrade_rate = max(0.0, (recent_avg - older_avg) / older_avg) if older_avg > 0 else 0.0
        
        return {
            'preferences': [{'service': name, 'frequency': count} for name, count in preferences],
            'upgrade_rate': upgrade_rate,
            'premium_adoption': premium_adoption
        }
    
    def _calculate_engagement_metrics(self, client: Client, recent_appointments: List[Appointment]) -> Dict[str, Any]:
        """Calculate client engagement and loyalty metrics"""
        
        # Base engagement score
        engagement_score = 0.0
        
        # Factors that increase engagement
        if client.no_show_count == 0:
            engagement_score += 0.2
        if client.cancellation_count < 2:
            engagement_score += 0.2
        if client.referral_count > 0:
            engagement_score += 0.3
        if len(recent_appointments) >= 3:
            engagement_score += 0.2
        if client.total_visits > 10:
            engagement_score += 0.1
        
        # Loyalty indicators
        loyalty_indicators = {
            'consistent_booking': len(recent_appointments) >= 2,
            'low_no_show': client.no_show_count <= 1,
            'referral_activity': client.referral_count > 0,
            'long_term_client': client.total_visits >= 5,
            'recent_activity': len(recent_appointments) > 0
        }
        
        return {
            'engagement_score': min(1.0, engagement_score),
            'loyalty_indicators': loyalty_indicators
        }
    
    def _calculate_tier_scores(self, metrics: Dict[str, Any]) -> Dict[str, float]:
        """Calculate tier scores for all tiers (0.0 to 1.0)"""
        
        tier_scores = {}
        
        for tier, thresholds in self.TIER_THRESHOLDS.items():
            score = 0.0
            
            # Lifetime value score (30% weight)
            ltv_score = min(1.0, metrics['lifetime_value'] / thresholds['min_lifetime_value'])
            score += ltv_score * 0.3
            
            # Visit count score (20% weight)
            visit_score = min(1.0, metrics['total_visits'] / thresholds['min_visits'])
            score += visit_score * 0.2
            
            # Average ticket score (20% weight)
            ticket_score = min(1.0, metrics['average_ticket'] / thresholds['min_average_ticket'])
            score += ticket_score * 0.2
            
            # Recency score (15% weight)
            recency_score = max(0.0, 1.0 - (metrics['days_since_last_visit'] / thresholds['max_days_since_visit']))
            score += recency_score * 0.15
            
            # Frequency score (15% weight)
            frequency_score = min(1.0, metrics['frequency_score'] / thresholds['min_frequency_score'])
            score += frequency_score * 0.15
            
            tier_scores[tier] = min(1.0, score)
        
        return tier_scores
    
    def _determine_primary_tier(self, tier_scores: Dict[str, float], metrics: Dict[str, Any]) -> ClientTier:
        """Determine primary tier based on scores and business rules"""
        
        # Special case for brand new clients
        if metrics['total_visits'] == 0:
            return 'new'
        
        # Find the highest scoring tier that meets minimum requirements
        viable_tiers = []
        
        for tier, score in tier_scores.items():
            thresholds = self.TIER_THRESHOLDS[tier]
            
            # Check if client meets minimum requirements for this tier
            meets_requirements = (
                metrics['lifetime_value'] >= thresholds['min_lifetime_value'] * 0.8 and  # 80% threshold
                metrics['total_visits'] >= thresholds['min_visits'] and
                metrics['days_since_last_visit'] <= thresholds['max_days_since_visit']
            )
            
            if meets_requirements:
                viable_tiers.append((tier, score))
        
        if viable_tiers:
            # Return the highest tier with best score
            tier_order = ['platinum', 'gold', 'silver', 'bronze']
            viable_tiers.sort(key=lambda x: (tier_order.index(x[0]), -x[1]))
            return viable_tiers[0][0]
        
        # Fallback to bronze if client has any history, otherwise new
        return 'bronze' if metrics['total_visits'] > 0 else 'new'
    
    def _generate_personalization_recommendations(self, tier: ClientTier, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Generate personalized experience recommendations based on tier"""
        
        recommendations = {
            'priority_level': self._get_priority_level(tier),
            'suggested_services': self._get_suggested_services(tier, metrics),
            'pricing_strategy': self._get_pricing_strategy(tier),
            'communication_style': self._get_communication_style(tier),
            'booking_preferences': self._get_booking_preferences(tier),
            'upselling_approach': self._get_upselling_approach(tier, metrics)
        }
        
        return recommendations
    
    def _get_priority_level(self, tier: ClientTier) -> str:
        """Get service priority level for tier"""
        priority_map = {
            'platinum': 'VIP',
            'gold': 'High',
            'silver': 'Standard',
            'bronze': 'Standard',
            'new': 'Welcome'
        }
        return priority_map[tier]
    
    def _get_suggested_services(self, tier: ClientTier, metrics: Dict[str, Any]) -> List[str]:
        """Get tier-appropriate service suggestions"""
        
        base_services = ['Standard Cut', 'Wash & Cut']
        
        if tier == 'platinum':
            return ['Premium Cut & Style', 'Hot Towel Treatment', 'Beard Sculpting', 'Executive Package']
        elif tier == 'gold':
            return ['Signature Cut', 'Beard Trim', 'Hot Towel Shave', 'Style Consultation']
        elif tier == 'silver':
            return ['Classic Cut', 'Beard Maintenance', 'Basic Styling']
        elif tier == 'bronze':
            return base_services + ['Express Cut']
        else:  # new
            return base_services + ['New Client Special']
    
    def _get_pricing_strategy(self, tier: ClientTier) -> Dict[str, Any]:
        """Get tier-appropriate pricing strategy"""
        
        strategies = {
            'platinum': {
                'discount_eligibility': 'loyalty_rewards',
                'premium_service_access': True,
                'priority_booking': True,
                'package_deals': True
            },
            'gold': {
                'discount_eligibility': 'member_discounts',
                'premium_service_access': True,
                'priority_booking': True,
                'package_deals': True
            },
            'silver': {
                'discount_eligibility': 'standard_promotions',
                'premium_service_access': False,
                'priority_booking': False,
                'package_deals': True
            },
            'bronze': {
                'discount_eligibility': 'basic_promotions',
                'premium_service_access': False,
                'priority_booking': False,
                'package_deals': False
            },
            'new': {
                'discount_eligibility': 'new_client_special',
                'premium_service_access': False,
                'priority_booking': False,
                'package_deals': False
            }
        }
        
        return strategies[tier]
    
    def _get_communication_style(self, tier: ClientTier) -> Dict[str, Any]:
        """Get tier-appropriate communication approach"""
        
        styles = {
            'platinum': {
                'tone': 'premium_personal',
                'frequency': 'exclusive_updates',
                'channel_preference': ['email', 'phone'],
                'content_type': 'vip_experiences'
            },
            'gold': {
                'tone': 'professional_friendly',
                'frequency': 'regular_updates',
                'channel_preference': ['email', 'sms'],
                'content_type': 'member_benefits'
            },
            'silver': {
                'tone': 'friendly',
                'frequency': 'standard',
                'channel_preference': ['sms', 'email'],
                'content_type': 'general_promotions'
            },
            'bronze': {
                'tone': 'casual',
                'frequency': 'minimal',
                'channel_preference': ['sms'],
                'content_type': 'basic_reminders'
            },
            'new': {
                'tone': 'welcoming',
                'frequency': 'onboarding_sequence',
                'channel_preference': ['email', 'sms'],
                'content_type': 'welcome_education'
            }
        }
        
        return styles[tier]
    
    def _get_booking_preferences(self, tier: ClientTier) -> Dict[str, Any]:
        """Get tier-appropriate booking experience preferences"""
        
        preferences = {
            'platinum': {
                'advance_booking_days': 30,
                'preferred_time_slots': 'premium_hours',
                'automatic_rebooking': True,
                'concierge_service': True
            },
            'gold': {
                'advance_booking_days': 21,
                'preferred_time_slots': 'flexible',
                'automatic_rebooking': True,
                'concierge_service': False
            },
            'silver': {
                'advance_booking_days': 14,
                'preferred_time_slots': 'standard',
                'automatic_rebooking': False,
                'concierge_service': False
            },
            'bronze': {
                'advance_booking_days': 7,
                'preferred_time_slots': 'available',
                'automatic_rebooking': False,
                'concierge_service': False
            },
            'new': {
                'advance_booking_days': 14,
                'preferred_time_slots': 'available',
                'automatic_rebooking': False,
                'concierge_service': False
            }
        }
        
        return preferences[tier]
    
    def _get_upselling_approach(self, tier: ClientTier, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Get tier-appropriate upselling strategy"""
        
        approaches = {
            'platinum': {
                'aggressiveness': 'consultative',
                'focus': 'exclusive_experiences',
                'timing': 'proactive',
                'success_probability': 0.8
            },
            'gold': {
                'aggressiveness': 'moderate',
                'focus': 'premium_services',
                'timing': 'during_service',
                'success_probability': 0.6
            },
            'silver': {
                'aggressiveness': 'soft',
                'focus': 'value_adds',
                'timing': 'post_service',
                'success_probability': 0.4
            },
            'bronze': {
                'aggressiveness': 'minimal',
                'focus': 'basic_upgrades',
                'timing': 'occasional',
                'success_probability': 0.2
            },
            'new': {
                'aggressiveness': 'educational',
                'focus': 'service_discovery',
                'timing': 'after_first_visit',
                'success_probability': 0.3
            }
        }
        
        return approaches[tier]
    
    def _calculate_revenue_potential(self, tier: ClientTier, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate revenue potential and growth opportunities"""
        
        # Base revenue potential by tier
        tier_potential = {
            'platinum': {'annual_potential': 3000, 'growth_rate': 0.1},
            'gold': {'annual_potential': 1500, 'growth_rate': 0.2},
            'silver': {'annual_potential': 800, 'growth_rate': 0.3},
            'bronze': {'annual_potential': 400, 'growth_rate': 0.4},
            'new': {'annual_potential': 600, 'growth_rate': 0.5}
        }
        
        base_potential = tier_potential[tier]
        
        # Calculate current annual run rate
        current_annual_rate = 0.0
        if metrics['frequency_score'] > 0:
            visits_per_year = 365 / max(metrics.get('visit_frequency_days', 365), 30)
            current_annual_rate = visits_per_year * metrics['average_ticket']
        
        # Calculate growth opportunity
        growth_opportunity = max(0, base_potential['annual_potential'] - current_annual_rate)
        
        return {
            'current_annual_value': current_annual_rate,
            'potential_annual_value': base_potential['annual_potential'],
            'growth_opportunity': growth_opportunity,
            'growth_rate_potential': base_potential['growth_rate'],
            'next_tier_requirement': self._get_next_tier_requirements(tier),
            'revenue_optimization_score': self._calculate_revenue_optimization_score(metrics)
        }
    
    def _get_next_tier_requirements(self, current_tier: ClientTier) -> Optional[Dict[str, Any]]:
        """Get requirements to reach next tier"""
        
        tier_progression = ['new', 'bronze', 'silver', 'gold', 'platinum']
        
        try:
            current_index = tier_progression.index(current_tier)
            if current_index < len(tier_progression) - 1:
                next_tier = tier_progression[current_index + 1]
                return {
                    'next_tier': next_tier,
                    'requirements': self.TIER_THRESHOLDS[next_tier]
                }
        except ValueError:
            pass
        
        return None
    
    def _calculate_revenue_optimization_score(self, metrics: Dict[str, Any]) -> float:
        """Calculate how optimized this client's revenue potential is (0.0 to 1.0)"""
        
        score = 0.0
        
        # High average ticket = good optimization
        if metrics['average_ticket'] >= 60:
            score += 0.3
        elif metrics['average_ticket'] >= 40:
            score += 0.2
        
        # Frequent visits = good optimization
        if metrics['frequency_score'] >= 0.7:
            score += 0.3
        elif metrics['frequency_score'] >= 0.4:
            score += 0.2
        
        # Premium service adoption
        if metrics.get('premium_service_adoption', 0) >= 0.5:
            score += 0.2
        elif metrics.get('premium_service_adoption', 0) >= 0.2:
            score += 0.1
        
        # Low cancellation/no-show rate
        if metrics['no_show_rate'] == 0 and metrics['cancellation_rate'] <= 0.1:
            score += 0.2
        elif metrics['no_show_rate'] <= 0.1 and metrics['cancellation_rate'] <= 0.2:
            score += 0.1
        
        return min(1.0, score)
    
    def _calculate_confidence_score(self, metrics: Dict[str, Any]) -> float:
        """Calculate confidence in tier classification (0.0 to 1.0)"""
        
        confidence = 0.0
        
        # More visits = higher confidence
        if metrics['total_visits'] >= 10:
            confidence += 0.4
        elif metrics['total_visits'] >= 5:
            confidence += 0.3
        elif metrics['total_visits'] >= 2:
            confidence += 0.2
        
        # Recent activity = higher confidence
        if metrics['days_since_last_visit'] <= 30:
            confidence += 0.3
        elif metrics['days_since_last_visit'] <= 90:
            confidence += 0.2
        
        # Consistent patterns = higher confidence
        if metrics['recent_visit_count'] >= 3:
            confidence += 0.2
        
        # High engagement = higher confidence
        if metrics['engagement_score'] >= 0.7:
            confidence += 0.1
        
        return min(1.0, confidence)

    def bulk_calculate_tiers(self, client_ids: Optional[List[int]] = None) -> List[Dict[str, Any]]:
        """Calculate tiers for multiple clients efficiently"""
        
        query = self.db.query(Client)
        if client_ids:
            query = query.filter(Client.id.in_(client_ids))
        
        clients = query.all()
        results = []
        
        for client in clients:
            try:
                tier_data = self.calculate_client_tier(client)
                results.append(tier_data)
            except Exception as e:
                logger.error(f"Failed to calculate tier for client {client.id}: {e}")
                # Include error result for tracking
                results.append({
                    'client_id': client.id,
                    'error': str(e),
                    'calculated_at': datetime.utcnow().isoformat()
                })
        
        return results
    
    def update_client_tier_in_db(self, client_id: int, tier_data: Dict[str, Any]) -> bool:
        """Update client record with calculated tier information"""
        
        try:
            client = self.db.query(Client).filter(Client.id == client_id).first()
            if not client:
                return False
            
            # Update customer_type with tier information
            tier_mapping = {
                'platinum': 'vip',
                'gold': 'vip', 
                'silver': 'returning',
                'bronze': 'returning',
                'new': 'new'
            }
            
            client.customer_type = tier_mapping.get(tier_data['primary_tier'], 'returning')
            
            # Store tier analysis in metadata if client model supports it
            if hasattr(client, 'metadata'):
                if not client.metadata:
                    client.metadata = {}
                client.metadata['tier_analysis'] = tier_data
            
            self.db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Failed to update client tier in database: {e}")
            self.db.rollback()
            return False