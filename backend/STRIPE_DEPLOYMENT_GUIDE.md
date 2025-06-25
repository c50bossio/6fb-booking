# Stripe Deployment Guide for 6FB Backend

## Overview
This guide helps you verify and troubleshoot Stripe configuration on your deployed backend, specifically for Render deployments.

## 1. Required Environment Variables

Set these in your Render dashboard under Environment:

### Essential Variables
```bash
# Payment Processing (Required)
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_test_... or pk_live_...

# Webhook Security (Required for production)
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Connect (Required for barber payouts)
STRIPE_CONNECT_CLIENT_ID=ca_...
```

### How to Get These Values

1. **STRIPE_SECRET_KEY & STRIPE_PUBLISHABLE_KEY**
   - Log into [Stripe Dashboard](https://dashboard.stripe.com)
   - Go to Developers → API keys
   - Copy the keys (use test keys for staging, live keys for production)

2. **STRIPE_WEBHOOK_SECRET**
   - Go to Developers → Webhooks
   - Click "Add endpoint"
   - URL: `https://your-app.onrender.com/api/v1/webhooks/stripe`
   - Select events: `payment_intent.succeeded`, `payment_intent.failed`, `charge.refunded`
   - After creation, click on the webhook to reveal the signing secret

3. **STRIPE_CONNECT_CLIENT_ID**
   - Go to Settings → Connect settings
   - Find your platform's Client ID
   - This enables barber payouts via Stripe Connect

## 2. Verification Steps

### Step 1: Check Environment Variables
SSH into your Render service or use the Shell tab:
```bash
python verify_stripe_deployment.py
```

### Step 2: Test API Connection
```bash
python debug_stripe_render.py
```

### Step 3: HTTP Health Check
Once deployed, visit:
```
https://your-app.onrender.com/api/v1/stripe/health
```

This endpoint will show:
- Environment variable status
- API key validation
- Connection test results

### Step 4: Test Payment Intent Creation
```
https://your-app.onrender.com/api/v1/stripe/test-intent
```

This will create and cancel a test payment intent.

## 3. Common Issues and Solutions

### Issue: "Stripe not configured" errors
**Solution:** Ensure all environment variables are set in Render dashboard

### Issue: Authentication errors
**Solution:**
- Verify API key format (sk_test_* for test, sk_live_* for production)
- Check if key is active in Stripe dashboard
- Ensure no extra spaces or quotes in environment variable

### Issue: Webhook signature verification failures
**Solution:**
- Ensure STRIPE_WEBHOOK_SECRET matches the one from Stripe dashboard
- Verify webhook URL is exactly: `https://your-app.onrender.com/api/v1/webhooks/stripe`
- Check that webhook is enabled in Stripe dashboard

### Issue: Network/Connection errors
**Solution:**
- Render should have no issues connecting to Stripe
- If persistent, check Stripe system status
- Verify no firewall rules blocking outbound HTTPS

### Issue: Import errors for stripe module
**Solution:**
- Ensure `stripe` is in requirements.txt
- Rebuild deployment if needed
- Check logs for pip installation errors

## 4. Deployment Checklist

Before going live:

- [ ] All environment variables set in Render
- [ ] `/api/v1/stripe/health` returns healthy status
- [ ] Webhook endpoint configured in Stripe dashboard
- [ ] Test payment intent creation works
- [ ] For production: using live keys (sk_live_*, pk_live_*)
- [ ] For staging: using test keys (sk_test_*, pk_test_*)

## 5. Monitoring

### Health Check Endpoints
- `/api/v1/stripe/health` - Overall Stripe configuration status
- `/api/v1/stripe/test-intent` - Test payment creation
- `/version` - Check deployment version

### Logs to Monitor
Look for these in Render logs:
- "Stripe SDK initialized" - Successful initialization
- "Stripe error" - Configuration or API errors
- "Webhook event received" - Incoming webhooks
- "Payment intent created" - Successful payment creation

## 6. Security Best Practices

1. **Never commit API keys** - Always use environment variables
2. **Use webhook signatures** - Always verify webhook authenticity
3. **Separate test/live keys** - Never use live keys in development
4. **Rotate keys periodically** - Especially if exposed
5. **Monitor failed requests** - Could indicate compromised keys

## 7. Testing Payments

### Test Card Numbers (Test Mode Only)
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0000 0000 3220`

### Test Webhook Events
Use Stripe CLI for local testing:
```bash
stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe
stripe trigger payment_intent.succeeded
```

## 8. Troubleshooting Scripts

Run these on your deployed server:

### Quick verification:
```bash
python -c "import os; print('Stripe configured:', bool(os.getenv('STRIPE_SECRET_KEY')))"
```

### Full diagnostic:
```bash
python verify_stripe_deployment.py
```

### Debug mode:
```bash
python debug_stripe_render.py
```

## 9. Support Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Python SDK](https://github.com/stripe/stripe-python)
- [Render Documentation](https://render.com/docs)
- [6FB Backend Issues](https://github.com/your-repo/issues)

## 10. Emergency Procedures

If Stripe stops working in production:

1. **Check Stripe Status**: https://status.stripe.com
2. **Verify API Keys**: Ensure they haven't been revoked
3. **Check Render Logs**: Look for specific error messages
4. **Run Health Check**: `/api/v1/stripe/health`
5. **Rollback if needed**: Use Render's deployment history

Remember: Always test in staging before deploying to production!
