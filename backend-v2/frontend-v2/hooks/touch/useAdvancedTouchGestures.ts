/**
 * Advanced touch gestures for mobile-optimized calendar interactions
 * Supports multi-touch gestures including pinch-to-zoom, two-finger scroll,
 * and complex gesture combinations for premium UX experience
 */

import { useCallback, useRef, useState, useEffect } from 'react'

export interface TouchPoint {
  id: number
  x: number
  y: number
  timestamp: number
}

export interface MultiTouchGesture {
  type: 'pinch' | 'twoFingerScroll' | 'longPress' | 'doubleTap' | 'contextMenu'
  startPoints: TouchPoint[]
  currentPoints: TouchPoint[]
  scale?: number
  rotation?: number
  velocity?: { x: number; y: number }
  distance?: number
  center?: { x: number; y: number }
  duration: number
  cancelled?: boolean
}

export interface TouchGestureCallbacks {
  onPinchStart?: (gesture: MultiTouchGesture) => void
  onPinchMove?: (gesture: MultiTouchGesture) => void
  onPinchEnd?: (gesture: MultiTouchGesture) => void
  onTwoFingerScroll?: (gesture: MultiTouchGesture) => void
  onLongPress?: (gesture: MultiTouchGesture) => void
  onDoubleTap?: (gesture: MultiTouchGesture) => void
  onContextMenu?: (gesture: MultiTouchGesture) => void
}

export interface TouchGestureOptions {
  enablePinch?: boolean
  enableTwoFingerScroll?: boolean
  enableLongPress?: boolean
  enableDoubleTap?: boolean
  enableContextMenu?: boolean
  minPinchScale?: number
  maxPinchScale?: number
  longPressDuration?: number
  doubleTapWindow?: number
  gestureThreshold?: number
  preventScrollOnTouch?: boolean
}

const DEFAULT_OPTIONS: Required<TouchGestureOptions> = {
  enablePinch: true,
  enableTwoFingerScroll: true,
  enableLongPress: true,
  enableDoubleTap: true,
  enableContextMenu: true,
  minPinchScale: 0.5,
  maxPinchScale: 3.0,
  longPressDuration: 500,
  doubleTapWindow: 300,
  gestureThreshold: 10,
  preventScrollOnTouch: false
}

export function useAdvancedTouchGestures(
  elementRef: React.RefObject<HTMLElement>,
  callbacks: TouchGestureCallbacks,
  options: TouchGestureOptions = {}
) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const gestureState = useRef({
    isActive: false,
    startTime: 0,
    lastTapTime: 0,
    initialDistance: 0,
    initialScale: 1,
    currentScale: 1,
    touchPoints: [] as TouchPoint[],
    longPressTimer: null as NodeJS.Timeout | null,
    gestureType: null as MultiTouchGesture['type'] | null
  })

  const [currentGesture, setCurrentGesture] = useState<MultiTouchGesture | null>(null)

  // Calculate distance between two points
  const calculateDistance = useCallback((p1: TouchPoint, p2: TouchPoint): number => {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  // Calculate center point between touches
  const calculateCenter = useCallback((points: TouchPoint[]): { x: number; y: number } => {
    const sum = points.reduce((acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y
    }), { x: 0, y: 0 })
    
    return {
      x: sum.x / points.length,
      y: sum.y / points.length
    }
  }, [])

  // Calculate rotation angle between two touch points
  const calculateRotation = useCallback((startPoints: TouchPoint[], currentPoints: TouchPoint[]): number => {
    if (startPoints.length < 2 || currentPoints.length < 2) return 0
    
    const startAngle = Math.atan2(startPoints[1].y - startPoints[0].y, startPoints[1].x - startPoints[0].x)
    const currentAngle = Math.atan2(currentPoints[1].y - currentPoints[0].y, currentPoints[1].x - currentPoints[0].x)
    
    return currentAngle - startAngle
  }, [])

  // Convert touch list to touch points array
  const convertTouchesToPoints = useCallback((touches: TouchList): TouchPoint[] => {
    const points: TouchPoint[] = []
    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i]
      points.push({
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now()
      })
    }
    return points
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const points = convertTouchesToPoints(e.touches)
    const startTime = Date.now()
    
    gestureState.current.touchPoints = points
    gestureState.current.startTime = startTime
    gestureState.current.isActive = true

    // Handle single touch - potential long press or double tap
    if (points.length === 1 && config.enableLongPress) {
      gestureState.current.longPressTimer = setTimeout(() => {
        if (gestureState.current.isActive && gestureState.current.touchPoints.length === 1) {
          const gesture: MultiTouchGesture = {
            type: 'longPress',
            startPoints: points,
            currentPoints: points,
            duration: Date.now() - startTime,
            center: points[0]
          }
          setCurrentGesture(gesture)
          callbacks.onLongPress?.(gesture)
          
          // Provide haptic feedback for long press
          if ('vibrate' in navigator) {
            navigator.vibrate([50, 50, 50])
          }
        }
      }, config.longPressDuration)
    }

    // Handle pinch start
    if (points.length === 2 && config.enablePinch) {
      gestureState.current.initialDistance = calculateDistance(points[0], points[1])
      gestureState.current.initialScale = gestureState.current.currentScale
      gestureState.current.gestureType = 'pinch'
      
      const gesture: MultiTouchGesture = {
        type: 'pinch',
        startPoints: points,
        currentPoints: points,
        scale: 1,
        center: calculateCenter(points),
        duration: 0
      }
      
      setCurrentGesture(gesture)
      callbacks.onPinchStart?.(gesture)
    }

    // Prevent scrolling if configured
    if (config.preventScrollOnTouch && points.length > 1) {
      e.preventDefault()
    }
  }, [callbacks, config, convertTouchesToPoints, calculateDistance, calculateCenter])

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!gestureState.current.isActive) return

    const points = convertTouchesToPoints(e.touches)
    const currentTime = Date.now()
    const duration = currentTime - gestureState.current.startTime

    // Clear long press timer on movement
    if (gestureState.current.longPressTimer) {
      const movement = points.length > 0 && gestureState.current.touchPoints.length > 0
        ? calculateDistance(points[0], gestureState.current.touchPoints[0])
        : 0
        
      if (movement > config.gestureThreshold) {
        clearTimeout(gestureState.current.longPressTimer)
        gestureState.current.longPressTimer = null
      }
    }

    // Handle pinch gesture
    if (points.length === 2 && gestureState.current.gestureType === 'pinch' && config.enablePinch) {
      const currentDistance = calculateDistance(points[0], points[1])
      const scale = currentDistance / gestureState.current.initialDistance
      const constrainedScale = Math.max(config.minPinchScale, Math.min(config.maxPinchScale, scale))
      
      const gesture: MultiTouchGesture = {
        type: 'pinch',
        startPoints: gestureState.current.touchPoints,
        currentPoints: points,
        scale: constrainedScale,
        rotation: calculateRotation(gestureState.current.touchPoints, points),
        center: calculateCenter(points),
        distance: currentDistance,
        duration
      }
      
      setCurrentGesture(gesture)
      callbacks.onPinchMove?.(gesture)
      gestureState.current.currentScale = constrainedScale
    }

    // Handle two-finger scroll
    if (points.length === 2 && config.enableTwoFingerScroll && gestureState.current.gestureType !== 'pinch') {
      const startCenter = calculateCenter(gestureState.current.touchPoints)
      const currentCenter = calculateCenter(points)
      const velocity = {
        x: (currentCenter.x - startCenter.x) / duration,
        y: (currentCenter.y - startCenter.y) / duration
      }

      const gesture: MultiTouchGesture = {
        type: 'twoFingerScroll',
        startPoints: gestureState.current.touchPoints,
        currentPoints: points,
        center: currentCenter,
        velocity,
        duration
      }

      setCurrentGesture(gesture)
      callbacks.onTwoFingerScroll?.(gesture)
    }

    // Prevent default on multi-touch
    if (points.length > 1) {
      e.preventDefault()
    }
  }, [callbacks, config, convertTouchesToPoints, calculateDistance, calculateCenter, calculateRotation])

  // Handle touch end
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const remainingPoints = convertTouchesToPoints(e.touches)
    const endTime = Date.now()
    const duration = endTime - gestureState.current.startTime

    // Clear long press timer
    if (gestureState.current.longPressTimer) {
      clearTimeout(gestureState.current.longPressTimer)
      gestureState.current.longPressTimer = null
    }

    // Handle pinch end
    if (gestureState.current.gestureType === 'pinch' && currentGesture?.type === 'pinch') {
      callbacks.onPinchEnd?.(currentGesture)
    }

    // Handle single tap or double tap
    if (remainingPoints.length === 0 && gestureState.current.touchPoints.length === 1) {
      const timeSinceLastTap = endTime - gestureState.current.lastTapTime
      
      if (config.enableDoubleTap && timeSinceLastTap < config.doubleTapWindow && timeSinceLastTap > 50) {
        const gesture: MultiTouchGesture = {
          type: 'doubleTap',
          startPoints: gestureState.current.touchPoints,
          currentPoints: gestureState.current.touchPoints,
          center: gestureState.current.touchPoints[0],
          duration
        }
        
        setCurrentGesture(gesture)
        callbacks.onDoubleTap?.(gesture)
        
        // Quick haptic feedback for double tap
        if ('vibrate' in navigator) {
          navigator.vibrate(30)
        }
        
        gestureState.current.lastTapTime = 0 // Reset to prevent triple tap
      } else {
        gestureState.current.lastTapTime = endTime
      }
    }

    // Reset gesture state if no touches remain
    if (remainingPoints.length === 0) {
      gestureState.current.isActive = false
      gestureState.current.gestureType = null
      setCurrentGesture(null)
    } else {
      gestureState.current.touchPoints = remainingPoints
    }
  }, [callbacks, config, convertTouchesToPoints, currentGesture])

  // Handle touch cancel
  const handleTouchCancel = useCallback((e: TouchEvent) => {
    if (gestureState.current.longPressTimer) {
      clearTimeout(gestureState.current.longPressTimer)
      gestureState.current.longPressTimer = null
    }

    if (currentGesture && currentGesture.type === 'pinch') {
      callbacks.onPinchEnd?.({ ...currentGesture, cancelled: true })
    }

    gestureState.current.isActive = false
    gestureState.current.gestureType = null
    setCurrentGesture(null)
  }, [callbacks, currentGesture])

  // Set up event listeners
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const options = { passive: !config.preventScrollOnTouch }
    
    element.addEventListener('touchstart', handleTouchStart, options)
    element.addEventListener('touchmove', handleTouchMove, options)
    element.addEventListener('touchend', handleTouchEnd, options)
    element.addEventListener('touchcancel', handleTouchCancel, options)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchCancel)
      
      // Clean up any remaining timers
      if (gestureState.current.longPressTimer) {
        clearTimeout(gestureState.current.longPressTimer)
      }
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel, config.preventScrollOnTouch])

  // Public API
  return {
    currentGesture,
    isActive: gestureState.current.isActive,
    currentScale: gestureState.current.currentScale,
    
    // Manual gesture reset
    resetGestures: useCallback(() => {
      if (gestureState.current.longPressTimer) {
        clearTimeout(gestureState.current.longPressTimer)
        gestureState.current.longPressTimer = null
      }
      gestureState.current.isActive = false
      gestureState.current.gestureType = null
      setCurrentGesture(null)
    }, []),
    
    // Get current touch information
    getTouchInfo: useCallback(() => ({
      touchCount: gestureState.current.touchPoints.length,
      gestureType: gestureState.current.gestureType,
      duration: gestureState.current.isActive ? Date.now() - gestureState.current.startTime : 0
    }), [])
  }
}

// Hook for calendar-specific touch gestures with zoom functionality
export function useCalendarTouchGestures(
  elementRef: React.RefObject<HTMLElement>,
  onZoom?: (scale: number) => void,
  onTimeNavigation?: (direction: 'up' | 'down', velocity: number) => void,
  onDateNavigation?: (direction: 'left' | 'right', velocity: number) => void
) {
  const [zoomLevel, setZoomLevel] = useState(1)
  
  return useAdvancedTouchGestures(elementRef, {
    onPinchMove: useCallback((gesture) => {
      if (gesture.scale && onZoom) {
        const newZoomLevel = Math.max(0.5, Math.min(3.0, gesture.scale))
        setZoomLevel(newZoomLevel)
        onZoom(newZoomLevel)
      }
    }, [onZoom]),
    
    onTwoFingerScroll: useCallback((gesture) => {
      if (!gesture.velocity || !gesture.center) return
      
      const { x: velocityX, y: velocityY } = gesture.velocity
      
      // Vertical scroll for time navigation
      if (Math.abs(velocityY) > Math.abs(velocityX) && Math.abs(velocityY) > 0.1) {
        onTimeNavigation?.(velocityY > 0 ? 'down' : 'up', Math.abs(velocityY))
      }
      // Horizontal scroll for date navigation
      else if (Math.abs(velocityX) > 0.1) {
        onDateNavigation?.(velocityX > 0 ? 'right' : 'left', Math.abs(velocityX))
      }
    }, [onTimeNavigation, onDateNavigation]),
    
    onDoubleTap: useCallback((gesture) => {
      // Double tap to reset zoom
      if (onZoom && zoomLevel !== 1) {
        setZoomLevel(1)
        onZoom(1)
      }
    }, [onZoom, zoomLevel])
  }, {
    enablePinch: true,
    enableTwoFingerScroll: true,
    enableDoubleTap: true,
    preventScrollOnTouch: true
  })
}

export default useAdvancedTouchGestures