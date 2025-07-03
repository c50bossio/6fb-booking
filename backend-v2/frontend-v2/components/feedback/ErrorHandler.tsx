'use client'

import React, { useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw, Info, CheckCircle, XCircle, WifiOff, Clock, ArrowRight, HelpCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// Enhanced error types with user guidance
export interface EnhancedError {
  id: string
  type: 'error' | 'warning' | 'info' | 'success'
  category: 'network' | 'validation' | 'authentication' | 'permission' | 'server' | 'client' | 'booking' | 'payment'
  title: string
  message: string
  details?: string
  actions?: ErrorAction[]
  retryable?: boolean
  dismissible?: boolean
  persistUntilResolved?: boolean
  helpLink?: string
  context?: Record<string, any>
  timestamp: Date
  attempts?: number
  maxAttempts?: number
}

export interface ErrorAction {
  id: string
  label: string
  type: 'primary' | 'secondary' | 'danger'
  action: () => void | Promise<void>
  loading?: boolean
  disabled?: boolean
  icon?: React.ReactNode
}

export interface ErrorHandlerProps {
  errors: EnhancedError[]
  onDismiss?: (errorId: string) => void
  onRetry?: (errorId: string) => void
  onAction?: (errorId: string, actionId: string) => void
  className?: string
  maxVisible?: number
  position?: 'top' | 'bottom' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  showProgress?: boolean
  groupSimilar?: boolean
}

const errorIcons = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
}

const errorColors = {
  error: 'destructive',
  warning: 'warning',
  info: 'default',
  success: 'success',
} as const

// Enhanced Error Handler Component
export function ErrorHandler({
  errors,
  onDismiss,
  onRetry,
  onAction,
  className,
  maxVisible = 3,
  position = 'top-right',
  showProgress = true,
  groupSimilar = true,
}: ErrorHandlerProps) {
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set())
  const [actionStates, setActionStates] = useState<Record<string, Record<string, boolean>>>({})

  // Group similar errors if enabled
  const processedErrors = groupSimilar ? groupSimilarErrors(errors) : errors

  // Only show the most recent errors up to maxVisible
  const visibleErrors = processedErrors.slice(0, maxVisible)

  const handleAction = async (errorId: string, actionId: string) => {
    const error = errors.find(e => e.id === errorId)
    const action = error?.actions?.find(a => a.id === actionId)
    
    if (!action) return

    // Set loading state
    setActionStates(prev => ({
      ...prev,
      [errorId]: { ...prev[errorId], [actionId]: true }
    }))

    try {
      await action.action()
      onAction?.(errorId, actionId)
    } catch (err) {
      console.error('Error action failed:', err)
    } finally {
      // Clear loading state
      setActionStates(prev => ({
        ...prev,
        [errorId]: { ...prev[errorId], [actionId]: false }
      }))
    }
  }

  const toggleExpanded = (errorId: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev)
      if (newSet.has(errorId)) {
        newSet.delete(errorId)
      } else {
        newSet.add(errorId)
      }
      return newSet
    })
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'top-4 left-1/2 transform -translate-x-1/2'
      case 'bottom':
        return 'bottom-4 left-1/2 transform -translate-x-1/2'
      case 'top-left':
        return 'top-4 left-4'
      case 'top-right':
        return 'top-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      default:
        return 'top-4 right-4'
    }
  }

  if (visibleErrors.length === 0) return null

  return (
    <div className={cn(
      'fixed z-50 space-y-2 max-w-md w-full',
      getPositionClasses(),
      className
    )}>
      {visibleErrors.map((error) => {
        const Icon = errorIcons[error.type]
        const isExpanded = expandedErrors.has(error.id)
        const errorActionStates = actionStates[error.id] || {}

        return (
          <Card
            key={error.id}
            className={cn(
              'shadow-lg border-l-4 transition-all duration-300 hover:shadow-xl',
              error.type === 'error' && 'border-l-red-500 bg-red-50 dark:bg-red-950',
              error.type === 'warning' && 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950',
              error.type === 'info' && 'border-l-blue-500 bg-blue-50 dark:bg-blue-950',
              error.type === 'success' && 'border-l-green-500 bg-green-50 dark:bg-green-950'
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <Icon className={cn(
                    'h-5 w-5 flex-shrink-0',
                    error.type === 'error' && 'text-red-500',
                    error.type === 'warning' && 'text-yellow-500',
                    error.type === 'info' && 'text-blue-500',
                    error.type === 'success' && 'text-green-500'
                  )} />
                  <div>
                    <CardTitle className="text-sm font-semibold">
                      {error.title}
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {error.category}
                      </Badge>
                      {error.attempts && error.maxAttempts && (
                        <Badge variant="secondary" className="text-xs">
                          Attempt {error.attempts}/{error.maxAttempts}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {error.details && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(error.id)}
                      className="p-1 h-6 w-6"
                    >
                      <HelpCircle className="h-3 w-3" />
                    </Button>
                  )}
                  {error.dismissible && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDismiss?.(error.id)}
                      className="p-1 h-6 w-6"
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                {error.message}
              </p>

              {isExpanded && error.details && (
                <Alert className="mb-3">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Additional Information</AlertTitle>
                  <AlertDescription>
                    {error.details}
                  </AlertDescription>
                </Alert>
              )}

              {showProgress && error.retryable && error.attempts && error.maxAttempts && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Retry Progress</span>
                    <span>{error.attempts}/{error.maxAttempts}</span>
                  </div>
                  <Progress value={(error.attempts / error.maxAttempts) * 100} className="h-2" />
                </div>
              )}

              {error.actions && error.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {error.actions.map((action) => (
                    <Button
                      key={action.id}
                      variant={action.type === 'primary' ? 'default' : action.type === 'danger' ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() => handleAction(error.id, action.id)}
                      disabled={action.disabled || errorActionStates[action.id]}
                      className="text-xs"
                    >
                      {errorActionStates[action.id] ? (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      ) : action.icon ? (
                        <span className="mr-1">{action.icon}</span>
                      ) : null}
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}

              {error.helpLink && (
                <a
                  href={error.helpLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Get help <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t">
                <span>{error.timestamp.toLocaleTimeString()}</span>
                {error.retryable && (
                  <span className="flex items-center">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Auto-retry enabled
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {processedErrors.length > maxVisible && (
        <Card className="shadow-lg">
          <CardContent className="py-2">
            <p className="text-xs text-center text-gray-600 dark:text-gray-400">
              +{processedErrors.length - maxVisible} more errors
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Error Recovery Component
export interface ErrorRecoveryProps {
  error: EnhancedError
  onRetry: () => void
  onDismiss: () => void
  retryCount?: number
  maxRetries?: number
  autoRetry?: boolean
  retryDelay?: number
  className?: string
}

export function ErrorRecovery({
  error,
  onRetry,
  onDismiss,
  retryCount = 0,
  maxRetries = 3,
  autoRetry = false,
  retryDelay = 3000,
  className,
}: ErrorRecoveryProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (autoRetry && retryCount < maxRetries && error.retryable) {
      setCountdown(retryDelay / 1000)
      
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            handleRetry()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [autoRetry, retryCount, maxRetries, error.retryable, retryDelay])

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setIsRetrying(false)
    }
  }

  const canRetry = error.retryable && retryCount < maxRetries

  return (
    <Card className={cn('border-red-200 bg-red-50 dark:bg-red-950', className)}>
      <CardContent className="pt-6">
        <div className="flex items-center space-x-3 mb-4">
          <XCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-100">
              {error.title}
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              {error.message}
            </p>
          </div>
        </div>

        {canRetry && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-red-700 dark:text-red-300">
                Retry {retryCount + 1} of {maxRetries}
              </span>
              {countdown > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  Auto-retry in {countdown}s
                </span>
              )}
            </div>
            <Progress value={((retryCount) / maxRetries) * 100} className="h-2" />
          </div>
        )}

        <div className="flex space-x-2">
          {canRetry && (
            <Button
              onClick={handleRetry}
              disabled={isRetrying || countdown > 0}
              size="sm"
              className="flex-1"
            >
              {isRetrying ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {countdown > 0 ? `Retry in ${countdown}s` : 'Retry Now'}
            </Button>
          )}
          <Button
            onClick={onDismiss}
            variant="outline"
            size="sm"
            className={canRetry ? '' : 'flex-1'}
          >
            Dismiss
          </Button>
        </div>

        {!canRetry && retryCount >= maxRetries && (
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Maximum Retries Reached</AlertTitle>
            <AlertDescription>
              Please try again later or contact support if the problem persists.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

// Utility function to group similar errors
function groupSimilarErrors(errors: EnhancedError[]): EnhancedError[] {
  const grouped = new Map<string, EnhancedError[]>()
  
  errors.forEach(error => {
    const key = `${error.category}-${error.title}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(error)
  })
  
  return Array.from(grouped.values()).map(group => {
    if (group.length === 1) {
      return group[0]
    }
    
    // Create a combined error for similar errors
    const firstError = group[0]
    return {
      ...firstError,
      id: `grouped-${firstError.category}-${Date.now()}`,
      message: `${firstError.message} (${group.length} similar errors)`,
      details: `This error occurred ${group.length} times. Latest: ${group[group.length - 1].timestamp.toLocaleTimeString()}`,
    }
  })
}

// Network Status Component
export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'fast' | 'unknown'>('unknown')

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check connection speed
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        const updateConnectionSpeed = () => {
          const speed = connection.effectiveType
          setConnectionSpeed(speed === '4g' || speed === '3g' ? 'fast' : 'slow')
        }
        updateConnectionSpeed()
        connection.addEventListener('change', updateConnectionSpeed)
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && connectionSpeed !== 'slow') return null

  return (
    <Alert className={cn(
      'fixed top-4 left-4 right-4 z-50 mx-auto max-w-md',
      !isOnline ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
    )}>
      {!isOnline ? (
        <WifiOff className="h-4 w-4" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      <AlertTitle>
        {!isOnline ? 'No Internet Connection' : 'Slow Connection Detected'}
      </AlertTitle>
      <AlertDescription>
        {!isOnline 
          ? 'You are currently offline. Some features may not work properly.' 
          : 'Your connection appears to be slow. Some operations may take longer than usual.'
        }
      </AlertDescription>
    </Alert>
  )
}

export default ErrorHandler