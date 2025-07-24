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
// Removed heavy performance monitoring hooks for better performance
import { useCalendarAccessibility } from '@/hooks/useCalendarAccessibility'
import { useResponsive } from '@/hooks/useResponsive'
import '@/styles/calendar-animations.css'
import { CalendarKeyboardNavigation } from './calendar/CalendarKeyboardNavigation'
import { KeyboardShortcutIndicator, useKeyboardShortcutIndicator } from './ui/keyboard-shortcut-indicator'
import { useKeyboardShortcutsHelp } from './ui/keyboard-shortcuts-help'
import { CalendarA11yProvider, useScreenReaderAnnouncement } from './calendar/CalendarAccessibility'

// Import loading states
import { CalendarEmptyState, CalendarLoadingManager } from './calendar/CalendarLoadingStates'

// Import new extracted components
import { CalendarHeader } from './calendar/CalendarHeader'
// Note: DayView, WeekView, MonthView components were consolidated into UnifiedCalendar
// This component now handles all view types internally

// Import missing date-fns functions
import { endOfMonth, endOfWeek } from 'date-fns'
import { useCalendarState } from '@/hooks/useCalendarState'
import { useCalendarDragAndDrop } from '@/hooks/useCalendarDragAndDrop'

// Use standardized booking response interface
import type { BookingResponse } from '@/lib/api'
import type { CalendarView } from '@/types/calendar'

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

// Re-export CalendarView for backward compatibility
export type { CalendarView } from '@/types/calendar'

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
  
  // Simplified performance hooks - removed heavy monitoring for better performance
  
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
  const { announce, AnnouncementRegion } = useScreenReaderAnnouncement()
  
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
  
  // Removed heavy performance monitoring for better performance
  
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
    
    // Simplified appointment filtering for better performance
    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.start_time)
      const isInDateRange = appointmentDate >= startDate && appointmentDate < endDate
      const matchesBarberFilter = selectedBarberId === 'all' || appointment.barber_id === selectedBarberId
      return isInDateRange && matchesBarberFilter
    })
  }, [appointments, state.currentDate, view, selectedBarberId])

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
  
  // Fresha-inspired service colors - pleasant, professional palette
  const getServiceColor = useCallback((serviceOrStatus: string) => {
    // Color mapping inspired by Fresha's clean palette
    const serviceColors = {
      // Service-based colors (primary)
      'haircut': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-l-4 border-blue-400',
      'beard trim': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-l-4 border-green-400',
      'shave': 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-l-4 border-purple-400',
      'styling': 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200 border-l-4 border-pink-400',
      'color': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-l-4 border-orange-400',
      'massage': 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 border-l-4 border-teal-400',
      'wash': 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 border-l-4 border-cyan-400',
      'treatment': 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 border-l-4 border-indigo-400',
      
      // Status-based colors (fallback)
      'confirmed': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-l-4 border-blue-400',
      'pending': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-l-4 border-yellow-400',
      'cancelled': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-l-4 border-red-400',
      'completed': 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-l-4 border-gray-400'
    }
    
    const key = serviceOrStatus?.toLowerCase() || 'confirmed'
    return serviceColors[key] || serviceColors['confirmed']
  }, [])
  
  // Get barber initials for quick recognition
  const getBarberInitials = useCallback((barberId: number) => {
    const barber = barbers.find(b => b.id === barberId)
    if (!barber) return 'B'
    
    // Try different name formats
    if (barber.first_name && barber.last_name) {
      return `${barber.first_name.charAt(0)}${barber.last_name.charAt(0)}`.toUpperCase()
    }
    if (barber.name) {
      const nameParts = barber.name.split(' ')
      if (nameParts.length >= 2) {
        return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`.toUpperCase()
      }
      return barber.name.substring(0, 2).toUpperCase()
    }
    if (barber.email) {
      return barber.email.substring(0, 2).toUpperCase()
    }
    return 'B'
  }, [barbers])
  
  const getStatusColor = getServiceColor // Backward compatibility
  
  // Date navigation with accessibility announcements
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
    
    // Announce navigation to screen readers
    const viewName = view === 'day' ? 'day' : view === 'week' ? 'week' : 'month'
    const dateStr = view === 'day' 
      ? format(newDate, 'EEEE, MMMM d, yyyy')
      : view === 'week'
      ? `Week of ${format(newDate, 'MMMM d, yyyy')}`
      : format(newDate, 'MMMM yyyy')
    
    announce(`Navigated to ${dateStr}`)
  }, [view, state.currentDate, onDateChange, setCurrentDate, announce])
  
  // Professional calendar view rendering with proper visual layouts
  const renderView = () => {
    switch (view) {
      case 'day':
        return renderDayView()
      case 'week':
        return renderWeekView()
      case 'month':
        return renderMonthView()
      default:
        return renderDayView()
    }
  }

  // Day view with Fresha-inspired design: barber columns with appointments
  const renderDayView = () => {
    const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
    const dayAppointments = filteredAppointments.filter(apt => 
      isSameDay(new Date(apt.start_time), state.currentDate)
    )
    
    // Filter unique barbers from appointments or use all barbers
    const activeBarbers = barbers.length > 0 ? barbers : 
      [...new Set(dayAppointments.map(apt => apt.barber_id))]
        .map(barberId => ({ id: barberId, name: `Barber ${barberId}`, email: '' }))

    return (
      <div className="day-view h-full overflow-auto bg-gray-50 dark:bg-gray-900">
        {/* Header with barber avatars - Fresha style */}
        <div className="flex bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          {/* Time column header */}
          <div className="w-20 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 p-3">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Time
            </div>
          </div>
          
          {/* Barber columns */}
          {activeBarbers.map(barber => (
            <div key={barber.id} className="flex-1 min-w-0 p-3 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {(barber.name || barber.first_name || barber.email)?.charAt(0)?.toUpperCase() || 'B'}
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-full">
                  {barber.name || `${barber.first_name || ''} ${barber.last_name || ''}`.trim() || barber.email}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Time slots and appointments grid */}
        <div className="flex">
          {/* Time labels column */}
          <div className="w-20 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {hours.map(hour => (
              <div 
                key={hour} 
                className="h-16 flex items-start justify-end pr-3 pt-2 text-xs font-medium text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800"
              >
                {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
              </div>
            ))}
          </div>
          
          {/* Barber appointment columns */}
          {activeBarbers.map(barber => {
            const barberAppointments = dayAppointments.filter(apt => 
              apt.barber_id === barber.id
            )
            
            return (
              <div key={barber.id} className="flex-1 min-w-0 border-r border-gray-200 dark:border-gray-700 last:border-r-0 bg-white dark:bg-gray-800">
                {hours.map(hour => {
                  const hourAppointments = barberAppointments.filter(apt => 
                    new Date(apt.start_time).getHours() === hour
                  )
                  
                  return (
                    <div 
                      key={hour}
                      className="h-16 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer relative group"
                      onClick={() => {
                        const slotTime = new Date(state.currentDate)
                        slotTime.setHours(hour, 0, 0, 0)
                        onTimeSlotClick?.(slotTime, barber.id)
                      }}
                    >
                      {/* Hover indicator for empty slots */}
                      {hourAppointments.length === 0 && (
                        <div className="absolute inset-0 bg-primary-50 dark:bg-primary-900/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm m-1 flex items-center justify-center">
                          <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">+</span>
                        </div>
                      )}
                      
                      {/* Render appointments - Fresha style blocks */}
                      {hourAppointments.map(appointment => {
                        const startMinutes = new Date(appointment.start_time).getMinutes()
                        const durationMinutes = appointment.duration_minutes || 60
                        const heightPercent = (durationMinutes / 60) * 100
                        const topPercent = (startMinutes / 60) * 100
                        
                        return (
                          <div
                            key={appointment.id}
                            className={`absolute left-1 right-1 mx-1 px-2 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${getServiceColor(appointment.service_name || appointment.status)}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              onAppointmentClick?.(appointment)
                            }}
                            style={{
                              top: `${topPercent}%`,
                              height: `${Math.max(heightPercent, 25)}%`, // Minimum height for readability
                              zIndex: 10
                            }}
                          >
                            <div className="flex flex-col h-full justify-between relative">
                              {/* Barber initials - top right corner */}
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 rounded-full flex items-center justify-center text-xs font-bold leading-none">
                                {getBarberInitials(appointment.barber_id)}
                              </div>
                              
                              <div className="truncate font-semibold pr-4">
                                {appointment.client_name}
                              </div>
                              <div className="truncate text-xs opacity-90">
                                {appointment.service_name || 'Service'}
                              </div>
                              <div className="truncate text-xs opacity-75">
                                {format(new Date(appointment.start_time), 'h:mm a')}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Week view with clean 7-day grid layout
  const renderWeekView = () => {
    const weekStart = startOfWeek(state.currentDate)
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)

    return (
      <div className="week-view h-full overflow-auto bg-gray-50 dark:bg-gray-900">
        {/* Week header with days */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
          <div className="w-20 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 p-3">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Time
            </div>
          </div>
          {weekDays.map(day => (
            <div 
              key={day.toISOString()} 
              className="flex-1 p-3 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0"
            >
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {format(day, 'EEE')}
              </div>
              <div className={`text-lg font-semibold mt-1 ${
                isSameDay(day, new Date()) 
                  ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded-full w-8 h-8 flex items-center justify-center mx-auto' 
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Week grid */}
        <div className="flex h-full">
          {/* Time labels */}
          <div className="w-20 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {hours.map(hour => (
              <div 
                key={hour}
                className="h-12 flex items-start justify-end pr-3 pt-2 text-xs font-medium text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800"
              >
                {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map(day => {
            const dayAppointments = filteredAppointments.filter(apt => 
              isSameDay(new Date(apt.start_time), day)
            )
            
            return (
              <div key={day.toISOString()} className="flex-1 border-r border-gray-200 dark:border-gray-700 last:border-r-0 bg-white dark:bg-gray-800">
                {hours.map(hour => {
                  const hourAppointments = dayAppointments.filter(apt => 
                    new Date(apt.start_time).getHours() === hour
                  )
                  
                  return (
                    <div 
                      key={hour}
                      className="h-12 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer relative group"
                      onClick={() => {
                        const slotTime = new Date(day)
                        slotTime.setHours(hour, 0, 0, 0)
                        onTimeSlotClick?.(slotTime)
                      }}
                    >
                      {/* Hover indicator for empty slots */}
                      {hourAppointments.length === 0 && (
                        <div className="absolute inset-0 bg-primary-50 dark:bg-primary-900/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm m-0.5 flex items-center justify-center">
                          <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">+</span>
                        </div>
                      )}
                      
                      {/* Render appointments */}
                      {hourAppointments.map(appointment => {
                        const startMinutes = new Date(appointment.start_time).getMinutes()
                        const durationMinutes = appointment.duration_minutes || 60
                        const heightPercent = Math.min((durationMinutes / 60) * 100, 100)
                        const topPercent = (startMinutes / 60) * 100
                        
                        return (
                          <div
                            key={appointment.id}
                            className={`absolute left-0.5 right-0.5 mx-0.5 px-1.5 py-1 rounded text-xs font-medium cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${getServiceColor(appointment.service_name || appointment.status)}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              onAppointmentClick?.(appointment)
                            }}
                            style={{
                              top: `${topPercent}%`,
                              height: `${Math.max(heightPercent, 20)}%`, // Minimum height
                              zIndex: 10
                            }}
                          >
                            <div className="relative">
                              {/* Barber initials - top right corner for week view */}
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 rounded-full flex items-center justify-center text-xs font-bold leading-none" style={{ fontSize: '8px' }}>
                                {getBarberInitials(appointment.barber_id)}
                              </div>
                              
                              <div className="truncate font-semibold text-xs pr-3">
                                {appointment.client_name}
                              </div>
                              {durationMinutes > 30 && (
                                <div className="truncate text-xs opacity-75 mt-0.5">
                                  {appointment.service_name || 'Service'}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Month view with clean calendar grid - focused on appointment overview
  const renderMonthView = () => {
    const monthStart = startOfMonth(state.currentDate)
    const monthEnd = endOfMonth(state.currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    
    const calendarDays = []
    let currentDay = calendarStart
    
    while (currentDay <= calendarEnd) {
      calendarDays.push(currentDay)
      currentDay = addDays(currentDay, 1)
    }

    return (
      <div className="month-view h-full bg-gray-50 dark:bg-gray-900">
        {/* Month header with day names */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 h-full">
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
                className={`min-h-32 p-2 border-r border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-all hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm bg-white dark:bg-gray-800 ${
                  !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900 opacity-60' : ''
                } ${isSelected ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-700' : ''}
                ${isToday ? 'ring-2 ring-primary-400 dark:ring-primary-600' : ''}`}
                onClick={() => {
                  setSelectedDate(day)
                  onDayClick?.(day)
                }}
                onDoubleClick={() => onDayDoubleClick?.(day)}
              >
                {/* Date number */}
                <div className={`text-sm font-semibold mb-2 flex items-center justify-between ${
                  !isCurrentMonth 
                    ? 'text-gray-400 dark:text-gray-600'
                    : isToday
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  <span className={isToday ? 'bg-primary-100 dark:bg-primary-900 px-2 py-1 rounded-full text-xs' : ''}>
                    {format(day, 'd')}
                  </span>
                  {dayAppointments.length > 0 && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                      {dayAppointments.length}
                    </span>
                  )}
                </div>

                {/* Appointments - compact view */}
                <div className="space-y-1">
                  {dayAppointments.slice(0, 4).map(appointment => (
                    <div
                      key={appointment.id}
                      className={`px-2 py-1 rounded text-xs truncate cursor-pointer transition-all hover:shadow-sm ${getServiceColor(appointment.service_name || appointment.status)}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onAppointmentClick?.(appointment)
                      }}
                      title={`${appointment.client_name} - ${appointment.service_name || 'Service'} at ${format(new Date(appointment.start_time), 'h:mm a')} - ${getBarberInitials(appointment.barber_id)}`}
                    >
                      <div className="flex items-center justify-between relative">
                        {/* Barber initials - left side for month view */}
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 rounded-full flex items-center justify-center font-bold" style={{ fontSize: '8px' }}>
                            {getBarberInitials(appointment.barber_id)}
                          </div>
                          <span className="font-medium truncate">{appointment.client_name}</span>
                        </div>
                        <span className="text-xs opacity-75 ml-1 flex-shrink-0">
                          {format(new Date(appointment.start_time), 'h:mm')}
                        </span>
                      </div>
                    </div>
                  ))}
                  {dayAppointments.length > 4 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-center">
                      +{dayAppointments.length - 4} more
                    </div>
                  )}
                  
                  {/* Empty state for current month days */}
                  {dayAppointments.length === 0 && isCurrentMonth && (
                    <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-xs text-gray-400 dark:text-gray-600">+</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  
  // Determine loading context based on view
  const getLoadingContext = (): 'appointments' | 'calendar' | 'sync' | 'booking' => {
    if (view === 'day') return 'appointments'
    return 'calendar'
  }

  return (
    <div 
      className={`
        unified-calendar h-full flex flex-col 
        bg-white dark:bg-gray-900 
        text-gray-900 dark:text-gray-100
        border border-gray-200 dark:border-gray-700 
        rounded-lg shadow-sm
        ${className}
      `}
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
        className={`
          calendar-content flex-1 overflow-hidden relative 
          p-4 md:p-6
          bg-gray-50 dark:bg-gray-800
          rounded-b-lg
        `}
        ref={swipeContainerRef}
        role="main"
        aria-label={`Calendar ${view} view for ${format(state.currentDate, 'MMMM d, yyyy')}`}
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
                <div className="absolute top-1/2 left-0 right-0 flex justify-between px-4 pointer-events-none opacity-40 z-10" aria-hidden="true">
                  <ChevronLeftIcon className="w-6 h-6 text-gray-500 dark:text-gray-400 animate-bounce-left" />
                  <ChevronRightIcon className="w-6 h-6 text-gray-500 dark:text-gray-400 animate-bounce-right" />
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
      
      {/* Screen reader announcements for calendar updates */}
      <AnnouncementRegion />
      
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        id="calendar-status-announcements"
      >
        {/* Status announcements will be populated here */}
      </div>
    </div>
  )
})

export default UnifiedCalendar
export type { UnifiedCalendarProps }