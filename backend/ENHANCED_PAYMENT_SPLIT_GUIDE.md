# Enhanced Payment Split Service Guide

## Overview

The Enhanced Payment Split Service provides intelligent multi-processor support for payment processing, enabling automatic routing between Stripe and Square based on performance metrics, with built-in fallback capabilities and comprehensive reconciliation features.

## Key Features

### 1. **Dual Processor Support**
- **Stripe**: Industry-standard with robust API and instant transfers
- **Square**: Lower fees for certain transactions, good for in-person payments
- Unified API interface for both processors
- Seamless switching between processors

### 2. **Intelligent Routing**
Multiple routing strategies available:

#### Fastest Mode
```python
# Routes to processor with lowest average processing time
processing_mode = ProcessingMode.FASTEST
```

#### Cheapest Mode
```python
# Routes to processor with lowest fees
processing_mode = ProcessingMode.CHEAPEST
```

#### Balanced Mode (Default)
```python
# Balances speed, cost, and reliability
processing_mode = ProcessingMode.BALANCED
# Weights: Reliability (50%), Speed (30%), Cost (20%)
```

#### Failover Mode
```python
# Primary processor with automatic fallback
processing_mode = ProcessingMode.FAILOVER
```

### 3. **Real-Time Performance Metrics**
The service continuously monitors:
- Success rates
- Average processing times
- Fee percentages
- Failure counts
- Availability status

### 4. **Automatic Split Calculation**
Supports multiple payment models:
- **Commission**: Shop keeps percentage (e.g., 30%)
- **Booth Rent**: Barber keeps full amount (rent charged separately)
- **Hybrid**: Commission + booth rent

### 5. **Cross-Processor Reconciliation**
- Daily transaction reconciliation
- Unified reporting across processors
- Discrepancy detection
- Fee analysis and optimization

## Implementation

### Basic Payment Processing

```python
from services.enhanced_payment_split_service import (
    enhanced_payment_split_service,
    ProcessorType,
    ProcessingMode
)

# Process a payment with automatic routing
payment_data = {
    "amount": 100.00,
    "appointment_id": 123,
    "barber_id": 1,
    "customer_id": 456,
    "barber_payment_model": {
        "payment_type": "commission",
        "service_commission_rate": 0.3  # 30% commission
    },
    # Processor-specific fields
    "payment_method_id": "pm_xxx",  # For Stripe
    "source_id": "nonce_xxx",  # For Square
    "barber_stripe_account_id": "acct_xxx",
    "location_id": "loc_xxx"
}

result = await enhanced_payment_split_service.process_payment_with_split(
    db,
    payment_data,
    preferred_processor=ProcessorType.AUTO,  # Let system choose
    processing_mode=ProcessingMode.BALANCED  # Balanced approach
)

if result.success:
    print(f"Payment processed via {result.processor_used}")
    print(f"Amount: ${result.amount}")
    print(f"Barber receives: ${result.barber_amount}")
    print(f"Shop fee: ${result.shop_fee}")
```

### Force Specific Processor

```python
# Force Stripe
result = await enhanced_payment_split_service.process_payment_with_split(
    db,
    payment_data,
    preferred_processor=ProcessorType.STRIPE
)

# Force Square
result = await enhanced_payment_split_service.process_payment_with_split(
    db,
    payment_data,
    preferred_processor=ProcessorType.SQUARE
)
```

### Enable Failover

```python
# Primary processor with automatic failover
result = await enhanced_payment_split_service.process_payment_with_split(
    db,
    payment_data,
    processing_mode=ProcessingMode.FAILOVER
)
```

## API Endpoints

### Process Payment
```http
POST /api/v1/enhanced-payments/process
```

Request:
```json
{
    "appointment_id": 123,
    "amount": 100.00,
    "payment_method_id": "pm_xxx",  // For Stripe
    "source_id": "nonce_xxx",       // For Square
    "preferred_processor": "auto",   // "stripe", "square", or "auto"
    "processing_mode": "balanced"    // "fastest", "cheapest", "balanced", or "failover"
}
```

### Get Processor Metrics
```http
GET /api/v1/enhanced-payments/metrics
```

Response:
```json
[
    {
        "processor": "stripe",
        "success_rate": 0.98,
        "avg_processing_time": 2.5,
        "avg_fee_percentage": 2.9,
        "availability": true,
        "failure_count": 2,
        "recommendation": null
    },
    {
        "processor": "square",
        "success_rate": 0.96,
        "avg_processing_time": 3.0,
        "avg_fee_percentage": 2.6,
        "availability": true,
        "failure_count": 4,
        "recommendation": null
    }
]
```

### Get Transaction History
```http
GET /api/v1/enhanced-payments/transactions?barber_id=1&start_date=2025-06-01
```

### Reconcile Transactions
```http
POST /api/v1/enhanced-payments/reconcile
```

Request:
```json
{
    "reconcile_date": "2025-06-24"
}
```

Response:
```json
{
    "date": "2025-06-24",
    "stripe": {
        "transaction_count": 150,
        "total_amount": 15000.00,
        "processing_fees": 435.00,
        "shop_revenue": 4500.00,
        "barber_payouts": 10500.00,
        "net_revenue": 4065.00
    },
    "square": {
        "transaction_count": 75,
        "total_amount": 7500.00,
        "processing_fees": 195.00,
        "shop_revenue": 2250.00,
        "barber_payouts": 5250.00,
        "net_revenue": 2055.00
    },
    "combined": {
        "transaction_count": 225,
        "total_amount": 22500.00,
        "processing_fees": 630.00,
        "shop_revenue": 6750.00,
        "barber_payouts": 15750.00,
        "net_revenue": 6120.00
    }
}
```

### Optimize Routing
```http
POST /api/v1/enhanced-payments/optimize
```

Request:
```json
{
    "lookback_days": 30
}
```

## Configuration

### Environment Variables

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_CONNECT_CLIENT_ID=ca_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Square Configuration
SQUARE_APPLICATION_ID=sq0idp-xxx
SQUARE_APPLICATION_SECRET=sq0csp-xxx
SQUARE_ACCESS_TOKEN=EAAAE_xxx
SQUARE_ENVIRONMENT=sandbox  # or production
SQUARE_WEBHOOK_SIGNATURE_KEY=xxx
```

### Performance Thresholds

```python
# In enhanced_payment_split_service.py
self.performance_thresholds = {
    "min_success_rate": 0.95,      # 95% minimum success rate
    "max_processing_time": 5.0,     # 5 seconds max
    "max_failure_count": 3,         # Disable after 3 failures
    "failure_window_hours": 1,      # Reset failures after 1 hour
}
```

## Testing

### Run Tests
```bash
# Run all enhanced payment tests
pytest tests/test_enhanced_payment_split.py -v

# Run specific test
pytest tests/test_enhanced_payment_split.py::test_payment_with_failover -v
```

### Test Payment Routing
```bash
# Test routing decision without processing payment
curl -X POST http://localhost:8000/api/v1/enhanced-payments/test-routing \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "preferred_processor": "auto",
    "processing_mode": "balanced"
  }'
```

## Monitoring

### Key Metrics to Monitor
1. **Success Rates** - Track per processor
2. **Processing Times** - Identify slowdowns
3. **Fee Percentages** - Optimize for cost
4. **Failover Events** - Track reliability
5. **Reconciliation Discrepancies** - Catch issues early

### Alerts to Configure
- Success rate drops below 95%
- Processing time exceeds 5 seconds
- Failover rate exceeds 5%
- Reconciliation discrepancies detected

## Best Practices

### 1. **Always Handle Both Payment Methods**
```python
# Ensure both Stripe and Square payment data are available
payment_data = {
    "payment_method_id": stripe_pm_id,      # For Stripe
    "source_id": square_nonce,              # For Square
    "barber_stripe_account_id": stripe_acc,
    "location_id": square_location
}
```

### 2. **Use Appropriate Processing Modes**
- **Time-sensitive**: Use `FASTEST` mode
- **Large transactions**: Use `CHEAPEST` mode
- **Regular operations**: Use `BALANCED` mode
- **High reliability needed**: Use `FAILOVER` mode

### 3. **Monitor and Optimize**
- Review processor metrics weekly
- Run optimization analysis monthly
- Adjust routing rules based on data

### 4. **Test Failover Regularly**
- Simulate processor failures in staging
- Verify automatic failover works
- Test reconciliation after failovers

## Troubleshooting

### Payment Failures
1. Check processor metrics endpoint
2. Verify processor credentials
3. Check for recent failures in logs
4. Try alternate processor manually

### Reconciliation Issues
1. Run manual reconciliation for date
2. Check for timezone issues
3. Verify all webhooks are configured
4. Compare with processor dashboards

### Performance Issues
1. Check current processor metrics
2. Review processing time trends
3. Consider switching default processor
4. Optimize database queries

## Migration Guide

### From Single Processor to Enhanced Service

1. **Update Payment Processing Code**
```python
# Old
stripe_service.create_payment(...)

# New
enhanced_payment_split_service.process_payment_with_split(...)
```

2. **Run Database Migration**
```bash
alembic upgrade head
```

3. **Configure Both Processors**
- Set up Stripe Connect
- Set up Square OAuth
- Configure webhooks for both

4. **Test in Staging**
- Process test payments
- Verify splits work correctly
- Test failover scenarios

5. **Deploy with Monitoring**
- Enable alerts
- Monitor first 24 hours closely
- Review reconciliation reports
