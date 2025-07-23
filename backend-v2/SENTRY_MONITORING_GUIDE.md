# BookedBarber V2 - Sentry Monitoring & Error Tracking

## 🎯 Overview

BookedBarber V2 includes comprehensive **Sentry integration** for production-grade error tracking, performance monitoring, and business intelligence. This system provides real-time visibility into application health and user experience.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FastAPI App   │────│ Sentry SDK      │────│  Sentry Cloud   │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │   Errors    │─┼────┼─│Event Filter │─┼────┼─│Error Issues │ │
│ │Performance  │─┼────┼─│Context Add  │─┼────┼─│Performance  │ │
│ │Business Ops │─┼────┼─│Breadcrumbs  │─┼────┼─│Dashboards   │ │
│ │User Context │─┼────┼─│Sampling     │─┼────┼─│Alerts       │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │────│   Celery        │────│     Redis       │
│   Monitoring    │    │   Monitoring    │    │   Monitoring    │
│                 │    │                 │    │                 │
│ • Query Perf    │    │ • Task Errors   │    │ • Op Duration   │
│ • Slow Queries  │    │ • Task Duration │    │ • Connection    │
│ • DB Errors     │    │ • Retry Events  │    │ • Performance   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Setup

### 1. Automated Setup (Recommended)
```bash
# Interactive setup assistant
./setup-sentry.py

# Follow prompts to configure:
# - Sentry DSN
# - Environment (dev/staging/production)
# - Sample rates
# - Privacy settings
```

### 2. Manual Configuration
```bash
# Add to .env file
SENTRY_DSN=https://your-key@org.ingest.sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_SAMPLE_RATE=1.0
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

### 3. Test Integration
```bash
# Comprehensive integration test
./test-sentry-integration.py

# Real-time monitoring dashboard
./sentry-monitor.py --watch
```

## 📊 Monitoring Features

### Error Tracking
- **Automatic Exception Capture**: All unhandled exceptions
- **Business Logic Errors**: Booking, payment, integration failures
- **Context-Rich Events**: User, business operation, and system context
- **Smart Filtering**: Development noise filtering, test exclusion

### Performance Monitoring
- **Database Query Monitoring**: Slow query detection and optimization
- **API Response Times**: Endpoint performance tracking
- **Celery Task Performance**: Background job monitoring
- **Redis Operation Tracking**: Cache performance metrics

### Business Intelligence
- **Booking Flow Monitoring**: Track appointment creation, modification, cancellation
- **Payment Processing**: Monitor payment success rates and failures
- **User Experience**: Track user actions and workflow completion
- **Integration Health**: External service connectivity and performance

## 🔧 Configuration Reference

### Environment Variables

| Variable | Description | Default | Environment |
|----------|-------------|---------|-------------|
| `SENTRY_DSN` | Sentry project DSN | *(required)* | All |
| `SENTRY_ENVIRONMENT` | Environment name | `development` | All |
| `SENTRY_RELEASE` | Release version | Auto-detected | All |
| `SENTRY_SAMPLE_RATE` | Error sampling rate (0.0-1.0) | `1.0` | All |
| `SENTRY_TRACES_SAMPLE_RATE` | Performance sampling rate | `0.1` | All |
| `SENTRY_PROFILES_SAMPLE_RATE` | Profiling sampling rate | `0.1` | All |
| `SENTRY_DEBUG` | Enable debug logging | `false` | Development |
| `SENTRY_SEND_DEFAULT_PII` | Send personal info | `false` | All |

### Recommended Settings by Environment

#### Development
```bash
SENTRY_ENVIRONMENT=development
SENTRY_SAMPLE_RATE=1.0          # Capture all errors
SENTRY_TRACES_SAMPLE_RATE=1.0   # Capture all transactions
SENTRY_PROFILES_SAMPLE_RATE=1.0 # Profile all requests
SENTRY_DEBUG=true               # Enable debug logs
```

#### Staging
```bash
SENTRY_ENVIRONMENT=staging
SENTRY_SAMPLE_RATE=1.0          # Capture all errors
SENTRY_TRACES_SAMPLE_RATE=0.1   # Sample 10% of transactions
SENTRY_PROFILES_SAMPLE_RATE=0.1 # Profile 10% of requests
SENTRY_DEBUG=false
```

#### Production
```bash
SENTRY_ENVIRONMENT=production
SENTRY_SAMPLE_RATE=1.0          # Capture all errors (important!)
SENTRY_TRACES_SAMPLE_RATE=0.05  # Sample 5% of transactions (cost control)
SENTRY_PROFILES_SAMPLE_RATE=0.05 # Profile 5% of requests
SENTRY_DEBUG=false
SENTRY_SEND_DEFAULT_PII=false   # GDPR compliance
```

## 🎯 Business-Specific Monitoring

### Booking Operations
```python
from config.sentry import capture_booking_error, add_business_context

# Add business context
add_business_context({
    "operation_type": "appointment_booking",
    "resource_type": "appointment",
    "resource_id": appointment.id,
    "barber_id": appointment.barber_id,
    "client_id": appointment.client_id
})

# Capture booking errors with context
try:
    create_appointment(data)
except ValidationError as e:
    capture_booking_error(e, {
        "appointment_id": appointment.id,
        "error_stage": "validation",
        "service_type": data.service_type
    })
```

### Payment Processing
```python
from config.sentry import capture_payment_error

try:
    process_payment(payment_data)
except StripeError as e:
    capture_payment_error(e, {
        "payment_intent_id": payment_data.payment_intent_id,
        "amount_cents": payment_data.amount_cents,
        "error_stage": "charge_creation"
    })
```

### Integration Monitoring
```python
from config.sentry import capture_integration_error

try:
    send_email_via_sendgrid(email_data)
except SendGridAPIError as e:
    capture_integration_error(e, {
        "service_name": "sendgrid",
        "operation": "send_email",
        "response_code": e.status_code,
        "error_code": e.error_code
    })
```

## 📈 Performance Monitoring

### Database Query Monitoring
```python
# Automatic monitoring via SQLAlchemy events
# No code changes required - configured in main.py

# Monitors:
# - Query execution time
# - Slow query detection (>1s warning, >5s error)
# - Database connection issues
# - Query parameters and context
```

### Celery Task Monitoring
```python
from services.sentry_monitoring import celery_monitor

@celery_monitor.monitor_task_execution("email.send_notification")
def send_email_task(recipient, subject, body):
    # Task execution automatically monitored
    # Captures: duration, success/failure, retry attempts
    pass
```

### Redis Performance Monitoring
```python
from services.sentry_monitoring import redis_monitor

@redis_monitor.monitor_redis_operation("cache.get_user_data")
def get_cached_user_data(user_id):
    # Redis operations automatically monitored
    # Captures: operation type, duration, success/failure
    pass
```

## 🔍 Monitoring Dashboard

### Real-time Dashboard
```bash
# Interactive monitoring dashboard
./sentry-monitor.py

# Auto-refresh mode
./sentry-monitor.py --watch --interval 30

# Quick test mode
./sentry-monitor.py --test
```

### Dashboard Features
- **Real-time Configuration Status**: Sentry setup validation
- **Integration Health**: Database, Celery, Redis connectivity
- **System Resources**: CPU, memory, disk usage
- **Quick Actions**: Send test events, refresh data, help
- **Environment-specific Recommendations**

## 🧪 Testing & Validation

### Comprehensive Testing
```bash
# Run full integration test suite
./test-sentry-integration.py

# Tests include:
# - Configuration validation
# - User context integration
# - Business context tracking
# - Error capture scenarios
# - Performance monitoring
# - Database monitoring
# - Celery integration
# - Event filtering
```

### Manual Testing
```python
# Test error capture
from config.sentry import configure_sentry
import sentry_sdk

configure_sentry()

# Send test error
try:
    raise ValueError("Test error for monitoring")
except ValueError as e:
    sentry_sdk.capture_exception(e)

# Send test message
sentry_sdk.capture_message("Test message", level="info")
```

## 📊 Sentry Dashboard Usage

### Error Analysis
1. **Go to Sentry Dashboard**: https://sentry.io/organizations/[org]/issues/
2. **Filter by Environment**: Select development/staging/production
3. **Business Context**: Use tags like `business_area:payments`
4. **User Impact**: View affected users and sessions

### Performance Analysis
1. **Performance Tab**: View transaction performance
2. **Database Queries**: Identify slow database operations
3. **API Endpoints**: Monitor endpoint response times
4. **Celery Tasks**: Track background job performance

### Alerting Setup
1. **Alert Rules**: Configure alerts for error thresholds
2. **Integration**: Set up Slack/email notifications
3. **Business Metrics**: Alert on payment failures, booking errors
4. **Performance**: Alert on slow queries, high error rates

## 🔐 Security & Privacy

### Data Protection
- **PII Filtering**: Personally identifiable information excluded by default
- **Payment Data**: Credit card numbers and sensitive payment data never sent
- **User Data**: Only user ID, role, and business context included
- **GDPR Compliant**: Configurable to meet privacy requirements

### Data Retention
- **Sentry Retention**: Based on your Sentry plan (30-90 days typical)
- **Local Filtering**: Development noise filtered locally
- **Sampling**: Production sampling reduces data volume
- **Scrubbing**: Sensitive data automatically scrubbed

## 🚨 Alerting & Incident Response

### Alert Configuration
```bash
# High-priority alerts
- Payment processing failures (>5 in 5 minutes)
- Database connection failures
- Critical business operations (booking failures)
- High error rates (>10 errors/minute)

# Performance alerts
- Slow database queries (>5 seconds)
- High response times (>2 seconds p95)
- Celery task failures
- Redis connection issues
```

### Incident Response Workflow
1. **Alert Received**: Sentry sends notification
2. **Context Review**: Check error context and breadcrumbs
3. **Impact Assessment**: Review affected users and business operations
4. **Resolution**: Fix issue and deploy
5. **Verification**: Monitor error rate reduction
6. **Post-mortem**: Document lessons learned

## 🔧 Advanced Configuration

### Custom Context
```python
from config.sentry import add_user_context, add_business_context

# Add user context for all subsequent events
add_user_context({
    "id": user.id,
    "email": user.email,
    "role": user.role,
    "organization_id": user.organization_id
})

# Add business operation context
add_business_context({
    "operation_type": "appointment_booking",
    "resource_type": "appointment",
    "location_id": location.id,
    "barber_id": barber.id
})
```

### Custom Breadcrumbs
```python
from config.sentry import add_business_breadcrumb, add_performance_breadcrumb

# Business operation breadcrumb
add_business_breadcrumb(
    action="create",
    resource_type="appointment",
    resource_id="apt_12345",
    barber_id="barber_456"
)

# Performance breadcrumb
add_performance_breadcrumb(
    operation="database_query",
    duration_ms=250,
    table="appointments",
    query_type="SELECT"
)
```

### Integration with Authentication
```python
# In your auth middleware
from config.sentry import add_user_context

def add_user_to_sentry(user):
    add_user_context({
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "barber_id": getattr(user, 'barber_id', None),
        "organization_id": getattr(user, 'organization_id', None)
    })
```

## 📚 Troubleshooting

### Common Issues

#### "Sentry not configured" Error
```bash
# Check environment variable
echo $SENTRY_DSN

# Verify .env file
cat .env | grep SENTRY

# Test configuration
python -c "from config.sentry import configure_sentry; print(configure_sentry())"
```

#### Events Not Appearing in Dashboard
```bash
# Check sampling rates
echo $SENTRY_SAMPLE_RATE
echo $SENTRY_TRACES_SAMPLE_RATE

# Send test event
python -c "
import sentry_sdk
from config.sentry import configure_sentry
configure_sentry()
sentry_sdk.capture_message('Test from troubleshooting')
"
```

#### Performance Events Missing
```bash
# Verify traces sampling
echo $SENTRY_TRACES_SAMPLE_RATE

# Increase sampling for testing
export SENTRY_TRACES_SAMPLE_RATE=1.0
```

#### High Sentry Usage/Costs
```bash
# Reduce sampling rates in production
SENTRY_TRACES_SAMPLE_RATE=0.01  # 1% sampling
SENTRY_PROFILES_SAMPLE_RATE=0.01

# Enable filtering for noisy endpoints
# (Already configured in before_send_filter)
```

### Debug Mode
```bash
# Enable Sentry debug logging
export SENTRY_DEBUG=true

# Check logs for Sentry messages
tail -f logs/app.log | grep -i sentry
```

## 🚀 Production Deployment

### Pre-deployment Checklist
- [ ] Sentry project created and DSN configured
- [ ] Environment set to "production"
- [ ] Sample rates configured for cost control
- [ ] PII filtering enabled (SENTRY_SEND_DEFAULT_PII=false)
- [ ] Alert rules configured
- [ ] Team notifications set up
- [ ] Release tracking configured

### Release Tracking
```bash
# Set release version
export SENTRY_RELEASE=$(git rev-parse --short HEAD)

# Or use semantic versioning
export SENTRY_RELEASE=v2.1.0

# Sentry will automatically track releases
```

### Health Checks
```bash
# Monitor setup after deployment
./sentry-monitor.py --watch

# Send test events to verify
./test-sentry-integration.py
```

---

## 📞 Support & Resources

### Documentation
- [Sentry Python SDK](https://docs.sentry.io/platforms/python/)
- [FastAPI Integration](https://docs.sentry.io/platforms/python/guides/fastapi/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)

### Internal Tools
- `./setup-sentry.py` - Interactive setup assistant
- `./test-sentry-integration.py` - Comprehensive testing
- `./sentry-monitor.py` - Real-time monitoring dashboard

### Support Channels
- Sentry Documentation: https://docs.sentry.io
- Sentry Community: https://forum.sentry.io
- GitHub Issues: Report integration bugs

**The Sentry integration is production-ready and provides comprehensive monitoring for BookedBarber V2.**