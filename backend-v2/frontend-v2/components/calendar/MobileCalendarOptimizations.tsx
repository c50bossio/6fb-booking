'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { format, startOfDay, isToday, isTomorrow, addDays, differenceInMinutes } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CalendarIcon, 
  ClockIcon, 
  MapPinIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

// Real-time availability display with pulse animations
interface AvailabilitySlot {
  time: string
  date: Date
  barberId: number
  barberName: string
  duration: number
  available: boolean
  price: number
  isPopular?: boolean
  nextAvailable?: Date
}

interface MobileCalendarProps {
  availableSlots: AvailabilitySlot[]
  userLocation?: { lat: number; lng: number }
  onSlotSelect: (slot: AvailabilitySlot) => void
  onQuickRebook?: (appointmentId: number) => void
  recentAppointments?: Array<{
    id: number
    date: Date
    barberName: string
    service: string
    duration: number
    canRebook: boolean
  }>
  isLoading?: boolean
}

export function MobileCalendarOptimizations({
  availableSlots,
  userLocation,
  onSlotSelect,
  onQuickRebook,
  recentAppointments = [],
  isLoading = false
}: MobileCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'availability' | 'rebook'>('availability')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Real-time availability with smart grouping
  const availabilityByDate = useMemo(() => {
    const grouped = availableSlots.reduce((acc, slot) => {
      const dateKey = format(slot.date, 'yyyy-MM-dd')
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(slot)
      return acc
    }, {} as Record<string, AvailabilitySlot[]>)

    // Sort slots by time within each date
    Object.values(grouped).forEach(slots => {
      slots.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    })

    return grouped
  }, [availableSlots])

  // Smart date suggestions (today, tomorrow, next available)
  const suggestedDates = useMemo(() => {
    const today = new Date()
    const tomorrow = addDays(today, 1)
    const suggestions = []

    // Today (if slots available)
    if (availabilityByDate[format(today, 'yyyy-MM-dd')]) {
      suggestions.push({
        date: today,
        label: 'Today',
        slots: availabilityByDate[format(today, 'yyyy-MM-dd')].length,
        priority: 'high' as const
      })
    }

    // Tomorrow
    if (availabilityByDate[format(tomorrow, 'yyyy-MM-dd')]) {
      suggestions.push({
        date: tomorrow,
        label: 'Tomorrow',
        slots: availabilityByDate[format(tomorrow, 'yyyy-MM-dd')].length,
        priority: 'medium' as const
      })
    }

    // Next available (if not today/tomorrow)
    const nextAvailableDate = Object.keys(availabilityByDate)
      .map(dateStr => new Date(dateStr))
      .filter(date => !isToday(date) && !isTomorrow(date))
      .sort((a, b) => a.getTime() - b.getTime())[0]

    if (nextAvailableDate) {
      suggestions.push({
        date: nextAvailableDate,
        label: format(nextAvailableDate, 'MMM d'),
        slots: availabilityByDate[format(nextAvailableDate, 'yyyy-MM-dd')].length,
        priority: 'low' as const
      })
    }

    return suggestions
  }, [availabilityByDate])

  // Quick rebook functionality
  const handleQuickRebook = useCallback((appointmentId: number) => {
    onQuickRebook?.(appointmentId)
  }, [onQuickRebook])

  // Auto-scroll to current time slots
  useEffect(() => {
    if (scrollRef.current && !isLoading) {
      const now = new Date()
      const currentHour = now.getHours()
      const timeSlotElement = scrollRef.current.querySelector(`[data-hour="${currentHour}"]`)
      
      if (timeSlotElement) {
        timeSlotElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [selectedDate, isLoading])

  return (
    <div className="mobile-calendar-optimizations h-full flex flex-col bg-gray-50">
      {/* Header with mode toggle */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Book Appointment</h2>
          
          {recentAppointments.length > 0 && (
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('availability')}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  viewMode === 'availability' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600'
                }`}
              >
                Available
              </button>
              <button
                onClick={() => setViewMode('rebook')}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  viewMode === 'rebook' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600'
                }`}
              >
                Rebook
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'availability' ? (
          <motion.div
            key="availability"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 overflow-hidden"
          >
            {/* Quick date suggestions */}
            <div className="bg-white px-4 py-3 border-b border-gray-200">
              <div className="flex space-x-2 overflow-x-auto">
                {suggestedDates.map(({ date, label, slots, priority }) => (
                  <button
                    key={format(date, 'yyyy-MM-dd')}
                    onClick={() => setSelectedDate(date)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                        ? 'bg-blue-500 text-white'
                        : priority === 'high'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span>{label}</span>
                    {slots > 0 && (
                      <span className="ml-1 text-xs opacity-75">
                        ({slots})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Real-time availability slots */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-2 space-y-2"
            >
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                      <div className="flex items-center space-x-3">
                        <div className="w-16 h-8 bg-gray-200 rounded"></div>
                        <div className="flex-1">
                          <div className="w-24 h-4 bg-gray-200 rounded mb-1"></div>
                          <div className="w-16 h-3 bg-gray-200 rounded"></div>
                        </div>
                        <div className="w-20 h-8 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                availabilityByDate[format(selectedDate, 'yyyy-MM-dd')]?.map((slot) => (
                  <motion.div
                    key={`${slot.time}-${slot.barberId}`}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-white rounded-lg border border-gray-200 p-4 active:bg-gray-50"
                    onClick={() => onSlotSelect(slot)}
                    data-hour={new Date(slot.time).getHours()}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {/* Time with real-time indicator */}
                        <div className="relative">
                          <div className="text-lg font-semibold text-gray-900">
                            {format(new Date(slot.time), 'h:mm a')}
                          </div>
                          {slot.available && (
                            <motion.div
                              className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          )}
                        </div>

                        {/* Barber info */}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {slot.barberName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {slot.duration} min • ${slot.price}
                          </div>
                        </div>
                      </div>

                      {/* Action button with status */}
                      <div className="flex items-center space-x-2">
                        {slot.isPopular && (
                          <Badge variant="secondary" className="text-xs">
                            <StarIcon className="w-3 h-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                        
                        <Button
                          size="sm"
                          className="px-3 py-1"
                          disabled={!slot.available}
                        >
                          {slot.available ? (
                            <>
                              Book
                              <ArrowRightIcon className="w-4 h-4 ml-1" />
                            </>
                          ) : (
                            'Unavailable'
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Additional slot info */}
                    {!slot.available && slot.nextAvailable && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500 flex items-center">
                          <ClockIcon className="w-3 h-3 mr-1" />
                          Next available: {format(slot.nextAvailable, 'h:mm a')}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )) || (
                  <div className="text-center py-8">
                    <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No slots available for {format(selectedDate, 'MMM d')}</p>
                    <p className="text-sm text-gray-400 mt-1">Try selecting another date</p>
                  </div>
                )
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="rebook"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 overflow-y-auto px-4 py-2 space-y-3"
          >
            <div className="text-sm text-gray-600 mb-4">
              Book the same appointment again with one tap
            </div>

            {recentAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {appointment.service}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {appointment.barberName} • {appointment.duration} min
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Last booked: {format(appointment.date, 'MMM d, h:mm a')}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={appointment.canRebook ? "default" : "secondary"}
                    onClick={() => handleQuickRebook(appointment.id)}
                    disabled={!appointment.canRebook}
                    className="ml-3"
                  >
                    {appointment.canRebook ? (
                      <>
                        Rebook
                        <ArrowRightIcon className="w-4 h-4 ml-1" />
                      </>
                    ) : (
                      'Unavailable'
                    )}
                  </Button>
                </div>
              </div>
            ))}

            {recentAppointments.length === 0 && (
              <div className="text-center py-8">
                <CheckCircleIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No recent appointments</p>
                <p className="text-sm text-gray-400 mt-1">Book your first appointment to enable quick rebooking</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time availability indicator */}
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
          <motion.div
            className="w-2 h-2 bg-green-400 rounded-full"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span>Real-time availability • Updates every 30 seconds</span>
        </div>
      </div>
    </div>
  )
}

// Enhanced touch interactions for appointments
export function TouchOptimizedAppointmentCard({
  appointment,
  onTap,
  onLongPress,
  onSwipeAction,
  className = ""
}: {
  appointment: any
  onTap?: () => void
  onLongPress?: () => void
  onSwipeAction?: (action: 'reschedule' | 'cancel') => void
  className?: string
}) {
  const [isPressing, setIsPressing] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout>()

  const handleTouchStart = useCallback(() => {
    setIsPressing(true)
    longPressTimer.current = setTimeout(() => {
      onLongPress?.()
      setIsPressing(false)
    }, 500) // 500ms long press
  }, [onLongPress])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
    if (isPressing) {
      onTap?.()
    }
    setIsPressing(false)
  }, [isPressing, onTap])

  return (
    <motion.div
      className={`touch-optimized-appointment ${className}`}
      whileTap={{ scale: 0.98 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      drag="x"
      dragConstraints={{ left: -100, right: 100 }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 50) {
          // Swipe threshold reached
          onSwipeAction?.(info.offset.x > 0 ? 'reschedule' : 'cancel')
        }
      }}
    >
      {/* Appointment content */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 min-h-[80px] flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-gray-900">
            {appointment.service}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {format(new Date(appointment.start_time), 'h:mm a')} • {appointment.duration} min
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {appointment.barber_name}
          </div>
          <Badge 
            variant={appointment.status === 'confirmed' ? 'default' : 'secondary'}
            className="text-xs mt-1"
          >
            {appointment.status}
          </Badge>
        </div>
      </div>

      {/* Long press feedback */}
      {isPressing && (
        <motion.div
          className="absolute inset-0 bg-blue-100 rounded-lg opacity-20"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.8 }}
        />
      )}
    </motion.div>
  )
}

export default MobileCalendarOptimizations