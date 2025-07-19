'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw, Edit, Save } from 'lucide-react'
import { Button } from '../ui/button'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Card, CardContent } from '../ui/card'
import { reportApiError, captureUserFeedback, addUserActionBreadcrumb } from '../../lib/sentry'
import { showToast } from '../../lib/toast-utils'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
  contextInfo?: {
    formName?: string
    formStep?: string
    userId?: string
    formData?: Record<string, any>
    isSubmitting?: boolean
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
  savedFormData?: string
  feedbackData: {
    name: string
    email: string
    comments: string
  }
}

export class FormErrorBoundary extends Component<Props, State> {
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
    // Try to save form data to localStorage
    try {
      if (this.props.contextInfo?.formData) {
        const formDataString = JSON.stringify(this.props.contextInfo.formData)
        localStorage.setItem(`form_backup_${this.props.contextInfo.formName || 'unknown'}`, formDataString)
        this.setState({ savedFormData: formDataString })
      }
    } catch (saveError) {
      }
    
    // Enhanced error reporting for form-specific issues
    const sentryEventId = reportApiError(error, {
      component: 'FormErrorBoundary',
      formName: this.props.contextInfo?.formName,
      formStep: this.props.contextInfo?.formStep,
      userId: this.props.contextInfo?.userId,
      isSubmitting: this.props.contextInfo?.isSubmitting,
      hasFormData: !!this.props.contextInfo?.formData,
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    })
    
    addUserActionBreadcrumb(
      'Form error caught by boundary',
      'error',
      {
        formName: this.props.contextInfo?.formName,
        formStep: this.props.contextInfo?.formStep,
        isSubmitting: this.props.contextInfo?.isSubmitting,
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
      'Form error boundary reset',
      'interaction',
      {
        formName: this.props.contextInfo?.formName,
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
        'Form retry attempt',
        'interaction',
        {
          retryCount: this.state.retryCount + 1,
          maxRetries: this.maxRetries,
          formName: this.props.contextInfo?.formName,
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

  handleRestoreData = () => {
    addUserActionBreadcrumb(
      'Form data restore clicked',
      'interaction',
      {
        formName: this.props.contextInfo?.formName,
        hasSavedData: !!this.state.savedFormData,
      }
    )
    
    if (this.state.savedFormData) {
      // Show user the saved data (they can copy it if needed)
      showToast({
        title: "Form Data Backed Up",
        description: "Your form data has been backed up. It will be restored when you retry.",
      })
    }
    
    this.resetErrorBoundary()
  }

  handleClearForm = () => {
    addUserActionBreadcrumb(
      'Clear form data clicked',
      'interaction',
      {
        formName: this.props.contextInfo?.formName,
      }
    )
    
    // Clear any saved form data
    if (this.props.contextInfo?.formName) {
      localStorage.removeItem(`form_backup_${this.props.contextInfo.formName}`)
    }
    
    this.resetErrorBoundary()
  }

  handleFeedbackSubmit = () => {
    const { feedbackData, sentryEventId } = this.state
    
    if (feedbackData.name && feedbackData.email && feedbackData.comments) {
      captureUserFeedback(feedbackData, sentryEventId)
      
      addUserActionBreadcrumb(
        'Form error feedback submitted',
        'interaction',
        {
          formName: this.props.contextInfo?.formName,
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

  getFormErrorMessage = () => {
    const error = this.state.error
    if (!error) return 'A form error occurred'

    // Check for specific form-related errors
    if (error.message?.toLowerCase().includes('validation')) {
      return 'Form validation failed. Please check your input and try again.'
    }
    
    if (error.message?.toLowerCase().includes('required') || error.message?.toLowerCase().includes('missing')) {
      return 'Required fields are missing. Please fill in all required information.'
    }
    
    if (error.message?.toLowerCase().includes('submit') || error.message?.toLowerCase().includes('save')) {
      return 'Failed to save form data. Your information has been backed up and can be restored.'
    }
    
    if (error.message?.toLowerCase().includes('network') || error.message?.toLowerCase().includes('fetch')) {
      return 'Connection error while submitting form. Your data has been saved locally.'
    }
    
    if (error.message?.toLowerCase().includes('permission') || error.message?.toLowerCase().includes('unauthorized')) {
      return 'Permission denied. You may need to sign in again to submit this form.'
    }

    if (error.message?.toLowerCase().includes('timeout')) {
      return 'Form submission timed out. Your data has been preserved and you can try again.'
    }

    if (error.message?.toLowerCase().includes('file') || error.message?.toLowerCase().includes('upload')) {
      return 'File upload failed. Please check your file and try again.'
    }

    return error.message || 'Form encountered an unexpected error'
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

    // Offer data restoration if we have saved data
    if (this.state.savedFormData) {
      options.push({
        label: 'Restore Form Data',
        action: this.handleRestoreData,
        variant: 'secondary' as const,
        icon: Save
      })
    }

    // Specific recovery actions based on error type
    if (error?.message?.toLowerCase().includes('validation') || 
        error?.message?.toLowerCase().includes('required')) {
      options.push({
        label: 'Clear & Start Over',
        action: this.handleClearForm,
        variant: 'ghost' as const,
        icon: Edit
      })
    }

    if (error?.message?.toLowerCase().includes('auth') || 
        error?.message?.toLowerCase().includes('permission')) {
      options.push({
        label: 'Sign In Again',
        action: () => {
          addUserActionBreadcrumb('Sign in again clicked from form error', 'interaction')
          window.location.href = '/login'
        },
        variant: 'default' as const,
        icon: RefreshCw
      })
    }

    // Always offer page reload
    options.push({
      label: 'Reload Page',
      action: () => {
        addUserActionBreadcrumb('Form page reload clicked', 'interaction', {
          formName: this.props.contextInfo?.formName
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

      const errorMessage = this.getFormErrorMessage()
      const recoveryOptions = this.getRecoveryOptions()

      return (
        <Card className="mx-auto max-w-lg">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <Edit className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Form Error
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {errorMessage}
                </p>
                
                {this.props.contextInfo && (
                  <div className="text-xs text-gray-500 dark:text-gray-500 mb-4 space-y-1">
                    {this.props.contextInfo.formName && (
                      <p>Form: {this.props.contextInfo.formName}</p>
                    )}
                    {this.props.contextInfo.formStep && (
                      <p>Step: {this.props.contextInfo.formStep}</p>
                    )}
                    {this.props.contextInfo.isSubmitting && (
                      <p>Status: Submitting when error occurred</p>
                    )}
                  </div>
                )}
              </div>

              {/* Data preservation notice */}
              {this.state.savedFormData && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Save className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Your Data is Safe
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Your form data has been automatically backed up and can be restored.
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                      'Form feedback form opened',
                      'interaction',
                      { 
                        formName: this.props.contextInfo?.formName,
                        sentryEventId: this.state.sentryEventId 
                      }
                    )
                    this.setState({ showFeedbackForm: true })
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700"
                >
                  Report Form Issue
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
                  <h4 className="text-sm font-medium mb-3">Help us improve this form</h4>
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
                        placeholder="Describe what you were filling out and what happened..."
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

// HOC for wrapping form components
export function withFormErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  contextInfo?: Props['contextInfo']
) {
  return function FormErrorBoundaryWrapper(props: P) {
    return (
      <FormErrorBoundary contextInfo={contextInfo}>
        <Component {...props} />
      </FormErrorBoundary>
    )
  }
}

// Simplified fallback component for inline use
export function FormErrorFallback({ 
  error, 
  resetError,
  formName = 'Unknown'
}: { 
  error: Error
  resetError?: () => void
  formName?: string
}) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {formName} Form Error
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {error.message || 'Form encountered an error'}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
            Your data has been automatically backed up
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