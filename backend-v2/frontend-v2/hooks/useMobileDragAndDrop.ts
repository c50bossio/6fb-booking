'use client'

/**
 * Mobile Drag and Drop Hook
 * Provides touch-based drag and drop functionality for mobile devices
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { DraggedAppointment, DropZone } from '@/lib/calendar-drag-drop'

interface TouchDragState {
  isDragging: boolean
  draggedAppointment: DraggedAppointment | null
  startPosition: { x: number; y: number }
  currentPosition: { x: number; y: number }
  dragOffset: { x: number; y: number }
  hoveredDropZone: DropZone | null
}

interface MobileDragDropCallbacks {
  onDragStart: (appointment: DraggedAppointment) => void
  onDragMove: (position: { x: number; y: number }) => void
  onDrop: (appointment: DraggedAppointment, dropZone: DropZone) => Promise<boolean>
  onDragCancel: () => void
}

export function useMobileDragAndDrop(
  appointments: DraggedAppointment[],
  dropZones: DropZone[],
  callbacks: MobileDragDropCallbacks
) {
  const [touchState, setTouchState] = useState<TouchDragState>({
    isDragging: false,
    draggedAppointment: null,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    dragOffset: { x: 0, y: 0 },
    hoveredDropZone: null
  })

  const dragPreviewRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const isDragInProgress = useRef(false)

  // Long press threshold for drag initiation
  const LONG_PRESS_DELAY = 500

  // Start touch interaction
  const handleTouchStart = useCallback((
    appointment: DraggedAppointment,
    event: React.TouchEvent
  ) => {
    const touch = event.touches[0]
    const rect = (event.target as HTMLElement).getBoundingClientRect()

    // Clear any existing timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }

    // Set up long press timer
    longPressTimer.current = setTimeout(() => {
      // Haptic feedback for drag start
      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }

      isDragInProgress.current = true

      setTouchState({
        isDragging: true,
        draggedAppointment: appointment,
        startPosition: { x: touch.clientX, y: touch.clientY },
        currentPosition: { x: touch.clientX, y: touch.clientY },
        dragOffset: {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top
        },
        hoveredDropZone: null
      })

      callbacks.onDragStart(appointment)
    }, LONG_PRESS_DELAY)

    // Prevent default to avoid scrolling
    event.preventDefault()
  }, [callbacks])

  // Handle touch movement
  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!isDragInProgress.current || !touchState.isDragging) return

    const touch = event.touches[0]
    const newPosition = { x: touch.clientX, y: touch.clientY }

    // Find drop zone under touch point
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY)
    let hoveredDropZone: DropZone | null = null

    if (elementUnderTouch) {
      const dropZoneElement = elementUnderTouch.closest('[data-drop-zone="true"]')
      if (dropZoneElement) {
        const dateStr = dropZoneElement.getAttribute('data-date')
        const time = dropZoneElement.getAttribute('data-time')
        const isValid = dropZoneElement.getAttribute('data-valid') === 'true'

        if (dateStr && time) {
          hoveredDropZone = {
            date: new Date(dateStr),
            time,
            isValid,
            conflicts: []
          }
        }
      }
    }

    setTouchState(prev => ({
      ...prev,
      currentPosition: newPosition,
      hoveredDropZone
    }))

    callbacks.onDragMove(newPosition)

    // Prevent scrolling while dragging
    event.preventDefault()
  }, [touchState.isDragging, callbacks])

  // Handle touch end
  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    if (!isDragInProgress.current || !touchState.isDragging) return

    const touch = event.changedTouches[0]
    
    // Find final drop zone
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY)
    let finalDropZone: DropZone | null = null

    if (elementUnderTouch) {
      const dropZoneElement = elementUnderTouch.closest('[data-drop-zone="true"]')
      if (dropZoneElement) {
        const dateStr = dropZoneElement.getAttribute('data-date')
        const time = dropZoneElement.getAttribute('data-time')
        const isValid = dropZoneElement.getAttribute('data-valid') === 'true'

        if (dateStr && time) {
          finalDropZone = {
            date: new Date(dateStr),
            time,
            isValid,
            conflicts: []
          }
        }
      }
    }

    // Perform drop or cancel
    if (finalDropZone && finalDropZone.isValid && touchState.draggedAppointment) {
      // Haptic feedback for successful drop
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50])
      }

      callbacks.onDrop(touchState.draggedAppointment, finalDropZone)
    } else {
      // Haptic feedback for cancelled drop
      if ('vibrate' in navigator) {
        navigator.vibrate(100)
      }

      callbacks.onDragCancel()
    }

    // Reset state
    isDragInProgress.current = false
    setTouchState({
      isDragging: false,
      draggedAppointment: null,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      dragOffset: { x: 0, y: 0 },
      hoveredDropZone: null
    })
  }, [touchState.isDragging, touchState.draggedAppointment, callbacks])

  // Cancel drag on touch cancel
  const handleTouchCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    if (isDragInProgress.current) {
      callbacks.onDragCancel()
    }

    isDragInProgress.current = false
    setTouchState({
      isDragging: false,
      draggedAppointment: null,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      dragOffset: { x: 0, y: 0 },
      hoveredDropZone: null
    })
  }, [callbacks])

  // Update drag preview position
  useEffect(() => {
    if (touchState.isDragging && dragPreviewRef.current) {
      const preview = dragPreviewRef.current
      const x = touchState.currentPosition.x - touchState.dragOffset.x
      const y = touchState.currentPosition.y - touchState.dragOffset.y

      preview.style.transform = `translate(${x}px, ${y}px)`
      preview.style.display = 'block'
    } else if (dragPreviewRef.current) {
      dragPreviewRef.current.style.display = 'none'
    }
  }, [touchState.isDragging, touchState.currentPosition, touchState.dragOffset])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [])

  return {
    touchState,
    dragPreviewRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    isDragging: touchState.isDragging
  }
}

/**
 * Create touch-enabled draggable props for appointments
 */
export function createTouchDraggableProps(
  appointment: DraggedAppointment,
  onTouchStart: (appointment: DraggedAppointment, event: React.TouchEvent) => void
) {
  return {
    onTouchStart: (event: React.TouchEvent) => onTouchStart(appointment, event),
    style: {
      touchAction: 'none' // Prevent default touch behaviors
    },
    className: 'touch-draggable select-none',
    'data-appointment-id': appointment.id
  }
}

/**
 * Create mobile-friendly drop zone props
 */
export function createMobileDropZoneProps(
  dropZone: DropZone,
  isHovered: boolean = false
) {
  return {
    'data-drop-zone': 'true',
    'data-date': dropZone.date.toISOString(),
    'data-time': dropZone.time,
    'data-valid': dropZone.isValid,
    className: `
      mobile-drop-zone transition-colors duration-200
      ${dropZone.isValid ? 'touch-drop-valid' : 'touch-drop-invalid'}
      ${isHovered && dropZone.isValid ? 'bg-teal-50 border-teal-300 border-2' : ''}
      ${isHovered && !dropZone.isValid ? 'bg-red-50 border-red-300 border-2' : ''}
      ${dropZone.conflicts && dropZone.conflicts.length > 0 ? 'border-yellow-300 bg-yellow-50' : ''}
    `.trim(),
    style: {
      minHeight: '40px', // Ensure touch target is large enough
      minWidth: '40px'
    }
  }
}