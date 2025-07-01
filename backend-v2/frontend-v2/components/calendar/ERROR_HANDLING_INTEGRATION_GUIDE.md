# Calendar Error Handling Integration Guide

This guide explains how to integrate the comprehensive error handling components into existing calendar views.

## Components Overview

### 1. CalendarErrorBoundary
- **Location**: `/components/calendar/CalendarErrorBoundary.tsx`
- **Features**:
  - React Error Boundary with auto-retry using exponential backoff
  - Network status detection
  - Sentry integration for error tracking
  - User-friendly error messages
  - Retry management with visual feedback

### 2. CalendarLoadingStates
- **Location**: `/components/calendar/CalendarLoadingStates.tsx`
- **Components**:
  - `CalendarSkeleton`: Loading animations for each view
  - `CalendarEmptyState`: Empty state with CTA
  - `CalendarErrorState`: Error display component
  - `CalendarLoading`: Loading with progress indicator

### 3. RetryManager
- **Location**: `/lib/RetryManager.ts`
- **Features**:
  - Exponential backoff retry logic
  - Network status monitoring
  - Circuit breaker pattern
  - React hooks for retry management

## Integration Steps

### Step 1: Wrap Calendar Components with Error Boundary

```tsx
// In your main calendar component or page
import { CalendarErrorBoundary } from '@/components/calendar/CalendarErrorBoundary'
import { CalendarMonthView } from '@/components/CalendarMonthView'

function CalendarPage() {
  return (
    <CalendarErrorBoundary context="calendar-page">
      <CalendarMonthView {...props} />
    </CalendarErrorBoundary>
  )
}
```

### Step 2: Use the HOC for Individual Views

```tsx
import { withCalendarErrorBoundary } from '@/components/calendar/CalendarErrorBoundary'
import { CalendarMonthView } from '@/components/CalendarMonthView'

// Create wrapped version
const SafeCalendarMonthView = withCalendarErrorBoundary(
  CalendarMonthView,
  'month-view'
)

// Use it normally
<SafeCalendarMonthView {...props} />
```

### Step 3: Implement Loading and Error States

```tsx
import { CalendarSkeleton, CalendarEmptyState, CalendarErrorState } from '@/components/calendar/CalendarLoadingStates'
import { useCalendarData } from '@/components/calendar/CalendarWithErrorHandling'

function CalendarContainer() {
  const { appointments, loading, error, retry } = useCalendarData(
    fetchAppointments,
    [selectedDate]
  )

  if (loading) {
    return <CalendarSkeleton view="month" />
  }

  if (error) {
    return (
      <CalendarErrorState
        error={error.message}
        onRetry={retry}
        context="month-view"
      />
    )
  }

  if (!appointments.length) {
    return (
      <CalendarEmptyState
        view="month"
        selectedDate={selectedDate}
        onCreateAppointment={handleCreateAppointment}
      />
    )
  }

  return <CalendarMonthView appointments={appointments} {...otherProps} />
}
```

### Step 4: Use Retry Manager for API Calls

```tsx
import { retryWithBackoff, useRetry } from '@/lib/RetryManager'

// Option 1: Direct usage
async function fetchAppointmentsWithRetry() {
  const result = await retryWithBackoff(
    () => fetch('/api/appointments').then(res => res.json()),
    {
      maxRetries: 3,
      initialDelay: 1000,
      onRetry: (error, attempt) => {
        console.log(`Retry attempt ${attempt}:`, error)
      }
    }
  )

  if (result.success) {
    return result.data
  }
  throw result.error
}

// Option 2: Using the hook
function CalendarComponent() {
  const { data, loading, error, retry } = useRetry(
    () => fetch('/api/appointments').then(res => res.json()),
    { maxRetries: 3 }
  )

  // Use data, loading, error states
}
```

### Step 5: Handle Network Status

```tsx
import { useNetworkStatus } from '@/lib/RetryManager'

function CalendarComponent() {
  const isOnline = useNetworkStatus()

  if (!isOnline) {
    return (
      <div className="text-center p-4 text-amber-600">
        <p>You are currently offline</p>
        <p className="text-sm">Calendar will update when connection is restored</p>
      </div>
    )
  }

  // Rest of component
}
```

## Error Types and Handling

### Define Custom Calendar Errors

```tsx
import type { CalendarError } from '@/types/calendar'

// Throw specific errors in your code
throw {
  name: 'CalendarSyncError',
  message: 'Failed to sync with Google Calendar',
  code: 'CALENDAR_SYNC_ERROR',
  recoverable: true,
  context: {
    calenderId: 'abc123',
    syncType: 'full'
  }
} as CalendarError
```

### Error Codes Reference

- `NETWORK_ERROR`: Network connection issues
- `TIMEOUT_ERROR`: Request timeout
- `AUTH_ERROR`: Authentication/session expired
- `VALIDATION_ERROR`: Invalid data
- `PERMISSION_ERROR`: Insufficient permissions
- `CALENDAR_SYNC_ERROR`: Calendar sync failed
- `APPOINTMENT_CONFLICT`: Scheduling conflict
- `SERVER_ERROR`: Server-side error
- `RATE_LIMIT_ERROR`: Too many requests

## Best Practices

1. **Always wrap top-level calendar components** with error boundaries
2. **Use loading states** during data fetching
3. **Provide meaningful error messages** based on error codes
4. **Implement retry logic** for transient failures
5. **Monitor network status** and adjust UI accordingly
6. **Log errors to monitoring services** (Sentry, etc.)
7. **Test error scenarios** during development

## Example: Complete Integration

```tsx
import React from 'react'
import { CalendarErrorBoundary } from '@/components/calendar/CalendarErrorBoundary'
import { CalendarSkeleton, CalendarEmptyState } from '@/components/calendar/CalendarLoadingStates'
import { CalendarMonthView } from '@/components/CalendarMonthView'
import { useRetry, useNetworkStatus } from '@/lib/RetryManager'
import { apiClient } from '@/lib/api'

export function EnhancedCalendar() {
  const [selectedDate, setSelectedDate] = React.useState(new Date())
  const isOnline = useNetworkStatus()

  const fetchAppointments = React.useCallback(async () => {
    const response = await apiClient.get('/appointments', {
      params: { date: selectedDate.toISOString() }
    })
    return response.data
  }, [selectedDate])

  const { data: appointments, loading, error, retry } = useRetry(
    fetchAppointments,
    {
      maxRetries: 3,
      retryCondition: (error) => {
        // Only retry on specific errors
        return error.response?.status >= 500 || error.code === 'NETWORK_ERROR'
      }
    }
  )

  return (
    <CalendarErrorBoundary 
      context="enhanced-calendar"
      onError={(error, errorInfo) => {
        // Additional error handling
        console.error('Calendar error:', error, errorInfo)
      }}
    >
      <div className="space-y-4">
        {/* Network status indicator */}
        {!isOnline && (
          <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 p-2 rounded text-sm text-center">
            Offline - Changes will sync when connection is restored
          </div>
        )}

        {/* Calendar content */}
        {loading && <CalendarSkeleton view="month" />}
        
        {error && (
          <CalendarErrorState
            error={error.message}
            onRetry={retry}
            context="appointment-fetch"
          />
        )}
        
        {!loading && !error && appointments?.length === 0 && (
          <CalendarEmptyState
            view="month"
            selectedDate={selectedDate}
            onCreateAppointment={() => console.log('Create appointment')}
          />
        )}
        
        {!loading && !error && appointments && appointments.length > 0 && (
          <CalendarMonthView
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            appointments={appointments}
            onAppointmentClick={(apt) => console.log('Clicked:', apt)}
          />
        )}
      </div>
    </CalendarErrorBoundary>
  )
}
```

## Testing Error Scenarios

```tsx
// Test network error
throw new Error('Network request failed')

// Test auth error
throw { 
  code: 'AUTH_ERROR', 
  message: 'Session expired',
  recoverable: true
} as CalendarError

// Test timeout
setTimeout(() => {
  throw new Error('Request timeout')
}, 5000)

// Simulate offline
window.dispatchEvent(new Event('offline'))
```

## Monitoring Integration

The error boundary automatically integrates with Sentry if available:

```tsx
// In your app initialization
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.BrowserTracing(),
  ],
})
```

Errors will be automatically captured with context about the calendar component and user actions.