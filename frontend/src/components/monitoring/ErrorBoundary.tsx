/**
 * Enhanced React Error Boundary with error reporting
 */
import React, { Component, ErrorInfo, ReactNode } from 'react'
import { errorTracker, ErrorBoundary as ErrorBoundaryError } from '@/lib/monitoring/errorTracking'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showErrorDetails?: boolean
  component?: string
  feature?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorId: string | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { component = 'Unknown', feature, onError } = this.props

    // Create enhanced error for reporting
    const enhancedError = new ErrorBoundaryError(
      `React Error Boundary: ${error.message}`,
      component,
      error
    )

    // Report error with context
    const errorId = errorTracker.captureError(enhancedError, {
      category: 'ui',
      severity: 'high',
      context: {
        component,
        feature,
        action: 'component_error'
      },
      tags: ['react_error_boundary', 'component_crash'],
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: component,
        retryCount: this.state.retryCount,
        originalError: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      }
    })

    this.setState({
      errorId,
      errorInfo
    })

    // Call custom error handler if provided
    onError?.(error, errorInfo)
  }

  handleRetry = () => {
    const { retryCount } = this.state
    
    if (retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorId: null,
        errorInfo: null,
        retryCount: retryCount + 1
      })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      errorInfo: null,
      retryCount: 0
    })
  }

  handleReportIssue = () => {
    const { error, errorInfo, errorId } = this.state
    const { component = 'Unknown' } = this.props

    if (error && errorInfo) {
      // Create detailed error report
      const reportData = {
        errorId,
        component,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }

      // Copy to clipboard for user to share
      if (navigator.clipboard) {
        navigator.clipboard.writeText(JSON.stringify(reportData, null, 2))
          .then(() => {
            alert('Error details copied to clipboard. Please share this with our support team.')
          })
          .catch(() => {
            console.error('Failed to copy error details')
          })
      }
    }
  }

  render() {
    const { hasError, error, errorId, retryCount } = this.state
    const { children, fallback, showErrorDetails = false, component = 'Component' } = this.props

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg p-6 shadow-lg">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Something went wrong
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {component} encountered an unexpected error
                  </p>
                </div>
              </div>

              {showErrorDetails && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                  <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                    Error: {error.name}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {error.message}
                  </p>
                  {errorId && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      Error ID: {errorId}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {retryCount < this.maxRetries && (
                  <button
                    onClick={this.handleRetry}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-[#20D9D2] hover:bg-[#1BC5B8] text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#20D9D2]/20"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Try Again ({this.maxRetries - retryCount} left)</span>
                  </button>
                )}

                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500/20"
                >
                  <Home className="h-4 w-4" />
                  <span>Go Home</span>
                </button>

                <button
                  onClick={this.handleReportIssue}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <Bug className="h-4 w-4" />
                  <span>Report Issue</span>
                </button>
              </div>

              {retryCount >= this.maxRetries && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Maximum retry attempts reached. Please refresh the page or contact support if the problem persists.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 underline hover:no-underline"
                  >
                    Refresh Page
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    return children
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Partial<Props>
) {
  const ComponentWithErrorBoundary = (props: P) => {
    return (
      <ErrorBoundary
        component={WrappedComponent.displayName || WrappedComponent.name}
        {...errorBoundaryProps}
      >
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name
  })`

  return ComponentWithErrorBoundary
}

// Hook for manually reporting errors within components
export function useErrorBoundary() {
  const reportError = (error: Error, context?: any) => {
    // Trigger error boundary by throwing
    setTimeout(() => {
      throw error
    }, 0)
  }

  return { reportError }
}

export default ErrorBoundary