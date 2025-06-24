# Error Handling System

A comprehensive error handling system for the 6FB Booking calendar application that provides graceful error recovery, user-friendly messaging, and detailed error tracking.

## Features

- **Centralized Error Management**: Single point of control for all application errors
- **Type-Safe Error Handling**: Comprehensive error types with TypeScript support
- **Automatic Retry Logic**: Built-in retry mechanisms for transient errors
- **User-Friendly Messaging**: Contextual error messages with recovery suggestions
- **Error Pattern Tracking**: Analytics and monitoring of error frequencies
- **React Error Boundaries**: Graceful UI error handling with fallback components
- **Toast Notifications**: Non-intrusive error notifications with auto-dismiss
- **Theme-Aware UI**: Dark/light mode support for all error components

## Quick Start

### Basic Usage

```tsx
import { ErrorManager, NetworkError, ValidationError } from '@/lib/error-handling'

// Handle errors with automatic processing
try {
  await apiCall()
} catch (error) {
  const appError = await ErrorManager.getInstance().handleError(error)
  // Error is now processed, tracked, and ready for display
}

// Use retry logic for transient operations
const result = await ErrorManager.getInstance().withRetry(async () => {
  return await unstableApiCall()
})
```

### React Components

```tsx
import { ErrorBoundary, ErrorNotification, ToastProvider } from '@/components/error'

function App() {
  return (
    <ToastProvider>
      <ErrorBoundary showErrorDetails={true}>
        <YourComponent />
      </ErrorBoundary>
    </ToastProvider>
  )
}

function YourComponent() {
  const { error, showError, ErrorNotification } = useErrorNotification()

  const handleSubmit = async () => {
    try {
      await submitForm()
    } catch (err) {
      const appError = await errorManager.handleError(err)
      showError(appError)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {/* form content */}
      </form>
      <ErrorNotification variant="inline" showRecoveryActions={true} />
    </div>
  )
}
```

## Error Types

### Base Error Classes

- `NetworkError`: For network-related failures
- `ValidationError`: For input validation failures
- `ConflictError`: For booking conflicts and resource conflicts
- `AuthError`: For authentication and authorization issues
- `SystemError`: For system-level errors and unknown issues

### Error Severity Levels

- `INFO`: Informational messages
- `WARNING`: Non-critical issues that should be addressed
- `ERROR`: Standard errors that prevent operation completion
- `CRITICAL`: Severe errors requiring immediate attention

### Error Codes

The system uses a structured error code system:
- `1xxx`: Network errors
- `2xxx`: Validation errors
- `3xxx`: Business logic errors
- `4xxx`: Authentication errors
- `5xxx`: System errors

## Error Manager API

### Core Methods

```tsx
// Handle any error
const appError = await errorManager.handleError(error, context?)

// Execute with retry logic
const result = await errorManager.withRetry(operation, retryConfig?)

// Get user-friendly message
const message = errorManager.getUserMessage(error)

// Get recovery suggestions
const suggestions = errorManager.getRecoverySuggestions(error)

// Listen to errors
const unsubscribe = errorManager.onError((error) => {
  console.log('Error occurred:', error)
})

// Get error statistics
const stats = errorManager.getErrorStats()
```

### Configuration

```tsx
const errorManager = ErrorManager.getInstance({
  enableErrorReporting: true,
  enableRetry: true,
  reportingEndpoint: '/api/errors',
  defaultRetryConfig: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
})
```

## React Components

### ErrorBoundary

```tsx
<ErrorBoundary
  fallback={<CustomErrorUI />}
  onError={(error, errorInfo) => console.log(error)}
  resetKeys={[userId, sessionId]}
  showErrorDetails={process.env.NODE_ENV === 'development'}
  enableReporting={true}
>
  <App />
</ErrorBoundary>
```

### ErrorNotification

```tsx
<ErrorNotification
  error={appError}
  variant="toast" // 'inline', 'toast', 'banner'
  autoDissmiss={true}
  dismissTimeout={5000}
  showRecoveryActions={true}
  onDismiss={() => setError(null)}
/>
```

### ToastProvider

```tsx
<ToastProvider
  maxToasts={5}
  defaultTimeout={5000}
  position="top-right"
>
  <App />
</ToastProvider>
```

## Custom Error Creation

```tsx
import { BaseError, ErrorCode, ErrorSeverity } from '@/lib/error-handling'

class BookingConflictError extends BaseError {
  constructor(conflictDetails: string) {
    super(
      `Booking conflict: ${conflictDetails}`,
      ErrorCode.BOOKING_CONFLICT,
      ErrorSeverity.WARNING,
      {
        isRetryable: false,
        userMessage: 'The selected time slot is no longer available.',
        recoverySuggestions: [
          {
            message: 'Please select a different time slot',
          },
          {
            message: 'View available alternatives',
            action: () => showAlternatives(),
            actionLabel: 'Show Alternatives',
          },
        ],
      }
    )
  }
}
```

## Best Practices

### 1. Always Use Error Manager

```tsx
// ❌ Don't handle errors directly
catch (error) {
  console.error(error)
  setError(error.message)
}

// ✅ Use error manager
catch (error) {
  const appError = await errorManager.handleError(error, {
    action: 'createBooking',
    userId: user.id,
  })
  setError(appError)
}
```

### 2. Provide Context

```tsx
const appError = await errorManager.handleError(error, {
  action: 'submitBookingForm',
  userId: user.id,
  metadata: {
    formData: sanitizedFormData,
    selectedTimeSlot: timeSlot,
  },
})
```

### 3. Use Appropriate Error Types

```tsx
// ❌ Generic error
throw new Error('Validation failed')

// ✅ Specific error type
throw new ValidationError('Required fields missing', {
  name: ['Name is required'],
  email: ['Valid email is required'],
})
```

### 4. Provide Recovery Actions

```tsx
const error = new NetworkError('Failed to save booking', {
  userMessage: 'Could not save your booking due to connection issues.',
  recoverySuggestions: [
    {
      message: 'Try saving again',
      action: () => retrySave(),
      actionLabel: 'Retry',
    },
    {
      message: 'Save as draft for later',
      action: () => saveDraft(),
      actionLabel: 'Save Draft',
    },
  ],
})
```

## Integration Examples

### API Calls

```tsx
import { withRetry, NetworkError } from '@/lib/error-handling'

async function fetchBookings() {
  return await withRetry(async () => {
    const response = await fetch('/api/bookings')

    if (!response.ok) {
      throw new NetworkError(`API request failed: ${response.status}`, {
        context: {
          url: response.url,
          status: response.status,
        },
      })
    }

    return response.json()
  })
}
```

### Form Validation

```tsx
import { ValidationError } from '@/lib/error-handling'

function validateBookingForm(data: BookingFormData) {
  const errors: Record<string, string[]> = {}

  if (!data.customerName) {
    errors.customerName = ['Customer name is required']
  }

  if (!data.serviceId) {
    errors.serviceId = ['Please select a service']
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Form validation failed', errors, {
      userMessage: 'Please correct the highlighted fields',
    })
  }
}
```

### Business Logic Errors

```tsx
import { ConflictError } from '@/lib/error-handling'

function checkBookingAvailability(timeSlot: TimeSlot, barberId: string) {
  if (isTimeSlotTaken(timeSlot, barberId)) {
    throw new ConflictError(
      'Time slot already booked',
      'booking',
      {
        userMessage: 'This time slot is no longer available.',
        recoverySuggestions: [
          {
            message: 'View available times',
            action: () => showAvailableTimes(barberId),
            actionLabel: 'Show Available',
          },
        ],
      }
    )
  }
}
```

## Testing

The error handling system includes comprehensive test utilities:

```tsx
import { ErrorManager } from '@/lib/error-handling'

describe('Error Handling', () => {
  let errorManager: ErrorManager

  beforeEach(() => {
    errorManager = ErrorManager.getInstance()
    errorManager.clearErrorPatterns() // Reset for testing
  })

  it('should handle network errors with retry', async () => {
    const mockOperation = jest.fn()
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockResolvedValueOnce('success')

    const result = await errorManager.withRetry(mockOperation)

    expect(result).toBe('success')
    expect(mockOperation).toHaveBeenCalledTimes(2)
  })
})
```

## Monitoring and Analytics

The error manager automatically tracks error patterns and provides analytics:

```tsx
// Get error statistics
const stats = errorManager.getErrorStats()

console.log('Total errors:', stats.totalErrors)
console.log('Errors by code:', stats.errorsByCode)
console.log('Most frequent errors:', stats.frequentErrors)
```

This data can be used for:
- Identifying problematic areas of the application
- Monitoring error trends over time
- Prioritizing bug fixes based on error frequency
- Understanding user impact of different error types
