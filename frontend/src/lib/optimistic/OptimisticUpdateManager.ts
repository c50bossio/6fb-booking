/**
 * Optimistic Update Manager
 * Provides immediate UI updates for mutations with automatic rollback on failure
 */

import { cacheManager } from '../cache/CacheManager'

export interface OptimisticUpdate<T = any> {
  id: string
  type: 'create' | 'update' | 'delete'
  resource: string
  resourceId?: string | number
  previousData?: T
  optimisticData: T
  timestamp: number
  status: 'pending' | 'committed' | 'rolled_back'
  retryCount: number
  maxRetries: number
  onRollback?: (error: Error) => void
  onCommit?: (data: T) => void
}

export interface OptimisticMutation<TInput = any, TResult = any> {
  mutationFn: (input: TInput) => Promise<TResult>
  optimisticFn: (input: TInput, currentData?: any) => any
  rollbackFn?: (input: TInput, previousData: any, error: Error) => any
  getCacheKey: (input: TInput) => string
  invalidateKeys?: (input: TInput) => string[]
  conflictResolver?: (optimistic: any, server: any) => any
  retryStrategy?: {
    maxRetries?: number
    retryDelay?: (attempt: number) => number
    shouldRetry?: (error: Error, attempt: number) => boolean
  }
}

export interface ConflictResolution {
  strategy: 'client_wins' | 'server_wins' | 'merge' | 'manual'
  resolver?: (client: any, server: any) => any
  notifyUser?: boolean
}

export class OptimisticUpdateManager {
  private pendingUpdates = new Map<string, OptimisticUpdate>()
  private updateHistory: OptimisticUpdate[] = []
  private maxHistorySize = 100
  private conflictHandlers = new Map<string, ConflictResolution>()
  private syncQueue: Array<() => Promise<void>> = []
  private syncInProgress = false
  private offlineQueue: OptimisticUpdate[] = []

  constructor() {
    this.setupEventListeners()
    this.loadOfflineQueue()
  }

  /**
   * Register a conflict resolution strategy for a resource type
   */
  registerConflictHandler(resource: string, resolution: ConflictResolution): void {
    this.conflictHandlers.set(resource, resolution)
  }

  /**
   * Perform an optimistic mutation
   */
  async mutate<TInput, TResult>(
    mutation: OptimisticMutation<TInput, TResult>,
    input: TInput
  ): Promise<TResult> {
    const updateId = this.generateUpdateId()
    const cacheKey = mutation.getCacheKey(input)
    
    // Get current data from cache
    const currentData = await cacheManager.get(cacheKey)
    
    // Apply optimistic update
    const optimisticData = mutation.optimisticFn(input, currentData)
    
    // Create update record
    const update: OptimisticUpdate = {
      id: updateId,
      type: this.getUpdateType(currentData, optimisticData),
      resource: this.extractResource(cacheKey),
      resourceId: this.extractResourceId(cacheKey),
      previousData: currentData,
      optimisticData,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      maxRetries: mutation.retryStrategy?.maxRetries || 3
    }
    
    // Store update record
    this.pendingUpdates.set(updateId, update)
    
    // Update cache optimistically
    await this.applyOptimisticUpdate(cacheKey, optimisticData, mutation.invalidateKeys?.(input))
    
    // Check if we're offline
    if (!navigator.onLine) {
      this.queueOfflineUpdate(update, mutation, input)
      return optimisticData as TResult
    }
    
    try {
      // Perform actual mutation
      const result = await this.executeMutation(mutation, input, update)
      
      // Commit the update
      await this.commitUpdate(updateId, result, cacheKey, mutation.invalidateKeys?.(input))
      
      return result
    } catch (error) {
      // Rollback on failure
      await this.rollbackUpdate(updateId, mutation, input, error as Error)
      throw error
    }
  }

  /**
   * Execute mutation with retry logic
   */
  private async executeMutation<TInput, TResult>(
    mutation: OptimisticMutation<TInput, TResult>,
    input: TInput,
    update: OptimisticUpdate
  ): Promise<TResult> {
    const { retryStrategy } = mutation
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= update.maxRetries; attempt++) {
      try {
        const result = await mutation.mutationFn(input)
        return result
      } catch (error) {
        lastError = error as Error
        update.retryCount = attempt + 1
        
        // Check if we should retry
        const shouldRetry = retryStrategy?.shouldRetry?.(lastError, attempt) ?? true
        if (!shouldRetry || attempt === update.maxRetries) {
          throw lastError
        }
        
        // Calculate retry delay
        const delay = retryStrategy?.retryDelay?.(attempt) ?? Math.min(1000 * Math.pow(2, attempt), 10000)
        await this.delay(delay)
      }
    }
    
    throw lastError!
  }

  /**
   * Apply optimistic update to cache
   */
  private async applyOptimisticUpdate(
    cacheKey: string,
    optimisticData: any,
    invalidateKeys?: string[]
  ): Promise<void> {
    // Update main cache entry
    await cacheManager.set(cacheKey, optimisticData, {
      ttl: 300000, // 5 minutes
      tags: ['optimistic'],
      strategy: 'api'
    })
    
    // Invalidate related keys if specified
    if (invalidateKeys) {
      for (const key of invalidateKeys) {
        cacheManager.invalidateByTag(key)
      }
    }
    
    // Notify service worker
    this.notifyServiceWorker('OPTIMISTIC_UPDATE', {
      cacheKey,
      data: optimisticData,
      timestamp: Date.now()
    })
  }

  /**
   * Commit successful update
   */
  private async commitUpdate(
    updateId: string,
    serverData: any,
    cacheKey: string,
    invalidateKeys?: string[]
  ): Promise<void> {
    const update = this.pendingUpdates.get(updateId)
    if (!update) return
    
    update.status = 'committed'
    
    // Check for conflicts
    const resource = update.resource
    const conflictResolution = this.conflictHandlers.get(resource)
    
    if (conflictResolution && !this.isDataEqual(update.optimisticData, serverData)) {
      const resolvedData = await this.resolveConflict(
        update.optimisticData,
        serverData,
        conflictResolution
      )
      
      // Update cache with resolved data
      await cacheManager.set(cacheKey, resolvedData, {
        ttl: 300000,
        tags: ['committed'],
        strategy: 'api'
      })
    } else {
      // Update cache with server data
      await cacheManager.set(cacheKey, serverData, {
        ttl: 300000,
        tags: ['committed'],
        strategy: 'api'
      })
    }
    
    // Invalidate related caches
    if (invalidateKeys) {
      for (const key of invalidateKeys) {
        cacheManager.invalidateByTag(key)
      }
    }
    
    // Execute commit callback
    update.onCommit?.(serverData)
    
    // Move to history
    this.moveToHistory(update)
    this.pendingUpdates.delete(updateId)
    
    // Process sync queue
    await this.processSyncQueue()
  }

  /**
   * Rollback failed update
   */
  private async rollbackUpdate<TInput>(
    updateId: string,
    mutation: OptimisticMutation<TInput, any>,
    input: TInput,
    error: Error
  ): Promise<void> {
    const update = this.pendingUpdates.get(updateId)
    if (!update) return
    
    update.status = 'rolled_back'
    const cacheKey = mutation.getCacheKey(input)
    
    // Apply rollback function if provided
    const rollbackData = mutation.rollbackFn
      ? mutation.rollbackFn(input, update.previousData, error)
      : update.previousData
    
    // Restore previous data in cache
    if (rollbackData !== undefined) {
      await cacheManager.set(cacheKey, rollbackData, {
        ttl: 300000,
        tags: ['rolled_back'],
        strategy: 'api'
      })
    } else {
      // Remove from cache if no previous data
      cacheManager.delete(cacheKey)
    }
    
    // Invalidate related caches
    const invalidateKeys = mutation.invalidateKeys?.(input)
    if (invalidateKeys) {
      for (const key of invalidateKeys) {
        cacheManager.invalidateByTag(key)
      }
    }
    
    // Execute rollback callback
    update.onRollback?.(error)
    
    // Move to history
    this.moveToHistory(update)
    this.pendingUpdates.delete(updateId)
    
    // Notify service worker
    this.notifyServiceWorker('ROLLBACK_UPDATE', {
      cacheKey,
      data: rollbackData,
      error: error.message
    })
  }

  /**
   * Resolve conflicts between optimistic and server data
   */
  private async resolveConflict(
    clientData: any,
    serverData: any,
    resolution: ConflictResolution
  ): Promise<any> {
    switch (resolution.strategy) {
      case 'client_wins':
        return clientData
        
      case 'server_wins':
        return serverData
        
      case 'merge':
        // Default merge strategy - shallow merge with server data taking precedence
        return { ...clientData, ...serverData }
        
      case 'manual':
        if (resolution.resolver) {
          return resolution.resolver(clientData, serverData)
        }
        return serverData
        
      default:
        return serverData
    }
  }

  /**
   * Queue update for offline processing
   */
  private queueOfflineUpdate<TInput>(
    update: OptimisticUpdate,
    mutation: OptimisticMutation<TInput, any>,
    input: TInput
  ): void {
    this.offlineQueue.push(update)
    this.saveOfflineQueue()
    
    // Register sync with service worker
    if ('serviceWorker' in navigator && 'sync' in self.registration) {
      self.registration.sync.register('optimistic-sync').catch(err => {
        console.warn('Failed to register background sync:', err)
      })
    }
  }

  /**
   * Process queued sync operations
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || this.syncQueue.length === 0) return
    
    this.syncInProgress = true
    
    try {
      while (this.syncQueue.length > 0) {
        const syncOperation = this.syncQueue.shift()
        if (syncOperation) {
          await syncOperation()
        }
      }
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Get pending updates for a resource
   */
  getPendingUpdates(resource?: string): OptimisticUpdate[] {
    const updates = Array.from(this.pendingUpdates.values())
    
    if (resource) {
      return updates.filter(update => update.resource === resource)
    }
    
    return updates
  }

  /**
   * Get update history
   */
  getHistory(resource?: string, limit = 50): OptimisticUpdate[] {
    let history = [...this.updateHistory]
    
    if (resource) {
      history = history.filter(update => update.resource === resource)
    }
    
    return history.slice(-limit)
  }

  /**
   * Clear all pending updates (use with caution)
   */
  clearPendingUpdates(): void {
    this.pendingUpdates.clear()
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.processOfflineQueue()
    })
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.processSyncQueue()
      }
    })
    
    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_COMPLETE') {
          this.handleSyncComplete(event.data.payload)
        }
      })
    }
  }

  /**
   * Process offline queue when coming back online
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return
    
    console.log('Processing offline queue:', this.offlineQueue.length, 'items')
    
    // Process queue in order
    const queue = [...this.offlineQueue]
    this.offlineQueue = []
    
    for (const update of queue) {
      // Re-queue for processing
      this.syncQueue.push(async () => {
        // Implement retry logic here
        console.log('Retrying offline update:', update.id)
      })
    }
    
    this.saveOfflineQueue()
    await this.processSyncQueue()
  }

  /**
   * Utility functions
   */
  private generateUpdateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private getUpdateType(previousData: any, optimisticData: any): 'create' | 'update' | 'delete' {
    if (!previousData && optimisticData) return 'create'
    if (previousData && !optimisticData) return 'delete'
    return 'update'
  }

  private extractResource(cacheKey: string): string {
    // Extract resource type from cache key (e.g., "api:appointments:123" -> "appointments")
    const parts = cacheKey.split(':')
    return parts[1] || 'unknown'
  }

  private extractResourceId(cacheKey: string): string | number | undefined {
    // Extract resource ID from cache key (e.g., "api:appointments:123" -> "123")
    const parts = cacheKey.split(':')
    const id = parts[2]
    return id ? (isNaN(Number(id)) ? id : Number(id)) : undefined
  }

  private isDataEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private moveToHistory(update: OptimisticUpdate): void {
    this.updateHistory.push(update)
    
    // Trim history if needed
    if (this.updateHistory.length > this.maxHistorySize) {
      this.updateHistory = this.updateHistory.slice(-this.maxHistorySize)
    }
  }

  private notifyServiceWorker(type: string, payload: any): void {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type, payload })
    }
  }

  private handleSyncComplete(payload: any): void {
    console.log('Sync complete:', payload)
  }

  private saveOfflineQueue(): void {
    try {
      localStorage.setItem('optimistic-offline-queue', JSON.stringify(this.offlineQueue))
    } catch (err) {
      console.warn('Failed to save offline queue:', err)
    }
  }

  private loadOfflineQueue(): void {
    try {
      const saved = localStorage.getItem('optimistic-offline-queue')
      if (saved) {
        this.offlineQueue = JSON.parse(saved)
      }
    } catch (err) {
      console.warn('Failed to load offline queue:', err)
    }
  }
}

// Global instance
export const optimisticUpdateManager = new OptimisticUpdateManager()

// Default conflict resolution strategies
optimisticUpdateManager.registerConflictHandler('appointments', {
  strategy: 'server_wins',
  notifyUser: true
})

optimisticUpdateManager.registerConflictHandler('clients', {
  strategy: 'merge',
  resolver: (client, server) => ({
    ...server,
    // Preserve client-side UI state
    _ui: client._ui
  })
})

optimisticUpdateManager.registerConflictHandler('services', {
  strategy: 'server_wins'
})