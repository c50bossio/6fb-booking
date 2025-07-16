'use client'

/**
 * Unified Loading System for BookedBarber V2
 * 
 * Consolidates all loading states into a single, optimized system using:
 * - Class-variance-authority for type-safe variants
 * - Comprehensive loading states for all use cases
 * - Advanced error handling with retry logic
 * - Performance optimized with minimal bundle impact
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

// =============================================================================
// Spinner Component with Variants
// =============================================================================

const spinnerVariants = cva(
  'animate-spin',
  {
    variants: {
      size: {
        xs: 'h-3 w-3',
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12',
      },
      variant: {
        default: 'text-primary-600',
        primary: 'text-primary-600',
        secondary: 'text-secondary-600',
        white: 'text-white',
        current: 'text-current',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
)

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string
}

export const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, variant, label, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-center', className)}
      role="status"
      aria-label={label || 'Loading'}
      {...props}
    >
      <svg
        className={spinnerVariants({ size, variant })}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {label && (
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
          {label}
        </span>
      )}
    </div>
  )
)

LoadingSpinner.displayName = 'LoadingSpinner'

// =============================================================================
// Skeleton Components
// =============================================================================

export interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number
  showAvatar?: boolean
}

export const LoadingSkeleton = React.forwardRef<HTMLDivElement, LoadingSkeletonProps>(
  ({ className, lines = 3, showAvatar = false, ...props }, ref) => (
    <div ref={ref} className={cn('animate-pulse', className)} {...props}>
      <div className="flex items-start space-x-4">
        {showAvatar && (
          <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-10 w-10" />
        )}
        <div className="flex-1 space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-4 bg-gray-200 dark:bg-gray-700 rounded',
                i === lines - 1 ? 'w-3/4' : 'w-full'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
)

LoadingSkeleton.displayName = 'LoadingSkeleton'

// =============================================================================
// Specialized Loading Components
// =============================================================================

export const PageLoading = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <LoadingSpinner size="lg" className="mx-auto mb-4" />
      <p className="text-gray-600 dark:text-gray-400 text-lg">{message}</p>
    </div>
  </div>
)

export interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading: boolean
  loadingText?: string
  children: React.ReactNode
}

export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading, children, loadingText = 'Loading...', disabled, className, ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      disabled={loading || disabled}
      className={cn(
        'relative inline-flex items-center justify-center',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {loading && <LoadingSpinner size="sm" className="mr-2" variant="current" />}
      {loading ? loadingText : children}
    </button>
  )
)

LoadingButton.displayName = 'LoadingButton'

export const TableSkeleton = ({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}: { 
  rows?: number
  columns?: number
  className?: string 
}) => (
  <div className={cn('animate-pulse', className)}>
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`header-${i}`} className="h-4 bg-gray-300 dark:bg-gray-600 rounded" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={`cell-${rowIndex}-${colIndex}`} className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      ))}
    </div>
  </div>
)

export const CardSkeleton = ({ className = '' }: { className?: string }) => (
  <div className={cn('animate-pulse bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6', className)}>
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        <div className="h-4 bg-gray-100 dark:bg-gray-600 rounded w-16" />
      </div>
      
      {/* Content */}
      <div className="space-y-3">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-100 dark:bg-gray-600 rounded w-full" />
          <div className="h-4 bg-gray-100 dark:bg-gray-600 rounded w-3/4" />
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-600">
        <div className="h-4 bg-gray-100 dark:bg-gray-600 rounded w-20" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
      </div>
    </div>
  </div>
)

// =============================================================================
// Advanced Error Handling with Retry Logic
// =============================================================================

export interface ErrorDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  error: string | Error
  onRetry?: () => void
  title?: string
  showDetails?: boolean
  retryText?: string
  retryAttempts?: number
  maxRetries?: number
  suggestions?: string[]
}

export const ErrorDisplay = React.forwardRef<HTMLDivElement, ErrorDisplayProps>(
  ({ 
    error, 
    onRetry, 
    className = '',
    title = 'Something went wrong',
    showDetails = true,
    retryText = 'Try again',
    retryAttempts = 0,
    maxRetries = 3,
    suggestions = [],
    ...props
  }, ref) => {
    const [isRetrying, setIsRetrying] = React.useState(false)
    const errorMessage = error instanceof Error ? error.message : error
    const canRetry = onRetry && retryAttempts < maxRetries

    // Smart error detection for better UX
    const getErrorInfo = () => {
      const msg = errorMessage.toLowerCase()
      
      if (msg.includes('network') || msg.includes('fetch')) {
        return {
          title: 'Connection Error',
          icon: '🌐',
          suggestions: ['Check your internet connection', 'Try refreshing the page']
        }
      } else if (msg.includes('unauthorized') || msg.includes('401')) {
        return {
          title: 'Authentication Required',
          icon: '🔒',
          suggestions: ['Your session may have expired', 'Please log in again']
        }
      } else if (msg.includes('server') || msg.includes('500')) {
        return {
          title: 'Server Error',
          icon: '🖥️',
          suggestions: ['The server encountered an error', 'Please try again later']
        }
      }
      
      return {
        title,
        icon: '⚠️',
        suggestions: suggestions.length > 0 ? suggestions : ['Please try again or contact support']
      }
    }

    const errorInfo = getErrorInfo()

    const handleRetry = async () => {
      if (!onRetry) return
      
      setIsRetrying(true)
      try {
        await onRetry()
      } finally {
        setIsRetrying(false)
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4',
          className
        )}
        {...props}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0 text-2xl mr-3" aria-hidden="true">
            {errorInfo.icon}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              {errorInfo.title}
            </h3>
            
            {showDetails && (
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                {errorMessage}
              </p>
            )}
            
            {retryAttempts > 0 && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                Retry attempt {retryAttempts} of {maxRetries}
              </p>
            )}
            
            {errorInfo.suggestions.length > 0 && (
              <div className="mt-3 bg-red-100 dark:bg-red-800/20 rounded p-2">
                <p className="text-xs font-medium text-red-800 dark:text-red-200 mb-1">
                  Possible solutions:
                </p>
                <ul className="text-xs space-y-0.5 text-red-700 dark:text-red-300">
                  {errorInfo.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span>•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="mt-3 flex items-center gap-3">
              {canRetry && (
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="text-sm font-medium text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100 underline disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                >
                  {isRetrying ? (
                    <>
                      <LoadingSpinner size="xs" className="text-red-600" />
                      Retrying...
                    </>
                  ) : (
                    retryText
                  )}
                </button>
              )}
              
              {errorMessage.toLowerCase().includes('401') && (
                <a
                  href="/login"
                  className="text-sm font-medium text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100 underline"
                >
                  Go to Login
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
)

ErrorDisplay.displayName = 'ErrorDisplay'

// =============================================================================
// Success Message Component
// =============================================================================

export interface SuccessMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string
  onDismiss?: () => void
}

export const SuccessMessage = React.forwardRef<HTMLDivElement, SuccessMessageProps>(
  ({ message, onDismiss, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4', className)}
      {...props}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">{message}</p>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className="inline-flex text-green-400 hover:text-green-600 dark:hover:text-green-300"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
)

SuccessMessage.displayName = 'SuccessMessage'

// =============================================================================
// Domain-Specific Loading Components
// =============================================================================

export const CalendarSkeleton = ({ className = '' }: { className?: string }) => (
  <div className={cn('animate-pulse bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6', className)}>
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        <div className="flex space-x-2">
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
      
      {/* Days grid */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 dark:bg-gray-600 rounded" />
        ))}
      </div>
    </div>
  </div>
)

export const TimeSlotsLoadingSkeleton = ({ className = '' }: { className?: string }) => (
  <div className={cn('animate-pulse bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6', className)}>
    <div className="space-y-4">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
      
      <div className="space-y-4">
        {['Morning', 'Afternoon', 'Evening'].map((period, periodIndex) => (
          <div key={period} className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {Array.from({ length: 4 + periodIndex }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-gray-600 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

// =============================================================================
// Namespace Export for Backward Compatibility
// =============================================================================

export const LoadingSystem = {
  Spinner: LoadingSpinner,
  Skeleton: LoadingSkeleton,
  CardSkeleton: CardSkeleton,
  TableSkeleton: TableSkeleton,
  CalendarSkeleton: CalendarSkeleton,
  TimeSlotsLoading: TimeSlotsLoadingSkeleton,
  PageLoading: PageLoading,
  Button: LoadingButton,
  Error: ErrorDisplay,
  Success: SuccessMessage
}

// Legacy aliases for migration
export const LoadingStates = LoadingSystem