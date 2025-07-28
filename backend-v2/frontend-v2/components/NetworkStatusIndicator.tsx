'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, Loader2, RefreshCw, CloudOff, Cloud, AlertTriangle } from 'lucide-react'
import { offlineDataManager } from '@/lib/offline-data-manager'
import { cn } from '@/lib/utils'

interface NetworkStatusProps {
  className?: string
  showDetails?: boolean
  variant?: 'minimal' | 'detailed' | 'badge'
}

interface SyncStatus {
  queuedActions: number
  isOnline: boolean
  lastSync?: number
  syncInProgress: boolean
  errors: any[]
}

export function NetworkStatusIndicator({ 
  className, 
  showDetails = false, 
  variant = 'minimal' 
}: NetworkStatusProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    queuedActions: 0,
    isOnline: navigator?.onLine || false,
    syncInProgress: false,
    errors: []
  })
  const [isManualSyncing, setIsManualSyncing] = useState(false)

  useEffect(() => {
    // Initial status
    updateSyncStatus()

    // Listen for online/offline events
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }))
      handleAutoSync()
    }
    
    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Periodic status updates
    const interval = setInterval(updateSyncStatus, 30000) // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  const updateSyncStatus = async () => {
    try {
      const stats = await offlineDataManager.getOfflineStats()
      setSyncStatus(prev => ({
        ...prev,
        queuedActions: stats.queuedActions,
        lastSync: stats.lastSync,
        isOnline: navigator.onLine
      }))
    } catch (error) {
      console.error('Failed to update sync status:', error)
    }
  }

  const handleAutoSync = async () => {
    if (!syncStatus.isOnline || syncStatus.syncInProgress) return

    setSyncStatus(prev => ({ ...prev, syncInProgress: true }))
    
    try {
      const result = await offlineDataManager.syncWithServer()
      
      setSyncStatus(prev => ({
        ...prev,
        syncInProgress: false,
        errors: result.errors || [],
        lastSync: Date.now()
      }))
      
      // Update stats after sync
      await updateSyncStatus()
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        syncInProgress: false,
        errors: [{ error: 'Sync failed' }]
      }))
    }
  }

  const handleManualSync = async () => {
    if (!syncStatus.isOnline || isManualSyncing) return

    setIsManualSyncing(true)
    await handleAutoSync()
    setIsManualSyncing(false)
  }

  const formatLastSync = (timestamp?: number) => {
    if (!timestamp) return 'Never'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'text-red-500'
    if (syncStatus.syncInProgress) return 'text-yellow-500'
    if (syncStatus.queuedActions > 0) return 'text-orange-500'
    return 'text-green-500'
  }

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) return <WifiOff className="h-4 w-4" />
    if (syncStatus.syncInProgress) return <Loader2 className="h-4 w-4 animate-spin" />
    if (syncStatus.queuedActions > 0) return <CloudOff className="h-4 w-4" />
    return <Cloud className="h-4 w-4" />
  }

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Offline'
    if (syncStatus.syncInProgress) return 'Syncing...'
    if (syncStatus.queuedActions > 0) return `${syncStatus.queuedActions} queued`
    return 'Online'
  }

  // Minimal badge variant
  if (variant === 'badge') {
    return (
      <Badge 
        variant={syncStatus.isOnline ? 'default' : 'destructive'}
        className={cn("flex items-center gap-1", className)}
      >
        {getStatusIcon()}
        {getStatusText()}
      </Badge>
    )
  }

  // Minimal indicator variant
  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn("flex items-center gap-1", getStatusColor())}>
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
        {syncStatus.isOnline && syncStatus.queuedActions > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleManualSync}
            disabled={isManualSyncing}
            className="h-6 px-2"
          >
            <RefreshCw className={cn("h-3 w-3", isManualSyncing && "animate-spin")} />
          </Button>
        )}
      </div>
    )
  }

  // Detailed variant
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-full bg-gray-100 dark:bg-gray-800", getStatusColor())}>
            {getStatusIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Network Status</span>
              <Badge variant={syncStatus.isOnline ? 'default' : 'destructive'}>
                {syncStatus.isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Last sync: {formatLastSync(syncStatus.lastSync)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {syncStatus.queuedActions > 0 && (
            <Badge variant="outline" className="text-orange-600">
              {syncStatus.queuedActions} queued
            </Badge>
          )}
          {syncStatus.isOnline && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleManualSync}
              disabled={isManualSyncing || syncStatus.syncInProgress}
            >
              {isManualSyncing || syncStatus.syncInProgress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync
            </Button>
          )}
        </div>
      </div>

      {/* Detailed Status */}
      {showDetails && (
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Connection:</span>
            <span className={getStatusColor()}>{syncStatus.isOnline ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Queued actions:</span>
            <span>{syncStatus.queuedActions}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sync status:</span>
            <span>
              {syncStatus.syncInProgress ? 'In progress' : 'Idle'}
            </span>
          </div>
          {syncStatus.errors.length > 0 && (
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded border-l-4 border-red-500">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Sync Issues</span>
              </div>
              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                {syncStatus.errors.length} action(s) failed to sync
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// Hook for using network status in other components
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator?.onLine || false)
  const [queuedActions, setQueuedActions] = useState(0)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Update queued actions count
    const updateQueuedActions = async () => {
      try {
        const stats = await offlineDataManager.getOfflineStats()
        setQueuedActions(stats.queuedActions)
      } catch (error) {
        console.error('Failed to get queued actions:', error)
      }
    }

    updateQueuedActions()
    const interval = setInterval(updateQueuedActions, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  const sync = async () => {
    if (!isOnline) return false
    
    try {
      const result = await offlineDataManager.syncWithServer()
      return result.success
    } catch (error) {
      console.error('Manual sync failed:', error)
      return false
    }
  }

  return {
    isOnline,
    queuedActions,
    sync
  }
}