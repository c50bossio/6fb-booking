"""
Weekly Insights Service for BookedBarber V2

This service provides automated weekly business intelligence generation aligned with
the Six Figure Barber methodology. It analyzes performance data, generates actionable
insights, and delivers comprehensive reports to help barbers optimize their business.

Key Features:
- Automated weekly analysis and insight generation
- Six Figure Barber methodology alignment scoring
- Actionable recommendations with impact predictions
- Trend analysis and performance comparisons
- Email delivery with engagement tracking
- Historical insights tracking and archiving
"""

import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
import json
import statistics
from dataclasses import dataclass, asdict

from models import (
    User, Appointment, Payment, Service, Client,
    SixFBRevenueMetrics, SixFBClientValueProfile, SixFBServiceExcellenceMetrics,
    SixFBEfficiencyMetrics, SixFBGrowthMetrics, SixFBMethodologyDashboard
)
from models.weekly_insights import (
    WeeklyInsight, WeeklyRecommendation, InsightEmailDelivery, InsightMetric,
    InsightCategory, RecommendationPriority, InsightStatus, EmailDeliveryStatus
)
from services.business_analytics_service import BusinessAnalyticsService
from services.intelligent_analytics_service import IntelligentAnalyticsService

logger = logging.getLogger(__name__)

@dataclass
class WeeklyInsightData:
    """Data structure for weekly insight generation"""
    user_id: int
    week_start: datetime
    week_end: datetime
    current_metrics: Dict[str, Any]
    previous_metrics: Dict[str, Any]
    trends: Dict[str, float]
    six_fb_scores: Dict[str, float]
    recommendations: List[Dict[str, Any]]
    achievements: List[str]
    opportunities: List[str]
    risks: List[str]

@dataclass
class SixFigureBarberScore:
    """Six Figure Barber methodology scoring"""
    overall_score: float
    revenue_optimization: float
    client_value: float
    service_excellence: float
    business_efficiency: float
    professional_growth: float
    
class WeeklyInsightsService:
    """
    Comprehensive service for generating weekly business insights aligned with
    the Six Figure Barber methodology.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.analytics_service = BusinessAnalyticsService(db)
        self.intelligent_analytics = IntelligentAnalyticsService(db)
    
    def generate_weekly_insights(self, user_id: int, week_start: Optional[datetime] = None) -> WeeklyInsight:
        """
        Generate comprehensive weekly insights for a barber.
        
        Args:
            user_id: The barber's user ID
            week_start: Start of the week to analyze (defaults to last Monday)
            
        Returns:
            WeeklyInsight: Complete weekly insight record
        """
        try:
            # Determine the week to analyze
            if week_start is None:
                today = datetime.now()
                days_since_monday = today.weekday()
                week_start = today - timedelta(days=days_since_monday, weeks=1)
                week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
            
            week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
            
            logger.info(f"Generating weekly insights for user {user_id}, week {week_start.date()} to {week_end.date()}")
            
            # Check if insights already exist for this week
            existing_insight = self.db.query(WeeklyInsight).filter(
                WeeklyInsight.user_id == user_id,
                WeeklyInsight.week_start_date == week_start
            ).first()
            
            if existing_insight and existing_insight.status == InsightStatus.GENERATED:
                logger.info(f"Weekly insights already exist for user {user_id}, week {week_start.date()}")
                return existing_insight
            
            # Create or update insight record
            if existing_insight:
                insight = existing_insight
                insight.status = InsightStatus.GENERATING
                insight.error_message = None
            else:
                insight = WeeklyInsight(
                    user_id=user_id,
                    week_start_date=week_start,
                    week_end_date=week_end,
                    status=InsightStatus.GENERATING
                )
                self.db.add(insight)
            
            self.db.commit()
            
            generation_start = datetime.utcnow()
            
            # Gather comprehensive data for analysis
            insight_data = self._gather_insight_data(user_id, week_start, week_end)
            
            # Calculate Six Figure Barber methodology scores
            six_fb_scores = self._calculate_six_fb_scores(insight_data)
            
            # Generate actionable recommendations
            recommendations = self._generate_recommendations(insight_data, six_fb_scores)
            
            # Create executive summary and key insights
            executive_summary, key_insights = self._generate_ai_insights(insight_data, six_fb_scores)
            
            # Update insight record with results
            insight.overall_score = six_fb_scores.overall_score
            insight.previous_week_score = insight_data.previous_metrics.get('overall_score', 0)
            insight.score_change = insight.overall_score - insight.previous_week_score
            
            # Business metrics
            insight.revenue_current_week = insight_data.current_metrics.get('total_revenue', 0)
            insight.revenue_previous_week = insight_data.previous_metrics.get('total_revenue', 0)
            insight.revenue_growth_percent = self._calculate_growth_rate(
                insight.revenue_current_week, insight.revenue_previous_week
            )
            
            insight.appointments_current_week = insight_data.current_metrics.get('total_appointments', 0)
            insight.appointments_previous_week = insight_data.previous_metrics.get('total_appointments', 0)
            insight.appointment_growth_percent = self._calculate_growth_rate(
                insight.appointments_current_week, insight.appointments_previous_week
            )
            
            insight.new_clients_count = insight_data.current_metrics.get('new_clients', 0)
            insight.returning_clients_count = insight_data.current_metrics.get('returning_clients', 0)
            insight.client_retention_rate = insight_data.current_metrics.get('retention_rate', 0)
            
            insight.average_ticket_size = insight_data.current_metrics.get('average_ticket_size', 0)
            insight.booking_efficiency_percent = insight_data.current_metrics.get('booking_efficiency_percent', 0)
            insight.no_show_rate_percent = insight_data.current_metrics.get('no_show_rate_percent', 0)
            
            # Six Figure Barber scores
            insight.revenue_optimization_score = six_fb_scores.revenue_optimization
            insight.client_value_score = six_fb_scores.client_value
            insight.service_excellence_score = six_fb_scores.service_excellence
            insight.business_efficiency_score = six_fb_scores.business_efficiency
            insight.professional_growth_score = six_fb_scores.professional_growth
            
            # Insights and analysis
            insight.trend_analysis = insight_data.trends
            insight.top_achievements = insight_data.achievements
            insight.key_opportunities = insight_data.opportunities
            insight.risk_factors = insight_data.risks
            insight.executive_summary = executive_summary
            insight.key_insights = key_insights
            
            # Complete generation
            insight.status = InsightStatus.GENERATED
            insight.generation_duration_seconds = (datetime.utcnow() - generation_start).total_seconds()
            
            self.db.commit()
            
            # Create recommendation records
            for rec_data in recommendations:
                recommendation = WeeklyRecommendation(
                    weekly_insight_id=insight.id,
                    user_id=user_id,
                    category=rec_data['category'],
                    priority=rec_data['priority'],
                    title=rec_data['title'],
                    description=rec_data['description'],
                    expected_impact=rec_data.get('expected_impact'),
                    estimated_effort=rec_data.get('estimated_effort'),
                    confidence_score=rec_data.get('confidence_score', 0.8),
                    six_fb_principle=rec_data.get('six_fb_principle'),
                    methodology_alignment_score=rec_data.get('methodology_alignment_score', 0.8),
                    action_items=rec_data.get('action_items', []),
                    success_metrics=rec_data.get('success_metrics', [])
                )
                self.db.add(recommendation)
            
            self.db.commit()
            
            # Track insight generation metrics
            self._track_insight_metrics(insight.id, user_id, insight_data, six_fb_scores)
            
            logger.info(f"Successfully generated weekly insights for user {user_id}")
            return insight
            
        except Exception as e:
            logger.error(f"Error generating weekly insights for user {user_id}: {e}")
            if 'insight' in locals():
                insight.status = InsightStatus.FAILED
                insight.error_message = str(e)
                self.db.commit()
            raise
    
    def _gather_insight_data(self, user_id: int, week_start: datetime, week_end: datetime) -> WeeklyInsightData:
        """Gather comprehensive data for insight generation"""
        
        # Current week data
        current_start_date = week_start.date()
        current_end_date = week_end.date()
        current_metrics = self.analytics_service._get_overview_metrics(
            user_id, current_start_date, current_end_date
        )
        
        # Previous week data for comparison
        prev_week_start = week_start - timedelta(days=7)
        prev_week_end = week_end - timedelta(days=7)
        prev_start_date = prev_week_start.date()
        prev_end_date = prev_week_end.date()
        previous_metrics = self.analytics_service._get_overview_metrics(
            user_id, prev_start_date, prev_end_date
        )
        
        # Calculate trends
        trends = self._calculate_trends(current_metrics, previous_metrics)
        
        # Get Six Figure Barber alignment data
        six_fb_data = self.analytics_service._get_six_fb_alignment_metrics(
            user_id, current_start_date, current_end_date
        )
        
        # Analyze achievements, opportunities, and risks
        achievements = self._identify_achievements(current_metrics, previous_metrics, trends)
        opportunities = self._identify_opportunities(current_metrics, trends, six_fb_data)
        risks = self._identify_risks(current_metrics, trends, six_fb_data)
        
        # Get additional metrics
        current_metrics.update(self._get_additional_metrics(user_id, current_start_date, current_end_date))
        previous_metrics.update(self._get_additional_metrics(user_id, prev_start_date, prev_end_date))
        
        return WeeklyInsightData(
            user_id=user_id,
            week_start=week_start,
            week_end=week_end,
            current_metrics=current_metrics,
            previous_metrics=previous_metrics,
            trends=trends,
            six_fb_scores=six_fb_data,
            recommendations=[],  # Will be populated later
            achievements=achievements,
            opportunities=opportunities,
            risks=risks
        )
    
    def _get_additional_metrics(self, user_id: int, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get additional metrics beyond the basic overview"""
        
        # Client acquisition and retention
        new_clients = self.db.query(func.count(func.distinct(Appointment.client_id))).filter(
            Appointment.barber_id == user_id,
            Appointment.status == "completed",
            func.date(Appointment.start_time) >= start_date,
            func.date(Appointment.start_time) <= end_date,
            ~Appointment.client_id.in_(
                self.db.query(Appointment.client_id).filter(
                    Appointment.barber_id == user_id,
                    func.date(Appointment.start_time) < start_date
                ).distinct()
            )
        ).scalar() or 0
        
        returning_clients = self.db.query(func.count(func.distinct(Appointment.client_id))).filter(
            Appointment.barber_id == user_id,
            Appointment.status == "completed",
            func.date(Appointment.start_time) >= start_date,
            func.date(Appointment.start_time) <= end_date,
            Appointment.client_id.in_(
                self.db.query(Appointment.client_id).filter(
                    Appointment.barber_id == user_id,
                    func.date(Appointment.start_time) < start_date
                ).distinct()
            )
        ).scalar() or 0
        
        total_clients = new_clients + returning_clients
        retention_rate = (returning_clients / total_clients * 100) if total_clients > 0 else 0
        
        # No-show analysis
        no_shows = self.db.query(func.count(Appointment.id)).filter(
            Appointment.barber_id == user_id,
            Appointment.status == "no_show",
            func.date(Appointment.start_time) >= start_date,
            func.date(Appointment.start_time) <= end_date
        ).scalar() or 0
        
        total_scheduled = self.db.query(func.count(Appointment.id)).filter(
            Appointment.barber_id == user_id,
            func.date(Appointment.start_time) >= start_date,
            func.date(Appointment.start_time) <= end_date
        ).scalar() or 0
        
        no_show_rate = (no_shows / total_scheduled * 100) if total_scheduled > 0 else 0
        
        # Premium service metrics
        premium_revenue = self.db.query(func.sum(Payment.amount)).join(
            Appointment, Payment.appointment_id == Appointment.id
        ).join(
            Service, Appointment.service_id == Service.id
        ).filter(
            Appointment.barber_id == user_id,
            Payment.status == "completed",
            Service.base_price >= 75,  # Premium threshold
            func.date(Payment.created_at) >= start_date,
            func.date(Payment.created_at) <= end_date
        ).scalar() or 0
        
        return {
            'new_clients': new_clients,
            'returning_clients': returning_clients,
            'retention_rate': retention_rate,
            'no_show_rate_percent': no_show_rate,
            'premium_revenue': float(premium_revenue)
        }
    
    def _calculate_trends(self, current: Dict[str, Any], previous: Dict[str, Any]) -> Dict[str, float]:
        """Calculate week-over-week trends for key metrics"""
        trends = {}
        
        key_metrics = [
            'total_revenue', 'total_appointments', 'unique_clients',
            'average_ticket_size', 'booking_efficiency_percent'
        ]
        
        for metric in key_metrics:
            current_val = current.get(metric, 0)
            previous_val = previous.get(metric, 0)
            trends[f'{metric}_trend'] = self._calculate_growth_rate(current_val, previous_val)
        
        return trends
    
    def _calculate_growth_rate(self, current: float, previous: float) -> float:
        """Calculate growth rate between two values"""
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return ((current - previous) / previous) * 100
    
    def _calculate_six_fb_scores(self, insight_data: WeeklyInsightData) -> SixFigureBarberScore:
        """Calculate Six Figure Barber methodology alignment scores"""
        
        # Revenue optimization score (based on revenue growth and premium service mix)
        revenue_growth = insight_data.trends.get('total_revenue_trend', 0)
        premium_percentage = (insight_data.current_metrics.get('premium_revenue', 0) / 
                            max(insight_data.current_metrics.get('total_revenue', 1), 1)) * 100
        
        revenue_score = min(100, 60 + (revenue_growth * 2) + (premium_percentage * 0.4))
        
        # Client value score (based on retention and ticket size)
        retention_rate = insight_data.current_metrics.get('retention_rate', 0)
        avg_ticket = insight_data.current_metrics.get('average_ticket_size', 0)
        
        client_score = min(100, (retention_rate * 0.6) + (min(avg_ticket / 100, 1) * 40))
        
        # Service excellence score (based on completion rate and efficiency)
        booking_efficiency = insight_data.current_metrics.get('booking_efficiency_percent', 0)
        no_show_rate = insight_data.current_metrics.get('no_show_rate_percent', 0)
        
        service_score = min(100, booking_efficiency - (no_show_rate * 2))
        
        # Business efficiency score (based on revenue per appointment and utilization)
        revenue_per_appointment = (insight_data.current_metrics.get('total_revenue', 0) /
                                 max(insight_data.current_metrics.get('total_appointments', 1), 1))
        
        efficiency_score = min(100, 50 + (revenue_per_appointment * 0.5))
        
        # Professional growth score (based on client acquisition and business trends)
        new_client_rate = insight_data.current_metrics.get('new_clients', 0)
        overall_trend = statistics.mean([
            insight_data.trends.get('total_revenue_trend', 0),
            insight_data.trends.get('total_appointments_trend', 0),
            insight_data.trends.get('unique_clients_trend', 0)
        ])
        
        growth_score = min(100, 60 + (new_client_rate * 2) + (overall_trend * 0.5))
        
        # Overall score (weighted average)
        overall_score = (
            revenue_score * 0.30 +
            client_score * 0.25 +
            service_score * 0.20 +
            efficiency_score * 0.15 +
            growth_score * 0.10
        )
        
        return SixFigureBarberScore(
            overall_score=round(overall_score, 1),
            revenue_optimization=round(revenue_score, 1),
            client_value=round(client_score, 1),
            service_excellence=round(service_score, 1),
            business_efficiency=round(efficiency_score, 1),
            professional_growth=round(growth_score, 1)
        )
    
    def _identify_achievements(self, current: Dict[str, Any], previous: Dict[str, Any], 
                             trends: Dict[str, float]) -> List[str]:
        """Identify key achievements for the week"""
        achievements = []
        
        # Revenue achievements
        if trends.get('total_revenue_trend', 0) > 10:
            achievements.append(f"Revenue increased by {trends['total_revenue_trend']:.1f}% week-over-week")
        
        # Client acquisition achievements
        new_clients = current.get('new_clients', 0)
        if new_clients >= 3:
            achievements.append(f"Acquired {new_clients} new clients this week")
        
        # Efficiency achievements
        if current.get('booking_efficiency_percent', 0) > 85:
            achievements.append(f"Achieved {current['booking_efficiency_percent']:.1f}% booking efficiency")
        
        # No-show improvements
        if current.get('no_show_rate_percent', 0) < previous.get('no_show_rate_percent', 100):
            achievements.append("Reduced no-show rate compared to previous week")
        
        # High-value services
        if current.get('average_ticket_size', 0) > 100:
            achievements.append(f"Maintained premium pricing with ${current['average_ticket_size']:.0f} average ticket")
        
        return achievements[:5]  # Limit to top 5 achievements
    
    def _identify_opportunities(self, current: Dict[str, Any], trends: Dict[str, float],
                              six_fb_data: Dict[str, Any]) -> List[str]:
        """Identify improvement opportunities"""
        opportunities = []
        
        # Revenue optimization opportunities
        if current.get('average_ticket_size', 0) < 75:
            opportunities.append("Increase average ticket size through premium service offerings")
        
        # Booking efficiency opportunities
        if current.get('booking_efficiency_percent', 0) < 70:
            opportunities.append("Optimize schedule to increase booking utilization")
        
        # Client retention opportunities
        if current.get('retention_rate', 0) < 60:
            opportunities.append("Implement client retention strategies and follow-up systems")
        
        # No-show reduction opportunities
        if current.get('no_show_rate_percent', 0) > 10:
            opportunities.append("Reduce no-shows with confirmation systems and deposit policies")
        
        # Premium service opportunities
        premium_percentage = (current.get('premium_revenue', 0) / 
                            max(current.get('total_revenue', 1), 1)) * 100
        if premium_percentage < 30:
            opportunities.append("Increase premium service adoption through value positioning")
        
        return opportunities[:5]  # Limit to top 5 opportunities
    
    def _identify_risks(self, current: Dict[str, Any], trends: Dict[str, float],
                       six_fb_data: Dict[str, Any]) -> List[str]:
        """Identify potential business risks"""
        risks = []
        
        # Revenue decline risks
        if trends.get('total_revenue_trend', 0) < -10:
            risks.append(f"Revenue declining by {abs(trends['total_revenue_trend']):.1f}% - requires immediate attention")
        
        # Client acquisition risks
        if current.get('new_clients', 0) == 0:
            risks.append("No new client acquisition this week - marketing needs enhancement")
        
        # High no-show risks
        if current.get('no_show_rate_percent', 0) > 20:
            risks.append("High no-show rate impacting revenue and efficiency")
        
        # Low retention risks
        if current.get('retention_rate', 0) < 40:
            risks.append("Low client retention rate - client satisfaction may be declining")
        
        # Booking efficiency risks
        if current.get('booking_efficiency_percent', 0) < 50:
            risks.append("Low booking efficiency - capacity not being optimally utilized")
        
        return risks[:5]  # Limit to top 5 risks
    
    def _generate_recommendations(self, insight_data: WeeklyInsightData, 
                                six_fb_scores: SixFigureBarberScore) -> List[Dict[str, Any]]:
        """Generate actionable recommendations based on analysis"""
        recommendations = []
        
        # Revenue optimization recommendations
        if six_fb_scores.revenue_optimization < 75:
            if insight_data.current_metrics.get('average_ticket_size', 0) < 75:
                recommendations.append({
                    'category': InsightCategory.REVENUE_OPTIMIZATION,
                    'priority': RecommendationPriority.HIGH,
                    'title': 'Increase Average Ticket Size',
                    'description': f'Your average ticket size is ${insight_data.current_metrics.get("average_ticket_size", 0):.0f}. Focus on premium service offerings and value-based pricing.',
                    'expected_impact': '15-25% revenue increase',
                    'estimated_effort': '2-3 weeks implementation',
                    'confidence_score': 0.85,
                    'six_fb_principle': 'revenue_optimization',
                    'methodology_alignment_score': 0.9,
                    'action_items': [
                        'Review current service menu and pricing',
                        'Develop premium service packages',
                        'Train on consultative selling techniques',
                        'Implement value-based pricing strategy'
                    ],
                    'success_metrics': [
                        'Average ticket size increase to $100+',
                        'Premium service adoption rate >30%',
                        'Revenue growth >20% month-over-month'
                    ]
                })
        
        # Client retention recommendations
        if six_fb_scores.client_value < 75:
            if insight_data.current_metrics.get('retention_rate', 0) < 60:
                recommendations.append({
                    'category': InsightCategory.CLIENT_MANAGEMENT,
                    'priority': RecommendationPriority.HIGH,
                    'title': 'Improve Client Retention Strategy',
                    'description': f'Client retention rate is {insight_data.current_metrics.get("retention_rate", 0):.1f}%. Implement systematic follow-up and relationship building.',
                    'expected_impact': '10-20% revenue increase',
                    'estimated_effort': '1-2 weeks setup',
                    'confidence_score': 0.8,
                    'six_fb_principle': 'client_value_maximization',
                    'methodology_alignment_score': 0.9,
                    'action_items': [
                        'Create follow-up communication schedule',
                        'Implement loyalty program or membership',
                        'Develop personalized client experiences',
                        'Track client satisfaction and feedback'
                    ],
                    'success_metrics': [
                        'Retention rate increase to 70%+',
                        'Rebooking rate improvement',
                        'Client lifetime value increase'
                    ]
                })
        
        # Operational efficiency recommendations
        if six_fb_scores.business_efficiency < 75:
            if insight_data.current_metrics.get('booking_efficiency_percent', 0) < 70:
                recommendations.append({
                    'category': InsightCategory.OPERATIONAL_EFFICIENCY,
                    'priority': RecommendationPriority.MEDIUM,
                    'title': 'Optimize Schedule Utilization',
                    'description': f'Booking efficiency is {insight_data.current_metrics.get("booking_efficiency_percent", 0):.1f}%. Optimize availability and implement demand-driven scheduling.',
                    'expected_impact': '15-30% capacity improvement',
                    'estimated_effort': '1 week optimization',
                    'confidence_score': 0.75,
                    'six_fb_principle': 'business_efficiency',
                    'methodology_alignment_score': 0.8,
                    'action_items': [
                        'Analyze peak demand patterns',
                        'Adjust availability schedule',
                        'Implement waitlist system',
                        'Create last-minute booking incentives'
                    ],
                    'success_metrics': [
                        'Booking efficiency >80%',
                        'Reduced idle time',
                        'Increased appointments per week'
                    ]
                })
        
        # No-show reduction recommendations
        if insight_data.current_metrics.get('no_show_rate_percent', 0) > 10:
            recommendations.append({
                'category': InsightCategory.OPERATIONAL_EFFICIENCY,
                'priority': RecommendationPriority.MEDIUM,
                'title': 'Reduce No-Show Rate',
                'description': f'No-show rate is {insight_data.current_metrics.get("no_show_rate_percent", 0):.1f}%. Implement prevention strategies to protect revenue.',
                'expected_impact': f'${(insight_data.current_metrics.get("no_show_rate_percent", 0) / 100 * insight_data.current_metrics.get("total_revenue", 0)):.0f} recovered revenue',
                'estimated_effort': '3-5 days setup',
                'confidence_score': 0.85,
                'six_fb_principle': 'business_efficiency',
                'methodology_alignment_score': 0.85,
                'action_items': [
                    'Implement automated reminder system',
                    'Require deposit for new clients',
                    'Create overbooking strategy',
                    'Follow up with no-show clients'
                ],
                'success_metrics': [
                    'No-show rate <5%',
                    'Confirmed appointment rate >95%',
                    'Revenue protection'
                ]
            })
        
        # Business growth recommendations
        if insight_data.current_metrics.get('new_clients', 0) < 2:
            recommendations.append({
                'category': InsightCategory.BUSINESS_GROWTH,
                'priority': RecommendationPriority.MEDIUM,
                'title': 'Enhance Client Acquisition',
                'description': f'Only {insight_data.current_metrics.get("new_clients", 0)} new clients this week. Strengthen marketing and referral strategies.',
                'expected_impact': '20-40% client growth',
                'estimated_effort': '2-3 weeks campaign',
                'confidence_score': 0.7,
                'six_fb_principle': 'professional_growth',
                'methodology_alignment_score': 0.8,
                'action_items': [
                    'Enhance social media presence',
                    'Implement referral program',
                    'Partner with local businesses',
                    'Optimize online booking experience'
                ],
                'success_metrics': [
                    '3+ new clients per week',
                    'Referral rate >20%',
                    'Online visibility improvement'
                ]
            })
        
        # Sort recommendations by priority and confidence
        priority_order = {
            RecommendationPriority.CRITICAL: 4,
            RecommendationPriority.HIGH: 3,
            RecommendationPriority.MEDIUM: 2,
            RecommendationPriority.LOW: 1
        }
        
        recommendations.sort(key=lambda x: (
            priority_order[x['priority']],
            x['confidence_score']
        ), reverse=True)
        
        return recommendations[:6]  # Limit to top 6 recommendations
    
    def _generate_ai_insights(self, insight_data: WeeklyInsightData, 
                            six_fb_scores: SixFigureBarberScore) -> Tuple[str, str]:
        """Generate AI-powered executive summary and key insights"""
        
        # Executive summary
        week_performance = "strong" if six_fb_scores.overall_score >= 75 else "mixed" if six_fb_scores.overall_score >= 60 else "challenging"
        revenue_trend = "up" if insight_data.trends.get('total_revenue_trend', 0) > 0 else "down"
        
        executive_summary = f"""
        This week showed {week_performance} performance with an overall Six Figure Barber score of {six_fb_scores.overall_score:.1f}/100.
        
        Revenue was {revenue_trend} {abs(insight_data.trends.get('total_revenue_trend', 0)):.1f}% week-over-week at ${insight_data.current_metrics.get('total_revenue', 0):.0f}.
        You served {insight_data.current_metrics.get('total_appointments', 0)} appointments with {insight_data.current_metrics.get('new_clients', 0)} new clients.
        
        Your strongest area is {self._get_top_scoring_area(six_fb_scores)} with room for improvement in {self._get_lowest_scoring_area(six_fb_scores)}.
        """
        
        # Key insights
        key_insights = f"""
        Key Performance Highlights:
        • Average ticket size: ${insight_data.current_metrics.get('average_ticket_size', 0):.0f}
        • Client retention rate: {insight_data.current_metrics.get('retention_rate', 0):.1f}%
        • Booking efficiency: {insight_data.current_metrics.get('booking_efficiency_percent', 0):.1f}%
        
        Six Figure Barber Methodology Alignment:
        • Revenue Optimization: {six_fb_scores.revenue_optimization:.1f}/100
        • Client Value Creation: {six_fb_scores.client_value:.1f}/100
        • Service Excellence: {six_fb_scores.service_excellence:.1f}/100
        
        Focus Areas for Next Week:
        {chr(10).join(['• ' + opp for opp in insight_data.opportunities[:3]])}
        """
        
        return executive_summary.strip(), key_insights.strip()
    
    def _get_top_scoring_area(self, scores: SixFigureBarberScore) -> str:
        """Get the highest scoring Six Figure Barber area"""
        score_map = {
            'Revenue Optimization': scores.revenue_optimization,
            'Client Value': scores.client_value,
            'Service Excellence': scores.service_excellence,
            'Business Efficiency': scores.business_efficiency,
            'Professional Growth': scores.professional_growth
        }
        return max(score_map, key=score_map.get)
    
    def _get_lowest_scoring_area(self, scores: SixFigureBarberScore) -> str:
        """Get the lowest scoring Six Figure Barber area"""
        score_map = {
            'Revenue Optimization': scores.revenue_optimization,
            'Client Value': scores.client_value,
            'Service Excellence': scores.service_excellence,
            'Business Efficiency': scores.business_efficiency,
            'Professional Growth': scores.professional_growth
        }
        return min(score_map, key=score_map.get)
    
    def _track_insight_metrics(self, insight_id: int, user_id: int, 
                             insight_data: WeeklyInsightData, scores: SixFigureBarberScore):
        """Track metrics about the insight generation process"""
        
        # Track overall insight quality
        metric = InsightMetric(
            user_id=user_id,
            weekly_insight_id=insight_id,
            metric_name="insight_generation_success",
            metric_value=1.0,
            metric_category="generation",
            metadata={
                'data_completeness': len(insight_data.current_metrics) / 10,  # Estimate
                'recommendations_count': len(insight_data.recommendations),
                'achievements_count': len(insight_data.achievements)
            }
        )
        self.db.add(metric)
        
        # Track Six Figure Barber alignment
        alignment_metric = InsightMetric(
            user_id=user_id,
            weekly_insight_id=insight_id,
            metric_name="six_fb_alignment_score",
            metric_value=scores.overall_score,
            metric_category="methodology",
            metadata=asdict(scores)
        )
        self.db.add(alignment_metric)
        
        self.db.commit()
    
    def get_weekly_insights_history(self, user_id: int, weeks_back: int = 12) -> List[WeeklyInsight]:
        """Get historical weekly insights for a user"""
        
        cutoff_date = datetime.now() - timedelta(weeks=weeks_back)
        
        return self.db.query(WeeklyInsight).filter(
            WeeklyInsight.user_id == user_id,
            WeeklyInsight.week_start_date >= cutoff_date,
            WeeklyInsight.status == InsightStatus.GENERATED
        ).order_by(desc(WeeklyInsight.week_start_date)).all()
    
    def get_insight_recommendations(self, insight_id: int) -> List[WeeklyRecommendation]:
        """Get all recommendations for a specific weekly insight"""
        
        return self.db.query(WeeklyRecommendation).filter(
            WeeklyRecommendation.weekly_insight_id == insight_id
        ).order_by(
            WeeklyRecommendation.priority.desc(),
            WeeklyRecommendation.confidence_score.desc()
        ).all()
    
    def update_recommendation_status(self, recommendation_id: int, status: str, 
                                   user_feedback: Optional[str] = None) -> bool:
        """Update the status of a recommendation"""
        
        try:
            recommendation = self.db.query(WeeklyRecommendation).filter(
                WeeklyRecommendation.id == recommendation_id
            ).first()
            
            if not recommendation:
                return False
            
            recommendation.status = status
            if user_feedback:
                recommendation.user_feedback_text = user_feedback
            
            if status == "completed":
                recommendation.implemented_date = datetime.utcnow()
            
            self.db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error updating recommendation status: {e}")
            return False
    
    def get_insight_trends(self, user_id: int, metric_name: str, weeks_back: int = 12) -> List[Dict[str, Any]]:
        """Get trends for a specific metric over time"""
        
        cutoff_date = datetime.now() - timedelta(weeks=weeks_back)
        
        insights = self.db.query(WeeklyInsight).filter(
            WeeklyInsight.user_id == user_id,
            WeeklyInsight.week_start_date >= cutoff_date,
            WeeklyInsight.status == InsightStatus.GENERATED
        ).order_by(WeeklyInsight.week_start_date).all()
        
        trends = []
        for insight in insights:
            value = getattr(insight, metric_name, None)
            if value is not None:
                trends.append({
                    'week_start': insight.week_start_date,
                    'value': value,
                    'week_label': insight.week_start_date.strftime('%b %d')
                })
        
        return trends