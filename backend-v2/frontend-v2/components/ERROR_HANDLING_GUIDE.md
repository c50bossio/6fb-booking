# Error Handling Components Guide

This guide covers the enhanced error handling components available in the BookedBarber application.

## Components Overview

### 1. ErrorBoundaryWithRetry
A sophisticated error boundary component that provides automatic retry functionality, error type detection, and user-friendly error messages.

### 2. Enhanced ErrorDisplay
An improved error display component in LoadingStates.tsx with better error messages and retry functionality.

### 3. CalendarErrorBoundary
Specialized error boundary for calendar-related errors with calendar-specific handling.

## Key Features

- **Automatic Error Type Detection**: Identifies network, auth, validation, timeout, and other error types
- **Smart Retry Logic**: Exponential backoff with jitter for automatic retries
- **User-Friendly Messages**: Contextual error messages based on error type
- **Recovery Suggestions**: Provides actionable suggestions for users
- **Network Status Awareness**: Detects offline status and adjusts behavior
- **Development Mode Details**: Shows stack traces and component info in development
- **Error History Tracking**: Maintains error history for debugging
- **Monitoring Integration**: Ready for Sentry and analytics integration

## Usage Examples

### Basic Error Boundary

```tsx
import { ErrorBoundaryWithRetry } from '@/components/ErrorBoundaryWithRetry'

function MyPage() {
  return (
    <ErrorBoundaryWithRetry
      maxRetries={3}
      enableAutoRetry={true}
      context="MyPage"
    >
      <YourContent />
    </ErrorBoundaryWithRetry>
  )
}
```

### Using the HOC Pattern

```tsx
import { withEnhancedErrorBoundary } from '@/components/ErrorBoundaryWithRetry'

const SafeComponent = withEnhancedErrorBoundary(
  YourComponent,
  {
    maxRetries: 5,
    enableAutoRetry: true,
    onError: (error, errorInfo) => {
      console.error('Component error:', error)
    }
  }
)
```

### Local Error Handling with ErrorDisplay

```tsx
import { ErrorDisplay } from '@/components/LoadingStates'

function DataFetcher() {
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => {
          setRetryCount(prev => prev + 1)
          fetchData()
        }}
        retryAttempts={retryCount}
        maxRetries={3}
        suggestions={[
          'Check your internet connection',
          'Try refreshing the page'
        ]}
      />
    )
  }
  
  // Normal render
}
```

### Using the Error Handler Hook

```tsx
import { useErrorHandler } from '@/components/ErrorBoundaryWithRetry'

function RiskyOperation() {
  const { captureError } = useErrorHandler()
  
  const performOperation = async () => {
    try {
      await riskyApiCall()
    } catch (error) {
      // This will throw to the nearest error boundary
      captureError(error)
    }
  }
  
  return <button onClick={performOperation}>Perform Operation</button>
}
```

## Error Types and Handling

### Network Errors
- **Detection**: Errors containing "network" or "fetch"
- **Auto-retry**: Yes
- **Suggestions**: Check connection, disable VPN, verify service status

### Authentication Errors
- **Detection**: 401 status or "unauthorized"
- **Auto-retry**: No
- **Action**: Redirect to login page

### Permission Errors
- **Detection**: 403 status or "forbidden"
- **Auto-retry**: No
- **Suggestions**: Contact admin, verify correct account

### Validation Errors
- **Detection**: "validation" or "invalid" in message
- **Auto-retry**: No
- **Suggestions**: Check input data

### Timeout Errors
- **Detection**: "timeout" in message
- **Auto-retry**: Yes
- **Suggestions**: Check internet speed, try when less busy

### Chunk Load Errors
- **Detection**: "chunk" or "loading css chunk"
- **Auto-retry**: Yes
- **Action**: Reload page for updates

### Rate Limit Errors
- **Detection**: 429 status or "rate limit"
- **Auto-retry**: Yes (with delay)
- **Shows**: Retry after time

### Server Errors
- **Detection**: 5xx status codes
- **Auto-retry**: Yes
- **Message**: Team has been notified

## Configuration Options

### ErrorBoundaryWithRetry Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| maxRetries | number | 3 | Maximum number of automatic retries |
| enableAutoRetry | boolean | false | Enable automatic retry for recoverable errors |
| onError | function | - | Callback when error is caught |
| onRetry | function | - | Custom retry logic |
| context | string | - | Context for error tracking |
| resetKeys | array | - | Keys that trigger error reset when changed |
| resetOnPropsChange | boolean | false | Reset error when children change |

### ErrorDisplay Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| error | string \| Error | required | The error to display |
| onRetry | function | - | Retry callback |
| title | string | "Something went wrong" | Error title |
| showDetails | boolean | true | Show error message details |
| retryText | string | "Try again" | Text for retry button |
| retryAttempts | number | 0 | Current retry attempt |
| maxRetries | number | 3 | Maximum retries allowed |
| suggestions | string[] | [] | Custom suggestions |

## Best Practices

1. **Wrap at the Right Level**: Place error boundaries at strategic points (pages, features, components)

2. **Provide Context**: Always set the `context` prop for better debugging

3. **Custom Retry Logic**: Implement custom retry logic for specific scenarios:
   ```tsx
   onRetry={async () => {
     // Clear cache
     await clearCache()
     // Refresh auth token
     await refreshToken()
     // Then retry
   }}
   ```

4. **Monitor Errors**: Integrate with error tracking services:
   ```tsx
   onError={(error, errorInfo) => {
     // Send to Sentry, LogRocket, etc.
     Sentry.captureException(error, {
       contexts: { react: errorInfo }
     })
   }}
   ```

5. **User Experience**: Always provide clear actions users can take

6. **Test Error Scenarios**: Test different error types in development

## Integration with Monitoring

The error boundaries are pre-configured to work with:
- **Sentry**: Automatic error capture with context
- **Google Analytics**: Event tracking for errors
- **Local Storage**: Error history for debugging

## Accessibility

- Error messages are announced to screen readers
- All interactive elements are keyboard accessible
- Color is not the only indicator of error state
- Clear focus indicators on retry buttons

## Performance Considerations

- Retry delays use exponential backoff to prevent server overload
- Error history is limited to prevent memory leaks
- Network status checks are debounced
- Component unmounting clears retry timers

## Testing

```tsx
// Test error boundary behavior
it('should retry failed operations', async () => {
  const onRetry = jest.fn()
  const { getByText } = render(
    <ErrorBoundaryWithRetry onRetry={onRetry}>
      <ThrowingComponent />
    </ErrorBoundaryWithRetry>
  )
  
  fireEvent.click(getByText('Try Again'))
  expect(onRetry).toHaveBeenCalled()
})

// Test error display
it('should show appropriate error message', () => {
  const { getByText } = render(
    <ErrorDisplay 
      error={new Error('Network error')}
      onRetry={() => {}}
    />
  )
  
  expect(getByText('Connection Error')).toBeInTheDocument()
})
```

## Migration from Old Error Handling

If you're using the old ErrorBoundary or basic error displays:

1. Replace `ErrorBoundary` with `ErrorBoundaryWithRetry`
2. Add retry props and callbacks
3. Update error displays to use enhanced `ErrorDisplay`
4. Add error type detection for better UX

## Future Enhancements

- Offline queue for failed requests
- Error recovery strategies per error type
- A/B testing different error messages
- Machine learning for error prediction