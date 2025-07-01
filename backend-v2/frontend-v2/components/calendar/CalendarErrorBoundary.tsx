'use client'

import React, { Component, ReactNode } from 'react'
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { CalendarError } from '@/types/calendar'

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
}

export class CalendarErrorBoundary extends Component<Props, State> {
  private maxRetries = 3
  
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: '',
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate unique error ID for tracking
    const errorId = `cal-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Transform generic error to CalendarError
    const calendarError: CalendarError = {
      ...error,
      code: error.name || 'CALENDAR_ERROR',
      context: { timestamp: new Date().toISOString() },
      recoverable: true
    }

    return {
      hasError: true,
      error: calendarError,
      errorId,
      retryCount: 0
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

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorId: '',
        retryCount: prevState.retryCount + 1
      }))
    } else {
      // Force page reload as last resort
      window.location.reload()
    }
  }

  private handleReload = () => {
    window.location.reload()
  }

  private getErrorMessage = (error: CalendarError | null): string => {
    if (!error) return 'An unknown error occurred'

    // Provide user-friendly error messages
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to the server. Please check your internet connection.'
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
      default:
        return error.message || 'Something went wrong with the calendar'
    }
  }

  private getRecoveryActions = (error: CalendarError | null) => {
    if (!error) return null

    const canRetry = this.state.retryCount < this.maxRetries && error.recoverable !== false
    
    return (
      <div className="flex gap-3 justify-center">
        {canRetry && (
          <Button
            onClick={this.handleRetry}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Try Again ({this.maxRetries - this.state.retryCount} left)
          </Button>
        )}
        <Button
          onClick={this.handleReload}
          className="flex items-center gap-2"
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

// Hook for manual error reporting
export function useCalendarErrorReporting() {
  const reportError = (error: Error, context?: Record<string, any>) => {
    const calendarError: CalendarError = {
      ...error,
      code: error.name || 'MANUAL_ERROR',
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      },
      recoverable: true
    }

    console.error('Manual calendar error reported:', calendarError)
    
    // Send to monitoring service
    try {
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          tags: {
            section: 'calendar',
            type: 'manual'
          },
          extra: context
        })
      }
    } catch (monitoringError) {
      console.warn('Failed to send manual error to monitoring:', monitoringError)
    }
  }

  return { reportError }
}