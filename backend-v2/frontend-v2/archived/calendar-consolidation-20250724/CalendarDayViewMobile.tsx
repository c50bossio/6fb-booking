'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { format, addMinutes, isSameDay, addDays, subDays } from 'date-fns'
import { ClockIcon, UserIcon, ScissorsIcon, PlusIcon } from '@heroicons/react/24/outline'
import { parseAPIDate } from '@/lib/timezone'
import { touchTargets } from '@/hooks/useResponsiveCalendar'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'

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
  price?: number
}

interface CalendarDayViewMobileProps {
  selectedDate: Date
  appointments?: Appointment[]
  onAppointmentClick?: (appointment: Appointment) => void
  onTimeSlotClick?: (date: Date, hour: number, minute: number) => void
  onCreateAppointment?: () => void
  onDateChange?: (date: Date) => void
  selectedBarberId?: number | 'all'
  startHour?: number
  endHour?: number
  className?: string
}

export default function CalendarDayViewMobile({
  selectedDate,
  appointments = [],
  onAppointmentClick,
  onTimeSlotClick,
  onCreateAppointment,
  onDateChange,
  selectedBarberId = 'all',
  startHour = 8,
  endHour = 20,
  className = ''
}: CalendarDayViewMobileProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const currentTimeRef = useRef<HTMLDivElement>(null)

  // Swipe gesture handling with animations
  const handleSwipeLeft = useCallback(() => {
    if (isAnimating) return
    
    setAnimationDirection('left')
    setIsAnimating(true)
    
    setTimeout(() => {
      onDateChange?.(addDays(selectedDate, 1))
      
      setTimeout(() => {
        setIsAnimating(false)
        setAnimationDirection(null)
      }, 300)
    }, 150)
  }, [selectedDate, onDateChange, isAnimating])

  const handleSwipeRight = useCallback(() => {
    if (isAnimating) return
    
    setAnimationDirection('right')
    setIsAnimating(true)
    
    setTimeout(() => {
      onDateChange?.(subDays(selectedDate, 1))
      
      setTimeout(() => {
        setIsAnimating(false)
        setAnimationDirection(null)
      }, 300)
    }, 150)
  }, [selectedDate, onDateChange, isAnimating])

  const { attachToElement } = useSwipeGesture(
    {
      onSwipeLeft: handleSwipeLeft,
      onSwipeRight: handleSwipeRight
    },
    {
      threshold: 50,
      allowMouseEvents: false,
      preventDefaultTouchMove: false // Allow vertical scrolling
    }
  )

  // Attach swipe gesture to scroll container
  useEffect(() => {
    const cleanup = attachToElement(scrollContainerRef.current)
    return cleanup
  }, [attachToElement])

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Scroll to current time on mount
  useEffect(() => {
    if (currentTimeRef.current && isSameDay(selectedDate, new Date())) {
      setTimeout(() => {
        currentTimeRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
      }, 100)
    }
  }, [selectedDate])

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots = []
    const baseDate = new Date(selectedDate)
    baseDate.setHours(startHour, 0, 0, 0)
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = new Date(baseDate)
        slotTime.setHours(hour, minute, 0, 0)
        slots.push(slotTime)
      }
    }
    
    return slots
  }, [selectedDate, startHour, endHour])

  // Filter appointments for selected date and barber
  const dayAppointments = useMemo(() => {
    return appointments.filter(apt => {
      const aptDate = parseAPIDate(apt.start_time)
      const matchesDate = isSameDay(aptDate, selectedDate)
      const matchesBarber = selectedBarberId === 'all' || apt.barber_id === selectedBarberId
      return matchesDate && matchesBarber
    })
  }, [appointments, selectedDate, selectedBarberId])

  // Get appointment for a specific time slot
  const getAppointmentForSlot = useCallback((slotTime: Date) => {
    return dayAppointments.find(apt => {
      const aptTime = parseAPIDate(apt.start_time)
      return aptTime.getHours() === slotTime.getHours() && 
             aptTime.getMinutes() === slotTime.getMinutes()
    })
  }, [dayAppointments])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'confirmed':
      case 'scheduled':
        return 'bg-green-500 border-green-600'
      case 'pending':
        return 'bg-yellow-500 border-yellow-600'
      case 'cancelled':
        return 'bg-red-500 border-red-600'
      case 'completed':
        return 'bg-blue-500 border-blue-600'
      default:
        return 'bg-gray-500 border-gray-600'
    }
  }, [])

  const isPastSlot = useCallback((slotTime: Date) => {
    return slotTime < currentTime && isSameDay(selectedDate, new Date())
  }, [currentTime, selectedDate])

  return (
    <div className={`h-full bg-white dark:bg-gray-800 ${className}`}>
      {/* Time slots */}
      <div 
        ref={scrollContainerRef}
        className={`h-full overflow-y-auto pb-20 transition-transform duration-300 ${
          animationDirection === 'left' 
            ? 'transform translate-x-full opacity-0' 
            : animationDirection === 'right'
            ? 'transform -translate-x-full opacity-0'
            : 'transform translate-x-0 opacity-100'
        }`}
        key={selectedDate.toISOString()} // Force re-render for animation
      >
        {timeSlots.map((slotTime, index) => {
          const appointment = getAppointmentForSlot(slotTime)
          const isPast = isPastSlot(slotTime)
          const isCurrentTime = isSameDay(selectedDate, new Date()) &&
            currentTime.getHours() === slotTime.getHours() &&
            Math.abs(currentTime.getMinutes() - slotTime.getMinutes()) < 30

          return (
            <div key={index} className="relative">
              {/* Current time indicator */}
              {isCurrentTime && (
                <div 
                  ref={currentTimeRef}
                  className="absolute left-0 right-0 z-10 pointer-events-none"
                  style={{
                    top: `${(currentTime.getMinutes() % 30) / 30 * 100}%`
                  }}
                >
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <div className="flex-1 h-px bg-red-500" />
                  </div>
                </div>
              )}

              {/* Time slot */}
              <div 
                className={`flex border-b border-gray-100 dark:border-gray-700 ${
                  isPast ? 'opacity-50' : ''
                }`}
              >
                {/* Time label */}
                <div className="w-20 px-3 py-4 text-right">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {format(slotTime, 'h:mm a')}
                  </span>
                </div>

                {/* Appointment or empty slot */}
                <div className="flex-1 p-2">
                  {appointment ? (
                    <button
                      onClick={() => onAppointmentClick?.(appointment)}
                      className={`w-full text-left p-3 rounded-lg border-l-4 ${
                        getStatusColor(appointment.status)
                      } bg-opacity-10 hover:bg-opacity-20 transition-colors`}
                      style={{ minHeight: touchTargets.recommended }}
                    >
                      <div className="space-y-1">
                        <h4 className="font-medium text-gray-900 dark:text-white line-clamp-1">
                          {appointment.service_name}
                        </h4>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <UserIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">
                            {appointment.client_name || 'Client'}
                          </span>
                        </div>
                        
                        {appointment.barber_name && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <ScissorsIcon className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{appointment.barber_name}</span>
                          </div>
                        )}
                        
                        {appointment.duration_minutes && (
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <ClockIcon className="w-3 h-3" />
                            <span>{appointment.duration_minutes} min</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={() => onTimeSlotClick?.(selectedDate, slotTime.getHours(), slotTime.getMinutes())}
                      disabled={isPast}
                      className={`w-full h-12 rounded-lg border-2 border-dashed transition-colors ${
                        isPast
                          ? 'border-gray-200 dark:border-gray-700 cursor-not-allowed'
                          : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10'
                      }`}
                      style={{ minHeight: touchTargets.minimum }}
                      aria-label={`Book appointment at ${format(slotTime, 'h:mm a')}`}
                    >
                      {!isPast && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 opacity-0 hover:opacity-100 transition-opacity">
                          + Add
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Floating action button */}
      {onCreateAppointment && (
        <button
          onClick={onCreateAppointment}
          className="fixed bottom-20 right-4 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-30"
          aria-label="Create new appointment"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}