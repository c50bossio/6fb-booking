'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { 
  toast, 
  toastError, 
  toastRegistrationError, 
  toastNetworkStatus,
  toastProgress
} from '@/hooks/use-toast'
import { ErrorHandler } from '@/lib/error-handler'

export interface ErrorState {
  hasError: boolean
  error: Error | null
  errorId: string | null
  isRetrying: boolean
  retryCount: number
  lastRetryTime: number | null
}

export interface ErrorHandlerOptions {
  maxRetries?: number
  retryDelay?: number | ((attempt: number) => number)
  enableRetry?: boolean
  showToast?: boolean
  toastType?: 'default' | 'registration' // New toast types
  onError?: (error: Error, context?: string) => void
  onRetry?: (attempt: number, error: Error) => void
  onRecovery?: () => void
  onReportError?: (error: Error, errorId: string) => void
  persistErrors?: boolean // Persist errors across component remounts
  errorContext?: string
  enableProgressTracking?: boolean // Track operation progress
  enableOfflineDetection?: boolean // Monitor network status
  gracefulDegradation?: boolean // Allow partial functionality when offline
}

export interface UseErrorHandlerReturn {
  errorState: ErrorState
  handleError: (error: unknown, context?: string) => void
  retry: () => Promise<void>
  clearError: () => void
  withErrorHandling: <T>(
    operation: () => Promise<T>,
    context?: string,
    options?: { showProgress?: boolean; progressMessage?: string }
  ) => Promise<T | null>
  withGracefulDegradation: <T>(
    operation: () => Promise<T>,
    fallback: () => T | Promise<T>,
    context?: string
  ) => Promise<T>
  isRetryable: (error?: Error) => boolean
  getErrorMessage: (error?: Error) => string
  reportError: (error?: Error) => void
  isOnline: boolean
}

const generateErrorId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

const defaultRetryDelay = (attempt: number): number => {
  return Math.min(1000 * Math.pow(2, attempt), 10000) // Exponential backoff with 10s max
}

// Helper function to detect network errors
const isNetworkError = (error?: Error): boolean => {
  if (!error) return false
  const message = error.message.toLowerCase()
  return message.includes('network') || 
         message.includes('fetch') || 
         message.includes('connection') ||
         message.includes('timeout')
}

export function useErrorHandler(options: ErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const {
    maxRetries = 3,
    retryDelay = defaultRetryDelay,
    enableRetry = true,
    showToast = true,
    toastType = 'default',
    onError,
    onRetry,
    onRecovery,
    onReportError,
    persistErrors = false,
    errorContext,
    enableProgressTracking = false,
    enableOfflineDetection = true,
    gracefulDegradation = false
  } = options

  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    errorId: null,
    isRetrying: false,
    retryCount: 0,
    lastRetryTime: null
  })

  // Network status monitoring
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  const lastOperationRef = useRef<(() => Promise<any>) | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const errorCountRef = useRef(0)
  const progressToastRef = useRef<{ id: string; dismiss: () => void } | null>(null)

  // Network status monitoring
  useEffect(() => {
    if (!enableOfflineDetection || typeof window === 'undefined') return

    const handleOnline = () => {
      const wasOffline = !isOnline
      setIsOnline(true)
      if (wasOffline) {
        toastNetworkStatus(true)
        // FIXED: Remove automatic retry on network reconnect to prevent infinite loops
        // Let users manually retry if needed
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      toastNetworkStatus(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [enableOfflineDetection, isOnline])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (progressToastRef.current) {
        progressToastRef.current.dismiss()
      }
    }
  }, [])

  // Persist errors across component remounts if enabled
  useEffect(() => {
    if (persistErrors && typeof window !== 'undefined') {
      const persistedError = sessionStorage.getItem('useErrorHandler_persistedError')
      if (persistedError) {
        try {
          const parsed = JSON.parse(persistedError)
          setErrorState(parsed)
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
  }, [persistErrors])

  // Save error state to session storage if persistence is enabled
  useEffect(() => {
    if (persistErrors && typeof window !== 'undefined') {
      if (errorState.hasError) {
        sessionStorage.setItem('useErrorHandler_persistedError', JSON.stringify(errorState))
      } else {
        sessionStorage.removeItem('useErrorHandler_persistedError')
      }
    }
  }, [errorState, persistErrors])

  const isRetryable = useCallback((error?: Error, currentRetryCount?: number): boolean => {
    // Use parameter or current state, but don't depend on state in dependencies
    const retryCount = currentRetryCount ?? errorState.retryCount
    if (!enableRetry || retryCount >= maxRetries) return false
    
    if (!error) return false

    const message = error.message.toLowerCase()
    
    // Network errors are retryable
    if (message.includes('network') || 
        message.includes('fetch') || 
        message.includes('connection') ||
        message.includes('timeout')) {
      return true
    }
    
    // Server errors (5xx) are retryable
    if (message.includes('500') || 
        message.includes('502') || 
        message.includes('503') || 
        message.includes('504')) {
      return true
    }
    
    // Rate limiting is retryable
    if (message.includes('429') || message.includes('rate limit')) {
      return true
    }
    
    // Chunk loading errors are retryable
    if (message.includes('chunk') || message.includes('loading css chunk')) {
      return true
    }
    
    return false
  }, [enableRetry, maxRetries])

  const getErrorMessage = useCallback((error?: Error): string => {
    if (!error) return 'An unknown error occurred'
    
    return ErrorHandler.getUserFriendlyMessage(error as any)
  }, [])

  const handleError = useCallback((error: unknown, context?: string) => {
    const appError = ErrorHandler.normalizeError(error)
    const errorId = generateErrorId()
    errorCountRef.current += 1

    setErrorState(prev => ({
      hasError: true,
      error: appError,
      errorId,
      isRetrying: false,
      retryCount: prev.retryCount,
      lastRetryTime: prev.lastRetryTime
    }))

    // Call custom error handler
    onError?.(appError, context || errorContext)

    // Show toast notification if enabled (get retry count from current state)
    if (showToast) {
      const currentRetryCount = errorState.retryCount
      const retryableError = isRetryable(appError, currentRetryCount)
      const finalContext = context || errorContext

      if (toastType === 'registration') {
        toastRegistrationError(appError, finalContext, {
          onRetry: retryableError ? () => retry() : undefined,
          showDetails: process.env.NODE_ENV === 'development'
        })
      } else {
        toastError(
          ErrorHandler.getErrorTitle(appError as any, finalContext),
          ErrorHandler.getUserFriendlyMessage(appError as any),
          {
            errorId,
            retryable: retryableError,
            onRetry: retryableError ? () => retry() : undefined,
            onReport: onReportError ? () => onReportError(appError, errorId) : undefined,
            showDetailsOnClick: process.env.NODE_ENV === 'development',
            errorDetails: appError.stack,
            persistent: retryableError
          }
        )
      }
    }

    // Attempt automatic retry for retryable errors (prevent multiple retries)
    const currentRetryCount = errorState.retryCount
    if (isRetryable(appError, currentRetryCount) && !errorState.isRetrying) {
      scheduleRetry(appError, context || errorContext)
    }
  }, [onError, onReportError, errorContext, showToast, toastType, enableRetry, maxRetries])

  const scheduleRetry = useCallback((error: Error, context?: string) => {
    // Get current retry count at execution time to avoid dependency issues
    const currentRetryCount = errorState.retryCount
    const delay = typeof retryDelay === 'function' 
      ? retryDelay(currentRetryCount) 
      : retryDelay

    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }

    setErrorState(prev => ({ ...prev, isRetrying: true }))

    retryTimeoutRef.current = setTimeout(async () => {
      setErrorState(prev => ({
        ...prev,
        retryCount: prev.retryCount + 1,
        isRetrying: false,
        lastRetryTime: Date.now()
      }))

      onRetry?.(currentRetryCount + 1, error)

      // Attempt to retry the last operation
      if (lastOperationRef.current) {
        try {
          await lastOperationRef.current()
          clearError() // Clear error if retry succeeds
          onRecovery?.()
        } catch (retryError) {
          // FIXED: Prevent circular dependency by not calling handleError here
          // Instead, just update the error state and let the operation fail
          setErrorState(prev => ({
            ...prev,
            hasError: true,
            error: ErrorHandler.normalizeError(retryError),
            errorId: generateErrorId(),
            isRetrying: false
          }))
          
          // Show error toast without triggering retry logic
          if (showToast) {
            toastError(
              'Retry Failed',
              ErrorHandler.getUserFriendlyMessage(retryError as any),
              { duration: 5000, persistent: false }
            )
          }
        }
      }
    }, delay)
  }, [retryDelay, onRetry, onRecovery, showToast])

  const retry = useCallback(async (): Promise<void> => {
    if (!lastOperationRef.current || !errorState.error) {
      throw new Error('No operation to retry')
    }

    if (!isRetryable(errorState.error, errorState.retryCount)) {
      throw new Error('Error is not retryable')
    }

    setErrorState(prev => ({ ...prev, isRetrying: true }))

    try {
      const result = await lastOperationRef.current()
      clearError()
      onRecovery?.()
      return result
    } catch (error) {
      setErrorState(prev => ({
        ...prev,
        isRetrying: false,
        retryCount: prev.retryCount + 1,
        lastRetryTime: Date.now()
      }))
      throw error
    }
  }, [onRecovery])

  const clearError = useCallback(() => {
    // Clear retry timeout if active
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    setErrorState({
      hasError: false,
      error: null,
      errorId: null,
      isRetrying: false,
      retryCount: 0,
      lastRetryTime: null
    })

    lastOperationRef.current = null

    // Clear persisted error
    if (persistErrors && typeof window !== 'undefined') {
      sessionStorage.removeItem('useErrorHandler_persistedError')
    }
  }, [persistErrors])

  const withErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: string,
    options?: { showProgress?: boolean; progressMessage?: string }
  ): Promise<T | null> => {
    // Store the operation for potential retry
    lastOperationRef.current = operation

    let progressToast: { id: string; dismiss: () => void } | null = null

    try {
      // Show progress if enabled
      if (enableProgressTracking && options?.showProgress) {
        progressToast = toastProgress(
          options.progressMessage || 'Processing...',
          context ? `${context} in progress` : undefined,
          { isLoading: true }
        )
        progressToastRef.current = progressToast
      }

      const result = await operation()
      
      // Dismiss progress toast on success
      if (progressToast) {
        progressToast.dismiss()
        progressToastRef.current = null
      }
      
      // Clear any existing error state on successful operation
      if (errorState.hasError) {
        clearError()
        onRecovery?.()
      }
      
      return result
    } catch (error) {
      // Dismiss progress toast on error
      if (progressToast) {
        progressToast.dismiss()
        progressToastRef.current = null
      }

      handleError(error, context)
      return null
    }
  }, [
    errorState.hasError, 
    handleError, 
    clearError, 
    onRecovery, 
    enableProgressTracking
  ])

  const withGracefulDegradation = useCallback(async <T>(
    operation: () => Promise<T>,
    fallback: () => T | Promise<T>,
    context?: string
  ): Promise<T> => {
    if (!gracefulDegradation) {
      // Without graceful degradation, behave like normal withErrorHandling
      const result = await withErrorHandling(operation, context)
      if (result === null) {
        throw new Error('Operation failed and graceful degradation is disabled')
      }
      return result
    }

    try {
      const result = await withErrorHandling(operation, context)
      if (result !== null) {
        return result
      }

      // Operation failed, try fallback
      console.warn(`[ErrorHandler] Operation failed, using fallback for ${context || 'unknown operation'}`)
      
      const fallbackResult = await fallback()
      
      // Show info toast about fallback usage
      if (showToast) {
        toast({
          title: 'Limited Functionality',
          description: `Some features may be limited due to connectivity issues. ${context ? `(${context})` : ''}`,
          variant: 'default',
          className: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
        })
      }

      return fallbackResult
    } catch (error) {
      // Both primary and fallback failed
      handleError(error, `${context} (fallback also failed)`)
      throw error
    }
  }, [gracefulDegradation, withErrorHandling, showToast, handleError])

  const reportError = useCallback((error?: Error) => {
    // Use provided error or current state, but don't create dependency
    const targetError = error || errorState.error
    if (!targetError || !onReportError) return

    const errorId = errorState.errorId || generateErrorId()
    onReportError(targetError, errorId)
  }, [onReportError])

  return {
    errorState,
    handleError,
    retry,
    clearError,
    withErrorHandling,
    withGracefulDegradation,
    isRetryable,
    getErrorMessage,
    reportError,
    isOnline
  }
}

// Hook for handling form validation errors specifically
export function useFormErrorHandler(options: ErrorHandlerOptions = {}) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const errorHandler = useErrorHandler({
    ...options,
    showToast: false // Don't show toast for form errors by default
  })

  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: message }))
  }, [])

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({})
  }, [])

  const handleValidationError = useCallback((validationErrors: Array<{ field: string; message: string }>) => {
    const errorMap: Record<string, string> = {}
    validationErrors.forEach(({ field, message }) => {
      errorMap[field] = message
    })
    setFieldErrors(errorMap)
  }, [])

  const getFieldError = useCallback((field: string): string | undefined => {
    return fieldErrors[field]
  }, [fieldErrors])

  const hasFieldError = useCallback((field: string): boolean => {
    return Boolean(fieldErrors[field])
  }, [fieldErrors])

  const hasAnyErrors = useCallback((): boolean => {
    return Object.keys(fieldErrors).length > 0 || errorHandler.errorState.hasError
  }, [fieldErrors, errorHandler.errorState.hasError])

  return {
    ...errorHandler,
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
    handleValidationError,
    getFieldError,
    hasFieldError,
    hasAnyErrors
  }
}

// Hook for handling network request errors with retry capabilities
export function useNetworkErrorHandler(options: Omit<ErrorHandlerOptions, 'enableRetry'> = {}) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const errorHandler = useErrorHandler({
    ...options,
    enableRetry: true,
    maxRetries: 5,
    retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 30000)
  })

  const makeNetworkRequest = useCallback(async <T>(
    requestFn: () => Promise<T>,
    context = 'Network request'
  ): Promise<T | null> => {
    if (!isOnline) {
      const offlineError = new Error('You are currently offline. Please check your connection.')
      errorHandler.handleError(offlineError, context)
      return null
    }

    return errorHandler.withErrorHandling(requestFn, context)
  }, [isOnline, errorHandler])

  return {
    ...errorHandler,
    isOnline,
    makeNetworkRequest
  }
}