'use client'

import React, { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { AlertCircle, RefreshCw, Home, LogIn } from 'lucide-react'

// ===============================
// Types and Interfaces
// ===============================

interface AuthErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  retryCount: number
}

interface AuthErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  maxRetries?: number
  showDebugInfo?: boolean
}

// ===============================
// Auth Error Boundary Component
// ===============================

export class AuthErrorBoundary extends Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  private retryTimer: NodeJS.Timeout | null = null

  constructor(props: AuthErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<AuthErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('🚨 Authentication Error Boundary caught an error:', error, errorInfo)
    
    // Update state with error info
    this.setState({
      error,
      errorInfo
    })

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Report to monitoring service (if available)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        },
        tags: {
          errorBoundary: 'AuthErrorBoundary'
        }
      })
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
    }
  }

  // ===============================
  // Error Recovery Actions
  // ===============================

  handleRetry = () => {
    const maxRetries = this.props.maxRetries || 3
    
    if (this.state.retryCount >= maxRetries) {
      console.warn('Max retries reached, not attempting retry')
      return
    }

    console.log(`🔄 Attempting retry ${this.state.retryCount + 1}/${maxRetries}`)
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }))
  }

  handleClearAuth = () => {
    console.log('🧹 Clearing authentication data')
    
    // Clear all auth-related localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      sessionStorage.clear()
      
      // Clear auth cookie
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=strict'
    }

    // Reset error boundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    })
  }

  handleGoHome = () => {
    console.log('🏠 Navigating to home page')
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  handleGoToLogin = () => {
    console.log('🔐 Navigating to login page')
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
  }

  // ===============================
  // Error Classification
  // ===============================

  isAuthError = (error: Error): boolean => {
    const authErrorKeywords = [
      'authentication',
      'unauthorized',
      'token',
      'login',
      'session',
      'expired',
      'invalid',
      '401',
      '403'
    ]

    const errorMessage = error.message.toLowerCase()
    return authErrorKeywords.some(keyword => errorMessage.includes(keyword))
  }

  isNetworkError = (error: Error): boolean => {
    const networkErrorKeywords = [
      'network',
      'fetch',
      'connection',
      'timeout',
      'offline',
      'cors'
    ]

    const errorMessage = error.message.toLowerCase()
    return networkErrorKeywords.some(keyword => errorMessage.includes(keyword))
  }

  // ===============================
  // Error UI Components
  // ===============================

  renderAuthError = () => {
    const { retryCount } = this.state
    const maxRetries = this.props.maxRetries || 3

    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-red-200 p-6 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Error
          </h2>
          
          <p className="text-gray-600 mb-6">
            We're having trouble with your authentication. This might be due to an expired session or connection issue.
          </p>

          <div className="space-y-3">
            {retryCount < maxRetries && (
              <Button 
                onClick={this.handleRetry}
                className="w-full"
                variant="primary"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again ({maxRetries - retryCount} attempts left)
              </Button>
            )}

            <Button 
              onClick={this.handleClearAuth}
              className="w-full"
              variant="outline"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Clear Session & Login
            </Button>

            <Button 
              onClick={this.handleGoHome}
              className="w-full"
              variant="ghost"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Home Page
            </Button>
          </div>

          {this.props.showDebugInfo && this.state.error && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Technical Details
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono text-gray-700 overflow-auto max-h-32">
                <div className="mb-2">
                  <strong>Error:</strong> {this.state.error.message}
                </div>
                {this.state.error.stack && (
                  <div>
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1">
                      {this.state.error.stack}
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

  renderNetworkError = () => {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-yellow-200 p-6 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-yellow-500" />
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Connection Error
          </h2>
          
          <p className="text-gray-600 mb-6">
            We're having trouble connecting to our servers. Please check your internet connection and try again.
          </p>

          <div className="space-y-3">
            <Button 
              onClick={this.handleRetry}
              className="w-full"
              variant="primary"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Connection
            </Button>

            <Button 
              onClick={this.handleGoHome}
              className="w-full"
              variant="outline"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Home Page
            </Button>
          </div>
        </div>
      </div>
    )
  }

  renderGenericError = () => {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-gray-200 p-6 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-gray-500" />
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          
          <p className="text-gray-600 mb-6">
            We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
          </p>

          <div className="space-y-3">
            <Button 
              onClick={this.handleRetry}
              className="w-full"
              variant="primary"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>

            <Button 
              onClick={() => window.location.reload()}
              className="w-full"
              variant="outline"
            >
              Refresh Page
            </Button>

            <Button 
              onClick={this.handleGoHome}
              className="w-full"
              variant="ghost"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Home Page
            </Button>
          </div>

          {this.props.showDebugInfo && this.state.error && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Error Details
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono text-gray-700 overflow-auto max-h-32">
                {this.state.error.message}
              </div>
            </details>
          )}
        </div>
      </div>
    )
  }

  // ===============================
  // Render Method
  // ===============================

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Determine error type and render appropriate UI
      if (this.state.error) {
        if (this.isAuthError(this.state.error)) {
          return this.renderAuthError()
        } else if (this.isNetworkError(this.state.error)) {
          return this.renderNetworkError()
        } else {
          return this.renderGenericError()
        }
      }

      // Fallback generic error
      return this.renderGenericError()
    }

    // No error, render children normally
    return this.props.children
  }
}

// ===============================
// Functional Wrapper Component
// ===============================

interface AuthErrorBoundaryWrapperProps {
  children: ReactNode
  fallback?: ReactNode
  maxRetries?: number
  showDebugInfo?: boolean
}

export function AuthErrorBoundaryWrapper({ 
  children, 
  fallback, 
  maxRetries = 3,
  showDebugInfo = process.env.NODE_ENV === 'development'
}: AuthErrorBoundaryWrapperProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('AuthErrorBoundary caught error:', error, errorInfo)
    
    // Report to analytics or monitoring service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false
      })
    }
  }

  return (
    <AuthErrorBoundary 
      fallback={fallback}
      onError={handleError}
      maxRetries={maxRetries}
      showDebugInfo={showDebugInfo}
    >
      {children}
    </AuthErrorBoundary>
  )
}

// ===============================
// HOC for wrapping components
// ===============================

export function withAuthErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<AuthErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <AuthErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </AuthErrorBoundary>
  )

  WrappedComponent.displayName = `withAuthErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

export default AuthErrorBoundary