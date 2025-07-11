'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw, Calendar, Clock, User } from 'lucide-react'
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
    bookingStep?: number
    selectedService?: string
    selectedDate?: string
    selectedTime?: string
    userId?: string
    isGuestBooking?: boolean
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

export class BookingErrorBoundary extends Component<Props, State> {
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
    console.error('BookingErrorBoundary caught an error:', error, errorInfo)
    
    // Enhanced error reporting for booking-specific issues
    const sentryEventId = reportApiError(error, {
      component: 'BookingErrorBoundary',
      bookingStep: this.props.contextInfo?.bookingStep,
      selectedService: this.props.contextInfo?.selectedService,
      selectedDate: this.props.contextInfo?.selectedDate,
      selectedTime: this.props.contextInfo?.selectedTime,
      userId: this.props.contextInfo?.userId,
      isGuestBooking: this.props.contextInfo?.isGuestBooking,
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    })
    
    addUserActionBreadcrumb(
      'Booking error caught by boundary',
      'error',
      {
        bookingStep: this.props.contextInfo?.bookingStep,
        selectedService: this.props.contextInfo?.selectedService,
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
      'Booking error boundary reset',
      'interaction',
      {
        bookingStep: this.props.contextInfo?.bookingStep,
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
        'Booking retry attempt',
        'interaction',
        {
          retryCount: this.state.retryCount + 1,
          maxRetries: this.maxRetries,
          bookingStep: this.props.contextInfo?.bookingStep,
        }
      )
      
      this.setState(prev => ({ 
        retryCount: prev.retryCount + 1 
      }))
      this.resetErrorBoundary()
    } else {
      // Max retries reached, redirect to booking start
      window.location.href = '/book'
    }
  }

  handleStartOver = () => {
    // Clear any booking state and start fresh
    addUserActionBreadcrumb(
      'Booking start over clicked',
      'interaction',
      {
        bookingStep: this.props.contextInfo?.bookingStep,
        selectedService: this.props.contextInfo?.selectedService,
      }
    )
    
    // Clear session storage booking data
    sessionStorage.removeItem('bookingInProgress')
    sessionStorage.removeItem('recurringBookingTemplate')
    
    window.location.href = '/book'
  }

  handleFeedbackSubmit = () => {
    const { feedbackData, sentryEventId } = this.state
    
    if (feedbackData.name && feedbackData.email && feedbackData.comments) {
      captureUserFeedback(feedbackData, sentryEventId)
      
      addUserActionBreadcrumb(
        'Booking error feedback submitted',
        'interaction',
        {
          bookingStep: this.props.contextInfo?.bookingStep,
          selectedService: this.props.contextInfo?.selectedService,
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

  getBookingErrorMessage = () => {
    const error = this.state.error
    if (!error) return 'A booking error occurred'

    // Check for specific booking-related errors
    if (error.message?.toLowerCase().includes('slot') || error.message?.toLowerCase().includes('available')) {
      return 'The selected time slot is no longer available. Please choose a different time.'
    }
    
    if (error.message?.toLowerCase().includes('service')) {
      return 'There was an issue with the selected service. Please try choosing a different service.'
    }
    
    if (error.message?.toLowerCase().includes('payment')) {
      return 'Payment processing failed. Your appointment has been reserved but payment needs to be completed.'
    }
    
    if (error.message?.toLowerCase().includes('network') || error.message?.toLowerCase().includes('fetch')) {
      return 'Connection error during booking. Please check your internet and try again.'
    }
    
    if (error.message?.toLowerCase().includes('permission') || error.message?.toLowerCase().includes('unauthorized')) {
      return 'Authentication required. Please sign in to complete your booking.'
    }

    if (error.message?.toLowerCase().includes('date') || error.message?.toLowerCase().includes('time')) {
      return 'Invalid date or time selected. Please choose a valid appointment time.'
    }

    if (error.message?.toLowerCase().includes('conflict')) {
      return 'Scheduling conflict detected. The selected time may no longer be available.'
    }

    return error.message || 'An unexpected error occurred during booking'
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

    // Specific recovery actions based on error type and booking step
    if (error?.message?.toLowerCase().includes('slot') || error?.message?.toLowerCase().includes('available')) {
      options.push({
        label: 'Choose Different Time',
        action: () => {
          addUserActionBreadcrumb('Choose different time clicked', 'interaction', {
            bookingStep: this.props.contextInfo?.bookingStep
          })
          // Try to go back to time selection if possible
          this.resetErrorBoundary()
        },
        variant: 'secondary' as const,
        icon: Clock
      })
    }

    if (error?.message?.toLowerCase().includes('service')) {
      options.push({
        label: 'Choose Different Service',
        action: () => {
          addUserActionBreadcrumb('Choose different service clicked', 'interaction')
          // Clear service selection and restart
          this.handleStartOver()
        },
        variant: 'secondary' as const,
        icon: User
      })
    }

    if (error?.message?.toLowerCase().includes('auth') || error?.message?.toLowerCase().includes('permission')) {
      options.push({
        label: 'Sign In',
        action: () => {
          addUserActionBreadcrumb('Sign in clicked from booking error', 'interaction')
          // Save booking progress and redirect to login
          if (this.props.contextInfo) {
            sessionStorage.setItem('bookingInProgress', JSON.stringify(this.props.contextInfo))
          }
          window.location.href = '/login?returnUrl=/book'
        },
        variant: 'default' as const,
        icon: User
      })
    }

    // Always offer start over option
    options.push({
      label: 'Start Over',
      action: this.handleStartOver,
      variant: 'ghost' as const,
      icon: Calendar
    })

    return options
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const errorMessage = this.getBookingErrorMessage()
      const recoveryOptions = this.getRecoveryOptions()

      return (
        <Card className="mx-auto max-w-lg">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <Calendar className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Booking Error
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {errorMessage}
                </p>
                
                {this.props.contextInfo && (
                  <div className="text-xs text-gray-500 dark:text-gray-500 mb-4 space-y-1">
                    {this.props.contextInfo.bookingStep && (
                      <p>Step: {this.props.contextInfo.bookingStep}</p>
                    )}
                    {this.props.contextInfo.selectedService && (
                      <p>Service: {this.props.contextInfo.selectedService}</p>
                    )}
                    {this.props.contextInfo.selectedDate && (
                      <p>Date: {this.props.contextInfo.selectedDate}</p>
                    )}
                    {this.props.contextInfo.selectedTime && (
                      <p>Time: {this.props.contextInfo.selectedTime}</p>
                    )}
                  </div>
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
                      'Booking feedback form opened',
                      'interaction',
                      { 
                        bookingStep: this.props.contextInfo?.bookingStep,
                        sentryEventId: this.state.sentryEventId 
                      }
                    )
                    this.setState({ showFeedbackForm: true })
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700"
                >
                  Report Booking Issue
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
                  <h4 className="text-sm font-medium mb-3">Help us improve the booking experience</h4>
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
                        What were you trying to book?
                      </label>
                      <textarea
                        className="w-full px-2 py-1 text-sm border rounded h-20 resize-none"
                        value={this.state.feedbackData.comments}
                        onChange={(e) => this.updateFeedbackData('comments', e.target.value)}
                        placeholder="Describe what appointment you were trying to book and what happened..."
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

// HOC for wrapping booking components
export function withBookingErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  contextInfo?: Props['contextInfo']
) {
  return function BookingErrorBoundaryWrapper(props: P) {
    return (
      <BookingErrorBoundary contextInfo={contextInfo}>
        <Component {...props} />
      </BookingErrorBoundary>
    )
  }
}

// Simplified fallback component for inline use
export function BookingErrorFallback({ 
  error, 
  resetError,
  bookingStep = 0
}: { 
  error: Error
  resetError?: () => void
  bookingStep?: number
}) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            Booking Error (Step {bookingStep})
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {error.message || 'An error occurred during booking'}
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