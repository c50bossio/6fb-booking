'use client'

import React from 'react'

// Enhanced loading spinner component
export function LoadingSpinner({ size = 'md', className = '', variant = 'default' }: { 
  size?: 'sm' | 'md' | 'lg'
  className?: string 
  variant?: 'default' | 'primary' | 'minimal'
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  const variantClasses = {
    default: 'text-gray-600 dark:text-gray-400',
    primary: 'text-primary-600',
    minimal: 'text-gray-400 dark:text-gray-500'
  }

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
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
  )
}

// Enhanced full page loading component
export function PageLoading({ 
  message = 'Loading...', 
  description,
  variant = 'default' 
}: { 
  message?: string
  description?: string
  variant?: 'default' | 'minimal' | 'branded'
}) {
  if (variant === 'minimal') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <LoadingSpinner size="lg" variant="minimal" />
      </div>
    )
  }

  if (variant === 'branded') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="text-center space-y-6 p-8">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-1 h-12 bg-primary-500 rounded-full"></div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                BookedBarber
              </h2>
            </div>
          </div>
          <LoadingSpinner size="lg" variant="primary" className="mx-auto mb-4" />
          <div>
            <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">{message}</p>
            {description && (
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">{description}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" variant="primary" className="mx-auto" />
        <div>
          <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">{message}</p>
          {description && (
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Button loading state
export function LoadingButton({
  loading,
  children,
  loadingText = 'Loading...',
  disabled,
  className = '',
  ...props
}: {
  loading: boolean
  children: React.ReactNode
  loadingText?: string
  disabled?: boolean
  className?: string
  [key: string]: any
}) {
  return (
    <button
      {...props}
      disabled={loading || disabled}
      className={`relative inline-flex items-center justify-center ${className} ${
        loading || disabled ? 'cursor-not-allowed opacity-50' : ''
      }`}
    >
      {loading && (
        <LoadingSpinner size="sm" className="mr-2 text-current" />
      )}
      {loading ? loadingText : children}
    </button>
  )
}

// Enhanced card loading skeleton that matches our card variants
export function LoadingSkeleton({ 
  lines = 3, 
  className = '',
  showAvatar = false,
  variant = 'default'
}: { 
  lines?: number
  className?: string
  showAvatar?: boolean
  variant?: 'default' | 'primary' | 'secondary' | 'elevated' | 'hero'
}) {
  const variantClasses = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    primary: 'bg-white dark:bg-gray-800 border border-primary-200 dark:border-primary-800 shadow-sm',
    secondary: 'bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700',
    elevated: 'bg-white dark:bg-gray-800 shadow-md border border-gray-100 dark:border-gray-700',
    hero: 'bg-gradient-to-br from-primary-50 to-white dark:from-gray-800 dark:to-gray-900 border border-primary-100 dark:border-gray-700 shadow-lg'
  }

  return (
    <div className={`animate-pulse rounded-lg p-6 ${variantClasses[variant]} ${className}`}>
      <div className="flex items-start space-x-4">
        {showAvatar && (
          <div className="rounded-full bg-gray-200 dark:bg-gray-600 h-10 w-10 shadow-sm" />
        )}
        <div className="flex-1 space-y-3">
          {variant === 'hero' && (
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-1 h-6 bg-primary-300 rounded-full"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-32"></div>
            </div>
          )}
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={`h-4 bg-gray-200 dark:bg-gray-600 rounded transition-all duration-200 ${
                i === lines - 1 ? 'w-3/4' : 'w-full'
              }`}
            />
          ))}
          {variant === 'elevated' && (
            <div className="flex space-x-2 mt-4">
              <div className="h-8 w-20 bg-primary-200 dark:bg-primary-800 rounded-full"></div>
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Table loading skeleton
export function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}: { 
  rows?: number
  columns?: number
  className?: string 
}) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={`header-${i}`} className="h-4 bg-gray-300 rounded" />
          ))}
        </div>
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid grid-cols-4 gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={`cell-${rowIndex}-${colIndex}`} className="h-4 bg-gray-200 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Calendar loading skeleton
export function CalendarSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="flex space-x-2">
            <div className="h-8 w-8 bg-gray-200 rounded" />
            <div className="h-8 w-8 bg-gray-200 rounded" />
          </div>
        </div>
        
        {/* Days grid */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}

// Time slots loading skeleton
export function TimeSlotsLoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="h-6 bg-gray-200 rounded w-48" />
        
        {/* Time slots grid */}
        <div className="space-y-4">
          {['Morning', 'Afternoon', 'Evening'].map((period, periodIndex) => (
            <div key={period} className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {Array.from({ length: 4 + periodIndex }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Error display component with enhanced retry functionality
export function ErrorDisplay({ 
  error, 
  onRetry, 
  className = '',
  title = 'Something went wrong',
  showDetails = true,
  retryText = 'Try again',
  retryAttempts = 0,
  maxRetries = 3,
  suggestions = []
}: { 
  error: string | Error
  onRetry?: () => void
  className?: string
  title?: string
  showDetails?: boolean
  retryText?: string
  retryAttempts?: number
  maxRetries?: number
  suggestions?: string[]
}) {
  const [isRetrying, setIsRetrying] = React.useState(false)
  const errorMessage = error instanceof Error ? error.message : error
  const canRetry = onRetry && retryAttempts < maxRetries

  // Detect error type for better messaging
  const getErrorInfo = () => {
    const msg = errorMessage.toLowerCase()
    
    if (msg.includes('network') || msg.includes('fetch')) {
      return {
        title: 'Connection Error',
        icon: '🌐',
        suggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Check if the service is online'
        ]
      }
    } else if (msg.includes('timeout')) {
      return {
        title: 'Request Timed Out',
        icon: '⏱️',
        suggestions: [
          'The server is taking too long to respond',
          'Try again in a moment',
          'Check your internet speed'
        ]
      }
    } else if (msg.includes('not found') || msg.includes('404')) {
      return {
        title: 'Not Found',
        icon: '🔍',
        suggestions: [
          'The requested resource was not found',
          'Check if the URL is correct',
          'The item may have been removed'
        ]
      }
    } else if (msg.includes('unauthorized') || msg.includes('401')) {
      return {
        title: 'Authentication Required',
        icon: '🔒',
        suggestions: [
          'Your session may have expired',
          'Please log in again',
          'Check your credentials'
        ]
      }
    } else if (msg.includes('server') || msg.includes('500')) {
      return {
        title: 'Server Error',
        icon: '🖥️',
        suggestions: [
          'The server encountered an error',
          'Our team has been notified',
          'Please try again later'
        ]
      }
    }
    
    return {
      title,
      icon: '⚠️',
      suggestions: suggestions.length > 0 ? suggestions : ['Please try again or contact support if the issue persists']
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
    <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
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
          
          {/* Retry attempts indicator */}
          {retryAttempts > 0 && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              Retry attempt {retryAttempts} of {maxRetries}
            </p>
          )}
          
          {/* Suggestions */}
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
          
          {/* Action buttons */}
          <div className="mt-3 flex items-center gap-3">
            {canRetry && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="text-sm font-medium text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100 underline disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
              >
                {isRetrying ? (
                  <>
                    <LoadingSpinner size="sm" className="text-red-600" />
                    Retrying...
                  </>
                ) : (
                  retryText
                )}
              </button>
            )}
            
            {/* Additional actions based on error type */}
            {errorMessage.toLowerCase().includes('401') && (
              <a
                href="/login"
                className="text-sm font-medium text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100 underline"
              >
                Go to Login
              </a>
            )}
          </div>
          
          {/* Dev mode error stack */}
          {process.env.NODE_ENV === 'development' && error instanceof Error && error.stack && (
            <details className="mt-3">
              <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
                Show error stack
              </summary>
              <pre className="mt-1 text-xs overflow-auto p-2 bg-red-100 dark:bg-red-800/20 rounded max-h-32">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

// Success message component
export function SuccessMessage({ 
  message, 
  onDismiss, 
  className = '' 
}: { 
  message: string
  onDismiss?: () => void
  className?: string 
}) {
  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-green-800">{message}</p>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className="inline-flex text-green-400 hover:text-green-600"
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
}

// Enhanced Dashboard Skeleton matching our dashboard design
export function DashboardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Enhanced header skeleton with accent line */}
      <div className="animate-pulse">
        <div className="flex items-center space-x-4 mb-2">
          <div className="w-1 h-12 bg-primary-300 rounded-full"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-40"></div>
        </div>
        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-64 ml-6"></div>
      </div>

      {/* Stats cards in grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <LoadingSkeleton 
            key={i} 
            variant={i === 0 ? 'hero' : 'elevated'} 
            lines={2}
            className="h-24"
          />
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LoadingSkeleton variant="primary" lines={6} className="h-80" />
        <LoadingSkeleton variant="secondary" lines={5} className="h-80" />
      </div>
    </div>
  )
}

// Enhanced Calendar Skeleton matching our calendar design
export function CalendarPageSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Enhanced calendar header with accent line */}
      <div className="animate-pulse flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <div className="w-1 h-12 bg-primary-300 rounded-full"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-32"></div>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-56 ml-6"></div>
        </div>
        
        {/* Action buttons skeleton */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 shadow-sm">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 w-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-primary-200 dark:bg-primary-800 rounded shadow-sm"></div>
            <div className="h-10 w-20 bg-gray-200 dark:bg-gray-600 rounded shadow-sm"></div>
          </div>
        </div>
      </div>

      {/* Calendar grid skeleton */}
      <div className="animate-pulse bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          {/* Calendar header */}
          <div className="flex justify-between items-center">
            <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-32" />
            <div className="flex space-x-2">
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-600 rounded" />
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-600 rounded" />
            </div>
          </div>
          
          {/* Days grid */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded border transition-all duration-200"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced List Item Skeleton for appointments, clients, etc.
export function ListItemSkeleton({ 
  showAvatar = true, 
  showBadge = false,
  className = '' 
}: { 
  showAvatar?: boolean
  showBadge?: boolean
  className?: string 
}) {
  return (
    <div className={`animate-pulse flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ${className}`}>
      <div className="flex items-center space-x-4 flex-1">
        {showAvatar && (
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full shadow-sm"></div>
        )}
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        {showBadge && (
          <div className="h-6 w-16 bg-primary-200 dark:bg-primary-800 rounded-full"></div>
        )}
        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-600 rounded"></div>
      </div>
    </div>
  )
}

// Enhanced Notification Skeleton
export function NotificationSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg ${className}`}>
      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 shadow-sm"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-blue-200 dark:bg-blue-700 rounded w-full"></div>
        <div className="h-3 bg-blue-200 dark:bg-blue-700 rounded w-2/3"></div>
      </div>
      <div className="w-4 h-4 bg-blue-200 dark:bg-blue-700 rounded"></div>
    </div>
  )
}