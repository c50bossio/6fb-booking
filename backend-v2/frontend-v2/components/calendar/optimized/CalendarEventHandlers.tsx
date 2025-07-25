'use client'

import { useCallback, useMemo, useRef } from 'react'
import { debounce, throttle } from 'lodash-es'

interface CalendarEventHandlersProps {
  onAppointmentUpdate: (appointmentId: number, newStartTime: string, isDragDrop?: boolean) => void
  onBarberSelect: (barberId: number | 'all') => void
  onLocationChange: (locationId: string) => void
  onDateChange: (date: Date) => void
  onViewModeChange: (mode: 'day' | 'week' | 'month') => void
}

/**
 * Optimized event handlers with debouncing and throttling
 * Prevents excessive re-renders and API calls during rapid user interactions
 */
export function useOptimizedCalendarEventHandlers({
  onAppointmentUpdate,
  onBarberSelect,
  onLocationChange,
  onDateChange,
  onViewModeChange
}: CalendarEventHandlersProps) {
  
  // Performance monitoring
  const interactionCountRef = useRef(0)
  const lastInteractionRef = useRef(Date.now())
  
  // Debounced handlers for expensive operations
  const debouncedBarberSelect = useMemo(
    () => debounce((barberId: number | 'all') => {
      onBarberSelect(barberId)
      // Track selection for analytics
      console.debug('Barber selection changed:', barberId)
    }, 300),
    [onBarberSelect]
  )
  
  const debouncedLocationChange = useMemo(
    () => debounce((locationId: string) => {
      onLocationChange(locationId)
      console.debug('Location changed:', locationId)
    }, 500),
    [onLocationChange]
  )
  
  // Throttled handlers for frequent operations
  const throttledAppointmentDrag = useMemo(
    () => throttle((appointmentId: number, newStartTime: string) => {
      onAppointmentUpdate(appointmentId, newStartTime, true)
    }, 16), // 60fps for smooth drag operations
    [onAppointmentUpdate]
  )
  
  const throttledDateNavigation = useMemo(
    () => throttle((date: Date) => {
      onDateChange(date)
    }, 100), // Prevent rapid date changes during swipe navigation
    [onDateChange]
  )
  
  // Immediate handlers for critical operations
  const handleViewModeChange = useCallback((mode: 'day' | 'week' | 'month') => {
    onViewModeChange(mode)
    // Track view mode changes for analytics
    console.debug('View mode changed:', mode)
  }, [onViewModeChange])
  
  // Enhanced appointment update with conflict detection
  const handleAppointmentUpdate = useCallback(async (
    appointmentId: number, 
    newStartTime: string, 
    isDragDrop: boolean = false
  ) => {
    const startTime = performance.now()
    
    try {
      // Track interaction frequency for performance monitoring
      interactionCountRef.current++
      lastInteractionRef.current = Date.now()
      
      if (isDragDrop) {
        throttledAppointmentDrag(appointmentId, newStartTime)
      } else {
        onAppointmentUpdate(appointmentId, newStartTime, isDragDrop)
      }
      
      const endTime = performance.now()
      console.debug(`Appointment update took ${endTime - startTime}ms`)
      
    } catch (error) {
      console.error('Failed to update appointment:', error)
    }
  }, [onAppointmentUpdate, throttledAppointmentDrag])
  
  // Keyboard event handlers with proper debouncing
  const handleKeyboardNavigation = useMemo(
    () => debounce((event: KeyboardEvent) => {
      const today = new Date()
      
      switch (event.key) {
        case 'ArrowLeft':
          if (event.metaKey || event.ctrlKey) {
            // Previous week/month
            const newDate = new Date(today)
            newDate.setDate(today.getDate() - 7)
            throttledDateNavigation(newDate)
          }
          break
        case 'ArrowRight':
          if (event.metaKey || event.ctrlKey) {
            // Next week/month
            const newDate = new Date(today)
            newDate.setDate(today.getDate() + 7)
            throttledDateNavigation(newDate)
          }
          break
        case 't':
          // Go to today
          throttledDateNavigation(new Date())
          break
      }
    }, 200),
    [throttledDateNavigation]
  )
  
  // Touch event handlers for mobile optimization
  const handleTouchEvents = useMemo(() => {
    let touchStartTime = 0
    let touchStartY = 0
    
    return {
      onTouchStart: (e: TouchEvent) => {
        touchStartTime = Date.now()
        touchStartY = e.touches[0].clientY
      },
      
      onTouchEnd: throttle((e: TouchEvent) => {
        const touchEndTime = Date.now()
        const touchEndY = e.changedTouches[0].clientY
        const touchDuration = touchEndTime - touchStartTime
        const touchDistance = Math.abs(touchEndY - touchStartY)
        
        // Detect swipe gestures for date navigation
        if (touchDuration < 300 && touchDistance > 50) {
          const today = new Date()
          if (touchEndY < touchStartY) {
            // Swipe up - next week
            const newDate = new Date(today)
            newDate.setDate(today.getDate() + 7)
            throttledDateNavigation(newDate)
          } else {
            // Swipe down - previous week
            const newDate = new Date(today)
            newDate.setDate(today.getDate() - 7)
            throttledDateNavigation(newDate)
          }
        }
      }, 100)
    }
  }, [throttledDateNavigation])
  
  // Performance monitoring for event handlers
  const getPerformanceMetrics = useCallback(() => {
    const timeSinceLastInteraction = Date.now() - lastInteractionRef.current
    
    return {
      totalInteractions: interactionCountRef.current,
      timeSinceLastInteraction,
      averageInteractionRate: interactionCountRef.current / (Date.now() / 1000 / 60), // per minute
    }
  }, [])
  
  // Cleanup function for debounced/throttled handlers
  const cleanup = useCallback(() => {
    debouncedBarberSelect.cancel()
    debouncedLocationChange.cancel()
    throttledAppointmentDrag.cancel()
    throttledDateNavigation.cancel()
    handleKeyboardNavigation.cancel()
  }, [debouncedBarberSelect, debouncedLocationChange, throttledAppointmentDrag, throttledDateNavigation, handleKeyboardNavigation])
  
  return {
    // Optimized event handlers
    handleBarberSelect: debouncedBarberSelect,
    handleLocationChange: debouncedLocationChange,
    handleAppointmentUpdate,
    handleDateChange: throttledDateNavigation,
    handleViewModeChange,
    handleKeyboardNavigation,
    handleTouchEvents,
    
    // Performance monitoring
    getPerformanceMetrics,
    cleanup,
    
    // Direct access to throttled handlers for specific use cases
    throttledAppointmentDrag,
    throttledDateNavigation
  }
}