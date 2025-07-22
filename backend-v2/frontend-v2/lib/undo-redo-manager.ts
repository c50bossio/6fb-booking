/**
 * Undo/Redo Manager for Drag Operations
 * Advanced undo/redo system with state snapshots, operation batching, and intelligent merging
 * Provides seamless undo/redo experience for touch drag interactions
 */

import { browserCompatibility, safeRequestAnimationFrame } from './browser-compatibility'

export interface UndoableOperation {
  id: string
  type: 'drag' | 'resize' | 'create' | 'delete' | 'batch'
  resourceType: 'appointment' | 'timeSlot' | 'calendar'
  resourceId: string
  timestamp: number
  description: string
  undoData: any
  redoData: any
  merged?: boolean
  batchId?: string
}

export interface OperationBatch {
  id: string
  operations: UndoableOperation[]
  timestamp: number
  description: string
  type: 'sequential' | 'simultaneous'
}

export interface UndoRedoState {
  undoStack: (UndoableOperation | OperationBatch)[]
  redoStack: (UndoableOperation | OperationBatch)[]
  currentPosition: number
  maxHistorySize: number
  canUndo: boolean
  canRedo: boolean
}

export interface UndoRedoConfig {
  maxHistorySize: number
  enableBatching: boolean
  batchTimeout: number // milliseconds
  enableMerging: boolean
  mergeTimeout: number // milliseconds
  enablePersistence: boolean
  enableAnimations: boolean
}

export interface UndoRedoMetrics {
  totalOperations: number
  undoOperations: number
  redoOperations: number
  batchedOperations: number
  mergedOperations: number
  averageOperationSize: number
  memoryUsage: number
}

/**
 * Advanced undo/redo system for touch drag operations
 */
class UndoRedoManager {
  private config: UndoRedoConfig
  private state: UndoRedoState
  private pendingBatch: UndoableOperation[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private mergeTimer: NodeJS.Timeout | null = null
  private lastOperation: UndoableOperation | null = null
  private changeListeners: ((state: UndoRedoState) => void)[] = []
  private cleanupInterval: NodeJS.Timeout

  private metrics: UndoRedoMetrics = {
    totalOperations: 0,
    undoOperations: 0,
    redoOperations: 0,
    batchedOperations: 0,
    mergedOperations: 0,
    averageOperationSize: 0,
    memoryUsage: 0
  }

  // Operation priorities for merging decisions
  private operationPriorities = {
    'drag': 100,      // Highest priority - merge similar drags
    'resize': 90,     // High priority - merge resize operations
    'create': 70,     // Medium priority - don't merge creates
    'delete': 60,     // Medium priority - don't merge deletes
    'batch': 50       // Lower priority - already batched
  }

  // Mergeable operation types
  private mergeableTypes = new Set(['drag', 'resize'])

  constructor(config: Partial<UndoRedoConfig> = {}) {
    this.config = {
      maxHistorySize: 50,
      enableBatching: true,
      batchTimeout: 500, // 500ms
      enableMerging: true,
      mergeTimeout: 1000, // 1 second
      enablePersistence: false,
      enableAnimations: true,
      ...config
    }

    this.state = {
      undoStack: [],
      redoStack: [],
      currentPosition: 0,
      maxHistorySize: this.config.maxHistorySize,
      canUndo: false,
      canRedo: false
    }

    this.initializeUndoRedo()

    // Periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.performMaintenance()
    }, 30000) // Every 30 seconds
  }

  /**
   * Initialize undo/redo system
   */
  private initializeUndoRedo(): void {
    // Adjust configuration based on device performance
    const deviceType = this.detectDevicePerformance()
    
    switch (deviceType) {
      case 'lowEnd':
        this.config.maxHistorySize = 25
        this.config.enableBatching = false
        this.config.enableMerging = false
        this.config.enableAnimations = false
        break
      case 'highEnd':
        this.config.maxHistorySize = 100
        this.config.batchTimeout = 300
        break
      default:
        // Keep default values
        break
    }

    // Load persisted state if enabled
    if (this.config.enablePersistence) {
      this.loadPersistedState()
    }

    console.log('UndoRedoManager: Initialized', {
      deviceType,
      maxHistorySize: this.config.maxHistorySize,
      enableBatching: this.config.enableBatching,
      enableMerging: this.config.enableMerging
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
   * Add undoable operation
   */
  addOperation(operation: Omit<UndoableOperation, 'id' | 'timestamp'>): string {
    const fullOperation: UndoableOperation = {
      ...operation,
      id: `undo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: performance.now()
    }

    // Try to merge with previous operation if enabled
    if (this.config.enableMerging && this.canMergeWithPrevious(fullOperation)) {
      const mergedOperation = this.mergeWithPrevious(fullOperation)
      if (mergedOperation) {
        this.metrics.mergedOperations++
        this.notifyStateChange()
        return mergedOperation.id
      }
    }

    // Add to batch if batching is enabled
    if (this.config.enableBatching) {
      this.addToBatch(fullOperation)
    } else {
      this.executeAddOperation(fullOperation)
    }

    this.metrics.totalOperations++
    return fullOperation.id
  }

  /**
   * Check if operation can be merged with previous
   */
  private canMergeWithPrevious(operation: UndoableOperation): boolean {
    if (!this.lastOperation) return false
    
    const timeDiff = operation.timestamp - this.lastOperation.timestamp
    if (timeDiff > this.config.mergeTimeout) return false

    // Check if operations are mergeable
    return this.mergeableTypes.has(operation.type) &&
           this.mergeableTypes.has(this.lastOperation.type) &&
           operation.type === this.lastOperation.type &&
           operation.resourceId === this.lastOperation.resourceId
  }

  /**
   * Merge operation with previous
   */
  private mergeWithPrevious(operation: UndoableOperation): UndoableOperation | null {
    if (!this.lastOperation || this.state.undoStack.length === 0) return null

    const lastItem = this.state.undoStack[this.state.undoStack.length - 1]
    
    // Only merge individual operations, not batches
    if ('operations' in lastItem) return null

    const mergedOperation: UndoableOperation = {
      ...this.lastOperation,
      id: operation.id,
      timestamp: operation.timestamp,
      description: `${this.lastOperation.description} + ${operation.description}`,
      redoData: operation.redoData, // Use new redo data
      merged: true
    }

    // Replace last operation with merged version
    this.state.undoStack[this.state.undoStack.length - 1] = mergedOperation
    this.lastOperation = mergedOperation

    console.log('UndoRedoManager: Merged operations', {
      originalId: this.lastOperation.id,
      newId: operation.id,
      type: operation.type
    })

    return mergedOperation
  }

  /**
   * Add operation to pending batch
   */
  private addToBatch(operation: UndoableOperation): void {
    this.pendingBatch.push(operation)

    // Set batch timer if not already set
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch()
      }, this.config.batchTimeout)
    }
  }

  /**
   * Flush pending batch to undo stack
   */
  private flushBatch(): void {
    if (this.pendingBatch.length === 0) {
      this.batchTimer = null
      return
    }

    if (this.pendingBatch.length === 1) {
      // Single operation - add directly
      this.executeAddOperation(this.pendingBatch[0])
    } else {
      // Multiple operations - create batch
      const batch: OperationBatch = {
        id: `batch-${Date.now()}`,
        operations: [...this.pendingBatch],
        timestamp: performance.now(),
        description: `Batch of ${this.pendingBatch.length} operations`,
        type: this.determineBatchType(this.pendingBatch)
      }

      this.executeAddBatch(batch)
      this.metrics.batchedOperations += this.pendingBatch.length
    }

    this.pendingBatch = []
    this.batchTimer = null
  }

  /**
   * Determine batch type based on operations
   */
  private determineBatchType(operations: UndoableOperation[]): OperationBatch['type'] {
    // Check if operations have similar timestamps (within 100ms)
    const timestamps = operations.map(op => op.timestamp)
    const minTime = Math.min(...timestamps)
    const maxTime = Math.max(...timestamps)
    
    if (maxTime - minTime < 100) {
      return 'simultaneous'
    }
    
    return 'sequential'
  }

  /**
   * Execute add operation to undo stack
   */
  private executeAddOperation(operation: UndoableOperation): void {
    // Clear redo stack when new operation is added
    this.state.redoStack = []

    // Add to undo stack
    this.state.undoStack.push(operation)
    this.lastOperation = operation

    // Limit history size
    if (this.state.undoStack.length > this.config.maxHistorySize) {
      this.state.undoStack.shift()
    }

    this.updateState()
    this.notifyStateChange()

    console.log('UndoRedoManager: Added operation', {
      id: operation.id,
      type: operation.type,
      description: operation.description
    })
  }

  /**
   * Execute add batch to undo stack
   */
  private executeAddBatch(batch: OperationBatch): void {
    // Clear redo stack when new operation is added
    this.state.redoStack = []

    // Add to undo stack
    this.state.undoStack.push(batch)

    // Limit history size
    if (this.state.undoStack.length > this.config.maxHistorySize) {
      this.state.undoStack.shift()
    }

    this.updateState()
    this.notifyStateChange()

    console.log('UndoRedoManager: Added batch', {
      id: batch.id,
      operationCount: batch.operations.length,
      type: batch.type
    })
  }

  /**
   * Undo last operation or batch
   */
  async undo(): Promise<boolean> {
    if (!this.canUndo()) return false

    const item = this.state.undoStack.pop()
    if (!item) return false

    try {
      let success = false

      if ('operations' in item) {
        // Undo batch
        success = await this.undoBatch(item)
      } else {
        // Undo single operation
        success = await this.undoOperation(item)
      }

      if (success) {
        this.state.redoStack.push(item)
        this.metrics.undoOperations++
        
        // Animate undo if enabled
        if (this.config.enableAnimations) {
          this.animateUndo(item)
        }
      } else {
        // Put back on undo stack if failed
        this.state.undoStack.push(item)
      }

      this.updateState()
      this.notifyStateChange()
      return success

    } catch (error) {
      console.error('UndoRedoManager: Undo failed:', error)
      // Put back on undo stack if error occurred
      this.state.undoStack.push(item)
      this.updateState()
      this.notifyStateChange()
      return false
    }
  }

  /**
   * Redo last undone operation or batch
   */
  async redo(): Promise<boolean> {
    if (!this.canRedo()) return false

    const item = this.state.redoStack.pop()
    if (!item) return false

    try {
      let success = false

      if ('operations' in item) {
        // Redo batch
        success = await this.redoBatch(item)
      } else {
        // Redo single operation
        success = await this.redoOperation(item)
      }

      if (success) {
        this.state.undoStack.push(item)
        this.metrics.redoOperations++
        
        // Animate redo if enabled
        if (this.config.enableAnimations) {
          this.animateRedo(item)
        }
      } else {
        // Put back on redo stack if failed
        this.state.redoStack.push(item)
      }

      this.updateState()
      this.notifyStateChange()
      return success

    } catch (error) {
      console.error('UndoRedoManager: Redo failed:', error)
      // Put back on redo stack if error occurred
      this.state.redoStack.push(item)
      this.updateState()
      this.notifyStateChange()
      return false
    }
  }

  /**
   * Undo single operation
   */
  private async undoOperation(operation: UndoableOperation): Promise<boolean> {
    // Apply undo data to restore previous state
    return this.applyOperationData(operation, operation.undoData, 'undo')
  }

  /**
   * Redo single operation
   */
  private async redoOperation(operation: UndoableOperation): Promise<boolean> {
    // Apply redo data to restore forward state
    return this.applyOperationData(operation, operation.redoData, 'redo')
  }

  /**
   * Undo batch of operations
   */
  private async undoBatch(batch: OperationBatch): Promise<boolean> {
    const operations = batch.type === 'sequential' 
      ? [...batch.operations].reverse() // Reverse order for sequential
      : batch.operations // Same order for simultaneous

    let allSucceeded = true

    for (const operation of operations) {
      const success = await this.undoOperation(operation)
      if (!success) {
        allSucceeded = false
        console.warn('UndoRedoManager: Batch undo partially failed', operation.id)
      }
    }

    return allSucceeded
  }

  /**
   * Redo batch of operations
   */
  private async redoBatch(batch: OperationBatch): Promise<boolean> {
    const operations = batch.operations // Original order for both types

    let allSucceeded = true

    for (const operation of operations) {
      const success = await this.redoOperation(operation)
      if (!success) {
        allSucceeded = false
        console.warn('UndoRedoManager: Batch redo partially failed', operation.id)
      }
    }

    return allSucceeded
  }

  /**
   * Apply operation data (mock implementation - would integrate with actual calendar)
   */
  private async applyOperationData(
    operation: UndoableOperation, 
    data: any, 
    direction: 'undo' | 'redo'
  ): Promise<boolean> {
    // This would typically integrate with the actual calendar/appointment system
    // For now, simulate the operation
    
    try {
      switch (operation.type) {
        case 'drag':
          // Restore appointment position
          console.log(`UndoRedoManager: ${direction} drag for ${operation.resourceId}`, data)
          break

        case 'resize':
          // Restore appointment size
          console.log(`UndoRedoManager: ${direction} resize for ${operation.resourceId}`, data)
          break

        case 'create':
          if (direction === 'undo') {
            // Remove created item
            console.log(`UndoRedoManager: Remove created ${operation.resourceId}`)
          } else {
            // Recreate item
            console.log(`UndoRedoManager: Recreate ${operation.resourceId}`, data)
          }
          break

        case 'delete':
          if (direction === 'undo') {
            // Restore deleted item
            console.log(`UndoRedoManager: Restore deleted ${operation.resourceId}`, data)
          } else {
            // Re-delete item
            console.log(`UndoRedoManager: Re-delete ${operation.resourceId}`)
          }
          break

        default:
          console.warn('UndoRedoManager: Unknown operation type:', operation.type)
          return false
      }

      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 10))
      return true

    } catch (error) {
      console.error('UndoRedoManager: Failed to apply operation data:', error)
      return false
    }
  }

  /**
   * Animate undo operation
   */
  private animateUndo(item: UndoableOperation | OperationBatch): void {
    const resourceId = 'operations' in item ? item.id : item.resourceId
    const element = document.querySelector(`[data-appointment-id="${resourceId}"]`)
    
    if (element) {
      element.classList.add('undo-animation')
      setTimeout(() => {
        element.classList.remove('undo-animation')
      }, 300)
    }
  }

  /**
   * Animate redo operation
   */
  private animateRedo(item: UndoableOperation | OperationBatch): void {
    const resourceId = 'operations' in item ? item.id : item.resourceId
    const element = document.querySelector(`[data-appointment-id="${resourceId}"]`)
    
    if (element) {
      element.classList.add('redo-animation')
      setTimeout(() => {
        element.classList.remove('redo-animation')
      }, 300)
    }
  }

  /**
   * Check if undo is possible
   */
  canUndo(): boolean {
    return this.state.undoStack.length > 0
  }

  /**
   * Check if redo is possible
   */
  canRedo(): boolean {
    return this.state.redoStack.length > 0
  }

  /**
   * Get current state
   */
  getState(): UndoRedoState {
    return { ...this.state }
  }

  /**
   * Get undo stack (for debugging/inspection)
   */
  getUndoStack(): (UndoableOperation | OperationBatch)[] {
    return [...this.state.undoStack]
  }

  /**
   * Get redo stack (for debugging/inspection)
   */
  getRedoStack(): (UndoableOperation | OperationBatch)[] {
    return [...this.state.redoStack]
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: UndoRedoState) => void): () => void {
    this.changeListeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.changeListeners.indexOf(listener)
      if (index >= 0) {
        this.changeListeners.splice(index, 1)
      }
    }
  }

  /**
   * Update internal state
   */
  private updateState(): void {
    this.state.canUndo = this.canUndo()
    this.state.canRedo = this.canRedo()
    this.state.currentPosition = this.state.undoStack.length
  }

  /**
   * Notify state change to listeners
   */
  private notifyStateChange(): void {
    safeRequestAnimationFrame(() => {
      this.changeListeners.forEach(listener => {
        try {
          listener(this.getState())
        } catch (error) {
          console.error('UndoRedoManager: Listener callback failed:', error)
        }
      })
    })
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    // Flush any pending batch first
    if (this.pendingBatch.length > 0) {
      this.flushBatch()
    }

    this.state.undoStack = []
    this.state.redoStack = []
    this.lastOperation = null

    this.updateState()
    this.notifyStateChange()

    console.log('UndoRedoManager: History cleared')
  }

  /**
   * Get current metrics
   */
  getMetrics(): UndoRedoMetrics {
    const totalMemory = this.estimateMemoryUsage()
    const avgSize = this.metrics.totalOperations > 0 
      ? totalMemory / this.metrics.totalOperations 
      : 0

    return {
      ...this.metrics,
      averageOperationSize: avgSize,
      memoryUsage: totalMemory
    }
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0
    
    // Estimate undo stack size
    this.state.undoStack.forEach(item => {
      if ('operations' in item) {
        totalSize += item.operations.length * 2048 // Estimate batch overhead
      } else {
        totalSize += 1024 // Estimate operation size
      }
    })
    
    // Estimate redo stack size
    this.state.redoStack.forEach(item => {
      if ('operations' in item) {
        totalSize += item.operations.length * 2048
      } else {
        totalSize += 1024
      }
    })
    
    return totalSize
  }

  /**
   * Load persisted state
   */
  private loadPersistedState(): void {
    try {
      const saved = localStorage.getItem('undoRedoState')
      if (saved) {
        const state = JSON.parse(saved)
        // Only restore undo stack, not redo stack (for safety)
        this.state.undoStack = state.undoStack || []
        this.updateState()
        console.log('UndoRedoManager: Loaded persisted state')
      }
    } catch (error) {
      console.warn('UndoRedoManager: Failed to load persisted state:', error)
    }
  }

  /**
   * Persist current state
   */
  private persistState(): void {
    if (!this.config.enablePersistence) return

    try {
      const stateToSave = {
        undoStack: this.state.undoStack
        // Don't save redo stack for safety
      }
      localStorage.setItem('undoRedoState', JSON.stringify(stateToSave))
    } catch (error) {
      console.warn('UndoRedoManager: Failed to persist state:', error)
    }
  }

  /**
   * Periodic maintenance
   */
  private performMaintenance(): void {
    // Persist state if enabled
    if (this.config.enablePersistence) {
      this.persistState()
    }

    // Log metrics
    if (this.metrics.totalOperations > 0) {
      console.log('UndoRedoManager: Performance metrics', {
        totalOperations: this.metrics.totalOperations,
        undoOperations: this.metrics.undoOperations,
        redoOperations: this.metrics.redoOperations,
        batchedOperations: this.metrics.batchedOperations,
        mergedOperations: this.metrics.mergedOperations,
        memoryUsage: Math.round(this.metrics.memoryUsage / 1024) + ' KB',
        stackSizes: {
          undo: this.state.undoStack.length,
          redo: this.state.redoStack.length
        }
      })
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<UndoRedoConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.state.maxHistorySize = this.config.maxHistorySize
    
    // Trim stacks if new max size is smaller
    if (this.state.undoStack.length > this.config.maxHistorySize) {
      this.state.undoStack = this.state.undoStack.slice(-this.config.maxHistorySize)
    }
    if (this.state.redoStack.length > this.config.maxHistorySize) {
      this.state.redoStack = this.state.redoStack.slice(-this.config.maxHistorySize)
    }
    
    this.updateState()
    console.log('UndoRedoManager: Configuration updated', this.config)
  }

  /**
   * Destroy the undo/redo manager
   */
  destroy(): void {
    // Flush any pending batch
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.flushBatch()
    }

    if (this.mergeTimer) {
      clearTimeout(this.mergeTimer)
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    // Persist final state if enabled
    if (this.config.enablePersistence) {
      this.persistState()
    }

    this.clearHistory()
    this.changeListeners = []
  }
}

// Singleton instance for global undo/redo management
export const undoRedoManager = new UndoRedoManager()

// React hook for undo/redo functionality
export function useUndoRedo() {
  const addOperation = (operation: Omit<UndoableOperation, 'id' | 'timestamp'>) => {
    return undoRedoManager.addOperation(operation)
  }

  const undo = () => {
    return undoRedoManager.undo()
  }

  const redo = () => {
    return undoRedoManager.redo()
  }

  const canUndo = () => {
    return undoRedoManager.canUndo()
  }

  const canRedo = () => {
    return undoRedoManager.canRedo()
  }

  const getState = () => {
    return undoRedoManager.getState()
  }

  const getMetrics = () => {
    return undoRedoManager.getMetrics()
  }

  const clearHistory = () => {
    undoRedoManager.clearHistory()
  }

  const subscribe = (listener: (state: UndoRedoState) => void) => {
    return undoRedoManager.subscribe(listener)
  }

  return {
    addOperation,
    undo,
    redo,
    canUndo,
    canRedo,
    getState,
    getMetrics,
    clearHistory,
    subscribe
  }
}

export default undoRedoManager