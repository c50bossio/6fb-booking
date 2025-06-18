# Stripe Local Webhook Setup Guide

Since `localhost` URLs aren't publicly accessible, you need to use the Stripe CLI to test webhooks during local development.

## Step 1: Install Stripe CLI

### macOS (using Homebrew):
```bash
brew install stripe/stripe-cli/stripe
```

### macOS (without Homebrew):
1. Download from: https://github.com/stripe/stripe-cli/releases/latest
2. Choose the Darwin (macOS) version
3. Extract and move to your PATH

### Other platforms:
Visit: https://stripe.com/docs/stripe-cli#install

## Step 2: Login to Stripe CLI

```bash
stripe login
```

This will:
1. Open your browser
2. Ask you to confirm the connection
3. Link the CLI to your Stripe account

## Step 3: Start Webhook Forwarding

```bash
stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe
```

This command will:
1. Start listening for webhook events
2. Display a webhook signing secret (starts with `whsec_`)
3. Forward all events to your local server

**Important**: Copy the webhook signing secret that appears! It looks like:
```
Ready! Your webhook signing secret is whsec_1234567890abcdef... (^C to quit)
```

## Step 4: Add the Webhook Secret to Your Config

Add the webhook secret to your backend `.env` file:

```bash
# Edit your .env file
cd /Users/bossio/6fb-booking/backend
open -e .env
```

Update this line:
```
STRIPE_WEBHOOK_SECRET=whsec_[paste_your_secret_here]
```

## Step 5: Test the Integration

### Terminal Setup (4 terminals):

**Terminal 1 - Backend Server:**
```bash
cd /Users/bossio/6fb-booking/backend
uvicorn main:app --reload
```

**Terminal 2 - Frontend Server:**
```bash
cd /Users/bossio/6fb-booking/frontend
npm run dev
```

**Terminal 3 - Stripe Webhook Forwarding:**
```bash
stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe
```

**Terminal 4 - Trigger Test Events (optional):**
```bash
# Test a successful payment
stripe trigger payment_intent.succeeded

# Test a failed payment
stripe trigger payment_intent.payment_failed

# See all available test events
stripe trigger --help
```

## Step 6: Make a Test Payment

1. Open http://localhost:3000/payments
2. Add a test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)
3. Make a payment
4. Check Terminal 3 to see the webhook events being forwarded

## Common Stripe CLI Commands

```bash
# View live webhook events
stripe logs tail

# List recent events
stripe events list

# Resend a specific event
stripe events resend evt_1234567890

# Test specific webhook event with custom data
stripe trigger payment_intent.succeeded \
  --override payment_intent:metadata.user_id=1 \
  --override payment_intent:metadata.appointment_id=1

# See all trigger options
stripe trigger --help
```

## Troubleshooting

### "stripe: command not found"
- Make sure Homebrew is installed: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- Then reinstall: `brew install stripe/stripe-cli/stripe`

### "Failed to forward webhook"
- Check your backend server is running on port 8000
- Verify the forward URL is correct: `localhost:8000/api/v1/webhooks/stripe`

### "Webhook signature verification failed"
- Make sure you copied the complete `whsec_` secret from the CLI output
- Restart your backend server after updating the `.env` file

### "Connection refused"
- Ensure your backend is running: `uvicorn main:app --reload`
- Check the port number matches (default is 8000)

## Production Webhook Setup

For production, you'll create a real webhook endpoint:

1. Deploy your app to a public URL (e.g., `https://your-app.com`)
2. In Stripe Dashboard → Webhooks → Add endpoint
3. Use your production URL: `https://your-app.com/api/v1/webhooks/stripe`
4. Get the production webhook secret and add to your production environment

## Quick Test Script

Once everything is set up, you can use our test script:

```bash
cd /Users/bossio/6fb-booking/backend
python scripts/test_stripe_webhook.py
```

But make sure to update the webhook secret in the script first!

## Next Steps

1. Install Stripe CLI
2. Run `stripe login`
3. Run `stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe`
4. Copy the webhook secret to your `.env`
5. Start testing payments!

## Resources

- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Testing Webhooks Locally](https://stripe.com/docs/webhooks/test)
- [Webhook Event Types](https://stripe.com/docs/api/events/types)