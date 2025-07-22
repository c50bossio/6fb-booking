'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import { useCalendarHaptics } from './useCalendarHaptics'
import { useCalendarSecurity } from './useCalendarSecurity'
import type { BookingResponse } from '@/lib/api'

interface DragState {
  isDragging: boolean
  draggedItem: BookingResponse | null
  dragOffset: { x: number; y: number }
  startPosition: { x: number; y: number }
  currentPosition: { x: number; y: number }
  dropTarget: string | null
  validDrop: boolean
}

interface GestureState {
  isGesturing: boolean
  gestureType: 'pan' | 'pinch' | 'swipe' | 'long-press' | null
  startTime: number
  startPosition: { x: number; y: number }
  currentPosition: { x: number; y: number }
  velocity: { x: number; y: number }
  scale: number
  distance: number
}

interface TouchState {
  touches: Touch[]
  center: { x: number; y: number }
  initialDistance: number
  initialScale: number
}

interface InteractionCallbacks {
  onAppointmentDragStart?: (appointment: BookingResponse, position: { x: number; y: number }) => void
  onAppointmentDragMove?: (appointment: BookingResponse, position: { x: number; y: number }) => void
  onAppointmentDragEnd?: (appointment: BookingResponse, dropTarget?: string) => void
  onAppointmentDrop?: (appointment: BookingResponse, targetSlot: string, targetDate: string) => Promise<void>
  onSwipeLeft?: (startX: number, endX: number, velocity: number) => void
  onSwipeRight?: (startX: number, endX: number, velocity: number) => void
  onSwipeUp?: (startY: number, endY: number, velocity: number) => void
  onSwipeDown?: (startY: number, endY: number, velocity: number) => void
  onPinchStart?: (scale: number, center: { x: number; y: number }) => void
  onPinchMove?: (scale: number, center: { x: number; y: number }) => void
  onPinchEnd?: (scale: number, center: { x: number; y: number }) => void
  onLongPress?: (position: { x: number; y: number }, target: EventTarget | null) => void
  onDoubleTap?: (position: { x: number; y: number }, target: EventTarget | null) => void
}

interface InteractionOptions {
  enableDragAndDrop?: boolean
  enableGestures?: boolean
  enableHapticFeedback?: boolean
  minimumSwipeDistance?: number
  minimumSwipeVelocity?: number
  longPressDelay?: number
  doubleTapDelay?: number
  pinchThreshold?: number
  dragThreshold?: number
}

/**
 * Advanced calendar interaction hook with drag & drop, gestures, and touch support
 * Provides comprehensive interaction handling for modern calendar interfaces
 */
export function useCalendarInteractions(
  callbacks: InteractionCallbacks = {},
  options: InteractionOptions = {}
) {
  const {
    enableDragAndDrop = true,
    enableGestures = true,
    enableHapticFeedback = true,
    minimumSwipeDistance = 50,
    minimumSwipeVelocity = 300,
    longPressDelay = 500,
    doubleTapDelay = 300,
    pinchThreshold = 0.1,
    dragThreshold = 5
  } = options

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    dragOffset: { x: 0, y: 0 },
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    dropTarget: null,
    validDrop: false
  })

  const [gestureState, setGestureState] = useState<GestureState>({
    isGesturing: false,
    gestureType: null,
    startTime: 0,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    scale: 1,
    distance: 0
  })

  const touchState = useRef<TouchState>({
    touches: [],
    center: { x: 0, y: 0 },
    initialDistance: 0,
    initialScale: 1
  })

  const longPressTimeoutRef = useRef<NodeJS.Timeout>()
  const lastTapTimeRef = useRef<number>(0)
  const lastTapPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Import haptic feedback
  const { smartHaptic, gestureHaptics } = useCalendarHaptics({
    enableHaptics: enableHapticFeedback
  })

  // Import security for validation
  const { auditSecurityEvent } = useCalendarSecurity({
    enableSecurityAudit: true
  })

  // Utility functions
  const calculateDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  const calculateCenter = useCallback((touches: TouchList): { x: number; y: number } => {
    let x = 0, y = 0
    for (let i = 0; i < touches.length; i++) {
      x += touches[i].clientX
      y += touches[i].clientY
    }
    return {
      x: x / touches.length,
      y: y / touches.length
    }
  }, [])

  const calculateVelocity = useCallback((
    startPos: { x: number; y: number },
    endPos: { x: number; y: number },
    duration: number
  ): { x: number; y: number } => {
    if (duration === 0) return { x: 0, y: 0 }
    
    return {
      x: (endPos.x - startPos.x) / (duration / 1000),
      y: (endPos.y - startPos.y) / (duration / 1000)
    }
  }, [])

  // Drag and drop handlers
  const handleDragStart = useCallback((
    event: MouseEvent | TouchEvent,
    appointment: BookingResponse
  ) => {
    if (!enableDragAndDrop) return

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

    const startPosition = { x: clientX, y: clientY }

    setDragState({
      isDragging: true,
      draggedItem: appointment,
      dragOffset: { x: 0, y: 0 },
      startPosition,
      currentPosition: startPosition,
      dropTarget: null,
      validDrop: false
    })

    if (enableHapticFeedback) {
      smartHaptic('appointment_drag_start')
    }

    auditSecurityEvent('Drag Start', { appointmentId: appointment.id })
    callbacks.onAppointmentDragStart?.(appointment, startPosition)

    // Prevent default to avoid text selection
    event.preventDefault()
  }, [enableDragAndDrop, enableHapticFeedback, smartHaptic, auditSecurityEvent, callbacks])

  const handleDragMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (!dragState.isDragging || !dragState.draggedItem) return

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

    const currentPosition = { x: clientX, y: clientY }
    const dragOffset = {
      x: currentPosition.x - dragState.startPosition.x,
      y: currentPosition.y - dragState.startPosition.y
    }

    // Check if we've moved beyond the drag threshold
    const distance = Math.sqrt(dragOffset.x * dragOffset.x + dragOffset.y * dragOffset.y)
    if (distance < dragThreshold) return

    setDragState(prev => ({
      ...prev,
      currentPosition,
      dragOffset
    }))

    // Find drop target
    const elementBelow = document.elementFromPoint(clientX, clientY)
    const dropTarget = elementBelow?.closest('[data-drop-target]')?.getAttribute('data-drop-target')
    const validDrop = !!dropTarget

    setDragState(prev => ({
      ...prev,
      dropTarget,
      validDrop
    }))

    callbacks.onAppointmentDragMove?.(dragState.draggedItem, currentPosition)
    event.preventDefault()
  }, [dragState, dragThreshold, callbacks])

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent) => {
    if (!dragState.isDragging || !dragState.draggedItem) return

    const clientX = 'touches' in event ? 
      (event.changedTouches?.[0]?.clientX || event.touches[0]?.clientX) : 
      event.clientX
    const clientY = 'touches' in event ? 
      (event.changedTouches?.[0]?.clientY || event.touches[0]?.clientY) : 
      event.clientY

    const elementBelow = document.elementFromPoint(clientX, clientY)
    const dropTarget = elementBelow?.closest('[data-drop-target]')
    const dropTargetId = dropTarget?.getAttribute('data-drop-target')
    const dropTargetDate = dropTarget?.getAttribute('data-date')

    if (enableHapticFeedback) {
      smartHaptic('appointment_drag_end', { success: !!dropTargetId })
    }

    // Handle drop
    if (dropTargetId && dropTargetDate && callbacks.onAppointmentDrop) {
      callbacks.onAppointmentDrop(dragState.draggedItem, dropTargetId, dropTargetDate)
      auditSecurityEvent('Appointment Dropped', {
        appointmentId: dragState.draggedItem.id,
        dropTarget: dropTargetId,
        newDate: dropTargetDate
      })
    }

    callbacks.onAppointmentDragEnd?.(dragState.draggedItem, dropTargetId || undefined)

    // Reset drag state
    setDragState({
      isDragging: false,
      draggedItem: null,
      dragOffset: { x: 0, y: 0 },
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      dropTarget: null,
      validDrop: false
    })

    event.preventDefault()
  }, [dragState, enableHapticFeedback, smartHaptic, auditSecurityEvent, callbacks])

  // Touch event handlers
  const handleTouchStart = useCallback((event: TouchEvent) => {
    const now = Date.now()
    const touches = Array.from(event.touches)
    const primaryTouch = touches[0]
    
    touchState.current.touches = touches
    
    if (touches.length === 1) {
      const position = { x: primaryTouch.clientX, y: primaryTouch.clientY }
      
      // Check for double tap
      const timeSinceLastTap = now - lastTapTimeRef.current
      const distanceFromLastTap = Math.sqrt(
        Math.pow(position.x - lastTapPositionRef.current.x, 2) +
        Math.pow(position.y - lastTapPositionRef.current.y, 2)
      )

      if (timeSinceLastTap < doubleTapDelay && distanceFromLastTap < 50) {
        callbacks.onDoubleTap?.(position, event.target)
        if (enableHapticFeedback) {
          gestureHaptics.doubleTap()
        }
        lastTapTimeRef.current = 0 // Reset to prevent triple tap
        return
      }

      lastTapTimeRef.current = now
      lastTapPositionRef.current = position

      // Set up long press detection
      longPressTimeoutRef.current = setTimeout(() => {
        callbacks.onLongPress?.(position, event.target)
        if (enableHapticFeedback) {
          gestureHaptics.longPressStart()
        }
      }, longPressDelay)

      // Initialize gesture state
      setGestureState({
        isGesturing: true,
        gestureType: null,
        startTime: now,
        startPosition: position,
        currentPosition: position,
        velocity: { x: 0, y: 0 },
        scale: 1,
        distance: 0
      })
    } else if (touches.length === 2) {
      // Pinch gesture setup
      const distance = calculateDistance(touches[0], touches[1])
      const center = calculateCenter(event.touches)
      
      touchState.current.initialDistance = distance
      touchState.current.center = center
      touchState.current.initialScale = 1

      setGestureState(prev => ({
        ...prev,
        gestureType: 'pinch',
        startPosition: center,
        currentPosition: center,
        distance
      }))

      callbacks.onPinchStart?.(1, center)
      if (enableHapticFeedback) {
        gestureHaptics.pinchStart()
      }

      // Clear long press timeout
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
        longPressTimeoutRef.current = undefined
      }
    }
  }, [
    calculateDistance, 
    calculateCenter, 
    callbacks, 
    doubleTapDelay, 
    longPressDelay, 
    enableHapticFeedback,
    gestureHaptics
  ])

  const handleTouchMove = useCallback((event: TouchEvent) => {
    const touches = Array.from(event.touches)
    
    if (touches.length === 1) {
      const touch = touches[0]
      const currentPosition = { x: touch.clientX, y: touch.clientY }
      const now = Date.now()

      // Clear long press if we're moving
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
        longPressTimeoutRef.current = undefined
      }

      setGestureState(prev => {
        const duration = now - prev.startTime
        const velocity = calculateVelocity(prev.startPosition, currentPosition, duration)
        
        // Determine gesture type based on movement
        let gestureType: GestureState['gestureType'] = prev.gestureType
        
        if (!gestureType) {
          const deltaX = Math.abs(currentPosition.x - prev.startPosition.x)
          const deltaY = Math.abs(currentPosition.y - prev.startPosition.y)
          
          if (deltaX > dragThreshold || deltaY > dragThreshold) {
            gestureType = 'pan'
          }
        }

        return {
          ...prev,
          gestureType,
          currentPosition,
          velocity
        }
      })
    } else if (touches.length === 2) {
      // Pinch gesture
      const distance = calculateDistance(touches[0], touches[1])
      const center = calculateCenter(event.touches)
      const scale = distance / touchState.current.initialDistance

      setGestureState(prev => ({
        ...prev,
        currentPosition: center,
        scale,
        distance
      }))

      callbacks.onPinchMove?.(scale, center)
    }

    event.preventDefault()
  }, [calculateDistance, calculateCenter, calculateVelocity, dragThreshold, callbacks])

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    const now = Date.now()
    
    // Clear long press timeout
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = undefined
    }

    if (gestureState.isGesturing) {
      const duration = now - gestureState.startTime
      const deltaX = gestureState.currentPosition.x - gestureState.startPosition.x
      const deltaY = gestureState.currentPosition.y - gestureState.startPosition.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      // Handle swipe gestures
      if (gestureState.gestureType === 'pan' && distance >= minimumSwipeDistance) {
        const velocity = Math.sqrt(
          gestureState.velocity.x * gestureState.velocity.x +
          gestureState.velocity.y * gestureState.velocity.y
        )

        if (velocity >= minimumSwipeVelocity) {
          // Determine swipe direction
          const absX = Math.abs(deltaX)
          const absY = Math.abs(deltaY)

          if (enableHapticFeedback) {
            gestureHaptics.swipeEnd(true)
          }

          if (absX > absY) {
            // Horizontal swipe
            if (deltaX > 0) {
              callbacks.onSwipeRight?.(
                gestureState.startPosition.x,
                gestureState.currentPosition.x,
                velocity
              )
            } else {
              callbacks.onSwipeLeft?.(
                gestureState.startPosition.x,
                gestureState.currentPosition.x,
                velocity
              )
            }
          } else {
            // Vertical swipe
            if (deltaY > 0) {
              callbacks.onSwipeDown?.(
                gestureState.startPosition.y,
                gestureState.currentPosition.y,
                velocity
              )
            } else {
              callbacks.onSwipeUp?.(
                gestureState.startPosition.y,
                gestureState.currentPosition.y,
                velocity
              )
            }
          }
        }
      }

      // Handle pinch end
      if (gestureState.gestureType === 'pinch') {
        callbacks.onPinchEnd?.(gestureState.scale, gestureState.currentPosition)
        if (enableHapticFeedback) {
          gestureHaptics.pinchEnd()
        }
      }
    }

    // Reset gesture state
    setGestureState({
      isGesturing: false,
      gestureType: null,
      startTime: 0,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      scale: 1,
      distance: 0
    })

    touchState.current.touches = []
  }, [
    gestureState,
    minimumSwipeDistance,
    minimumSwipeVelocity,
    callbacks,
    enableHapticFeedback,
    gestureHaptics
  ])

  // Mouse event handlers (for desktop drag & drop)
  const handleMouseDown = useCallback((event: MouseEvent, appointment?: BookingResponse) => {
    if (appointment && enableDragAndDrop) {
      handleDragStart(event, appointment)
    }
  }, [enableDragAndDrop, handleDragStart])

  // Set up global event listeners for drag operations
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleDragMove)
      document.addEventListener('mouseup', handleDragEnd)
      document.addEventListener('touchmove', handleDragMove)
      document.addEventListener('touchend', handleDragEnd)

      return () => {
        document.removeEventListener('mousemove', handleDragMove)
        document.removeEventListener('mouseup', handleDragEnd)
        document.removeEventListener('touchmove', handleDragMove)
        document.removeEventListener('touchend', handleDragEnd)
      }
    }
  }, [dragState.isDragging, handleDragMove, handleDragEnd])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
      }
    }
  }, [])

  return {
    // Drag state
    dragState,
    isDragging: dragState.isDragging,
    draggedAppointment: dragState.draggedItem,
    
    // Gesture state
    gestureState,
    isGesturing: gestureState.isGesturing,
    
    // Event handlers for components to bind
    handlers: {
      onTouchStart: enableGestures ? handleTouchStart : undefined,
      onTouchMove: enableGestures ? handleTouchMove : undefined,
      onTouchEnd: enableGestures ? handleTouchEnd : undefined,
      onMouseDown: enableDragAndDrop ? handleMouseDown : undefined,
      onDragStart: enableDragAndDrop ? handleDragStart : undefined
    },

    // Utility functions
    startDrag: (appointment: BookingResponse, position: { x: number; y: number }) => {
      setDragState({
        isDragging: true,
        draggedItem: appointment,
        dragOffset: { x: 0, y: 0 },
        startPosition: position,
        currentPosition: position,
        dropTarget: null,
        validDrop: false
      })
    },

    // Configuration
    options: {
      enableDragAndDrop,
      enableGestures,
      enableHapticFeedback,
      minimumSwipeDistance,
      minimumSwipeVelocity,
      longPressDelay,
      doubleTapDelay,
      pinchThreshold,
      dragThreshold
    }
  }
}

export default useCalendarInteractions
export type { 
  DragState, 
  GestureState, 
  TouchState, 
  InteractionCallbacks, 
  InteractionOptions 
}