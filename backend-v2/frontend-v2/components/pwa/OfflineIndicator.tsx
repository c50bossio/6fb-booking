'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  WifiOff, 
  Wifi, 
  Sync, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  RefreshCw 
} from 'lucide-react'
import { offlineDataManager } from '@/lib/offline-data-manager'
import { useToast } from '@/hooks/useToast'

interface OfflineStats {
  queuedActions: number;
  offlineAppointments: number;
  cacheSize: number;
  lastSync?: number;
}

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [stats, setStats] = useState<OfflineStats>({
    queuedActions: 0,
    offlineAppointments: 0,
    cacheSize: 0
  })
  const [issyncing, setIsSyncing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      toast({
        title: "Back Online",
        description: "Connection restored. Syncing data...",
        duration: 3000,
      })
      handleSync()
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast({
        title: "You're Offline",
        description: "Changes will be saved and synced when reconnected.",
        variant: "destructive",
        duration: 5000,
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load initial stats
    loadStats()

    // Update stats periodically
    const interval = setInterval(loadStats, 30000) // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  const loadStats = async () => {
    try {
      const offlineStats = await offlineDataManager.getOfflineStats()
      setStats(offlineStats)
    } catch (error) {
      console.error('Failed to load offline stats:', error)
    }
  }

  const handleSync = async () => {
    if (!isOnline) {
      toast({
        title: "Cannot Sync",
        description: "Please check your internet connection.",
        variant: "destructive",
      })
      return
    }

    setIsSyncing(true)

    try {
      const result = await offlineDataManager.syncWithServer()
      
      if (result.success) {
        toast({
          title: "Sync Successful",
          description: `${result.synced} items synced successfully.`,
        })
      } else {
        toast({
          title: "Sync Issues",
          description: `${result.synced} synced, ${result.failed} failed, ${result.conflicts} conflicts.`,
          variant: "destructive",
        })
      }

      await loadStats()
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Unable to sync with server. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500'
    if (stats.queuedActions > 0 || stats.offlineAppointments > 0) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline'
    if (stats.queuedActions > 0 || stats.offlineAppointments > 0) return 'Syncing'
    return 'Online'
  }

  const formatLastSync = (timestamp?: number) => {
    if (!timestamp) return 'Never'
    
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const totalPendingItems = stats.queuedActions + stats.offlineAppointments

  return (
    <>
      {/* Main Status Indicator */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border hover:shadow-xl transition-all duration-200"
        >
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600" />
          )}
          
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {getStatusText()}
          </span>

          {totalPendingItems > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalPendingItems}
            </Badge>
          )}

          {issyncing && (
            <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
          )}
        </button>
      </div>

      {/* Detailed Status Panel */}
      {showDetails && (
        <div className="fixed top-16 right-4 z-40">
          <Card className="w-80 shadow-xl border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Connection Status</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSync}
                  disabled={!isOnline || issyncing}
                  className="flex items-center gap-2"
                >
                  {issyncing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sync className="h-4 w-4" />
                  )}
                  {issyncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              </div>

              {/* Connection Status */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  {isOnline ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium text-green-700 dark:text-green-400">
                          Connected
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          All features available
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <div>
                        <div className="font-medium text-red-700 dark:text-red-400">
                          Offline
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Limited functionality
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Pending Items */}
                {totalPendingItems > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                      Pending Sync Items
                    </h4>
                    
                    {stats.queuedActions > 0 && (
                      <div className="flex items-center justify-between p-2 rounded bg-yellow-50 dark:bg-yellow-900/20">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm">Queued Actions</span>
                        </div>
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                          {stats.queuedActions}
                        </Badge>
                      </div>
                    )}

                    {stats.offlineAppointments > 0 && (
                      <div className="flex items-center justify-between p-2 rounded bg-blue-50 dark:bg-blue-900/20">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">Offline Appointments</span>
                        </div>
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                          {stats.offlineAppointments}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Cache Info */}
                <div className="pt-3 border-t space-y-2">
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                    Cache Status
                  </h4>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Cached Items
                    </span>
                    <span className="font-medium">
                      {stats.cacheSize}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Last Sync
                    </span>
                    <span className="font-medium">
                      {formatLastSync(stats.lastSync)}
                    </span>
                  </div>
                </div>

                {/* Offline Mode Info */}
                {!isOnline && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-sm text-blue-800 dark:text-blue-200 mb-2">
                      Offline Mode Active
                    </h4>
                    <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• View cached calendar data</li>
                      <li>• Create appointments (will sync later)</li>
                      <li>• Access recent analytics</li>
                      <li>• Limited real-time features</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDetails(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                {!isOnline && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="flex-1"
                  >
                    Retry Connection
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

// Hook for other components to use offline status
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [stats, setStats] = useState<OfflineStats>({
    queuedActions: 0,
    offlineAppointments: 0,
    cacheSize: 0
  })

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load stats
    const loadStats = async () => {
      try {
        const offlineStats = await offlineDataManager.getOfflineStats()
        setStats(offlineStats)
      } catch (error) {
        console.error('Failed to load offline stats:', error)
      }
    }

    loadStats()
    const interval = setInterval(loadStats, 60000) // Every minute

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  return {
    isOnline,
    stats,
    hasPendingItems: stats.queuedActions > 0 || stats.offlineAppointments > 0
  }
}