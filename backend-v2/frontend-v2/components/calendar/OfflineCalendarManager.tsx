'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { format, parseISO, isAfter, isBefore } from 'date-fns'
import { 
  WifiIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  SignalSlashIcon,
  ArrowPathIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useCalendar, CalendarAppointment } from '@/contexts/CalendarContext'
import { cn } from '@/lib/utils'

interface OfflineAction {
  id: string
  type: 'create' | 'update' | 'delete'
  entityType: 'appointment' | 'barber' | 'client'
  entityId?: string | number
  data: any
  timestamp: number
  retryCount: number
  maxRetries: number
  status: 'pending' | 'syncing' | 'success' | 'failed'
  error?: string
}

interface OfflineStorage {
  appointments: CalendarAppointment[]
  actions: OfflineAction[]
  lastSync: number
  version: number
}

interface NetworkStatus {
  isOnline: boolean
  connectionType: string
  effectiveType: string
  downlink: number
  rtt: number
}

interface OfflineCalendarManagerProps {
  className?: string
  enableAutoSync?: boolean
  syncInterval?: number
  maxRetries?: number
  showNetworkStatus?: boolean
  onSyncStart?: () => void
  onSyncComplete?: (successful: number, failed: number) => void
  onConflictResolution?: (conflict: any) => void
}

export default function OfflineCalendarManager({
  className,
  enableAutoSync = true,
  syncInterval = 30000, // 30 seconds
  maxRetries = 3,
  showNetworkStatus = true,
  onSyncStart,
  onSyncComplete,
  onConflictResolution
}: OfflineCalendarManagerProps) {
  const { state, actions } = useCalendar()
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    connectionType: 'unknown',
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0
  })
  const [offlineActions, setOfflineActions] = useState<OfflineAction[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [conflicts, setConflicts] = useState<any[]>([])
  
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isInitializedRef = useRef(false)

  // Initialize offline storage
  useEffect(() => {
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    const initializeOfflineStorage = () => {
      try {
        // Load cached data
        const cachedData = localStorage.getItem('calendar-offline-data')
        if (cachedData) {
          const parsed: OfflineStorage = JSON.parse(cachedData)
          
          // Load offline actions
          setOfflineActions(parsed.actions || [])
          setLastSyncTime(parsed.lastSync ? new Date(parsed.lastSync) : null)
          
          // If offline, load cached appointments
          if (!networkStatus.isOnline && parsed.appointments) {
            actions.setAppointments(parsed.appointments)
          }
        }
      } catch (error) {
        console.error('Failed to initialize offline storage:', error)
      }
    }

    initializeOfflineStorage()
  }, [networkStatus.isOnline, actions])

  // Network status monitoring
  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
      
      setNetworkStatus({
        isOnline: navigator.onLine,
        connectionType: connection?.type || 'unknown',
        effectiveType: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink || 0,
        rtt: connection?.rtt || 0
      })
    }

    const handleOnline = () => {
      updateNetworkStatus()
      if (enableAutoSync) {
        setTimeout(() => syncOfflineActions(), 1000) // Delay to ensure stable connection
      }
    }

    const handleOffline = () => {
      updateNetworkStatus()
      saveDataToLocalStorage()
    }

    // Initial update
    updateNetworkStatus()

    // Event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateNetworkStatus)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', updateNetworkStatus)
      }
    }
  }, [enableAutoSync])

  // Auto-sync timer
  useEffect(() => {
    if (!enableAutoSync || !networkStatus.isOnline) return

    const startSyncTimer = () => {
      syncTimerRef.current = setInterval(() => {
        if (offlineActions.length > 0) {
          syncOfflineActions()
        }
      }, syncInterval)
    }

    startSyncTimer()

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current)
      }
    }
  }, [enableAutoSync, networkStatus.isOnline, offlineActions.length, syncInterval])

  // Save data to localStorage
  const saveDataToLocalStorage = useCallback(() => {
    try {
      const offlineData: OfflineStorage = {
        appointments: state.appointments,
        actions: offlineActions,
        lastSync: lastSyncTime?.getTime() || 0,
        version: 1
      }
      
      localStorage.setItem('calendar-offline-data', JSON.stringify(offlineData))
    } catch (error) {
      console.error('Failed to save offline data:', error)
    }
  }, [state.appointments, offlineActions, lastSyncTime])

  // Add offline action
  const addOfflineAction = useCallback((
    type: OfflineAction['type'],
    entityType: OfflineAction['entityType'],
    data: any,
    entityId?: string | number
  ) => {
    const action: OfflineAction = {
      id: `${type}-${entityType}-${Date.now()}-${Math.random()}`,
      type,
      entityType,
      entityId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
      status: 'pending'
    }

    setOfflineActions(prev => [...prev, action])
    
    // If online, try to sync immediately
    if (networkStatus.isOnline) {
      setTimeout(() => syncSingleAction(action), 100)
    }
  }, [networkStatus.isOnline, maxRetries])

  // Sync single action
  const syncSingleAction = useCallback(async (action: OfflineAction) => {
    try {
      setOfflineActions(prev => 
        prev.map(a => a.id === action.id ? { ...a, status: 'syncing' } : a)
      )

      let response: any
      
      switch (action.type) {
        case 'create':
          if (action.entityType === 'appointment') {
            response = await fetch('/api/v2/appointments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.data)
            })
          }
          break
          
        case 'update':
          if (action.entityType === 'appointment' && action.entityId) {
            response = await fetch(`/api/v2/appointments/${action.entityId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.data)
            })
          }
          break
          
        case 'delete':
          if (action.entityType === 'appointment' && action.entityId) {
            response = await fetch(`/api/v2/appointments/${action.entityId}`, {
              method: 'DELETE'
            })
          }
          break
      }

      if (response?.ok) {
        // Success - remove action from queue
        setOfflineActions(prev => prev.filter(a => a.id !== action.id))
        return true
      } else {
        // Handle conflicts
        if (response?.status === 409) {
          const conflict = await response.json()
          setConflicts(prev => [...prev, { action, conflict }])
          onConflictResolution?.({ action, conflict })
        }
        
        throw new Error(`HTTP ${response?.status}: ${response?.statusText}`)
      }
    } catch (error) {
      console.error('Sync action failed:', error)
      
      // Update retry count
      setOfflineActions(prev => 
        prev.map(a => {
          if (a.id === action.id) {
            const newRetryCount = a.retryCount + 1
            return {
              ...a,
              retryCount: newRetryCount,
              status: newRetryCount >= a.maxRetries ? 'failed' : 'pending',
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
          return a
        })
      )
      
      return false
    }
  }, [onConflictResolution])

  // Sync all offline actions
  const syncOfflineActions = useCallback(async () => {
    if (isSyncing || !networkStatus.isOnline) return
    
    const pendingActions = offlineActions.filter(
      action => action.status === 'pending' && action.retryCount < action.maxRetries
    )
    
    if (pendingActions.length === 0) return

    setIsSyncing(true)
    setSyncProgress(0)
    onSyncStart?.()

    let successful = 0
    let failed = 0

    for (let i = 0; i < pendingActions.length; i++) {
      const action = pendingActions[i]
      const success = await syncSingleAction(action)
      
      if (success) {
        successful++
      } else {
        failed++
      }
      
      setSyncProgress(((i + 1) / pendingActions.length) * 100)
    }

    setIsSyncing(false)
    setSyncProgress(0)
    setLastSyncTime(new Date())
    
    // Save updated state
    saveDataToLocalStorage()
    
    onSyncComplete?.(successful, failed)
  }, [isSyncing, networkStatus.isOnline, offlineActions, syncSingleAction, onSyncStart, onSyncComplete, saveDataToLocalStorage])

  // Manual sync trigger
  const handleManualSync = useCallback(() => {
    if (networkStatus.isOnline) {
      syncOfflineActions()
    }
  }, [networkStatus.isOnline, syncOfflineActions])

  // Resolve conflict
  const resolveConflict = useCallback((conflictIndex: number, resolution: 'local' | 'remote' | 'merge') => {
    const conflict = conflicts[conflictIndex]
    if (!conflict) return

    // Implementation would depend on specific conflict resolution strategy
    // For now, just remove from conflicts list
    setConflicts(prev => prev.filter((_, index) => index !== conflictIndex))
    
    // Remove the failed action
    setOfflineActions(prev => prev.filter(a => a.id !== conflict.action.id))
  }, [conflicts])

  // Enhanced offline appointment actions
  const offlineAppointmentActions = useMemo(() => ({
    createAppointment: (appointment: Partial<CalendarAppointment>) => {
      // Optimistically add to local state
      const tempId = `temp-${Date.now()}`
      const newAppointment = {
        ...appointment,
        id: tempId,
        status: 'confirmed'
      } as CalendarAppointment

      actions.addAppointment(newAppointment)
      addOfflineAction('create', 'appointment', appointment)
      
      return tempId
    },

    updateAppointment: (id: number | string, updates: Partial<CalendarAppointment>) => {
      // Optimistically update local state
      actions.updateAppointment(id, updates)
      addOfflineAction('update', 'appointment', updates, id)
    },

    deleteAppointment: (id: number | string) => {
      // Optimistically remove from local state
      actions.deleteAppointment(id)
      addOfflineAction('delete', 'appointment', null, id)
    }
  }), [actions, addOfflineAction])

  // Network quality indicator
  const getNetworkQuality = useCallback(() => {
    if (!networkStatus.isOnline) return 'offline'
    
    const { effectiveType, downlink, rtt } = networkStatus
    
    if (effectiveType === '4g' && downlink > 1.5 && rtt < 100) return 'excellent'
    if (effectiveType === '4g' || (downlink > 1 && rtt < 200)) return 'good'
    if (effectiveType === '3g' || (downlink > 0.5 && rtt < 400)) return 'fair'
    return 'poor'
  }, [networkStatus])

  const networkQuality = getNetworkQuality()

  const getNetworkIcon = () => {
    if (!networkStatus.isOnline) return SignalSlashIcon
    
    switch (networkQuality) {
      case 'excellent':
      case 'good':
        return WifiIcon
      case 'fair':
        return ExclamationTriangleIcon
      case 'poor':
        return SignalSlashIcon
      default:
        return WifiIcon
    }
  }

  const getNetworkColor = () => {
    if (!networkStatus.isOnline) return 'text-red-600'
    
    switch (networkQuality) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'fair': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const NetworkIcon = getNetworkIcon()

  return (
    <div className={cn("space-y-4", className)}>
      {/* Network Status Display */}
      {showNetworkStatus && (
        <Card className={cn(
          "border-l-4",
          networkStatus.isOnline ? "border-l-green-500" : "border-l-red-500"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <NetworkIcon className={cn("h-4 w-4", getNetworkColor())} />
              <span>
                {networkStatus.isOnline ? 'Online' : 'Offline'} 
                {networkStatus.isOnline && ` - ${networkQuality}`}
              </span>
              {isSyncing && (
                <ArrowPathIcon className="h-4 w-4 animate-spin text-blue-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-xs text-gray-600">
                {networkStatus.isOnline && (
                  <>
                    <span>Type: {networkStatus.effectiveType}</span>
                    {networkStatus.downlink > 0 && (
                      <span>Speed: {networkStatus.downlink}Mbps</span>
                    )}
                  </>
                )}
                {lastSyncTime && (
                  <span>Last sync: {format(lastSyncTime, 'h:mm a')}</span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {offlineActions.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {offlineActions.filter(a => a.status === 'pending').length} pending
                  </Badge>
                )}
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleManualSync}
                        disabled={!networkStatus.isOnline || isSyncing}
                      >
                        <CloudArrowUpIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sync offline changes</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            {isSyncing && (
              <div className="mt-2">
                <Progress value={syncProgress} className="h-1" />
                <div className="text-xs text-gray-600 mt-1">
                  Syncing changes... {Math.round(syncProgress)}%
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Offline Actions Queue */}
      {offlineActions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <ClockIcon className="h-4 w-4 text-orange-600" />
              <span>Pending Changes ({offlineActions.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {offlineActions.map((action) => (
                <div key={action.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    {action.status === 'pending' && (
                      <ClockIcon className="h-3 w-3 text-orange-600" />
                    )}
                    {action.status === 'syncing' && (
                      <ArrowPathIcon className="h-3 w-3 animate-spin text-blue-600" />
                    )}
                    {action.status === 'success' && (
                      <CheckCircleIcon className="h-3 w-3 text-green-600" />
                    )}
                    {action.status === 'failed' && (
                      <XCircleIcon className="h-3 w-3 text-red-600" />
                    )}
                    
                    <span className="text-xs font-medium capitalize">
                      {action.type} {action.entityType}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {action.retryCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        Retry {action.retryCount}/{action.maxRetries}
                      </Badge>
                    )}
                    
                    <span className="text-xs text-gray-600">
                      {format(new Date(action.timestamp), 'h:mm a')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-4 w-4 text-orange-600" />
              <span>Sync Conflicts ({conflicts.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {conflicts.map((conflict, index) => (
                <Alert key={index}>
                  <InformationCircleIcon className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        Conflict in {conflict.action.entityType} {conflict.action.type}
                      </span>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveConflict(index, 'local')}
                        >
                          Keep Local
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveConflict(index, 'remote')}
                        >
                          Keep Remote
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offline Mode Warning */}
      {!networkStatus.isOnline && (
        <Alert>
          <SignalSlashIcon className="h-4 w-4" />
          <AlertDescription>
            You're currently offline. Changes will be saved locally and synced when connection is restored.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Hook for offline-aware calendar actions
export function useOfflineCalendar() {
  const { state, actions } = useCalendar()
  const [isOnline, setIsOnline] = useState(navigator.onLine)

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

  return {
    ...actions,
    isOnline,
    isOfflineMode: !isOnline
  }
}