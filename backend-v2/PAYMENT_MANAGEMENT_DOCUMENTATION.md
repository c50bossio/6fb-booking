# Payment Management System Documentation

## Overview

The enhanced payment management system provides comprehensive features for handling transactions, refunds, gift certificates, and financial reporting. It's built with security, scalability, and ease of use in mind.

## Key Features

### 1. Payment History Page (`/payments`)
- **Complete Transaction History**: View all payment transactions with advanced filtering
- **Smart Search**: Search by client name, email, transaction ID, or service
- **Status Filtering**: Filter by payment status (succeeded, pending, failed, refunded)
- **Date Range Selection**: Custom date ranges for historical analysis
- **Export Functionality**: Export payment data to CSV for accounting
- **Real-time Statistics**: View revenue, transaction counts, and refund rates

### 2. Payment Details Component
- **Detailed Transaction View**: Complete information about each payment
- **Transaction Timeline**: Track the payment lifecycle
- **Commission Breakdown**: Platform fees and barber earnings clearly displayed
- **Receipt Management**: Send receipts via email or print them
- **Audit Trail**: Complete history of payment modifications

### 3. Refund Management
- **Full & Partial Refunds**: Process refunds with reason tracking
- **Policy Enforcement**: Built-in refund policies and limits
- **Automatic Notifications**: Customer notifications for refunds
- **Refund History**: Track all refunds with detailed reporting
- **Security Controls**: Role-based access for refund processing

### 4. Gift Certificate System
- **Lifecycle Management**: Create, track, and redeem gift certificates
- **Balance Tracking**: Real-time balance updates as certificates are used
- **Expiration Management**: Automatic expiration handling
- **Bulk Generation**: Create multiple certificates for promotions
- **Email Delivery**: Send gift certificates directly to recipients

### 5. Payment Reports
- **Revenue Analytics**: Comprehensive revenue tracking by period
- **Visual Charts**: Interactive charts for revenue trends and breakdowns
- **Payment Method Analysis**: Track credit card vs gift certificate usage
- **Commission Reports**: Platform fees and barber payout summaries
- **Export Options**: Generate CSV and PDF reports for accounting

### 6. Stripe Connect Integration
- **Barber Onboarding**: Streamlined Stripe Connect account setup
- **Payout Management**: Automatic transfers to barber bank accounts
- **Real-time Status**: Track account verification and payout eligibility
- **Earnings Dashboard**: Barbers can view their earnings and pending payouts

## Security Features

### Authentication & Authorization
- **Role-Based Access**: Different permissions for clients, barbers, and admins
- **Secure Token Management**: JWT tokens with proper expiration
- **API Security**: All endpoints protected with authentication

### Payment Security
- **PCI Compliance**: No credit card data stored locally
- **Stripe Integration**: Industry-leading payment processing
- **Encryption**: Sensitive data encrypted at rest and in transit
- **Audit Logging**: All payment actions logged for compliance

### Data Protection
- **Input Validation**: Comprehensive validation on all inputs
- **SQL Injection Prevention**: Parameterized queries throughout
- **XSS Protection**: React's built-in XSS protection
- **CSRF Protection**: Token-based CSRF prevention

## User Workflows

### Admin Workflow
1. Access payment dashboard at `/payments`
2. View real-time payment statistics
3. Search and filter transaction history
4. Process refunds with reason tracking
5. Generate financial reports
6. Manage gift certificates
7. Monitor barber payouts

### Barber Workflow
1. Access earnings dashboard at `/barber/earnings`
2. View personal earnings and commissions
3. Track payment status for appointments
4. Set up Stripe Connect for payouts
5. Export earnings reports for taxes
6. Monitor pending payouts

### Client Workflow
1. Make payments during booking process
2. Apply gift certificates at checkout
3. View payment history for their bookings
4. Receive email receipts automatically

## API Endpoints

### Payment History
```
GET /api/v2/payments/history
Query params: user_id, barber_id, start_date, end_date, status, page, page_size
```

### Refund Processing
```
POST /api/v2/payments/refund
Body: { payment_id, amount, reason }
```

### Gift Certificates
```
POST /api/v2/payments/gift-certificates - Create certificate
GET /api/v2/payments/gift-certificates - List certificates
POST /api/v2/payments/gift-certificates/validate - Validate code
```

### Payment Reports
```
POST /api/v2/payments/reports
Body: { start_date, end_date, barber_id }
```

### Stripe Connect
```
POST /api/v2/payments/stripe-connect/onboard - Start onboarding
GET /api/v2/payments/stripe-connect/status - Check status
```

## Configuration

### Environment Variables
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Commission Settings
DEFAULT_COMMISSION_RATE=0.20  # 20% platform fee
```

### Business Rules
- Default commission rate: 20% (configurable per barber)
- Gift certificates valid for 12 months by default
- Refunds allowed within 24 hours of service
- Partial refunds supported
- Minimum payout amount: $10

## Testing

### Running Tests
```bash
# Backend tests
cd backend-v2
python test_payment_management.py

# Frontend tests
cd frontend-v2
npm test
```

### Test Coverage
- Payment creation and processing
- Refund workflows
- Gift certificate lifecycle
- Report generation
- Security and permissions
- Stripe Connect integration

## Troubleshooting

### Common Issues

1. **Payment Intent Creation Fails**
   - Check Stripe API keys
   - Verify booking exists and is eligible
   - Check user authentication

2. **Refund Processing Errors**
   - Verify payment status allows refunds
   - Check refund amount doesn't exceed original
   - Ensure user has proper permissions

3. **Gift Certificate Not Working**
   - Verify code is valid and not expired
   - Check balance is sufficient
   - Ensure certificate status is active

4. **Stripe Connect Issues**
   - Complete all onboarding requirements
   - Verify bank account information
   - Check identity verification status

## Future Enhancements

1. **Automated Payouts**: Schedule automatic weekly/monthly payouts
2. **Tax Reporting**: 1099 generation for barbers
3. **Subscription Payments**: Recurring payment support
4. **Multi-Currency**: Support for international payments
5. **Advanced Analytics**: Predictive revenue forecasting
6. **Mobile App Integration**: Native payment support

## Support

For payment-related issues:
1. Check the error messages in the UI
2. Review backend logs for detailed errors
3. Verify Stripe dashboard for payment status
4. Contact support with transaction IDs

## Compliance

The payment system is designed to be compliant with:
- PCI DSS (through Stripe)
- GDPR (data protection)
- Financial reporting requirements
- Tax regulations

Always consult with legal and financial advisors for specific compliance requirements in your jurisdiction.