# Stripe Connect Testing Guide

This guide explains how to test the Stripe Connect functionality for barber onboarding in the 6FB Booking platform.

## Overview

The Stripe Connect feature allows barbers to connect their own Stripe accounts to receive instant payouts when customers book services. The shop automatically keeps a commission (default 30%) and the barber receives the rest directly in their bank account.

## Test Scripts

We've created two test scripts to verify the Stripe Connect functionality:

### 1. Quick Barber Onboarding Test (`test_barber_onboarding.py`)

This is the main test script that focuses specifically on the barber onboarding flow.

**What it tests:**
- Environment configuration (Stripe keys)
- Backend server connectivity
- OAuth URL generation for barber account connection
- Input validation and error handling
- Both Stripe and Square platform support

**Usage:**
```bash
cd backend
python test_barber_onboarding.py
```

### 2. Comprehensive Stripe Connect Test (`test_stripe_connect.py`)

This is a more comprehensive test suite that covers all aspects of the Stripe Connect integration.

**What it tests:**
- Complete Stripe API connection
- All payment-splits endpoints
- Payment split calculations
- OAuth callback simulation
- Payment processing tests

**Usage:**
```bash
cd backend
python test_stripe_connect.py
```

## Prerequisites

### 1. Environment Setup

Make sure your `.env` file contains the required Stripe configuration:

```env
# Required for Stripe Connect
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_CONNECT_CLIENT_ID=ca_your_connect_client_id_here

# Optional webhook secret (for production)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 2. Stripe Connect Application Setup

You need a Stripe Connect application to get the `STRIPE_CONNECT_CLIENT_ID`:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to "Connect" → "Settings"
3. Create a new Connect application
4. Copy the "Client ID" to your `.env` file

### 3. Backend Server

Ensure your backend server is running:

```bash
cd backend
uvicorn main:app --reload
```

## Testing Process

### Step 1: Run the Basic Test

```bash
cd backend
python test_barber_onboarding.py
```

This will:
- ✅ Check your environment setup
- ✅ Test backend connectivity
- ✅ Generate an OAuth URL for barber onboarding
- ✅ Validate the URL format
- ✅ Test different platform options (Stripe/Square)
- ✅ Test error handling with invalid inputs

**Expected Output:**
```
🔧 Barber Onboarding Test Suite
============================================================
ℹ️  Target URL: http://localhost:8000
ℹ️  Test time: 2024-12-25T10:30:00

✅ STRIPE_SECRET_KEY is set (sk_test...)
✅ STRIPE_CONNECT_CLIENT_ID is set (ca_abcd1234...)
✅ Backend is running at http://localhost:8000
✅ OAuth URL generated successfully!

🔗 To test the barber onboarding flow:
1. Copy this URL and open it in a browser:

https://connect.stripe.com/oauth/authorize?response_type=code&client_id=ca_...&scope=read_write&state=1:ABC123...
```

### Step 2: Test Manual Onboarding Flow

1. Copy the OAuth URL from the test output
2. Open it in a browser
3. Complete the Stripe Connect onboarding:
   - Enter business information
   - Add bank account details
   - Verify identity (for test mode, use provided test data)
4. After completion, you'll be redirected to the success page
5. Check your database to confirm the barber's Stripe account ID was saved

### Step 3: Test Payment Processing

Once a barber has connected their account, you can test payment splits:

```bash
# Test the split calculation endpoint
curl -X GET "http://localhost:8000/api/v1/payment-splits/test-split-calculation"

# Test a payment split (requires connected account)
curl -X POST "http://localhost:8000/api/v1/payment-splits/process-payment" \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_id": 1,
    "amount": 100.00,
    "payment_method_id": "pm_card_visa",
    "description": "Test service payment"
  }'
```

## Key Endpoints

The test scripts verify these main endpoints:

### `POST /api/v1/payment-splits/connect-account`
- Generates OAuth URL for barber to connect their Stripe account
- **Input:** `{"barber_id": 1, "platform": "stripe"}`
- **Output:** `{"oauth_url": "https://connect.stripe.com/...", "state_token": "..."}`

### `GET /api/v1/payment-splits/oauth-callback`
- Handles the OAuth callback from Stripe after account connection
- **Parameters:** `code`, `state`
- **Result:** Saves barber's Stripe account ID and redirects to success page

### `POST /api/v1/payment-splits/process-payment`
- Processes a payment with automatic split between shop and barber
- **Input:** Payment details including amount and appointment ID
- **Output:** Payment confirmation with split details

### `GET /api/v1/payment-splits/test-split-calculation`
- Tests payment split calculations without processing actual payments
- **Output:** Sample calculations showing how much barber and shop receive

## Troubleshooting

### Common Issues

1. **"STRIPE_CONNECT_CLIENT_ID is not set"**
   - Create a Stripe Connect application in your dashboard
   - Copy the Client ID to your `.env` file

2. **"Cannot connect to backend"**
   - Make sure the backend server is running: `uvicorn main:app --reload`
   - Check the BASE_URL in the test script matches your server

3. **"OAuth URL format is incorrect"**
   - Verify your STRIPE_CONNECT_CLIENT_ID is correct
   - Check that your Stripe keys are for the same account

4. **"Barber has not connected a payment account"**
   - Complete the OAuth flow first using the generated URL
   - Check that the barber's Stripe account ID was saved in the database

### Debugging

To see detailed logs:

1. Check the backend server logs in your terminal
2. Enable debug mode by setting `LOG_LEVEL=DEBUG` in your `.env`
3. Use the comprehensive test script for more detailed output:
   ```bash
   python test_stripe_connect.py
   ```

## Test Data

For Stripe test mode, you can use these test values during onboarding:

- **Routing Number:** 110000000
- **Account Number:** 000123456789
- **SSN:** 000-00-0000 (for individual accounts)
- **Phone:** +1 555-123-4567

## Next Steps

After successful testing:

1. **Production Setup:**
   - Replace test keys with live Stripe keys
   - Set up webhook endpoints for production
   - Configure proper redirect URLs

2. **Frontend Integration:**
   - Add barber onboarding UI that calls the connect-account endpoint
   - Display connection status in barber management
   - Show earnings and payout information

3. **Monitoring:**
   - Set up alerts for failed payments
   - Monitor payout success rates
   - Track commission calculations

## Support

If you encounter issues with the test scripts or Stripe Connect integration:

1. Check the [Stripe Connect documentation](https://stripe.com/docs/connect)
2. Review the test script output for specific error messages
3. Verify your environment configuration
4. Check the backend server logs for detailed error information
