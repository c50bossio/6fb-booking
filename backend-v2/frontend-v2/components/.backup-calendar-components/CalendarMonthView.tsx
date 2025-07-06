'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { format, isSameDay, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { isToday as checkIsToday, parseAPIDate } from '@/lib/timezone'
import { conflictManager, ConflictAnalysis, ConflictResolution } from '@/lib/appointment-conflicts'
import ConflictResolutionModal from './modals/ConflictResolutionModal'
import { useCalendarPerformance } from '@/hooks/useCalendarPerformance'
import { useCalendarAccessibility } from '@/hooks/useCalendarAccessibility'
import { useCalendarErrorReporting } from './calendar/CalendarErrorBoundary'
import type { CalendarError } from '@/types/calendar'
import { getServiceConfig, getBarberSymbol, type ServiceType } from '@/lib/calendar-constants'

// Use standardized booking response interface
import type { BookingResponse } from '@/lib/api'

interface Appointment extends BookingResponse {
  // Calendar-specific computed fields can be added here if needed
}

interface CalendarMonthViewProps {
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  appointments?: Appointment[]
  onAppointmentClick?: (appointment: Appointment) => void
  onAppointmentUpdate?: (appointmentId: number, newStartTime: string) => void
  onDayDoubleClick?: (date: Date) => void
  onDayClick?: (date: Date) => void
  selectedBarberId?: number | 'all'
  className?: string
}

const CalendarMonthView = React.memo(function CalendarMonthView({ 
  selectedDate, 
  onDateSelect, 
  appointments = [],
  onAppointmentClick,
  onAppointmentUpdate,
  onDayDoubleClick,
  onDayClick,
  selectedBarberId = 'all',
  className = ""
}: CalendarMonthViewProps) {
  const { 
    measureRender, 
    optimizedAppointmentFilter, 
    memoizedDateCalculations,
    optimizedAppointmentsByDay,
    memoizedStatusColor,
    throttle
  } = useCalendarPerformance()
  const { announce, keyboardNav, getGridProps, getGridCellProps, isHighContrast } = useCalendarAccessibility()
  const { reportError } = useCalendarErrorReporting()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const [hoveredAppointment, setHoveredAppointment] = useState<Appointment | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null)
  const [dragOverDay, setDragOverDay] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [conflictAnalysis, setConflictAnalysis] = useState<ConflictAnalysis | null>(null)
  const [pendingUpdate, setPendingUpdate] = useState<{ appointmentId: number; newStartTime: string } | null>(null)
  const [showConflictModal, setShowConflictModal] = useState(false)

  // Enhanced performance monitoring
  useEffect(() => {
    const endMeasure = measureRender('CalendarMonthView')
    return endMeasure
  }, [measureRender])

  // Create today's date at midnight in local timezone
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Simplified helper functions - data is now normalized
  const getClientName = useCallback((appointment: Appointment): string => {
    return appointment.client_name // Always present due to normalization
  }, [])

  const getBarberName = useCallback((appointment: Appointment): string => {
    return appointment.barber_name // Always present due to normalization
  }, [])

  // Memoized month calculations
  const monthData = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek }
  }, [currentMonth])

  const { daysInMonth, startingDayOfWeek } = monthData

  const previousMonth = useCallback(() => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    setCurrentMonth(newMonth)
    announce(`Navigated to ${format(newMonth, 'MMMM yyyy')}`)
  }, [currentMonth, announce])

  const nextMonth = useCallback(() => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    setCurrentMonth(newMonth)
    announce(`Navigated to ${format(newMonth, 'MMMM yyyy')}`)
  }, [currentMonth, announce])

  const isToday = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return checkIsToday(date)
  }

  const isSelected = useCallback((day: number) => {
    if (!selectedDate) return false
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return date.toDateString() === selectedDate.toDateString()
  }, [selectedDate, currentMonth])

  const isPastDate = useCallback((day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    date.setHours(0, 0, 0, 0)
    return date < today
  }, [currentMonth, today])

  const handleDateClick = useCallback((day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12, 0, 0)
    onDateSelect(date)
    announce(`Selected ${format(date, 'EEEE, MMMM d, yyyy')}`)
  }, [currentMonth, onDateSelect, announce])

  const handleDayDoubleClick = useCallback((day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12, 0, 0)
    onDayDoubleClick?.(date)
  }, [currentMonth, onDayDoubleClick])

  // Optimized appointment filtering and grouping
  const { filteredAppointments, appointmentsByDay } = useMemo(() => {
    const filtered = optimizedAppointmentFilter(appointments, {
      barberId: selectedBarberId
    })
    
    // Calculate month boundaries for optimized day grouping
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    monthEnd.setHours(23, 59, 59, 999)
    
    const dayMap = optimizedAppointmentsByDay(filtered, {
      start: monthStart,
      end: monthEnd
    })
    
    return {
      filteredAppointments: filtered,
      appointmentsByDay: dayMap
    }
  }, [appointments, selectedBarberId, currentMonth, optimizedAppointmentFilter, optimizedAppointmentsByDay])

  const getAppointmentsForDay = useCallback((day: number) => {
    const dayKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${day}`
    let dayAppointments = appointmentsByDay.get(dayKey) || []
    
    // Apply optimistic updates for better UX
    dayAppointments = dayAppointments.map(appointment => {
      const optimisticUpdate = optimisticUpdates.get(appointment.id)
      if (optimisticUpdate) {
        return {
          ...appointment,
          start_time: optimisticUpdate.newStartTime
        }
      }
      return appointment
    })
    
    // Filter out appointments that were moved to other days via optimistic updates
    const targetDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    dayAppointments = dayAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.start_time)
      return appointmentDate.getDate() === targetDate.getDate() &&
             appointmentDate.getMonth() === targetDate.getMonth() &&
             appointmentDate.getFullYear() === targetDate.getFullYear()
    })
    
    // Add appointments that were moved TO this day via optimistic updates
    optimisticUpdates.forEach((update, appointmentId) => {
      const updateDate = new Date(update.newStartTime)
      if (updateDate.getDate() === targetDate.getDate() &&
          updateDate.getMonth() === targetDate.getMonth() &&
          updateDate.getFullYear() === targetDate.getFullYear()) {
        
        // Find the original appointment
        const originalAppointment = appointments.find(apt => apt.id === appointmentId)
        if (originalAppointment && !dayAppointments.find(apt => apt.id === appointmentId)) {
          dayAppointments.push({
            ...originalAppointment,
            start_time: update.newStartTime
          })
        }
      }
    })
    
    return dayAppointments
  }, [currentMonth, appointmentsByDay, optimisticUpdates, appointments])

  // Use memoized status color function
  const getStatusColor = memoizedStatusColor

  // Throttled appointment hover for better performance
  const handleAppointmentHover = useCallback(
    throttle((appointment: Appointment, event: React.MouseEvent) => {
      setHoveredAppointment(appointment)
      setTooltipPosition({ x: event.clientX, y: event.clientY })
    }, 16), // ~60fps
    [throttle]
  )

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Enhanced drag & drop with optimistic updates and proper error handling
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<number, { originalStartTime: string; newStartTime: string }>>(new Map())
  
  // Check for conflicts before updating appointment
  const checkAndUpdateAppointment = async (appointmentId: number, newStartTime: string) => {
    try {
      const appointment = appointments.find(apt => apt.id === appointmentId)
      if (!appointment) {
        throw {
          name: 'AppointmentNotFound',
          message: `Appointment with ID ${appointmentId} not found`,
          code: 'VALIDATION_ERROR',
          recoverable: false,
          timestamp: new Date()
        } as CalendarError
      }

      // Store original state for rollback
      const originalStartTime = appointment.start_time
      
      // Apply optimistic update immediately for better UX
      setOptimisticUpdates(prev => new Map(prev.set(appointmentId, { originalStartTime, newStartTime })))

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
          workingHours: { start: 8, end: 20 },
          allowAdjacent: false
        }
      )

      if (analysis.hasConflicts && analysis.riskScore > 30) {
        // Rollback optimistic update
        setOptimisticUpdates(prev => {
          const newMap = new Map(prev)
          newMap.delete(appointmentId)
          return newMap
        })
        
        // Show conflict resolution modal
        setConflictAnalysis(analysis)
        setPendingUpdate({ appointmentId, newStartTime })
        setShowConflictModal(true)
      } else {
        // No significant conflicts, proceed with update
        if (onAppointmentUpdate) {
          try {
            await onAppointmentUpdate(appointmentId, newStartTime)
            
            // Success - clear optimistic update (it's now permanent)
            setOptimisticUpdates(prev => {
              const newMap = new Map(prev)
              newMap.delete(appointmentId)
              return newMap
            })
            
            // Show success feedback
            announce(`Appointment moved to ${format(new Date(newStartTime), 'EEEE, MMMM d at h:mm a')}`)
            
          } catch (updateError: any) {
            // Rollback optimistic update on failure
            setOptimisticUpdates(prev => {
              const newMap = new Map(prev)
              newMap.delete(appointmentId)
              return newMap
            })
            
            // Report error to monitoring
            reportError(updateError, {
              context: 'appointment-update',
              appointmentId,
              newStartTime,
              originalStartTime: appointment.start_time
            })
            
            // Show user-friendly error message
            const userMessage = updateError.message?.includes('404') ? 'Appointment not found' :
                               updateError.message?.includes('403') ? 'Permission denied' :
                               updateError.message?.includes('409') ? 'Time slot no longer available' :
                               'Failed to move appointment. Please try again.'
            
            announce(`Error: ${userMessage}`)
            
            // Re-throw with calendar-specific error
            throw {
              name: 'AppointmentUpdateFailed',
              message: userMessage,
              code: updateError.response?.status >= 500 ? 'SERVER_ERROR' : 'CALENDAR_SYNC_ERROR',
              recoverable: true,
              timestamp: new Date(),
              context: { appointmentId, newStartTime }
            } as CalendarError
          }
        }
      }
    } catch (error: any) {
      // Ensure optimistic update is rolled back
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(appointmentId)
        return newMap
      })
      
      // Report to error tracking
      reportError(error, {
        context: 'checkAndUpdateAppointment',
        appointmentId,
        newStartTime
      })
      
      // Show user-friendly error message
      if (error.code === 'VALIDATION_ERROR') {
        announce(`Validation error: ${error.message}`)
      } else {
        announce(`Failed to move appointment: ${error.message || 'Unknown error'}`)
      }
    }
  }

  // Handle conflict resolution
  const handleConflictResolution = async (resolution: ConflictResolution) => {
    if (!pendingUpdate) return

    try {
      let finalStartTime = pendingUpdate.newStartTime
      let finalAppointmentId = pendingUpdate.appointmentId

      // Apply resolution changes
      if (resolution.suggestedStartTime) {
        finalStartTime = resolution.suggestedStartTime
      }
      
      if (onAppointmentUpdate) {
        await onAppointmentUpdate(finalAppointmentId, finalStartTime)
      }
      
      setShowConflictModal(false)
      setConflictAnalysis(null)
      setPendingUpdate(null)
    } catch (error: any) {
      reportError(error, {
        context: 'conflict-resolution',
        resolution,
        pendingUpdate
      })
      
      // Keep modal open and show error
      console.error('Failed to apply conflict resolution:', error)
    }
  }

  // Handle proceeding despite conflicts
  const handleProceedAnyway = async () => {
    if (!pendingUpdate) return
    
    try {
      if (onAppointmentUpdate) {
        await onAppointmentUpdate(pendingUpdate.appointmentId, pendingUpdate.newStartTime)
      }
      
      setShowConflictModal(false)
      setConflictAnalysis(null)
      setPendingUpdate(null)
    } catch (error: any) {
      reportError(error, {
        context: 'proceed-anyway',
        pendingUpdate,
        conflicts: conflictAnalysis?.conflicts
      })
      
      console.error('Failed to update appointment despite conflicts:', error)
    }
  }

  // Handle cancelling the update
  const handleCancelConflictResolution = () => {
    setShowConflictModal(false)
    setConflictAnalysis(null)
    setPendingUpdate(null)
  }

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    keyboardNav.handleKeyDown(e, 'month')
  }, [keyboardNav])

  return (
    <div 
      className={`w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border ${isHighContrast ? 'border-2 border-black dark:border-white' : 'border-gray-200 dark:border-gray-700'} ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label="Calendar month view"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          aria-label={`Previous month, ${format(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1), 'MMMM yyyy')}`}
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          aria-label={`Next month, ${format(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1), 'MMMM yyyy')}`}
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700" role="row">
        {dayNames.map((day, index) => (
          <div 
            key={day} 
            className="p-3 text-center text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800"
            role="columnheader"
            aria-label={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index]}
          >
            <abbr title={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index]} className="no-underline">
              {day}
            </abbr>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7" role="grid" {...getGridProps()}>
        {/* Empty cells for days before month starts */}
        {Array.from({ length: startingDayOfWeek }).map((_, index) => (
          <div key={`empty-${index}`} className="h-32 border-b border-r border-gray-100 dark:border-gray-700" />
        ))}
        
        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1
          const dayAppointments = getAppointmentsForDay(day)
          // Pre-calculate visible appointments and hidden count
          const visibleAppointments = useMemo(() => dayAppointments.slice(0, 3), [dayAppointments])
          const hiddenCount = useMemo(() => Math.max(0, dayAppointments.length - 3), [dayAppointments])
          const isPast = isPastDate(day)
          
          const hasAppointments = dayAppointments.length > 0
          const cellProps = getGridCellProps(
            new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
            hasAppointments,
            isSelected(day)
          )

          return (
            <div 
              key={day} 
              className={`h-32 border-b border-r border-gray-100 dark:border-gray-700 p-1 cursor-pointer transition-all relative group ${
                isSelected(day) 
                  ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500 ring-inset' 
                  : hoveredDay === day
                  ? 'bg-gray-50 dark:bg-gray-700/50 ring-2 ring-primary-300 ring-inset'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
              } ${isPast ? 'opacity-50' : ''} ${
                dragOverDay === day && draggedAppointment 
                  ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500 ring-opacity-50' 
                  : ''
              } ${
                isDragging ? 'cursor-crosshair' : ''
              }`}
              onClick={(e) => {
                if (!isDragging && !isPast) {
                  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                  // Use unified interaction pattern - single click to select
                  handleDateClick(day)
                  onDayClick?.(date)
                }
              }}
              onDoubleClick={(e) => {
                if (!isPast) {
                  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                  // Double click to create appointment
                  onDayDoubleClick?.(date)
                }
              }}
              {...cellProps}
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
              title={isPast ? 'Past date' : isDragging ? 'Drop to reschedule' : 'Click to create appointment'}
              onDragOver={(e) => {
                if (draggedAppointment && !isPast) {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setDragOverDay(day)
                }
              }}
              onDragLeave={() => {
                setDragOverDay(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (draggedAppointment && onAppointmentUpdate && !isPast) {
                  // Get the original appointment time to preserve hours/minutes
                  const originalDate = new Date(draggedAppointment.start_time)
                  const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                  newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0)
                  
                  // Check if the new date is valid (not in the past)
                  if (newDate > new Date()) {
                    checkAndUpdateAppointment(draggedAppointment.id, newDate.toISOString())
                  }
                }
                setDraggedAppointment(null)
                setDragOverDay(null)
                setIsDragging(false)
              }}
            >
              {/* Day number */}
              <div className={`text-sm font-medium mb-1 ${
                isToday(day) 
                  ? 'text-primary-600 dark:text-primary-400 font-bold' 
                  : isPast
                  ? 'text-gray-400 dark:text-gray-500'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {day}
              </div>

              {/* Today indicator */}
              {isToday(day) && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full"></div>
              )}

              {/* Appointments with premium styling */}
              <div className="space-y-0.5 overflow-visible relative">
                {visibleAppointments.map((appointment, idx) => {
                  // Get service configuration for premium styling
                  const serviceType = appointment.service_name?.toLowerCase().includes('haircut') ? 'haircut' : 
                                     appointment.service_name?.toLowerCase().includes('beard') ? 'beard' :
                                     appointment.service_name?.toLowerCase().includes('color') ? 'color' : 
                                     'haircut' // default fallback
                  const serviceConfig = getServiceConfig(serviceType as ServiceType)
                  const barberSymbol = getBarberSymbol(appointment.barber_id?.toString() || appointment.barber_name || '')
                  
                  return (
                    <div
                      key={appointment.id}
                      draggable={appointment.status !== 'completed' && appointment.status !== 'cancelled'}
                      style={{
                        zIndex: hoveredAppointment?.id === appointment.id ? 50 : 
                                draggedAppointment?.id === appointment.id ? 40 :
                                10 + idx,
                        position: hoveredAppointment?.id === appointment.id ? 'relative' : 'relative',
                        background: serviceConfig.gradient.light,
                        borderColor: serviceConfig.color,
                        boxShadow: `0 0 0 1px ${serviceConfig.color}40, ${serviceConfig.glow}`
                      }}
                      className={`premium-appointment text-xs px-1 py-0.5 rounded truncate border transition-all hover:shadow-md hover:z-50 relative group overflow-hidden ${getStatusColor(appointment.status)} ${
                        draggedAppointment?.id === appointment.id ? 'opacity-50 animate-pulse' : ''
                      } ${
                        hoveredAppointment?.id === appointment.id ? 'shadow-lg scale-105 z-50 bg-opacity-95' : ''
                      } ${
                        appointment.status !== 'completed' && appointment.status !== 'cancelled' 
                          ? 'cursor-move hover:shadow-xl hover:scale-105' 
                          : 'cursor-pointer'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!isDragging) {
                          onAppointmentClick?.(appointment)
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (!isDragging) {
                          handleAppointmentHover(appointment, e)
                        }
                      }}
                      onMouseLeave={() => setHoveredAppointment(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          e.stopPropagation()
                          if (!isDragging) {
                            onAppointmentClick?.(appointment)
                          }
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Appointment: ${getClientName(appointment)} at ${format(new Date(appointment.start_time), 'h:mm a')} for ${appointment.service_name}`}
                      title={`${format(new Date(appointment.start_time), 'h:mm a')} - ${getClientName(appointment)} ${
                        appointment.status !== 'completed' && appointment.status !== 'cancelled' ? '(Drag to reschedule or press Enter to select)' : '(Press Enter to select)'
                      }`}
                      onDragStart={(e) => {
                        if (appointment.status !== 'completed' && appointment.status !== 'cancelled') {
                          e.dataTransfer.effectAllowed = 'move'
                          setDraggedAppointment(appointment)
                          setIsDragging(true)
                          setHoveredAppointment(null)
                        } else {
                          e.preventDefault()
                        }
                      }}
                      onDragEnd={() => {
                        setDraggedAppointment(null)
                        setDragOverDay(null)
                        setIsDragging(false)
                      }}
                    >
                      {/* Barber symbol in top-right corner */}
                      <div className="absolute top-0 right-0 text-xs opacity-70 font-bold text-white bg-black bg-opacity-20 rounded-full w-3 h-3 flex items-center justify-center" title={`Barber: ${appointment.barber_name || 'Unknown'}`}>
                        {barberSymbol}
                      </div>
                      
                      {/* Service icon in bottom-left corner */}
                      <div className="absolute bottom-0 left-0 text-xs opacity-80" title={`Service: ${appointment.service_name}`}>
                        {serviceConfig.icon}
                      </div>
                      
                      {/* Premium shine effect on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                      
                      {/* Content */}
                      <div className="relative z-10">
                        <span className="font-medium text-white">
                          {format(new Date(appointment.start_time), 'h:mm')}
                        </span>
                        {' '}
                        <span className="opacity-90 text-white">
                          {getClientName(appointment)}
                        </span>
                      </div>
                    </div>
                  )
                })}
                
                {/* Show more indicator */}
                {hiddenCount > 0 && (
                  <div className="text-xs text-primary-600 dark:text-primary-400 font-medium px-1">
                    +{hiddenCount} more
                  </div>
                )}
              </div>

              {/* Enhanced hover indicator with better UX */}
              {!isPast && hoveredDay === day && (
                <div className="absolute inset-0 bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-300 dark:border-primary-700 rounded transition-all duration-150 pointer-events-none">
                  <div className="absolute bottom-1 right-1 text-xs text-primary-600 dark:text-primary-400 font-medium bg-white dark:bg-gray-800 px-1 rounded shadow-sm">
                    Click to select • Double-click to create
                  </div>
                </div>
              )}
              
              {/* Visual feedback for drag operations */}
              {dragOverDay === day && draggedAppointment && !isPast && (
                <div className="absolute inset-0 bg-green-100 dark:bg-green-900/30 border-2 border-green-500 border-dashed rounded animate-pulse pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                    Drop to reschedule
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Tooltip */}
      {hoveredAppointment && (
        <div
          className="fixed z-50 bg-gray-900 dark:bg-gray-700 text-white p-3 rounded-lg shadow-xl max-w-xs pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
          }}
        >
          <div className="font-semibold text-sm">
            {getClientName(hoveredAppointment)}
          </div>
          <div className="text-xs opacity-90 mt-1">
            {hoveredAppointment.service_name}
          </div>
          <div className="text-xs opacity-75 mt-1">
            {format(new Date(hoveredAppointment.start_time), 'h:mm a')}
            {hoveredAppointment.duration_minutes && ` (${hoveredAppointment.duration_minutes}m)`}
          </div>
          {getBarberName(hoveredAppointment) && (
            <div className="text-xs opacity-75 mt-1">
              with {getBarberName(hoveredAppointment)}
            </div>
          )}
          <div className="text-xs mt-2 capitalize opacity-90">
            Status: {hoveredAppointment.status}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400" role="region" aria-label="Calendar legend">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded" aria-hidden="true"></div>
            <span>Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded" aria-hidden="true"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded" aria-hidden="true"></div>
            <span>Completed</span>
          </div>
          {isDragging && (
            <div className="text-primary-600 dark:text-primary-400 font-medium animate-pulse">
              📍 Drop on a date to reschedule
            </div>
          )}
        </div>
        <div className="text-gray-500 dark:text-gray-400">
          💡 Drag appointments to reschedule • Click any day to add appointment • Service colors & barber symbols for easy identification
        </div>
      </div>

      {/* Screen reader live region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {keyboardNav.focusedDate && format(keyboardNav.focusedDate, 'EEEE, MMMM d, yyyy')}
      </div>
    </div>
  )
})

// Add display name for debugging
CalendarMonthView.displayName = 'CalendarMonthView'

export default CalendarMonthView