'use client'

import React, { Component, ReactNode, useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home, WifiOff, ArrowLeft, Shield } from 'lucide-react'
import { Button } from './ui/button'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { useRouter } from 'next/navigation'
import { isOnline, useNetworkStatus } from '@/lib/RetryManager'

// Error types with specific handling strategies
export type ErrorType = 
  | 'network'
  | 'auth'
  | 'permission'
  | 'validation'
  | 'server'
  | 'timeout'
  | 'chunk_load'
  | 'rate_limit'
  | 'conflict'
  | 'not_found'
  | 'payment'
  | 'unknown'

export interface EnhancedError extends Error {
  type?: ErrorType
  code?: string
  statusCode?: number
  context?: Record<string, any>
  recoverable?: boolean
  retryAfter?: number // seconds
  details?: string[]
  userMessage?: string
}

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: EnhancedError, errorInfo: React.ErrorInfo) => void
  onRetry?: () => void | Promise<void>
  maxRetries?: number
  enableAutoRetry?: boolean
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
  context?: string
}

interface State {
  hasError: boolean
  error?: EnhancedError
  errorInfo?: React.ErrorInfo
  errorCount: number
  retryCount: number
  isRetrying: boolean
  lastErrorTime: number
  errorHistory: Array<{ error: EnhancedError; timestamp: number }>
}

export class ErrorBoundaryWithRetry extends Component<Props, State> {
  private retryTimeoutId?: NodeJS.Timeout
  private readonly maxRetries: number

  constructor(props: Props) {
    super(props)
    this.maxRetries = props.maxRetries ?? 3
    this.state = { 
      hasError: false,
      errorCount: 0,
      retryCount: 0,
      isRetrying: false,
      lastErrorTime: 0,
      errorHistory: []
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const enhancedError = ErrorBoundaryWithRetry.enhanceError(error)
    
    return { 
      hasError: true, 
      error: enhancedError,
      lastErrorTime: Date.now()
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const enhancedError = ErrorBoundaryWithRetry.enhanceError(error)
    
    console.error('ErrorBoundaryWithRetry caught an error:', {
      error: enhancedError,
      errorInfo,
      context: this.props.context,
      timestamp: new Date().toISOString()
    })

    // Update error history
    this.setState(prev => ({
      errorInfo,
      errorCount: prev.errorCount + 1,
      errorHistory: [
        ...prev.errorHistory.slice(-4), // Keep last 5 errors
        { error: enhancedError, timestamp: Date.now() }
      ]
    }))

    // Notify parent
    this.props.onError?.(enhancedError, errorInfo)
    
    // Log to monitoring service
    this.logErrorToMonitoring(enhancedError, errorInfo)
    
    // Auto-retry for recoverable errors
    if (this.props.enableAutoRetry && enhancedError.recoverable && this.state.retryCount < this.maxRetries) {
      this.scheduleAutoRetry(enhancedError)
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

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  public static enhanceError(error: Error): EnhancedError {
    const enhanced = error as EnhancedError
    
    // Detect error type from message or properties
    if (!enhanced.type) {
      const message = error.message.toLowerCase()
      
      if (message.includes('network') || message.includes('fetch')) {
        enhanced.type = 'network'
        enhanced.recoverable = true
      } else if (message.includes('unauthorized') || message.includes('401')) {
        enhanced.type = 'auth'
        enhanced.recoverable = false
      } else if (message.includes('forbidden') || message.includes('403')) {
        enhanced.type = 'permission'
        enhanced.recoverable = false
      } else if (message.includes('validation') || message.includes('invalid')) {
        enhanced.type = 'validation'
        enhanced.recoverable = false
      } else if (message.includes('timeout')) {
        enhanced.type = 'timeout'
        enhanced.recoverable = true
      } else if (message.includes('chunk') || message.includes('loading css chunk')) {
        enhanced.type = 'chunk_load'
        enhanced.recoverable = true
      } else if (message.includes('429') || message.includes('rate limit')) {
        enhanced.type = 'rate_limit'
        enhanced.recoverable = true
        enhanced.retryAfter = 60 // Default to 60 seconds
      } else if (message.includes('conflict') || message.includes('409')) {
        enhanced.type = 'conflict'
        enhanced.recoverable = false
      } else if (message.includes('not found') || message.includes('404')) {
        enhanced.type = 'not_found'
        enhanced.recoverable = false
      } else if (message.includes('payment') || message.includes('stripe')) {
        enhanced.type = 'payment'
        enhanced.recoverable = false
      } else if ((enhanced as any).statusCode && (enhanced as any).statusCode >= 500) {
        enhanced.type = 'server'
        enhanced.recoverable = true
      } else {
        enhanced.type = 'unknown'
        enhanced.recoverable = true
      }
    }

    // Add user-friendly message if not present
    if (!enhanced.userMessage) {
      enhanced.userMessage = ErrorBoundaryWithRetry.getUserMessage(enhanced)
    }

    return enhanced
  }

  private static getUserMessage(error: EnhancedError): string {
    switch (error.type) {
      case 'network':
        return isOnline() 
          ? 'Unable to connect to the server. Please check your connection and try again.'
          : 'You are currently offline. Please check your internet connection.'
      case 'auth':
        return 'Your session has expired. Please log in again to continue.'
      case 'permission':
        return 'You do not have permission to access this resource.'
      case 'validation':
        return 'The information provided is invalid. Please check and try again.'
      case 'timeout':
        return 'The request took too long to complete. Please try again.'
      case 'chunk_load':
        return 'Failed to load application resources. This can happen after an update.'
      case 'rate_limit':
        return 'Too many requests. Please wait a moment before trying again.'
      case 'conflict':
        return 'A conflict occurred. The resource may have been modified by someone else.'
      case 'not_found':
        return 'The requested resource was not found.'
      case 'payment':
        return 'A payment error occurred. Please check your payment details and try again.'
      case 'server':
        return 'The server encountered an error. Our team has been notified.'
      default:
        return error.message || 'An unexpected error occurred. Please try again.'
    }
  }

  private getRecoverySuggestions(error: EnhancedError): string[] {
    const suggestions: string[] = []

    switch (error.type) {
      case 'network':
        suggestions.push('Check your internet connection')
        suggestions.push('Try disabling VPN or proxy if you\'re using one')
        suggestions.push('Check if the website is accessible from another device')
        break
      case 'auth':
        suggestions.push('Click the Login button to sign in again')
        suggestions.push('Clear your browser cookies and try again')
        break
      case 'permission':
        suggestions.push('Contact your administrator for access')
        suggestions.push('Make sure you\'re logged in with the correct account')
        break
      case 'chunk_load':
        suggestions.push('Reload the page to get the latest version')
        suggestions.push('Clear your browser cache')
        suggestions.push('Try using an incognito/private window')
        break
      case 'timeout':
        suggestions.push('Check your internet speed')
        suggestions.push('Try again when the server is less busy')
        break
      case 'rate_limit':
        if (error.retryAfter) {
          suggestions.push(`Wait ${error.retryAfter} seconds before trying again`)
        } else {
          suggestions.push('Wait a few minutes before trying again')
        }
        break
      case 'payment':
        suggestions.push('Verify your payment details are correct')
        suggestions.push('Check with your bank if the payment was declined')
        suggestions.push('Try a different payment method')
        break
    }

    return suggestions
  }

  private scheduleAutoRetry(error: EnhancedError) {
    const delay = this.calculateRetryDelay(error)
    
    
    this.retryTimeoutId = setTimeout(() => {
      this.handleRetry()
    }, delay)
  }

  private calculateRetryDelay(error: EnhancedError): number {
    // Use retryAfter if provided (e.g., from rate limit headers)
    if (error.retryAfter) {
      return error.retryAfter * 1000
    }

    // Exponential backoff with jitter
    const baseDelay = 1000
    const maxDelay = 30000
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, this.state.retryCount),
      maxDelay
    )
    const jitter = Math.random() * 0.3 * exponentialDelay
    
    return exponentialDelay + jitter
  }

  private async handleRetry() {
    if (this.state.retryCount >= this.maxRetries) {
      console.warn('Max retries reached')
      return
    }

    // Check network status first
    if (!isOnline() && this.state.error?.type === 'network') {
      return
    }

    this.setState({ isRetrying: true })

    try {
      // If custom retry handler provided, use it
      if (this.props.onRetry) {
        await this.props.onRetry()
      }

      // Reset error state
      this.setState(prev => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prev.retryCount + 1,
        isRetrying: false
      }))
    } catch (retryError) {
      console.error('Retry failed:', retryError)
      this.setState(prev => ({
        isRetrying: false,
        retryCount: prev.retryCount + 1
      }))
    }
  }

  private resetErrorBoundary = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }

    this.setState({ 
      hasError: false, 
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
      isRetrying: false
    })
  }

  private logErrorToMonitoring(error: EnhancedError, errorInfo: React.ErrorInfo) {
    // Production error tracking
    if (process.env.NODE_ENV === 'production') {
      // Sentry integration
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack
            },
            error: {
              type: error.type,
              code: error.code,
              recoverable: error.recoverable,
              context: error.context
            }
          },
          tags: {
            errorBoundary: 'enhanced',
            section: this.props.context,
            errorType: error.type
          }
        })
      }

      // Custom analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'exception', {
          description: error.userMessage || error.message,
          fatal: !error.recoverable,
          error_type: error.type,
          error_code: error.code
        })
      }
    }

    // Store error locally for debugging
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        type: error.type,
        message: error.message,
        userMessage: error.userMessage,
        stack: error.stack,
        context: this.props.context,
        errorCount: this.state.errorCount,
        retryCount: this.state.retryCount
      }
      
      const existingLogs = JSON.parse(localStorage.getItem('error_logs') || '[]')
      existingLogs.push(errorLog)
      
      // Keep only last 10 errors
      if (existingLogs.length > 10) {
        existingLogs.splice(0, existingLogs.length - 10)
      }
      
      localStorage.setItem('error_logs', JSON.stringify(existingLogs))
    } catch (storageError) {
      console.warn('Failed to store error log:', storageError)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorDisplay
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorCount={this.state.errorCount}
          retryCount={this.state.retryCount}
          maxRetries={this.maxRetries}
          isRetrying={this.state.isRetrying}
          onRetry={() => this.handleRetry()}
          onReset={() => this.resetErrorBoundary()}
          getSuggestions={(error) => this.getRecoverySuggestions(error)}
          context={this.props.context}
        />
      )
    }

    return this.props.children
  }
}

// Enhanced error display component
interface ErrorDisplayProps {
  error?: EnhancedError
  errorInfo?: React.ErrorInfo
  errorCount: number
  retryCount: number
  maxRetries: number
  isRetrying: boolean
  onRetry: () => void
  onReset: () => void
  getSuggestions: (error: EnhancedError) => string[]
  context?: string
}

function ErrorDisplay({
  error,
  errorInfo,
  errorCount,
  retryCount,
  maxRetries,
  isRetrying,
  onRetry,
  onReset,
  getSuggestions,
  context
}: ErrorDisplayProps) {
  const router = useRouter()
  const isNetworkOnline = useNetworkStatus()
  const [showDetails, setShowDetails] = useState(false)

  if (!error) {
    error = new Error('An unknown error occurred') as EnhancedError
  }

  const canRetry = retryCount < maxRetries && error.recoverable !== false
  const suggestions = getSuggestions(error)

  const getIcon = () => {
    switch (error.type) {
      case 'network':
        return <WifiOff className="h-5 w-5" />
      case 'auth':
      case 'permission':
        return <Shield className="h-5 w-5" />
      default:
        return <AlertTriangle className="h-5 w-5" />
    }
  }

  const getAlertVariant = () => {
    switch (error.type) {
      case 'auth':
      case 'permission':
        return 'default' as const
      default:
        return 'destructive' as const
    }
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <Alert variant={getAlertVariant()} className="border-2">
          <div className="flex items-start gap-3">
            {getIcon()}
            <div className="flex-1">
              <AlertTitle className="mb-2">
                {error.type === 'network' && !isNetworkOnline ? 'You\'re Offline' :
                 error.type === 'auth' ? 'Authentication Required' :
                 error.type === 'permission' ? 'Access Denied' :
                 error.type === 'chunk_load' ? 'Update Available' :
                 error.type === 'rate_limit' ? 'Too Many Requests' :
                 'Something Went Wrong'}
              </AlertTitle>
              <AlertDescription>
                <p className="text-sm mb-3">
                  {error.userMessage || error.message}
                </p>
                
                {/* Network status indicator */}
                {error.type === 'network' && !isNetworkOnline && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-3">
                    <div className="w-2 h-2 bg-amber-600 dark:bg-amber-400 rounded-full animate-pulse" />
                    <span className="text-xs font-medium">No internet connection</span>
                  </div>
                )}

                {/* Retry indicator */}
                {canRetry && retryCount > 0 && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Retry attempt {retryCount} of {maxRetries}
                  </p>
                )}

                {/* Error details */}
                {error.details && error.details.length > 0 && (
                  <ul className="text-xs space-y-1 mb-3">
                    {error.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-muted-foreground">•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="bg-muted/50 rounded-md p-3 mb-3">
                    <p className="text-xs font-medium mb-1">Try these solutions:</p>
                    <ul className="text-xs space-y-1">
                      {suggestions.map((suggestion, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-primary">→</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Development error details */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-3">
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="text-xs font-medium underline"
                    >
                      {showDetails ? 'Hide' : 'Show'} error details
                    </button>
                    {showDetails && errorInfo && (
                      <div className="mt-2 space-y-2">
                        <pre className="text-xs overflow-auto p-2 bg-gray-100 dark:bg-gray-800 rounded max-h-48">
                          {error.stack}
                        </pre>
                        <pre className="text-xs overflow-auto p-2 bg-gray-100 dark:bg-gray-800 rounded max-h-48">
                          {errorInfo.componentStack}
                        </pre>
                        {context && (
                          <p className="text-xs text-muted-foreground">
                            Context: {context}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </AlertDescription>
            </div>
          </div>
        </Alert>
        
        {/* Action buttons */}
        <div className="flex gap-2 justify-center">
          {error.type === 'auth' ? (
            <Button 
              onClick={() => router.push('/login')}
              variant="primary"
              size="sm"
            >
              <Shield className="mr-2 h-4 w-4" />
              Go to Login
            </Button>
          ) : (
            <>
              {canRetry && (
                <Button 
                  onClick={onRetry}
                  variant="outline"
                  size="sm"
                  disabled={isRetrying}
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again
                    </>
                  )}
                </Button>
              )}
              
              {error.type === 'chunk_load' ? (
                <Button
                  onClick={() => window.location.reload()}
                  variant="primary"
                  size="sm"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => router.back()}
                    variant="outline"
                    size="sm"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go Back
                  </Button>
                  <Button
                    onClick={() => router.push('/')}
                    variant="outline"
                    size="sm"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Go Home
                  </Button>
                </>
              )}
            </>
          )}
        </div>
        
        {/* Error frequency warning */}
        {errorCount > 2 && (
          <p className="text-xs text-center text-muted-foreground">
            This error has occurred {errorCount} times. 
            {errorCount > 5 && ' Consider contacting support if the issue persists.'}
          </p>
        )}
      </div>
    </div>
  )
}

// HOC for easier use
export function withEnhancedErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Partial<Props>
) {
  return function EnhancedErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundaryWithRetry {...options}>
        <Component {...props} />
      </ErrorBoundaryWithRetry>
    )
  }
}

// Hook for programmatic error handling
export function useErrorHandler() {
  const [error, setError] = useState<EnhancedError | null>(null)

  const resetError = () => setError(null)

  const captureError = (error: Error | EnhancedError) => {
    const enhanced = ErrorBoundaryWithRetry.enhanceError(error)
    setError(enhanced)
  }

  useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return { captureError, resetError }
}