'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'

interface ErrorContext {
  endpoint?: string
  method?: string
  params?: any
  userAction?: string
  componentName?: string
}

interface ErrorHandlerOptions {
  showToast?: boolean
  severity?: 'low' | 'medium' | 'high' | 'critical'
  category?: string
  businessImpact?: string
  silent?: boolean
  retryable?: boolean
  onError?: (error: Error, context?: ErrorContext) => void
}

interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  exponentialBackoff?: boolean
}

/**
 * Comprehensive error handling hook for BookedBarber V2
 * Provides consistent error handling across the application
 */
export function useErrorHandler() {
  const [errors, setErrors] = useState<Error[]>([])
  const [isRetrying, setIsRetrying] = useState(false)

  const reportError = useCallback(async (
    error: Error,
    context?: ErrorContext,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      severity = 'medium',
      category = 'user_experience',
      businessImpact = 'experience_degrading',
      silent = false
    } = options

    try {
      // Determine business impact based on context
      let finalBusinessImpact = businessImpact
      
      if (context?.endpoint) {
        const endpoint = context.endpoint.toLowerCase()
        
        // Revenue-blocking endpoints
        if (endpoint.includes('payment') || endpoint.includes('stripe') || 
            endpoint.includes('book') || endpoint.includes('appointment')) {
          finalBusinessImpact = 'revenue_blocking'
        }
        // User-blocking endpoints
        else if (endpoint.includes('auth') || endpoint.includes('login') || 
                 endpoint.includes('dashboard')) {
          finalBusinessImpact = 'user_blocking'
        }
      }

      // Report to error monitoring service
      await fetch('/api/v2/error-monitoring/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Frontend API Error: ${error.message}`,
          severity,
          category,
          business_impact: finalBusinessImpact,
          context: {
            ...context,
            error_name: error.name,
            error_stack: error.stack,
            browser: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
            url: typeof window !== 'undefined' ? window.location.href : 'unknown',
            timestamp: new Date().toISOString(),
            user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
            is_api_error: true
          },
          endpoint: context?.endpoint,
          http_method: context?.method
        })
      })
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }

    // Store error locally
    setErrors(prev => [...prev.slice(-9), error]) // Keep last 10 errors

    // Show user-friendly message
    if (!silent) {
      const userMessage = getUserFriendlyMessage(error, context)
      
      if (options.showToast !== false) {
        toast.error(userMessage.title, {
          description: userMessage.description,
          action: userMessage.action ? {
            label: userMessage.action.label,
            onClick: userMessage.action.onClick
          } : undefined
        })
      }
    }

    // Call custom error handler
    options.onError?.(error, context)
  }, [])

  const handleApiError = useCallback(async (
    error: any,
    context: ErrorContext = {},
    options: ErrorHandlerOptions = {}
  ) => {
    let processedError: Error
    let enhancedContext = { ...context }

    // Process different error types
    if (error.response) {
      // HTTP error response
      processedError = new Error(
        error.response.data?.error || 
        error.response.data?.message || 
        `HTTP ${error.response.status} Error`
      )
      
      enhancedContext = {
        ...enhancedContext,
        http_status: error.response.status,
        response_data: error.response.data,
        endpoint: error.config?.url || context.endpoint,
        method: error.config?.method?.toUpperCase() || context.method
      }

      // Determine severity based on status code
      if (error.response.status >= 500) {
        options.severity = 'high'
      } else if (error.response.status === 429) {
        options.severity = 'medium'
        options.category = 'performance'
      } else if (error.response.status >= 400) {
        options.severity = 'low'
        options.category = 'validation'
      }
    } else if (error.request) {
      // Network error
      processedError = new Error('Network connection failed')
      enhancedContext = {
        ...enhancedContext,
        network_error: true,
        request_timeout: error.code === 'ECONNABORTED'
      }
      options.severity = 'high'
      options.category = 'infrastructure'
    } else {
      // Other error
      processedError = error instanceof Error ? error : new Error(String(error))
    }

    await reportError(processedError, enhancedContext, options)
    return processedError
  }, [reportError])

  const withRetry = useCallback(async <T>(
    asyncFunction: () => Promise<T>,
    context: ErrorContext = {},
    retryOptions: RetryOptions = {}
  ): Promise<T> => {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      exponentialBackoff = true
    } = retryOptions

    let lastError: Error
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setIsRetrying(attempt > 0)
        const result = await asyncFunction()
        setIsRetrying(false)
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // Don't retry on final attempt
        if (attempt === maxRetries) {
          break
        }

        // Don't retry on certain error types
        if (error.response?.status === 401 || error.response?.status === 403) {
          break
        }

        // Calculate delay
        const delay = exponentialBackoff 
          ? retryDelay * Math.pow(2, attempt)
          : retryDelay

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    setIsRetrying(false)
    
    // Report final error
    await handleApiError(lastError!, {
      ...context,
      retry_attempts: maxRetries,
      final_attempt: true
    })

    throw lastError!
  }, [handleApiError])

  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  return {
    reportError,
    handleApiError,
    withRetry,
    clearErrors,
    errors,
    isRetrying
  }
}

/**
 * Get user-friendly error messages
 */
function getUserFriendlyMessage(error: Error, context?: ErrorContext) {
  const endpoint = context?.endpoint?.toLowerCase() || ''
  const userAction = context?.userAction || ''

  // Payment-related errors
  if (endpoint.includes('payment') || endpoint.includes('stripe')) {
    return {
      title: 'Payment Error',
      description: 'There was an issue processing your payment. Please try again or contact support.',
      action: {
        label: 'Retry Payment',
        onClick: () => window.location.reload()
      }
    }
  }

  // Booking-related errors
  if (endpoint.includes('book') || endpoint.includes('appointment')) {
    return {
      title: 'Booking Error',
      description: 'Unable to complete your booking. Please try again in a moment.',
      action: {
        label: 'Try Again',
        onClick: () => window.location.reload()
      }
    }
  }

  // Authentication errors
  if (endpoint.includes('auth') || endpoint.includes('login')) {
    return {
      title: 'Authentication Error',
      description: 'Please log in again to continue.',
      action: {
        label: 'Go to Login',
        onClick: () => window.location.href = '/login'
      }
    }
  }

  // Network errors
  if (error.message.includes('Network') || error.message.includes('connection')) {
    return {
      title: 'Connection Error',
      description: 'Please check your internet connection and try again.',
      action: {
        label: 'Retry',
        onClick: () => window.location.reload()
      }
    }
  }

  // Generic server errors
  if (error.message.includes('500') || error.message.includes('Server')) {
    return {
      title: 'Server Error',
      description: 'Our servers are experiencing issues. We\'ve been notified and are working on a fix.',
      action: {
        label: 'Refresh',
        onClick: () => window.location.reload()
      }
    }
  }

  // Default error
  return {
    title: 'Something went wrong',
    description: error.message || 'An unexpected error occurred. Please try again.',
    action: {
      label: 'Retry',
      onClick: () => window.location.reload()
    }
  }
}

/**
 * Higher-order function to wrap API calls with error handling
 */
export function withErrorHandling<T extends any[], R>(
  apiFunction: (...args: T) => Promise<R>,
  context: ErrorContext = {},
  options: ErrorHandlerOptions = {}
) {
  return async function(...args: T): Promise<R> {
    const { handleApiError } = useErrorHandler()
    
    try {
      return await apiFunction(...args)
    } catch (error) {
      await handleApiError(error, context, options)
      throw error
    }
  }
}

/**
 * Hook for handling form submission errors
 */
export function useFormErrorHandler() {
  const { handleApiError } = useErrorHandler()

  const handleFormError = useCallback(async (
    error: any,
    formName: string,
    fieldName?: string
  ) => {
    const context: ErrorContext = {
      userAction: `submitting ${formName} form`,
      componentName: formName,
      endpoint: fieldName ? `${formName}/${fieldName}` : formName
    }

    return await handleApiError(error, context, {
      category: 'validation',
      severity: 'low',
      showToast: true
    })
  }, [handleApiError])

  return { handleFormError }
}