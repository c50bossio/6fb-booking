'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from './ui/Button'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { 
      hasError: false,
      errorCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState((prev) => ({ 
      errorInfo,
      errorCount: prev.errorCount + 1
    }))
    this.props.onError?.(error, errorInfo)
    
    // Log to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Add error tracking service integration (e.g., Sentry)
      console.error('Production error:', {
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      })
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError } = this.state
    
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary()
    }
    
    if (hasError && resetKeys && resetKeys.some((key, idx) => key !== prevProps.resetKeys?.[idx])) {
      this.resetErrorBoundary()
    }
  }

  resetErrorBoundary = () => {
    this.setState({ 
      hasError: false, 
      error: undefined,
      errorInfo: undefined
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isNetworkError = this.state.error?.message?.toLowerCase().includes('network') ||
                           this.state.error?.message?.toLowerCase().includes('fetch')
      
      const isChunkLoadError = this.state.error?.message?.toLowerCase().includes('chunk') ||
                              this.state.error?.message?.toLowerCase().includes('loading css chunk')

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive" className="border-red-200 dark:border-red-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {isNetworkError ? 'Connection Error' : 
                 isChunkLoadError ? 'Loading Error' : 
                 'Something went wrong'}
              </AlertTitle>
              <AlertDescription className="mt-2">
                <p className="text-sm">
                  {isNetworkError ? 
                    'Unable to connect to the server. Please check your internet connection.' :
                   isChunkLoadError ?
                    'Failed to load application resources. This can happen after an update.' :
                   this.state.error?.message || 'An unexpected error occurred'}
                </p>
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs font-medium">
                      Error details
                    </summary>
                    <div className="mt-2 space-y-2">
                      <pre className="text-xs overflow-auto p-2 bg-gray-100 dark:bg-gray-800 rounded max-h-48">
                        {this.state.error?.stack}
                      </pre>
                      <pre className="text-xs overflow-auto p-2 bg-gray-100 dark:bg-gray-800 rounded max-h-48">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  </details>
                )}
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={() => {
                  if (isChunkLoadError) {
                    window.location.reload()
                  } else {
                    this.resetErrorBoundary()
                  }
                }}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {isChunkLoadError ? 'Reload Page' : 'Try Again'}
              </Button>
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                size="sm"
              >
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </div>
            
            {this.state.errorCount > 2 && (
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                This error has occurred {this.state.errorCount} times. 
                Consider contacting support if the issue persists.
              </p>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Functional component wrapper for easier use
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}