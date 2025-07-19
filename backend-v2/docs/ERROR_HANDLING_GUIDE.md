# Error Handling Implementation Guide

## Overview

This document describes the secure error handling system implemented in BookedBarber V2 to prevent internal detail exposure in production.

## Key Components

### 1. Centralized Error Handling Module
- **Location**: `/utils/error_handling.py`
- **Purpose**: Provide consistent, secure error responses across all endpoints

### 2. Custom Error Classes
- `AppError`: Base class for all application errors
- `ValidationError`: For request validation failures
- `AuthenticationError`: For auth failures
- `AuthorizationError`: For permission issues
- `NotFoundError`: For missing resources
- `ConflictError`: For resource conflicts
- `PaymentError`: For payment processing issues
- `IntegrationError`: For external service failures

### 3. Safe Error Response Function
- `safe_error_response()`: Converts any exception to a safe JSON response
- In production: Hides internal details
- In development: Includes debug information

### 4. Global Error Handler
- Integrated into `main.py` via `create_error_handler()`
- Catches all unhandled exceptions
- Returns consistent error format

## Error Response Format

### Production Response
```json
{
  "error": {
    "type": "validation",
    "message": "Invalid input provided. Please check your request."
  }
}
```

### Development Response
```json
{
  "error": {
    "type": "validation",
    "message": "Invalid input provided. Please check your request.",
    "debug": {
      "exception": "ValueError",
      "message": "Invalid email format",
      "traceback": "..."
    }
  }
}
```

## Usage Guidelines

### 1. Replace Direct HTTPException
```python
# ❌ BAD: Exposes internal error
raise HTTPException(
    status_code=500,
    detail=f"Database error: {str(e)}"
)

# ✅ GOOD: Safe error message
raise AppError("An error occurred")
```

### 2. Use Specific Error Types
```python
# Validation errors
if not email:
    raise ValidationError("Email is required", field="email")

# Not found errors
user = db.query(User).filter_by(id=user_id).first()
if not user:
    raise NotFoundError("User")

# Authorization errors
if not has_permission:
    raise AuthorizationError()
```

### 3. Log Before Raising
```python
try:
    # Some operation
    result = perform_operation()
except Exception as e:
    logger.error(f"Operation failed: {e}", exc_info=True)
    raise AppError("Operation failed")
```

### 4. Use SafeServiceOperation Context Manager
```python
with SafeServiceOperation("create_booking", "BookingService"):
    # Service operations
    booking = create_booking_in_db()
    return booking
```

## Security Benefits

1. **No Stack Traces in Production**: Prevents attackers from learning about system internals
2. **No Database Details**: SQL errors are converted to generic messages
3. **No File Paths**: System paths are sanitized from error messages
4. **No Sensitive Data**: Passwords, keys, and tokens are redacted
5. **Consistent Format**: All errors follow the same structure

## Environment-Based Behavior

### Production/Staging
- Generic error messages only
- Full details logged internally
- No debug information exposed

### Development
- Detailed error messages
- Stack traces included
- Debug information available

## Affected Endpoints

The following high-risk endpoints have been updated:
- `/api/v2/privacy/*` - GDPR endpoints
- `/api/v2/billing/*` - Subscription management
- `/api/v2/commissions/*` - Financial calculations
- `/api/v2/payments/*` - Payment processing
- `/api/v2/analytics/*` - Business analytics
- `/api/v2/integrations/*` - Third-party integrations
- `/api/v2/agents/*` - AI agent management
- `/api/v2/organizations/*` - Multi-tenant operations
- `/api/v2/webhooks/*` - External callbacks

## Testing Error Handling

### Unit Tests
```python
def test_error_handling():
    # Test that internal errors are not exposed
    with pytest.raises(AppError) as exc_info:
        raise_database_error()
    
    assert "Database error" not in str(exc_info.value)
    assert "An error occurred" in str(exc_info.value)
```

### Integration Tests
```python
def test_endpoint_error_handling(client):
    # Test that endpoints return safe errors
    response = client.post("/api/v2/bookings", json={"invalid": "data"})
    assert response.status_code == 400
    assert "error" in response.json()
    assert "traceback" not in response.json()["error"]
```

## Monitoring and Logging

### Error Tracking
- All errors are logged with full details internally
- Sentry integration captures exceptions in production
- Error rates are monitored via metrics

### Log Format
```
ERROR:routers.billing:Failed to create subscription: stripe.error.CardError: Your card was declined
Traceback (most recent call last):
  File "/app/routers/billing.py", line 567, in create_subscription
    subscription = stripe_service.create_subscription(...)
```

## Migration Checklist

When updating a router to use secure error handling:

1. [ ] Add error handling import
2. [ ] Replace HTTPException with specific error types
3. [ ] Add logging before raising errors
4. [ ] Remove str(e) from error messages
5. [ ] Test error responses in both dev and prod modes
6. [ ] Verify no internal details are exposed
7. [ ] Update integration tests

## Future Improvements

1. **Rate Limiting on Errors**: Prevent error-based enumeration attacks
2. **Error Aggregation**: Group similar errors for better monitoring
3. **Custom Error Pages**: User-friendly error pages for web endpoints
4. **Localization**: Translate error messages based on user locale
5. **Error Recovery**: Suggest actions users can take to resolve errors