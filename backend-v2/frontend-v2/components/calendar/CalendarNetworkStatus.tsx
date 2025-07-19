/**
 * Calendar Network Status Component
 * Shows network status, pending requests, and optimistic updates
 */

import React, { useState, useEffect } from 'react'
import { 
  WifiIcon, 
  CloudIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useCalendarApiEnhanced } from '@/lib/calendar-api-enhanced'
import { useCalendarOptimisticUpdates } from '@/lib/calendar-optimistic-updates'

interface NetworkStatusProps {
  showDetails?: boolean
  className?: string
}

export function CalendarNetworkStatus({ 
  showDetails = false, 
  className = '' 
}: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [debugStats, setDebugStats] = useState<any>(null)
  const { getDebugStats } = useCalendarApiEnhanced()
  const { loading, error } = useCalendarOptimisticUpdates()

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Update debug stats periodically
  useEffect(() => {
    const updateStats = () => {
      try {
        const stats = getDebugStats()
        setDebugStats(stats)
      } catch (error) {
        }
    }

    updateStats()
    const interval = setInterval(updateStats, 2000)
    return () => clearInterval(interval)
  }, []) // Remove getDebugStats from dependencies to prevent infinite re-renders

  const getNetworkStatusIcon = () => {
    if (!isOnline) {
      return <WifiIcon className="w-4 h-4 text-red-500" />
    }
    
    if (loading) {
      return <ArrowPathIcon className="w-4 h-4 text-blue-500 animate-spin" />
    }
    
    if (error) {
      return <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
    }
    
    return <CheckCircleIcon className="w-4 h-4 text-green-500" />
  }

  const getNetworkStatusText = () => {
    if (!isOnline) return 'Offline'
    if (loading) return 'Syncing...'
    if (error) return 'Error'
    return 'Online'
  }

  const getNetworkStatusColor = () => {
    if (!isOnline) return 'border-red-200 bg-red-50 text-red-800'
    if (loading) return 'border-blue-200 bg-blue-50 text-blue-800'
    if (error) return 'border-amber-200 bg-amber-50 text-amber-800'
    return 'border-green-200 bg-green-50 text-green-800'
  }

  const pendingRequests = debugStats?.requestManager?.pendingRequests || 0
  const optimisticUpdates = debugStats?.requestManager?.optimisticUpdates || 0
  const cacheEntries = debugStats?.requestManager?.cacheEntries || 0

  if (!showDetails) {
    // Compact status indicator
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${getNetworkStatusColor()} ${className}`}>
        {getNetworkStatusIcon()}
        <span>{getNetworkStatusText()}</span>
        {pendingRequests > 0 && (
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            {pendingRequests}
          </span>
        )}
      </div>
    )
  }

  // Detailed status panel
  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Network Status
        </h3>
        {getNetworkStatusIcon()}
      </div>

      <div className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Connection:</span>
          <span className={`text-sm font-medium ${
            isOnline ? 'text-green-600' : 'text-red-600'
          }`}>
            {getNetworkStatusText()}
          </span>
        </div>

        {/* Calendar State */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Calendar:</span>
          <span className={`text-sm font-medium ${
            error ? 'text-red-600' : loading ? 'text-blue-600' : 'text-green-600'
          }`}>
            {error ? 'Error' : loading ? 'Loading' : 'Ready'}
          </span>
        </div>

        {/* Request Activity */}
        {debugStats && (
          <>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="text-xs font-medium text-gray-900 dark:text-white mb-2">
                Request Activity
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Pending:</span>
                  <span className={`font-medium ${
                    pendingRequests > 0 ? 'text-blue-600' : 'text-gray-900 dark:text-white'
                  }`}>
                    {pendingRequests}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Optimistic:</span>
                  <span className={`font-medium ${
                    optimisticUpdates > 0 ? 'text-amber-600' : 'text-gray-900 dark:text-white'
                  }`}>
                    {optimisticUpdates}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Cached:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {cacheEntries}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`font-medium ${
                    error ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {error ? 'Error' : 'OK'}
                  </span>
                </div>
              </div>
            </div>

            {/* Error Details */}
            {error && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="text-xs font-medium text-gray-900 dark:text-white mb-1">
                  Last Error
                </div>
                <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  {error}
                </div>
              </div>
            )}

            {/* Pending Requests Details */}
            {pendingRequests > 0 && debugStats.requestManager.pendingRequestKeys && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="text-xs font-medium text-gray-900 dark:text-white mb-1">
                  Active Requests
                </div>
                <div className="space-y-1">
                  {debugStats.requestManager.pendingRequestKeys.slice(0, 3).map((key: string, index: number) => (
                    <div key={index} className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                      {key}
                    </div>
                  ))}
                  {debugStats.requestManager.pendingRequestKeys.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      +{debugStats.requestManager.pendingRequestKeys.length - 3} more...
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Offline Message */}
        {!isOnline && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-600 dark:text-gray-400">
                You're currently offline. Changes will be synced when connection is restored.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Hook for network status monitoring
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        // Trigger a refresh when coming back online
        window.location.reload()
      }
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  return {
    isOnline,
    wasOffline
  }
}

// Component for showing request queue in development
export function CalendarRequestQueue() {
  const { getDebugStats } = useCalendarApiEnhanced()
  const [stats, setStats] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    const updateStats = () => {
      const debugStats = getDebugStats()
      setStats(debugStats)
    }

    updateStats()
    const interval = setInterval(updateStats, 1000)
    return () => clearInterval(interval)
  }, []) // Remove getDebugStats from dependencies to prevent infinite re-renders

  if (process.env.NODE_ENV !== 'development' || !stats) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Toggle request queue debug panel"
      >
        <CloudIcon className="w-4 h-4" />
      </button>

      {isVisible && (
        <div className="absolute bottom-12 right-0 w-80">
          <CalendarNetworkStatus showDetails={true} />
        </div>
      )}
    </div>
  )
}