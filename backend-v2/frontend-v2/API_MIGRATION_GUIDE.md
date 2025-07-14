# API Client Migration Guide

## Overview

This guide helps you migrate from the legacy API clients to the new unified API client system. The migration is designed to be incremental and backward-compatible.

## Migration Strategy

### Phase 1: Gradual Introduction (Week 1)

#### Step 1: Start Using Unified Exports
Replace direct imports with unified exports for new code:

```typescript
// Old approach
import { authApi } from '@/lib/api/auth'
import { apiClient } from '@/lib/api/client'

// New approach
import { authClient, apiClient } from '@/lib/api/unified-index'
```

#### Step 2: Use New Domain Clients for New Features
For any new authentication-related code, use the unified auth client:

```typescript
// New unified auth client with enhanced error handling
import { authClient } from '@/lib/api/unified-index'

try {
  const user = await authClient.login({ email, password })
  // Enhanced error context and retry logic automatically applied
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Handle authentication specific errors
  } else if (error instanceof ValidationError) {
    // Handle validation errors with detailed field information
  }
}
```

### Phase 2: Component Migration (Week 2-3)

#### Authentication Components
Migrate authentication components to use the unified auth client:

```typescript
// Before
import { authApi } from '@/lib/api/auth'

const handleLogin = async (credentials) => {
  try {
    const response = await authApi.login(credentials)
    // Handle response...
  } catch (error) {
    // Basic error handling...
  }
}

// After
import { authClient } from '@/lib/api/unified-index'

const handleLogin = async (credentials) => {
  try {
    const response = await authClient.login(credentials)
    // Same response format, enhanced error context
  } catch (error) {
    if (error instanceof AuthenticationError) {
      setError('Invalid credentials')
    } else if (error instanceof RateLimitError) {
      setError(`Too many attempts. Try again in ${error.retryAfter} seconds`)
    } else {
      setError('Login failed. Please try again.')
    }
  }
}
```

#### Benefits You Get Immediately:
- **Automatic Retry**: Failed requests are automatically retried with exponential backoff
- **Enhanced Error Types**: Specific error classes for different failure scenarios
- **Performance Monitoring**: Automatic tracking of request performance
- **Token Management**: Automatic token refresh and storage management

### Phase 3: API Call Standardization (Week 3-4)

#### Replace Direct fetch() Calls
Replace any direct fetch calls with the unified client:

```typescript
// Before
const response = await fetch('/api/v1/appointments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(data)
})

if (!response.ok) {
  throw new Error('Request failed')
}

// After
import { apiClient } from '@/lib/api/unified-index'

const response = await apiClient.post('/api/v1/appointments', data, {
  tags: { 'feature': 'appointments', 'action': 'create' }
})
// Automatic auth headers, error handling, retries, and monitoring
```

#### Migrate Specialized API Files
For each specialized API file, create or update domain clients:

```typescript
// New: lib/api/domains/appointments-client.ts
import { UnifiedAPIClient } from '../unified-client'
import { RETRY_PRESETS } from '../types/common'

export class AppointmentsClient extends UnifiedAPIClient {
  constructor() {
    super({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      retry: RETRY_PRESETS.standard,
      timeout: 15000,
      feature: 'appointments'
    })
  }

  async createAppointment(data: AppointmentCreate): Promise<Appointment> {
    const response = await this.post<Appointment>('/api/v1/appointments', data, {
      tags: { 'appointment.action': 'create' },
      validation: true
    })
    return response.data
  }

  async rescheduleAppointment(id: number, reschedule: AppointmentReschedule): Promise<Appointment> {
    const response = await this.put<Appointment>(`/api/v1/appointments/${id}/reschedule`, reschedule, {
      tags: { 'appointment.action': 'reschedule', 'appointment.id': id.toString() }
    })
    return response.data
  }
}

export const appointmentsClient = new AppointmentsClient()
```

### Phase 4: Legacy Cleanup (Week 4-5)

#### Remove Old API Files
Once all components are migrated, remove the legacy API files:

1. Update all imports to use unified exports
2. Remove unused legacy API files
3. Update tests to use new error types
4. Verify all functionality works with the new system

## Migration Validation

### 1. Error Handling Verification
Ensure all error scenarios are properly handled:

```typescript
import { 
  APIError, 
  AuthenticationError, 
  ValidationError, 
  RateLimitError,
  NetworkError 
} from '@/lib/api/unified-index'

try {
  await apiClient.post('/api/v1/test', data)
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Handle 401/403 errors
    redirectToLogin()
  } else if (error instanceof ValidationError) {
    // Handle 400/422 errors with field details
    setFieldErrors(error.validationErrors)
  } else if (error instanceof RateLimitError) {
    // Handle 429 errors with retry timing
    setError(`Rate limited. Retry in ${error.retryAfter}s`)
  } else if (error instanceof NetworkError) {
    // Handle network/timeout errors
    setError('Network error. Please check your connection.')
  } else if (error instanceof APIError) {
    // Handle other API errors
    setError(`Server error: ${error.message}`)
  } else {
    // Handle unexpected errors
    setError('An unexpected error occurred')
  }
}
```

### 2. Performance Monitoring
Monitor the migration's impact on performance:

```typescript
import { migrationHelpers } from '@/lib/api/unified-index'

// Log performance summary
migrationHelpers.logPerformanceSummary()

// Get detailed metrics
const metrics = migrationHelpers.getPerformanceMetrics()
console.log('API Performance:', {
  totalRequests: metrics.totalRequests,
  avgResponseTime: metrics.avgResponseTime,
  errorRate: metrics.errorRate,
  performanceScore: metrics.performanceScore
})
```

### 3. Retry Logic Verification
Test retry behavior with network simulation:

```typescript
// Verify retry logic works
const testRetry = async () => {
  try {
    // This should retry on 500 errors
    await apiClient.post('/api/v1/test-500')
  } catch (error) {
    console.log('Retries attempted:', error.retryAttempt)
  }
}
```

## Component-Specific Migration Examples

### Authentication Components

```typescript
// Before: components/auth/LoginForm.tsx
import { authApi } from '@/lib/api/auth'

const LoginForm = () => {
  const handleSubmit = async (data) => {
    try {
      const response = await authApi.login(data)
      localStorage.setItem('access_token', response.access_token)
      // Manual token management...
    } catch (error) {
      setError('Login failed')
    }
  }
}

// After: components/auth/LoginForm.tsx
import { authClient, AuthenticationError, ValidationError } from '@/lib/api/unified-index'

const LoginForm = () => {
  const handleSubmit = async (data) => {
    try {
      const response = await authClient.login(data)
      // Automatic token management, no manual storage needed
      router.push('/dashboard')
    } catch (error) {
      if (error instanceof AuthenticationError) {
        setError('Invalid email or password')
      } else if (error instanceof ValidationError) {
        setFieldErrors(error.validationErrors)
      } else {
        setError('Login failed. Please try again.')
      }
    }
  }
}
```

### Appointment Components

```typescript
// Before: components/appointments/AppointmentForm.tsx
import { fetchAPI } from '@/lib/api'

const AppointmentForm = () => {
  const createAppointment = async (data) => {
    try {
      const response = await fetchAPI('/api/v1/appointments', {
        method: 'POST',
        body: JSON.stringify(data)
      })
      // Manual response handling...
    } catch (error) {
      setError('Failed to create appointment')
    }
  }
}

// After: components/appointments/AppointmentForm.tsx
import { appointmentsClient, ValidationError } from '@/lib/api/unified-index'

const AppointmentForm = () => {
  const createAppointment = async (data) => {
    try {
      const appointment = await appointmentsClient.createAppointment(data)
      // Enhanced response with automatic retry and error handling
      router.push(`/appointments/${appointment.id}`)
    } catch (error) {
      if (error instanceof ValidationError) {
        setFieldErrors(error.validationErrors)
      } else {
        setError('Failed to create appointment. Please try again.')
      }
    }
  }
}
```

## Testing Migration

### Unit Tests

```typescript
// Test unified client behavior
import { UnifiedAPIClient, APIError, ValidationError } from '@/lib/api/unified-index'

describe('Unified API Client', () => {
  it('should handle validation errors correctly', async () => {
    const client = new UnifiedAPIClient()
    
    // Mock 422 response
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({
        message: 'Validation failed',
        validation_errors: [{ field: 'email', message: 'Invalid email' }]
      })
    })

    try {
      await client.post('/api/test', { email: 'invalid' })
      fail('Should have thrown ValidationError')
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      expect(error.validationErrors).toHaveLength(1)
      expect(error.validationErrors[0].field).toBe('email')
    }
  })

  it('should retry on server errors', async () => {
    const client = new UnifiedAPIClient()
    let callCount = 0
    
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++
      if (callCount < 3) {
        return Promise.resolve({ ok: false, status: 500 })
      }
      return Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ success: true }) 
      })
    })

    const response = await client.get('/api/test')
    expect(callCount).toBe(3) // Initial + 2 retries
    expect(response.data.success).toBe(true)
  })
})
```

### Integration Tests

```typescript
// Test domain clients
describe('Auth Client Integration', () => {
  it('should handle login flow correctly', async () => {
    const mockResponse = {
      access_token: 'token123',
      user: { id: 1, email: 'test@example.com' }
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    const result = await authClient.login({
      email: 'test@example.com',
      password: 'password'
    })

    expect(result.access_token).toBe('token123')
    expect(authClient.isAuthenticated()).toBe(true)
    expect(authClient.getStoredUser().email).toBe('test@example.com')
  })
})
```

## Rollback Plan

If issues are discovered during migration:

1. **Immediate Rollback**: Switch imports back to legacy API clients
2. **Selective Rollback**: Revert specific components while keeping others migrated
3. **Configuration Rollback**: Disable specific features (retry, monitoring) while keeping the unified client

```typescript
// Emergency rollback - disable retry and monitoring
import { UnifiedAPIClient, RETRY_PRESETS } from '@/lib/api/unified-index'

const fallbackClient = new UnifiedAPIClient({
  retry: RETRY_PRESETS.none,
  monitoring: { enabled: false, performanceTracking: false, logRequests: false },
  timeout: 30000
})
```

## Success Metrics

Track these metrics to validate successful migration:

- **Error Rate**: Should remain same or improve
- **Response Times**: Should be similar or better
- **Retry Success Rate**: New metric showing automatic recovery
- **Code Duplication**: Should decrease significantly
- **Developer Experience**: Faster implementation of new API features

## Support and Troubleshooting

### Common Issues

1. **Token Refresh Loops**: Ensure refresh token endpoint is configured correctly
2. **Performance Degradation**: Check retry configuration and disable if needed
3. **Type Errors**: Update imports to use unified types
4. **Test Failures**: Update tests to handle new error types

### Debug Tools

```typescript
// Enable debug mode in development
if (process.env.NODE_ENV === 'development') {
  // Monitor performance
  window.__API_PERFORMANCE__ = migrationHelpers.getPerformanceMetrics
  
  // Log all requests
  apiClient.updateConfig({
    monitoring: {
      enabled: true,
      logRequests: true,
      logResponses: true,
      logErrors: true
    }
  })
}
```

This migration guide ensures a smooth transition to the unified API client system while maintaining backward compatibility and providing enhanced error handling, retry logic, and performance monitoring.