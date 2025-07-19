# Appointment Rate Limiting and CAPTCHA Documentation

## Overview

The BookedBarber platform implements comprehensive rate limiting and CAPTCHA protection for appointment/booking endpoints to prevent abuse, ensure fair access, and protect against automated attacks.

## Rate Limits

### Authenticated Users

| Endpoint | Rate Limit (Production) | Rate Limit (Development) | Description |
|----------|------------------------|--------------------------|-------------|
| Create Booking | 30/hour | 50/hour | Creating new appointments |
| Quick Booking | 30/hour | 50/hour | Next available slot booking |
| Check Slots | 60/minute | 100/minute | Checking availability |
| Reschedule | 20/hour | 30/hour | Rescheduling appointments |
| Cancel | 20/hour | 30/hour | Cancelling appointments |

### Guest Users

| Endpoint | Rate Limit (Production) | Rate Limit (Development) | Description |
|----------|------------------------|--------------------------|-------------|
| Guest Booking | 3/hour | 10/hour | Creating guest appointments |
| Guest Quick | 3/hour | 10/hour | Guest quick booking |
| Check Slots | 60/minute | 100/minute | Checking availability |
| CAPTCHA Status | No limit | No limit | Checking CAPTCHA requirement |

## CAPTCHA Protection

### Triggering Conditions
- CAPTCHA is required after **2 failed booking attempts** within a 1-hour window
- Failed attempts are tracked by a combination of IP address and email
- CAPTCHA requirement persists for 24 hours after triggering

### CAPTCHA Flow
1. Guest makes booking attempt
2. If booking fails (validation error, conflict, etc.), failure is tracked
3. After 2 failures, subsequent attempts require CAPTCHA verification
4. Guest must provide a valid reCAPTCHA token with their booking request
5. Upon successful CAPTCHA verification and booking, the requirement is cleared

### Implementation Details

#### Backend Components

1. **Rate Limiter** (`/utils/rate_limit.py`)
   - Uses SlowAPI with Redis backend
   - Falls back to in-memory storage in test environments
   - Custom error handler returns proper 429 responses

2. **CAPTCHA Service** (`/services/captcha_service.py`)
   - Tracks failed attempts using Redis
   - Verifies reCAPTCHA tokens with Google's API
   - Provides graceful fallback for development environments

3. **Appointment Router** (`/routers/appointments.py`)
   - Applies rate limiting decorators to all endpoints
   - Handles CAPTCHA verification for guest bookings
   - Tracks failures and enforces CAPTCHA requirements

#### API Changes

##### Guest Booking Request
```json
{
  "date": "2025-01-03",
  "time": "10:00",
  "service": "Haircut",
  "guest_info": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "captcha_token": "reCAPTCHA_token_here"  // Optional, required after failures
}
```

##### Error Response with CAPTCHA Requirement
```json
{
  "detail": "Invalid booking time. CAPTCHA verification will be required for your next attempt."
}
```

##### CAPTCHA Status Check
```http
POST /api/v2/appointments/guest/captcha-status
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890"
}
```

Response:
```json
{
  "captcha_required": true,
  "message": "CAPTCHA verification required"
}
```

## Frontend Integration

### reCAPTCHA Setup
1. Add reCAPTCHA v2 to your frontend
2. Include the site key in your environment variables
3. Show CAPTCHA widget when `captcha_required` is true
4. Include the token in booking requests

### Example Frontend Code
```typescript
// Check if CAPTCHA is required
const checkCaptchaStatus = async (guestInfo: GuestInfo) => {
  const response = await fetch('/api/v2/appointments/guest/captcha-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(guestInfo)
  });
  const data = await response.json();
  return data.captcha_required;
};

// Make booking with CAPTCHA if required
const createGuestBooking = async (bookingData: GuestBooking) => {
  const captchaRequired = await checkCaptchaStatus(bookingData.guest_info);
  
  if (captchaRequired) {
    // Show reCAPTCHA widget and get token
    const captchaToken = await showRecaptchaAndGetToken();
    bookingData.captcha_token = captchaToken;
  }
  
  const response = await fetch('/api/v2/appointments/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }
  
  return response.json();
};
```

## Configuration

### Environment Variables
```bash
# Redis configuration (optional, falls back to in-memory)
REDIS_URL=redis://localhost:6379

# reCAPTCHA configuration
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key_here

# Environment setting (affects rate limits)
ENVIRONMENT=development  # or 'production'
```

### Rate Limit Customization
Rate limits can be adjusted in `/utils/rate_limit.py`:
```python
RATE_LIMITS = {
    "booking_create": "50/hour" if is_development else "30/hour",
    "guest_booking": "10/hour" if is_development else "3/hour",
    # ... other limits
}
```

## Monitoring and Debugging

### Rate Limit Headers
Responses include rate limit information:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets
- `Retry-After`: Seconds to wait (on 429 responses)

### Logging
The system logs:
- Rate limit violations
- CAPTCHA verification attempts
- Failed booking attempts that trigger CAPTCHA

### Testing
Use the provided test script:
```bash
python test_appointment_rate_limiting.py
```

## Best Practices

1. **Frontend Caching**: Cache availability checks to reduce API calls
2. **User Feedback**: Clearly communicate rate limits and CAPTCHA requirements
3. **Progressive Enhancement**: Show CAPTCHA only when required
4. **Error Handling**: Handle 429 responses gracefully with retry logic
5. **Monitoring**: Track rate limit metrics to adjust limits as needed

## Security Considerations

1. **IP Spoofing**: The system uses IP + email combination for tracking
2. **Distributed Attacks**: Redis-based tracking works across multiple servers
3. **Graceful Degradation**: System continues working if Redis is unavailable
4. **CAPTCHA Bypass**: Failed CAPTCHA attempts are also tracked

## Troubleshooting

### Common Issues

1. **"CAPTCHA verification required" on first attempt**
   - Check if the IP/email has previous failed attempts
   - Verify Redis connection is working

2. **Rate limits not working in tests**
   - Ensure `TESTING` environment variable is not set
   - Check Redis connection

3. **CAPTCHA always passes**
   - Verify `RECAPTCHA_SECRET_KEY` is configured
   - Check network connectivity to Google's servers

4. **Different behavior in dev/prod**
   - Rate limits are intentionally higher in development
   - Check `ENVIRONMENT` variable setting