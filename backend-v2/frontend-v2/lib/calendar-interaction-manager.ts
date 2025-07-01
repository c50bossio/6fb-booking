/**
 * Unified Calendar Interaction Manager
 * Standardizes user interactions across all calendar views for consistent UX
 */

import { useCallback, useRef, useEffect, useState } from 'react'
import { 
  CalendarInteraction, 
  CalendarEventHandlers, 
  VisualState, 
  Appointment, 
  CALENDAR_CONSTANTS,
  AccessibilityState 
} from '@/types/calendar'

interface InteractionManagerConfig {
  // Unified interaction rules
  singleClickAction: 'select' | 'create' | 'none'
  doubleClickAction: 'create' | 'edit' | 'none'
  
  // Touch and mobile settings
  enableTouchDrag: boolean
  touchHoldDelay: number
  
  // Accessibility
  enableKeyboardNavigation: boolean
  announceActions: boolean
  
  // Visual feedback
  showHoverStates: boolean
  highlightDropZones: boolean
  animateTransitions: boolean
}

interface InteractionState {
  clickCount: number
  lastClickTime: number
  lastClickTarget: EventTarget | null
  isDragging: boolean
  dragStartTime: number
  isKeyboardMode: boolean
  pendingInteraction: CalendarInteraction | null
}

const DEFAULT_CONFIG: InteractionManagerConfig = {
  singleClickAction: 'select',
  doubleClickAction: 'create',
  enableTouchDrag: true,
  touchHoldDelay: CALENDAR_CONSTANTS.LONG_PRESS_DELAY,
  enableKeyboardNavigation: true,
  announceActions: true,
  showHoverStates: true,
  highlightDropZones: true,
  animateTransitions: true
}

export function useCalendarInteractionManager(
  config: Partial<InteractionManagerConfig> = {},
  onInteraction?: (interaction: CalendarInteraction) => void,
  onVisualStateChange?: (state: Partial<VisualState>) => void,
  onAccessibilityAnnounce?: (message: string, priority?: 'polite' | 'assertive') => void
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
  // Interaction state
  const [interactionState, setInteractionState] = useState<InteractionState>({
    clickCount: 0,
    lastClickTime: 0,
    lastClickTarget: null,
    isDragging: false,
    dragStartTime: 0,
    isKeyboardMode: false,
    pendingInteraction: null
  })
  
  // Refs for timeout management
  const clickTimerRef = useRef<NodeJS.Timeout>()
  const hoverTimerRef = useRef<NodeJS.Timeout>()
  const dragTimerRef = useRef<NodeJS.Timeout>()
  
  // Visual state for better UX
  const [visualState, setVisualState] = useState<VisualState>({
    hoveredDate: null,
    hoveredAppointment: null,
    selectedAppointments: new Set(),
    highlightedTimeSlots: [],
    isSelectionMode: false,
    dragOverTarget: null
  })
  
  // Enhanced click handler with double-click detection
  const handleClick = useCallback((
    target: Date | Appointment,
    targetType: 'date' | 'appointment' | 'time-slot',
    event: React.MouseEvent
  ) => {
    const now = Date.now()
    const timeSinceLastClick = now - interactionState.lastClickTime
    const isSameTarget = event.target === interactionState.lastClickTarget
    
    // Update interaction state
    setInteractionState(prev => ({
      ...prev,
      lastClickTime: now,
      lastClickTarget: event.target,
      clickCount: isSameTarget && timeSinceLastClick < CALENDAR_CONSTANTS.DOUBLE_CLICK_DELAY 
        ? prev.clickCount + 1 
        : 1
    }))
    
    // Clear existing timer
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
    }
    
    // Handle double-click immediately
    if (interactionState.clickCount === 1 && isSameTarget && timeSinceLastClick < CALENDAR_CONSTANTS.DOUBLE_CLICK_DELAY) {
      handleDoubleClick(target, targetType, event)
      return
    }
    
    // Delay single-click to check for double-click
    clickTimerRef.current = setTimeout(() => {
      handleSingleClick(target, targetType, event)
    }, CALENDAR_CONSTANTS.DOUBLE_CLICK_DELAY)
    
  }, [interactionState.clickCount, interactionState.lastClickTime, interactionState.lastClickTarget])
  
  // Single click handler - unified behavior
  const handleSingleClick = useCallback((
    target: Date | Appointment,
    targetType: 'date' | 'appointment' | 'time-slot',
    event: React.MouseEvent
  ) => {
    const interaction: CalendarInteraction = {
      type: finalConfig.singleClickAction,
      target: targetType,
      data: target,
      event
    }
    
    // Handle selection mode logic
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      if (targetType === 'appointment') {
        const appointment = target as Appointment
        setVisualState(prev => {
          const newSelected = new Set(prev.selectedAppointments)
          if (newSelected.has(appointment.id)) {
            newSelected.delete(appointment.id)
          } else {
            newSelected.add(appointment.id)
          }
          return {
            ...prev,
            selectedAppointments: newSelected,
            isSelectionMode: newSelected.size > 0
          }
        })
        
        if (finalConfig.announceActions && onAccessibilityAnnounce) {
          const action = visualState.selectedAppointments.has((target as Appointment).id) ? 'deselected' : 'selected'
          onAccessibilityAnnounce(`Appointment ${action}`, 'polite')
        }
        return
      }
    }
    
    // Standard single-click behavior
    if (finalConfig.singleClickAction === 'select') {
      if (targetType === 'date') {
        const date = target as Date
        onVisualStateChange?.({ 
          hoveredDate: date,
          selectedAppointments: new Set(),
          isSelectionMode: false
        })
        
        if (finalConfig.announceActions && onAccessibilityAnnounce) {
          onAccessibilityAnnounce(`Selected ${date.toLocaleDateString()}`, 'polite')
        }
      } else if (targetType === 'appointment') {
        const appointment = target as Appointment
        setVisualState(prev => ({
          ...prev,
          selectedAppointments: new Set([appointment.id]),
          isSelectionMode: false,
          hoveredAppointment: appointment
        }))
        
        if (finalConfig.announceActions && onAccessibilityAnnounce) {
          onAccessibilityAnnounce(
            `Selected appointment with ${appointment.client_name || 'client'} at ${new Date(appointment.start_time).toLocaleTimeString()}`,
            'polite'
          )
        }
      }
    }
    
    onInteraction?.(interaction)
  }, [finalConfig, visualState, onInteraction, onVisualStateChange, onAccessibilityAnnounce])
  
  // Double click handler - unified creation/editing
  const handleDoubleClick = useCallback((
    target: Date | Appointment,
    targetType: 'date' | 'appointment' | 'time-slot',
    event: React.MouseEvent
  ) => {
    // Clear single-click timer
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
    }
    
    const interaction: CalendarInteraction = {
      type: finalConfig.doubleClickAction,
      target: targetType,
      data: target,
      event
    }
    
    // Clear any selections on double-click
    setVisualState(prev => ({
      ...prev,
      selectedAppointments: new Set(),
      isSelectionMode: false
    }))
    
    if (finalConfig.announceActions && onAccessibilityAnnounce) {
      const actionText = finalConfig.doubleClickAction === 'create' ? 'Creating new appointment' : 'Opening appointment editor'
      onAccessibilityAnnounce(actionText, 'assertive')
    }
    
    onInteraction?.(interaction)
  }, [finalConfig, onInteraction, onAccessibilityAnnounce])
  
  // Enhanced hover handling with delayed feedback
  const handleMouseEnter = useCallback((
    target: Date | Appointment,
    targetType: 'date' | 'appointment' | 'time-slot',
    event: React.MouseEvent
  ) => {
    if (!finalConfig.showHoverStates) return
    
    // Clear existing timer
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
    }
    
    // Delayed hover to prevent excessive state updates
    hoverTimerRef.current = setTimeout(() => {
      if (targetType === 'date') {
        setVisualState(prev => ({ ...prev, hoveredDate: target as Date }))
      } else if (targetType === 'appointment') {
        setVisualState(prev => ({ ...prev, hoveredAppointment: target as Appointment }))
      }
      
      onVisualStateChange?.({ 
        hoveredDate: targetType === 'date' ? target as Date : null,
        hoveredAppointment: targetType === 'appointment' ? target as Appointment : null
      })
    }, CALENDAR_CONSTANTS.HOVER_DELAY)
    
  }, [finalConfig.showHoverStates, onVisualStateChange])
  
  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
    }
    
    setVisualState(prev => ({
      ...prev,
      hoveredDate: null,
      hoveredAppointment: null
    }))
    
    onVisualStateChange?.({
      hoveredDate: null,
      hoveredAppointment: null
    })
  }, [onVisualStateChange])
  
  // Enhanced keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!finalConfig.enableKeyboardNavigation) return
    
    setInteractionState(prev => ({ ...prev, isKeyboardMode: true }))
    
    const key = event.key
    
    // Global keyboard shortcuts
    switch (key) {
      case 'Escape':
        // Clear all selections and modes
        setVisualState(prev => ({
          ...prev,
          selectedAppointments: new Set(),
          isSelectionMode: false,
          hoveredDate: null,
          hoveredAppointment: null,
          dragOverTarget: null
        }))
        
        if (finalConfig.announceActions && onAccessibilityAnnounce) {
          onAccessibilityAnnounce('Cleared all selections', 'polite')
        }
        break
        
      case 'Delete':
      case 'Backspace':
        if (visualState.selectedAppointments.size > 0) {
          const interaction: CalendarInteraction = {
            type: 'delete',
            target: 'appointment',
            data: Array.from(visualState.selectedAppointments),
            event
          }
          onInteraction?.(interaction)
        }
        break
        
      case 'Enter':
      case ' ':
        // Create appointment at focused date or edit selected appointment
        if (visualState.selectedAppointments.size === 1) {
          const interaction: CalendarInteraction = {
            type: 'edit',
            target: 'appointment',
            data: Array.from(visualState.selectedAppointments)[0],
            event
          }
          onInteraction?.(interaction)
        } else if (visualState.hoveredDate) {
          const interaction: CalendarInteraction = {
            type: 'create',
            target: 'date',
            data: visualState.hoveredDate,
            event
          }
          onInteraction?.(interaction)
        }
        break
        
      case 'a':
      case 'A':
        if (event.ctrlKey || event.metaKey) {
          // Select all appointments
          event.preventDefault()
          // This would need appointment data passed in
          if (finalConfig.announceActions && onAccessibilityAnnounce) {
            onAccessibilityAnnounce('Selected all appointments', 'polite')
          }
        }
        break
    }
  }, [finalConfig, visualState, onInteraction, onAccessibilityAnnounce])
  
  // Drag state management with enhanced feedback
  const handleDragStart = useCallback((
    appointment: Appointment,
    event: React.DragEvent
  ) => {
    setInteractionState(prev => ({
      ...prev,
      isDragging: true,
      dragStartTime: Date.now()
    }))
    
    // Set drag data
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: 'appointment',
      id: appointment.id,
      data: appointment
    }))
    event.dataTransfer.effectAllowed = 'move'
    
    if (finalConfig.announceActions && onAccessibilityAnnounce) {
      onAccessibilityAnnounce(
        `Started dragging appointment with ${appointment.client_name || 'client'}`,
        'assertive'
      )
    }
  }, [finalConfig.announceActions, onAccessibilityAnnounce])
  
  const handleDragOver = useCallback((
    target: Date,
    targetType: 'date' | 'time-slot',
    event: React.DragEvent
  ) => {
    if (!interactionState.isDragging) return
    
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    
    if (finalConfig.highlightDropZones) {
      const dragOverTarget = {
        type: targetType,
        date: target,
        timeSlot: targetType === 'time-slot' ? {
          hour: target.getHours(),
          minute: target.getMinutes()
        } : undefined
      }
      
      setVisualState(prev => ({ ...prev, dragOverTarget }))
      onVisualStateChange?.({ dragOverTarget })
    }
  }, [interactionState.isDragging, finalConfig.highlightDropZones, onVisualStateChange])
  
  const handleDragEnd = useCallback(() => {
    setInteractionState(prev => ({
      ...prev,
      isDragging: false,
      dragStartTime: 0
    }))
    
    setVisualState(prev => ({ ...prev, dragOverTarget: null }))
    onVisualStateChange?.({ dragOverTarget: null })
  }, [onVisualStateChange])
  
  // Touch gesture support for mobile
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (!finalConfig.enableTouchDrag) return
    
    // Start long press timer for drag initiation
    dragTimerRef.current = setTimeout(() => {
      setInteractionState(prev => ({ ...prev, isDragging: true }))
      
      if (finalConfig.announceActions && onAccessibilityAnnounce) {
        onAccessibilityAnnounce('Drag mode activated', 'assertive')
      }
    }, finalConfig.touchHoldDelay)
  }, [finalConfig, onAccessibilityAnnounce])
  
  const handleTouchEnd = useCallback(() => {
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current)
    }
    
    setInteractionState(prev => ({ ...prev, isDragging: false }))
  }, [])
  
  // Cleanup timers
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current) 
      if (dragTimerRef.current) clearTimeout(dragTimerRef.current)
    }
  }, [])
  
  // Mouse mode detection
  useEffect(() => {
    const handleMouseMove = () => {
      setInteractionState(prev => ({ ...prev, isKeyboardMode: false }))
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [])
  
  // Return unified handlers
  const handlers: CalendarEventHandlers = {
    onDateClick: (date, event) => handleClick(date, 'date', event),
    onDateDoubleClick: (date, event) => handleDoubleClick(date, 'date', event),
    onAppointmentClick: (appointment, event) => handleClick(appointment, 'appointment', event),
    onAppointmentDoubleClick: (appointment, event) => handleDoubleClick(appointment, 'appointment', event),
    onKeyDown: handleKeyDown,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onTouchStart: handleTouchStart,
    onTouchMove: () => {}, // Implement if needed
    onTouchEnd: handleTouchEnd,
    onDragStart: handleDragStart,
    onDragEnter: (target, event) => handleDragOver(target, 'date', event),
    onDragOver: (target, event) => handleDragOver(target, 'date', event),
    onDragLeave: () => {},
    onDrop: (appointment, target, event) => {
      const interaction: CalendarInteraction = {
        type: 'move',
        target: 'appointment',
        data: { appointment, newDate: target },
        event
      }
      onInteraction?.(interaction)
      handleDragEnd()
    },
    onDragEnd: handleDragEnd
  }
  
  return {
    handlers,
    visualState,
    interactionState,
    config: finalConfig,
    
    // Utility functions
    clearSelections: () => {
      setVisualState(prev => ({
        ...prev,
        selectedAppointments: new Set(),
        isSelectionMode: false
      }))
    },
    
    selectAppointment: (appointmentId: number) => {
      setVisualState(prev => ({
        ...prev,
        selectedAppointments: new Set([appointmentId]),
        isSelectionMode: false
      }))
    },
    
    toggleAppointmentSelection: (appointmentId: number) => {
      setVisualState(prev => {
        const newSelected = new Set(prev.selectedAppointments)
        if (newSelected.has(appointmentId)) {
          newSelected.delete(appointmentId)
        } else {
          newSelected.add(appointmentId)
        }
        return {
          ...prev,
          selectedAppointments: newSelected,
          isSelectionMode: newSelected.size > 0
        }
      })
    }
  }
}