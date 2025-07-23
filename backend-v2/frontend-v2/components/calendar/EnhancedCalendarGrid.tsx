'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isToday, isBefore, isAfter } from 'date-fns'
import { useCalendarInteractions } from '@/hooks/useCalendarInteractions'
import { useCalendarHaptics } from '@/hooks/useCalendarHaptics'
import { useCalendarSecurity } from '@/hooks/useCalendarSecurity'
import { usePerformanceMonitor } from '@/lib/performance-utils'
import type { BookingResponse } from '@/lib/api'

interface TimeSlot {
  time: string
  available: boolean
  appointments: BookingResponse[]
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  isPast: boolean
  isWeekend: boolean
  appointments: BookingResponse[]
  timeSlots: TimeSlot[]
}

interface EnhancedCalendarGridProps {
  currentDate: Date
  view: 'day' | 'week' | 'month'
  appointments: BookingResponse[]
  timeSlots: TimeSlot[]
  workingHours: { start: string; end: string }
  onAppointmentClick?: (appointment: BookingResponse) => void
  onAppointmentDrop?: (appointment: BookingResponse, newDate: Date, newTime: string) => Promise<void>
  onTimeSlotClick?: (date: Date, time: string) => void
  onDateChange?: (date: Date) => void
  onViewChange?: (view: 'day' | 'week' | 'month') => void
  className?: string
  enableAnimations?: boolean
  enableDragDrop?: boolean
  enableGestures?: boolean
}

/**
 * Enhanced calendar grid with advanced interactions, animations, and visual polish
 * Supports drag & drop, touch gestures, and optimized rendering
 */
export function EnhancedCalendarGrid({
  currentDate,
  view,
  appointments,
  timeSlots,
  workingHours,
  onAppointmentClick,
  onAppointmentDrop,
  onTimeSlotClick,
  onDateChange,
  onViewChange,
  className = '',
  enableAnimations = true,
  enableDragDrop = true,
  enableGestures = true
}: EnhancedCalendarGridProps) {
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [animatingAppointments, setAnimatingAppointments] = useState<Set<number>>(new Set())
  
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()
  
  const { smartHaptic } = useCalendarHaptics({ enableHaptics: true })
  const { auditSecurityEvent } = useCalendarSecurity()
  const { trackRender } = usePerformanceMonitor()

  // Drag and drop handlers
  const interactionCallbacks = useMemo(() => ({
    onAppointmentDragStart: (appointment: BookingResponse, position: { x: number; y: number }) => {
      smartHaptic('appointment_drag_start')
      setAnimatingAppointments(prev => new Set([...prev, appointment.id]))
      auditSecurityEvent('Appointment Drag Started', { appointmentId: appointment.id })
    },
    
    onAppointmentDragMove: (appointment: BookingResponse, position: { x: number; y: number }) => {
      // Find drop target under cursor
      const element = document.elementFromPoint(position.x, position.y)
      const dropTarget = element?.closest('[data-drop-target]')
      const slotId = dropTarget?.getAttribute('data-drop-target')
      
      setHoveredSlot(slotId)
    },

    onAppointmentDrop: async (appointment: BookingResponse, targetSlot: string, targetDate: string) => {
      try {
        const newDate = new Date(targetDate)
        const [hours, minutes] = targetSlot.split(':').map(Number)
        
        setAnimatingAppointments(prev => {
          const newSet = new Set(prev)
          newSet.delete(appointment.id)
          return newSet
        })
        
        smartHaptic('appointment_drag_end', { success: true })
        
        if (onAppointmentDrop) {
          await onAppointmentDrop(appointment, newDate, targetSlot)
        }
        
        auditSecurityEvent('Appointment Dropped Successfully', {
          appointmentId: appointment.id,
          newDate: targetDate,
          newTime: targetSlot
        })
      } catch (error) {
        smartHaptic('appointment_drag_end', { success: false })
        auditSecurityEvent('Appointment Drop Failed', {
          appointmentId: appointment.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    },

    onSwipeLeft: (startX: number, endX: number, velocity: number) => {
      if (view === 'day') {
        onDateChange?.(addDays(currentDate, 1))
      } else if (view === 'week') {
        onDateChange?.(addDays(currentDate, 7))
      } else if (view === 'month') {
        const nextMonth = new Date(currentDate)
        nextMonth.setMonth(nextMonth.getMonth() + 1)
        onDateChange?.(nextMonth)
      }
      smartHaptic('swipe')
    },

    onSwipeRight: (startX: number, endX: number, velocity: number) => {
      if (view === 'day') {
        onDateChange?.(addDays(currentDate, -1))
      } else if (view === 'week') {
        onDateChange?.(addDays(currentDate, -7))
      } else if (view === 'month') {
        const prevMonth = new Date(currentDate)
        prevMonth.setMonth(prevMonth.getMonth() - 1)
        onDateChange?.(prevMonth)
      }
      smartHaptic('swipe')
    },

    onDoubleTap: (position: { x: number; y: number }, target: EventTarget | null) => {
      const element = target as HTMLElement
      const slotElement = element?.closest('[data-time-slot]')
      const dateElement = element?.closest('[data-date]')
      
      if (slotElement && dateElement) {
        const time = slotElement.getAttribute('data-time-slot')
        const dateStr = dateElement.getAttribute('data-date')
        
        if (time && dateStr) {
          const date = new Date(dateStr)
          onTimeSlotClick?.(date, time)
          smartHaptic('select')
          setSelectedSlot(`${dateStr}_${time}`)
        }
      }
    },

    onLongPress: (position: { x: number; y: number }, target: EventTarget | null) => {
      const element = target as HTMLElement
      const appointmentElement = element?.closest('[data-appointment-id]')
      
      if (appointmentElement) {
        const appointmentId = appointmentElement.getAttribute('data-appointment-id')
        const appointment = appointments.find(apt => apt.id === parseInt(appointmentId!))
        
        if (appointment) {
          onAppointmentClick?.(appointment)
          smartHaptic('long_press')
        }
      }
    },

    onPinchMove: (scale: number, center: { x: number; y: number }) => {
      // Handle zoom gestures for different views
      if (scale > 1.2 && view === 'month') {
        onViewChange?.('week')
        smartHaptic('success')
      } else if (scale > 1.5 && view === 'week') {
        onViewChange?.('day')
        smartHaptic('success')
      } else if (scale < 0.8 && view === 'day') {
        onViewChange?.('week')
        smartHaptic('success')
      } else if (scale < 0.6 && view === 'week') {
        onViewChange?.('month')
        smartHaptic('success')
      }
    }
  }), [
    appointments,
    currentDate,
    view,
    onAppointmentClick,
    onAppointmentDrop,
    onTimeSlotClick,
    onDateChange,
    onViewChange,
    smartHaptic,
    auditSecurityEvent
  ])

  const { dragState, handlers } = useCalendarInteractions(interactionCallbacks, {
    enableDragAndDrop: enableDragDrop,
    enableGestures: enableGestures,
    enableHapticFeedback: true
  })

  // Calculate calendar days based on current view
  const calendarDays = useMemo(() => {
    const days: CalendarDay[] = []
    
    if (view === 'day') {
      const day: CalendarDay = {
        date: currentDate,
        isCurrentMonth: true,
        isToday: isToday(currentDate),
        isPast: isBefore(currentDate, new Date()),
        isWeekend: [0, 6].includes(currentDate.getDay()),
        appointments: appointments.filter(apt => 
          isSameDay(new Date(apt.start_time), currentDate)
        ),
        timeSlots: timeSlots
      }
      days.push(day)
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate)
      const weekEnd = endOfWeek(currentDate)
      
      for (let i = 0; i < 7; i++) {
        const date = addDays(weekStart, i)
        const day: CalendarDay = {
          date,
          isCurrentMonth: true,
          isToday: isToday(date),
          isPast: isBefore(date, new Date()),
          isWeekend: [0, 6].includes(date.getDay()),
          appointments: appointments.filter(apt => 
            isSameDay(new Date(apt.start_time), date)
          ),
          timeSlots: timeSlots
        }
        days.push(day)
      }
    } else { // month view
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      const calendarStart = startOfWeek(monthStart)
      const calendarEnd = endOfWeek(monthEnd)
      
      let current = new Date(calendarStart)
      while (current <= calendarEnd) {
        const day: CalendarDay = {
          date: new Date(current),
          isCurrentMonth: current.getMonth() === currentDate.getMonth(),
          isToday: isToday(current),
          isPast: isBefore(current, new Date()),
          isWeekend: [0, 6].includes(current.getDay()),
          appointments: appointments.filter(apt => 
            isSameDay(new Date(apt.start_time), current)
          ),
          timeSlots: []
        }
        days.push(day)
        current = addDays(current, 1)
      }
    }
    
    return days
  }, [currentDate, view, appointments, timeSlots])

  // Generate time grid for day/week views
  const timeGrid = useMemo(() => {
    if (view === 'month') return []
    
    const times: string[] = []
    const [startHour] = workingHours.start.split(':').map(Number)
    const [endHour] = workingHours.end.split(':').map(Number)
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        times.push(timeStr)
      }
    }
    
    return times
  }, [view, workingHours])

  // Handle appointment click
  const handleAppointmentClick = useCallback((appointment: BookingResponse) => {
    setSelectedSlot(`${format(new Date(appointment.start_time), 'yyyy-MM-dd')}_${format(new Date(appointment.start_time), 'HH:mm')}`)
    onAppointmentClick?.(appointment)
    smartHaptic('select')
  }, [onAppointmentClick, smartHaptic])

  // Handle time slot click
  const handleTimeSlotClick = useCallback((date: Date, time: string) => {
    const slotKey = `${format(date, 'yyyy-MM-dd')}_${time}`
    setSelectedSlot(slotKey)
    onTimeSlotClick?.(date, time)
    smartHaptic('select')
  }, [onTimeSlotClick, smartHaptic])

  // Track render performance
  useEffect(() => {
    trackRender('EnhancedCalendarGrid', calendarDays.length * timeGrid.length)
  }, [trackRender, calendarDays.length, timeGrid.length])

  // Render appointment component
  const renderAppointment = useCallback((appointment: BookingResponse, day: CalendarDay) => {
    const isAnimating = animatingAppointments.has(appointment.id)
    const isDragging = dragState.isDragging && dragState.draggedItem?.id === appointment.id
    const startTime = new Date(appointment.start_time)
    const endTime = new Date(appointment.end_time)
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60) // minutes
    
    return (
      <div
        key={appointment.id}
        data-appointment-id={appointment.id}
        className={`
          appointment-block relative p-2 rounded-md border text-sm cursor-pointer transition-all duration-200
          ${enableAnimations ? 'transform-gpu' : ''}
          ${isAnimating ? 'scale-105 shadow-lg z-10' : 'hover:scale-102 hover:shadow-md'}
          ${isDragging ? 'opacity-50 rotate-2' : ''}
          ${appointment.status === 'confirmed' ? 'bg-green-100 border-green-300 text-green-800' :
            appointment.status === 'pending' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' :
            appointment.status === 'cancelled' ? 'bg-red-100 border-red-300 text-red-800' :
            'bg-blue-100 border-blue-300 text-blue-800'}
        `}
        style={{
          height: view === 'day' || view === 'week' ? `${duration * 2}px` : 'auto',
          minHeight: '32px'
        }}
        onClick={() => handleAppointmentClick(appointment)}
        onMouseDown={(e) => enableDragDrop && handlers.onMouseDown?.(e.nativeEvent, appointment)}
        onTouchStart={handlers.onTouchStart}
      >
        <div className="font-medium truncate">{appointment.service_name}</div>
        <div className="text-xs opacity-75 truncate">{appointment.client_name}</div>
        {view !== 'month' && (
          <div className="text-xs opacity-60">
            {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
          </div>
        )}
        {appointment.price && (
          <div className="text-xs font-semibold">${appointment.price}</div>
        )}
      </div>
    )
  }, [
    animatingAppointments,
    dragState,
    view,
    handleAppointmentClick,
    enableDragDrop,
    handlers,
    enableAnimations
  ])

  // Render time slot component
  const renderTimeSlot = useCallback((time: string, day: CalendarDay) => {
    const slotKey = `${format(day.date, 'yyyy-MM-dd')}_${time}`
    const isHovered = hoveredSlot === slotKey
    const isSelected = selectedSlot === slotKey
    const slot = timeSlots.find(ts => ts.time === time)
    const isAvailable = slot?.available !== false
    
    return (
      <div
        key={slotKey}
        data-time-slot={time}
        data-drop-target={slotKey}
        data-date={format(day.date, 'yyyy-MM-dd')}
        className={`
          time-slot relative border-b border-r border-gray-200 dark:border-gray-600 p-1 cursor-pointer transition-all duration-150
          ${enableAnimations ? 'transform-gpu' : ''}
          ${isHovered ? 'bg-blue-100 dark:bg-blue-900/20 scale-102' : ''}
          ${isSelected ? 'bg-blue-200 dark:bg-blue-800/30 ring-2 ring-blue-500' : ''}
          ${!isAvailable ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
          ${day.isPast ? 'opacity-60' : ''}
        `}
        style={{ height: '60px' }}
        onClick={() => isAvailable && handleTimeSlotClick(day.date, time)}
        onMouseEnter={() => setHoveredSlot(slotKey)}
        onMouseLeave={() => setHoveredSlot(null)}
      >
        <div className="text-xs text-gray-500 dark:text-gray-400">{time}</div>
        {slot?.appointments && slot.appointments.length > 0 && (
          <div className="mt-1 space-y-1">
            {slot.appointments.map(apt => renderAppointment(apt, day))}
          </div>
        )}
      </div>
    )
  }, [
    hoveredSlot,
    selectedSlot,
    timeSlots,
    handleTimeSlotClick,
    renderAppointment,
    enableAnimations
  ])

  // Render day header
  const renderDayHeader = useCallback((day: CalendarDay) => {
    return (
      <div
        className={`
          day-header p-3 border-b border-gray-200 dark:border-gray-600 text-center font-medium
          ${day.isToday ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''}
          ${day.isWeekend ? 'text-gray-500 dark:text-gray-400' : ''}
        `}
      >
        <div className="text-sm">{format(day.date, 'EEE')}</div>
        <div className={`text-lg ${day.isToday ? 'font-bold' : ''}`}>
          {format(day.date, 'd')}
        </div>
      </div>
    )
  }, [])

  return (
    <div
      ref={containerRef}
      className={`enhanced-calendar-grid relative ${className}`}
      {...handlers}
    >
      {view === 'month' && (
        <div className="grid grid-cols-7 gap-0 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
          {/* Month header */}
          <div className="col-span-7 bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-600">
            <h2 className="text-xl font-semibold text-center">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
          </div>
          
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              className="p-2 text-sm font-medium text-center bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600"
            >
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {calendarDays.map((day, index) => (
            <div
              key={format(day.date, 'yyyy-MM-dd')}
              data-date={format(day.date, 'yyyy-MM-dd')}
              className={`
                calendar-day relative p-2 min-h-[120px] border-b border-r border-gray-200 dark:border-gray-600 cursor-pointer
                transition-colors duration-150
                ${day.isToday ? 'bg-blue-50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                ${!day.isCurrentMonth ? 'opacity-40' : ''}
                ${day.isPast ? 'opacity-60' : ''}
              `}
              onClick={() => onDateChange?.(day.date)}
            >
              <div className={`text-sm ${day.isToday ? 'font-bold text-blue-600 dark:text-blue-400' : ''}`}>
                {format(day.date, 'd')}
              </div>
              <div className="mt-1 space-y-1">
                {day.appointments.slice(0, 3).map(apt => renderAppointment(apt, day))}
                {day.appointments.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    +{day.appointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(view === 'week' || view === 'day') && (
        <div className="week-day-view border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
          {/* Time grid */}
          <div className="grid gap-0" style={{ gridTemplateColumns: `60px repeat(${calendarDays.length}, 1fr)` }}>
            {/* Header row */}
            <div className="bg-gray-50 dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-600"></div>
            {calendarDays.map(day => (
              <div key={format(day.date, 'yyyy-MM-dd')}>
                {renderDayHeader(day)}
              </div>
            ))}
            
            {/* Time slots */}
            {timeGrid.map(time => (
              <React.Fragment key={time}>
                {/* Time label */}
                <div className="time-label p-2 text-sm text-gray-500 dark:text-gray-400 border-b border-r border-gray-200 dark:border-gray-600 text-right">
                  {time}
                </div>
                
                {/* Day columns */}
                {calendarDays.map(day => (
                  <div key={`${format(day.date, 'yyyy-MM-dd')}_${time}`}>
                    {renderTimeSlot(time, day)}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Drag preview */}
      {dragState.isDragging && dragState.draggedItem && (
        <div
          className="fixed pointer-events-none z-50 opacity-80"
          style={{
            left: dragState.currentPosition.x - 50,
            top: dragState.currentPosition.y - 20,
            transform: enableAnimations ? 'rotate(5deg) scale(0.9)' : undefined
          }}
        >
          <div className="bg-white dark:bg-gray-800 p-2 rounded shadow-lg border">
            <div className="font-medium text-sm">{dragState.draggedItem.service_name}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{dragState.draggedItem.client_name}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedCalendarGrid