# Payment & Payout System Activation Guide

## Overview
This guide walks you through activating the payment and payout system for the 6FB Booking Platform. The system is fully built and ready - it just needs production configuration.

## Current Status ✅
- **Payment Processing**: Stripe payment intents, refunds, and webhooks implemented
- **Barber Payouts**: Stripe Connect OAuth flow and automated payouts ready
- **Payout Scheduler**: Automated daily/weekly/monthly payout system built
- **Security**: Webhook signature verification, amount limits, and PCI compliance features

## Phase 1: Configure Stripe Production (Day 1)

### 1.1 Get Your Stripe Keys
1. Log into [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers → API Keys
3. Copy your **Live** keys (not test keys):
   - Secret key (starts with `sk_live_`)
   - Publishable key (starts with `pk_live_`)

### 1.2 Set Up Stripe Connect
1. Go to [Stripe Connect Settings](https://dashboard.stripe.com/settings/connect)
2. Complete your platform profile
3. Get your Connect OAuth client ID
4. Configure redirect URLs:
   ```
   https://yourdomain.com/api/v1/stripe-connect/callback
   ```

### 1.3 Update Configuration
```bash
cd backend
cp .env.production.template .env.production

# Edit .env.production with your keys:
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_CONNECT_CLIENT_ID=ca_xxxxx
```

### 1.4 Configure Webhooks
```bash
# Run the webhook configuration script
python scripts/configure_stripe_webhooks.py \
  --url https://yourdomain.com/api/v1/webhooks/stripe \
  --production

# Add the webhook secret to .env.production:
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 1.5 Test Configuration
```bash
# Run activation checks
python scripts/activate_payment_system.py
```

## Phase 2: Activate Barber Payouts (Day 2)

### 2.1 Connect First Barber
1. Log into admin dashboard
2. Navigate to Barbers → [Barber Name] → Payment Settings
3. Click "Connect Stripe Account"
4. Complete Stripe onboarding flow

### 2.2 Test Payout Flow
```bash
# Test payout calculation and processing
python scripts/test_payment_endpoints.py
```

### 2.3 Configure Payout Schedule
Update payout settings for each barber:
- Frequency: Daily, Weekly, Bi-weekly, or Monthly
- Minimum payout amount
- Hold period (typically 2-7 days)

## Phase 3: End-to-End Testing (Day 3)

### 3.1 Test Complete Payment Flow
```bash
# Run comprehensive payment test
cd backend
python test_payment_system.py
```

### 3.2 Verify Webhook Processing
1. Create a test appointment and payment
2. Check webhook logs in Stripe Dashboard
3. Verify database updates

### 3.3 Test Refund Process
1. Process a test payment
2. Issue partial refund
3. Verify customer notification

## Phase 4: Go Live Checklist

### Pre-Launch Checklist
- [ ] All Stripe keys configured in production
- [ ] Webhook endpoint active and verified
- [ ] At least one barber fully connected
- [ ] Payment limits configured appropriately
- [ ] SSL certificate active on production domain
- [ ] Database backups configured
- [ ] Error monitoring (Sentry) active

### Launch Day
1. **Switch to Production Mode**:
   ```bash
   # On production server
   export ENVIRONMENT=production
   ```

2. **Monitor First Transactions**:
   - Watch Stripe Dashboard
   - Check application logs
   - Verify webhook processing

3. **Test Live Payment**:
   - Make a small real payment ($1-5)
   - Verify end-to-end flow
   - Issue test refund

## Monitoring & Maintenance

### Daily Monitoring
- Check Stripe Dashboard for failed payments
- Review payout scheduler logs
- Monitor webhook failures

### Weekly Tasks
- Review payout reports
- Check for disconnected Stripe accounts
- Analyze payment success rates

### Monthly Tasks
- Reconcile payments with bank statements
- Review and optimize payout schedules
- Update payment limits if needed

## Troubleshooting

### Common Issues

1. **"Webhook signature verification failed"**
   - Verify STRIPE_WEBHOOK_SECRET is correct
   - Check webhook endpoint URL matches Stripe configuration

2. **"Barber cannot receive payouts"**
   - Ensure Stripe Connect onboarding is complete
   - Verify bank account is connected
   - Check for required business verification

3. **"Payment intent creation failed"**
   - Verify Stripe keys are live (not test)
   - Check payment amount is within limits
   - Ensure customer has valid payment method

### Support Resources
- Stripe Support: https://support.stripe.com
- API Documentation: https://stripe.com/docs/api
- Connect Documentation: https://stripe.com/docs/connect

## Security Best Practices

1. **Never expose secret keys** in logs or error messages
2. **Always verify webhook signatures** before processing
3. **Use idempotency keys** for payment operations
4. **Log all payment events** for audit trail
5. **Implement rate limiting** on payment endpoints
6. **Regular security audits** of payment flow

## Next Steps

After successful activation:
1. Train staff on payment system
2. Create customer support documentation
3. Set up payment analytics dashboard
4. Configure automated payment reports
5. Plan for tax compliance (1099 generation)

---

For technical support, contact the development team or refer to the [API documentation](https://sixfb-backend.onrender.com/docs).
