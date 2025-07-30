'use client'

/**
 * Enhanced Error Boundary with Recovery Mechanisms
 * 
 * Features:
 * - Automatic error reporting and classification
 * - User-friendly error fallback UI
 * - Retry mechanisms for recoverable errors
 * - User feedback collection
 * - Context-aware error handling
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { reportError, reportUserFeedback, UserFeedbackData } from '@/lib/error-monitoring'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { AlertTriangle, RefreshCw, MessageCircle, Home, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  children: ReactNode
  fallbackComponent?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  isolate?: boolean
  context?: string
  enableRetry?: boolean
  enableFeedback?: boolean
  maxRetries?: number
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorId?: string
  retryCount: number
  showFeedback: boolean
  feedbackSubmitted: boolean
}

export interface ErrorFallbackProps {
  error?: Error
  errorInfo?: ErrorInfo
  resetError: () => void
  retryCount: number
  onRetry: () => void
  onFeedback: () => void
  showFeedback: boolean
  context?: string
  errorId?: string
}

class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      retryCount: 0,
      showFeedback: false,
      feedbackSubmitted: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, context } = this.props
    
    // Report error to monitoring system
    const errorId = reportError({
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: context || 'unknown',
      type: 'react_boundary'
    })

    this.setState({
      error,
      errorInfo,
      errorId
    })

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo)
    }

    console.error('Error caught by boundary:', error, errorInfo)
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
      showFeedback: false,
      feedbackSubmitted: false
    })
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props
    const { retryCount } = this.state

    if (retryCount >= maxRetries) {
      toast.error('Maximum retry attempts reached. Please refresh the page.')
      return
    }

    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1
    }))

    // Add delay before retry to avoid immediate re-error
    setTimeout(() => {
      this.resetError()
      toast.info(`Retrying... (${retryCount + 1}/${maxRetries})`)
    }, 1000)
  }

  handleFeedback = () => {
    this.setState({ showFeedback: true })
  }

  handleFeedbackSubmit = (feedback: Omit<UserFeedbackData, 'errorId'>) => {
    const { errorId } = this.state
    
    if (errorId) {
      reportUserFeedback({
        ...feedback,
        errorId
      })
      
      this.setState({ feedbackSubmitted: true, showFeedback: false })
      toast.success('Thank you for your feedback! Our team will investigate this issue.')
    }
  }

  render() {
    const { children, fallbackComponent: FallbackComponent, isolate, enableRetry = true, enableFeedback = true } = this.props
    const { hasError, error, errorInfo, retryCount, showFeedback, errorId } = this.state

    if (hasError) {
      const errorFallbackProps: ErrorFallbackProps = {
        error,
        errorInfo,
        resetError: this.resetError,
        retryCount,
        onRetry: this.handleRetry,
        onFeedback: this.handleFeedback,
        showFeedback,
        context: this.props.context,
        errorId
      }

      if (FallbackComponent) {
        return <FallbackComponent {...errorFallbackProps} />
      }

      return (
        <ErrorFallbackUI
          {...errorFallbackProps}
          enableRetry={enableRetry}
          enableFeedback={enableFeedback}
          onFeedbackSubmit={this.handleFeedbackSubmit}
          feedbackSubmitted={this.state.feedbackSubmitted}
        />
      )
    }

    if (isolate) {
      return <div className="error-boundary-isolation">{children}</div>
    }

    return children
  }
}

interface ErrorFallbackUIProps extends ErrorFallbackProps {
  enableRetry: boolean
  enableFeedback: boolean
  onFeedbackSubmit: (feedback: Omit<UserFeedbackData, 'errorId'>) => void
  feedbackSubmitted: boolean
}

function ErrorFallbackUI({
  error,
  resetError,
  retryCount,
  onRetry,
  onFeedback,
  showFeedback,
  context,
  errorId,
  enableRetry,
  enableFeedback,
  onFeedbackSubmit,
  feedbackSubmitted
}: ErrorFallbackUIProps) {
  const [feedbackForm, setFeedbackForm] = React.useState({
    description: '',
    reproductionSteps: '',
    expectedBehavior: '',
    severity: 'annoying' as const,
    userEmail: ''
  })

  const isBookingContext = context?.includes('booking') || error?.message?.toLowerCase().includes('booking')
  const isPaymentContext = context?.includes('payment') || error?.message?.toLowerCase().includes('payment')
  const isCriticalContext = isBookingContext || isPaymentContext

  const getContextualMessage = () => {
    if (isPaymentContext) {
      return {
        title: 'Payment Processing Error',
        message: 'We encountered an issue while processing your payment. Your card has not been charged.',
        severity: 'critical' as const
      }
    }
    
    if (isBookingContext) {
      return {
        title: 'Booking System Error', 
        message: 'We encountered an issue with the booking system. Your appointment has not been confirmed yet.',
        severity: 'high' as const
      }
    }
    
    return {
      title: 'Something went wrong',
      message: 'We encountered an unexpected error. Our team has been notified and is working on a fix.',
      severity: 'medium' as const
    }
  }

  const contextMessage = getContextualMessage()

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    onFeedbackSubmit({
      ...feedbackForm,
      category: context || 'general'
    })
  }

  if (showFeedback) {
    return (
      <Card className="max-w-2xl mx-auto m-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Help Us Fix This Issue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                What were you trying to do when this error occurred?
              </label>
              <textarea
                value={feedbackForm.description}
                onChange={(e) => setFeedbackForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="I was trying to book an appointment when..."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Steps to reproduce (optional)
              </label>
              <textarea
                value={feedbackForm.reproductionSteps}
                onChange={(e) => setFeedbackForm(prev => ({ ...prev, reproductionSteps: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="1. Click on calendar... 2. Select date... 3. Error occurred"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                What did you expect to happen?
              </label>
              <textarea
                value={feedbackForm.expectedBehavior}
                onChange={(e) => setFeedbackForm(prev => ({ ...prev, expectedBehavior: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="I expected to see the booking confirmation page"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                How is this affecting you?
              </label>
              <select
                value={feedbackForm.severity}
                onChange={(e) => setFeedbackForm(prev => ({ ...prev, severity: e.target.value as any }))}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="minor">Minor inconvenience</option>
                <option value="annoying">Somewhat annoying</option>
                <option value="blocking">Completely blocks my task</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Email (optional - for follow-up)
              </label>
              <input
                type="email"
                value={feedbackForm.userEmail}
                onChange={(e) => setFeedbackForm(prev => ({ ...prev, userEmail: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>
            
            <div className="flex gap-3">
              <Button type="submit" className="flex-1">
                Submit Feedback
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onFeedback()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <AlertTriangle 
              className={`h-6 w-6 ${
                contextMessage.severity === 'critical' ? 'text-red-500' :
                contextMessage.severity === 'high' ? 'text-orange-500' :
                'text-yellow-500'
              }`} 
            />
            {contextMessage.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-600 text-lg">
            {contextMessage.message}
          </p>
          
          {isCriticalContext && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">What you can do:</h4>
              <ul className="text-blue-800 text-sm space-y-1">
                {isPaymentContext && (
                  <>
                    <li>• Your payment method has not been charged</li>
                    <li>• Try refreshing the page and attempting the payment again</li>
                    <li>• If the issue persists, contact support for assistance</li>
                  </>
                )}
                {isBookingContext && (
                  <>
                    <li>• Your appointment slot is still available</li>
                    <li>• Try refreshing the page and booking again</li>
                    <li>• Check your email for any confirmation messages</li>
                  </>
                )}
              </ul>
            </div>
          )}
          
          {error && (
            <details className="bg-gray-100 rounded-lg p-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                Technical Details
              </summary>
              <div className="text-xs text-gray-600 font-mono">
                <p className="mb-2"><strong>Error:</strong> {error.message}</p>
                {errorId && <p className="mb-2"><strong>Error ID:</strong> {errorId}</p>}
                <p><strong>Context:</strong> {context || 'General'}</p>
              </div>
            </details>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            {enableRetry && (
              <Button
                onClick={onRetry}
                className="flex items-center gap-2"
                disabled={retryCount >= 3}
              >
                <RefreshCw className="h-4 w-4" />
                {retryCount >= 3 ? 'Max Retries Reached' : `Try Again ${retryCount > 0 ? `(${retryCount}/3)` : ''}`}
              </Button>
            )}
            
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
            
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            
            {enableFeedback && !feedbackSubmitted && (
              <Button
                onClick={onFeedback}
                variant="outline"
                className="flex items-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Report Issue
              </Button>
            )}
          </div>
          
          {feedbackSubmitted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">
                ✓ Thank you for your feedback! We'll investigate this issue and get back to you if needed.
              </p>
            </div>
          )}
          
          <div className="text-center text-sm text-gray-500">
            Need immediate help? Contact support at{' '}
            <a href="mailto:support@bookedbarber.com" className="text-blue-600 hover:underline">
              support@bookedbarber.com
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EnhancedErrorBoundary

// Specialized error boundaries for different contexts
export function PaymentErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <EnhancedErrorBoundary
      context="payment"
      enableRetry={true}
      enableFeedback={true}
      maxRetries={2}
    >
      {children}
    </EnhancedErrorBoundary>
  )
}

export function BookingErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <EnhancedErrorBoundary
      context="booking"
      enableRetry={true}
      enableFeedback={true}
      maxRetries={3}
    >
      {children}
    </EnhancedErrorBoundary>
  )
}

export function CalendarErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <EnhancedErrorBoundary
      context="calendar"
      enableRetry={true}
      enableFeedback={true}
      isolate={true}
    >
      {children}
    </EnhancedErrorBoundary>
  )
}

export function FormErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <EnhancedErrorBoundary
      context="form"
      enableRetry={false}
      enableFeedback={true}
      isolate={true}
    >
      {children}
    </EnhancedErrorBoundary>
  )
}