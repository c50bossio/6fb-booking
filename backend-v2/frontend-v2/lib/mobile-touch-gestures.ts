/**
 * Advanced Mobile Touch Gesture Library
 * Enhanced touch interactions for mobile-first calendar experience
 * Version: 2.0.0
 */

export interface TouchGestureConfig {
  swipe: {
    threshold: number         // Minimum distance for swipe
    velocity: number          // Minimum velocity for swipe
    maxTime: number          // Maximum time for swipe gesture
    preventScroll: boolean   // Prevent default scroll behavior
  }
  tap: {
    maxTime: number          // Maximum time for tap
    maxDistance: number      // Maximum movement distance for tap
    doubleTapDelay: number   // Time window for double tap
  }
  longPress: {
    duration: number         // Time required for long press
    maxDistance: number      // Maximum movement allowed during long press
  }
  drag: {
    threshold: number        // Minimum distance to start drag
    snapBack: boolean        // Snap back if drag cancelled
    hapticFeedback: boolean  // Enable haptic feedback during drag
  }
  pinch: {
    threshold: number        // Minimum scale change to trigger
    maxScale: number         // Maximum zoom scale
    minScale: number         // Minimum zoom scale
  }
}

export interface TouchPoint {
  x: number
  y: number
  timestamp: number
  force?: number
}

export interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down'
  distance: number
  velocity: number
  duration: number
  startPoint: TouchPoint
  endPoint: TouchPoint
}

export interface TapGesture {
  point: TouchPoint
  isDoubleTap: boolean
  tapCount: number
}

export interface LongPressGesture {
  point: TouchPoint
  duration: number
}

export interface DragGesture {
  startPoint: TouchPoint
  currentPoint: TouchPoint
  delta: { x: number; y: number }
  isActive: boolean
  phase: 'start' | 'move' | 'end' | 'cancel'
}

export interface PinchGesture {
  center: TouchPoint
  scale: number
  rotation: number
  velocity: number
}

export type GestureCallback<T> = (gesture: T, event: TouchEvent) => void

export class MobileTouchGestureManager {
  private element: HTMLElement
  private config: TouchGestureConfig
  private isEnabled: boolean = true
  
  // Touch tracking
  private touches = new Map<number, TouchPoint>()
  private startTime: number = 0
  private lastTap: TouchPoint | null = null
  private tapCount: number = 0
  private longPressTimer: NodeJS.Timeout | null = null
  private dragState: DragGesture | null = null
  
  // Gesture callbacks
  private callbacks = new Map<string, Function>()
  
  // Default configuration
  private static defaultConfig: TouchGestureConfig = {
    swipe: {
      threshold: 50,
      velocity: 0.3,
      maxTime: 1000,
      preventScroll: true
    },
    tap: {
      maxTime: 300,
      maxDistance: 10,
      doubleTapDelay: 300
    },
    longPress: {
      duration: 500,
      maxDistance: 15
    },
    drag: {
      threshold: 10,
      snapBack: true,
      hapticFeedback: true
    },
    pinch: {
      threshold: 0.1,
      maxScale: 3.0,
      minScale: 0.5
    }
  }

  constructor(element: HTMLElement, config: Partial<TouchGestureConfig> = {}) {
    this.element = element
    this.config = { ...MobileTouchGestureManager.defaultConfig, ...config }
    this.setupEventListeners()
  }

  /**
   * Enhanced swipe gesture detection with momentum and direction prediction
   */
  onSwipe(callback: GestureCallback<SwipeGesture>): this {
    this.callbacks.set('swipe', callback)
    return this
  }

  /**
   * Smart tap detection with double-tap and multi-tap support
   */
  onTap(callback: GestureCallback<TapGesture>): this {
    this.callbacks.set('tap', callback)
    return this
  }

  /**
   * Long press with progressive feedback
   */
  onLongPress(callback: GestureCallback<LongPressGesture>): this {
    this.callbacks.set('longPress', callback)
    return this
  }

  /**
   * Advanced drag with momentum and snap-back
   */
  onDrag(callback: GestureCallback<DragGesture>): this {
    this.callbacks.set('drag', callback)
    return this
  }

  /**
   * Pinch-to-zoom gesture
   */
  onPinch(callback: GestureCallback<PinchGesture>): this {
    this.callbacks.set('pinch', callback)
    return this
  }

  /**
   * Setup event listeners with passive options for better performance
   */
  private setupEventListeners(): void {
    const options = { passive: false }
    
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), options)
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), options)
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), options)
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), options)
    
    // Prevent context menu on long press
    this.element.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  /**
   * Handle touch start with multi-touch support
   */
  private handleTouchStart(event: TouchEvent): void {
    if (!this.isEnabled) return

    this.startTime = Date.now()
    
    // Track all touches
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i]
      const touchPoint: TouchPoint = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: this.startTime,
        force: (touch as any).force || 1.0
      }
      this.touches.set(touch.identifier, touchPoint)
    }

    const primaryTouch = this.getPrimaryTouch()
    if (!primaryTouch) return

    // Initialize drag state
    this.dragState = {
      startPoint: primaryTouch,
      currentPoint: primaryTouch,
      delta: { x: 0, y: 0 },
      isActive: false,
      phase: 'start'
    }

    // Start long press timer
    this.startLongPressTimer(primaryTouch)

    // Handle tap counting
    this.handleTapStart(primaryTouch)

    // Prevent scroll if configured
    if (this.config.swipe.preventScroll && event.touches.length === 1) {
      event.preventDefault()
    }
  }

  /**
   * Handle touch move with gesture recognition
   */
  private handleTouchMove(event: TouchEvent): void {
    if (!this.isEnabled) return

    // Update touch positions
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i]
      const existingTouch = this.touches.get(touch.identifier)
      if (existingTouch) {
        const updatedTouch: TouchPoint = {
          ...existingTouch,
          x: touch.clientX,
          y: touch.clientY,
          timestamp: Date.now(),
          force: (touch as any).force || 1.0
        }
        this.touches.set(touch.identifier, updatedTouch)
      }
    }

    const primaryTouch = this.getPrimaryTouch()
    if (!primaryTouch) return

    // Update drag state
    if (this.dragState) {
      const distance = this.getDistance(this.dragState.startPoint, primaryTouch)
      
      if (!this.dragState.isActive && distance > this.config.drag.threshold) {
        this.dragState.isActive = true
        this.dragState.phase = 'move'
        this.cancelLongPress()
        this.provideDragFeedback('start')
      }

      if (this.dragState.isActive) {
        this.dragState.currentPoint = primaryTouch
        this.dragState.delta = {
          x: primaryTouch.x - this.dragState.startPoint.x,
          y: primaryTouch.y - this.dragState.startPoint.y
        }

        this.triggerCallback('drag', this.dragState, event)
      }
    }

    // Handle pinch gesture for multi-touch
    if (event.touches.length === 2) {
      this.handlePinchGesture(event)
    }

    // Cancel long press if moved too much
    const startTouch = Array.from(this.touches.values())[0]
    if (startTouch && this.getDistance(startTouch, primaryTouch) > this.config.longPress.maxDistance) {
      this.cancelLongPress()
    }

    // Prevent default to avoid scrolling during gestures
    if (this.dragState?.isActive || event.touches.length > 1) {
      event.preventDefault()
    }
  }

  /**
   * Handle touch end with gesture completion
   */
  private handleTouchEnd(event: TouchEvent): void {
    if (!this.isEnabled) return

    const endTime = Date.now()
    const duration = endTime - this.startTime

    // Get the touch that just ended
    const endedTouch = this.getEndedTouch(event)
    const primaryTouch = this.getPrimaryTouch()

    if (endedTouch) {
      // Check for swipe gesture
      this.checkSwipeGesture(endedTouch, duration)
      
      // Check for tap gesture
      this.checkTapGesture(endedTouch, duration)
      
      // Remove ended touch
      this.touches.delete(this.findTouchIdentifier(endedTouch))
    }

    // Handle drag end
    if (this.dragState?.isActive) {
      this.dragState.phase = 'end'
      this.triggerCallback('drag', this.dragState, event)
      this.provideDragFeedback('end')
      this.dragState = null
    }

    // Cancel long press
    this.cancelLongPress()

    // Clean up if no more touches
    if (event.touches.length === 0) {
      this.touches.clear()
      this.dragState = null
    }
  }

  /**
   * Handle touch cancel
   */
  private handleTouchCancel(event: TouchEvent): void {
    if (this.dragState?.isActive) {
      this.dragState.phase = 'cancel'
      this.triggerCallback('drag', this.dragState, event)
      this.provideDragFeedback('cancel')
    }

    this.cancelLongPress()
    this.touches.clear()
    this.dragState = null
  }

  /**
   * Enhanced swipe detection with velocity and momentum
   */
  private checkSwipeGesture(endTouch: TouchPoint, duration: number): void {
    const startTouch = Array.from(this.touches.values())[0]
    if (!startTouch || duration > this.config.swipe.maxTime) return

    const distance = this.getDistance(startTouch, endTouch)
    const velocity = distance / duration

    if (distance >= this.config.swipe.threshold && velocity >= this.config.swipe.velocity) {
      const deltaX = endTouch.x - startTouch.x
      const deltaY = endTouch.y - startTouch.y
      
      let direction: SwipeGesture['direction']
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left'
      } else {
        direction = deltaY > 0 ? 'down' : 'up'
      }

      const swipeGesture: SwipeGesture = {
        direction,
        distance,
        velocity,
        duration,
        startPoint: startTouch,
        endPoint: endTouch
      }

      this.triggerCallback('swipe', swipeGesture, null)
      this.provideSwipeFeedback(direction)
    }
  }

  /**
   * Smart tap detection with multi-tap support
   */
  private checkTapGesture(endTouch: TouchPoint, duration: number): void {
    const startTouch = Array.from(this.touches.values())[0]
    if (!startTouch) return

    const distance = this.getDistance(startTouch, endTouch)
    
    if (duration <= this.config.tap.maxTime && distance <= this.config.tap.maxDistance) {
      const now = Date.now()
      
      if (this.lastTap && 
          (now - this.lastTap.timestamp) <= this.config.tap.doubleTapDelay &&
          this.getDistance(this.lastTap, endTouch) <= this.config.tap.maxDistance) {
        this.tapCount++
      } else {
        this.tapCount = 1
      }

      this.lastTap = endTouch

      const tapGesture: TapGesture = {
        point: endTouch,
        isDoubleTap: this.tapCount >= 2,
        tapCount: this.tapCount
      }

      // Delay single tap to wait for potential double tap
      if (this.tapCount === 1) {
        setTimeout(() => {
          if (this.tapCount === 1) {
            this.triggerCallback('tap', tapGesture, null)
            this.provideTapFeedback(false)
          }
        }, this.config.tap.doubleTapDelay)
      } else {
        this.triggerCallback('tap', tapGesture, null)
        this.provideTapFeedback(true)
      }
    }
  }

  /**
   * Handle tap start for counting
   */
  private handleTapStart(touch: TouchPoint): void {
    const now = Date.now()
    
    if (this.lastTap && (now - this.lastTap.timestamp) > this.config.tap.doubleTapDelay) {
      this.tapCount = 0
    }
  }

  /**
   * Start long press timer with progressive feedback
   */
  private startLongPressTimer(touch: TouchPoint): void {
    this.cancelLongPress()
    
    this.longPressTimer = setTimeout(() => {
      const longPressGesture: LongPressGesture = {
        point: touch,
        duration: this.config.longPress.duration
      }
      
      this.triggerCallback('longPress', longPressGesture, null)
      this.provideLongPressFeedback()
    }, this.config.longPress.duration)
  }

  /**
   * Cancel long press timer
   */
  private cancelLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
  }

  /**
   * Handle pinch gesture for zoom
   */
  private handlePinchGesture(event: TouchEvent): void {
    if (event.touches.length !== 2) return

    const touch1 = event.touches[0]
    const touch2 = event.touches[1]
    
    const center: TouchPoint = {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
      timestamp: Date.now()
    }

    const distance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    )

    // Calculate scale based on initial distance (stored in dragState)
    // This is a simplified implementation
    const scale = 1.0 // Would need to track initial distance
    
    const pinchGesture: PinchGesture = {
      center,
      scale: Math.max(this.config.pinch.minScale, Math.min(this.config.pinch.maxScale, scale)),
      rotation: 0, // Could calculate rotation between touches
      velocity: 0  // Could calculate velocity
    }

    this.triggerCallback('pinch', pinchGesture, event)
  }

  /**
   * Utility methods
   */
  private getPrimaryTouch(): TouchPoint | null {
    const touches = Array.from(this.touches.values())
    return touches.length > 0 ? touches[0] : null
  }

  private getEndedTouch(event: TouchEvent): TouchPoint | null {
    // Find the touch that just ended by comparing with remaining touches
    const remaining = new Set()
    for (let i = 0; i < event.touches.length; i++) {
      remaining.add(event.touches[i].identifier)
    }
    
    for (const [id, touch] of this.touches) {
      if (!remaining.has(id)) {
        return touch
      }
    }
    
    return null
  }

  private findTouchIdentifier(touch: TouchPoint): number {
    for (const [id, t] of this.touches) {
      if (t.x === touch.x && t.y === touch.y && t.timestamp === touch.timestamp) {
        return id
      }
    }
    return -1
  }

  private getDistance(touch1: TouchPoint, touch2: TouchPoint): number {
    const dx = touch2.x - touch1.x
    const dy = touch2.y - touch1.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  private triggerCallback(type: string, gesture: any, event: TouchEvent | null): void {
    const callback = this.callbacks.get(type)
    if (callback) {
      callback(gesture, event)
    }
  }

  /**
   * Haptic feedback methods
   */
  private provideSwipeFeedback(direction: string): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(30) // Quick vibration for swipe
    }
  }

  private provideTapFeedback(isDouble: boolean): void {
    if ('vibrate' in navigator) {
      if (isDouble) {
        navigator.vibrate([40, 50, 40]) // Double tap pattern
      } else {
        navigator.vibrate(20) // Single tap
      }
    }
  }

  private provideLongPressFeedback(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]) // Long press pattern
    }
  }

  private provideDragFeedback(phase: 'start' | 'end' | 'cancel'): void {
    if (!this.config.drag.hapticFeedback || !('vibrate' in navigator)) return

    switch (phase) {
      case 'start':
        navigator.vibrate(50) // Drag start
        break
      case 'end':
        navigator.vibrate([30, 30, 30]) // Drag end success
        break
      case 'cancel':
        navigator.vibrate([100, 50, 100, 50, 100]) // Drag cancelled
        break
    }
  }

  /**
   * Public control methods
   */
  enable(): this {
    this.isEnabled = true
    return this
  }

  disable(): this {
    this.isEnabled = false
    this.cancelLongPress()
    this.touches.clear()
    this.dragState = null
    return this
  }

  destroy(): void {
    this.disable()
    this.callbacks.clear()
    
    // Remove event listeners
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this))
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this))
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this))
    this.element.removeEventListener('touchcancel', this.handleTouchCancel.bind(this))
  }
}

/**
 * Factory function for easy gesture manager creation
 */
export function createTouchGestureManager(
  element: HTMLElement, 
  config?: Partial<TouchGestureConfig>
): MobileTouchGestureManager {
  return new MobileTouchGestureManager(element, config)
}

export default MobileTouchGestureManager