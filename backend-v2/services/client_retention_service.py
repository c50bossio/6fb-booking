"""
Client Retention Service - Six Figure Barber Retention Orchestration
====================================================================

Orchestrates the complete client retention system, integrating churn prediction,
intervention campaigns, and retention analytics for Six Figure success.

This service coordinates:
- Churn prediction and risk assessment
- Automated intervention triggers
- Retention campaign management
- ROI tracking and optimization
- Integration with Smart Notifications system
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
import logging
from dataclasses import dataclass
from enum import Enum

from models import User, Client, Appointment, Payment
from services.churn_prediction_service import ChurnPredictionService, ChurnPrediction, ChurnAnalysis, ChurnRiskLevel
from services.smart_notifications_service import SmartNotificationsService, SmartNotification, NotificationPriority, NotificationType

logger = logging.getLogger(__name__)

class RetentionCampaignType(Enum):
    """Types of retention campaigns"""
    IMMEDIATE_INTERVENTION = "immediate_intervention"  # Critical risk clients
    PROACTIVE_OUTREACH = "proactive_outreach"         # High risk clients
    WELLNESS_CHECK = "wellness_check"                 # Medium risk clients
    WIN_BACK = "win_back"                            # Churned clients
    LOYALTY_REWARD = "loyalty_reward"                # Retention reward

class RetentionCampaignStatus(Enum):
    """Status of retention campaigns"""
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

@dataclass
class RetentionCampaign:
    """Retention campaign details"""
    campaign_id: str
    client_id: int
    client_name: str
    campaign_type: RetentionCampaignType
    status: RetentionCampaignStatus
    churn_risk_score: float
    estimated_revenue_at_risk: float
    
    # Campaign configuration
    message_template: str
    offer_details: Optional[Dict[str, Any]]
    channel: str  # 'email', 'sms', 'phone'
    
    # Timing
    created_at: datetime
    scheduled_at: datetime
    sent_at: Optional[datetime]
    expires_at: datetime
    
    # Results
    opened: bool = False
    clicked: bool = False
    responded: bool = False
    booked_appointment: bool = False
    campaign_success: bool = False
    
    # ROI tracking
    campaign_cost: float = 0.0
    revenue_recovered: float = 0.0
    roi_percentage: float = 0.0

@dataclass
class RetentionMetrics:
    """Overall retention performance metrics"""
    total_clients_monitored: int
    clients_at_risk: int
    campaigns_sent: int
    successful_interventions: int
    revenue_saved: float
    campaign_costs: float
    roi_percentage: float
    
    # Performance by risk level
    critical_risk_success_rate: float
    high_risk_success_rate: float
    medium_risk_success_rate: float
    
    # Trends
    churn_rate_trend: str  # 'improving', 'stable', 'worsening'
    retention_rate_improvement: float
    
    period_start: datetime
    period_end: datetime

class ClientRetentionService:
    """
    Six Figure Barber Client Retention Service
    
    Orchestrates intelligent retention strategies to maximize client
    lifetime value and accelerate Six Figure success.
    """
    
    # Campaign timing configurations
    CAMPAIGN_SCHEDULES = {
        RetentionCampaignType.IMMEDIATE_INTERVENTION: timedelta(hours=2),   # Send within 2 hours
        RetentionCampaignType.PROACTIVE_OUTREACH: timedelta(hours=24),     # Send within 24 hours
        RetentionCampaignType.WELLNESS_CHECK: timedelta(days=3),           # Send within 3 days
        RetentionCampaignType.WIN_BACK: timedelta(days=7),                 # Send within 1 week
        RetentionCampaignType.LOYALTY_REWARD: timedelta(days=1)            # Send within 1 day
    }
    
    # Campaign costs (for ROI calculation)
    CAMPAIGN_COSTS = {
        RetentionCampaignType.IMMEDIATE_INTERVENTION: 5.0,  # Phone call cost
        RetentionCampaignType.PROACTIVE_OUTREACH: 1.0,      # SMS cost
        RetentionCampaignType.WELLNESS_CHECK: 0.50,         # Email cost
        RetentionCampaignType.WIN_BACK: 2.0,                # Email + SMS
        RetentionCampaignType.LOYALTY_REWARD: 10.0          # Reward/discount cost
    }
    
    def __init__(self, db: Session):
        self.db = db
        self.churn_service = ChurnPredictionService(db)
        self.notifications_service = SmartNotificationsService(db)
    
    def analyze_retention_opportunities(self, user_id: int, analysis_period_days: int = 90) -> RetentionMetrics:
        """
        Analyze retention opportunities and current performance
        
        Args:
            user_id: Barber's user ID
            analysis_period_days: Days of data to analyze
            
        Returns:
            RetentionMetrics with comprehensive retention insights
        """
        try:
            # Get churn analysis
            churn_analysis = self.churn_service.analyze_client_base_churn_risk(user_id, analysis_period_days)
            
            # Get high-risk clients for intervention opportunities
            high_risk_clients = self.churn_service.get_high_risk_clients(user_id, risk_threshold=50.0)
            
            # Calculate retention metrics
            total_monitored = churn_analysis.total_clients_analyzed
            at_risk_count = churn_analysis.high_risk_client_count + churn_analysis.critical_risk_client_count
            
            # Estimate campaign performance (simplified - would track actual campaigns)
            campaigns_needed = at_risk_count
            estimated_success_rate = 0.25  # 25% success rate assumption
            successful_interventions = int(campaigns_needed * estimated_success_rate)
            
            # Calculate potential revenue saved
            revenue_saved = churn_analysis.total_revenue_at_risk * estimated_success_rate
            campaign_costs = campaigns_needed * 2.0  # Average campaign cost
            roi_percentage = ((revenue_saved - campaign_costs) / campaign_costs * 100) if campaign_costs > 0 else 0
            
            # Performance by risk level (estimated)
            critical_success_rate = 0.4   # 40% success for critical interventions
            high_success_rate = 0.3       # 30% success for high risk
            medium_success_rate = 0.15    # 15% success for medium risk
            
            return RetentionMetrics(
                total_clients_monitored=total_monitored,
                clients_at_risk=at_risk_count,
                campaigns_sent=campaigns_needed,
                successful_interventions=successful_interventions,
                revenue_saved=revenue_saved,
                campaign_costs=campaign_costs,
                roi_percentage=roi_percentage,
                
                critical_risk_success_rate=critical_success_rate,
                high_risk_success_rate=high_success_rate,
                medium_risk_success_rate=medium_success_rate,
                
                churn_rate_trend=churn_analysis.churn_risk_trend,
                retention_rate_improvement=estimated_success_rate * 100,
                
                period_start=datetime.now() - timedelta(days=analysis_period_days),
                period_end=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error analyzing retention opportunities for user {user_id}: {e}")
            return self._create_empty_metrics(user_id, analysis_period_days)
    
    def generate_retention_campaigns(self, user_id: int) -> List[RetentionCampaign]:
        """
        Generate retention campaigns for at-risk clients
        
        Args:
            user_id: Barber's user ID
            
        Returns:
            List of RetentionCampaign objects ready for execution
        """
        try:
            campaigns = []
            
            # Get high-risk clients
            high_risk_clients = self.churn_service.get_high_risk_clients(user_id, risk_threshold=40.0)
            
            for prediction in high_risk_clients:
                # Determine campaign type based on risk level
                campaign_type = self._determine_campaign_type(prediction)
                
                # Generate campaign details
                campaign = self._create_retention_campaign(prediction, campaign_type, user_id)
                campaigns.append(campaign)
            
            # Sort by urgency (highest risk first)
            campaigns.sort(key=lambda x: x.churn_risk_score, reverse=True)
            
            return campaigns
            
        except Exception as e:
            logger.error(f"Error generating retention campaigns for user {user_id}: {e}")
            return []
    
    def create_retention_notifications(self, user_id: int) -> List[SmartNotification]:
        """
        Create Smart Notifications for retention opportunities
        
        Args:
            user_id: Barber's user ID
            
        Returns:
            List of SmartNotification objects for retention alerts
        """
        try:
            notifications = []
            
            # Get retention analysis
            retention_metrics = self.analyze_retention_opportunities(user_id)
            
            # Critical risk clients notification
            if retention_metrics.clients_at_risk > 0:
                critical_clients = self.churn_service.get_high_risk_clients(user_id, risk_threshold=75.0)
                
                if critical_clients:
                    total_critical_revenue = sum(c.estimated_revenue_at_risk for c in critical_clients)
                    
                    notification = SmartNotification(
                        id=f"critical_churn_risk_{user_id}_{datetime.now().strftime('%Y%m%d')}",
                        user_id=user_id,
                        type=NotificationType.AT_RISK_CLIENT,
                        priority=NotificationPriority.URGENT,
                        title=f"🚨 {len(critical_clients)} Critical Risk Clients",
                        message=f"High-value clients worth ${total_critical_revenue:,.0f} need immediate intervention to prevent churn.",
                        action_items=[
                            "Call critical risk clients within 24 hours",
                            "Offer personalized service or loyalty bonus",
                            "Schedule priority appointment slots",
                            "Send exclusive VIP offers to re-engage"
                        ],
                        data={
                            "critical_clients": [
                                {
                                    "client_name": c.client_name,
                                    "risk_score": c.churn_risk_score,
                                    "revenue_at_risk": c.estimated_revenue_at_risk,
                                    "days_since_last_booking": c.last_booking_days_ago
                                }
                                for c in critical_clients[:5]  # Top 5 critical clients
                            ],
                            "total_revenue_at_risk": total_critical_revenue,
                            "intervention_urgency": "immediate"
                        },
                        created_at=datetime.now(),
                        expires_at=datetime.now() + timedelta(hours=24),
                        estimated_impact=f"${total_critical_revenue:,.0f} revenue at risk"
                    )
                    notifications.append(notification)
            
            # High ROI retention opportunity notification
            if retention_metrics.roi_percentage > 200:  # 200%+ ROI opportunity
                notification = SmartNotification(
                    id=f"retention_roi_opportunity_{user_id}_{datetime.now().strftime('%Y%m%d')}",
                    user_id=user_id,
                    type=NotificationType.REVENUE_OPPORTUNITY,
                    priority=NotificationPriority.HIGH,
                    title=f"💰 {retention_metrics.roi_percentage:.0f}% ROI Retention Opportunity",
                    message=f"Invest ${retention_metrics.campaign_costs:.0f} in retention campaigns to save ${retention_metrics.revenue_saved:,.0f} in client value.",
                    action_items=[
                        "Launch automated retention campaigns",
                        "Prioritize high-value at-risk clients",
                        "Track intervention success rates",
                        "Optimize campaign messaging for better results"
                    ],
                    data={
                        "campaign_investment": retention_metrics.campaign_costs,
                        "potential_revenue_saved": retention_metrics.revenue_saved,
                        "expected_roi": retention_metrics.roi_percentage,
                        "clients_targeted": retention_metrics.clients_at_risk
                    },
                    created_at=datetime.now(),
                    expires_at=datetime.now() + timedelta(days=7),
                    estimated_impact=f"+${retention_metrics.revenue_saved - retention_metrics.campaign_costs:,.0f} net revenue"
                )
                notifications.append(notification)
            
            # Retention performance coaching notification
            if retention_metrics.churn_rate_trend == 'worsening':
                notification = SmartNotification(
                    id=f"retention_coaching_{user_id}_{datetime.now().strftime('%Y%m%d')}",
                    user_id=user_id,
                    type=NotificationType.BUSINESS_COACHING,
                    priority=NotificationPriority.MEDIUM,
                    title="📈 Improve Client Retention Strategy",
                    message="Client retention trends show room for improvement. Focus on relationship building and proactive communication.",
                    action_items=[
                        "Implement regular client check-ins",
                        "Create loyalty rewards program",
                        "Improve service consistency and quality",
                        "Develop personalized client experiences"
                    ],
                    data={
                        "retention_trend": retention_metrics.churn_rate_trend,
                        "current_success_rate": retention_metrics.retention_rate_improvement,
                        "improvement_potential": "25-40% retention increase possible"
                    },
                    created_at=datetime.now(),
                    expires_at=datetime.now() + timedelta(days=14),
                    estimated_impact="10-15% revenue growth through retention"
                )
                notifications.append(notification)
            
            return notifications
            
        except Exception as e:
            logger.error(f"Error creating retention notifications for user {user_id}: {e}")
            return []
    
    def track_campaign_performance(self, campaign_id: str, outcome: Dict[str, Any]) -> RetentionCampaign:
        """
        Track the performance of a retention campaign
        
        Args:
            campaign_id: Campaign identifier
            outcome: Campaign outcome data
            
        Returns:
            Updated RetentionCampaign with performance metrics
        """
        # This would update campaign performance in database
        # For now, return a placeholder implementation
        
        try:
            # In a real implementation, this would:
            # 1. Find the campaign in database
            # 2. Update performance metrics
            # 3. Calculate ROI
            # 4. Store results for analytics
            
            logger.info(f"Campaign {campaign_id} performance tracked: {outcome}")
            
            # Placeholder return - would return actual updated campaign
            return None
            
        except Exception as e:
            logger.error(f"Error tracking campaign performance for {campaign_id}: {e}")
            return None
    
    def get_retention_dashboard_data(self, user_id: int) -> Dict[str, Any]:
        """
        Get comprehensive retention dashboard data
        
        Args:
            user_id: Barber's user ID
            
        Returns:
            Dashboard data with retention metrics and insights
        """
        try:
            # Get current retention metrics
            retention_metrics = self.analyze_retention_opportunities(user_id)
            
            # Get churn analysis
            churn_analysis = self.churn_service.analyze_client_base_churn_risk(user_id)
            
            # Get high-risk clients
            high_risk_clients = self.churn_service.get_high_risk_clients(user_id, risk_threshold=50.0)
            
            # Prepare dashboard data
            dashboard_data = {
                "overview": {
                    "total_clients_monitored": retention_metrics.total_clients_monitored,
                    "clients_at_risk": retention_metrics.clients_at_risk,
                    "revenue_at_risk": churn_analysis.total_revenue_at_risk,
                    "retention_roi": retention_metrics.roi_percentage,
                    "churn_trend": retention_metrics.churn_rate_trend
                },
                "risk_breakdown": {
                    "critical_risk": churn_analysis.critical_risk_client_count,
                    "high_risk": churn_analysis.high_risk_client_count - churn_analysis.critical_risk_client_count,
                    "medium_risk": retention_metrics.clients_at_risk - churn_analysis.high_risk_client_count,
                    "low_risk": retention_metrics.total_clients_monitored - retention_metrics.clients_at_risk
                },
                "performance_metrics": {
                    "campaigns_sent": retention_metrics.campaigns_sent,
                    "successful_interventions": retention_metrics.successful_interventions,
                    "success_rate": (retention_metrics.successful_interventions / retention_metrics.campaigns_sent * 100) if retention_metrics.campaigns_sent > 0 else 0,
                    "revenue_saved": retention_metrics.revenue_saved,
                    "campaign_costs": retention_metrics.campaign_costs
                },
                "top_risk_clients": [
                    {
                        "client_name": client.client_name,
                        "risk_score": client.churn_risk_score,
                        "revenue_at_risk": client.estimated_revenue_at_risk,
                        "recommended_action": client.intervention_recommendations[0] if client.intervention_recommendations else "Contact client"
                    }
                    for client in high_risk_clients[:5]
                ],
                "retention_opportunities": churn_analysis.retention_opportunities,
                "six_figure_impact": {
                    "retention_contribution": retention_metrics.revenue_saved,
                    "monthly_revenue_protection": churn_analysis.estimated_monthly_revenue_loss,
                    "goal_acceleration": "2-3 months faster with effective retention"
                }
            }
            
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Error getting retention dashboard data for user {user_id}: {e}")
            return {}
    
    # Helper methods
    
    def _determine_campaign_type(self, prediction: ChurnPrediction) -> RetentionCampaignType:
        """Determine appropriate campaign type based on churn prediction"""
        if prediction.risk_level == ChurnRiskLevel.CRITICAL:
            return RetentionCampaignType.IMMEDIATE_INTERVENTION
        elif prediction.risk_level == ChurnRiskLevel.HIGH:
            return RetentionCampaignType.PROACTIVE_OUTREACH
        elif prediction.risk_level == ChurnRiskLevel.MEDIUM:
            return RetentionCampaignType.WELLNESS_CHECK
        else:
            return RetentionCampaignType.LOYALTY_REWARD
    
    def _create_retention_campaign(self, prediction: ChurnPrediction, campaign_type: RetentionCampaignType, user_id: int) -> RetentionCampaign:
        """Create a retention campaign for a specific client"""
        
        # Generate campaign message based on type and risk factors
        message_template = self._generate_campaign_message(prediction, campaign_type)
        
        # Determine offer details
        offer_details = self._generate_campaign_offer(prediction, campaign_type)
        
        # Determine communication channel
        channel = self._select_communication_channel(prediction, campaign_type)
        
        # Calculate scheduling
        schedule_delay = self.CAMPAIGN_SCHEDULES.get(campaign_type, timedelta(days=1))
        scheduled_at = datetime.now() + schedule_delay
        
        return RetentionCampaign(
            campaign_id=f"{campaign_type.value}_{prediction.client_id}_{datetime.now().strftime('%Y%m%d_%H%M')}",
            client_id=prediction.client_id,
            client_name=prediction.client_name,
            campaign_type=campaign_type,
            status=RetentionCampaignStatus.PENDING,
            churn_risk_score=prediction.churn_risk_score,
            estimated_revenue_at_risk=prediction.estimated_revenue_at_risk,
            
            message_template=message_template,
            offer_details=offer_details,
            channel=channel,
            
            created_at=datetime.now(),
            scheduled_at=scheduled_at,
            sent_at=None,
            expires_at=datetime.now() + timedelta(days=30),
            
            campaign_cost=self.CAMPAIGN_COSTS.get(campaign_type, 1.0)
        )
    
    def _generate_campaign_message(self, prediction: ChurnPrediction, campaign_type: RetentionCampaignType) -> str:
        """Generate personalized campaign message"""
        
        messages = {
            RetentionCampaignType.IMMEDIATE_INTERVENTION: f"Hi {prediction.client_name}, we miss seeing you! As one of our valued clients, I wanted to personally reach out. Let's schedule your next appointment - I have some exciting new techniques to show you!",
            
            RetentionCampaignType.PROACTIVE_OUTREACH: f"Hey {prediction.client_name}! It's been a while since your last visit. We have some great new services and I'd love to help you look and feel your best. When can we get you back in?",
            
            RetentionCampaignType.WELLNESS_CHECK: f"Hi {prediction.client_name}, just checking in to see how you're doing! Remember, I'm here whenever you need to look sharp. Let me know when you'd like to book your next appointment.",
            
            RetentionCampaignType.WIN_BACK: f"We miss you, {prediction.client_name}! Come back and see what's new - I guarantee you'll love the experience. Special offer just for you!",
            
            RetentionCampaignType.LOYALTY_REWARD: f"Thank you for being a loyal client, {prediction.client_name}! Here's a special appreciation offer just for you."
        }
        
        return messages.get(campaign_type, f"Hi {prediction.client_name}, let's schedule your next appointment!")
    
    def _generate_campaign_offer(self, prediction: ChurnPrediction, campaign_type: RetentionCampaignType) -> Optional[Dict[str, Any]]:
        """Generate appropriate offer for the campaign"""
        
        if campaign_type == RetentionCampaignType.IMMEDIATE_INTERVENTION:
            return {
                "type": "priority_booking",
                "description": "Exclusive VIP time slot",
                "value": "Priority scheduling + complimentary service upgrade"
            }
        elif campaign_type == RetentionCampaignType.PROACTIVE_OUTREACH:
            return {
                "type": "service_discount",
                "description": "15% off next service",
                "value": 15,
                "expiry_days": 14
            }
        elif campaign_type == RetentionCampaignType.WIN_BACK:
            return {
                "type": "comeback_special",
                "description": "25% off comeback appointment",
                "value": 25,
                "expiry_days": 30
            }
        elif campaign_type == RetentionCampaignType.LOYALTY_REWARD:
            return {
                "type": "loyalty_bonus",
                "description": "Complimentary add-on service",
                "value": "Free beard trim or styling"
            }
        
        return None
    
    def _select_communication_channel(self, prediction: ChurnPrediction, campaign_type: RetentionCampaignType) -> str:
        """Select appropriate communication channel"""
        
        if campaign_type == RetentionCampaignType.IMMEDIATE_INTERVENTION:
            return "phone"  # Personal call for critical clients
        elif prediction.churn_risk_score >= 60:
            return "sms"    # SMS for high-risk clients
        else:
            return "email"  # Email for medium-risk clients
    
    def _create_empty_metrics(self, user_id: int, analysis_period_days: int) -> RetentionMetrics:
        """Create empty metrics when no data available"""
        return RetentionMetrics(
            total_clients_monitored=0,
            clients_at_risk=0,
            campaigns_sent=0,
            successful_interventions=0,
            revenue_saved=0.0,
            campaign_costs=0.0,
            roi_percentage=0.0,
            
            critical_risk_success_rate=0.0,
            high_risk_success_rate=0.0,
            medium_risk_success_rate=0.0,
            
            churn_rate_trend='stable',
            retention_rate_improvement=0.0,
            
            period_start=datetime.now() - timedelta(days=analysis_period_days),
            period_end=datetime.now()
        )