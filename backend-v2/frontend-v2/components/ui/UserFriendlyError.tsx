'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { 
  AlertCircle, 
  WifiOff, 
  ServerCrash, 
  RefreshCw, 
  Home,
  ArrowLeft,
  MessageSquare,
  FileQuestion,
  Lock,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { Button } from './Button'
import { Alert, AlertDescription, AlertTitle } from './alert'
import { retryWithBackoff } from '@/lib/RetryManager'

// Error type detection
export function getErrorType(error: any): string {
  if (!error) return 'unknown'
  
  const message = error.message?.toLowerCase() || ''
  const status = error.status || error.response?.status
  
  // Network errors
  if (!navigator.onLine || message.includes('network') || message.includes('fetch')) {
    return 'network'
  }
  
  // Auth errors
  if (status === 401 || status === 403 || message.includes('unauthorized')) {
    return 'auth'
  }
  
  // Not found
  if (status === 404) {
    return 'notfound'
  }
  
  // Rate limiting
  if (status === 429) {
    return 'ratelimit'
  }
  
  // Server errors
  if (status >= 500 || message.includes('server')) {
    return 'server'
  }
  
  // Timeout
  if (message.includes('timeout')) {
    return 'timeout'
  }
  
  return 'unknown'
}

// User-friendly error messages
const errorMessages = {
  network: {
    title: 'Connection Lost',
    description: 'Unable to connect to our servers. Please check your internet connection and try again.',
    icon: WifiOff,
    canRetry: true
  },
  auth: {
    title: 'Authentication Required',
    description: 'You need to be logged in to access this page. Please log in and try again.',
    icon: Lock,
    canRetry: false
  },
  notfound: {
    title: 'Page Not Found',
    description: 'The page you\'re looking for doesn\'t exist or has been moved.',
    icon: FileQuestion,
    canRetry: false
  },
  ratelimit: {
    title: 'Too Many Requests',
    description: 'You\'ve made too many requests. Please wait a moment before trying again.',
    icon: Clock,
    canRetry: true,
    retryDelay: 60000 // 1 minute
  },
  server: {
    title: 'Server Error',
    description: 'Something went wrong on our end. We\'re working to fix it. Please try again later.',
    icon: ServerCrash,
    canRetry: true
  },
  timeout: {
    title: 'Request Timeout',
    description: 'The request took too long to complete. Please check your connection and try again.',
    icon: Clock,
    canRetry: true
  },
  unknown: {
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    icon: AlertCircle,
    canRetry: true
  }
}

export interface UserFriendlyErrorProps {
  error: any
  onRetry?: () => void | Promise<void>
  onGoBack?: () => void
  onGoHome?: () => void
  onReport?: () => void
  className?: string
  showDetails?: boolean
  fullPage?: boolean
}

export function UserFriendlyError({
  error,
  onRetry,
  onGoBack,
  onGoHome,
  onReport,
  className,
  showDetails = process.env.NODE_ENV === 'development',
  fullPage = false
}: UserFriendlyErrorProps) {
  const [retrying, setRetrying] = React.useState(false)
  const [retryCount, setRetryCount] = React.useState(0)
  const errorType = getErrorType(error)
  const errorInfo = errorMessages[errorType as keyof typeof errorMessages]
  
  const Icon = errorInfo.icon

  const handleRetry = async () => {
    if (!onRetry) return
    
    setRetrying(true)
    setRetryCount(prev => prev + 1)
    
    try {
      // Use retry manager for network errors
      if (errorType === 'network' || errorType === 'timeout') {
        const result = await retryWithBackoff(
          async () => {
            await onRetry()
            return true
          },
          {
            maxRetries: 3,
            onRetry: (error, attempt) => {
              console.log(`Retry attempt ${attempt} after error:`, error)
            }
          }
        )
        
        if (!result.success) {
          throw result.error
        }
      } else {
        await onRetry()
      }
    } catch (retryError) {
      console.error('Retry failed:', retryError)
    } finally {
      setRetrying(false)
    }
  }

  const content = (
    <div className={cn('space-y-4', className)}>
      <Alert variant="destructive" className="border-red-200 dark:border-red-800">
        <Icon className="h-4 w-4" />
        <AlertTitle>{errorInfo.title}</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p>{errorInfo.description}</p>
          
          {retryCount > 2 && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Multiple retry attempts have failed. The issue may persist for a while.
            </p>
          )}
          
          {showDetails && error?.message && (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-medium text-red-700 dark:text-red-300">
                Technical details
              </summary>
              <pre className="mt-2 text-xs overflow-auto p-2 bg-red-50 dark:bg-red-950 rounded max-h-32">
                {error.stack || error.message}
              </pre>
            </details>
          )}
        </AlertDescription>
      </Alert>
      
      <div className="flex flex-wrap gap-2">
        {errorInfo.canRetry && onRetry && (
          <Button
            onClick={handleRetry}
            disabled={retrying}
            variant="outline"
            size="sm"
          >
            {retrying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </>
            )}
          </Button>
        )}
        
        {onGoBack && (
          <Button
            onClick={onGoBack}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        )}
        
        {onGoHome && (
          <Button
            onClick={onGoHome}
            variant="outline"
            size="sm"
          >
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        )}
        
        {onReport && (
          <Button
            onClick={onReport}
            variant="outline"
            size="sm"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Report Issue
          </Button>
        )}
      </div>
      
      {errorType === 'auth' && (
        <div className="mt-4">
          <Button
            onClick={() => window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`}
            variant="primary"
            size="sm"
          >
            Go to Login
          </Button>
        </div>
      )}
    </div>
  )

  if (fullPage) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {content}
        </div>
      </div>
    )
  }

  return content
}

// Error boundary integration
export function ErrorFallback({ 
  error, 
  resetErrorBoundary 
}: { 
  error: Error
  resetErrorBoundary: () => void 
}) {
  return (
    <UserFriendlyError
      error={error}
      onRetry={resetErrorBoundary}
      onGoHome={() => window.location.href = '/'}
      fullPage
    />
  )
}

// Toast error messages
export function getToastErrorMessage(error: any): string {
  const errorType = getErrorType(error)
  
  const messages = {
    network: 'Connection lost. Please check your internet.',
    auth: 'Please log in to continue.',
    notfound: 'Resource not found.',
    ratelimit: 'Too many requests. Please wait.',
    server: 'Server error. Please try again.',
    timeout: 'Request timed out. Please retry.',
    unknown: 'Something went wrong. Please try again.'
  }
  
  return messages[errorType as keyof typeof messages] || messages.unknown
}

// Inline error component
export function InlineError({ 
  error, 
  onRetry,
  className 
}: { 
  error: any
  onRetry?: () => void
  className?: string 
}) {
  const errorType = getErrorType(error)
  const errorInfo = errorMessages[errorType as keyof typeof errorMessages]
  
  return (
    <div className={cn('flex items-center gap-2 text-sm text-red-600 dark:text-red-400', className)}>
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span>{errorInfo.description}</span>
      {errorInfo.canRetry && onRetry && (
        <button
          onClick={onRetry}
          className="text-xs underline hover:no-underline ml-1"
        >
          Retry
        </button>
      )}
    </div>
  )
}