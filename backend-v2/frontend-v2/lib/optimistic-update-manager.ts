/**
 * Optimistic Update Manager
 * Advanced optimistic updates for touch interactions with conflict resolution
 * Provides instant UI feedback with intelligent rollback and reconciliation
 */

import { browserCompatibility, safeRequestAnimationFrame } from './browser-compatibility'

export interface OptimisticUpdate {
  id: string
  type: 'create' | 'update' | 'delete' | 'move' | 'resize'
  resourceType: 'appointment' | 'timeSlot' | 'calendar' | 'user'
  resourceId: string
  optimisticData: any
  originalData: any
  timestamp: number
  status: 'pending' | 'confirmed' | 'failed' | 'rolled_back'
  retryCount: number
  serverRequest?: Promise<any>
  rollbackFunction?: () => void
  onSuccess?: (data: any) => void
  onError?: (error: any) => void
  conflictResolution?: 'client-wins' | 'server-wins' | 'merge' | 'ask-user'
}

export interface OptimisticConflict {
  updateId: string
  clientData: any
  serverData: any
  conflictType: 'data-mismatch' | 'concurrent-edit' | 'resource-deleted'
  resolution: 'pending' | 'resolved'
  timestamp: number
}

export interface OptimisticMetrics {
  totalUpdates: number
  confirmedUpdates: number
  failedUpdates: number
  rolledBackUpdates: number
  averageConfirmTime: number
  conflictRate: number
  successRate: number
}

export interface OptimisticConfig {
  maxPendingUpdates: number
  confirmTimeout: number
  maxRetries: number
  enableConflictDetection: boolean
  enableBatching: boolean
  batchDelay: number
  enableRollbackAnimation: boolean
}

/**
 * Advanced optimistic update management system
 */
class OptimisticUpdateManager {
  private config: OptimisticConfig
  private pendingUpdates = new Map<string, OptimisticUpdate>()
  private conflicts = new Map<string, OptimisticConflict>()
  private updateQueue: string[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private cleanupInterval: NodeJS.Timeout
  
  private metrics: OptimisticMetrics = {
    totalUpdates: 0,
    confirmedUpdates: 0,
    failedUpdates: 0,
    rolledBackUpdates: 0,
    averageConfirmTime: 0,
    conflictRate: 0,
    successRate: 0
  }

  // Update type priorities for batching
  private updatePriorities = {
    'move': 100,     // Drag operations - highest priority
    'resize': 95,    // Resize operations
    'update': 80,    // Data updates
    'create': 70,    // New items
    'delete': 60     // Deletions - can be batched
  }

  // Conflict resolution strategies
  private conflictStrategies = {
    'appointment-move': 'client-wins',      // User drag should take precedence
    'appointment-update': 'merge',          // Try to merge appointment changes
    'appointment-delete': 'server-wins',    // Server deletion takes precedence
    'calendar-sync': 'server-wins',         // Server calendar state wins
    'user-preference': 'client-wins'        // User preferences are local
  }

  constructor(config: Partial<OptimisticConfig> = {}) {
    this.config = {
      maxPendingUpdates: 50,
      confirmTimeout: 5000, // 5 seconds
      maxRetries: 3,
      enableConflictDetection: true,
      enableBatching: true,
      batchDelay: 100, // 100ms
      enableRollbackAnimation: true,
      ...config
    }

    this.initializeOptimisticUpdates()
    
    // Cleanup and batch processing
    this.cleanupInterval = setInterval(() => {
      this.performMaintenance()
    }, 10000) // Every 10 seconds
  }

  /**
   * Initialize optimistic update system
   */
  private initializeOptimisticUpdates(): void {
    // Adjust config based on device performance
    const deviceType = this.detectDevicePerformance()
    
    switch (deviceType) {
      case 'lowEnd':
        this.config.maxPendingUpdates = 25
        this.config.batchDelay = 200
        this.config.enableRollbackAnimation = false
        break
      case 'highEnd':
        this.config.maxPendingUpdates = 100
        this.config.batchDelay = 50
        break
      default:
        // Keep default values
        break
    }

    console.log('OptimisticUpdateManager: Initialized', {
      deviceType,
      maxPendingUpdates: this.config.maxPendingUpdates,
      batchDelay: this.config.batchDelay
    })
  }

  /**
   * Detect device performance for optimization
   */
  private detectDevicePerformance(): 'highEnd' | 'standard' | 'lowEnd' {
    const navigator = window.navigator as any
    const deviceMemory = navigator.deviceMemory || 4
    const hardwareConcurrency = navigator.hardwareConcurrency || 4
    
    if (deviceMemory >= 8 && hardwareConcurrency >= 8) return 'highEnd'
    if (deviceMemory <= 2 || hardwareConcurrency <= 2) return 'lowEnd'
    return 'standard'
  }

  /**
   * Apply optimistic update with instant UI feedback
   */
  applyOptimisticUpdate(
    type: OptimisticUpdate['type'],
    resourceType: OptimisticUpdate['resourceType'],
    resourceId: string,
    optimisticData: any,
    serverRequest: Promise<any>,
    options: {
      originalData?: any
      rollbackFunction?: () => void
      onSuccess?: (data: any) => void
      onError?: (error: any) => void
      conflictResolution?: OptimisticUpdate['conflictResolution']
    } = {}
  ): string {
    // Check pending update limit
    if (this.pendingUpdates.size >= this.config.maxPendingUpdates) {
      console.warn('OptimisticUpdateManager: Max pending updates reached, forcing oldest confirmation')
      this.forceConfirmOldestUpdate()
    }

    const updateId = `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const update: OptimisticUpdate = {
      id: updateId,
      type,
      resourceType,
      resourceId,
      optimisticData,
      originalData: options.originalData || null,
      timestamp: performance.now(),
      status: 'pending',
      retryCount: 0,
      serverRequest,
      rollbackFunction: options.rollbackFunction,
      onSuccess: options.onSuccess,
      onError: options.onError,
      conflictResolution: options.conflictResolution || this.getDefaultConflictResolution(type, resourceType)
    }

    // Store the update
    this.pendingUpdates.set(updateId, update)
    this.metrics.totalUpdates++

    // Process server request
    this.processServerRequest(update)

    // Add to batch queue if batching is enabled
    if (this.config.enableBatching) {
      this.addToBatchQueue(updateId)
    }

    console.log('OptimisticUpdateManager: Applied optimistic update', {
      id: updateId,
      type,
      resourceType,
      resourceId
    })

    return updateId
  }

  /**
   * Process server request for optimistic update
   */
  private async processServerRequest(update: OptimisticUpdate): Promise<void> {
    try {
      // Set timeout for server request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Server request timeout')), this.config.confirmTimeout)
      })

      // Race between server request and timeout
      const serverResponse = await Promise.race([
        update.serverRequest!,
        timeoutPromise
      ])

      // Server request succeeded
      await this.handleServerSuccess(update, serverResponse)

    } catch (error) {
      // Server request failed
      await this.handleServerError(update, error)
    }
  }

  /**
   * Handle successful server response
   */
  private async handleServerSuccess(update: OptimisticUpdate, serverData: any): Promise<void> {
    const confirmTime = performance.now() - update.timestamp

    // Check for conflicts between optimistic and server data
    if (this.config.enableConflictDetection && this.hasDataConflict(update.optimisticData, serverData)) {
      await this.handleDataConflict(update, serverData)
      return
    }

    // Update confirmed successfully
    update.status = 'confirmed'
    this.metrics.confirmedUpdates++
    this.updateAverageConfirmTime(confirmTime)

    // Call success callback
    if (update.onSuccess) {
      try {
        update.onSuccess(serverData)
      } catch (callbackError) {
        console.error('OptimisticUpdateManager: Success callback failed:', callbackError)
      }
    }

    // Remove from pending updates
    this.pendingUpdates.delete(update.id)

    console.log('OptimisticUpdateManager: Update confirmed', {
      id: update.id,
      confirmTime: Math.round(confirmTime)
    })
  }

  /**
   * Handle server request error
   */
  private async handleServerError(update: OptimisticUpdate, error: any): Promise<void> {
    console.error('OptimisticUpdateManager: Server request failed:', error)

    // Check if we should retry
    if (update.retryCount < this.config.maxRetries && this.shouldRetry(error)) {
      update.retryCount++
      
      // Exponential backoff delay
      const retryDelay = Math.min(1000 * Math.pow(2, update.retryCount), 5000)
      
      setTimeout(() => {
        if (update.serverRequest) {
          this.processServerRequest(update)
        }
      }, retryDelay)

      console.log('OptimisticUpdateManager: Retrying update', {
        id: update.id,
        retryCount: update.retryCount,
        retryDelay
      })
      return
    }

    // Max retries reached or non-retryable error
    await this.rollbackOptimisticUpdate(update, error)
  }

  /**
   * Check if error should trigger a retry
   */
  private shouldRetry(error: any): boolean {
    // Network errors and timeouts are retryable
    if (error.message?.includes('timeout') || 
        error.message?.includes('network') ||
        error.name === 'NetworkError') {
      return true
    }

    // 5xx server errors are retryable
    if (error.status >= 500 && error.status < 600) {
      return true
    }

    // 4xx client errors are usually not retryable
    return false
  }

  /**
   * Check for data conflicts between optimistic and server data
   */
  private hasDataConflict(optimisticData: any, serverData: any): boolean {
    // Simple conflict detection - can be enhanced based on needs
    try {
      // Check if server data has changed significantly from optimistic data
      if (typeof optimisticData === 'object' && typeof serverData === 'object') {
        // Check key properties for conflicts
        const keyProperties = ['start', 'end', 'title', 'status', 'client_id']
        
        for (const key of keyProperties) {
          if (key in optimisticData && key in serverData) {
            if (optimisticData[key] !== serverData[key]) {
              return true
            }
          }
        }
      }
      
      return false
    } catch (error) {
      // If we can't compare, assume no conflict
      return false
    }
  }

  /**
   * Handle data conflict between optimistic and server data
   */
  private async handleDataConflict(update: OptimisticUpdate, serverData: any): Promise<void> {
    const conflict: OptimisticConflict = {
      updateId: update.id,
      clientData: update.optimisticData,
      serverData,
      conflictType: 'data-mismatch',
      resolution: 'pending',
      timestamp: Date.now()
    }

    this.conflicts.set(update.id, conflict)
    this.metrics.conflictRate = this.conflicts.size / this.metrics.totalUpdates

    // Apply conflict resolution strategy
    await this.resolveConflict(update, conflict)
  }

  /**
   * Resolve data conflict based on strategy
   */
  private async resolveConflict(update: OptimisticUpdate, conflict: OptimisticConflict): Promise<void> {
    const strategy = update.conflictResolution || 'merge'

    switch (strategy) {
      case 'client-wins':
        // Keep optimistic data, send it back to server
        await this.applyClientWinsResolution(update)
        break

      case 'server-wins':
        // Accept server data, update UI
        await this.applyServerWinsResolution(update, conflict.serverData)
        break

      case 'merge':
        // Try to merge both datasets
        await this.applyMergeResolution(update, conflict.serverData)
        break

      case 'ask-user':
        // Present conflict to user for manual resolution
        await this.askUserForResolution(update, conflict)
        break

      default:
        // Default to server wins
        await this.applyServerWinsResolution(update, conflict.serverData)
        break
    }

    conflict.resolution = 'resolved'
  }

  /**
   * Apply client-wins conflict resolution
   */
  private async applyClientWinsResolution(update: OptimisticUpdate): Promise<void> {
    // Client data takes precedence - send optimistic data back to server
    try {
      // This would typically involve sending the optimistic data back to server
      // For now, just mark as confirmed
      update.status = 'confirmed'
      this.metrics.confirmedUpdates++
      
      if (update.onSuccess) {
        update.onSuccess(update.optimisticData)
      }

      this.pendingUpdates.delete(update.id)
      console.log('OptimisticUpdateManager: Conflict resolved - client wins', update.id)
    } catch (error) {
      await this.rollbackOptimisticUpdate(update, error)
    }
  }

  /**
   * Apply server-wins conflict resolution
   */
  private async applyServerWinsResolution(update: OptimisticUpdate, serverData: any): Promise<void> {
    // Server data takes precedence - update UI with server data
    update.status = 'confirmed'
    this.metrics.confirmedUpdates++
    
    if (update.onSuccess) {
      update.onSuccess(serverData)
    }

    this.pendingUpdates.delete(update.id)
    console.log('OptimisticUpdateManager: Conflict resolved - server wins', update.id)
  }

  /**
   * Apply merge conflict resolution
   */
  private async applyMergeResolution(update: OptimisticUpdate, serverData: any): Promise<void> {
    try {
      // Simple merge strategy - can be enhanced based on data type
      const mergedData = { ...serverData, ...update.optimisticData }
      
      update.status = 'confirmed'
      this.metrics.confirmedUpdates++
      
      if (update.onSuccess) {
        update.onSuccess(mergedData)
      }

      this.pendingUpdates.delete(update.id)
      console.log('OptimisticUpdateManager: Conflict resolved - merged', update.id)
    } catch (error) {
      // Merge failed, fall back to server wins
      await this.applyServerWinsResolution(update, serverData)
    }
  }

  /**
   * Ask user for conflict resolution
   */
  private async askUserForResolution(update: OptimisticUpdate, conflict: OptimisticConflict): Promise<void> {
    // This would typically show a UI dialog to the user
    // For now, fall back to merge resolution
    console.log('OptimisticUpdateManager: User conflict resolution requested', update.id)
    await this.applyMergeResolution(update, conflict.serverData)
  }

  /**
   * Rollback optimistic update
   */
  private async rollbackOptimisticUpdate(update: OptimisticUpdate, error: any): Promise<void> {
    update.status = 'failed'
    this.metrics.failedUpdates++

    // Apply rollback animation if enabled
    if (this.config.enableRollbackAnimation && update.rollbackFunction) {
      this.animateRollback(update)
    }

    // Execute rollback function
    if (update.rollbackFunction) {
      try {
        update.rollbackFunction()
        update.status = 'rolled_back'
        this.metrics.rolledBackUpdates++
      } catch (rollbackError) {
        console.error('OptimisticUpdateManager: Rollback function failed:', rollbackError)
      }
    }

    // Call error callback
    if (update.onError) {
      try {
        update.onError(error)
      } catch (callbackError) {
        console.error('OptimisticUpdateManager: Error callback failed:', callbackError)
      }
    }

    // Remove from pending updates
    this.pendingUpdates.delete(update.id)

    console.warn('OptimisticUpdateManager: Update rolled back', {
      id: update.id,
      error: error.message || error
    })
  }

  /**
   * Animate rollback for visual feedback
   */
  private animateRollback(update: OptimisticUpdate): void {
    // This would typically apply CSS animations to show the rollback
    // For now, just add a visual indicator
    
    const element = document.querySelector(`[data-optimistic-id="${update.id}"]`)
    if (element) {
      element.classList.add('optimistic-rollback')
      
      setTimeout(() => {
        element.classList.remove('optimistic-rollback')
      }, 500)
    }
  }

  /**
   * Get default conflict resolution strategy
   */
  private getDefaultConflictResolution(
    type: OptimisticUpdate['type'], 
    resourceType: OptimisticUpdate['resourceType']
  ): OptimisticUpdate['conflictResolution'] {
    const key = `${resourceType}-${type}`
    return this.conflictStrategies[key] || 'merge'
  }

  /**
   * Add update to batch queue
   */
  private addToBatchQueue(updateId: string): void {
    this.updateQueue.push(updateId)

    // Set batch timer if not already set
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatchQueue()
      }, this.config.batchDelay)
    }
  }

  /**
   * Process batched updates
   */
  private processBatchQueue(): void {
    if (this.updateQueue.length === 0) {
      this.batchTimer = null
      return
    }

    // Sort updates by priority
    const sortedUpdates = this.updateQueue
      .map(id => this.pendingUpdates.get(id))
      .filter(Boolean)
      .sort((a, b) => (this.updatePriorities[b!.type] || 50) - (this.updatePriorities[a!.type] || 50))

    // Process high-priority updates first
    sortedUpdates.forEach(update => {
      if (update && update.status === 'pending') {
        // Update is already being processed by processServerRequest
        console.log('OptimisticUpdateManager: Processing batched update', update.id)
      }
    })

    this.updateQueue = []
    this.batchTimer = null
  }

  /**
   * Force confirmation of oldest pending update
   */
  private forceConfirmOldestUpdate(): void {
    let oldestUpdate: OptimisticUpdate | null = null
    let oldestTime = Date.now()

    for (const update of this.pendingUpdates.values()) {
      if (update.timestamp < oldestTime) {
        oldestTime = update.timestamp
        oldestUpdate = update
      }
    }

    if (oldestUpdate) {
      console.warn('OptimisticUpdateManager: Force confirming oldest update', oldestUpdate.id)
      this.handleServerSuccess(oldestUpdate, oldestUpdate.optimisticData)
    }
  }

  /**
   * Update average confirmation time metric
   */
  private updateAverageConfirmTime(confirmTime: number): void {
    const alpha = 0.1 // Smoothing factor
    this.metrics.averageConfirmTime = 
      this.metrics.averageConfirmTime * (1 - alpha) + confirmTime * alpha
  }

  /**
   * Periodic maintenance and cleanup
   */
  private performMaintenance(): void {
    const now = Date.now()
    
    // Clean up old conflicts
    for (const [id, conflict] of this.conflicts.entries()) {
      if (now - conflict.timestamp > 60000) { // 1 minute old
        this.conflicts.delete(id)
      }
    }

    // Update success rate
    if (this.metrics.totalUpdates > 0) {
      this.metrics.successRate = this.metrics.confirmedUpdates / this.metrics.totalUpdates
    }

    // Log metrics
    if (this.metrics.totalUpdates > 0) {
      console.log('OptimisticUpdateManager: Performance metrics', {
        totalUpdates: this.metrics.totalUpdates,
        successRate: Math.round(this.metrics.successRate * 100),
        averageConfirmTime: Math.round(this.metrics.averageConfirmTime),
        conflictRate: Math.round(this.metrics.conflictRate * 100),
        pendingUpdates: this.pendingUpdates.size
      })
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): OptimisticMetrics {
    return { ...this.metrics }
  }

  /**
   * Cancel pending optimistic update
   */
  cancelOptimisticUpdate(updateId: string): boolean {
    const update = this.pendingUpdates.get(updateId)
    if (update && update.status === 'pending') {
      this.rollbackOptimisticUpdate(update, new Error('Update cancelled by user'))
      return true
    }
    return false
  }

  /**
   * Get pending updates
   */
  getPendingUpdates(): OptimisticUpdate[] {
    return Array.from(this.pendingUpdates.values())
  }

  /**
   * Clear all pending updates
   */
  clearAllUpdates(): void {
    // Rollback all pending updates
    for (const update of this.pendingUpdates.values()) {
      if (update.rollbackFunction) {
        update.rollbackFunction()
      }
    }

    this.pendingUpdates.clear()
    this.conflicts.clear()
    this.updateQueue = []

    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    console.log('OptimisticUpdateManager: All updates cleared')
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<OptimisticConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('OptimisticUpdateManager: Configuration updated', this.config)
  }

  /**
   * Destroy the optimistic update manager
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }

    this.clearAllUpdates()
  }
}

// Singleton instance for global optimistic update management
export const optimisticUpdateManager = new OptimisticUpdateManager()

// React hook for optimistic updates
export function useOptimisticUpdates() {
  const applyUpdate = (
    type: OptimisticUpdate['type'],
    resourceType: OptimisticUpdate['resourceType'],
    resourceId: string,
    optimisticData: any,
    serverRequest: Promise<any>,
    options?: {
      originalData?: any
      rollbackFunction?: () => void
      onSuccess?: (data: any) => void
      onError?: (error: any) => void
      conflictResolution?: OptimisticUpdate['conflictResolution']
    }
  ) => {
    return optimisticUpdateManager.applyOptimisticUpdate(
      type,
      resourceType,
      resourceId,
      optimisticData,
      serverRequest,
      options
    )
  }

  const cancelUpdate = (updateId: string) => {
    return optimisticUpdateManager.cancelOptimisticUpdate(updateId)
  }

  const getMetrics = () => {
    return optimisticUpdateManager.getMetrics()
  }

  const getPendingUpdates = () => {
    return optimisticUpdateManager.getPendingUpdates()
  }

  return {
    applyUpdate,
    cancelUpdate,
    getMetrics,
    getPendingUpdates
  }
}

export default optimisticUpdateManager