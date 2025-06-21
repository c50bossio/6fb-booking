# Tremendous Payout Setup Guide

This guide walks you through setting up Tremendous for barber commission payouts.

## Why Tremendous?

- **Instant API access** - No sales calls required!
- **$100,000 sandbox credits** - Test everything for free
- **Multiple payout options** - ACH, PayPal, Venmo, Gift Cards
- **Barber-friendly** - They choose their preferred payout method

## Step 1: Create Tremendous Account

1. Go to [tremendous.com](https://tremendous.com)
2. Sign up for a free account
3. You'll automatically get $100,000 in sandbox credits!

## Step 2: Get Your API Key

1. Log into [app.tremendous.com](https://app.tremendous.com)
2. Navigate to **Settings → API**
3. Click **"Create API Key"**
4. Name it "6FB Barber Payouts"
5. Copy the key (starts with `TEST_` for sandbox)

## Step 3: Configure Environment

Add to your `.env` file:

```bash
# Tremendous Configuration
TREMENDOUS_API_KEY=TEST_your-api-key-here
TREMENDOUS_TEST_MODE=true
```

## Step 4: Test Your Setup

Quick test to verify your API key works:

```bash
curl https://testflight.tremendous.com/api/v2/organizations \
  -H "Authorization: Bearer TEST_your-api-key-here"
```

You should see your organization details.

## Step 5: Understanding the Flow

### For Shop Owners:
1. Create payment models for each barber (70/30 split)
2. Barbers automatically get invitation emails
3. Process payouts weekly with one click

### For Barbers:
1. Receive email from Tremendous
2. Choose payout method:
   - **ACH Bank Transfer** - 1-2 days, $0.50-$2.00 fee
   - **PayPal** - Instant, $1.00 fee
   - **Venmo** - Instant, $1.00 fee
   - **Gift Cards** - Instant, no fee!
3. Start receiving weekly payouts

## Step 6: Testing in Sandbox

### Create a Test Barber:
```bash
POST /api/v1/barber-payments/payment-models/
{
  "barber_id": 1,
  "payment_type": "commission",
  "service_commission_rate": 30,
  "product_commission_rate": 15,
  "payout_method": "PAYPAL",
  "payout_email": "test@example.com"
}
```

### Process a Test Payout:
```bash
POST /api/v1/barber-payments/payouts/process
{
  "barber_id": 1,
  "period_start": "2024-01-01T00:00:00Z",
  "period_end": "2024-01-07T23:59:59Z"
}
```

## Step 7: Webhook Configuration (Optional)

For real-time payout status updates:

1. In Tremendous dashboard, go to **Settings → Webhooks**
2. Add webhook endpoint: `https://yourdomain.com/api/v1/barber-payments/webhook`
3. Select events:
   - `ORDER.CREATED`
   - `ORDER.APPROVED`
   - `REWARD.SENT`
4. Copy the webhook secret to your `.env`

## Step 8: Going to Production

When ready for real money:

1. Add a funding source (your bank account) in Tremendous
2. Get a production API key (starts with `PROD_`)
3. Update your `.env`:
   ```bash
   TREMENDOUS_API_KEY=PROD_your-production-key
   TREMENDOUS_TEST_MODE=false
   ```

## Payout Methods Comparison

| Method | Delivery Time | Fee | Requirements |
|--------|--------------|-----|--------------|
| ACH Transfer | 1-2 days | $0.50-$2.00 | Bank account |
| PayPal | Instant | $1.00 | PayPal email |
| Venmo | Instant | $1.00 | Venmo handle |
| Gift Cards | Instant | Free | Email only |

## Cost Examples

For a $700 barber payout:
- **Stripe Connect**: ~$2.00 (0.25% + $0.25)
- **Tremendous ACH**: $0.50-$2.00 (flat fee)
- **Tremendous PayPal/Venmo**: $1.00 (flat fee)
- **Tremendous Gift Card**: FREE

## Troubleshooting

### API Key Not Working
- Ensure you're using the TEST_ key for sandbox
- Check you're hitting testflight.tremendous.com (not api.tremendous.com)
- Verify the Bearer token format in headers

### Barber Not Receiving Invitation
- Check spam folder
- Verify email address is correct
- Resend invitation from dashboard

### Payout Failed
- Ensure barber has completed setup
- Check funding source has sufficient balance
- Review error message in response

## Support

- **Tremendous Support**: support@tremendous.com
- **API Documentation**: [developers.tremendous.com](https://developers.tremendous.com)
- **Dashboard**: [app.tremendous.com](https://app.tremendous.com)