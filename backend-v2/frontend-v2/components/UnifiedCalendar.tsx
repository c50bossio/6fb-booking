'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { format, startOfWeek, endOfWeek, addDays, isSameDay, startOfDay, addHours, addMinutes, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { Button } from './ui/Button'
import { parseAPIDate, isToday as checkIsToday } from '@/lib/timezone'
import Image from 'next/image'
import ClientDetailModal from './modals/ClientDetailModal'
import { touchDragManager, TouchDragManager } from '@/lib/touch-utils'
import { conflictManager, ConflictAnalysis, ConflictResolution } from '@/lib/appointment-conflicts'
import ConflictResolutionModal from './modals/ConflictResolutionModal'
import { useCalendarPerformance } from '@/hooks/useCalendarPerformance'
import { useCalendarAccessibility } from '@/hooks/useCalendarAccessibility'
import { useResponsive } from '@/hooks/useResponsive'
import { getServiceConfig, getBarberSymbol, type ServiceType } from '@/lib/calendar-constants'
import '@/styles/calendar-animations.css'

// Use standardized booking response interface
import type { BookingResponse } from '@/lib/api'

interface Appointment extends BookingResponse {
  height?: number // Calendar-specific computed field
}

interface Barber {
  id: number
  name?: string
  first_name?: string
  last_name?: string
  email: string
  avatar?: string
  role?: string
}

export type CalendarView = 'day' | 'week' | 'month'

interface UnifiedCalendarProps {
  // Core props
  view: CalendarView
  onViewChange?: (view: CalendarView) => void
  currentDate?: Date
  onDateChange?: (date: Date) => void
  
  // Data props
  appointments: Appointment[]
  barbers?: Barber[]
  clients?: any[]
  
  // Filter props
  selectedBarberId?: number | 'all'
  onBarberSelect?: (barberId: number | 'all') => void
  
  // Event handlers
  onAppointmentClick?: (appointment: Appointment) => void
  onClientClick?: (client: any) => void
  onTimeSlotClick?: (date: Date, barberId?: number) => void
  onAppointmentUpdate?: (appointmentId: number, newStartTime: string) => void
  onDayClick?: (date: Date) => void
  onDayDoubleClick?: (date: Date) => void
  
  // Configuration props
  startHour?: number
  endHour?: number
  slotDuration?: number
  isLoading?: boolean
  onRefresh?: () => void
  onPreloadDate?: (date: Date) => void
  
  // Style props
  className?: string
}

// Unified state interface
interface UnifiedCalendarState {
  // Date management
  currentDate: Date
  selectedDate: Date | null
  
  // UI state
  hoveredDay: number | null
  hoveredAppointment: Appointment | null
  tooltipPosition: { x: number; y: number }
  
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

// Drag & Drop handlers interface
interface DragHandlers {
  handleDragOver: (e: React.DragEvent, day: Date, hour: number, minute: number) => void
  handleDragLeave: () => void
  handleDragStart: (e: React.DragEvent, appointment: Appointment) => void
  handleDragEnd: () => void
  handleDrop: (e: React.DragEvent, day: Date, hour: number, minute: number) => void
}

const UnifiedCalendar = React.memo(function UnifiedCalendar({
  view,
  onViewChange,
  currentDate = new Date(),
  onDateChange,
  appointments = [],
  barbers = [],
  clients = [],
  selectedBarberId = 'all',
  onBarberSelect,
  onAppointmentClick,
  onClientClick,
  onTimeSlotClick,
  onAppointmentUpdate,
  onDayClick,
  onDayDoubleClick,
  startHour = 8,
  endHour = 19,
  slotDuration = 30,
  isLoading = false,
  onRefresh,
  onPreloadDate,
  className = ""
}: UnifiedCalendarProps) {
  
  // Unified state management
  const [state, setState] = useState<UnifiedCalendarState>(() => ({
    currentDate,
    selectedDate: currentDate,
    hoveredDay: null,
    hoveredAppointment: null,
    tooltipPosition: { x: 0, y: 0 },
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
  
  // Unified performance and accessibility hooks
  const { 
    measureRender, 
    optimizedAppointmentFilter, 
    memoizedDateCalculations,
    optimizedAppointmentsByDay,
    memoizedStatusColor,
    throttle 
  } = useCalendarPerformance()
  
  const { 
    announce, 
    keyboardNav, 
    getGridProps, 
    getGridCellProps, 
    isHighContrast 
  } = useCalendarAccessibility()
  
  const { isMobile, isTablet } = useResponsive()
  const isTouchDevice = TouchDragManager.isTouchDevice()
  const scheduleGridRef = useRef<HTMLDivElement>(null)
  
  // Enhanced drag & drop with optimistic updates
  const checkAndUpdateAppointment = useCallback(async (appointmentId: number, newStartTime: string) => {
    console.log('[DRAG DEBUG] checkAndUpdateAppointment called:', { appointmentId, newStartTime })
    
    const appointment = appointments.find(apt => apt.id === appointmentId)
    if (!appointment) {
      console.error('[DRAG DEBUG] Appointment not found:', appointmentId)
      return
    }

    // Store original state for rollback
    const originalStartTime = appointment.start_time
    console.log('[DRAG DEBUG] Original start time:', originalStartTime)
    
    // Apply optimistic update immediately for better UX
    setState(prev => ({
      ...prev,
      optimisticUpdates: new Map(prev.optimisticUpdates.set(appointmentId, { originalStartTime, newStartTime }))
    }))

    // Create updated appointment for conflict checking
    const updatedAppointment = {
      ...appointment,
      start_time: newStartTime,
      id: appointmentId
    }

    // Analyze conflicts
    const analysis = conflictManager.analyzeConflicts(
      updatedAppointment,
      appointments,
      {
        bufferTime: 15,
        checkBarberAvailability: true,
        workingHours: { start: startHour, end: endHour },
        allowAdjacent: false
      }
    )

    if (analysis.hasConflicts && analysis.riskScore > 30) {
      // Rollback optimistic update
      setState(prev => {
        const newMap = new Map(prev.optimisticUpdates)
        newMap.delete(appointmentId)
        return {
          ...prev,
          optimisticUpdates: newMap,
          conflictAnalysis: analysis,
          pendingUpdate: { appointmentId, newStartTime },
          showConflictModal: true
        }
      })
    } else {
      // No significant conflicts, proceed with update
      if (onAppointmentUpdate) {
        console.log('[DRAG DEBUG] Calling onAppointmentUpdate with:', { appointmentId, newStartTime })
        try {
          await onAppointmentUpdate(appointmentId, newStartTime)
          console.log('[DRAG DEBUG] Update successful!')
          
          // Success - clear optimistic update (it's now permanent)
          setState(prev => {
            const newMap = new Map(prev.optimisticUpdates)
            newMap.delete(appointmentId)
            return {
              ...prev,
              optimisticUpdates: newMap
            }
          })
          
        } catch (updateError: any) {
          console.error('[DRAG DEBUG] Update failed:', updateError)
          // Rollback optimistic update on failure
          setState(prev => {
            const newMap = new Map(prev.optimisticUpdates)
            newMap.delete(appointmentId)
            return {
              ...prev,
              optimisticUpdates: newMap
            }
          })
          
          console.error('Failed to update appointment:', updateError)
        }
      } else {
        console.error('[DRAG DEBUG] onAppointmentUpdate is not defined!')
      }
    }
  }, [appointments, onAppointmentUpdate, startHour, endHour])

  // Drag & Drop handlers
  const dragHandlers: DragHandlers = useMemo(() => ({
    handleDragOver: (e: React.DragEvent, day: Date, hour: number, minute: number) => {
      e.preventDefault() // Always prevent default to allow drop
      if (state.draggedAppointment) {
        e.dataTransfer.dropEffect = 'move'
        setState(prev => ({ ...prev, dragOverSlot: { day, hour, minute } }))
      } else {
        // Still prevent default to allow drop even if state is not set yet
        console.log('[DRAG DEBUG] DragOver but no draggedAppointment in state')
      }
    },

    handleDragLeave: () => {
      setState(prev => ({ ...prev, dragOverSlot: null }))
    },

    handleDragStart: (e: React.DragEvent, appointment: Appointment) => {
      console.log('[DRAG DEBUG] DragStart triggered:', appointment.id, appointment.status)
      if (appointment.status !== 'completed' && appointment.status !== 'cancelled') {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', appointment.id.toString())
        
        // Add drag image
        const dragImage = e.currentTarget as HTMLElement
        e.dataTransfer.setDragImage(dragImage, dragImage.offsetWidth / 2, dragImage.offsetHeight / 2)
        
        setState(prev => ({ 
          ...prev, 
          draggedAppointment: appointment, 
          isDragging: true 
        }))
        console.log('[DRAG DEBUG] Drag started successfully')
      } else {
        console.log('[DRAG DEBUG] Preventing drag - status:', appointment.status)
        e.preventDefault()
      }
    },

    handleDragEnd: () => {
      console.log('[DRAG DEBUG] DragEnd triggered')
      setState(prev => ({ 
        ...prev, 
        draggedAppointment: null, 
        dragOverSlot: null, 
        isDragging: false 
      }))
    },

    handleDrop: (e: React.DragEvent, day: Date, hour: number, minute: number) => {
      e.preventDefault()
      console.log('[DRAG DEBUG] Drop triggered')
      
      const draggedApp = state.draggedAppointment // Store reference before clearing
      
      if (draggedApp && onAppointmentUpdate) {
        const newDate = new Date(day)
        newDate.setHours(hour, minute, 0, 0)
        console.log('[DRAG DEBUG] Dropping appointment', draggedApp.id, 'to', newDate.toISOString())
        
        // Check if the new time is valid (not in the past for today)
        const now = new Date()
        const isToday = isSameDay(day, now)
        if (!isToday || newDate > now) {
          // Show success animation
          setState(prev => ({ 
            ...prev, 
            dropSuccess: { day, hour, minute },
            draggedAppointment: null,
            dragOverSlot: null,
            isDragging: false
          }))
          
          setTimeout(() => {
            setState(prev => ({ ...prev, dropSuccess: null }))
          }, 600)
          
          // Use the stored reference for the update
          checkAndUpdateAppointment(draggedApp.id, newDate.toISOString())
        } else {
          console.log('[DRAG DEBUG] Cannot drop in the past')
          // Clear drag state
          setState(prev => ({ 
            ...prev, 
            draggedAppointment: null,
            dragOverSlot: null,
            isDragging: false
          }))
        }
      } else {
        console.log('[DRAG DEBUG] No dragged appointment or update handler')
        // Clear drag state
        setState(prev => ({ 
          ...prev, 
          draggedAppointment: null,
          dragOverSlot: null,
          isDragging: false
        }))
      }
    }
  }), [state.draggedAppointment, onAppointmentUpdate, checkAndUpdateAppointment])
  
  // Performance monitoring
  useEffect(() => {
    const endMeasure = measureRender(`UnifiedCalendar-${view}`)
    return endMeasure
  }, [view, measureRender])
  
  // Sync with prop changes
  useEffect(() => {
    if (!isSameDay(state.currentDate, currentDate)) {
      setState(prev => ({ ...prev, currentDate }))
    }
  }, [currentDate, state.currentDate])

  // Filter appointments based on current view and filters
  const filteredAppointments = useMemo(() => {
    // Calculate date range based on view
    let startDate: Date
    let endDate: Date
    
    switch (view) {
      case 'day':
        startDate = startOfDay(state.currentDate)
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 1) // Next day start
        break
      case 'week':
        startDate = startOfWeek(state.currentDate)
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 7) // Next week start
        break
      case 'month':
        startDate = startOfMonth(state.currentDate)
        endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + 1) // Next month start
        break
    }
    
    return optimizedAppointmentFilter(appointments, {
      startDate,
      endDate,
      barberId: selectedBarberId
    })
  }, [appointments, state.currentDate, view, selectedBarberId, optimizedAppointmentFilter])

  // Touch drag support for appointments
  useEffect(() => {
    if (!isTouchDevice) return

    const appointmentElements = document.querySelectorAll('.unified-calendar-appointment')
    const cleanupFunctions: (() => void)[] = []

    appointmentElements.forEach((appointmentEl) => {
      const appointmentId = appointmentEl.getAttribute('data-appointment-id')
      const appointment = filteredAppointments.find(apt => apt.id.toString() === appointmentId)
      
      if (!appointment || appointment.status === 'completed' || appointment.status === 'cancelled') {
        return
      }

      const cleanup = touchDragManager.initializeTouchDrag(appointmentEl as HTMLElement, {
        onDragStart: (element) => {
          setState(prev => ({
            ...prev,
            draggedAppointment: appointment,
            isDragging: true
          }))
          return true
        },
        onDragMove: (element, position) => {
          // Find which day and time slot we're over
          const grid = scheduleGridRef.current
          if (!grid) return
          
          const rect = grid.getBoundingClientRect()
          const relativeX = position.clientX - rect.left
          const relativeY = position.clientY - rect.top
          
          // Calculate day and time slot based on current view
          if (view === 'week') {
            const dayWidth = rect.width / 7
            const dayIndex = Math.floor(relativeX / dayWidth)
            const slotHeight = 48 // 48px per slot
            const slotIndex = Math.floor(relativeY / slotHeight)
            
            const weekStart = startOfWeek(state.currentDate)
            const timeSlots = []
            for (let hour = startHour; hour < endHour; hour++) {
              for (let minute = 0; minute < 60; minute += slotDuration) {
                timeSlots.push({ hour, minute })
              }
            }
            
            if (dayIndex >= 0 && dayIndex < 7 && slotIndex >= 0 && slotIndex < timeSlots.length) {
              const targetDay = addDays(weekStart, dayIndex)
              const slot = timeSlots[slotIndex]
              setState(prev => ({ 
                ...prev, 
                dragOverSlot: { day: targetDay, hour: slot.hour, minute: slot.minute } 
              }))
            }
          } else if (view === 'day') {
            const slotHeight = 40 // 40px per slot in day view
            const slotIndex = Math.floor(relativeY / slotHeight)
            
            const timeSlots = []
            for (let hour = startHour; hour < endHour; hour++) {
              for (let minute = 0; minute < 60; minute += slotDuration) {
                timeSlots.push({ hour, minute })
              }
            }
            
            if (slotIndex >= 0 && slotIndex < timeSlots.length) {
              const slot = timeSlots[slotIndex]
              setState(prev => ({ 
                ...prev, 
                dragOverSlot: { day: state.currentDate, hour: slot.hour, minute: slot.minute } 
              }))
            }
          }
        },
        onDragEnd: (element, dropTarget) => {
          if (state.draggedAppointment && onAppointmentUpdate && state.dragOverSlot) {
            const newDate = new Date(state.dragOverSlot.day)
            newDate.setHours(state.dragOverSlot.hour, state.dragOverSlot.minute, 0, 0)
            
            // Check if the new time is valid (not in the past for today)
            const now = new Date()
            const isToday = isSameDay(state.dragOverSlot.day, now)
            if (!isToday || newDate > now) {
              checkAndUpdateAppointment(state.draggedAppointment.id, newDate.toISOString())
            }
          }
          setState(prev => ({
            ...prev,
            draggedAppointment: null,
            dragOverSlot: null,
            isDragging: false
          }))
        },
        canDrag: () => appointment.status !== 'completed' && appointment.status !== 'cancelled'
      })

      if (cleanup) cleanupFunctions.push(cleanup)
    })

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [filteredAppointments, isTouchDevice, view, state.currentDate, state.draggedAppointment, state.dragOverSlot, onAppointmentUpdate, checkAndUpdateAppointment, startHour, endHour, slotDuration])
  
  // Helper functions
  const getClientName = useCallback((appointment: Appointment): string => {
    return appointment.client_name
  }, [])
  
  const getBarberName = useCallback((appointment: Appointment): string => {
    return appointment.barber_name
  }, [])
  
  const getStatusColor = useCallback((status: string) => {
    return memoizedStatusColor(status)
  }, [memoizedStatusColor])
  
  // Date navigation
  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(state.currentDate)
    
    switch (view) {
      case 'day':
        direction === 'prev' ? newDate.setDate(newDate.getDate() - 1) : newDate.setDate(newDate.getDate() + 1)
        break
      case 'week':
        direction === 'prev' ? newDate.setDate(newDate.getDate() - 7) : newDate.setDate(newDate.getDate() + 7)
        break
      case 'month':
        direction === 'prev' ? newDate.setMonth(newDate.getMonth() - 1) : newDate.setMonth(newDate.getMonth() + 1)
        break
    }
    
    setState(prev => ({ ...prev, currentDate: newDate }))
    onDateChange?.(newDate)
  }, [view, state.currentDate, onDateChange])
  
  // Get current period title
  const getPeriodTitle = useCallback(() => {
    switch (view) {
      case 'day':
        return format(state.currentDate, 'EEEE, MMMM d, yyyy')
      case 'week':
        const weekStart = startOfWeek(state.currentDate)
        const weekEnd = endOfWeek(state.currentDate)
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
      case 'month':
        return format(state.currentDate, 'MMMM yyyy')
      default:
        return ''
    }
  }, [view, state.currentDate])
  
  // Render view-specific content
  const renderView = () => {
    switch (view) {
      case 'day':
        return renderDayView()
      case 'week':
        return renderWeekView()
      case 'month':
        return renderMonthView()
      default:
        return null
    }
  }
  
  // Day view renderer
  const renderDayView = () => {
    const dayAppointments = filteredAppointments.filter(apt => 
      isSameDay(new Date(apt.start_time), state.currentDate)
    )
    
    const timeSlots = []
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        timeSlots.push({ hour, minute })
      }
    }
    
    return (
      <div className="day-view h-full flex flex-col">
        <div className="day-header border-b border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-lg">{format(state.currentDate, 'EEEE, MMMM d')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {dayAppointments.length} appointments
          </p>
        </div>
        
        <div className="day-grid flex-1 overflow-auto relative" ref={scheduleGridRef}>
          {/* Time labels */}
          <div className="absolute left-0 top-0 w-16 z-10">
            {timeSlots.map(({ hour, minute }) => (
              minute === 0 ? (
                <div 
                  key={`${hour}-${minute}`}
                  className="h-10 text-xs text-gray-500 border-r border-gray-200 dark:border-gray-700 flex items-start justify-end pr-2 pt-1"
                >
                  {format(new Date().setHours(hour, minute), 'h:mm a')}
                </div>
              ) : null
            ))}
          </div>
          
          {/* Time slots */}
          <div className="ml-16">
            {timeSlots.map(({ hour, minute }) => {
              const slotDate = new Date(state.currentDate)
              slotDate.setHours(hour, minute, 0, 0)
              
              return (
                <div 
                  key={`${hour}-${minute}`}
                  className={`h-10 border-b border-gray-100 dark:border-gray-800 cursor-pointer relative transition-all ${
                    state.dragOverSlot && 
                    isSameDay(state.dragOverSlot.day, state.currentDate) && 
                    state.dragOverSlot.hour === hour && 
                    state.dragOverSlot.minute === minute
                      ? 'bg-green-100 dark:bg-green-900/30 ring-2 ring-green-500 border-green-400 border-dashed'
                      : state.dropSuccess &&
                        isSameDay(state.dropSuccess.day, state.currentDate) &&
                        state.dropSuccess.hour === hour &&
                        state.dropSuccess.minute === minute
                      ? 'bg-green-200 dark:bg-green-800/40 ring-2 ring-green-400 animate-pulse'
                      : state.isDragging
                      ? 'hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-300 hover:border-dashed'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => onTimeSlotClick?.(slotDate)}
                  onDragOver={(e) => dragHandlers.handleDragOver(e, state.currentDate, hour, minute)}
                  onDragLeave={dragHandlers.handleDragLeave}
                  onDrop={(e) => dragHandlers.handleDrop(e, state.currentDate, hour, minute)}
                >
                  {/* Render appointments for this time slot */}
                  {dayAppointments
                    .filter(apt => {
                      const aptTime = new Date(apt.start_time)
                      return aptTime.getHours() === hour && aptTime.getMinutes() === minute
                    })
                    .map(appointment => {
                      // Apply optimistic updates
                      const optimisticUpdate = state.optimisticUpdates.get(appointment.id)
                      const displayAppointment = optimisticUpdate ? 
                        { ...appointment, start_time: optimisticUpdate.newStartTime } : 
                        appointment
                      
{
                        // Get service configuration for premium styling
                        const serviceType = appointment.service_name?.toLowerCase() || 'haircut'
                        const serviceConfig = getServiceConfig(serviceType)
                        const barberSymbol = getBarberSymbol(appointment.barber_id?.toString() || appointment.barber_name || '')
                        
                        return (
                          <div 
                            key={appointment.id}
                            data-appointment-id={appointment.id}
                            draggable={appointment.status !== 'completed' && appointment.status !== 'cancelled'}
                            className={`unified-calendar-appointment premium-appointment absolute inset-0 m-1 p-2 rounded text-xs cursor-pointer overflow-hidden transition-all text-white group ${
                              getStatusColor(appointment.status)
                            } ${
                              state.draggedAppointment?.id === appointment.id 
                                ? 'opacity-30 scale-95 ring-2 ring-white ring-opacity-50 animate-pulse' 
                                : 'hover:shadow-xl hover:scale-105 hover:z-20 hover:ring-2 hover:ring-white hover:ring-opacity-60'
                            } ${
                              appointment.status !== 'completed' && appointment.status !== 'cancelled' 
                                ? 'cursor-move' 
                                : 'cursor-pointer'
                            }`}
                            style={{
                              background: serviceConfig?.gradient?.light || 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                              borderColor: serviceConfig?.color || '#3b82f6',
                              boxShadow: `0 0 0 1px ${serviceConfig?.color || '#3b82f6'}40, ${serviceConfig?.glow || '0 4px 12px rgba(59, 130, 246, 0.3)'}`
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!state.isDragging) {
                                onAppointmentClick?.(appointment)
                              }
                            }}
                            onDragStart={(e) => dragHandlers.handleDragStart(e, appointment)}
                            onDragEnd={dragHandlers.handleDragEnd}
                          >
                            {/* Barber symbol in top-right corner */}
                            <div className="absolute top-1 right-1 text-xs opacity-70 font-bold text-white bg-black bg-opacity-20 rounded-full w-5 h-5 flex items-center justify-center" title={`Barber: ${appointment.barber_name || 'Unknown'}`}>
                              {barberSymbol}
                            </div>
                            
                            {/* Service icon in bottom-left corner */}
                            <div className="absolute bottom-1 left-1 text-sm opacity-80" title={`Service: ${appointment.service_name}`}>
                              {serviceConfig?.icon || '✂️'}
                            </div>
                            
                            {/* Premium shine effect on hover */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                            
                            {/* Content */}
                            <div className="relative z-10 space-y-1">
                              <div className="font-medium text-white">{getClientName(appointment)}</div>
                              <div className="text-white text-xs opacity-90">{appointment.service_name}</div>
                              {appointment.duration_minutes && (
                                <div className="text-white text-xs opacity-75">{appointment.duration_minutes} min</div>
                              )}
                            </div>
                            
                            {/* Drop zone indicator when dragging */}
                            {state.isDragging && state.draggedAppointment?.id !== appointment.id && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                <div className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium shadow-lg">
                                  Drop here
                                </div>
                              </div>
                            )}
                            
                            {/* Move button fallback for non-drag browsers or touch devices */}
                            {appointment.status !== 'completed' && appointment.status !== 'cancelled' && !state.isDragging && (
                              <button
                                className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/20 hover:bg-white/30 rounded p-1"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  console.log('[DRAG DEBUG] Move button clicked for appointment:', appointment.id)
                                  // Trigger the same update flow as drag and drop
                                  onAppointmentUpdate?.(appointment.id, appointment.start_time)
                                }}
                                title="Move appointment"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )
                      }
                    })
                  }
                </div>
              )
            })}
          </div>
          
          {/* Current time indicator for today */}
          {isSameDay(state.currentDate, new Date()) && (
            <CurrentTimeIndicator startHour={startHour} slotDuration={slotDuration} />
          )}
        </div>
      </div>
    )
  }
  
  // Week view renderer
  const renderWeekView = () => {
    const weekStart = startOfWeek(state.currentDate)
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    
    const timeSlots = []
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        timeSlots.push({ hour, minute })
      }
    }
    
    return (
      <div className="week-view h-full flex flex-col">
        {/* Week header */}
        <div className="week-header border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-8 gap-0">
            <div className="w-16"></div> {/* Time column spacer */}
            {weekDays.map(day => (
              <div key={day.toISOString()} className="p-2 text-center border-r border-gray-200 dark:border-gray-700">
                <div className="text-sm font-medium">{format(day, 'EEE')}</div>
                <div className={`text-lg ${isSameDay(day, new Date()) ? 'text-blue-600 font-bold' : ''}`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Week grid */}
        <div className="week-grid flex-1 overflow-auto relative" ref={scheduleGridRef}>
          {timeSlots.map(({ hour, minute }) => (
            <div key={`${hour}-${minute}`} className="grid grid-cols-8 gap-0 h-10 border-b border-gray-100 dark:border-gray-800">
              {/* Time label */}
              <div className="w-16 text-xs text-gray-500 border-r border-gray-200 dark:border-gray-700 flex items-start justify-end pr-2 pt-1">
                {minute === 0 ? format(new Date().setHours(hour, minute), 'h:mm a') : ''}
              </div>
              
              {/* Day columns */}
              {weekDays.map(day => {
                const slotDate = new Date(day)
                slotDate.setHours(hour, minute, 0, 0)
                
                const slotAppointments = filteredAppointments.filter(apt => {
                  const aptTime = new Date(apt.start_time)
                  return isSameDay(aptTime, day) && 
                         aptTime.getHours() === hour && 
                         aptTime.getMinutes() === minute
                })
                
                return (
                  <div 
                    key={day.toISOString()}
                    className={`border-r border-gray-200 dark:border-gray-700 cursor-pointer relative transition-all ${
                      state.dragOverSlot && 
                      isSameDay(state.dragOverSlot.day, day) && 
                      state.dragOverSlot.hour === hour && 
                      state.dragOverSlot.minute === minute
                        ? 'bg-green-100 dark:bg-green-900/30 ring-2 ring-green-500 border-green-400 border-dashed'
                        : state.dropSuccess &&
                          isSameDay(state.dropSuccess.day, day) &&
                          state.dropSuccess.hour === hour &&
                          state.dropSuccess.minute === minute
                        ? 'bg-green-200 dark:bg-green-800/40 ring-2 ring-green-400 animate-pulse'
                        : state.isDragging
                        ? 'hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-300 hover:border-dashed'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => onTimeSlotClick?.(slotDate)}
                    onDragOver={(e) => dragHandlers.handleDragOver(e, day, hour, minute)}
                    onDragLeave={dragHandlers.handleDragLeave}
                    onDrop={(e) => dragHandlers.handleDrop(e, day, hour, minute)}
                  >
                    {slotAppointments.map(appointment => {
                      // Apply optimistic updates
                      const optimisticUpdate = state.optimisticUpdates.get(appointment.id)
                      const displayAppointment = optimisticUpdate ? 
                        { ...appointment, start_time: optimisticUpdate.newStartTime } : 
                        appointment
                      
                      {
                        // Get service configuration for premium styling
                        const serviceType = appointment.service_name?.toLowerCase() || 'haircut'
                        const serviceConfig = getServiceConfig(serviceType)
                        const barberSymbol = getBarberSymbol(appointment.barber_id?.toString() || appointment.barber_name || '')
                        
                        return (
                          <div 
                            key={appointment.id}
                            data-appointment-id={appointment.id}
                            draggable={appointment.status !== 'completed' && appointment.status !== 'cancelled'}
                            className={`unified-calendar-appointment premium-appointment absolute inset-0 m-0.5 p-1 rounded text-xs cursor-pointer overflow-hidden transition-all text-white group ${
                              getStatusColor(appointment.status)
                            } ${
                              state.draggedAppointment?.id === appointment.id 
                                ? 'dragging opacity-30 scale-95 ring-2 ring-white ring-opacity-50 animate-pulse' 
                                : 'hover:shadow-xl hover:scale-105 hover:z-20 hover:ring-2 hover:ring-white hover:ring-opacity-60'
                            } ${
                              appointment.status !== 'completed' && appointment.status !== 'cancelled' 
                                ? 'cursor-move' 
                                : 'cursor-pointer'
                            }`}
                            style={{
                              background: serviceConfig?.gradient?.light || 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                              borderColor: serviceConfig?.color || '#3b82f6',
                              boxShadow: `0 0 0 1px ${serviceConfig?.color || '#3b82f6'}40, ${serviceConfig?.glow || '0 4px 12px rgba(59, 130, 246, 0.3)'}`
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!state.isDragging) {
                                onAppointmentClick?.(appointment)
                              }
                            }}
                            onDragStart={(e) => dragHandlers.handleDragStart(e, appointment)}
                            onDragEnd={dragHandlers.handleDragEnd}
                          >
                            {/* Barber symbol in top-right corner */}
                            <div className="absolute top-0.5 right-0.5 text-xs opacity-70 font-bold text-white bg-black bg-opacity-20 rounded-full w-4 h-4 flex items-center justify-center" title={`Barber: ${appointment.barber_name || 'Unknown'}`}>
                              {barberSymbol}
                            </div>
                            
                            {/* Service icon in bottom-left corner */}
                            <div className="absolute bottom-0.5 left-0.5 text-xs opacity-80" title={`Service: ${appointment.service_name}`}>
                              {serviceConfig?.icon || '✂️'}
                            </div>
                            
                            {/* Premium shine effect on hover */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                            
                            {/* Content */}
                            <div className="relative z-10 mt-1">
                              <div className="font-medium truncate text-white">{getClientName(appointment)}</div>
                              <div className="truncate opacity-90 text-white text-xs">{appointment.service_name}</div>
                            </div>
                            
                            {/* Drop zone indicator when dragging */}
                            {state.isDragging && state.draggedAppointment?.id !== appointment.id && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                <div className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium shadow-lg">
                                  Drop here
                                </div>
                              </div>
                            )}
                            
                            {/* Move button fallback for non-drag browsers or touch devices */}
                            {appointment.status !== 'completed' && appointment.status !== 'cancelled' && !state.isDragging && (
                              <button
                                className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/20 hover:bg-white/30 rounded p-1"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  console.log('[DRAG DEBUG] Move button clicked for appointment:', appointment.id)
                                  // Trigger the same update flow as drag and drop
                                  onAppointmentUpdate?.(appointment.id, appointment.start_time)
                                }}
                                title="Move appointment"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )
                      }
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  // Month view renderer
  const renderMonthView = () => {
    const monthStart = startOfMonth(state.currentDate)
    const monthEnd = endOfMonth(state.currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    
    const calendarDays = []
    let day = calendarStart
    while (day <= calendarEnd) {
      calendarDays.push(day)
      day = addDays(day, 1)
    }
    
    return (
      <div className="month-view h-full flex flex-col">
        {/* Month header */}
        <div className="month-header border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-7 gap-0">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
              <div key={dayName} className="p-2 text-center font-medium text-sm border-r border-gray-200 dark:border-gray-700">
                {dayName}
              </div>
            ))}
          </div>
        </div>
        
        {/* Month grid */}
        <div className="month-grid flex-1">
          <div className="grid grid-cols-7 gap-0 h-full">
            {calendarDays.map(day => {
              const dayAppointments = filteredAppointments.filter(apt => 
                isSameDay(new Date(apt.start_time), day)
              )
              
              const isCurrentMonth = day.getMonth() === state.currentDate.getMonth()
              const isToday = isSameDay(day, new Date())
              const isSelected = state.selectedDate && isSameDay(day, state.selectedDate)
              
              return (
                <div 
                  key={day.toISOString()}
                  className={`
                    border-r border-b border-gray-200 dark:border-gray-700 p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800
                    ${!isCurrentMonth ? 'text-gray-400 bg-gray-50 dark:bg-gray-900' : ''}
                    ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                    ${isSelected ? 'ring-2 ring-blue-500' : ''}
                  `}
                  onClick={() => {
                    setState(prev => ({ ...prev, selectedDate: day }))
                    onDayClick?.(day)
                  }}
                  onDoubleClick={() => onDayDoubleClick?.(day)}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  
                  {/* Appointment indicators */}
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map(appointment => {
                      // Get service configuration for premium styling
                      const serviceType = appointment.service_name?.toLowerCase() || 'haircut'
                      const serviceConfig = getServiceConfig(serviceType)
                      
                      return (
                        <div 
                          key={appointment.id}
                          data-appointment-id={appointment.id}
                          draggable={appointment.status !== 'completed' && appointment.status !== 'cancelled'}
                          className={`unified-calendar-appointment text-xs p-1 rounded truncate cursor-pointer transition-all text-white ${
                            getStatusColor(appointment.status)
                          } ${
                            appointment.status !== 'completed' && appointment.status !== 'cancelled' 
                              ? 'cursor-move hover:scale-105' 
                              : 'cursor-pointer'
                          }`}
                          style={{
                            background: serviceConfig?.gradient?.light || 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            borderColor: serviceConfig?.color || '#3b82f6'
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onAppointmentClick?.(appointment)
                          }}
                          onDragStart={(e) => dragHandlers.handleDragStart(e, appointment)}
                          onDragEnd={dragHandlers.handleDragEnd}
                        >
                          {getClientName(appointment)}
                        </div>
                      )
                    })}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{dayAppointments.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`unified-calendar h-full flex flex-col ${className}`}>
      {/* Navigation header */}
      <div className="calendar-navigation flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate('prev')}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
          
          <h2 className="text-lg font-semibold min-w-[200px] text-center">
            {getPeriodTitle()}
          </h2>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate('next')}
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setState(prev => ({ ...prev, currentDate: new Date() }))
              onDateChange?.(new Date())
            }}
          >
            Today
          </Button>
          
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              {isLoading ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowPathIcon className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* View content */}
      <div className="calendar-content flex-1 overflow-hidden">
        {renderView()}
      </div>
      
      {/* Modals */}
      {state.showClientModal && state.selectedClient && (
        <ClientDetailModal
          client={state.selectedClient}
          isOpen={state.showClientModal}
          onClose={() => setState(prev => ({ 
            ...prev, 
            showClientModal: false, 
            selectedClient: null 
          }))}
        />
      )}
      
      {state.showConflictModal && state.conflictAnalysis && (
        <ConflictResolutionModal
          isOpen={state.showConflictModal}
          onClose={() => setState(prev => ({ 
            ...prev, 
            showConflictModal: false, 
            conflictAnalysis: null 
          }))}
          analysis={state.conflictAnalysis}
          appointmentData={{
            client_name: 'Client',
            service_name: 'Service',
            start_time: new Date().toISOString(),
            duration_minutes: 60,
            barber_name: 'Barber'
          }}
          onResolveConflict={(resolution) => {
            // Handle conflict resolution
            setState(prev => ({ 
              ...prev, 
              showConflictModal: false, 
              conflictAnalysis: null 
            }))
          }}
          onProceedAnyway={() => {
            setState(prev => ({ 
              ...prev, 
              showConflictModal: false, 
              conflictAnalysis: null 
            }))
          }}
          onCancel={() => setState(prev => ({ 
            ...prev, 
            showConflictModal: false, 
            conflictAnalysis: null 
          }))}
        />
      )}
    </div>
  )
})

// Current time indicator component
const CurrentTimeIndicator = React.memo(({ startHour, slotDuration }: { startHour: number; slotDuration: number }) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [])
  
  const top = ((currentTime.getHours() * 60 + currentTime.getMinutes() - startHour * 60) / slotDuration) * 40
  
  return (
    <div
      className="absolute left-0 right-0 h-0.5 bg-red-500 z-10 calendar-today-indicator"
      style={{ top: `${top}px` }}
    >
      <div className="absolute -left-2 -top-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
    </div>
  )
})

CurrentTimeIndicator.displayName = 'CurrentTimeIndicator'

export default UnifiedCalendar
export type { UnifiedCalendarProps }