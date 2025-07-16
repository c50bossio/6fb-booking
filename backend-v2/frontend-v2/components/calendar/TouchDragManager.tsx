'use client'

import React, { useRef, useCallback, useState, useEffect } from 'react'

export interface TouchPoint {
  x: number
  y: number
  id: number
  timestamp: number
}

export interface GestureState {
  type: 'none' | 'drag' | 'swipe' | 'pinch' | 'tap'
  direction?: 'up' | 'down' | 'left' | 'right'
  velocity: number
  distance: number
  scale?: number
  rotation?: number
  duration: number
  startPoint: TouchPoint
  currentPoint: TouchPoint
  isActive: boolean
}

export interface TouchDragManagerProps {
  children: React.ReactNode
  onGestureStart?: (gesture: GestureState) => void
  onGestureMove?: (gesture: GestureState) => void
  onGestureEnd?: (gesture: GestureState) => void
  onSwipe?: (direction: 'up' | 'down' | 'left' | 'right', velocity: number) => void
  onPinch?: (scale: number, isStarting: boolean) => void
  onTap?: (point: TouchPoint) => void
  onLongPress?: (point: TouchPoint) => void
  disabled?: boolean
  enableHapticFeedback?: boolean
  swipeThreshold?: number
  tapTimeout?: number
  longPressTimeout?: number
  className?: string
}

export function TouchDragManager({
  children,
  onGestureStart,
  onGestureMove,
  onGestureEnd,
  onSwipe,
  onPinch,
  onTap,
  onLongPress,
  disabled = false,
  enableHapticFeedback = true,
  swipeThreshold = 50,
  tapTimeout = 300,
  longPressTimeout = 500,
  className = ''
}: TouchDragManagerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gestureStateRef = useRef<GestureState | null>(null)
  const touchesRef = useRef<Map<number, TouchPoint>>(new Map())
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [isGestureActive, setIsGestureActive] = useState(false)

  // Haptic feedback utility
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHapticFeedback || !navigator.vibrate) return
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30]
    }
    
    navigator.vibrate(patterns[type])
  }, [enableHapticFeedback])

  // Calculate distance between two points
  const calculateDistance = useCallback((point1: TouchPoint, point2: TouchPoint): number => {
    const dx = point2.x - point1.x
    const dy = point2.y - point1.y
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  // Calculate velocity based on distance and time
  const calculateVelocity = useCallback((distance: number, duration: number): number => {
    return duration > 0 ? distance / duration : 0
  }, [])

  // Determine swipe direction
  const getSwipeDirection = useCallback((start: TouchPoint, end: TouchPoint): 'up' | 'down' | 'left' | 'right' => {
    const dx = end.x - start.x
    const dy = end.y - start.y
    
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left'
    } else {
      return dy > 0 ? 'down' : 'up'
    }
  }, [])

  // Calculate pinch scale
  const calculatePinchScale = useCallback((touches: TouchPoint[]): number => {
    if (touches.length !== 2) return 1
    
    const [touch1, touch2] = touches
    const currentDistance = calculateDistance(touch1, touch2)
    
    // Store initial distance for scale calculation
    if (!gestureStateRef.current?.scale) {
      return 1
    }
    
    const initialDistance = gestureStateRef.current.distance
    return initialDistance > 0 ? currentDistance / initialDistance : 1
  }, [calculateDistance])

  // Convert touch event to touch point
  const touchToPoint = useCallback((touch: Touch): TouchPoint => ({
    x: touch.clientX,
    y: touch.clientY,
    id: touch.identifier,
    timestamp: Date.now()
  }), [])

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current)
      tapTimerRef.current = null
    }
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (disabled) return

    const touches = Array.from(event.touches).map(touchToPoint)
    
    // Clear existing timers
    clearTimers()
    
    // Update touches map
    touches.forEach(touch => {
      touchesRef.current.set(touch.id, touch)
    })

    const primaryTouch = touches[0]
    const currentTime = Date.now()

    // Initialize gesture state
    const gestureState: GestureState = {
      type: touches.length === 1 ? 'drag' : touches.length === 2 ? 'pinch' : 'none',
      velocity: 0,
      distance: 0,
      duration: 0,
      startPoint: primaryTouch,
      currentPoint: primaryTouch,
      isActive: true
    }

    if (touches.length === 2) {
      gestureState.distance = calculateDistance(touches[0], touches[1])
      gestureState.scale = 1
    }

    gestureStateRef.current = gestureState
    setIsGestureActive(true)

    // Trigger haptic feedback for gesture start
    triggerHapticFeedback('light')

    // Set up long press detection for single touch
    if (touches.length === 1 && onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        if (gestureStateRef.current?.isActive) {
          onLongPress(primaryTouch)
          triggerHapticFeedback('medium')
        }
      }, longPressTimeout)
    }

    onGestureStart?.(gestureState)
  }, [disabled, touchToPoint, clearTimers, calculateDistance, onGestureStart, onLongPress, longPressTimeout, triggerHapticFeedback])

  // Handle touch move
  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (disabled || !gestureStateRef.current?.isActive) return

    event.preventDefault() // Prevent scrolling

    const touches = Array.from(event.touches).map(touchToPoint)
    const gestureState = gestureStateRef.current
    const currentTime = Date.now()

    // Update touches map
    touches.forEach(touch => {
      touchesRef.current.set(touch.id, touch)
    })

    const primaryTouch = touches[0]
    const duration = currentTime - gestureState.startPoint.timestamp
    const distance = calculateDistance(gestureState.startPoint, primaryTouch)
    const velocity = calculateVelocity(distance, duration)

    // Update gesture state
    const updatedGestureState: GestureState = {
      ...gestureState,
      currentPoint: primaryTouch,
      distance,
      velocity,
      duration,
      direction: getSwipeDirection(gestureState.startPoint, primaryTouch)
    }

    // Handle pinch gesture
    if (touches.length === 2 && gestureState.type === 'pinch') {
      updatedGestureState.scale = calculatePinchScale(touches)
      onPinch?.(updatedGestureState.scale, false)
    }

    gestureStateRef.current = updatedGestureState

    // Clear long press timer on movement
    if (distance > 10) {
      clearTimers()
    }

    onGestureMove?.(updatedGestureState)
  }, [disabled, touchToPoint, calculateDistance, calculateVelocity, getSwipeDirection, calculatePinchScale, onGestureMove, onPinch, clearTimers])

  // Handle touch end
  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (disabled || !gestureStateRef.current?.isActive) return

    const gestureState = gestureStateRef.current
    const currentTime = Date.now()
    const duration = currentTime - gestureState.startPoint.timestamp

    // Clear timers
    clearTimers()

    // Update gesture state as ended
    const finalGestureState: GestureState = {
      ...gestureState,
      duration,
      isActive: false
    }

    // Determine final gesture type
    if (gestureState.type === 'drag' && gestureState.distance > swipeThreshold) {
      finalGestureState.type = 'swipe'
      if (onSwipe && gestureState.direction) {
        onSwipe(gestureState.direction, gestureState.velocity)
        triggerHapticFeedback('medium')
      }
    } else if (gestureState.type === 'drag' && gestureState.distance < 10 && duration < tapTimeout) {
      finalGestureState.type = 'tap'
      if (onTap) {
        // Add small delay to handle potential double taps
        tapTimerRef.current = setTimeout(() => {
          onTap(gestureState.startPoint)
          triggerHapticFeedback('light')
        }, 50)
      }
    }

    gestureStateRef.current = finalGestureState
    setIsGestureActive(false)

    // Clear touches map
    touchesRef.current.clear()

    onGestureEnd?.(finalGestureState)
  }, [disabled, clearTimers, swipeThreshold, tapTimeout, onSwipe, onTap, onGestureEnd, triggerHapticFeedback])

  // Handle context menu (for preventing long press context menu)
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    if (isGestureActive) {
      event.preventDefault()
    }
  }, [isGestureActive])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [clearTimers])

  return (
    <div
      ref={containerRef}
      className={`touch-none select-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={handleContextMenu}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
    >
      {children}
    </div>
  )
}

// Hook for using touch gesture management
export function useTouchGestures({
  onSwipe,
  onPinch,
  onTap,
  onLongPress,
  disabled = false
}: {
  onSwipe?: (direction: 'up' | 'down' | 'left' | 'right', velocity: number) => void
  onPinch?: (scale: number, isStarting: boolean) => void
  onTap?: (point: TouchPoint) => void
  onLongPress?: (point: TouchPoint) => void
  disabled?: boolean
}) {
  const [gestureState, setGestureState] = useState<GestureState | null>(null)

  const gestureHandlers = {
    onGestureStart: useCallback((gesture: GestureState) => {
      setGestureState(gesture)
    }, []),

    onGestureMove: useCallback((gesture: GestureState) => {
      setGestureState(gesture)
    }, []),

    onGestureEnd: useCallback((gesture: GestureState) => {
      setGestureState(null)
    }, []),

    onSwipe,
    onPinch,
    onTap,
    onLongPress,
    disabled
  }

  return {
    gestureState,
    gestureHandlers,
    isGestureActive: gestureState?.isActive || false
  }
}

export default TouchDragManager