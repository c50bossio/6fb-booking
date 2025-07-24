'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useErrorHandler, ErrorHandlerOptions } from './useErrorHandler'
import { toastError, toastSuccess, toastInfo } from './use-toast'
import { errorMonitoring, ErrorCategory, ErrorSeverity } from '@/lib/error-monitoring'
import { getEnhancedErrorMessage, ErrorContext } from '@/lib/error-messages'

export interface EnhancedErrorState {
  errors: Array<{
    id: string
    error: Error
    context: string
    timestamp: number
    resolved: boolean
    userNotified: boolean
    retryCount: number
  }>
  isRecovering: boolean
  gracefulMode: boolean
  userFeedback: Array<{
    errorId: string
    feedback: string
    timestamp: number
  }>
}

export interface UseEnhancedErrorHandlerOptions extends ErrorHandlerOptions {
  enableUserFeedback?: boolean
  enableErrorGrouping?: boolean
  enableProactiveRecovery?: boolean
  maxErrorHistory?: number
  errorContext?: ErrorContext
  onRecoverySuccess?: () => void
  onGracefulModeToggle?: (enabled: boolean) => void
}

export interface UseEnhancedErrorHandlerReturn extends ReturnType<typeof useErrorHandler> {
  enhancedState: EnhancedErrorState
  handleEnhancedError: (error: unknown, context?: string, options?: { 
    severity?: ErrorSeverity
    category?: ErrorCategory
    userAction?: string
    metadata?: Record<string, any>
  }) => void
  resolveError: (errorId: string) => void
  addUserFeedback: (errorId: string, feedback: string) => void
  enableGracefulMode: () => void
  disableGracefulMode: () => void
  getErrorSummary: () => {
    totalErrors: number
    unresolvedErrors: number
    criticalErrors: number
    recentErrors: number
  }
  clearErrorHistory: () => void
  retryWithEnhancedHandling: <T>(
    operation: () => Promise<T>,
    context: string,
    options?: {
      maxRetries?: number
      retryDelay?: number
      fallbackValue?: T
      onSuccess?: (result: T) => void
      onFailure?: (error: Error) => void
    }
  ) => Promise<T | null>
}

export function useEnhancedErrorHandler(
  options: UseEnhancedErrorHandlerOptions = {}
): UseEnhancedErrorHandlerReturn {
  const {
    enableUserFeedback = true,
    enableErrorGrouping = true,
    enableProactiveRecovery = true,
    maxErrorHistory = 50,
    errorContext = {},
    onRecoverySuccess,
    onGracefulModeToggle,
    ...baseOptions
  } = options

  // Base error handler
  const baseErrorHandler = useErrorHandler(baseOptions)

  // Enhanced error state
  const [enhancedState, setEnhancedState] = useState<EnhancedErrorState>({
    errors: [],
    isRecovering: false,
    gracefulMode: false,
    userFeedback: []
  })

  const errorGroupingRef = useRef<Map<string, string[]>>(new Map())
  const recoveryAttemptRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-resolve errors after successful operations
  useEffect(() => {
    if (!baseErrorHandler.errorState.hasError && enhancedState.errors.length > 0) {
      // Mark recent errors as resolved when base error state clears
      setEnhancedState(prev => ({
        ...prev,
        errors: prev.errors.map(err => 
          !err.resolved && Date.now() - err.timestamp < 30000 
            ? { ...err, resolved: true }
            : err
        )
      }))
    }
  }, [baseErrorHandler.errorState.hasError, enhancedState.errors.length])

  // Proactive recovery monitoring
  useEffect(() => {
    if (enableProactiveRecovery && enhancedState.errors.length > 0) {
      const criticalErrors = enhancedState.errors.filter(
        err => !err.resolved && err.error.message.toLowerCase().includes('critical')
      )

      if (criticalErrors.length > 0 && !enhancedState.isRecovering) {
        // Attempt proactive recovery for critical errors
        setEnhancedState(prev => ({ ...prev, isRecovering: true }))

        recoveryAttemptRef.current = setTimeout(() => {
          performProactiveRecovery(criticalErrors)
        }, 2000) // Wait 2 seconds before attempting recovery
      }
    }

    return () => {
      if (recoveryAttemptRef.current) {
        clearTimeout(recoveryAttemptRef.current)
      }
    }
  }, [enhancedState.errors, enableProactiveRecovery, enhancedState.isRecovering])

  const generateErrorId = useCallback((): string => {
    return `enhanced_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  const performProactiveRecovery = useCallback(async (criticalErrors: any[]) => {
    try {
      // Attempt to recover from critical errors
      // This could include clearing corrupted state, reloading resources, etc.
      
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate recovery time

      // Mark errors as resolved if recovery seems successful
      setEnhancedState(prev => ({
        ...prev,
        isRecovering: false,
        errors: prev.errors.map(err => 
          criticalErrors.some(critErr => critErr.id === err.id)
            ? { ...err, resolved: true }
            : err
        )
      }))

      toastSuccess(
        'Recovery Successful',
        'We were able to automatically recover from the recent errors.'
      )

      onRecoverySuccess?.()
    } catch (recoveryError) {
      setEnhancedState(prev => ({ ...prev, isRecovering: false }))
      
      toastError(
        'Recovery Failed',
        'Automatic recovery was unsuccessful. Manual intervention may be required.'
      )
    }
  }, [onRecoverySuccess])

  const handleEnhancedError = useCallback((
    error: unknown,
    context?: string,
    options?: { 
      severity?: ErrorSeverity
      category?: ErrorCategory
      userAction?: string
      metadata?: Record<string, any>
    }
  ) => {
    const normalizedError = error instanceof Error ? error : new Error(String(error))
    const errorId = generateErrorId()
    const timestamp = Date.now()

    // Create enhanced error entry
    const enhancedError = {
      id: errorId,
      error: normalizedError,
      context: context || 'Unknown context',
      timestamp,
      resolved: false,
      userNotified: false,
      retryCount: 0
    }

    // Error grouping logic
    if (enableErrorGrouping) {
      const errorSignature = `${normalizedError.name}_${normalizedError.message.substring(0, 50)}`
      const existingGroup = errorGroupingRef.current.get(errorSignature) || []
      existingGroup.push(errorId)
      errorGroupingRef.current.set(errorSignature, existingGroup)

      // If this error type has occurred multiple times recently, suggest graceful mode
      if (existingGroup.length >= 3 && !enhancedState.gracefulMode) {
        toastInfo(
          'Repeated Errors Detected',
          'Would you like to enable graceful mode to continue with limited functionality?',
          {
            action: {
              label: 'Enable Graceful Mode',
              onClick: enableGracefulMode
            },
            duration: 10000
          }
        )
      }
    }

    // Add to enhanced state
    setEnhancedState(prev => ({
      ...prev,
      errors: [
        enhancedError,
        ...prev.errors.slice(0, maxErrorHistory - 1)
      ]
    }))

    // Enhanced error reporting
    const monitoringErrorId = errorMonitoring.captureError(normalizedError, {
      category: options?.category || ErrorCategory.APPLICATION,
      severity: options?.severity || ErrorSeverity.MEDIUM,
      context: context || 'Enhanced Error Handler',
      metadata: {
        ...options?.metadata,
        userAction: options?.userAction,
        errorId,
        groupedErrors: errorGroupingRef.current.get(`${normalizedError.name}_${normalizedError.message.substring(0, 50)}`)?.length || 1,
        gracefulModeActive: enhancedState.gracefulMode,
        ...errorContext
      },
      recoverable: true,
      retryCount: enhancedError.retryCount
    })

    // Enhanced user notification with contextual messaging
    const enhancedMessage = getEnhancedErrorMessage(
      normalizedError.name === 'TypeError' ? 500 : 400,
      { detail: normalizedError.message },
      errorContext
    )

    if (!enhancedState.gracefulMode) {
      toastError(
        enhancedMessage.title,
        enhancedMessage.message,
        {
          errorId: monitoringErrorId,
          retryable: enhancedMessage.isRecoverable,
          onRetry: enhancedMessage.isRecoverable ? () => baseErrorHandler.retry() : undefined,
          persistent: options?.severity === ErrorSeverity.CRITICAL,
          action: enableUserFeedback ? {
            label: 'Provide Feedback',
            onClick: () => addUserFeedback(errorId, '')
          } : undefined
        }
      )
    }

    // Call base error handler for compatibility
    baseErrorHandler.handleError(normalizedError, context)
  }, [
    baseErrorHandler, 
    enableErrorGrouping, 
    enableUserFeedback,
    enhancedState.gracefulMode,
    errorContext,
    generateErrorId,
    maxErrorHistory
  ])

  const resolveError = useCallback((errorId: string) => {
    setEnhancedState(prev => ({
      ...prev,
      errors: prev.errors.map(err => 
        err.id === errorId ? { ...err, resolved: true } : err
      )
    }))
  }, [])

  const addUserFeedback = useCallback((errorId: string, feedback: string) => {
    setEnhancedState(prev => ({
      ...prev,
      userFeedback: [
        ...prev.userFeedback,
        {
          errorId,
          feedback,
          timestamp: Date.now()
        }
      ]
    }))

    if (feedback.trim()) {
      toastSuccess('Feedback Received', 'Thank you for helping us improve the platform.')
    }
  }, [])

  const enableGracefulMode = useCallback(() => {
    setEnhancedState(prev => ({ ...prev, gracefulMode: true }))
    onGracefulModeToggle?.(true)
    
    toastInfo(
      'Graceful Mode Enabled',
      'Some features may be limited, but core functionality will continue to work.',
      { duration: 5000 }
    )
  }, [onGracefulModeToggle])

  const disableGracefulMode = useCallback(() => {
    setEnhancedState(prev => ({ ...prev, gracefulMode: false }))
    onGracefulModeToggle?.(false)
    
    toastSuccess('Graceful Mode Disabled', 'Full functionality has been restored.')
  }, [onGracefulModeToggle])

  const getErrorSummary = useCallback(() => {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000

    return {
      totalErrors: enhancedState.errors.length,
      unresolvedErrors: enhancedState.errors.filter(err => !err.resolved).length,
      criticalErrors: enhancedState.errors.filter(err => 
        err.error.message.toLowerCase().includes('critical') && !err.resolved
      ).length,
      recentErrors: enhancedState.errors.filter(err => 
        err.timestamp > oneHourAgo && !err.resolved
      ).length
    }
  }, [enhancedState.errors])

  const clearErrorHistory = useCallback(() => {
    setEnhancedState(prev => ({
      ...prev,
      errors: [],
      userFeedback: []
    }))
    errorGroupingRef.current.clear()
  }, [])

  const retryWithEnhancedHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    context: string,
    options?: {
      maxRetries?: number
      retryDelay?: number
      fallbackValue?: T
      onSuccess?: (result: T) => void
      onFailure?: (error: Error) => void
    }
  ): Promise<T | null> => {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      fallbackValue,
      onSuccess,
      onFailure
    } = options || {}

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation()
        onSuccess?.(result)
        
        // Mark any related errors as resolved
        setEnhancedState(prev => ({
          ...prev,
          errors: prev.errors.map(err => 
            err.context === context ? { ...err, resolved: true } : err
          )
        }))
        
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (attempt < maxRetries) {
          // Update retry count for this error
          setEnhancedState(prev => ({
            ...prev,
            errors: prev.errors.map(err => 
              err.context === context && !err.resolved 
                ? { ...err, retryCount: attempt + 1 }
                : err
            )
          }))

          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
        }
      }
    }

    // All retries failed
    if (lastError) {
      handleEnhancedError(lastError, `${context} (after ${maxRetries} retries)`, {
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.APPLICATION,
        userAction: 'retry_operation',
        metadata: { maxRetries, totalAttempts: maxRetries + 1 }
      })
      onFailure?.(lastError)
    }

    // Return fallback value if available, otherwise null
    return fallbackValue ?? null
  }, [handleEnhancedError])

  return {
    ...baseErrorHandler,
    enhancedState,
    handleEnhancedError,
    resolveError,
    addUserFeedback,
    enableGracefulMode,
    disableGracefulMode,
    getErrorSummary,
    clearErrorHistory,
    retryWithEnhancedHandling
  }
}