# POS Security Implementation Guide

This guide documents the comprehensive security features implemented for the POS system.

## Overview

The POS security implementation includes five major components:
1. Rate limiting on PIN login attempts
2. Session timeout management with warnings
3. Audit logging for all POS transactions
4. Secure receipt data handling
5. CSRF protection for POS endpoints

## 1. Rate Limiting on PIN Login

### Implementation Details
- **Max Attempts**: 5 attempts per minute per IP/barber combination
- **Lockout Duration**: 30 minutes after exceeding attempts
- **Rate Limit Window**: 60 seconds sliding window
- **Storage**: Redis-based with in-memory fallback

### API Endpoint Changes
```python
POST /api/v1/barber-pin/authenticate
```

#### Response Headers on Rate Limit
```
HTTP/1.1 429 Too Many Requests
Retry-After: 45
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-06-27T10:30:00Z
```

### Usage Example
```python
# Rate limit is automatically applied to PIN authentication
# No additional configuration needed
```

## 2. Session Timeout Management

### Configuration
- **Warning Time**: 25 minutes (5 minutes before timeout)
- **Session Timeout**: 30 minutes
- **Activity Extension**: Sliding window based on user activity

### New Endpoints

#### Check Session Timeout Status
```python
POST /api/v1/barber-pin/check-timeout
Authorization: Bearer {session_token}

{
  "session_token": "session_token_here"
}
```

Response:
```json
{
  "valid": true,
  "expired": false,
  "warning": true,
  "remaining_minutes": 5,
  "warning_threshold": 25,
  "expires_at": "2025-06-27T10:30:00Z"
}
```

#### Extend Session on Activity
```python
POST /api/v1/barber-pin/extend-activity
Authorization: Bearer {session_token}

{
  "session_token": "session_token_here"
}
```

### Frontend Implementation
```typescript
import { POSSessionManager } from './POSSessionManager';

<POSSessionManager
  sessionToken={sessionToken}
  csrfToken={csrfToken}
  onSessionExpired={() => {
    // Handle logout
    window.location.href = '/login';
  }}
  onSessionWarning={(minutes) => {
    // Show warning to user
    console.log(`Session expiring in ${minutes} minutes`);
  }}
  checkInterval={60} // Check every 60 seconds
/>
```

## 3. Audit Logging

### What's Logged
- All POS transactions (sales, voids, refunds)
- Login attempts (successful and failed)
- Rate limit violations
- Session timeouts
- Receipt generation

### Log Structure
```json
{
  "timestamp": "2025-06-27T10:15:00Z",
  "event_type": "pos_transaction_sale",
  "barber_id": 123,
  "event_data": {
    "transaction_id": "TXN-20250627101500-123",
    "amount": 45.00,
    "item_count": 2
  },
  "client_ip": "192.168.1.100"
}
```

### Retrieving Audit Logs
```python
GET /api/v1/pos/audit-logs?date=2025-06-27&event_type=pos_transaction
Authorization: Bearer {session_token}
```

### Retention Policy
- Logs are retained for 90 days
- Stored in Redis with automatic expiration
- Sensitive data is filtered before logging

## 4. Secure Receipt Data Handling

### Data Sanitization
The following fields are automatically masked in logs:
- Card numbers (show last 4 digits only)
- CVV codes
- Customer email addresses
- Customer phone numbers
- Customer addresses
- Bank account details

### Receipt Generation
```python
POST /api/v1/pos/receipt
Authorization: Bearer {session_token}
X-CSRF-Token: {csrf_token}

{
  "transaction_id": "TXN-20250627101500-123"
}
```

Response includes only non-sensitive data:
```json
{
  "transaction_id": "TXN-20250627101500-123",
  "receipt_number": "RCP-20250627-0001",
  "date": "2025-06-27 10:15:00",
  "barber_name": "John Doe",
  "location_name": "Main Street Barbershop",
  "items": [...],
  "total": 58.05
}
```

## 5. CSRF Protection

### Implementation
- Double-submit cookie pattern
- Token validation for all state-changing operations
- Automatic token generation on login

### Protected Endpoints
- All POST, PUT, DELETE, PATCH requests to:
  - `/api/v1/pos/*`
  - `/api/v1/barber-pin/change`
  - `/api/v1/barber-pin/reset`
  - `/api/v1/payments/*`
  - `/api/v1/barber-payments/*`

### Usage in Frontend
```typescript
// CSRF token is returned during authentication
const loginResponse = await fetch('/api/v1/barber-pin/authenticate', {
  method: 'POST',
  body: JSON.stringify({ barber_id, pin })
});

const { session_token, csrf_token } = await loginResponse.json();

// Include CSRF token in subsequent requests
const transactionResponse = await fetch('/api/v1/pos/transaction', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session_token}`,
    'X-CSRF-Token': csrf_token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(transactionData)
});
```

### Using the CSRF Hook
```typescript
import { useCSRFToken } from './POSSessionManager';

const { secureFetch } = useCSRFToken(csrfToken);

// Automatically includes CSRF token
const response = await secureFetch('/api/v1/pos/transaction', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

## Configuration

### Environment Variables
```env
# Redis Configuration (for rate limiting and sessions)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=your_password_here

# Security Settings
PIN_RATE_LIMIT_WINDOW=60
PIN_RATE_LIMIT_MAX_ATTEMPTS=5
SESSION_TIMEOUT_MINUTES=30
SESSION_WARNING_MINUTES=25
AUDIT_LOG_RETENTION_DAYS=90

# CSRF Settings
CSRF_STRICT_MODE=true  # Set to false for development
```

### Middleware Configuration
In `main.py`:
```python
# CSRF Protection (set strict_mode=True for production)
app.add_middleware(CSRFProtectionMiddleware, strict_mode=False)
```

## Testing

### Test Rate Limiting
```bash
# Attempt multiple logins rapidly
for i in {1..6}; do
  curl -X POST http://localhost:8000/api/v1/barber-pin/authenticate \
    -H "Content-Type: application/json" \
    -d '{"barber_id": 1, "pin": "wrong"}'
  sleep 0.5
done
```

### Test Session Timeout
```bash
# Login and get session token
SESSION_TOKEN=$(curl -X POST http://localhost:8000/api/v1/barber-pin/authenticate \
  -H "Content-Type: application/json" \
  -d '{"barber_id": 1, "pin": "1234"}' | jq -r '.session_token')

# Check timeout status
curl -X POST http://localhost:8000/api/v1/barber-pin/check-timeout \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"session_token\": \"$SESSION_TOKEN\"}"
```

### Test CSRF Protection
```bash
# Attempt request without CSRF token (should fail in strict mode)
curl -X POST http://localhost:8000/api/v1/pos/transaction \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items": [], "total": 10.00}'
```

## Security Best Practices

1. **Always use HTTPS in production** to prevent token interception
2. **Rotate CSRF tokens** periodically for enhanced security
3. **Monitor audit logs** regularly for suspicious activity
4. **Configure Redis** with authentication in production
5. **Set appropriate timeouts** based on your security requirements
6. **Implement IP whitelisting** for additional POS terminal security
7. **Regular security audits** of transaction logs

## Troubleshooting

### Rate Limiting Not Working
- Check Redis connection
- Verify Redis is running: `redis-cli ping`
- Check logs for fallback to in-memory cache

### Session Timeouts Too Aggressive
- Adjust `SESSION_TIMEOUT_MINUTES` environment variable
- Consider implementing activity-based extensions

### CSRF Errors
- Ensure CSRF token is included in headers
- Verify token hasn't expired with session
- Check middleware configuration

### Audit Logs Missing
- Verify Redis connection
- Check retention settings
- Ensure proper permissions for log retrieval

## Migration Guide

For existing implementations:

1. **Update Authentication Response Handling**
   ```javascript
   // Old
   const { session_token } = await loginResponse.json();

   // New
   const { session_token, csrf_token } = await loginResponse.json();
   ```

2. **Add CSRF Token to Requests**
   ```javascript
   headers: {
     'Authorization': `Bearer ${session_token}`,
     'X-CSRF-Token': csrf_token  // Add this line
   }
   ```

3. **Implement Session Manager**
   - Add POSSessionManager component to POS interface
   - Handle timeout warnings appropriately

4. **Update Error Handling**
   - Handle 429 (rate limit) responses
   - Handle 403 (CSRF) responses
   - Implement session expiry redirects
