# BookedBarber V2 - External Services Configuration Guide

This guide helps you configure the external services used by BookedBarber V2. All services use existing, well-tested implementations.

## 📋 Quick Configuration Checklist

### Required Services
- [ ] **Stripe** - Payment processing and barber payouts
- [ ] **SendGrid** - Email notifications
- [ ] **Twilio** - SMS notifications

### Optional Services
- [ ] **Google Calendar** - Calendar synchronization
- [ ] **Sentry** - Error tracking and monitoring

## 🚀 Quick Start Scripts

Each service has a dedicated configuration script:

```bash
# Stripe configuration
python scripts/configure_stripe.py --validate
python scripts/configure_stripe.py --test

# SendGrid email configuration
python scripts/configure_sendgrid.py --validate
python scripts/configure_sendgrid.py --test-email your@email.com

# Twilio SMS configuration
python scripts/configure_twilio.py --validate
python scripts/configure_twilio.py --test-sms +1234567890

# Google Calendar configuration
python scripts/configure_google_calendar.py --validate
python scripts/configure_google_calendar.py --setup

# All services validation
python scripts/validate_all_services.py
```

## 💳 Stripe Configuration

### Service Implementation
- **Payment Processing**: `services/payment_service.py`
- **Stripe Connect**: `services/stripe_integration_service.py`
- **API Endpoints**: `/api/v2/payments/*`, `/api/v2/integrations/stripe/*`

### 1. Get Stripe Credentials

1. **Create Stripe Account**: https://dashboard.stripe.com
2. **Get API Keys**: Dashboard → Developers → API keys
3. **Set up Stripe Connect**: Dashboard → Connect → Settings

### 2. Environment Configuration

```bash
# Test Environment
STRIPE_SECRET_KEY=sk_test_your_test_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Production Environment
# STRIPE_SECRET_KEY=sk_live_your_live_secret_key
# STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
# STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret
```

### 3. Configuration & Testing

```bash
# Validate configuration
python scripts/configure_stripe.py --validate

# Test payment functionality
python scripts/configure_stripe.py --test

# Configure webhooks
python scripts/configure_stripe.py --webhook-url https://your-domain.com/api/v2/webhooks/stripe
```

### 4. Features Enabled

✅ **Payment Processing** - Credit card payments for appointments  
✅ **Stripe Connect** - Direct payouts to barbers  
✅ **Webhooks** - Real-time payment status updates  
✅ **Refunds** - Automated refund processing  
✅ **Gift Certificates** - Digital gift certificate system

## 📧 SendGrid Email Configuration

### Service Implementation
- **Email Service**: `services/notification_service.py`
- **Templates**: `/templates/notifications/`
- **API Endpoints**: `/api/v2/notifications/*`

### 1. Get SendGrid Credentials

1. **Create SendGrid Account**: https://app.sendgrid.com
2. **Create API Key**: Settings → API Keys → Create API Key
3. **Verify Sender**: Marketing → Senders → Verify a Single Sender

### 2. Environment Configuration

```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com  # Must be verified
SENDGRID_FROM_NAME=BookedBarber

# Enable email notifications
ENABLE_EMAIL_NOTIFICATIONS=true
```

### 3. Configuration & Testing

```bash
# Validate configuration
python scripts/configure_sendgrid.py --validate

# Set up sender verification
python scripts/configure_sendgrid.py --setup-sender

# Test email sending
python scripts/configure_sendgrid.py --test-email your@email.com

# Check account statistics
python scripts/configure_sendgrid.py --stats
```

### 4. Features Enabled

✅ **Appointment Notifications** - Confirmations, reminders, changes  
✅ **Email Templates** - Professional HTML email templates  
✅ **Delivery Tracking** - Email delivery status monitoring  
✅ **Unsubscribe Management** - GDPR-compliant unsubscribe handling  
✅ **Marketing Emails** - Newsletter and promotional campaigns

## 📱 Twilio SMS Configuration

### Service Implementation
- **SMS Service**: `services/notification_service.py`
- **SMS Responses**: `services/sms_response_handler.py`
- **API Endpoints**: `/api/v2/notifications/*`, `/api/v2/sms/*`

### 1. Get Twilio Credentials

1. **Create Twilio Account**: https://console.twilio.com
2. **Get Credentials**: Console Dashboard → Account SID & Auth Token
3. **Buy Phone Number**: Phone Numbers → Manage → Buy a number

### 2. Environment Configuration

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number

# Enable SMS notifications
ENABLE_SMS_NOTIFICATIONS=true
```

### 3. Configuration & Testing

```bash
# Validate configuration
python scripts/configure_twilio.py --validate

# Test SMS sending
python scripts/configure_twilio.py --test-sms +1234567890

# Configure webhooks for two-way SMS
python scripts/configure_twilio.py --webhook-url https://your-domain.com/api/v2/sms/webhook

# Check usage statistics
python scripts/configure_twilio.py --usage
```

### 4. Features Enabled

✅ **SMS Notifications** - Appointment reminders and confirmations  
✅ **Two-way SMS** - Customers can reply to messages  
✅ **SMS Templates** - Customizable SMS message templates  
✅ **Unsubscribe Handling** - Automatic STOP message processing  
✅ **Delivery Tracking** - SMS delivery status monitoring

## 📅 Google Calendar Configuration

### Service Implementation
- **Calendar Service**: `services/google_calendar_service.py`
- **API Endpoints**: `/api/v2/calendar/*`
- **OAuth Flow**: `/api/v2/integrations/google-calendar/*`

### 1. Set Up Google Cloud Project

1. **Create Project**: https://console.cloud.google.com
2. **Enable Calendar API**: APIs & Services → Library → Google Calendar API
3. **Create OAuth Credentials**: APIs & Services → Credentials → Create Credentials

### 2. Environment Configuration

```bash
# Google Calendar Configuration
GOOGLE_CLIENT_ID=your_client_id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/calendar/callback

# Enable Google Calendar integration
ENABLE_GOOGLE_CALENDAR=true
```

### 3. Configuration & Testing

```bash
# Show setup guide
python scripts/configure_google_calendar.py --setup

# Validate configuration
python scripts/configure_google_calendar.py --validate

# Generate OAuth URL for testing
python scripts/configure_google_calendar.py --generate-auth-url

# Test user integration (after OAuth)
python scripts/configure_google_calendar.py --test-user USER_ID
```

### 4. Features Enabled

✅ **Two-way Sync** - Appointments sync to/from Google Calendar  
✅ **Availability Checking** - Prevent double-booking  
✅ **Event Management** - Create, update, delete calendar events  
✅ **Multiple Calendars** - Support for multiple calendar selection  
✅ **Timezone Support** - Proper timezone handling

## 🔧 All Services Validation Script

Let me create a comprehensive validation script that tests all services:

### Create Master Validation Script

```bash
python scripts/validate_all_services.py --full
```

This script will:
- ✅ Test all API keys and credentials
- ✅ Validate service configurations
- ✅ Check existing service implementations
- ✅ Generate configuration report
- ✅ Provide setup recommendations

## 📊 Configuration Status Dashboard

### Check Service Status

```python
# Quick status check
from services.notification_service import NotificationService
from services.payment_service import PaymentService
from services.google_calendar_service import GoogleCalendarService

# Check service availability
notification_service = NotificationService()
print(f"SendGrid: {'✅' if notification_service.sendgrid_client else '❌'}")
print(f"Twilio: {'✅' if notification_service.twilio_client else '❌'}")
print(f"Stripe: {'✅' if PaymentService else '❌'}")
```

## 🔐 Security Best Practices

### API Key Management
1. **Never commit API keys** to version control
2. **Use environment variables** for all credentials
3. **Rotate keys regularly** (quarterly recommended)
4. **Use different keys** for development/production
5. **Monitor API usage** for unusual activity

### Webhook Security
1. **Verify webhook signatures** (implemented in existing services)
2. **Use HTTPS** for all webhook endpoints
3. **Implement idempotency** (included in existing services)
4. **Rate limit webhook endpoints**

## 🚨 Troubleshooting

### Common Issues

#### Stripe Issues
```bash
# Invalid API key
Error: "No such API key"
Solution: Check STRIPE_SECRET_KEY format (sk_test_ or sk_live_)

# Webhook failures
Error: "Webhook signature verification failed"
Solution: Verify STRIPE_WEBHOOK_SECRET matches Stripe dashboard
```

#### SendGrid Issues
```bash
# Invalid sender
Error: "The from address does not match a verified Sender Identity"
Solution: Verify SENDGRID_FROM_EMAIL in SendGrid dashboard

# API key issues
Error: "Unauthorized"
Solution: Check SENDGRID_API_KEY format (starts with SG.)
```

#### Twilio Issues
```bash
# Invalid phone number
Error: "The number +1234567890 is not a valid phone number"
Solution: Check TWILIO_PHONE_NUMBER belongs to your account

# Authentication failed
Error: "Unable to create record"
Solution: Verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN
```

#### Google Calendar Issues
```bash
# OAuth errors
Error: "Invalid client ID"
Solution: Check GOOGLE_CLIENT_ID matches Google Cloud Console

# Permission errors
Error: "Insufficient permission"
Solution: Ensure Calendar API is enabled and user granted permissions
```

### Debug Commands

```bash
# Test individual services
python scripts/configure_stripe.py --validate-only
python scripts/configure_sendgrid.py --validate
python scripts/configure_twilio.py --validate
python scripts/configure_google_calendar.py --validate

# Check environment variables
python -c "from config import settings; print(f'Stripe: {bool(settings.stripe_secret_key)}')"
python -c "from config import settings; print(f'SendGrid: {bool(settings.sendgrid_api_key)}')"
python -c "from config import settings; print(f'Twilio: {bool(settings.twilio_account_sid)}')"
```

## 📝 Configuration Templates

### Development .env Template
```bash
# Copy template and fill in values
cp .env.template .env

# Generate sample configurations
python scripts/configure_stripe.py --generate-sample
python scripts/configure_sendgrid.py --generate-sample
python scripts/configure_twilio.py --generate-sample
python scripts/configure_google_calendar.py --generate-sample
```

### Production Deployment
1. **Use secure key generation**:
   ```bash
   python scripts/generate_production_keys.py
   ```

2. **Validate production config**:
   ```bash
   ENVIRONMENT=production python scripts/validate_all_services.py
   ```

3. **Test production services**:
   ```bash
   python scripts/validate_all_services.py --production-test
   ```

## 🎯 Next Steps

### After Configuration
1. **Test each service** using the provided scripts
2. **Configure webhooks** for real-time updates
3. **Set up monitoring** and error tracking
4. **Train users** on new integrations
5. **Monitor usage** and costs

### Production Readiness
1. **Generate production keys** with proper security
2. **Set up domain authentication** (SendGrid)
3. **Configure webhook endpoints** with SSL
4. **Enable monitoring** and alerting
5. **Create backup procedures**

## 📞 Support

### Documentation
- **Stripe**: https://stripe.com/docs
- **SendGrid**: https://docs.sendgrid.com
- **Twilio**: https://www.twilio.com/docs
- **Google Calendar**: https://developers.google.com/calendar

### Service Status
- **Stripe Status**: https://status.stripe.com
- **SendGrid Status**: https://status.sendgrid.com
- **Twilio Status**: https://status.twilio.com
- **Google Workspace Status**: https://workspace.google.com/status

---

*This guide covers configuration of all existing external service integrations in BookedBarber V2. All services use production-ready implementations that are already built and tested.*