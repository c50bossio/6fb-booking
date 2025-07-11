'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw, TrendingUp, BarChart } from 'lucide-react'
import { Button } from '../ui/button'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Card, CardContent } from '../ui/card'
import { reportApiError, captureUserFeedback, addUserActionBreadcrumb } from '../../lib/sentry'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
  contextInfo?: {
    analyticsType?: string
    dateRange?: { startDate: string; endDate: string }
    userId?: string
  }
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorCount: number
  sentryEventId?: string
  retryCount: number
  showFeedbackForm: boolean
  feedbackData: {
    name: string
    email: string
    comments: string
  }
}

export class AnalyticsErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = { 
      hasError: false,
      errorCount: 0,
      retryCount: 0,
      showFeedbackForm: false,
      feedbackData: {
        name: '',
        email: '',
        comments: ''
      }
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AnalyticsErrorBoundary caught an error:', error, errorInfo)
    
    // Enhanced error reporting for analytics-specific issues
    const sentryEventId = reportApiError(error, {
      component: 'AnalyticsErrorBoundary',
      analyticsType: this.props.contextInfo?.analyticsType || 'unknown',
      dateRange: this.props.contextInfo?.dateRange,
      userId: this.props.contextInfo?.userId,
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    })
    
    addUserActionBreadcrumb(
      'Analytics error caught by boundary',
      'error',
      {
        analyticsType: this.props.contextInfo?.analyticsType,
        errorMessage: error.message,
        errorStack: error.stack?.substring(0, 1000),
      }
    )
    
    this.setState((prev) => ({ 
      errorInfo,
      errorCount: prev.errorCount + 1,
      sentryEventId
    }))
    
    this.props.onError?.(error, errorInfo)
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
    addUserActionBreadcrumb(
      'Analytics error boundary reset',
      'interaction',
      {
        analyticsType: this.props.contextInfo?.analyticsType,
        errorCount: this.state.errorCount,
        retryCount: this.state.retryCount,
        sentryEventId: this.state.sentryEventId,
      }
    )
    
    this.setState({ 
      hasError: false, 
      error: undefined,
      errorInfo: undefined,
      sentryEventId: undefined,
      showFeedbackForm: false,
      feedbackData: {
        name: '',
        email: '',
        comments: ''
      }
    })
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      addUserActionBreadcrumb(
        'Analytics retry attempt',
        'interaction',
        {
          retryCount: this.state.retryCount + 1,
          maxRetries: this.maxRetries,
          analyticsType: this.props.contextInfo?.analyticsType,
        }
      )
      
      this.setState(prev => ({ 
        retryCount: prev.retryCount + 1 
      }))
      this.resetErrorBoundary()
    } else {
      // Max retries reached, refresh the page
      window.location.reload()
    }
  }

  handleFeedbackSubmit = () => {
    const { feedbackData, sentryEventId } = this.state
    
    if (feedbackData.name && feedbackData.email && feedbackData.comments) {
      captureUserFeedback(feedbackData, sentryEventId)
      
      addUserActionBreadcrumb(
        'Analytics error feedback submitted',
        'interaction',
        {
          analyticsType: this.props.contextInfo?.analyticsType,
          sentryEventId,
          feedbackLength: feedbackData.comments.length,
        }
      )
      
      this.setState({ showFeedbackForm: false })
    }
  }

  updateFeedbackData = (field: keyof State['feedbackData'], value: string) => {
    this.setState(prev => ({
      feedbackData: {
        ...prev.feedbackData,
        [field]: value
      }
    }))
  }

  getAnalyticsErrorMessage = () => {
    const error = this.state.error
    if (!error) return 'An analytics error occurred'

    // Check for specific analytics-related errors
    if (error.message?.toLowerCase().includes('toFixed')) {
      return 'Unable to format numeric data. Some values may be invalid or missing.'
    }
    
    if (error.message?.toLowerCase().includes('chart') || error.message?.toLowerCase().includes('graph')) {
      return 'Chart rendering failed. The data may be corrupted or in an unexpected format.'
    }
    
    if (error.message?.toLowerCase().includes('network') || error.message?.toLowerCase().includes('fetch')) {
      return 'Failed to load analytics data. Please check your connection and try again.'
    }
    
    if (error.message?.toLowerCase().includes('permission') || error.message?.toLowerCase().includes('unauthorized')) {
      return 'You don\'t have permission to view this analytics data.'
    }

    if (error.message?.toLowerCase().includes('date') || error.message?.toLowerCase().includes('time')) {
      return 'Invalid date range or time period. Please adjust your filters and try again.'
    }

    return error.message || 'Analytics dashboard encountered an unexpected error'
  }

  getRecoveryOptions = () => {
    const error = this.state.error
    const options = []

    // Always offer retry if within limits
    if (this.state.retryCount < this.maxRetries) {
      options.push({
        label: `Try Again (${this.maxRetries - this.state.retryCount} attempts left)`,
        action: this.handleRetry,
        variant: 'outline' as const,
        icon: RefreshCw
      })
    }

    // Specific recovery actions based on error type
    if (error?.message?.toLowerCase().includes('date') || error?.message?.toLowerCase().includes('time')) {
      options.push({
        label: 'Reset Date Range',
        action: () => {
          // Reset to default date range and retry
          addUserActionBreadcrumb('Reset date range clicked', 'interaction', {
            analyticsType: this.props.contextInfo?.analyticsType
          })
          this.resetErrorBoundary()
        },
        variant: 'secondary' as const,
        icon: TrendingUp
      })
    }

    // Always offer page reload
    options.push({
      label: 'Reload Page',
      action: () => {
        addUserActionBreadcrumb('Analytics page reload clicked', 'interaction', {
          analyticsType: this.props.contextInfo?.analyticsType
        })
        window.location.reload()
      },
      variant: 'default' as const,
      icon: RefreshCw
    })

    return options
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const errorMessage = this.getAnalyticsErrorMessage()
      const recoveryOptions = this.getRecoveryOptions()

      return (
        <Card className="mx-auto max-w-lg">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <BarChart className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Analytics Dashboard Error
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {errorMessage}
                </p>
                
                {this.props.contextInfo?.analyticsType && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                    Analytics Type: {this.props.contextInfo.analyticsType}
                    {this.props.contextInfo.dateRange && (
                      <span className="ml-2">
                        ({this.props.contextInfo.dateRange.startDate} to {this.props.contextInfo.dateRange.endDate})
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {recoveryOptions.map((option, index) => {
                  const IconComponent = option.icon
                  return (
                    <Button
                      key={index}
                      onClick={option.action}
                      variant={option.variant}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <IconComponent className="h-4 w-4" />
                      {option.label}
                    </Button>
                  )
                })}
              </div>

              {this.state.sentryEventId && !this.state.showFeedbackForm && (
                <Button
                  onClick={() => {
                    addUserActionBreadcrumb(
                      'Analytics feedback form opened',
                      'interaction',
                      { 
                        analyticsType: this.props.contextInfo?.analyticsType,
                        sentryEventId: this.state.sentryEventId 
                      }
                    )
                    this.setState({ showFeedbackForm: true })
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700"
                >
                  Report Analytics Issue
                </Button>
              )}

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="text-left">
                  <summary className="cursor-pointer text-xs font-medium mb-2">
                    Error Details (Development)
                  </summary>
                  <div className="space-y-2">
                    <pre className="text-xs overflow-auto p-2 bg-gray-100 dark:bg-gray-800 rounded max-h-32">
                      {this.state.error?.stack}
                    </pre>
                    <pre className="text-xs overflow-auto p-2 bg-gray-100 dark:bg-gray-800 rounded max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
              )}

              {/* User Feedback Form */}
              {this.state.showFeedbackForm && (
                <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 text-left">
                  <h4 className="text-sm font-medium mb-3">Help us fix this analytics issue</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Your Name</label>
                      <input
                        type="text"
                        className="w-full px-2 py-1 text-sm border rounded"
                        value={this.state.feedbackData.name}
                        onChange={(e) => this.updateFeedbackData('name', e.target.value)}
                        placeholder="Enter your name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Email</label>
                      <input
                        type="email"
                        className="w-full px-2 py-1 text-sm border rounded"
                        value={this.state.feedbackData.email}
                        onChange={(e) => this.updateFeedbackData('email', e.target.value)}
                        placeholder="your.email@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        What analytics were you trying to view?
                      </label>
                      <textarea
                        className="w-full px-2 py-1 text-sm border rounded h-20 resize-none"
                        value={this.state.feedbackData.comments}
                        onChange={(e) => this.updateFeedbackData('comments', e.target.value)}
                        placeholder="Describe what analytics you were viewing and what you expected to see..."
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={() => this.setState({ showFeedbackForm: false })}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={this.handleFeedbackSubmit}
                        size="sm"
                        disabled={!this.state.feedbackData.name || !this.state.feedbackData.email || !this.state.feedbackData.comments}
                      >
                        Send Feedback
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

// HOC for wrapping analytics components
export function withAnalyticsErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  contextInfo?: Props['contextInfo']
) {
  return function AnalyticsErrorBoundaryWrapper(props: P) {
    return (
      <AnalyticsErrorBoundary contextInfo={contextInfo}>
        <Component {...props} />
      </AnalyticsErrorBoundary>
    )
  }
}

// Simplified fallback component for inline use
export function AnalyticsErrorFallback({ 
  error, 
  resetError,
  analyticsType = 'Unknown'
}: { 
  error: Error
  resetError?: () => void
  analyticsType?: string
}) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {analyticsType} Analytics Error
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {error.message || 'Failed to load analytics data'}
          </p>
        </div>
        {resetError && (
          <Button
            size="sm"
            variant="ghost"
            onClick={resetError}
            className="text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}