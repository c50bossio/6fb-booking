# Commission Payout Calculations - Complete Guide

## Overview

BookedBarber V2 now features a comprehensive commission payout system that handles:
- Service appointment commissions
- Retail product sale commissions
- Point-of-Sale (POS) transaction commissions
- Unified payout processing with Stripe Connect
- Commission analytics and optimization

## Architecture

### 1. Unified Commission Framework
**Location**: `services/base_commission.py`

The system uses a unified framework with different calculators:
- **ServiceCommissionCalculator**: Handles appointment-based commissions
- **RetailCommissionCalculator**: Handles product sales commissions  
- **POSCommissionCalculator**: Handles in-person transaction commissions

### 2. Commission Service
**Location**: `services/commission_service.py`

Manages commission calculations for orders and POS transactions:
- Calculates commissions when orders are paid
- Tracks unpaid commissions
- Marks commissions as paid after payout processing

### 3. Commission Rate Manager
**Location**: `services/commission_rate_manager.py`

Handles dynamic commission rates:
- Different rates for different commission types
- Tiered rates based on transaction amounts
- Product-specific commission rates
- Rate optimization recommendations

### 4. Payment Service Integration
**Location**: `services/payment_service.py`

The `process_barber_payout()` method:
- Calculates pending service payments
- Optionally includes retail/POS commissions
- Creates Stripe transfers
- Records payout history

## API Endpoints

### Payout Management

#### Get Payout Summary
```http
GET /api/v1/payments/payouts/summary
```
Shows pending amounts from all sources:
- Service payments
- Retail commissions  
- POS commissions
- Last payout information
- Minimum payout threshold

#### Get Payout History
```http
GET /api/v1/payments/payouts/history?page=1&page_size=50
```
Returns paginated payout history with:
- Payout amounts and dates
- Service vs retail breakdown
- Stripe transfer IDs
- Period covered

#### Process Payout (Admin Only)
```http
POST /api/v1/payments/payouts
{
  "barber_id": 1,
  "start_date": "2025-01-01T00:00:00",
  "end_date": "2025-01-31T23:59:59"
}
```

#### Process Enhanced Payout (Includes Retail)
```http
POST /api/v1/payments/payouts/enhanced?include_retail=true
{
  "barber_id": 1,
  "start_date": "2025-01-01T00:00:00", 
  "end_date": "2025-01-31T23:59:59"
}
```

### Commission Analytics

#### Get Commission Analytics
```http
GET /api/v1/analytics/commissions?start_date=2025-01-01&end_date=2025-01-31
```
Returns:
- Total commissions by type
- Commission trends over time
- Growth metrics
- Top services by commission

#### Get Commission Trends
```http
GET /api/v1/analytics/commissions/trends?period=week
```
Parameters:
- `period`: day, week, or month
- `start_date`: Start of trend period
- `end_date`: End of trend period

### Commission Rate Management

#### Get Barber Commission Rates
```http
GET /api/v1/commission-rates/{barber_id}
```

#### Update Commission Rate (Admin Only)
```http
PUT /api/v1/commission-rates/{barber_id}
{
  "rate": 0.25,
  "commission_type": "service"  // Optional, defaults to general rate
}
```

#### Get Rate Optimization Suggestions
```http
GET /api/v1/commission-rates/{barber_id}/optimize
```

#### Simulate Commission Changes
```http
POST /api/v1/commission-rates/simulate
{
  "commission_type": "service",
  "new_rate": 0.18,
  "monthly_volume": 10000,
  "average_transaction": 50
}
```

## Commission Types and Rates

### Service Commissions
- **Default Rate**: 20% platform fee
- **Barber Receives**: 80% of service amount
- **Calculation**: On appointment completion

### Retail Commissions  
- **Default Rate**: 10% commission
- **Barber Receives**: Commission amount
- **Calculation**: When order is paid

### POS Commissions
- **Default Rate**: 8% commission
- **Barber Receives**: Commission amount
- **Calculation**: On transaction completion

## Payout Process Flow

1. **Service Payments**:
   - Client pays for appointment
   - Platform fee calculated
   - Barber amount tracked

2. **Retail/POS Sales**:
   - Order/transaction completed
   - Commission calculated based on rate
   - Commission amount tracked

3. **Payout Processing**:
   - Admin initiates payout
   - System calculates all pending amounts
   - Stripe transfer created
   - Commissions marked as paid
   - Payout record created

## Database Schema

### Key Tables
- **payments**: Tracks service payments with `barber_amount`
- **payouts**: Records payout history
- **order_items**: Has `commission_amount` and `commission_paid` fields
- **pos_transactions**: Has `commission_amount` and `commission_paid` fields

### Commission Tracking Fields
```sql
-- On order_items
commission_rate DECIMAL(5,4)
commission_amount DECIMAL(10,2)  
commission_paid BOOLEAN
commission_paid_at TIMESTAMP

-- On pos_transactions
commission_rate DECIMAL(5,4)
commission_amount DECIMAL(10,2)
commission_paid BOOLEAN
commission_paid_at TIMESTAMP
```

## Configuration

### Environment Variables
```env
# Stripe configuration for payouts
STRIPE_SECRET_KEY=sk_live_xxx

# Commission defaults (optional)
DEFAULT_SERVICE_COMMISSION_RATE=0.20
DEFAULT_RETAIL_COMMISSION_RATE=0.10
DEFAULT_POS_COMMISSION_RATE=0.08

# Payout configuration
MINIMUM_PAYOUT_AMOUNT=10.00
PAYOUT_CURRENCY=USD
```

### Commission Rate Customization
Rates can be customized:
- Per barber (stored in `users.commission_rate`)
- Per product (stored in `products.commission_rate`)
- Per transaction type (through rate manager)

## Security and Permissions

### Role-Based Access
- **Barbers**: View own pending commissions and payout history
- **Admins**: Process payouts, view all commission data
- **Super Admins**: Manage commission rates

### Audit Logging
All financial transactions are logged:
- Commission calculations
- Payout processing
- Rate changes
- Failed payout attempts

## Testing

### Running Tests
```bash
cd backend-v2
pytest tests/test_commission_payouts.py -v
```

### Test Coverage
- Commission calculations for all types
- Payout processing with mixed commissions
- Edge cases (refunds, negative amounts)
- Rate validation and management

## Troubleshooting

### Common Issues

1. **No pending commissions found**
   - Check date range
   - Verify payments have `completed` status
   - Ensure commissions aren't already paid

2. **Stripe transfer fails**
   - Verify barber has active Stripe Connect account
   - Check Stripe API keys
   - Ensure sufficient platform balance

3. **Commission calculations incorrect**
   - Verify commission rates
   - Check for custom product rates
   - Review tiered rate logic

### Debug Queries

Check pending service payments:
```sql
SELECT * FROM payments 
WHERE barber_id = ? 
AND status = 'completed'
AND created_at BETWEEN ? AND ?
AND id NOT IN (
  SELECT payment_id FROM payout_items
);
```

Check unpaid retail commissions:
```sql
SELECT * FROM order_items
JOIN orders ON order_items.order_id = orders.id
WHERE orders.commission_barber_id = ?
AND orders.financial_status = 'paid'
AND order_items.commission_paid = false;
```

## Best Practices

1. **Regular Payouts**: Process payouts weekly or bi-weekly
2. **Minimum Thresholds**: Set minimum payout amounts to reduce fees
3. **Rate Reviews**: Regularly review and optimize commission rates
4. **Reconciliation**: Match Stripe transfers with payout records
5. **Communication**: Notify barbers when payouts are processed

## Future Enhancements

1. **Automated Payouts**: Schedule automatic weekly/monthly payouts
2. **Instant Payouts**: Allow barbers to request instant payouts
3. **Multi-Currency**: Support for international payments
4. **Advanced Analytics**: Predictive commission forecasting
5. **Mobile Integration**: Payout management in mobile app