"""
Smart Insights Consolidation Service for BookedBarber V2

This service intelligently consolidates insights from all analytics components and provides
actionable recommendations prioritized by business impact and urgency.

Key Features:
- Intelligent insight prioritization using Six Figure Barber methodology
- Real-time insight aggregation from multiple analytics sources
- Actionable recommendations with one-click actions
- Business impact scoring and urgency detection
- Integration with existing notification system
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
import logging
from dataclasses import dataclass, field
from enum import Enum
import asyncio
from concurrent.futures import ThreadPoolExecutor

from models import User, Appointment, Payment, Client, Service
from services.intelligent_analytics_service import (
    IntelligentAnalyticsService, BusinessHealthScore, PredictiveInsight, 
    SmartAlert, AlertPriority, HealthScoreLevel
)
from services.analytics_service import AnalyticsService
from services.notification_service import NotificationService
from utils.cache_decorators import cache_result

logger = logging.getLogger(__name__)

class InsightPriority(Enum):
    CRITICAL = "critical"       # Immediate action required (revenue loss, critical issues)
    HIGH = "high"              # Action needed this week (opportunities, performance)
    MEDIUM = "medium"          # Action beneficial this month (optimizations)
    LOW = "low"               # Nice to know (FYI insights)

class InsightCategory(Enum):
    REVENUE = "revenue"
    RETENTION = "retention"
    EFFICIENCY = "efficiency"
    GROWTH = "growth"
    QUALITY = "quality"
    OPPORTUNITY = "opportunity"
    RISK = "risk"

class ActionType(Enum):
    SCHEDULE_CLIENT = "schedule_client"
    ADJUST_PRICING = "adjust_pricing"
    SEND_MESSAGE = "send_message"
    VIEW_ANALYTICS = "view_analytics"
    CONTACT_CLIENT = "contact_client"
    REVIEW_PERFORMANCE = "review_performance"
    OPTIMIZE_SCHEDULE = "optimize_schedule"
    IMPLEMENT_STRATEGY = "implement_strategy"

@dataclass
class InsightAction:
    type: ActionType
    label: str
    description: str
    endpoint: Optional[str] = None
    params: Dict[str, Any] = field(default_factory=dict)
    icon: Optional[str] = None

@dataclass
class ConsolidatedInsight:
    id: str
    title: str
    description: str
    priority: InsightPriority
    category: InsightCategory
    impact_score: float  # 0-10 scale
    urgency_score: float  # 0-10 scale
    confidence: float    # 0-1 scale
    source: str         # Which analytics component generated this
    
    # Business context
    metric_name: str
    current_value: Optional[float] = None
    target_value: Optional[float] = None
    trend: Optional[str] = None
    
    # Time context
    created_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    time_horizon: str = "immediate"
    
    # Actionability
    actions: List[InsightAction] = field(default_factory=list)
    recommended_action: Optional[str] = None
    
    # Additional context
    tags: List[str] = field(default_factory=list)
    related_clients: List[int] = field(default_factory=list)
    related_appointments: List[int] = field(default_factory=list)

@dataclass
class SmartInsightsResponse:
    """Response model for Smart Insights Hub API"""
    critical_insights: List[ConsolidatedInsight]
    priority_insight: Optional[ConsolidatedInsight]
    insights_by_category: Dict[str, List[ConsolidatedInsight]]
    business_health_summary: Dict[str, Any]
    quick_actions: List[InsightAction]
    total_insights: int
    last_updated: datetime

class SmartInsightsService:
    """
    Intelligent service that consolidates insights from all analytics components
    and provides prioritized, actionable recommendations for barbers.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.intelligent_analytics = IntelligentAnalyticsService(db)
        self.analytics_service = AnalyticsService(db)
        self.notification_service = NotificationService()
        
        # Six Figure Barber business impact weights
        self.impact_weights = {
            InsightCategory.REVENUE: 1.0,      # Highest impact
            InsightCategory.RETENTION: 0.9,   # Critical for sustainability
            InsightCategory.EFFICIENCY: 0.8,  # Operational optimization
            InsightCategory.GROWTH: 0.7,      # Future opportunity
            InsightCategory.QUALITY: 0.6,     # Service excellence
            InsightCategory.OPPORTUNITY: 0.5,  # Strategic advantage
            InsightCategory.RISK: 0.9,        # Prevention critical
        }
    
    @cache_result(ttl=900)  # Cache for 15 minutes
    async def get_smart_insights(self, user_id: int, include_predictions: bool = True) -> SmartInsightsResponse:
        """
        Get comprehensive smart insights for a user with intelligent prioritization
        """
        try:
            # Gather insights from all sources concurrently
            insights = await self._gather_all_insights(user_id, include_predictions)
            
            # Prioritize and consolidate insights
            prioritized_insights = self._prioritize_insights(insights)
            
            # Get the most critical insight
            priority_insight = prioritized_insights[0] if prioritized_insights else None
            
            # Categorize insights
            insights_by_category = self._categorize_insights(prioritized_insights)
            
            # Get critical insights (urgent action needed)
            critical_insights = [
                insight for insight in prioritized_insights 
                if insight.priority == InsightPriority.CRITICAL
            ][:5]  # Top 5 critical insights
            
            # Generate business health summary
            health_summary = await self._get_health_summary(user_id)
            
            # Generate quick actions
            quick_actions = self._generate_quick_actions(prioritized_insights[:10])
            
            return SmartInsightsResponse(
                critical_insights=critical_insights,
                priority_insight=priority_insight,
                insights_by_category=insights_by_category,
                business_health_summary=health_summary,
                quick_actions=quick_actions,
                total_insights=len(prioritized_insights),
                last_updated=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error generating smart insights for user {user_id}: {e}")
            # Return minimal safe response
            return SmartInsightsResponse(
                critical_insights=[],
                priority_insight=None,
                insights_by_category={},
                business_health_summary={"status": "error", "message": "Unable to generate insights"},
                quick_actions=[],
                total_insights=0,
                last_updated=datetime.now()
            )
    
    async def _gather_all_insights(self, user_id: int, include_predictions: bool) -> List[ConsolidatedInsight]:
        """Gather insights from all analytics sources concurrently"""
        
        insights = []
        
        # Use ThreadPoolExecutor for CPU-bound operations
        with ThreadPoolExecutor(max_workers=4) as executor:
            # Gather insights from different sources
            futures = []
            
            # Business health insights
            futures.append(
                executor.submit(self._get_health_insights, user_id)
            )
            
            # Smart alerts
            futures.append(
                executor.submit(self._get_alert_insights, user_id)
            )
            
            # Revenue insights
            futures.append(
                executor.submit(self._get_revenue_insights, user_id)
            )
            
            # Client retention insights
            futures.append(
                executor.submit(self._get_retention_insights, user_id)
            )
            
            # Efficiency insights
            futures.append(
                executor.submit(self._get_efficiency_insights, user_id)
            )
            
            if include_predictions:
                # Predictive insights
                futures.append(
                    executor.submit(self._get_predictive_insights, user_id)
                )
            
            # Collect results
            for future in futures:
                try:
                    source_insights = future.result(timeout=30)  # 30 second timeout
                    insights.extend(source_insights)
                except Exception as e:
                    logger.error(f"Error gathering insights from source: {e}")
                    continue
        
        return insights
    
    def _prioritize_insights(self, insights: List[ConsolidatedInsight]) -> List[ConsolidatedInsight]:
        """Prioritize insights using Six Figure Barber methodology"""
        
        def calculate_priority_score(insight: ConsolidatedInsight) -> float:
            """Calculate priority score based on impact, urgency, and confidence"""
            
            # Base score from impact and urgency
            base_score = (insight.impact_score * 0.6) + (insight.urgency_score * 0.4)
            
            # Apply confidence multiplier
            confidence_multiplier = 0.5 + (insight.confidence * 0.5)  # 0.5 to 1.0
            
            # Apply category weight
            category_weight = self.impact_weights.get(insight.category, 0.5)
            
            # Calculate final priority score
            priority_score = base_score * confidence_multiplier * category_weight
            
            return priority_score
        
        # Calculate priority scores
        for insight in insights:
            insight._priority_score = calculate_priority_score(insight)
        
        # Sort by priority score (highest first)
        sorted_insights = sorted(insights, key=lambda x: x._priority_score, reverse=True)
        
        # Remove the temporary priority score
        for insight in sorted_insights:
            if hasattr(insight, '_priority_score'):
                delattr(insight, '_priority_score')
        
        return sorted_insights
    
    def _categorize_insights(self, insights: List[ConsolidatedInsight]) -> Dict[str, List[ConsolidatedInsight]]:
        """Categorize insights by category"""
        categorized = {}
        
        for insight in insights:
            category = insight.category.value
            if category not in categorized:
                categorized[category] = []
            categorized[category].append(insight)
        
        return categorized
    
    def _get_health_insights(self, user_id: int) -> List[ConsolidatedInsight]:
        """Generate insights from business health score"""
        try:
            health_score = self.intelligent_analytics.calculate_business_health_score(user_id)
            insights = []
            
            # Overall health insight
            if health_score.level == HealthScoreLevel.CRITICAL:
                insights.append(ConsolidatedInsight(
                    id=f"health_critical_{user_id}",
                    title="Business Health Critical",
                    description=f"Overall business health score is {health_score.overall_score:.1f}. Immediate action required.",
                    priority=InsightPriority.CRITICAL,
                    category=InsightCategory.RISK,
                    impact_score=9.5,
                    urgency_score=10.0,
                    confidence=0.95,
                    source="business_health",
                    metric_name="business_health_score",
                    current_value=health_score.overall_score,
                    target_value=75.0,
                    trend="declining",
                    recommended_action="Review risk factors and implement immediate improvements",
                    actions=[
                        InsightAction(
                            type=ActionType.VIEW_ANALYTICS,
                            label="View Detailed Analytics",
                            description="Analyze performance breakdown",
                            endpoint="/analytics/performance",
                            icon="chart-bar"
                        )
                    ],
                    tags=health_score.risk_factors[:3],
                    expires_at=datetime.now() + timedelta(days=3)
                ))
            
            elif health_score.level == HealthScoreLevel.WARNING:
                insights.append(ConsolidatedInsight(
                    id=f"health_warning_{user_id}",
                    title="Business Performance Needs Attention",
                    description=f"Business health score is {health_score.overall_score:.1f}. Some areas need improvement.",
                    priority=InsightPriority.HIGH,
                    category=InsightCategory.EFFICIENCY,
                    impact_score=7.0,
                    urgency_score=6.0,
                    confidence=0.9,
                    source="business_health",
                    metric_name="business_health_score",
                    current_value=health_score.overall_score,
                    target_value=85.0,
                    trend="stable",
                    recommended_action="Focus on key improvement areas",
                    actions=[
                        InsightAction(
                            type=ActionType.REVIEW_PERFORMANCE,
                            label="Review Performance",
                            description="Identify improvement opportunities",
                            endpoint="/analytics/health",
                            icon="clipboard-list"
                        )
                    ],
                    tags=health_score.opportunities[:2]
                ))
            
            # Component-specific insights
            for component, score in health_score.components.items():
                if score < 60:  # Poor performance
                    category = self._map_component_to_category(component)
                    insights.append(ConsolidatedInsight(
                        id=f"health_component_{component}_{user_id}",
                        title=f"{component.replace('_', ' ').title()} Underperforming",
                        description=f"{component.replace('_', ' ').title()} score is {score:.1f}. Needs improvement.",
                        priority=InsightPriority.HIGH if score < 50 else InsightPriority.MEDIUM,
                        category=category,
                        impact_score=8.0 if score < 50 else 6.0,
                        urgency_score=7.0 if score < 50 else 5.0,
                        confidence=0.85,
                        source="business_health",
                        metric_name=component,
                        current_value=score,
                        target_value=75.0,
                        trend=health_score.trends.get(component, "unknown"),
                        recommended_action=f"Improve {component.replace('_', ' ')} performance",
                        actions=self._get_component_actions(component),
                        tags=[component, "underperforming"]
                    ))
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating health insights: {e}")
            return []
    
    def _get_alert_insights(self, user_id: int) -> List[ConsolidatedInsight]:
        """Convert smart alerts to consolidated insights"""
        try:
            alerts = self.intelligent_analytics.generate_smart_alerts(user_id)
            insights = []
            
            for alert in alerts:
                # Map alert priority to insight priority
                priority_mapping = {
                    AlertPriority.CRITICAL: InsightPriority.CRITICAL,
                    AlertPriority.HIGH: InsightPriority.HIGH,
                    AlertPriority.MEDIUM: InsightPriority.MEDIUM,
                    AlertPriority.LOW: InsightPriority.LOW
                }
                
                # Map alert category to insight category
                category_mapping = {
                    'revenue': InsightCategory.REVENUE,
                    'booking': InsightCategory.EFFICIENCY,
                    'retention': InsightCategory.RETENTION,
                    'capacity': InsightCategory.EFFICIENCY
                }
                
                insights.append(ConsolidatedInsight(
                    id=f"alert_{alert.category}_{user_id}_{int(datetime.now().timestamp())}",
                    title=alert.title,
                    description=alert.message,
                    priority=priority_mapping.get(alert.priority, InsightPriority.MEDIUM),
                    category=category_mapping.get(alert.category, InsightCategory.RISK),
                    impact_score=self._calculate_alert_impact(alert),
                    urgency_score=self._calculate_alert_urgency(alert),
                    confidence=0.8,
                    source="smart_alerts",
                    metric_name=alert.metric_name,
                    current_value=alert.current_value,
                    target_value=alert.threshold_value,
                    trend=alert.trend,
                    recommended_action=alert.suggested_actions[0] if alert.suggested_actions else None,
                    actions=self._convert_alert_actions(alert.suggested_actions),
                    expires_at=alert.expires_at,
                    tags=[alert.category, alert.trend]
                ))
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating alert insights: {e}")
            return []
    
    def _get_revenue_insights(self, user_id: int) -> List[ConsolidatedInsight]:
        """Generate revenue-specific insights"""
        try:
            insights = []
            
            # Get recent revenue data
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            # Calculate revenue metrics
            current_revenue = self.db.query(func.sum(Payment.amount)).filter(
                Payment.user_id == user_id,
                Payment.status == 'completed',
                Payment.created_at >= start_date,
                Payment.created_at <= end_date
            ).scalar() or 0
            
            # Compare to previous period
            prev_start = start_date - timedelta(days=30)
            prev_revenue = self.db.query(func.sum(Payment.amount)).filter(
                Payment.user_id == user_id,
                Payment.status == 'completed',
                Payment.created_at >= prev_start,
                Payment.created_at < start_date
            ).scalar() or 0
            
            if prev_revenue > 0:
                growth_rate = ((current_revenue - prev_revenue) / prev_revenue) * 100
                
                if growth_rate < -10:  # Significant decline
                    insights.append(ConsolidatedInsight(
                        id=f"revenue_decline_{user_id}",
                        title="Revenue Declining",
                        description=f"Revenue down {abs(growth_rate):.1f}% this month vs last month",
                        priority=InsightPriority.CRITICAL,
                        category=InsightCategory.REVENUE,
                        impact_score=9.0,
                        urgency_score=8.5,
                        confidence=0.95,
                        source="revenue_analysis",
                        metric_name="monthly_revenue_growth",
                        current_value=growth_rate,
                        target_value=5.0,
                        trend="declining",
                        recommended_action="Review pricing and service offerings",
                        actions=[
                            InsightAction(
                                type=ActionType.ADJUST_PRICING,
                                label="Review Pricing",
                                description="Analyze and optimize service pricing",
                                endpoint="/settings/pricing",
                                icon="currency-dollar"
                            ),
                            InsightAction(
                                type=ActionType.VIEW_ANALYTICS,
                                label="Revenue Analytics",
                                description="Deep dive into revenue patterns",
                                endpoint="/analytics/revenue",
                                icon="chart-line"
                            )
                        ],
                        tags=["declining", "urgent"]
                    ))
                
                elif growth_rate > 20:  # Strong growth
                    insights.append(ConsolidatedInsight(
                        id=f"revenue_growth_{user_id}",
                        title="Strong Revenue Growth",
                        description=f"Revenue up {growth_rate:.1f}% this month - consider scaling",
                        priority=InsightPriority.HIGH,
                        category=InsightCategory.OPPORTUNITY,
                        impact_score=8.0,
                        urgency_score=6.0,
                        confidence=0.9,
                        source="revenue_analysis",
                        metric_name="monthly_revenue_growth",
                        current_value=growth_rate,
                        target_value=20.0,
                        trend="improving",
                        recommended_action="Scale capacity or increase pricing",
                        actions=[
                            InsightAction(
                                type=ActionType.OPTIMIZE_SCHEDULE,
                                label="Optimize Schedule",
                                description="Increase capacity during peak times",
                                endpoint="/schedule/optimize",
                                icon="calendar"
                            )
                        ],
                        tags=["growth", "opportunity"]
                    ))
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating revenue insights: {e}")
            return []
    
    def _get_retention_insights(self, user_id: int) -> List[ConsolidatedInsight]:
        """Generate client retention insights"""
        try:
            insights = []
            
            # Get at-risk clients (haven't booked in 30+ days)
            cutoff_date = datetime.now() - timedelta(days=30)
            
            at_risk_clients = self.db.query(Client).filter(
                Client.user_id == user_id,
                Client.last_appointment_date < cutoff_date,
                Client.last_appointment_date.isnot(None)
            ).limit(10).all()
            
            if len(at_risk_clients) > 5:  # High churn risk
                insights.append(ConsolidatedInsight(
                    id=f"retention_risk_{user_id}",
                    title="High Client Churn Risk",
                    description=f"{len(at_risk_clients)} clients haven't booked in 30+ days",
                    priority=InsightPriority.HIGH,
                    category=InsightCategory.RETENTION,
                    impact_score=8.5,
                    urgency_score=7.0,
                    confidence=0.9,
                    source="retention_analysis",
                    metric_name="at_risk_clients",
                    current_value=len(at_risk_clients),
                    target_value=3.0,
                    trend="increasing",
                    recommended_action="Reach out to at-risk clients",
                    actions=[
                        InsightAction(
                            type=ActionType.CONTACT_CLIENT,
                            label="Contact At-Risk Clients",
                            description="Send personalized re-engagement messages",
                            endpoint="/clients/at-risk",
                            icon="user-group",
                            params={"client_ids": [c.id for c in at_risk_clients[:5]]}
                        )
                    ],
                    related_clients=[c.id for c in at_risk_clients],
                    tags=["churn_risk", "retention"]
                ))
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating retention insights: {e}")
            return []
    
    def _get_efficiency_insights(self, user_id: int) -> List[ConsolidatedInsight]:
        """Generate operational efficiency insights"""
        try:
            insights = []
            
            # Calculate no-show rate
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            total_appointments = self.db.query(func.count(Appointment.id)).filter(
                Appointment.user_id == user_id,
                Appointment.appointment_time >= start_date,
                Appointment.appointment_time <= end_date
            ).scalar() or 0
            
            no_shows = self.db.query(func.count(Appointment.id)).filter(
                Appointment.user_id == user_id,
                Appointment.status == 'no_show',
                Appointment.appointment_time >= start_date,
                Appointment.appointment_time <= end_date
            ).scalar() or 0
            
            if total_appointments > 0:
                no_show_rate = (no_shows / total_appointments) * 100
                
                if no_show_rate > 15:  # High no-show rate
                    insights.append(ConsolidatedInsight(
                        id=f"efficiency_noshow_{user_id}",
                        title="High No-Show Rate",
                        description=f"No-show rate is {no_show_rate:.1f}% - implement prevention strategies",
                        priority=InsightPriority.HIGH,
                        category=InsightCategory.EFFICIENCY,
                        impact_score=7.5,
                        urgency_score=6.0,
                        confidence=0.9,
                        source="efficiency_analysis",
                        metric_name="no_show_rate",
                        current_value=no_show_rate,
                        target_value=5.0,
                        trend="stable",
                        recommended_action="Implement confirmation reminders",
                        actions=[
                            InsightAction(
                                type=ActionType.IMPLEMENT_STRATEGY,
                                label="Setup Reminders",
                                description="Configure automatic appointment reminders",
                                endpoint="/settings/notifications",
                                icon="bell"
                            )
                        ],
                        tags=["no_show", "efficiency"]
                    ))
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating efficiency insights: {e}")
            return []
    
    def _get_predictive_insights(self, user_id: int) -> List[ConsolidatedInsight]:
        """Convert predictive insights to consolidated insights"""
        try:
            predictive_insights = self.intelligent_analytics.generate_predictive_insights(user_id)
            insights = []
            
            for p_insight in predictive_insights:
                # Map categories
                category_mapping = {
                    'revenue': InsightCategory.REVENUE,
                    'client': InsightCategory.RETENTION,
                    'capacity': InsightCategory.EFFICIENCY,
                    'seasonal': InsightCategory.OPPORTUNITY
                }
                
                insights.append(ConsolidatedInsight(
                    id=f"predictive_{p_insight.category}_{user_id}_{int(datetime.now().timestamp())}",
                    title=p_insight.title,
                    description=p_insight.description,
                    priority=self._map_impact_to_priority(p_insight.impact_score),
                    category=category_mapping.get(p_insight.category, InsightCategory.OPPORTUNITY),
                    impact_score=p_insight.impact_score,
                    urgency_score=5.0,  # Predictive insights are typically medium urgency
                    confidence=p_insight.confidence,
                    source="predictive_analytics",
                    metric_name=p_insight.category,
                    trend="predicted",
                    recommended_action=p_insight.recommended_actions[0] if p_insight.recommended_actions else None,
                    actions=self._convert_prediction_actions(p_insight.recommended_actions),
                    time_horizon=p_insight.time_horizon,
                    tags=[p_insight.category, "prediction"]
                ))
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating predictive insights: {e}")
            return []
    
    async def _get_health_summary(self, user_id: int) -> Dict[str, Any]:
        """Generate business health summary"""
        try:
            health_score = self.intelligent_analytics.calculate_business_health_score(user_id)
            
            return {
                "overall_score": health_score.overall_score,
                "level": health_score.level.value,
                "components": health_score.components,
                "trends": health_score.trends,
                "risk_factors": health_score.risk_factors[:3],
                "opportunities": health_score.opportunities[:3],
                "status": "healthy" if health_score.level in [HealthScoreLevel.GOOD, HealthScoreLevel.EXCELLENT] else "needs_attention"
            }
            
        except Exception as e:
            logger.error(f"Error generating health summary: {e}")
            return {"status": "error", "message": "Unable to calculate health score"}
    
    def _generate_quick_actions(self, top_insights: List[ConsolidatedInsight]) -> List[InsightAction]:
        """Generate quick actions from top insights"""
        quick_actions = []
        
        # Extract unique actions from top insights
        seen_actions = set()
        
        for insight in top_insights:
            for action in insight.actions:
                action_key = f"{action.type.value}_{action.endpoint}"
                if action_key not in seen_actions:
                    quick_actions.append(action)
                    seen_actions.add(action_key)
                    
                    if len(quick_actions) >= 6:  # Limit to 6 quick actions
                        break
            
            if len(quick_actions) >= 6:
                break
        
        return quick_actions
    
    # Helper methods
    def _map_component_to_category(self, component: str) -> InsightCategory:
        """Map health component to insight category"""
        mapping = {
            'revenue_performance': InsightCategory.REVENUE,
            'client_retention': InsightCategory.RETENTION,
            'booking_efficiency': InsightCategory.EFFICIENCY,
            'service_quality': InsightCategory.QUALITY,
            'growth_momentum': InsightCategory.GROWTH,
            'operational_efficiency': InsightCategory.EFFICIENCY
        }
        return mapping.get(component, InsightCategory.EFFICIENCY)
    
    def _get_component_actions(self, component: str) -> List[InsightAction]:
        """Get appropriate actions for health component"""
        action_mapping = {
            'revenue_performance': [
                InsightAction(
                    type=ActionType.ADJUST_PRICING,
                    label="Review Pricing",
                    description="Optimize service pricing strategy",
                    endpoint="/settings/pricing",
                    icon="currency-dollar"
                )
            ],
            'client_retention': [
                InsightAction(
                    type=ActionType.CONTACT_CLIENT,
                    label="Contact Clients",
                    description="Reach out to inactive clients",
                    endpoint="/clients/inactive",
                    icon="user-group"
                )
            ],
            'booking_efficiency': [
                InsightAction(
                    type=ActionType.OPTIMIZE_SCHEDULE,
                    label="Optimize Schedule",
                    description="Improve booking efficiency",
                    endpoint="/schedule/optimize",
                    icon="calendar"
                )
            ]
        }
        return action_mapping.get(component, [])
    
    def _calculate_alert_impact(self, alert: SmartAlert) -> float:
        """Calculate impact score for alert"""
        priority_scores = {
            AlertPriority.CRITICAL: 9.5,
            AlertPriority.HIGH: 8.0,
            AlertPriority.MEDIUM: 6.0,
            AlertPriority.LOW: 4.0
        }
        return priority_scores.get(alert.priority, 5.0)
    
    def _calculate_alert_urgency(self, alert: SmartAlert) -> float:
        """Calculate urgency score for alert"""
        # Base urgency on priority and expiration
        base_urgency = self._calculate_alert_impact(alert)
        
        if alert.expires_at:
            time_until_expiry = (alert.expires_at - datetime.now()).total_seconds()
            if time_until_expiry < 86400:  # Less than 24 hours
                base_urgency += 1.0
        
        return min(base_urgency, 10.0)
    
    def _convert_alert_actions(self, suggested_actions: List[str]) -> List[InsightAction]:
        """Convert alert suggested actions to insight actions"""
        actions = []
        
        for action_text in suggested_actions[:3]:  # Limit to 3 actions
            # Map common action patterns to structured actions
            if "pricing" in action_text.lower():
                actions.append(InsightAction(
                    type=ActionType.ADJUST_PRICING,
                    label="Review Pricing",
                    description=action_text,
                    endpoint="/settings/pricing",
                    icon="currency-dollar"
                ))
            elif "client" in action_text.lower() or "retention" in action_text.lower():
                actions.append(InsightAction(
                    type=ActionType.CONTACT_CLIENT,
                    label="Contact Clients",
                    description=action_text,
                    endpoint="/clients",
                    icon="user-group"
                ))
            elif "analytics" in action_text.lower() or "review" in action_text.lower():
                actions.append(InsightAction(
                    type=ActionType.VIEW_ANALYTICS,
                    label="View Analytics",
                    description=action_text,
                    endpoint="/analytics",
                    icon="chart-bar"
                ))
            else:
                actions.append(InsightAction(
                    type=ActionType.IMPLEMENT_STRATEGY,
                    label="Take Action",
                    description=action_text,
                    icon="cog"
                ))
        
        return actions
    
    def _convert_prediction_actions(self, recommended_actions: List[str]) -> List[InsightAction]:
        """Convert prediction recommended actions to insight actions"""
        return self._convert_alert_actions(recommended_actions)  # Same logic for now
    
    def _map_impact_to_priority(self, impact_score: float) -> InsightPriority:
        """Map impact score to insight priority"""
        if impact_score >= 8.5:
            return InsightPriority.CRITICAL
        elif impact_score >= 7.0:
            return InsightPriority.HIGH
        elif impact_score >= 5.0:
            return InsightPriority.MEDIUM
        else:
            return InsightPriority.LOW