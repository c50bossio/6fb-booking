"""
Enhanced Analytics Service for Six Figure Barber methodology

This service implements advanced analytics features including:
- Sophisticated pricing optimization algorithms  
- Advanced client lifetime value calculations
- Business health scoring and forecasting
- Real-time performance tracking
- Enhanced coaching insights
"""

import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from services.analytics_service import AnalyticsService
from schemas import DateRange
import math


class EnhancedAnalyticsService(AnalyticsService):
    """Enhanced analytics service with advanced Six Figure Barber features"""
    
    def __init__(self, db: Session):
        super().__init__(db)
        self.six_figure_targets = {
            75000: {"monthly": 6250, "daily": 284, "clients_per_day": 7.1},
            100000: {"monthly": 8333, "daily": 379, "clients_per_day": 9.5}, 
            125000: {"monthly": 10417, "daily": 473, "clients_per_day": 11.8},
            150000: {"monthly": 12500, "daily": 568, "clients_per_day": 14.2},
            200000: {"monthly": 16667, "daily": 758, "clients_per_day": 19.0}
        }

    def calculate_advanced_six_figure_metrics(
        self,
        user_id: int,
        target_annual_income: float = 100000.0
    ) -> Dict[str, Any]:
        """
        Calculate advanced Six Figure Barber metrics with enhanced algorithms
        """
        base_metrics = self.calculate_six_figure_barber_metrics(user_id, target_annual_income)
        
        # Enhanced calculations
        performance_score = self._calculate_business_health_score(user_id)
        pricing_optimization = self._calculate_dynamic_pricing_optimization(user_id, target_annual_income)
        client_value_analysis = self._calculate_advanced_client_value_metrics(user_id)
        forecasting = self._generate_revenue_forecasting(user_id, target_annual_income)
        coaching_insights = self._generate_advanced_coaching_insights(user_id, base_metrics, performance_score)
        
        return {
            **base_metrics,
            "performance_score": performance_score,
            "advanced_pricing": pricing_optimization,
            "client_value_analysis": client_value_analysis,
            "forecasting": forecasting,
            "coaching_insights": coaching_insights,
            "enhanced_recommendations": self._generate_enhanced_recommendations(
                base_metrics, performance_score, pricing_optimization, client_value_analysis
            )
        }

    def _calculate_business_health_score(self, user_id: int) -> Dict[str, Any]:
        """
        Calculate comprehensive business health score based on multiple factors
        """
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)
        
        # Get metrics for scoring
        revenue_metrics = self.get_revenue_analytics(user_id, 
            DateRange(start_date=thirty_days_ago, end_date=datetime.utcnow()))
        appointment_metrics = self.get_appointment_analytics(user_id,
            DateRange(start_date=thirty_days_ago, end_date=datetime.utcnow()))
        retention_metrics = self.get_client_retention_metrics(user_id,
            DateRange(start_date=ninety_days_ago, end_date=datetime.utcnow()))
        
        # Calculate individual scores (0-100 each)
        revenue_score = self._score_revenue_performance(revenue_metrics)
        efficiency_score = self._score_operational_efficiency(appointment_metrics)
        client_score = self._score_client_relationships(retention_metrics)
        growth_score = self._score_growth_trajectory(user_id)
        consistency_score = self._score_business_consistency(user_id)
        
        # Weighted overall score
        weights = {
            "revenue": 0.25,
            "efficiency": 0.20,
            "client_relationships": 0.25,
            "growth": 0.15,
            "consistency": 0.15
        }
        
        overall_score = (
            revenue_score * weights["revenue"] +
            efficiency_score * weights["efficiency"] +
            client_score * weights["client_relationships"] +
            growth_score * weights["growth"] +
            consistency_score * weights["consistency"]
        )
        
        # Determine health level
        if overall_score >= 85:
            health_level = "Excellent"
            health_color = "green"
        elif overall_score >= 70:
            health_level = "Good"
            health_color = "blue"
        elif overall_score >= 55:
            health_level = "Fair"
            health_color = "yellow"
        else:
            health_level = "Needs Improvement"
            health_color = "red"
        
        return {
            "overall_score": round(overall_score, 1),
            "health_level": health_level,
            "health_color": health_color,
            "component_scores": {
                "revenue_performance": round(revenue_score, 1),
                "operational_efficiency": round(efficiency_score, 1),
                "client_relationships": round(client_score, 1),
                "growth_trajectory": round(growth_score, 1),
                "business_consistency": round(consistency_score, 1)
            },
            "improvement_areas": self._identify_improvement_areas({
                "revenue": revenue_score,
                "efficiency": efficiency_score,
                "client": client_score,
                "growth": growth_score,
                "consistency": consistency_score
            })
        }

    def _score_revenue_performance(self, revenue_metrics: Dict[str, Any]) -> float:
        """Score revenue performance based on industry benchmarks"""
        total_revenue = revenue_metrics["summary"]["total_revenue"]
        avg_transaction = revenue_metrics["summary"]["average_transaction"]
        
        # Revenue scoring (monthly targets)
        if total_revenue >= 15000:
            revenue_points = 100
        elif total_revenue >= 10000:
            revenue_points = 85
        elif total_revenue >= 7500:
            revenue_points = 70
        elif total_revenue >= 5000:
            revenue_points = 55
        else:
            revenue_points = max(20, (total_revenue / 5000) * 55)
        
        # Average transaction scoring
        if avg_transaction >= 80:
            transaction_points = 100
        elif avg_transaction >= 60:
            transaction_points = 80
        elif avg_transaction >= 45:
            transaction_points = 60
        elif avg_transaction >= 30:
            transaction_points = 40
        else:
            transaction_points = max(10, (avg_transaction / 30) * 40)
        
        return (revenue_points * 0.7) + (transaction_points * 0.3)

    def _score_operational_efficiency(self, appointment_metrics: Dict[str, Any]) -> float:
        """Score operational efficiency based on appointment metrics"""
        completion_rate = appointment_metrics["summary"]["completion_rate"]
        no_show_rate = appointment_metrics["summary"]["no_show_rate"]
        total_appointments = appointment_metrics["summary"]["total"]
        
        # Completion rate scoring
        if completion_rate >= 95:
            completion_points = 100
        elif completion_rate >= 90:
            completion_points = 90
        elif completion_rate >= 85:
            completion_points = 75
        elif completion_rate >= 80:
            completion_points = 60
        else:
            completion_points = max(20, completion_rate * 0.75)
        
        # No-show rate scoring (inverse)
        if no_show_rate <= 5:
            no_show_points = 100
        elif no_show_rate <= 10:
            no_show_points = 80
        elif no_show_rate <= 15:
            no_show_points = 60
        else:
            no_show_points = max(20, 100 - (no_show_rate * 4))
        
        # Volume scoring
        if total_appointments >= 120:  # ~4 per day
            volume_points = 100
        elif total_appointments >= 90:
            volume_points = 80
        elif total_appointments >= 60:
            volume_points = 60
        else:
            volume_points = max(20, (total_appointments / 60) * 60)
        
        return (completion_points * 0.4) + (no_show_points * 0.3) + (volume_points * 0.3)

    def _score_client_relationships(self, retention_metrics: Dict[str, Any]) -> float:
        """Score client relationship quality"""
        retention_rate = retention_metrics["summary"]["retention_rate"]
        active_clients = retention_metrics["summary"]["active_clients"]
        avg_ltv = retention_metrics["summary"]["average_lifetime_value"]
        
        # Retention rate scoring
        if retention_rate >= 80:
            retention_points = 100
        elif retention_rate >= 70:
            retention_points = 85
        elif retention_rate >= 60:
            retention_points = 70
        else:
            retention_points = max(20, retention_rate * 1.25)
        
        # Active client base scoring
        if active_clients >= 150:
            client_points = 100
        elif active_clients >= 100:
            client_points = 80
        elif active_clients >= 75:
            client_points = 60
        else:
            client_points = max(20, (active_clients / 75) * 60)
        
        # LTV scoring
        if avg_ltv >= 400:
            ltv_points = 100
        elif avg_ltv >= 300:
            ltv_points = 80
        elif avg_ltv >= 200:
            ltv_points = 60
        else:
            ltv_points = max(20, (avg_ltv / 200) * 60)
        
        return (retention_points * 0.4) + (client_points * 0.3) + (ltv_points * 0.3)

    def _score_growth_trajectory(self, user_id: int) -> float:
        """Score business growth trajectory"""
        current_month = datetime.utcnow().replace(day=1)
        last_month = (current_month - timedelta(days=1)).replace(day=1)
        two_months_ago = (last_month - timedelta(days=1)).replace(day=1)
        three_months_ago = (two_months_ago - timedelta(days=1)).replace(day=1)
        
        # Get monthly revenue for trend analysis
        months = [
            (three_months_ago, two_months_ago),
            (two_months_ago, last_month),
            (last_month, current_month),
            (current_month, datetime.utcnow())
        ]
        
        monthly_revenues = []
        for start, end in months:
            revenue = self.get_revenue_analytics(user_id, 
                DateRange(start_date=start, end_date=end))["summary"]["total_revenue"]
            monthly_revenues.append(revenue)
        
        # Calculate growth rates
        if len(monthly_revenues) >= 3 and monthly_revenues[-3] > 0:
            three_month_growth = ((monthly_revenues[-1] - monthly_revenues[-3]) / monthly_revenues[-3]) * 100
        else:
            three_month_growth = 0
            
        if len(monthly_revenues) >= 2 and monthly_revenues[-2] > 0:
            monthly_growth = ((monthly_revenues[-1] - monthly_revenues[-2]) / monthly_revenues[-2]) * 100
        else:
            monthly_growth = 0
        
        # Score growth
        if three_month_growth >= 15:
            growth_points = 100
        elif three_month_growth >= 10:
            growth_points = 85
        elif three_month_growth >= 5:
            growth_points = 70
        elif three_month_growth >= 0:
            growth_points = 55
        else:
            growth_points = max(20, 55 + (three_month_growth * 2))
        
        return growth_points

    def _score_business_consistency(self, user_id: int) -> float:
        """Score business consistency and reliability"""
        # Calculate revenue variance over last 3 months
        current_date = datetime.utcnow()
        weekly_revenues = []
        
        for week in range(12):  # Last 12 weeks
            week_start = current_date - timedelta(weeks=week+1)
            week_end = current_date - timedelta(weeks=week)
            
            revenue = self.get_revenue_analytics(user_id,
                DateRange(start_date=week_start, end_date=week_end))["summary"]["total_revenue"]
            weekly_revenues.append(revenue)
        
        if not weekly_revenues or max(weekly_revenues) == 0:
            return 50  # Default score for no data
        
        # Calculate coefficient of variation
        mean_revenue = np.mean(weekly_revenues)
        std_revenue = np.std(weekly_revenues)
        
        if mean_revenue > 0:
            cv = std_revenue / mean_revenue
        else:
            cv = 1
        
        # Score consistency (lower CV = higher score)
        if cv <= 0.2:
            consistency_points = 100
        elif cv <= 0.3:
            consistency_points = 85
        elif cv <= 0.5:
            consistency_points = 70
        elif cv <= 0.7:
            consistency_points = 55
        else:
            consistency_points = max(20, 100 - (cv * 100))
        
        return consistency_points

    def _identify_improvement_areas(self, scores: Dict[str, float]) -> List[Dict[str, str]]:
        """Identify areas needing improvement based on scores"""
        improvement_areas = []
        
        for area, score in scores.items():
            if score < 60:
                if area == "revenue":
                    improvement_areas.append({
                        "area": "Revenue Performance",
                        "priority": "high",
                        "suggestion": "Focus on increasing average ticket value and booking frequency"
                    })
                elif area == "efficiency":
                    improvement_areas.append({
                        "area": "Operational Efficiency", 
                        "priority": "high",
                        "suggestion": "Reduce no-shows and improve appointment completion rates"
                    })
                elif area == "client":
                    improvement_areas.append({
                        "area": "Client Relationships",
                        "priority": "medium",
                        "suggestion": "Implement loyalty programs and improve client retention strategies"
                    })
                elif area == "growth":
                    improvement_areas.append({
                        "area": "Growth Trajectory",
                        "priority": "medium", 
                        "suggestion": "Develop marketing strategies to accelerate business growth"
                    })
                elif area == "consistency":
                    improvement_areas.append({
                        "area": "Business Consistency",
                        "priority": "low",
                        "suggestion": "Implement systems to stabilize revenue and reduce fluctuations"
                    })
        
        return improvement_areas

    def _calculate_dynamic_pricing_optimization(
        self,
        user_id: int,
        target_annual_income: float
    ) -> Dict[str, Any]:
        """
        Calculate dynamic pricing optimization recommendations
        """
        # Get service performance data
        appointment_analytics = self.get_appointment_analytics(user_id)
        service_stats = appointment_analytics.get("by_service", {})
        
        # Current pricing analysis
        service_recommendations = {}
        total_revenue_potential = 0
        
        for service_name, stats in service_stats.items():
            if stats["count"] == 0:
                continue
                
            current_price = stats["revenue"] / stats["count"] if stats["count"] > 0 else 0
            completion_rate = (stats["completed"] / stats["count"]) * 100 if stats["count"] > 0 else 0
            
            # Demand-based pricing recommendations
            if completion_rate > 95 and stats["count"] > 10:
                # High demand service - can increase price
                recommended_increase = 15
                price_elasticity = "low"
            elif completion_rate > 85 and stats["count"] > 5:
                # Good demand - moderate increase
                recommended_increase = 10
                price_elasticity = "medium"
            elif completion_rate > 70:
                # Fair demand - small increase
                recommended_increase = 5
                price_elasticity = "medium"
            else:
                # Low demand - consider price reduction or service improvement
                recommended_increase = -5
                price_elasticity = "high"
            
            new_price = current_price * (1 + recommended_increase / 100)
            revenue_impact = (new_price - current_price) * stats["completed"]
            total_revenue_potential += revenue_impact
            
            service_recommendations[service_name] = {
                "current_price": round(current_price, 2),
                "recommended_price": round(new_price, 2),
                "price_change_percentage": recommended_increase,
                "completion_rate": round(completion_rate, 1),
                "demand_level": self._categorize_demand(completion_rate, stats["count"]),
                "price_elasticity": price_elasticity,
                "monthly_revenue_impact": round(revenue_impact, 2)
            }
        
        # Overall pricing strategy
        current_avg_ticket = sum(s["revenue"] for s in service_stats.values()) / sum(s["count"] for s in service_stats.values()) if service_stats else 0
        
        return {
            "service_recommendations": service_recommendations,
            "overall_strategy": {
                "current_average_ticket": round(current_avg_ticket, 2),
                "potential_monthly_increase": round(total_revenue_potential, 2),
                "recommended_pricing_approach": self._determine_pricing_approach(service_recommendations),
                "target_average_ticket": self._calculate_target_average_ticket(target_annual_income, user_id)
            }
        }

    def _categorize_demand(self, completion_rate: float, booking_count: int) -> str:
        """Categorize service demand level"""
        if completion_rate > 90 and booking_count > 20:
            return "Very High"
        elif completion_rate > 85 and booking_count > 10:
            return "High"
        elif completion_rate > 75 and booking_count > 5:
            return "Medium"
        elif completion_rate > 65:
            return "Low"
        else:
            return "Very Low"

    def _determine_pricing_approach(self, service_recommendations: Dict[str, Any]) -> str:
        """Determine overall pricing strategy approach"""
        if not service_recommendations:
            return "maintain_current"
            
        increases = sum(1 for s in service_recommendations.values() if s["price_change_percentage"] > 0)
        decreases = sum(1 for s in service_recommendations.values() if s["price_change_percentage"] < 0)
        total = len(service_recommendations)
        
        if increases >= total * 0.7:
            return "aggressive_increase"
        elif increases >= total * 0.5:
            return "moderate_increase"
        elif decreases >= total * 0.5:
            return "competitive_pricing"
        else:
            return "maintain_current"

    def _calculate_target_average_ticket(self, target_annual_income: float, user_id: int) -> float:
        """Calculate target average ticket needed for income goal"""
        monthly_target = target_annual_income / 12
        
        # Estimate monthly client capacity based on current performance
        current_metrics = self.get_appointment_analytics(user_id)
        current_monthly_appointments = current_metrics["summary"]["total"]
        
        if current_monthly_appointments > 0:
            target_avg_ticket = monthly_target / current_monthly_appointments
        else:
            # Default assumption: 80 appointments per month
            target_avg_ticket = monthly_target / 80
            
        return round(target_avg_ticket, 2)

    def _calculate_advanced_client_value_metrics(self, user_id: int) -> Dict[str, Any]:
        """Calculate advanced client lifetime value and segmentation metrics"""
        clv_analytics = self.get_client_lifetime_value_analytics(user_id)
        
        # Enhanced client segmentation
        enhanced_segments = self._create_enhanced_client_segments(clv_analytics)
        
        # Predictive LTV modeling
        predictive_ltv = self._calculate_predictive_ltv(user_id)
        
        # Client journey analysis
        journey_analysis = self._analyze_client_journey(user_id)
        
        return {
            "enhanced_segments": enhanced_segments,
            "predictive_ltv": predictive_ltv,
            "journey_analysis": journey_analysis,
            "value_optimization": self._generate_value_optimization_strategies(enhanced_segments)
        }

    def _create_enhanced_client_segments(self, clv_analytics: Dict[str, Any]) -> Dict[str, Any]:
        """Create enhanced client segments with advanced criteria"""
        segments = clv_analytics.get("segments", {})
        
        # Add advanced segmentation criteria
        enhanced_segments = {}
        
        for segment_name, segment_data in segments.items():
            enhanced_segments[segment_name] = {
                **segment_data,
                "engagement_score": self._calculate_engagement_score(segment_name),
                "growth_potential": self._assess_growth_potential(segment_name, segment_data),
                "retention_risk": self._assess_retention_risk(segment_name),
                "recommended_strategy": self._recommend_segment_strategy(segment_name)
            }
        
        return enhanced_segments

    def _calculate_engagement_score(self, segment_name: str) -> float:
        """Calculate engagement score for client segment"""
        # Mock calculation - in production this would analyze actual client behavior
        score_mapping = {
            "vip": 90,
            "regular": 75,
            "returning": 60,
            "new": 45
        }
        return score_mapping.get(segment_name, 50)

    def _assess_growth_potential(self, segment_name: str, segment_data: Dict[str, Any]) -> str:
        """Assess growth potential for client segment"""
        avg_clv = segment_data.get("avg_clv", 0)
        
        if segment_name == "new" and avg_clv > 200:
            return "High"
        elif segment_name == "returning" and avg_clv > 300:
            return "High" 
        elif segment_name == "regular":
            return "Medium"
        elif segment_name == "vip":
            return "Low"  # Already at high value
        else:
            return "Medium"

    def _assess_retention_risk(self, segment_name: str) -> str:
        """Assess retention risk for client segment"""
        risk_mapping = {
            "vip": "Low",
            "regular": "Low", 
            "returning": "Medium",
            "new": "High"
        }
        return risk_mapping.get(segment_name, "Medium")

    def _recommend_segment_strategy(self, segment_name: str) -> str:
        """Recommend strategy for client segment"""
        strategy_mapping = {
            "vip": "Maintain premium experience and exclusive offers",
            "regular": "Focus on retention and increased frequency",
            "returning": "Implement loyalty programs and consistent follow-up",
            "new": "Onboarding optimization and early relationship building"
        }
        return strategy_mapping.get(segment_name, "Standard engagement approach")

    def _calculate_predictive_ltv(self, user_id: int) -> Dict[str, Any]:
        """Calculate predictive lifetime value using advanced modeling"""
        # This is a simplified version - production would use ML models
        current_ltv = self.get_client_lifetime_value_analytics(user_id)
        avg_current_ltv = current_ltv["summary"]["average_clv"]
        
        # Predict LTV growth based on business improvements
        predicted_improvements = {
            "optimized_pricing": avg_current_ltv * 1.15,
            "improved_retention": avg_current_ltv * 1.25,
            "enhanced_services": avg_current_ltv * 1.20,
            "full_optimization": avg_current_ltv * 1.45
        }
        
        return {
            "current_average_ltv": avg_current_ltv,
            "predicted_ltv_scenarios": predicted_improvements,
            "ltv_growth_potential": predicted_improvements["full_optimization"] - avg_current_ltv,
            "ltv_optimization_priority": self._prioritize_ltv_improvements()
        }

    def _prioritize_ltv_improvements(self) -> List[Dict[str, str]]:
        """Prioritize LTV improvement initiatives"""
        return [
            {
                "initiative": "Implement tiered pricing strategy",
                "impact": "High",
                "effort": "Medium",
                "timeline": "2-4 weeks"
            },
            {
                "initiative": "Launch client loyalty program", 
                "impact": "High",
                "effort": "High",
                "timeline": "4-6 weeks"
            },
            {
                "initiative": "Introduce premium service packages",
                "impact": "Medium",
                "effort": "Low",
                "timeline": "1-2 weeks"
            }
        ]

    def _analyze_client_journey(self, user_id: int) -> Dict[str, Any]:
        """Analyze client journey and identify optimization opportunities"""
        # Mock journey analysis - production would track actual client progression
        return {
            "journey_stages": {
                "discovery": {"conversion_rate": 65, "avg_time_days": 2},
                "first_visit": {"completion_rate": 85, "satisfaction_score": 4.2},
                "retention": {"return_rate": 70, "avg_days_between_visits": 28},
                "loyalty": {"vip_conversion_rate": 15, "avg_ltv_growth": 180}
            },
            "optimization_opportunities": [
                {
                    "stage": "discovery",
                    "opportunity": "Improve online booking conversion",
                    "potential_impact": "15% more first-time bookings"
                },
                {
                    "stage": "retention", 
                    "opportunity": "Reduce time between visits",
                    "potential_impact": "20% increase in visit frequency"
                }
            ]
        }

    def _generate_value_optimization_strategies(self, enhanced_segments: Dict[str, Any]) -> List[Dict[str, str]]:
        """Generate strategies to optimize client value"""
        return [
            {
                "strategy": "VIP Experience Enhancement",
                "target_segment": "vip",
                "description": "Exclusive services and premium amenities",
                "expected_ltv_increase": "10-15%"
            },
            {
                "strategy": "Regular Client Loyalty Program",
                "target_segment": "regular", 
                "description": "Points-based rewards and member benefits",
                "expected_ltv_increase": "20-25%"
            },
            {
                "strategy": "New Client Onboarding",
                "target_segment": "new",
                "description": "Structured introduction and follow-up process",
                "expected_ltv_increase": "30-40%"
            }
        ]

    def _generate_revenue_forecasting(
        self,
        user_id: int,
        target_annual_income: float
    ) -> Dict[str, Any]:
        """Generate revenue forecasting with multiple scenarios"""
        current_performance = self.calculate_six_figure_barber_metrics(user_id, target_annual_income)
        
        # Base scenario (current trajectory)
        base_monthly = current_performance["current_performance"]["monthly_revenue"]
        
        # Scenario modeling
        scenarios = {
            "conservative": {
                "monthly_growth_rate": 0.02,  # 2% monthly growth
                "description": "Conservative growth with minimal changes"
            },
            "realistic": {
                "monthly_growth_rate": 0.05,  # 5% monthly growth
                "description": "Realistic growth with moderate improvements"
            },
            "optimistic": {
                "monthly_growth_rate": 0.08,  # 8% monthly growth
                "description": "Aggressive growth with full optimization"
            }
        }
        
        forecasts = {}
        for scenario_name, scenario in scenarios.items():
            monthly_projections = []
            current_monthly = base_monthly
            
            for month in range(12):
                current_monthly *= (1 + scenario["monthly_growth_rate"])
                monthly_projections.append(round(current_monthly, 2))
            
            annual_projection = sum(monthly_projections)
            target_achievement_month = None
            
            # Find when target is achieved
            cumulative = 0
            for i, monthly in enumerate(monthly_projections):
                cumulative += monthly
                if cumulative >= target_annual_income and target_achievement_month is None:
                    target_achievement_month = i + 1
            
            forecasts[scenario_name] = {
                "description": scenario["description"],
                "monthly_projections": monthly_projections,
                "annual_projection": round(annual_projection, 2),
                "target_achievement_month": target_achievement_month,
                "target_achievement_likelihood": self._calculate_achievement_likelihood(scenario_name)
            }
        
        return {
            "base_monthly_revenue": round(base_monthly, 2),
            "target_annual_income": target_annual_income,
            "scenarios": forecasts,
            "recommended_scenario": "realistic",
            "key_assumptions": [
                "Consistent client retention rates",
                "Gradual service price optimization", 
                "Steady marketing and business development efforts"
            ]
        }

    def _calculate_achievement_likelihood(self, scenario_name: str) -> int:
        """Calculate likelihood percentage for scenario achievement"""
        likelihood_mapping = {
            "conservative": 85,
            "realistic": 65,
            "optimistic": 35
        }
        return likelihood_mapping.get(scenario_name, 50)

    def _generate_advanced_coaching_insights(
        self,
        user_id: int,
        base_metrics: Dict[str, Any],
        performance_score: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate advanced coaching insights based on comprehensive analysis"""
        insights = []
        
        # Performance-based insights
        overall_score = performance_score["overall_score"]
        component_scores = performance_score["component_scores"]
        
        if overall_score >= 85:
            insights.append({
                "type": "success",
                "category": "performance",
                "title": "Exceptional Business Performance",
                "message": "Your business is operating at an elite level. Focus on scaling and premium positioning.",
                "action_items": [
                    "Consider expanding services or locations",
                    "Implement premium pricing strategies",
                    "Develop client referral programs"
                ]
            })
        elif overall_score >= 70:
            insights.append({
                "type": "optimization",
                "category": "performance", 
                "title": "Strong Foundation for Growth",
                "message": "Your business fundamentals are solid. Focus on targeted improvements for accelerated growth.",
                "action_items": self._generate_targeted_improvements(component_scores)
            })
        else:
            insights.append({
                "type": "improvement",
                "category": "performance",
                "title": "Opportunity for Significant Growth",
                "message": "Your business has strong potential. Prioritize fundamental improvements for rapid progress.",
                "action_items": self._generate_fundamental_improvements(component_scores)
            })
        
        # Six Figure Barber specific insights
        on_track = base_metrics["targets"]["on_track"]
        revenue_gap = base_metrics["targets"]["revenue_gap"]
        
        if not on_track and revenue_gap > 0:
            months_to_target = self._calculate_months_to_target(base_metrics)
            insights.append({
                "type": "strategy",
                "category": "six_figure",
                "title": "Six Figure Barber Action Plan",
                "message": f"You're ${revenue_gap:,.0f} away from your monthly target. Here's your roadmap.",
                "action_items": [
                    f"Increase average ticket by ${(revenue_gap * 0.4) / base_metrics['current_performance']['total_active_clients']:,.0f} per client",
                    f"Add {math.ceil(revenue_gap / base_metrics['current_performance']['average_ticket'])} more monthly clients",
                    "Optimize your highest-demand services for premium pricing"
                ],
                "timeline": f"Target achievement in {months_to_target} months with consistent execution"
            })
        
        return insights

    def _generate_targeted_improvements(self, component_scores: Dict[str, float]) -> List[str]:
        """Generate targeted improvement recommendations"""
        improvements = []
        
        lowest_score = min(component_scores.values())
        lowest_area = min(component_scores.items(), key=lambda x: x[1])[0]
        
        if lowest_area == "revenue_performance":
            improvements.extend([
                "Implement dynamic pricing for high-demand services",
                "Launch premium service packages",
                "Focus on increasing average transaction value"
            ])
        elif lowest_area == "operational_efficiency":
            improvements.extend([
                "Implement automated appointment reminders",
                "Optimize scheduling to reduce gaps",
                "Create no-show prevention strategies"
            ])
        elif lowest_area == "client_relationships":
            improvements.extend([
                "Launch comprehensive loyalty program",
                "Implement regular client feedback collection",
                "Develop personalized client communication"
            ])
        
        return improvements[:3]  # Return top 3 recommendations

    def _generate_fundamental_improvements(self, component_scores: Dict[str, float]) -> List[str]:
        """Generate fundamental improvement recommendations"""
        return [
            "Establish consistent pricing strategy across all services",
            "Implement basic client retention system",
            "Set up reliable appointment scheduling and reminder system",
            "Create clear service menu with value-based pricing",
            "Develop basic marketing and client acquisition process"
        ]

    def _calculate_months_to_target(self, base_metrics: Dict[str, Any]) -> int:
        """Calculate estimated months to reach target with improvements"""
        current_monthly = base_metrics["current_performance"]["monthly_revenue"]
        target_monthly = base_metrics["targets"]["monthly_revenue_target"]
        
        if current_monthly <= 0:
            return 12  # Conservative estimate
        
        # Assume 5% monthly growth with improvements
        months = 0
        projected_monthly = current_monthly
        
        while projected_monthly < target_monthly and months < 24:
            projected_monthly *= 1.05
            months += 1
        
        return min(months, 24)

    def _generate_enhanced_recommendations(
        self,
        base_metrics: Dict[str, Any],
        performance_score: Dict[str, Any],
        pricing_optimization: Dict[str, Any],
        client_value_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate enhanced recommendations based on comprehensive analysis"""
        
        recommendations = {
            "immediate_actions": [],
            "short_term_goals": [],
            "long_term_strategy": [],
            "investment_priorities": []
        }
        
        # Immediate actions (1-2 weeks)
        if performance_score["overall_score"] < 60:
            recommendations["immediate_actions"].extend([
                "Audit current pricing and adjust underperforming services",
                "Implement basic appointment reminder system",
                "Review and optimize service delivery process"
            ])
        
        # Short-term goals (1-3 months)
        if base_metrics["targets"]["revenue_gap"] > 0:
            recommendations["short_term_goals"].extend([
                "Launch client retention program",
                "Optimize pricing for top 3 services",
                "Implement referral incentive system"
            ])
        
        # Long-term strategy (3-12 months)
        recommendations["long_term_strategy"].extend([
            "Develop premium service tier",
            "Build comprehensive client database and analytics",
            "Create scalable business systems and processes"
        ])
        
        # Investment priorities
        top_roi_investments = self._identify_top_roi_investments(
            performance_score, pricing_optimization, client_value_analysis
        )
        recommendations["investment_priorities"] = top_roi_investments
        
        return recommendations

    def _identify_top_roi_investments(
        self,
        performance_score: Dict[str, Any],
        pricing_optimization: Dict[str, Any],
        client_value_analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Identify top ROI investment opportunities"""
        investments = []
        
        # Pricing optimization ROI
        potential_pricing_increase = pricing_optimization["overall_strategy"]["potential_monthly_increase"]
        if potential_pricing_increase > 500:
            investments.append({
                "investment": "Pricing Strategy Implementation",
                "cost_estimate": "$500-1000",
                "potential_monthly_roi": f"${potential_pricing_increase:,.0f}",
                "payback_period": "1-2 months",
                "effort_level": "Low"
            })
        
        # Client retention system
        avg_ltv = client_value_analysis["predictive_ltv"]["current_average_ltv"]
        if avg_ltv > 200:
            investments.append({
                "investment": "Client Loyalty Program",
                "cost_estimate": "$1000-2500",
                "potential_monthly_roi": f"${avg_ltv * 0.25:,.0f}",
                "payback_period": "2-4 months",
                "effort_level": "Medium"
            })
        
        # Appointment optimization
        if performance_score["component_scores"]["operational_efficiency"] < 70:
            investments.append({
                "investment": "Appointment Management System",
                "cost_estimate": "$300-800",
                "potential_monthly_roi": "$800-1500",
                "payback_period": "1 month",
                "effort_level": "Low"
            })
        
        return investments

    def generate_real_time_dashboard_data(self, user_id: int) -> Dict[str, Any]:
        """Generate real-time dashboard data for enhanced analytics"""
        today = datetime.utcnow().date()
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)
        
        # Today's performance
        today_range = DateRange(
            start_date=datetime.combine(today, datetime.min.time()),
            end_date=datetime.utcnow()
        )
        
        today_revenue = self.get_revenue_analytics(user_id, today_range)["summary"]["total_revenue"]
        today_appointments = self.get_appointment_analytics(user_id, today_range)["summary"]["total"]
        
        # Week's performance
        week_range = DateRange(
            start_date=datetime.combine(week_start, datetime.min.time()),
            end_date=datetime.utcnow()
        )
        
        week_revenue = self.get_revenue_analytics(user_id, week_range)["summary"]["total_revenue"]
        week_appointments = self.get_appointment_analytics(user_id, week_range)["summary"]["total"]
        
        # Month's performance
        month_range = DateRange(
            start_date=datetime.combine(month_start, datetime.min.time()),
            end_date=datetime.utcnow()
        )
        
        month_revenue = self.get_revenue_analytics(user_id, month_range)["summary"]["total_revenue"]
        month_appointments = self.get_appointment_analytics(user_id, month_range)["summary"]["total"]
        
        # Calculate daily targets based on Six Figure Barber methodology
        six_figure_metrics = self.calculate_six_figure_barber_metrics(user_id)
        daily_revenue_target = six_figure_metrics["targets"]["daily_revenue_target"]
        daily_clients_target = six_figure_metrics["targets"]["daily_clients_target"]
        
        return {
            "real_time_metrics": {
                "today": {
                    "revenue": round(today_revenue, 2),
                    "appointments": today_appointments,
                    "revenue_vs_target": round((today_revenue / daily_revenue_target) * 100, 1) if daily_revenue_target > 0 else 0,
                    "appointments_vs_target": round((today_appointments / daily_clients_target) * 100, 1) if daily_clients_target > 0 else 0
                },
                "week": {
                    "revenue": round(week_revenue, 2),
                    "appointments": week_appointments,
                    "daily_average_revenue": round(week_revenue / 7, 2),
                    "daily_average_appointments": round(week_appointments / 7, 1)
                },
                "month": {
                    "revenue": round(month_revenue, 2),
                    "appointments": month_appointments,
                    "daily_average_revenue": round(month_revenue / today.day, 2),
                    "daily_average_appointments": round(month_appointments / today.day, 1)
                }
            },
            "targets": {
                "daily_revenue_target": round(daily_revenue_target, 2),
                "daily_clients_target": round(daily_clients_target, 1),
                "monthly_revenue_target": round(six_figure_metrics["targets"]["monthly_revenue_target"], 2)
            },
            "performance_indicators": {
                "on_track_daily": today_revenue >= daily_revenue_target * 0.8,
                "on_track_monthly": month_revenue >= (six_figure_metrics["targets"]["monthly_revenue_target"] * today.day / 30) * 0.9,
                "trend_direction": self._calculate_trend_direction(user_id)
            }
        }

    def _calculate_trend_direction(self, user_id: int) -> str:
        """Calculate current trend direction for real-time dashboard"""
        # Get last 7 days of revenue
        daily_revenues = []
        for i in range(7):
            day = datetime.utcnow().date() - timedelta(days=i)
            day_range = DateRange(
                start_date=datetime.combine(day, datetime.min.time()),
                end_date=datetime.combine(day, datetime.max.time())
            )
            daily_revenue = self.get_revenue_analytics(user_id, day_range)["summary"]["total_revenue"]
            daily_revenues.append(daily_revenue)
        
        # Simple trend calculation
        if len(daily_revenues) >= 3:
            recent_avg = sum(daily_revenues[:3]) / 3
            older_avg = sum(daily_revenues[3:]) / len(daily_revenues[3:]) if len(daily_revenues[3:]) > 0 else 0
            
            if recent_avg > older_avg * 1.1:
                return "trending_up"
            elif recent_avg < older_avg * 0.9:
                return "trending_down"
            else:
                return "stable"
        
        return "stable"