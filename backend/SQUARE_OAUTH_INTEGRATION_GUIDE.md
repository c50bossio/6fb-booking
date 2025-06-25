# Square OAuth Integration Guide

## Overview

This guide covers the complete Square OAuth integration for the 6FB Booking platform, enabling barbers to accept payments through Square with automatic commission splits and payout management.

## Features

- **OAuth Authentication**: Secure Square account connection using OAuth 2.0
- **Payment Processing**: Accept payments with automatic commission splits
- **Webhook Handling**: Real-time payment and payout status updates
- **Payout Management**: Automatic and manual payout processing
- **Account Management**: Check account status and capabilities
- **Comprehensive Error Handling**: Retry logic and error recovery
- **Security**: Token encryption and webhook signature verification

## Architecture

### Components

1. **Square OAuth Service** (`services/square_oauth_service.py`)
   - Core service handling OAuth flow, payments, and payouts
   - Webhook processing and signature verification
   - Token management with automatic refresh
   - Redis caching for performance

2. **API Endpoints** (`api/v1/endpoints/square_oauth.py`)
   - RESTful API for Square integration
   - OAuth initiation and callback handling
   - Payment and payout management endpoints
   - Analytics and reporting

3. **Models** (`models/square_payment.py`)
   - SquareAccount: Barber's Square account information
   - SquarePayment: Payment transaction records
   - SquarePayout: Payout records with commission details
   - SquareWebhookEvent: Webhook event tracking

## Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```env
# Square OAuth Configuration
SQUARE_APPLICATION_ID=your_square_app_id
SQUARE_APPLICATION_SECRET=your_square_app_secret
SQUARE_ENVIRONMENT=sandbox  # or "production"
SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_signature_key

# Redis Configuration (for caching and rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379

# Encryption Key (for token storage)
DATA_ENCRYPTION_KEY=your_32_byte_encryption_key
```

### 2. Database Migration

Run the following to create Square-related tables:

```bash
cd backend
alembic upgrade head
```

### 3. Square Application Setup

1. Create a Square application at https://developer.squareup.com
2. Configure OAuth redirect URLs:
   - Development: `http://localhost:3000/square/callback`
   - Production: `https://yourdomain.com/square/callback`
3. Set up webhook endpoints:
   - URL: `https://yourdomain.com/api/v1/square-oauth/webhooks`
   - Subscribe to events: payment.*, payout.*, refund.*, dispute.*

## API Usage

### 1. Initiate OAuth Flow

```bash
POST /api/v1/square-oauth/oauth/initiate
Authorization: Bearer <jwt_token>

{
  "barber_id": 123,  // Optional for barbers, required for admins
  "redirect_uri": "http://localhost:3000/square/callback"
}

Response:
{
  "oauth_url": "https://squareup.com/oauth2/authorize?...",
  "barber_id": 123,
  "message": "Redirect user to the oauth_url to complete Square authorization"
}
```

### 2. Handle OAuth Callback

```bash
POST /api/v1/square-oauth/oauth/callback
Authorization: Bearer <jwt_token>

{
  "code": "authorization_code_from_square",
  "state": "state_token_from_oauth_url"
}

Response:
{
  "success": true,
  "message": "Square account successfully connected",
  "account": {
    "id": 1,
    "barber_id": 123,
    "merchant_id": "MERCHANT_ID",
    "merchant_name": "Test Barbershop",
    "is_verified": true,
    "can_receive_payments": true,
    "can_make_payouts": true
  }
}
```

### 3. Create Payment

```bash
POST /api/v1/square-oauth/payments
Authorization: Bearer <jwt_token>

{
  "appointment_id": 456,
  "amount_cents": 10000,  // $100.00
  "source_id": "cnon:card-nonce-from-square-sdk",
  "location_id": "LOCATION_ID",
  "customer_email": "customer@example.com"
}

Response:
{
  "id": 789,
  "square_payment_id": "PAYMENT_ID",
  "amount": 100.00,
  "currency": "USD",
  "status": "completed",
  "appointment_id": 456,
  "barber_id": 123,
  "receipt_url": "https://squareup.com/receipt/...",
  "card_brand": "VISA",
  "card_last_four": "1234",
  "created_at": "2025-06-24T12:00:00Z",
  "payout": {
    "id": 101,
    "amount": 67.10,  // After commission and fees
    "status": "pending",
    "scheduled_at": "2025-06-25T12:00:00Z"
  }
}
```

### 4. Check Account Status

```bash
GET /api/v1/square-oauth/account/status?barber_id=123
Authorization: Bearer <jwt_token>

Response:
{
  "connected": true,
  "verified": true,
  "can_receive_payments": true,
  "can_make_payouts": true,
  "merchant_name": "Test Barbershop",
  "locations_count": 2,
  "bank_accounts_count": 1,
  "last_sync": "2025-06-24T12:00:00Z"
}
```

### 5. List Payments

```bash
GET /api/v1/square-oauth/payments?start_date=2025-06-01&end_date=2025-06-30&barber_id=123
Authorization: Bearer <jwt_token>

Response: [
  {
    "id": 789,
    "square_payment_id": "PAYMENT_ID",
    "amount": 100.00,
    "currency": "USD",
    "status": "completed",
    "appointment_id": 456,
    "barber_id": 123,
    "receipt_url": "https://squareup.com/receipt/...",
    "card_brand": "VISA",
    "card_last_four": "1234",
    "created_at": "2025-06-24T12:00:00Z",
    "payout": {
      "id": 101,
      "amount": 67.10,
      "status": "paid",
      "scheduled_at": "2025-06-25T12:00:00Z"
    }
  }
]
```

### 6. Process Scheduled Payouts

```bash
POST /api/v1/square-oauth/payouts/process-scheduled
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "message": "Payout processing started in background"
}
```

### 7. Get Analytics Summary

```bash
GET /api/v1/square-oauth/analytics/summary?start_date=2025-06-01&end_date=2025-06-30&barber_id=123
Authorization: Bearer <jwt_token>

Response:
{
  "period": {
    "start_date": "2025-06-01T00:00:00",
    "end_date": "2025-06-30T23:59:59"
  },
  "payments": {
    "total_count": 150,
    "total_amount": 15000.00,
    "completed_count": 145,
    "completed_amount": 14500.00,
    "failed_count": 5,
    "average_payment": 100.00
  },
  "payouts": {
    "total_count": 145,
    "total_amount": 9715.50,
    "pending_count": 10,
    "pending_amount": 670.00,
    "paid_count": 135,
    "paid_amount": 9045.50,
    "failed_count": 0
  },
  "fees": {
    "total_processing_fees": 420.50,
    "total_platform_fees": 4364.00,
    "total_fees": 4784.50
  },
  "net_revenue": 5284.50
}
```

## Webhook Integration

### Webhook Events Handled

- `payment.created`: New payment created
- `payment.updated`: Payment status changed
- `payment.deleted`: Payment canceled
- `payout.sent`: Payout initiated
- `payout.paid`: Payout completed
- `payout.failed`: Payout failed
- `refund.created`: Refund initiated
- `refund.updated`: Refund status changed
- `dispute.created`: Payment dispute filed
- `dispute.evidence_added`: Evidence added to dispute
- `dispute.state_changed`: Dispute status changed

### Webhook Security

All webhooks are verified using HMAC-SHA256 signatures:

```python
signature = request.headers.get("X-Square-Hmacsha256-Signature")
is_valid = square_oauth_service.verify_webhook_signature(
    payload=request_body,
    signature=signature
)
```

## Commission Structure

The system automatically calculates commissions based on the barber's payment model:

- **Service Commission**: Configurable per barber (e.g., 70%)
- **Platform Fee**: Remainder after commission (e.g., 30%)
- **Processing Fee**: Deducted from barber's commission
- **Net Payout**: Commission - Processing Fee

Example for a $100 payment with 70% commission:
- Total Payment: $100.00
- Barber Commission: $70.00
- Platform Fee: $30.00
- Processing Fee: $2.90
- Net Payout to Barber: $67.10

## Error Handling

### Retry Logic

- API calls: 3 retries with exponential backoff
- Webhook processing: Stored and retried up to 3 times
- Token refresh: Automatic refresh before expiration

### Error Codes

- `400`: Invalid request (check parameters)
- `401`: Authentication failed (check tokens)
- `403`: Permission denied
- `404`: Resource not found
- `429`: Rate limit exceeded (implement backoff)
- `500`: Server error (contact support)

## Testing

### Run Integration Tests

```bash
cd backend
python test_square_oauth_integration.py
```

### Test in Sandbox

1. Use Square Sandbox credentials
2. Test cards: https://developer.squareup.com/docs/testing/test-values
3. Webhook testing: Use ngrok for local development

## Security Best Practices

1. **Token Storage**: All tokens are encrypted using AES-256
2. **State Validation**: OAuth state tokens expire after 1 hour
3. **Webhook Verification**: All webhooks must pass signature verification
4. **Rate Limiting**: Implemented to prevent abuse
5. **Permission Checks**: Role-based access control for all endpoints

## Monitoring

### Key Metrics to Monitor

- OAuth connection success rate
- Payment success rate
- Average payment processing time
- Payout success rate
- Webhook processing delays
- Token refresh failures

### Health Check Endpoint

```bash
GET /api/v1/square-oauth/health
Authorization: Bearer <jwt_token>

Response:
{
  "status": "healthy",
  "active_accounts": 125,
  "recent_payments_24h": 348,
  "pending_payouts": 42,
  "timestamp": "2025-06-24T12:00:00Z"
}
```

## Troubleshooting

### Common Issues

1. **OAuth Callback Fails**
   - Check redirect URI configuration
   - Verify state token hasn't expired
   - Check Square application settings

2. **Payment Creation Fails**
   - Verify source_id (nonce) is valid
   - Check location_id matches connected account
   - Ensure amount meets minimum ($0.50)

3. **Webhook Not Received**
   - Verify webhook URL is publicly accessible
   - Check webhook subscription in Square dashboard
   - Verify signature key configuration

4. **Token Refresh Fails**
   - Check if refresh token exists
   - Verify application credentials
   - Check token expiration status

## Support

For additional support:
- Square API Documentation: https://developer.squareup.com/docs
- Square Support: https://squareup.com/help
- Internal Support: contact your system administrator
