# Idempotency System Guide

## Overview

The idempotency system prevents duplicate operations in critical financial endpoints by tracking and caching operation results. When a duplicate request is detected, the system returns the original response instead of processing the operation again.

## Key Features

- **Unique Key Generation**: Cryptographically secure idempotency keys
- **Request Validation**: Hash-based duplicate detection with tamper protection
- **Database Storage**: Persistent tracking of operations across restarts
- **Automatic Cleanup**: TTL-based expiration of old keys
- **Comprehensive Coverage**: Protection for payments, payouts, commissions, and webhooks
- **Monitoring**: Statistics and health checks for system visibility

## Architecture

### Components

1. **IdempotencyKeyGenerator**: Creates and validates unique keys
2. **IdempotencyManager**: Handles database operations and caching
3. **Decorators**: Easy-to-use decorators for endpoint protection
4. **Database Model**: Persistent storage with indexes for performance

### Database Schema

```sql
CREATE TABLE idempotency_keys (
    id INTEGER PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    operation_type VARCHAR(100) NOT NULL,
    user_id INTEGER,
    request_hash VARCHAR(64) NOT NULL,
    response_data JSON NOT NULL,
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    metadata JSON
);
```

## Usage

### 1. Client-Side Implementation

Include an `Idempotency-Key` header in requests to protected endpoints:

```bash
curl -X POST /api/v2/payments/create-intent \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: payment_a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "booking_id": 123,
    "gift_certificate_code": null
  }'
```

### 2. Server-Side Protection

Endpoints are automatically protected using decorators:

```python
@router.post("/payments/create-intent")
@idempotent_operation(
    operation_type="payment_intent",
    ttl_hours=24,
    extract_user_id=get_current_user_id
)
def create_payment_intent(
    request: Request,
    payment_data: PaymentIntentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Endpoint implementation
    pass
```

### 3. Webhook Protection

Webhooks use event IDs for idempotency:

```python
@router.post("/webhooks/stripe")
@webhook_idempotent(
    operation_type="stripe",
    ttl_hours=48,
    event_id_header="stripe-request-id"
)
async def handle_stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    # Webhook handler implementation
    pass
```

## Protected Endpoints

### Payment Operations
- `POST /api/v2/payments/create-intent` - Payment intent creation
- `POST /api/v2/payments/confirm` - Payment confirmation
- `POST /api/v2/payments/refund` - Refund processing
- `POST /api/v2/payments/gift-certificates` - Gift certificate creation

### Payout Operations  
- `POST /api/v2/payments/payouts` - Barber payouts
- `POST /api/v2/payments/payouts/enhanced` - Enhanced payouts with retail

### Order Management
- `POST /api/v2/products/orders` - Order creation
- `POST /api/v2/products/pos/transactions` - POS transactions

### Webhook Handlers
- `POST /api/v2/webhooks/stripe` - Stripe webhooks
- `POST /api/v2/webhooks/sms` - SMS webhooks  
- `POST /api/v2/webhooks/shopify/products/create` - Shopify webhooks

## Key Generation

### Manual Generation

```python
from utils.idempotency import IdempotencyKeyGenerator

# Generate with prefix
key = IdempotencyKeyGenerator.generate_key("payment")
# Result: "payment_a1b2c3d4-e5f6-7890-abcd-ef1234567890"

# Validate key format
is_valid = IdempotencyKeyGenerator.validate_key(key)
```

### Client Libraries

#### JavaScript/TypeScript
```javascript
import { v4 as uuidv4 } from 'uuid';

function generateIdempotencyKey(prefix = 'client') {
  return `${prefix}_${uuidv4()}`;
}

const key = generateIdempotencyKey('payment');
```

#### Python
```python
import uuid

def generate_idempotency_key(prefix='client'):
    return f"{prefix}_{uuid.uuid4()}"

key = generate_idempotency_key('payment')
```

## Error Handling

### Invalid Key Format
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "detail": "Invalid idempotency key format"
}
```

### Key Reuse with Different Data
```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "detail": "Idempotency key reused with different request data"
}
```

### Duplicate Request (Success)
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "payment_intent_id": "pi_1234567890",
  "amount": 10000,
  "currency": "USD",
  "status": "requires_payment_method"
}
```

## Configuration

### TTL Settings

Different operation types have different TTL values:

- **Payments**: 24 hours
- **Refunds**: 48 hours  
- **Payouts**: 72 hours
- **Webhooks**: 24-48 hours

### Environment Variables

```bash
# Optional: Custom cleanup interval (default: daily)
IDEMPOTENCY_CLEANUP_INTERVAL_HOURS=24

# Optional: Default TTL (default: 24 hours)
IDEMPOTENCY_DEFAULT_TTL_HOURS=24
```

## Monitoring and Maintenance

### Statistics

```python
from utils.idempotency import get_idempotency_stats
from database import get_db

db = get_db()
stats = get_idempotency_stats(db)

print(f"Total keys: {stats['total_keys']}")
print(f"Active keys: {stats['active_keys']}")
print(f"Expired keys: {stats['expired_keys']}")
print(f"Operation breakdown: {stats['operation_types']}")
```

### Cleanup

```python
from utils.idempotency import cleanup_expired_idempotency_keys
from database import get_db

db = get_db()
deleted_count = cleanup_expired_idempotency_keys(db)
print(f"Cleaned up {deleted_count} expired keys")
```

### Health Check

```bash
curl /api/v2/webhooks/health
```

## Best Practices

### Client Implementation

1. **Always Generate Unique Keys**: Never reuse idempotency keys
2. **Use Meaningful Prefixes**: Help identify operation types in logs
3. **Store Keys Locally**: For retry scenarios and debugging
4. **Handle All HTTP Status Codes**: Including 422 for key reuse

### Server Implementation

1. **Choose Appropriate TTL**: Balance storage vs. protection needs
2. **Monitor Key Usage**: Track statistics and cleanup effectiveness
3. **Handle Edge Cases**: Network failures, timeouts, etc.
4. **Log Operations**: Include idempotency keys in audit logs

### Security Considerations

1. **Keys Are Not Secrets**: Don't include sensitive data in keys
2. **Request Validation**: Hash comparison prevents tampering
3. **Rate Limiting**: Combine with existing rate limiting
4. **Access Control**: Idempotency respects existing auth

## Testing

### Unit Tests

```bash
cd backend-v2
python test_idempotency_system.py
```

### Integration Tests

```bash
# Start the application
uvicorn main:app --reload

# Test duplicate requests
curl -X POST /api/v2/payments/create-intent \
  -H "Idempotency-Key: test_payment_123" \
  -H "Authorization: Bearer <token>" \
  -d '{"booking_id": 123}'

# Send same request again (should return cached result)
curl -X POST /api/v2/payments/create-intent \
  -H "Idempotency-Key: test_payment_123" \
  -H "Authorization: Bearer <token>" \
  -d '{"booking_id": 123}'
```

## Troubleshooting

### Common Issues

1. **Keys Not Working**: Check header name and format
2. **422 Errors**: Verify request data matches original
3. **Performance Issues**: Monitor index usage and cleanup
4. **Storage Growth**: Adjust TTL and cleanup frequency

### Debug Information

```python
from models.idempotency import IdempotencyKey
from database import get_db

db = get_db()

# Find keys by operation type
payment_keys = db.query(IdempotencyKey).filter(
    IdempotencyKey.operation_type == "payment_intent"
).all()

# Find keys by user
user_keys = db.query(IdempotencyKey).filter(
    IdempotencyKey.user_id == 123
).all()

# Find expired keys
from datetime import datetime
expired_keys = db.query(IdempotencyKey).filter(
    IdempotencyKey.expires_at < datetime.utcnow()
).all()
```

## Migration

### Database Migration

```bash
# Apply the idempotency table migration
alembic upgrade head
```

### Existing Endpoints

Existing endpoints are backwards compatible. Requests without idempotency keys work normally.

## Performance Considerations

### Database Indexes

The system creates optimized indexes for:
- Key lookups (unique constraint)
- Operation type queries
- User-specific queries  
- Expiration cleanup
- Combined queries

### Memory Usage

- Keys are stored in database, not memory
- Minimal application memory footprint
- Automatic cleanup prevents unbounded growth

### Query Optimization

- Single query for duplicate detection
- Batch cleanup operations
- Index-optimized expiration queries

## Future Enhancements

### Planned Features

1. **Redis Support**: Optional in-memory caching layer
2. **Metrics Integration**: Prometheus/Grafana dashboards
3. **Admin Dashboard**: Web UI for key management
4. **Bulk Operations**: Batch key operations
5. **Custom Extractors**: More flexible user ID extraction

### Configuration Options

1. **Storage Backend**: Database vs. Redis vs. Hybrid
2. **Compression**: JSON response compression
3. **Partitioning**: Time-based key partitioning
4. **Encryption**: Optional response data encryption

## Support

For questions or issues with the idempotency system:

1. Check this documentation
2. Review test files for examples
3. Check application logs for errors
4. Monitor database performance
5. Contact the development team

## Version History

- **v1.0.0**: Initial implementation with database storage
- **v1.1.0**: Added webhook protection and monitoring
- **v1.2.0**: Enhanced error handling and documentation