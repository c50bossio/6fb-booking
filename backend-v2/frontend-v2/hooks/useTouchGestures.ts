'use client'

import { useCallback, useRef, useState, useEffect } from 'react'

interface TouchPosition {
  x: number
  y: number
  timestamp: number
}

interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down'
  distance: number
  velocity: number
  duration: number
}

interface TouchGestureConfig {
  onSwipe?: (gesture: SwipeGesture) => void
  onPinch?: (scale: number) => void
  onLongPress?: (position: TouchPosition) => void
  swipeThreshold?: number
  velocityThreshold?: number
  longPressDelay?: number
  preventScroll?: boolean
}

interface TouchGestureState {
  isActive: boolean
  startPosition: TouchPosition | null
  currentPosition: TouchPosition | null
  initialDistance: number | null
  isLongPress: boolean
  isPinching: boolean
}

/**
 * Hook for handling touch gestures on calendar components
 * Supports swipe navigation, pinch-to-zoom, and long press
 */
export function useTouchGestures(config: TouchGestureConfig = {}) {
  const {
    onSwipe,
    onPinch,
    onLongPress,
    swipeThreshold = 50,
    velocityThreshold = 0.5,
    longPressDelay = 500,
    preventScroll = true
  } = config

  const [gestureState, setGestureState] = useState<TouchGestureState>({
    isActive: false,
    startPosition: null,
    currentPosition: null,
    initialDistance: null,
    isLongPress: false,
    isPinching: false
  })

  const longPressTimeoutRef = useRef<NodeJS.Timeout>()
  const elementRef = useRef<HTMLElement | null>(null)

  const getDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const getTouchPosition = (touch: Touch): TouchPosition => ({
    x: touch.clientX,
    y: touch.clientY,
    timestamp: Date.now()
  })

  const calculateSwipeGesture = (
    start: TouchPosition,
    end: TouchPosition
  ): SwipeGesture | null => {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const duration = end.timestamp - start.timestamp
    const velocity = distance / duration

    if (distance < swipeThreshold || velocity < velocityThreshold) {
      return null
    }

    // Determine primary direction
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    let direction: SwipeGesture['direction']
    if (absDx > absDy) {
      direction = dx > 0 ? 'right' : 'left'
    } else {
      direction = dy > 0 ? 'down' : 'up'
    }

    return { direction, distance, velocity, duration }
  }

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0]
    const position = getTouchPosition(touch)

    setGestureState(prev => ({
      ...prev,
      isActive: true,
      startPosition: position,
      currentPosition: position,
      isLongPress: false,
      isPinching: event.touches.length === 2
    }))

    // Handle multi-touch (pinch)
    if (event.touches.length === 2) {
      const distance = getDistance(event.touches[0], event.touches[1])
      setGestureState(prev => ({
        ...prev,
        initialDistance: distance,
        isPinching: true
      }))
    } else {
      // Set up long press detection
      longPressTimeoutRef.current = setTimeout(() => {
        setGestureState(prev => ({ ...prev, isLongPress: true }))
        onLongPress?.(position)
      }, longPressDelay)
    }

    if (preventScroll && event.cancelable) {
      event.preventDefault()
    }
  }, [onLongPress, longPressDelay, preventScroll])

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!gestureState.isActive) return

    const touch = event.touches[0]
    const position = getTouchPosition(touch)

    setGestureState(prev => ({
      ...prev,
      currentPosition: position
    }))

    // Handle pinch gesture
    if (event.touches.length === 2 && gestureState.initialDistance) {
      const currentDistance = getDistance(event.touches[0], event.touches[1])
      const scale = currentDistance / gestureState.initialDistance
      onPinch?.(scale)
    }

    // Cancel long press if finger moves too much
    if (gestureState.startPosition) {
      const dx = position.x - gestureState.startPosition.x
      const dy = position.y - gestureState.startPosition.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > 10 && longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
        setGestureState(prev => ({ ...prev, isLongPress: false }))
      }
    }

    if (preventScroll && event.cancelable) {
      event.preventDefault()
    }
  }, [gestureState, onPinch, preventScroll])

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
    }

    if (!gestureState.isActive || !gestureState.startPosition || !gestureState.currentPosition) {
      setGestureState({
        isActive: false,
        startPosition: null,
        currentPosition: null,
        initialDistance: null,
        isLongPress: false,
        isPinching: false
      })
      return
    }

    // Handle swipe gesture (only if not pinching or long pressing)
    if (!gestureState.isPinching && !gestureState.isLongPress && onSwipe) {
      const swipeGesture = calculateSwipeGesture(
        gestureState.startPosition,
        gestureState.currentPosition
      )

      if (swipeGesture) {
        onSwipe(swipeGesture)
      }
    }

    setGestureState({
      isActive: false,
      startPosition: null,
      currentPosition: null,
      initialDistance: null,
      isLongPress: false,
      isPinching: false
    })
  }, [gestureState, onSwipe])

  const handleTouchCancel = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
    }

    setGestureState({
      isActive: false,
      startPosition: null,
      currentPosition: null,
      initialDistance: null,
      isLongPress: false,
      isPinching: false
    })
  }, [])

  // Set up event listeners
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const options = { passive: !preventScroll }

    element.addEventListener('touchstart', handleTouchStart, options)
    element.addEventListener('touchmove', handleTouchMove, options)
    element.addEventListener('touchend', handleTouchEnd, options)
    element.addEventListener('touchcancel', handleTouchCancel, options)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel, preventScroll])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
      }
    }
  }, [])

  return {
    elementRef,
    gestureState,
    isGestureActive: gestureState.isActive,
    isLongPress: gestureState.isLongPress,
    isPinching: gestureState.isPinching
  }
}

/**
 * Calendar-specific touch gestures hook
 * Provides calendar navigation via swipe gestures
 */
export function useCalendarTouchGestures(
  onNavigate: (direction: 'prev' | 'next' | 'up' | 'down') => void
) {
  const [swipeHint, setSwipeHint] = useState<'left' | 'right' | null>(null)
  const [showSwipeHint, setShowSwipeHint] = useState(false)

  const handleSwipe = useCallback((gesture: SwipeGesture) => {
    switch (gesture.direction) {
      case 'left':
        onNavigate('next') // Swipe left = go to next period
        setSwipeHint('left')
        break
      case 'right':
        onNavigate('prev') // Swipe right = go to previous period
        setSwipeHint('right')
        break
      case 'up':
        onNavigate('up') // Swipe up = zoom out/go to higher level
        break
      case 'down':
        onNavigate('down') // Swipe down = zoom in/go to lower level
        break
    }

    // Show visual feedback
    setTimeout(() => setSwipeHint(null), 300)
  }, [onNavigate])

  const { elementRef, gestureState, isGestureActive } = useTouchGestures({
    onSwipe: handleSwipe,
    swipeThreshold: 30, // Lower threshold for easier navigation
    velocityThreshold: 0.3
  })

  // Show swipe hints for new users
  useEffect(() => {
    const hasSeenSwipeHint = localStorage.getItem('calendar-swipe-hint-seen')
    if (!hasSeenSwipeHint) {
      setShowSwipeHint(true)
      setTimeout(() => {
        setShowSwipeHint(false)
        localStorage.setItem('calendar-swipe-hint-seen', 'true')
      }, 5000)
    }
  }, [])

  return {
    elementRef,
    gestureState,
    isGestureActive,
    swipeHint,
    showSwipeHint,
    dismissSwipeHint: () => setShowSwipeHint(false)
  }
}

/**
 * Touch-friendly drag and drop for appointments
 */
export function useAppointmentDragGestures(
  onDragStart: (appointmentId: string, position: TouchPosition) => void,
  onDragMove: (position: TouchPosition) => void,
  onDragEnd: (position: TouchPosition) => void
) {
  const [isDragging, setIsDragging] = useState(false)
  const [draggedAppointmentId, setDraggedAppointmentId] = useState<string | null>(null)

  const handleLongPress = useCallback((position: TouchPosition) => {
    // Long press initiates drag mode
    if (draggedAppointmentId) {
      setIsDragging(true)
      onDragStart(draggedAppointmentId, position)
    }
  }, [draggedAppointmentId, onDragStart])

  const { elementRef, gestureState } = useTouchGestures({
    onLongPress: handleLongPress,
    longPressDelay: 300, // Shorter delay for responsive drag
    preventScroll: isDragging // Only prevent scroll when actively dragging
  })

  // Handle drag movement
  useEffect(() => {
    if (isDragging && gestureState.currentPosition) {
      onDragMove(gestureState.currentPosition)
    }
  }, [isDragging, gestureState.currentPosition, onDragMove])

  // Handle drag end
  useEffect(() => {
    if (!gestureState.isActive && isDragging && gestureState.currentPosition) {
      onDragEnd(gestureState.currentPosition)
      setIsDragging(false)
      setDraggedAppointmentId(null)
    }
  }, [gestureState.isActive, isDragging, gestureState.currentPosition, onDragEnd])

  const startDrag = useCallback((appointmentId: string) => {
    setDraggedAppointmentId(appointmentId)
  }, [])

  const cancelDrag = useCallback(() => {
    setIsDragging(false)
    setDraggedAppointmentId(null)
  }, [])

  return {
    elementRef,
    isDragging,
    draggedAppointmentId,
    startDrag,
    cancelDrag
  }
}