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
        'workers.notification_worker',
        'workers.payment_worker',
        'workers.marketing_worker',
        'workers.analytics_worker',
        'workers.file_worker',
        'workers.calendar_worker',
        'workers.dlq_worker',
        'workers.monitoring_worker'
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
    
    # Task routing with priority queues
    task_routes={
        # Agent tasks
        'tasks.agent_tasks.execute_agent_run': {'queue': 'agents'},
        'tasks.agent_tasks.execute_conversation': {'queue': 'agents'},
        'tasks.agent_tasks.process_agent_response': {'queue': 'agents'},
        'tasks.agent_tasks.calculate_daily_metrics': {'queue': 'metrics'},
        'tasks.agent_tasks.calculate_agent_metrics': {'queue': 'metrics'},
        'tasks.agent_tasks.check_agent_health': {'queue': 'health'},
        'tasks.agent_tasks.cleanup_old_conversations': {'queue': 'cleanup'},
        
        # Notification tasks (multiple priority levels)
        'notification_worker.process_notification_queue': {'queue': 'notifications'},
        'notification_worker.send_immediate_notification': {'queue': 'urgent_notifications'},
        'notification_worker.send_appointment_reminders': {'queue': 'notifications'},
        'notification_worker.cleanup_old_notifications': {'queue': 'cleanup'},
        'notification_worker.send_bulk_notifications': {'queue': 'bulk_notifications'},
        'notification_worker.health_check': {'queue': 'health'},
        
        # Payment webhook processing (high priority)
        'workers.payment_worker.process_stripe_webhook': {'queue': 'payment_webhooks_critical'},
        'workers.payment_worker.process_payment_success': {'queue': 'payment_processing'},
        'workers.payment_worker.process_payment_failure': {'queue': 'payment_processing'},
        'workers.payment_worker.handle_subscription_changes': {'queue': 'payment_processing'},
        'workers.payment_worker.process_refund': {'queue': 'payment_processing'},
        
        # Email campaign and marketing automation
        'workers.marketing_worker.process_email_campaign': {'queue': 'marketing_campaigns'},
        'workers.marketing_worker.send_drip_email': {'queue': 'marketing_automation'},
        'workers.marketing_worker.process_segment_update': {'queue': 'marketing_automation'},
        'workers.marketing_worker.track_email_engagement': {'queue': 'marketing_analytics'},
        'workers.marketing_worker.generate_campaign_report': {'queue': 'reports'},
        
        # Analytics and data processing
        'workers.analytics_worker.process_booking_analytics': {'queue': 'analytics_processing'},
        'workers.analytics_worker.update_revenue_metrics': {'queue': 'analytics_processing'},
        'workers.analytics_worker.generate_daily_reports': {'queue': 'reports'},
        'workers.analytics_worker.process_user_behavior': {'queue': 'analytics_processing'},
        'workers.analytics_worker.update_business_insights': {'queue': 'analytics_processing'},
        
        # File upload processing
        'workers.file_worker.process_image_upload': {'queue': 'file_processing'},
        'workers.file_worker.resize_and_optimize_image': {'queue': 'file_processing'},
        'workers.file_worker.generate_thumbnails': {'queue': 'file_processing'},
        'workers.file_worker.scan_for_malware': {'queue': 'file_security'},
        'workers.file_worker.cleanup_temp_files': {'queue': 'cleanup'},
        
        # Calendar synchronization
        'workers.calendar_worker.sync_google_calendar': {'queue': 'calendar_sync'},
        'workers.calendar_worker.handle_calendar_webhook': {'queue': 'calendar_webhooks'},
        'workers.calendar_worker.create_calendar_event': {'queue': 'calendar_sync'},
        'workers.calendar_worker.update_calendar_event': {'queue': 'calendar_sync'},
        'workers.calendar_worker.delete_calendar_event': {'queue': 'calendar_sync'},
        
        # Dead letter queue processing
        'workers.dlq_worker.process_failed_task': {'queue': 'dead_letter_processing'},
        'workers.dlq_worker.retry_failed_message': {'queue': 'dead_letter_retry'},
        'workers.dlq_worker.archive_permanently_failed': {'queue': 'cleanup'},
        
        # Queue monitoring and health
        'workers.monitoring_worker.check_queue_health': {'queue': 'health'},
        'workers.monitoring_worker.generate_queue_metrics': {'queue': 'metrics'},
        'workers.monitoring_worker.alert_on_queue_backlog': {'queue': 'health'},
        'workers.monitoring_worker.cleanup_old_metrics': {'queue': 'cleanup'},
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
        
        # Analytics and reporting tasks
        'generate-daily-analytics-reports': {
            'task': 'workers.analytics_worker.generate_daily_reports',
            'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
            'options': {'queue': 'reports'}
        },
        'update-revenue-metrics': {
            'task': 'workers.analytics_worker.update_revenue_metrics',
            'schedule': crontab(minute='*/15'),  # Every 15 minutes
            'options': {'queue': 'analytics_processing'}
        },
        'process-user-behavior-analytics': {
            'task': 'workers.analytics_worker.process_user_behavior',
            'schedule': crontab(hour='*/4', minute=0),  # Every 4 hours
            'options': {'queue': 'analytics_processing'}
        },
        
        # Calendar synchronization tasks
        'sync-google-calendars': {
            'task': 'workers.calendar_worker.sync_google_calendar',
            'schedule': crontab(minute='*/10'),  # Every 10 minutes
            'options': {'queue': 'calendar_sync'}
        },
        
        # Marketing automation tasks
        'process-scheduled-email-campaigns': {
            'task': 'workers.marketing_worker.process_email_campaign',
            'schedule': crontab(minute='*/5'),  # Every 5 minutes
            'options': {'queue': 'marketing_campaigns'}
        },
        'send-drip-emails': {
            'task': 'workers.marketing_worker.send_drip_email',
            'schedule': crontab(minute=0),  # Every hour
            'options': {'queue': 'marketing_automation'}
        },
        'track-email-engagement': {
            'task': 'workers.marketing_worker.track_email_engagement',
            'schedule': crontab(minute='*/30'),  # Every 30 minutes
            'options': {'queue': 'marketing_analytics'}
        },
        
        # File and cleanup tasks
        'cleanup-temp-files': {
            'task': 'workers.file_worker.cleanup_temp_files',
            'schedule': crontab(hour=4, minute=0),  # Daily at 4 AM
            'options': {'queue': 'cleanup'}
        },
        
        # Dead letter queue processing
        'process-dead-letter-queue': {
            'task': 'workers.dlq_worker.process_failed_task',
            'schedule': crontab(minute='*/15'),  # Every 15 minutes
            'options': {'queue': 'dead_letter_processing'}
        },
        'retry-failed-messages': {
            'task': 'workers.dlq_worker.retry_failed_message',
            'schedule': crontab(minute='*/30'),  # Every 30 minutes
            'options': {'queue': 'dead_letter_retry'}
        },
        
        # Queue monitoring and health checks
        'check-queue-health': {
            'task': 'workers.monitoring_worker.check_queue_health',
            'schedule': crontab(minute='*/5'),  # Every 5 minutes
            'options': {'queue': 'health'}
        },
        'generate-queue-metrics': {
            'task': 'workers.monitoring_worker.generate_queue_metrics',
            'schedule': crontab(minute='*/10'),  # Every 10 minutes
            'options': {'queue': 'metrics'}
        },
        'alert-on-queue-backlog': {
            'task': 'workers.monitoring_worker.alert_on_queue_backlog',
            'schedule': crontab(minute='*/5'),  # Every 5 minutes
            'options': {'queue': 'health'}
        },
        'cleanup-old-queue-metrics': {
            'task': 'workers.monitoring_worker.cleanup_old_metrics',
            'schedule': crontab(hour=5, minute=0),  # Daily at 5 AM
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
    
    # Error handling and task configuration
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
        },
        'workers.payment_worker.*': {
            'rate_limit': '500/m',  # High rate limit for payment processing
            'retry_policy': {
                'max_retries': 5,  # More retries for payments
                'interval_start': 1,
                'interval_step': 1,
                'interval_max': 30,
            }
        },
        'workers.marketing_worker.*': {
            'rate_limit': '100/m',  # Marketing tasks rate limit
            'retry_policy': {
                'max_retries': 2,  # Fewer retries for marketing
                'interval_start': 5,
                'interval_step': 5,
                'interval_max': 60,
            }
        },
        'workers.analytics_worker.*': {
            'rate_limit': '150/m',  # Analytics tasks rate limit
        },
        'workers.file_worker.*': {
            'rate_limit': '50/m',   # File processing rate limit
            'soft_time_limit': 600,  # 10 minutes for file processing
            'time_limit': 900,       # 15 minutes hard limit
        },
        'workers.calendar_worker.*': {
            'rate_limit': '300/m',  # Calendar sync rate limit
            'retry_policy': {
                'max_retries': 3,
                'interval_start': 2,
                'interval_step': 2,
                'interval_max': 60,
            }
        },
        'workers.dlq_worker.*': {
            'rate_limit': '10/m',   # Low rate for DLQ processing
        },
        'workers.monitoring_worker.*': {
            'rate_limit': '1000/m',  # High rate for monitoring
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