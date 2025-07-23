/**
 * Component Integration Manager
 * Resolves conflicts between touch components like SwipeReveal, TouchEnhancements, and Drag operations
 */

import { useGestureConflictResolution, type GestureState } from './gesture-conflict-resolver'
import { useCallback, useRef, useEffect, useState } from 'react'
import { browserCompatibility } from './browser-compatibility'

export interface ComponentIntegrationState {
  isDragging: boolean
  isSwipeRevealed: boolean
  isLongPressing: boolean
  isDoubleTapping: boolean
  activeComponent: 'none' | 'drag' | 'swipe' | 'longPress' | 'doubleTap'
  allowedGestures: Set<string>
  touchStartTime: number
  lastTouchPosition: { x: number; y: number } | null
}

export interface ComponentIntegrationConfig {
  enableDrag: boolean
  enableSwipe: boolean
  enableLongPress: boolean
  enableDoubleTap: boolean
  dragPriority: number
  swipePriority: number
  longPressPriority: number
  doubleTapPriority: number
  conflictResolutionStrategy: 'priority' | 'temporal' | 'spatial'
  gestureTimeout: number
  minimumMovement: number
}

const DEFAULT_CONFIG: ComponentIntegrationConfig = {
  enableDrag: true,
  enableSwipe: true,
  enableLongPress: true,
  enableDoubleTap: true,
  dragPriority: 80,
  swipePriority: 70,
  longPressPriority: 90,
  doubleTapPriority: 60,
  conflictResolutionStrategy: 'priority',
  gestureTimeout: 500,
  minimumMovement: 10
}

export interface IntegratedGestureHandlers {
  onTouchStart: (event: TouchEvent) => void
  onTouchMove: (event: TouchEvent) => void
  onTouchEnd: (event: TouchEvent) => void
  onMouseDown: (event: MouseEvent) => void
  onMouseMove: (event: MouseEvent) => void
  onMouseUp: (event: MouseEvent) => void
  onDragStart: (event: DragEvent) => void
  onDragEnd: (event: DragEvent) => void
}

export function useComponentIntegration(
  element: React.RefObject<HTMLElement>,
  config: Partial<ComponentIntegrationConfig> = {},
  callbacks: {
    onDrag?: (gesture: any) => void
    onSwipe?: (gesture: any) => void
    onLongPress?: (gesture: any) => void
    onDoubleTap?: (gesture: any) => void
    onConflictResolved?: (resolution: any) => void
  } = {}
) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  const [state, setState] = useState<ComponentIntegrationState>({
    isDragging: false,
    isSwipeRevealed: false,
    isLongPressing: false,
    isDoubleTapping: false,
    activeComponent: 'none',
    allowedGestures: new Set(['drag', 'swipe', 'longPress', 'doubleTap']),
    touchStartTime: 0,
    lastTouchPosition: null
  })

  const gestureResolver = useGestureConflictResolution()
  const activeGestureId = useRef<string | null>(null)
  const gestureStartTime = useRef<number>(0)
  const initialTouchPosition = useRef<{ x: number; y: number } | null>(null)
  const gestureTimeout = useRef<NodeJS.Timeout | null>(null)

  // Clear any active gesture timeout
  const clearGestureTimeout = useCallback(() => {
    if (gestureTimeout.current) {
      clearTimeout(gestureTimeout.current)
      gestureTimeout.current = null
    }
  }, [])

  // Register a gesture with the conflict resolver
  const registerGesture = useCallback((
    type: 'drag' | 'swipe' | 'longPress' | 'doubleTap',
    touchPoints: Touch[],
    metadata: Record<string, any> = {}
  ) => {
    if (!element.current) return null

    const gestureState: Omit<GestureState, 'id' | 'startTime'> = {
      type,
      priority: fullConfig[`${type}Priority` as keyof ComponentIntegrationConfig] as number,
      element: element.current,
      touchPoints,
      metadata: {
        ...metadata,
        component: 'componentIntegration',
        onSuppressed: (reason: string) => {
          console.log(`Gesture ${type} suppressed: ${reason}`)
          resetGestureState()
        }
      }
    }

    const resolution = gestureResolver.registerGesture(gestureState)
    
    if (resolution) {
      callbacks.onConflictResolved?.(resolution)
      
      // If this gesture won, proceed
      if (resolution.winner.type === type) {
        return resolution.winner.id
      } else {
        // This gesture was suppressed
        return null
      }
    }

    // No conflict, gesture is allowed
    return gestureState.metadata.id || `${type}-${Date.now()}`
  }, [element, fullConfig, gestureResolver, callbacks])

  // Reset gesture state
  const resetGestureState = useCallback(() => {
    clearGestureTimeout()
    
    if (activeGestureId.current) {
      gestureResolver.unregisterGesture(activeGestureId.current)
      activeGestureId.current = null
    }

    setState(prev => ({
      ...prev,
      isDragging: false,
      isSwipeRevealed: false,
      isLongPressing: false,
      isDoubleTapping: false,
      activeComponent: 'none',
      lastTouchPosition: null
    }))

    gestureStartTime.current = 0
    initialTouchPosition.current = null
  }, [clearGestureTimeout, gestureResolver])

  // Handle touch start with gesture coordination
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!element.current || event.touches.length === 0) return

    const touch = event.touches[0]
    const now = Date.now()
    
    gestureStartTime.current = now
    initialTouchPosition.current = { x: touch.clientX, y: touch.clientY }
    
    setState(prev => ({
      ...prev,
      touchStartTime: now,
      lastTouchPosition: { x: touch.clientX, y: touch.clientY }
    }))

    // Set up gesture timeout for long press detection
    if (fullConfig.enableLongPress) {
      gestureTimeout.current = setTimeout(() => {
        if (initialTouchPosition.current && !state.activeComponent || state.activeComponent === 'none') {
          const gestureId = registerGesture('longPress', Array.from(event.touches), {
            startX: touch.clientX,
            startY: touch.clientY,
            duration: now - gestureStartTime.current
          })

          if (gestureId) {
            activeGestureId.current = gestureId
            setState(prev => ({ ...prev, isLongPressing: true, activeComponent: 'longPress' }))
            callbacks.onLongPress?.({
              type: 'longPress',
              startX: touch.clientX,
              startY: touch.clientY,
              duration: fullConfig.gestureTimeout
            })

            // Haptic feedback for long press
            browserCompatibility.vibrate([50, 25, 50])
          }
        }
      }, fullConfig.gestureTimeout)
    }
  }, [element, fullConfig, state.activeComponent, registerGesture, callbacks])

  // Handle touch move with gesture detection
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!element.current || !initialTouchPosition.current || event.touches.length === 0) return

    const touch = event.touches[0]
    const deltaX = touch.clientX - initialTouchPosition.current.x
    const deltaY = touch.clientY - initialTouchPosition.current.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // If we've moved enough to consider this a gesture
    if (distance > fullConfig.minimumMovement) {
      clearGestureTimeout() // Cancel long press if movement detected

      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)

      // Determine gesture type based on movement pattern
      if (absDeltaX > absDeltaY && absDeltaX > 30) {
        // Horizontal movement - could be swipe or drag
        if (fullConfig.enableSwipe && !state.isDragging) {
          const direction = deltaX > 0 ? 'right' : 'left'
          const gestureId = registerGesture('swipe', Array.from(event.touches), {
            direction,
            deltaX,
            deltaY,
            distance,
            velocity: distance / (Date.now() - gestureStartTime.current)
          })

          if (gestureId && state.activeComponent === 'none') {
            activeGestureId.current = gestureId
            setState(prev => ({ ...prev, activeComponent: 'swipe' }))
            callbacks.onSwipe?.({
              type: 'swipe',
              direction,
              deltaX,
              deltaY,
              distance
            })
          }
        }
      } else if (fullConfig.enableDrag && !state.isSwipeRevealed) {
        // General movement - could be drag
        const gestureId = registerGesture('drag', Array.from(event.touches), {
          deltaX,
          deltaY,
          distance,
          startX: initialTouchPosition.current.x,
          startY: initialTouchPosition.current.y
        })

        if (gestureId && state.activeComponent === 'none') {
          activeGestureId.current = gestureId
          setState(prev => ({ ...prev, isDragging: true, activeComponent: 'drag' }))
          callbacks.onDrag?.({
            type: 'drag',
            deltaX,
            deltaY,
            distance,
            startX: initialTouchPosition.current.x,
            startY: initialTouchPosition.current.y
          })
        }
      }
    }

    setState(prev => ({
      ...prev,
      lastTouchPosition: { x: touch.clientX, y: touch.clientY }
    }))
  }, [element, fullConfig, state, clearGestureTimeout, registerGesture, callbacks])

  // Handle touch end with gesture completion
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!element.current || !initialTouchPosition.current) return

    clearGestureTimeout()

    const touchDuration = Date.now() - gestureStartTime.current
    const touch = event.changedTouches[0]

    // Check for double tap
    if (fullConfig.enableDoubleTap && touchDuration < 300 && !state.activeComponent || state.activeComponent === 'none') {
      const gestureId = registerGesture('doubleTap', Array.from(event.changedTouches), {
        duration: touchDuration,
        x: touch.clientX,
        y: touch.clientY
      })

      if (gestureId) {
        setState(prev => ({ ...prev, isDoubleTapping: true, activeComponent: 'doubleTap' }))
        callbacks.onDoubleTap?.({
          type: 'doubleTap',
          x: touch.clientX,
          y: touch.clientY,
          duration: touchDuration
        })

        // Reset double tap state after brief delay
        setTimeout(() => {
          setState(prev => ({ ...prev, isDoubleTapping: false }))
        }, 200)
      }
    }

    // Reset state after touch end
    setTimeout(resetGestureState, 100)
  }, [element, fullConfig, state.activeComponent, clearGestureTimeout, registerGesture, callbacks, resetGestureState])

  // Integrate with browser compatibility for safe event handling
  const safeAddEventListener = useCallback((
    target: HTMLElement,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ) => {
    try {
      target.addEventListener(event, handler, options)
      return () => target.removeEventListener(event, handler, options)
    } catch (error) {
      console.warn(`Failed to add event listener for ${event}:`, error)
      return () => {}
    }
  }, [])

  // Set up event listeners with proper cleanup
  useEffect(() => {
    const currentElement = element.current
    if (!currentElement) return

    const cleanup: (() => void)[] = []

    // Touch events
    cleanup.push(safeAddEventListener(currentElement, 'touchstart', handleTouchStart, { passive: false }))
    cleanup.push(safeAddEventListener(currentElement, 'touchmove', handleTouchMove, { passive: false }))
    cleanup.push(safeAddEventListener(currentElement, 'touchend', handleTouchEnd, { passive: false }))

    return () => {
      cleanup.forEach(fn => fn())
      resetGestureState()
    }
  }, [element, handleTouchStart, handleTouchMove, handleTouchEnd, safeAddEventListener, resetGestureState])

  // Create integrated gesture handlers for components to use
  const createIntegratedHandlers = useCallback((): IntegratedGestureHandlers => ({
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onMouseDown: (event: MouseEvent) => {
      // Convert mouse events to touch-like events for consistency
      const syntheticTouch = {
        clientX: event.clientX,
        clientY: event.clientY,
        identifier: 0,
        target: event.target,
        touches: [{
          clientX: event.clientX,
          clientY: event.clientY,
          identifier: 0
        }] as any
      } as TouchEvent
      handleTouchStart(syntheticTouch)
    },
    onMouseMove: (event: MouseEvent) => {
      if (state.activeComponent !== 'none') {
        const syntheticTouch = {
          clientX: event.clientX,
          clientY: event.clientY,
          touches: [{
            clientX: event.clientX,
            clientY: event.clientY
          }] as any
        } as TouchEvent
        handleTouchMove(syntheticTouch)
      }
    },
    onMouseUp: (event: MouseEvent) => {
      if (state.activeComponent !== 'none') {
        const syntheticTouch = {
          changedTouches: [{
            clientX: event.clientX,
            clientY: event.clientY
          }] as any
        } as TouchEvent
        handleTouchEnd(syntheticTouch)
      }
    },
    onDragStart: (event: DragEvent) => {
      if (state.activeComponent === 'drag') {
        // Allow HTML5 drag if we're in drag mode
        return
      } else {
        // Prevent HTML5 drag if we're handling touch
        event.preventDefault()
      }
    },
    onDragEnd: (event: DragEvent) => {
      if (state.activeComponent === 'drag') {
        resetGestureState()
      }
    }
  }), [handleTouchStart, handleTouchMove, handleTouchEnd, state.activeComponent, resetGestureState])

  return {
    state,
    handlers: createIntegratedHandlers(),
    resetGestureState,
    isGestureActive: state.activeComponent !== 'none',
    canStartGesture: (gestureType: string) => {
      return state.activeComponent === 'none' || state.activeComponent === gestureType
    },
    suppressOtherGestures: (currentGesture: string) => {
      setState(prev => ({
        ...prev,
        allowedGestures: new Set([currentGesture])
      }))
    },
    allowAllGestures: () => {
      setState(prev => ({
        ...prev,
        allowedGestures: new Set(['drag', 'swipe', 'longPress', 'doubleTap'])
      }))
    }
  }
}

export default useComponentIntegration