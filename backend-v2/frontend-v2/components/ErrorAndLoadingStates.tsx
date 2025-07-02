'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Button } from './ui/Button'
import { Card, CardContent } from './ui/Card'

interface LoadingSkeletonProps {
  type?: 'card' | 'list' | 'table' | 'calendar' | 'dashboard'
  count?: number
}

export function LoadingSkeleton({ type = 'card', count = 3 }: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))
      
      case 'list':
        return Array.from({ length: count }).map((_, i) => (
          <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-10 w-10"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        ))
      
      case 'table':
        return (
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="grid grid-cols-4 gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        )
      
      case 'calendar':
        return (
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="grid grid-cols-7 gap-4">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        )
      
      case 'dashboard':
        return (
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      
      default:
        return Array.from({ length: count }).map((_, i) => (
          <div key={i} className="animate-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
        ))
    }
  }

  return <div className="w-full">{renderSkeleton()}</div>
}

interface ErrorDisplayProps {
  error: string
  type?: 'network' | 'auth' | 'permission' | 'notfound' | 'server' | 'generic'
  onRetry?: () => void
  showRetry?: boolean
  className?: string
}

export function ErrorDisplay({ 
  error, 
  type = 'generic', 
  onRetry, 
  showRetry = true,
  className = '' 
}: ErrorDisplayProps) {
  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: WifiOff,
          title: 'Connection Error',
          description: 'Unable to connect to the server. Please check your internet connection.',
          color: 'text-orange-500 dark:text-orange-400'
        }
      case 'auth':
        return {
          icon: AlertTriangle,
          title: 'Authentication Required',
          description: 'Please log in to access this content.',
          color: 'text-yellow-500 dark:text-yellow-400'
        }
      case 'permission':
        return {
          icon: AlertTriangle,
          title: 'Access Denied',
          description: 'You do not have permission to view this content.',
          color: 'text-red-500 dark:text-red-400'
        }
      case 'notfound':
        return {
          icon: AlertTriangle,
          title: 'Not Found',
          description: 'The requested content could not be found.',
          color: 'text-gray-500 dark:text-gray-400'
        }
      case 'server':
        return {
          icon: AlertTriangle,
          title: 'Server Error',
          description: 'Something went wrong on our end. Please try again later.',
          color: 'text-red-500 dark:text-red-400'
        }
      default:
        return {
          icon: AlertTriangle,
          title: 'Error',
          description: error,
          color: 'text-red-500 dark:text-red-400'
        }
    }
  }

  const config = getErrorConfig()
  const IconComponent = config.icon

  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] p-8 text-center ${className}`}>
      <div className={`mb-4 ${config.color}`}>
        <IconComponent className="h-12 w-12 mx-auto" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {config.title}
      </h3>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        {config.description}
      </p>
      
      {showRetry && onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="md"
          className="flex items-center gap-2 touch-target"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  )
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  className?: string
}

export function LoadingSpinner({ size = 'md', message, className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className={`animate-spin rounded-full border-4 border-gray-200 border-t-primary-500 ${sizeClasses[size]}`} />
      {message && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
      )}
    </div>
  )
}

interface NetworkStatusProps {
  isOnline: boolean
  className?: string
}

export function NetworkStatus({ isOnline, className = '' }: NetworkStatusProps) {
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-green-600 dark:text-green-400">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-red-600 dark:text-red-400">Offline</span>
        </>
      )}
    </div>
  )
}

// Hook to detect online/offline status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}