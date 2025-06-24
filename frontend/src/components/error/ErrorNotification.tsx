'use client'

/**
 * Error notification component for displaying inline error messages and toast notifications
 * Supports different error severities with auto-dismiss functionality
 */

import React, { useEffect, useState, useCallback } from 'react'
import { AppError, ErrorSeverity } from '@/lib/error-handling/error-types'
import { errorManager } from '@/lib/error-handling/error-manager'

interface ErrorNotificationProps {
  error?: AppError | null
  onDismiss?: () => void
  autoDissmiss?: boolean
  dismissTimeout?: number
  showRecoveryActions?: boolean
  variant?: 'inline' | 'toast' | 'banner'
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  className?: string
}

interface ToastManagerProps {
  maxToasts?: number
  defaultTimeout?: number
  position?: ErrorNotificationProps['position']
}

// Toast manager context
const ToastContext = React.createContext<{
  addToast: (error: AppError, options?: { timeout?: number }) => void
  removeToast: (id: string) => void
} | null>(null)

export function useErrorToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useErrorToast must be used within a ToastProvider')
  }
  return context
}

// Toast manager component
export function ToastProvider({
  children,
  maxToasts = 5,
  defaultTimeout = 5000,
  position = 'top-right'
}: ToastManagerProps & { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ id: string; error: AppError; timeout?: number }>>([])

  const addToast = useCallback((error: AppError, options?: { timeout?: number }) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timeout = options?.timeout ?? defaultTimeout

    setToasts(prev => {
      const newToasts = [...prev, { id, error, timeout }]
      // Remove oldest if exceeding max
      if (newToasts.length > maxToasts) {
        return newToasts.slice(-maxToasts)
      }
      return newToasts
    })
  }, [maxToasts, defaultTimeout])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4'
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2'
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2'
      default:
        return 'top-4 right-4'
    }
  }

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {toasts.length > 0 && (
        <div className={`fixed ${getPositionClasses()} z-50 space-y-2 max-w-sm w-full`}>
          {toasts.map(toast => (
            <ErrorNotification
              key={toast.id}
              error={toast.error}
              variant="toast"
              autoDissmiss={true}
              dismissTimeout={toast.timeout}
              onDismiss={() => removeToast(toast.id)}
              showRecoveryActions={true}
            />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

// Main error notification component
export function ErrorNotification({
  error,
  onDismiss,
  autoDissmiss = false,
  dismissTimeout = 5000,
  showRecoveryActions = false,
  variant = 'inline',
  position = 'top-right',
  className = '',
}: ErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (autoDissmiss && dismissTimeout > 0) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, dismissTimeout)

      return () => clearTimeout(timer)
    }
  }, [autoDissmiss, dismissTimeout])

  const handleDismiss = useCallback(() => {
    setIsAnimating(true)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss?.()
    }, 300) // Animation duration
  }, [onDismiss])

  const getSeverityConfig = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.INFO:
        return {
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          textColor: 'text-blue-800 dark:text-blue-300',
          iconColor: 'text-blue-400',
          buttonColor: 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300',
        }
      case ErrorSeverity.WARNING:
        return {
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          textColor: 'text-yellow-800 dark:text-yellow-300',
          iconColor: 'text-yellow-400',
          buttonColor: 'text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300',
        }
      case ErrorSeverity.ERROR:
        return {
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-800 dark:text-red-300',
          iconColor: 'text-red-400',
          buttonColor: 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300',
        }
      case ErrorSeverity.CRITICAL:
        return {
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-800 dark:text-red-300',
          iconColor: 'text-red-400',
          buttonColor: 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300',
        }
      default:
        return {
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
          textColor: 'text-gray-800 dark:text-gray-300',
          iconColor: 'text-gray-400',
          buttonColor: 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300',
        }
    }
  }

  const renderIcon = (severity: ErrorSeverity, iconColor: string) => {
    switch (severity) {
      case ErrorSeverity.INFO:
        return (
          <svg className={`h-5 w-5 ${iconColor}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
      case ErrorSeverity.WARNING:
        return (
          <svg className={`h-5 w-5 ${iconColor}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
        return (
          <svg className={`h-5 w-5 ${iconColor}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className={`h-5 w-5 ${iconColor}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const renderRecoveryActions = (error: AppError, buttonColor: string) => {
    if (!showRecoveryActions) return null

    const suggestions = errorManager.getRecoverySuggestions(error)
    const actionableSuggestions = suggestions.filter(s => s.action && s.actionLabel)

    if (actionableSuggestions.length === 0) return null

    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {actionableSuggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={suggestion.action}
            className={`text-sm font-medium ${buttonColor} underline hover:no-underline focus:outline-none`}
          >
            {suggestion.actionLabel}
          </button>
        ))}
      </div>
    )
  }

  if (!error || !isVisible) return null

  const severity = error.severity || ErrorSeverity.ERROR
  const config = getSeverityConfig(severity)
  const userMessage = errorManager.getUserMessage(error)

  const getVariantClasses = () => {
    switch (variant) {
      case 'toast':
        return `transform transition-all duration-300 ease-in-out ${
          isAnimating ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
        } shadow-lg`
      case 'banner':
        return 'w-full'
      case 'inline':
      default:
        return 'w-full'
    }
  }

  return (
    <div className={`${config.bgColor} ${config.borderColor} ${getVariantClasses()} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {renderIcon(severity, config.iconColor)}
        </div>

        <div className="ml-3 flex-1">
          <div className={`text-sm font-medium ${config.textColor}`}>
            {userMessage}
          </div>

          {error.context?.metadata?.details && (
            <div className={`mt-1 text-xs ${config.textColor} opacity-75`}>
              {error.context.metadata.details}
            </div>
          )}

          {renderRecoveryActions(error, config.buttonColor)}
        </div>

        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={handleDismiss}
              className={`inline-flex ${config.iconColor} hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-current rounded-md p-1`}
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {autoDissmiss && dismissTimeout > 0 && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div
              className={`${config.bgColor.replace('bg-', 'bg-')} h-1 rounded-full transition-all duration-1000 ease-linear`}
              style={{
                width: '100%',
                animation: `shrink ${dismissTimeout}ms linear`,
              }}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}

// Hook for easy error notifications
export function useErrorNotification() {
  const [error, setError] = useState<AppError | null>(null)

  const showError = useCallback((error: AppError) => {
    setError(error)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    error,
    showError,
    clearError,
    ErrorNotification: (props: Omit<ErrorNotificationProps, 'error'>) => (
      <ErrorNotification {...props} error={error} onDismiss={clearError} />
    ),
  }
}

export default ErrorNotification
