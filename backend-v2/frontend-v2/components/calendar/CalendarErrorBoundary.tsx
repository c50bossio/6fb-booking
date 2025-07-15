'use client'

import React, { Component, ReactNode, useCallback } from 'react'
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/card'
import type { CalendarError } from '@/types/calendar'
import { retryWithBackoff, isOnline } from '@/lib/RetryManager'

// Enhanced error reporting hook
export function useCalendarErrorReporting() {
  const reportError = useCallback((error: any, context?: Record<string, any>) => {
    // Enhanced error object
    const calendarError: CalendarError = {
      name: error.name || 'CalendarError',
      message: error.message || 'Unknown calendar error',
      code: error.code || error.errorCode || 'UNKNOWN_ERROR',
      errorCode: error.errorCode || 'UNKNOWN_ERROR',
      recoverable: error.recoverable !== false,
      timestamp: new Date(),
      context: {
        ...context,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        pathname: window.location.pathname,
        currentView: context?.view || 'unknown'
      }
    }
    
    // Send to monitoring service
    if (typeof window !== 'undefined') {
      // Sentry
      if ((window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          tags: {
            section: 'calendar',
            errorCode: calendarError.errorCode,
            recoverable: calendarError.recoverable
          },
          contexts: {
            calendar: calendarError.context
          }
        })
      }
      
      // Custom analytics
      if ((window as any).gtag) {
        (window as any).gtag('event', 'exception', {
          description: calendarError.message,
          fatal: false,
          custom_map: {
            error_code: calendarError.errorCode,
            calendar_context: JSON.stringify(calendarError.context)
          }
        })
      }
      
      // Local storage for offline reporting
      try {
        const errorLog = localStorage.getItem('calendar_errors') || '[]'
        const errors = JSON.parse(errorLog)
        errors.push({
          ...calendarError,
          stack: error.stack
        })
        
        // Keep only last 20 errors
        if (errors.length > 20) {
          errors.splice(0, errors.length - 20)
        }
        
        localStorage.setItem('calendar_errors', JSON.stringify(errors))
      } catch (storageError) {
        console.warn('Failed to store error locally:', storageError)
      }
    }
    
    return calendarError
  }, [])
  
  return { reportError }
}

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: CalendarError, errorInfo: React.ErrorInfo) => void
  context?: string
}

interface State {
  hasError: boolean
  error: CalendarError | null
  errorId: string
  retryCount: number
  isRetrying: boolean
  lastRetryTime: number
}

export class CalendarErrorBoundary extends Component<Props, State> {
  private maxRetries = 3
  
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: '',
      retryCount: 0,
      isRetrying: false,
      lastRetryTime: 0
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate unique error ID for tracking
    const errorId = `cal-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Transform generic error to CalendarError
    const calendarError: CalendarError = {
      name: error.name || 'CalendarError',
      message: error.message || 'An error occurred in the calendar',
      code: error.name || 'CALENDAR_ERROR',
      errorCode: error.name || 'CALENDAR_ERROR',
      timestamp: new Date(),
      context: { timestamp: new Date().toISOString() },
      recoverable: true,
      stack: error.stack
    }

    return {
      hasError: true,
      error: calendarError,
      errorId,
      retryCount: 0,
      isRetrying: false,
      lastRetryTime: Date.now()
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('Calendar Error Boundary caught an error:', {
      error,
      errorInfo,
      context: this.props.context,
      errorId: this.state.errorId
    })

    // Call custom error handler if provided
    if (this.props.onError && this.state.error) {
      this.props.onError(this.state.error, errorInfo)
    }

      // Send error to monitoring service (if available)
    this.sendErrorToMonitoring(error, errorInfo)
    
    // Auto-retry for recoverable errors
    if (this.state.error?.recoverable && this.state.retryCount < this.maxRetries) {
      console.log(`Attempting auto-retry ${this.state.retryCount + 1}/${this.maxRetries}`)
      setTimeout(() => {
        this.handleRetry()
      }, Math.pow(2, this.state.retryCount) * 1000) // Exponential backoff
    }
  }

  private sendErrorToMonitoring = (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      // You can integrate with Sentry, LogRocket, or other monitoring services here
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack
            }
          },
          tags: {
            section: 'calendar',
            context: this.props.context,
            errorId: this.state.errorId
          }
        })
      }
    } catch (monitoringError) {
      console.warn('Failed to send error to monitoring service:', monitoringError)
    }
  }

  private handleRetry = async () => {
    if (this.state.retryCount < this.maxRetries && !this.state.isRetrying) {
      // Check network status first
      if (!isOnline()) {
        // Update error message to indicate offline status
        this.setState(prevState => ({
          error: prevState.error ? {
            ...prevState.error,
            message: 'No internet connection. Please check your network and try again.',
            code: 'NETWORK_ERROR',
            errorCode: 'NETWORK_ERROR'
          } : null
        }))
        return
      }

      this.setState({ isRetrying: true })

      // Use exponential backoff for retry
      const result = await retryWithBackoff(
        async () => {
          // Simulate component remount by clearing error state
          return new Promise<void>((resolve) => {
            this.setState(prevState => ({
              hasError: false,
              error: null,
              errorId: '',
              retryCount: prevState.retryCount + 1,
              isRetrying: false
            }), () => resolve())
          })
        },
        {
          maxRetries: 1, // Single attempt since we're managing retries at component level
          initialDelay: Math.min(1000 * Math.pow(2, this.state.retryCount), 10000),
          onRetry: (error, attemptNumber) => {
            console.log(`Retrying calendar mount (attempt ${this.state.retryCount + 1}/${this.maxRetries})`)
          }
        }
      )

      if (!result.success) {
        this.setState({ isRetrying: false })
        
        if (this.state.retryCount >= this.maxRetries - 1) {
          // Force page reload as last resort
          window.location.reload()
        }
      }
    } else if (this.state.retryCount >= this.maxRetries) {
      // Force page reload as last resort
      window.location.reload()
    }
  }

  private handleReload = () => {
    window.location.reload()
  }

  private getErrorMessage = (error: CalendarError | null): string => {
    if (!error) return 'An unknown error occurred'

    // Check if offline
    if (!isOnline()) {
      return 'You are currently offline. Please check your internet connection and try again.'
    }

    // Provide user-friendly error messages
    switch (error.code || error.errorCode) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to the server. Please check your internet connection.'
      case 'TIMEOUT_ERROR':
        return 'The request took too long to complete. Please try again.'
      case 'AUTH_ERROR':
        return 'Your session has expired. Please refresh the page and log in again.'
      case 'VALIDATION_ERROR':
        return 'Invalid appointment data. Please check your input and try again.'
      case 'PERMISSION_ERROR':
        return 'You do not have permission to perform this action.'
      case 'CALENDAR_SYNC_ERROR':
        return 'Calendar synchronization failed. Your changes may not be saved.'
      case 'APPOINTMENT_CONFLICT':
        return 'A scheduling conflict was detected. Please choose a different time.'
      case 'SERVER_ERROR':
        return 'The server encountered an error. Please try again later.'
      case 'RATE_LIMIT_ERROR':
        return 'Too many requests. Please wait a moment before trying again.'
      default:
        return error.message || 'Something went wrong with the calendar'
    }
  }

  private getRecoveryActions = (error: CalendarError | null) => {
    if (!error) return null

    const canRetry = this.state.retryCount < this.maxRetries && error.recoverable !== false
    const isOffline = !isOnline()
    
    return (
      <div className="flex gap-3 justify-center">
        {canRetry && (
          <Button
            onClick={this.handleRetry}
            variant="outline"
            className="flex items-center gap-2"
            disabled={this.state.isRetrying}
          >
            {this.state.isRetrying ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <ArrowPathIcon className="w-4 h-4" />
                Try Again ({this.maxRetries - this.state.retryCount} left)
              </>
            )}
          </Button>
        )}
        <Button
          onClick={this.handleReload}
          className="flex items-center gap-2"
          disabled={this.state.isRetrying}
        >
          <ArrowPathIcon className="w-4 h-4" />
          Reload Page
        </Button>
      </div>
    )
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <Card className="p-8 text-center max-w-md mx-auto mt-8">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Calendar Error
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {this.getErrorMessage(this.state.error)}
              </p>
              
              {/* Network status indicator */}
              {!isOnline() && (
                <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 mb-4">
                  <div className="w-2 h-2 bg-amber-600 dark:bg-amber-400 rounded-full animate-pulse" />
                  <span className="text-xs font-medium">Offline</span>
                </div>
              )}
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-xs text-left bg-gray-100 dark:bg-gray-800 p-3 rounded mb-4">
                  <summary className="cursor-pointer font-medium mb-2">
                    Error Details (Dev Mode)
                  </summary>
                  <pre className="whitespace-pre-wrap font-mono text-xs">
                    {this.state.error.stack || this.state.error.message}
                  </pre>
                  <p className="mt-2 text-gray-500">
                    Error ID: {this.state.errorId}
                  </p>
                </details>
              )}
            </div>

            {this.getRecoveryActions(this.state.error)}
          </div>
        </Card>
      )
    }

    return this.props.children
  }
}

// Convenience HOC for wrapping components
export function withCalendarErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  context?: string
) {
  return function CalendarErrorBoundaryWrapper(props: P) {
    return (
      <CalendarErrorBoundary context={context}>
        <Component {...props} />
      </CalendarErrorBoundary>
    )
  }
}

// Fallback component for simpler error displays
export interface CalendarErrorFallbackProps {
  error: Error | CalendarError
  resetError?: () => void
  className?: string
}

export function CalendarErrorFallback({ 
  error, 
  resetError,
  className = ''
}: CalendarErrorFallbackProps) {
  const [retryCount, setRetryCount] = React.useState(0)
  const [isRetrying, setIsRetrying] = React.useState(false)
  const maxRetries = 3

  const handleRetry = async () => {
    if (retryCount < maxRetries && !isRetrying) {
      setIsRetrying(true)
      
      // Wait with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
      await new Promise(resolve => setTimeout(resolve, delay))
      
      setRetryCount(prev => prev + 1)
      setIsRetrying(false)
      
      if (resetError) {
        resetError()
      }
    }
  }

  const getErrorMessage = () => {
    if ('code' in error || 'errorCode' in error) {
      const errorCode = (error as any).code || (error as any).errorCode
      switch (errorCode) {
        case 'NETWORK_ERROR':
          return 'Network connection issue'
        case 'TIMEOUT_ERROR':
          return 'Request timed out'
        case 'AUTH_ERROR':
          return 'Authentication required'
        default:
          return error.message || 'Calendar error'
      }
    }
    return error.message || 'An error occurred'
  }

  return (
    <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {getErrorMessage()}
          </p>
          {!isOnline() && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Check your internet connection
            </p>
          )}
        </div>
        {resetError && retryCount < maxRetries && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRetry}
            disabled={isRetrying}
            className="text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200"
          >
            {isRetrying ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              'Retry'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}