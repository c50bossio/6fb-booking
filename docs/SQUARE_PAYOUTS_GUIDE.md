# Square Payouts Setup Guide

The complete payment solution using Square for everything - sales tracking AND payouts!

## Why Square Payouts?

- **Already integrated** - You're using Square for sales tracking
- **Free ACH transfers** - No fees for standard 1-2 day transfers
- **Instant payouts available** - 1.75% fee for immediate transfers
- **Barbers trust Square** - They may already have Square accounts
- **One dashboard** - Everything in one place

## How It Works

```
Square POS → Track Sales → Calculate Commissions → Pay Barbers via Square
```

## Setup Process

### Step 1: Enable Square Payouts

1. Log into [Square Dashboard](https://squareup.com/dashboard)
2. Go to **Team** → **Team Management**
3. Enable **Team Member Payouts** feature
4. This allows you to pay team members directly

### Step 2: Add Barbers as Team Members

For each barber:

```bash
POST /api/v1/barber-payments/setup-square-team-member
{
  "barber_id": 1,
  "location_id": "YOUR_SQUARE_LOCATION_ID"
}
```

This will:
- Create a Square team member account
- Send them an invitation email
- They'll set up their bank account with Square

### Step 3: Barber Accepts Invitation

Barbers will:
1. Receive email from Square
2. Click "Accept Invitation"
3. Create Square account (or log in)
4. Add their bank account details
5. Verify with micro-deposits (optional)

### Step 4: Process Payouts

Once barbers are set up, process weekly payouts:

```bash
# Individual payout
POST /api/v1/barber-payments/payouts/process
{
  "barber_id": 1,
  "period_start": "2024-01-01T00:00:00Z",
  "period_end": "2024-01-07T23:59:59Z",
  "instant_payout": false  # true for instant (1.75% fee)
}

# Batch payouts for all barbers
POST /api/v1/barber-payments/payouts/batch?location_id=LOC_ID&period_start=2024-01-01&period_end=2024-01-07
```

## Commission Structure

Default split (configurable):
- **Services**: Shop keeps 30%, barber gets 70%
- **Products**: Shop keeps 15%, barber gets 85%

Example:
- Barber does $1000 in haircuts → Gets $700
- Barber sells $200 in products → Gets $170
- Total payout: $870

## Payout Options

### Standard ACH (Recommended)
- **Cost**: FREE
- **Speed**: 1-2 business days
- **Requirements**: Bank account

### Instant Payout
- **Cost**: 1.75% of transfer amount
- **Speed**: Within minutes
- **Requirements**: Square debit card or eligible debit card

## Testing Flow

1. **Create test barber**:
   ```bash
   # Use a real email you can access
   POST /api/v1/barber-payments/setup-square-team-member
   {
     "barber_id": 1,
     "location_id": "YOUR_SANDBOX_LOCATION"
   }
   ```

2. **Check email** for Square invitation

3. **View commission summary**:
   ```bash
   GET /api/v1/barber-payments/commissions/summary?period_start=2024-01-01&period_end=2024-01-31
   ```

4. **Process test payout**:
   ```bash
   POST /api/v1/barber-payments/payouts/process
   {
     "barber_id": 1,
     "period_start": "2024-01-01T00:00:00Z",
     "period_end": "2024-01-31T23:59:59Z"
   }
   ```

## Frequently Asked Questions

**Q: Do barbers need their own Square account?**
A: They create one when accepting your invitation, but it's managed under your main account.

**Q: Can barbers see all shop transactions?**
A: No, they only see their own payouts and can access their 1099 tax forms.

**Q: What about taxes?**
A: Square handles 1099s automatically for barbers earning over $600/year.

**Q: Can I change commission rates?**
A: Yes, update the payment model anytime. Changes apply to future transactions.

**Q: What if a barber already has Square?**
A: They can link their existing account when accepting your invitation.

## Cost Comparison

For a $700 weekly payout:
- **Square ACH**: FREE
- **Square Instant**: $12.25 (1.75%)
- **Stripe Connect**: $2.00
- **PayPal**: $1.00
- **Dwolla**: $0.25 (requires sales call)

## Troubleshooting

### Barber didn't receive invitation
- Check spam folder
- Resend from Square Dashboard → Team
- Verify email address is correct

### Payout failed
- Ensure barber completed Square setup
- Check bank account is verified
- Verify sufficient shop balance

### Can't create team member
- Ensure Team Member Payouts is enabled
- Check you have the correct location ID
- Verify API permissions include team management

## Next Steps

1. Enable Team Member Payouts in Square
2. Add your first test barber
3. Process a test payout
4. Roll out to all barbers!

The best part? Since you're already using Square for sales, this creates a seamless ecosystem where everything just works together! 🎯