# Enhanced Webhook Error Handling System

## Overview

The BookedBarber V2 platform now includes a robust webhook error handling system that provides:

- **Idempotency**: Prevents duplicate processing of webhook events
- **Transaction Safety**: Ensures database consistency with proper rollback handling
- **Automatic Retries**: Exponential backoff for retryable errors
- **Dead Letter Queue**: Captures permanently failed webhooks for manual investigation
- **Comprehensive Logging**: Full audit trail of all webhook events

## Components

### 1. Database Models

- **WebhookEvent**: Tracks all incoming webhook events
- **WebhookRetry**: Manages retry scheduling for failed events
- **WebhookDeadLetter**: Stores permanently failed webhooks

### 2. Transaction Manager

The `WebhookTransactionManager` provides a context manager for safe webhook processing:

```python
with webhook_manager.process_webhook(
    event_type="payment.succeeded",
    event_id=event_id,
    source="stripe"
) as ctx:
    if ctx.is_duplicate:
        return ctx.cached_result
    
    # Process webhook
    result = process_payment(...)
    ctx.set_result(result)
```

### 3. Error Handling Decorators

- `@transactional`: Provides automatic retry logic for database operations
- `@db_transaction`: Context manager for safe database transactions

## Usage

### Migrating to Enhanced Webhooks

1. **Run the migration**:
   ```bash
   cd backend-v2
   alembic upgrade head
   ```

2. **Update webhook routes**: Replace the old webhook handlers with the enhanced version:
   ```python
   # In main.py
   from routers import webhooks_enhanced
   app.include_router(webhooks_enhanced.router)
   ```

### Monitoring Webhook Health

The enhanced system includes a health endpoint with statistics:

```bash
curl http://localhost:8000/webhooks/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-19T12:00:00",
  "stats": {
    "total_events": 1000,
    "processed": 950,
    "failed": 40,
    "processing": 10
  }
}
```

## Error Recovery

### Automatic Retries

Failed webhooks are automatically retried with exponential backoff:
- 1st retry: 1 minute
- 2nd retry: 5 minutes
- 3rd retry: 15 minutes
- 4th retry: 1 hour
- 5th retry: 2 hours

### Manual Investigation

Webhooks that fail all retries are moved to the dead letter queue:

```sql
-- View failed webhooks
SELECT * FROM webhook_dead_letters WHERE resolved = false;

-- Mark as resolved after manual processing
UPDATE webhook_dead_letters 
SET resolved = true, 
    resolved_at = NOW(), 
    resolved_by = 'admin@bookedbarber.com',
    notes = 'Manually processed payment'
WHERE id = 123;
```

## Security Features

### Payment Dispute Handling

The system now properly tracks payment disputes:
- Automatic status updates
- Security event logging
- Customer notification

### Transaction Integrity

All webhook processing uses database transactions with:
- Row-level locking to prevent race conditions
- Automatic rollback on errors
- Consistent state management

## Best Practices

1. **Always use idempotency keys** for payment operations
2. **Monitor the dead letter queue** regularly
3. **Set up alerts** for high failure rates
4. **Review security logs** for suspicious patterns
5. **Test webhook endpoints** with replay attacks

## Troubleshooting

### Common Issues

1. **Duplicate webhook processing**
   - Check: `SELECT * FROM webhook_events WHERE event_id = 'evt_xxx';`
   - Solution: System automatically handles duplicates

2. **Failed payment confirmations**
   - Check: Dead letter queue for the event
   - Solution: Manual processing with notes

3. **High retry count**
   - Check: Error messages in webhook_retries table
   - Solution: Fix underlying issue (e.g., database connectivity)

## Testing

### Local Testing with Stripe CLI

```bash
# Forward webhooks to local server
stripe listen --forward-to localhost:8000/webhooks/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger charge.dispute.created
```

### Unit Testing

```python
def test_webhook_idempotency():
    # Send same webhook twice
    response1 = client.post("/webhooks/stripe", data=webhook_data)
    response2 = client.post("/webhooks/stripe", data=webhook_data)
    
    assert response1.status_code == 200
    assert response2.json()["status"] == "already_processed"
```

## Migration from Old System

If migrating from the old webhook system:

1. Keep both endpoints active during transition
2. Monitor both systems for discrepancies
3. Gradually move traffic to enhanced system
4. Decommission old system after verification

## Performance Considerations

- Webhook events table is indexed for fast lookups
- Retry scheduling uses database indexes for efficiency
- Dead letter queue is separate to avoid impacting live processing
- Transaction scope is minimized for better concurrency

## Future Enhancements

- [ ] Webhook replay UI for testing
- [ ] Automated dead letter processing for known issues
- [ ] Webhook analytics dashboard
- [ ] Integration with monitoring systems (Datadog, etc.)