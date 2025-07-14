"""
Celery application configuration for BookedBarber V2.
Handles background tasks like notifications, data processing, and scheduled jobs.
"""

import os
import logging
from celery import Celery
from celery.schedules import crontab
from kombu import Queue

from config import settings

logger = logging.getLogger(__name__)

# Create Celery application
celery_app = Celery(
    "bookedbarber_v2",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "services.background_tasks.notification_tasks",
        "services.background_tasks.data_processing_tasks",
        "services.background_tasks.maintenance_tasks",
        "services.background_tasks.marketing_tasks"
    ]
)

# Celery configuration
celery_app.conf.update(
    # Task routing
    task_routes={
        'services.background_tasks.notification_tasks.*': {'queue': 'notifications'},
        'services.background_tasks.data_processing_tasks.*': {'queue': 'data_processing'},
        'services.background_tasks.maintenance_tasks.*': {'queue': 'maintenance'},
        'services.background_tasks.marketing_tasks.*': {'queue': 'marketing'},
    },
    
    # Queue configuration
    task_create_missing_queues=True,
    task_default_queue='default',
    task_queues=(
        Queue('default', routing_key='default'),
        Queue('notifications', routing_key='notifications'),
        Queue('data_processing', routing_key='data_processing'),
        Queue('maintenance', routing_key='maintenance'),
        Queue('marketing', routing_key='marketing'),
        Queue('high_priority', routing_key='high_priority'),
    ),
    
    # Task execution settings
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Worker settings
    worker_prefetch_multiplier=1,  # Ensure fair distribution
    task_acks_late=True,           # Acknowledge after completion
    worker_disable_rate_limits=False,
    
    # Task result settings
    result_expires=3600,           # Results expire after 1 hour
    result_persistent=True,        # Persist results to Redis
    
    # Retry settings
    task_default_retry_delay=60,   # Retry after 60 seconds
    task_max_retries=3,            # Maximum 3 retries
    
    # Error handling
    task_reject_on_worker_lost=True,
    task_ignore_result=False,
    
    # Security
    worker_hijack_root_logger=False,
    worker_log_color=False,
)

# Scheduled tasks (beat schedule)
celery_app.conf.beat_schedule = {
    # Send appointment reminders every 5 minutes
    'send-appointment-reminders': {
        'task': 'services.background_tasks.notification_tasks.send_appointment_reminders',
        'schedule': crontab(minute='*/5'),
        'options': {'queue': 'notifications'}
    },
    
    # Process marketing campaigns every 30 minutes
    'process-marketing-campaigns': {
        'task': 'services.background_tasks.marketing_tasks.process_scheduled_campaigns',
        'schedule': crontab(minute='*/30'),
        'options': {'queue': 'marketing'}
    },
    
    # Clean up expired cache entries daily at 2 AM
    'cleanup-cache': {
        'task': 'services.background_tasks.maintenance_tasks.cleanup_expired_cache',
        'schedule': crontab(hour=2, minute=0),
        'options': {'queue': 'maintenance'}
    },
    
    # Generate daily analytics report at 1 AM
    'generate-daily-analytics': {
        'task': 'services.background_tasks.data_processing_tasks.generate_daily_analytics',
        'schedule': crontab(hour=1, minute=0),
        'options': {'queue': 'data_processing'}
    },
    
    # Health check for background services every 15 minutes
    'background-health-check': {
        'task': 'services.background_tasks.maintenance_tasks.background_health_check',
        'schedule': crontab(minute='*/15'),
        'options': {'queue': 'maintenance'}
    },
    
    # Process data exports every 10 minutes
    'process-data-exports': {
        'task': 'services.background_tasks.data_processing_tasks.process_data_exports',
        'schedule': crontab(minute='*/10'),
        'options': {'queue': 'data_processing'}
    },
}

# Environment-specific configuration
if settings.is_production():
    # Production: More conservative settings
    celery_app.conf.update(
        worker_concurrency=4,
        task_time_limit=300,        # 5 minutes max
        task_soft_time_limit=240,   # 4 minutes soft limit
        broker_connection_retry_on_startup=True,
        broker_connection_retry=True,
        broker_connection_max_retries=10,
    )
    logger.info("🏭 Celery configured for production environment")
    
elif settings.is_staging():
    # Staging: Balanced settings
    celery_app.conf.update(
        worker_concurrency=2,
        task_time_limit=180,        # 3 minutes max
        task_soft_time_limit=150,   # 2.5 minutes soft limit
        broker_connection_retry_on_startup=True,
        broker_connection_retry=True,
        broker_connection_max_retries=5,
    )
    logger.info("🔧 Celery configured for staging environment")
    
else:
    # Development: Faster, more lenient settings
    celery_app.conf.update(
        worker_concurrency=1,
        task_time_limit=60,         # 1 minute max
        task_soft_time_limit=45,    # 45 seconds soft limit
        broker_connection_retry_on_startup=False,
        broker_connection_retry=False,
        task_eager_propagates=True,  # Immediate execution in development
    )
    logger.info("🔧 Celery configured for development environment")

# Task monitoring and introspection
@celery_app.task(bind=True)
def debug_task(self):
    """Debug task for testing Celery functionality"""
    logger.info(f'Request: {self.request!r}')
    return {'status': 'success', 'worker': self.request.hostname}

# Health check task
@celery_app.task(bind=True, name='celery.health_check')
def health_check_task(self):
    """Health check task for monitoring"""
    try:
        import datetime
        return {
            'status': 'healthy',
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'worker': self.request.hostname,
            'task_id': self.request.id
        }
    except Exception as e:
        logger.error(f"Health check task failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.datetime.utcnow().isoformat()
        }

# Startup validation
def validate_celery_configuration():
    """Validate Celery configuration at startup"""
    issues = []
    
    # Check Redis connection
    try:
        result = celery_app.control.inspect().ping()
        if not result:
            issues.append("No Celery workers responding to ping")
    except Exception as e:
        issues.append(f"Cannot connect to Celery broker: {e}")
    
    # Check required settings
    if not settings.redis_url:
        issues.append("Redis URL not configured for Celery broker")
    
    # Validate queue configuration
    required_queues = ['notifications', 'data_processing', 'maintenance', 'marketing']
    configured_queues = [q.name for q in celery_app.conf.task_queues]
    missing_queues = set(required_queues) - set(configured_queues)
    
    if missing_queues:
        issues.append(f"Missing required queues: {missing_queues}")
    
    return issues

# Initialize monitoring
def setup_celery_monitoring():
    """Set up Celery monitoring and logging"""
    
    # Configure logging
    celery_logger = logging.getLogger('celery')
    celery_logger.setLevel(logging.INFO)
    
    # Add custom signal handlers for monitoring
    from celery.signals import task_prerun, task_postrun, task_failure
    
    @task_prerun.connect
    def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kwds):
        logger.info(f"🚀 Task starting: {task.name}[{task_id}]")
    
    @task_postrun.connect
    def task_postrun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, retval=None, state=None, **kwds):
        logger.info(f"✅ Task completed: {task.name}[{task_id}] - State: {state}")
    
    @task_failure.connect
    def task_failure_handler(sender=None, task_id=None, exception=None, traceback=None, einfo=None, **kwds):
        logger.error(f"❌ Task failed: {sender.name}[{task_id}] - Exception: {exception}")

# Auto-setup monitoring
setup_celery_monitoring()

logger.info("🚀 Celery application initialized successfully")