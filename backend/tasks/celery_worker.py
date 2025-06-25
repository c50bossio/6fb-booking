"""
Celery Worker Management
Handles worker configuration and monitoring
"""

import os
import sys
import signal
import logging
from datetime import datetime
from multiprocessing import cpu_count

from celery import Celery, Task
from celery.signals import (
    worker_ready,
    worker_shutdown,
    task_prerun,
    task_postrun,
    task_failure,
    task_retry,
    celeryd_after_setup,
)

from config.celery_config import celery_app
from services.monitoring_service import MonitoringService
from utils.logging import get_logger

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = get_logger(__name__)
monitoring_service = MonitoringService()


class WorkerManager:
    """Manages Celery worker lifecycle and configuration"""

    def __init__(self):
        self.worker_id = None
        self.start_time = None
        self.task_count = 0
        self.error_count = 0

    def configure_worker(self, worker_name: str = None):
        """Configure worker with optimal settings"""

        # Determine worker configuration based on queue
        if worker_name and "payout" in worker_name:
            # Payout workers need more careful resource management
            concurrency = min(cpu_count() // 2, 4)
            max_tasks_per_child = 100
            prefetch_multiplier = 1
        else:
            # Default workers can be more aggressive
            concurrency = cpu_count()
            max_tasks_per_child = 1000
            prefetch_multiplier = 4

        worker_config = {
            "concurrency": concurrency,
            "max_tasks_per_child": max_tasks_per_child,
            "prefetch_multiplier": prefetch_multiplier,
            "task_events": True,
            "send_events": True,
            "worker_hijacking_timeout": 1800,
            "task_time_limit": 600,
            "task_soft_time_limit": 540,
        }

        logger.info(f"Worker configuration: {worker_config}")
        return worker_config

    def setup_signal_handlers(self):
        """Setup graceful shutdown handlers"""

        def graceful_shutdown(signum, frame):
            logger.info(f"Received signal {signum}, initiating graceful shutdown")
            monitoring_service.send_alert(
                alert_type="worker_shutdown",
                severity="info",
                details={
                    "worker_id": self.worker_id,
                    "signal": signum,
                    "task_count": self.task_count,
                    "uptime": (
                        (datetime.utcnow() - self.start_time).total_seconds()
                        if self.start_time
                        else 0
                    ),
                },
            )
            sys.exit(0)

        signal.signal(signal.SIGTERM, graceful_shutdown)
        signal.signal(signal.SIGINT, graceful_shutdown)


# Worker lifecycle signals
@worker_ready.connect
def on_worker_ready(sender=None, **kwargs):
    """Called when worker is ready to accept tasks"""
    worker_manager.worker_id = sender.hostname
    worker_manager.start_time = datetime.utcnow()

    logger.info(f"Worker {sender.hostname} ready to accept tasks")

    monitoring_service.record_event(
        event_type="worker_started",
        details={
            "worker_id": sender.hostname,
            "start_time": worker_manager.start_time.isoformat(),
            "concurrency": sender.concurrency,
        },
    )


@worker_shutdown.connect
def on_worker_shutdown(sender=None, **kwargs):
    """Called when worker is shutting down"""
    if worker_manager.start_time:
        uptime = (datetime.utcnow() - worker_manager.start_time).total_seconds()
    else:
        uptime = 0

    logger.info(
        f"Worker {sender.hostname} shutting down. "
        f"Processed {worker_manager.task_count} tasks with {worker_manager.error_count} errors. "
        f"Uptime: {uptime:.2f} seconds"
    )

    monitoring_service.record_event(
        event_type="worker_stopped",
        details={
            "worker_id": sender.hostname,
            "task_count": worker_manager.task_count,
            "error_count": worker_manager.error_count,
            "uptime": uptime,
        },
    )


@celeryd_after_setup.connect
def on_celeryd_after_setup(sender=None, instance=None, **kwargs):
    """Called after worker has been setup"""
    logger.info(f"Worker setup complete: {instance.hostname}")

    # Configure worker-specific settings
    if "payout" in instance.hostname:
        # Payout workers should be more conservative
        instance.pool.putlocks = True
        instance.consumer.qos.update(prefetch_count=1)


# Task lifecycle signals
@task_prerun.connect
def on_task_prerun(sender=None, task_id=None, task=None, args=None, kwargs=None, **kw):
    """Called before task execution"""
    worker_manager.task_count += 1

    logger.info(
        f"Starting task {task.name}[{task_id}]",
        extra={
            "task_name": task.name,
            "task_id": task_id,
            "worker_id": worker_manager.worker_id,
        },
    )

    # Store task start time for performance tracking
    task.request.start_time = datetime.utcnow()


@task_postrun.connect
def on_task_postrun(
    sender=None,
    task_id=None,
    task=None,
    args=None,
    kwargs=None,
    retval=None,
    state=None,
    **kw,
):
    """Called after task execution"""
    # Calculate execution time
    if hasattr(task.request, "start_time"):
        execution_time = (datetime.utcnow() - task.request.start_time).total_seconds()
    else:
        execution_time = 0

    logger.info(
        f"Completed task {task.name}[{task_id}] in {execution_time:.2f}s",
        extra={
            "task_name": task.name,
            "task_id": task_id,
            "state": state,
            "execution_time": execution_time,
            "worker_id": worker_manager.worker_id,
        },
    )

    # Record performance metrics
    monitoring_service.record_metric(
        metric_name="celery_task_duration",
        value=execution_time,
        tags={
            "task_name": task.name,
            "state": state,
            "worker_id": worker_manager.worker_id,
        },
    )


@task_failure.connect
def on_task_failure(
    sender=None,
    task_id=None,
    exception=None,
    args=None,
    kwargs=None,
    traceback=None,
    einfo=None,
    **kw,
):
    """Called when task fails"""
    worker_manager.error_count += 1

    logger.error(
        f"Task {sender.name}[{task_id}] failed: {exception}",
        extra={
            "task_name": sender.name,
            "task_id": task_id,
            "exception": str(exception),
            "exception_type": type(exception).__name__,
            "worker_id": worker_manager.worker_id,
        },
    )

    # Send alert for critical task failures
    if "payout" in sender.name.lower():
        monitoring_service.send_alert(
            alert_type="payout_task_failure",
            severity="high",
            details={
                "task_name": sender.name,
                "task_id": task_id,
                "exception": str(exception),
                "worker_id": worker_manager.worker_id,
            },
        )

    # Record error metrics
    monitoring_service.record_metric(
        metric_name="celery_task_failures",
        value=1,
        tags={
            "task_name": sender.name,
            "exception_type": type(exception).__name__,
            "worker_id": worker_manager.worker_id,
        },
    )


@task_retry.connect
def on_task_retry(sender=None, task_id=None, reason=None, einfo=None, **kw):
    """Called when task is retried"""
    logger.warning(
        f"Task {sender.name}[{task_id}] retrying: {reason}",
        extra={
            "task_name": sender.name,
            "task_id": task_id,
            "retry_reason": str(reason),
            "retry_count": sender.request.retries,
            "worker_id": worker_manager.worker_id,
        },
    )

    # Record retry metrics
    monitoring_service.record_metric(
        metric_name="celery_task_retries",
        value=1,
        tags={
            "task_name": sender.name,
            "retry_count": sender.request.retries,
            "worker_id": worker_manager.worker_id,
        },
    )


# Create global worker manager instance
worker_manager = WorkerManager()


def start_worker(queues: list = None, worker_name: str = None):
    """Start a Celery worker with specified configuration"""

    # Setup signal handlers
    worker_manager.setup_signal_handlers()

    # Get worker configuration
    config = worker_manager.configure_worker(worker_name)

    # Set default queues if not specified
    if not queues:
        queues = ["default", "payouts", "high_priority", "low_priority"]

    # Configure worker arguments
    worker_args = [
        "worker",
        "--loglevel=info",
        f"--concurrency={config['concurrency']}",
        f"--max-tasks-per-child={config['max_tasks_per_child']}",
        f"--prefetch-multiplier={config['prefetch_multiplier']}",
        "--events",
        f"--queues={','.join(queues)}",
    ]

    if worker_name:
        worker_args.append(f"--hostname={worker_name}@%h")

    logger.info(f"Starting worker with args: {worker_args}")

    # Start the worker
    celery_app.worker_main(argv=worker_args)


def start_beat_scheduler():
    """Start the Celery beat scheduler for periodic tasks"""

    logger.info("Starting Celery beat scheduler")

    beat_args = [
        "beat",
        "--loglevel=info",
        "--scheduler=celery.beat:PersistentScheduler",
        "--pidfile=/tmp/celerybeat.pid",
    ]

    # If using Redis, use RedBeat for better reliability
    if "redis" in celery_app.conf.broker_url:
        try:
            from redbeat import RedBeatScheduler

            beat_args[2] = "--scheduler=redbeat.RedBeatScheduler"
            logger.info("Using RedBeat scheduler for better reliability")
        except ImportError:
            logger.warning("RedBeat not available, using default scheduler")

    celery_app.start(argv=beat_args)


def start_flower_monitor(port: int = 5555):
    """Start Flower monitoring dashboard"""

    logger.info(f"Starting Flower monitor on port {port}")

    flower_args = [
        "flower",
        f"--port={port}",
        "--persistent=True",
        "--db=/tmp/flower.db",
        "--max_tasks=10000",
        "--basic_auth=admin:secure_password",  # Change in production
    ]

    celery_app.start(argv=flower_args)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Celery Worker Management")
    parser.add_argument(
        "--type",
        choices=["worker", "beat", "flower"],
        default="worker",
        help="Type of process to start",
    )
    parser.add_argument(
        "--queues",
        nargs="+",
        help="Queues for worker to consume from",
    )
    parser.add_argument(
        "--name",
        help="Worker name",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=5555,
        help="Port for Flower monitor",
    )

    args = parser.parse_args()

    if args.type == "worker":
        start_worker(queues=args.queues, worker_name=args.name)
    elif args.type == "beat":
        start_beat_scheduler()
    elif args.type == "flower":
        start_flower_monitor(port=args.port)
