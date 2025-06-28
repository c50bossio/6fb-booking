# Simple Stripe Payment Integration

This implementation adds basic Stripe payment processing to the booking flow.

## Features

- Payment intent creation for bookings
- Card payment processing
- Booking status updates after payment
- Test mode only (no real charges)

## Backend Changes

1. **Models** (`models.py`):
   - Added `status` field to Appointment (pending → confirmed)
   - Added `stripe_payment_intent_id` to Payment model

2. **Payment Service** (`services/payment_service.py`):
   - `create_payment_intent()` - Creates Stripe payment intent
   - `confirm_payment()` - Confirms payment and updates booking

3. **Payment Router** (`routers/payments.py`):
   - `POST /payments/create-intent` - Create payment intent
   - `POST /payments/confirm` - Confirm payment

4. **Configuration** (`config.py`):
   - Added `stripe_secret_key` and `stripe_publishable_key`

## Frontend Changes

1. **Payment Component** (`components/PaymentForm.tsx`):
   - Simple card input using Stripe Elements
   - Handles payment processing
   - Shows loading/error states

2. **Booking Flow** (`app/book/page.tsx`):
   - Added 4th step for payment
   - Creates booking first, then processes payment
   - Redirects to dashboard on success

3. **Dependencies**:
   - Added `@stripe/stripe-js` and `@stripe/react-stripe-js`

## Setup

1. **Backend**:
   ```bash
   cd backend-v2
   pip install -r requirements.txt  # stripe is already included
   cp .env.example .env
   # Add your Stripe test keys to .env
   ```

2. **Frontend**:
   ```bash
   cd frontend-v2
   npm install
   cp .env.example .env.local
   # Add your Stripe publishable test key to .env.local
   ```

3. **Get Stripe Test Keys**:
   - Go to https://dashboard.stripe.com/test/apikeys
   - Copy your test keys
   - Add to respective .env files

## Testing

1. Start backend:
   ```bash
   cd backend-v2
   uvicorn main:app --reload
   ```

2. Start frontend:
   ```bash
   cd frontend-v2
   npm run dev
   ```

3. Test payment flow:
   - Login
   - Create a booking
   - Use test card: 4242 4242 4242 4242
   - Any future expiry date
   - Any CVC

4. Run integration test:
   ```bash
   python test_payment_integration.py
   ```

## Test Cards

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

## Limitations

- Test mode only
- No saved cards
- No receipts/invoices
- Basic error handling
- No webhook handling
- No refunds

## Next Steps

For production:
1. Add real Stripe keys
2. Implement webhook handling
3. Add receipt emails
4. Add refund functionality
5. Add saved payment methods
6. Enhance error handling
7. Add payment history page