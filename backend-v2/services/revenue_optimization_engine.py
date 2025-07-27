"""
Revenue Optimization Recommendations Engine for BookedBarber V2

This service implements advanced revenue optimization strategies based on the Six Figure Barber
methodology, providing dynamic pricing recommendations, upselling strategies, and revenue
maximization insights through AI-powered analysis.

Key Features:
- Dynamic pricing optimization based on demand, capacity, and client segments
- Intelligent upselling and cross-selling recommendations
- Service package optimization and bundling strategies
- Peak time and capacity optimization
- Commission structure optimization analysis
- Six Figure Barber methodology revenue targets and tracking

Revenue Optimization Models:
- Price elasticity analysis for service optimization
- Client willingness-to-pay prediction
- Demand forecasting for capacity planning
- Service mix optimization for maximum profitability
- Seasonal pricing strategies
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, extract
import logging
from dataclasses import dataclass
from enum import Enum
import json

from models import User, Appointment, Payment, Client, Service
from services.analytics_service import AnalyticsService
from services.ml_client_lifetime_value_service import MLClientLifetimeValueService, ClientSegment, ClientLTV
from utils.cache_decorators import cache_result

logger = logging.getLogger(__name__)

class PricingStrategy(Enum):
    VALUE_BASED = "value_based"
    PREMIUM = "premium"
    COMPETITIVE = "competitive"
    PENETRATION = "penetration"
    DYNAMIC = "dynamic"

class RecommendationType(Enum):
    PRICE_INCREASE = "price_increase"
    SERVICE_BUNDLE = "service_bundle"
    UPSELL = "upsell"
    CROSS_SELL = "cross_sell"
    RETENTION = "retention"
    CAPACITY_OPTIMIZATION = "capacity_optimization"

@dataclass
class PricingRecommendation:
    service_name: str
    current_price: float
    recommended_price: float
    price_change_percentage: float
    expected_revenue_impact: float
    demand_elasticity: float
    client_segment_impact: Dict[str, float]
    implementation_timeline: str
    risk_level: str
    confidence_score: float
    supporting_data: Dict[str, Any]

@dataclass
class UpsellRecommendation:
    client_id: int
    client_segment: ClientSegment
    primary_service: str
    recommended_upsells: List[Dict[str, Any]]
    expected_revenue_lift: float
    success_probability: float
    optimal_timing: str
    personalized_approach: str
    value_proposition: str
    implementation_steps: List[str]

@dataclass
class ServiceBundleRecommendation:
    bundle_name: str
    included_services: List[str]
    individual_price: float
    bundle_price: float
    discount_percentage: float
    target_segments: List[ClientSegment]
    expected_adoption_rate: float
    revenue_impact: float
    margin_improvement: float
    market_positioning: str

@dataclass
class CapacityOptimizationInsight:
    time_period: str
    current_utilization: float
    optimal_utilization: float
    revenue_opportunity: float
    pricing_adjustments: Dict[str, float]
    staffing_recommendations: List[str]
    booking_strategy: str
    demand_patterns: Dict[str, Any]

@dataclass
class RevenueOptimizationPlan:
    total_potential_increase: float
    monthly_revenue_target: float
    six_figure_compliance_score: float
    pricing_recommendations: List[PricingRecommendation]
    upsell_opportunities: List[UpsellRecommendation]
    bundle_recommendations: List[ServiceBundleRecommendation]
    capacity_insights: List[CapacityOptimizationInsight]
    implementation_roadmap: List[Dict[str, Any]]
    risk_assessment: Dict[str, Any]

class RevenueOptimizationEngine:
    """Advanced revenue optimization engine with AI-powered recommendations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.analytics_service = AnalyticsService(db)
        self.ltv_service = MLClientLifetimeValueService(db)
    
    @cache_result(ttl=1800)  # Cache for 30 minutes
    def generate_optimization_plan(self, user_id: int, target_annual_revenue: float = 150000) -> RevenueOptimizationPlan:
        """
        Generate comprehensive revenue optimization plan
        
        Args:
            user_id: Barber's user ID
            target_annual_revenue: Annual revenue target (default: $150k Six Figure target)
        """
        try:
            logger.info(f"Generating revenue optimization plan for user {user_id}, target: ${target_annual_revenue}")
            
            # Get current performance metrics
            current_metrics = self._analyze_current_performance(user_id)
            
            # Generate pricing recommendations
            pricing_recs = self._generate_pricing_recommendations(user_id, current_metrics)
            
            # Generate upselling opportunities
            upsell_opportunities = self._identify_upsell_opportunities(user_id)
            
            # Generate service bundle recommendations
            bundle_recs = self._recommend_service_bundles(user_id, current_metrics)
            
            # Analyze capacity optimization
            capacity_insights = self._analyze_capacity_optimization(user_id, current_metrics)
            
            # Calculate total potential increase
            total_potential = self._calculate_total_potential(
                pricing_recs, upsell_opportunities, bundle_recs, capacity_insights
            )
            
            # Generate implementation roadmap
            roadmap = self._create_implementation_roadmap(
                pricing_recs, upsell_opportunities, bundle_recs, capacity_insights
            )
            
            # Assess risks
            risk_assessment = self._assess_implementation_risks(
                pricing_recs, current_metrics, target_annual_revenue
            )
            
            # Calculate Six Figure compliance score
            six_figure_score = self._calculate_six_figure_compliance(
                current_metrics, target_annual_revenue
            )
            
            plan = RevenueOptimizationPlan(
                total_potential_increase=total_potential,
                monthly_revenue_target=target_annual_revenue / 12,
                six_figure_compliance_score=six_figure_score,
                pricing_recommendations=pricing_recs,
                upsell_opportunities=upsell_opportunities,
                bundle_recommendations=bundle_recs,
                capacity_insights=capacity_insights,
                implementation_roadmap=roadmap,
                risk_assessment=risk_assessment
            )
            
            logger.info(f"Generated optimization plan with ${total_potential:.0f} potential increase")
            return plan
            
        except Exception as e:
            logger.error(f"Error generating optimization plan for user {user_id}: {str(e)}")
            return self._default_optimization_plan(target_annual_revenue)
    
    def _analyze_current_performance(self, user_id: int) -> Dict[str, Any]:
        """Analyze current revenue performance and patterns"""
        try:
            # Get revenue analytics
            revenue_data = self.analytics_service.get_revenue_analytics(user_ids=[user_id])
            appointment_data = self.analytics_service.get_appointment_analytics(user_ids=[user_id])
            
            # Get service performance data
            services_performance = self._analyze_service_performance(user_id)
            
            # Get client distribution
            client_segments = self.ltv_service.analyze_client_segments(user_id)
            
            # Calculate key metrics
            monthly_revenue = revenue_data.get('total_revenue', 0)
            avg_ticket_size = revenue_data.get('average_transaction_amount', 0)
            total_appointments = appointment_data.get('total_appointments', 0)
            revenue_per_appointment = monthly_revenue / max(total_appointments, 1)
            
            # Get utilization data
            utilization_data = self._calculate_utilization_metrics(user_id)
            
            return {
                'monthly_revenue': monthly_revenue,
                'annual_revenue_projection': monthly_revenue * 12,
                'avg_ticket_size': avg_ticket_size,
                'revenue_per_appointment': revenue_per_appointment,
                'total_appointments': total_appointments,
                'services_performance': services_performance,
                'client_segments': {seg.segment.value: seg for seg in client_segments},
                'utilization_metrics': utilization_data,
                'growth_rate': revenue_data.get('growth_rate', 0),
                'pricing_analysis': self._analyze_current_pricing(user_id)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing current performance for user {user_id}: {str(e)}")
            return {'monthly_revenue': 0, 'avg_ticket_size': 0}
    
    def _analyze_service_performance(self, user_id: int) -> Dict[str, Any]:
        """Analyze performance of individual services"""
        try:
            # Get services and their performance
            services_query = self.db.query(
                Service.name,
                Service.price,
                func.count(Appointment.id).label('appointment_count'),
                func.sum(Payment.amount).label('total_revenue'),
                func.avg(Payment.amount).label('avg_revenue_per_service')
            ).join(
                Appointment, Service.id == Appointment.service_id
            ).join(
                Payment, Appointment.id == Payment.appointment_id
            ).filter(
                Appointment.barber_id == user_id,
                Appointment.status == 'completed',
                Payment.status == 'completed',
                Appointment.appointment_date >= datetime.now() - timedelta(days=90)
            ).group_by(
                Service.id, Service.name, Service.price
            ).all()
            
            services_data = {}
            total_revenue = 0
            total_appointments = 0
            
            for service in services_query:
                service_revenue = float(service.total_revenue or 0)
                service_appointments = int(service.appointment_count or 0)
                
                total_revenue += service_revenue
                total_appointments += service_appointments
                
                services_data[service.name] = {
                    'listed_price': float(service.price or 0),
                    'actual_avg_price': float(service.avg_revenue_per_service or 0),
                    'appointment_count': service_appointments,
                    'total_revenue': service_revenue,
                    'revenue_share': 0,  # Will calculate after getting totals
                    'appointments_share': 0,
                    'price_realization': 0  # actual vs listed price
                }
            
            # Calculate shares and price realization
            for service_name, data in services_data.items():
                if total_revenue > 0:
                    data['revenue_share'] = data['total_revenue'] / total_revenue
                if total_appointments > 0:
                    data['appointments_share'] = data['appointment_count'] / total_appointments
                if data['listed_price'] > 0:
                    data['price_realization'] = data['actual_avg_price'] / data['listed_price']
            
            return services_data
            
        except Exception as e:
            logger.error(f"Error analyzing service performance for user {user_id}: {str(e)}")
            return {}
    
    def _calculate_utilization_metrics(self, user_id: int) -> Dict[str, Any]:
        """Calculate capacity utilization metrics"""
        try:
            # Get appointments for last 30 days
            thirty_days_ago = datetime.now() - timedelta(days=30)
            
            appointments = self.db.query(Appointment).filter(
                Appointment.barber_id == user_id,
                Appointment.appointment_date >= thirty_days_ago,
                Appointment.status.in_(['completed', 'confirmed'])
            ).all()
            
            if not appointments:
                return {'utilization_rate': 0, 'peak_hours': [], 'low_demand_periods': []}
            
            # Calculate hourly distribution
            hourly_distribution = {}
            daily_distribution = {}
            
            for apt in appointments:
                hour = apt.appointment_date.hour
                day = apt.appointment_date.strftime('%A')
                
                hourly_distribution[hour] = hourly_distribution.get(hour, 0) + 1
                daily_distribution[day] = daily_distribution.get(day, 0) + 1
            
            # Calculate utilization rate (assuming 8 hours per day, 6 days per week)
            total_possible_slots = 30 * 6 * 8  # 30 days, 6 days/week, 8 hours/day
            utilization_rate = len(appointments) / total_possible_slots
            
            # Identify peak and low demand periods
            peak_hours = sorted(hourly_distribution.items(), key=lambda x: x[1], reverse=True)[:3]
            peak_days = sorted(daily_distribution.items(), key=lambda x: x[1], reverse=True)[:3]
            
            return {
                'utilization_rate': utilization_rate,
                'total_appointments': len(appointments),
                'hourly_distribution': hourly_distribution,
                'daily_distribution': daily_distribution,
                'peak_hours': [h[0] for h in peak_hours],
                'peak_days': [d[0] for d in peak_days],
                'avg_appointments_per_day': len(appointments) / 30
            }
            
        except Exception as e:
            logger.error(f"Error calculating utilization metrics for user {user_id}: {str(e)}")
            return {'utilization_rate': 0}
    
    def _analyze_current_pricing(self, user_id: int) -> Dict[str, Any]:
        """Analyze current pricing strategy and market position"""
        try:
            services_performance = self._analyze_service_performance(user_id)
            
            if not services_performance:
                return {'avg_service_price': 75, 'pricing_strategy': 'unknown'}
            
            # Calculate pricing metrics
            total_revenue = sum(s['total_revenue'] for s in services_performance.values())
            total_appointments = sum(s['appointment_count'] for s in services_performance.values())
            
            avg_service_price = total_revenue / max(total_appointments, 1)
            
            # Analyze pricing strategy
            price_ranges = [s['actual_avg_price'] for s in services_performance.values() if s['actual_avg_price'] > 0]
            
            if not price_ranges:
                pricing_strategy = 'unknown'
            elif min(price_ranges) >= 100:
                pricing_strategy = 'premium'
            elif max(price_ranges) >= 100 and avg_service_price >= 80:
                pricing_strategy = 'value_based'
            elif avg_service_price >= 60:
                pricing_strategy = 'competitive'
            else:
                pricing_strategy = 'penetration'
            
            # Calculate price consistency
            if len(price_ranges) > 1:
                price_std = np.std(price_ranges)
                price_consistency = 1 - (price_std / np.mean(price_ranges))
            else:
                price_consistency = 1.0
            
            return {
                'avg_service_price': avg_service_price,
                'pricing_strategy': pricing_strategy,
                'price_consistency': price_consistency,
                'price_range': {'min': min(price_ranges) if price_ranges else 0, 'max': max(price_ranges) if price_ranges else 0},
                'six_figure_alignment': avg_service_price / 100  # Six Figure target is $100+ per service
            }
            
        except Exception as e:
            logger.error(f"Error analyzing current pricing for user {user_id}: {str(e)}")
            return {'avg_service_price': 75, 'pricing_strategy': 'unknown'}
    
    def _generate_pricing_recommendations(self, user_id: int, current_metrics: Dict[str, Any]) -> List[PricingRecommendation]:
        """Generate intelligent pricing recommendations"""
        try:
            recommendations = []
            services_performance = current_metrics.get('services_performance', {})
            avg_current_price = current_metrics.get('pricing_analysis', {}).get('avg_service_price', 75)
            
            # Six Figure Barber target: $100+ per service
            six_figure_target = 100
            
            for service_name, performance in services_performance.items():
                current_price = performance['actual_avg_price']
                appointment_count = performance['appointment_count']
                revenue_share = performance['revenue_share']
                
                # Skip low-volume services
                if appointment_count < 5:
                    continue
                
                # Calculate recommended price based on Six Figure methodology
                recommended_price = self._calculate_optimal_price(
                    current_price, appointment_count, revenue_share, six_figure_target
                )
                
                if recommended_price <= current_price * 1.05:  # Less than 5% increase
                    continue
                
                price_change_percentage = ((recommended_price - current_price) / current_price) * 100
                
                # Estimate revenue impact
                demand_elasticity = self._estimate_demand_elasticity(service_name, current_price, appointment_count)
                expected_revenue_impact = self._calculate_revenue_impact(
                    current_price, recommended_price, appointment_count, demand_elasticity
                )
                
                # Analyze client segment impact
                segment_impact = self._analyze_pricing_segment_impact(
                    service_name, current_price, recommended_price, user_id
                )
                
                # Determine implementation timeline and risk
                timeline, risk_level = self._determine_pricing_timeline_and_risk(
                    price_change_percentage, demand_elasticity, appointment_count
                )
                
                # Calculate confidence score
                confidence_score = self._calculate_pricing_confidence(
                    appointment_count, demand_elasticity, revenue_share
                )
                
                recommendation = PricingRecommendation(
                    service_name=service_name,
                    current_price=current_price,
                    recommended_price=recommended_price,
                    price_change_percentage=price_change_percentage,
                    expected_revenue_impact=expected_revenue_impact,
                    demand_elasticity=demand_elasticity,
                    client_segment_impact=segment_impact,
                    implementation_timeline=timeline,
                    risk_level=risk_level,
                    confidence_score=confidence_score,
                    supporting_data={
                        'current_monthly_appointments': appointment_count,
                        'revenue_share': revenue_share,
                        'six_figure_alignment': recommended_price / six_figure_target,
                        'market_position': 'premium' if recommended_price >= six_figure_target else 'value'
                    }
                )
                
                recommendations.append(recommendation)
            
            # Sort by expected revenue impact
            recommendations.sort(key=lambda x: x.expected_revenue_impact, reverse=True)
            
            logger.info(f"Generated {len(recommendations)} pricing recommendations for user {user_id}")
            return recommendations[:5]  # Return top 5 recommendations
            
        except Exception as e:
            logger.error(f"Error generating pricing recommendations for user {user_id}: {str(e)}")
            return []
    
    def _calculate_optimal_price(
        self, 
        current_price: float, 
        appointment_count: int, 
        revenue_share: float, 
        six_figure_target: float
    ) -> float:
        """Calculate optimal price using Six Figure Barber methodology"""
        try:
            # Base recommendation: move towards Six Figure target
            target_based_price = min(six_figure_target, current_price * 1.5)  # Cap at 50% increase
            
            # Adjust based on service popularity (higher volume = higher pricing power)
            popularity_factor = min(1.3, 1 + (appointment_count / 50))  # More appointments = higher factor
            
            # Adjust based on revenue contribution
            revenue_factor = min(1.2, 1 + revenue_share)  # Higher revenue share = pricing power
            
            # Calculate recommended price
            recommended_price = target_based_price * popularity_factor * revenue_factor
            
            # Ensure reasonable bounds
            min_price = current_price * 1.05  # At least 5% increase
            max_price = current_price * 1.4   # At most 40% increase
            
            return max(min_price, min(recommended_price, max_price))
            
        except Exception as e:
            logger.error(f"Error calculating optimal price: {str(e)}")
            return current_price * 1.1  # Default 10% increase
    
    def _estimate_demand_elasticity(self, service_name: str, current_price: float, appointment_count: int) -> float:
        """Estimate price elasticity of demand for service"""
        try:
            # Base elasticity assumptions for barbering services
            base_elasticity = -0.5  # Relatively inelastic
            
            # Adjust based on service type
            if 'premium' in service_name.lower() or 'luxury' in service_name.lower():
                base_elasticity = -0.3  # Premium services are less elastic
            elif 'basic' in service_name.lower() or 'quick' in service_name.lower():
                base_elasticity = -0.7  # Basic services are more elastic
            
            # Adjust based on popularity (high demand = less elastic)
            if appointment_count >= 20:
                base_elasticity *= 0.8  # Less elastic
            elif appointment_count <= 5:
                base_elasticity *= 1.2  # More elastic
            
            # Adjust based on price level (higher prices typically more elastic)
            if current_price >= 100:
                base_elasticity *= 1.1
            elif current_price <= 50:
                base_elasticity *= 0.9
            
            return base_elasticity
            
        except Exception as e:
            logger.error(f"Error estimating demand elasticity: {str(e)}")
            return -0.5  # Default elasticity
    
    def _calculate_revenue_impact(
        self, 
        current_price: float, 
        new_price: float, 
        current_volume: int, 
        elasticity: float
    ) -> float:
        """Calculate expected revenue impact of price change"""
        try:
            price_change_percentage = (new_price - current_price) / current_price
            
            # Calculate volume change using elasticity
            volume_change_percentage = elasticity * price_change_percentage
            new_volume = current_volume * (1 + volume_change_percentage)
            
            # Calculate revenue change
            current_revenue = current_price * current_volume
            new_revenue = new_price * new_volume
            
            return new_revenue - current_revenue
            
        except Exception as e:
            logger.error(f"Error calculating revenue impact: {str(e)}")
            return 0
    
    def _analyze_pricing_segment_impact(
        self, 
        service_name: str, 
        current_price: float, 
        new_price: float, 
        user_id: int
    ) -> Dict[str, float]:
        """Analyze how price changes affect different client segments"""
        try:
            # Get client segments
            client_segments = self.ltv_service.analyze_client_segments(user_id)
            
            segment_impact = {}
            price_increase_percentage = (new_price - current_price) / current_price
            
            for segment_analysis in client_segments:
                segment = segment_analysis.segment.value
                
                # Estimate segment sensitivity to price changes
                if segment == 'premium_vip':
                    # VIP clients are least price sensitive
                    impact = -0.1 * price_increase_percentage
                elif segment == 'high_value':
                    # High value clients moderately price sensitive
                    impact = -0.3 * price_increase_percentage
                elif segment == 'regular':
                    # Regular clients more price sensitive
                    impact = -0.5 * price_increase_percentage
                elif segment == 'developing':
                    # Developing clients quite price sensitive
                    impact = -0.7 * price_increase_percentage
                else:  # at_risk
                    # At-risk clients very price sensitive
                    impact = -0.9 * price_increase_percentage
                
                segment_impact[segment] = impact
            
            return segment_impact
            
        except Exception as e:
            logger.error(f"Error analyzing segment impact: {str(e)}")
            return {}
    
    def _determine_pricing_timeline_and_risk(
        self, 
        price_change_percentage: float, 
        demand_elasticity: float, 
        appointment_count: int
    ) -> Tuple[str, str]:
        """Determine implementation timeline and risk level"""
        try:
            # Determine timeline based on price change magnitude
            if price_change_percentage <= 10:
                timeline = "immediate"
            elif price_change_percentage <= 20:
                timeline = "2-4_weeks"
            elif price_change_percentage <= 30:
                timeline = "1-2_months"
            else:
                timeline = "3-6_months"
            
            # Determine risk level
            volume_risk = abs(demand_elasticity * price_change_percentage / 100)
            
            if volume_risk <= 0.05 and appointment_count >= 15:
                risk_level = "low"
            elif volume_risk <= 0.15 or appointment_count >= 10:
                risk_level = "medium"
            elif volume_risk <= 0.25:
                risk_level = "high"
            else:
                risk_level = "very_high"
            
            return timeline, risk_level
            
        except Exception as e:
            logger.error(f"Error determining timeline and risk: {str(e)}")
            return "2-4_weeks", "medium"
    
    def _calculate_pricing_confidence(
        self, 
        appointment_count: int, 
        demand_elasticity: float, 
        revenue_share: float
    ) -> float:
        """Calculate confidence score for pricing recommendation"""
        try:
            # Data quality score (more appointments = higher confidence)
            data_score = min(1.0, appointment_count / 30)
            
            # Elasticity confidence (closer to typical barbering elasticity = higher confidence)
            typical_elasticity = -0.5
            elasticity_score = max(0.3, 1 - abs(demand_elasticity - typical_elasticity))
            
            # Revenue impact score (higher revenue share = higher confidence)
            revenue_score = min(1.0, revenue_share * 5)  # 20% revenue share = 1.0 score
            
            # Combined confidence score
            confidence = (data_score * 0.4 + elasticity_score * 0.3 + revenue_score * 0.3)
            
            return max(0.1, min(1.0, confidence))
            
        except Exception as e:
            logger.error(f"Error calculating pricing confidence: {str(e)}")
            return 0.5
    
    def _identify_upsell_opportunities(self, user_id: int) -> List[UpsellRecommendation]:
        """Identify upselling opportunities for individual clients"""
        try:
            # Get client LTV data
            client_ltvs = self.ltv_service.predict_client_lifetime_value(user_id)
            
            if not client_ltvs:
                return []
            
            upsell_opportunities = []
            
            for client_ltv in client_ltvs:
                # Focus on clients with upsell potential
                if client_ltv.churn_risk.value in ['critical', 'high']:
                    continue  # Skip at-risk clients for upselling
                
                # Generate upsell recommendations
                recommendations = self._generate_client_upsell_recommendations(
                    client_ltv, user_id
                )
                
                if recommendations:
                    upsell_opportunities.append(recommendations)
            
            # Sort by expected revenue lift
            upsell_opportunities.sort(key=lambda x: x.expected_revenue_lift, reverse=True)
            
            logger.info(f"Identified {len(upsell_opportunities)} upsell opportunities for user {user_id}")
            return upsell_opportunities[:10]  # Return top 10 opportunities
            
        except Exception as e:
            logger.error(f"Error identifying upsell opportunities for user {user_id}: {str(e)}")
            return []
    
    def _generate_client_upsell_recommendations(self, client_ltv: ClientLTV, user_id: int) -> Optional[UpsellRecommendation]:
        """Generate specific upsell recommendations for a client"""
        try:
            # Get client's service history
            client_services = self._get_client_service_history(client_ltv.client_id)
            
            if not client_services:
                return None
            
            # Determine primary service
            primary_service = max(client_services.items(), key=lambda x: x[1]['frequency'])[0]
            
            # Generate upsell options based on segment and history
            upsell_options = self._generate_upsell_options(
                client_ltv.segment, primary_service, client_services, client_ltv.average_service_value
            )
            
            if not upsell_options:
                return None
            
            # Calculate expected revenue lift
            current_monthly_value = client_ltv.average_service_value * (client_ltv.lifetime_visits_predicted / 12)
            upsell_value = sum(opt['price_increase'] for opt in upsell_options)
            expected_lift = upsell_value * (client_ltv.lifetime_visits_predicted / 12)
            
            # Calculate success probability
            success_probability = self._calculate_upsell_success_probability(
                client_ltv.segment, client_ltv.engagement_score, upsell_value
            )
            
            # Determine optimal timing
            optimal_timing = self._determine_upsell_timing(client_ltv)
            
            # Create personalized approach
            personalized_approach = self._create_personalized_upsell_approach(
                client_ltv.segment, upsell_options
            )
            
            # Generate value proposition
            value_proposition = self._create_upsell_value_proposition(
                upsell_options, client_ltv.segment
            )
            
            # Create implementation steps
            implementation_steps = self._create_upsell_implementation_steps(
                upsell_options, optimal_timing, personalized_approach
            )
            
            return UpsellRecommendation(
                client_id=client_ltv.client_id,
                client_segment=client_ltv.segment,
                primary_service=primary_service,
                recommended_upsells=upsell_options,
                expected_revenue_lift=expected_lift,
                success_probability=success_probability,
                optimal_timing=optimal_timing,
                personalized_approach=personalized_approach,
                value_proposition=value_proposition,
                implementation_steps=implementation_steps
            )
            
        except Exception as e:
            logger.error(f"Error generating client upsell recommendations: {str(e)}")
            return None
    
    def _get_client_service_history(self, client_id: int) -> Dict[str, Any]:
        """Get client's service history and preferences"""
        try:
            services_query = self.db.query(
                Service.name,
                func.count(Appointment.id).label('frequency'),
                func.avg(Payment.amount).label('avg_payment'),
                func.max(Appointment.appointment_date).label('last_service_date')
            ).join(
                Appointment, Service.id == Appointment.service_id
            ).join(
                Payment, Appointment.id == Payment.appointment_id
            ).filter(
                Appointment.client_id == client_id,
                Appointment.status == 'completed',
                Payment.status == 'completed'
            ).group_by(
                Service.id, Service.name
            ).all()
            
            services_data = {}
            for service in services_query:
                services_data[service.name] = {
                    'frequency': int(service.frequency),
                    'avg_payment': float(service.avg_payment or 0),
                    'last_service_date': service.last_service_date
                }
            
            return services_data
            
        except Exception as e:
            logger.error(f"Error getting client service history for client {client_id}: {str(e)}")
            return {}
    
    def _generate_upsell_options(
        self, 
        segment: ClientSegment, 
        primary_service: str, 
        service_history: Dict[str, Any], 
        current_avg_spend: float
    ) -> List[Dict[str, Any]]:
        """Generate specific upsell options based on client profile"""
        options = []
        
        try:
            # Service upgrade recommendations based on Six Figure methodology
            if current_avg_spend < 100:  # Below Six Figure target
                options.append({
                    'type': 'service_upgrade',
                    'name': 'Premium Service Package',
                    'description': 'Upgrade to premium service with enhanced techniques and products',
                    'price_increase': 100 - current_avg_spend,
                    'frequency': 'per_visit',
                    'six_figure_alignment': True
                })
            
            # Add-on services
            if 'beard' not in primary_service.lower():
                options.append({
                    'type': 'add_on',
                    'name': 'Professional Beard Styling',
                    'description': 'Complete your look with expert beard trimming and styling',
                    'price_increase': 25,
                    'frequency': 'per_visit',
                    'six_figure_alignment': True
                })
            
            if 'facial' not in primary_service.lower():
                options.append({
                    'type': 'add_on',
                    'name': 'Refreshing Face Treatment',
                    'description': 'Premium facial treatment to complete your grooming experience',
                    'price_increase': 35,
                    'frequency': 'monthly',
                    'six_figure_alignment': True
                })
            
            # Product sales
            options.append({
                'type': 'product_sale',
                'name': 'Premium Grooming Products',
                'description': 'Take-home professional-grade styling products',
                'price_increase': 50,
                'frequency': 'monthly',
                'six_figure_alignment': True
            })
            
            # Membership/package deals
            if segment in [ClientSegment.HIGH_VALUE, ClientSegment.PREMIUM_VIP]:
                options.append({
                    'type': 'membership',
                    'name': 'VIP Membership Package',
                    'description': 'Exclusive membership with priority booking and premium services',
                    'price_increase': 200,  # Monthly membership fee
                    'frequency': 'monthly',
                    'six_figure_alignment': True
                })
            
            # Filter options based on segment
            if segment == ClientSegment.DEVELOPING:
                # Focus on smaller, gradual upsells
                options = [opt for opt in options if opt['price_increase'] <= 30]
            elif segment == ClientSegment.PREMIUM_VIP:
                # All options available, prioritize premium
                pass
            else:
                # Regular and high-value clients - moderate upsells
                options = [opt for opt in options if opt['price_increase'] <= 100]
            
            return options[:3]  # Return top 3 options
            
        except Exception as e:
            logger.error(f"Error generating upsell options: {str(e)}")
            return []
    
    def _calculate_upsell_success_probability(
        self, 
        segment: ClientSegment, 
        engagement_score: float, 
        upsell_value: float
    ) -> float:
        """Calculate probability of successful upsell"""
        try:
            # Base probability by segment
            segment_probabilities = {
                ClientSegment.PREMIUM_VIP: 0.8,
                ClientSegment.HIGH_VALUE: 0.6,
                ClientSegment.REGULAR: 0.4,
                ClientSegment.DEVELOPING: 0.3,
                ClientSegment.AT_RISK: 0.1
            }
            
            base_probability = segment_probabilities.get(segment, 0.4)
            
            # Adjust for engagement score
            engagement_factor = 0.5 + (engagement_score * 0.5)
            
            # Adjust for upsell value (smaller upsells more likely to succeed)
            if upsell_value <= 25:
                value_factor = 1.0
            elif upsell_value <= 50:
                value_factor = 0.9
            elif upsell_value <= 100:
                value_factor = 0.7
            else:
                value_factor = 0.5
            
            success_probability = base_probability * engagement_factor * value_factor
            
            return max(0.1, min(0.95, success_probability))
            
        except Exception as e:
            logger.error(f"Error calculating upsell success probability: {str(e)}")
            return 0.5
    
    def _determine_upsell_timing(self, client_ltv: ClientLTV) -> str:
        """Determine optimal timing for upsell approach"""
        try:
            days_since_last = client_ltv.last_visit_days_ago
            
            if days_since_last <= 7:
                return "next_visit"
            elif days_since_last <= 21:
                return "within_2_weeks"
            elif days_since_last <= 45:
                return "schedule_appointment"
            else:
                return "re_engagement_first"
                
        except Exception as e:
            logger.error(f"Error determining upsell timing: {str(e)}")
            return "next_visit"
    
    def _create_personalized_upsell_approach(self, segment: ClientSegment, upsell_options: List[Dict]) -> str:
        """Create personalized approach strategy"""
        try:
            if segment == ClientSegment.PREMIUM_VIP:
                return "Exclusive preview of new premium services with VIP treatment"
            elif segment == ClientSegment.HIGH_VALUE:
                return "Personalized consultation on enhanced service options"
            elif segment == ClientSegment.REGULAR:
                return "Educational approach focusing on value and benefits"
            elif segment == ClientSegment.DEVELOPING:
                return "Gentle introduction with trial options and special pricing"
            else:
                return "Re-engagement with special offer to rebuild relationship"
                
        except Exception as e:
            logger.error(f"Error creating personalized approach: {str(e)}")
            return "Consultative approach focusing on client needs"
    
    def _create_upsell_value_proposition(self, upsell_options: List[Dict], segment: ClientSegment) -> str:
        """Create compelling value proposition"""
        try:
            if segment == ClientSegment.PREMIUM_VIP:
                return "Exclusive access to the finest grooming experience that reflects your success"
            elif segment == ClientSegment.HIGH_VALUE:
                return "Enhanced services that elevate your professional image and save you time"
            else:
                return "Professional grooming that enhances your confidence and personal brand"
                
        except Exception as e:
            logger.error(f"Error creating value proposition: {str(e)}")
            return "Enhanced grooming experience tailored to your needs"
    
    def _create_upsell_implementation_steps(
        self, 
        upsell_options: List[Dict], 
        timing: str, 
        approach: str
    ) -> List[str]:
        """Create step-by-step implementation plan"""
        steps = []
        
        try:
            if timing == "next_visit":
                steps.append("🎯 Prepare personalized service recommendation during current visit")
                steps.append("💬 Present options naturally during service discussion")
                steps.append("✨ Demonstrate value through enhanced service experience")
            elif timing == "within_2_weeks":
                steps.append("📱 Send personalized follow-up message highlighting new options")
                steps.append("📅 Offer convenient booking for enhanced service trial")
                steps.append("🎁 Include limited-time introduction incentive")
            else:
                steps.append("🤝 Schedule consultation to understand current needs")
                steps.append("📊 Present customized service enhancement plan")
                steps.append("⭐ Offer trial period with satisfaction guarantee")
            
            steps.append("📈 Track client response and satisfaction")
            steps.append("🔄 Follow up to ensure service meets expectations")
            
            return steps
            
        except Exception as e:
            logger.error(f"Error creating implementation steps: {str(e)}")
            return ["💬 Discuss service options with client", "📅 Schedule follow-up"]
    
    def _recommend_service_bundles(self, user_id: int, current_metrics: Dict[str, Any]) -> List[ServiceBundleRecommendation]:
        """Recommend service bundles for revenue optimization"""
        try:
            services_performance = current_metrics.get('services_performance', {})
            
            if len(services_performance) < 2:
                return []
            
            bundle_recommendations = []
            
            # Six Figure Barber Premium Package
            premium_services = [name for name, perf in services_performance.items() 
                             if perf['actual_avg_price'] >= 80]
            
            if len(premium_services) >= 2:
                individual_price = sum(services_performance[name]['actual_avg_price'] 
                                     for name in premium_services[:3])
                bundle_price = individual_price * 0.85  # 15% discount
                
                bundle_recommendations.append(ServiceBundleRecommendation(
                    bundle_name="Six Figure Premium Experience",
                    included_services=premium_services[:3],
                    individual_price=individual_price,
                    bundle_price=bundle_price,
                    discount_percentage=15.0,
                    target_segments=[ClientSegment.PREMIUM_VIP, ClientSegment.HIGH_VALUE],
                    expected_adoption_rate=0.25,
                    revenue_impact=bundle_price * 0.25 * 10,  # Estimated monthly impact
                    margin_improvement=0.2,
                    market_positioning="Premium luxury grooming experience"
                ))
            
            # Regular Maintenance Package
            regular_services = [name for name, perf in services_performance.items() 
                              if 40 <= perf['actual_avg_price'] < 80]
            
            if len(regular_services) >= 2:
                individual_price = sum(services_performance[name]['actual_avg_price'] 
                                     for name in regular_services[:2])
                bundle_price = individual_price * 0.9  # 10% discount
                
                bundle_recommendations.append(ServiceBundleRecommendation(
                    bundle_name="Regular Maintenance Package",
                    included_services=regular_services[:2],
                    individual_price=individual_price,
                    bundle_price=bundle_price,
                    discount_percentage=10.0,
                    target_segments=[ClientSegment.REGULAR, ClientSegment.DEVELOPING],
                    expected_adoption_rate=0.4,
                    revenue_impact=bundle_price * 0.4 * 15,
                    margin_improvement=0.15,
                    market_positioning="Consistent professional grooming"
                ))
            
            return bundle_recommendations
            
        except Exception as e:
            logger.error(f"Error recommending service bundles for user {user_id}: {str(e)}")
            return []
    
    def _analyze_capacity_optimization(self, user_id: int, current_metrics: Dict[str, Any]) -> List[CapacityOptimizationInsight]:
        """Analyze capacity optimization opportunities"""
        try:
            utilization_metrics = current_metrics.get('utilization_metrics', {})
            current_utilization = utilization_metrics.get('utilization_rate', 0)
            
            insights = []
            
            # Peak time optimization
            peak_hours = utilization_metrics.get('peak_hours', [])
            if peak_hours:
                insights.append(CapacityOptimizationInsight(
                    time_period=f"Peak Hours ({', '.join(map(str, peak_hours))})",
                    current_utilization=min(1.0, current_utilization * 1.5),  # Assume peaks are 50% higher
                    optimal_utilization=0.85,
                    revenue_opportunity=500,  # Estimated monthly opportunity
                    pricing_adjustments={'peak_premium': 1.2},  # 20% peak pricing
                    staffing_recommendations=["Consider additional staff during peak hours"],
                    booking_strategy="Implement dynamic pricing for peak time slots",
                    demand_patterns=utilization_metrics.get('hourly_distribution', {})
                ))
            
            # Overall capacity optimization
            if current_utilization < 0.7:
                revenue_opportunity = (0.7 - current_utilization) * current_metrics.get('monthly_revenue', 0) / current_utilization
                
                insights.append(CapacityOptimizationInsight(
                    time_period="Overall Capacity",
                    current_utilization=current_utilization,
                    optimal_utilization=0.75,
                    revenue_opportunity=revenue_opportunity,
                    pricing_adjustments={'off_peak_discount': 0.9},  # 10% off-peak discount
                    staffing_recommendations=["Optimize scheduling to increase booking availability"],
                    booking_strategy="Encourage off-peak bookings with incentives",
                    demand_patterns=utilization_metrics.get('daily_distribution', {})
                ))
            
            return insights
            
        except Exception as e:
            logger.error(f"Error analyzing capacity optimization for user {user_id}: {str(e)}")
            return []
    
    def _calculate_total_potential(
        self, 
        pricing_recs: List[PricingRecommendation],
        upsell_opportunities: List[UpsellRecommendation],
        bundle_recs: List[ServiceBundleRecommendation],
        capacity_insights: List[CapacityOptimizationInsight]
    ) -> float:
        """Calculate total revenue potential from all recommendations"""
        try:
            total_potential = 0
            
            # Pricing recommendations impact
            total_potential += sum(rec.expected_revenue_impact for rec in pricing_recs)
            
            # Upselling impact (monthly, so multiply by success probability)
            upsell_monthly = sum(
                rec.expected_revenue_lift * rec.success_probability 
                for rec in upsell_opportunities
            )
            total_potential += upsell_monthly
            
            # Bundle recommendations impact
            total_potential += sum(rec.revenue_impact for rec in bundle_recs)
            
            # Capacity optimization impact
            total_potential += sum(insight.revenue_opportunity for insight in capacity_insights)
            
            return total_potential
            
        except Exception as e:
            logger.error(f"Error calculating total potential: {str(e)}")
            return 0
    
    def _create_implementation_roadmap(
        self,
        pricing_recs: List[PricingRecommendation],
        upsell_opportunities: List[UpsellRecommendation],
        bundle_recs: List[ServiceBundleRecommendation],
        capacity_insights: List[CapacityOptimizationInsight]
    ) -> List[Dict[str, Any]]:
        """Create prioritized implementation roadmap"""
        roadmap = []
        
        try:
            # Phase 1: Quick wins (0-4 weeks)
            immediate_actions = []
            
            # Low-risk pricing changes
            for rec in pricing_recs:
                if rec.risk_level == 'low' and rec.implementation_timeline == 'immediate':
                    immediate_actions.append({
                        'action': f"Implement {rec.price_change_percentage:.1f}% price increase for {rec.service_name}",
                        'expected_impact': rec.expected_revenue_impact,
                        'effort': 'low'
                    })
            
            # High-probability upsells
            for upsell in upsell_opportunities[:3]:
                if upsell.success_probability >= 0.6:
                    immediate_actions.append({
                        'action': f"Implement upselling strategy for client {upsell.client_id}",
                        'expected_impact': upsell.expected_revenue_lift * upsell.success_probability,
                        'effort': 'low'
                    })
            
            if immediate_actions:
                roadmap.append({
                    'phase': 'Phase 1: Quick Wins',
                    'timeline': '0-4 weeks',
                    'actions': immediate_actions,
                    'total_expected_impact': sum(a['expected_impact'] for a in immediate_actions)
                })
            
            # Phase 2: Strategic initiatives (1-3 months)
            strategic_actions = []
            
            # Service bundles
            for bundle in bundle_recs:
                strategic_actions.append({
                    'action': f"Launch {bundle.bundle_name} service package",
                    'expected_impact': bundle.revenue_impact,
                    'effort': 'medium'
                })
            
            # Medium-risk pricing changes
            for rec in pricing_recs:
                if rec.risk_level in ['medium', 'high'] or rec.implementation_timeline != 'immediate':
                    strategic_actions.append({
                        'action': f"Gradual price optimization for {rec.service_name}",
                        'expected_impact': rec.expected_revenue_impact,
                        'effort': 'medium'
                    })
            
            if strategic_actions:
                roadmap.append({
                    'phase': 'Phase 2: Strategic Initiatives',
                    'timeline': '1-3 months',
                    'actions': strategic_actions,
                    'total_expected_impact': sum(a['expected_impact'] for a in strategic_actions)
                })
            
            # Phase 3: Capacity optimization (3-6 months)
            capacity_actions = []
            
            for insight in capacity_insights:
                capacity_actions.append({
                    'action': f"Optimize {insight.time_period} capacity utilization",
                    'expected_impact': insight.revenue_opportunity,
                    'effort': 'high'
                })
            
            if capacity_actions:
                roadmap.append({
                    'phase': 'Phase 3: Capacity Optimization',
                    'timeline': '3-6 months',
                    'actions': capacity_actions,
                    'total_expected_impact': sum(a['expected_impact'] for a in capacity_actions)
                })
            
            return roadmap
            
        except Exception as e:
            logger.error(f"Error creating implementation roadmap: {str(e)}")
            return []
    
    def _assess_implementation_risks(
        self, 
        pricing_recs: List[PricingRecommendation], 
        current_metrics: Dict[str, Any], 
        target_revenue: float
    ) -> Dict[str, Any]:
        """Assess risks of implementing revenue optimization plan"""
        try:
            risk_assessment = {
                'overall_risk_level': 'medium',
                'key_risks': [],
                'mitigation_strategies': [],
                'success_probability': 0.75
            }
            
            # Analyze pricing risks
            high_risk_pricing = [rec for rec in pricing_recs if rec.risk_level in ['high', 'very_high']]
            if high_risk_pricing:
                risk_assessment['key_risks'].append("High-risk pricing changes may reduce client volume")
                risk_assessment['mitigation_strategies'].append("Implement gradual price increases with client communication")
            
            # Analyze market position risk
            current_avg_price = current_metrics.get('pricing_analysis', {}).get('avg_service_price', 75)
            if current_avg_price < 60:
                risk_assessment['key_risks'].append("Low current pricing may make increases challenging")
                risk_assessment['mitigation_strategies'].append("Focus on value enhancement before price increases")
            
            # Analyze competition risk
            if current_avg_price > 120:
                risk_assessment['key_risks'].append("Already premium pricing may limit further increases")
                risk_assessment['mitigation_strategies'].append("Focus on upselling and capacity optimization")
            
            # Calculate overall risk level
            total_price_increase = sum(rec.price_change_percentage for rec in pricing_recs)
            if total_price_increase > 50:  # More than 50% average increase
                risk_assessment['overall_risk_level'] = 'high'
                risk_assessment['success_probability'] = 0.6
            elif total_price_increase > 20:
                risk_assessment['overall_risk_level'] = 'medium'
                risk_assessment['success_probability'] = 0.75
            else:
                risk_assessment['overall_risk_level'] = 'low'
                risk_assessment['success_probability'] = 0.85
            
            return risk_assessment
            
        except Exception as e:
            logger.error(f"Error assessing implementation risks: {str(e)}")
            return {'overall_risk_level': 'medium', 'success_probability': 0.75}
    
    def _calculate_six_figure_compliance(self, current_metrics: Dict[str, Any], target_revenue: float) -> float:
        """Calculate compliance with Six Figure Barber methodology"""
        try:
            # Six Figure Barber key metrics
            target_avg_service = 100  # $100+ per service
            target_monthly_revenue = target_revenue / 12
            
            current_avg_service = current_metrics.get('pricing_analysis', {}).get('avg_service_price', 75)
            current_monthly_revenue = current_metrics.get('monthly_revenue', 0)
            
            # Calculate compliance scores
            service_price_compliance = min(1.0, current_avg_service / target_avg_service)
            revenue_compliance = min(1.0, current_monthly_revenue / target_monthly_revenue)
            
            # Value-based positioning (premium pricing strategy)
            pricing_strategy = current_metrics.get('pricing_analysis', {}).get('pricing_strategy', 'unknown')
            positioning_compliance = 1.0 if pricing_strategy in ['premium', 'value_based'] else 0.5
            
            # Overall compliance score
            compliance_score = (
                service_price_compliance * 0.4 +
                revenue_compliance * 0.4 +
                positioning_compliance * 0.2
            )
            
            return max(0.0, min(1.0, compliance_score))
            
        except Exception as e:
            logger.error(f"Error calculating Six Figure compliance: {str(e)}")
            return 0.5
    
    def _default_optimization_plan(self, target_revenue: float) -> RevenueOptimizationPlan:
        """Return default optimization plan when analysis fails"""
        return RevenueOptimizationPlan(
            total_potential_increase=1000.0,
            monthly_revenue_target=target_revenue / 12,
            six_figure_compliance_score=0.5,
            pricing_recommendations=[],
            upsell_opportunities=[],
            bundle_recommendations=[],
            capacity_insights=[],
            implementation_roadmap=[],
            risk_assessment={'overall_risk_level': 'unknown', 'success_probability': 0.5}
        )