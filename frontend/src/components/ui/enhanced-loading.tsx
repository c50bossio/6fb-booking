/**
 * Enhanced loading components with consistent theming and better UX
 */
import React from 'react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  color?: 'primary' | 'secondary' | 'muted'
}

interface LoadingStateProps {
  loading: boolean
  error?: string | null
  children: React.ReactNode
  fallback?: React.ReactNode
  errorFallback?: React.ReactNode
  loadingText?: string
  retryAction?: () => void
  className?: string
}

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
  animation?: 'pulse' | 'wave' | 'none'
  lines?: number
}

/**
 * Consistent loading spinner with theme support
 */
export function LoadingSpinner({ size = 'md', className, color = 'primary' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  const colorClasses = {
    primary: 'text-[#20D9D2]',
    secondary: 'text-gray-500 dark:text-gray-400',
    muted: 'text-gray-400 dark:text-gray-600'
  }

  return (
    <div className={cn('animate-spin', sizeClasses[size], colorClasses[color], className)}>
      <svg
        className="h-full w-full"
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
          d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  )
}

/**
 * Enhanced loading state wrapper with error handling
 */
export function LoadingState({
  loading,
  error,
  children,
  fallback,
  errorFallback,
  loadingText,
  retryAction,
  className
}: LoadingStateProps) {
  if (loading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        {fallback || (
          <div className="flex flex-col items-center space-y-4">
            <LoadingSpinner size="lg" />
            {loadingText && (
              <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
                {loadingText}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        {errorFallback || (
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Something went wrong
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-sm">
                {error}
              </p>
            </div>
            {retryAction && (
              <button
                onClick={retryAction}
                className="px-4 py-2 text-sm font-medium text-white bg-[#20D9D2] hover:bg-[#1BC5B8] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#20D9D2]/20"
              >
                Try Again
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Skeleton loading component with various shapes and animations
 */
export function Skeleton({ 
  className, 
  variant = 'text', 
  animation = 'pulse',
  lines = 1
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700'
  
  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full'
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%]',
    none: ''
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              baseClasses,
              variantClasses[variant],
              animationClasses[animation],
              index === lines - 1 ? 'w-3/4' : 'w-full',
              className
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
    />
  )
}

/**
 * Card skeleton for consistent loading states in cards
 */
export function CardSkeleton({ 
  showAvatar = false,
  showTitle = true,
  showDescription = true,
  showActions = false,
  className
}: {
  showAvatar?: boolean
  showTitle?: boolean
  showDescription?: boolean
  showActions?: boolean
  className?: string
}) {
  return (
    <div className={cn('p-6 border rounded-lg bg-white dark:bg-gray-800', className)}>
      <div className="space-y-4">
        {showAvatar && (
          <div className="flex items-center space-x-4">
            <Skeleton variant="circular" className="h-12 w-12" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        )}
        
        {showTitle && !showAvatar && (
          <Skeleton className="h-6 w-2/3" />
        )}
        
        {showDescription && (
          <Skeleton variant="text" lines={3} />
        )}
        
        {showActions && (
          <div className="flex space-x-2 pt-4">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Table skeleton for loading table data
 */
export function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  showHeader = true,
  className 
}: {
  rows?: number
  columns?: number
  showHeader?: boolean
  className?: string
}) {
  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          {showHeader && (
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {Array.from({ length: columns }).map((_, index) => (
                  <th key={index} className="px-6 py-3">
                    <Skeleton className="h-4 w-24" />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <Skeleton className={cn(
                      'h-4',
                      colIndex === 0 ? 'w-32' : colIndex === columns - 1 ? 'w-16' : 'w-24'
                    )} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Page skeleton for full page loading states
 */
export function PageSkeleton({ 
  showHeader = true,
  showSidebar = false,
  className
}: {
  showHeader?: boolean
  showSidebar?: boolean
  className?: string
}) {
  return (
    <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900', className)}>
      {showHeader && (
        <div className="border-b bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-8" variant="circular" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>
      )}
      
      <div className="flex">
        {showSidebar && (
          <div className="w-64 bg-white dark:bg-gray-800 border-r p-4">
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Skeleton variant="circular" className="h-6 w-6" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex-1 p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <CardSkeleton key={index} showTitle showDescription />
              ))}
            </div>
            
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <TableSkeleton />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook for managing loading states with automatic timing
 */
export function useLoadingState(initialLoading = false) {
  const [loading, setLoading] = React.useState(initialLoading)
  const [error, setError] = React.useState<string | null>(null)
  const timeoutRef = React.useRef<NodeJS.Timeout>()

  const startLoading = React.useCallback(() => {
    setLoading(true)
    setError(null)
  }, [])

  const stopLoading = React.useCallback(() => {
    setLoading(false)
  }, [])

  const setErrorState = React.useCallback((errorMessage: string) => {
    setLoading(false)
    setError(errorMessage)
  }, [])

  const reset = React.useCallback(() => {
    setLoading(false)
    setError(null)
  }, [])

  // Auto-timeout for loading states
  const startLoadingWithTimeout = React.useCallback((timeout = 30000) => {
    startLoading()
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      setErrorState('Request timed out. Please try again.')
    }, timeout)
  }, [startLoading, setErrorState])

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Clear timeout when loading stops
  React.useEffect(() => {
    if (!loading && timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [loading])

  return {
    loading,
    error,
    startLoading,
    stopLoading,
    setErrorState,
    reset,
    startLoadingWithTimeout
  }
}