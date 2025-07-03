# Sentry Error Tracking Integration Guide

## Overview

This document provides comprehensive guidance for using Sentry error tracking in the BookedBarber V2 backend. Our implementation includes advanced error monitoring, performance tracking, user context, and business logic monitoring.

## Table of Contents

1. [Setup and Configuration](#setup-and-configuration)
2. [Environment Configuration](#environment-configuration)
3. [Features and Capabilities](#features-and-capabilities)
4. [Usage Examples](#usage-examples)
5. [Testing and Validation](#testing-and-validation)
6. [Deployment Guide](#deployment-guide)
7. [Monitoring and Alerts](#monitoring-and-alerts)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

## Setup and Configuration

### 1. Prerequisites

- Sentry account and project created at [sentry.io](https://sentry.io)
- Python 3.9+ with FastAPI
- Redis (for background job monitoring)
- PostgreSQL or SQLite database

### 2. Installation

The Sentry SDK is included in `requirements.txt`:

```bash
pip install -r requirements.txt
```

### 3. Basic Configuration

Set your Sentry DSN in environment variables:

```bash
# Required
export SENTRY_DSN="https://your-dsn@sentry.io/project-id"

# Optional (recommended)
export SENTRY_ENVIRONMENT="production"
export SENTRY_RELEASE="bookedbarber-v2@1.0.0"
```

## Environment Configuration

### Development Environment

```bash
# .env file for development
SENTRY_DSN="https://your-dev-dsn@sentry.io/project-id"
SENTRY_ENVIRONMENT=development
SENTRY_DEBUG=true
SENTRY_SAMPLE_RATE=1.0
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_PROFILES_SAMPLE_RATE=1.0
```

### Staging Environment

```bash
# .env file for staging
SENTRY_DSN="https://your-staging-dsn@sentry.io/project-id"
SENTRY_ENVIRONMENT=staging
SENTRY_DEBUG=false
SENTRY_SAMPLE_RATE=1.0
SENTRY_TRACES_SAMPLE_RATE=0.5
SENTRY_PROFILES_SAMPLE_RATE=0.2
```

### Production Environment

```bash
# .env file for production
SENTRY_DSN="https://your-prod-dsn@sentry.io/project-id"
SENTRY_ENVIRONMENT=production
SENTRY_DEBUG=false
SENTRY_SAMPLE_RATE=0.8
SENTRY_TRACES_SAMPLE_RATE=0.05
SENTRY_PROFILES_SAMPLE_RATE=0.02
SENTRY_SEND_DEFAULT_PII=false
SENTRY_INCLUDE_LOCAL_VARIABLES=false
```

### All Available Configuration Options

```bash
# Core Settings
SENTRY_DSN=""                           # Required: Your Sentry DSN
SENTRY_ENVIRONMENT="development"        # Environment name
SENTRY_RELEASE=""                       # Release version (auto-detected if not set)

# Sampling Rates (0.0 to 1.0)
SENTRY_SAMPLE_RATE=1.0                  # Error sampling rate
SENTRY_TRACES_SAMPLE_RATE=0.1           # Performance transaction sampling
SENTRY_PROFILES_SAMPLE_RATE=0.1         # Profiling sampling rate

# Privacy and Debug Settings
SENTRY_DEBUG=false                      # Enable debug logging
SENTRY_SEND_DEFAULT_PII=false           # Send personally identifiable information
SENTRY_ATTACH_STACKTRACE=true           # Attach stack traces to messages
SENTRY_INCLUDE_LOCAL_VARIABLES=true     # Include local variables in stack traces
SENTRY_MAX_BREADCRUMBS=100              # Maximum breadcrumbs to keep
```

## Features and Capabilities

### 1. Comprehensive Error Monitoring

- **Automatic Error Capture**: All unhandled exceptions are automatically captured
- **Manual Error Capture**: Use specialized functions for different error types
- **Error Filtering**: Intelligent filtering to reduce noise
- **Custom Fingerprinting**: Better error grouping for similar issues

### 2. Performance Monitoring

- **Transaction Tracking**: Monitor API endpoint performance
- **Database Query Monitoring**: Track slow queries and database errors
- **Custom Measurements**: Track business-specific metrics

### 3. Enhanced Context

- **User Context**: Automatic user information extraction from JWT tokens
- **Business Context**: Appointment, payment, and integration context
- **Request Context**: Detailed request information and metadata

### 4. Background Job Monitoring

- **Celery Task Monitoring**: Track task execution and failures
- **Redis Operation Monitoring**: Monitor cache operations
- **Notification System Monitoring**: Track email/SMS delivery

### 5. Security Features

- **PII Redaction**: Automatic removal of sensitive information
- **Secure Error Filtering**: Filter out non-critical errors
- **Environment-Aware Configuration**: Different settings per environment

## Usage Examples

### Basic Error Capture

```python
import sentry_sdk
from config.sentry import configure_sentry

# Initialize Sentry (done automatically in main.py)
configure_sentry()

# Capture an exception
try:
    # Some operation that might fail
    result = risky_operation()
except Exception as e:
    sentry_sdk.capture_exception(e)
    
# Capture a message
sentry_sdk.capture_message("Something important happened", level="info")
```

### Business-Specific Error Capture

```python
from config.sentry import (
    capture_booking_error,
    capture_payment_error,
    capture_integration_error
)

# Booking errors with context
try:
    create_appointment(user_id, barber_id, datetime)
except Exception as e:
    capture_booking_error(
        error=e,
        appointment_id=appointment.id,
        user_id=user.id,
        location_id=location.id
    )

# Payment errors with context
try:
    process_payment(amount, currency)
except Exception as e:
    capture_payment_error(
        error=e,
        payment_id=payment.id,
        amount=amount,
        currency=currency,
        stripe_error_code=stripe_error.code
    )

# Integration errors with context
try:
    sync_google_calendar()
except Exception as e:
    capture_integration_error(
        error=e,
        integration_type="google_calendar",
        operation="sync_events",
        external_id=calendar_id
    )
```

### Performance Monitoring

```python
import sentry_sdk
from config.sentry import monitor_performance

# Monitor function performance
@monitor_performance("booking_creation")
def create_booking(user_id, service_id, datetime):
    # Booking logic here
    return booking

# Manual transaction tracking
with sentry_sdk.start_transaction(op="api", name="create_appointment"):
    # Track specific operations
    with sentry_sdk.start_span(op="db.query", description="find_available_slots"):
        slots = find_available_slots(date, barber_id)
    
    with sentry_sdk.start_span(op="business.logic", description="validate_booking"):
        validate_booking_rules(slots, user_preferences)
```

### Enhanced Context

```python
from config.sentry import add_user_context, add_business_context

# Add user context (automatically done by middleware)
add_user_context(
    user_id=user.id,
    user_email=user.email,
    user_role=user.role,
    location_id=user.location_id
)

# Add business context
add_business_context(
    appointment_id=appointment.id,
    payment_id=payment.id,
    service_type="haircut",
    integration_type="google_calendar"
)
```

### Database Monitoring

```python
from services.sentry_monitoring import monitored_db_session, database_monitor
from database import SessionLocal

# Use monitored database sessions
with monitored_db_session(SessionLocal) as db:
    # Database operations are automatically monitored
    appointments = db.query(Appointment).filter(
        Appointment.user_id == user_id
    ).all()

# The database monitoring includes:
# - Query performance tracking
# - Slow query detection
# - Database error capture
# - Connection pool monitoring
```

### Celery Task Monitoring

```python
from services.sentry_monitoring import celery_monitor

# Monitor Celery tasks
@celery_monitor.monitor_task_execution("send_email_notification")
@celery_app.task
def send_email_notification(user_id, template, context):
    # Task implementation
    return result

# Automatic monitoring includes:
# - Task execution time
# - Task failure capture
# - Retry tracking
# - Performance metrics
```

## Testing and Validation

### 1. Test Sentry Integration

Run comprehensive integration tests:

```bash
# Test all components
python test_sentry_integration.py --test-type all --verbose

# Test specific components
python test_sentry_integration.py --test-type database
python test_sentry_integration.py --test-type payment
python test_sentry_integration.py --test-type performance
```

### 2. Validate Deployment Setup

Validate configuration before deployment:

```bash
# Validate for production deployment
python validate_sentry_setup.py --environment production --verbose

# Validate specific aspects
python validate_sentry_setup.py --check-type connectivity
python validate_sentry_setup.py --check-type security
python validate_sentry_setup.py --check-type performance
```

### 3. Health Check

Check Sentry health via API:

```bash
curl http://localhost:8000/health
```

Response includes Sentry status:

```json
{
  "status": "healthy",
  "sentry": {
    "enabled": true,
    "dsn_configured": true,
    "environment": "production",
    "release": "bookedbarber-v2@1.0.0",
    "sample_rate": 0.8,
    "traces_sample_rate": 0.05
  }
}
```

## Deployment Guide

### 1. Pre-Deployment Checklist

- [ ] Sentry project created and configured
- [ ] DSN and environment variables set
- [ ] Sample rates configured for environment
- [ ] Security settings reviewed (PII, debug mode)
- [ ] Release version configured
- [ ] Validation tests pass

### 2. Environment-Specific Deployment

#### Development
```bash
# High sampling for full visibility
export SENTRY_SAMPLE_RATE=1.0
export SENTRY_TRACES_SAMPLE_RATE=1.0
export SENTRY_DEBUG=true
```

#### Staging
```bash
# Balanced sampling for testing
export SENTRY_SAMPLE_RATE=1.0
export SENTRY_TRACES_SAMPLE_RATE=0.5
export SENTRY_DEBUG=false
```

#### Production
```bash
# Optimized sampling for performance
export SENTRY_SAMPLE_RATE=0.8
export SENTRY_TRACES_SAMPLE_RATE=0.05
export SENTRY_SEND_DEFAULT_PII=false
export SENTRY_DEBUG=false
```

### 3. Release Tracking

Configure release tracking for deployments:

```bash
# Automatic release detection from git
export SENTRY_RELEASE="bookedbarber-v2@$(git rev-parse --short HEAD)"

# Or set manually
export SENTRY_RELEASE="bookedbarber-v2@1.2.3"
```

### 4. Docker Deployment

For Docker deployments, ensure environment variables are passed:

```yaml
# docker-compose.yml
services:
  backend:
    environment:
      - SENTRY_DSN=${SENTRY_DSN}
      - SENTRY_ENVIRONMENT=${SENTRY_ENVIRONMENT}
      - SENTRY_RELEASE=${SENTRY_RELEASE}
```

### 5. Railway/Render Deployment

Set environment variables in platform dashboard:

```bash
# Railway
railway variables set SENTRY_DSN="your-dsn"

# Render
# Set via dashboard environment variables
```

## Monitoring and Alerts

### 1. Sentry Dashboard Setup

Configure the following in your Sentry project:

- **Error Rate Alerts**: Alert when error rate exceeds threshold
- **Performance Alerts**: Alert on slow transactions
- **Release Health**: Monitor release stability
- **Custom Metrics**: Track business-specific metrics

### 2. Key Metrics to Monitor

#### Error Metrics
- **Error Rate**: Errors per minute/hour
- **Error Types**: Distribution of error categories
- **User Impact**: Number of users affected
- **Resolution Time**: Time to resolve issues

#### Performance Metrics
- **Response Time**: API endpoint performance
- **Database Performance**: Query execution times
- **Background Jobs**: Task completion rates
- **Integration Health**: External service reliability

#### Business Metrics
- **Booking Errors**: Failed appointment creations
- **Payment Failures**: Payment processing issues
- **Integration Failures**: External service problems
- **User Experience**: Error impact on user journeys

### 3. Alert Configuration Examples

```python
# Example alert rules (configured in Sentry dashboard)

# High error rate alert
{
  "name": "High Error Rate",
  "conditions": "error.count > 100 in 5 minutes",
  "actions": "email team, slack notification"
}

# Slow performance alert
{
  "name": "Slow API Performance",
  "conditions": "transaction.duration > 2000ms for /api/v1/appointments",
  "actions": "email devops team"
}

# Payment error alert
{
  "name": "Payment Processing Issues",
  "conditions": "error.category = payment AND error.count > 5 in 1 minute",
  "actions": "urgent notification, page on-call"
}
```

## Troubleshooting

### Common Issues

#### 1. Sentry Not Capturing Events

**Problem**: Events not appearing in Sentry dashboard

**Solutions**:
```bash
# Check DSN configuration
python validate_sentry_setup.py --check-type config

# Test connectivity
python validate_sentry_setup.py --check-type connectivity

# Verify integration
python test_sentry_integration.py --test-type basic
```

#### 2. High Volume of Events

**Problem**: Too many events, exceeding quota

**Solutions**:
- Adjust sample rates in production
- Review and improve error filtering
- Check for infinite loops or repeated errors

```bash
# Reduce sample rates
export SENTRY_SAMPLE_RATE=0.5
export SENTRY_TRACES_SAMPLE_RATE=0.02
```

#### 3. Missing User Context

**Problem**: User information not appearing in error events

**Solutions**:
- Verify JWT token is valid
- Check middleware order in main.py
- Ensure SECRET_KEY is configured for middleware

#### 4. Performance Impact

**Problem**: Sentry integration affecting application performance

**Solutions**:
- Reduce traces_sample_rate
- Optimize error filtering
- Check for synchronous operations in async contexts

### Debug Mode

Enable debug mode for troubleshooting:

```bash
export SENTRY_DEBUG=true
```

### Validation Commands

```bash
# Comprehensive validation
python validate_sentry_setup.py --environment production --verbose

# Test specific functionality
python test_sentry_integration.py --test-type integration

# Check health status
curl http://localhost:8000/health | jq '.sentry'
```

## Best Practices

### 1. Error Handling

```python
# DO: Use specific error capture functions
capture_payment_error(error, payment_id="pay_123")

# DON'T: Use generic capture for business errors
sentry_sdk.capture_exception(error)  # Less context
```

### 2. Performance Monitoring

```python
# DO: Monitor critical business operations
@monitor_performance("critical_booking_flow")
def process_booking_request():
    pass

# DON'T: Monitor every small function
@monitor_performance("simple_utility_function")  # Overhead
def format_date():
    pass
```

### 3. Context Management

```python
# DO: Use scoped contexts for temporary data
with sentry_sdk.push_scope() as scope:
    scope.set_tag("payment_method", "stripe")
    process_payment()

# DON'T: Set global context for request-specific data
sentry_sdk.set_tag("request_id", "temp_value")  # Global pollution
```

### 4. Sampling Configuration

```python
# DO: Environment-appropriate sampling
production_config = {
    "sample_rate": 0.8,          # 80% of errors
    "traces_sample_rate": 0.05,  # 5% of transactions
    "profiles_sample_rate": 0.02 # 2% of profiles
}

# DON'T: High sampling in production
production_config = {
    "sample_rate": 1.0,          # 100% - too expensive
    "traces_sample_rate": 1.0,   # 100% - too expensive
}
```

### 5. Security Considerations

```python
# DO: Redact sensitive information
def before_send(event, hint):
    if 'user' in event:
        event['user'].pop('password', None)
    return event

# DON'T: Send PII in production
SENTRY_SEND_DEFAULT_PII=true  # Don't do this in production
```

### 6. Release Management

```bash
# DO: Use semantic versioning
SENTRY_RELEASE="bookedbarber-v2@1.2.3"

# DO: Include git commit hash
SENTRY_RELEASE="bookedbarber-v2@$(git rev-parse --short HEAD)"

# DON'T: Use vague or changing identifiers
SENTRY_RELEASE="latest"  # Not helpful for tracking
```

## Support and Resources

### Internal Resources
- Configuration: `/backend-v2/config/sentry.py`
- Middleware: `/backend-v2/middleware/sentry_middleware.py`
- Monitoring: `/backend-v2/services/sentry_monitoring.py`
- Tests: `/backend-v2/test_sentry_integration.py`
- Validation: `/backend-v2/validate_sentry_setup.py`

### External Resources
- [Sentry Documentation](https://docs.sentry.io/)
- [FastAPI Integration Guide](https://docs.sentry.io/platforms/python/guides/fastapi/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Error Tracking Best Practices](https://docs.sentry.io/product/error-tracking/)

### Getting Help

1. **Check Health Status**: `curl http://localhost:8000/health`
2. **Run Validation**: `python validate_sentry_setup.py`
3. **Test Integration**: `python test_sentry_integration.py`
4. **Review Logs**: Check application logs for Sentry-related messages
5. **Sentry Dashboard**: Check event delivery in Sentry project dashboard

---

## Changelog

- **v1.0.0** (2025-07-03): Initial Sentry integration implementation
  - Comprehensive error tracking and performance monitoring
  - Custom middleware for enhanced context
  - Database and background job monitoring
  - Security-focused configuration with PII redaction
  - Environment-specific configuration templates
  - Comprehensive testing and validation tools