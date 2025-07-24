'use client'

import React from 'react'
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'
// import { 
//   createValidationErrorId, 
//   createValidationDescriptionId, 
//   announceValidationError,
//   announceError 
// } from '@/lib/accessibility'
import { cn } from '@/lib/utils'

interface ValidationDisplayProps {
  error?: string
  success?: string
  warning?: string
  info?: string
  className?: string
  animated?: boolean
  fieldId?: string
  fieldLabel?: string
  announceErrors?: boolean
  role?: 'alert' | 'status'
}

export function ValidationDisplay({ 
  error, 
  success, 
  warning, 
  info, 
  className = '',
  animated = true,
  fieldId,
  fieldLabel,
  announceErrors = true,
  role
}: ValidationDisplayProps) {
  if (!error && !success && !warning && !info) return null

  const message = error || success || warning || info
  const type = error ? 'error' : success ? 'success' : warning ? 'warning' : 'info'

  // Announce errors to screen readers
  React.useEffect(() => {
    if (announceErrors && error && typeof window !== 'undefined') {
      import('@/lib/accessibility').then(({ announceValidationError, announceError }) => {
        if (fieldLabel) {
          announceValidationError(fieldLabel, error)
        } else {
          announceError(error, true)
        }
      }).catch(() => {})
    }
  }, [error, fieldLabel, announceErrors])
  
  const styles = {
    error: {
      container: 'text-red-600 dark:text-red-400',
      icon: AlertCircle,
      bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    },
    success: {
      container: 'text-green-600 dark:text-green-400',
      icon: CheckCircle2,
      bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    },
    warning: {
      container: 'text-yellow-600 dark:text-yellow-400',
      icon: AlertTriangle,
      bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    },
    info: {
      container: 'text-blue-600 dark:text-blue-400',
      icon: Info,
      bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    }
  }
  
  const style = styles[type]
  const Icon = style.icon

  const errorId = fieldId ? `${fieldId}-error` : undefined

  return (
    <div 
      id={errorId}
      className={cn(
        'flex items-center gap-2 mt-2 text-sm',
        style.container,
        {
          'animate-in slide-in-from-top-1 duration-200': animated
        },
        className
      )}
      role={role || (error ? 'alert' : 'status')}
      aria-live={error ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span className="leading-tight">{message}</span>
    </div>
  )
}

interface ValidationSummaryProps {
  errors: Array<{ field: string; message: string }>
  className?: string
  title?: string
  announceErrors?: boolean
  onErrorClick?: (field: string) => void
}

export function ValidationSummary({ 
  errors, 
  className = '',
  title,
  announceErrors = true,
  onErrorClick
}: ValidationSummaryProps) {
  // Announce error summary to screen readers
  React.useEffect(() => {
    if (announceErrors && errors.length > 0 && typeof window !== 'undefined') {
      const message = errors.length === 1 
        ? `1 validation error: ${errors[0].message}`
        : `${errors.length} validation errors found. Please review the form.`
      
      import('@/lib/accessibility').then(({ announceError }) => {
        announceError(message, true)
      }).catch(() => {})
    }
  }, [errors, announceErrors])

  if (errors.length === 0) return null

  const summaryTitle = title || (errors.length === 1 
    ? 'Please fix this error:' 
    : `Please fix these ${errors.length} errors:`)

  return (
    <div 
      className={cn(
        'rounded-lg bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 p-4 border border-red-200 dark:border-red-800 animate-in slide-in-from-top-2 duration-300',
        className
      )}
      role="alert"
      aria-live="assertive"
      aria-atomic="false"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
          </div>
        </div>
        <div className="ml-3 flex-1">
          <h3 
            className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2"
            id="validation-summary-title"
          >
            {summaryTitle}
          </h3>
          <div 
            className="space-y-2"
            role="list"
            aria-labelledby="validation-summary-title"
          >
            {errors.map((error, index) => (
              <div 
                key={`${error.field}-${index}`}
                className={cn(
                  'flex items-start text-sm text-red-800 dark:text-red-200 bg-white/50 dark:bg-red-900/30 rounded-md p-2 border border-red-200/50 dark:border-red-700/50',
                  {
                    'cursor-pointer hover:bg-white/70 dark:hover:bg-red-900/50 transition-colors': onErrorClick
                  }
                )}
                role="listitem"
                onClick={onErrorClick ? () => onErrorClick(error.field) : undefined}
                onKeyDown={onErrorClick ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onErrorClick(error.field)
                  }
                } : undefined}
                tabIndex={onErrorClick ? 0 : undefined}
                aria-label={`Error in ${error.field}: ${error.message}${onErrorClick ? '. Press Enter to navigate to field.' : ''}`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 mr-2 flex-shrink-0" aria-hidden="true" />
                <div className="leading-relaxed">
                  {onErrorClick && (
                    <span className="font-medium">{error.field}: </span>
                  )}
                  <span>{error.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Utility hook for managing validation state
export function useValidation() {
  const [errors, setErrors] = React.useState<Array<{ field: string; message: string }>>([])

  const setFieldError = React.useCallback((field: string, message: string) => {
    setErrors(prev => {
      const filtered = prev.filter(error => error.field !== field)
      return [...filtered, { field, message }]
    })
  }, [])

  const clearFieldError = React.useCallback((field: string) => {
    setErrors(prev => prev.filter(error => error.field !== field))
  }, [])

  const clearAllErrors = React.useCallback(() => {
    setErrors([])
  }, [])

  const hasError = React.useCallback((field?: string) => {
    if (field) {
      return errors.some(error => error.field === field)
    }
    return errors.length > 0
  }, [errors])

  const getFieldError = React.useCallback((field: string) => {
    return errors.find(error => error.field === field)?.message
  }, [errors])

  return {
    errors,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    hasError,
    getFieldError,
    hasAnyErrors: errors.length > 0
  }
}