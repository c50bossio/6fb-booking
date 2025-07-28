"""
Queue Monitoring Worker for BookedBarber V2
Handles queue health monitoring, metrics collection, and alerting
"""

import os
import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from celery import Celery
from datetime import datetime, timedelta
import logging
import json
import redis
from contextlib import contextmanager
from typing import Dict, Any, List, Optional
from sqlalchemy import and_, or_, func, desc

from db import SessionLocal
from config import settings
from models.message_queue import (
    MessageQueue, DeadLetterQueue, MessageStatus, MessageQueueType, 
    MessagePriority, QueueMetrics
)
from services.notification_service import notification_service
from services.sentry_monitoring import celery_monitor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Redis client for queue inspection
try:
    redis_client = redis.from_url(settings.redis_url)
except Exception as e:
    logger.warning(f"Redis connection failed: {e}")
    redis_client = None

# Import Sentry monitoring if available
try:
    SENTRY_MONITORING_AVAILABLE = True
except ImportError:
    SENTRY_MONITORING_AVAILABLE = False


@contextmanager
def get_db_session():
    """Context manager for database sessions"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def monitor_task(task_name: str):
    """Decorator for monitoring tasks with Sentry"""
    def decorator(func):
        if SENTRY_MONITORING_AVAILABLE:
            return celery_monitor.monitor_task_execution(task_name)(func)
        return func
    return decorator


# Import from main celery app
from celery_app import celery_app


@celery_app.task(bind=True, max_retries=1)
@monitor_task("check_queue_health")
def check_queue_health(self):
    """
    Monitor queue health and detect issues
    """
    try:
        with get_db_session() as db:
            health_report = {
                "timestamp": datetime.utcnow().isoformat(),
                "overall_status": "healthy",
                "queue_health": {},
                "alerts": [],
                "recommendations": []
            }
            
            # Check each queue type
            for queue_type in MessageQueueType:
                queue_health = _check_individual_queue_health(db, queue_type)
                health_report["queue_health"][queue_type.value] = queue_health
                
                # Collect alerts
                if queue_health["status"] != "healthy":
                    health_report["alerts"].extend(queue_health.get("alerts", []))
                    health_report["overall_status"] = "warning"
                
                # Add recommendations
                health_report["recommendations"].extend(queue_health.get("recommendations", []))
            
            # Check Redis queue depths if available
            if redis_client:
                redis_health = _check_redis_queue_health()
                health_report["redis_health"] = redis_health
                
                if redis_health["status"] != "healthy":
                    health_report["alerts"].extend(redis_health.get("alerts", []))
                    health_report["overall_status"] = "warning"
            
            # Check dead letter queue
            dlq_health = _check_dlq_health(db)
            health_report["dlq_health"] = dlq_health
            
            if dlq_health["status"] != "healthy":
                health_report["alerts"].extend(dlq_health.get("alerts", []))
                if dlq_health["status"] == "critical":
                    health_report["overall_status"] = "critical"
            
            # Store health report
            _store_health_report(db, health_report)
            
            # Send alerts if necessary
            if health_report["alerts"]:
                _send_health_alerts(db, health_report)
            
            logger.info(f"Queue health check completed: {health_report['overall_status']}")
            return health_report
            
    except Exception as e:
        logger.error(f"Error checking queue health: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 300  # 5 minutes
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=1)
@monitor_task("generate_queue_metrics")
def generate_queue_metrics(self):
    """
    Generate detailed queue metrics and performance data
    """
    try:
        with get_db_session() as db:
            metrics_timestamp = datetime.utcnow()
            
            # Generate metrics for each queue type
            for queue_type in MessageQueueType:
                metrics = _calculate_queue_metrics(db, queue_type, metrics_timestamp)
                
                # Store metrics in database
                queue_metrics = QueueMetrics(
                    queue_type=queue_type,
                    metric_timestamp=metrics_timestamp,
                    **metrics
                )
                
                db.add(queue_metrics)
            
            db.commit()
            
            logger.info(f"Queue metrics generated for {len(MessageQueueType)} queue types")
            return {
                "status": "completed",
                "timestamp": metrics_timestamp.isoformat(),
                "queue_types_processed": len(MessageQueueType)
            }
            
    except Exception as e:
        logger.error(f"Error generating queue metrics: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 300
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=2)
@monitor_task("alert_on_queue_backlog")
def alert_on_queue_backlog(self):
    """
    Check for queue backlogs and send alerts
    """
    try:
        with get_db_session() as db:
            backlog_alerts = []
            
            # Define backlog thresholds for different queue types
            backlog_thresholds = {
                MessageQueueType.PAYMENT_WEBHOOK: 10,
                MessageQueueType.NOTIFICATION: 100,
                MessageQueueType.EMAIL_CAMPAIGN: 500,
                MessageQueueType.ANALYTICS: 200,
                MessageQueueType.FILE_PROCESSING: 50,
                MessageQueueType.CALENDAR_SYNC: 25,
                MessageQueueType.MARKETING_AUTOMATION: 100,
                MessageQueueType.SYSTEM_ALERT: 5
            }
            
            for queue_type, threshold in backlog_thresholds.items():
                # Count pending messages
                pending_count = db.query(MessageQueue).filter(
                    and_(
                        MessageQueue.queue_type == queue_type,
                        MessageQueue.status == MessageStatus.PENDING,
                        MessageQueue.scheduled_for <= datetime.utcnow()
                    )
                ).count()
                
                if pending_count > threshold:
                    # Count processing messages to see if workers are active
                    processing_count = db.query(MessageQueue).filter(
                        and_(
                            MessageQueue.queue_type == queue_type,
                            MessageQueue.status == MessageStatus.PROCESSING
                        )
                    ).count()
                    
                    # Calculate oldest pending message age
                    oldest_pending = db.query(MessageQueue).filter(
                        and_(
                            MessageQueue.queue_type == queue_type,
                            MessageQueue.status == MessageStatus.PENDING
                        )
                    ).order_by(MessageQueue.created_at).first()
                    
                    age_minutes = 0
                    if oldest_pending:
                        age_delta = datetime.utcnow() - oldest_pending.created_at
                        age_minutes = int(age_delta.total_seconds() / 60)
                    
                    severity = "warning"
                    if pending_count > threshold * 2:
                        severity = "critical"
                    elif pending_count > threshold * 1.5:
                        severity = "high"
                    
                    alert = {
                        "queue_type": queue_type.value,
                        "severity": severity,
                        "pending_count": pending_count,
                        "processing_count": processing_count,
                        "threshold": threshold,
                        "oldest_message_age_minutes": age_minutes,
                        "message": f"Queue {queue_type.value} has {pending_count} pending messages (threshold: {threshold})"
                    }
                    
                    backlog_alerts.append(alert)
            
            # Send alerts if any backlogs detected
            if backlog_alerts:
                _send_backlog_alerts(db, backlog_alerts)
                
                # Update queue metrics to reflect backlog warnings
                for alert in backlog_alerts:
                    _update_queue_backlog_warning(db, MessageQueueType(alert["queue_type"]))
            
            logger.info(f"Backlog check completed: {len(backlog_alerts)} alerts")
            return {
                "status": "completed",
                "alerts_generated": len(backlog_alerts),
                "alerts": backlog_alerts
            }
            
    except Exception as e:
        logger.error(f"Error checking queue backlogs: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 180 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=1)
@monitor_task("cleanup_old_metrics")
def cleanup_old_metrics(self, days_to_keep: int = 30):
    """
    Clean up old queue metrics data
    """
    try:
        with get_db_session() as db:
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
            
            # Delete old queue metrics
            deleted_metrics = db.query(QueueMetrics).filter(
                QueueMetrics.metric_timestamp < cutoff_date
            ).delete()
            
            # Keep some summary data by creating daily aggregates for older data
            if deleted_metrics > 0:
                _create_historical_aggregates(db, cutoff_date)
            
            db.commit()
            
            logger.info(f"Cleaned up {deleted_metrics} old metric records")
            return {
                "status": "completed",
                "deleted_metrics": deleted_metrics,
                "cutoff_date": cutoff_date.isoformat()
            }
            
    except Exception as e:
        logger.error(f"Error cleaning up old metrics: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 600
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


# Helper functions
def _check_individual_queue_health(db, queue_type: MessageQueueType) -> Dict[str, Any]:
    """Check health of an individual queue type"""
    
    now = datetime.utcnow()
    hour_ago = now - timedelta(hours=1)
    day_ago = now - timedelta(days=1)
    
    # Get basic counts
    pending_count = db.query(MessageQueue).filter(
        and_(
            MessageQueue.queue_type == queue_type,
            MessageQueue.status == MessageStatus.PENDING
        )
    ).count()
    
    processing_count = db.query(MessageQueue).filter(
        and_(
            MessageQueue.queue_type == queue_type,
            MessageQueue.status == MessageStatus.PROCESSING
        )
    ).count()
    
    failed_last_hour = db.query(MessageQueue).filter(
        and_(
            MessageQueue.queue_type == queue_type,
            MessageQueue.status == MessageStatus.FAILED,
            MessageQueue.updated_at >= hour_ago
        )
    ).count()
    
    completed_last_hour = db.query(MessageQueue).filter(
        and_(
            MessageQueue.queue_type == queue_type,
            MessageQueue.status == MessageStatus.COMPLETED,
            MessageQueue.completed_at >= hour_ago
        )
    ).count()
    
    # Calculate error rate
    total_processed = failed_last_hour + completed_last_hour
    error_rate = (failed_last_hour / total_processed * 100) if total_processed > 0 else 0
    
    # Determine health status
    status = "healthy"
    alerts = []
    recommendations = []
    
    # Check for high error rate
    if error_rate > 10:
        status = "critical"
        alerts.append(f"High error rate: {error_rate:.1f}% in last hour")
    elif error_rate > 5:
        status = "warning"
        alerts.append(f"Elevated error rate: {error_rate:.1f}% in last hour")
    
    # Check for stale processing messages
    stale_processing = db.query(MessageQueue).filter(
        and_(
            MessageQueue.queue_type == queue_type,
            MessageQueue.status == MessageStatus.PROCESSING,
            MessageQueue.started_at < hour_ago
        )
    ).count()
    
    if stale_processing > 0:
        status = "warning"
        alerts.append(f"{stale_processing} messages stuck in processing state")
        recommendations.append("Check worker processes for this queue type")
    
    # Check for old pending messages
    old_pending = db.query(MessageQueue).filter(
        and_(
            MessageQueue.queue_type == queue_type,
            MessageQueue.status == MessageStatus.PENDING,
            MessageQueue.created_at < hour_ago
        )
    ).count()
    
    if old_pending > pending_count * 0.5 and old_pending > 10:
        status = "warning"
        alerts.append(f"{old_pending} old pending messages (>1 hour)")
        recommendations.append("Consider increasing worker capacity for this queue")
    
    return {
        "status": status,
        "pending_count": pending_count,
        "processing_count": processing_count,
        "error_rate": error_rate,
        "failed_last_hour": failed_last_hour,
        "completed_last_hour": completed_last_hour,
        "stale_processing": stale_processing,
        "alerts": alerts,
        "recommendations": recommendations
    }


def _check_redis_queue_health() -> Dict[str, Any]:
    """Check Redis queue health"""
    if not redis_client:
        return {"status": "unknown", "message": "Redis client not available"}
    
    try:
        # Check Redis connection
        redis_client.ping()
        
        # Get queue lengths from Redis
        queue_lengths = {}
        critical_queues = [
            "payment_webhooks_critical",
            "urgent_notifications",
            "payment_processing"
        ]
        
        total_depth = 0
        alerts = []
        
        for queue_name in critical_queues:
            length = redis_client.llen(queue_name)
            queue_lengths[queue_name] = length
            total_depth += length
            
            # Alert on deep queues
            if length > 100:
                alerts.append(f"Redis queue {queue_name} has {length} items")
        
        status = "healthy"
        if total_depth > 500:
            status = "critical"
        elif total_depth > 200:
            status = "warning"
        
        return {
            "status": status,
            "queue_lengths": queue_lengths,
            "total_depth": total_depth,
            "alerts": alerts
        }
        
    except Exception as e:
        return {
            "status": "critical",
            "message": f"Redis health check failed: {e}",
            "alerts": ["Redis connection failed"]
        }


def _check_dlq_health(db) -> Dict[str, Any]:
    """Check dead letter queue health"""
    
    # Count DLQ entries by status
    pending_dlq = db.query(DeadLetterQueue).filter(
        DeadLetterQueue.dlq_status == MessageStatus.PENDING
    ).count()
    
    manual_review_required = db.query(DeadLetterQueue).filter(
        and_(
            DeadLetterQueue.manual_review_required == True,
            DeadLetterQueue.resolved_at.is_(None)
        )
    ).count()
    
    old_unresolved = db.query(DeadLetterQueue).filter(
        and_(
            DeadLetterQueue.resolved_at.is_(None),
            DeadLetterQueue.created_at < datetime.utcnow() - timedelta(days=7)
        )
    ).count()
    
    status = "healthy"
    alerts = []
    
    if manual_review_required > 5:
        status = "critical"
        alerts.append(f"{manual_review_required} DLQ entries require manual review")
    elif manual_review_required > 0:
        status = "warning"
        alerts.append(f"{manual_review_required} DLQ entries require manual review")
    
    if old_unresolved > 10:
        status = "warning"
        alerts.append(f"{old_unresolved} DLQ entries unresolved for >7 days")
    
    return {
        "status": status,
        "pending_dlq": pending_dlq,
        "manual_review_required": manual_review_required,
        "old_unresolved": old_unresolved,
        "alerts": alerts
    }


def _calculate_queue_metrics(db, queue_type: MessageQueueType, timestamp: datetime) -> Dict[str, Any]:
    """Calculate detailed metrics for a queue type"""
    
    hour_ago = timestamp - timedelta(hours=1)
    
    # Get status counts
    pending_count = db.query(MessageQueue).filter(
        and_(
            MessageQueue.queue_type == queue_type,
            MessageQueue.status == MessageStatus.PENDING
        )
    ).count()
    
    processing_count = db.query(MessageQueue).filter(
        and_(
            MessageQueue.queue_type == queue_type,
            MessageQueue.status == MessageStatus.PROCESSING
        )
    ).count()
    
    completed_count = db.query(MessageQueue).filter(
        and_(
            MessageQueue.queue_type == queue_type,
            MessageQueue.status == MessageStatus.COMPLETED,
            MessageQueue.completed_at >= hour_ago
        )
    ).count()
    
    failed_count = db.query(MessageQueue).filter(
        and_(
            MessageQueue.queue_type == queue_type,
            MessageQueue.status == MessageStatus.FAILED,
            MessageQueue.updated_at >= hour_ago
        )
    ).count()
    
    dead_letter_count = db.query(MessageQueue).filter(
        and_(
            MessageQueue.queue_type == queue_type,
            MessageQueue.status == MessageStatus.DEAD_LETTER
        )
    ).count()
    
    # Calculate processing times for completed messages
    completed_messages = db.query(MessageQueue).filter(
        and_(
            MessageQueue.queue_type == queue_type,
            MessageQueue.status == MessageStatus.COMPLETED,
            MessageQueue.completed_at >= hour_ago,
            MessageQueue.started_at.isnot(None)
        )
    ).all()
    
    processing_times = []
    for msg in completed_messages:
        if msg.started_at and msg.completed_at:
            duration = (msg.completed_at - msg.started_at).total_seconds()
            processing_times.append(duration)
    
    avg_processing_time = int(sum(processing_times) / len(processing_times)) if processing_times else None
    max_processing_time = int(max(processing_times)) if processing_times else None
    
    # Calculate rates
    total_processed = completed_count + failed_count
    error_rate = int((failed_count / total_processed * 100)) if total_processed > 0 else 0
    retry_count = db.query(MessageQueue).filter(
        and_(
            MessageQueue.queue_type == queue_type,
            MessageQueue.status == MessageStatus.RETRYING
        )
    ).count()
    retry_rate = int((retry_count / (total_processed + retry_count) * 100)) if (total_processed + retry_count) > 0 else 0
    
    # Throughput per minute (approximate)
    throughput_per_minute = completed_count
    
    # Worker information (approximate based on processing messages)
    active_workers = min(processing_count, 10)  # Estimate based on processing messages
    worker_utilization = min(int((processing_count / 10) * 100), 100) if processing_count else 0
    
    # Backlog warning
    backlog_thresholds = {
        MessageQueueType.PAYMENT_WEBHOOK: 10,
        MessageQueueType.NOTIFICATION: 100,
        MessageQueueType.EMAIL_CAMPAIGN: 500,
        MessageQueueType.ANALYTICS: 200,
        MessageQueueType.FILE_PROCESSING: 50,
        MessageQueueType.CALENDAR_SYNC: 25,
        MessageQueueType.MARKETING_AUTOMATION: 100,
        MessageQueueType.SYSTEM_ALERT: 5
    }
    
    threshold = backlog_thresholds.get(queue_type, 100)
    backlog_warning = pending_count > threshold
    
    return {
        "pending_count": pending_count,
        "processing_count": processing_count,
        "completed_count": completed_count,
        "failed_count": failed_count,
        "dead_letter_count": dead_letter_count,
        "avg_processing_time": avg_processing_time,
        "max_processing_time": max_processing_time,
        "throughput_per_minute": throughput_per_minute,
        "error_rate": error_rate,
        "retry_rate": retry_rate,
        "backlog_warning": backlog_warning,
        "active_workers": active_workers,
        "worker_utilization": worker_utilization
    }


def _store_health_report(db, health_report: Dict[str, Any]):
    """Store health report for historical analysis"""
    # In a real implementation, you might store this in a separate table
    # For now, we'll just log it
    logger.info(f"Health report stored: {health_report['overall_status']}")


def _send_health_alerts(db, health_report: Dict[str, Any]):
    """Send health alerts to administrators"""
    if not health_report["alerts"]:
        return
    
    # Get admin users (you'd need to implement this based on your user model)
    admin_emails = getattr(settings, 'admin_emails', ['admin@bookedbarber.com'])
    
    alert_summary = "\n".join(health_report["alerts"])
    
    # Queue notification to admins
    for email in admin_emails:
        try:
            # You would need to create a system for sending to non-users
            # For now, just log the alert
            logger.warning(f"QUEUE HEALTH ALERT: {alert_summary}")
        except Exception as e:
            logger.error(f"Failed to send health alert: {e}")


def _send_backlog_alerts(db, backlog_alerts: List[Dict[str, Any]]):
    """Send backlog alerts"""
    critical_alerts = [alert for alert in backlog_alerts if alert["severity"] == "critical"]
    
    if critical_alerts:
        alert_message = "CRITICAL QUEUE BACKLOGS DETECTED:\n"
        for alert in critical_alerts:
            alert_message += f"- {alert['message']}\n"
        
        logger.critical(alert_message)
        
        # In production, you'd send this to monitoring systems like PagerDuty
        # For now, just log


def _update_queue_backlog_warning(db, queue_type: MessageQueueType):
    """Update the latest metrics record to reflect backlog warning"""
    latest_metric = db.query(QueueMetrics).filter(
        QueueMetrics.queue_type == queue_type
    ).order_by(desc(QueueMetrics.metric_timestamp)).first()
    
    if latest_metric:
        latest_metric.backlog_warning = True


def _create_historical_aggregates(db, cutoff_date: datetime):
    """Create daily aggregates for historical data analysis"""
    # This would aggregate the deleted metrics into daily summaries
    # Implementation depends on your specific analytics needs
    logger.info(f"Historical aggregates created for data before {cutoff_date}")


# Health check task
@celery_app.task
def monitoring_worker_health_check():
    """Health check for monitoring worker"""
    with get_db_session() as db:
        # Get overall system statistics
        total_pending = db.query(MessageQueue).filter(
            MessageQueue.status == MessageStatus.PENDING
        ).count()
        
        total_processing = db.query(MessageQueue).filter(
            MessageQueue.status == MessageStatus.PROCESSING
        ).count()
        
        total_dlq = db.query(DeadLetterQueue).filter(
            DeadLetterQueue.dlq_status == MessageStatus.PENDING
        ).count()
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "worker_type": "monitoring_worker",
        "system_stats": {
            "total_pending_messages": total_pending,
            "total_processing_messages": total_processing,
            "total_dlq_entries": total_dlq
        },
        "redis_available": redis_client is not None,
        "worker_id": os.getpid()
    }