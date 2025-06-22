"""
Payment monitoring and alerting service for 6FB Booking Platform
Monitors payment flows, webhook delivery, and payment health
"""

import logging
import time
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict, deque
from dataclasses import dataclass
from enum import Enum

import sentry_sdk
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)


class PaymentStatus(Enum):
    """Payment processing status"""
    PENDING = "pending"
    SUCCESS = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"
    DISPUTED = "disputed"


class AlertSeverity(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class PaymentAlert:
    """Payment system alert"""
    id: str
    severity: AlertSeverity
    title: str
    message: str
    data: Dict[str, Any]
    timestamp: datetime
    resolved: bool = False


@dataclass
class PaymentMetric:
    """Payment processing metric"""
    name: str
    value: float
    timestamp: datetime
    metadata: Dict[str, Any] = None


class PaymentMonitoringService:
    """Service for monitoring payment processing health and performance"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.webhook_events = deque(maxlen=1000)  # Store recent webhook events
        self.payment_metrics = deque(maxlen=1000)  # Store recent metrics
        self.active_alerts = {}
        self.payment_counts = defaultdict(int)
        self.webhook_failures = deque(maxlen=100)
        
        # Monitoring thresholds
        self.thresholds = {
            'payment_failure_rate': 5.0,  # 5% failure rate threshold
            'webhook_failure_rate': 2.0,  # 2% webhook failure rate
            'payment_processing_time': 30.0,  # 30 seconds max processing time
            'daily_transaction_drop': 0.5,  # 50% drop in transactions
            'refund_rate': 10.0,  # 10% refund rate threshold
        }
    
    def track_webhook_event(self, event_type: str, event_id: str, 
                          processing_time: float, success: bool, 
                          error_message: Optional[str] = None):
        """Track webhook event processing"""
        event_data = {
            'event_type': event_type,
            'event_id': event_id,
            'processing_time': processing_time,
            'success': success,
            'error_message': error_message,
            'timestamp': datetime.utcnow()
        }
        
        self.webhook_events.append(event_data)
        
        # Track failures separately
        if not success:
            self.webhook_failures.append(event_data)
            
        # Check for webhook health issues
        self._check_webhook_health()
        
        # Log to monitoring systems
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("event_type", "webhook_processing")
            scope.set_tag("webhook_event_type", event_type)
            scope.set_context("webhook", {
                "event_id": event_id,
                "processing_time": processing_time,
                "success": success
            })
            
            if success:
                sentry_sdk.capture_message(
                    f"Webhook processed: {event_type}",
                    level="info"
                )
            else:
                sentry_sdk.capture_message(
                    f"Webhook failed: {event_type} - {error_message}",
                    level="error"
                )
    
    def track_payment_attempt(self, payment_id: str, amount: float, 
                            currency: str, status: PaymentStatus,
                            processing_time: float, error_code: Optional[str] = None):
        """Track payment attempt and outcome"""
        payment_data = {
            'payment_id': payment_id,
            'amount': amount,
            'currency': currency,
            'status': status.value,
            'processing_time': processing_time,
            'error_code': error_code,
            'timestamp': datetime.utcnow()
        }
        
        # Record metric
        self.record_metric(
            f"payment_{status.value}",
            processing_time,
            payment_data
        )
        
        # Update payment counts
        self.payment_counts[status.value] += 1
        self.payment_counts['total'] += 1
        
        # Check payment health
        self._check_payment_health()
        
        # Send to monitoring
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("event_type", "payment_processing")
            scope.set_tag("payment_status", status.value)
            scope.set_context("payment", {
                "payment_id": payment_id,
                "amount": amount,
                "currency": currency,
                "processing_time": processing_time
            })
            
            if status == PaymentStatus.SUCCESS:
                sentry_sdk.capture_message(
                    f"Payment successful: {payment_id}",
                    level="info"
                )
            elif status == PaymentStatus.FAILED:
                sentry_sdk.capture_message(
                    f"Payment failed: {payment_id} - {error_code}",
                    level="warning"
                )
    
    def record_metric(self, name: str, value: float, metadata: Dict[str, Any] = None):
        """Record a payment-related metric"""
        metric = PaymentMetric(
            name=name,
            value=value,
            timestamp=datetime.utcnow(),
            metadata=metadata or {}
        )
        
        self.payment_metrics.append(metric)
    
    def _check_webhook_health(self):
        """Check webhook processing health and generate alerts if needed"""
        if len(self.webhook_events) < 10:
            return  # Not enough data
        
        # Calculate failure rate in last hour
        recent_events = [
            e for e in self.webhook_events 
            if e['timestamp'] > datetime.utcnow() - timedelta(hours=1)
        ]
        
        if not recent_events:
            return
        
        failure_rate = (
            len([e for e in recent_events if not e['success']]) / 
            len(recent_events) * 100
        )
        
        if failure_rate > self.thresholds['webhook_failure_rate']:
            self._create_alert(
                "webhook_failure_rate",
                AlertSeverity.WARNING,
                "High Webhook Failure Rate",
                f"Webhook failure rate is {failure_rate:.1f}% (threshold: {self.thresholds['webhook_failure_rate']}%)",
                {
                    "failure_rate": failure_rate,
                    "recent_failures": len([e for e in recent_events if not e['success']]),
                    "total_events": len(recent_events)
                }
            )
        
        # Check for processing time issues
        avg_processing_time = sum(e['processing_time'] for e in recent_events) / len(recent_events)
        
        if avg_processing_time > self.thresholds['payment_processing_time']:
            self._create_alert(
                "webhook_processing_slow",
                AlertSeverity.WARNING,
                "Slow Webhook Processing",
                f"Average webhook processing time is {avg_processing_time:.2f}s (threshold: {self.thresholds['payment_processing_time']}s)",
                {
                    "avg_processing_time": avg_processing_time,
                    "threshold": self.thresholds['payment_processing_time']
                }
            )
    
    def _check_payment_health(self):
        """Check payment processing health"""
        if self.payment_counts['total'] < 10:
            return  # Not enough data
        
        # Calculate failure rate
        failure_rate = (
            (self.payment_counts['failed'] + self.payment_counts['disputed']) / 
            self.payment_counts['total'] * 100
        )
        
        if failure_rate > self.thresholds['payment_failure_rate']:
            self._create_alert(
                "payment_failure_rate",
                AlertSeverity.CRITICAL,
                "High Payment Failure Rate",
                f"Payment failure rate is {failure_rate:.1f}% (threshold: {self.thresholds['payment_failure_rate']}%)",
                {
                    "failure_rate": failure_rate,
                    "failed_payments": self.payment_counts['failed'],
                    "disputed_payments": self.payment_counts['disputed'],
                    "total_payments": self.payment_counts['total']
                }
            )
        
        # Check refund rate
        refund_rate = (
            self.payment_counts['refunded'] / 
            max(self.payment_counts['succeeded'], 1) * 100
        )
        
        if refund_rate > self.thresholds['refund_rate']:
            self._create_alert(
                "high_refund_rate",
                AlertSeverity.WARNING,
                "High Refund Rate",
                f"Refund rate is {refund_rate:.1f}% (threshold: {self.thresholds['refund_rate']}%)",
                {
                    "refund_rate": refund_rate,
                    "refunded_payments": self.payment_counts['refunded'],
                    "successful_payments": self.payment_counts['succeeded']
                }
            )
    
    def _create_alert(self, alert_id: str, severity: AlertSeverity, 
                     title: str, message: str, data: Dict[str, Any]):
        """Create or update a payment alert"""
        if alert_id in self.active_alerts and not self.active_alerts[alert_id].resolved:
            return  # Alert already active
        
        alert = PaymentAlert(
            id=alert_id,
            severity=severity,
            title=title,
            message=message,
            data=data,
            timestamp=datetime.utcnow()
        )
        
        self.active_alerts[alert_id] = alert
        
        # Send to Sentry
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("alert_type", "payment")
            scope.set_tag("alert_severity", severity.value)
            scope.set_context("alert", {
                "id": alert_id,
                "title": title,
                "data": data
            })
            
            if severity == AlertSeverity.CRITICAL:
                sentry_sdk.capture_message(f"CRITICAL: {title} - {message}", level="error")
            else:
                sentry_sdk.capture_message(f"{severity.value.upper()}: {title} - {message}", level="warning")
        
        logger.warning(f"Payment Alert [{severity.value}]: {title} - {message}")
    
    def resolve_alert(self, alert_id: str):
        """Resolve an active alert"""
        if alert_id in self.active_alerts:
            self.active_alerts[alert_id].resolved = True
            logger.info(f"Payment alert resolved: {alert_id}")
    
    def get_payment_health_summary(self) -> Dict[str, Any]:
        """Get comprehensive payment health summary"""
        total_payments = self.payment_counts['total']
        
        if total_payments == 0:
            return {
                "status": "no_data",
                "message": "No payment data available",
                "timestamp": datetime.utcnow().isoformat()
            }
        
        # Calculate rates
        success_rate = (self.payment_counts['succeeded'] / total_payments) * 100
        failure_rate = (self.payment_counts['failed'] / total_payments) * 100
        refund_rate = (self.payment_counts['refunded'] / max(self.payment_counts['succeeded'], 1)) * 100
        
        # Get recent webhook stats
        recent_webhooks = [
            e for e in self.webhook_events 
            if e['timestamp'] > datetime.utcnow() - timedelta(hours=1)
        ]
        
        webhook_success_rate = 100.0
        if recent_webhooks:
            webhook_success_rate = (
                len([e for e in recent_webhooks if e['success']]) / 
                len(recent_webhooks) * 100
            )
        
        # Determine overall health status
        if (failure_rate > self.thresholds['payment_failure_rate'] or 
            webhook_success_rate < (100 - self.thresholds['webhook_failure_rate'])):
            status = "unhealthy"
        elif refund_rate > self.thresholds['refund_rate']:
            status = "warning"
        else:
            status = "healthy"
        
        return {
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
            "payment_stats": {
                "total_payments": total_payments,
                "success_rate": round(success_rate, 2),
                "failure_rate": round(failure_rate, 2),
                "refund_rate": round(refund_rate, 2),
                "breakdown": dict(self.payment_counts)
            },
            "webhook_stats": {
                "total_events": len(recent_webhooks),
                "success_rate": round(webhook_success_rate, 2),
                "recent_failures": len([e for e in recent_webhooks if not e['success']])
            },
            "active_alerts": len([a for a in self.active_alerts.values() if not a.resolved]),
            "thresholds": self.thresholds
        }
    
    def get_active_alerts(self) -> List[PaymentAlert]:
        """Get all active payment alerts"""
        return [alert for alert in self.active_alerts.values() if not alert.resolved]
    
    def get_payment_metrics(self, time_range_hours: int = 24) -> Dict[str, Any]:
        """Get payment metrics for specified time range"""
        cutoff_time = datetime.utcnow() - timedelta(hours=time_range_hours)
        
        relevant_metrics = [
            m for m in self.payment_metrics 
            if m.timestamp >= cutoff_time
        ]
        
        if not relevant_metrics:
            return {
                "time_range_hours": time_range_hours,
                "metrics_count": 0,
                "message": "No metrics available for specified time range"
            }
        
        # Group metrics by name
        metrics_by_name = defaultdict(list)
        for metric in relevant_metrics:
            metrics_by_name[metric.name].append(metric.value)
        
        # Calculate summaries
        summary = {}
        for name, values in metrics_by_name.items():
            summary[name] = {
                "count": len(values),
                "average": sum(values) / len(values),
                "min": min(values),
                "max": max(values),
                "latest": values[-1] if values else 0
            }
        
        return {
            "time_range_hours": time_range_hours,
            "metrics_count": len(relevant_metrics),
            "summary": summary,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def reset_counters(self):
        """Reset payment counters (typically called daily)"""
        self.payment_counts.clear()
        logger.info("Payment monitoring counters reset")


# Global instance
payment_monitor = None


def get_payment_monitor(db: Session) -> PaymentMonitoringService:
    """Get or create payment monitoring service instance"""
    global payment_monitor
    if payment_monitor is None:
        payment_monitor = PaymentMonitoringService(db)
    return payment_monitor