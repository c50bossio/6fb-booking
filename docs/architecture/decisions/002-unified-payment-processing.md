# 002. Unified Payment Processing

Date: 2025-06-28

## Status

Accepted

## Context

The application handles various payment scenarios:
- Client bookings with upfront payment
- Barber payouts via Stripe Connect
- Refunds and cancellations
- Payment method management

Multiple payment implementations were emerging:
- Direct Stripe API calls scattered in endpoints
- Different error handling approaches
- Inconsistent webhook processing
- Duplicate payment logic

## Decision

We will implement a single, unified payment service using the adapter pattern:

1. **Single Payment Service**: `backend-v2/services/payment_service.py` handles all payment operations
2. **Adapter Pattern**: Stripe-specific logic isolated in `backend-v2/services/payment_adapters/stripe_adapter.py`
3. **Consistent Models**: Unified payment models in `backend-v2/models/payment.py`
4. **Centralized Webhook Handling**: Single webhook processor with event routing

Architecture:
```
PaymentService (interface)
    └── StripeAdapter (implementation)
        ├── process_payment()
        ├── create_payout()
        ├── handle_refund()
        └── sync_webhook()
```

## Consequences

### Positive
- Easy to switch or add payment providers
- Consistent error handling
- Testable with mock adapters
- Single source of truth for payment logic
- PCI compliance easier to maintain

### Negative
- Initial abstraction overhead
- More complex than direct API calls
- Requires careful interface design

### Neutral
- All payment flows go through the service
- Webhook events are centrally processed

## References

- Stripe Best Practices: https://stripe.com/docs/payments/payment-intents/migration
- PCI Compliance: https://www.pcisecuritystandards.org/
- Adapter Pattern: https://refactoring.guru/design-patterns/adapter
