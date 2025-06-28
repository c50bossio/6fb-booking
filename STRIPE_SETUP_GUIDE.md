# Stripe Payment Integration Setup Guide

This guide will help you set up Stripe payment processing for the 6FB Platform.

## Prerequisites

- Node.js and Python environment set up
- PostgreSQL database running
- Backend and frontend servers configured

## Step 1: Create a Stripe Account

1. Go to [https://stripe.com](https://stripe.com) and click "Start now"
2. Fill in your business information:
   - Business type: Individual or Company
   - Country: Your country
   - Business details: 6FB Barbershop Platform
3. Complete the onboarding process

## Step 2: Get Your API Keys

1. Once logged in, go to the [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API keys**
3. You'll see two sets of keys:
   - **Test mode**: For development and testing
   - **Live mode**: For production (requires completing Stripe activation)

4. Copy the following keys:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)
   - Click "Reveal test key" to see the secret key

⚠️ **Important**: Never commit or share your secret keys!

## Step 3: Configure Webhook Endpoint

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Configure the endpoint:
   - **Endpoint URL**:
     - Development: `http://localhost:8000/api/v1/webhooks/stripe`
     - Production: `https://your-domain.com/api/v1/webhooks/stripe`
   - **Events to send**: Select the following events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
     - `payment_method.attached`
     - `payment_method.detached`
     - `customer.created`
     - `customer.updated`
     - `charge.refunded`
     - `charge.refund.updated`

4. After creating the endpoint, click on it to reveal the **Signing secret**
5. Copy this secret (starts with `whsec_`)

## Step 4: Configure Environment Variables

### Backend Configuration

1. Copy the example environment file:
   ```bash
   cd /Users/bossio/6fb-booking/backend
   cp .env.example .env
   ```

2. Edit `.env` and add your Stripe keys:
   ```
   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_test_your_secret_key_here
   STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

   # Optional: Stripe Connect (for marketplace features)
   # STRIPE_CONNECT_CLIENT_ID=ca_your_connect_client_id
   ```

### Frontend Configuration

1. Copy the example environment file:
   ```bash
   cd /Users/bossio/6fb-booking/frontend
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your Stripe publishable key:
   ```
   # Stripe Configuration
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   ```

## Step 5: Install Dependencies

### Backend Dependencies

```bash
cd /Users/bossio/6fb-booking/backend
pip install stripe python-dotenv
```

### Frontend Dependencies

```bash
cd /Users/bossio/6fb-booking/frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

## Step 6: Run Database Migrations

1. Create the payment tables:
   ```bash
   cd /Users/bossio/6fb-booking/backend
   alembic revision --autogenerate -m "Add payment tables"
   alembic upgrade head
   ```

## Step 7: Test the Integration

### Using Stripe Test Cards

Stripe provides test card numbers for different scenarios:

- **Successful payment**: `4242 4242 4242 4242`
- **Requires authentication**: `4000 0025 0000 3155`
- **Declined**: `4000 0000 0000 9995`
- **Insufficient funds**: `4000 0000 0000 9995`

Use any future expiry date and any 3-digit CVC.

### Test Webhook Locally

1. Install Stripe CLI:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Or download from https://stripe.com/docs/stripe-cli
   ```

2. Login to Stripe CLI:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe
   ```

4. In another terminal, trigger test events:
   ```bash
   stripe trigger payment_intent.succeeded
   ```

## Step 8: Verify Setup

1. Start your backend server:
   ```bash
   cd /Users/bossio/6fb-booking/backend
   uvicorn main:app --reload
   ```

2. Start your frontend server:
   ```bash
   cd /Users/bossio/6fb-booking/frontend
   npm run dev
   ```

3. Navigate to `http://localhost:3000/payments`
4. Try adding a test card
5. Make a test payment
6. Check the webhook logs in Stripe Dashboard

## Production Checklist

Before going live:

- [ ] Complete Stripe account activation
- [ ] Switch to live API keys
- [ ] Update webhook endpoint to production URL
- [ ] Enable HTTPS for webhook endpoint
- [ ] Set up proper error monitoring
- [ ] Configure fraud prevention rules
- [ ] Review and set up proper pricing
- [ ] Test refund flows
- [ ] Set up proper logging for payment events
- [ ] Configure payment receipt emails
- [ ] Review PCI compliance requirements

## Troubleshooting

### Common Issues

1. **Webhook signature verification failed**
   - Ensure webhook secret is correctly set in `.env`
   - Check that raw request body is being used for verification

2. **Payment methods not showing**
   - Verify Stripe customer is created for the user
   - Check browser console for JavaScript errors

3. **3D Secure not working**
   - Ensure you're handling `requires_action` status
   - Check that payment confirmation is implemented

### Debug Mode

Enable Stripe debug logging:

```python
# backend/services/stripe_service.py
stripe.log = 'debug'
```

## Support

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)
- [API Reference](https://stripe.com/docs/api)

## Security Best Practices

1. **Never log sensitive data** (full card numbers, CVV)
2. **Always use HTTPS** in production
3. **Validate webhook signatures**
4. **Use Stripe Elements** for card input
5. **Implement rate limiting** on payment endpoints
6. **Monitor for suspicious activity**
7. **Keep Stripe SDK updated**
