'use client'

import React, { Component, ReactNode } from 'react'
import { ErrorBoundary } from '../ErrorBoundary'
import { Button } from '../ui/button' 
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Shield, LogIn, RefreshCw, Home } from 'lucide-react'
import { addUserActionBreadcrumb } from '@/lib/sentry'

interface AuthErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
  onLogin?: () => void
}

/**
 * Fallback component specifically for authentication errors
 */
export function AuthErrorFallback({ 
  error, 
  resetErrorBoundary,
  onLogin 
}: AuthErrorFallbackProps) {
  const isAuthError = error.message?.toLowerCase().includes('auth') ||
                     error.message?.toLowerCase().includes('unauthorized') ||
                     error.message?.toLowerCase().includes('token') ||
                     error.message?.toLowerCase().includes('login')

  const isNetworkError = error.message?.toLowerCase().includes('network') ||
                        error.message?.toLowerCase().includes('fetch')

  const handleLoginRedirect = () => {
    addUserActionBreadcrumb(
      'Auth error login redirect', 
      'navigation',
      { errorType: 'auth', originalError: error.message }
    )
    
    if (onLogin) {
      onLogin()
    } else {
      window.location.href = '/login'
    }
  }

  const handleRetry = () => {
    addUserActionBreadcrumb(
      'Auth error retry', 
      'interaction',
      { errorType: 'auth', originalError: error.message }
    )
    resetErrorBoundary()
  }

  return (
    <div className="min-h-[300px] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Alert variant="destructive" className="border-amber-200 dark:border-amber-800">
          <Shield className="h-4 w-4" />
          <AlertTitle>
            {isAuthError ? 'Authentication Required' : 
             isNetworkError ? 'Connection Error' : 
             'Authentication Error'}
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="text-sm mb-4">
              {isAuthError ? 
                'Your session has expired or you need to log in to access this content.' :
               isNetworkError ?
                'Unable to verify your authentication status. Please check your connection.' :
               'There was a problem with authentication. Please try logging in again.'}
            </p>
            
            <div className="flex gap-2 justify-center flex-wrap">
              {isAuthError && (
                <Button onClick={handleLoginRedirect} size="sm">
                  <LogIn className="mr-2 h-4 w-4" />
                  Log In
                </Button>
              )}
              
              <Button onClick={handleRetry} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              
              <Button
                onClick={() => {
                  addUserActionBreadcrumb(
                    'Auth error home redirect',
                    'navigation', 
                    { errorType: 'auth' }
                  )
                  window.location.href = '/'
                }}
                variant="outline"
                size="sm"
              >
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}

interface AuthErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  onLogin?: () => void
}

/**
 * Specialized error boundary for authentication-related components
 * Provides user-friendly error handling for auth failures
 */
export function AuthErrorBoundary({ children, fallback, onError, onLogin }: AuthErrorBoundaryProps) {
  return (
    <ErrorBoundary
      feature="authentication"
      fallback={fallback || ((error, resetErrorBoundary) => (
        <AuthErrorFallback 
          error={error} 
          resetErrorBoundary={resetErrorBoundary}
          onLogin={onLogin}
        />
      ))}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Higher-order component wrapper for auth-dependent components
 */
export function withAuthErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    fallback?: ReactNode
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
    onLogin?: () => void
  } = {}
) {
  return function WrappedComponent(props: P) {
    return (
      <AuthErrorBoundary 
        fallback={options.fallback}
        onError={options.onError}
        onLogin={options.onLogin}
      >
        <Component {...props} />
      </AuthErrorBoundary>
    )
  }
}