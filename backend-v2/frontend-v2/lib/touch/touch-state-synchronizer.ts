/**
 * Touch State Synchronizer
 * Advanced state synchronization system for touch components
 * Provides seamless state sharing with conflict resolution and event sourcing
 */

import { browserCompatibility, safeRequestAnimationFrame } from './browser-compatibility'

export interface TouchState {
  id: string
  componentId: string
  type: 'gesture' | 'position' | 'data' | 'ui' | 'preference'
  state: any
  timestamp: number
  version: number
  origin: 'local' | 'remote' | 'sync'
  metadata: Record<string, any>
}

export interface StateEvent {
  id: string
  type: 'state-changed' | 'state-conflict' | 'state-synced'
  componentId: string
  stateId: string
  oldState?: any
  newState: any
  timestamp: number
  causedBy?: string
}

export interface SyncConflict {
  id: string
  componentId: string
  stateId: string
  localState: TouchState
  remoteState: TouchState
  conflictType: 'concurrent-update' | 'version-mismatch' | 'data-divergence'
  resolution: 'pending' | 'resolved-local' | 'resolved-remote' | 'resolved-merge'
  timestamp: number
}

export interface SyncConfig {
  enableEventSourcing: boolean
  maxEventHistory: number
  syncInterval: number
  conflictResolution: 'last-write-wins' | 'version-based' | 'manual' | 'component-priority'
  enableOptimisticSync: boolean
  batchUpdates: boolean
  persistState: boolean
}

export interface ComponentSubscription {
  componentId: string
  stateTypes: string[]
  callback: (state: TouchState, event: StateEvent) => void
  priority: number
  filter?: (state: TouchState) => boolean
}

/**
 * Advanced state synchronization for touch components
 */
class TouchStateSynchronizer {
  private config: SyncConfig
  private states = new Map<string, TouchState>()
  private eventHistory: StateEvent[] = []
  private subscriptions = new Map<string, ComponentSubscription[]>()
  private conflicts = new Map<string, SyncConflict>()
  private syncQueue: TouchState[] = []
  private isProcessingSync = false
  private syncInterval: NodeJS.Timeout
  private cleanupInterval: NodeJS.Timeout

  // Component priorities for conflict resolution
  private componentPriorities = {
    'unified-calendar': 100,        // Highest priority - main calendar
    'appointment-card': 90,         // High priority - appointment interactions
    'touch-drag-manager': 85,       // High priority - drag operations
    'swipe-reveal': 80,            // Medium-high priority - swipe actions
    'touch-context-menu': 75,      // Medium-high priority - context menus
    'pull-to-refresh': 70,         // Medium priority - refresh actions
    'one-handed-mode': 60,         // Medium priority - accessibility
    'touch-analytics': 40,         // Lower priority - tracking
    'haptic-feedback': 30          // Low priority - feedback systems
  }

  // State type priorities
  private stateTypePriorities = {
    'gesture': 100,     // Immediate user interactions
    'position': 90,     // Touch positions and movements
    'ui': 80,          // UI state changes
    'data': 70,        // Data modifications
    'preference': 60   // User preferences
  }

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = {
      enableEventSourcing: true,
      maxEventHistory: 1000,
      syncInterval: 50, // 50ms for smooth sync
      conflictResolution: 'version-based',
      enableOptimisticSync: true,
      batchUpdates: true,
      persistState: false,
      ...config
    }

    this.initializeSynchronizer()

    // Periodic sync and cleanup
    this.syncInterval = setInterval(() => {
      this.processSyncQueue()
    }, this.config.syncInterval)

    this.cleanupInterval = setInterval(() => {
      this.performMaintenance()
    }, 30000) // Every 30 seconds
  }

  /**
   * Initialize state synchronizer
   */
  private initializeSynchronizer(): void {
    // Adjust config based on device performance
    const deviceType = this.detectDevicePerformance()
    
    switch (deviceType) {
      case 'lowEnd':
        this.config.syncInterval = 100 // Slower sync
        this.config.maxEventHistory = 500
        this.config.batchUpdates = true
        this.config.enableOptimisticSync = false
        break
      case 'highEnd':
        this.config.syncInterval = 25 // Faster sync
        this.config.maxEventHistory = 2000
        this.config.enableOptimisticSync = true
        break
      default:
        // Keep default values
        break
    }

    console.log('TouchStateSynchronizer: Initialized', {
      deviceType,
      syncInterval: this.config.syncInterval,
      enableOptimisticSync: this.config.enableOptimisticSync
    })
  }

  /**
   * Detect device performance for optimization
   */
  private detectDevicePerformance(): 'highEnd' | 'standard' | 'lowEnd' {
    const navigator = window.navigator as any
    const hardwareConcurrency = navigator.hardwareConcurrency || 4
    const deviceMemory = navigator.deviceMemory || 4
    
    if (hardwareConcurrency >= 8 && deviceMemory >= 8) return 'highEnd'
    if (hardwareConcurrency <= 2 || deviceMemory <= 2) return 'lowEnd'
    return 'standard'
  }

  /**
   * Subscribe component to state changes
   */
  subscribe(
    componentId: string,
    stateTypes: string[],
    callback: (state: TouchState, event: StateEvent) => void,
    options: {
      priority?: number
      filter?: (state: TouchState) => boolean
    } = {}
  ): () => void {
    const subscription: ComponentSubscription = {
      componentId,
      stateTypes,
      callback,
      priority: options.priority || this.getComponentPriority(componentId),
      filter: options.filter
    }

    // Add to subscriptions map
    stateTypes.forEach(stateType => {
      if (!this.subscriptions.has(stateType)) {
        this.subscriptions.set(stateType, [])
      }
      this.subscriptions.get(stateType)!.push(subscription)
    })

    console.log('TouchStateSynchronizer: Component subscribed', {
      componentId,
      stateTypes,
      priority: subscription.priority
    })

    // Return unsubscribe function
    return () => {
      this.unsubscribe(componentId, stateTypes)
    }
  }

  /**
   * Unsubscribe component from state changes
   */
  private unsubscribe(componentId: string, stateTypes: string[]): void {
    stateTypes.forEach(stateType => {
      const subscriptions = this.subscriptions.get(stateType)
      if (subscriptions) {
        const filtered = subscriptions.filter(sub => sub.componentId !== componentId)
        this.subscriptions.set(stateType, filtered)
      }
    })

    console.log('TouchStateSynchronizer: Component unsubscribed', componentId)
  }

  /**
   * Update state with synchronization
   */
  updateState(
    componentId: string,
    stateId: string,
    stateType: string,
    newState: any,
    options: {
      optimistic?: boolean
      merge?: boolean
      metadata?: Record<string, any>
    } = {}
  ): void {
    const currentState = this.states.get(`${componentId}:${stateId}`)
    const stateKey = `${componentId}:${stateId}`
    
    const touchState: TouchState = {
      id: stateKey,
      componentId,
      type: stateType as TouchState['type'],
      state: newState,
      timestamp: performance.now(),
      version: currentState ? currentState.version + 1 : 1,
      origin: 'local',
      metadata: {
        optimistic: options.optimistic || false,
        merge: options.merge || false,
        ...options.metadata
      }
    }

    // Check for conflicts if state exists
    if (currentState && this.hasStateConflict(currentState, touchState)) {
      this.handleStateConflict(currentState, touchState)
      return
    }

    // Update state
    const oldState = currentState?.state
    this.states.set(stateKey, touchState)

    // Create state event
    const stateEvent: StateEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'state-changed',
      componentId,
      stateId,
      oldState,
      newState,
      timestamp: touchState.timestamp,
      causedBy: componentId
    }

    // Add to event history if enabled
    if (this.config.enableEventSourcing) {
      this.addToEventHistory(stateEvent)
    }

    // Notify subscribers
    this.notifySubscribers(touchState, stateEvent)

    // Add to sync queue if batching is enabled
    if (this.config.batchUpdates) {
      this.addToSyncQueue(touchState)
    } else {
      this.processStateSync(touchState)
    }

    console.log('TouchStateSynchronizer: State updated', {
      componentId,
      stateId,
      stateType,
      version: touchState.version,
      optimistic: options.optimistic
    })
  }

  /**
   * Get current state
   */
  getState(componentId: string, stateId: string): TouchState | null {
    return this.states.get(`${componentId}:${stateId}`) || null
  }

  /**
   * Get all states for component
   */
  getComponentStates(componentId: string): TouchState[] {
    const componentStates: TouchState[] = []
    
    for (const [key, state] of this.states.entries()) {
      if (state.componentId === componentId) {
        componentStates.push(state)
      }
    }
    
    return componentStates
  }

  /**
   * Check for state conflicts
   */
  private hasStateConflict(currentState: TouchState, newState: TouchState): boolean {
    // Version-based conflict detection
    if (this.config.conflictResolution === 'version-based') {
      return newState.version <= currentState.version && 
             newState.timestamp < currentState.timestamp + 1000 // 1 second tolerance
    }

    // Concurrent update detection
    const timeDiff = Math.abs(newState.timestamp - currentState.timestamp)
    return timeDiff < 100 && newState.origin !== currentState.origin
  }

  /**
   * Handle state conflict
   */
  private handleStateConflict(currentState: TouchState, newState: TouchState): void {
    const conflictId = `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const conflict: SyncConflict = {
      id: conflictId,
      componentId: currentState.componentId,
      stateId: currentState.id,
      localState: currentState,
      remoteState: newState,
      conflictType: this.getConflictType(currentState, newState),
      resolution: 'pending',
      timestamp: Date.now()
    }

    this.conflicts.set(conflictId, conflict)
    
    // Resolve conflict based on strategy
    this.resolveConflict(conflict)
  }

  /**
   * Determine conflict type
   */
  private getConflictType(currentState: TouchState, newState: TouchState): SyncConflict['conflictType'] {
    if (currentState.version !== newState.version) {
      return 'version-mismatch'
    }
    
    const timeDiff = Math.abs(newState.timestamp - currentState.timestamp)
    if (timeDiff < 100) {
      return 'concurrent-update'
    }
    
    return 'data-divergence'
  }

  /**
   * Resolve state conflict
   */
  private resolveConflict(conflict: SyncConflict): void {
    let resolvedState: TouchState
    let resolution: SyncConflict['resolution']

    switch (this.config.conflictResolution) {
      case 'last-write-wins':
        resolvedState = conflict.localState.timestamp > conflict.remoteState.timestamp
          ? conflict.localState
          : conflict.remoteState
        resolution = resolvedState === conflict.localState ? 'resolved-local' : 'resolved-remote'
        break

      case 'version-based':
        resolvedState = conflict.localState.version > conflict.remoteState.version
          ? conflict.localState
          : conflict.remoteState
        resolution = resolvedState === conflict.localState ? 'resolved-local' : 'resolved-remote'
        break

      case 'component-priority':
        const localPriority = this.getComponentPriority(conflict.localState.componentId)
        const remotePriority = this.getComponentPriority(conflict.remoteState.componentId)
        
        resolvedState = localPriority >= remotePriority ? conflict.localState : conflict.remoteState
        resolution = resolvedState === conflict.localState ? 'resolved-local' : 'resolved-remote'
        break

      case 'manual':
        // Would typically show UI for manual resolution
        resolvedState = this.mergeStates(conflict.localState, conflict.remoteState)
        resolution = 'resolved-merge'
        break

      default:
        resolvedState = conflict.localState
        resolution = 'resolved-local'
        break
    }

    // Apply resolved state
    this.states.set(resolvedState.id, resolvedState)
    conflict.resolution = resolution

    // Notify about conflict resolution
    const conflictEvent: StateEvent = {
      id: `conflict-resolved-${Date.now()}`,
      type: 'state-conflict',
      componentId: conflict.componentId,
      stateId: conflict.stateId,
      oldState: conflict.localState.state,
      newState: resolvedState.state,
      timestamp: Date.now(),
      causedBy: 'conflict-resolution'
    }

    this.notifySubscribers(resolvedState, conflictEvent)

    console.log('TouchStateSynchronizer: Conflict resolved', {
      conflictId: conflict.id,
      resolution,
      strategy: this.config.conflictResolution
    })
  }

  /**
   * Merge two states (simple merge strategy)
   */
  private mergeStates(localState: TouchState, remoteState: TouchState): TouchState {
    // Simple merge - in practice this would be more sophisticated
    const mergedState = {
      ...localState.state,
      ...remoteState.state
    }

    return {
      ...localState,
      state: mergedState,
      version: Math.max(localState.version, remoteState.version) + 1,
      timestamp: Date.now(),
      origin: 'sync',
      metadata: {
        ...localState.metadata,
        ...remoteState.metadata,
        merged: true
      }
    }
  }

  /**
   * Get component priority for conflict resolution
   */
  private getComponentPriority(componentId: string): number {
    return this.componentPriorities[componentId] || 50
  }

  /**
   * Notify subscribers of state changes
   */
  private notifySubscribers(state: TouchState, event: StateEvent): void {
    const subscribers = this.subscriptions.get(state.type) || []
    
    // Sort by priority (highest first)
    const sortedSubscribers = subscribers
      .filter(sub => !sub.filter || sub.filter(state))
      .sort((a, b) => b.priority - a.priority)

    // Notify subscribers using RAF for smooth performance
    safeRequestAnimationFrame(() => {
      sortedSubscribers.forEach(subscriber => {
        try {
          subscriber.callback(state, event)
        } catch (error) {
          console.error('TouchStateSynchronizer: Subscriber callback failed:', error)
        }
      })
    })
  }

  /**
   * Add state to sync queue
   */
  private addToSyncQueue(state: TouchState): void {
    // Remove duplicate states for same component/state ID
    this.syncQueue = this.syncQueue.filter(s => s.id !== state.id)
    this.syncQueue.push(state)
  }

  /**
   * Process sync queue
   */
  private processSyncQueue(): void {
    if (this.isProcessingSync || this.syncQueue.length === 0) {
      return
    }

    this.isProcessingSync = true

    // Process all queued states
    const statesToSync = [...this.syncQueue]
    this.syncQueue = []

    // Group by component for efficient processing
    const statesByComponent = new Map<string, TouchState[]>()
    statesToSync.forEach(state => {
      if (!statesByComponent.has(state.componentId)) {
        statesByComponent.set(state.componentId, [])
      }
      statesByComponent.get(state.componentId)!.push(state)
    })

    // Process each component's states
    statesByComponent.forEach((states, componentId) => {
      this.processComponentSync(componentId, states)
    })

    this.isProcessingSync = false
  }

  /**
   * Process state sync for a component
   */
  private processComponentSync(componentId: string, states: TouchState[]): void {
    // This would typically send states to other components or external sync
    states.forEach(state => {
      this.processStateSync(state)
    })
  }

  /**
   * Process individual state sync
   */
  private processStateSync(state: TouchState): void {
    // This is where you would sync with other components or external systems
    
    // Create sync event
    const syncEvent: StateEvent = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'state-synced',
      componentId: state.componentId,
      stateId: state.id,
      newState: state.state,
      timestamp: Date.now(),
      causedBy: 'sync-process'
    }

    // Add to event history
    if (this.config.enableEventSourcing) {
      this.addToEventHistory(syncEvent)
    }
  }

  /**
   * Add event to history
   */
  private addToEventHistory(event: StateEvent): void {
    this.eventHistory.push(event)
    
    // Limit history size
    if (this.eventHistory.length > this.config.maxEventHistory) {
      this.eventHistory = this.eventHistory.slice(-this.config.maxEventHistory)
    }
  }

  /**
   * Get event history for debugging/replay
   */
  getEventHistory(componentId?: string, limit?: number): StateEvent[] {
    let events = this.eventHistory
    
    if (componentId) {
      events = events.filter(event => event.componentId === componentId)
    }
    
    if (limit) {
      events = events.slice(-limit)
    }
    
    return events
  }

  /**
   * Replay events for state reconstruction
   */
  replayEvents(events: StateEvent[]): void {
    console.log('TouchStateSynchronizer: Replaying events', events.length)
    
    events.forEach(event => {
      // This would reconstruct state from events
      // Implementation depends on specific event sourcing needs
    })
  }

  /**
   * Periodic maintenance
   */
  private performMaintenance(): void {
    const now = Date.now()
    
    // Clean up old conflicts
    for (const [id, conflict] of this.conflicts.entries()) {
      if (now - conflict.timestamp > 300000) { // 5 minutes old
        this.conflicts.delete(id)
      }
    }

    // Clean up old states that are no longer subscribed to
    const activeComponents = new Set<string>()
    for (const subscriptions of this.subscriptions.values()) {
      subscriptions.forEach(sub => activeComponents.add(sub.componentId))
    }

    for (const [stateKey, state] of this.states.entries()) {
      if (!activeComponents.has(state.componentId) && 
          now - state.timestamp > 600000) { // 10 minutes old
        this.states.delete(stateKey)
      }
    }

    console.log('TouchStateSynchronizer: Maintenance completed', {
      activeStates: this.states.size,
      activeConflicts: this.conflicts.size,
      eventHistory: this.eventHistory.length
    })
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    stateCount: number
    conflictCount: number
    eventHistorySize: number
    subscriptionCount: number
  } {
    return {
      stateCount: this.states.size,
      conflictCount: this.conflicts.size,
      eventHistorySize: this.eventHistory.length,
      subscriptionCount: Array.from(this.subscriptions.values())
        .reduce((sum, subs) => sum + subs.length, 0)
    }
  }

  /**
   * Clear all state data
   */
  clear(): void {
    this.states.clear()
    this.eventHistory = []
    this.conflicts.clear()
    this.syncQueue = []
    
    console.log('TouchStateSynchronizer: All state data cleared')
  }

  /**
   * Destroy the state synchronizer
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.clear()
    this.subscriptions.clear()
  }
}

// Singleton instance for global state synchronization
export const touchStateSynchronizer = new TouchStateSynchronizer()

// React hook for touch state synchronization
export function useTouchStateSync() {
  const subscribe = (
    componentId: string,
    stateTypes: string[],
    callback: (state: TouchState, event: StateEvent) => void,
    options?: { priority?: number; filter?: (state: TouchState) => boolean }
  ) => {
    return touchStateSynchronizer.subscribe(componentId, stateTypes, callback, options)
  }

  const updateState = (
    componentId: string,
    stateId: string,
    stateType: string,
    newState: any,
    options?: { optimistic?: boolean; merge?: boolean; metadata?: Record<string, any> }
  ) => {
    touchStateSynchronizer.updateState(componentId, stateId, stateType, newState, options)
  }

  const getState = (componentId: string, stateId: string) => {
    return touchStateSynchronizer.getState(componentId, stateId)
  }

  const getComponentStates = (componentId: string) => {
    return touchStateSynchronizer.getComponentStates(componentId)
  }

  const getStats = () => {
    return touchStateSynchronizer.getSyncStats()
  }

  return {
    subscribe,
    updateState,
    getState,
    getComponentStates,
    getStats
  }
}

export default touchStateSynchronizer