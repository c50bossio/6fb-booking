"""
Financial analyzer for Six Figure Barber methodology.
Provides revenue optimization insights, financial reporting,
and business intelligence for premium barbershop operations.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple
from decimal import Decimal
import statistics
import json

logger = logging.getLogger(__name__)


class FinancialAnalyzer:
    """
    Advanced financial analysis service focused on Six Figure Barber methodology.
    Provides revenue optimization, cash flow analysis, and business intelligence.
    """
    
    def __init__(self):
        # Six Figure Barber methodology benchmarks
        self.six_figure_benchmarks = {
            "target_annual_revenue": 100000,      # $100k annual target
            "target_monthly_revenue": 8333,       # Monthly target  
            "target_average_ticket": 150,         # Premium service target
            "minimum_average_ticket": 100,        # Minimum for Six Figure positioning
            "target_client_retention": 0.85,      # 85% retention rate
            "target_booking_frequency": 30,       # Days between bookings
            "premium_service_threshold": 200,     # Premium service indicator
            "efficiency_target": 0.75,            # 75% capacity utilization
            "growth_rate_target": 0.15            # 15% annual growth
        }
        
        # Financial health indicators
        self.health_indicators = {
            "cash_flow": {
                "excellent": 90,
                "good": 70,
                "fair": 50,
                "poor": 30
            },
            "revenue_consistency": {
                "coefficient_variation_excellent": 0.1,
                "coefficient_variation_good": 0.2,
                "coefficient_variation_fair": 0.3
            },
            "growth_sustainability": {
                "sustainable_rate": 0.2,  # 20% monthly growth is sustainable
                "aggressive_rate": 0.35,   # Above 35% may not be sustainable
            }
        }
        
        # Industry-specific metrics for barbershops
        self.industry_metrics = {
            "average_session_duration": 45,       # Minutes
            "peak_hours": [10, 11, 12, 14, 15, 16, 17],  # Peak booking hours
            "seasonal_factors": {
                "high_season": [11, 12, 1, 5],    # November, December, January, May
                "low_season": [2, 3, 7, 8]        # February, March, July, August
            },
            "service_mix_optimal": {
                "basic_cuts": 0.4,          # 40% basic cuts
                "premium_cuts": 0.35,       # 35% premium cuts
                "beard_services": 0.15,     # 15% beard services
                "special_services": 0.1     # 10% special services
            }
        }
    
    async def analyze_revenue_optimization(
        self,
        financial_data: Dict[str, Any],
        appointment_data: List[Dict[str, Any]],
        period_days: int = 30
    ) -> Dict[str, Any]:
        """
        Analyze revenue optimization opportunities using Six Figure Barber methodology.
        
        Args:
            financial_data: Financial transaction data
            appointment_data: Appointment booking data
            period_days: Analysis period in days
            
        Returns:
            Dict containing optimization insights and recommendations
        """
        try:
            # Calculate current performance metrics
            current_metrics = await self._calculate_current_metrics(
                financial_data, appointment_data, period_days
            )
            
            # Benchmark against Six Figure targets
            benchmark_analysis = await self._benchmark_against_six_figure(
                current_metrics
            )
            
            # Identify optimization opportunities
            optimization_opportunities = await self._identify_optimization_opportunities(
                current_metrics, appointment_data
            )
            
            # Calculate revenue potential
            revenue_potential = await self._calculate_revenue_potential(
                current_metrics, optimization_opportunities
            )
            
            # Generate actionable recommendations
            recommendations = await self._generate_revenue_recommendations(
                current_metrics, optimization_opportunities, benchmark_analysis
            )
            
            return {
                "current_performance": current_metrics,
                "six_figure_benchmark": benchmark_analysis,
                "optimization_opportunities": optimization_opportunities,
                "revenue_potential": revenue_potential,
                "recommendations": recommendations,
                "analysis_date": datetime.utcnow().isoformat(),
                "period_analyzed": f"{period_days} days",
                "methodology": "six_figure_barber"
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze revenue optimization: {str(e)}")
            raise
    
    async def analyze_cash_flow_patterns(
        self,
        transaction_data: List[Dict[str, Any]],
        period_days: int = 90
    ) -> Dict[str, Any]:
        """
        Analyze cash flow patterns and predict future cash flow needs.
        
        Args:
            transaction_data: Historical transaction data
            period_days: Analysis period in days
            
        Returns:
            Dict containing cash flow analysis and predictions
        """
        try:
            # Group transactions by day
            daily_cash_flow = await self._calculate_daily_cash_flow(transaction_data)
            
            # Calculate cash flow metrics
            cash_flow_metrics = await self._calculate_cash_flow_metrics(daily_cash_flow)
            
            # Analyze cash flow patterns
            pattern_analysis = await self._analyze_cash_flow_patterns(daily_cash_flow)
            
            # Predict future cash flow
            cash_flow_prediction = await self._predict_cash_flow(
                daily_cash_flow, pattern_analysis
            )
            
            # Generate cash flow recommendations
            cash_flow_recommendations = await self._generate_cash_flow_recommendations(
                cash_flow_metrics, pattern_analysis
            )
            
            return {
                "cash_flow_metrics": cash_flow_metrics,
                "pattern_analysis": pattern_analysis,
                "predictions": cash_flow_prediction,
                "recommendations": cash_flow_recommendations,
                "daily_cash_flow": daily_cash_flow[-30:],  # Last 30 days
                "analysis_date": datetime.utcnow().isoformat(),
                "health_score": await self._calculate_cash_flow_health_score(cash_flow_metrics)
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze cash flow patterns: {str(e)}")
            raise
    
    async def generate_six_figure_scorecard(
        self,
        financial_data: Dict[str, Any],
        appointment_data: List[Dict[str, Any]],
        client_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate comprehensive Six Figure Barber methodology scorecard.
        
        Args:
            financial_data: Financial performance data
            appointment_data: Appointment booking data
            client_data: Client relationship data
            
        Returns:
            Dict containing comprehensive scorecard and action plan
        """
        try:
            # Calculate Six Figure metrics
            six_figure_metrics = await self._calculate_six_figure_metrics(
                financial_data, appointment_data, client_data
            )
            
            # Score each Six Figure pillar
            pillar_scores = await self._score_six_figure_pillars(six_figure_metrics)
            
            # Calculate overall Six Figure score
            overall_score = await self._calculate_overall_six_figure_score(pillar_scores)
            
            # Generate improvement roadmap
            improvement_roadmap = await self._generate_improvement_roadmap(
                pillar_scores, six_figure_metrics
            )
            
            # Calculate progress trajectory
            progress_trajectory = await self._calculate_progress_trajectory(
                six_figure_metrics, improvement_roadmap
            )
            
            return {
                "overall_score": overall_score,
                "pillar_scores": pillar_scores,
                "six_figure_metrics": six_figure_metrics,
                "improvement_roadmap": improvement_roadmap,
                "progress_trajectory": progress_trajectory,
                "scorecard_date": datetime.utcnow().isoformat(),
                "next_review_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
                "certification_status": await self._determine_certification_status(overall_score)
            }
            
        except Exception as e:
            logger.error(f"Failed to generate Six Figure scorecard: {str(e)}")
            raise
    
    async def _calculate_current_metrics(
        self,
        financial_data: Dict[str, Any],
        appointment_data: List[Dict[str, Any]],
        period_days: int
    ) -> Dict[str, Any]:
        """Calculate current performance metrics"""
        try:
            # Revenue metrics
            total_revenue = sum(txn.get("amount", 0) for txn in financial_data.get("transactions", [])) / 100
            total_appointments = len(appointment_data)
            average_ticket = total_revenue / max(total_appointments, 1)
            
            # Calculate monthly and annual projections
            daily_revenue = total_revenue / period_days
            monthly_revenue = daily_revenue * 30
            annual_revenue = daily_revenue * 365
            
            # Booking efficiency
            total_bookings = len(appointment_data)
            booking_rate = total_bookings / period_days
            
            # Service mix analysis
            service_mix = await self._analyze_service_mix(appointment_data)
            
            # Client metrics
            unique_clients = len(set(apt.get("client_id") for apt in appointment_data if apt.get("client_id")))
            repeat_client_rate = (total_appointments - unique_clients) / max(total_appointments, 1)
            
            return {
                "total_revenue": total_revenue,
                "average_ticket": average_ticket,
                "monthly_revenue": monthly_revenue,
                "annual_revenue_projection": annual_revenue,
                "total_appointments": total_appointments,
                "booking_rate": booking_rate,
                "unique_clients": unique_clients,
                "repeat_client_rate": repeat_client_rate,
                "service_mix": service_mix,
                "analysis_period_days": period_days
            }
            
        except Exception as e:
            logger.error(f"Failed to calculate current metrics: {str(e)}")
            return {}
    
    async def _benchmark_against_six_figure(self, current_metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Benchmark current performance against Six Figure targets"""
        try:
            benchmarks = {}
            
            # Revenue benchmarks
            benchmarks["annual_revenue"] = {
                "current": current_metrics.get("annual_revenue_projection", 0),
                "target": self.six_figure_benchmarks["target_annual_revenue"],
                "progress": current_metrics.get("annual_revenue_projection", 0) / self.six_figure_benchmarks["target_annual_revenue"],
                "gap": self.six_figure_benchmarks["target_annual_revenue"] - current_metrics.get("annual_revenue_projection", 0)
            }
            
            # Average ticket benchmarks
            benchmarks["average_ticket"] = {
                "current": current_metrics.get("average_ticket", 0),
                "target": self.six_figure_benchmarks["target_average_ticket"],
                "progress": current_metrics.get("average_ticket", 0) / self.six_figure_benchmarks["target_average_ticket"],
                "gap": self.six_figure_benchmarks["target_average_ticket"] - current_metrics.get("average_ticket", 0)
            }
            
            # Client retention benchmarks
            benchmarks["client_retention"] = {
                "current": current_metrics.get("repeat_client_rate", 0),
                "target": self.six_figure_benchmarks["target_client_retention"],
                "progress": current_metrics.get("repeat_client_rate", 0) / self.six_figure_benchmarks["target_client_retention"],
                "gap": self.six_figure_benchmarks["target_client_retention"] - current_metrics.get("repeat_client_rate", 0)
            }
            
            # Overall Six Figure progress
            avg_progress = statistics.mean([
                benchmarks["annual_revenue"]["progress"],
                benchmarks["average_ticket"]["progress"],
                benchmarks["client_retention"]["progress"]
            ])
            
            benchmarks["overall_progress"] = {
                "percentage": min(avg_progress, 1.0),
                "status": self._determine_progress_status(avg_progress),
                "certification_eligible": avg_progress >= 0.8
            }
            
            return benchmarks
            
        except Exception as e:
            logger.error(f"Failed to benchmark against Six Figure: {str(e)}")
            return {}
    
    async def _identify_optimization_opportunities(
        self,
        current_metrics: Dict[str, Any],
        appointment_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Identify specific optimization opportunities"""
        opportunities = []
        
        try:
            # Average ticket optimization
            avg_ticket = current_metrics.get("average_ticket", 0)
            if avg_ticket < self.six_figure_benchmarks["minimum_average_ticket"]:
                opportunities.append({
                    "type": "average_ticket_increase",
                    "priority": "high",
                    "current_value": avg_ticket,
                    "target_value": self.six_figure_benchmarks["target_average_ticket"],
                    "potential_increase": self.six_figure_benchmarks["target_average_ticket"] - avg_ticket,
                    "description": "Increase average ticket through premium service offerings and upselling",
                    "estimated_revenue_impact": self._calculate_ticket_increase_impact(
                        current_metrics, self.six_figure_benchmarks["target_average_ticket"] - avg_ticket
                    )
                })
            
            # Service mix optimization
            service_mix = current_metrics.get("service_mix", {})
            premium_percentage = service_mix.get("premium_services", 0)
            if premium_percentage < 0.3:  # Less than 30% premium services
                opportunities.append({
                    "type": "service_mix_optimization",
                    "priority": "medium",
                    "current_value": premium_percentage,
                    "target_value": 0.4,  # 40% premium services
                    "description": "Increase premium service bookings to improve profitability",
                    "estimated_revenue_impact": self._calculate_service_mix_impact(current_metrics, 0.4 - premium_percentage)
                })
            
            # Client retention optimization
            retention_rate = current_metrics.get("repeat_client_rate", 0)
            if retention_rate < self.six_figure_benchmarks["target_client_retention"]:
                opportunities.append({
                    "type": "client_retention_improvement",
                    "priority": "high",
                    "current_value": retention_rate,
                    "target_value": self.six_figure_benchmarks["target_client_retention"],
                    "description": "Implement client retention strategies to increase repeat business",
                    "estimated_revenue_impact": self._calculate_retention_impact(
                        current_metrics, self.six_figure_benchmarks["target_client_retention"] - retention_rate
                    )
                })
            
            # Booking frequency optimization
            booking_rate = current_metrics.get("booking_rate", 0)
            target_booking_rate = 1.0  # 1 booking per day minimum
            if booking_rate < target_booking_rate:
                opportunities.append({
                    "type": "booking_frequency_increase",
                    "priority": "medium",
                    "current_value": booking_rate,
                    "target_value": target_booking_rate,
                    "description": "Increase booking frequency through marketing and client engagement",
                    "estimated_revenue_impact": self._calculate_frequency_impact(
                        current_metrics, target_booking_rate - booking_rate
                    )
                })
            
            # Sort by estimated revenue impact
            opportunities.sort(key=lambda x: x.get("estimated_revenue_impact", 0), reverse=True)
            
            return opportunities
            
        except Exception as e:
            logger.error(f"Failed to identify optimization opportunities: {str(e)}")
            return []
    
    async def _calculate_revenue_potential(
        self,
        current_metrics: Dict[str, Any],
        optimization_opportunities: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate total revenue potential from optimization opportunities"""
        try:
            total_potential_increase = sum(
                opp.get("estimated_revenue_impact", 0) for opp in optimization_opportunities
            )
            
            current_annual = current_metrics.get("annual_revenue_projection", 0)
            potential_annual = current_annual + total_potential_increase
            
            return {
                "current_annual_revenue": current_annual,
                "potential_annual_revenue": potential_annual,
                "total_potential_increase": total_potential_increase,
                "percentage_increase": (total_potential_increase / max(current_annual, 1)) * 100,
                "six_figure_target_achievement": min(potential_annual / self.six_figure_benchmarks["target_annual_revenue"], 1.0),
                "time_to_six_figure": self._calculate_time_to_target(
                    current_annual, potential_annual, self.six_figure_benchmarks["target_annual_revenue"]
                ),
                "optimization_priority_impact": {
                    opp["type"]: opp.get("estimated_revenue_impact", 0)
                    for opp in optimization_opportunities[:5]  # Top 5 opportunities
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to calculate revenue potential: {str(e)}")
            return {}
    
    def _calculate_ticket_increase_impact(self, current_metrics: Dict[str, Any], ticket_increase: float) -> float:
        """Calculate revenue impact of average ticket increase"""
        monthly_appointments = current_metrics.get("total_appointments", 0) * (30 / current_metrics.get("analysis_period_days", 30))
        annual_appointments = monthly_appointments * 12
        return annual_appointments * ticket_increase
    
    def _calculate_service_mix_impact(self, current_metrics: Dict[str, Any], mix_improvement: float) -> float:
        """Calculate revenue impact of service mix optimization"""
        current_revenue = current_metrics.get("annual_revenue_projection", 0)
        # Premium services typically have 30-50% higher margins
        return current_revenue * mix_improvement * 0.4  # 40% margin improvement
    
    def _calculate_retention_impact(self, current_metrics: Dict[str, Any], retention_improvement: float) -> float:
        """Calculate revenue impact of improved client retention"""
        current_revenue = current_metrics.get("annual_revenue_projection", 0)
        # Retained clients typically book 2-3x more frequently
        return current_revenue * retention_improvement * 2.5
    
    def _calculate_frequency_impact(self, current_metrics: Dict[str, Any], frequency_improvement: float) -> float:
        """Calculate revenue impact of increased booking frequency"""
        avg_ticket = current_metrics.get("average_ticket", 0)
        return frequency_improvement * 365 * avg_ticket  # Additional bookings per year
    
    def _determine_progress_status(self, progress: float) -> str:
        """Determine progress status based on percentage"""
        if progress >= 1.0:
            return "six_figure_achieved"
        elif progress >= 0.8:
            return "six_figure_ready"
        elif progress >= 0.6:
            return "accelerating"
        elif progress >= 0.4:
            return "developing"
        else:
            return "starting"
    
    def _calculate_time_to_target(self, current: float, potential: float, target: float) -> str:
        """Calculate estimated time to reach Six Figure target"""
        if potential >= target:
            return "achievable_with_optimization"
        elif current >= target:
            return "target_achieved"
        else:
            # Assume 15% annual growth rate
            years_needed = 0
            projected_revenue = current
            while projected_revenue < target and years_needed < 10:
                projected_revenue *= 1.15  # 15% growth
                years_needed += 1
            
            if years_needed >= 10:
                return "requires_strategic_changes"
            else:
                return f"approximately_{years_needed}_years"
    
    async def _analyze_service_mix(self, appointment_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze service mix from appointment data"""
        try:
            service_counts = {}
            total_appointments = len(appointment_data)
            
            for appointment in appointment_data:
                service_type = appointment.get("service_type", "unknown")
                service_counts[service_type] = service_counts.get(service_type, 0) + 1
            
            # Categorize services
            basic_services = ["basic_cut", "standard_cut", "trim"]
            premium_services = ["premium_cut", "executive_cut", "consultation"]
            
            basic_count = sum(service_counts.get(service, 0) for service in basic_services)
            premium_count = sum(service_counts.get(service, 0) for service in premium_services)
            
            return {
                "total_appointments": total_appointments,
                "basic_services": basic_count / max(total_appointments, 1),
                "premium_services": premium_count / max(total_appointments, 1),
                "service_distribution": {
                    service: count / max(total_appointments, 1)
                    for service, count in service_counts.items()
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze service mix: {str(e)}")
            return {}
    
    async def _generate_revenue_recommendations(
        self,
        current_metrics: Dict[str, Any],
        optimization_opportunities: List[Dict[str, Any]],
        benchmark_analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate actionable revenue optimization recommendations"""
        recommendations = []
        
        try:
            # High-priority recommendations based on opportunities
            for opportunity in optimization_opportunities[:3]:  # Top 3 opportunities
                if opportunity["type"] == "average_ticket_increase":
                    recommendations.append({
                        "category": "pricing_strategy",
                        "priority": "high",
                        "title": "Implement Premium Service Pricing",
                        "description": "Introduce premium service tiers and upselling strategies to increase average ticket value",
                        "actions": [
                            "Create premium service menu with 30-50% higher pricing",
                            "Train staff on consultative selling techniques",
                            "Implement add-on service offerings (beard styling, hot towel, etc.)",
                            "Introduce membership/package pricing for regular clients"
                        ],
                        "expected_impact": f"${opportunity.get('potential_increase', 0):.0f} increase in average ticket",
                        "timeline": "2-4 weeks implementation",
                        "investment_required": "low"
                    })
                
                elif opportunity["type"] == "client_retention_improvement":
                    recommendations.append({
                        "category": "client_experience",
                        "priority": "high",
                        "title": "Enhance Client Retention Program",
                        "description": "Implement systematic client retention strategies to increase repeat business",
                        "actions": [
                            "Create client loyalty program with rewards",
                            "Implement follow-up communication system",
                            "Offer booking incentives for advance scheduling",
                            "Personalize service recommendations based on client history"
                        ],
                        "expected_impact": f"{opportunity.get('target_value', 0)*100:.1f}% client retention rate",
                        "timeline": "4-6 weeks implementation",
                        "investment_required": "medium"
                    })
            
            # Six Figure methodology specific recommendations
            overall_progress = benchmark_analysis.get("overall_progress", {}).get("percentage", 0)
            if overall_progress < 0.6:
                recommendations.append({
                    "category": "six_figure_methodology",
                    "priority": "high",
                    "title": "Accelerate Six Figure Barber Implementation",
                    "description": "Focus on core Six Figure Barber principles to accelerate progress",
                    "actions": [
                        "Emphasize premium positioning over competitive pricing",
                        "Invest in advanced training and certification",
                        "Upgrade shop environment and client experience",
                        "Implement systematic client value creation processes"
                    ],
                    "expected_impact": "25-40% acceleration toward Six Figure targets",
                    "timeline": "8-12 weeks implementation",
                    "investment_required": "high"
                })
            
            return recommendations[:5]  # Limit to top 5 recommendations
            
        except Exception as e:
            logger.error(f"Failed to generate revenue recommendations: {str(e)}")
            return []