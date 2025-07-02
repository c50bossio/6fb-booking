'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, WifiOff, Lock, FileX, Server } from 'lucide-react'
import { Button } from './Button'

export type ErrorType = 'network' | 'auth' | 'permission' | 'notfound' | 'server' | 'validation' | 'generic'

interface ErrorConfig {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  actionLabel?: string
  severity: 'low' | 'medium' | 'high'
}

const errorConfigs: Record<ErrorType, ErrorConfig> = {
  network: {
    icon: WifiOff,
    title: 'Connection Error',
    description: 'Unable to connect to the server. Please check your internet connection and try again.',
    actionLabel: 'Retry Connection',
    severity: 'medium'
  },
  auth: {
    icon: Lock,
    title: 'Authentication Required',
    description: 'Please log in to access this content.',
    actionLabel: 'Sign In',
    severity: 'high'
  },
  permission: {
    icon: Lock,
    title: 'Access Denied',
    description: 'You do not have permission to view this content.',
    actionLabel: 'Go Back',
    severity: 'medium'
  },
  notfound: {
    icon: FileX,
    title: 'Not Found',
    description: 'The requested content could not be found.',
    actionLabel: 'Go Home',
    severity: 'low'
  },
  server: {
    icon: Server,
    title: 'Server Error',
    description: 'Something went wrong on our end. Please try again in a few moments.',
    actionLabel: 'Try Again',
    severity: 'high'
  },
  validation: {
    icon: AlertTriangle,
    title: 'Invalid Input',
    description: 'Please check your input and try again.',
    actionLabel: 'Review',
    severity: 'low'
  },
  generic: {
    icon: AlertTriangle,
    title: 'Error',
    description: 'An unexpected error occurred.',
    actionLabel: 'Try Again',
    severity: 'medium'
  }
}

interface ErrorDisplayProps {
  type?: ErrorType
  title?: string
  message?: string
  onAction?: () => void
  actionLabel?: string
  showAction?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ErrorDisplay({
  type = 'generic',
  title,
  message,
  onAction,
  actionLabel,
  showAction = true,
  className = '',
  size = 'md'
}: ErrorDisplayProps) {
  const config = errorConfigs[type]
  const IconComponent = config.icon
  
  const finalTitle = title || config.title
  const finalMessage = message || config.description
  const finalActionLabel = actionLabel || config.actionLabel
  
  const sizeClasses = {
    sm: 'p-4 min-h-[200px]',
    md: 'p-6 min-h-[300px]',
    lg: 'p-8 min-h-[400px]'
  }
  
  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  }
  
  const severityColors = {
    low: 'text-warning-500',
    medium: 'text-error-500',
    high: 'text-error-600'
  }

  return (
    <div className={`flex flex-col items-center justify-center text-center ${sizeClasses[size]} ${className}`}>
      <div className={`mb-4 ${severityColors[config.severity]}`}>
        <IconComponent className={`mx-auto ${iconSizes[size]}`} />
      </div>
      
      <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
        {finalTitle}
      </h3>
      
      <p className="text-secondary-600 dark:text-secondary-400 mb-6 max-w-md">
        {finalMessage}
      </p>
      
      {showAction && onAction && finalActionLabel && (
        <Button
          onClick={onAction}
          variant={config.severity === 'high' ? 'primary' : 'outline'}
          size="md"
          className="touch-target"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {finalActionLabel}
        </Button>
      )}
    </div>
  )
}

interface ErrorCardProps extends ErrorDisplayProps {
  dismissible?: boolean
  onDismiss?: () => void
}

export function ErrorCard({
  type = 'generic',
  title,
  message,
  onAction,
  actionLabel,
  showAction = true,
  dismissible = false,
  onDismiss,
  className = ''
}: ErrorCardProps) {
  const config = errorConfigs[type]
  
  return (
    <div className={`card border-l-4 ${className}`} style={{
      borderLeftColor: config.severity === 'high' ? 'rgb(239 68 68)' : 
                     config.severity === 'medium' ? 'rgb(245 158 11)' : 
                     'rgb(59 130 246)'
    }}>
      <div className="card-content">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <config.icon className={`h-5 w-5 mt-0.5 ${
              config.severity === 'high' ? 'text-error-500' :
              config.severity === 'medium' ? 'text-warning-500' :
              'text-info-500'
            }`} />
            <div className="flex-1">
              <h4 className="font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                {title || config.title}
              </h4>
              <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3">
                {message || config.description}
              </p>
              {showAction && onAction && (
                <Button
                  onClick={onAction}
                  variant="ghost"
                  size="sm"
                  className="text-primary-600 hover:text-primary-700 p-0 h-auto"
                >
                  {actionLabel || config.actionLabel}
                </Button>
              )}
            </div>
          </div>
          
          {dismissible && onDismiss && (
            <Button
              onClick={onDismiss}
              variant="ghost"
              size="sm"
              className="text-secondary-400 hover:text-secondary-600 p-1 h-auto ml-2"
            >
              ×
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

interface ErrorBoundaryFallbackProps {
  error: Error
  resetError: () => void
}

export function ErrorBoundaryFallback({ error, resetError }: ErrorBoundaryFallbackProps) {
  return (
    <ErrorDisplay
      type="server"
      title="Something went wrong"
      message={`${error.message || 'An unexpected error occurred. Please refresh the page or try again.'}`}
      onAction={resetError}
      actionLabel="Try Again"
      size="lg"
      className="my-8"
    />
  )
}

// Hook for consistent error handling
export function useErrorHandler() {
  const [error, setError] = React.useState<{
    type: ErrorType
    message?: string
    title?: string
  } | null>(null)

  const showError = React.useCallback((
    type: ErrorType,
    message?: string,
    title?: string
  ) => {
    setError({ type, message, title })
  }, [])

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  const handleNetworkError = React.useCallback(() => {
    showError('network')
  }, [showError])

  const handleAuthError = React.useCallback(() => {
    showError('auth')
  }, [showError])

  const handlePermissionError = React.useCallback(() => {
    showError('permission')
  }, [showError])

  const handleServerError = React.useCallback((message?: string) => {
    showError('server', message)
  }, [showError])

  const handleValidationError = React.useCallback((message?: string) => {
    showError('validation', message)
  }, [showError])

  return {
    error,
    showError,
    clearError,
    handleNetworkError,
    handleAuthError,
    handlePermissionError,
    handleServerError,
    handleValidationError
  }
}