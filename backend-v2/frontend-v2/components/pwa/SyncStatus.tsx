'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  XCircle,
  ChevronDown,
  ChevronUp,
  Database,
  Zap
} from 'lucide-react'
import { offlineDataManager, type SyncResult, type OfflineAction } from '@/lib/offline-data-manager'
import { useToast } from '@/hooks/useToast'

interface SyncStatusProps {
  autoSync?: boolean;
  showDetails?: boolean;
  className?: string;
}

export function SyncStatus({ 
  autoSync = true, 
  showDetails = true,
  className = '' 
}: SyncStatusProps) {
  const [issyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)
  const [queuedActions, setQueuedActions] = useState<OfflineAction[]>([])
  const [showDetailsPanel, setShowDetailsPanel] = useState(false)
  const [stats, setStats] = useState({
    queuedActions: 0,
    offlineAppointments: 0,
    cacheSize: 0,
    lastSync: undefined as number | undefined
  })
  const { toast } = useToast()

  useEffect(() => {
    loadData()
    
    // Auto-sync when online if enabled
    if (autoSync) {
      const handleOnline = () => {
        setTimeout(() => performSync(), 1000) // Small delay to ensure connection is stable
      }
      
      window.addEventListener('online', handleOnline)
      return () => window.removeEventListener('online', handleOnline)
    }
  }, [autoSync])

  useEffect(() => {
    // Refresh data periodically
    const interval = setInterval(loadData, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [offlineStats, actions] = await Promise.all([
        offlineDataManager.getOfflineStats(),
        offlineDataManager.getQueuedActions()
      ])
      
      setStats(offlineStats)
      setQueuedActions(actions.filter(action => action.status !== 'completed'))
    } catch (error) {
      console.error('Failed to load sync data:', error)
    }
  }

  const performSync = async () => {
    if (issyncing || !navigator.onLine) return

    setIsSyncing(true)
    setSyncProgress(0)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const result = await offlineDataManager.syncWithServer()
      
      clearInterval(progressInterval)
      setSyncProgress(100)
      
      setLastSyncResult(result)
      await loadData()

      // Show result toast
      if (result.success) {
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${result.synced} items.`,
        })
      } else {
        const message = `${result.synced} synced, ${result.failed} failed`
        const conflictMessage = result.conflicts > 0 ? `, ${result.conflicts} conflicts` : ''
        
        toast({
          title: result.conflicts > 0 ? "Sync Conflicts" : "Sync Issues",
          description: message + conflictMessage,
          variant: result.conflicts > 0 ? "destructive" : "default",
        })
      }

    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Unable to sync with server. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
      setTimeout(() => setSyncProgress(0), 2000)
    }
  }

  const getSyncStatusIcon = () => {
    if (issyncing) return <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
    if (!navigator.onLine) return <XCircle className="h-4 w-4 text-red-600" />
    if (stats.queuedActions > 0 || stats.offlineAppointments > 0) {
      return <Clock className="h-4 w-4 text-yellow-600" />
    }
    return <CheckCircle className="h-4 w-4 text-green-600" />
  }

  const getSyncStatusText = () => {
    if (issyncing) return 'Syncing...'
    if (!navigator.onLine) return 'Offline'
    if (stats.queuedActions > 0 || stats.offlineAppointments > 0) return 'Pending Items'
    return 'Up to Date'
  }

  const getSyncStatusColor = () => {
    if (issyncing) return 'text-blue-600'
    if (!navigator.onLine) return 'text-red-600'
    if (stats.queuedActions > 0 || stats.offlineAppointments > 0) return 'text-yellow-600'
    return 'text-green-600'
  }

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'Never'
    return new Date(timestamp).toLocaleString()
  }

  const getActionTypeIcon = (type: string) => {
    switch (type) {
      case 'appointment': return '📅'
      case 'availability': return '⏰'
      case 'analytics': return '📊'
      default: return '⚡'
    }
  }

  const totalPendingItems = stats.queuedActions + stats.offlineAppointments

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sync Status
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {getSyncStatusIcon()}
            <span className={`text-sm font-medium ${getSyncStatusColor()}`}>
              {getSyncStatusText()}
            </span>
            
            {totalPendingItems > 0 && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                {totalPendingItems}
              </Badge>
            )}
          </div>
        </div>

        {issyncing && syncProgress > 0 && (
          <div className="space-y-2">
            <Progress value={syncProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Syncing data... {syncProgress}%
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-blue-600">
              {stats.queuedActions}
            </div>
            <div className="text-xs text-muted-foreground">
              Queued Actions
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-orange-600">
              {stats.offlineAppointments}
            </div>
            <div className="text-xs text-muted-foreground">
              Offline Bookings
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-600">
              {stats.cacheSize}
            </div>
            <div className="text-xs text-muted-foreground">
              Cached Items
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={performSync}
            disabled={issyncing || !navigator.onLine}
            className="flex-1"
            size="sm"
          >
            {issyncing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {issyncing ? 'Syncing...' : 'Sync Now'}
          </Button>

          {showDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetailsPanel(!showDetailsPanel)}
            >
              {showDetailsPanel ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Last Sync Info */}
        {stats.lastSync && (
          <div className="text-xs text-muted-foreground">
            Last sync: {formatTimestamp(stats.lastSync)}
          </div>
        )}

        {/* Offline Warning */}
        {!navigator.onLine && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You're currently offline. Changes will be synced when connection is restored.
            </AlertDescription>
          </Alert>
        )}

        {/* Last Sync Result */}
        {lastSyncResult && !issyncing && (
          <Alert className={
            lastSyncResult.success 
              ? "border-green-200 bg-green-50 dark:bg-green-900/20" 
              : "border-red-200 bg-red-50 dark:bg-red-900/20"
          }>
            {lastSyncResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription>
              {lastSyncResult.success ? (
                `Successfully synced ${lastSyncResult.synced} items.`
              ) : (
                `Sync completed with issues: ${lastSyncResult.synced} synced, ${lastSyncResult.failed} failed, ${lastSyncResult.conflicts} conflicts.`
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Details Panel */}
        {showDetailsPanel && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-sm">Pending Items Details</h4>
            
            {queuedActions.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {queuedActions.map((action, index) => (
                  <div 
                    key={action.id || index}
                    className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span>{getActionTypeIcon(action.type)}</span>
                      <span className="font-medium">{action.type}</span>
                      <span className="text-muted-foreground">
                        {action.method} {new URL(action.url).pathname}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={
                          action.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                          action.status === 'syncing' ? 'bg-blue-50 text-blue-700' :
                          action.status === 'failed' ? 'bg-red-50 text-red-700' :
                          'bg-gray-50 text-gray-700'
                        }
                      >
                        {action.status}
                      </Badge>
                      
                      {action.retryCount && action.retryCount > 0 && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700">
                          Retry {action.retryCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground text-sm py-4">
                No pending actions
              </div>
            )}

            {/* Sync Errors */}
            {lastSyncResult?.errors && lastSyncResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-red-600">Recent Sync Errors</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {lastSyncResult.errors.slice(0, 5).map((error, index) => (
                    <div key={index} className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      <div className="font-medium">{error.action.type}: {error.action.url}</div>
                      <div className="text-red-500">{error.error}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Compact version for mobile or sidebar
export function CompactSyncStatus() {
  const [stats, setStats] = useState({
    queuedActions: 0,
    offlineAppointments: 0,
    cacheSize: 0
  })
  const [issyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const offlineStats = await offlineDataManager.getOfflineStats()
        setStats(offlineStats)
      } catch (error) {
        console.error('Failed to load stats:', error)
      }
    }

    loadStats()
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const performQuickSync = async () => {
    if (issyncing || !navigator.onLine) return

    setIsSyncing(true)
    try {
      await offlineDataManager.syncWithServer()
    } catch (error) {
      console.error('Quick sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const totalPending = stats.queuedActions + stats.offlineAppointments

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={performQuickSync}
      disabled={issyncing || !navigator.onLine}
      className="flex items-center gap-2"
    >
      {issyncing ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : totalPending > 0 ? (
        <Clock className="h-4 w-4 text-yellow-600" />
      ) : (
        <CheckCircle className="h-4 w-4 text-green-600" />
      )}
      
      {totalPending > 0 && (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
          {totalPending}
        </Badge>
      )}
      
      <span className="hidden sm:inline">
        {issyncing ? 'Syncing...' : totalPending > 0 ? 'Sync' : 'Synced'}
      </span>
    </Button>
  )
}