'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { format, addDays, startOfWeek, isSameDay, isToday, addWeeks, subWeeks } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { useAnimation, animationPresets } from '@/lib/animations'
import { useCalendarInteractions } from '@/hooks/useCalendarInteractions'
import { useCalendarHaptics } from '@/hooks/useCalendarHaptics'
import { usePerformanceMonitor } from '@/lib/performance-utils'
import type { BookingResponse } from '@/lib/api'

interface PolishedCalendarViewProps {
  currentDate: Date
  appointments: BookingResponse[]
  view: 'week' | 'day'
  workingHours: { start: string; end: string }
  onDateChange: (date: Date) => void
  onViewChange: (view: 'week' | 'day') => void
  onAppointmentClick: (appointment: BookingResponse) => void
  onTimeSlotClick: (date: Date, time: string) => void
  onCreateAppointment: (date: Date, time: string) => void
  className?: string
}

interface CalendarDay {
  date: Date
  isToday: boolean
  appointments: BookingResponse[]
}

interface TimeSlot {
  time: string
  hour: number
  minute: number
}

/**
 * Polished calendar view with smooth animations and micro-interactions
 * Features premium visual design and delightful user experience
 */
export function PolishedCalendarView({
  currentDate,
  appointments,
  view,
  workingHours,
  onDateChange,
  onViewChange,
  onAppointmentClick,
  onTimeSlotClick,
  onCreateAppointment,
  className = ''
}: PolishedCalendarViewProps) {
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null)
  const [animatingAppointments, setAnimatingAppointments] = useState<Set<number>>(new Set())
  const [isNavigating, setIsNavigating] = useState(false)
  const [rippleEvents, setRippleEvents] = useState<Array<{ x: number; y: number; id: string }>>([])

  const calendarRef = useRef<HTMLDivElement>(null)
  const timeGridRef = useRef<HTMLDivElement>(null)
  const { getAnimationProps, getTransitionProps } = useAnimation()
  const { smartHaptic } = useCalendarHaptics()
  const { trackRender } = usePerformanceMonitor()

  // Generate calendar days based on view
  const calendarDays: CalendarDay[] = React.useMemo(() => {
    if (view === 'day') {
      return [{
        date: currentDate,
        isToday: isToday(currentDate),
        appointments: appointments.filter(apt => 
          isSameDay(new Date(apt.start_time), currentDate)
        )
      }]
    } else {
      const weekStart = startOfWeek(currentDate)
      return Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i)
        return {
          date,
          isToday: isToday(date),
          appointments: appointments.filter(apt => 
            isSameDay(new Date(apt.start_time), date)
          )
        }
      })
    }
  }, [currentDate, view, appointments])

  // Generate time slots
  const timeSlots: TimeSlot[] = React.useMemo(() => {
    const slots: TimeSlot[] = []
    const [startHour] = workingHours.start.split(':').map(Number)
    const [endHour] = workingHours.end.split(':').map(Number)

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push({
          time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          hour,
          minute
        })
      }
    }

    return slots
  }, [workingHours])

  // Handle navigation with animation
  const handleNavigate = useCallback(async (direction: 'prev' | 'next') => {
    if (isNavigating) return

    setIsNavigating(true)
    smartHaptic('navigate')

    // Animate out current content
    if (calendarRef.current) {
      const animation = calendarRef.current.animate([
        { transform: 'translateX(0)', opacity: 1 },
        { transform: `translateX(${direction === 'next' ? '-' : ''}20px)`, opacity: 0 }
      ], {
        duration: 200,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
      })

      await animation.finished
    }

    // Update date
    const newDate = view === 'day' 
      ? (direction === 'next' ? addDays(currentDate, 1) : addDays(currentDate, -1))
      : (direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1))
    
    onDateChange(newDate)

    // Animate in new content
    if (calendarRef.current) {
      const animation = calendarRef.current.animate([
        { transform: `translateX(${direction === 'next' ? '' : '-'}20px)`, opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 }
      ], {
        duration: 300,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      })

      await animation.finished
    }

    setIsNavigating(false)
  }, [currentDate, view, onDateChange, isNavigating, smartHaptic])

  // Handle appointment interactions with animations
  const handleAppointmentMouseEnter = useCallback((appointmentId: number) => {
    setAnimatingAppointments(prev => new Set([...prev, appointmentId]))
  }, [])

  const handleAppointmentMouseLeave = useCallback((appointmentId: number) => {
    setTimeout(() => {
      setAnimatingAppointments(prev => {
        const newSet = new Set(prev)
        newSet.delete(appointmentId)
        return newSet
      })
    }, 200)
  }, [])

  // Handle time slot interactions
  const handleTimeSlotHover = useCallback((slotKey: string) => {
    setHoveredSlot(slotKey)
    smartHaptic('select')
  }, [smartHaptic])

  const handleTimeSlotClick = useCallback((date: Date, time: string, event: React.MouseEvent) => {
    onTimeSlotClick(date, time)
    
    // Create ripple effect
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const rippleId = `ripple_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    setRippleEvents(prev => [...prev, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      id: rippleId
    }])

    // Remove ripple after animation
    setTimeout(() => {
      setRippleEvents(prev => prev.filter(ripple => ripple.id !== rippleId))
    }, 600)

    smartHaptic('select')
  }, [onTimeSlotClick, smartHaptic])

  // Track render performance
  useEffect(() => {
    trackRender('PolishedCalendarView', calendarDays.length * timeSlots.length)
  }, [trackRender, calendarDays.length, timeSlots.length])

  // Render appointment with animations
  const renderAppointment = useCallback((appointment: BookingResponse, dayIndex: number) => {
    const isAnimating = animatingAppointments.has(appointment.id)
    const startTime = new Date(appointment.start_time)
    const duration = appointment.duration || 60
    const topPosition = ((startTime.getHours() - parseInt(workingHours.start.split(':')[0])) * 120) + 
                       (startTime.getMinutes() / 30 * 60)

    return (
      <div
        key={appointment.id}
        className={`
          absolute left-1 right-1 rounded-lg p-2 text-xs cursor-pointer transition-all duration-200 z-10
          shadow-sm border border-opacity-20
          ${appointment.status === 'confirmed' ? 'bg-gradient-to-r from-green-400 to-green-500 text-white border-green-300' :
            appointment.status === 'pending' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white border-yellow-300' :
            appointment.status === 'cancelled' ? 'bg-gradient-to-r from-red-400 to-red-500 text-white border-red-300' :
            'bg-gradient-to-r from-blue-400 to-blue-500 text-white border-blue-300'
          }
          ${isAnimating ? 'transform scale-105 shadow-lg z-20' : 'hover:scale-102 hover:shadow-md'}
        `}
        style={{
          top: `${topPosition}px`,
          height: `${duration * 2}px`,
          minHeight: '40px'
        }}
        onMouseEnter={() => handleAppointmentMouseEnter(appointment.id)}
        onMouseLeave={() => handleAppointmentMouseLeave(appointment.id)}
        onClick={() => onAppointmentClick(appointment)}
      >
        <div className="font-medium truncate">{appointment.service_name}</div>
        <div className="opacity-90 truncate">{appointment.client_name}</div>
        <div className="opacity-75 text-xs">
          {format(startTime, 'h:mm a')}
        </div>
        {appointment.price && (
          <div className="font-semibold text-xs mt-1">${appointment.price}</div>
        )}
        
        {/* Animated border when hovered */}
        {isAnimating && (
          <div className="absolute inset-0 border-2 border-white border-opacity-30 rounded-lg animate-pulse" />
        )}
      </div>
    )
  }, [animatingAppointments, workingHours.start, handleAppointmentMouseEnter, handleAppointmentMouseLeave, onAppointmentClick])

  // Render time slot with micro-interactions
  const renderTimeSlot = useCallback((slot: TimeSlot, day: CalendarDay, dayIndex: number) => {
    const slotKey = `${format(day.date, 'yyyy-MM-dd')}_${slot.time}`
    const isHovered = hoveredSlot === slotKey
    const isTopOfHour = slot.minute === 0

    return (
      <div
        key={slotKey}
        className={`
          relative border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-all duration-150
          ${isTopOfHour ? 'border-gray-200 dark:border-gray-600' : ''}
          ${isHovered ? 'bg-blue-50 dark:bg-blue-900/10 scale-102' : 'hover:bg-gray-25 dark:hover:bg-gray-800'}
          overflow-hidden
        `}
        style={{ height: '60px' }}
        onMouseEnter={() => handleTimeSlotHover(slotKey)}
        onMouseLeave={() => setHoveredSlot(null)}
        onClick={(e) => handleTimeSlotClick(day.date, slot.time, e)}
      >
        {/* Time label (only for first column in week view) */}
        {(view === 'day' || dayIndex === 0) && (
          <div className="absolute -left-16 top-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
            {isTopOfHour ? slot.time : ''}
          </div>
        )}

        {/* Hover indicator */}
        {isHovered && (
          <div className="absolute inset-1 border-2 border-blue-300 dark:border-blue-600 border-dashed rounded-md pointer-events-none">
            <div className="absolute top-1 left-1">
              <PlusIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            </div>
          </div>
        )}

        {/* Ripple effects */}
        {rippleEvents.map(ripple => (
          <div
            key={ripple.id}
            className="absolute rounded-full bg-blue-400 opacity-30 pointer-events-none animate-ping"
            style={{
              left: ripple.x - 10,
              top: ripple.y - 10,
              width: '20px',
              height: '20px'
            }}
          />
        ))}

        {/* Grid lines */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gray-100 dark:bg-gray-700" />
        {isTopOfHour && (
          <div className="absolute inset-x-0 top-0 h-px bg-gray-200 dark:bg-gray-600" />
        )}
      </div>
    )
  }, [hoveredSlot, rippleEvents, handleTimeSlotHover, handleTimeSlotClick, view])

  return (
    <div className={`polished-calendar-view ${className}`}>
      {/* Calendar Header */}
      <Card className="mb-4 shadow-sm border-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Navigation */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate('prev')}
                disabled={isNavigating}
                className="hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-200"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </Button>
              
              <div className="px-4 py-2 bg-white/60 dark:bg-gray-700/60 rounded-lg backdrop-blur-sm">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  {view === 'day' 
                    ? format(currentDate, 'EEEE, MMMM d, yyyy')
                    : `Week of ${format(startOfWeek(currentDate), 'MMM d')} - ${format(addDays(startOfWeek(currentDate), 6), 'MMM d, yyyy')}`
                  }
                </h2>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate('next')}
                disabled={isNavigating}
                className="hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-200"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </Button>
            </div>

            {/* View Toggle */}
            <div className="flex items-center space-x-1 bg-white/60 dark:bg-gray-700/60 rounded-lg p-1">
              <Button
                variant={view === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('day')}
                className={`transition-all duration-200 ${
                  view === 'day' 
                    ? 'bg-white shadow-sm' 
                    : 'hover:bg-white/50 dark:hover:bg-gray-600/50'
                }`}
              >
                Day
              </Button>
              <Button
                variant={view === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('week')}
                className={`transition-all duration-200 ${
                  view === 'week' 
                    ? 'bg-white shadow-sm' 
                    : 'hover:bg-white/50 dark:hover:bg-gray-600/50'
                }`}
              >
                Week
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card className="shadow-sm border-0 overflow-hidden">
        <CardContent className="p-0">
          <div 
            ref={calendarRef}
            className="calendar-content"
            {...getTransitionProps(['transform', 'opacity'])}
          >
            {/* Day Headers (Week View) */}
            {view === 'week' && (
              <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                {calendarDays.map((day, index) => (
                  <div
                    key={format(day.date, 'yyyy-MM-dd')}
                    className={`
                      p-4 text-center transition-colors duration-200
                      ${day.isToday ? 'bg-blue-100 dark:bg-blue-900/30' : ''}
                      hover:bg-gray-100 dark:hover:bg-gray-700
                    `}
                  >
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {format(day.date, 'EEE')}
                    </div>
                    <div className={`
                      text-lg font-semibold mt-1
                      ${day.isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}
                    `}>
                      {format(day.date, 'd')}
                    </div>
                    {day.appointments.length > 0 && (
                      <div className="flex justify-center mt-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Time Grid */}
            <div 
              ref={timeGridRef}
              className="relative"
              style={{
                display: 'grid',
                gridTemplateColumns: view === 'day' ? '1fr' : 'repeat(7, 1fr)',
                minHeight: `${timeSlots.length * 60}px`
              }}
            >
              {/* Current time indicator */}
              {calendarDays.some(day => day.isToday) && (
                <div className="absolute left-0 right-0 z-30 pointer-events-none">
                  <div 
                    className="relative"
                    style={{
                      top: `${((new Date().getHours() - parseInt(workingHours.start.split(':')[0])) * 120) + (new Date().getMinutes() / 30 * 60)}px`
                    }}
                  >
                    <div className="w-full h-0.5 bg-red-500 shadow-sm">
                      <div className="absolute left-0 top-0 w-3 h-3 bg-red-500 rounded-full -translate-y-1" />
                    </div>
                  </div>
                </div>
              )}

              {/* Time slots and appointments */}
              {calendarDays.map((day, dayIndex) => (
                <div key={format(day.date, 'yyyy-MM-dd')} className="relative border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                  {/* Time slots */}
                  {timeSlots.map(slot => renderTimeSlot(slot, day, dayIndex))}
                  
                  {/* Appointments */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="relative h-full pointer-events-auto">
                      {day.appointments.map(appointment => renderAppointment(appointment, dayIndex))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current time indicator (mobile) */}
      <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-full px-3 py-2 shadow-lg border border-gray-200 dark:border-gray-700 md:hidden">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium">
            {format(new Date(), 'h:mm a')}
          </span>
        </div>
      </div>
    </div>
  )
}

export default PolishedCalendarView