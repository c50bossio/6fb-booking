# Staging Webhook Environment Setup Guide

## 🎯 Overview

This guide sets up a separate staging environment for testing webhooks without affecting production data.

## 🚀 Quick Start

### 1. Start Staging Server
```bash
# Start staging backend on port 8001
uvicorn main:app --reload --port 8001 --env-file .env.staging

# Or use the staging script
./scripts/start-staging.sh
```

### 2. Configure Staging Webhooks

#### Stripe Staging Webhooks
1. Go to Stripe Dashboard → Webhooks
2. Create new webhook endpoint: `http://localhost:8001/staging/webhooks/stripe`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy webhook secret to `.env.staging` as `STRIPE_WEBHOOK_SECRET_STAGING`

#### Twilio Staging Webhooks
1. Go to Twilio Console → Phone Numbers
2. Set webhook URL: `http://localhost:8001/staging/webhooks/sms`
3. Configure webhook secret in `.env.staging` as `TWILIO_WEBHOOK_SECRET_STAGING`

### 3. Test Staging Webhooks
```bash
# Test all staging webhook endpoints
python test_staging_webhooks.py

# Test specific webhook
curl -X GET http://localhost:8001/staging/webhooks/test
```

## 📋 Staging Environment Configuration

### Environment Variables (.env.staging)
```bash
# Staging database (separate from production)
STAGING_DATABASE_URL=sqlite:///./staging_6fb_booking.db

# Staging webhook secrets
STRIPE_WEBHOOK_SECRET_STAGING=whsec_staging_secret
TWILIO_WEBHOOK_SECRET_STAGING=staging_twilio_secret

# Staging environment flags
ENVIRONMENT=staging
STAGING_MODE=true
DEBUG=true
```

### Staging Webhook Endpoints
- **Test Endpoint**: `GET /staging/webhooks/test`
- **Stripe Webhook**: `POST /staging/webhooks/stripe`  
- **SMS Webhook**: `POST /staging/webhooks/sms`
- **Validation**: `POST /staging/webhooks/validate`

## 🧪 Testing Scenarios

### 1. Payment Success Testing
```bash
curl -X POST http://localhost:8001/staging/webhooks/stripe \
  -H "stripe-signature: t=timestamp,v1=signature" \
  -H "content-type: application/json" \
  -d '{"id":"evt_test","type":"payment_intent.succeeded","data":{"object":{"id":"pi_test","amount":3500,"currency":"usd"}}}'
```

### 2. SMS Webhook Testing  
```bash
curl -X POST http://localhost:8001/staging/webhooks/sms \
  -H "content-type: application/x-www-form-urlencoded" \
  -d "From=%2B1234567890&To=%2B1987654321&Body=Test+message"
```

### 3. Webhook Validation Testing
```bash
curl -X POST http://localhost:8001/staging/webhooks/validate \
  -H "content-type: application/json" \
  -d '{"webhook_type":"stripe","test_payload":{"id":"test","type":"payment_intent.succeeded"}}'
```

## 🛡️ Security Features

### Staging-Specific Security
- **Separate webhook secrets** from production
- **Enhanced logging** for debugging
- **Safe mode processing** (no production data modification)
- **Request validation** with detailed error messages

### Monitoring and Debugging
- **Detailed logging** for all webhook events
- **Request/response tracking** for debugging
- **Payload validation** and structure checking
- **Error handling** with actionable error messages

## 📊 Monitoring Staging Webhooks

### Log Files
- **Application logs**: Check for webhook processing events
- **Staging logs**: Enhanced logging in staging environment
- **Error logs**: Detailed error tracking and debugging

### Webhook Testing Checklist
- [ ] Staging server running on port 8001
- [ ] Staging database configured and separate
- [ ] Webhook endpoints responding to test requests
- [ ] Stripe webhook signature verification working
- [ ] SMS webhook payload processing functional
- [ ] Validation endpoint working correctly
- [ ] Enhanced logging active and detailed
- [ ] Error handling providing useful debugging info

## 🚀 Production Deployment

### Before Production
1. ✅ All staging webhook tests passing
2. ✅ Signature verification working correctly
3. ✅ Database operations safe and isolated
4. ✅ Error handling comprehensive
5. ✅ Monitoring and logging in place

### Production Webhook URLs
Replace staging URLs with production URLs:
- `https://api.bookedbarber.com/webhooks/stripe`
- `https://api.bookedbarber.com/webhooks/sms`

## 📈 Benefits of Staging Webhooks

### Development Benefits
- **Safe Testing**: No risk of affecting production data
- **Enhanced Debugging**: Detailed logging and error tracking
- **Rapid Iteration**: Quick testing of webhook modifications
- **Isolation**: Complete separation from production webhooks

### Quality Assurance  
- **Comprehensive Testing**: All webhook scenarios testable
- **Security Validation**: Signature verification and payload validation
- **Performance Testing**: Load testing without production impact
- **Integration Testing**: End-to-end webhook flow validation
