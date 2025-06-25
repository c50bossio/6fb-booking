"""
Payout System Monitoring and Alerting
Provides real-time monitoring, alerting, and performance tracking
"""

import os
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from decimal import Decimal
from collections import defaultdict, deque
import asyncio
import aioredis
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from config.database import get_db
from config.celery_config import celery_app
from models.barber_payment import BarberPayment, PayoutStatus
from models.payout_schedule import PayoutSchedule
from services.notification_service import NotificationService
from utils.logging import get_logger

logger = get_logger(__name__)

# Prometheus metrics
payout_counter = Counter(
    "payout_jobs_total",
    "Total number of payout jobs processed",
    ["status", "payment_method"],
)

payout_amount = Histogram(
    "payout_amount_dollars",
    "Payout amounts in dollars",
    buckets=(10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000),
)

payout_duration = Histogram(
    "payout_processing_duration_seconds",
    "Time taken to process payouts",
    buckets=(1, 5, 10, 30, 60, 120, 300, 600, 1200),
)

active_workers = Gauge("celery_active_workers", "Number of active Celery workers")

queue_depth = Gauge("celery_queue_depth", "Number of tasks in queue", ["queue_name"])

failed_payouts = Gauge("failed_payouts_count", "Number of failed payouts in last hour")

system_health = Gauge("payout_system_health", "Overall system health score (0-100)")


class PayoutMonitor:
    """Real-time monitoring for payout processing system"""

    def __init__(self):
        self.notification_service = NotificationService()
        self.alert_thresholds = {
            "failed_payout_rate": 0.05,  # 5% failure rate
            "processing_time_p95": 300,  # 5 minutes
            "queue_depth_max": 1000,
            "worker_min_count": 1,
            "consecutive_failures": 3,
            "stuck_payment_hours": 2,
        }
        self.metrics_buffer = defaultdict(lambda: deque(maxlen=1000))
        self.alert_cooldowns = {}
        self.redis_client = None

    async def init_redis(self):
        """Initialize Redis connection for real-time metrics"""
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis_client = await aioredis.create_redis_pool(redis_url)

    async def close_redis(self):
        """Close Redis connection"""
        if self.redis_client:
            self.redis_client.close()
            await self.redis_client.wait_closed()

    async def collect_metrics(self):
        """Collect all system metrics"""
        db = next(get_db())

        try:
            metrics = {
                "timestamp": datetime.utcnow().isoformat(),
                "workers": await self._get_worker_metrics(),
                "queues": await self._get_queue_metrics(),
                "payouts": self._get_payout_metrics(db),
                "performance": await self._get_performance_metrics(),
                "errors": self._get_error_metrics(db),
                "health_score": 100,  # Will be calculated
            }

            # Calculate health score
            metrics["health_score"] = self._calculate_health_score(metrics)

            # Update Prometheus metrics
            self._update_prometheus_metrics(metrics)

            # Store in Redis for real-time access
            await self._store_metrics(metrics)

            # Check for alerts
            await self._check_alerts(metrics)

            return metrics

        except Exception as e:
            logger.error(f"Error collecting metrics: {str(e)}")
            raise
        finally:
            db.close()

    async def _get_worker_metrics(self) -> Dict[str, Any]:
        """Get Celery worker metrics"""
        try:
            inspect = celery_app.control.inspect()

            # Get worker stats
            stats = inspect.stats()
            active_workers_count = len(stats) if stats else 0

            # Get active tasks
            active = inspect.active()
            active_tasks = sum(len(tasks) for tasks in active.values()) if active else 0

            # Get registered tasks
            registered = inspect.registered()
            registered_count = (
                sum(len(tasks) for tasks in registered.values()) if registered else 0
            )

            # Update Prometheus gauge
            active_workers.set(active_workers_count)

            worker_details = []
            if stats:
                for worker_name, worker_stats in stats.items():
                    worker_details.append(
                        {
                            "name": worker_name,
                            "pool": worker_stats.get("pool", {}).get(
                                "implementation", "unknown"
                            ),
                            "concurrency": worker_stats.get("pool", {}).get(
                                "max-concurrency", 0
                            ),
                            "total_tasks": worker_stats.get("total", {}),
                        }
                    )

            return {
                "count": active_workers_count,
                "active_tasks": active_tasks,
                "registered_tasks": registered_count,
                "details": worker_details,
            }

        except Exception as e:
            logger.error(f"Error getting worker metrics: {str(e)}")
            return {
                "count": 0,
                "active_tasks": 0,
                "registered_tasks": 0,
                "details": [],
                "error": str(e),
            }

    async def _get_queue_metrics(self) -> Dict[str, Any]:
        """Get queue depth and latency metrics"""
        try:
            queue_metrics = {}

            for queue_name in ["default", "payouts", "high_priority", "low_priority"]:
                if self.redis_client:
                    queue_key = f"celery:{queue_name}"
                    depth = await self.redis_client.llen(queue_key)

                    # Update Prometheus gauge
                    queue_depth.labels(queue_name=queue_name).set(depth)

                    # Get oldest task timestamp for latency calculation
                    oldest_task = await self.redis_client.lindex(queue_key, -1)
                    latency = None
                    if oldest_task:
                        try:
                            task_data = json.loads(oldest_task)
                            if "timestamp" in task_data:
                                task_time = datetime.fromisoformat(
                                    task_data["timestamp"]
                                )
                                latency = (
                                    datetime.utcnow() - task_time
                                ).total_seconds()
                        except:
                            pass

                    queue_metrics[queue_name] = {
                        "depth": depth,
                        "latency_seconds": latency,
                    }

            return queue_metrics

        except Exception as e:
            logger.error(f"Error getting queue metrics: {str(e)}")
            return {}

    def _get_payout_metrics(self, db: Session) -> Dict[str, Any]:
        """Get payout processing metrics"""
        try:
            # Last hour metrics
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)

            # Count by status
            status_counts = (
                db.query(
                    BarberPayment.status, func.count(BarberPayment.id).label("count")
                )
                .filter(BarberPayment.created_at >= one_hour_ago)
                .group_by(BarberPayment.status)
                .all()
            )

            status_dict = {
                "completed": 0,
                "failed": 0,
                "pending": 0,
            }

            for status, count in status_counts:
                if status == PayoutStatus.COMPLETED:
                    status_dict["completed"] = count
                elif status == PayoutStatus.FAILED:
                    status_dict["failed"] = count
                elif status == PayoutStatus.PENDING:
                    status_dict["pending"] = count

            # Calculate rates
            total = sum(status_dict.values())
            success_rate = (status_dict["completed"] / total * 100) if total > 0 else 0
            failure_rate = (status_dict["failed"] / total * 100) if total > 0 else 0

            # Update Prometheus gauge
            failed_payouts.set(status_dict["failed"])

            # Get amount statistics
            amount_stats = (
                db.query(
                    func.sum(BarberPayment.amount).label("total"),
                    func.avg(BarberPayment.amount).label("average"),
                    func.min(BarberPayment.amount).label("min"),
                    func.max(BarberPayment.amount).label("max"),
                )
                .filter(
                    BarberPayment.created_at >= one_hour_ago,
                    BarberPayment.status == PayoutStatus.COMPLETED,
                )
                .first()
            )

            # Get processing time statistics
            processing_times = (
                db.query(
                    func.extract(
                        "epoch", BarberPayment.completed_date - BarberPayment.created_at
                    ).label("duration")
                )
                .filter(
                    BarberPayment.created_at >= one_hour_ago,
                    BarberPayment.status == PayoutStatus.COMPLETED,
                    BarberPayment.completed_date.isnot(None),
                )
                .all()
            )

            durations = [float(t.duration) for t in processing_times if t.duration]
            avg_duration = sum(durations) / len(durations) if durations else 0

            return {
                "last_hour": {
                    "total": total,
                    "completed": status_dict["completed"],
                    "failed": status_dict["failed"],
                    "pending": status_dict["pending"],
                    "success_rate": success_rate,
                    "failure_rate": failure_rate,
                },
                "amounts": {
                    "total": float(amount_stats.total or 0),
                    "average": float(amount_stats.average or 0),
                    "min": float(amount_stats.min or 0),
                    "max": float(amount_stats.max or 0),
                },
                "processing_time": {
                    "average_seconds": avg_duration,
                    "sample_count": len(durations),
                },
            }

        except Exception as e:
            logger.error(f"Error getting payout metrics: {str(e)}")
            return {}

    async def _get_performance_metrics(self) -> Dict[str, Any]:
        """Get system performance metrics"""
        try:
            # Get CPU and memory usage from workers
            inspect = celery_app.control.inspect()
            stats = inspect.stats()

            total_cpu = 0
            total_memory = 0
            worker_count = 0

            if stats:
                for worker_stats in stats.values():
                    if "rusage" in worker_stats:
                        rusage = worker_stats["rusage"]
                        total_cpu += rusage.get("utime", 0) + rusage.get("stime", 0)
                        total_memory += rusage.get("maxrss", 0)
                        worker_count += 1

            avg_cpu = total_cpu / worker_count if worker_count > 0 else 0
            avg_memory = total_memory / worker_count if worker_count > 0 else 0

            return {
                "cpu": {
                    "average_usage": avg_cpu,
                    "total_usage": total_cpu,
                },
                "memory": {
                    "average_mb": avg_memory / 1024,  # Convert to MB
                    "total_mb": total_memory / 1024,
                },
                "worker_count": worker_count,
            }

        except Exception as e:
            logger.error(f"Error getting performance metrics: {str(e)}")
            return {}

    def _get_error_metrics(self, db: Session) -> Dict[str, Any]:
        """Get error and failure metrics"""
        try:
            # Get recent errors
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)

            # Group errors by type
            error_groups = (
                db.query(
                    BarberPayment.error_message,
                    func.count(BarberPayment.id).label("count"),
                )
                .filter(
                    BarberPayment.created_at >= one_hour_ago,
                    BarberPayment.status == PayoutStatus.FAILED,
                    BarberPayment.error_message.isnot(None),
                )
                .group_by(BarberPayment.error_message)
                .all()
            )

            # Get barbers with consecutive failures
            problem_schedules = (
                db.query(PayoutSchedule)
                .filter(
                    PayoutSchedule.consecutive_failures
                    >= self.alert_thresholds["consecutive_failures"]
                )
                .all()
            )

            # Get stuck payments
            stuck_threshold = datetime.utcnow() - timedelta(
                hours=self.alert_thresholds["stuck_payment_hours"]
            )
            stuck_payments = (
                db.query(func.count(BarberPayment.id))
                .filter(
                    BarberPayment.status == PayoutStatus.PENDING,
                    BarberPayment.created_at < stuck_threshold,
                )
                .scalar()
            )

            return {
                "error_types": [
                    {"error": error or "Unknown", "count": count}
                    for error, count in error_groups
                ],
                "problem_schedules": len(problem_schedules),
                "stuck_payments": stuck_payments,
            }

        except Exception as e:
            logger.error(f"Error getting error metrics: {str(e)}")
            return {}

    def _calculate_health_score(self, metrics: Dict[str, Any]) -> float:
        """Calculate overall system health score (0-100)"""
        score = 100.0

        # Worker health (25 points)
        if metrics["workers"]["count"] < self.alert_thresholds["worker_min_count"]:
            score -= 25
        elif metrics["workers"]["count"] < 2:
            score -= 10

        # Queue health (25 points)
        for queue_name, queue_data in metrics.get("queues", {}).items():
            if queue_data.get("depth", 0) > self.alert_thresholds["queue_depth_max"]:
                score -= 10
            elif queue_data.get("depth", 0) > 500:
                score -= 5

        # Payout success rate (25 points)
        failure_rate = (
            metrics.get("payouts", {}).get("last_hour", {}).get("failure_rate", 0)
        )
        if failure_rate > self.alert_thresholds["failed_payout_rate"] * 100:
            score -= 25
        elif failure_rate > 2:
            score -= 10

        # Error metrics (25 points)
        if metrics.get("errors", {}).get("stuck_payments", 0) > 0:
            score -= 15
        if metrics.get("errors", {}).get("problem_schedules", 0) > 0:
            score -= 10

        # Update Prometheus gauge
        system_health.set(max(0, score))

        return max(0, score)

    def _update_prometheus_metrics(self, metrics: Dict[str, Any]):
        """Update Prometheus metrics from collected data"""
        # This is already done in individual collection methods
        pass

    async def _store_metrics(self, metrics: Dict[str, Any]):
        """Store metrics in Redis for real-time access"""
        if self.redis_client:
            try:
                # Store current metrics
                await self.redis_client.setex(
                    "payout:metrics:current",
                    300,  # 5 minute TTL
                    json.dumps(metrics, default=str),
                )

                # Add to time series
                timestamp = int(datetime.utcnow().timestamp())
                await self.redis_client.zadd(
                    "payout:metrics:history",
                    timestamp,
                    json.dumps(metrics, default=str),
                )

                # Trim old entries (keep last 24 hours)
                cutoff = timestamp - 86400
                await self.redis_client.zremrangebyscore(
                    "payout:metrics:history", 0, cutoff
                )

            except Exception as e:
                logger.error(f"Error storing metrics in Redis: {str(e)}")

    async def _check_alerts(self, metrics: Dict[str, Any]):
        """Check metrics against thresholds and send alerts"""
        alerts = []

        # Check worker count
        if metrics["workers"]["count"] < self.alert_thresholds["worker_min_count"]:
            alerts.append(
                {
                    "type": "low_worker_count",
                    "severity": "critical",
                    "message": f"Only {metrics['workers']['count']} workers active",
                }
            )

        # Check failure rate
        failure_rate = (
            metrics.get("payouts", {}).get("last_hour", {}).get("failure_rate", 0)
        )
        if failure_rate > self.alert_thresholds["failed_payout_rate"] * 100:
            alerts.append(
                {
                    "type": "high_failure_rate",
                    "severity": "high",
                    "message": f"Payout failure rate is {failure_rate:.1f}%",
                }
            )

        # Check queue depth
        for queue_name, queue_data in metrics.get("queues", {}).items():
            if queue_data.get("depth", 0) > self.alert_thresholds["queue_depth_max"]:
                alerts.append(
                    {
                        "type": "high_queue_depth",
                        "severity": "medium",
                        "message": f"{queue_name} queue has {queue_data['depth']} tasks",
                    }
                )

        # Check stuck payments
        stuck_count = metrics.get("errors", {}).get("stuck_payments", 0)
        if stuck_count > 0:
            alerts.append(
                {
                    "type": "stuck_payments",
                    "severity": "high",
                    "message": f"{stuck_count} payments stuck for over 2 hours",
                }
            )

        # Check system health
        health_score = metrics.get("health_score", 100)
        if health_score < 50:
            alerts.append(
                {
                    "type": "low_health_score",
                    "severity": "critical",
                    "message": f"System health score is {health_score}/100",
                }
            )
        elif health_score < 75:
            alerts.append(
                {
                    "type": "degraded_health",
                    "severity": "medium",
                    "message": f"System health degraded: {health_score}/100",
                }
            )

        # Send alerts with cooldown
        for alert in alerts:
            await self._send_alert(alert)

    async def _send_alert(self, alert: Dict[str, Any]):
        """Send alert with cooldown to prevent spam"""
        alert_key = f"{alert['type']}:{alert['severity']}"
        now = datetime.utcnow()

        # Check cooldown (1 hour for same alert)
        if alert_key in self.alert_cooldowns:
            last_sent = self.alert_cooldowns[alert_key]
            if (now - last_sent) < timedelta(hours=1):
                return

        # Send alert
        try:
            self.notification_service.send_alert(
                alert_type=alert["type"],
                severity=alert["severity"],
                details={
                    "message": alert["message"],
                    "timestamp": now.isoformat(),
                },
            )

            # Update cooldown
            self.alert_cooldowns[alert_key] = now

            logger.warning(f"Alert sent: {alert['type']} - {alert['message']}")

        except Exception as e:
            logger.error(f"Error sending alert: {str(e)}")

    async def get_dashboard_data(self) -> Dict[str, Any]:
        """Get formatted data for monitoring dashboard"""
        if self.redis_client:
            try:
                # Get current metrics
                current = await self.redis_client.get("payout:metrics:current")
                if current:
                    current_metrics = json.loads(current)
                else:
                    current_metrics = await self.collect_metrics()

                # Get historical data for charts
                history_data = await self.redis_client.zrangebyscore(
                    "payout:metrics:history",
                    int((datetime.utcnow() - timedelta(hours=24)).timestamp()),
                    int(datetime.utcnow().timestamp()),
                )

                history = []
                for data in history_data:
                    try:
                        history.append(json.loads(data))
                    except:
                        pass

                return {
                    "current": current_metrics,
                    "history": history,
                    "alerts": list(self.alert_cooldowns.keys()),
                }

            except Exception as e:
                logger.error(f"Error getting dashboard data: {str(e)}")
                return {}

        return {}


# Monitoring loop for continuous metric collection
async def monitoring_loop():
    """Main monitoring loop that runs continuously"""
    monitor = PayoutMonitor()
    await monitor.init_redis()

    try:
        while True:
            try:
                # Collect metrics every 30 seconds
                await monitor.collect_metrics()
                await asyncio.sleep(30)

            except Exception as e:
                logger.error(f"Error in monitoring loop: {str(e)}")
                await asyncio.sleep(60)  # Wait longer on error

    finally:
        await monitor.close_redis()


# Prometheus metrics endpoint
def get_prometheus_metrics():
    """Generate Prometheus metrics in text format"""
    return generate_latest()


if __name__ == "__main__":
    # Run monitoring loop
    asyncio.run(monitoring_loop())
