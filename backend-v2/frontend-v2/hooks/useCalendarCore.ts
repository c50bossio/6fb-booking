'use client'

import { useState, useCallback } from 'react'
import { isSameDay } from 'date-fns'
import type { BookingResponse } from '@/lib/api'
import type { ConflictAnalysis } from '@/lib/appointment-conflicts'

interface Appointment extends BookingResponse {
  height?: number
}

export interface UnifiedCalendarState {
  // Date management
  currentDate: Date
  selectedDate: Date | null
  
  // UI state
  hoveredDay: number | null
  hoveredAppointment: Appointment | null
  tooltipPosition: { x: number; y: number }
  selectedAppointmentId: string | null
  
  // Drag & drop state
  draggedAppointment: Appointment | null
  dragOverSlot: { day: Date; hour: number; minute: number } | null
  dragOverDay: number | null
  isDragging: boolean
  dropSuccess: { day: Date; hour: number; minute: number } | null
  
  // Modal state
  selectedClient: any | null
  showClientModal: boolean
  showConflictModal: boolean
  
  // Conflict management
  conflictAnalysis: ConflictAnalysis | null
  pendingUpdate: { appointmentId: number; newStartTime: string } | null
  
  // Optimistic updates
  optimisticUpdates: Map<number, { originalStartTime: string; newStartTime: string }>
}

interface UseCalendarCoreProps {
  initialDate: Date
  onAppointmentUpdate?: (appointmentId: number, newStartTime: string, isDragDrop?: boolean) => void
  checkAndUpdateAppointment?: (appointmentId: number, newStartTime: string, isDragDrop: boolean) => void
}

/**
 * Core calendar hook that combines state management and drag-and-drop functionality
 * Consolidates useCalendarState and useCalendarDragAndDrop into a single hook
 */
export function useCalendarCore({
  initialDate,
  onAppointmentUpdate,
  checkAndUpdateAppointment
}: UseCalendarCoreProps) {
  const [state, setState] = useState<UnifiedCalendarState>(() => ({
    currentDate: initialDate,
    selectedDate: initialDate,
    hoveredDay: null,
    hoveredAppointment: null,
    tooltipPosition: { x: 0, y: 0 },
    selectedAppointmentId: null,
    draggedAppointment: null,
    dragOverSlot: null,
    dragOverDay: null,
    isDragging: false,
    dropSuccess: null,
    selectedClient: null,
    showClientModal: false,
    showConflictModal: false,
    conflictAnalysis: null,
    pendingUpdate: null,
    optimisticUpdates: new Map()
  }))

  // State update functions
  const updateState = useCallback((updates: Partial<UnifiedCalendarState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const updateDragState = useCallback((dragUpdates: Partial<Pick<UnifiedCalendarState, 
    'draggedAppointment' | 'dragOverSlot' | 'dragOverDay' | 'isDragging' | 'dropSuccess'
  >>) => {
    setState(prev => ({ ...prev, ...dragUpdates }))
  }, [])

  const setCurrentDate = useCallback((date: Date) => {
    setState(prev => ({ ...prev, currentDate: date }))
  }, [])

  const setSelectedDate = useCallback((date: Date | null) => {
    setState(prev => ({ ...prev, selectedDate: date }))
  }, [])

  const setHoveredDay = useCallback((day: number | null) => {
    setState(prev => ({ ...prev, hoveredDay: day }))
  }, [])

  const setHoveredAppointment = useCallback((appointment: Appointment | null) => {
    setState(prev => ({ ...prev, hoveredAppointment: appointment }))
  }, [])

  const setTooltipPosition = useCallback((position: { x: number; y: number }) => {
    setState(prev => ({ ...prev, tooltipPosition: position }))
  }, [])

  const setSelectedAppointmentId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedAppointmentId: id }))
  }, [])

  const setSelectedClient = useCallback((client: any | null) => {
    setState(prev => ({ ...prev, selectedClient: client }))
  }, [])

  const showClientModal = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showClientModal: show }))
  }, [])

  const showConflictModal = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showConflictModal: show }))
  }, [])

  const setConflictAnalysis = useCallback((analysis: ConflictAnalysis | null) => {
    setState(prev => ({ ...prev, conflictAnalysis: analysis }))
  }, [])

  const setPendingUpdate = useCallback((update: { appointmentId: number; newStartTime: string } | null) => {
    setState(prev => ({ ...prev, pendingUpdate: update }))
  }, [])

  const addOptimisticUpdate = useCallback((appointmentId: number, originalStartTime: string, newStartTime: string) => {
    setState(prev => ({
      ...prev,
      optimisticUpdates: new Map(prev.optimisticUpdates).set(appointmentId, { originalStartTime, newStartTime })
    }))
  }, [])

  const removeOptimisticUpdate = useCallback((appointmentId: number) => {
    setState(prev => {
      const newUpdates = new Map(prev.optimisticUpdates)
      newUpdates.delete(appointmentId)
      return { ...prev, optimisticUpdates: newUpdates }
    })
  }, [])

  const clearOptimisticUpdates = useCallback(() => {
    setState(prev => ({ ...prev, optimisticUpdates: new Map() }))
  }, [])

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent, day: Date, hour: number, minute: number) => {
    e.preventDefault() // Always prevent default to allow drop
    if (state.draggedAppointment) {
      e.dataTransfer.dropEffect = 'move'
      updateDragState({ dragOverSlot: { day, hour, minute } })
    }
  }, [state.draggedAppointment, updateDragState])

  const handleDragLeave = useCallback(() => {
    updateDragState({ dragOverSlot: null })
  }, [updateDragState])

  const handleDragStart = useCallback((e: React.DragEvent, appointment: Appointment) => {
    try {
      if (appointment.status !== 'completed' && appointment.status !== 'cancelled') {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', appointment.id.toString())
        
        // Add drag image
        const dragImage = e.currentTarget as HTMLElement
        e.dataTransfer.setDragImage(dragImage, dragImage.offsetWidth / 2, dragImage.offsetHeight / 2)
        
        updateDragState({ 
          draggedAppointment: appointment, 
          isDragging: true 
        })
      } else {
        e.preventDefault()
      }
    } catch (error) {
      console.error('Drag start error:', error)
    }
  }, [updateDragState])

  const handleDragEnd = useCallback(() => {
    updateDragState({ 
      draggedAppointment: null, 
      dragOverSlot: null, 
      isDragging: false 
    })
  }, [updateDragState])

  const handleDrop = useCallback((e: React.DragEvent, day: Date, hour: number, minute: number) => {
    try {
      e.preventDefault()
      const draggedApp = state.draggedAppointment // Store reference before clearing
      
      if (draggedApp && onAppointmentUpdate) {
        const newDate = new Date(day)
        newDate.setHours(hour, minute, 0, 0)
        
        const originalStartTime = draggedApp.start_time
        const newStartTime = newDate.toISOString()

        // Check if the appointment is actually being moved to a different time
        if (originalStartTime !== newStartTime) {
          // Show visual feedback
          updateDragState({ dropSuccess: { day, hour, minute } })
          setTimeout(() => {
            updateDragState({ dropSuccess: null })
          }, 1000)

          // Add optimistic update
          addOptimisticUpdate(draggedApp.id, originalStartTime, newStartTime)

          // Call update handler
          if (checkAndUpdateAppointment) {
            checkAndUpdateAppointment(draggedApp.id, newStartTime, true)
          } else {
            onAppointmentUpdate(draggedApp.id, newStartTime, true)
          }
        }
      }
    } catch (error) {
      console.error('Drop error:', error)
    } finally {
      // Always clear drag state
      handleDragEnd()
    }
  }, [state.draggedAppointment, onAppointmentUpdate, checkAndUpdateAppointment, updateDragState, addOptimisticUpdate, handleDragEnd])

  const getDragHandlers = useCallback(() => ({
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop
  }), [handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop])

  const canDragAppointment = useCallback((appointment: Appointment) => {
    return appointment.status !== 'completed' && appointment.status !== 'cancelled'
  }, [])

  const isAppointmentBeingDragged = useCallback((appointment: Appointment) => {
    return state.draggedAppointment?.id === appointment.id
  }, [state.draggedAppointment])

  const isSlotValidDropTarget = useCallback((day: Date, hour: number, minute: number) => {
    // Add business logic for valid drop targets
    const now = new Date()
    const slotTime = new Date(day)
    slotTime.setHours(hour, minute, 0, 0)
    
    // Don't allow dropping in the past
    return slotTime >= now
  }, [])

  return {
    // State
    state,
    
    // State updaters
    updateState,
    setCurrentDate,
    setSelectedDate,
    setHoveredDay,
    setHoveredAppointment,
    setTooltipPosition,
    setSelectedAppointmentId,
    setSelectedClient,
    showClientModal,
    showConflictModal,
    setConflictAnalysis,
    setPendingUpdate,
    
    // Optimistic updates
    addOptimisticUpdate,
    removeOptimisticUpdate,
    clearOptimisticUpdates,
    
    // Drag and drop
    updateDragState,
    getDragHandlers,
    canDragAppointment,
    isAppointmentBeingDragged,
    isSlotValidDropTarget,
    
    // Individual drag handlers (for fine-grained control)
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop
  }
}

// Legacy exports for backwards compatibility
export type { Appointment, UnifiedCalendarState }