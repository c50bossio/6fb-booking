# Authentication Resilience Test Guide

This guide helps verify that the improved token handling in the API client is working correctly.

## Test Scenarios

### 1. Token Refresh on 401
1. Log in to the application
2. Manually expire your token (or wait for it to expire)
3. Try to access a protected route
4. **Expected**: Token should automatically refresh and request should succeed

### 2. Prevent Token Clearing During Session Restore
1. Log in to the application
2. Refresh the page while on a protected route
3. **Expected**: Session should be restored without logging out the user

### 3. Graceful Handling of Refresh Failure
1. Log in to the application
2. Manually invalidate both access and refresh tokens
3. Try to access a protected route
4. **Expected**: User should be redirected to login page with proper error message

### 4. No Infinite Loops
1. Log in to the application
2. Break the refresh endpoint (return 401)
3. Try to access a protected route
4. **Expected**: Should fail gracefully without infinite retry loops

### 5. Token Persistence Across Storage
1. Log in to the application
2. Check browser DevTools:
   - localStorage should have the token
   - sessionStorage should have a backup
   - Memory storage should also have it
3. **Expected**: Token should be retrievable even if one storage fails

## Debug Commands

Run these in the browser console to debug authentication state:

```javascript
// Check current auth configuration
apiUtils.debugAuth()

// Manually validate stored token
apiUtils.validateStoredToken()

// Test token refresh
await apiUtils.refreshTokenIfNeeded()

// Check API health
await apiUtils.checkHealth()

// Test authentication
await apiUtils.testAuth()

// Check all storage locations
console.log({
  localStorage: localStorage.getItem('access_token'),
  sessionStorage: sessionStorage.getItem('access_token'),
  smartStorage: smartStorage.getItem('access_token')
})
```

## Using the Token Refresh Hook

Add this to any component that needs proactive token refresh:

```typescript
import { useTokenRefresh } from '@/hooks/useTokenRefresh'

function MyComponent() {
  const { refreshNow, isRefreshing } = useTokenRefresh({
    checkInterval: 5 * 60 * 1000, // 5 minutes
    onRefreshSuccess: () => {
      console.log('Token refreshed successfully')
    },
    onRefreshError: (error) => {
      console.error('Token refresh failed:', error)
    }
  })

  // Manual refresh
  const handleManualRefresh = async () => {
    const success = await refreshNow()
    if (success) {
      console.log('Manual refresh successful')
    }
  }

  return (
    <button onClick={handleManualRefresh} disabled={isRefreshing}>
      Refresh Token
    </button>
  )
}
```

## Key Improvements Made

1. **Token Refresh Logic**: Automatically attempts to refresh expired tokens before clearing them
2. **Retry Mechanism**: Retries failed requests after successful token refresh
3. **Better Logging**: Enhanced logging for all token-related operations
4. **Storage Verification**: Ensures tokens are properly retrieved from smartStorage
5. **Prevent Aggressive Clearing**: Delays token clearing to allow AuthProvider to handle session restoration
6. **Loop Prevention**: Uses headers and URL checks to prevent infinite refresh loops
7. **Proactive Refresh**: New hook for components to refresh tokens before they expire
8. **Debug Utilities**: Enhanced debug functions to inspect authentication state
