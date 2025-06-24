/**
 * Offline Status Indicator and Service Worker Management UI
 */
import React, { useState, useEffect, useCallback } from 'react'
import { useServiceWorker } from '@/lib/serviceWorker/serviceWorkerManager'
import { WifiOff, Wifi, Download, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface OfflineIndicatorProps {
  className?: string
  showDetails?: boolean
}

export default function OfflineIndicator({ className, showDetails = false }: OfflineIndicatorProps) {
  const {
    isRegistered,
    isOnline,
    updateAvailable,
    offlineQueue,
    updateServiceWorker,
    cacheStats
  } = useServiceWorker()

  const [showOfflinePanel, setShowOfflinePanel] = useState(false)
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null)

  useEffect(() => {
    if (isOnline) {
      setLastOnlineTime(new Date())
    }
  }, [isOnline])

  useEffect(() => {
    // Auto-show offline panel when going offline
    if (!isOnline) {
      setShowOfflinePanel(true)
    }
  }, [isOnline])

  if (!isRegistered) {
    return null
  }

  return (
    <>
      {/* Main Status Indicator */}
      <div className={`fixed top-4 right-4 z-50 ${className}`}>
        {/* Update Available Notification */}
        {updateAvailable && (
          <Card className="mb-2 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Update Available
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    A new version is ready to install
                  </p>
                </div>
                <Button
                  onClick={updateServiceWorker}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Update
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Offline Status */}
        {!isOnline && (
          <Card className="mb-2 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <WifiOff className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    You're Offline
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    Some features may be limited
                  </p>
                </div>
                <Button
                  onClick={() => setShowOfflinePanel(!showOfflinePanel)}
                  size="sm"
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/30"
                >
                  Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Offline Queue Indicator */}
        {offlineQueue.length > 0 && (
          <Card className="mb-2 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    {offlineQueue.length} Actions Queued
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    Will sync when online
                  </p>
                </div>
                <Badge variant="outline" className="border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-300">
                  {offlineQueue.length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Offline Panel */}
      {showOfflinePanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Connection Status
                </h3>
                <Button
                  onClick={() => setShowOfflinePanel(false)}
                  size="sm"
                  variant="ghost"
                >
                  ×
                </Button>
              </div>

              {/* Current Status */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  {isOnline ? (
                    <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {isOnline ? 'Online' : 'Offline'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {isOnline 
                        ? 'All features available'
                        : 'Limited functionality available'
                      }
                    </p>
                  </div>
                </div>

                {/* Last Online Time */}
                {!isOnline && lastOnlineTime && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Last online: {lastOnlineTime.toLocaleString()}
                  </div>
                )}

                {/* Offline Capabilities */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Available Offline:
                  </h4>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>View cached appointments</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Browse client history</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>View analytics dashboards</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-3 w-3 text-orange-600" />
                      <span>Create appointments (will sync later)</span>
                    </div>
                  </div>
                </div>

                {/* Queued Actions */}
                {offlineQueue.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Queued Actions:
                    </h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {offlineQueue.map((action, index) => (
                        <div key={action.id || index} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">
                            {action.type} - {new Date(action.timestamp).toLocaleTimeString()}
                          </span>
                          <Badge variant="outline" size="sm">
                            {action.retries || 0} retries
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cache Information */}
                {showDetails && cacheStats && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Cache Status:
                    </h4>
                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      {Object.entries(cacheStats).map(([cacheName, stats]) => (
                        <div key={cacheName} className="flex justify-between">
                          <span>{cacheName}</span>
                          <span>{stats.entries} items</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2 pt-4">
                  <Button
                    onClick={() => window.location.reload()}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Retry Connection
                  </Button>
                  <Button
                    onClick={() => setShowOfflinePanel(false)}
                    size="sm"
                    className="flex-1 bg-[#20D9D2] hover:bg-[#1BC5B8] text-white"
                  >
                    Continue Offline
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

// Lightweight status indicator for the header/navbar
export function OfflineStatusBadge({ className }: { className?: string }) {
  const { isOnline, offlineQueue } = useServiceWorker()

  if (isOnline && offlineQueue.length === 0) {
    return null
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {!isOnline && (
        <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:bg-orange-900/20">
          <WifiOff className="h-3 w-3 mr-1" />
          Offline
        </Badge>
      )}
      
      {offlineQueue.length > 0 && (
        <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50 dark:border-yellow-700 dark:text-yellow-300 dark:bg-yellow-900/20">
          <Clock className="h-3 w-3 mr-1" />
          {offlineQueue.length} queued
        </Badge>
      )}
    </div>
  )
}

// Hook for offline-aware components
export function useOfflineStatus() {
  const { isOnline, offlineQueue, queueOfflineAction } = useServiceWorker()

  const executeOfflineAware = useCallback(async (
    action: () => Promise<any>,
    fallbackAction?: Omit<any, 'id' | 'timestamp'>
  ) => {
    if (isOnline) {
      try {
        return await action()
      } catch (error) {
        // If online action fails and we have a fallback, queue it
        if (fallbackAction) {
          await queueOfflineAction(fallbackAction)
          return { success: true, queued: true }
        }
        throw error
      }
    } else {
      // Offline - queue the action if provided
      if (fallbackAction) {
        await queueOfflineAction(fallbackAction)
        return { success: true, queued: true }
      }
      throw new Error('Action not available offline')
    }
  }, [isOnline, queueOfflineAction])

  return {
    isOnline,
    offlineQueue,
    queueLength: offlineQueue.length,
    executeOfflineAware
  }
}