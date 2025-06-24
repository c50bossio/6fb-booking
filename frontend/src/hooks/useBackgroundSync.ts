/**
 * Background synchronization hook for offline-first data management
 * Handles automatic data sync, offline queue management, and conflict resolution
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { cacheManager } from '@/lib/cache/cacheManager'
import { apiClient } from '@/lib/api/client'
import { errorTracker } from '@/lib/monitoring/errorTracking'

interface SyncOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  endpoint: string
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: any
  metadata: {
    timestamp: number
    userId?: string
    clientId: string
    version?: number
    etag?: string
    retryCount: number
    priority: 'low' | 'medium' | 'high' | 'critical'
  }
  status: 'pending' | 'syncing' | 'success' | 'failed' | 'conflict'
  error?: string
  conflictData?: any
}

interface SyncConflict {
  operationId: string
  type: 'version_mismatch' | 'concurrent_edit' | 'data_integrity' | 'server_newer'
  localData: any
  serverData: any
  timestamp: number
  resolved: boolean
  resolution?: 'local' | 'server' | 'merge' | 'manual'
}

interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  pendingOperations: number
  failedOperations: number
  conflicts: number
  lastSyncTime: number | null
  syncProgress: number // 0-100
  estimatedSyncTime: number | null // milliseconds
}

interface SyncOptions {
  enableOfflineQueue?: boolean
  maxRetries?: number
  retryDelay?: number
  batchSize?: number
  syncInterval?: number
  conflictResolution?: 'auto' | 'manual'
  autoResolveStrategy?: 'local' | 'server' | 'newest'
  prioritizeOperations?: boolean
  enableConflictDetection?: boolean
  maxQueueSize?: number
}

const DEFAULT_OPTIONS: Required<SyncOptions> = {
  enableOfflineQueue: true,
  maxRetries: 3,
  retryDelay: 1000,
  batchSize: 5,
  syncInterval: 30000, // 30 seconds
  conflictResolution: 'manual',
  autoResolveStrategy: 'newest',
  prioritizeOperations: true,
  enableConflictDetection: true,
  maxQueueSize: 100
}

export function useBackgroundSync(options: SyncOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  
  // State management
  const [operations, setOperations] = useState<SyncOperation[]>([])
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingOperations: 0,
    failedOperations: 0,
    conflicts: 0,
    lastSyncTime: null,
    syncProgress: 0,
    estimatedSyncTime: null
  })

  // Refs for cleanup and state management
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)
  const clientId = useRef(`client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  const currentSyncRef = useRef<Promise<void> | null>(null)

  // Load operations from persistent storage on mount
  useEffect(() => {
    loadPersistedOperations()
  }, [])

  // Persist operations whenever they change
  useEffect(() => {
    persistOperations()
  }, [operations])

  // Update sync status when operations change
  useEffect(() => {
    updateSyncStatus()
  }, [operations, conflicts])

  // Network status monitoring
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }))
      // Trigger immediate sync when coming back online
      triggerSync()
    }

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-sync interval
  useEffect(() => {
    if (config.syncInterval > 0) {
      syncIntervalRef.current = setInterval(() => {
        if (syncStatus.isOnline && operations.length > 0) {
          triggerSync()
        }
      }, config.syncInterval)
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [config.syncInterval, syncStatus.isOnline, operations.length])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [])

  // Load operations from persistent storage
  const loadPersistedOperations = useCallback(() => {
    try {
      if (typeof window === 'undefined') return

      const stored = localStorage.getItem('sync_operations')
      if (stored) {
        const parsedOps = JSON.parse(stored) as SyncOperation[]
        setOperations(parsedOps.filter(op => op.status === 'pending' || op.status === 'failed'))
      }

      const storedConflicts = localStorage.getItem('sync_conflicts')
      if (storedConflicts) {
        const parsedConflicts = JSON.parse(storedConflicts) as SyncConflict[]
        setConflicts(parsedConflicts.filter(conflict => !conflict.resolved))
      }
    } catch (error) {
      console.warn('Failed to load persisted sync operations:', error)
    }
  }, [])

  // Persist operations to storage
  const persistOperations = useCallback(() => {
    try {
      if (typeof window === 'undefined') return

      localStorage.setItem('sync_operations', JSON.stringify(operations))
      localStorage.setItem('sync_conflicts', JSON.stringify(conflicts))
    } catch (error) {
      console.warn('Failed to persist sync operations:', error)
    }
  }, [operations, conflicts])

  // Update sync status based on current state
  const updateSyncStatus = useCallback(() => {
    const pending = operations.filter(op => op.status === 'pending').length
    const failed = operations.filter(op => op.status === 'failed').length
    const syncing = operations.filter(op => op.status === 'syncing').length
    const unresolvedConflicts = conflicts.filter(c => !c.resolved).length

    setSyncStatus(prev => ({
      ...prev,
      pendingOperations: pending,
      failedOperations: failed,
      conflicts: unresolvedConflicts,
      isSyncing: syncing > 0
    }))
  }, [operations, conflicts])

  // Add operation to sync queue
  const queueOperation = useCallback((
    type: SyncOperation['type'],
    endpoint: string,
    method: SyncOperation['method'],
    data?: any,
    priority: SyncOperation['metadata']['priority'] = 'medium'
  ): string => {
    if (!config.enableOfflineQueue) {
      throw new Error('Offline queue is disabled')
    }

    // Check queue size limit
    if (operations.length >= config.maxQueueSize) {
      errorTracker.captureError(new Error('Sync queue is full'), {
        category: 'business',
        severity: 'medium',
        context: { component: 'useBackgroundSync', action: 'queue_full' }
      })
      
      // Remove oldest non-critical operations
      setOperations(prev => {
        const sorted = [...prev].sort((a, b) => {
          if (a.metadata.priority === 'critical' && b.metadata.priority !== 'critical') return -1
          if (b.metadata.priority === 'critical' && a.metadata.priority !== 'critical') return 1
          return a.metadata.timestamp - b.metadata.timestamp
        })
        
        return sorted.slice(0, config.maxQueueSize - 1)
      })
    }

    const operationId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const operation: SyncOperation = {
      id: operationId,
      type,
      endpoint,
      method,
      data,
      metadata: {
        timestamp: Date.now(),
        clientId: clientId.current,
        retryCount: 0,
        priority
      },
      status: 'pending'
    }

    setOperations(prev => {
      if (config.prioritizeOperations) {
        // Insert based on priority
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        const insertIndex = prev.findIndex(op => 
          priorityOrder[op.metadata.priority] > priorityOrder[priority]
        )
        
        if (insertIndex === -1) {
          return [...prev, operation]
        } else {
          return [...prev.slice(0, insertIndex), operation, ...prev.slice(insertIndex)]
        }
      } else {
        return [...prev, operation]
      }
    })

    // Trigger immediate sync if online and critical priority
    if (syncStatus.isOnline && priority === 'critical') {
      setTimeout(triggerSync, 100)
    }

    return operationId
  }, [config, operations.length, syncStatus.isOnline])

  // Execute a single sync operation
  const executeSyncOperation = useCallback(async (operation: SyncOperation): Promise<boolean> => {
    try {
      // Update operation status to syncing
      setOperations(prev => 
        prev.map(op => op.id === operation.id ? { ...op, status: 'syncing' } : op)
      )

      // Prepare request
      const requestConfig = {
        method: operation.method,
        url: operation.endpoint,
        data: operation.data,
        headers: {
          'X-Client-ID': clientId.current,
          'X-Operation-ID': operation.id,
          ...(operation.metadata.etag && { 'If-Match': operation.metadata.etag })
        }
      }

      // Execute request
      const response = await apiClient(requestConfig)

      // Handle successful response
      setOperations(prev => 
        prev.map(op => 
          op.id === operation.id 
            ? { ...op, status: 'success' }
            : op
        )
      )

      // Update cache if this was a data modification
      if (['POST', 'PUT', 'PATCH'].includes(operation.method)) {
        await updateCacheAfterSync(operation, response.data)
      }

      return true

    } catch (error: any) {
      console.warn('Sync operation failed:', error)

      // Handle different types of errors
      if (error.response?.status === 409) {
        // Conflict detected
        await handleConflict(operation, error.response.data)
        return false
      }

      if (error.response?.status === 404 && operation.type === 'delete') {
        // Resource already deleted, mark as success
        setOperations(prev => 
          prev.map(op => 
            op.id === operation.id 
              ? { ...op, status: 'success' }
              : op
          )
        )
        return true
      }

      // Increment retry count
      const newRetryCount = operation.metadata.retryCount + 1
      
      if (newRetryCount >= config.maxRetries) {
        // Max retries reached, mark as failed
        setOperations(prev => 
          prev.map(op => 
            op.id === operation.id 
              ? { 
                  ...op, 
                  status: 'failed', 
                  error: error.message || 'Sync failed after max retries',
                  metadata: { ...op.metadata, retryCount: newRetryCount }
                }
              : op
          )
        )
        
        errorTracker.captureError(error, {
          category: 'network',
          severity: 'medium',
          context: {
            component: 'useBackgroundSync',
            action: 'sync_failed',
            metadata: { operationId: operation.id, retryCount: newRetryCount }
          }
        })
      } else {
        // Schedule retry
        setOperations(prev => 
          prev.map(op => 
            op.id === operation.id 
              ? { 
                  ...op, 
                  status: 'pending',
                  metadata: { ...op.metadata, retryCount: newRetryCount }
                }
              : op
          )
        )
        
        // Retry with exponential backoff
        const delay = config.retryDelay * Math.pow(2, newRetryCount - 1)
        setTimeout(() => {
          if (mountedRef.current && syncStatus.isOnline) {
            triggerSync()
          }
        }, delay)
      }

      return false
    }
  }, [config, syncStatus.isOnline])

  // Handle sync conflicts
  const handleConflict = useCallback(async (
    operation: SyncOperation, 
    serverData: any
  ) => {
    if (!config.enableConflictDetection) return

    const conflict: SyncConflict = {
      operationId: operation.id,
      type: 'concurrent_edit',
      localData: operation.data,
      serverData,
      timestamp: Date.now(),
      resolved: false
    }

    // Detect conflict type
    if (serverData.version && operation.metadata.version) {
      if (serverData.version > operation.metadata.version) {
        conflict.type = 'server_newer'
      } else {
        conflict.type = 'version_mismatch'
      }
    }

    setConflicts(prev => [...prev, conflict])

    // Mark operation as conflict
    setOperations(prev => 
      prev.map(op => 
        op.id === operation.id 
          ? { ...op, status: 'conflict', conflictData: serverData }
          : op
      )
    )

    // Auto-resolve if enabled
    if (config.conflictResolution === 'auto') {
      await resolveConflict(operation.id, config.autoResolveStrategy)
    }
  }, [config])

  // Resolve a conflict
  const resolveConflict = useCallback(async (
    operationId: string, 
    resolution: 'local' | 'server' | 'merge' | 'manual',
    customData?: any
  ) => {
    const operation = operations.find(op => op.id === operationId)
    const conflict = conflicts.find(c => c.operationId === operationId)
    
    if (!operation || !conflict) return

    try {
      let resolvedData = customData

      if (!resolvedData) {
        switch (resolution) {
          case 'local':
            resolvedData = operation.data
            break
          case 'server':
            resolvedData = conflict.serverData
            break
          case 'merge':
            resolvedData = mergeConflictData(operation.data, conflict.serverData)
            break
          default:
            return // Manual resolution required
        }
      }

      // Create new operation with resolved data
      const resolvedOperation: SyncOperation = {
        ...operation,
        data: resolvedData,
        metadata: {
          ...operation.metadata,
          retryCount: 0,
          version: conflict.serverData.version || operation.metadata.version
        },
        status: 'pending'
      }

      // Update operations and conflicts
      setOperations(prev => 
        prev.map(op => op.id === operationId ? resolvedOperation : op)
      )

      setConflicts(prev => 
        prev.map(c => 
          c.operationId === operationId 
            ? { ...c, resolved: true, resolution }
            : c
        )
      )

      // Retry the operation
      await executeSyncOperation(resolvedOperation)

    } catch (error) {
      console.error('Failed to resolve conflict:', error)
      errorTracker.captureError(error as Error, {
        category: 'business',
        severity: 'high',
        context: {
          component: 'useBackgroundSync',
          action: 'conflict_resolution_failed'
        }
      })
    }
  }, [operations, conflicts, executeSyncOperation])

  // Simple conflict data merging strategy
  const mergeConflictData = useCallback((localData: any, serverData: any): any => {
    // Simple merge strategy - prefer newer timestamp fields
    const merged = { ...serverData, ...localData }
    
    // Prefer server data for system fields
    const systemFields = ['id', 'created_at', 'version', 'etag']
    systemFields.forEach(field => {
      if (serverData[field] !== undefined) {
        merged[field] = serverData[field]
      }
    })

    // Prefer newer timestamps
    if (localData.updated_at && serverData.updated_at) {
      merged.updated_at = new Date(localData.updated_at) > new Date(serverData.updated_at) 
        ? localData.updated_at 
        : serverData.updated_at
    }

    return merged
  }, [])

  // Update cache after successful sync
  const updateCacheAfterSync = useCallback(async (
    operation: SyncOperation,
    responseData: any
  ) => {
    try {
      // Determine cache keys to invalidate
      const tags = extractCacheTagsFromEndpoint(operation.endpoint)
      
      // Invalidate related cache entries
      tags.forEach(tag => {
        cacheManager.invalidateByTag(tag)
      })

      // For successful creates/updates, cache the new data
      if (['POST', 'PUT', 'PATCH'].includes(operation.method) && responseData) {
        const cacheKey = `api:GET:${operation.endpoint}`
        await cacheManager.set(cacheKey, responseData, {
          ttl: 300000, // 5 minutes
          strategy: 'api',
          tags,
          priority: 'medium'
        })
      }

    } catch (error) {
      console.warn('Failed to update cache after sync:', error)
    }
  }, [])

  // Extract cache tags from API endpoint
  const extractCacheTagsFromEndpoint = useCallback((endpoint: string): string[] => {
    const tags = ['api']
    
    if (endpoint.includes('/users')) tags.push('users')
    if (endpoint.includes('/appointments')) tags.push('appointments')
    if (endpoint.includes('/clients')) tags.push('clients')
    if (endpoint.includes('/barbers')) tags.push('barbers')
    if (endpoint.includes('/analytics')) tags.push('analytics')
    if (endpoint.includes('/financial')) tags.push('financial')
    
    return tags
  }, [])

  // Main sync trigger
  const triggerSync = useCallback(async (): Promise<void> => {
    if (currentSyncRef.current) {
      // Sync already in progress
      return currentSyncRef.current
    }

    if (!syncStatus.isOnline) {
      return
    }

    const pendingOps = operations.filter(op => op.status === 'pending')
    if (pendingOps.length === 0) {
      return
    }

    const syncPromise = (async () => {
      try {
        setSyncStatus(prev => ({ 
          ...prev, 
          isSyncing: true,
          syncProgress: 0,
          estimatedSyncTime: pendingOps.length * 500 // Rough estimate
        }))

        // Process operations in batches
        const batches = []
        for (let i = 0; i < pendingOps.length; i += config.batchSize) {
          batches.push(pendingOps.slice(i, i + config.batchSize))
        }

        let completed = 0
        const total = pendingOps.length

        for (const batch of batches) {
          // Process batch concurrently
          const batchPromises = batch.map(op => executeSyncOperation(op))
          await Promise.allSettled(batchPromises)
          
          completed += batch.length
          
          setSyncStatus(prev => ({
            ...prev,
            syncProgress: Math.round((completed / total) * 100)
          }))
        }

        setSyncStatus(prev => ({
          ...prev,
          lastSyncTime: Date.now(),
          syncProgress: 100
        }))

      } catch (error) {
        console.error('Sync process failed:', error)
        errorTracker.captureError(error as Error, {
          category: 'network',
          severity: 'high',
          context: {
            component: 'useBackgroundSync',
            action: 'sync_process_failed'
          }
        })
      } finally {
        setSyncStatus(prev => ({
          ...prev,
          isSyncing: false,
          syncProgress: 0,
          estimatedSyncTime: null
        }))
        currentSyncRef.current = null
      }
    })()

    currentSyncRef.current = syncPromise
    return syncPromise
  }, [syncStatus.isOnline, operations, config.batchSize, executeSyncOperation])

  // Manual operations management
  const retryOperation = useCallback(async (operationId: string) => {
    setOperations(prev => 
      prev.map(op => 
        op.id === operationId 
          ? { ...op, status: 'pending', metadata: { ...op.metadata, retryCount: 0 } }
          : op
      )
    )
    
    if (syncStatus.isOnline) {
      await triggerSync()
    }
  }, [syncStatus.isOnline, triggerSync])

  const removeOperation = useCallback((operationId: string) => {
    setOperations(prev => prev.filter(op => op.id !== operationId))
  }, [])

  const clearFailedOperations = useCallback(() => {
    setOperations(prev => prev.filter(op => op.status !== 'failed'))
  }, [])

  const clearAllOperations = useCallback(() => {
    setOperations([])
    setConflicts([])
  }, [])

  // Computed values
  const hasUnresolvedConflicts = useMemo(() => 
    conflicts.some(c => !c.resolved), 
    [conflicts]
  )

  const criticalOperationsPending = useMemo(() => 
    operations.filter(op => op.metadata.priority === 'critical' && op.status === 'pending').length,
    [operations]
  )

  return {
    // Status
    syncStatus,
    hasUnresolvedConflicts,
    criticalOperationsPending,

    // Operations
    operations,
    conflicts,

    // Queue management
    queueOperation,
    retryOperation,
    removeOperation,
    clearFailedOperations,
    clearAllOperations,

    // Sync control
    triggerSync,
    
    // Conflict resolution
    resolveConflict,

    // Utilities
    isOnline: syncStatus.isOnline,
    canSync: syncStatus.isOnline && !syncStatus.isSyncing,
    
    // Helper functions for common operations
    queueCreate: (endpoint: string, data: any, priority?: SyncOperation['metadata']['priority']) =>
      queueOperation('create', endpoint, 'POST', data, priority),
    
    queueUpdate: (endpoint: string, data: any, priority?: SyncOperation['metadata']['priority']) =>
      queueOperation('update', endpoint, 'PUT', data, priority),
    
    queueDelete: (endpoint: string, priority?: SyncOperation['metadata']['priority']) =>
      queueOperation('delete', endpoint, 'DELETE', undefined, priority)
  }
}