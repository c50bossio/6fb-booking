# Payout Scheduler Service Documentation

## Overview

The Payout Scheduler Service is a production-ready, intelligent system for automatically processing barber payouts in the 6FB booking platform. It handles commission calculations, payment processing, retry mechanisms, and comprehensive monitoring.

## Features

### Core Features
- **Automated Scheduling**: Support for daily, weekly, bi-weekly, monthly, and custom payout frequencies
- **Intelligent Scheduling**: Prioritizes payouts based on urgency, amount, and barber status
- **Multiple Payment Methods**: Stripe Connect (standard & instant), bank transfers, manual methods
- **Retry Mechanisms**: Automatic retry with exponential backoff for failed payouts
- **Commission Calculations**: Tiered commission structures with volume bonuses
- **Comprehensive Monitoring**: Real-time health monitoring and alerts
- **Notification System**: Email and SMS notifications for payouts

### Advanced Features
- **Distributed Locking**: Redis-based locking prevents duplicate processing
- **Batch Processing**: Efficient handling of large volumes
- **Peak/Off-Peak Management**: Adjusts processing based on system load
- **Analytics & Reporting**: Detailed payout analytics and performance metrics
- **Schedule Optimization**: AI-driven recommendations for better payout schedules

## Architecture

### Components

1. **PayoutSchedulerService** (`payout_scheduler_service.py`)
   - Main service orchestrating all payout operations
   - Manages APScheduler for job scheduling
   - Handles distributed locking via Redis
   - Implements intelligent scheduling algorithms

2. **Database Models** (`models/payout_schedule.py`)
   - `PayoutSchedule`: Barber payout configurations
   - `ScheduledPayout`: Individual payout records
   - `PayoutEarning`: Detailed earning breakdowns
   - `PayoutNotification`: Notification tracking

3. **API Endpoints** (`api/v1/endpoints/payout_scheduler.py`)
   - REST API for managing payout schedules
   - Manual payout triggers
   - Analytics and reporting endpoints

4. **Startup Integration** (`startup/init_payout_scheduler.py`)
   - Automatic initialization on app startup
   - Loads existing schedules from database

## Installation & Setup

### 1. Install Dependencies

```bash
pip install apscheduler redis sqlalchemy stripe
```

### 2. Run Database Migration

```bash
cd backend
python migrations/add_payout_scheduler_tables.py
```

### 3. Configure Environment Variables

```env
# Redis configuration
REDIS_URL=redis://localhost:6379

# Stripe configuration
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_CONNECT_CLIENT_ID=ca_xxx

# Email/SMS configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
SMS_API_KEY=your-twilio-key
```

### 4. Integrate with FastAPI App

In your `main.py`:

```python
from contextlib import asynccontextmanager
from startup.init_payout_scheduler import initialize_payout_scheduler, shutdown_payout_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await initialize_payout_scheduler()
    yield
    # Shutdown
    await shutdown_payout_scheduler()

app = FastAPI(lifespan=lifespan)

# Add the router
from api.v1.endpoints.payout_scheduler import router as payout_router
app.include_router(payout_router, prefix="/api/v1")
```

## Usage

### Creating a Payout Schedule

```python
POST /api/v1/payout-scheduler/schedules
{
    "barber_id": 123,
    "frequency": "weekly",
    "day_of_week": 5,  // Friday
    "minimum_payout_amount": 50.00,
    "auto_payout_enabled": true,
    "email_notifications": true,
    "preferred_payment_method": "stripe"
}
```

### Triggering Manual Payout

```python
POST /api/v1/payout-scheduler/payouts/manual
{
    "barber_id": 123,
    "reason": "Requested early payout"
}
```

### Getting Analytics

```python
GET /api/v1/payout-scheduler/analytics?barber_id=123&days=30
```

## Payout Calculation Logic

### Commission Structure

1. **Base Commission Rates**:
   - Standard: 70% to barber
   - Good performers (>50 services): 72%
   - High performers (>100 services): 75%

2. **Volume Bonuses**:
   - Gross amount > $10,000: +2% bonus

3. **Deductions**:
   - Booth rent (if applicable)
   - Supply fees
   - Other agreed deductions

4. **Platform Fees**:
   - Stripe standard: 0.25% + $0.25
   - Stripe instant: 1.25% + $0.25
   - Bank transfer: $0.50

### Example Calculation

```
Gross earnings: $1,000
Commission rate: 72% (good performer)
Commission amount: $720
Deductions: $50 (booth rent)
Platform fee: $2.75 (Stripe)
Net payout: $667.25
```

## Monitoring & Alerts

### Health Monitoring

The service monitors:
- Payout success rates
- Processing times
- Failed payment trends
- System performance

### Alert Thresholds

- Payment failure rate > 5%
- Webhook failure rate > 2%
- Processing time > 30 seconds
- Daily transaction drop > 50%

### Accessing Health Status

```python
GET /api/v1/payout-scheduler/health
```

## Error Handling & Retry Logic

### Retry Strategy

1. **First retry**: 5 minutes
2. **Second retry**: 15 minutes
3. **Third retry**: 1 hour

### Non-Retryable Errors

- Invalid payment method
- Account not verified
- Insufficient permissions
- Invalid amount

### Retryable Errors

- Network timeouts
- Rate limiting
- Temporary service unavailable
- Connection errors

## Testing

### Run Unit Tests

```bash
cd backend
pytest tests/test_payout_scheduler_service.py -v
```

### Test Notifications

```python
POST /api/v1/payout-scheduler/test-notification/1?notification_type=completed
```

## Best Practices

1. **Schedule Configuration**
   - Set reasonable minimum payout amounts ($25-$50)
   - Use weekly payouts for most barbers
   - Enable advance notifications

2. **Payment Methods**
   - Encourage Stripe Connect for automated payouts
   - Keep bank transfer as backup option
   - Verify payment methods regularly

3. **Monitoring**
   - Check daily payout summaries
   - Monitor failure rates
   - Review analytics weekly

4. **Security**
   - Use distributed locking for concurrent processing
   - Implement proper access controls
   - Audit payout activities

## Troubleshooting

### Common Issues

1. **Payouts not processing**
   - Check if scheduler is running: `GET /health`
   - Verify Redis connection
   - Check barber payment method status

2. **High failure rate**
   - Review error logs in Sentry
   - Check Stripe/payment provider status
   - Verify account configurations

3. **Notifications not sending**
   - Verify email/SMS credentials
   - Check notification preferences
   - Review delivery logs

### Debug Mode

Enable debug logging:

```python
import logging
logging.getLogger('services.payout_scheduler_service').setLevel(logging.DEBUG)
```

## Performance Optimization

### Scaling Considerations

1. **Horizontal Scaling**
   - Use Redis for distributed locking
   - Run multiple instances with same Redis
   - Load balance API requests

2. **Database Optimization**
   - Indexes on frequently queried fields
   - Partition large tables by date
   - Archive old payout records

3. **Processing Optimization**
   - Batch similar payouts
   - Process during off-peak hours
   - Use connection pooling

## Future Enhancements

1. **Machine Learning**
   - Predict optimal payout times
   - Detect fraud patterns
   - Optimize commission structures

2. **Additional Payment Methods**
   - Venmo integration
   - Cash App support
   - Cryptocurrency payouts

3. **Advanced Features**
   - Multi-currency support
   - Tax withholding calculations
   - Financial reporting integration

## Support

For issues or questions:
1. Check logs in Sentry
2. Review this documentation
3. Contact the development team

---

Last Updated: 2025-06-25
