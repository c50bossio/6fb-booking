/**
 * Touch Error Boundary
 * Provides graceful degradation for touch interaction components
 */

'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { AlertTriangleIcon, RefreshCwIcon } from '@heroicons/react/24/outline'

interface TouchErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
  isRetrying: boolean
}

interface TouchErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  maxRetries?: number
  enableFallbackInteraction?: boolean
  className?: string
}

export class TouchErrorBoundary extends Component<TouchErrorBoundaryProps, TouchErrorBoundaryState> {
  private retryTimeout: NodeJS.Timeout | null = null

  constructor(props: TouchErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<TouchErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Touch component error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Report error to monitoring service
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        tags: {
          component: 'TouchErrorBoundary',
          touchSystem: true
        },
        extra: {
          errorInfo,
          retryCount: this.state.retryCount
        }
      })
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props
    
    if (this.state.retryCount >= maxRetries) {
      console.warn('Max retry attempts reached for touch component')
      return
    }

    this.setState({ 
      isRetrying: true,
      retryCount: this.state.retryCount + 1
    })

    // Add delay before retry to avoid rapid failure loops
    this.retryTimeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false
      })
    }, 1000)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    })
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }
  }

  render() {
    const { children, fallback, enableFallbackInteraction = true, className = '' } = this.props
    const { hasError, error, retryCount, isRetrying } = this.state

    if (hasError) {
      // Custom fallback provided
      if (fallback) {
        return fallback
      }

      // Default error UI with graceful degradation
      return (
        <div className={`touch-error-boundary ${className}`}>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-red-800">
                  Touch Interaction Error
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  The touch interface encountered an error. You can still interact using mouse/keyboard.
                </p>
                
                {error && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                      Technical Details
                    </summary>
                    <pre className="mt-1 text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto max-h-32">
                      {error.message}
                    </pre>
                  </details>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {retryCount < 3 && (
                    <button
                      onClick={this.handleRetry}
                      disabled={isRetrying}
                      className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-medium text-red-800 bg-red-100 hover:bg-red-200 rounded border border-red-300 disabled:opacity-50"
                    >
                      <RefreshCwIcon className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                      <span>{isRetrying ? 'Retrying...' : 'Retry Touch'}</span>
                    </button>
                  )}
                  
                  <button
                    onClick={this.handleReset}
                    className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                  >
                    Reset Component
                  </button>
                </div>

                {enableFallbackInteraction && (
                  <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs text-blue-800">
                      <strong>Fallback Mode:</strong> Use mouse clicks, keyboard navigation (Tab, Enter, Arrow keys), 
                      or right-click for context menus.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return children
  }
}

// Higher-order component for easy wrapping
export function withTouchErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<TouchErrorBoundaryProps, 'children'>
) {
  const WithTouchErrorBoundaryComponent = (props: P) => (
    <TouchErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </TouchErrorBoundary>
  )

  WithTouchErrorBoundaryComponent.displayName = `withTouchErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return WithTouchErrorBoundaryComponent
}

// Hook for programmatic error boundary interaction
export function useTouchErrorBoundary() {
  const [errorBoundaryKey, setErrorBoundaryKey] = React.useState(0)

  const resetErrorBoundary = React.useCallback(() => {
    setErrorBoundaryKey(prev => prev + 1)
  }, [])

  return {
    resetErrorBoundary,
    errorBoundaryKey
  }
}

// Touch-specific error boundary for calendar components
export function CalendarTouchErrorBoundary({ 
  children, 
  onError 
}: { 
  children: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void 
}) {
  return (
    <TouchErrorBoundary
      onError={onError}
      maxRetries={2}
      enableFallbackInteraction={true}
      className="calendar-touch-error-boundary"
      fallback={
        <div className="calendar-touch-fallback p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangleIcon className="w-5 h-5 text-yellow-600" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">
                Touch interactions temporarily unavailable
              </h4>
              <p className="text-xs text-yellow-700 mt-1">
                Calendar is still fully functional using mouse and keyboard.
              </p>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </TouchErrorBoundary>
  )
}

export default TouchErrorBoundary