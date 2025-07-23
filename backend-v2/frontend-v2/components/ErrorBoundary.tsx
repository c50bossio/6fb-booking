'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw, Home, MessageSquare } from 'lucide-react'
import { Button } from './ui/button'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Sentry } from '../lib/sentry'
import { reportApiError, captureUserFeedback, addUserActionBreadcrumb } from '../lib/sentry'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
  feature?: string // For Sentry context
  userId?: string // For user context in errors
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorCount: number
  sentryEventId?: string
  showFeedbackForm: boolean
  feedbackData: {
    name: string
    email: string
    comments: string
  }
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { 
      hasError: false,
      errorCount: 0,
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
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Capture the error with Sentry and get the event ID
    let sentryEventId: string | undefined
    
    Sentry.withScope((scope) => {
      // Add context about the error boundary
      scope.setTag('errorBoundary', true)
      scope.setTag('errorBoundary.feature', this.props.feature || 'unknown')
      
      // Add component stack and additional context
      scope.setContext('errorBoundary', {
        componentStack: errorInfo.componentStack,
        feature: this.props.feature,
        userId: this.props.userId,
        errorCount: this.state.errorCount + 1,
        timestamp: new Date().toISOString(),
      })
      
      // Add breadcrumb for the error
      addUserActionBreadcrumb(
        'Error caught by boundary',
        'interaction',
        {
          feature: this.props.feature,
          errorMessage: error.message,
          errorStack: error.stack?.substring(0, 1000), // First 1000 chars
        }
      )
      
      sentryEventId = Sentry.captureException(error)
    })
    
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
    // Add breadcrumb for error boundary reset
    addUserActionBreadcrumb(
      'Error boundary reset',
      'interaction',
      {
        feature: this.props.feature,
        errorCount: this.state.errorCount,
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

  handleFeedbackSubmit = () => {
    const { feedbackData, sentryEventId } = this.state
    
    if (feedbackData.name && feedbackData.email && feedbackData.comments) {
      captureUserFeedback(feedbackData, sentryEventId)
      
      addUserActionBreadcrumb(
        'User feedback submitted',
        'interaction',
        {
          feature: this.props.feature,
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
            
            <div className="flex gap-2 justify-center flex-wrap">
              <Button 
                onClick={() => {
                  addUserActionBreadcrumb(
                    isChunkLoadError ? 'Page reload clicked' : 'Try again clicked',
                    'interaction',
                    { feature: this.props.feature }
                  )
                  
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
                onClick={() => {
                  addUserActionBreadcrumb(
                    'Go home clicked',
                    'navigation',
                    { feature: this.props.feature }
                  )
                  window.location.href = '/'
                }}
                variant="outline"
                size="sm"
              >
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
              {this.state.sentryEventId && !this.state.showFeedbackForm && (
                <Button
                  onClick={() => {
                    addUserActionBreadcrumb(
                      'Feedback form opened',
                      'interaction',
                      { feature: this.props.feature, sentryEventId: this.state.sentryEventId }
                    )
                    this.setState({ showFeedbackForm: true })
                  }}
                  variant="outline"
                  size="sm"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Report Issue
                </Button>
              )}
            </div>
            
            {this.state.errorCount > 2 && (
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                This error has occurred {this.state.errorCount} times. 
                Consider contacting support if the issue persists.
              </p>
            )}

            {/* User Feedback Form */}
            {this.state.showFeedbackForm && (
              <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <h3 className="text-sm font-medium mb-3">Help us fix this issue</h3>
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
                      What were you trying to do when this error occurred?
                    </label>
                    <textarea
                      className="w-full px-2 py-1 text-sm border rounded h-20 resize-none"
                      value={this.state.feedbackData.comments}
                      onChange={(e) => this.updateFeedbackData('comments', e.target.value)}
                      placeholder="Describe what happened and what you expected to happen..."
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