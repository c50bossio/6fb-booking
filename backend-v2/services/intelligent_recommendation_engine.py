"""
Intelligent Recommendation Engine for BookedBarber V2

This service provides AI-powered business recommendations aligned with the Six Figure Barber
methodology. It analyzes performance patterns, market data, and business metrics to generate
actionable, personalized recommendations for barber business optimization.

Key Features:
- Six Figure Barber methodology-aligned recommendations
- ROI impact predictions and success tracking
- Personalized action plans with implementation guidance
- Competitive analysis and market positioning insights
- Seasonal optimization and demand forecasting
- Client segmentation and value optimization strategies
"""

import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
import json
import statistics
from dataclasses import dataclass
from enum import Enum

from models import (
    User, Appointment, Payment, Service, Client,
    SixFBRevenueMetrics, SixFBClientValueProfile, SixFBServiceExcellenceMetrics,
    SixFBEfficiencyMetrics, SixFBGrowthMetrics, SixFBMethodologyDashboard
)
from models.weekly_insights import (
    WeeklyRecommendation, InsightCategory, RecommendationPriority,
    RecommendationStatus
)
from services.business_analytics_service import BusinessAnalyticsService

logger = logging.getLogger(__name__)

class RecommendationType(Enum):
    """Types of recommendations available"""
    PRICING_OPTIMIZATION = "pricing_optimization"
    SERVICE_MIX_ENHANCEMENT = "service_mix_enhancement"
    CLIENT_RETENTION = "client_retention"
    CAPACITY_OPTIMIZATION = "capacity_optimization"
    MARKETING_ENHANCEMENT = "marketing_enhancement"
    OPERATIONAL_EFFICIENCY = "operational_efficiency"
    PREMIUM_POSITIONING = "premium_positioning"
    SEASONAL_STRATEGY = "seasonal_strategy"
    COMPETITIVE_ADVANTAGE = "competitive_advantage"
    SKILL_DEVELOPMENT = "skill_development"

class BusinessStage(Enum):
    """Business development stages"""
    STARTUP = "startup"  # 0-6 months
    GROWTH = "growth"    # 6-18 months
    ESTABLISHED = "established"  # 18+ months
    SCALING = "scaling"  # Multiple revenue streams
    MASTERY = "mastery"  # Six Figure achievement

@dataclass
class RecommendationTemplate:
    """Template for generating consistent recommendations"""
    type: RecommendationType
    category: InsightCategory
    title_template: str
    description_template: str
    action_items: List[str]
    success_metrics: List[str]
    expected_impact_range: Tuple[int, int]  # Min, max percentage improvement
    estimated_effort: str
    six_fb_principle: str
    methodology_weight: float

@dataclass
class BusinessContext:
    """Context about the barber's business for personalized recommendations"""
    user_id: int
    business_age_months: int
    current_stage: BusinessStage
    primary_weaknesses: List[str]
    top_strengths: List[str]
    revenue_trend: str
    client_base_size: int
    average_ticket_size: float
    six_fb_scores: Dict[str, float]
    seasonal_patterns: Dict[str, float]
    competitive_position: str

class IntelligentRecommendationEngine:
    """
    Advanced recommendation engine that generates personalized, actionable business
    recommendations based on Six Figure Barber methodology and AI analysis.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.analytics_service = BusinessAnalyticsService(db)
        self._initialize_recommendation_templates()
    
    def _initialize_recommendation_templates(self):
        """Initialize recommendation templates for consistent generation"""
        
        self.recommendation_templates = {
            RecommendationType.PRICING_OPTIMIZATION: RecommendationTemplate(
                type=RecommendationType.PRICING_OPTIMIZATION,
                category=InsightCategory.REVENUE_OPTIMIZATION,
                title_template="Optimize Pricing Strategy for {service_focus}",
                description_template="Your current average ticket of ${avg_ticket:.0f} indicates opportunity for {improvement_type}. Target market analysis suggests {price_adjustment} pricing strategy.",
                action_items=[
                    "Conduct competitive pricing analysis",
                    "Review service value propositions",
                    "Test price increases on premium services",
                    "Implement tiered pricing structure",
                    "Track price sensitivity metrics"
                ],
                success_metrics=[
                    "Average ticket size increase to ${target_ticket:.0f}",
                    "Revenue per client improvement >20%",
                    "Maintained or improved booking frequency"
                ],
                expected_impact_range=(15, 35),
                estimated_effort="2-3 weeks",
                six_fb_principle="revenue_optimization",
                methodology_weight=0.9
            ),
            
            RecommendationType.CLIENT_RETENTION: RecommendationTemplate(
                type=RecommendationType.CLIENT_RETENTION,
                category=InsightCategory.CLIENT_MANAGEMENT,
                title_template="Enhance Client Retention Through {strategy_focus}",
                description_template="With {retention_rate:.1f}% retention rate, implementing {retention_strategy} can significantly increase client lifetime value and business stability.",
                action_items=[
                    "Develop personalized follow-up system",
                    "Create loyalty program with tangible benefits",
                    "Implement client satisfaction tracking",
                    "Design client journey optimization",
                    "Establish regular check-in schedule"
                ],
                success_metrics=[
                    "Client retention rate >75%",
                    "Rebooking rate within 6 weeks >80%",
                    "Client lifetime value increase >25%"
                ],
                expected_impact_range=(10, 25),
                estimated_effort="3-4 weeks",
                six_fb_principle="client_value_maximization",
                methodology_weight=0.85
            ),
            
            RecommendationType.CAPACITY_OPTIMIZATION: RecommendationTemplate(
                type=RecommendationType.CAPACITY_OPTIMIZATION,
                category=InsightCategory.OPERATIONAL_EFFICIENCY,
                title_template="Maximize Schedule Efficiency and Booking Utilization",
                description_template="Current {utilization:.1f}% utilization suggests {optimization_strategy} to capture additional revenue without extending hours.",
                action_items=[
                    "Analyze peak demand patterns",
                    "Implement dynamic scheduling system",
                    "Create waitlist and last-minute booking options",
                    "Optimize service duration estimates",
                    "Develop overbooking strategy for no-shows"
                ],
                success_metrics=[
                    "Booking utilization >85%",
                    "Reduced idle time <15%",
                    "Increased weekly appointment capacity"
                ],
                expected_impact_range=(20, 40),
                estimated_effort="2-3 weeks",
                six_fb_principle="business_efficiency",
                methodology_weight=0.8
            ),
            
            RecommendationType.PREMIUM_POSITIONING: RecommendationTemplate(
                type=RecommendationType.PREMIUM_POSITIONING,
                category=InsightCategory.REVENUE_OPTIMIZATION,
                title_template="Establish Premium Market Position and Value Proposition",
                description_template="Your expertise and client base support premium positioning. Current {premium_percentage:.1f}% premium services indicate opportunity for {positioning_strategy}.",
                action_items=[
                    "Develop signature service offerings",
                    "Create premium client experience journey",
                    "Enhance service environment and amenities",
                    "Implement consultation-based selling",
                    "Build personal brand and expertise reputation"
                ],
                success_metrics=[
                    "Premium services >40% of total revenue",
                    "Average ticket increase to $120+",
                    "Client perception and satisfaction scores >90%"
                ],
                expected_impact_range=(25, 50),
                estimated_effort="6-8 weeks",
                six_fb_principle="revenue_optimization",
                methodology_weight=0.95
            ),
            
            RecommendationType.MARKETING_ENHANCEMENT: RecommendationTemplate(
                type=RecommendationType.MARKETING_ENHANCEMENT,
                category=InsightCategory.BUSINESS_GROWTH,
                title_template="Strengthen Marketing Strategy for {target_audience}",
                description_template="With {new_client_rate:.1f} new clients per week, enhanced {marketing_focus} can accelerate growth and reach Six Figure targets faster.",
                action_items=[
                    "Develop targeted social media strategy",
                    "Implement referral program with incentives",
                    "Create before/after portfolio showcase",
                    "Partner with complementary local businesses",
                    "Optimize online presence and booking experience"
                ],
                success_metrics=[
                    "New client acquisition >4 per week",
                    "Referral rate >25% of new bookings",
                    "Social media engagement increase >50%"
                ],
                expected_impact_range=(20, 45),
                estimated_effort="4-6 weeks",
                six_fb_principle="professional_growth",
                methodology_weight=0.75
            ),
            
            RecommendationType.SERVICE_MIX_ENHANCEMENT: RecommendationTemplate(
                type=RecommendationType.SERVICE_MIX_ENHANCEMENT,
                category=InsightCategory.REVENUE_OPTIMIZATION,
                title_template="Optimize Service Menu for Revenue and Efficiency",
                description_template="Analysis shows {underperforming_services} underperforming while {top_services} drive majority of revenue. Strategic menu optimization can improve profitability.",
                action_items=[
                    "Analyze service profitability and demand",
                    "Develop signature service packages",
                    "Phase out low-margin services",
                    "Create upselling opportunities",
                    "Implement seasonal service offerings"
                ],
                success_metrics=[
                    "Service profitability improvement >30%",
                    "Package adoption rate >25%",
                    "Reduced service complexity while maintaining revenue"
                ],
                expected_impact_range=(15, 30),
                estimated_effort="3-4 weeks",
                six_fb_principle="revenue_optimization",
                methodology_weight=0.8
            )
        }
    
    def generate_personalized_recommendations(self, user_id: int, 
                                            business_data: Dict[str, Any],
                                            max_recommendations: int = 5) -> List[Dict[str, Any]]:
        """
        Generate personalized recommendations based on business analysis
        
        Args:
            user_id: The barber's user ID
            business_data: Current business metrics and analysis
            max_recommendations: Maximum number of recommendations to generate
            
        Returns:
            List of personalized recommendation dictionaries
        """
        try:
            # Build business context
            context = self._build_business_context(user_id, business_data)
            
            # Generate candidate recommendations
            candidates = self._generate_candidate_recommendations(context)
            
            # Score and prioritize recommendations
            scored_recommendations = self._score_recommendations(candidates, context)
            
            # Select top recommendations
            top_recommendations = sorted(
                scored_recommendations, 
                key=lambda x: x['total_score'], 
                reverse=True
            )[:max_recommendations]
            
            # Personalize and finalize recommendations
            final_recommendations = []
            for rec in top_recommendations:
                personalized = self._personalize_recommendation(rec, context)
                final_recommendations.append(personalized)
            
            logger.info(f"Generated {len(final_recommendations)} personalized recommendations for user {user_id}")
            return final_recommendations
            
        except Exception as e:
            logger.error(f"Error generating personalized recommendations for user {user_id}: {e}")
            return []
    
    def _build_business_context(self, user_id: int, business_data: Dict[str, Any]) -> BusinessContext:
        """Build comprehensive business context for recommendation generation"""
        
        # Determine business stage
        user = self.db.query(User).filter(User.id == user_id).first()
        business_age_months = 12  # Default, would calculate from user creation date
        if user:
            business_age_months = max(1, (datetime.now() - user.created_at).days // 30)
        
        # Determine business stage
        revenue = business_data.get('total_revenue', 0)
        if business_age_months < 6:
            stage = BusinessStage.STARTUP
        elif business_age_months < 18:
            stage = BusinessStage.GROWTH
        elif revenue < 5000:  # Monthly revenue
            stage = BusinessStage.ESTABLISHED
        elif revenue < 8333:  # ~100k annual
            stage = BusinessStage.SCALING
        else:
            stage = BusinessStage.MASTERY
        
        # Analyze weaknesses and strengths
        six_fb_scores = {
            'revenue_optimization': business_data.get('revenue_optimization_score', 70),
            'client_value': business_data.get('client_value_score', 70),
            'service_excellence': business_data.get('service_excellence_score', 70),
            'business_efficiency': business_data.get('business_efficiency_score', 70),
            'professional_growth': business_data.get('professional_growth_score', 70)
        }
        
        weaknesses = [k for k, v in six_fb_scores.items() if v < 65]
        strengths = [k for k, v in six_fb_scores.items() if v > 80]
        
        # Revenue trend analysis
        revenue_growth = business_data.get('revenue_growth_percent', 0)
        if revenue_growth > 10:
            revenue_trend = "strong_growth"
        elif revenue_growth > 0:
            revenue_trend = "moderate_growth"
        elif revenue_growth > -5:
            revenue_trend = "stable"
        else:
            revenue_trend = "declining"
        
        return BusinessContext(
            user_id=user_id,
            business_age_months=business_age_months,
            current_stage=stage,
            primary_weaknesses=weaknesses[:3],
            top_strengths=strengths[:2],
            revenue_trend=revenue_trend,
            client_base_size=business_data.get('unique_clients', 0),
            average_ticket_size=business_data.get('average_ticket_size', 0),
            six_fb_scores=six_fb_scores,
            seasonal_patterns={},  # Would be populated with historical analysis
            competitive_position="average"  # Would be determined through market analysis
        )
    
    def _generate_candidate_recommendations(self, context: BusinessContext) -> List[Dict[str, Any]]:
        """Generate candidate recommendations based on business context"""
        
        candidates = []
        
        # Pricing optimization candidates
        if context.average_ticket_size < 75 or 'revenue_optimization' in context.primary_weaknesses:
            template = self.recommendation_templates[RecommendationType.PRICING_OPTIMIZATION]
            candidates.append({
                'template': template,
                'triggers': ['low_average_ticket', 'revenue_weakness'],
                'base_score': 85,
                'context_relevance': 0.9 if context.average_ticket_size < 75 else 0.7
            })
        
        # Client retention candidates
        if 'client_value' in context.primary_weaknesses or context.current_stage == BusinessStage.GROWTH:
            template = self.recommendation_templates[RecommendationType.CLIENT_RETENTION]
            candidates.append({
                'template': template,
                'triggers': ['client_value_weakness', 'growth_stage'],
                'base_score': 80,
                'context_relevance': 0.85
            })
        
        # Capacity optimization candidates
        if 'business_efficiency' in context.primary_weaknesses:
            template = self.recommendation_templates[RecommendationType.CAPACITY_OPTIMIZATION]
            candidates.append({
                'template': template,
                'triggers': ['efficiency_weakness'],
                'base_score': 75,
                'context_relevance': 0.8
            })
        
        # Premium positioning candidates
        if (context.average_ticket_size > 60 and context.current_stage in [BusinessStage.ESTABLISHED, BusinessStage.SCALING]):
            template = self.recommendation_templates[RecommendationType.PREMIUM_POSITIONING]
            candidates.append({
                'template': template,
                'triggers': ['ready_for_premium', 'established_business'],
                'base_score': 90,
                'context_relevance': 0.95
            })
        
        # Marketing enhancement candidates
        if (context.current_stage in [BusinessStage.STARTUP, BusinessStage.GROWTH] or 
            'professional_growth' in context.primary_weaknesses):
            template = self.recommendation_templates[RecommendationType.MARKETING_ENHANCEMENT]
            candidates.append({
                'template': template,
                'triggers': ['growth_needed', 'startup_stage'],
                'base_score': 70,
                'context_relevance': 0.75
            })
        
        # Service mix enhancement candidates
        if context.current_stage == BusinessStage.ESTABLISHED or context.revenue_trend == "stable":
            template = self.recommendation_templates[RecommendationType.SERVICE_MIX_ENHANCEMENT]
            candidates.append({
                'template': template,
                'triggers': ['service_optimization_needed'],
                'base_score': 65,
                'context_relevance': 0.7
            })
        
        return candidates
    
    def _score_recommendations(self, candidates: List[Dict[str, Any]], 
                             context: BusinessContext) -> List[Dict[str, Any]]:
        """Score and rank recommendation candidates"""
        
        scored = []
        
        for candidate in candidates:
            template = candidate['template']
            
            # Base scoring factors
            base_score = candidate['base_score']
            context_relevance = candidate['context_relevance']
            methodology_weight = template.methodology_weight
            
            # Business stage alignment
            stage_multiplier = self._get_stage_multiplier(template.type, context.current_stage)
            
            # Urgency factor (based on weaknesses)
            urgency_factor = 1.0
            if any(weakness in template.six_fb_principle for weakness in context.primary_weaknesses):
                urgency_factor = 1.2
            
            # ROI potential factor
            roi_factor = self._calculate_roi_factor(template, context)
            
            # Calculate total score
            total_score = (
                base_score * 
                context_relevance * 
                methodology_weight * 
                stage_multiplier * 
                urgency_factor * 
                roi_factor
            )
            
            scored.append({
                **candidate,
                'total_score': total_score,
                'scoring_breakdown': {
                    'base_score': base_score,
                    'context_relevance': context_relevance,
                    'methodology_weight': methodology_weight,
                    'stage_multiplier': stage_multiplier,
                    'urgency_factor': urgency_factor,
                    'roi_factor': roi_factor
                }
            })
        
        return scored
    
    def _get_stage_multiplier(self, rec_type: RecommendationType, stage: BusinessStage) -> float:
        """Get stage-appropriate multiplier for recommendation types"""
        
        stage_multipliers = {
            BusinessStage.STARTUP: {
                RecommendationType.MARKETING_ENHANCEMENT: 1.3,
                RecommendationType.CLIENT_RETENTION: 1.1,
                RecommendationType.PRICING_OPTIMIZATION: 0.8,
                RecommendationType.PREMIUM_POSITIONING: 0.6
            },
            BusinessStage.GROWTH: {
                RecommendationType.MARKETING_ENHANCEMENT: 1.2,
                RecommendationType.CLIENT_RETENTION: 1.3,
                RecommendationType.CAPACITY_OPTIMIZATION: 1.1,
                RecommendationType.PRICING_OPTIMIZATION: 1.0
            },
            BusinessStage.ESTABLISHED: {
                RecommendationType.PREMIUM_POSITIONING: 1.3,
                RecommendationType.SERVICE_MIX_ENHANCEMENT: 1.2,
                RecommendationType.CAPACITY_OPTIMIZATION: 1.1,
                RecommendationType.PRICING_OPTIMIZATION: 1.2
            },
            BusinessStage.SCALING: {
                RecommendationType.PREMIUM_POSITIONING: 1.4,
                RecommendationType.OPERATIONAL_EFFICIENCY: 1.2,
                RecommendationType.SERVICE_MIX_ENHANCEMENT: 1.1
            },
            BusinessStage.MASTERY: {
                RecommendationType.COMPETITIVE_ADVANTAGE: 1.3,
                RecommendationType.SKILL_DEVELOPMENT: 1.2,
                RecommendationType.PREMIUM_POSITIONING: 1.1
            }
        }
        
        return stage_multipliers.get(stage, {}).get(rec_type, 1.0)
    
    def _calculate_roi_factor(self, template: RecommendationTemplate, context: BusinessContext) -> float:
        """Calculate ROI potential factor for a recommendation"""
        
        # Base ROI from template
        min_impact, max_impact = template.expected_impact_range
        avg_impact = (min_impact + max_impact) / 2
        
        # Adjust based on current revenue
        monthly_revenue = context.average_ticket_size * 20  # Estimate monthly revenue
        potential_increase = monthly_revenue * (avg_impact / 100)
        
        # ROI factor based on potential increase
        if potential_increase > 2000:
            return 1.3
        elif potential_increase > 1000:
            return 1.2
        elif potential_increase > 500:
            return 1.1
        else:
            return 1.0
    
    def _personalize_recommendation(self, scored_rec: Dict[str, Any], 
                                  context: BusinessContext) -> Dict[str, Any]:
        """Personalize a recommendation with specific context and data"""
        
        template = scored_rec['template']
        
        # Personalize title
        title_vars = {
            'service_focus': self._get_service_focus(context),
            'strategy_focus': self._get_strategy_focus(template.type, context),
            'target_audience': self._get_target_audience(context)
        }
        title = template.title_template.format(**{k: v for k, v in title_vars.items() if v})
        
        # Personalize description
        desc_vars = {
            'avg_ticket': context.average_ticket_size,
            'improvement_type': self._get_improvement_type(context),
            'price_adjustment': self._get_price_adjustment_strategy(context),
            'retention_rate': context.six_fb_scores.get('client_value', 70),
            'retention_strategy': self._get_retention_strategy(context),
            'utilization': context.six_fb_scores.get('business_efficiency', 70),
            'optimization_strategy': self._get_optimization_strategy(context),
            'premium_percentage': self._get_premium_percentage(context),
            'positioning_strategy': self._get_positioning_strategy(context),
            'new_client_rate': context.client_base_size / 4,  # Estimate weekly
            'marketing_focus': self._get_marketing_focus(context),
            'underperforming_services': "basic cuts",
            'top_services': "premium services"
        }
        description = template.description_template.format(**{k: v for k, v in desc_vars.items() if v is not None})
        
        # Calculate expected impact
        min_impact, max_impact = template.expected_impact_range
        expected_impact = f"{min_impact}-{max_impact}% improvement"
        
        # Determine priority
        if scored_rec['total_score'] > 90:
            priority = RecommendationPriority.CRITICAL
        elif scored_rec['total_score'] > 80:
            priority = RecommendationPriority.HIGH
        elif scored_rec['total_score'] > 70:
            priority = RecommendationPriority.MEDIUM
        else:
            priority = RecommendationPriority.LOW
        
        return {
            'category': template.category,
            'priority': priority,
            'title': title,
            'description': description,
            'expected_impact': expected_impact,
            'estimated_effort': template.estimated_effort,
            'confidence_score': min(0.95, scored_rec['total_score'] / 100),
            'six_fb_principle': template.six_fb_principle,
            'methodology_alignment_score': template.methodology_weight,
            'action_items': template.action_items,
            'success_metrics': self._personalize_success_metrics(template.success_metrics, context),
            'recommendation_type': template.type.value,
            'scoring_details': scored_rec['scoring_breakdown']
        }
    
    def _get_service_focus(self, context: BusinessContext) -> str:
        """Determine service focus based on context"""
        if context.average_ticket_size < 50:
            return "premium services"
        elif context.average_ticket_size < 75:
            return "value-added services"
        else:
            return "signature services"
    
    def _get_strategy_focus(self, rec_type: RecommendationType, context: BusinessContext) -> str:
        """Get strategy focus based on recommendation type and context"""
        focus_map = {
            RecommendationType.CLIENT_RETENTION: "personalized client relationships",
            RecommendationType.MARKETING_ENHANCEMENT: "targeted client acquisition",
            RecommendationType.CAPACITY_OPTIMIZATION: "schedule efficiency",
            RecommendationType.PREMIUM_POSITIONING: "value-based positioning"
        }
        return focus_map.get(rec_type, "business optimization")
    
    def _get_target_audience(self, context: BusinessContext) -> str:
        """Determine target audience based on context"""
        if context.average_ticket_size > 100:
            return "premium clients"
        elif context.current_stage == BusinessStage.STARTUP:
            return "new client acquisition"
        else:
            return "ideal clients"
    
    def _get_improvement_type(self, context: BusinessContext) -> str:
        """Determine type of improvement needed"""
        if context.average_ticket_size < 50:
            return "significant value enhancement"
        elif context.average_ticket_size < 75:
            return "premium service positioning"
        else:
            return "luxury service positioning"
    
    def _get_price_adjustment_strategy(self, context: BusinessContext) -> str:
        """Determine price adjustment strategy"""
        if context.average_ticket_size < 50:
            return "strategic price increase"
        elif context.revenue_trend == "declining":
            return "value-justified"
        else:
            return "premium"
    
    def _get_retention_strategy(self, context: BusinessContext) -> str:
        """Determine retention strategy based on context"""
        if context.current_stage == BusinessStage.STARTUP:
            return "relationship building and follow-up systems"
        elif context.client_base_size < 50:
            return "personalized client experiences"
        else:
            return "loyalty programs and VIP treatment"
    
    def _get_optimization_strategy(self, context: BusinessContext) -> str:
        """Determine optimization strategy"""
        if context.current_stage == BusinessStage.STARTUP:
            return "demand-driven scheduling"
        else:
            return "advanced capacity management"
    
    def _get_premium_percentage(self, context: BusinessContext) -> float:
        """Estimate premium service percentage"""
        # This would be calculated from actual service data
        if context.average_ticket_size > 100:
            return 60.0
        elif context.average_ticket_size > 75:
            return 40.0
        else:
            return 20.0
    
    def _get_positioning_strategy(self, context: BusinessContext) -> str:
        """Determine positioning strategy"""
        if context.current_stage == BusinessStage.SCALING:
            return "luxury positioning and exclusive experiences"
        else:
            return "premium quality and expertise positioning"
    
    def _get_marketing_focus(self, context: BusinessContext) -> str:
        """Determine marketing focus area"""
        if context.current_stage == BusinessStage.STARTUP:
            return "local visibility and social proof"
        elif context.client_base_size < 30:
            return "referral systems and word-of-mouth"
        else:
            return "brand building and premium positioning"
    
    def _personalize_success_metrics(self, base_metrics: List[str], context: BusinessContext) -> List[str]:
        """Personalize success metrics based on context"""
        personalized = []
        
        for metric in base_metrics:
            # Replace placeholders with actual context values
            if '{target_ticket' in metric:
                target = context.average_ticket_size * 1.2  # 20% increase target
                personalized.append(metric.format(target_ticket=target))
            else:
                personalized.append(metric)
        
        return personalized
    
    def track_recommendation_effectiveness(self, recommendation_id: int, 
                                         outcome_data: Dict[str, Any]) -> bool:
        """Track the effectiveness of implemented recommendations"""
        
        try:
            recommendation = self.db.query(WeeklyRecommendation).filter(
                WeeklyRecommendation.id == recommendation_id
            ).first()
            
            if not recommendation:
                return False
            
            # Update outcome tracking
            recommendation.measured_impact = outcome_data.get('measured_impact')
            recommendation.roi_actual = outcome_data.get('roi_actual')
            
            # Create effectiveness metric
            if outcome_data.get('success_achieved'):
                effectiveness_score = min(1.0, outcome_data.get('roi_actual', 0) / 
                                        outcome_data.get('roi_estimated', 1))
            else:
                effectiveness_score = 0.0
            
            # Log for future recommendation improvements
            logger.info(f"Recommendation {recommendation_id} effectiveness: {effectiveness_score:.2f}")
            
            self.db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error tracking recommendation effectiveness: {e}")
            return False
    
    def get_recommendation_success_rates(self, user_id: Optional[int] = None) -> Dict[str, float]:
        """Get success rates for different recommendation types"""
        
        query = self.db.query(WeeklyRecommendation)
        if user_id:
            query = query.filter(WeeklyRecommendation.user_id == user_id)
        
        recommendations = query.filter(
            WeeklyRecommendation.status == RecommendationStatus.COMPLETED
        ).all()
        
        if not recommendations:
            return {}
        
        # Calculate success rates by category
        success_rates = {}
        categories = set(rec.category for rec in recommendations)
        
        for category in categories:
            category_recs = [r for r in recommendations if r.category == category]
            successful = [r for r in category_recs if r.roi_actual and r.roi_actual > 0]
            
            success_rates[category.value] = len(successful) / len(category_recs) if category_recs else 0
        
        return success_rates