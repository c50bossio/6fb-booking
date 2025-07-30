# 🔧 Quick API Configuration Guide

## 📋 Required API Keys

Add these environment variables to your production environment:

### 1. Twilio (SMS Messages)
```bash
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here  
TWILIO_PHONE_NUMBER=+1234567890
```

**Get these from:** https://console.twilio.com
- Sign up for free account
- Get $15 free trial credit
- Purchase a phone number (~$1/month)

### 2. SendGrid (Email Messages)
```bash
SENDGRID_API_KEY=your_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

**Get these from:** https://sendgrid.com
- Sign up for free account (100 emails/day free)
- Create API key with full access
- Verify your sending domain

### 3. Stripe (Billing & Payments)
```bash
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key  
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

**Get these from:** https://dashboard.stripe.com/test/apikeys
- Use existing account or create new one
- Use test keys initially
- Set up webhook endpoint later

## 🚀 Quick Start (5 Minutes)

### Option 1: Test with Mock Mode
The system works in mock mode without API keys:
- SMS: Logs to console instead of sending
- Email: Logs to console instead of sending  
- Billing: Works with test mode

### Option 2: Twilio Only (SMS First)
1. Sign up at twilio.com
2. Get free trial credits
3. Add just TWILIO_* env vars
4. Test SMS reminders immediately

### Option 3: Full Setup (30 minutes)
1. Create all three accounts
2. Add all environment variables
3. Test complete system functionality

## ✅ Validation Commands

```bash
# Test Twilio
curl -X POST "http://localhost:8000/api/v2/reminders/test/sms" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "message": "Test message"}'

# Test SendGrid  
curl -X POST "http://localhost:8000/api/v2/reminders/test/email" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "subject": "Test", "body": "Test message"}'

# Test Billing Plans
curl -X GET "http://localhost:8000/api/v2/reminders/billing/plans"
```

## 🎯 Recommended Approach

**Start with Twilio SMS only:**
1. 5-minute Twilio setup
2. Test SMS reminders with pilot customers  
3. Add email/billing once SMS is proven
4. This gets you 80% of the value in 5% of the setup time

The reminder system is **production ready** - API configuration is just the final step!