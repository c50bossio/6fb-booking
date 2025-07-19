# 6FB Booking V2 - Comprehensive Notification System

## Overview

The notification system provides a robust, scalable solution for sending email and SMS notifications to users. It features automatic retry logic, comprehensive error handling, template management, user preferences, and background processing via Celery workers.

## Features

### ✅ Core Features Implemented

1. **SendGrid Integration** - Professional email delivery with enhanced error handling
2. **Twilio Integration** - SMS notifications with phone number validation
3. **Template System** - Jinja2-based templates for emails and SMS
4. **User Preferences** - Per-user notification settings and timing preferences
5. **Queue System** - Robust notification queue with retry logic and exponential backoff
6. **History Tracking** - Complete notification history with delivery status
7. **Background Processing** - Celery workers for async notification processing
8. **API Endpoints** - RESTful API for managing notifications and preferences
9. **Comprehensive Testing** - Full test suite covering all notification features
10. **Error Handling** - Intelligent retry logic with fallback mechanisms

### 🎯 Notification Types

- **Appointment Confirmation** - Sent immediately after booking
- **Appointment Reminders** - Sent 24h and 2h before appointment (configurable)
- **Appointment Cancellation** - Sent when appointments are cancelled
- **Appointment Rescheduled** - Template available for future implementation

## Architecture

### Core Components

```
services/
├── notification_service.py    # Main notification service
├── booking_service.py        # Integration with booking system
└── client_service.py         # Client management integration

routers/
└── notifications.py          # API endpoints

workers/
└── notification_worker.py    # Celery background worker

templates/notifications/
├── appointment_confirmation_email.html
├── appointment_confirmation_sms.txt
├── appointment_reminder_email.html
├── appointment_reminder_sms.txt
├── appointment_cancellation_email.html
└── appointment_cancellation_sms.txt

scripts/
├── populate_notification_templates.py
└── start_notification_services.sh
```

### Database Models

- **NotificationTemplate** - Template definitions with variables
- **NotificationPreference** - User notification preferences
- **NotificationQueue** - Queued notifications with status tracking
- **NotificationStatus** - Enum for notification states (PENDING, SENT, FAILED, CANCELLED)

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@6fb-booking.com
SENDGRID_FROM_NAME=6FB Booking

# Twilio Configuration  
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Redis for Queue Processing
REDIS_URL=redis://localhost:6379/0

# Notification Settings
APPOINTMENT_REMINDER_HOURS=[24, 2]
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY_SECONDS=60
```

### Getting API Keys

#### SendGrid Setup:
1. Sign up at [SendGrid](https://sendgrid.com)
2. Create an API key with "Mail Send" permissions
3. Add your domain and verify sender identity
4. Add the API key to your environment variables

#### Twilio Setup:
1. Sign up at [Twilio](https://twilio.com)
2. Get your Account SID and Auth Token from the console
3. Purchase a phone number for sending SMS
4. Add credentials to your environment variables

## Installation & Setup

### 1. Install Dependencies

The required packages are already in `requirements.txt`:
- sendgrid==6.11.0
- twilio==9.0.0
- jinja2==3.1.3
- redis==5.0.1
- celery==5.3.4

### 2. Install Redis

```bash
# macOS
brew install redis

# Ubuntu/Debian
sudo apt-get install redis-server

# Start Redis
redis-server
```

### 3. Populate Templates

```bash
python scripts/populate_notification_templates.py
```

### 4. Start Services

```bash
# Start all notification services (Redis, Celery worker, Celery beat)
./scripts/start_notification_services.sh start

# Check status
./scripts/start_notification_services.sh status

# View logs
./scripts/start_notification_services.sh logs
```

## API Endpoints

### User Preferences

```http
GET /api/v2/notifications/preferences
PUT /api/v2/notifications/preferences
```

### Templates and History

```http
GET /api/v2/notifications/templates
GET /api/v2/notifications/history
GET /api/v2/notifications/stats
```

### Testing

```http
POST /api/v2/notifications/test-email
POST /api/v2/notifications/test-sms
```

### Admin Functions

```http
POST /api/v2/notifications/process-queue
DELETE /api/v2/notifications/history/{notification_id}
```

## Usage Examples

### Programmatic Usage

```python
from services.notification_service import notification_service
from database import SessionLocal

# Queue a notification
db = SessionLocal()
context = {
    "client_name": "John Doe",
    "appointment_date": "December 1, 2024",
    "appointment_time": "2:00 PM",
    "service_name": "Haircut",
    "price": 50.00
}

notifications = notification_service.queue_notification(
    db=db,
    user=user,
    template_name="appointment_confirmation",
    context=context
)

# Process queue manually
result = notification_service.process_notification_queue(db=db)
print(f"Processed {result['processed']} notifications")
```

### API Usage

```bash
# Test email notification
curl -X POST "http://localhost:8000/api/v2/notifications/test-email" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get notification preferences
curl -X GET "http://localhost:8000/api/v2/notifications/preferences" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update preferences
curl -X PUT "http://localhost:8000/api/v2/notifications/preferences" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email_enabled": true,
    "sms_enabled": true,
    "reminder_hours": [48, 4]
  }'
```

## Integration with Booking System

The notification system automatically integrates with the booking system:

### Automatic Triggers

1. **Booking Creation** → Confirmation notification sent immediately
2. **Booking Confirmation** → Reminder notifications scheduled 
3. **Booking Cancellation** → Cancellation notification + pending reminders cancelled

### Manual Integration

```python
# In your booking service
from services.notification_service import notification_service

# After creating an appointment
notification_service.queue_notification(
    db=db,
    user=appointment.user,
    template_name="appointment_confirmation",
    context=notification_context,
    appointment_id=appointment.id
)

# Schedule reminders
notification_service.schedule_appointment_reminders(db, appointment)
```

## Template System

### Template Variables

All templates have access to these variables:

**Common Variables:**
- `client_name` - Client's full name
- `service_name` - Name of booked service
- `appointment_date` - Formatted date
- `appointment_time` - Formatted time
- `business_name` - Business name
- `current_year` - Current year

**Confirmation Templates:**
- `duration` - Appointment duration in minutes
- `price` - Service price
- `barber_name` - Assigned barber (optional)
- `business_address` - Business address (optional)
- `business_phone` - Business phone number

**Reminder Templates:**
- `hours_until` - Hours until appointment
- `cancellation_policy` - Cancellation policy text

**Cancellation Templates:**
- `cancelled_by` - "client" or "business"
- `cancellation_reason` - Reason for cancellation
- `cancellation_date` - Date of cancellation
- `refund_amount` - Refund amount if applicable
- `refund_timeframe` - Expected refund timeframe

### Creating Custom Templates

1. Create template files in `templates/notifications/`
2. Use Jinja2 syntax with available variables
3. Add template to database via `populate_notification_templates.py`
4. Test with the API test endpoints

### Template Examples

**Email Template:**
```html
<h2>Hello {{ client_name }}!</h2>
<p>Your {{ service_name }} appointment is confirmed for {{ appointment_date }} at {{ appointment_time }}.</p>
```

**SMS Template:**
```text
Hi {{ client_name }}! Your {{ service_name }} is confirmed for {{ appointment_date }} at {{ appointment_time }}. - {{ business_name }}
```

## Background Processing

### Celery Workers

The system uses Celery for background processing:

**Worker Tasks:**
- `process_notification_queue` - Process pending notifications (every minute)
- `send_appointment_reminders` - Check and send reminder notifications (every 5 minutes)
- `cleanup_old_notifications` - Remove old notification records (hourly)
- `send_immediate_notification` - High-priority immediate notifications
- `send_bulk_notifications` - Bulk notification processing

**Worker Configuration:**
- 4 concurrent workers
- 3 queues: notifications, urgent_notifications, maintenance
- Automatic retries with exponential backoff
- Comprehensive logging

### Manual Processing

If Celery is not available, notifications can be processed manually:

```python
# Process queue synchronously
result = notification_service.process_notification_queue(db=db)

# Or via API (admin only)
POST /api/v2/notifications/process-queue
```

## Error Handling & Retry Logic

### Intelligent Retry System

- **Exponential Backoff** - Delays increase: 60s, 120s, 240s
- **Retry Conditions** - Network errors, rate limits, temporary failures
- **Non-Retryable Errors** - Invalid email/phone, authentication failures
- **Max Attempts** - Configurable (default: 3 attempts)

### Error Categories

**Retryable Errors:**
- Connection timeouts
- Rate limit exceeded (429)
- Service unavailable (503)
- Temporary server errors (502, 504)

**Non-Retryable Errors:**
- Invalid email format
- Invalid phone number
- Authentication failures
- Unsubscribed recipients

### Fallback Mechanisms

1. **Service Unavailable** - Notifications queued for later processing
2. **Template Missing** - Error logged, notification marked as failed
3. **Invalid Recipients** - Notification failed with clear error message
4. **Database Issues** - Rollback and retry with backoff

## Monitoring & Analytics

### Notification Statistics

```python
# Get stats for last 7 days
stats = notification_service.get_notification_stats(db=db, days=7)

# Returns:
{
    "period_days": 7,
    "since_date": "2024-06-21T21:00:00",
    "email": {"sent": 150, "failed": 5, "pending": 10, "cancelled": 2},
    "sms": {"sent": 120, "failed": 8, "pending": 5, "cancelled": 1},
    "service_stats": {
        "emails_sent": 150,
        "emails_failed": 5,
        "sms_sent": 120,
        "sms_failed": 8
    }
}
```

### Health Monitoring

```bash
# Check worker health
./scripts/start_notification_services.sh test

# View recent logs
./scripts/start_notification_services.sh logs

# Check service status
./scripts/start_notification_services.sh status
```

### Notification History

- Complete delivery history per user
- Error messages and retry attempts
- Delivery timestamps and status
- Template and context used

## Testing

### Automated Tests

```bash
# Run all notification tests
python -m pytest tests/test_notifications.py -v

# Run specific test categories
python -m pytest tests/test_notifications.py::TestNotificationService -v
python -m pytest tests/test_notifications.py::TestNotificationAPI -v
```

### Manual Testing

```bash
# Test email notifications
curl -X POST "http://localhost:8000/api/v2/notifications/test-email" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test SMS notifications  
curl -X POST "http://localhost:8000/api/v2/notifications/test-sms" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Coverage

- ✅ Service initialization and configuration
- ✅ Email sending with SendGrid integration
- ✅ SMS sending with Twilio integration
- ✅ Template rendering and context handling
- ✅ User preference management
- ✅ Queue processing and retry logic
- ✅ Error handling and fallback mechanisms
- ✅ API endpoints and authentication
- ✅ Integration with booking system

## Security Considerations

### API Key Security
- Store API keys in environment variables only
- Use different keys for development/production
- Rotate keys regularly

### Data Protection
- Notification content is not logged in production
- Phone numbers and emails are validated
- Failed notifications don't expose sensitive data

### Rate Limiting
- Intelligent retry logic prevents API abuse
- Exponential backoff reduces server load
- Failed notifications are marked and not retried indefinitely

### Access Control
- User notifications only accessible to the user
- Admin functions require admin role
- Test endpoints respect user permissions

## Performance Optimization

### Database Optimization
- Indexes on frequently queried fields
- Automatic cleanup of old notification records
- Batch processing for bulk operations

### API Optimization
- Efficient query patterns
- Minimal data transfer
- Caching of template data

### Worker Optimization
- Concurrent processing
- Queue prioritization
- Efficient batch processing

## Troubleshooting

### Common Issues

**Notifications Not Sending:**
1. Check Redis connection
2. Verify Celery worker is running
3. Check API keys in environment
4. Review error logs

**Email Delivery Issues:**
1. Verify SendGrid configuration
2. Check sender domain authentication
3. Review bounce/spam reports in SendGrid

**SMS Delivery Issues:**
1. Verify Twilio credentials
2. Check phone number format
3. Ensure sufficient Twilio balance
4. Review delivery reports in Twilio

**Template Errors:**
1. Check Jinja2 syntax
2. Verify all variables are provided
3. Test template rendering manually

### Debug Commands

```bash
# Test Redis connection
redis-cli ping

# Check Celery worker status
celery -A workers.notification_worker inspect active

# View queue contents
celery -A workers.notification_worker inspect reserved

# Check notification templates
python -c "
from database import SessionLocal
from models import NotificationTemplate
db = SessionLocal()
templates = db.query(NotificationTemplate).all()
for t in templates:
    print(f'{t.name} ({t.template_type}): {t.is_active}')
"
```

### Log Locations

- **Celery Worker:** `logs/celery_worker.log`
- **Celery Beat:** `logs/celery_beat.log`
- **Application:** Console output or configured logging

## Future Enhancements

### Planned Features
- Push notification support
- Email template builder UI
- Advanced analytics dashboard
- Webhook notifications for external systems
- Multi-language template support
- A/B testing for notification content

### Scalability Improvements
- Redis Cluster support
- Multiple Celery worker nodes
- Database sharding for high volume
- CDN integration for email assets

## Support

For issues or questions:
1. Check this documentation
2. Review error logs
3. Test with API endpoints
4. Check service status with provided scripts

---

**Last Updated:** June 28, 2025
**Version:** 1.0.0
**Notification System Status:** ✅ Production Ready