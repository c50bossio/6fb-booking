#!/usr/bin/env python3
"""
Main Celery application for 6FB Booking v2
Handles background tasks for notifications, agents, and other async operations
"""

import os
import sys
from pathlib import Path

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

from celery import Celery
from celery.schedules import crontab
import logging
from datetime import datetime

from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create main Celery app
celery_app = Celery(
    '6fb_booking_v2',
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        'tasks.agent_tasks',
        'workers.notification_worker'
    ]
)

# Celery configuration
celery_app.conf.update(
    # Serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    
    # Timezone
    timezone='UTC',
    enable_utc=True,
    
    # Task routing
    task_routes={
        # Agent tasks
        'tasks.agent_tasks.execute_agent_run': {'queue': 'agents'},
        'tasks.agent_tasks.execute_conversation': {'queue': 'agents'},
        'tasks.agent_tasks.process_agent_response': {'queue': 'agents'},
        'tasks.agent_tasks.calculate_daily_metrics': {'queue': 'metrics'},
        'tasks.agent_tasks.calculate_agent_metrics': {'queue': 'metrics'},
        'tasks.agent_tasks.check_agent_health': {'queue': 'health'},
        'tasks.agent_tasks.cleanup_old_conversations': {'queue': 'cleanup'},
        
        # Notification tasks
        'notification_worker.process_notification_queue': {'queue': 'notifications'},
        'notification_worker.send_immediate_notification': {'queue': 'urgent_notifications'},
        'notification_worker.send_appointment_reminders': {'queue': 'notifications'},
        'notification_worker.cleanup_old_notifications': {'queue': 'cleanup'},
        'notification_worker.send_bulk_notifications': {'queue': 'bulk_notifications'},
        'notification_worker.health_check': {'queue': 'health'},
    },
    
    # Beat schedule for periodic tasks
    beat_schedule={
        # Agent system tasks
        'calculate-daily-agent-metrics': {
            'task': 'tasks.agent_tasks.calculate_daily_metrics',
            'schedule': crontab(hour=1, minute=0),  # Daily at 1 AM
            'options': {'queue': 'metrics'}
        },
        'check-agent-health': {
            'task': 'tasks.agent_tasks.check_agent_health',
            'schedule': crontab(minute='*/30'),  # Every 30 minutes
            'options': {'queue': 'health'}
        },
        'cleanup-old-agent-conversations': {
            'task': 'tasks.agent_tasks.cleanup_old_conversations',
            'schedule': crontab(hour=3, minute=0, day_of_week=0),  # Sunday at 3 AM
            'options': {'queue': 'cleanup'}
        },
        
        # Notification system tasks
        'process-notification-queue': {
            'task': 'notification_worker.process_notification_queue',
            'schedule': 60.0,  # Every minute
            'options': {'queue': 'notifications'}
        },
        'send-appointment-reminders': {
            'task': 'notification_worker.send_appointment_reminders',
            'schedule': 300.0,  # Every 5 minutes
            'options': {'queue': 'notifications'}
        },
        'cleanup-old-notifications': {
            'task': 'notification_worker.cleanup_old_notifications',
            'schedule': 3600.0,  # Every hour
            'options': {'queue': 'cleanup'}
        },
    },
    
    # Worker configuration
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=1000,
    
    # Task execution settings
    task_soft_time_limit=300,  # 5 minutes soft limit
    task_time_limit=600,       # 10 minutes hard limit
    task_reject_on_worker_lost=True,
    
    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour
    result_backend_transport_options={
        'retry_policy': {
            'timeout': 5.0
        }
    },
    
    # Error handling
    task_annotations={
        '*': {
            'rate_limit': '100/m',  # Global rate limit
            'retry_policy': {
                'max_retries': 3,
                'interval_start': 0,
                'interval_step': 0.2,
                'interval_max': 0.2,
            }
        },
        'tasks.agent_tasks.*': {
            'rate_limit': '50/m',  # Agent tasks rate limit
        },
        'notification_worker.*': {
            'rate_limit': '200/m',  # Notification tasks rate limit
        }
    }
)

# Import Sentry monitoring if available
try:
    from services.sentry_monitoring import celery_monitor
    celery_monitor.setup_celery_monitoring(celery_app)
    logger.info("Sentry Celery monitoring enabled")
except ImportError:
    logger.info("Sentry monitoring not available for Celery tasks")
except Exception as e:
    logger.warning(f"Failed to set up Sentry Celery monitoring: {e}")

# Health check task
@celery_app.task
def health_check():
    """Global health check task"""
    return {
        "status": "healthy",
        "timestamp": str(datetime.utcnow()),
        "app": "6fb_booking_v2",
        "worker_id": os.getpid(),
        "redis_url": settings.redis_url
    }

# Import tasks to register them (must be after celery_app definition)
try:
    logger.info("Agent tasks imported successfully")
except ImportError as e:
    logger.warning(f"Failed to import agent tasks: {e}")

if __name__ == '__main__':
    # Start the celery app
    celery_app.start()