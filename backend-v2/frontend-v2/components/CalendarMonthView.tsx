'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { format, isSameDay, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { isToday as checkIsToday, parseAPIDate } from '@/lib/timezone'
import { conflictManager, ConflictAnalysis, ConflictResolution } from '@/lib/appointment-conflicts'
import ConflictResolutionModal from './modals/ConflictResolutionModal'
import { useCalendarPerformance } from '@/hooks/useCalendarPerformance'

interface Appointment {
  id: number
  start_time: string
  end_time?: string
  service_name: string
  client_name?: string
  client_email?: string
  client_phone?: string
  barber_id?: number
  barber_name?: string
  status: string
  duration_minutes?: number
  // Support for nested client/barber objects
  client?: {
    id: number
    first_name: string
    last_name: string
    email?: string
    phone?: string
  }
  barber?: {
    id: number
    name: string
    email?: string
  }
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
  const { measureRender, optimizedAppointmentFilter, memoizedDateCalculations } = useCalendarPerformance()
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

  // Performance monitoring
  useEffect(() => {
    const endMeasure = measureRender('CalendarMonthView')
    return endMeasure
  })

  // Create today's date at midnight in local timezone
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Helper function to get client name from appointment
  const getClientName = (appointment: Appointment): string => {
    if (appointment.client_name) {
      return appointment.client_name
    }
    if (appointment.client) {
      return `${appointment.client.first_name} ${appointment.client.last_name}`.trim()
    }
    return 'Client'
  }

  // Helper function to get barber name from appointment
  const getBarberName = (appointment: Appointment): string => {
    if (appointment.barber_name) {
      return appointment.barber_name
    }
    if (appointment.barber) {
      return appointment.barber.name
    }
    return ''
  }

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
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))
  }, [])

  const nextMonth = useCallback(() => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))
  }, [])

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
  }, [currentMonth, onDateSelect])

  const handleDayDoubleClick = useCallback((day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12, 0, 0)
    onDayDoubleClick?.(date)
  }, [currentMonth, onDayDoubleClick])

  // Optimized appointment filtering with memoization
  const filteredAppointments = useMemo(() => {
    return optimizedAppointmentFilter(appointments, {
      barberId: selectedBarberId
    })
  }, [appointments, selectedBarberId, optimizedAppointmentFilter])

  // Get appointments for a specific day (memoized)
  const getAppointmentsForDay = useCallback((day: number) => {
    const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return filteredAppointments.filter(appointment => {
      try {
        const appointmentDate = new Date(appointment.start_time)
        return isSameDay(appointmentDate, dayDate)
      } catch {
        return false
      }
    })
  }, [currentMonth, filteredAppointments])

  // Get status color for appointment
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'scheduled':
        return 'bg-green-500 border-green-600 text-white'
      case 'pending':
        return 'bg-yellow-500 border-yellow-600 text-white'
      case 'cancelled':
        return 'bg-red-500 border-red-600 text-white'
      case 'completed':
        return 'bg-blue-500 border-blue-600 text-white'
      default:
        return 'bg-purple-500 border-purple-600 text-white'
    }
  }

  // Handle appointment hover for tooltip
  const handleAppointmentHover = (appointment: Appointment, event: React.MouseEvent) => {
    setHoveredAppointment(appointment)
    setTooltipPosition({ x: event.clientX, y: event.clientY })
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Check for conflicts before updating appointment
  const checkAndUpdateAppointment = (appointmentId: number, newStartTime: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId)
    if (!appointment) return

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
      // Show conflict resolution modal
      setConflictAnalysis(analysis)
      setPendingUpdate({ appointmentId, newStartTime })
      setShowConflictModal(true)
    } else {
      // No significant conflicts, proceed with update
      onAppointmentUpdate?.(appointmentId, newStartTime)
    }
  }

  // Handle conflict resolution
  const handleConflictResolution = (resolution: ConflictResolution) => {
    if (!pendingUpdate) return

    let finalStartTime = pendingUpdate.newStartTime
    let finalAppointmentId = pendingUpdate.appointmentId

    // Apply resolution changes
    if (resolution.suggestedStartTime) {
      finalStartTime = resolution.suggestedStartTime
    }
    
    onAppointmentUpdate?.(finalAppointmentId, finalStartTime)
    
    setShowConflictModal(false)
    setConflictAnalysis(null)
    setPendingUpdate(null)
  }

  // Handle proceeding despite conflicts
  const handleProceedAnyway = () => {
    if (!pendingUpdate) return
    
    onAppointmentUpdate?.(pendingUpdate.appointmentId, pendingUpdate.newStartTime)
    
    setShowConflictModal(false)
    setConflictAnalysis(null)
    setPendingUpdate(null)
  }

  // Handle cancelling the update
  const handleCancelConflictResolution = () => {
    setShowConflictModal(false)
    setConflictAnalysis(null)
    setPendingUpdate(null)
  }

  return (
    <div className={`w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {dayNames.map(day => (
          <div key={day} className="p-3 text-center text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: startingDayOfWeek }).map((_, index) => (
          <div key={`empty-${index}`} className="h-32 border-b border-r border-gray-100 dark:border-gray-700" />
        ))}
        
        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1
          const dayAppointments = getAppointmentsForDay(day)
          const visibleAppointments = dayAppointments.slice(0, 3)
          const hiddenCount = dayAppointments.length - 3
          const isPast = isPastDate(day)
          
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
              onClick={() => {
                if (!isDragging) {
                  handleDateClick(day)
                  // Trigger create appointment on single click
                  onDayClick?.(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))
                }
              }}
              onDoubleClick={() => handleDayDoubleClick(day)}
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

              {/* Appointments */}
              <div className="space-y-0.5 overflow-hidden">
                {visibleAppointments.map((appointment, idx) => (
                  <div
                    key={appointment.id}
                    draggable={appointment.status !== 'completed' && appointment.status !== 'cancelled'}
                    className={`text-xs px-1 py-0.5 rounded truncate border transition-all hover:shadow-sm ${getStatusColor(appointment.status)} ${
                      draggedAppointment?.id === appointment.id ? 'opacity-50 animate-pulse' : ''
                    } ${
                      appointment.status !== 'completed' && appointment.status !== 'cancelled' 
                        ? 'cursor-move hover:shadow-md hover:scale-105' 
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
                    title={`${format(new Date(appointment.start_time), 'h:mm a')} - ${getClientName(appointment)} ${
                      appointment.status !== 'completed' && appointment.status !== 'cancelled' ? '(Drag to reschedule)' : ''
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
                    <span className="font-medium">
                      {format(new Date(appointment.start_time), 'h:mm')}
                    </span>
                    {' '}
                    <span className="opacity-90">
                      {getClientName(appointment)}
                    </span>
                  </div>
                ))}
                
                {/* Show more indicator */}
                {hiddenCount > 0 && (
                  <div className="text-xs text-primary-600 dark:text-primary-400 font-medium px-1">
                    +{hiddenCount} more
                  </div>
                )}
              </div>

              {/* Hover indicator */}
              {!isPast && hoveredDay === day && (
                <div className="absolute bottom-1 right-1 text-xs text-primary-600 dark:text-primary-400 font-medium">
                  + Add appointment
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
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Completed</span>
          </div>
          {isDragging && (
            <div className="text-primary-600 dark:text-primary-400 font-medium animate-pulse">
              📍 Drop on a date to reschedule
            </div>
          )}
        </div>
        <div className="text-gray-500 dark:text-gray-400">
          💡 Drag appointments to reschedule • Click any day to add appointment
        </div>
      </div>
    </div>
  )
})

// Add display name for debugging
CalendarMonthView.displayName = 'CalendarMonthView'

export default CalendarMonthView