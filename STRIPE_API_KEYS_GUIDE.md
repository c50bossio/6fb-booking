# How to Get and Add Stripe API Keys

## Step 1: Create a Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Click **"Start now"** or **"Sign up"**
3. Enter your email and create a password
4. You'll receive a verification email - click the link to verify

## Step 2: Get Your Test API Keys

1. Log into your [Stripe Dashboard](https://dashboard.stripe.com)
2. Look at the top-right corner - make sure you're in **"Test mode"** (toggle switch)
3. In the left sidebar, click **"Developers"**
4. Click **"API keys"**

You'll see:
- **Publishable key**: Starts with `pk_test_`
- **Secret key**: Starts with `sk_test_` (click "Reveal test key" to see it)

![Stripe API Keys Location](https://stripe.com/img/docs/keys.png)

⚠️ **Important**: 
- Never share your secret key
- Test keys are for development only
- Live keys require account activation

## Step 3: Create Webhook Endpoint

1. Still in the Stripe Dashboard, go to **"Developers"** → **"Webhooks"**
2. Click **"Add endpoint"**
3. Fill in:
   - **Endpoint URL**: `http://localhost:8000/api/v1/webhooks/stripe`
   - **Description**: "6FB Platform Local Development"
4. Under **"Events to send"**, click **"receive all events"** OR select these specific events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `payment_method.attached`
   - `payment_method.detached`
   - `customer.created`
   - `customer.updated`
   - `charge.refunded`
   - `charge.refund.updated`
5. Click **"Add endpoint"**
6. After creation, click on your new endpoint
7. Click **"Reveal"** under "Signing secret"
8. Copy the signing secret (starts with `whsec_`)

## Step 4: Add Keys to Your Project

### Backend Configuration

1. Navigate to your backend directory:
   ```bash
   cd /Users/bossio/6fb-booking/backend
   ```

2. Create your `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

3. Open `.env` in your text editor:
   ```bash
   # On macOS
   open -e .env
   
   # Or use your preferred editor
   code .env
   nano .env
   vim .env
   ```

4. Replace the placeholder values with your actual keys:
   ```env
   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_test_51ABC...your_actual_secret_key_here
   STRIPE_PUBLISHABLE_KEY=pk_test_51ABC...your_actual_publishable_key_here
   STRIPE_WEBHOOK_SECRET=whsec_abc123...your_actual_webhook_secret_here
   ```

### Frontend Configuration

1. Navigate to your frontend directory:
   ```bash
   cd /Users/bossio/6fb-booking/frontend
   ```

2. Create your `.env.local` file:
   ```bash
   cp .env.example .env.local
   ```

3. Open `.env.local` in your text editor:
   ```bash
   # On macOS
   open -e .env.local
   
   # Or use your preferred editor
   code .env.local
   nano .env.local
   vim .env.local
   ```

4. Add your publishable key:
   ```env
   # Stripe Configuration
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC...your_actual_publishable_key_here
   ```

## Step 5: Verify Your Configuration

1. Test backend configuration:
   ```bash
   cd /Users/bossio/6fb-booking/backend
   python3 -c "from core.config import settings; print('Stripe enabled:', settings.stripe_enabled)"
   ```
   Should output: `Stripe enabled: True`

2. Test frontend configuration:
   ```bash
   cd /Users/bossio/6fb-booking/frontend
   node -e "require('dotenv').config({path:'.env.local'}); console.log('Stripe key set:', !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)"
   ```
   Should output: `Stripe key set: true`

## Step 6: Test the Integration

1. Start your backend:
   ```bash
   cd /Users/bossio/6fb-booking/backend
   uvicorn main:app --reload
   ```

2. In a new terminal, start your frontend:
   ```bash
   cd /Users/bossio/6fb-booking/frontend
   npm run dev
   ```

3. Visit http://localhost:3000/payments
4. Try adding a test card: `4242 4242 4242 4242`
   - Use any future expiry date (e.g., 12/25)
   - Use any 3-digit CVC (e.g., 123)
   - Use any ZIP code (e.g., 12345)

## Common Issues and Solutions

### "Stripe is not defined" Error
- Make sure you restarted your frontend server after adding the key
- Check that the key starts with `pk_test_`

### "Invalid API Key" Error
- Ensure you copied the complete key (they're quite long)
- Make sure you're using the secret key in backend and publishable key in frontend
- Check for extra spaces or line breaks

### Webhook Signature Verification Failed
- Make sure you're using the webhook signing secret, not the API key
- The webhook secret starts with `whsec_`
- Ensure you copied it from the specific endpoint you created

### Can't Find Your Keys?
1. Log into [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in "Test mode" (top right)
3. Go to "Developers" → "API keys"
4. For webhook secret: "Developers" → "Webhooks" → Click your endpoint → "Signing secret"

## Security Best Practices

1. **Never commit `.env` files to Git**
   - They're already in `.gitignore`
   - Use `.env.example` as a template

2. **Keep keys secret**
   - Never share secret keys in emails, chat, or forums
   - Only the publishable key can be public (it's in frontend code)

3. **Use test keys for development**
   - Always use `pk_test_` and `sk_test_` for development
   - Only use live keys in production

4. **Rotate keys if compromised**
   - Stripe Dashboard → "Developers" → "API keys" → "Roll key"

## Next Steps

Once your keys are configured:

1. Run database migrations:
   ```bash
   cd /Users/bossio/6fb-booking/backend
   alembic upgrade head
   ```

2. Test webhook integration:
   ```bash
   cd /Users/bossio/6fb-booking/backend
   python scripts/test_stripe_webhook.py
   ```

3. Make a test payment at http://localhost:3000/payments

## Need Help?

- [Stripe Documentation](https://stripe.com/docs/keys)
- [Stripe Support](https://support.stripe.com)
- Check the `STRIPE_INTEGRATION_CHECKLIST.md` for a full testing guide