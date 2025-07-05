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
  
  // Filter appointments based on current view and filters
  const filteredAppointments = useMemo(() => {
    return optimizedAppointmentFilter(appointments, {
      startDate: state.currentDate,
      view,
      selectedBarberId
    })
  }, [appointments, state.currentDate, view, selectedBarberId, optimizedAppointmentFilter])
  
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
                  className="h-10 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer relative"
                  onClick={() => onTimeSlotClick?.(slotDate)}
                >
                  {/* Render appointments for this time slot */}
                  {dayAppointments
                    .filter(apt => {
                      const aptTime = new Date(apt.start_time)
                      return aptTime.getHours() === hour && aptTime.getMinutes() === minute
                    })
                    .map(appointment => (
                      <div 
                        key={appointment.id}
                        className="absolute inset-0 m-1 p-2 bg-blue-100 border border-blue-300 rounded text-xs cursor-pointer hover:bg-blue-200"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAppointmentClick?.(appointment)
                        }}
                      >
                        <div className="font-medium">{getClientName(appointment)}</div>
                        <div className="text-gray-600">{appointment.service_name}</div>
                      </div>
                    ))
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
                    className="border-r border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer relative"
                    onClick={() => onTimeSlotClick?.(slotDate)}
                  >
                    {slotAppointments.map(appointment => (
                      <div 
                        key={appointment.id}
                        className="absolute inset-0 m-0.5 p-1 bg-blue-100 border border-blue-300 rounded text-xs cursor-pointer hover:bg-blue-200 overflow-hidden"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAppointmentClick?.(appointment)
                        }}
                      >
                        <div className="font-medium truncate">{getClientName(appointment)}</div>
                      </div>
                    ))}
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
                    {dayAppointments.slice(0, 3).map(appointment => (
                      <div 
                        key={appointment.id}
                        className="text-xs p-1 bg-blue-100 border border-blue-300 rounded truncate cursor-pointer hover:bg-blue-200"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAppointmentClick?.(appointment)
                        }}
                      >
                        {getClientName(appointment)}
                      </div>
                    ))}
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
          conflicts={state.conflictAnalysis.conflicts}
          onResolve={(resolution) => {
            // Handle conflict resolution
            setState(prev => ({ 
              ...prev, 
              showConflictModal: false, 
              conflictAnalysis: null 
            }))
          }}
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
export type { UnifiedCalendarProps, CalendarView }