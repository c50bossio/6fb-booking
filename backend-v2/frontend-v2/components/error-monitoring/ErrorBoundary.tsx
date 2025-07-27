'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  level?: 'page' | 'component' | 'critical'
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
  retryCount: number
}

/**
 * Comprehensive Error Boundary for BookedBarber V2
 * Provides graceful error handling with different fallback levels
 */
export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.generateErrorId()
    
    this.setState({
      error,
      errorInfo,
      errorId
    })

    // Report error to monitoring service
    this.reportError(error, errorInfo, errorId)

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async reportError(error: Error, errorInfo: ErrorInfo, errorId: string) {
    try {
      // Determine severity based on error type and component level
      let severity = 'medium'
      let businessImpact = 'experience_degrading'

      if (this.props.level === 'critical') {
        severity = 'high'
        businessImpact = 'user_blocking'
      } else if (this.props.level === 'page') {
        severity = 'medium'
        businessImpact = 'user_blocking'
      }

      // Extract component stack for better debugging
      const componentStack = errorInfo.componentStack
      const errorStack = error.stack || ''

      // Capture error via API
      await fetch('/api/v2/error-monitoring/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Frontend Error: ${error.message}`,
          severity,
          category: 'user_experience',
          business_impact: businessImpact,
          context: {
            error_id: errorId,
            component_stack: componentStack,
            error_stack: errorStack,
            error_name: error.name,
            browser: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
            url: typeof window !== 'undefined' ? window.location.href : 'unknown',
            timestamp: new Date().toISOString(),
            component_level: this.props.level || 'component',
            retry_count: this.state.retryCount
          },
          endpoint: typeof window !== 'undefined' ? window.location.pathname : undefined
        })
      })
    } catch (reportingError) {
      console.error('Failed to report error to monitoring service:', reportingError)
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: prevState.retryCount + 1
      }))
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    })
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  private renderComponentFallback() {
    const { error, errorId } = this.state
    
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Component Error</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-3">
            A component failed to render properly. You can try refreshing or continue using other parts of the application.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleRetry}
              disabled={this.state.retryCount >= this.maxRetries}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry ({this.maxRetries - this.state.retryCount} left)
            </Button>
            <Button variant="outline" size="sm" onClick={this.handleReset}>
              Reset
            </Button>
          </div>
          {this.props.showDetails && errorId && (
            <p className="text-xs text-muted-foreground mt-2">
              Error ID: {errorId}
            </p>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  private renderPageFallback() {
    const { error, errorId } = this.state
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Page Error</CardTitle>
            <CardDescription>
              This page encountered an error and couldn't load properly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground text-center">
              <p>Don't worry - your data is safe. Our team has been notified.</p>
              {errorId && (
                <p className="mt-2 font-mono text-xs">
                  Reference: {errorId}
                </p>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              <Button
                onClick={this.handleRetry}
                disabled={this.state.retryCount >= this.maxRetries}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again ({this.maxRetries - this.state.retryCount} attempts left)
              </Button>
              
              <Button 
                variant="outline" 
                onClick={this.handleReload}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </Button>
              
              <Button 
                variant="outline" 
                onClick={this.handleGoHome}
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Homepage
              </Button>
            </div>

            {this.props.showDetails && error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Technical Details
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                  {error.message}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  private renderCriticalFallback() {
    const { error, errorId } = this.state
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg border-destructive">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Bug className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Critical System Error</CardTitle>
            <CardDescription>
              The application encountered a critical error that prevents normal operation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Service Temporarily Unavailable</AlertTitle>
              <AlertDescription>
                We're experiencing technical difficulties. Our team has been automatically notified and is working to resolve this issue.
              </AlertDescription>
            </Alert>

            <div className="text-sm text-center space-y-2">
              <p>
                If you were in the middle of booking an appointment or processing a payment, 
                please check your email for confirmation or contact support.
              </p>
              {errorId && (
                <p className="font-mono text-xs text-muted-foreground">
                  Error Reference: {errorId}
                </p>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              <Button 
                onClick={this.handleReload}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Application
              </Button>
              
              <Button 
                variant="outline" 
                onClick={this.handleGoHome}
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Return to Homepage
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => window.open('mailto:support@bookedbarber.com', '_blank')}
                className="w-full"
              >
                Contact Support
              </Button>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              <p>
                Expected resolution time: &lt; 5 minutes<br />
                Status updates: <a href="/status" className="underline">bookedbarber.com/status</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  render() {
    if (this.state.hasError) {
      // Return custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Return appropriate fallback based on level
      switch (this.props.level) {
        case 'critical':
          return this.renderCriticalFallback()
        case 'page':
          return this.renderPageFallback()
        case 'component':
        default:
          return this.renderComponentFallback()
      }
    }

    return this.props.children
  }
}

/**
 * HOC for wrapping components with error boundaries
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

/**
 * Hook for handling async errors in components
 */
export function useAsyncErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  const handleAsyncError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return handleAsyncError
}