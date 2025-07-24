'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw, Home, MessageSquare, WifiOff, Server, Clock, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Sentry } from '../lib/sentry'
import { reportApiError, captureUserFeedback, addUserActionBreadcrumb } from '../lib/sentry'
import { 
  errorMonitoring, 
  ErrorCategory, 
  ErrorSeverity, 
  setUserContext 
} from '../lib/error-monitoring'
// import { 
//   announceErrorBoundaryActivation, 
//   formatErrorForScreenReader,
//   liveRegionManager
// } from '../lib/accessibility'
import { toastError } from '../hooks/use-toast'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
  feature?: string // For Sentry context
  userId?: string // For user context in errors
  enableRetry?: boolean // Enable automatic retry functionality
  maxRetries?: number // Maximum number of automatic retries
  retryDelay?: number // Delay between retries in milliseconds
  enableOfflineDetection?: boolean // Enable offline/online detection
  showDetailedErrors?: boolean // Show detailed error information in production
  // Enhanced registration-specific props
  registrationStep?: number // Current registration step
  businessType?: string // Business type for context
  enableProgressRecovery?: boolean // Try to recover registration progress
  onProgressRecovery?: () => void // Callback for progress recovery
  enableGracefulDegradation?: boolean // Allow partial functionality
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorCount: number
  retryCount: number
  sentryEventId?: string
  showFeedbackForm: boolean
  isRetrying: boolean
  isOffline: boolean
  lastRetryTime?: number
  errorId: string // Unique ID for this error instance
  monitoringErrorId?: string // Error monitoring system ID
  showProgressRecovery: boolean // Show progress recovery options
  gracefulModeActive: boolean // Whether graceful degradation is active
  feedbackData: {
    name: string
    email: string
    comments: string
  }
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId?: NodeJS.Timeout
  private onlineEventListener?: () => void
  private offlineEventListener?: () => void

  constructor(props: Props) {
    super(props)
    this.state = { 
      hasError: false,
      errorCount: 0,
      retryCount: 0,
      showFeedbackForm: false,
      isRetrying: false,
      isOffline: !navigator.onLine,
      errorId: this.generateErrorId(),
      showProgressRecovery: false,
      gracefulModeActive: false,
      feedbackData: {
        name: '',
        email: '',
        comments: ''
      }
    }

    // Set user context for error monitoring
    if (props.userId || props.registrationStep || props.businessType) {
      setUserContext({
        userId: props.userId,
        registrationStep: props.registrationStep,
        businessType: props.businessType
      })
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    }
  }

  componentDidMount() {
    if (this.props.enableOfflineDetection) {
      this.setupNetworkListeners()
    }
  }

  componentWillUnmount() {
    this.cleanupRetryTimeout()
    this.cleanupNetworkListeners()
  }

  private generateErrorId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private setupNetworkListeners() {
    this.onlineEventListener = () => {
      this.setState({ isOffline: false })
      // If there was a network error and we're back online, suggest retry
      if (this.state.hasError && this.isNetworkError(this.state.error)) {
        addUserActionBreadcrumb(
          'Network connection restored',
          'network',
          { feature: this.props.feature, errorId: this.state.errorId }
        )
      }
    }

    this.offlineEventListener = () => {
      this.setState({ isOffline: true })
      addUserActionBreadcrumb(
        'Network connection lost',
        'network',
        { feature: this.props.feature, errorId: this.state.errorId }
      )
    }

    window.addEventListener('online', this.onlineEventListener)
    window.addEventListener('offline', this.offlineEventListener)
  }

  private cleanupNetworkListeners() {
    if (this.onlineEventListener) {
      window.removeEventListener('online', this.onlineEventListener)
    }
    if (this.offlineEventListener) {
      window.removeEventListener('offline', this.offlineEventListener)
    }
  }

  private cleanupRetryTimeout() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
      this.retryTimeoutId = undefined
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Generate unique error ID for tracking
    const errorId = this.generateErrorId()
    const errorType = this.getErrorType(error)
    
    // Capture with error monitoring system
    const monitoringErrorId = errorMonitoring.captureError(error, {
      category: this.getErrorCategory(error),
      severity: this.getErrorSeverity(error, errorType),
      context: `ErrorBoundary - ${this.props.feature || 'Unknown'}`,
      metadata: {
        componentStack: errorInfo.componentStack,
        feature: this.props.feature,
        userId: this.props.userId,
        registrationStep: this.props.registrationStep,
        businessType: this.props.businessType,
        errorCount: this.state.errorCount + 1,
        retryCount: this.state.retryCount,
        isOffline: this.state.isOffline,
        errorType,
        url: window.location.href,
        referrer: document.referrer,
        viewportSize: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      },
      recoverable: this.shouldAutoRetry(error),
      retryCount: this.state.retryCount
    })
    
    // Capture the error with Sentry and get the event ID
    const sentryEventId = Sentry.withScope((scope) => {
      // Add context about the error boundary
      scope.setTag('errorBoundary', true)
      scope.setTag('errorBoundary.feature', this.props.feature || 'unknown')
      scope.setTag('errorBoundary.errorId', errorId)
      scope.setTag('errorBoundary.monitoringId', monitoringErrorId)
      scope.setTag('errorBoundary.errorType', errorType)
      scope.setTag('errorBoundary.registrationStep', this.props.registrationStep)
      
      // Add component stack and additional context
      scope.setContext('errorBoundary', {
        componentStack: errorInfo.componentStack,
        feature: this.props.feature,
        userId: this.props.userId,
        registrationStep: this.props.registrationStep,
        businessType: this.props.businessType,
        errorCount: this.state.errorCount + 1,
        retryCount: this.state.retryCount,
        isOffline: this.state.isOffline,
        timestamp: new Date().toISOString(),
        errorId,
        monitoringErrorId,
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer
      })
      
      // Add breadcrumb for the error
      addUserActionBreadcrumb(
        'Error caught by boundary',
        'error',
        {
          feature: this.props.feature,
          errorMessage: error.message,
          errorStack: error.stack?.substring(0, 1000), // First 1000 chars
          errorType,
          errorId,
          monitoringErrorId
        }
      )
      
      return Sentry.captureException(error)
    })
    
    // Announce error to screen readers
    if (typeof window !== 'undefined') {
      try {
        import('../lib/accessibility').then(({ announceErrorBoundaryActivation }) => {
          announceErrorBoundaryActivation(
            errorType, 
            this.shouldAutoRetry(error) || Boolean(this.props.enableProgressRecovery)
          )
        }).catch(() => {
          // Fallback announcement
          console.warn('Failed to announce error via accessibility module')
        })
      } catch {
        // Silent fallback
      }
    }
    
    // Show error toast for immediate feedback
    toastError(
      this.getErrorTitle(),
      this.getErrorDescription(),
      {
        errorId: monitoringErrorId,
        retryable: this.shouldAutoRetry(error),
        onRetry: this.shouldAutoRetry(error) ? () => this.resetErrorBoundary() : undefined,
        persistent: true,
        duration: 0 // Don't auto-dismiss critical errors
      }
    )
    
    this.setState((prev) => ({ 
      errorInfo,
      errorCount: prev.errorCount + 1,
      sentryEventId,
      errorId,
      monitoringErrorId,
      showProgressRecovery: Boolean(this.props.enableProgressRecovery && this.props.registrationStep),
      gracefulModeActive: Boolean(this.props.enableGracefulDegradation)
    }))
    
    this.props.onError?.(error, errorInfo)

    // Attempt automatic retry for certain error types
    if (this.shouldAutoRetry(error)) {
      this.attemptAutoRetry(error)
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

  private getErrorType(error?: Error): string {
    if (!error) return 'unknown'
    
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) return 'network'
    if (message.includes('chunk') || message.includes('loading css chunk')) return 'chunk_load'
    if (message.includes('timeout')) return 'timeout'
    if (message.includes('cors')) return 'cors'
    if (message.includes('unauthorized') || message.includes('401')) return 'auth'
    if (message.includes('permission') || message.includes('403')) return 'permission'
    if (message.includes('not found') || message.includes('404')) return 'not_found'
    if (message.includes('server') || message.includes('500')) return 'server'
    if (message.includes('validation')) return 'validation'
    if (error.name === 'TypeError') return 'type_error'
    if (error.name === 'ReferenceError') return 'reference_error'
    if (error.name === 'SyntaxError') return 'syntax_error'
    
    return 'application'
  }

  private getErrorCategory(error?: Error): ErrorCategory {
    if (!error) return ErrorCategory.APPLICATION
    
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch') || message.includes('cors')) {
      return ErrorCategory.NETWORK
    }
    if (message.includes('validation') || message.includes('required') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return ErrorCategory.AUTHENTICATION
    }
    if (message.includes('permission') || message.includes('403')) {
      return ErrorCategory.PERMISSION
    }
    
    return ErrorCategory.APPLICATION
  }

  private getErrorSeverity(error?: Error, errorType?: string): ErrorSeverity {
    if (!error) return ErrorSeverity.MEDIUM
    
    // Critical errors that break core functionality
    if (error.message.includes('ChunkLoadError') || 
        error.message.includes('Script error') ||
        errorType === 'auth') {
      return ErrorSeverity.CRITICAL
    }

    // High severity for network and application errors
    if (errorType === 'network' || 
        errorType === 'application' ||
        errorType === 'server') {
      return ErrorSeverity.HIGH
    }

    // Medium severity for validation and permission errors
    if (errorType === 'validation' || 
        errorType === 'permission' ||
        errorType === 'type_error') {
      return ErrorSeverity.MEDIUM
    }

    return ErrorSeverity.LOW
  }

  private isNetworkError(error?: Error): boolean {
    if (!error) return false
    const message = error.message.toLowerCase()
    return message.includes('network') || 
           message.includes('fetch') || 
           message.includes('connection') ||
           message.includes('timeout')
  }

  private isChunkLoadError(error?: Error): boolean {
    if (!error) return false
    const message = error.message.toLowerCase()
    return message.includes('chunk') || message.includes('loading css chunk')
  }

  private shouldAutoRetry(error: Error): boolean {
    if (!this.props.enableRetry) return false
    if (this.state.retryCount >= (this.props.maxRetries || 3)) return false
    
    const errorType = this.getErrorType(error)
    const retryableTypes = ['network', 'timeout', 'server', 'chunk_load']
    
    return retryableTypes.includes(errorType)
  }

  private attemptAutoRetry(error: Error) {
    const delay = this.props.retryDelay || (1000 * Math.pow(2, this.state.retryCount)) // Exponential backoff
    
    addUserActionBreadcrumb(
      'Attempting automatic retry',
      'retry',
      {
        feature: this.props.feature,
        retryCount: this.state.retryCount + 1,
        delay,
        errorType: this.getErrorType(error),
        errorId: this.state.errorId
      }
    )

    this.setState({ isRetrying: true })

    this.retryTimeoutId = setTimeout(() => {
      this.setState(prev => ({
        retryCount: prev.retryCount + 1,
        isRetrying: false,
        lastRetryTime: Date.now()
      }))

      this.resetErrorBoundary()
    }, delay)
  }

  resetErrorBoundary = () => {
    this.cleanupRetryTimeout()
    
    // Add breadcrumb for error boundary reset
    addUserActionBreadcrumb(
      'Error boundary reset',
      'interaction',
      {
        feature: this.props.feature,
        errorCount: this.state.errorCount,
        retryCount: this.state.retryCount,
        sentryEventId: this.state.sentryEventId,
        errorId: this.state.errorId
      }
    )
    
    this.setState({ 
      hasError: false, 
      error: undefined,
      errorInfo: undefined,
      sentryEventId: undefined,
      showFeedbackForm: false,
      isRetrying: false,
      errorId: this.generateErrorId(),
      feedbackData: {
        name: '',
        email: '',
        comments: ''
      }
    })
  }

  handleFeedbackSubmit = () => {
    const { feedbackData, sentryEventId, errorId } = this.state
    
    if (feedbackData.name && feedbackData.email && feedbackData.comments) {
      captureUserFeedback(feedbackData, sentryEventId)
      
      addUserActionBreadcrumb(
        'User feedback submitted',
        'interaction',
        {
          feature: this.props.feature,
          sentryEventId,
          feedbackLength: feedbackData.comments.length,
          errorId
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

  private getErrorIcon() {
    if (!this.state.error) return AlertTriangle

    const errorType = this.getErrorType(this.state.error)
    switch (errorType) {
      case 'network': return WifiOff
      case 'server': return Server
      case 'timeout': return Clock
      case 'chunk_load': return RefreshCw
      case 'auth': 
      case 'permission': return AlertCircle
      default: return AlertTriangle
    }
  }

  private getErrorTitle(): string {
    if (!this.state.error) return 'Something went wrong'

    const errorType = this.getErrorType(this.state.error)
    switch (errorType) {
      case 'network': 
        return this.state.isOffline ? 'You are offline' : 'Connection Error'
      case 'chunk_load': return 'Loading Error'
      case 'timeout': return 'Request Timeout'
      case 'server': return 'Server Error'
      case 'auth': return 'Authentication Required'
      case 'permission': return 'Access Denied'
      case 'not_found': return 'Page Not Found'
      case 'validation': return 'Validation Error'
      default: return 'Application Error'
    }
  }

  private getErrorDescription(): string {
    if (!this.state.error) return 'An unexpected error occurred'

    const errorType = this.getErrorType(this.state.error)
    switch (errorType) {
      case 'network': 
        return this.state.isOffline 
          ? 'Please check your internet connection and try again.'
          : 'Unable to connect to the server. Please check your internet connection.'
      case 'chunk_load':
        return 'Failed to load application resources. This can happen after an update.'
      case 'timeout':
        return 'The request took too long to complete. Please try again.'
      case 'server':
        return 'The server encountered an error. Please try again in a few moments.'
      case 'auth':
        return 'Please log in to continue.'
      case 'permission':
        return 'You do not have permission to access this resource.'
      case 'not_found':
        return 'The requested page or resource was not found.'
      case 'validation':
        return 'Please check your input and try again.'
      default:
        return this.props.showDetailedErrors || process.env.NODE_ENV === 'development'
          ? this.state.error.message
          : 'An unexpected error occurred. Please try again.'
    }
  }

  private getRecoveryActions() {
    if (!this.state.error) return []

    const errorType = this.getErrorType(this.state.error)
    const actions = []

    // Progress Recovery (for registration flow)
    if (this.state.showProgressRecovery && this.props.onProgressRecovery) {
      actions.push({
        label: 'Recover Progress',
        icon: RefreshCw,
        variant: 'default' as const,
        primary: true,
        action: () => {
          addUserActionBreadcrumb(
            'Progress recovery clicked',
            'interaction',
            { 
              feature: this.props.feature, 
              errorType, 
              errorId: this.state.errorId,
              registrationStep: this.props.registrationStep
            }
          )
          this.props.onProgressRecovery?.()
          this.resetErrorBoundary()
        }
      })
    }

    // Always show Try Again unless it's a permanent error
    if (!['not_found', 'permission'].includes(errorType)) {
      const isChunkError = errorType === 'chunk_load'
      actions.push({
        label: isChunkError ? 'Reload Page' : 'Try Again',
        icon: RefreshCw,
        variant: this.state.showProgressRecovery ? 'outline' as const : 'default' as const,
        primary: !this.state.showProgressRecovery,
        action: () => {
          addUserActionBreadcrumb(
            isChunkError ? 'Page reload clicked' : 'Try again clicked',
            'interaction',
            { feature: this.props.feature, errorType, errorId: this.state.errorId }
          )
          
          if (isChunkError) {
            window.location.reload()
          } else {
            this.resetErrorBoundary()
          }
        }
      })
    }

    // Graceful Mode (limited functionality)
    if (this.state.gracefulModeActive && !this.state.showProgressRecovery) {
      actions.push({
        label: 'Continue with Limited Features',
        icon: AlertTriangle,
        variant: 'outline' as const,
        primary: false,
        action: () => {
          addUserActionBreadcrumb(
            'Graceful mode activated',
            'interaction',
            { feature: this.props.feature, errorType, errorId: this.state.errorId }
          )
          
          // Hide error boundary but keep tracking
          this.setState(prev => ({ 
            ...prev, 
            hasError: false,
            gracefulModeActive: true 
          }))
          
          // Show toast about limited functionality
          toastError(
            'Limited Functionality Mode',
            'Some features may not work properly. Please refresh the page when your connection improves.',
            {
              errorId: this.state.monitoringErrorId,
              persistent: true,
              duration: 10000
            }
          )
        }
      })
    }

    // Go Home action for navigation errors
    if (['not_found', 'permission'].includes(errorType)) {
      actions.push({
        label: 'Go Home',
        icon: Home,
        variant: 'default' as const,
        primary: true,
        action: () => {
          addUserActionBreadcrumb(
            'Go home clicked',
            'navigation',
            { feature: this.props.feature, errorType, errorId: this.state.errorId }
          )
          window.location.href = '/'
        }
      })
    } else {
      actions.push({
        label: 'Go Home',
        icon: Home,
        variant: 'outline' as const,
        primary: false,
        action: () => {
          addUserActionBreadcrumb(
            'Go home clicked',
            'navigation',
            { feature: this.props.feature, errorType, errorId: this.state.errorId }
          )
          window.location.href = '/'
        }
      })
    }

    return actions
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const ErrorIcon = this.getErrorIcon()
      const recoveryActions = this.getRecoveryActions()

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive" className="border-red-200 dark:border-red-800">
              <ErrorIcon className="h-4 w-4" />
              <AlertTitle className="flex items-center justify-between">
                {this.getErrorTitle()}
                {this.state.isRetrying && (
                  <div className="flex items-center text-sm">
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    Retrying...
                  </div>
                )}
              </AlertTitle>
              <AlertDescription className="mt-2">
                <p className="text-sm">
                  {this.getErrorDescription()}
                </p>

                {/* Network Status Indicator */}
                {this.props.enableOfflineDetection && (
                  <div className={`mt-2 flex items-center text-xs ${this.state.isOffline ? 'text-red-600' : 'text-green-600'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${this.state.isOffline ? 'bg-red-500' : 'bg-green-500'}`} />
                    {this.state.isOffline ? 'Offline' : 'Online'}
                  </div>
                )}

                {/* Retry Information */}
                {this.state.retryCount > 0 && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    Attempted {this.state.retryCount} automatic {this.state.retryCount === 1 ? 'retry' : 'retries'}
                  </div>
                )}

                {/* Development Error Details */}
                {(process.env.NODE_ENV === 'development' || this.props.showDetailedErrors) && this.state.errorInfo && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs font-medium">
                      Error details (ID: {this.state.errorId})
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div className="text-xs">
                        <strong>Error Type:</strong> {this.getErrorType(this.state.error)}
                      </div>
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
            
            {/* Recovery Actions */}
            <div className="flex gap-2 justify-center flex-wrap">
              {recoveryActions.map((action, index) => (
                <Button 
                  key={index}
                  onClick={action.action}
                  variant={action.variant}
                  size="sm"
                  disabled={this.state.isRetrying}
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  {action.label}
                </Button>
              ))}

              {/* Feedback Button */}
              {this.state.sentryEventId && !this.state.showFeedbackForm && (
                <Button
                  onClick={() => {
                    addUserActionBreadcrumb(
                      'Feedback form opened',
                      'interaction',
                      { 
                        feature: this.props.feature, 
                        sentryEventId: this.state.sentryEventId,
                        errorId: this.state.errorId
                      }
                    )
                    this.setState({ showFeedbackForm: true })
                  }}
                  variant="outline"
                  size="sm"
                  disabled={this.state.isRetrying}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Report Issue
                </Button>
              )}
            </div>
            
            {/* Error Frequency Warning */}
            {this.state.errorCount > 2 && (
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                This error has occurred {this.state.errorCount} times. 
                Consider contacting support if the issue persists.
                {this.state.errorId && ` (Error ID: ${this.state.errorId})`}
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
                      className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                      value={this.state.feedbackData.name}
                      onChange={(e) => this.updateFeedbackData('name', e.target.value)}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
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
                      className="w-full px-2 py-1 text-sm border rounded h-20 resize-none dark:bg-gray-700 dark:border-gray-600"
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
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

// Enhanced error boundary for registration flow
export function RegistrationErrorBoundary({ 
  children, 
  registrationStep, 
  businessType, 
  userId,
  onProgressRecovery 
}: { 
  children: ReactNode
  registrationStep?: number
  businessType?: string
  userId?: string
  onProgressRecovery?: () => void
}) {
  return (
    <ErrorBoundary
      feature="registration"
      registrationStep={registrationStep}
      businessType={businessType}
      userId={userId}
      enableRetry={true}
      maxRetries={3}
      retryDelay={1000}
      enableOfflineDetection={true}
      enableProgressRecovery={true}
      enableGracefulDegradation={true}
      onProgressRecovery={onProgressRecovery}
      showDetailedErrors={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ErrorBoundary>
  )
}