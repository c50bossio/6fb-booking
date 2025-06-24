'use client'

/**
 * Comprehensive React Error Boundary component
 * Provides graceful error handling with user-friendly UI and reporting capabilities
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { errorManager } from '@/lib/error-handling/error-manager'
import { AppError, SystemError, ErrorSeverity } from '@/lib/error-handling/error-types'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: AppError, errorInfo: ErrorInfo) => void
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
  showErrorDetails?: boolean
  enableReporting?: boolean
  customErrorMessage?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: AppError | null
  errorId: string | null
  retryCount: number
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null
  private previousResetKeys: Array<string | number> = []

  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorId: null,
    retryCount: 0,
  }

  constructor(props: ErrorBoundaryProps) {
    super(props)

    if (props.resetKeys) {
      this.previousResetKeys = [...props.resetKeys]
    }
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Convert to AppError if needed
    const appError = error instanceof Error
      ? new SystemError(error.message, { originalError: error })
      : new SystemError('Unknown error occurred')

    return {
      hasError: true,
      error: appError,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }
  }

  public async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    try {
      // Handle error through error manager
      const appError = await errorManager.handleError(error, {
        action: 'React Error Boundary',
        metadata: {
          componentStack: errorInfo.componentStack,
          errorBoundary: this.constructor.name,
          retryCount: this.state.retryCount,
        },
      })

      // Update state with processed error
      this.setState({ error: appError })

      // Call custom error handler if provided
      if (this.props.onError) {
        this.props.onError(appError, errorInfo)
      }

      // Log error details
      console.error('ErrorBoundary caught an error:', {
        error: appError,
        errorInfo,
        errorId: this.state.errorId,
      })

    } catch (processingError) {
      console.error('Error processing caught error:', processingError)
    }
  }

  public componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError } = this.state

    // Reset error state if resetKeys changed
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => prevProps.resetKeys![index] !== key
      )

      if (hasResetKeyChanged) {
        this.resetErrorBoundary()
      }
    }

    // Reset if any props changed and resetOnPropsChange is true
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary()
    }
  }

  public componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  private resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }

    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
    })
  }

  private handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1

    // Limit retry attempts
    if (newRetryCount > 3) {
      console.warn('Maximum retry attempts reached')
      return
    }

    this.setState({
      hasError: false,
      error: null,
      retryCount: newRetryCount,
    })

    // Auto-reset after a delay to prevent infinite retry loops
    this.resetTimeoutId = window.setTimeout(() => {
      if (this.state.hasError) {
        this.resetErrorBoundary()
      }
    }, 5000)
  }

  private handleRefresh = () => {
    window.location.reload()
  }

  private getSeverityColor(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.INFO:
        return 'blue'
      case ErrorSeverity.WARNING:
        return 'yellow'
      case ErrorSeverity.ERROR:
        return 'red'
      case ErrorSeverity.CRITICAL:
        return 'red'
      default:
        return 'gray'
    }
  }

  private renderErrorIcon(severity: ErrorSeverity) {
    const color = this.getSeverityColor(severity)
    const colorClass = `text-${color}-400`

    if (severity === ErrorSeverity.CRITICAL) {
      return (
        <svg className={`h-6 w-6 ${colorClass}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    }

    return (
      <svg className={`h-5 w-5 ${colorClass}`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    )
  }

  private renderRecoverySuggestions() {
    if (!this.state.error) return null

    const suggestions = errorManager.getRecoverySuggestions(this.state.error)

    if (suggestions.length === 0) return null

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          What you can try:
        </h4>
        <ul className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start">
              <span className="flex-shrink-0 h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 mr-3" />
              <div className="flex-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {suggestion.message}
                </span>
                {suggestion.action && suggestion.actionLabel && (
                  <button
                    onClick={suggestion.action}
                    className="ml-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                  >
                    {suggestion.actionLabel}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  public render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const error = this.state.error
      const color = this.getSeverityColor(error.severity)
      const userMessage = this.props.customErrorMessage || errorManager.getUserMessage(error)
      const showDetails = this.props.showErrorDetails ?? (process.env.NODE_ENV === 'development')

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-lg w-full">
            <div className={`bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-200 dark:border-${color}-800 rounded-lg p-6`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {this.renderErrorIcon(error.severity)}
                </div>
                <div className="ml-3 flex-1">
                  <h3 className={`text-lg font-medium text-${color}-800 dark:text-${color}-300`}>
                    {error.severity === ErrorSeverity.CRITICAL ? 'Critical Error' : 'Something went wrong'}
                  </h3>

                  <div className={`mt-2 text-sm text-${color}-700 dark:text-${color}-400`}>
                    {userMessage}
                  </div>

                  {this.state.errorId && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Error ID: {this.state.errorId}
                    </div>
                  )}

                  {this.renderRecoverySuggestions()}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                disabled={this.state.retryCount >= 3}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again {this.state.retryCount > 0 && `(${this.state.retryCount}/3)`}
              </button>

              <button
                onClick={this.handleRefresh}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Page
              </button>
            </div>

            {/* Error details for development */}
            {showDetails && (
              <details className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <summary className="cursor-pointer font-medium text-gray-900 dark:text-white text-sm">
                  Technical Details
                </summary>
                <div className="mt-3 space-y-2 text-xs">
                  <div>
                    <strong className="text-gray-900 dark:text-white">Error Code:</strong>
                    <span className="ml-1 text-gray-600 dark:text-gray-400">{error.code}</span>
                  </div>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Severity:</strong>
                    <span className="ml-1 text-gray-600 dark:text-gray-400">{error.severity}</span>
                  </div>
                  {error.context?.timestamp && (
                    <div>
                      <strong className="text-gray-900 dark:text-white">Timestamp:</strong>
                      <span className="ml-1 text-gray-600 dark:text-gray-400">
                        {error.context.timestamp.toISOString()}
                      </span>
                    </div>
                  )}
                  {error.stack && (
                    <div>
                      <strong className="text-gray-900 dark:text-white">Stack Trace:</strong>
                      <pre className="mt-1 whitespace-pre-wrap text-red-600 dark:text-red-400 bg-white dark:bg-gray-900 p-2 rounded text-xs overflow-x-auto">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
