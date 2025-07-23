# BookedBarber V2 - Background Job System

## 🚀 Overview

BookedBarber V2 uses **Celery + Redis** for reliable background task processing. All email/SMS notifications, appointment reminders, and marketing campaigns are processed asynchronously to ensure the UI remains responsive.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FastAPI App   │────│  Redis Broker   │────│ Celery Workers  │
│                 │    │                 │    │                 │
│ Queue Tasks ────┼────┼─► Task Queues   │    │ ┌─────────────┐ │
│ Process APIs    │    │                 │    │ │ Notification│ │
│                 │    │ ┌─────────────┐ │    │ │   Worker    │ │
└─────────────────┘    │ │notifications│ │    │ └─────────────┘ │
                       │ │marketing    │ │    │ ┌─────────────┐ │
┌─────────────────┐    │ │maintenance  │ │    │ │  Marketing  │ │
│  Celery Beat    │────┼─┤data_process │ │    │ │   Worker    │ │
│                 │    │ │high_priority│ │    │ └─────────────┘ │
│ Schedule Tasks ─┼────┼─►default       │ │    │ ┌─────────────┐ │
│ (reminders,     │    │ └─────────────┘ │    │ │ Maintenance │ │
│  cleanup, etc.) │    └─────────────────┘    │ │   Worker    │ │
└─────────────────┘                           │ └─────────────┘ │
                                              └─────────────────┘
```

## 📋 Task Queues

| Queue | Purpose | Priority | Example Tasks |
|-------|---------|----------|---------------|
| `notifications` | Email/SMS notifications | High | Appointment confirmations, reminders |
| `marketing` | Marketing campaigns | Medium | Email campaigns, review automation |
| `maintenance` | System maintenance | Low | Cache cleanup, database optimization |
| `data_processing` | Analytics and exports | Medium | Report generation, data exports |
| `high_priority` | Urgent tasks | Critical | Payment failures, system alerts |
| `default` | General tasks | Medium | Misc background processing |

## 🚀 Quick Start

### 1. Start Background Services
```bash
# Start Redis, Celery Worker, and Celery Beat
./start-background-services.sh
```

### 2. Monitor System Status
```bash
# Check current status
./monitor-background-jobs.py

# Real-time monitoring
./monitor-background-jobs.py --watch
```

### 3. Stop Services
```bash
# Gracefully stop all background services
./stop-background-services.sh
```

## 📝 Available Tasks

### Notification Tasks
```python
from services.background_tasks.notification_tasks import *

# Send individual email
send_email_notification.delay(
    recipient_email="user@example.com",
    subject="Welcome!",
    content="Welcome to BookedBarber!",
    template_name="welcome_email",
    template_data={"user_name": "John"}
)

# Send SMS
send_sms_notification.delay(
    phone_number="+1234567890",
    message="Your appointment is confirmed!"
)

# Send appointment reminder
send_appointment_reminder.delay(
    appointment_id=123,
    reminder_type="24h"
)

# Send bulk notifications
send_bulk_notifications.delay([
    {
        'type': 'email',
        'recipient': 'user1@example.com',
        'subject': 'Bulk Email',
        'content': 'Message content'
    }
])

# Send welcome email to new user
send_welcome_email.delay(user_id=456)
```

### Marketing Tasks
```python
from services.background_tasks.marketing_tasks import *

# Process scheduled campaigns
process_scheduled_campaigns.delay()

# Send review request
send_review_request.delay(appointment_id=123)

# Update Google My Business
update_gmb_posts.delay(location_id="location_123")
```

### Maintenance Tasks
```python
from services.background_tasks.maintenance_tasks import *

# Clean up expired cache entries
cleanup_expired_cache.delay()

# Database maintenance
optimize_database.delay()

# System health check
background_health_check.delay()
```

## ⏰ Scheduled Tasks (Celery Beat)

The following tasks run automatically:

| Task | Schedule | Purpose |
|------|----------|---------|
| `send_appointment_reminders` | Every 5 minutes | Send appointment reminders |
| `process_scheduled_campaigns` | Every 30 minutes | Process marketing campaigns |
| `cleanup_expired_cache` | Daily at 2 AM | Clean Redis cache |
| `generate_daily_analytics` | Daily at 1 AM | Generate analytics reports |
| `background_health_check` | Every 15 minutes | System health monitoring |
| `process_data_exports` | Every 10 minutes | Process export requests |

## 🔧 Configuration

### Environment Variables
```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Celery Configuration  
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Notification Settings
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY_SECONDS=60
APPOINTMENT_REMINDER_HOURS=[24, 2]  # Hours before appointment

# Email Settings
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@bookedbarber.com
SENDGRID_FROM_NAME="BookedBarber"

# SMS Settings
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Queue Settings
```python
# services/celery_app.py
task_routes = {
    'services.background_tasks.notification_tasks.*': {'queue': 'notifications'},
    'services.background_tasks.marketing_tasks.*': {'queue': 'marketing'},
    # ... other routes
}
```

## 📊 Monitoring & Management

### Real-time Monitoring
```bash
# Status dashboard
./monitor-background-jobs.py --watch

# Celery flower (web UI)
celery -A services.celery_app flower

# Check worker status
celery -A services.celery_app status

# Inspect active tasks
celery -A services.celery_app inspect active
```

### Task Management
```bash
# List registered tasks
celery -A services.celery_app inspect registered

# Revoke a task
celery -A services.celery_app control revoke <task_id>

# Purge all tasks from queue
celery -A services.celery_app purge

# Restart workers
celery -A services.celery_app control shutdown
```

## 🐛 Troubleshooting

### Common Issues

#### Workers Not Starting
```bash
# Check Redis connection
redis-cli ping

# Check for port conflicts
lsof -i :6379

# Restart Redis
brew services restart redis  # macOS
sudo systemctl restart redis  # Linux
```

#### Tasks Not Processing
```bash
# Check worker status
celery -A services.celery_app inspect active

# Check queue lengths
redis-cli llen celery_queue_notifications

# Restart workers
./stop-background-services.sh
./start-background-services.sh
```

#### Memory Issues
```bash
# Check worker memory usage
ps aux | grep celery

# Monitor Redis memory
redis-cli info memory

# Restart workers to clear memory
celery -A services.celery_app control shutdown
./start-celery-worker.sh
```

### Debug Mode
```bash
# Run worker in debug mode
celery -A services.celery_app worker --loglevel=debug

# Test task execution
python -c "
from services.background_tasks.notification_tasks import health_check
result = health_check.delay()
print(result.get())
"
```

## 🧪 Testing

### Test Task Execution
```bash
# Run comprehensive demo
./demo-background-jobs.py

# Test specific task type
python -c "
from services.background_tasks.notification_tasks import send_email_notification
task = send_email_notification.delay('test@example.com', 'Test', 'Test message')
print(f'Task ID: {task.id}')
print(f'Result: {task.get(timeout=10)}')
"
```

### Integration Tests
```bash
# Run background task tests
pytest tests/integration/test_background_tasks.py

# Test with different environments
ENV=staging pytest tests/integration/test_celery_tasks.py
```

## 🚀 Production Deployment

### Docker Compose
```yaml
version: '3.8'
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
  
  celery_worker:
    build: .
    command: celery -A services.celery_app worker --loglevel=info
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379/0
  
  celery_beat:
    build: .
    command: celery -A services.celery_app beat --loglevel=info
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379/0
```

### Kubernetes Deployment
```yaml
# k8s/celery-deployment.yaml (already exists)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: celery-worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: celery-worker
  template:
    metadata:
      labels:
        app: celery-worker
    spec:
      containers:
      - name: celery-worker
        image: bookedbarber-v2:latest
        command: ["celery", "-A", "services.celery_app", "worker", "--loglevel=info"]
```

### Monitoring in Production
- **Sentry Integration**: Automatic error tracking
- **Prometheus Metrics**: Task execution metrics
- **Grafana Dashboards**: Visual monitoring
- **Health Checks**: Automated system monitoring

## 📚 API Integration

### Queue Notifications from API Endpoints
```python
# In your API endpoints
from services.notification_service import notification_service

@router.post("/appointments/")
async def create_appointment(
    appointment: AppointmentCreate,
    db: Session = Depends(get_db)
):
    # Create appointment
    new_appointment = create_appointment_in_db(appointment, db)
    
    # Queue confirmation notification (async)
    notification_service.queue_notification(
        db=db,
        user=appointment.user,
        template_name="appointment_confirmation",
        context={
            "appointment_date": appointment.start_time.strftime("%B %d, %Y"),
            "appointment_time": appointment.start_time.strftime("%I:%M %p"),
            "service_name": appointment.service_name
        },
        appointment_id=new_appointment.id
    )
    
    return new_appointment
```

## 🔐 Security

### Redis Security
- Use Redis AUTH password
- Configure SSL/TLS for production
- Restrict network access
- Regular security updates

### Task Security
- Validate all task parameters
- Sanitize user inputs
- Rate limit task queuing
- Monitor for suspicious patterns

## 📈 Performance Optimization

### Worker Scaling
```bash
# Scale workers based on load
celery -A services.celery_app worker --concurrency=8

# Multiple worker types
celery multi start w1 w2 w3 \
    -A services.celery_app \
    --queues=w1:notifications,w2:marketing,w3:maintenance
```

### Queue Optimization
- Separate queues by priority
- Use appropriate concurrency settings
- Monitor queue lengths
- Implement task batching for bulk operations

---

## 🆘 Support

For issues or questions:
1. Check logs: `tail -f logs/celery_worker.log`
2. Monitor status: `./monitor-background-jobs.py`
3. Test connectivity: `./demo-background-jobs.py`
4. Review configuration: `services/celery_app.py`

**The background job system is production-ready and handles all asynchronous processing needs for BookedBarber V2.**