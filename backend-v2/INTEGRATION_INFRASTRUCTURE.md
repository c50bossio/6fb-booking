# Integration Infrastructure Documentation

## Overview

The BookedBarber V2 integration infrastructure provides a secure, extensible framework for connecting third-party services via OAuth and API keys. This system handles token management, health monitoring, and provides a consistent interface for all integrations.

## Architecture

### Core Components

1. **Integration Model** (`models/integration.py`)
   - Stores integration credentials securely (encrypted)
   - Tracks health status and error history
   - Manages OAuth tokens and expiration

2. **Integration Schemas** (`schemas/integration.py`)
   - Pydantic models for request/response validation
   - OAuth flow handling schemas
   - Health check response models

3. **Base Integration Service** (`services/integration_service.py`)
   - Abstract base class for all integrations
   - Common OAuth flow implementation
   - Token refresh logic
   - Health monitoring

4. **Integration Router** (`routers/integrations.py`)
   - RESTful API endpoints
   - OAuth callback handling
   - Health check endpoints

## API Endpoints

### OAuth Flow

1. **Initiate Connection**
   ```
   POST /api/v1/integrations/connect
   {
     "integration_type": "google_calendar",
     "redirect_uri": "https://app.bookedbarber.com/integrations/callback",
     "scopes": ["additional.scope"]
   }
   ```
   Returns: `{ "authorization_url": "...", "state": "..." }`

2. **Handle Callback**
   ```
   GET /api/v1/integrations/callback?code=...&state=...&integration_type=google_calendar
   ```
   Returns: `{ "success": true, "integration_id": 123, "redirect_url": "..." }`

### Integration Management

3. **List Integrations**
   ```
   GET /api/v1/integrations/status?integration_type=stripe
   ```

4. **Get Integration Details**
   ```
   GET /api/v1/integrations/{integration_id}
   ```

5. **Update Integration**
   ```
   PUT /api/v1/integrations/{integration_id}
   {
     "name": "My Google Calendar",
     "config": { "sync_enabled": true },
     "is_active": true
   }
   ```

6. **Disconnect Integration**
   ```
   DELETE /api/v1/integrations/{integration_id}
   ```

### Health Monitoring

7. **Check All Integrations Health**
   ```
   GET /api/v1/integrations/health/all
   ```

8. **Check Specific Integration Health**
   ```
   GET /api/v1/integrations/health/{integration_id}
   ```

9. **Refresh Token**
   ```
   POST /api/v1/integrations/{integration_id}/refresh-token
   {
     "integration_id": 123,
     "force": false
   }
   ```

## Adding a New Integration

### 1. Define the Integration Type

Add to `models/integration.py`:
```python
class IntegrationType(enum.Enum):
    # ... existing types ...
    MY_SERVICE = "my_service"
```

### 2. Create the Service Implementation

Create `services/my_service_integration_service.py`:

```python
from services.integration_service import BaseIntegrationService, IntegrationServiceFactory
from models.integration import Integration, IntegrationType

class MyServiceIntegrationService(BaseIntegrationService):
    @property
    def integration_type(self) -> IntegrationType:
        return IntegrationType.MY_SERVICE
    
    @property
    def oauth_authorize_url(self) -> str:
        return "https://myservice.com/oauth/authorize"
    
    @property
    def oauth_token_url(self) -> str:
        return "https://myservice.com/oauth/token"
    
    @property
    def required_scopes(self) -> List[str]:
        return ["read", "write"]
    
    @property
    def client_id(self) -> str:
        return settings.MY_SERVICE_CLIENT_ID
    
    @property
    def client_secret(self) -> str:
        return settings.MY_SERVICE_CLIENT_SECRET
    
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        # Implement OAuth code exchange
        pass
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        # Implement token refresh
        pass
    
    async def verify_connection(self, integration: Integration) -> Tuple[bool, Optional[str]]:
        # Implement connection verification
        pass
    
    # Add service-specific methods
    async def fetch_data(self, integration: Integration) -> Dict[str, Any]:
        # Custom functionality
        pass

# Register with factory
IntegrationServiceFactory.register(
    IntegrationType.MY_SERVICE,
    MyServiceIntegrationService
)
```

### 3. Import the Service

Add to `main.py` or create an `__init__.py` in services:
```python
import services.my_service_integration_service
```

### 4. Update Environment Variables

Add to `.env`:
```
MY_SERVICE_CLIENT_ID=your_client_id
MY_SERVICE_CLIENT_SECRET=your_client_secret
```

## Security Considerations

1. **Token Encryption**: All tokens are encrypted using the `EncryptedText` field type
2. **State Parameter**: OAuth state includes user ID, timestamp, and nonce for security
3. **Scope Management**: Minimum required scopes are enforced
4. **Token Refresh**: Automatic token refresh with 5-minute buffer before expiration
5. **Error Tracking**: Failed attempts are logged and tracked

## Health Monitoring

The system automatically monitors integration health by:
- Verifying token validity
- Testing API connectivity
- Tracking error rates
- Storing health check history

Health status values:
- `active`: Integration is working correctly
- `inactive`: Integration is disabled by user
- `error`: Integration has errors (check `last_error`)
- `pending`: Integration setup in progress
- `expired`: OAuth tokens have expired

## Best Practices

1. **Error Handling**: Always use try-catch blocks and update integration status on errors
2. **Token Management**: Use `refresh_token_if_needed()` before API calls
3. **Logging**: Log all OAuth flows and API interactions
4. **Rate Limiting**: Respect third-party API rate limits
5. **Webhooks**: Store webhook secrets encrypted and validate all incoming webhooks

## Example Usage

### Frontend Integration Flow

```typescript
// 1. Initiate OAuth connection
const response = await fetch('/api/v1/integrations/connect', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    integration_type: 'google_calendar',
    redirect_uri: window.location.origin + '/integrations/callback'
  })
});

const { authorization_url } = await response.json();

// 2. Redirect user to OAuth provider
window.location.href = authorization_url;

// 3. Handle callback (in callback page)
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');
const integration_type = urlParams.get('integration_type');

// 4. Complete OAuth flow
const callbackResponse = await fetch(`/api/v1/integrations/callback?code=${code}&state=${state}&integration_type=${integration_type}`);
const { success, integration_id } = await callbackResponse.json();

if (success) {
  // Integration connected successfully
  window.location.href = `/integrations/${integration_id}/success`;
}
```

### Using an Integration

```python
# In a service that needs Google Calendar
from services.google_calendar_integration_service import GoogleCalendarIntegrationService

async def sync_appointment_to_calendar(appointment_id: int, user_id: int, db: Session):
    # Get user's Google Calendar integration
    integration = db.query(Integration).filter(
        Integration.user_id == user_id,
        Integration.integration_type == IntegrationType.GOOGLE_CALENDAR,
        Integration.is_active == True
    ).first()
    
    if not integration:
        raise ValueError("No active Google Calendar integration found")
    
    # Create service instance
    service = GoogleCalendarIntegrationService(db)
    
    # Create calendar event
    event_data = {
        "summary": f"Appointment #{appointment_id}",
        "start": {"dateTime": "2024-01-15T10:00:00Z"},
        "end": {"dateTime": "2024-01-15T11:00:00Z"}
    }
    
    try:
        event = await service.create_event(
            integration,
            integration.config.get("calendar_id", "primary"),
            event_data
        )
        return event
    except Exception as e:
        logger.error(f"Failed to sync appointment: {str(e)}")
        raise
```

## Migration

Run the migration to create the integrations table:

```bash
cd backend-v2
alembic upgrade head
```

## Testing

Test the integration endpoints:

```bash
# Test OAuth initiation
curl -X POST http://localhost:8000/api/v1/integrations/connect \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"integration_type": "google_calendar"}'

# Check integration health
curl http://localhost:8000/api/v1/integrations/health/all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

1. **OAuth Callback Fails**
   - Check redirect URI matches exactly
   - Verify state parameter hasn't expired (10-minute timeout)
   - Check OAuth app settings in provider dashboard

2. **Token Refresh Fails**
   - Ensure refresh token was obtained (requires offline access)
   - Check if refresh token has been revoked
   - Verify client credentials are correct

3. **Health Check Fails**
   - Check integration logs for specific errors
   - Verify API credentials haven't been revoked
   - Check for API service outages

4. **Encryption Issues**
   - Ensure ENCRYPTION_KEY is set in environment
   - Check that encrypted fields are using EncryptedText type
   - Verify database column types match model definitions