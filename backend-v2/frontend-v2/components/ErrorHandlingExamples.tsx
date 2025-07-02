'use client'

import React, { useState } from 'react'
import { ErrorBoundaryWithRetry, withEnhancedErrorBoundary, useErrorHandler } from './ErrorBoundaryWithRetry'
import { ErrorDisplay } from './LoadingStates'
import { Button } from './ui/Button'

// Example 1: Basic usage with ErrorBoundaryWithRetry
export function BasicErrorBoundaryExample() {
  return (
    <ErrorBoundaryWithRetry
      maxRetries={3}
      enableAutoRetry={true}
      context="BasicExample"
    >
      <ComponentThatMightError />
    </ErrorBoundaryWithRetry>
  )
}

// Example 2: Using the HOC approach
const EnhancedComponent = withEnhancedErrorBoundary(
  ComponentThatMightError,
  {
    maxRetries: 5,
    enableAutoRetry: true,
    onError: (error, errorInfo) => {
      console.log('Error caught:', error)
      // Send to analytics or monitoring service
    }
  }
)

// Example 3: Using ErrorDisplay for local error states
export function LocalErrorHandlingExample() {
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchData = async () => {
    try {
      setError(null)
      // Simulated API call
      const response = await fetch('/api/data')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      // Process data...
    } catch (err) {
      setError(err as Error)
    }
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    fetchData()
  }

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={handleRetry}
        retryAttempts={retryCount}
        maxRetries={3}
        suggestions={[
          'Check your internet connection',
          'Verify the API endpoint is correct',
          'Try again in a few moments'
        ]}
      />
    )
  }

  return (
    <div>
      <Button onClick={fetchData}>Fetch Data</Button>
    </div>
  )
}

// Example 4: Using the useErrorHandler hook
export function HookBasedErrorHandling() {
  const { captureError, resetError } = useErrorHandler()
  const [isLoading, setIsLoading] = useState(false)

  const handleAsyncOperation = async () => {
    try {
      setIsLoading(true)
      // Simulated async operation
      const result = await performRiskyOperation()
      console.log('Success:', result)
    } catch (error) {
      // This will throw the error to the nearest error boundary
      captureError(error as Error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <Button onClick={handleAsyncOperation} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Perform Operation'}
      </Button>
    </div>
  )
}

// Example 5: Custom error boundary with specific error handling
export function CustomErrorBoundaryExample() {
  return (
    <ErrorBoundaryWithRetry
      maxRetries={3}
      enableAutoRetry={true}
      onRetry={async () => {
        // Custom retry logic
        console.log('Performing custom retry...')
        // Could refresh auth tokens, clear cache, etc.
        await new Promise(resolve => setTimeout(resolve, 1000))
      }}
      onError={(error, errorInfo) => {
        // Custom error handling
        if (error.type === 'auth') {
          // Redirect to login
          window.location.href = '/login'
        } else if (error.type === 'payment') {
          // Show payment error modal
          console.error('Payment error:', error)
        }
      }}
    >
      <YourAppContent />
    </ErrorBoundaryWithRetry>
  )
}

// Helper components for examples
function ComponentThatMightError() {
  const [shouldError, setShouldError] = useState(false)

  if (shouldError) {
    throw new Error('This is a simulated error for demonstration')
  }

  return (
    <div className="p-4 border rounded">
      <h3 className="font-medium mb-2">Component That Might Error</h3>
      <Button onClick={() => setShouldError(true)} variant="destructive">
        Trigger Error
      </Button>
    </div>
  )
}

async function performRiskyOperation() {
  // Simulate a 50% chance of failure
  if (Math.random() > 0.5) {
    throw new Error('Operation failed randomly')
  }
  return { success: true, data: 'Operation completed' }
}

function YourAppContent() {
  return (
    <div className="p-4">
      <h2 className="text-lg font-medium">Your Application Content</h2>
      <p>This content is wrapped in an error boundary.</p>
    </div>
  )
}

// Usage in pages/components:
/*

// In your layout or page component:
import { ErrorBoundaryWithRetry } from '@/components/ErrorBoundaryWithRetry'

export default function DashboardLayout({ children }) {
  return (
    <ErrorBoundaryWithRetry
      maxRetries={3}
      enableAutoRetry={true}
      context="Dashboard"
    >
      {children}
    </ErrorBoundaryWithRetry>
  )
}

// For specific components that might fail:
import { withEnhancedErrorBoundary } from '@/components/ErrorBoundaryWithRetry'

const CalendarWithErrorBoundary = withEnhancedErrorBoundary(
  CalendarComponent,
  {
    maxRetries: 5,
    enableAutoRetry: true,
    context: "Calendar"
  }
)

// For handling API errors in components:
import { ErrorDisplay } from '@/components/LoadingStates'

function MyComponent() {
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  
  const loadData = async () => {
    try {
      const data = await fetchData()
      // Process data
    } catch (err) {
      setError(err)
    }
  }
  
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => {
          setRetryCount(prev => prev + 1)
          loadData()
        }}
        retryAttempts={retryCount}
        maxRetries={3}
      />
    )
  }
  
  // Normal component render
}

*/