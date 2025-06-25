"""
Celery Configuration for Background Jobs
Handles all async task processing including payout automation
"""

import os
from datetime import timedelta
from celery import Celery
from celery.schedules import crontab
from kombu import Exchange, Queue
from dotenv import load_dotenv

load_dotenv()

# Broker settings
broker_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
result_backend = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Task settings
task_serializer = "json"
result_serializer = "json"
accept_content = ["json"]
timezone = "UTC"
enable_utc = True

# Task execution settings
task_acks_late = True  # Tasks acknowledged after completion
task_reject_on_worker_lost = True
task_track_started = True
task_time_limit = 600  # 10 minutes hard limit
task_soft_time_limit = 540  # 9 minutes soft limit
task_max_retries = 3
task_default_retry_delay = 60  # 1 minute

# Result backend settings
result_expires = 3600  # Results expire after 1 hour
result_persistent = True
result_compression = "gzip"

# Worker settings
worker_prefetch_multiplier = 4
worker_max_tasks_per_child = 1000  # Restart worker after 1000 tasks
worker_disable_rate_limits = False
worker_send_task_events = True

# Queue configuration
task_default_queue = "default"
task_default_exchange = "default"
task_default_routing_key = "default"

# Define queues with different priorities
task_queues = (
    # High priority queue for critical tasks
    Queue(
        "high_priority",
        Exchange("high_priority"),
        routing_key="high_priority",
        queue_arguments={
            "x-max-priority": 10,
            "x-message-ttl": 3600000,  # 1 hour TTL
        },
    ),
    # Default queue for regular tasks
    Queue(
        "default",
        Exchange("default"),
        routing_key="default",
        queue_arguments={
            "x-max-priority": 5,
            "x-message-ttl": 7200000,  # 2 hour TTL
        },
    ),
    # Low priority queue for batch processing
    Queue(
        "low_priority",
        Exchange("low_priority"),
        routing_key="low_priority",
        queue_arguments={
            "x-max-priority": 1,
            "x-message-ttl": 14400000,  # 4 hour TTL
        },
    ),
    # Dedicated queue for payout processing
    Queue(
        "payouts",
        Exchange("payouts"),
        routing_key="payouts",
        queue_arguments={
            "x-max-priority": 8,
            "x-message-ttl": 3600000,  # 1 hour TTL
        },
    ),
)

# Route specific tasks to specific queues
task_routes = {
    "tasks.payout_jobs.process_single_payout": {"queue": "payouts", "priority": 8},
    "tasks.payout_jobs.process_daily_payouts": {"queue": "payouts", "priority": 7},
    "tasks.payout_jobs.retry_failed_payout": {"queue": "payouts", "priority": 9},
    "tasks.payout_jobs.generate_payout_report": {
        "queue": "low_priority",
        "priority": 2,
    },
    "tasks.payout_jobs.cleanup_old_payout_logs": {
        "queue": "low_priority",
        "priority": 1,
    },
}

# Beat schedule for periodic tasks
beat_schedule = {
    # Check for due payouts every day at 9 AM UTC
    "daily-payout-check": {
        "task": "tasks.payout_jobs.process_daily_payouts",
        "schedule": crontab(hour=9, minute=0),
        "options": {"queue": "payouts", "priority": 7},
    },
    # Retry failed payouts every hour
    "retry-failed-payouts": {
        "task": "tasks.payout_jobs.retry_failed_payouts",
        "schedule": crontab(minute=0),
        "options": {"queue": "payouts", "priority": 9},
    },
    # Generate payout reports daily at midnight
    "daily-payout-report": {
        "task": "tasks.payout_jobs.generate_payout_report",
        "schedule": crontab(hour=0, minute=0),
        "options": {"queue": "low_priority", "priority": 2},
    },
    # Cleanup old logs weekly
    "weekly-log-cleanup": {
        "task": "tasks.payout_jobs.cleanup_old_payout_logs",
        "schedule": crontab(hour=2, minute=0, day_of_week=0),  # Sunday 2 AM
        "options": {"queue": "low_priority", "priority": 1},
    },
    # Health check every 5 minutes
    "payout-system-health-check": {
        "task": "tasks.payout_jobs.health_check",
        "schedule": crontab(minute="*/5"),
        "options": {"queue": "high_priority", "priority": 10},
    },
}

# Monitoring and alerting
worker_hijacking_timeout = 1800  # 30 minutes
worker_log_format = "[%(asctime)s: %(levelname)s/%(processName)s] %(message)s"
worker_task_log_format = "[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s"

# Error handling
task_annotations = {
    "*": {
        "rate_limit": "100/m",  # Default rate limit
        "time_limit": 600,
        "soft_time_limit": 540,
    },
    "tasks.payout_jobs.process_single_payout": {
        "rate_limit": "50/m",  # More restrictive for payment processing
        "time_limit": 300,
        "soft_time_limit": 270,
        "max_retries": 5,
        "default_retry_delay": 120,
    },
}


# Celery app configuration
def create_celery_app():
    """Create and configure Celery application"""
    app = Celery("sixfb_payout_system")

    # Update configuration
    app.conf.update(
        broker_url=broker_url,
        result_backend=result_backend,
        task_serializer=task_serializer,
        result_serializer=result_serializer,
        accept_content=accept_content,
        timezone=timezone,
        enable_utc=enable_utc,
        task_acks_late=task_acks_late,
        task_reject_on_worker_lost=task_reject_on_worker_lost,
        task_track_started=task_track_started,
        task_time_limit=task_time_limit,
        task_soft_time_limit=task_soft_time_limit,
        task_max_retries=task_max_retries,
        task_default_retry_delay=task_default_retry_delay,
        result_expires=result_expires,
        result_persistent=result_persistent,
        result_compression=result_compression,
        worker_prefetch_multiplier=worker_prefetch_multiplier,
        worker_max_tasks_per_child=worker_max_tasks_per_child,
        worker_disable_rate_limits=worker_disable_rate_limits,
        worker_send_task_events=worker_send_task_events,
        task_default_queue=task_default_queue,
        task_default_exchange=task_default_exchange,
        task_default_routing_key=task_default_routing_key,
        task_queues=task_queues,
        task_routes=task_routes,
        beat_schedule=beat_schedule,
        worker_hijacking_timeout=worker_hijacking_timeout,
        worker_log_format=worker_log_format,
        worker_task_log_format=worker_task_log_format,
        task_annotations=task_annotations,
    )

    # Configure Sentry integration if available
    if os.getenv("SENTRY_DSN"):
        import sentry_sdk
        from sentry_sdk.integrations.celery import CeleryIntegration

        sentry_sdk.init(
            dsn=os.getenv("SENTRY_DSN"),
            integrations=[CeleryIntegration()],
            traces_sample_rate=0.1,
        )

    return app


# Create the Celery app instance
celery_app = create_celery_app()
