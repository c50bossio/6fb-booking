# Enhanced Payment System Documentation

## Overview

The V2 payment processing system is a comprehensive, secure solution that handles payments, commissions, refunds, gift certificates, and reporting for the 6FB Booking platform. Built with Stripe integration and robust security measures.

## 🚀 Key Features

### 1. Payment Processing
- **Stripe Integration**: Full Stripe Payment Intents API integration
- **Commission Calculations**: Automatic platform fee and barber earnings splits
- **Gift Certificate Support**: Integrated gift certificate redemption
- **Multiple Payment Methods**: Credit cards, digital wallets via Stripe
- **Real-time Processing**: Instant payment confirmation and status updates

### 2. Commission & Payout System
- **Flexible Commission Rates**: Per-barber customizable commission rates (default 20%)
- **Automatic Calculations**: Platform fees and barber earnings calculated automatically
- **Stripe Connect Integration**: Direct payouts to barber Stripe accounts
- **Payout Management**: Scheduled and manual payout processing
- **Comprehensive Tracking**: Full audit trail for all financial transactions

### 3. Refund Management
- **Partial & Full Refunds**: Support for both partial and complete refunds
- **Validation Rules**: 90-day refund window and eligibility checks
- **Stripe Integration**: Automatic Stripe refund processing
- **Status Tracking**: Real-time refund status updates
- **Audit Trail**: Complete refund history with reasons and timestamps

### 4. Gift Certificate System
- **Unique Code Generation**: Secure, human-readable gift certificate codes
- **Balance Tracking**: Real-time balance updates and usage tracking
- **Expiration Management**: Configurable validity periods (default 12 months)
- **Partial Redemption**: Support for partial gift certificate usage
- **Security Features**: Code validation and fraud prevention

### 5. Reporting & Analytics
- **Financial Reports**: Revenue, commissions, and transaction analytics
- **Payment History**: Comprehensive payment tracking with filtering
- **Barber Earnings**: Individual barber performance reports
- **Export Capabilities**: Data export for accounting and analysis
- **Real-time Dashboards**: Live financial metrics and KPIs

### 6. Security & Compliance
- **Payment Security**: PCI-compliant payment processing via Stripe
- **Data Encryption**: Sensitive data encryption and secure storage
- **Audit Logging**: Comprehensive audit trail for all payment operations
- **Rate Limiting**: Protection against abuse and fraud attempts
- **Webhook Verification**: Secure Stripe webhook signature validation

## 📋 API Endpoints

### Payment Processing

#### Create Payment Intent
```http
POST /api/v1/payments/create-intent
```
```json
{
  "booking_id": 123,
  "gift_certificate_code": "GIFT123456" // Optional
}
```

**Response:**
```json
{
  "client_secret": "pi_xxx_secret",
  "payment_intent_id": "pi_xxx",
  "amount": 45.00,
  "original_amount": 50.00,
  "gift_certificate_used": 5.00,
  "payment_id": 456
}
```

#### Confirm Payment
```http
POST /api/v1/payments/confirm
```
```json
{
  "payment_intent_id": "pi_xxx",
  "booking_id": 123
}
```

### Refund Management

#### Process Refund
```http
POST /api/v1/payments/refund
```
```json
{
  "payment_id": 456,
  "amount": 25.00,
  "reason": "Customer request"
}
```

**Response:**
```json
{
  "refund_id": 789,
  "amount": 25.00,
  "status": "completed",
  "stripe_refund_id": "re_xxx"
}
```

### Gift Certificates

#### Create Gift Certificate
```http
POST /api/v1/payments/gift-certificates
```
```json
{
  "amount": 100.00,
  "purchaser_name": "John Doe",
  "purchaser_email": "john@example.com",
  "recipient_name": "Jane Doe",
  "recipient_email": "jane@example.com",
  "message": "Happy Birthday!",
  "validity_months": 12
}
```

#### Validate Gift Certificate
```http
POST /api/v1/payments/gift-certificates/validate
```
```json
{
  "code": "GIFT123456"
}
```

**Response:**
```json
{
  "valid": true,
  "balance": 95.00,
  "amount": 100.00,
  "valid_until": "2025-06-28T12:00:00Z"
}
```

### Payment History & Reporting

#### Get Payment History
```http
GET /api/v1/payments/history?page=1&page_size=50&start_date=2024-01-01&status=completed
```

#### Generate Payment Report
```http
POST /api/v1/payments/reports
```
```json
{
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-12-31T23:59:59Z",
  "barber_id": 123 // Optional
}
```

### Payout Management

#### Process Barber Payout
```http
POST /api/v1/payments/payouts
```
```json
{
  "barber_id": 123,
  "start_date": "2024-06-01T00:00:00Z",
  "end_date": "2024-06-30T23:59:59Z"
}
```

### Webhooks

#### Stripe Webhook Handler
```http
POST /api/v1/webhooks/stripe
```
Handles Stripe webhook events for payment confirmations, failures, and disputes.

## 🛡️ Security Features

### Payment Security
- **Amount Validation**: Min $1.00, Max $10,000.00, 2 decimal places
- **User Authorization**: Users can only pay for their own appointments
- **Appointment Validation**: Only pending appointments eligible for payment
- **Gift Certificate Validation**: Format and expiration checks

### Refund Security
- **Eligibility Checks**: Payment status and age validation
- **Amount Limits**: Cannot exceed remaining refundable amount
- **Authorization**: Admin/barber roles required for refund processing
- **Audit Trail**: Complete refund history with initiator tracking

### Data Protection
- **Sensitive Data Masking**: Stripe IDs and payment details masked in logs
- **Secure Storage**: Encrypted sensitive information
- **Access Control**: Role-based permissions for financial operations
- **Rate Limiting**: Protection against abuse and automated attacks

## 📊 Database Models

### Payment Model
```python
class Payment(Base):
    id: int
    user_id: int
    appointment_id: int
    barber_id: int
    amount: float
    status: str  # pending, completed, failed, refunded, partially_refunded
    stripe_payment_intent_id: str
    platform_fee: float
    barber_amount: float
    commission_rate: float
    gift_certificate_id: int
    gift_certificate_amount_used: float
    refund_amount: float
    created_at: datetime
```

### Gift Certificate Model
```python
class GiftCertificate(Base):
    id: int
    code: str
    amount: float
    balance: float
    status: str  # active, used, expired, cancelled
    purchaser_name: str
    purchaser_email: str
    recipient_name: str
    recipient_email: str
    valid_from: datetime
    valid_until: datetime
    created_at: datetime
```

### Refund Model
```python
class Refund(Base):
    id: int
    payment_id: int
    amount: float
    reason: str
    status: str  # pending, completed, failed
    stripe_refund_id: str
    initiated_by_id: int
    created_at: datetime
    processed_at: datetime
```

### Payout Model
```python
class Payout(Base):
    id: int
    barber_id: int
    amount: float
    status: str  # pending, processing, completed, failed
    period_start: datetime
    period_end: datetime
    payment_count: int
    stripe_transfer_id: str
    created_at: datetime
    processed_at: datetime
```

## 🔧 Configuration

### Environment Variables
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Payment Settings
PAYMENT_MIN_AMOUNT=1.00
PAYMENT_MAX_AMOUNT=10000.00
REFUND_WINDOW_DAYS=90
DEFAULT_COMMISSION_RATE=0.20
```

### Stripe Connect Setup
1. Create Stripe Connect platform account
2. Configure OAuth for barber onboarding
3. Set up webhook endpoints for payment events
4. Enable transfers and payouts

## 🧪 Testing

### Unit Tests
```bash
python test_payment_simple.py
```

### Integration Tests
```bash
python -m pytest test_payment_features.py -v
```

### Test Coverage
- Payment intent creation and confirmation
- Commission calculations and splits
- Refund processing and validation
- Gift certificate creation and redemption
- Security validations and error handling
- Webhook event processing

## 📝 Usage Examples

### Basic Payment Flow
```python
# 1. Create payment intent
result = PaymentService.create_payment_intent(
    amount=50.0,
    booking_id=123,
    db=db,
    user_id=current_user.id
)

# 2. Process payment on frontend with Stripe
# (client-side Stripe.js integration)

# 3. Confirm payment
confirmation = PaymentService.confirm_payment(
    payment_intent_id=result["payment_intent_id"],
    booking_id=123,
    db=db
)
```

### Gift Certificate Payment
```python
# Create payment intent with gift certificate
result = PaymentService.create_payment_intent(
    amount=50.0,
    booking_id=123,
    db=db,
    gift_certificate_code="GIFT123456",
    user_id=current_user.id
)
# If gift certificate covers full amount, no Stripe payment needed
```

### Process Refund
```python
refund = PaymentService.process_refund(
    payment_id=456,
    amount=25.0,
    reason="Customer request",
    initiated_by_id=admin_user.id,
    db=db
)
```

### Generate Reports
```python
report = PaymentService.get_payment_reports(
    start_date=datetime(2024, 1, 1),
    end_date=datetime(2024, 12, 31),
    barber_id=123,  # Optional
    db=db
)
```

## 🚨 Error Handling

### Common Error Scenarios
- **Invalid payment amount**: Amount validation failures
- **Unauthorized access**: User trying to pay for others' appointments
- **Invalid gift certificate**: Expired or non-existent codes
- **Refund limits exceeded**: Attempting to refund more than available
- **Stripe errors**: Network issues or payment failures
- **Insufficient barber setup**: Missing Stripe Connect account

### Error Response Format
```json
{
  "detail": "Error description",
  "error_code": "PAYMENT_VALIDATION_ERROR",
  "error_type": "validation_error"
}
```

## 📈 Performance Considerations

- **Database Indexing**: Optimized queries for payment history
- **Caching**: Redis caching for frequently accessed data
- **Async Processing**: Background processing for payouts and reports
- **Rate Limiting**: API endpoint protection
- **Connection Pooling**: Efficient database connections

## 🔄 Migration Guide

### From V1 to V2
1. **Database Migration**: Run Alembic migrations for new tables
2. **Environment Setup**: Update configuration with new variables
3. **Stripe Integration**: Configure Stripe Connect for payouts
4. **Frontend Updates**: Update payment forms for new API endpoints
5. **Testing**: Comprehensive testing of all payment flows

## 📞 Support & Troubleshooting

### Common Issues
- **Payment failures**: Check Stripe dashboard and logs
- **Webhook failures**: Verify webhook signature and endpoint
- **Commission miscalculations**: Review barber commission rates
- **Refund delays**: Check Stripe processing times
- **Gift certificate issues**: Validate code format and expiration

### Monitoring
- **Payment Success Rate**: Monitor via Stripe dashboard
- **Audit Logs**: Review payment_audit logs for security issues
- **Error Tracking**: Sentry integration for error monitoring
- **Performance Metrics**: API response times and database queries

---

*For technical support or questions about the payment system, contact the development team or refer to the Stripe documentation for payment processing details.*