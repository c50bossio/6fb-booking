/**
 * Advanced gesture conflict resolution system
 * Prevents conflicts between different touch interactions and provides priority-based resolution
 */

import { browserCompatibility, safeRequestAnimationFrame } from './browser-compatibility'

export interface GestureState {
  id: string
  type: 'tap' | 'swipe' | 'pinch' | 'longPress' | 'drag' | 'scroll'
  priority: number
  startTime: number
  element: HTMLElement
  touchPoints: Touch[]
  metadata: Record<string, any>
}

export interface ConflictResolution {
  winner: GestureState
  suppressed: GestureState[]
  reason: string
  confidence: number
}

export type GestureConflictHandler = (conflict: ConflictResolution) => void

class GestureConflictResolver {
  private activeGestures: Map<string, GestureState> = new Map()
  private conflictHandlers: Set<GestureConflictHandler> = new Set()
  private cleanupInterval: NodeJS.Timer | null = null
  private readonly maxActiveGestures = 50 // Prevent memory issues
  private readonly maxHandlers = 10 // Limit conflict handlers
  private priorityMatrix: Record<string, Record<string, number>> = {
    // Higher numbers win conflicts
    'tap': { 'scroll': 0, 'swipe': 0, 'drag': 0, 'pinch': 0, 'longPress': 1 },
    'scroll': { 'tap': 1, 'swipe': 0, 'drag': 0, 'pinch': 0, 'longPress': 0 },
    'swipe': { 'tap': 1, 'scroll': 1, 'drag': 0, 'pinch': 0, 'longPress': 0 },
    'drag': { 'tap': 1, 'scroll': 1, 'swipe': 1, 'pinch': 0, 'longPress': 1 },
    'pinch': { 'tap': 1, 'scroll': 1, 'swipe': 1, 'drag': 1, 'longPress': 1 },
    'longPress': { 'tap': 0, 'scroll': 1, 'swipe': 1, 'drag': 0, 'pinch': 0 }
  }

  private conflictThresholds = {
    spatialOverlap: 0.3, // 30% touch point overlap
    temporalOverlap: 150, // 150ms time overlap
    elementDistance: 100, // 100px element distance
    velocityDifference: 0.5 // 50% velocity difference
  }

  constructor() {
    // Set up automatic cleanup every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.performPeriodicCleanup()
    }, 30000)
  }

  /**
   * Register a new gesture and check for conflicts
   */
  registerGesture(gesture: GestureState): ConflictResolution | null {
    // Clean up expired gestures
    this.cleanupExpiredGestures()

    const conflicts = this.detectConflicts(gesture)
    
    if (conflicts.length === 0) {
      this.activeGestures.set(gesture.id, gesture)
      return null
    }

    const resolution = this.resolveConflicts(gesture, conflicts)
    
    // Apply resolution
    this.applyResolution(resolution)
    
    // Notify handlers
    this.conflictHandlers.forEach(handler => handler(resolution))
    
    return resolution
  }

  /**
   * Update existing gesture state
   */
  updateGesture(gestureId: string, updates: Partial<GestureState>): void {
    const gesture = this.activeGestures.get(gestureId)
    if (gesture) {
      Object.assign(gesture, updates)
    }
  }

  /**
   * Remove gesture from tracking
   */
  unregisterGesture(gestureId: string): void {
    this.activeGestures.delete(gestureId)
  }

  /**
   * Add conflict resolution handler
   */
  addConflictHandler(handler: GestureConflictHandler): void {
    if (this.conflictHandlers.size >= this.maxHandlers) {
      console.warn('Maximum conflict handlers reached, removing oldest')
      const firstHandler = this.conflictHandlers.values().next().value
      this.conflictHandlers.delete(firstHandler)
    }
    this.conflictHandlers.add(handler)
  }

  /**
   * Remove conflict resolution handler
   */
  removeConflictHandler(handler: GestureConflictHandler): void {
    this.conflictHandlers.delete(handler)
  }

  /**
   * Get current active gestures
   */
  getActiveGestures(): GestureState[] {
    return Array.from(this.activeGestures.values())
  }

  /**
   * Detect conflicts between new gesture and active gestures
   */
  private detectConflicts(newGesture: GestureState): GestureState[] {
    const conflicts: GestureState[] = []
    
    for (const [id, activeGesture] of this.activeGestures) {
      if (this.hasConflict(newGesture, activeGesture)) {
        conflicts.push(activeGesture)
      }
    }
    
    return conflicts
  }

  /**
   * Check if two gestures conflict
   */
  private hasConflict(gesture1: GestureState, gesture2: GestureState): boolean {
    // Check spatial overlap
    if (this.hasSpatialOverlap(gesture1, gesture2)) {
      return true
    }

    // Check temporal overlap
    if (this.hasTemporalOverlap(gesture1, gesture2)) {
      return true
    }

    // Check element hierarchy conflicts
    if (this.hasElementConflict(gesture1, gesture2)) {
      return true
    }

    // Check gesture type compatibility
    if (this.hasTypeConflict(gesture1, gesture2)) {
      return true
    }

    return false
  }

  /**
   * Check for spatial overlap between touch points
   */
  private hasSpatialOverlap(gesture1: GestureState, gesture2: GestureState): boolean {
    const threshold = this.conflictThresholds.spatialOverlap
    
    for (const touch1 of gesture1.touchPoints) {
      for (const touch2 of gesture2.touchPoints) {
        const distance = Math.sqrt(
          Math.pow(touch1.clientX - touch2.clientX, 2) +
          Math.pow(touch1.clientY - touch2.clientY, 2)
        )
        
        // Calculate overlap based on typical finger size (44px)
        const fingerRadius = 22
        const overlapDistance = (fingerRadius * 2) * threshold
        
        if (distance < overlapDistance) {
          return true
        }
      }
    }
    
    return false
  }

  /**
   * Check for temporal overlap
   */
  private hasTemporalOverlap(gesture1: GestureState, gesture2: GestureState): boolean {
    const now = Date.now()
    const threshold = this.conflictThresholds.temporalOverlap
    
    const timeDiff = Math.abs(gesture1.startTime - gesture2.startTime)
    return timeDiff < threshold
  }

  /**
   * Check for element hierarchy conflicts
   */
  private hasElementConflict(gesture1: GestureState, gesture2: GestureState): boolean {
    // Check if elements are the same or parent/child relationship
    if (gesture1.element === gesture2.element) {
      return true
    }
    
    if (gesture1.element.contains(gesture2.element) || 
        gesture2.element.contains(gesture1.element)) {
      return true
    }
    
    // Check if elements are close enough to cause conflicts
    const rect1 = gesture1.element.getBoundingClientRect()
    const rect2 = gesture2.element.getBoundingClientRect()
    
    const distance = Math.sqrt(
      Math.pow(rect1.left - rect2.left, 2) +
      Math.pow(rect1.top - rect2.top, 2)
    )
    
    return distance < this.conflictThresholds.elementDistance
  }

  /**
   * Check for gesture type conflicts
   */
  private hasTypeConflict(gesture1: GestureState, gesture2: GestureState): boolean {
    // Some gesture combinations are inherently conflicting
    const conflictingCombinations = [
      ['scroll', 'swipe'],
      ['drag', 'pinch'],
      ['tap', 'longPress'],
      ['scroll', 'drag']
    ]
    
    return conflictingCombinations.some(([type1, type2]) => 
      (gesture1.type === type1 && gesture2.type === type2) ||
      (gesture1.type === type2 && gesture2.type === type1)
    )
  }

  /**
   * Resolve conflicts using priority matrix and context
   */
  private resolveConflicts(newGesture: GestureState, conflicts: GestureState[]): ConflictResolution {
    const candidates = [newGesture, ...conflicts]
    
    // Sort by priority (higher wins)
    candidates.sort((a, b) => {
      // Base priority from gesture type
      const basePriorityA = this.getBasePriority(a.type)
      const basePriorityB = this.getBasePriority(b.type)
      
      if (basePriorityA !== basePriorityB) {
        return basePriorityB - basePriorityA
      }
      
      // Context-specific priority
      const contextPriorityA = this.getContextPriority(a)
      const contextPriorityB = this.getContextPriority(b)
      
      if (contextPriorityA !== contextPriorityB) {
        return contextPriorityB - contextPriorityA
      }
      
      // User intent confidence (newer gestures often indicate clearer intent)
      return b.startTime - a.startTime
    })
    
    const winner = candidates[0]
    const suppressed = candidates.slice(1)
    
    return {
      winner,
      suppressed,
      reason: this.generateResolutionReason(winner, suppressed),
      confidence: this.calculateResolutionConfidence(winner, suppressed)
    }
  }

  /**
   * Get base priority for gesture type
   */
  private getBasePriority(gestureType: string): number {
    const priorities = {
      'pinch': 100, // Zoom is usually intentional
      'longPress': 90, // Context menu is deliberate
      'drag': 80, // Drag operations are usually intentional
      'swipe': 70, // Navigation gestures
      'tap': 60, // Simple interactions
      'scroll': 50 // Background scrolling
    }
    
    return priorities[gestureType] || 0
  }

  /**
   * Get context-specific priority adjustments
   */
  private getContextPriority(gesture: GestureState): number {
    let priority = 0
    
    // Calendar-specific context
    if (gesture.element.classList.contains('unified-calendar-appointment')) {
      priority += 20 // Appointment interactions are high priority
    }
    
    if (gesture.element.classList.contains('calendar-time-slot')) {
      priority += 15 // Time slot interactions
    }
    
    if (gesture.element.closest('.touch-context-menu')) {
      priority += 25 // Context menu interactions are very high priority
    }
    
    // Touch prediction confidence boost
    if (gesture.metadata.predictedGesture && gesture.metadata.predictionConfidence > 0.8) {
      priority += 10
    }
    
    return priority
  }

  /**
   * Apply conflict resolution
   */
  private applyResolution(resolution: ConflictResolution): void {
    // Keep the winner
    this.activeGestures.set(resolution.winner.id, resolution.winner)
    
    // Remove suppressed gestures
    resolution.suppressed.forEach(gesture => {
      this.activeGestures.delete(gesture.id)
      
      // Trigger suppression handlers if available
      if (gesture.metadata.onSuppressed) {
        gesture.metadata.onSuppressed(resolution.reason)
      }
    })
  }

  /**
   * Generate human-readable resolution reason
   */
  private generateResolutionReason(winner: GestureState, suppressed: GestureState[]): string {
    const suppressedTypes = suppressed.map(g => g.type).join(', ')
    
    if (suppressed.length === 1) {
      return `${winner.type} took priority over ${suppressedTypes} due to higher context relevance`
    } else {
      return `${winner.type} resolved conflict with multiple gestures: ${suppressedTypes}`
    }
  }

  /**
   * Calculate confidence in resolution decision
   */
  private calculateResolutionConfidence(winner: GestureState, suppressed: GestureState[]): number {
    let confidence = 0.5 // Base confidence
    
    // Increase confidence for clear priority differences
    const priorityDiff = this.getBasePriority(winner.type) - 
                        Math.max(...suppressed.map(g => this.getBasePriority(g.type)))
    
    if (priorityDiff > 20) confidence += 0.3
    else if (priorityDiff > 10) confidence += 0.2
    else if (priorityDiff > 0) confidence += 0.1
    
    // Increase confidence for prediction matches
    if (winner.metadata.predictedGesture === winner.type) {
      confidence += 0.2
    }
    
    // Increase confidence for clear user intent
    if (winner.metadata.userIntentClear) {
      confidence += 0.15
    }
    
    return Math.min(1.0, confidence)
  }

  /**
   * Clean up gestures that have been inactive too long
   */
  private cleanupExpiredGestures(): void {
    const now = Date.now()
    const maxAge = 5000 // 5 seconds
    
    for (const [id, gesture] of this.activeGestures) {
      if (now - gesture.startTime > maxAge) {
        this.activeGestures.delete(id)
      }
    }
    
    // If we have too many active gestures, remove oldest ones
    if (this.activeGestures.size > this.maxActiveGestures) {
      const entries = Array.from(this.activeGestures.entries())
      entries.sort((a, b) => a[1].startTime - b[1].startTime)
      const removeCount = this.activeGestures.size - this.maxActiveGestures
      
      for (let i = 0; i < removeCount; i++) {
        this.activeGestures.delete(entries[i][0])
      }
    }
  }

  /**
   * Periodic cleanup to prevent memory leaks
   */
  private performPeriodicCleanup(): void {
    this.cleanupExpiredGestures()
    
    // Clean up orphaned handlers (optional additional check)
    if (this.conflictHandlers.size > this.maxHandlers) {
      console.warn('Too many conflict handlers, clearing some')
      const handlers = Array.from(this.conflictHandlers)
      this.conflictHandlers.clear()
      // Keep only the most recent handlers
      handlers.slice(-Math.floor(this.maxHandlers / 2)).forEach(handler => {
        this.conflictHandlers.add(handler)
      })
    }
  }

  /**
   * Destroy the resolver and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    
    this.activeGestures.clear()
    this.conflictHandlers.clear()
  }

  /**
   * Get conflict statistics for debugging
   */
  getConflictStats(): {
    activeGestureCount: number
    conflictResolutionCount: number
    avgResolutionConfidence: number
  } {
    // This would be implemented with actual tracking
    return {
      activeGestureCount: this.activeGestures.size,
      conflictResolutionCount: 0, // Would track this
      avgResolutionConfidence: 0.8 // Would calculate average
    }
  }
}

// Singleton instance for global gesture conflict resolution
export const gestureConflictResolver = new GestureConflictResolver()

// Helper hook for React components
export function useGestureConflictResolution() {
  const registerGesture = (gesture: Omit<GestureState, 'id' | 'startTime'>) => {
    return gestureConflictResolver.registerGesture({
      ...gesture,
      id: `gesture-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now()
    })
  }

  const updateGesture = (gestureId: string, updates: Partial<GestureState>) => {
    gestureConflictResolver.updateGesture(gestureId, updates)
  }

  const unregisterGesture = (gestureId: string) => {
    gestureConflictResolver.unregisterGesture(gestureId)
  }

  return {
    registerGesture,
    updateGesture,
    unregisterGesture,
    getActiveGestures: () => gestureConflictResolver.getActiveGestures(),
    getStats: () => gestureConflictResolver.getConflictStats()
  }
}

export default gestureConflictResolver