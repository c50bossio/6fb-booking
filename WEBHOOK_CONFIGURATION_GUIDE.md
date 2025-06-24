# Webhook Configuration Guide

## ✅ Local Configuration Complete!

Your webhook secret has been added to your local `.env` file:
```
STRIPE_WEBHOOK_SECRET=whsec_eh49qe3Qp14l64bqG2wROGaTVoJjjDC3
```

## 📤 Update Production (Render)

To make webhooks work in production, you need to add this secret to your Render environment:

### Step 1: Log into Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your backend service (sixfb-backend)

### Step 2: Add Environment Variable
1. Click on **"Environment"** in the left sidebar
2. Click **"Add Environment Variable"**
3. Add:
   - Key: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_eh49qe3Qp14l64bqG2wROGaTVoJjjDC3`
4. Click **"Save Changes"**

Your service will automatically redeploy with the new configuration.

## 🧪 Testing Your Payment System

### 1. Local Testing with Dashboard
Open the payment testing dashboard:
```bash
cd backend
python -m http.server 8080
# Then open: http://localhost:8080/payment_testing_dashboard.html
```

### 2. Test from Stripe Dashboard
1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your webhook endpoint
3. Click **"Send test webhook"**
4. Select event type: `payment_intent.succeeded`
5. Click **"Send test webhook"**

### 3. Complete Payment Flow Test
Using the testing dashboard, you can:
- Create payment intents
- Complete payments with test cards
- View webhook events
- Test barber onboarding
- Calculate payouts

### Test Card Numbers
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

## 🎯 What's Working Now

### Payment Processing ✅
- Create payment intents
- Process payments
- Handle refunds
- Webhook signature verification

### Barber Payouts ✅
- Stripe Connect OAuth flow
- Commission calculations
- Automated payout scheduling
- Multiple payout methods

### Security ✅
- Webhook signature verification
- Amount limits
- PCI compliance
- Secure key storage

## 📊 Monitoring Webhooks

### In Stripe Dashboard
1. Go to [Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your endpoint
3. View **"Webhook attempts"** to see all events

### In Your Application
Check your application logs for webhook processing:
- Successful events
- Failed events
- Processing times

## 🚀 Next Steps

1. **Test a Complete Payment Flow**
   - Create a test appointment
   - Process payment
   - Verify webhook received
   - Check database updates

2. **Onboard a Test Barber**
   - Use the Connect URL generator
   - Complete test onboarding
   - Verify payout capability

3. **Schedule Test Payouts**
   - Configure payout schedule
   - Test calculation logic
   - Verify transfer creation

## 🆘 Troubleshooting

### Webhook Signature Verification Failed
- Ensure the secret in Render matches exactly
- Check that you're using the raw request body
- Verify the webhook URL is correct

### Payment Intent Creation Failed
- Check Stripe API keys are correct
- Verify amount is within limits
- Ensure all required fields are provided

### Barber Connect Not Working
- Verify Connect Client ID is set
- Check OAuth redirect URL is configured
- Ensure barber account is properly created

## 📞 Support

- Stripe Support: https://support.stripe.com
- API Docs: https://stripe.com/docs/api
- Webhook Docs: https://stripe.com/docs/webhooks