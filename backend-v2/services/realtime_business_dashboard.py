"""
Real-Time Business Health Dashboard Service for BookedBarber V2

This service provides real-time monitoring, KPI tracking, and live business intelligence
insights for the Six Figure Barber methodology. It aggregates data from all business
intelligence services to provide a comprehensive, real-time view of business performance.

Key Features:
- Real-time KPI monitoring and alerting
- Live performance dashboards with sub-second updates
- Integrated business intelligence insights
- Six Figure Barber methodology compliance tracking
- Predictive alerts and trend monitoring
- Performance benchmarking and goal tracking
- Interactive data visualization support

Real-Time Capabilities:
- Live revenue tracking and projections
- Client activity monitoring
- Service performance metrics
- Capacity utilization monitoring
- Alert system with priority-based notifications
- Automated report generation
"""

import asyncio
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, AsyncGenerator
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, text
import logging
from dataclasses import dataclass, asdict
from enum import Enum
import redis
import websockets

from models import User, Appointment, Payment, Client, Service
from services.analytics_service import AnalyticsService
from services.ml_client_lifetime_value_service import MLClientLifetimeValueService, ClientSegment
from services.revenue_optimization_engine import RevenueOptimizationEngine
from services.six_figure_methodology_tracker import SixFigureMethodologyTracker
from services.intelligent_analytics_service import IntelligentAnalyticsService
from utils.cache_decorators import cache_result

logger = logging.getLogger(__name__)

class DashboardUpdateType(Enum):
    KPI_UPDATE = "kpi_update"
    ALERT_TRIGGERED = "alert_triggered"
    GOAL_PROGRESS = "goal_progress"
    CLIENT_ACTIVITY = "client_activity"
    REVENUE_UPDATE = "revenue_update"
    COMPLIANCE_UPDATE = "compliance_update"

class AlertSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    SUCCESS = "success"

class KPIStatus(Enum):
    ON_TARGET = "on_target"
    ABOVE_TARGET = "above_target"
    BELOW_TARGET = "below_target"
    CRITICAL = "critical"

@dataclass
class RealTimeKPI:
    name: str
    current_value: float
    target_value: float
    unit: str
    status: KPIStatus
    trend: str  # up, down, stable
    change_percentage: float
    last_updated: datetime
    six_figure_relevance: float
    alert_threshold: float

@dataclass
class LiveAlert:
    id: str
    title: str
    message: str
    severity: AlertSeverity
    category: str
    metric_name: str
    current_value: float
    threshold_value: float
    suggested_actions: List[str]
    created_at: datetime
    expires_at: datetime
    acknowledged: bool

@dataclass
class DashboardUpdate:
    update_type: DashboardUpdateType
    timestamp: datetime
    user_id: int
    data: Dict[str, Any]
    priority: int

@dataclass
class LiveDashboardData:
    kpis: List[RealTimeKPI]
    alerts: List[LiveAlert]
    six_figure_progress: Dict[str, Any]
    revenue_pulse: Dict[str, Any]
    client_activity: Dict[str, Any]
    methodology_compliance: Dict[str, Any]
    optimization_opportunities: List[Dict[str, Any]]
    last_updated: datetime

@dataclass
class DashboardConfiguration:
    user_id: int
    refresh_interval: int  # seconds
    kpi_thresholds: Dict[str, float]
    alert_preferences: Dict[str, Any]
    display_preferences: Dict[str, Any]
    six_figure_target: float

class RealTimeBusinessDashboard:
    """Real-time business health dashboard with live KPI monitoring"""
    
    def __init__(self, db: Session, redis_client: Optional[redis.Redis] = None):
        self.db = db
        self.redis_client = redis_client or redis.Redis(host='localhost', port=6379, db=0)
        
        # Initialize services
        self.analytics_service = AnalyticsService(db)
        self.ltv_service = MLClientLifetimeValueService(db)
        self.optimization_engine = RevenueOptimizationEngine(db)
        self.methodology_tracker = SixFigureMethodologyTracker(db)
        self.intelligent_service = IntelligentAnalyticsService(db)
        
        # Dashboard state
        self.active_connections: Dict[int, List] = {}  # user_id -> websocket connections
        self.dashboard_configs: Dict[int, DashboardConfiguration] = {}
        
        # KPI definitions
        self.core_kpis = self._define_core_kpis()
    
    def _define_core_kpis(self) -> Dict[str, Dict[str, Any]]:
        """Define core KPIs for Six Figure Barber methodology"""
        return {
            'monthly_revenue': {
                'name': 'Monthly Revenue',
                'unit': '$',
                'target_base': 8333,  # $100k annual / 12 months
                'alert_threshold': 0.8,  # Alert if below 80% of target
                'six_figure_relevance': 1.0
            },
            'average_service_price': {
                'name': 'Average Service Price',
                'unit': '$',
                'target_base': 100,  # Six Figure standard
                'alert_threshold': 0.8,
                'six_figure_relevance': 0.9
            },
            'client_retention_rate': {
                'name': 'Client Retention Rate',
                'unit': '%',
                'target_base': 85,
                'alert_threshold': 0.75,
                'six_figure_relevance': 0.8
            },
            'utilization_rate': {
                'name': 'Time Utilization',
                'unit': '%',
                'target_base': 75,
                'alert_threshold': 0.6,
                'six_figure_relevance': 0.7
            },
            'client_satisfaction': {
                'name': 'Client Satisfaction',
                'unit': '/5',
                'target_base': 4.5,
                'alert_threshold': 0.8,
                'six_figure_relevance': 0.8
            },
            'premium_client_percentage': {
                'name': 'Premium Client %',
                'unit': '%',
                'target_base': 30,
                'alert_threshold': 0.6,
                'six_figure_relevance': 0.9
            },
            'methodology_compliance': {
                'name': 'Six Figure Compliance',
                'unit': '%',
                'target_base': 85,
                'alert_threshold': 0.7,
                'six_figure_relevance': 1.0
            }
        }
    
    async def start_real_time_monitoring(self, user_id: int, config: DashboardConfiguration):
        """Start real-time monitoring for a user"""
        try:
            self.dashboard_configs[user_id] = config
            
            # Start monitoring loop
            monitoring_task = asyncio.create_task(
                self._monitoring_loop(user_id)
            )
            
            logger.info(f"Started real-time monitoring for user {user_id}")
            return monitoring_task
            
        except Exception as e:
            logger.error(f"Error starting monitoring for user {user_id}: {str(e)}")
            raise
    
    async def _monitoring_loop(self, user_id: int):
        """Main monitoring loop for real-time updates"""
        try:
            config = self.dashboard_configs.get(user_id)
            if not config:
                return
            
            while True:
                # Generate live dashboard data
                dashboard_data = await self._generate_live_dashboard_data(user_id, config)
                
                # Check for alerts
                new_alerts = await self._check_for_alerts(user_id, dashboard_data)
                
                # Update dashboard state
                await self._update_dashboard_state(user_id, dashboard_data, new_alerts)
                
                # Broadcast updates to connected clients
                await self._broadcast_updates(user_id, dashboard_data, new_alerts)
                
                # Wait for next update interval
                await asyncio.sleep(config.refresh_interval)
                
        except Exception as e:
            logger.error(f"Error in monitoring loop for user {user_id}: {str(e)}")
    
    async def _generate_live_dashboard_data(
        self, 
        user_id: int, 
        config: DashboardConfiguration
    ) -> LiveDashboardData:
        """Generate comprehensive live dashboard data"""
        try:
            # Calculate real-time KPIs
            kpis = await self._calculate_real_time_kpis(user_id, config)
            
            # Get current alerts
            alerts = await self._get_current_alerts(user_id)
            
            # Calculate Six Figure progress
            six_figure_progress = await self._calculate_six_figure_progress(user_id, config)
            
            # Get revenue pulse
            revenue_pulse = await self._get_revenue_pulse(user_id)
            
            # Get client activity
            client_activity = await self._get_client_activity(user_id)
            
            # Get methodology compliance
            methodology_compliance = await self._get_methodology_compliance(user_id)
            
            # Get optimization opportunities
            optimization_opportunities = await self._get_optimization_opportunities(user_id)
            
            return LiveDashboardData(
                kpis=kpis,
                alerts=alerts,
                six_figure_progress=six_figure_progress,
                revenue_pulse=revenue_pulse,
                client_activity=client_activity,
                methodology_compliance=methodology_compliance,
                optimization_opportunities=optimization_opportunities,
                last_updated=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error generating live dashboard data for user {user_id}: {str(e)}")
            return self._default_dashboard_data()
    
    async def _calculate_real_time_kpis(
        self, 
        user_id: int, 
        config: DashboardConfiguration
    ) -> List[RealTimeKPI]:
        """Calculate real-time KPIs"""
        try:
            kpis = []
            
            # Get current analytics data
            revenue_data = self.analytics_service.get_revenue_analytics(user_ids=[user_id])
            appointment_data = self.analytics_service.get_appointment_analytics(user_ids=[user_id])
            client_data = self.analytics_service.get_client_retention_metrics(user_id=user_id)
            
            # Get previous period data for trend calculation
            previous_revenue = await self._get_previous_period_revenue(user_id)
            
            for kpi_key, kpi_def in self.core_kpis.items():
                current_value = await self._get_kpi_current_value(
                    kpi_key, revenue_data, appointment_data, client_data, user_id
                )
                
                # Calculate target value (can be customized per user)
                target_value = config.kpi_thresholds.get(
                    kpi_key, 
                    kpi_def['target_base']
                )
                
                # Determine status
                status = self._determine_kpi_status(current_value, target_value, kpi_def)
                
                # Calculate trend
                trend = await self._calculate_kpi_trend(kpi_key, current_value, user_id)
                
                # Calculate change percentage
                change_percentage = await self._calculate_kpi_change(kpi_key, current_value, user_id)
                
                kpi = RealTimeKPI(
                    name=kpi_def['name'],
                    current_value=current_value,
                    target_value=target_value,
                    unit=kpi_def['unit'],
                    status=status,
                    trend=trend,
                    change_percentage=change_percentage,
                    last_updated=datetime.now(),
                    six_figure_relevance=kpi_def['six_figure_relevance'],
                    alert_threshold=kpi_def['alert_threshold']
                )
                
                kpis.append(kpi)
            
            return kpis
            
        except Exception as e:
            logger.error(f"Error calculating real-time KPIs for user {user_id}: {str(e)}")
            return []
    
    async def _get_kpi_current_value(
        self, 
        kpi_key: str, 
        revenue_data: Dict, 
        appointment_data: Dict, 
        client_data: Dict, 
        user_id: int
    ) -> float:
        """Get current value for a specific KPI"""
        try:
            if kpi_key == 'monthly_revenue':
                return revenue_data.get('total_revenue', 0)
            
            elif kpi_key == 'average_service_price':
                return revenue_data.get('average_transaction_amount', 0)
            
            elif kpi_key == 'client_retention_rate':
                return client_data.get('retention_rate', 0) * 100
            
            elif kpi_key == 'utilization_rate':
                total_appointments = appointment_data.get('total_appointments', 0)
                # Assume 8 hours/day, 30 days/month capacity
                capacity = 8 * 30
                return min(100, (total_appointments / capacity) * 100)
            
            elif kpi_key == 'client_satisfaction':
                # This would come from review/feedback data
                return 4.2  # Placeholder
            
            elif kpi_key == 'premium_client_percentage':
                client_segments = self.ltv_service.analyze_client_segments(user_id)
                total_clients = sum(seg.client_count for seg in client_segments)
                if total_clients == 0:
                    return 0
                
                premium_clients = sum(
                    seg.client_count for seg in client_segments 
                    if seg.segment.value in ['premium_vip', 'high_value']
                )
                return (premium_clients / total_clients) * 100
            
            elif kpi_key == 'methodology_compliance':
                # This would come from methodology tracker
                return 75.0  # Placeholder
            
            else:
                return 0.0
                
        except Exception as e:
            logger.error(f"Error getting KPI value for {kpi_key}: {str(e)}")
            return 0.0
    
    def _determine_kpi_status(
        self, 
        current_value: float, 
        target_value: float, 
        kpi_def: Dict[str, Any]
    ) -> KPIStatus:
        """Determine KPI status based on current vs target value"""
        try:
            if current_value >= target_value:
                if current_value >= target_value * 1.1:  # 10% above target
                    return KPIStatus.ABOVE_TARGET
                else:
                    return KPIStatus.ON_TARGET
            elif current_value >= target_value * kpi_def['alert_threshold']:
                return KPIStatus.BELOW_TARGET
            else:
                return KPIStatus.CRITICAL
                
        except Exception as e:
            logger.error(f"Error determining KPI status: {str(e)}")
            return KPIStatus.BELOW_TARGET
    
    async def _calculate_kpi_trend(self, kpi_key: str, current_value: float, user_id: int) -> str:
        """Calculate KPI trend direction"""
        try:
            # Get historical value from cache/database
            cache_key = f"kpi_history:{user_id}:{kpi_key}"
            historical_value = self.redis_client.get(cache_key)
            
            if historical_value:
                historical_value = float(historical_value)
                
                if current_value > historical_value * 1.05:  # 5% increase
                    trend = "up"
                elif current_value < historical_value * 0.95:  # 5% decrease
                    trend = "down"
                else:
                    trend = "stable"
            else:
                trend = "stable"
            
            # Store current value for next comparison
            self.redis_client.setex(cache_key, 3600, current_value)  # 1 hour TTL
            
            return trend
            
        except Exception as e:
            logger.error(f"Error calculating KPI trend for {kpi_key}: {str(e)}")
            return "stable"
    
    async def _calculate_kpi_change(self, kpi_key: str, current_value: float, user_id: int) -> float:
        """Calculate KPI percentage change"""
        try:
            cache_key = f"kpi_previous:{user_id}:{kpi_key}"
            previous_value = self.redis_client.get(cache_key)
            
            if previous_value and float(previous_value) > 0:
                previous_value = float(previous_value)
                change_percentage = ((current_value - previous_value) / previous_value) * 100
                return round(change_percentage, 2)
            
            return 0.0
            
        except Exception as e:
            logger.error(f"Error calculating KPI change for {kpi_key}: {str(e)}")
            return 0.0
    
    async def _calculate_six_figure_progress(
        self, 
        user_id: int, 
        config: DashboardConfiguration
    ) -> Dict[str, Any]:
        """Calculate Six Figure progress metrics"""
        try:
            # Get comprehensive methodology report
            report = self.methodology_tracker.generate_comprehensive_report(
                user_id, config.six_figure_target
            )
            
            return {
                'overall_compliance': report.overall_compliance_score,
                'annual_progress': report.pathway_analysis.progress_percentage,
                'monthly_target': report.pathway_analysis.monthly_target,
                'daily_target': report.pathway_analysis.daily_target,
                'gap_analysis': report.pathway_analysis.gap_analysis,
                'success_probability': report.success_probability,
                'next_milestones': report.implementation_priorities[:3],
                'methodology_scores': [
                    {
                        'principle': score.principle.value,
                        'score': score.current_score,
                        'status': score.compliance_level.value
                    }
                    for score in report.methodology_scores
                ]
            }
            
        except Exception as e:
            logger.error(f"Error calculating Six Figure progress for user {user_id}: {str(e)}")
            return {}
    
    async def _get_revenue_pulse(self, user_id: int) -> Dict[str, Any]:
        """Get real-time revenue pulse data"""
        try:
            # Get today's revenue
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_revenue = self._get_revenue_for_period(user_id, today_start, datetime.now())
            
            # Get this week's revenue
            week_start = today_start - timedelta(days=today_start.weekday())
            week_revenue = self._get_revenue_for_period(user_id, week_start, datetime.now())
            
            # Get this month's revenue
            month_start = today_start.replace(day=1)
            month_revenue = self._get_revenue_for_period(user_id, month_start, datetime.now())
            
            # Calculate projections
            days_in_month = (today_start.replace(month=today_start.month + 1) - month_start).days
            current_day = today_start.day
            monthly_projection = (month_revenue / current_day) * days_in_month if current_day > 0 else 0
            
            return {
                'today_revenue': today_revenue,
                'week_revenue': week_revenue,
                'month_revenue': month_revenue,
                'monthly_projection': monthly_projection,
                'daily_average': month_revenue / current_day if current_day > 0 else 0,
                'pulse_status': 'strong' if today_revenue > (month_revenue / current_day) else 'moderate'
            }
            
        except Exception as e:
            logger.error(f"Error getting revenue pulse for user {user_id}: {str(e)}")
            return {}
    
    def _get_revenue_for_period(self, user_id: int, start_date: datetime, end_date: datetime) -> float:
        """Get revenue for a specific period"""
        try:
            total = self.db.query(func.sum(Payment.amount)).join(Appointment).filter(
                Appointment.barber_id == user_id,
                Payment.status == 'completed',
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date <= end_date
            ).scalar()
            
            return float(total or 0)
            
        except Exception as e:
            logger.error(f"Error getting revenue for period: {str(e)}")
            return 0.0
    
    async def _get_client_activity(self, user_id: int) -> Dict[str, Any]:
        """Get real-time client activity data"""
        try:
            # Get today's appointments
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)
            
            today_appointments = self.db.query(Appointment).filter(
                Appointment.barber_id == user_id,
                Appointment.appointment_date >= today_start,
                Appointment.appointment_date < today_end
            ).count()
            
            # Get recent new clients (last 7 days)
            week_ago = datetime.now() - timedelta(days=7)
            new_clients = self.db.query(Client).filter(
                Client.barber_id == user_id,
                Client.created_at >= week_ago
            ).count()
            
            # Get client segments
            client_segments = self.ltv_service.analyze_client_segments(user_id)
            
            return {
                'today_appointments': today_appointments,
                'new_clients_week': new_clients,
                'total_active_clients': sum(seg.client_count for seg in client_segments),
                'client_segments': [
                    {
                        'segment': seg.segment.value,
                        'count': seg.client_count,
                        'revenue_contribution': seg.revenue_contribution_percentage
                    }
                    for seg in client_segments
                ],
                'activity_status': 'high' if today_appointments >= 8 else 'moderate'
            }
            
        except Exception as e:
            logger.error(f"Error getting client activity for user {user_id}: {str(e)}")
            return {}
    
    async def _get_methodology_compliance(self, user_id: int) -> Dict[str, Any]:
        """Get methodology compliance data"""
        try:
            # This would integrate with the methodology tracker
            # For now, return placeholder data
            return {
                'overall_score': 75.0,
                'principle_scores': {
                    'premium_positioning': 80.0,
                    'value_based_pricing': 70.0,
                    'client_excellence': 85.0,
                    'brand_building': 65.0,
                    'business_efficiency': 75.0,
                    'skill_development': 70.0
                },
                'compliance_level': 'good',
                'improvement_priority': 'brand_building'
            }
            
        except Exception as e:
            logger.error(f"Error getting methodology compliance for user {user_id}: {str(e)}")
            return {}
    
    async def _get_optimization_opportunities(self, user_id: int) -> List[Dict[str, Any]]:
        """Get current optimization opportunities"""
        try:
            # Get optimization plan
            optimization_plan = self.optimization_engine.generate_optimization_plan(user_id)
            
            opportunities = []
            
            # Add top pricing recommendations
            for rec in optimization_plan.pricing_recommendations[:3]:
                opportunities.append({
                    'type': 'pricing',
                    'title': f"Optimize {rec.service_name} pricing",
                    'impact': rec.expected_revenue_impact,
                    'effort': 'low' if rec.risk_level == 'low' else 'medium',
                    'timeline': rec.implementation_timeline,
                    'description': f"Increase price by {rec.price_change_percentage:.1f}%"
                })
            
            # Add top upselling opportunities
            for upsell in optimization_plan.upsell_opportunities[:2]:
                opportunities.append({
                    'type': 'upselling',
                    'title': f"Upsell client {upsell.client_id}",
                    'impact': upsell.expected_revenue_lift,
                    'effort': 'low',
                    'timeline': upsell.optimal_timing,
                    'description': f"{upsell.success_probability:.0%} success probability"
                })
            
            # Sort by impact
            opportunities.sort(key=lambda x: x['impact'], reverse=True)
            
            return opportunities[:5]  # Return top 5 opportunities
            
        except Exception as e:
            logger.error(f"Error getting optimization opportunities for user {user_id}: {str(e)}")
            return []
    
    async def _check_for_alerts(self, user_id: int, dashboard_data: LiveDashboardData) -> List[LiveAlert]:
        """Check for new alerts based on current data"""
        try:
            new_alerts = []
            
            # Check KPI alerts
            for kpi in dashboard_data.kpis:
                if kpi.status == KPIStatus.CRITICAL:
                    alert = LiveAlert(
                        id=f"kpi_critical_{kpi.name}_{int(datetime.now().timestamp())}",
                        title=f"Critical: {kpi.name} Below Threshold",
                        message=f"{kpi.name} is at {kpi.current_value:.1f}{kpi.unit}, which is {kpi.change_percentage:.1f}% below target",
                        severity=AlertSeverity.CRITICAL,
                        category="performance",
                        metric_name=kpi.name,
                        current_value=kpi.current_value,
                        threshold_value=kpi.target_value * kpi.alert_threshold,
                        suggested_actions=[
                            f"Review {kpi.name.lower()} strategy",
                            "Implement immediate corrective actions",
                            "Monitor progress closely"
                        ],
                        created_at=datetime.now(),
                        expires_at=datetime.now() + timedelta(hours=4),
                        acknowledged=False
                    )
                    new_alerts.append(alert)
            
            # Check revenue alerts
            revenue_pulse = dashboard_data.revenue_pulse
            if revenue_pulse.get('today_revenue', 0) < revenue_pulse.get('daily_average', 0) * 0.5:
                alert = LiveAlert(
                    id=f"revenue_low_{int(datetime.now().timestamp())}",
                    title="Low Daily Revenue Alert",
                    message="Today's revenue is significantly below daily average",
                    severity=AlertSeverity.WARNING,
                    category="revenue",
                    metric_name="daily_revenue",
                    current_value=revenue_pulse.get('today_revenue', 0),
                    threshold_value=revenue_pulse.get('daily_average', 0) * 0.8,
                    suggested_actions=[
                        "Review today's schedule",
                        "Reach out to potential clients",
                        "Consider promotional offers"
                    ],
                    created_at=datetime.now(),
                    expires_at=datetime.now() + timedelta(hours=2),
                    acknowledged=False
                )
                new_alerts.append(alert)
            
            # Check Six Figure compliance alerts
            six_figure_data = dashboard_data.six_figure_progress
            if six_figure_data.get('overall_compliance', 0) < 60:
                alert = LiveAlert(
                    id=f"compliance_low_{int(datetime.now().timestamp())}",
                    title="Six Figure Methodology Compliance Low",
                    message="Overall methodology compliance below 60%",
                    severity=AlertSeverity.WARNING,
                    category="methodology",
                    metric_name="methodology_compliance",
                    current_value=six_figure_data.get('overall_compliance', 0),
                    threshold_value=60,
                    suggested_actions=[
                        "Review methodology principles",
                        "Focus on premium positioning",
                        "Enhance client relationships"
                    ],
                    created_at=datetime.now(),
                    expires_at=datetime.now() + timedelta(hours=24),
                    acknowledged=False
                )
                new_alerts.append(alert)
            
            return new_alerts
            
        except Exception as e:
            logger.error(f"Error checking for alerts for user {user_id}: {str(e)}")
            return []
    
    async def _get_current_alerts(self, user_id: int) -> List[LiveAlert]:
        """Get current active alerts"""
        try:
            # Get alerts from cache/database
            cache_key = f"alerts:{user_id}"
            cached_alerts = self.redis_client.get(cache_key)
            
            if cached_alerts:
                alerts_data = json.loads(cached_alerts)
                alerts = []
                
                for alert_data in alerts_data:
                    # Filter out expired alerts
                    expires_at = datetime.fromisoformat(alert_data['expires_at'])
                    if expires_at > datetime.now():
                        alert = LiveAlert(**alert_data)
                        alerts.append(alert)
                
                return alerts
            
            return []
            
        except Exception as e:
            logger.error(f"Error getting current alerts for user {user_id}: {str(e)}")
            return []
    
    async def _update_dashboard_state(
        self, 
        user_id: int, 
        dashboard_data: LiveDashboardData, 
        new_alerts: List[LiveAlert]
    ):
        """Update dashboard state in cache"""
        try:
            # Store dashboard data
            dashboard_cache_key = f"dashboard:{user_id}"
            dashboard_json = json.dumps(asdict(dashboard_data), default=str)
            self.redis_client.setex(dashboard_cache_key, 300, dashboard_json)  # 5 minutes TTL
            
            # Update alerts
            if new_alerts:
                alerts_cache_key = f"alerts:{user_id}"
                existing_alerts = await self._get_current_alerts(user_id)
                all_alerts = existing_alerts + new_alerts
                
                # Convert to dict for JSON serialization
                alerts_data = [asdict(alert) for alert in all_alerts]
                alerts_json = json.dumps(alerts_data, default=str)
                self.redis_client.setex(alerts_cache_key, 3600, alerts_json)  # 1 hour TTL
            
        except Exception as e:
            logger.error(f"Error updating dashboard state for user {user_id}: {str(e)}")
    
    async def _broadcast_updates(
        self, 
        user_id: int, 
        dashboard_data: LiveDashboardData, 
        new_alerts: List[LiveAlert]
    ):
        """Broadcast updates to connected websocket clients"""
        try:
            if user_id not in self.active_connections:
                return
            
            # Prepare update data
            update_data = {
                'type': 'dashboard_update',
                'timestamp': datetime.now().isoformat(),
                'data': asdict(dashboard_data),
                'new_alerts': [asdict(alert) for alert in new_alerts]
            }
            
            # Broadcast to all active connections for this user
            disconnected_connections = []
            
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send(json.dumps(update_data, default=str))
                except websockets.exceptions.ConnectionClosed:
                    disconnected_connections.append(connection)
                except Exception as e:
                    logger.error(f"Error broadcasting to connection: {str(e)}")
                    disconnected_connections.append(connection)
            
            # Remove disconnected connections
            for connection in disconnected_connections:
                self.active_connections[user_id].remove(connection)
            
            # Remove user entry if no active connections
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
            
        except Exception as e:
            logger.error(f"Error broadcasting updates for user {user_id}: {str(e)}")
    
    async def add_websocket_connection(self, user_id: int, websocket):
        """Add a websocket connection for real-time updates"""
        try:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            
            self.active_connections[user_id].append(websocket)
            
            # Send current dashboard state
            dashboard_data = await self._get_cached_dashboard_data(user_id)
            if dashboard_data:
                initial_data = {
                    'type': 'initial_data',
                    'timestamp': datetime.now().isoformat(),
                    'data': dashboard_data
                }
                await websocket.send(json.dumps(initial_data, default=str))
            
            logger.info(f"Added websocket connection for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error adding websocket connection for user {user_id}: {str(e)}")
    
    async def _get_cached_dashboard_data(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get cached dashboard data"""
        try:
            cache_key = f"dashboard:{user_id}"
            cached_data = self.redis_client.get(cache_key)
            
            if cached_data:
                return json.loads(cached_data)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting cached dashboard data for user {user_id}: {str(e)}")
            return None
    
    async def acknowledge_alert(self, user_id: int, alert_id: str) -> bool:
        """Acknowledge an alert"""
        try:
            alerts = await self._get_current_alerts(user_id)
            
            for alert in alerts:
                if alert.id == alert_id:
                    alert.acknowledged = True
                    
                    # Update cache
                    alerts_cache_key = f"alerts:{user_id}"
                    alerts_data = [asdict(alert) for alert in alerts]
                    alerts_json = json.dumps(alerts_data, default=str)
                    self.redis_client.setex(alerts_cache_key, 3600, alerts_json)
                    
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error acknowledging alert {alert_id} for user {user_id}: {str(e)}")
            return False
    
    def _default_dashboard_data(self) -> LiveDashboardData:
        """Return default dashboard data"""
        return LiveDashboardData(
            kpis=[],
            alerts=[],
            six_figure_progress={},
            revenue_pulse={},
            client_activity={},
            methodology_compliance={},
            optimization_opportunities=[],
            last_updated=datetime.now()
        )
    
    async def _get_previous_period_revenue(self, user_id: int) -> float:
        """Get previous period revenue for comparison"""
        try:
            # Get revenue from 30 days ago to 60 days ago
            end_date = datetime.now() - timedelta(days=30)
            start_date = end_date - timedelta(days=30)
            
            return self._get_revenue_for_period(user_id, start_date, end_date)
            
        except Exception as e:
            logger.error(f"Error getting previous period revenue for user {user_id}: {str(e)}")
            return 0.0
    
    async def get_dashboard_summary(self, user_id: int) -> Dict[str, Any]:
        """Get dashboard summary for API endpoints"""
        try:
            config = self.dashboard_configs.get(user_id)
            if not config:
                # Create default config
                config = DashboardConfiguration(
                    user_id=user_id,
                    refresh_interval=30,
                    kpi_thresholds={},
                    alert_preferences={},
                    display_preferences={},
                    six_figure_target=100000
                )
            
            dashboard_data = await self._generate_live_dashboard_data(user_id, config)
            
            return {
                'summary': {
                    'total_kpis': len(dashboard_data.kpis),
                    'critical_kpis': len([kpi for kpi in dashboard_data.kpis if kpi.status == KPIStatus.CRITICAL]),
                    'active_alerts': len([alert for alert in dashboard_data.alerts if not alert.acknowledged]),
                    'six_figure_progress': dashboard_data.six_figure_progress.get('annual_progress', 0),
                    'methodology_compliance': dashboard_data.methodology_compliance.get('overall_score', 0)
                },
                'top_kpis': [
                    {
                        'name': kpi.name,
                        'value': kpi.current_value,
                        'unit': kpi.unit,
                        'status': kpi.status.value,
                        'trend': kpi.trend
                    }
                    for kpi in dashboard_data.kpis[:5]
                ],
                'urgent_alerts': [
                    {
                        'title': alert.title,
                        'severity': alert.severity.value,
                        'category': alert.category
                    }
                    for alert in dashboard_data.alerts[:3] if alert.severity in [AlertSeverity.CRITICAL, AlertSeverity.WARNING]
                ],
                'top_opportunities': dashboard_data.optimization_opportunities[:3],
                'last_updated': dashboard_data.last_updated.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting dashboard summary for user {user_id}: {str(e)}")
            return {'summary': {}, 'error': 'Unable to generate dashboard summary'}