'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft, CheckCircle2, AlertCircle, Network, Server } from 'lucide-react'
import { Button } from '../ui/button'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { reportApiError, captureUserFeedback, addUserActionBreadcrumb } from '../../lib/sentry'
import { errorMonitoring, ErrorCategory, ErrorSeverity } from '../../lib/error-monitoring'
import { getEnhancedErrorMessage } from '../../lib/error-messages'
import { toastError, toastSuccess, toastInfo } from '../../hooks/use-toast'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
  registrationStep?: number
  totalSteps?: number
  businessType?: string
  userId?: string
  enableProgressRecovery?: boolean
  enableAutoSave?: boolean
  onProgressRecovery?: () => void
  onStepBack?: () => void
  onProgressSave?: (data: any) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorCount: number
  retryCount: number
  sentryEventId?: string
  monitoringErrorId?: string
  showFeedbackForm: boolean
  isRetrying: boolean
  isOffline: boolean
  lastRetryTime?: number
  errorId: string
  showProgressRecovery: boolean
  autoSaveData?: any
  errorSeverity: 'low' | 'medium' | 'high' | 'critical'
  recoveryOptions: Array<{
    id: string
    label: string
    description: string
    action: () => void
    icon: any
    recommended?: boolean
  }>
  feedbackData: {
    name: string
    email: string
    comments: string
    stepContext: string
  }
}

export class RegistrationErrorBoundary extends Component<Props, State> {
  private retryTimeoutId?: NodeJS.Timeout
  private onlineEventListener?: () => void
  private offlineEventListener?: () => void
  private autoSaveInterval?: NodeJS.Timeout

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
      errorSeverity: 'medium',
      recoveryOptions: [],
      feedbackData: {
        name: '',
        email: '',
        comments: '',
        stepContext: `Registration Step ${props.registrationStep || 'Unknown'}`
      }
    }

    this.setupNetworkListeners()
    this.initializeAutoSave()
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    }
  }

  componentDidMount() {
    // Set up auto-save for registration progress
    if (this.props.enableAutoSave) {
      this.setupAutoSave()
    }
  }

  componentWillUnmount() {
    this.cleanupRetryTimeout()
    this.cleanupNetworkListeners()
    this.cleanupAutoSave()
  }

  private generateErrorId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private setupNetworkListeners() {
    this.onlineEventListener = () => {
      this.setState({ isOffline: false })
      if (this.state.hasError && this.isNetworkError(this.state.error)) {
        toastInfo('Connection Restored', 'You can now retry your registration.')
      }
    }

    this.offlineEventListener = () => {
      this.setState({ isOffline: true })
      toastError(
        'Connection Lost', 
        'Please check your internet connection. Your progress has been saved locally.'
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

  private initializeAutoSave() {
    if (this.props.enableAutoSave) {
      // Save registration progress every 30 seconds
      this.autoSaveInterval = setInterval(() => {
        this.saveRegistrationProgress()
      }, 30000)
    }
  }

  private setupAutoSave() {
    // Attempt to restore saved progress
    this.restoreRegistrationProgress()
  }

  private cleanupAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
    }
  }

  private saveRegistrationProgress() {
    try {
      const progressData = {
        step: this.props.registrationStep,
        businessType: this.props.businessType,
        timestamp: Date.now()
      }
      
      localStorage.setItem('registration_progress_backup', JSON.stringify(progressData))
      this.props.onProgressSave?.(progressData)
    } catch (error) {
      console.warn('Failed to save registration progress:', error)
    }
  }

  private restoreRegistrationProgress() {
    try {
      const saved = localStorage.getItem('registration_progress_backup')
      if (saved) {
        const progressData = JSON.parse(saved)
        this.setState({ autoSaveData: progressData })
      }
    } catch (error) {
      console.warn('Failed to restore registration progress:', error)
    }
  }

  private cleanupRetryTimeout() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
      this.retryTimeoutId = undefined
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RegistrationErrorBoundary caught an error:', error, errorInfo)
    
    const errorType = this.getErrorType(error)
    const errorSeverity = this.getErrorSeverity(error, errorType)
    
    // Enhanced error reporting for registration
    const monitoringErrorId = errorMonitoring.captureError(error, {
      category: this.getErrorCategory(error),
      severity: this.getMonitoringSeverity(errorSeverity),
      context: `Registration Error Boundary - Step ${this.props.registrationStep}`,
      metadata: {
        componentStack: errorInfo.componentStack,
        registrationStep: this.props.registrationStep,
        totalSteps: this.props.totalSteps,
        businessType: this.props.businessType,
        userId: this.props.userId,
        errorCount: this.state.errorCount + 1,
        retryCount: this.state.retryCount,
        isOffline: this.state.isOffline,
        errorType,
        hasAutoSave: Boolean(this.props.enableAutoSave),
        progressRecoveryEnabled: Boolean(this.props.enableProgressRecovery),
        url: window.location.href,
        userAgent: navigator.userAgent
      },
      recoverable: this.shouldAutoRetry(error),
      retryCount: this.state.retryCount
    })
    
    // Capture with Sentry
    const sentryEventId = reportApiError(error, {
      component: 'RegistrationErrorBoundary',
      registrationStep: this.props.registrationStep,
      totalSteps: this.props.totalSteps,
      businessType: this.props.businessType,
      userId: this.props.userId,
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      errorType,
      errorSeverity
    })
    
    addUserActionBreadcrumb(
      'Registration error caught by boundary',
      'error',
      {
        registrationStep: this.props.registrationStep,
        businessType: this.props.businessType,
        errorMessage: error.message,
        errorType,
        errorSeverity
      }
    )

    // Generate recovery options based on error type and context
    const recoveryOptions = this.generateRecoveryOptions(error, errorType)
    
    this.setState((prev) => ({ 
      errorInfo,
      errorCount: prev.errorCount + 1,
      sentryEventId,
      monitoringErrorId,
      errorSeverity,
      recoveryOptions,
      showProgressRecovery: Boolean(
        this.props.enableProgressRecovery && 
        (this.props.registrationStep || 0) > 1
      ),
      feedbackData: {
        ...prev.feedbackData,
        stepContext: `Registration Step ${this.props.registrationStep || 'Unknown'} - ${this.props.businessType || 'Unknown Type'}`
      }
    }))
    
    // Save progress when error occurs
    if (this.props.enableAutoSave) {
      this.saveRegistrationProgress()
    }
    
    this.props.onError?.(error, errorInfo)

    // Show contextual error notification
    this.showEnhancedErrorNotification(error, errorType, errorSeverity)

    // Attempt automatic retry for certain error types
    if (this.shouldAutoRetry(error)) {
      this.attemptAutoRetry(error)
    }
  }

  private getErrorType(error?: Error): string {
    if (!error) return 'unknown'
    
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) return 'network'
    if (message.includes('validation') || message.includes('required')) return 'validation'
    if (message.includes('timeout')) return 'timeout'
    if (message.includes('cors')) return 'cors'
    if (message.includes('chunk') || message.includes('loading')) return 'chunk_load'
    if (message.includes('unauthorized') || message.includes('401')) return 'auth'
    if (message.includes('permission') || message.includes('403')) return 'permission'
    if (message.includes('server') || message.includes('500')) return 'server'
    if (error.name === 'TypeError') return 'type_error'
    
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

  private getErrorSeverity(error?: Error, errorType?: string): 'low' | 'medium' | 'high' | 'critical' {
    if (!error) return 'medium'
    
    // Critical errors that completely break registration
    if (error.message.includes('ChunkLoadError') || 
        error.message.includes('Script error') ||
        errorType === 'auth') {
      return 'critical'
    }

    // High severity for network and server errors during registration
    if (errorType === 'network' || 
        errorType === 'server' ||
        errorType === 'application') {
      return 'high'
    }

    // Medium severity for validation and permission errors
    if (errorType === 'validation' || 
        errorType === 'permission') {
      return 'medium'
    }

    return 'low'
  }

  private getMonitoringSeverity(severity: 'low' | 'medium' | 'high' | 'critical'): ErrorSeverity {
    switch (severity) {
      case 'critical': return ErrorSeverity.CRITICAL
      case 'high': return ErrorSeverity.HIGH
      case 'medium': return ErrorSeverity.MEDIUM
      case 'low': return ErrorSeverity.LOW
      default: return ErrorSeverity.MEDIUM
    }
  }

  private isNetworkError(error?: Error): boolean {
    if (!error) return false
    const message = error.message.toLowerCase()
    return message.includes('network') || 
           message.includes('fetch') || 
           message.includes('connection') ||
           message.includes('timeout')
  }

  private shouldAutoRetry(error: Error): boolean {
    if (this.state.retryCount >= 2) return false // Max 2 auto-retries for registration
    
    const errorType = this.getErrorType(error)
    const retryableTypes = ['network', 'timeout', 'server', 'chunk_load']
    
    return retryableTypes.includes(errorType)
  }

  private attemptAutoRetry(error: Error) {
    const delay = 2000 * Math.pow(2, this.state.retryCount) // Exponential backoff

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

  private generateRecoveryOptions(error: Error, errorType: string) {
    const options = []

    // Always show retry option if reasonable
    if (this.state.retryCount < 3) {
      options.push({
        id: 'retry',
        label: 'Try Again',
        description: 'Retry the current step',
        action: this.resetErrorBoundary,
        icon: RefreshCw,
        recommended: errorType === 'network' || errorType === 'timeout'
      })
    }

    // Go back a step option
    if (this.props.onStepBack && (this.props.registrationStep || 0) > 1) {
      options.push({
        id: 'step_back',
        label: 'Previous Step',
        description: 'Go back to the previous registration step',
        action: () => {
          this.props.onStepBack?.()
          this.resetErrorBoundary()
        },
        icon: ArrowLeft,
        recommended: errorType === 'validation'
      })
    }

    // Progress recovery option
    if (this.props.enableProgressRecovery && this.state.autoSaveData) {
      options.push({
        id: 'restore_progress',
        label: 'Restore Progress',
        description: 'Restore your saved registration progress',
        action: () => {
          this.props.onProgressRecovery?.()
          this.resetErrorBoundary()
        },
        icon: CheckCircle2,
        recommended: errorType === 'application'
      })
    }

    // Network-specific options
    if (errorType === 'network') {
      options.push({
        id: 'check_connection',
        label: 'Check Connection',
        description: 'Verify your internet connection and try again',
        action: () => {
          window.location.reload()
        },
        icon: Network
      })
    }

    // Server error options
    if (errorType === 'server') {
      options.push({
        id: 'contact_support',
        label: 'Contact Support',
        description: 'Get help from our support team',
        action: () => {
          window.open('mailto:support@bookedbarber.com?subject=Registration Error', '_blank')
        },
        icon: AlertCircle
      })
    }

    return options
  }

  private showEnhancedErrorNotification(error: Error, errorType: string, severity: 'low' | 'medium' | 'high' | 'critical') {
    const enhancedMessage = getEnhancedErrorMessage(
      errorType === 'network' ? 0 : 500,
      { detail: error.message },
      { 
        action: 'registration',
        feature: 'registration',
        userType: 'registrant'
      }
    )

    if (severity === 'critical') {
      toastError(
        enhancedMessage.title,
        enhancedMessage.message,
        {
          errorId: this.state.monitoringErrorId,
          persistent: true,
          duration: 0
        }
      )
    } else {
      toastError(
        enhancedMessage.title,
        enhancedMessage.message,
        {
          errorId: this.state.monitoringErrorId,
          retryable: enhancedMessage.isRecoverable,
          duration: severity === 'high' ? 8000 : 5000
        }
      )
    }
  }

  resetErrorBoundary = () => {
    this.cleanupRetryTimeout()
    
    addUserActionBreadcrumb(
      'Registration error boundary reset',
      'interaction',
      {
        registrationStep: this.props.registrationStep,
        errorCount: this.state.errorCount,
        retryCount: this.state.retryCount,
        sentryEventId: this.state.sentryEventId
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
      recoveryOptions: [],
      feedbackData: {
        name: '',
        email: '',
        comments: '',
        stepContext: `Registration Step ${this.props.registrationStep || 'Unknown'}`
      }
    })
  }

  handleFeedbackSubmit = () => {
    const { feedbackData, sentryEventId, errorId } = this.state
    
    if (feedbackData.name && feedbackData.email && feedbackData.comments) {
      captureUserFeedback(feedbackData, sentryEventId)
      
      addUserActionBreadcrumb(
        'Registration error feedback submitted',
        'interaction',
        {
          registrationStep: this.props.registrationStep,
          sentryEventId,
          feedbackLength: feedbackData.comments.length,
          errorId
        }
      )
      
      this.setState({ showFeedbackForm: false })
      toastSuccess('Feedback Sent', 'Thank you for helping us improve the registration process.')
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

      const progressPercentage = this.props.registrationStep && this.props.totalSteps 
        ? (this.props.registrationStep / this.props.totalSteps) * 100 
        : 0

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className={`p-3 rounded-full ${
                  this.state.errorSeverity === 'critical' ? 'bg-red-100 dark:bg-red-900/30' :
                  this.state.errorSeverity === 'high' ? 'bg-orange-100 dark:bg-orange-900/30' :
                  this.state.errorSeverity === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                  'bg-blue-100 dark:bg-blue-900/30'
                }`}>
                  <AlertTriangle className={`h-8 w-8 ${
                    this.state.errorSeverity === 'critical' ? 'text-red-600 dark:text-red-400' :
                    this.state.errorSeverity === 'high' ? 'text-orange-600 dark:text-orange-400' :
                    this.state.errorSeverity === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-blue-600 dark:text-blue-400'
                  }`} />
                </div>
              </div>
              
              <CardTitle className="text-xl font-semibold">
                Registration Error
              </CardTitle>
              
              {this.props.registrationStep && this.props.totalSteps && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Step {this.props.registrationStep} of {this.props.totalSteps}
                    </span>
                    <Badge variant={this.state.errorSeverity === 'critical' ? 'destructive' : 'secondary'}>
                      {this.state.errorSeverity} severity
                    </Badge>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              <Alert variant="destructive" className="border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  Registration Failed
                  {this.state.isRetrying && (
                    <div className="flex items-center text-sm">
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      Retrying...
                    </div>
                  )}
                </AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <p className="text-sm">
                    {this.state.error?.message || 'An unexpected error occurred during registration.'}
                  </p>
                  
                  {this.state.isOffline && (
                    <div className="flex items-center text-xs text-red-600 dark:text-red-400">
                      <div className="w-2 h-2 rounded-full mr-2 bg-red-500" />
                      You are currently offline
                    </div>
                  )}

                  {this.state.retryCount > 0 && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Attempted {this.state.retryCount} automatic {this.state.retryCount === 1 ? 'retry' : 'retries'}
                    </div>
                  )}
                </AlertDescription>
              </Alert>

              {/* Recovery Options */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Recovery Options
                </h4>
                <div className="grid gap-2">
                  {this.state.recoveryOptions.map((option) => {
                    const IconComponent = option.icon
                    return (
                      <Button
                        key={option.id}
                        onClick={option.action}
                        variant={option.recommended ? 'default' : 'outline'}
                        size="sm"
                        disabled={this.state.isRetrying}
                        className="justify-start h-auto p-3"
                      >
                        <IconComponent className="mr-3 h-4 w-4 flex-shrink-0" />
                        <div className="text-left">
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs opacity-70">{option.description}</div>
                        </div>
                        {option.recommended && (
                          <Badge variant="secondary" className="ml-auto">
                            Recommended
                          </Badge>
                        )}
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* Auto-save information */}
              {this.props.enableAutoSave && this.state.autoSaveData && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Progress Saved</AlertTitle>
                  <AlertDescription>
                    Your registration progress has been automatically saved. 
                    You can safely continue from where you left off.
                  </AlertDescription>
                </Alert>
              )}

              {/* Feedback form */}
              {this.state.sentryEventId && !this.state.showFeedbackForm && (
                <Button
                  onClick={() => this.setState({ showFeedbackForm: true })}
                  variant="ghost"
                  size="sm"
                  className="w-full"
                >
                  Help us improve registration
                </Button>
              )}

              {this.state.showFeedbackForm && (
                <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                  <h4 className="text-sm font-medium mb-3">Report Registration Issue</h4>
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
                        What information were you trying to submit?
                      </label>
                      <textarea
                        className="w-full px-2 py-1 text-sm border rounded h-20 resize-none dark:bg-gray-700 dark:border-gray-600"
                        value={this.state.feedbackData.comments}
                        onChange={(e) => this.updateFeedbackData('comments', e.target.value)}
                        placeholder="Describe what you were trying to do during registration..."
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
                        Send Report
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Error frequency warning */}
              {this.state.errorCount > 2 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Repeated Errors</AlertTitle>
                  <AlertDescription>
                    This error has occurred {this.state.errorCount} times. 
                    Consider contacting support for assistance.
                    {this.state.errorId && ` (Error ID: ${this.state.errorId})`}
                  </AlertDescription>
                </Alert>
              )}

              {/* Development error details */}
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="text-left">
                  <summary className="cursor-pointer text-xs font-medium mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div className="space-y-2">
                    <div className="text-xs">
                      <strong>Error Type:</strong> {this.getErrorType(this.state.error)}
                    </div>
                    <div className="text-xs">
                      <strong>Step:</strong> {this.props.registrationStep} / {this.props.totalSteps}
                    </div>
                    <div className="text-xs">
                      <strong>Business Type:</strong> {this.props.businessType}
                    </div>
                    <pre className="text-xs overflow-auto p-2 bg-gray-100 dark:bg-gray-800 rounded max-h-32">
                      {this.state.error?.stack}
                    </pre>
                    <pre className="text-xs overflow-auto p-2 bg-gray-100 dark:bg-gray-800 rounded max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// HOC for wrapping registration components
export function withRegistrationErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<Props, 'children'>
) {
  return function RegistrationErrorBoundaryWrapper(props: P) {
    return (
      <RegistrationErrorBoundary {...options}>
        <Component {...props} />
      </RegistrationErrorBoundary>
    )
  }
}

// Simplified fallback component for inline use
export function RegistrationErrorFallback({ 
  error, 
  resetError,
  registrationStep = 0,
  businessType = 'Unknown'
}: { 
  error: Error
  resetError?: () => void
  registrationStep?: number
  businessType?: string
}) {
  return (
    <Alert variant="destructive" className="max-w-md mx-auto">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Registration Error (Step {registrationStep})</AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-sm">
          {error.message || 'An error occurred during registration'}
        </p>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Business Type: {businessType}
        </div>
        {resetError && (
          <Button
            size="sm"
            variant="outline"
            onClick={resetError}
            className="mt-2"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}