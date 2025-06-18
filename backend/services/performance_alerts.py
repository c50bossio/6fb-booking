"""
Performance Alerts System
Monitors 6FB metrics and business KPIs, triggering alerts when thresholds are breached
"""
import asyncio
import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Any, Optional, Callable
from enum import Enum
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from models.appointment import Appointment
from models.client import Client
from models.barber import Barber
from config.database import get_db
from .sixfb_calculator import SixFBCalculator
from .automation_engine import AutomationEngine, TriggerType

logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    """Alert severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlertType(Enum):
    """Types of performance alerts"""
    SIXFB_SCORE_DROP = "sixfb_score_drop"
    REVENUE_DECLINE = "revenue_decline"
    BOOKING_RATE_LOW = "booking_rate_low"
    CLIENT_RETENTION_LOW = "client_retention_low"
    AVERAGE_TICKET_DROP = "average_ticket_drop"
    NO_SHOWS_HIGH = "no_shows_high"
    REVENUE_TARGET_MISSED = "revenue_target_missed"
    APPOINTMENT_VOLUME_LOW = "appointment_volume_low"
    CLIENT_CHURN_HIGH = "client_churn_high"
    PROFIT_MARGIN_LOW = "profit_margin_low"

@dataclass
class AlertThreshold:
    """Alert threshold configuration"""
    id: str
    name: str
    alert_type: AlertType
    metric_path: str  # e.g., "sixfb_score.overall_score"
    operator: str  # "less_than", "greater_than", "equals", "percent_change"
    threshold_value: float
    comparison_period: str  # "daily", "weekly", "monthly"
    severity: AlertSeverity
    is_active: bool = True
    barber_specific: bool = True
    notification_channels: List[str] = None  # ["email", "sms", "slack"]
    cooldown_hours: int = 24  # Minimum time between same alerts

@dataclass
class PerformanceAlert:
    """Performance alert instance"""
    id: str
    threshold_id: str
    barber_id: Optional[int]
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    message: str
    current_value: float
    threshold_value: float
    metric_path: str
    triggered_at: datetime
    is_resolved: bool = False
    resolved_at: Optional[datetime] = None
    context_data: Dict[str, Any] = None

class PerformanceAlertsService:
    """Service for monitoring performance and triggering alerts"""
    
    def __init__(self, db: Session):
        self.db = db
        self.calculator = SixFBCalculator(db)
        self.automation_engine = AutomationEngine(db)
        self.thresholds = self._load_default_thresholds()
        self.alert_history: List[PerformanceAlert] = []
    
    def _load_default_thresholds(self) -> Dict[str, AlertThreshold]:
        """Load default alert thresholds"""
        return {
            "sixfb_score_critical": AlertThreshold(
                id="sixfb_score_critical",
                name="6FB Score Critical Drop",
                alert_type=AlertType.SIXFB_SCORE_DROP,
                metric_path="sixfb_score.overall_score",
                operator="less_than",
                threshold_value=60.0,
                comparison_period="weekly",
                severity=AlertSeverity.CRITICAL,
                notification_channels=["email", "sms"]
            ),
            
            "sixfb_score_warning": AlertThreshold(
                id="sixfb_score_warning",
                name="6FB Score Warning",
                alert_type=AlertType.SIXFB_SCORE_DROP,
                metric_path="sixfb_score.overall_score",
                operator="less_than",
                threshold_value=75.0,
                comparison_period="weekly",
                severity=AlertSeverity.MEDIUM,
                notification_channels=["email"]
            ),
            
            "revenue_decline_high": AlertThreshold(
                id="revenue_decline_high",
                name="Revenue Decline Alert",
                alert_type=AlertType.REVENUE_DECLINE,
                metric_path="revenue.weekly_total",
                operator="percent_change",
                threshold_value=-20.0,  # 20% decline
                comparison_period="weekly",
                severity=AlertSeverity.HIGH,
                notification_channels=["email", "sms"]
            ),
            
            "booking_rate_low": AlertThreshold(
                id="booking_rate_low",
                name="Low Booking Rate",
                alert_type=AlertType.BOOKING_RATE_LOW,
                metric_path="booking_rate.weekly_average",
                operator="less_than",
                threshold_value=70.0,
                comparison_period="weekly",
                severity=AlertSeverity.MEDIUM,
                notification_channels=["email"]
            ),
            
            "client_retention_critical": AlertThreshold(
                id="client_retention_critical",
                name="Client Retention Critical",
                alert_type=AlertType.CLIENT_RETENTION_LOW,
                metric_path="retention.monthly_rate",
                operator="less_than",
                threshold_value=60.0,
                comparison_period="monthly",
                severity=AlertSeverity.HIGH,
                notification_channels=["email", "sms"]
            ),
            
            "no_shows_high": AlertThreshold(
                id="no_shows_high",
                name="High No-Show Rate",
                alert_type=AlertType.NO_SHOWS_HIGH,
                metric_path="no_show_rate.weekly",
                operator="greater_than",
                threshold_value=15.0,
                comparison_period="weekly",
                severity=AlertSeverity.MEDIUM,
                notification_channels=["email"]
            ),
            
            "average_ticket_drop": AlertThreshold(
                id="average_ticket_drop",
                name="Average Ticket Drop",
                alert_type=AlertType.AVERAGE_TICKET_DROP,
                metric_path="average_ticket.weekly",
                operator="percent_change",
                threshold_value=-15.0,
                comparison_period="weekly",
                severity=AlertSeverity.MEDIUM,
                notification_channels=["email"]
            ),
            
            "appointment_volume_critical": AlertThreshold(
                id="appointment_volume_critical",
                name="Critical Appointment Volume Drop",
                alert_type=AlertType.APPOINTMENT_VOLUME_LOW,
                metric_path="appointments.weekly_count",
                operator="percent_change",
                threshold_value=-30.0,
                comparison_period="weekly",
                severity=AlertSeverity.CRITICAL,
                notification_channels=["email", "sms"]
            ),
            
            "revenue_target_missed": AlertThreshold(
                id="revenue_target_missed",
                name="Revenue Target Missed",
                alert_type=AlertType.REVENUE_TARGET_MISSED,
                metric_path="revenue.target_achievement",
                operator="less_than",
                threshold_value=80.0,  # Less than 80% of target
                comparison_period="weekly",
                severity=AlertSeverity.HIGH,
                notification_channels=["email", "sms"],
                cooldown_hours=168  # Weekly alert
            )
        }
    
    async def monitor_performance(self):
        """Main performance monitoring function - run periodically"""
        logger.info("Starting performance monitoring")
        
        try:
            # Get all barbers
            barbers = self.db.query(Barber).all()
            
            for barber in barbers:
                await self._monitor_barber_performance(barber)
            
            # Monitor business-wide metrics
            await self._monitor_business_metrics()
            
            logger.info("Performance monitoring completed")
            
        except Exception as e:
            logger.error(f"Error in performance monitoring: {e}")
    
    async def _monitor_barber_performance(self, barber: Barber):
        """Monitor performance for specific barber"""
        logger.info(f"Monitoring performance for barber {barber.id}")
        
        try:
            # Calculate current metrics
            metrics = await self._calculate_barber_metrics(barber)
            
            # Check each threshold
            for threshold in self.thresholds.values():
                if threshold.is_active and threshold.barber_specific:
                    await self._check_threshold(threshold, metrics, barber.id)
            
        except Exception as e:
            logger.error(f"Error monitoring barber {barber.id}: {e}")
    
    async def _monitor_business_metrics(self):
        """Monitor business-wide metrics"""
        logger.info("Monitoring business-wide metrics")
        
        try:
            # Calculate business metrics
            metrics = await self._calculate_business_metrics()
            
            # Check non-barber-specific thresholds
            for threshold in self.thresholds.values():
                if threshold.is_active and not threshold.barber_specific:
                    await self._check_threshold(threshold, metrics, None)
            
        except Exception as e:
            logger.error(f"Error monitoring business metrics: {e}")
    
    async def _calculate_barber_metrics(self, barber: Barber) -> Dict[str, Any]:
        """Calculate comprehensive metrics for barber"""
        # Get 6FB score
        sixfb_score = self.calculator.calculate_sixfb_score(barber.id, "weekly")
        
        # Get weekly metrics
        weekly_metrics = await self.calculator.get_weekly_metrics(barber.id)
        
        # Get historical data for comparisons
        previous_week_metrics = await self.calculator.get_weekly_metrics(
            barber.id, 
            start_date=date.today() - timedelta(days=14),
            end_date=date.today() - timedelta(days=7)
        )
        
        # Calculate additional metrics
        current_week_revenue = weekly_metrics.get('total_revenue', 0)
        previous_week_revenue = previous_week_metrics.get('total_revenue', 0)
        revenue_change = self._calculate_percent_change(current_week_revenue, previous_week_revenue)
        
        current_week_appointments = weekly_metrics.get('total_appointments', 0)
        previous_week_appointments = previous_week_metrics.get('total_appointments', 0)
        appointment_change = self._calculate_percent_change(current_week_appointments, previous_week_appointments)
        
        # Calculate no-show rate
        no_show_rate = self._calculate_no_show_rate(barber.id)
        
        # Calculate client retention
        retention_rate = self._calculate_retention_rate(barber.id)
        
        return {
            'sixfb_score': sixfb_score,
            'revenue': {
                'weekly_total': current_week_revenue,
                'previous_week': previous_week_revenue,
                'percent_change': revenue_change,
                'target_achievement': self._calculate_target_achievement(barber.id, current_week_revenue)
            },
            'appointments': {
                'weekly_count': current_week_appointments,
                'previous_week': previous_week_appointments,
                'percent_change': appointment_change
            },
            'booking_rate': {
                'weekly_average': weekly_metrics.get('booking_rate', 0)
            },
            'average_ticket': {
                'weekly': weekly_metrics.get('average_ticket', 0),
                'percent_change': self._calculate_avg_ticket_change(barber.id)
            },
            'no_show_rate': {
                'weekly': no_show_rate
            },
            'retention': {
                'monthly_rate': retention_rate
            }
        }
    
    async def _calculate_business_metrics(self) -> Dict[str, Any]:
        """Calculate business-wide metrics"""
        # Aggregate all barber metrics
        all_barbers = self.db.query(Barber).all()
        
        total_revenue = 0
        total_appointments = 0
        avg_sixfb_score = 0
        
        for barber in all_barbers:
            barber_metrics = await self._calculate_barber_metrics(barber)
            total_revenue += barber_metrics['revenue']['weekly_total']
            total_appointments += barber_metrics['appointments']['weekly_count']
            avg_sixfb_score += barber_metrics['sixfb_score']['overall_score']
        
        avg_sixfb_score = avg_sixfb_score / len(all_barbers) if all_barbers else 0
        
        return {
            'business': {
                'total_revenue': total_revenue,
                'total_appointments': total_appointments,
                'average_sixfb_score': avg_sixfb_score,
                'active_barbers': len(all_barbers)
            }
        }
    
    async def _check_threshold(self, threshold: AlertThreshold, metrics: Dict[str, Any], barber_id: Optional[int]):
        """Check if threshold is breached"""
        try:
            # Get current value using metric path
            current_value = self._get_metric_value(metrics, threshold.metric_path)
            
            if current_value is None:
                return
            
            # Check if threshold is breached
            is_breached = self._evaluate_threshold(
                current_value, 
                threshold.threshold_value, 
                threshold.operator
            )
            
            if is_breached:
                # Check cooldown period
                if self._is_in_cooldown(threshold, barber_id):
                    return
                
                # Create and trigger alert
                alert = await self._create_alert(threshold, current_value, barber_id, metrics)
                await self._trigger_alert(alert)
        
        except Exception as e:
            logger.error(f"Error checking threshold {threshold.id}: {e}")
    
    def _get_metric_value(self, metrics: Dict[str, Any], metric_path: str) -> Optional[float]:
        """Extract metric value using dot notation path"""
        try:
            value = metrics
            for key in metric_path.split('.'):
                value = value[key]
            return float(value) if value is not None else None
        except (KeyError, TypeError, ValueError):
            return None
    
    def _evaluate_threshold(self, current_value: float, threshold_value: float, operator: str) -> bool:
        """Evaluate if threshold condition is met"""
        if operator == "less_than":
            return current_value < threshold_value
        elif operator == "greater_than":
            return current_value > threshold_value
        elif operator == "equals":
            return abs(current_value - threshold_value) < 0.01
        elif operator == "percent_change":
            # For percent change, current_value should be the change percentage
            return current_value < threshold_value
        return False
    
    def _is_in_cooldown(self, threshold: AlertThreshold, barber_id: Optional[int]) -> bool:
        """Check if alert is in cooldown period"""
        cooldown_cutoff = datetime.utcnow() - timedelta(hours=threshold.cooldown_hours)
        
        # Check recent alerts of same type
        recent_alerts = [
            alert for alert in self.alert_history
            if (alert.threshold_id == threshold.id and
                alert.barber_id == barber_id and
                alert.triggered_at > cooldown_cutoff)
        ]
        
        return len(recent_alerts) > 0
    
    async def _create_alert(self, threshold: AlertThreshold, current_value: float, 
                          barber_id: Optional[int], metrics: Dict[str, Any]) -> PerformanceAlert:
        """Create performance alert"""
        # Generate alert message
        barber_name = ""
        if barber_id:
            barber = self.db.query(Barber).get(barber_id)
            barber_name = f" for {barber.name}" if barber else ""
        
        title = f"{threshold.name}{barber_name}"
        message = self._generate_alert_message(threshold, current_value, metrics)
        
        alert = PerformanceAlert(
            id=f"{threshold.id}_{int(datetime.utcnow().timestamp())}",
            threshold_id=threshold.id,
            barber_id=barber_id,
            alert_type=threshold.alert_type,
            severity=threshold.severity,
            title=title,
            message=message,
            current_value=current_value,
            threshold_value=threshold.threshold_value,
            metric_path=threshold.metric_path,
            triggered_at=datetime.utcnow(),
            context_data=metrics
        )
        
        # Store in history
        self.alert_history.append(alert)
        
        logger.info(f"Created alert: {alert.title}")
        return alert
    
    def _generate_alert_message(self, threshold: AlertThreshold, current_value: float, 
                              metrics: Dict[str, Any]) -> str:
        """Generate human-readable alert message"""
        messages = {
            AlertType.SIXFB_SCORE_DROP: f"6FB Score has dropped to {current_value:.1f} (threshold: {threshold.threshold_value})",
            AlertType.REVENUE_DECLINE: f"Revenue declined by {abs(current_value):.1f}% this week",
            AlertType.BOOKING_RATE_LOW: f"Booking rate is {current_value:.1f}% (below {threshold.threshold_value}%)",
            AlertType.CLIENT_RETENTION_LOW: f"Client retention rate is {current_value:.1f}% (below {threshold.threshold_value}%)",
            AlertType.AVERAGE_TICKET_DROP: f"Average ticket dropped by {abs(current_value):.1f}%",
            AlertType.NO_SHOWS_HIGH: f"No-show rate is {current_value:.1f}% (above {threshold.threshold_value}%)",
            AlertType.REVENUE_TARGET_MISSED: f"Revenue target achievement: {current_value:.1f}% (below {threshold.threshold_value}%)",
            AlertType.APPOINTMENT_VOLUME_LOW: f"Appointment volume dropped by {abs(current_value):.1f}%"
        }
        
        base_message = messages.get(threshold.alert_type, f"Metric {threshold.metric_path} breached threshold")
        
        # Add recommendations
        recommendations = self._get_recommendations(threshold.alert_type, current_value, metrics)
        if recommendations:
            base_message += f"\n\nRecommendations:\n{recommendations}"
        
        return base_message
    
    def _get_recommendations(self, alert_type: AlertType, current_value: float, 
                           metrics: Dict[str, Any]) -> str:
        """Get recommendations based on alert type"""
        recommendations = {
            AlertType.SIXFB_SCORE_DROP: "• Review booking efficiency\n• Focus on client retention\n• Analyze service quality metrics",
            AlertType.REVENUE_DECLINE: "• Review pricing strategy\n• Increase marketing efforts\n• Upsell products and services",
            AlertType.BOOKING_RATE_LOW: "• Optimize schedule management\n• Reduce gaps between appointments\n• Review booking policies",
            AlertType.CLIENT_RETENTION_LOW: "• Implement follow-up campaigns\n• Review service quality\n• Gather client feedback",
            AlertType.NO_SHOWS_HIGH: "• Send appointment reminders\n• Implement confirmation calls\n• Review cancellation policy",
            AlertType.APPOINTMENT_VOLUME_LOW: "• Increase marketing efforts\n• Offer promotions\n• Review pricing strategy"
        }
        
        return recommendations.get(alert_type, "• Review performance metrics\n• Consider process improvements")
    
    async def _trigger_alert(self, alert: PerformanceAlert):
        """Trigger alert through various channels"""
        logger.info(f"Triggering alert: {alert.title}")
        
        try:
            # Get threshold configuration
            threshold = self.thresholds.get(alert.threshold_id)
            if not threshold:
                return
            
            # Send through configured channels
            for channel in threshold.notification_channels or ["email"]:
                await self._send_alert_notification(alert, channel)
            
            # Trigger automation engine
            await self.automation_engine.process_trigger(
                TriggerType.PERFORMANCE_THRESHOLD,
                {
                    'alert_id': alert.id,
                    'alert_type': alert.alert_type.value,
                    'severity': alert.severity.value,
                    'barber_id': alert.barber_id,
                    'current_value': alert.current_value,
                    'threshold_value': alert.threshold_value
                }
            )
            
        except Exception as e:
            logger.error(f"Error triggering alert {alert.id}: {e}")
    
    async def _send_alert_notification(self, alert: PerformanceAlert, channel: str):
        """Send alert notification through specific channel"""
        if channel == "email":
            await self._send_email_alert(alert)
        elif channel == "sms":
            await self._send_sms_alert(alert)
        elif channel == "slack":
            await self._send_slack_alert(alert)
    
    async def _send_email_alert(self, alert: PerformanceAlert):
        """Send email alert"""
        logger.info(f"Sending email alert: {alert.title}")
        # In production, integrate with email service
    
    async def _send_sms_alert(self, alert: PerformanceAlert):
        """Send SMS alert"""
        logger.info(f"Sending SMS alert: {alert.title}")
        # In production, integrate with SMS service
    
    async def _send_slack_alert(self, alert: PerformanceAlert):
        """Send Slack alert"""
        logger.info(f"Sending Slack alert: {alert.title}")
        # In production, integrate with Slack API
    
    # Helper calculation methods
    def _calculate_percent_change(self, current: float, previous: float) -> float:
        """Calculate percentage change"""
        if previous == 0:
            return 0.0
        return ((current - previous) / previous) * 100
    
    def _calculate_no_show_rate(self, barber_id: int) -> float:
        """Calculate no-show rate for barber"""
        week_start = date.today() - timedelta(days=7)
        
        total_appointments = self.db.query(Appointment).filter(
            and_(
                Appointment.barber_id == barber_id,
                Appointment.appointment_date >= week_start,
                Appointment.status.in_(['completed', 'no_show'])
            )
        ).count()
        
        no_shows = self.db.query(Appointment).filter(
            and_(
                Appointment.barber_id == barber_id,
                Appointment.appointment_date >= week_start,
                Appointment.status == 'no_show'
            )
        ).count()
        
        return (no_shows / total_appointments * 100) if total_appointments > 0 else 0.0
    
    def _calculate_retention_rate(self, barber_id: int) -> float:
        """Calculate client retention rate"""
        # Simplified retention calculation
        month_start = date.today() - timedelta(days=30)
        
        # Clients who had appointments in the last month
        recent_clients = self.db.query(Client).join(Appointment).filter(
            and_(
                Appointment.barber_id == barber_id,
                Appointment.appointment_date >= month_start
            )
        ).distinct().count()
        
        # Clients who had previous appointments before that
        previous_clients = self.db.query(Client).join(Appointment).filter(
            and_(
                Appointment.barber_id == barber_id,
                Appointment.appointment_date < month_start
            )
        ).distinct().count()
        
        return (recent_clients / previous_clients * 100) if previous_clients > 0 else 100.0
    
    def _calculate_target_achievement(self, barber_id: int, current_revenue: float) -> float:
        """Calculate revenue target achievement percentage"""
        # In production, this would use actual targets from barber settings
        weekly_target = 2000.0  # Default weekly target
        return (current_revenue / weekly_target) * 100
    
    def _calculate_avg_ticket_change(self, barber_id: int) -> float:
        """Calculate average ticket change percentage"""
        # Get current and previous week average tickets
        current_avg = self.calculator.get_weekly_metrics(barber_id).get('average_ticket', 0)
        
        previous_week_start = date.today() - timedelta(days=14)
        previous_week_end = date.today() - timedelta(days=7)
        previous_avg = self.calculator.get_weekly_metrics(
            barber_id, previous_week_start, previous_week_end
        ).get('average_ticket', 0)
        
        return self._calculate_percent_change(current_avg, previous_avg)
    
    # Management methods
    def get_active_alerts(self, barber_id: Optional[int] = None) -> List[PerformanceAlert]:
        """Get active alerts"""
        alerts = [alert for alert in self.alert_history if not alert.is_resolved]
        
        if barber_id:
            alerts = [alert for alert in alerts if alert.barber_id == barber_id]
        
        return sorted(alerts, key=lambda x: x.triggered_at, reverse=True)
    
    def resolve_alert(self, alert_id: str):
        """Mark alert as resolved"""
        for alert in self.alert_history:
            if alert.id == alert_id:
                alert.is_resolved = True
                alert.resolved_at = datetime.utcnow()
                logger.info(f"Resolved alert: {alert.title}")
                break
    
    def get_thresholds(self) -> List[AlertThreshold]:
        """Get all alert thresholds"""
        return list(self.thresholds.values())
    
    def update_threshold(self, threshold_id: str, updates: Dict[str, Any]):
        """Update alert threshold"""
        if threshold_id in self.thresholds:
            threshold = self.thresholds[threshold_id]
            for key, value in updates.items():
                if hasattr(threshold, key):
                    setattr(threshold, key, value)
            logger.info(f"Updated threshold: {threshold_id}")

# Convenience functions
async def monitor_performance():
    """Monitor performance - for scheduled tasks"""
    db = next(get_db())
    try:
        service = PerformanceAlertsService(db)
        await service.monitor_performance()
    finally:
        db.close()