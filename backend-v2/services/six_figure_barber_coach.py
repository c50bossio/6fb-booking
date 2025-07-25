"""
6FB AI Coach Service

This service provides intelligent business coaching based on the Six Figure Barber (6FB) methodology.
It analyzes performance data and provides actionable insights to help barbers reach their income goals.
"""

from typing import Dict, List, Any
from dataclasses import dataclass
from enum import Enum
import logging


logger = logging.getLogger(__name__)

class CoachingPriority(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class CoachingCategory(Enum):
    PRICING = "pricing"
    CLIENT_ACQUISITION = "client_acquisition"
    RETENTION = "retention"
    EFFICIENCY = "efficiency"
    SERVICE_MIX = "service_mix"
    MARKETING = "marketing"

@dataclass
class CoachingInsight:
    category: CoachingCategory
    priority: CoachingPriority
    title: str
    message: str
    impact_description: str
    potential_revenue_increase: float
    action_steps: List[str]
    timeline: str
    success_metrics: List[str]
    resources: List[str] = None
    # Educational components
    why_this_matters: str = ""
    business_principle: str = ""
    market_context: str = ""
    six_fb_methodology: str = ""

class SixFBCoach:
    """
    6FB AI Coach implementing Six Figure Barber methodology principles
    """
    
    def __init__(self, analytics_data: Dict[str, Any]):
        self.analytics = analytics_data
        self.current_performance = analytics_data.get('current_performance', {})
        self.targets = analytics_data.get('targets', {})
        self.recommendations = analytics_data.get('recommendations', {})
        
    def generate_comprehensive_coaching(self) -> List[CoachingInsight]:
        """Generate comprehensive coaching insights based on 6FB methodology"""
        insights = []
        
        # Pricing optimization coaching
        insights.extend(self._generate_pricing_insights())
        
        # Client acquisition coaching
        insights.extend(self._generate_client_acquisition_insights())
        
        # Retention improvement coaching
        insights.extend(self._generate_retention_insights())
        
        # Efficiency optimization coaching
        insights.extend(self._generate_efficiency_insights())
        
        # Service mix optimization
        insights.extend(self._generate_service_mix_insights())
        
        # Sort by priority and potential impact
        insights.sort(key=lambda x: (
            self._priority_score(x.priority),
            -x.potential_revenue_increase
        ))
        
        return insights
    
    def _generate_pricing_insights(self) -> List[CoachingInsight]:
        """Generate pricing optimization insights"""
        insights = []
        
        current_ticket = self.current_performance.get('average_ticket', 0)
        recommended_ticket = self.recommendations.get('price_optimization', {}).get('recommended_average_ticket', 0)
        
        if current_ticket > 0 and recommended_ticket > current_ticket:
            price_gap = recommended_ticket - current_ticket
            annual_impact = self.recommendations.get('price_optimization', {}).get('potential_annual_increase', 0)
            
            if price_gap > 5:  # Significant pricing opportunity
                priority = CoachingPriority.HIGH if price_gap > 15 else CoachingPriority.MEDIUM
                
                insights.append(CoachingInsight(
                    category=CoachingCategory.PRICING,
                    priority=priority,
                    title="Significant Pricing Opportunity Identified",
                    message=f"Your average ticket of ${current_ticket:.2f} is ${price_gap:.2f} below optimal pricing. This represents your biggest growth opportunity.",
                    impact_description=f"Increasing your average ticket to ${recommended_ticket:.2f} could add ${annual_impact:,.0f} annually to your income.",
                    potential_revenue_increase=annual_impact,
                    action_steps=[
                        f"Audit your current service menu and pricing structure",
                        f"Research competitor pricing in your market area",
                        f"Implement a premium service tier at ${recommended_ticket + 10:.2f}+",
                        f"Practice value communication with existing clients",
                        f"Gradually increase prices by 10-15% over 3 months"
                    ],
                    timeline="3-6 months for full implementation",
                    success_metrics=[
                        f"Average ticket increases to ${recommended_ticket:.2f}",
                        f"Client retention remains above 85%",
                        f"Monthly revenue increases by ${annual_impact/12:,.0f}"
                    ],
                    resources=[
                        "6FB Pricing Mastery Module",
                        "6FB Value Communication Scripts",
                        "6FB Market Research Templates"
                    ],
                    # Educational explanations
                    why_this_matters="Pricing is the fastest lever to increase revenue without acquiring more clients. A small price increase compounds across all services and clients, creating exponential income growth. Many barbers undervalue their expertise and charge below market rate, leaving thousands on the table annually.",
                    business_principle="Revenue = Clients × Average Ticket × Frequency. Increasing average ticket affects your total revenue immediately and requires no additional time investment or marketing spend. This is why pricing optimization is always the first focus in business growth.",
                    market_context="Professional barbering is a skilled trade that commands premium pricing. Clients who value quality craftsmanship are willing to pay for expertise, consistency, and experience. Budget-conscious clients often become loyal when they experience superior service.",
                    six_fb_methodology="The Six Figure Barber method prioritizes value-based pricing over time-based pricing. You're not selling time - you're selling transformation, confidence, and expertise. Price your services based on the value you deliver, not the time it takes."
                ))
        
        return insights
    
    def _generate_client_acquisition_insights(self) -> List[CoachingInsight]:
        """Generate client acquisition insights"""
        insights = []
        
        current_clients = self.recommendations.get('client_acquisition', {}).get('current_monthly_clients', 0)
        target_clients = self.recommendations.get('client_acquisition', {}).get('target_monthly_clients', 0)
        
        if target_clients > current_clients:
            client_gap = target_clients - current_clients
            annual_impact = self.recommendations.get('client_acquisition', {}).get('potential_annual_increase', 0)
            
            priority = CoachingPriority.HIGH if client_gap > 10 else CoachingPriority.MEDIUM
            
            insights.append(CoachingInsight(
                category=CoachingCategory.CLIENT_ACQUISITION,
                priority=priority,
                title="Client Acquisition Growth Opportunity",
                message=f"You need {client_gap} more clients per month to reach your income target. Focus on scalable acquisition strategies.",
                impact_description=f"Acquiring {client_gap} additional monthly clients could increase annual revenue by ${annual_impact:,.0f}.",
                potential_revenue_increase=annual_impact,
                action_steps=[
                    "Implement a referral program with client incentives",
                    "Optimize your Google My Business profile",
                    "Create Instagram content showcasing your work",
                    "Partner with local businesses for cross-referrals",
                    "Offer new client promotions strategically"
                ],
                timeline="2-4 months to see significant results",
                success_metrics=[
                    f"Monthly new client acquisitions reach {target_clients}",
                    "Referral rate increases to 25% of new clients",
                    "Social media followers grow by 50%"
                ],
                resources=[
                    "6FB Marketing Playbook",
                    "6FB Social Media Content Templates",
                    "6FB Referral Program Setup Guide"
                ],
                # Educational explanations
                why_this_matters="Client acquisition compounds over time through lifetime value. Each new client represents not just their first visit, but potentially years of future revenue. The cost of acquiring a client becomes negligible when spread across their lifetime value.",
                business_principle="Customer Acquisition Cost (CAC) must be less than Customer Lifetime Value (CLV). Focus on acquisition channels with the highest quality clients, not just the highest quantity. One loyal client is worth 10 one-time visitors.",
                market_context="Word-of-mouth is the strongest marketing channel in personal services. People trust recommendations from friends and family over advertising. Building a referral engine creates sustainable, low-cost growth that competitors can't easily replicate.",
                six_fb_methodology="6FB focuses on attracting clients who value quality over price. Target clients who appreciate craftsmanship and are willing to pay for expertise. These clients become long-term relationships that drive sustainable six-figure income."
            ))
        
        return insights
    
    def _generate_retention_insights(self) -> List[CoachingInsight]:
        """Generate client retention insights"""
        insights = []
        
        current_retention = self.recommendations.get('retention_improvement', {}).get('current_retention_rate', 0)
        target_retention = self.recommendations.get('retention_improvement', {}).get('target_retention_rate', 0)
        
        if current_retention < target_retention:
            retention_gap = target_retention - current_retention
            annual_impact = self.recommendations.get('retention_improvement', {}).get('potential_annual_increase', 0)
            
            priority = CoachingPriority.HIGH if retention_gap > 15 else CoachingPriority.MEDIUM
            
            insights.append(CoachingInsight(
                category=CoachingCategory.RETENTION,
                priority=priority,
                title="Client Retention Improvement Needed",
                message=f"Your retention rate of {current_retention:.1f}% is below the 6FB target of {target_retention:.1f}%. Every percentage point matters.",
                impact_description=f"Improving retention to {target_retention:.1f}% could add ${annual_impact:,.0f} in annual revenue through increased lifetime value.",
                potential_revenue_increase=annual_impact,
                action_steps=[
                    "Implement a systematic follow-up system within 24-48 hours",
                    "Create a client preference tracking system",
                    "Develop a loyalty program with service milestones",
                    "Send personalized birthday and appointment reminders",
                    "Conduct quarterly client satisfaction surveys"
                ],
                timeline="6-12 months for full retention improvement",
                success_metrics=[
                    f"Client retention rate reaches {target_retention:.1f}%",
                    "Average client visits per year increase by 20%",
                    "Client lifetime value increases by 30%"
                ],
                resources=[
                    "6FB Client Experience Guide",
                    "6FB Follow-up System Templates",
                    "6FB Loyalty Program Framework"
                ],
                # Educational explanations
                why_this_matters="Retaining existing clients is 5-25x more cost-effective than acquiring new ones. A 5% increase in retention can increase profits by 25-95%. Client retention directly impacts your predictable income and reduces dependence on constant marketing.",
                business_principle="The Pareto Principle applies to clients: 80% of your revenue comes from 20% of your clients. Focus on keeping your best clients happy rather than chasing new ones. Loyal clients become advocates who bring referrals.",
                market_context="In personal services, clients switch providers for three main reasons: poor service quality, lack of personal connection, or feeling undervalued. Most retention issues are preventable through consistent communication and exceptional service delivery.",
                six_fb_methodology="6FB treats every client as a long-term relationship, not a transaction. Build genuine connections, remember personal details, and consistently exceed expectations. Your goal is to become their barber for life, not just their next haircut."
            ))
        
        return insights
    
    def _generate_efficiency_insights(self) -> List[CoachingInsight]:
        """Generate efficiency optimization insights"""
        insights = []
        
        current_utilization = self.recommendations.get('efficiency_optimization', {}).get('current_utilization_rate', 0)
        target_utilization = self.recommendations.get('efficiency_optimization', {}).get('target_utilization_rate', 0)
        
        if current_utilization < target_utilization:
            efficiency_gap = target_utilization - current_utilization
            annual_impact = self.recommendations.get('efficiency_optimization', {}).get('potential_annual_increase', 0)
            
            priority = CoachingPriority.MEDIUM if efficiency_gap > 10 else CoachingPriority.LOW
            
            insights.append(CoachingInsight(
                category=CoachingCategory.EFFICIENCY,
                priority=priority,
                title="Schedule Efficiency Optimization",
                message=f"Your utilization rate of {current_utilization:.1f}% indicates room for schedule optimization. Small improvements yield significant results.",
                impact_description=f"Improving utilization to {target_utilization:.1f}% could add ${annual_impact:,.0f} annually without working more hours.",
                potential_revenue_increase=annual_impact,
                action_steps=[
                    "Analyze your no-show patterns and implement prevention strategies",
                    "Optimize service time blocks for maximum efficiency",
                    "Implement online booking to reduce scheduling gaps",
                    "Create waitlists for popular time slots",
                    "Use buffer time strategically for upselling"
                ],
                timeline="1-3 months for noticeable improvement",
                success_metrics=[
                    f"Schedule utilization reaches {target_utilization:.1f}%",
                    "No-show rate decreases below 5%",
                    "Average daily revenue increases by 15%"
                ],
                resources=[
                    "6FB Time Management System",
                    "6FB No-Show Prevention Strategies",
                    "6FB Schedule Optimization Tools"
                ],
                # Educational explanations
                why_this_matters="Time is your most finite resource. Unlike pricing or client count, you can't create more hours in the day. Maximizing utilization means earning more from the same time investment. Empty appointment slots represent lost revenue that can never be recovered.",
                business_principle="Utilization Rate = (Billable Hours / Available Hours) × 100. Higher utilization increases revenue without increasing costs. The goal isn't to work more hours, but to eliminate wasted time within your existing schedule.",
                market_context="No-shows and cancellations cost service businesses billions annually. Industry average no-show rate is 12-15%, but with proper systems, you can reduce this to under 5%. Each prevented no-show directly increases your utilization rate.",
                six_fb_methodology="6FB emphasizes premium positioning, which allows you to be selective with clients and maintain higher show rates. Quality clients who value your expertise are more likely to respect your time and show up for appointments."
            ))
        
        return insights
    
    def _generate_service_mix_insights(self) -> List[CoachingInsight]:
        """Generate service mix optimization insights"""
        insights = []
        
        # This would analyze the actual service mix from the analytics data
        # For now, provide general Six Figure Barber service mix guidance
        
        insights.append(CoachingInsight(
            category=CoachingCategory.SERVICE_MIX,
            priority=CoachingPriority.MEDIUM,
            title="Service Portfolio Optimization",
            message="Optimize your service mix to maximize revenue per client visit and differentiate from competitors.",
            impact_description="A well-structured service portfolio can increase average ticket by 20-30% and improve client satisfaction.",
            potential_revenue_increase=self.current_performance.get('monthly_revenue', 0) * 12 * 0.25,
            action_steps=[
                "Audit your current service menu for profitability",
                "Add premium services with higher margins",
                "Bundle complementary services for value packages",
                "Eliminate low-margin, time-intensive services",
                "Train on upselling techniques for existing services"
            ],
            timeline="2-4 months to optimize service mix",
            success_metrics=[
                "Average ticket increases by 20%",
                "Premium service adoption reaches 40%",
                "Service profitability improves across all offerings"
            ],
            resources=[
                "6FB Service Menu Templates",
                "6FB Profitability Analysis Worksheet",
                "6FB Upselling Training Materials"
            ],
            # Educational explanations
            why_this_matters="Not all services are created equal. Some services drive higher profits while others attract new clients. A strategic service mix allows you to maximize revenue while providing comprehensive value to clients. It's about working smarter, not harder.",
            business_principle="The 80/20 rule applies to services: 20% of your services likely generate 80% of your profit. Focus on high-margin services while using lower-margin services as entry points. Service bundling increases perceived value and average transaction size.",
            market_context="Modern consumers seek convenience and comprehensive solutions. They prefer paying more for bundled services from a trusted provider rather than visiting multiple locations. Premium services also create differentiation in a competitive market.",
            six_fb_methodology="6FB focuses on becoming the complete solution for client grooming needs. Position yourself as the expert authority, not just another barber. Premium services justify premium pricing and attract clients who value expertise over bargains."
        ))
        
        return insights
    
    def generate_daily_focus_areas(self) -> Dict[str, Any]:
        """Generate daily focus areas for maximum impact"""
        insights = self.generate_comprehensive_coaching()
        
        # Get top 3 priority insights
        top_insights = insights[:3]
        
        # Create daily action plan
        daily_actions = []
        for insight in top_insights:
            if insight.action_steps:
                daily_actions.append({
                    "category": insight.category.value,
                    "action": insight.action_steps[0],  # First action step
                    "impact": f"${insight.potential_revenue_increase/12:,.0f}/month potential"
                })
        
        return {
            "focus_areas": [
                {
                    "title": insight.title,
                    "category": insight.category.value,
                    "priority": insight.priority.value,
                    "impact": f"${insight.potential_revenue_increase:,.0f} annual potential"
                }
                for insight in top_insights
            ],
            "daily_actions": daily_actions,
            "key_metric_to_track": self._get_key_metric_to_track(),
            "motivational_message": self._generate_motivational_message()
        }
    
    def _get_key_metric_to_track(self) -> str:
        """Identify the most important metric to track today"""
        current_revenue = self.current_performance.get('monthly_revenue', 0) * 12
        target_revenue = self.targets.get('annual_income_target', 100000)
        
        if current_revenue < target_revenue * 0.5:
            return "Average ticket value - Focus on increasing service prices"
        elif current_revenue < target_revenue * 0.75:
            return "Monthly new clients - Focus on acquisition strategies"
        else:
            return "Client retention rate - Focus on relationship building"
    
    def _generate_motivational_message(self) -> str:
        """Generate a motivational message based on current progress"""
        current_revenue = self.current_performance.get('monthly_revenue', 0) * 12
        target_revenue = self.targets.get('annual_income_target', 100000)
        progress = (current_revenue / target_revenue) * 100 if target_revenue > 0 else 0
        
        if progress >= 90:
            return f"🎯 You're {progress:.1f}% to your goal! Push through the final stretch - six figures is within reach!"
        elif progress >= 70:
            return f"🚀 Great momentum at {progress:.1f}%! Focus on your highest-impact strategies to accelerate growth."
        elif progress >= 50:
            return f"💪 You're {progress:.1f}% there! Stay consistent with proven 6FB methods."
        else:
            return f"🌟 Every expert was once a beginner. At {progress:.1f}%, you have tremendous growth potential ahead!"
    
    def _priority_score(self, priority: CoachingPriority) -> int:
        """Convert priority to numeric score for sorting"""
        return {
            CoachingPriority.CRITICAL: 1,
            CoachingPriority.HIGH: 2,
            CoachingPriority.MEDIUM: 3,
            CoachingPriority.LOW: 4
        }.get(priority, 5)