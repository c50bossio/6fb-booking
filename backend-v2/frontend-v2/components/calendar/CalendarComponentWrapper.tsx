'use client'

import React from 'react'
import { CalendarErrorBoundary } from './CalendarErrorBoundary'
import { CalendarErrorFallback } from './CalendarErrorBoundary'

interface CalendarComponentWrapperProps {
  children: React.ReactNode
  componentName: string
  fallbackComponent?: React.ComponentType<{ error: Error; resetError?: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

/**
 * Specialized wrapper for calendar components with enhanced error handling
 * Provides consistent error boundaries across all calendar features
 */
export function CalendarComponentWrapper({
  children,
  componentName,
  fallbackComponent: FallbackComponent,
  onError
}: CalendarComponentWrapperProps) {
  const [retryKey, setRetryKey] = React.useState(0)

  const handleError = React.useCallback((error: any, errorInfo: React.ErrorInfo) => {
    console.error(`Error in calendar component "${componentName}":`, error, errorInfo)
    onError?.(error, errorInfo)
  }, [componentName, onError])

  const resetError = React.useCallback(() => {
    setRetryKey(prev => prev + 1)
  }, [])

  const defaultFallback = React.useCallback((error: Error) => {
    if (FallbackComponent) {
      return <FallbackComponent error={error} resetError={resetError} />
    }
    return <CalendarErrorFallback error={error} resetError={resetError} />
  }, [FallbackComponent, resetError])

  return (
    <CalendarErrorBoundary
      key={retryKey}
      context={componentName}
      onError={handleError}
      fallback={undefined} // Use render prop instead
    >
      <React.Suspense 
        fallback={
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-32 flex items-center justify-center">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Loading {componentName}...</span>
          </div>
        }
      >
        {children}
      </React.Suspense>
    </CalendarErrorBoundary>
  )
}

/**
 * HOC for automatically wrapping calendar components with error boundaries
 */
export function withCalendarErrorHandling<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string,
  fallbackComponent?: React.ComponentType<{ error: Error; resetError?: () => void }>
) {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => (
    <CalendarComponentWrapper
      componentName={componentName || Component.displayName || Component.name || 'CalendarComponent'}
      fallbackComponent={fallbackComponent}
    >
      <Component {...props} ref={ref} />
    </CalendarComponentWrapper>
  ))

  WrappedComponent.displayName = `withCalendarErrorHandling(${componentName || Component.displayName || Component.name})`
  
  return WrappedComponent
}

/**
 * Specialized error boundary for calendar modals
 */
export function CalendarModalWrapper({ 
  children, 
  modalName,
  onClose 
}: { 
  children: React.ReactNode
  modalName: string
  onClose?: () => void
}) {
  const handleError = React.useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    console.error(`Error in calendar modal "${modalName}":`, error, errorInfo)
    
    // Auto-close modal on error to prevent stuck states
    if (onClose) {
      setTimeout(onClose, 100)
    }
  }, [modalName, onClose])

  const modalErrorFallback = React.useCallback((error: Error) => (
    <div className="p-6 text-center">
      <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
        {modalName} Error
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Something went wrong. The modal will close automatically.
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      >
        Close
      </button>
    </div>
  ), [modalName, onClose])

  return (
    <CalendarErrorBoundary
      context={`modal-${modalName}`}
      onError={handleError}
      fallback={modalErrorFallback(new Error('Modal error'))}
    >
      {children}
    </CalendarErrorBoundary>
  )
}

export default CalendarComponentWrapper