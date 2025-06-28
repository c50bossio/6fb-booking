# Token Refresh Enhancements

## Overview
Enhanced the token refresh mechanism to prevent calendar API 401 errors through proactive token validation and automatic refresh.

## Key Improvements

### 1. JWT Token Utilities (`/src/lib/utils/tokenUtils.ts`)
- **JWT Decoding**: Client-side JWT parsing without verification
- **Expiry Checking**: Functions to check if tokens are expired or expiring soon
- **Time Calculations**: Get remaining time and format human-readable strings
- **Constants**: `TOKEN_REFRESH_THRESHOLD` set to 5 minutes

### 2. Enhanced useTokenRefresh Hook (`/src/hooks/useTokenRefresh.ts`)
- **Proactive Refresh**: Automatically refreshes tokens within 5 minutes of expiry
- **Frequent Monitoring**: Checks token status every 30 seconds (configurable)
- **Race Condition Prevention**: Single refresh promise prevents multiple simultaneous refreshes
- **New Methods**:
  - `validateAndRefresh()`: Check and refresh token before API calls
  - Enhanced status tracking: `tokenTimeRemaining`, `isTokenExpiring`

### 3. API Client Enhancements (`/src/lib/api/client.ts`)
- **Request Interceptor**: Proactive token validation before requests
- **401 Retry Logic**: Automatic retry with token refresh on authentication failures
- **Request Queuing**: Queue requests during token refresh to prevent race conditions
- **Smart Routing**: Skip validation for auth endpoints and health checks

### 4. Token-Validated API Client (`/src/lib/api/tokenValidatedClient.ts`)
- **Dedicated Calendar API Client**: Specialized client for calendar operations
- **Pre-request Validation**: Ensures tokens are valid before making requests
- **Calendar-specific Methods**: Optimized methods for common calendar operations
- **React Hook**: `useTokenValidatedApi()` for component integration

### 5. Calendar Service Updates (`/src/lib/api/calendar.ts`)
- **Critical Operations**: Updated key methods to use token-validated client
- **Enhanced Error Handling**: Better error handling for authentication failures
- **Maintained Compatibility**: Backward compatibility with existing code

### 6. Testing and Monitoring
- **Unit Tests**: Comprehensive tests for token utility functions
- **Token Status Component**: Visual component to monitor token status
- **Debug Logging**: Enhanced logging for troubleshooting

## Flow Diagram

```
User Action → API Request
     ↓
Request Interceptor
     ↓
Token Validation
     ↓
Is Token Expiring? → Yes → Refresh Token → Update Headers
     ↓ No                      ↓
Continue Request ←────────────────
     ↓
API Call
     ↓
401 Response? → Yes → Queue Request → Refresh Token → Retry
     ↓ No                              ↓
Success ←─────────────────────────────────
```

## Configuration

### Default Settings
- **Refresh Threshold**: 5 minutes before expiry
- **Check Interval**: 30 seconds
- **Proactive Refresh**: Enabled by default
- **Maximum Retries**: 1 retry per request

### Customization
```typescript
const { validateAndRefresh } = useTokenRefresh({
  checkInterval: 60000, // 1 minute
  proactiveRefresh: true,
  onRefreshSuccess: () => console.log('Token refreshed'),
  onRefreshError: (error) => console.error('Refresh failed', error)
})
```

## Benefits

1. **Prevents 401 Errors**: Proactive refresh eliminates authentication failures during API calls
2. **Better UX**: No interruptions to user workflow due to token expiry
3. **Race Condition Safe**: Request queuing prevents multiple simultaneous refresh attempts
4. **Automatic Recovery**: Failed requests are automatically retried after token refresh
5. **Configurable**: Flexible configuration options for different use cases
6. **Monitoring**: Built-in status tracking and debugging tools

## Files Modified

1. `/src/lib/utils/tokenUtils.ts` - New JWT utility functions
2. `/src/hooks/useTokenRefresh.ts` - Enhanced hook with proactive refresh
3. `/src/lib/api/client.ts` - Request/response interceptors with retry logic
4. `/src/lib/api/tokenValidatedClient.ts` - New specialized API client
5. `/src/lib/api/calendar.ts` - Updated to use token-validated client
6. `/src/components/auth/TokenStatus.tsx` - New monitoring component
7. `/src/lib/utils/__tests__/tokenUtils.test.ts` - Unit tests

## Testing

Run the test suite to verify token utilities:
```bash
npm test tokenUtils.test.ts
```

Monitor token status in development by adding the TokenStatus component:
```typescript
import { TokenStatus } from '@/components/auth/TokenStatus'

// In your component
<TokenStatus showDetails={true} />
```

## Production Considerations

1. **Token Lifetime**: Ensure backend JWT tokens have appropriate expiry times
2. **Refresh Endpoint**: Backend must support token refresh via `/auth/me` endpoint
3. **Error Handling**: Monitor for token refresh failures in production
4. **Performance**: Token validation adds minimal overhead to requests
5. **Security**: Client-side token decoding is for timing only, not authentication

## Future Enhancements

1. **Background Refresh**: Implement service worker for background token refresh
2. **Token Rotation**: Support for refresh token rotation
3. **Multiple Tokens**: Support for multiple token types (access, refresh, etc.)
4. **Analytics**: Track token refresh patterns for optimization
5. **Offline Support**: Handle token refresh when network is unavailable
