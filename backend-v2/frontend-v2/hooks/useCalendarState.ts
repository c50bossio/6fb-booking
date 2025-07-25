'use client'

import { useState, useCallback } from 'react'
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
  
  // Client management panel state
  showClientManager: boolean
  clientManagerSelectedClient: any | null
  
  // Revenue optimization panel state
  showRevenuePanel: boolean
  revenuePanelPeriod: 'day' | 'week' | 'month'
  
  // Conflict management
  conflictAnalysis: ConflictAnalysis | null
  pendingUpdate: { appointmentId: number; newStartTime: string } | null
  
  // Optimistic updates
  optimisticUpdates: Map<number, { originalStartTime: string; newStartTime: string }>
}

export function useCalendarState(initialDate: Date) {
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
    showClientManager: false,
    clientManagerSelectedClient: null,
    showRevenuePanel: false,
    revenuePanelPeriod: 'day',
    conflictAnalysis: null,
    pendingUpdate: null,
    optimisticUpdates: new Map()
  }))

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

  const setSelectedAppointmentId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedAppointmentId: id }))
  }, [])

  const showClientModalForClient = useCallback((client: any) => {
    setState(prev => ({ 
      ...prev, 
      selectedClient: client, 
      showClientModal: true 
    }))
  }, [])

  const hideClientModal = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      showClientModal: false, 
      selectedClient: null 
    }))
  }, [])

  const showConflictModalWithAnalysis = useCallback((analysis: ConflictAnalysis, pendingUpdate: { appointmentId: number; newStartTime: string }) => {
    setState(prev => ({ 
      ...prev, 
      conflictAnalysis: analysis, 
      pendingUpdate, 
      showConflictModal: true 
    }))
  }, [])

  const hideConflictModal = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      showConflictModal: false, 
      conflictAnalysis: null,
      pendingUpdate: null
    }))
  }, [])

  const addOptimisticUpdate = useCallback((appointmentId: number, originalStartTime: string, newStartTime: string) => {
    setState(prev => ({
      ...prev,
      optimisticUpdates: new Map(prev.optimisticUpdates.set(appointmentId, { originalStartTime, newStartTime }))
    }))
  }, [])

  const removeOptimisticUpdate = useCallback((appointmentId: number) => {
    setState(prev => {
      const newMap = new Map(prev.optimisticUpdates)
      newMap.delete(appointmentId)
      return {
        ...prev,
        optimisticUpdates: newMap
      }
    })
  }, [])

  const showClientManager = useCallback(() => {
    setState(prev => ({ ...prev, showClientManager: true }))
  }, [])

  const hideClientManager = useCallback(() => {
    setState(prev => ({ ...prev, showClientManager: false }))
  }, [])

  const toggleClientManager = useCallback(() => {
    setState(prev => ({ ...prev, showClientManager: !prev.showClientManager }))
  }, [])

  const selectClientInManager = useCallback((client: any) => {
    setState(prev => ({ 
      ...prev, 
      clientManagerSelectedClient: client,
      showClientManager: true 
    }))
  }, [])

  const showRevenuePanel = useCallback(() => {
    setState(prev => ({ ...prev, showRevenuePanel: true }))
  }, [])

  const hideRevenuePanel = useCallback(() => {
    setState(prev => ({ ...prev, showRevenuePanel: false }))
  }, [])

  const toggleRevenuePanel = useCallback(() => {
    setState(prev => ({ ...prev, showRevenuePanel: !prev.showRevenuePanel }))
  }, [])

  const setRevenuePanelPeriod = useCallback((period: 'day' | 'week' | 'month') => {
    setState(prev => ({ ...prev, revenuePanelPeriod: period }))
  }, [])

  return {
    state,
    updateState,
    updateDragState,
    setCurrentDate,
    setSelectedDate,
    setSelectedAppointmentId,
    showClientModalForClient,
    hideClientModal,
    showConflictModalWithAnalysis,
    hideConflictModal,
    addOptimisticUpdate,
    removeOptimisticUpdate,
    showClientManager,
    hideClientManager,
    toggleClientManager,
    selectClientInManager,
    showRevenuePanel,
    hideRevenuePanel,
    toggleRevenuePanel,
    setRevenuePanelPeriod
  }
}