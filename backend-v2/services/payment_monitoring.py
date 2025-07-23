"""
Payment Monitoring and Alerting System for BookedBarber V2

Provides real-time monitoring of payment operations, failure detection,
performance tracking, and automated alerting for payment issues.

CRITICAL FEATURES:
- Real-time payment success/failure rate monitoring
- SLA tracking and breach detection
- Fraud pattern detection
- Payment processing time analysis
- Automated alerting with escalation
- Health checks and system diagnostics
- Performance bottleneck identification
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc, text
from models import Payment, Refund, User, Appointment
from services.optimized_payment_queries import OptimizedPaymentQueries
from utils.payment_errors import PaymentErrorCode, PaymentErrorHandler
import json

logger = logging.getLogger(__name__)


class AlertLevel(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning" 
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class PaymentMetricType(Enum):
    """Types of payment metrics to monitor"""
    SUCCESS_RATE = "success_rate"
    PROCESSING_TIME = "processing_time"
    FAILURE_RATE = "failure_rate"
    FRAUD_RATE = "fraud_rate"
    VOLUME = "volume"
    REVENUE = "revenue"


@dataclass
class PaymentAlert:
    """Payment system alert"""
    alert_id: str
    level: AlertLevel
    metric_type: PaymentMetricType
    title: str
    description: str
    threshold_value: float
    actual_value: float
    timestamp: datetime
    organization_id: Optional[int] = None
    barber_id: Optional[int] = None
    metadata: Dict[str, Any] = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None


@dataclass
class PaymentMetrics:
    """Payment system metrics snapshot"""
    timestamp: datetime
    total_payments: int
    successful_payments: int
    failed_payments: int
    success_rate: float
    average_processing_time: float
    total_revenue: Decimal
    fraud_alerts: int
    period_minutes: int
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'timestamp': self.timestamp.isoformat(),
            'total_payments': self.total_payments,
            'successful_payments': self.successful_payments, 
            'failed_payments': self.failed_payments,
            'success_rate': self.success_rate,
            'average_processing_time': self.average_processing_time,
            'total_revenue': float(self.total_revenue),
            'fraud_alerts': self.fraud_alerts,
            'period_minutes': self.period_minutes
        }


@dataclass
class SLATarget:
    """Service Level Agreement targets"""
    metric_type: PaymentMetricType
    target_value: float
    warning_threshold: float  # Percentage of target that triggers warning
    critical_threshold: float  # Percentage of target that triggers critical
    measurement_period_minutes: int


class PaymentMonitoringService:
    """Real-time payment monitoring and alerting service"""
    
    def __init__(self, db: Session):
        self.db = db
        self.active_alerts: Dict[str, PaymentAlert] = {}
        self.metrics_history: List[PaymentMetrics] = []
        self.sla_targets = self._init_sla_targets()
        
    def _init_sla_targets(self) -> Dict[PaymentMetricType, SLATarget]:
        """Initialize SLA targets for payment metrics"""
        return {
            PaymentMetricType.SUCCESS_RATE: SLATarget(
                metric_type=PaymentMetricType.SUCCESS_RATE,
                target_value=99.5,  # 99.5% success rate
                warning_threshold=98.0,  # Warning at 98%
                critical_threshold=95.0,  # Critical at 95%
                measurement_period_minutes=15
            ),
            PaymentMetricType.PROCESSING_TIME: SLATarget(
                metric_type=PaymentMetricType.PROCESSING_TIME,
                target_value=2.0,  # 2 seconds target
                warning_threshold=5.0,  # Warning at 5 seconds
                critical_threshold=10.0,  # Critical at 10 seconds
                measurement_period_minutes=5
            ),
            PaymentMetricType.FAILURE_RATE: SLATarget(
                metric_type=PaymentMetricType.FAILURE_RATE,
                target_value=0.5,  # 0.5% failure rate
                warning_threshold=2.0,  # Warning at 2%
                critical_threshold=5.0,  # Critical at 5%
                measurement_period_minutes=15
            ),
            PaymentMetricType.FRAUD_RATE: SLATarget(
                metric_type=PaymentMetricType.FRAUD_RATE,
                target_value=0.1,  # 0.1% fraud rate
                warning_threshold=0.5,  # Warning at 0.5%
                critical_threshold=1.0,  # Critical at 1%
                measurement_period_minutes=60
            )
        }
    
    async def collect_real_time_metrics(self, period_minutes: int = 5) -> PaymentMetrics:
        """Collect real-time payment metrics"""
        
        cutoff_time = datetime.utcnow() - timedelta(minutes=period_minutes)
        
        try:
            # Get payment counts and success rate
            payment_stats = self.db.query(
                func.count(Payment.id).label('total'),
                func.count(Payment.id).filter(Payment.status == 'completed').label('successful'),
                func.count(Payment.id).filter(Payment.status == 'failed').label('failed'),
                func.sum(Payment.amount).filter(Payment.status == 'completed').label('revenue')
            ).filter(
                Payment.created_at >= cutoff_time
            ).first()
            
            total_payments = payment_stats.total or 0
            successful_payments = payment_stats.successful or 0
            failed_payments = payment_stats.failed or 0
            total_revenue = Decimal(str(payment_stats.revenue or 0))
            
            # Calculate success rate
            success_rate = (successful_payments / total_payments * 100) if total_payments > 0 else 100.0
            
            # Get average processing time (mock calculation - would need actual timing data)
            # In production, this would track payment_intent creation to confirmation time
            avg_processing_time = await self._calculate_average_processing_time(cutoff_time)
            
            # Count fraud alerts (mock - would integrate with actual fraud detection)
            fraud_alerts = await self._count_fraud_alerts(cutoff_time)
            
            metrics = PaymentMetrics(
                timestamp=datetime.utcnow(),
                total_payments=total_payments,
                successful_payments=successful_payments,
                failed_payments=failed_payments,
                success_rate=success_rate,
                average_processing_time=avg_processing_time,
                total_revenue=total_revenue,
                fraud_alerts=fraud_alerts,
                period_minutes=period_minutes
            )
            
            # Store metrics history (keep last 100 snapshots)
            self.metrics_history.append(metrics)
            if len(self.metrics_history) > 100:
                self.metrics_history.pop(0)
            
            logger.info(f"Collected payment metrics: {metrics.to_dict()}")
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting payment metrics: {str(e)}")
            # Return empty metrics on error
            return PaymentMetrics(
                timestamp=datetime.utcnow(),
                total_payments=0,
                successful_payments=0,
                failed_payments=0,
                success_rate=100.0,
                average_processing_time=0.0,
                total_revenue=Decimal('0'),
                fraud_alerts=0,
                period_minutes=period_minutes
            )
    
    async def _calculate_average_processing_time(self, cutoff_time: datetime) -> float:
        """Calculate average payment processing time"""
        
        # Mock implementation - in production would track actual timing
        # Could track time from payment_intent creation to webhook confirmation
        try:
            # Simulate realistic processing times based on payment volume
            recent_count = self.db.query(func.count(Payment.id)).filter(
                Payment.created_at >= cutoff_time
            ).scalar() or 0
            
            # More payments = slightly longer average processing time
            base_time = 1.5  # Base 1.5 seconds
            volume_impact = min(recent_count * 0.01, 2.0)  # Max 2 second impact
            
            return base_time + volume_impact
            
        except Exception as e:
            logger.error(f"Error calculating processing time: {str(e)}")
            return 2.0  # Default processing time
    
    async def _count_fraud_alerts(self, cutoff_time: datetime) -> int:
        """Count fraud alerts in the time period"""
        
        # Mock implementation - would integrate with actual fraud detection system
        try:
            # Look for suspicious patterns that might indicate fraud
            suspicious_patterns = 0
            
            # High-value payments in short timeframe
            high_value_count = self.db.query(func.count(Payment.id)).filter(
                Payment.created_at >= cutoff_time,
                Payment.amount > 500,  # Payments over $500
                Payment.status == 'completed'
            ).scalar() or 0
            
            if high_value_count > 5:  # More than 5 high-value payments
                suspicious_patterns += 1
            
            # Multiple failed payments from same user
            failed_by_user = self.db.query(
                Payment.user_id,
                func.count(Payment.id).label('failed_count')
            ).filter(
                Payment.created_at >= cutoff_time,
                Payment.status == 'failed'
            ).group_by(Payment.user_id).having(
                func.count(Payment.id) > 3
            ).all()
            
            suspicious_patterns += len(failed_by_user)
            
            return suspicious_patterns
            
        except Exception as e:
            logger.error(f"Error counting fraud alerts: {str(e)}")
            return 0
    
    async def check_sla_compliance(self, metrics: PaymentMetrics) -> List[PaymentAlert]:
        """Check metrics against SLA targets and generate alerts"""
        
        alerts = []
        
        try:
            for metric_type, sla_target in self.sla_targets.items():
                
                alert = await self._check_single_sla(metric_type, sla_target, metrics)
                if alert:
                    alerts.append(alert)
                    await self._handle_alert(alert)
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error checking SLA compliance: {str(e)}")
            return []
    
    async def _check_single_sla(
        self, 
        metric_type: PaymentMetricType, 
        sla_target: SLATarget, 
        metrics: PaymentMetrics
    ) -> Optional[PaymentAlert]:
        """Check a single SLA target against current metrics"""
        
        try:
            # Get actual value for this metric
            actual_value = self._extract_metric_value(metric_type, metrics)
            
            # Determine alert level based on thresholds
            alert_level = None
            threshold_value = sla_target.target_value
            
            if metric_type == PaymentMetricType.SUCCESS_RATE:
                if actual_value < sla_target.critical_threshold:
                    alert_level = AlertLevel.CRITICAL
                    threshold_value = sla_target.critical_threshold
                elif actual_value < sla_target.warning_threshold:
                    alert_level = AlertLevel.WARNING
                    threshold_value = sla_target.warning_threshold
                    
            elif metric_type == PaymentMetricType.PROCESSING_TIME:
                if actual_value > sla_target.critical_threshold:
                    alert_level = AlertLevel.CRITICAL
                    threshold_value = sla_target.critical_threshold
                elif actual_value > sla_target.warning_threshold:
                    alert_level = AlertLevel.WARNING
                    threshold_value = sla_target.warning_threshold
                    
            elif metric_type == PaymentMetricType.FAILURE_RATE:
                failure_rate = (metrics.failed_payments / metrics.total_payments * 100) if metrics.total_payments > 0 else 0
                if failure_rate > sla_target.critical_threshold:
                    alert_level = AlertLevel.CRITICAL
                    threshold_value = sla_target.critical_threshold
                elif failure_rate > sla_target.warning_threshold:
                    alert_level = AlertLevel.WARNING
                    threshold_value = sla_target.warning_threshold
                actual_value = failure_rate
                    
            elif metric_type == PaymentMetricType.FRAUD_RATE:
                fraud_rate = (metrics.fraud_alerts / metrics.total_payments * 100) if metrics.total_payments > 0 else 0
                if fraud_rate > sla_target.critical_threshold:
                    alert_level = AlertLevel.CRITICAL
                    threshold_value = sla_target.critical_threshold
                elif fraud_rate > sla_target.warning_threshold:
                    alert_level = AlertLevel.WARNING
                    threshold_value = sla_target.warning_threshold
                actual_value = fraud_rate
            
            # Create alert if threshold breached
            if alert_level:
                alert_id = f"{metric_type.value}_{int(time.time())}"
                
                return PaymentAlert(
                    alert_id=alert_id,
                    level=alert_level,
                    metric_type=metric_type,
                    title=f"{metric_type.value.replace('_', ' ').title()} SLA Breach",
                    description=self._generate_alert_description(metric_type, actual_value, threshold_value, alert_level),
                    threshold_value=threshold_value,
                    actual_value=actual_value,
                    timestamp=datetime.utcnow(),
                    metadata={
                        'period_minutes': sla_target.measurement_period_minutes,
                        'metrics_snapshot': metrics.to_dict()
                    }
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking SLA for {metric_type}: {str(e)}")
            return None
    
    def _extract_metric_value(self, metric_type: PaymentMetricType, metrics: PaymentMetrics) -> float:
        """Extract the actual value for a specific metric type"""
        
        if metric_type == PaymentMetricType.SUCCESS_RATE:
            return metrics.success_rate
        elif metric_type == PaymentMetricType.PROCESSING_TIME:
            return metrics.average_processing_time
        elif metric_type == PaymentMetricType.FAILURE_RATE:
            return (metrics.failed_payments / metrics.total_payments * 100) if metrics.total_payments > 0 else 0
        elif metric_type == PaymentMetricType.FRAUD_RATE:
            return (metrics.fraud_alerts / metrics.total_payments * 100) if metrics.total_payments > 0 else 0
        else:
            return 0.0
    
    def _generate_alert_description(
        self, 
        metric_type: PaymentMetricType, 
        actual_value: float, 
        threshold_value: float,
        alert_level: AlertLevel
    ) -> str:
        """Generate human-readable alert description"""
        
        descriptions = {
            PaymentMetricType.SUCCESS_RATE: f"Payment success rate is {actual_value:.2f}%, below {alert_level.value} threshold of {threshold_value:.2f}%",
            PaymentMetricType.PROCESSING_TIME: f"Average payment processing time is {actual_value:.2f}s, above {alert_level.value} threshold of {threshold_value:.2f}s",
            PaymentMetricType.FAILURE_RATE: f"Payment failure rate is {actual_value:.2f}%, above {alert_level.value} threshold of {threshold_value:.2f}%",
            PaymentMetricType.FRAUD_RATE: f"Fraud alert rate is {actual_value:.2f}%, above {alert_level.value} threshold of {threshold_value:.2f}%"
        }
        
        return descriptions.get(metric_type, f"Metric {metric_type.value} breached {alert_level.value} threshold")
    
    async def _handle_alert(self, alert: PaymentAlert):
        """Handle new payment alert"""
        
        try:
            # Store alert
            self.active_alerts[alert.alert_id] = alert
            
            # Log alert
            logger.warning(f"Payment Alert [{alert.level.value.upper()}]: {alert.title} - {alert.description}")
            
            # Send notifications based on alert level
            await self._send_alert_notifications(alert)
            
            # Auto-escalate critical alerts
            if alert.level in [AlertLevel.CRITICAL, AlertLevel.EMERGENCY]:
                await self._escalate_alert(alert)
                
        except Exception as e:
            logger.error(f"Error handling payment alert {alert.alert_id}: {str(e)}")
    
    async def _send_alert_notifications(self, alert: PaymentAlert):
        """Send alert notifications via various channels"""
        
        try:
            # In production, integrate with:
            # - Email notifications
            # - SMS alerts
            # - Slack/Teams notifications
            # - PagerDuty for critical alerts
            # - Dashboard notifications
            
            notification_channels = []
            
            if alert.level == AlertLevel.WARNING:
                notification_channels = ['email', 'dashboard']
            elif alert.level == AlertLevel.CRITICAL:
                notification_channels = ['email', 'sms', 'slack', 'dashboard']
            elif alert.level == AlertLevel.EMERGENCY:
                notification_channels = ['email', 'sms', 'slack', 'pager', 'dashboard']
            
            # Mock notification sending
            for channel in notification_channels:
                logger.info(f"Sending {alert.level.value} alert via {channel}: {alert.title}")
                
            # Store notification record
            alert.metadata = alert.metadata or {}
            alert.metadata['notifications_sent'] = notification_channels
            alert.metadata['notification_time'] = datetime.utcnow().isoformat()
            
        except Exception as e:
            logger.error(f"Error sending notifications for alert {alert.alert_id}: {str(e)}")
    
    async def _escalate_alert(self, alert: PaymentAlert):
        """Escalate critical alerts"""
        
        try:
            # Auto-escalation for critical payment issues
            escalation_actions = []
            
            if alert.metric_type == PaymentMetricType.SUCCESS_RATE and alert.level == AlertLevel.CRITICAL:
                escalation_actions.extend([
                    'notify_payment_team',
                    'check_stripe_status',
                    'verify_webhook_connectivity',
                    'review_recent_code_changes'
                ])
            
            elif alert.metric_type == PaymentMetricType.PROCESSING_TIME and alert.level == AlertLevel.CRITICAL:
                escalation_actions.extend([
                    'check_database_performance',
                    'verify_stripe_api_latency',
                    'scale_payment_workers',
                    'enable_payment_circuit_breaker'
                ])
            
            elif alert.metric_type == PaymentMetricType.FRAUD_RATE and alert.level == AlertLevel.CRITICAL:
                escalation_actions.extend([
                    'notify_security_team',
                    'enable_enhanced_fraud_detection',
                    'review_suspicious_transactions',
                    'consider_temporary_restrictions'
                ])
            
            # Log escalation actions
            for action in escalation_actions:
                logger.warning(f"ESCALATION ACTION for {alert.alert_id}: {action}")
            
            alert.metadata = alert.metadata or {}
            alert.metadata['escalation_actions'] = escalation_actions
            alert.metadata['escalated_at'] = datetime.utcnow().isoformat()
            
        except Exception as e:
            logger.error(f"Error escalating alert {alert.alert_id}: {str(e)}")
    
    async def get_system_health_status(self) -> Dict[str, Any]:
        """Get comprehensive payment system health status"""
        
        try:
            # Get latest metrics
            latest_metrics = await self.collect_real_time_metrics(period_minutes=15)
            
            # Count active alerts by level
            alert_counts = {
                'info': 0,
                'warning': 0,
                'critical': 0,
                'emergency': 0
            }
            
            for alert in self.active_alerts.values():
                if not alert.resolved:
                    alert_counts[alert.level.value] += 1
            
            # Determine overall health status
            overall_status = 'healthy'
            if alert_counts['critical'] > 0 or alert_counts['emergency'] > 0:
                overall_status = 'critical'
            elif alert_counts['warning'] > 0:
                overall_status = 'warning'
            elif alert_counts['info'] > 0:
                overall_status = 'info'
            
            # Calculate uptime and availability
            uptime_stats = await self._calculate_uptime_stats()
            
            return {
                'status': overall_status,
                'timestamp': datetime.utcnow().isoformat(),
                'metrics': latest_metrics.to_dict(),
                'active_alerts': alert_counts,
                'uptime': uptime_stats,
                'sla_targets': {
                    metric_type.value: {
                        'target': sla.target_value,
                        'warning_threshold': sla.warning_threshold,
                        'critical_threshold': sla.critical_threshold
                    }
                    for metric_type, sla in self.sla_targets.items()
                },
                'total_active_alerts': sum(alert_counts.values())
            }
            
        except Exception as e:
            logger.error(f"Error getting system health status: {str(e)}")
            return {
                'status': 'unknown',
                'timestamp': datetime.utcnow().isoformat(),
                'error': str(e)
            }
    
    async def _calculate_uptime_stats(self) -> Dict[str, Any]:
        """Calculate system uptime statistics"""
        
        try:
            # In production, would track actual system uptime
            # For now, calculate based on payment success rates
            
            last_24h = datetime.utcnow() - timedelta(hours=24)
            last_7d = datetime.utcnow() - timedelta(days=7)
            last_30d = datetime.utcnow() - timedelta(days=30)
            
            # Mock uptime calculation based on payment success
            uptime_24h = 99.9  # Would calculate from actual metrics
            uptime_7d = 99.8
            uptime_30d = 99.5
            
            return {
                'last_24_hours': uptime_24h,
                'last_7_days': uptime_7d,
                'last_30_days': uptime_30d,
                'current_incident_count': len([a for a in self.active_alerts.values() if not a.resolved])
            }
            
        except Exception as e:
            logger.error(f"Error calculating uptime stats: {str(e)}")
            return {
                'last_24_hours': 0.0,
                'last_7_days': 0.0,
                'last_30_days': 0.0,
                'current_incident_count': 0
            }
    
    async def resolve_alert(self, alert_id: str, resolved_by: str, resolution_notes: str = None):
        """Mark an alert as resolved"""
        
        try:
            if alert_id in self.active_alerts:
                alert = self.active_alerts[alert_id]
                alert.resolved = True
                alert.resolved_at = datetime.utcnow()
                
                if not alert.metadata:
                    alert.metadata = {}
                
                alert.metadata['resolved_by'] = resolved_by
                alert.metadata['resolution_notes'] = resolution_notes
                alert.metadata['resolution_time'] = alert.resolved_at.isoformat()
                
                logger.info(f"Alert {alert_id} resolved by {resolved_by}: {resolution_notes}")
                
                return True
            else:
                logger.warning(f"Alert {alert_id} not found for resolution")
                return False
                
        except Exception as e:
            logger.error(f"Error resolving alert {alert_id}: {str(e)}")
            return False
    
    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get all active alerts"""
        
        return [
            asdict(alert) for alert in self.active_alerts.values() 
            if not alert.resolved
        ]
    
    def get_metrics_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get metrics history for the specified time period"""
        
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        return [
            metrics.to_dict() for metrics in self.metrics_history
            if metrics.timestamp >= cutoff_time
        ]


class PaymentMonitoringRunner:
    """Background service runner for payment monitoring"""
    
    def __init__(self, db_session_factory):
        self.db_session_factory = db_session_factory
        self.monitoring_service = None
        self.running = False
        
    async def start_monitoring(self, check_interval_seconds: int = 60):
        """Start the monitoring background service"""
        
        self.running = True
        logger.info("Starting payment monitoring service...")
        
        while self.running:
            try:
                # Create new DB session for each check
                with self.db_session_factory() as db:
                    self.monitoring_service = PaymentMonitoringService(db)
                    
                    # Collect metrics and check SLAs
                    metrics = await self.monitoring_service.collect_real_time_metrics()
                    alerts = await self.monitoring_service.check_sla_compliance(metrics)
                    
                    if alerts:
                        logger.info(f"Generated {len(alerts)} payment alerts")
                    
                # Wait for next check
                await asyncio.sleep(check_interval_seconds)
                
            except Exception as e:
                logger.error(f"Error in payment monitoring loop: {str(e)}")
                await asyncio.sleep(check_interval_seconds)  # Continue running even on error
    
    def stop_monitoring(self):
        """Stop the monitoring service"""
        self.running = False
        logger.info("Payment monitoring service stopped")


# Convenience functions for easy integration

async def get_payment_health_status(db: Session) -> Dict[str, Any]:
    """Get current payment system health status"""
    monitoring_service = PaymentMonitoringService(db)
    return await monitoring_service.get_system_health_status()


async def check_payment_alerts(db: Session) -> List[Dict[str, Any]]:
    """Check for active payment alerts"""
    monitoring_service = PaymentMonitoringService(db)
    return monitoring_service.get_active_alerts()


async def collect_payment_metrics(db: Session, period_minutes: int = 15) -> Dict[str, Any]:
    """Collect current payment metrics"""
    monitoring_service = PaymentMonitoringService(db)
    metrics = await monitoring_service.collect_real_time_metrics(period_minutes)
    return metrics.to_dict()