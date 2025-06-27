'use client'

import React, { useEffect, useState } from 'react'
import { AlertCircle, WifiOff, RefreshCw, X, CheckCircle } from 'lucide-react'
import { POSError, ErrorType } from '@/lib/pos/error-handler'

interface ErrorNotificationProps {
  error: POSError | null
  onRetry?: () => void
  onDismiss?: () => void
  autoHide?: boolean
  autoHideDelay?: number
}

export function ErrorNotification({
  error,
  onRetry,
  onDismiss,
  autoHide = false,
  autoHideDelay = 5000
}: ErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (error) {
      setIsVisible(true)

      if (autoHide && !error.retryable) {
        const timer = setTimeout(() => {
          setIsVisible(false)
          onDismiss?.()
        }, autoHideDelay)

        return () => clearTimeout(timer)
      }
    } else {
      setIsVisible(false)
    }
  }, [error, autoHide, autoHideDelay, onDismiss])

  if (!error || !isVisible) return null

  const getIcon = () => {
    switch (error.type) {
      case ErrorType.OFFLINE:
      case ErrorType.NETWORK_ERROR:
        return <WifiOff className="w-5 h-5" />
      default:
        return <AlertCircle className="w-5 h-5" />
    }
  }

  const getColorClasses = () => {
    switch (error.type) {
      case ErrorType.OFFLINE:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case ErrorType.DUPLICATE_SALE:
        return 'bg-orange-50 border-orange-200 text-orange-800'
      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.TRANSACTION_FAILED:
        return 'bg-red-50 border-red-200 text-red-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  return (
    <div className={`fixed top-4 right-4 max-w-md p-4 rounded-lg border shadow-lg z-50 ${getColorClasses()}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>

        <div className="flex-1">
          <p className="font-medium">{error.userMessage}</p>

          {error.details && (
            <p className="mt-1 text-sm opacity-80">
              {typeof error.details === 'string' ? error.details : JSON.stringify(error.details)}
            </p>
          )}

          {error.retryCount && error.maxRetries && (
            <p className="mt-1 text-sm opacity-70">
              Retry {error.retryCount} of {error.maxRetries}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {error.retryable && onRetry && (
            <button
              onClick={onRetry}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Retry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {onDismiss && (
            <button
              onClick={() => {
                setIsVisible(false)
                onDismiss()
              }}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Offline indicator component
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-yellow-100 border border-yellow-300 text-yellow-800 p-4 rounded-lg shadow-lg z-50">
      <div className="flex items-center gap-3">
        <WifiOff className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium">You are offline</p>
          <p className="text-sm mt-1">Sales will be saved and synced when connection is restored.</p>
        </div>
      </div>
    </div>
  )
}

// Success notification component
interface SuccessNotificationProps {
  message: string
  onClose?: () => void
  autoHide?: boolean
  autoHideDelay?: number
}

export function SuccessNotification({
  message,
  onClose,
  autoHide = true,
  autoHideDelay = 3000
}: SuccessNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, autoHideDelay)

      return () => clearTimeout(timer)
    }
  }, [autoHide, autoHideDelay, onClose])

  if (!isVisible) return null

  return (
    <div className="fixed top-4 right-4 max-w-md p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg shadow-lg z-50">
      <div className="flex items-center gap-3">
        <CheckCircle className="w-5 h-5 flex-shrink-0" />
        <p className="font-medium">{message}</p>
        {onClose && (
          <button
            onClick={() => {
              setIsVisible(false)
              onClose()
            }}
            className="ml-auto p-1 hover:bg-green-100 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
