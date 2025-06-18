# Stripe Integration Checklist

This checklist helps you verify that the Stripe payment integration is properly set up and working.

## ✅ Setup Checklist

### 1. Stripe Account
- [ ] Created Stripe account at https://stripe.com
- [ ] Completed basic business information
- [ ] Verified email address

### 2. API Keys
- [ ] Obtained test mode API keys from Stripe Dashboard
- [ ] Copied Publishable Key (pk_test_...)
- [ ] Copied Secret Key (sk_test_...)
- [ ] Created webhook endpoint in Stripe Dashboard
- [ ] Copied Webhook Signing Secret (whsec_...)

### 3. Environment Configuration
- [ ] Created backend `.env` file from `.env.example`
- [ ] Added Stripe keys to backend `.env`:
  ```
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_PUBLISHABLE_KEY=pk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```
- [ ] Created frontend `.env.local` file from `.env.example`
- [ ] Added Stripe publishable key to frontend `.env.local`:
  ```
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
  ```

### 4. Dependencies
- [ ] Installed backend dependencies: `pip3 install stripe python-dotenv`
- [ ] Installed frontend dependencies: `npm install @stripe/stripe-js @stripe/react-stripe-js`

### 5. Database
- [ ] PostgreSQL database is running
- [ ] Database connection is configured in `.env`
- [ ] Run database migrations:
  ```bash
  cd backend
  alembic upgrade head
  ```
- [ ] Verified payment tables were created

## 🧪 Testing Checklist

### 1. Start Services
- [ ] Backend server running: `cd backend && uvicorn main:app --reload`
- [ ] Frontend server running: `cd frontend && npm run dev`

### 2. Basic Payment Flow
- [ ] Navigate to http://localhost:3000/payments
- [ ] Add a test card (4242 4242 4242 4242)
- [ ] Verify card appears in payment methods list
- [ ] Make a test payment
- [ ] Check payment history

### 3. Webhook Testing

#### Option A: Using Test Script
- [ ] Run webhook test script:
  ```bash
  cd backend
  python scripts/test_stripe_webhook.py
  ```
- [ ] Verify all test events are processed successfully

#### Option B: Using Stripe CLI
- [ ] Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
- [ ] Login: `stripe login`
- [ ] Forward webhooks: `stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe`
- [ ] Trigger test event: `stripe trigger payment_intent.succeeded`

### 4. Error Handling
- [ ] Test declined card: 4000 0000 0000 9995
- [ ] Test 3D Secure card: 4000 0025 0000 3155
- [ ] Verify error messages are user-friendly

### 5. Refund Flow
- [ ] Create a successful payment
- [ ] Process a refund (admin only)
- [ ] Verify refund appears in history

## 📊 Verification Points

### Backend API
- [ ] `/api/v1/payments/methods` - List payment methods
- [ ] `/api/v1/payments/methods/add` - Add new payment method
- [ ] `/api/v1/payments/create-intent` - Create payment intent
- [ ] `/api/v1/payments/confirm` - Confirm payment
- [ ] `/api/v1/payments/history` - Payment history
- [ ] `/api/v1/webhooks/stripe` - Webhook endpoint responds

### Frontend Pages
- [ ] `/payments` - Payment management page loads
- [ ] `/payments/success` - Success page shows after payment
- [ ] Payment form in appointment booking works

### Database Records
- [ ] Check `stripe_customers` table has records
- [ ] Check `payment_methods` table has test cards
- [ ] Check `payments` table has test transactions
- [ ] Check `payment_webhook_events` table logs events

## 🚀 Production Checklist

Before going live:

### 1. Stripe Account
- [ ] Complete Stripe account activation
- [ ] Add bank account for payouts
- [ ] Configure business settings
- [ ] Review and accept Stripe's terms

### 2. API Keys
- [ ] Obtain production API keys
- [ ] Update `.env` files with live keys
- [ ] Update webhook endpoint URL in Stripe Dashboard

### 3. Security
- [ ] Enable HTTPS on production server
- [ ] Verify webhook signature validation works
- [ ] Set up proper CORS configuration
- [ ] Enable rate limiting on payment endpoints

### 4. Features
- [ ] Configure email receipts
- [ ] Set up fraud detection rules
- [ ] Configure payment notification emails
- [ ] Test full payment flow with real card

### 5. Monitoring
- [ ] Set up error logging for payment failures
- [ ] Configure alerts for failed webhooks
- [ ] Monitor Stripe Dashboard for issues
- [ ] Set up payment analytics tracking

## 🆘 Troubleshooting

### Common Issues

1. **"Stripe is not defined" error**
   - Ensure Stripe.js is loaded before using
   - Check publishable key is set correctly

2. **Webhook 400 error**
   - Verify webhook secret matches
   - Ensure raw request body is used
   - Check webhook URL is correct

3. **Payment methods not saving**
   - Verify customer exists in Stripe
   - Check authentication is working
   - Look for JavaScript console errors

4. **Database errors**
   - Run migrations: `alembic upgrade head`
   - Check PostgreSQL is running
   - Verify database URL in `.env`

### Debug Commands

```bash
# Check Stripe webhook logs
stripe logs tail

# Test specific webhook
stripe trigger payment_intent.succeeded --override payment_intent:metadata.user_id=1

# Check backend logs
tail -f backend/logs/app.log

# Check frontend console
# Open browser developer tools (F12)
```

## 📚 Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Testing Guide](https://stripe.com/docs/testing)
- [Webhook Guide](https://stripe.com/docs/webhooks)
- [Security Best Practices](https://stripe.com/docs/security)