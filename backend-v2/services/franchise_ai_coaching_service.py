"""
Franchise AI Coaching Service for Enterprise-Scale Six Figure Barber Methodology

This service extends the existing SixFBCoach to provide franchise-aware coaching
capabilities including cross-network learning, performance optimization, and 
network-wide growth opportunity identification.
"""

from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import logging
import statistics
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from .six_figure_barber_coach import SixFBCoach, CoachingInsight, CoachingCategory, CoachingPriority
from models.franchise_security import FranchiseNetwork, SecurityZone
from models import User, Location, Appointment, Payment
from models.analytics import PerformanceBenchmark, CrossUserMetric


logger = logging.getLogger(__name__)


class FranchiseCoachingCategory(Enum):
    """Extended coaching categories for franchise operations"""
    FRANCHISE_GROWTH = "franchise_growth"
    CROSS_LOCATION_EFFICIENCY = "cross_location_efficiency"
    NETWORK_OPTIMIZATION = "network_optimization"
    MARKET_EXPANSION = "market_expansion"
    COMPLIANCE_MANAGEMENT = "compliance_management"
    TALENT_DEVELOPMENT = "talent_development"
    OPERATIONAL_EXCELLENCE = "operational_excellence"


class FranchisePerformanceLevel(Enum):
    """Franchise performance levels for segmentation"""
    EMERGING = "emerging"           # New franchises (0-12 months)
    DEVELOPING = "developing"       # Growing franchises (1-3 years)
    ESTABLISHED = "established"     # Mature franchises (3-5 years)
    ELITE = "elite"                # Top-performing franchises (5+ years)


@dataclass
class FranchiseCoachingInsight(CoachingInsight):
    """Extended coaching insight for franchise operations"""
    franchise_context: str = ""
    cross_network_benchmark: Dict[str, Any] = field(default_factory=dict)
    market_opportunity_score: float = 0.0
    franchise_expansion_potential: float = 0.0
    compliance_considerations: List[str] = field(default_factory=list)
    network_best_practices: List[str] = field(default_factory=list)


@dataclass
class CrossNetworkMetrics:
    """Anonymized cross-network performance metrics"""
    metric_name: str
    user_value: float
    network_percentile: float
    top_quartile_threshold: float
    network_average: float
    sample_size: int
    improvement_opportunity: float
    best_practice_examples: List[str] = field(default_factory=list)


@dataclass
class FranchiseGrowthOpportunity:
    """Franchise growth opportunity analysis"""
    opportunity_type: str
    market_size: float
    competition_level: str
    roi_potential: float
    implementation_timeline: str
    required_investment: float
    success_probability: float
    supporting_data: Dict[str, Any] = field(default_factory=dict)


class FranchiseAICoachingService:
    """
    Enhanced AI coaching service for franchise operations
    
    Extends existing 6FB coaching with franchise-specific intelligence:
    - Cross-network learning and benchmarking
    - Franchise growth optimization
    - Market expansion opportunities
    - Operational excellence coaching
    """
    
    def __init__(self, db: Session, franchise_network_id: Optional[str] = None):
        self.db = db
        self.franchise_network_id = franchise_network_id
        
    def generate_franchise_coaching(
        self, 
        location_id: int, 
        analytics_data: Dict[str, Any],
        include_cross_network: bool = True
    ) -> List[FranchiseCoachingInsight]:
        """
        Generate comprehensive franchise coaching insights
        
        Args:
            location_id: Target location for coaching
            analytics_data: Performance data for the location
            include_cross_network: Include cross-network benchmarking
            
        Returns:
            List of franchise-specific coaching insights
        """
        insights = []
        
        try:
            # Get base 6FB coaching insights
            base_coach = SixFBCoach(analytics_data)
            base_insights = base_coach.generate_comprehensive_coaching()
            
            # Convert base insights to franchise insights
            for insight in base_insights:
                franchise_insight = self._enhance_insight_for_franchise(
                    insight, location_id, analytics_data
                )
                insights.append(franchise_insight)
            
            # Add franchise-specific insights
            insights.extend(self._generate_franchise_growth_insights(location_id, analytics_data))
            insights.extend(self._generate_cross_location_insights(location_id, analytics_data))
            insights.extend(self._generate_network_optimization_insights(location_id, analytics_data))
            insights.extend(self._generate_market_expansion_insights(location_id, analytics_data))
            
            # Add cross-network benchmarking if enabled
            if include_cross_network:
                insights.extend(self._generate_cross_network_insights(location_id, analytics_data))
            
            # Sort by franchise-specific prioritization
            insights.sort(key=lambda x: (
                self._franchise_priority_score(x.priority),
                -x.potential_revenue_increase,
                -x.market_opportunity_score
            ))
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating franchise coaching: {str(e)}")
            return []
    
    def _enhance_insight_for_franchise(
        self, 
        base_insight: CoachingInsight, 
        location_id: int, 
        analytics_data: Dict[str, Any]
    ) -> FranchiseCoachingInsight:
        """Enhance base insight with franchise context"""
        
        # Get franchise context
        location = self.db.query(Location).filter(Location.id == location_id).first()
        franchise_context = self._get_franchise_context(location)
        
        # Get cross-network benchmark
        cross_network_benchmark = self._get_cross_network_benchmark(
            base_insight.category.value, location_id
        )
        
        # Calculate market opportunity score
        market_opportunity_score = self._calculate_market_opportunity_score(
            base_insight, location_id, analytics_data
        )
        
        # Get network best practices
        network_best_practices = self._get_network_best_practices(
            base_insight.category.value, location_id
        )
        
        return FranchiseCoachingInsight(
            category=base_insight.category,
            priority=base_insight.priority,
            title=base_insight.title,
            message=base_insight.message,
            impact_description=base_insight.impact_description,
            potential_revenue_increase=base_insight.potential_revenue_increase,
            action_steps=base_insight.action_steps,
            timeline=base_insight.timeline,
            success_metrics=base_insight.success_metrics,
            resources=base_insight.resources,
            why_this_matters=base_insight.why_this_matters,
            business_principle=base_insight.business_principle,
            market_context=base_insight.market_context,
            six_fb_methodology=base_insight.six_fb_methodology,
            franchise_context=franchise_context,
            cross_network_benchmark=cross_network_benchmark,
            market_opportunity_score=market_opportunity_score,
            network_best_practices=network_best_practices
        )
    
    def _generate_franchise_growth_insights(
        self, 
        location_id: int, 
        analytics_data: Dict[str, Any]
    ) -> List[FranchiseCoachingInsight]:
        """Generate franchise growth specific insights"""
        insights = []
        
        # Analyze franchise maturity and growth stage
        franchise_level = self._determine_franchise_performance_level(location_id, analytics_data)
        current_revenue = analytics_data.get('current_performance', {}).get('monthly_revenue', 0) * 12
        
        if franchise_level in [FranchisePerformanceLevel.EMERGING, FranchisePerformanceLevel.DEVELOPING]:
            # Focus on foundational growth
            insights.append(FranchiseCoachingInsight(
                category=CoachingCategory.EFFICIENCY,
                priority=CoachingPriority.HIGH,
                title="Franchise Foundation Building",
                message="Focus on establishing core systems and operational excellence before expansion.",
                impact_description="Strong operational foundation enables sustainable franchise growth and higher profitability.",
                potential_revenue_increase=current_revenue * 0.3,
                action_steps=[
                    "Implement standardized booking and payment processes",
                    "Establish consistent service quality protocols",
                    "Build client database and loyalty systems",
                    "Train staff on franchise brand standards",
                    "Create operational documentation and procedures"
                ],
                timeline="6-12 months for foundation establishment",
                success_metrics=[
                    "Operational efficiency above 80%",
                    "Client satisfaction scores above 4.5/5",
                    "Staff retention above 85%",
                    "Monthly revenue growth of 15%+"
                ],
                franchise_context="Emerging franchises require strong operational foundation",
                market_opportunity_score=8.5,
                network_best_practices=[
                    "Top franchises invest heavily in systems during first year",
                    "Consistent brand execution drives 40% higher client retention",
                    "Documented processes reduce operational errors by 60%"
                ]
            ))
        
        elif franchise_level == FranchisePerformanceLevel.ESTABLISHED:
            # Focus on optimization and expansion
            expansion_potential = self._calculate_expansion_potential(location_id, analytics_data)
            
            if expansion_potential > 0.7:
                insights.append(FranchiseCoachingInsight(
                    category=CoachingCategory.MARKETING,
                    priority=CoachingPriority.HIGH,
                    title="Market Expansion Opportunity",
                    message="Your franchise performance indicates strong expansion potential.",
                    impact_description=f"Market expansion could add ${current_revenue * 0.5:,.0f} annually through additional locations.",
                    potential_revenue_increase=current_revenue * 0.5,
                    action_steps=[
                        "Conduct market analysis for expansion opportunities",
                        "Evaluate potential locations and demographics",
                        "Assess capital requirements and financing options",
                        "Develop expansion timeline and milestones",
                        "Create staffing and training plans for new locations"
                    ],
                    timeline="12-18 months for market expansion",
                    success_metrics=[
                        "Market analysis completion within 90 days",
                        "Identify 3+ viable expansion locations",
                        "Secure financing and regulatory approvals",
                        "New location profitability within 12 months"
                    ],
                    franchise_context="Established franchises with strong performance metrics",
                    market_opportunity_score=9.2,
                    franchise_expansion_potential=expansion_potential
                ))
        
        return insights
    
    def _generate_cross_location_insights(
        self, 
        location_id: int, 
        analytics_data: Dict[str, Any]
    ) -> List[FranchiseCoachingInsight]:
        """Generate insights based on cross-location analysis"""
        insights = []
        
        # Get other locations in the same franchise network
        location = self.db.query(Location).filter(Location.id == location_id).first()
        if not location or not location.organization_id:
            return insights
        
        other_locations = self.db.query(Location).filter(
            and_(
                Location.organization_id == location.organization_id,
                Location.id != location_id,
                Location.is_active == True
            )
        ).all()
        
        if len(other_locations) >= 2:  # Need minimum locations for meaningful analysis
            cross_location_metrics = self._analyze_cross_location_performance(
                location_id, [loc.id for loc in other_locations]
            )
            
            # Resource allocation optimization
            if cross_location_metrics.get('efficiency_variance', 0) > 0.2:
                insights.append(FranchiseCoachingInsight(
                    category=CoachingCategory.EFFICIENCY,
                    priority=CoachingPriority.MEDIUM,
                    title="Cross-Location Resource Optimization",
                    message="Significant efficiency differences detected across your locations.",
                    impact_description="Optimizing resource allocation could improve overall network performance by 15-25%.",
                    potential_revenue_increase=analytics_data.get('current_performance', {}).get('monthly_revenue', 0) * 12 * 0.2,
                    action_steps=[
                        "Analyze staffing patterns across all locations",
                        "Identify peak hours and resource bottlenecks",
                        "Implement cross-location staff sharing for peak periods",
                        "Standardize equipment and service delivery processes",
                        "Create performance dashboards for all locations"
                    ],
                    timeline="3-6 months for optimization implementation",
                    success_metrics=[
                        "Reduce efficiency variance to under 10%",
                        "Increase average utilization across all locations",
                        "Improve overall network profitability by 15%"
                    ],
                    franchise_context="Multi-location franchise network optimization",
                    cross_network_benchmark=cross_location_metrics,
                    market_opportunity_score=7.8
                ))
        
        return insights
    
    def _generate_network_optimization_insights(
        self, 
        location_id: int, 
        analytics_data: Dict[str, Any]
    ) -> List[FranchiseCoachingInsight]:
        """Generate network-wide optimization insights"""
        insights = []
        
        network_metrics = self._get_network_performance_metrics(location_id)
        if not network_metrics:
            return insights
        
        # Network efficiency optimization
        if network_metrics.get('network_efficiency_score', 0) < 75:
            insights.append(FranchiseCoachingInsight(
                category=CoachingCategory.EFFICIENCY,
                priority=CoachingPriority.HIGH,
                title="Network Efficiency Enhancement",
                message="Your franchise network shows opportunities for efficiency improvements.",
                impact_description="Network-wide efficiency improvements could increase profitability by 20-30%.",
                potential_revenue_increase=analytics_data.get('current_performance', {}).get('monthly_revenue', 0) * 12 * 0.25,
                action_steps=[
                    "Implement network-wide performance monitoring",
                    "Standardize high-performing processes across locations",
                    "Create shared service delivery protocols",
                    "Establish network-wide training programs",
                    "Implement centralized scheduling optimization"
                ],
                timeline="6-12 months for network optimization",
                success_metrics=[
                    "Network efficiency score above 85%",
                    "Reduce operational variance across locations",
                    "Increase network-wide profitability by 20%"
                ],
                franchise_context="Network-wide operational optimization",
                market_opportunity_score=8.7,
                network_best_practices=[
                    "Top networks maintain efficiency scores above 90%",
                    "Standardized processes improve performance by 35%",
                    "Centralized training reduces onboarding time by 50%"
                ]
            ))
        
        return insights
    
    def _generate_market_expansion_insights(
        self, 
        location_id: int, 
        analytics_data: Dict[str, Any]
    ) -> List[FranchiseCoachingInsight]:
        """Generate market expansion opportunities"""
        insights = []
        
        expansion_opportunities = self._identify_expansion_opportunities(location_id)
        
        for opportunity in expansion_opportunities:
            if opportunity.roi_potential > 0.25:  # 25% ROI threshold
                insights.append(FranchiseCoachingInsight(
                    category=CoachingCategory.MARKETING,
                    priority=CoachingPriority.MEDIUM if opportunity.roi_potential > 0.4 else CoachingPriority.LOW,
                    title=f"Market Expansion: {opportunity.opportunity_type}",
                    message=f"High-potential market opportunity identified with {opportunity.roi_potential:.1%} ROI potential.",
                    impact_description=f"Market expansion could generate ${opportunity.market_size:,.0f} additional annual revenue.",
                    potential_revenue_increase=opportunity.market_size * opportunity.roi_potential,
                    action_steps=[
                        f"Conduct detailed market research for {opportunity.opportunity_type}",
                        "Analyze demographic and competition data",
                        "Evaluate location requirements and costs",
                        "Develop business plan and financial projections",
                        "Create implementation timeline and milestones"
                    ],
                    timeline=opportunity.implementation_timeline,
                    success_metrics=[
                        f"Complete market analysis within 60 days",
                        f"Achieve {opportunity.success_probability:.1%} success probability",
                        f"Generate positive ROI within 18 months"
                    ],
                    franchise_context=f"Market expansion opportunity in {opportunity.opportunity_type}",
                    market_opportunity_score=opportunity.roi_potential * 10,
                    franchise_expansion_potential=opportunity.success_probability
                ))
        
        return insights
    
    def _generate_cross_network_insights(
        self, 
        location_id: int, 
        analytics_data: Dict[str, Any]
    ) -> List[FranchiseCoachingInsight]:
        """Generate insights based on anonymous cross-network benchmarking"""
        insights = []
        
        try:
            # Get cross-network benchmarks for key metrics
            revenue_benchmark = self._get_anonymous_network_benchmark("revenue", location_id)
            efficiency_benchmark = self._get_anonymous_network_benchmark("efficiency", location_id)
            retention_benchmark = self._get_anonymous_network_benchmark("retention", location_id)
            
            # Generate insights based on benchmarks
            if revenue_benchmark.network_percentile < 50:  # Below median
                insights.append(FranchiseCoachingInsight(
                    category=CoachingCategory.PRICING,
                    priority=CoachingPriority.HIGH,
                    title="Revenue Performance vs Network",
                    message=f"Your revenue performance is at the {revenue_benchmark.network_percentile:.0f}th percentile across similar franchises.",
                    impact_description=f"Reaching top quartile performance could add ${revenue_benchmark.improvement_opportunity:,.0f} annually.",
                    potential_revenue_increase=revenue_benchmark.improvement_opportunity,
                    action_steps=[
                        "Analyze pricing strategy vs successful network locations",
                        "Implement best practices from top-performing franchises",
                        "Focus on high-margin service offerings",
                        "Optimize service mix based on network data",
                        "Enhance value proposition and client communication"
                    ],
                    timeline="3-6 months for revenue optimization",
                    success_metrics=[
                        f"Reach {revenue_benchmark.top_quartile_threshold:.0f}th percentile performance",
                        f"Increase monthly revenue by {revenue_benchmark.improvement_opportunity/12:,.0f}",
                        "Achieve network top quartile status"
                    ],
                    franchise_context="Anonymous network benchmarking analysis",
                    cross_network_benchmark=revenue_benchmark.__dict__,
                    market_opportunity_score=8.9,
                    network_best_practices=revenue_benchmark.best_practice_examples
                ))
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating cross-network insights: {str(e)}")
            return []
    
    # Helper methods for franchise coaching
    
    def _get_franchise_context(self, location: Location) -> str:
        """Get franchise context for coaching"""
        if not location:
            return "Independent location"
        
        # Determine franchise context based on organization structure
        org_locations_count = self.db.query(func.count(Location.id)).filter(
            Location.organization_id == location.organization_id
        ).scalar()
        
        if org_locations_count == 1:
            return "Single-location franchise"
        elif org_locations_count <= 5:
            return f"Small franchise network ({org_locations_count} locations)"
        elif org_locations_count <= 15:
            return f"Medium franchise network ({org_locations_count} locations)"
        else:
            return f"Large franchise network ({org_locations_count} locations)"
    
    def _get_cross_network_benchmark(self, metric_type: str, location_id: int) -> Dict[str, Any]:
        """Get cross-network benchmark for specific metric"""
        try:
            # Query anonymized benchmarks from PerformanceBenchmark table
            benchmark = self.db.query(PerformanceBenchmark).filter(
                and_(
                    PerformanceBenchmark.metric_type == metric_type,
                    PerformanceBenchmark.user_id != self._get_user_id_for_location(location_id)
                )
            ).first()
            
            if benchmark:
                return {
                    "metric_type": metric_type,
                    "network_percentile": benchmark.percentile_rank,
                    "top_quartile_threshold": benchmark.top_quartile_threshold,
                    "network_average": benchmark.industry_mean,
                    "sample_size": benchmark.sample_size
                }
            
            return {}
            
        except Exception as e:
            logger.error(f"Error getting cross-network benchmark: {str(e)}")
            return {}
    
    def _calculate_market_opportunity_score(
        self, 
        insight: CoachingInsight, 
        location_id: int, 
        analytics_data: Dict[str, Any]
    ) -> float:
        """Calculate market opportunity score for insight"""
        base_score = 5.0  # Default score
        
        # Adjust score based on insight category and potential impact
        if insight.category == CoachingCategory.PRICING:
            base_score += 3.0  # Pricing has high impact
        elif insight.category == CoachingCategory.CLIENT_ACQUISITION:
            base_score += 2.5
        elif insight.category == CoachingCategory.RETENTION:
            base_score += 2.0
        
        # Adjust based on potential revenue increase
        current_revenue = analytics_data.get('current_performance', {}).get('monthly_revenue', 0) * 12
        if current_revenue > 0:
            impact_ratio = insight.potential_revenue_increase / current_revenue
            base_score += min(impact_ratio * 5, 3.0)  # Cap at 3 points
        
        return min(base_score, 10.0)  # Cap at 10
    
    def _get_network_best_practices(self, category: str, location_id: int) -> List[str]:
        """Get network best practices for category"""
        best_practices = {
            "pricing": [
                "Top franchises implement dynamic pricing based on demand",
                "Premium service tiers generate 40% higher margins",
                "Value-based pricing increases client satisfaction"
            ],
            "client_acquisition": [
                "Referral programs generate 30% of new clients for top performers",
                "Local partnership strategies drive consistent growth",
                "Digital marketing ROI averages 4:1 for successful franchises"
            ],
            "retention": [
                "Personalized follow-up increases retention by 25%",
                "Loyalty programs improve client lifetime value by 35%",
                "Regular feedback collection prevents 60% of churn"
            ],
            "efficiency": [
                "Online booking reduces no-shows by 40%",
                "Automated scheduling improves utilization by 20%",
                "Staff cross-training increases flexibility by 50%"
            ]
        }
        
        return best_practices.get(category, ["Focus on continuous improvement"])
    
    def _determine_franchise_performance_level(
        self, 
        location_id: int, 
        analytics_data: Dict[str, Any]
    ) -> FranchisePerformanceLevel:
        """Determine franchise performance level"""
        location = self.db.query(Location).filter(Location.id == location_id).first()
        if not location:
            return FranchisePerformanceLevel.EMERGING
        
        # Calculate months since creation
        months_active = (datetime.now() - location.created_at).days / 30.44
        
        # Get performance metrics
        current_revenue = analytics_data.get('current_performance', {}).get('monthly_revenue', 0)
        efficiency_score = analytics_data.get('current_performance', {}).get('utilization_rate', 0)
        
        # Determine level based on age and performance
        if months_active < 12 or current_revenue < 5000:
            return FranchisePerformanceLevel.EMERGING
        elif months_active < 36 or efficiency_score < 75:
            return FranchisePerformanceLevel.DEVELOPING
        elif months_active < 60 or current_revenue < 15000:
            return FranchisePerformanceLevel.ESTABLISHED
        else:
            return FranchisePerformanceLevel.ELITE
    
    def _calculate_expansion_potential(self, location_id: int, analytics_data: Dict[str, Any]) -> float:
        """Calculate expansion potential score (0-1)"""
        score = 0.0
        
        # Revenue stability (30% weight)
        monthly_revenue = analytics_data.get('current_performance', {}).get('monthly_revenue', 0)
        if monthly_revenue > 15000:
            score += 0.3
        elif monthly_revenue > 10000:
            score += 0.2
        elif monthly_revenue > 7500:
            score += 0.1
        
        # Efficiency metrics (25% weight)
        utilization = analytics_data.get('current_performance', {}).get('utilization_rate', 0)
        if utilization > 85:
            score += 0.25
        elif utilization > 75:
            score += 0.15
        elif utilization > 65:
            score += 0.1
        
        # Client retention (25% weight)
        retention_rate = analytics_data.get('current_performance', {}).get('retention_rate', 0)
        if retention_rate > 85:
            score += 0.25
        elif retention_rate > 75:
            score += 0.15
        elif retention_rate > 65:
            score += 0.1
        
        # Growth trend (20% weight)
        growth_rate = analytics_data.get('recommendations', {}).get('growth_rate', 0)
        if growth_rate > 0.15:  # 15% growth
            score += 0.2
        elif growth_rate > 0.1:
            score += 0.15
        elif growth_rate > 0.05:
            score += 0.1
        
        return min(score, 1.0)
    
    def _analyze_cross_location_performance(
        self, 
        location_id: int, 
        other_location_ids: List[int]
    ) -> Dict[str, Any]:
        """Analyze performance across multiple locations"""
        try:
            # Get performance metrics for all locations
            location_metrics = []
            all_location_ids = [location_id] + other_location_ids
            
            for loc_id in all_location_ids:
                # Calculate basic metrics for each location
                # This would typically come from the analytics service
                metrics = {
                    'revenue': self._get_location_revenue(loc_id),
                    'efficiency': self._get_location_efficiency(loc_id),
                    'utilization': self._get_location_utilization(loc_id)
                }
                location_metrics.append(metrics)
            
            # Calculate variance and benchmarks
            if len(location_metrics) > 1:
                revenues = [m['revenue'] for m in location_metrics if m['revenue'] > 0]
                efficiencies = [m['efficiency'] for m in location_metrics if m['efficiency'] > 0]
                
                return {
                    'efficiency_variance': statistics.stdev(efficiencies) / statistics.mean(efficiencies) if efficiencies else 0,
                    'revenue_variance': statistics.stdev(revenues) / statistics.mean(revenues) if revenues else 0,
                    'average_efficiency': statistics.mean(efficiencies) if efficiencies else 0,
                    'average_revenue': statistics.mean(revenues) if revenues else 0,
                    'top_performer_metrics': max(location_metrics, key=lambda x: x['revenue'])
                }
            
            return {}
            
        except Exception as e:
            logger.error(f"Error analyzing cross-location performance: {str(e)}")
            return {}
    
    def _get_network_performance_metrics(self, location_id: int) -> Dict[str, Any]:
        """Get network-wide performance metrics"""
        try:
            location = self.db.query(Location).filter(Location.id == location_id).first()
            if not location or not location.organization_id:
                return {}
            
            # Get all locations in the network
            network_locations = self.db.query(Location).filter(
                Location.organization_id == location.organization_id
            ).all()
            
            if len(network_locations) < 2:
                return {}
            
            # Calculate network efficiency score
            total_efficiency = 0
            total_revenue = 0
            location_count = 0
            
            for loc in network_locations:
                efficiency = self._get_location_efficiency(loc.id)
                revenue = self._get_location_revenue(loc.id)
                
                if efficiency > 0 and revenue > 0:
                    total_efficiency += efficiency
                    total_revenue += revenue
                    location_count += 1
            
            if location_count > 0:
                return {
                    'network_efficiency_score': total_efficiency / location_count,
                    'network_total_revenue': total_revenue,
                    'network_location_count': location_count,
                    'average_revenue_per_location': total_revenue / location_count
                }
            
            return {}
            
        except Exception as e:
            logger.error(f"Error getting network performance metrics: {str(e)}")
            return {}
    
    def _identify_expansion_opportunities(self, location_id: int) -> List[FranchiseGrowthOpportunity]:
        """Identify market expansion opportunities"""
        opportunities = []
        
        try:
            location = self.db.query(Location).filter(Location.id == location_id).first()
            if not location:
                return opportunities
            
            # Analyze market opportunities (simplified implementation)
            # In production, this would integrate with market research APIs
            
            # Urban expansion opportunity
            opportunities.append(FranchiseGrowthOpportunity(
                opportunity_type="Urban Market Expansion",
                market_size=250000,  # Annual revenue potential
                competition_level="moderate",
                roi_potential=0.35,
                implementation_timeline="12-18 months",
                required_investment=150000,
                success_probability=0.75,
                supporting_data={
                    "demographic_analysis": "Strong target demographic presence",
                    "competition_density": "3 competitors within 5-mile radius",
                    "market_saturation": "65% - room for growth"
                }
            ))
            
            # Suburban expansion opportunity
            opportunities.append(FranchiseGrowthOpportunity(
                opportunity_type="Suburban Market Entry",
                market_size=180000,
                competition_level="low",
                roi_potential=0.42,
                implementation_timeline="8-12 months",
                required_investment=120000,
                success_probability=0.85,
                supporting_data={
                    "demographic_analysis": "Growing suburban population",
                    "competition_density": "1 competitor within 10-mile radius",
                    "market_saturation": "35% - high growth potential"
                }
            ))
            
            return opportunities
            
        except Exception as e:
            logger.error(f"Error identifying expansion opportunities: {str(e)}")
            return []
    
    def _get_anonymous_network_benchmark(self, metric_type: str, location_id: int) -> CrossNetworkMetrics:
        """Get anonymous network benchmark data"""
        try:
            # Get user's current value for the metric
            user_value = self._get_location_metric_value(metric_type, location_id)
            
            # Query cross-user metrics (anonymized)
            cross_metrics = self.db.query(CrossUserMetric).filter(
                CrossUserMetric.metric_type == metric_type
            ).all()
            
            if cross_metrics:
                values = [m.metric_value for m in cross_metrics if m.metric_value > 0]
                values.sort()
                
                if values:
                    # Calculate percentile rank
                    rank = sum(1 for v in values if v < user_value) / len(values) * 100
                    
                    # Calculate benchmarks
                    q75_index = int(0.75 * len(values))
                    top_quartile = values[q75_index] if q75_index < len(values) else values[-1]
                    
                    improvement_opportunity = max(0, top_quartile - user_value)
                    
                    return CrossNetworkMetrics(
                        metric_name=metric_type,
                        user_value=user_value,
                        network_percentile=rank,
                        top_quartile_threshold=top_quartile,
                        network_average=statistics.mean(values),
                        sample_size=len(values),
                        improvement_opportunity=improvement_opportunity,
                        best_practice_examples=self._get_best_practice_examples(metric_type)
                    )
            
            # Return default if no data
            return CrossNetworkMetrics(
                metric_name=metric_type,
                user_value=user_value,
                network_percentile=50.0,
                top_quartile_threshold=user_value * 1.2,
                network_average=user_value,
                sample_size=0,
                improvement_opportunity=0,
                best_practice_examples=[]
            )
            
        except Exception as e:
            logger.error(f"Error getting anonymous network benchmark: {str(e)}")
            return CrossNetworkMetrics(
                metric_name=metric_type,
                user_value=0,
                network_percentile=0,
                top_quartile_threshold=0,
                network_average=0,
                sample_size=0,
                improvement_opportunity=0
            )
    
    def _get_best_practice_examples(self, metric_type: str) -> List[str]:
        """Get best practice examples for metric type"""
        examples = {
            "revenue": [
                "Premium service pricing strategies increase average ticket by 35%",
                "Package deals boost client spending by 25%",
                "Value-based pricing improves profitability"
            ],
            "efficiency": [
                "Online booking systems reduce scheduling conflicts by 70%",
                "Automated reminders decrease no-shows by 45%",
                "Cross-trained staff improve flexibility by 60%"
            ],
            "retention": [
                "Personalized follow-up increases repeat bookings by 40%",
                "Loyalty programs improve client lifetime value by 50%",
                "Quality consistency drives 85%+ retention rates"
            ]
        }
        
        return examples.get(metric_type, ["Focus on continuous improvement"])
    
    # Utility methods for data access
    
    def _get_location_revenue(self, location_id: int) -> float:
        """Get monthly revenue for location"""
        try:
            thirty_days_ago = datetime.now() - timedelta(days=30)
            revenue = self.db.query(func.sum(Payment.amount)).filter(
                and_(
                    Payment.location_id == location_id,
                    Payment.status == "completed",
                    Payment.created_at >= thirty_days_ago
                )
            ).scalar()
            
            return float(revenue) if revenue else 0.0
            
        except Exception:
            return 0.0
    
    def _get_location_efficiency(self, location_id: int) -> float:
        """Get efficiency score for location"""
        try:
            # Calculate utilization rate as efficiency proxy
            return self._get_location_utilization(location_id)
            
        except Exception:
            return 0.0
    
    def _get_location_utilization(self, location_id: int) -> float:
        """Get utilization rate for location"""
        try:
            thirty_days_ago = datetime.now() - timedelta(days=30)
            
            # Get total appointments
            total_appointments = self.db.query(func.count(Appointment.id)).filter(
                and_(
                    Appointment.location_id == location_id,
                    Appointment.status.in_(["confirmed", "completed"]),
                    Appointment.start_time >= thirty_days_ago
                )
            ).scalar()
            
            # Calculate utilization (simplified - would need business hours data)
            # Assuming 8 hours/day, 25 working days, 30-minute slots = 400 possible slots
            possible_slots = 25 * 8 * 2  # 400 slots per month
            utilization = (total_appointments / possible_slots * 100) if possible_slots > 0 else 0
            
            return min(utilization, 100.0)
            
        except Exception:
            return 0.0
    
    def _get_location_metric_value(self, metric_type: str, location_id: int) -> float:
        """Get specific metric value for location"""
        if metric_type == "revenue":
            return self._get_location_revenue(location_id)
        elif metric_type == "efficiency":
            return self._get_location_efficiency(location_id)
        elif metric_type == "retention":
            # Simplified retention calculation
            return 75.0  # Would calculate actual retention rate
        else:
            return 0.0
    
    def _get_user_id_for_location(self, location_id: int) -> Optional[int]:
        """Get user ID associated with location"""
        try:
            location = self.db.query(Location).filter(Location.id == location_id).first()
            return location.owner_id if location else None
            
        except Exception:
            return None
    
    def _franchise_priority_score(self, priority: CoachingPriority) -> int:
        """Convert priority to numeric score for franchise-specific sorting"""
        return {
            CoachingPriority.CRITICAL: 1,
            CoachingPriority.HIGH: 2,
            CoachingPriority.MEDIUM: 3,
            CoachingPriority.LOW: 4
        }.get(priority, 5)