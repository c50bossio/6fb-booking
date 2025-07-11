'use client'

import React from 'react'

// Loading spinner component
export function LoadingSpinner({ size = 'md', className = '' }: { 
  size?: 'sm' | 'md' | 'lg'
  className?: string 
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${className}`}
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

// Full page loading component
export function PageLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto text-primary-600 mb-4" />
        <p className="text-accent-600 text-lg">{message}</p>
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

// Card/section loading skeleton
export function LoadingSkeleton({ 
  lines = 3, 
  className = '',
  showAvatar = false 
}: { 
  lines?: number
  className?: string
  showAvatar?: boolean 
}) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="flex items-start space-x-4">
        {showAvatar && (
          <div className="rounded-full bg-gray-200 h-10 w-10" />
        )}
        <div className="flex-1 space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={`h-4 bg-gray-200 rounded ${
                i === lines - 1 ? 'w-3/4' : 'w-full'
              }`}
            />
          ))}
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