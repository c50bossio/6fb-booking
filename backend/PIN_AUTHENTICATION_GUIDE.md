# PIN Authentication System for POS Access

## Overview

This document describes the complete PIN authentication system implemented for barber POS access in the 6FB Booking platform. The system provides secure, session-based authentication using 4-6 digit PINs with comprehensive security features.

## System Architecture

### Core Components

1. **Database Models**
   - `Barber` model (enhanced with PIN fields)
   - `POSSession` model (session tracking)

2. **Service Layer**
   - `BarberPINService` - Core business logic

3. **API Layer**
   - `barber_pin_auth.py` - RESTful endpoints

4. **Database Migration**
   - `add_pin_authentication_system.py` - Schema updates

## Security Features

### PIN Security
- **Secure Hashing**: PINs are hashed using bcrypt
- **Format Validation**: 4-6 digits only
- **Sequential Prevention**: Prevents 1234, 6543, etc.
- **Repeated Digit Prevention**: Prevents 1111, 2222, etc.
- **Attempt Limiting**: Max 5 attempts before lockout
- **Time-based Lockout**: 30-minute lockout after max attempts

### Session Security
- **Secure Tokens**: 32-byte URL-safe tokens
- **Session Expiration**: 8-hour default duration
- **Activity Tracking**: Last activity timestamp
- **Device Tracking**: Browser/device information
- **IP Tracking**: Client IP address logging
- **Graceful Logout**: Manual and automatic logout

## Database Schema

### Enhanced Barber Table
```sql
ALTER TABLE barbers ADD COLUMN pin_hash VARCHAR(255);
ALTER TABLE barbers ADD COLUMN pin_attempts INTEGER DEFAULT 0;
ALTER TABLE barbers ADD COLUMN pin_locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE barbers ADD COLUMN pin_last_used TIMESTAMP WITH TIME ZONE;
```

### New POS Sessions Table
```sql
CREATE TABLE pos_sessions (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    barber_id INTEGER NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    device_info VARCHAR(500),
    ip_address VARCHAR(45),
    location_info VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    login_method VARCHAR(50) DEFAULT 'pin',
    logout_reason VARCHAR(100)
);
```

## API Endpoints

### Authentication Endpoints

#### 1. Setup PIN
```http
POST /api/v1/barber-pin/setup
Content-Type: application/json

{
    "barber_id": 1,
    "pin": "1234"
}
```

#### 2. Authenticate with PIN
```http
POST /api/v1/barber-pin/authenticate
Content-Type: application/json

{
    "barber_id": 1,
    "pin": "1234",
    "device_info": "Chrome 96.0.4664.110 on Windows 10"
}
```

#### 3. Validate Session
```http
POST /api/v1/barber-pin/validate-session
Content-Type: application/json

{
    "session_token": "abc123def456..."
}
```

#### 4. Change PIN
```http
POST /api/v1/barber-pin/change
Content-Type: application/json

{
    "barber_id": 1,
    "current_pin": "1234",
    "new_pin": "5678"
}
```

### Session Management Endpoints

#### 5. Extend Session
```http
POST /api/v1/barber-pin/extend-session
Content-Type: application/json

{
    "session_token": "abc123def456...",
    "hours": 4
}
```

#### 6. Logout Session
```http
POST /api/v1/barber-pin/logout
Content-Type: application/json

{
    "session_token": "abc123def456..."
}
```

#### 7. Logout All Sessions
```http
POST /api/v1/barber-pin/logout-all/{barber_id}
```

### Information Endpoints

#### 8. Get PIN Status
```http
GET /api/v1/barber-pin/status/{barber_id}
```

#### 9. Get Active Sessions
```http
GET /api/v1/barber-pin/sessions/{barber_id}
```

#### 10. Verify POS Access (Middleware)
```http
GET /api/v1/barber-pin/verify-access
Authorization: Bearer {session_token}
```

## Usage Examples

### JavaScript Frontend Integration

```javascript
class BarberPINAuth {
    constructor(apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
        this.sessionToken = localStorage.getItem('pos_session_token');
    }

    async authenticateWithPIN(barberId, pin) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/barber-pin/authenticate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    barber_id: barberId,
                    pin: pin,
                    device_info: navigator.userAgent
                })
            });

            const data = await response.json();

            if (data.success) {
                this.sessionToken = data.session_token;
                localStorage.setItem('pos_session_token', this.sessionToken);
                return { success: true, expiresAt: data.expires_at };
            } else {
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }

    async validateSession() {
        if (!this.sessionToken) return false;

        try {
            const response = await fetch(`${this.apiBaseUrl}/barber-pin/validate-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_token: this.sessionToken
                })
            });

            const data = await response.json();
            return data.valid;
        } catch (error) {
            return false;
        }
    }

    async logout() {
        if (!this.sessionToken) return;

        try {
            await fetch(`${this.apiBaseUrl}/barber-pin/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_token: this.sessionToken
                })
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.sessionToken = null;
            localStorage.removeItem('pos_session_token');
        }
    }

    getAuthHeader() {
        return this.sessionToken ? `Bearer ${this.sessionToken}` : null;
    }
}

// Usage
const auth = new BarberPINAuth('https://api.yourapp.com/api/v1');

// Authenticate
const result = await auth.authenticateWithPIN(1, '1234');
if (result.success) {
    console.log('Authenticated successfully');
} else {
    console.error('Authentication failed:', result.error);
}

// Validate session before POS operations
const isValid = await auth.validateSession();
if (!isValid) {
    // Redirect to PIN entry
    window.location.href = '/pin-login';
}
```

### Python Backend Integration

```python
from services.barber_pin_service import BarberPINService
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def require_pos_access(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    pin_service: BarberPINService = Depends(get_pin_service)
):
    """Dependency to require valid POS session"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="POS session required"
        )

    session_token = credentials.credentials
    is_valid, session_info = pin_service.validate_session(session_token)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired POS session"
        )

    return session_info

# Use in POS endpoints
@router.post("/pos/process-payment")
async def process_payment(
    payment_data: PaymentRequest,
    session_info: dict = Depends(require_pos_access)
):
    barber_id = session_info["barber_id"]
    # Process payment for authenticated barber
    ...
```

## Installation and Setup

### 1. Run the Setup Script
```bash
cd /Users/bossio/6fb-booking/backend
python scripts/setup_pin_authentication.py
```

### 2. Update Main Application
Add the PIN authentication router to your main FastAPI app:

```python
# In main.py or your router configuration
from api.v1.endpoints.barber_pin_auth import router as pin_auth_router

app.include_router(pin_auth_router, prefix="/api/v1")
```

### 3. Update Models Import
Ensure your models are properly imported:

```python
# In models/__init__.py
from .pos_session import POSSession
```

## Security Considerations

### Production Deployment
1. **HTTPS Only**: Always use HTTPS in production
2. **Rate Limiting**: Implement rate limiting on PIN endpoints
3. **Monitoring**: Log all PIN authentication attempts
4. **Admin Functions**: Secure admin endpoints with proper authentication
5. **Session Cleanup**: Run periodic cleanup of expired sessions

### Security Monitoring
The system logs:
- PIN authentication attempts
- Session creation and termination
- Failed login attempts
- Lockout events
- Device and IP information

### Compliance
- PINs are never stored in plain text
- Session tokens are cryptographically secure
- Automatic session expiration prevents unauthorized access
- Comprehensive audit trail for security reviews

## Maintenance

### Periodic Tasks
1. **Session Cleanup**: Call `/cleanup-sessions` endpoint periodically
2. **Monitor Failed Attempts**: Watch for brute force attempts
3. **Review Active Sessions**: Check for suspicious activity

### Database Maintenance
```sql
-- Clean up old expired sessions (older than 7 days)
DELETE FROM pos_sessions
WHERE expires_at < NOW() - INTERVAL '7 days'
AND is_active = false;

-- Reset PIN attempts for all barbers (emergency use only)
UPDATE barbers SET pin_attempts = 0, pin_locked_until = NULL;
```

## Troubleshooting

### Common Issues

1. **Migration Fails**
   - Check database connection
   - Ensure previous migrations are up to date
   - Verify table permissions

2. **PIN Validation Fails**
   - Check PIN format (4-6 digits only)
   - Verify barber exists in database
   - Check if PIN is locked

3. **Session Issues**
   - Verify session token format
   - Check session expiration
   - Ensure database connectivity

### Debug Mode
Enable debug logging to troubleshoot issues:

```python
import logging
logging.getLogger('services.barber_pin_service').setLevel(logging.DEBUG)
```

## Files Created

The PIN authentication system consists of the following key files:

1. **`/models/barber.py`** (modified) - Enhanced with PIN fields
2. **`/models/pos_session.py`** (new) - POS session tracking model
3. **`/services/barber_pin_service.py`** (new) - Core business logic
4. **`/api/v1/endpoints/barber_pin_auth.py`** (new) - API endpoints
5. **`/alembic/versions/add_pin_authentication_system.py`** (new) - Database migration
6. **`/scripts/setup_pin_authentication.py`** (new) - Setup and testing script

## Support

For issues or questions regarding the PIN authentication system:

1. Check the logs in `/logs/security.log`
2. Review the database schema with the provided migration
3. Test individual components using the setup script
4. Monitor API endpoints for proper responses

The system is designed to be secure, scalable, and maintainable for production use in the 6FB Booking platform.
