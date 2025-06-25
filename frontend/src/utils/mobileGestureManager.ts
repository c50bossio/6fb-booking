/**
 * Mobile Gesture Manager
 *
 * Comprehensive touch gesture management for mobile calendar interactions
 * with support for complex multi-touch gestures and platform-specific behaviors.
 */

export interface GestureEvent {
  type: 'swipe' | 'pinch' | 'rotate' | 'pan' | 'tap' | 'doubletap' | 'longpress'
  timestamp: number
  duration: number
  distance?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  angle?: number
  scale?: number
  rotation?: number
  velocity?: number
  touches: Array<{
    id: number
    startX: number
    startY: number
    currentX: number
    currentY: number
    deltaX: number
    deltaY: number
  }>
}

export interface GestureConfig {
  // Thresholds
  swipeThreshold: number
  swipeVelocityThreshold: number
  tapTimeout: number
  doubleTapTimeout: number
  longPressTimeout: number
  pinchThreshold: number
  rotateThreshold: number

  // Enable/disable gestures
  enableSwipe: boolean
  enablePinch: boolean
  enableRotate: boolean
  enablePan: boolean
  enableTap: boolean
  enableDoubleTap: boolean
  enableLongPress: boolean

  // Platform-specific
  preventDefaultEvents: boolean
  stopPropagation: boolean
  passive: boolean
}

const DEFAULT_CONFIG: GestureConfig = {
  swipeThreshold: 50,
  swipeVelocityThreshold: 0.3,
  tapTimeout: 250,
  doubleTapTimeout: 300,
  longPressTimeout: 500,
  pinchThreshold: 0.1,
  rotateThreshold: 15,

  enableSwipe: true,
  enablePinch: true,
  enableRotate: true,
  enablePan: true,
  enableTap: true,
  enableDoubleTap: true,
  enableLongPress: true,

  preventDefaultEvents: true,
  stopPropagation: false,
  passive: false
}

export class MobileGestureManager {
  private element: HTMLElement
  private config: GestureConfig
  private listeners: Map<string, Set<(event: GestureEvent) => void>>
  private touches: Map<number, Touch>
  private gestureState: {
    isActive: boolean
    startTime: number
    lastTapTime: number
    initialDistance: number
    initialAngle: number
    isPanning: boolean
    isLongPressing: boolean
    longPressTimer?: NodeJS.Timeout
  }

  constructor(element: HTMLElement, config: Partial<GestureConfig> = {}) {
    this.element = element
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.listeners = new Map()
    this.touches = new Map()
    this.gestureState = {
      isActive: false,
      startTime: 0,
      lastTapTime: 0,
      initialDistance: 0,
      initialAngle: 0,
      isPanning: false,
      isLongPressing: false
    }

    this.setupEventListeners()
  }

  private setupEventListeners() {
    const options = { passive: this.config.passive }

    // Touch events
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), options)
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), options)
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), options)
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), options)

    // Pointer events (for devices that support them)
    if ('PointerEvent' in window) {
      this.element.addEventListener('pointerdown', this.handlePointerDown.bind(this), options)
      this.element.addEventListener('pointermove', this.handlePointerMove.bind(this), options)
      this.element.addEventListener('pointerup', this.handlePointerUp.bind(this), options)
      this.element.addEventListener('pointercancel', this.handlePointerCancel.bind(this), options)
    }

    // Prevent context menu on long press
    this.element.addEventListener('contextmenu', (e) => {
      if (this.config.preventDefaultEvents) {
        e.preventDefault()
      }
    })
  }

  public on(eventType: GestureEvent['type'], callback: (event: GestureEvent) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(callback)
  }

  public off(eventType: GestureEvent['type'], callback: (event: GestureEvent) => void) {
    this.listeners.get(eventType)?.delete(callback)
  }

  private emit(event: GestureEvent) {
    const callbacks = this.listeners.get(event.type)
    if (callbacks) {
      callbacks.forEach(callback => callback(event))
    }
  }

  private handleTouchStart(e: TouchEvent) {
    if (this.config.preventDefaultEvents) {
      e.preventDefault()
    }

    // Store all touches
    Array.from(e.touches).forEach(touch => {
      this.touches.set(touch.identifier, touch)
    })

    this.gestureState.isActive = true
    this.gestureState.startTime = Date.now()

    // Handle different touch counts
    if (e.touches.length === 1 && this.config.enableLongPress) {
      // Start long press timer for single touch
      this.gestureState.longPressTimer = setTimeout(() => {
        if (this.gestureState.isActive && !this.gestureState.isPanning) {
          this.gestureState.isLongPressing = true
          const touch = e.touches[0]
          this.emit({
            type: 'longpress',
            timestamp: Date.now(),
            duration: this.config.longPressTimeout,
            touches: [{
              id: touch.identifier,
              startX: touch.clientX,
              startY: touch.clientY,
              currentX: touch.clientX,
              currentY: touch.clientY,
              deltaX: 0,
              deltaY: 0
            }]
          })
        }
      }, this.config.longPressTimeout)
    } else if (e.touches.length === 2) {
      // Initialize pinch/rotate
      const [touch1, touch2] = Array.from(e.touches)
      this.gestureState.initialDistance = this.getDistance(touch1, touch2)
      this.gestureState.initialAngle = this.getAngle(touch1, touch2)
    }
  }

  private handleTouchMove(e: TouchEvent) {
    if (!this.gestureState.isActive) return

    if (this.config.preventDefaultEvents) {
      e.preventDefault()
    }

    // Update touches
    Array.from(e.touches).forEach(touch => {
      this.touches.set(touch.identifier, touch)
    })

    // Cancel long press if movement detected
    if (this.gestureState.longPressTimer && !this.gestureState.isLongPressing) {
      const touch = e.touches[0]
      const startTouch = this.touches.get(touch.identifier)
      if (startTouch) {
        const distance = Math.sqrt(
          Math.pow(touch.clientX - startTouch.clientX, 2) +
          Math.pow(touch.clientY - startTouch.clientY, 2)
        )
        if (distance > 10) {
          clearTimeout(this.gestureState.longPressTimer)
          this.gestureState.longPressTimer = undefined
          this.gestureState.isPanning = true
        }
      }
    }

    // Handle gestures based on touch count
    if (e.touches.length === 1 && this.config.enablePan) {
      this.handlePan(e.touches[0])
    } else if (e.touches.length === 2) {
      const [touch1, touch2] = Array.from(e.touches)

      if (this.config.enablePinch) {
        this.handlePinch(touch1, touch2)
      }

      if (this.config.enableRotate) {
        this.handleRotate(touch1, touch2)
      }
    }
  }

  private handleTouchEnd(e: TouchEvent) {
    if (this.config.preventDefaultEvents) {
      e.preventDefault()
    }

    // Clear long press timer
    if (this.gestureState.longPressTimer) {
      clearTimeout(this.gestureState.longPressTimer)
    }

    const duration = Date.now() - this.gestureState.startTime

    // Handle tap/double tap for single touch
    if (e.changedTouches.length === 1 && !this.gestureState.isPanning && !this.gestureState.isLongPressing) {
      const touch = e.changedTouches[0]

      // Check for double tap
      if (this.config.enableDoubleTap &&
          Date.now() - this.gestureState.lastTapTime < this.config.doubleTapTimeout) {
        this.emit({
          type: 'doubletap',
          timestamp: Date.now(),
          duration: 0,
          touches: [{
            id: touch.identifier,
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
            deltaX: 0,
            deltaY: 0
          }]
        })
        this.gestureState.lastTapTime = 0
      } else if (this.config.enableTap && duration < this.config.tapTimeout) {
        // Single tap
        this.emit({
          type: 'tap',
          timestamp: Date.now(),
          duration,
          touches: [{
            id: touch.identifier,
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
            deltaX: 0,
            deltaY: 0
          }]
        })
        this.gestureState.lastTapTime = Date.now()
      }
    }

    // Handle swipe
    if (this.config.enableSwipe && e.changedTouches.length === 1 && this.gestureState.isPanning) {
      const touch = e.changedTouches[0]
      const startTouch = this.touches.get(touch.identifier)

      if (startTouch) {
        const deltaX = touch.clientX - startTouch.clientX
        const deltaY = touch.clientY - startTouch.clientY
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        const velocity = distance / duration

        if (distance > this.config.swipeThreshold && velocity > this.config.swipeVelocityThreshold) {
          const direction = this.getSwipeDirection(deltaX, deltaY)

          this.emit({
            type: 'swipe',
            timestamp: Date.now(),
            duration,
            distance,
            direction,
            velocity,
            touches: [{
              id: touch.identifier,
              startX: startTouch.clientX,
              startY: startTouch.clientY,
              currentX: touch.clientX,
              currentY: touch.clientY,
              deltaX,
              deltaY
            }]
          })
        }
      }
    }

    // Remove ended touches
    Array.from(e.changedTouches).forEach(touch => {
      this.touches.delete(touch.identifier)
    })

    // Reset state if no more touches
    if (e.touches.length === 0) {
      this.resetGestureState()
    }
  }

  private handleTouchCancel(e: TouchEvent) {
    this.resetGestureState()
  }

  private handlePan(touch: Touch) {
    const startTouch = this.touches.get(touch.identifier)
    if (!startTouch) return

    const deltaX = touch.clientX - startTouch.clientX
    const deltaY = touch.clientY - startTouch.clientY

    this.emit({
      type: 'pan',
      timestamp: Date.now(),
      duration: Date.now() - this.gestureState.startTime,
      touches: [{
        id: touch.identifier,
        startX: startTouch.clientX,
        startY: startTouch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        deltaX,
        deltaY
      }]
    })
  }

  private handlePinch(touch1: Touch, touch2: Touch) {
    const currentDistance = this.getDistance(touch1, touch2)
    const scale = currentDistance / this.gestureState.initialDistance

    if (Math.abs(scale - 1) > this.config.pinchThreshold) {
      this.emit({
        type: 'pinch',
        timestamp: Date.now(),
        duration: Date.now() - this.gestureState.startTime,
        scale,
        touches: [
          {
            id: touch1.identifier,
            startX: touch1.clientX,
            startY: touch1.clientY,
            currentX: touch1.clientX,
            currentY: touch1.clientY,
            deltaX: 0,
            deltaY: 0
          },
          {
            id: touch2.identifier,
            startX: touch2.clientX,
            startY: touch2.clientY,
            currentX: touch2.clientX,
            currentY: touch2.clientY,
            deltaX: 0,
            deltaY: 0
          }
        ]
      })
    }
  }

  private handleRotate(touch1: Touch, touch2: Touch) {
    const currentAngle = this.getAngle(touch1, touch2)
    const rotation = currentAngle - this.gestureState.initialAngle

    if (Math.abs(rotation) > this.config.rotateThreshold) {
      this.emit({
        type: 'rotate',
        timestamp: Date.now(),
        duration: Date.now() - this.gestureState.startTime,
        rotation,
        angle: currentAngle,
        touches: [
          {
            id: touch1.identifier,
            startX: touch1.clientX,
            startY: touch1.clientY,
            currentX: touch1.clientX,
            currentY: touch1.clientY,
            deltaX: 0,
            deltaY: 0
          },
          {
            id: touch2.identifier,
            startX: touch2.clientX,
            startY: touch2.clientY,
            currentX: touch2.clientX,
            currentY: touch2.clientY,
            deltaX: 0,
            deltaY: 0
          }
        ]
      })
    }
  }

  // Pointer event handlers (for compatibility)
  private handlePointerDown(e: PointerEvent) {
    if (e.pointerType === 'touch') {
      this.handleTouchStart(e as any)
    }
  }

  private handlePointerMove(e: PointerEvent) {
    if (e.pointerType === 'touch') {
      this.handleTouchMove(e as any)
    }
  }

  private handlePointerUp(e: PointerEvent) {
    if (e.pointerType === 'touch') {
      this.handleTouchEnd(e as any)
    }
  }

  private handlePointerCancel(e: PointerEvent) {
    if (e.pointerType === 'touch') {
      this.handleTouchCancel(e as any)
    }
  }

  // Utility methods
  private getDistance(touch1: Touch, touch2: Touch): number {
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    )
  }

  private getAngle(touch1: Touch, touch2: Touch): number {
    return Math.atan2(
      touch2.clientY - touch1.clientY,
      touch2.clientX - touch1.clientX
    ) * 180 / Math.PI
  }

  private getSwipeDirection(deltaX: number, deltaY: number): 'up' | 'down' | 'left' | 'right' {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left'
    } else {
      return deltaY > 0 ? 'down' : 'up'
    }
  }

  private resetGestureState() {
    this.gestureState = {
      isActive: false,
      startTime: 0,
      lastTapTime: this.gestureState.lastTapTime,
      initialDistance: 0,
      initialAngle: 0,
      isPanning: false,
      isLongPressing: false
    }
    this.touches.clear()
  }

  public destroy() {
    // Remove all event listeners
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this))
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this))
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this))
    this.element.removeEventListener('touchcancel', this.handleTouchCancel.bind(this))

    if ('PointerEvent' in window) {
      this.element.removeEventListener('pointerdown', this.handlePointerDown.bind(this))
      this.element.removeEventListener('pointermove', this.handlePointerMove.bind(this))
      this.element.removeEventListener('pointerup', this.handlePointerUp.bind(this))
      this.element.removeEventListener('pointercancel', this.handlePointerCancel.bind(this))
    }

    // Clear state
    this.listeners.clear()
    this.touches.clear()
    if (this.gestureState.longPressTimer) {
      clearTimeout(this.gestureState.longPressTimer)
    }
  }
}

// Factory function for easy initialization
export function createGestureManager(
  element: HTMLElement,
  config?: Partial<GestureConfig>
): MobileGestureManager {
  return new MobileGestureManager(element, config)
}

// Gesture detection utilities
export const GestureUtils = {
  isHorizontalSwipe(gesture: GestureEvent): boolean {
    return gesture.type === 'swipe' &&
           (gesture.direction === 'left' || gesture.direction === 'right')
  },

  isVerticalSwipe(gesture: GestureEvent): boolean {
    return gesture.type === 'swipe' &&
           (gesture.direction === 'up' || gesture.direction === 'down')
  },

  isPinchIn(gesture: GestureEvent): boolean {
    return gesture.type === 'pinch' && gesture.scale! < 1
  },

  isPinchOut(gesture: GestureEvent): boolean {
    return gesture.type === 'pinch' && gesture.scale! > 1
  },

  isClockwiseRotation(gesture: GestureEvent): boolean {
    return gesture.type === 'rotate' && gesture.rotation! > 0
  },

  isCounterClockwiseRotation(gesture: GestureEvent): boolean {
    return gesture.type === 'rotate' && gesture.rotation! < 0
  }
}
