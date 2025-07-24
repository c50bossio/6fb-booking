'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw, CreditCard, DollarSign, Shield } from 'lucide-react'
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
    bookingId?: number
    amount?: number
    paymentStep?: string
    userId?: string
    isGuestPayment?: boolean
    paymentMethod?: string
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
  showSecurityNotice: boolean
  feedbackData: {
    name: string
    email: string
    comments: string
  }
}

export class PaymentErrorBoundary extends Component<Props, State> {
  private maxRetries = 2 // Fewer retries for payment to avoid duplicate charges

  constructor(props: Props) {
    super(props)
    this.state = { 
      hasError: false,
      errorCount: 0,
      retryCount: 0,
      showFeedbackForm: false,
      showSecurityNotice: false,
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
    console.error('PaymentErrorBoundary caught an error:', error, errorInfo)
    
    // Enhanced error reporting for payment-specific issues
    reportApiError(error, {
      component: 'PaymentErrorBoundary',
      bookingId: this.props.contextInfo?.bookingId,
      amount: this.props.contextInfo?.amount,
      paymentStep: this.props.contextInfo?.paymentStep,
      userId: this.props.contextInfo?.userId,
      isGuestPayment: this.props.contextInfo?.isGuestPayment,
      paymentMethod: this.props.contextInfo?.paymentMethod,
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      criticalError: true // Mark payment errors as critical
    })
    const sentryEventId = undefined
    
    addUserActionBreadcrumb(
      'Payment error caught by boundary',
      'error',
      {
        bookingId: this.props.contextInfo?.bookingId,
        amount: this.props.contextInfo?.amount,
        paymentStep: this.props.contextInfo?.paymentStep,
        errorMessage: error.message,
        errorStack: error.stack?.substring(0, 1000),
      }
    )
    
    // Show security notice for payment errors
    this.setState((prev) => ({ 
      errorInfo,
      errorCount: prev.errorCount + 1,
      sentryEventId,
      showSecurityNotice: true
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
      'Payment error boundary reset',
      'interaction',
      {
        bookingId: this.props.contextInfo?.bookingId,
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
      showSecurityNotice: false,
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
        'Payment retry attempt',
        'interaction',
        {
          retryCount: this.state.retryCount + 1,
          maxRetries: this.maxRetries,
          bookingId: this.props.contextInfo?.bookingId,
          amount: this.props.contextInfo?.amount,
        }
      )
      
      this.setState(prev => ({ 
        retryCount: prev.retryCount + 1 
      }))
      this.resetErrorBoundary()
    }
  }

  handleContactSupport = () => {
    addUserActionBreadcrumb(
      'Contact support clicked from payment error',
      'interaction',
      {
        bookingId: this.props.contextInfo?.bookingId,
        amount: this.props.contextInfo?.amount,
      }
    )
    
    // Create pre-filled support email
    const subject = encodeURIComponent(`Payment Issue - Booking ${this.props.contextInfo?.bookingId || 'Unknown'}`)
    const body = encodeURIComponent(`
Hi Support Team,

I encountered a payment error while trying to complete my booking.

Booking Details:
- Booking ID: ${this.props.contextInfo?.bookingId || 'Unknown'}
- Amount: $${this.props.contextInfo?.amount || 'Unknown'}
- Payment Step: ${this.props.contextInfo?.paymentStep || 'Unknown'}
- Error: ${this.state.error?.message || 'Unknown error'}

Please help me complete this payment securely.

Thank you!
    `)
    
    window.location.href = `mailto:support@bookedbarber.com?subject=${subject}&body=${body}`
  }

  handleFeedbackSubmit = () => {
    const { feedbackData, sentryEventId } = this.state
    
    if (feedbackData.name && feedbackData.email && feedbackData.comments) {
      captureUserFeedback(feedbackData, sentryEventId)
      
      addUserActionBreadcrumb(
        'Payment error feedback submitted',
        'interaction',
        {
          bookingId: this.props.contextInfo?.bookingId,
          amount: this.props.contextInfo?.amount,
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

  getPaymentErrorMessage = () => {
    const error = this.state.error
    if (!error) return 'A payment error occurred'

    // Check for specific payment-related errors
    if (error.message?.toLowerCase().includes('card')) {
      return 'Payment card error. Please check your card details and try again.'
    }
    
    if (error.message?.toLowerCase().includes('declined') || error.message?.toLowerCase().includes('insufficient')) {
      return 'Payment was declined. Please check with your bank or try a different payment method.'
    }
    
    if (error.message?.toLowerCase().includes('expired')) {
      return 'Payment method has expired. Please update your payment information.'
    }
    
    if (error.message?.toLowerCase().includes('network') || error.message?.toLowerCase().includes('connection')) {
      return 'Payment processing interrupted due to connection issues. Your payment may not have been charged.'
    }
    
    if (error.message?.toLowerCase().includes('timeout')) {
      return 'Payment processing timed out. Please check your bank statement before retrying.'
    }

    if (error.message?.toLowerCase().includes('duplicate')) {
      return 'Duplicate payment detected. Please check your booking status before trying again.'
    }

    if (error.message?.toLowerCase().includes('stripe') || error.message?.toLowerCase().includes('processing')) {
      return 'Payment processor error. Your payment information is secure and has not been compromised.'
    }

    return 'Payment processing failed. Please try again or contact support for assistance.'
  }

  getRecoveryOptions = () => {
    const error = this.state.error
    const options = []

    // Retry option for non-card errors
    if (this.state.retryCount < this.maxRetries && 
        !error?.message?.toLowerCase().includes('declined') &&
        !error?.message?.toLowerCase().includes('insufficient')) {
      options.push({
        label: `Retry Payment (${this.maxRetries - this.state.retryCount} attempts left)`,
        action: this.handleRetry,
        variant: 'outline' as const,
        icon: RefreshCw
      })
    }

    // Different payment method option
    if (error?.message?.toLowerCase().includes('card') || 
        error?.message?.toLowerCase().includes('declined')) {
      options.push({
        label: 'Try Different Payment Method',
        action: () => {
          addUserActionBreadcrumb('Try different payment method clicked', 'interaction', {
            bookingId: this.props.contextInfo?.bookingId
          })
          this.resetErrorBoundary()
        },
        variant: 'secondary' as const,
        icon: CreditCard
      })
    }

    // Check booking status option
    if (error?.message?.toLowerCase().includes('timeout') || 
        error?.message?.toLowerCase().includes('network')) {
      options.push({
        label: 'Check Booking Status',
        action: () => {
          addUserActionBreadcrumb('Check booking status clicked', 'interaction', {
            bookingId: this.props.contextInfo?.bookingId
          })
          window.location.href = '/bookings'
        },
        variant: 'secondary' as const,
        icon: DollarSign
      })
    }

    // Always offer contact support for payment issues
    options.push({
      label: 'Contact Support',
      action: this.handleContactSupport,
      variant: 'primary' as const,
      icon: Shield
    })

    return options
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const errorMessage = this.getPaymentErrorMessage()
      const recoveryOptions = this.getRecoveryOptions()

      return (
        <Card className="mx-auto max-w-lg">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <CreditCard className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Payment Error
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {errorMessage}
                </p>
                
                {this.props.contextInfo && (
                  <div className="text-xs text-gray-500 dark:text-gray-500 mb-4 space-y-1">
                    {this.props.contextInfo.bookingId && (
                      <p>Booking ID: {this.props.contextInfo.bookingId}</p>
                    )}
                    {this.props.contextInfo.amount && (
                      <p>Amount: ${this.props.contextInfo.amount}</p>
                    )}
                    {this.props.contextInfo.paymentStep && (
                      <p>Step: {this.props.contextInfo.paymentStep}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Security Notice */}
              {this.state.showSecurityNotice && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Your Payment Information is Secure
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        No payment information is stored on our servers. All transactions are processed securely through Stripe.
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
                      'Payment feedback form opened',
                      'interaction',
                      { 
                        bookingId: this.props.contextInfo?.bookingId,
                        sentryEventId: this.state.sentryEventId 
                      }
                    )
                    this.setState({ showFeedbackForm: true })
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700"
                >
                  Report Payment Issue
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
                  <h4 className="text-sm font-medium mb-3">Help us improve payment processing</h4>
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
                        What payment method were you using?
                      </label>
                      <textarea
                        className="w-full px-2 py-1 text-sm border rounded h-20 resize-none"
                        value={this.state.feedbackData.comments}
                        onChange={(e) => this.updateFeedbackData('comments', e.target.value)}
                        placeholder="Describe the payment method and what happened during checkout..."
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

// HOC for wrapping payment components
export function withPaymentErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  contextInfo?: Props['contextInfo']
) {
  return function PaymentErrorBoundaryWrapper(props: P) {
    return (
      <PaymentErrorBoundary contextInfo={contextInfo}>
        <Component {...props} />
      </PaymentErrorBoundary>
    )
  }
}

// Simplified fallback component for inline use
export function PaymentErrorFallback({ 
  error, 
  resetError,
  amount
}: { 
  error: Error
  resetError?: () => void
  amount?: number
}) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            Payment Error {amount && `($${amount})`}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {error.message || 'Payment processing failed'}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
            Your payment information remains secure
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