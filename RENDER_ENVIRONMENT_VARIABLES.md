# Render Environment Variables Configuration Guide

## Overview
This guide documents all environment variables that need to be configured in your Render dashboard for the 6FB Booking Platform to function properly.

## How to Add Environment Variables in Render

1. Log in to your Render dashboard
2. Navigate to your backend service
3. Click on "Environment" in the left sidebar
4. Click "Add Environment Variable"
5. Enter the key and value
6. Click "Save Changes"

## Required Environment Variables

### 🔐 Core Security & Database (Already Set)
These should already be configured from your initial deployment:

```bash
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]
SECRET_KEY=[your-generated-secret-key]
ENVIRONMENT=production
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

### 💳 Stripe Payment Integration

```bash
# Production Stripe Keys (from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Webhook Secret (from https://dashboard.stripe.com/webhooks)
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Connect for Barber Onboarding
STRIPE_CONNECT_CLIENT_ID=ca_...

# Optional: Test mode keys for staging
# STRIPE_TEST_SECRET_KEY=sk_test_...
# STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
```

### 📧 SendGrid Email Service

```bash
# SendGrid API Key (from https://app.sendgrid.com/settings/api_keys)
SENDGRID_API_KEY=SG...

# Verified Sender Email (must be verified in SendGrid)
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Dynamic Template IDs (create at https://mc.sendgrid.com/dynamic-templates)
SENDGRID_TEMPLATE_ID_BOOKING=d-...     # Booking confirmation
SENDGRID_TEMPLATE_ID_REMINDER=d-...    # Appointment reminder
SENDGRID_TEMPLATE_ID_WELCOME=d-...     # Welcome email
SENDGRID_TEMPLATE_ID_RESET=d-...       # Password reset
```

### 💬 Twilio SMS Service

```bash
# Twilio Credentials (from https://console.twilio.com)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...

# Your Twilio Phone Number
TWILIO_PHONE_NUMBER=+1234567890

# Messaging Service SID (optional but recommended)
TWILIO_MESSAGING_SERVICE_SID=MG...

# Optional: WhatsApp Business Number
# TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
```

### 📅 Google Calendar Integration

```bash
# OAuth2 Credentials (from https://console.cloud.google.com)
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# Must match your OAuth2 configuration
GOOGLE_REDIRECT_URI=https://sixfb-backend.onrender.com/api/v1/auth/google/callback

# Calendar API Scopes
GOOGLE_CALENDAR_SCOPES=https://www.googleapis.com/auth/calendar

# Optional: Service Account for server-side operations
# GOOGLE_SERVICE_ACCOUNT_KEY=[base64-encoded-json]
```

### 📊 Monitoring & Analytics

```bash
# Sentry Error Tracking (from https://sentry.io)
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# Google Analytics 4 (from Google Analytics Admin)
GOOGLE_ANALYTICS_ID=G-...

# UptimeRobot Monitoring (optional)
UPTIMEROBOT_API_KEY=...

# New Relic APM (optional)
# NEW_RELIC_LICENSE_KEY=...
# NEW_RELIC_APP_NAME=6fb-booking-backend
```

### 🔧 Additional Configuration

```bash
# Redis Cache (if using Render Redis)
# REDIS_URL=redis://...

# File Storage (if using S3 for uploads)
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
# AWS_S3_BUCKET=6fb-booking-uploads
# AWS_REGION=us-east-1

# Feature Flags
ENABLE_SMS_NOTIFICATIONS=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_GOOGLE_CALENDAR_SYNC=true
ENABLE_PAYMENT_PROCESSING=true

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000

# Session Configuration
SESSION_EXPIRE_MINUTES=1440  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS=30

# Business Configuration
BUSINESS_NAME=Six Figure Barber
BUSINESS_TIMEZONE=America/New_York
BOOKING_ADVANCE_DAYS=30
BOOKING_BUFFER_MINUTES=15
```

## Environment Variable Validation Script

Create a file `validate_env.py` in your backend directory:

```python
import os
import sys

required_vars = {
    "Core": ["DATABASE_URL", "SECRET_KEY", "ENVIRONMENT"],
    "Stripe": ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY"],
    "SendGrid": ["SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL"],
    "Twilio": ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"],
    "Google": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]
}

missing = []
for category, vars in required_vars.items():
    for var in vars:
        if not os.getenv(var):
            missing.append(f"{category}: {var}")

if missing:
    print("❌ Missing environment variables:")
    for var in missing:
        print(f"  - {var}")
    sys.exit(1)
else:
    print("✅ All required environment variables are set!")
```

## Security Best Practices

1. **Never commit secrets to Git**
   - Use `.env` files locally
   - Add `.env` to `.gitignore`

2. **Use strong, unique values**
   ```bash
   # Generate secure secrets
   python -c "import secrets; print(secrets.token_urlsafe(64))"
   ```

3. **Rotate keys regularly**
   - Set calendar reminders for key rotation
   - Update webhook endpoints when rotating

4. **Use separate keys for staging/production**
   - Prefix with environment (e.g., `PROD_STRIPE_KEY`)

5. **Limit API key permissions**
   - Use minimal required scopes
   - Restrict by IP when possible

## Troubleshooting

### Common Issues

1. **"Environment variable not found" errors**
   - Check spelling and capitalization
   - Ensure no trailing spaces
   - Restart service after adding variables

2. **API key authentication failures**
   - Verify key is active in provider dashboard
   - Check for correct environment (test vs live)
   - Ensure proper formatting (no extra quotes)

3. **OAuth redirect errors**
   - Redirect URI must match exactly
   - Include trailing slashes if present
   - Update in both Render and provider

### Verification Commands

Run these in Render Shell to verify:

```bash
# Check if variables are set
python -c "import os; print('DATABASE_URL:', 'Set' if os.getenv('DATABASE_URL') else 'Not Set')"

# Test email sending
python -c "from services.notification_service import send_test_email; send_test_email()"

# Test SMS sending
python -c "from services.notification_service import send_test_sms; send_test_sms('+1234567890')"
```

## Next Steps

1. Add all required environment variables in Render
2. Run the validation script to ensure everything is set
3. Test each integration individually
4. Monitor logs for any configuration errors

---

**Need Help?**
- Render Docs: https://render.com/docs/environment-variables
- Check application logs in Render dashboard
- Review provider-specific documentation for API keys
