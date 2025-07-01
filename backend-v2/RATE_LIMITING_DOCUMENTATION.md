# Rate Limiting Implementation Documentation

## Overview

This document describes the rate limiting implementation for the 6FB Booking Platform API endpoints, including configuration, testing strategies, and security considerations.

## Rate Limiting Configuration

### Current Rate Limits

| Endpoint Type | Rate Limit | Scope |
|---------------|------------|-------|
| Login | 5/minute | Authentication |
| Registration | 3/hour | Authentication |
| Password Reset | 3/hour | Authentication |
| Token Refresh | 10/minute | Authentication |
| Payment Intent | 10/minute | Payment Security |
| Payment Confirm | 15/minute | Payment Security |
| Refund Requests | 5/hour | Payment Security |
| Default Endpoints | 60/minute | General API |

### Implementation Details

Rate limiting is implemented using `slowapi` (FastAPI port of Flask-Limiter) with the following key components:

1. **Rate Limiter Configuration** (`utils/rate_limit.py`)
   - Uses client IP address as the rate limiting key
   - Configurable rate limits per endpoint type
   - Custom error handling for rate limit exceeded responses

2. **Decorator-Based Application**
   - Rate limiting decorators applied to specific endpoints
   - Consistent approach across all protected endpoints
   - Easy to add/modify rate limits

## Test Environment Handling

### Automatic Bypass in Tests

Rate limiting is automatically disabled in test environments through multiple mechanisms:

1. **Environment Detection**
   ```python
   def get_rate_limit_key(request: Request) -> str:
       if settings.environment == "test" or os.environ.get("TESTING", "").lower() == "true":
           return None  # Disable rate limiting
       return get_remote_address(request)
   ```

2. **Test Configuration**
   - `conftest.py` sets `TESTING=true` environment variable
   - All tests run without rate limiting interference
   - Production behavior tested through dedicated rate limiting tests

### Testing Rate Limiting Functionality

Despite disabling rate limiting in tests, we verify the implementation through:

1. **Decorator Verification Tests**
   - Confirm rate limiting decorators are applied to endpoints
   - Verify configuration values are correct
   - Test decorator imports and functionality

2. **Configuration Tests**
   - Validate rate limit configurations exist
   - Ensure proper rate limit values
   - Test decorator availability

## Applied Endpoints

### Authentication Endpoints (`routers/auth.py`)
- `POST /auth/login` - 5 attempts/minute
- `POST /auth/register` - 3 registrations/hour
- `POST /auth/password-reset` - 3 requests/hour
- `POST /auth/refresh` - 10 requests/minute

### Payment Endpoints (`routers/payments.py`)
- `POST /payments/create-intent` - 10 requests/minute
- `POST /payments/confirm` - 15 requests/minute
- `POST /payments/refund` - 5 requests/hour

## Security Considerations

### Rate Limiting Strategy

1. **IP-Based Limiting**
   - Prevents abuse from single IP addresses
   - Effective against basic automated attacks
   - May need user-based limiting for authenticated endpoints

2. **Graduated Limits**
   - More restrictive limits on sensitive operations (refunds)
   - Higher limits for frequently used operations (payment confirmations)
   - Balanced to prevent abuse while allowing legitimate usage

3. **Error Responses**
   - Returns HTTP 429 (Too Many Requests)
   - Includes Retry-After header
   - Provides clear error messages

### Potential Enhancements

1. **User-Based Rate Limiting**
   - Apply limits per authenticated user
   - More granular control for different user types
   - Prevents abuse through IP rotation

2. **Dynamic Rate Limiting**
   - Adjust limits based on system load
   - Temporary restrictions during high traffic
   - User behavior-based adjustments

3. **Monitoring and Alerting**
   - Track rate limiting events
   - Alert on excessive rate limiting triggers
   - Analytics on rate limiting effectiveness

## Production Deployment

### Environment Variables

Required environment variables for production:
- `ENVIRONMENT=production` (or not "test")
- Remove or set `TESTING=false`

### Monitoring

Monitor these metrics in production:
- Rate limiting events (429 responses)
- Distribution of requests across rate limits
- Impact on legitimate user traffic

### Tuning

Rate limits may need adjustment based on:
- User behavior patterns
- Peak traffic times
- Business requirements
- Performance characteristics

## Troubleshooting

### Common Issues

1. **Rate Limiting in Tests**
   - Ensure `TESTING=true` environment variable is set
   - Check test configuration in `conftest.py`
   - Verify rate limiting bypass logic

2. **Unexpected Rate Limiting in Production**
   - Check rate limit configurations
   - Monitor IP address distribution
   - Consider user-based limiting for authenticated endpoints

3. **Rate Limiting Not Working**
   - Verify decorators are applied to endpoints
   - Check environment configuration
   - Ensure slowapi is properly configured

### Debug Commands

```bash
# Check rate limiting configuration
python -c "from utils.rate_limit import RATE_LIMITS; print(RATE_LIMITS)"

# Verify decorators are applied
python -c "from routers.payments import create_payment_intent; print(hasattr(create_payment_intent, '__wrapped__'))"

# Test environment detection
python -c "from utils.rate_limit import get_rate_limit_key; from fastapi import Request; print(get_rate_limit_key(Request()))"
```

## Code Examples

### Adding Rate Limiting to New Endpoint

1. **Define Rate Limit in Configuration**
   ```python
   # utils/rate_limit.py
   RATE_LIMITS = {
       # ... existing limits ...
       "new_endpoint": "5/minute",
   }
   ```

2. **Create Decorator**
   ```python
   # utils/rate_limit.py
   new_endpoint_rate_limit = limiter.limit(RATE_LIMITS["new_endpoint"])
   ```

3. **Apply to Endpoint**
   ```python
   # routers/your_router.py
   from utils.rate_limit import new_endpoint_rate_limit
   
   @router.post("/new-endpoint")
   @new_endpoint_rate_limit
   def new_endpoint(request: Request, ...):
       # endpoint implementation
   ```

4. **Add Tests**
   ```python
   # tests/test_rate_limiting.py
   def test_new_endpoint_has_rate_limiting():
       from routers.your_router import new_endpoint
       assert hasattr(new_endpoint, '__wrapped__')
   ```

## Maintenance

### Regular Reviews

- Review rate limiting effectiveness quarterly
- Adjust limits based on usage patterns
- Monitor for new abuse patterns
- Update documentation with changes

### Performance Impact

- Rate limiting adds minimal overhead
- In-memory tracking scales with concurrent users
- Consider Redis backend for distributed deployments

---

*Last Updated: 2025-06-30*
*Version: 1.0*