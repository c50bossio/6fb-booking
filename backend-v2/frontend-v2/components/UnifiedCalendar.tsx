'use client'

import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import { isSameDay, startOfDay, startOfMonth, startOfWeek, endOfWeek, addDays, format } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { Button } from './ui/button'
import { getMobileTouchClass } from '@/lib/mobile-touch-enhancements'
import ClientDetailModal from './modals/ClientDetailModal'
import { touchDragManager, TouchDragManager } from '@/lib/touch-utils'
import { useSwipeNavigation } from '@/lib/mobile-touch-enhancements'
import { conflictManager } from '@/lib/appointment-conflicts'
import ConflictResolutionModal from './modals/ConflictResolutionModal'
import { useCalendarPerformance } from '@/hooks/useCalendarPerformance'
import { useCalendarAccessibility } from '@/hooks/useCalendarAccessibility'
import { useResponsive } from '@/hooks/useResponsive'
import '@/styles/calendar-animations.css'
import '@/styles/calendar-premium.css'
import { CalendarKeyboardNavigation } from './calendar/CalendarKeyboardNavigation'
import { KeyboardShortcutIndicator, useKeyboardShortcutIndicator } from './ui/keyboard-shortcut-indicator'
import { useKeyboardShortcutsHelp } from './ui/keyboard-shortcuts-help'

// Import loading states
import { CalendarEmptyState, CalendarLoadingManager } from './calendar/CalendarLoadingStates'

// Import new extracted components
import { CalendarHeader } from './calendar/CalendarHeader'
import { DayView } from './calendar/DayView'
import { WeekView } from './calendar/WeekView'
import { MonthView } from './calendar/MonthView'
import { useCalendarState } from '@/hooks/useCalendarState'
import { useCalendarDragAndDrop } from '@/hooks/useCalendarDragAndDrop'

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
  onAppointmentUpdate?: (appointmentId: number, newStartTime: string, isDragDrop?: boolean) => void
  onDayClick?: (date: Date) => void
  onDayDoubleClick?: (date: Date) => void
  
  // Configuration props
  startHour?: number
  endHour?: number
  slotDuration?: number
  isLoading?: boolean
  error?: string | null
  onRefresh?: () => void
  onRetry?: () => void
  onPreloadDate?: (date: Date) => void
  
  // Style props
  className?: string
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
  error = null,
  onRefresh,
  onRetry,
  onPreloadDate,
  className = ""
}: UnifiedCalendarProps) {
  
  // Use extracted state management hook
  const {
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
    removeOptimisticUpdate
  } = useCalendarState(currentDate)
  
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
  const { showIndicator } = useKeyboardShortcutIndicator()
  const helpDialog = useKeyboardShortcutsHelp()
  
  // Swipe navigation for mobile
  const swipeContainerRef = useSwipeNavigation(
    () => navigateDate('next'), // Swipe left goes to next
    () => navigateDate('prev'), // Swipe right goes to previous
    isMobile ? 30 : 50 // Lower threshold on mobile
  )
  
  // Enhanced drag & drop with optimistic updates
  const checkAndUpdateAppointment = useCallback(async (appointmentId: number, newStartTime: string, isDragDrop: boolean = false) => {
    const appointment = appointments.find(apt => apt.id === appointmentId)
    if (!appointment) {
      return
    }

    // Store original state for rollback
    const originalStartTime = appointment.start_time
    // Apply optimistic update immediately for better UX
    addOptimisticUpdate(appointmentId, originalStartTime, newStartTime)

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
      removeOptimisticUpdate(appointmentId)
      showConflictModalWithAnalysis(analysis, { appointmentId, newStartTime })
    } else {
      // No significant conflicts, proceed with update
      if (onAppointmentUpdate) {
        try {
          await onAppointmentUpdate(appointmentId, newStartTime, isDragDrop)
          // Success - clear optimistic update (it's now permanent)
          removeOptimisticUpdate(appointmentId)
        } catch (updateError: any) {
          // Rollback optimistic update on failure
          removeOptimisticUpdate(appointmentId)
        }
      }
    }
  }, [appointments, onAppointmentUpdate, startHour, endHour, addOptimisticUpdate, removeOptimisticUpdate, showConflictModalWithAnalysis])

  // Use extracted drag and drop hook
  const dragHandlers = useCalendarDragAndDrop({
    dragState: {
      draggedAppointment: state.draggedAppointment,
      dragOverSlot: state.dragOverSlot,
      dragOverDay: state.dragOverDay,
      isDragging: state.isDragging,
      dropSuccess: state.dropSuccess
    },
    updateDragState,
    onAppointmentUpdate,
    checkAndUpdateAppointment
  })
  
  // Performance monitoring
  useEffect(() => {
    const endMeasure = measureRender(`UnifiedCalendar-${view}`)
    return endMeasure
  }, [view, measureRender])
  
  // Sync with prop changes
  useEffect(() => {
    if (!isSameDay(state.currentDate, currentDate)) {
      setCurrentDate(currentDate)
    }
  }, [currentDate, state.currentDate, setCurrentDate])

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
      selectedBarberId
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
          updateDragState({
            draggedAppointment: appointment,
            isDragging: true
          })
          return true
        },
        onDragMove: (element, position) => {
          // Find which day and time slot we're over
          const grid = document.querySelector('.day-grid, .week-grid')
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
              updateDragState({ 
                dragOverSlot: { day: targetDay, hour: slot.hour, minute: slot.minute } 
              })
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
              updateDragState({ 
                dragOverSlot: { day: state.currentDate, hour: slot.hour, minute: slot.minute } 
              })
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
              checkAndUpdateAppointment(state.draggedAppointment.id, newDate.toISOString(), true)
            }
          }
          updateDragState({
            draggedAppointment: null,
            dragOverSlot: null,
            isDragging: false
          })
        },
        canDrag: () => appointment.status !== 'completed' && appointment.status !== 'cancelled'
      })

      if (cleanup) cleanupFunctions.push(cleanup)
    })

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [filteredAppointments, isTouchDevice, view, state.currentDate, state.draggedAppointment, state.dragOverSlot, onAppointmentUpdate, checkAndUpdateAppointment, startHour, endHour, slotDuration, updateDragState])
  
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
    
    setCurrentDate(newDate)
    onDateChange?.(newDate)
  }, [view, state.currentDate, onDateChange, setCurrentDate])
  
  // Render view-specific content
  const renderView = () => {
    const viewProps = {
      currentDate: state.currentDate,
      appointments: filteredAppointments,
      startHour,
      endHour,
      slotDuration,
      dragState: {
        draggedAppointment: state.draggedAppointment,
        dragOverSlot: state.dragOverSlot,
        isDragging: state.isDragging,
        dropSuccess: state.dropSuccess,
        dragOverDay: state.dragOverDay
      },
      optimisticUpdates: state.optimisticUpdates,
      selectedAppointmentId: state.selectedAppointmentId,
      onTimeSlotClick,
      onAppointmentClick,
      onAppointmentUpdate,
      onDragOver: dragHandlers.handleDragOver,
      onDragLeave: dragHandlers.handleDragLeave,
      onDragStart: dragHandlers.handleDragStart,
      onDragEnd: dragHandlers.handleDragEnd,
      onDrop: dragHandlers.handleDrop,
      onSelectAppointment: setSelectedAppointmentId,
      getStatusColor
    }

    switch (view) {
      case 'day':
        return <DayView {...viewProps} />
      case 'week':
        return <WeekView {...viewProps} />
      case 'month':
        return (
          <MonthView
            currentDate={state.currentDate}
            appointments={filteredAppointments}
            selectedDate={state.selectedDate}
            onDayClick={onDayClick}
            onDayDoubleClick={onDayDoubleClick}
            onAppointmentClick={onAppointmentClick}
            onDragStart={dragHandlers.handleDragStart}
            onDragEnd={dragHandlers.handleDragEnd}
            onSelectDate={setSelectedDate}
            getStatusColor={getStatusColor}
            dragState={{
              draggedAppointment: state.draggedAppointment,
              isDragging: state.isDragging
            }}
          />
        )
      default:
        return null
    }
  }
  
  // Determine loading context based on view
  const getLoadingContext = (): 'appointments' | 'calendar' | 'sync' | 'booking' => {
    if (view === 'day') return 'appointments'
    return 'calendar'
  }

  return (
    <div 
      className={`unified-calendar calendar-premium-background h-full flex flex-col shadow-2xl rounded-xl overflow-hidden ${className}`}
      onClick={() => {
        // Deselect appointment when clicking on background
        setSelectedAppointmentId(null)
      }}>
      {/* Navigation header with enhanced mobile touch targets */}
      <CalendarHeader
        view={view}
        currentDate={state.currentDate}
        onNavigate={navigateDate}
        onTodayClick={() => {
          setCurrentDate(new Date())
          onDateChange?.(new Date())
        }}
        onRefresh={onRefresh}
        isLoading={isLoading}
      />
      
      {/* View content with loading manager */}
      <div 
        className="calendar-content flex-1 overflow-hidden relative" 
        ref={swipeContainerRef}
        role="region"
        aria-label={`Calendar ${view} view`}
        aria-live="polite">
        <CalendarLoadingManager
          isLoading={isLoading}
          error={error}
          context={getLoadingContext()}
          onRetry={onRetry}
        >
          {/* Check for empty state */}
          {!isLoading && !error && filteredAppointments.length === 0 ? (
            <CalendarEmptyState
              view={view}
              selectedDate={state.selectedDate}
              onCreateAppointment={() => {
                // If there's a time slot click handler, use current time
                const now = new Date()
                onTimeSlotClick?.(now)
              }}
              message={selectedBarberId !== 'all' ? 
                `No appointments found for the selected barber` : 
                undefined
              }
            />
          ) : (
            <>
              {/* Swipe hint for mobile */}
              {isMobile && !isLoading && (
                <div className="absolute top-1/2 left-0 right-0 flex justify-between px-2 pointer-events-none opacity-30 z-10">
                  <ChevronLeftIcon className="w-6 h-6 text-gray-400 animate-bounce-left" />
                  <ChevronRightIcon className="w-6 h-6 text-gray-400 animate-bounce-right" />
                </div>
              )}
              
              {renderView()}
            </>
          )}
        </CalendarLoadingManager>
      </div>
      
      {/* Modals */}
      {state.showClientModal && state.selectedClient && (
        <ClientDetailModal
          client={state.selectedClient}
          isOpen={state.showClientModal}
          onClose={hideClientModal}
        />
      )}
      
      {state.showConflictModal && state.conflictAnalysis && (
        <ConflictResolutionModal
          isOpen={state.showConflictModal}
          onClose={hideConflictModal}
          conflicts={state.conflictAnalysis.conflicts}
          onResolve={(resolution) => {
            // Handle conflict resolution
            hideConflictModal()
          }}
        />
      )}
      
      {/* Keyboard Shortcut Indicator */}
      <KeyboardShortcutIndicator
        show={showIndicator && !isMobile && !isLoading}
        onClick={helpDialog.open}
      />
      
      {/* Keyboard Navigation */}
      <CalendarKeyboardNavigation
        currentDate={state.currentDate}
        onDateChange={(date) => {
          setCurrentDate(date)
          onDateChange?.(date)
        }}
        currentView={view}
        onViewChange={onViewChange}
        onNewAppointment={() => {
          // Use current time for new appointment
          const now = new Date()
          onTimeSlotClick?.(now)
        }}
        onSearch={() => {
          // Implement search functionality if needed
          announce('Search functionality coming soon')
        }}
        onShowHelp={helpDialog.open}
        onRefresh={onRefresh}
        selectedAppointmentId={state.selectedAppointmentId}
        onSelectAppointment={(id) => {
          setSelectedAppointmentId(id)
          if (id) {
            const appointment = filteredAppointments.find(apt => apt.id.toString() === id)
            if (appointment) {
              announce(`Selected appointment with ${appointment.client_name}`)
            }
          }
        }}
        onEditAppointment={(id) => {
          const appointment = filteredAppointments.find(apt => apt.id.toString() === id)
          if (appointment) {
            onAppointmentClick?.(appointment)
          }
        }}
        onDeleteAppointment={(id) => {
          // Implement delete functionality
          announce('Delete functionality requires implementation')
        }}
        appointments={filteredAppointments.map(apt => ({ 
          id: apt.id.toString(), 
          date: new Date(apt.start_time) 
        }))}
        enabled={!isLoading && !state.isDragging}
      />
    </div>
  )
})

export default UnifiedCalendar
export type { UnifiedCalendarProps, CalendarView }