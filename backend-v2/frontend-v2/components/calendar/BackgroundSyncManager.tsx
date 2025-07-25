'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { 
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  CogIcon,
  WifiIcon,
  SignalSlashIcon,
  BoltIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { useCalendar, CalendarAppointment } from '@/contexts/CalendarContext'
import { cn } from '@/lib/utils'

interface SyncJob {
  id: string
  type: 'appointment_sync' | 'data_refresh' | 'cache_update' | 'analytics_sync'
  priority: 'high' | 'normal' | 'low'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  data: any
  createdAt: Date
  lastAttempt?: Date
  nextRetry?: Date
  retryCount: number
  maxRetries: number
  error?: string
}

interface BackgroundSyncConfig {
  enableSync: boolean
  syncInterval: number // minutes
  batteryOptimization: boolean
  networkOptimization: boolean
  offlineQueueing: boolean
  maxRetries: number
  retryDelay: number // seconds
}

interface NetworkInfo {
  type: string
  effectiveType: string
  downlink: number
  rtt: number
  saveData: boolean
}

interface BatteryInfo {
  charging: boolean
  level: number
  dischargingTime: number
  chargingTime: number
}

interface BackgroundSyncManagerProps {
  className?: string
  enableServiceWorker?: boolean
  showSyncStatus?: boolean
  onSyncStart?: (job: SyncJob) => void
  onSyncComplete?: (job: SyncJob) => void
  onSyncError?: (job: SyncJob, error: Error) => void
}

export default function BackgroundSyncManager({
  className,
  enableServiceWorker = true,
  showSyncStatus = true,
  onSyncStart,
  onSyncComplete,
  onSyncError
}: BackgroundSyncManagerProps) {
  const { state, actions } = useCalendar()
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([])
  const [syncConfig, setSyncConfig] = useState<BackgroundSyncConfig>({
    enableSync: true,
    syncInterval: 5, // 5 minutes
    batteryOptimization: true,
    networkOptimization: true,
    offlineQueueing: true,
    maxRetries: 3,
    retryDelay: 30 // 30 seconds
  })
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null)
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const jobQueueRef = useRef<Map<string, SyncJob>>(new Map())

  // Service Worker registration
  useEffect(() => {
    if (!enableServiceWorker || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })
        
        console.log('Service Worker registered:', registration)
        setServiceWorkerRegistration(registration)
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
        
        // Register background sync
        if ('sync' in registration) {
          console.log('Background sync is supported')
        }
        
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }

    registerServiceWorker()

    return () => {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
      }
    }
  }, [enableServiceWorker])

  // Handle service worker messages
  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    const { type, data } = event.data
    
    switch (type) {
      case 'sync-complete':
        handleSyncComplete(data.jobId, data.result)
        break
      case 'sync-error':
        handleSyncError(data.jobId, data.error)
        break
      case 'sync-progress':
        updateJobProgress(data.jobId, data.progress)
        break
    }
  }, [])

  // Network information monitoring
  useEffect(() => {
    const updateNetworkInfo = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
      
      if (connection) {
        setNetworkInfo({
          type: connection.type || 'unknown',
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
          saveData: connection.saveData || false
        })
      }
    }

    updateNetworkInfo()
    
    const connection = (navigator as any).connection
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo)
      return () => connection.removeEventListener('change', updateNetworkInfo)
    }
  }, [])

  // Battery information monitoring
  useEffect(() => {
    const updateBatteryInfo = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery()
          
          const updateBattery = () => {
            setBatteryInfo({
              charging: battery.charging,
              level: battery.level,
              dischargingTime: battery.dischargingTime,
              chargingTime: battery.chargingTime
            })
          }
          
          updateBattery()
          
          battery.addEventListener('chargingchange', updateBattery)
          battery.addEventListener('levelchange', updateBattery)
          
          return () => {
            battery.removeEventListener('chargingchange', updateBattery)
            battery.removeEventListener('levelchange', updateBattery)
          }
        } catch (error) {
          console.warn('Battery API not available:', error)
        }
      }
    }

    updateBatteryInfo()
  }, [])

  // Job management
  const createJob = useCallback((
    type: SyncJob['type'],
    data: any,
    priority: SyncJob['priority'] = 'normal'
  ): SyncJob => {
    const job: SyncJob = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      priority,
      status: 'pending',
      progress: 0,
      data,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: syncConfig.maxRetries
    }
    
    return job
  }, [syncConfig.maxRetries])

  const queueJob = useCallback((job: SyncJob) => {
    setSyncJobs(prev => [...prev, job])
    jobQueueRef.current.set(job.id, job)
    
    // If service worker is available, delegate to it
    if (serviceWorkerRegistration && 'sync' in serviceWorkerRegistration) {
      serviceWorkerRegistration.sync.register(job.id)
    } else {
      // Fallback to immediate execution
      executeJob(job)
    }
  }, [serviceWorkerRegistration])

  const executeJob = useCallback(async (job: SyncJob) => {
    try {
      setIsSyncing(true)
      setSyncJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'running', lastAttempt: new Date() } : j))
      
      onSyncStart?.(job)
      
      let result: any
      
      switch (job.type) {
        case 'appointment_sync':
          result = await syncAppointments(job.data)
          break
        case 'data_refresh':
          result = await refreshData(job.data)
          break
        case 'cache_update':
          result = await updateCache(job.data)
          break
        case 'analytics_sync':
          result = await syncAnalytics(job.data)
          break
        default:
          throw new Error(`Unknown job type: ${job.type}`)
      }
      
      handleSyncComplete(job.id, result)
      
    } catch (error) {
      handleSyncError(job.id, error as Error)
    } finally {
      setIsSyncing(false)
    }
  }, [onSyncStart])

  const handleSyncComplete = useCallback((jobId: string, result: any) => {
    setSyncJobs(prev => prev.map(job => 
      job.id === jobId 
        ? { ...job, status: 'completed', progress: 100 }
        : job
    ))
    
    const job = jobQueueRef.current.get(jobId)
    if (job) {
      onSyncComplete?.(job)
      jobQueueRef.current.delete(jobId)
    }
    
    setLastSyncTime(new Date())
  }, [onSyncComplete])

  const handleSyncError = useCallback((jobId: string, error: Error) => {
    setSyncJobs(prev => prev.map(job => {
      if (job.id === jobId) {
        const newRetryCount = job.retryCount + 1
        const shouldRetry = newRetryCount < job.maxRetries
        
        return {
          ...job,
          status: shouldRetry ? 'pending' : 'failed',
          retryCount: newRetryCount,
          nextRetry: shouldRetry ? new Date(Date.now() + syncConfig.retryDelay * 1000) : undefined,
          error: error.message
        }
      }
      return job
    }))
    
    const job = jobQueueRef.current.get(jobId)
    if (job) {
      onSyncError?.(job, error)
      
      // Schedule retry if applicable
      if (job.retryCount < job.maxRetries) {
        setTimeout(() => {
          const updatedJob = jobQueueRef.current.get(jobId)
          if (updatedJob) {
            executeJob(updatedJob)
          }
        }, syncConfig.retryDelay * 1000)
      } else {
        jobQueueRef.current.delete(jobId)
      }
    }
  }, [syncConfig.retryDelay, onSyncError])

  const updateJobProgress = useCallback((jobId: string, progress: number) => {
    setSyncJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, progress } : job
    ))
  }, [])

  // Sync operations
  const syncAppointments = useCallback(async (data: any) => {
    const { appointments, operation } = data
    
    switch (operation) {
      case 'create':
        const response = await fetch('/api/v2/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appointments)
        })
        return await response.json()
        
      case 'update':
        const updatePromises = appointments.map((apt: CalendarAppointment) =>
          fetch(`/api/v2/appointments/${apt.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apt)
          })
        )
        const updateResponses = await Promise.all(updatePromises)
        return Promise.all(updateResponses.map(r => r.json()))
        
      case 'delete':
        const deletePromises = appointments.map((id: string) =>
          fetch(`/api/v2/appointments/${id}`, { method: 'DELETE' })
        )
        await Promise.all(deletePromises)
        return { deleted: appointments.length }
        
      default:
        throw new Error(`Unknown appointment operation: ${operation}`)
    }
  }, [])

  const refreshData = useCallback(async (data: any) => {
    const { types } = data
    const results: any = {}
    
    if (types.includes('appointments')) {
      const response = await fetch('/api/v2/appointments')
      results.appointments = await response.json()
      actions.setAppointments(results.appointments)
    }
    
    if (types.includes('barbers')) {
      const response = await fetch('/api/v2/barbers')
      results.barbers = await response.json()
      // Update barbers in context
    }
    
    return results
  }, [actions])

  const updateCache = useCallback(async (data: any) => {
    // Implement cache update logic
    return { cached: true }
  }, [])

  const syncAnalytics = useCallback(async (data: any) => {
    const response = await fetch('/api/v2/analytics/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return await response.json()
  }, [])

  // Should sync based on conditions
  const shouldSync = useCallback(() => {
    if (!syncConfig.enableSync) return false
    
    // Battery optimization
    if (syncConfig.batteryOptimization && batteryInfo) {
      if (!batteryInfo.charging && batteryInfo.level < 0.2) {
        return false // Don't sync on low battery
      }
    }
    
    // Network optimization
    if (syncConfig.networkOptimization && networkInfo) {
      if (networkInfo.saveData || networkInfo.effectiveType === '2g') {
        return false // Don't sync on limited networks
      }
    }
    
    return true
  }, [syncConfig, batteryInfo, networkInfo])

  // Periodic sync
  useEffect(() => {
    if (!syncConfig.enableSync) return

    const startPeriodicSync = () => {
      syncIntervalRef.current = setInterval(() => {
        if (shouldSync()) {
          const job = createJob('data_refresh', { types: ['appointments'] }, 'normal')
          queueJob(job)
        }
      }, syncConfig.syncInterval * 60 * 1000)
    }

    startPeriodicSync()

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [syncConfig.enableSync, syncConfig.syncInterval, shouldSync, createJob, queueJob])

  // Manual sync trigger
  const triggerSync = useCallback((type: SyncJob['type'] = 'data_refresh') => {
    const job = createJob(type, { types: ['appointments', 'barbers'] }, 'high')
    queueJob(job)
  }, [createJob, queueJob])

  // Get sync status
  const getSyncStatus = () => {
    const pendingJobs = syncJobs.filter(job => job.status === 'pending' || job.status === 'running')
    const failedJobs = syncJobs.filter(job => job.status === 'failed')
    
    if (pendingJobs.length > 0) return 'syncing'
    if (failedJobs.length > 0) return 'error'
    return 'idle'
  }

  const syncStatus = getSyncStatus()

  return (
    <div className={cn("space-y-4", className)}>
      {/* Sync Status */}
      {showSyncStatus && (
        <Card className={cn(
          "border-l-4",
          syncStatus === 'syncing' ? "border-l-blue-500" :
          syncStatus === 'error' ? "border-l-red-500" : "border-l-green-500"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {syncStatus === 'syncing' && <ArrowPathIcon className="h-4 w-4 animate-spin text-blue-600" />}
                {syncStatus === 'error' && <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />}
                {syncStatus === 'idle' && <CheckCircleIcon className="h-4 w-4 text-green-600" />}
                <span className="capitalize">{syncStatus}</span>
                
                {serviceWorkerRegistration && (
                  <Badge variant="secondary" className="text-xs">
                    Service Worker
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {lastSyncTime && (
                  <span className="text-xs text-gray-600">
                    Last: {format(lastSyncTime, 'h:mm a')}
                  </span>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => triggerSync()}
                  disabled={isSyncing}
                >
                  <CloudArrowDownIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pt-0">
            {/* Active Jobs */}
            {syncJobs.filter(job => job.status === 'running').length > 0 && (
              <div className="space-y-2">
                {syncJobs.filter(job => job.status === 'running').map(job => (
                  <div key={job.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">
                        {job.type.replace('_', ' ')}
                      </span>
                      <span className="text-gray-600">
                        {job.progress}%
                      </span>
                    </div>
                    <Progress value={job.progress} className="h-1" />
                  </div>
                ))}
              </div>
            )}
            
            {/* Job Queue Summary */}
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>
                {syncJobs.filter(job => job.status === 'pending').length} pending, 
                {syncJobs.filter(job => job.status === 'failed').length} failed
              </span>
              
              <div className="flex items-center space-x-2">
                {networkInfo && (
                  <Badge variant="outline" className="text-xs">
                    {networkInfo.effectiveType}
                  </Badge>
                )}
                
                {batteryInfo && (
                  <Badge variant="outline" className="text-xs">
                    {Math.round(batteryInfo.level * 100)}%
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center space-x-2">
            <CogIcon className="h-4 w-4" />
            <span>Background Sync Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Enable Background Sync</div>
                <div className="text-xs text-gray-600">Automatically sync data in the background</div>
              </div>
              <Switch
                checked={syncConfig.enableSync}
                onCheckedChange={(checked) => 
                  setSyncConfig(prev => ({ ...prev, enableSync: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Battery Optimization</div>
                <div className="text-xs text-gray-600">Reduce sync when battery is low</div>
              </div>
              <Switch
                checked={syncConfig.batteryOptimization}
                onCheckedChange={(checked) => 
                  setSyncConfig(prev => ({ ...prev, batteryOptimization: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Network Optimization</div>
                <div className="text-xs text-gray-600">Respect data saver and slow connections</div>
              </div>
              <Switch
                checked={syncConfig.networkOptimization}
                onCheckedChange={(checked) => 
                  setSyncConfig(prev => ({ ...prev, networkOptimization: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Offline Queueing</div>
                <div className="text-xs text-gray-600">Queue changes when offline</div>
              </div>
              <Switch
                checked={syncConfig.offlineQueueing}
                onCheckedChange={(checked) => 
                  setSyncConfig(prev => ({ ...prev, offlineQueueing: checked }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job History */}
      {syncJobs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <ClockIcon className="h-4 w-4" />
              <span>Sync History</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {syncJobs.slice(-10).reverse().map(job => (
                <div key={job.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    {job.status === 'completed' && <CheckCircleIcon className="h-3 w-3 text-green-600" />}
                    {job.status === 'failed' && <ExclamationTriangleIcon className="h-3 w-3 text-red-600" />}
                    {job.status === 'running' && <ArrowPathIcon className="h-3 w-3 animate-spin text-blue-600" />}
                    {job.status === 'pending' && <ClockIcon className="h-3 w-3 text-yellow-600" />}
                    
                    <span className="capitalize">
                      {job.type.replace('_', ' ')}
                    </span>
                    
                    <Badge variant="outline" className="text-xs">
                      {job.priority}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                    {job.retryCount > 0 && (
                      <span>Retry {job.retryCount}</span>
                    )}
                    <span>{format(job.createdAt, 'h:mm a')}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Hook for background sync integration
export function useBackgroundSync() {
  const [isSupported, setIsSupported] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype
      setIsSupported(supported)
    }

    checkSupport()
  }, [])

  const queueSync = useCallback((tag: string, data: any) => {
    if (registration && 'sync' in registration) {
      registration.sync.register(tag)
      // Store data for the sync event
      localStorage.setItem(`sync-${tag}`, JSON.stringify(data))
    }
  }, [registration])

  return {
    isSupported,
    queueSync,
    registration
  }
}