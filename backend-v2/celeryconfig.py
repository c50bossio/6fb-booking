"""
Celery configuration for 6FB Booking v2
"""

import os
from config import settings

# Broker settings
broker_url = settings.redis_url
result_backend = settings.redis_url

# Task serialization
task_serializer = 'json'
accept_content = ['json']
result_serializer = 'json'

# Timezone configuration
timezone = 'UTC'
enable_utc = True

# Task execution settings
task_soft_time_limit = 300  # 5 minutes
task_time_limit = 600      # 10 minutes
task_acks_late = True
task_reject_on_worker_lost = True

# Worker settings
worker_prefetch_multiplier = 1
worker_max_tasks_per_child = 1000
worker_disable_rate_limits = False

# Result backend settings
result_expires = 3600  # 1 hour
result_backend_transport_options = {
    'retry_policy': {
        'timeout': 5.0
    }
}

# Task routing
task_routes = {
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
}

# Task annotations for rate limiting and retry policies
task_annotations = {
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

# Beat schedule (imported from celery_app.py)
# This is defined in celery_app.py to avoid duplication

# Monitoring and logging
worker_send_task_events = True
task_send_sent_event = True

# Security
worker_hijack_root_logger = False
worker_log_color = False if os.getenv('ENVIRONMENT') == 'production' else True