'use client'

/**
 * Mobile Time Slot Picker Component
 *
 * A touch-optimized time slot picker with native scrolling,
 * haptic feedback, and visual indicators for availability.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { useTheme } from '@/contexts/ThemeContext'
import { ClockIcon, CheckIcon } from '@heroicons/react/24/outline'

interface TimeSlot {
  time: string
  available: boolean
  appointments?: number
}

interface MobileTimeSlotPickerProps {
  selectedDate: Date
  selectedTime?: string
  onTimeSelect: (time: string) => void
  timeSlots: TimeSlot[]

  // Appearance
  slotHeight?: number
  showAvailabilityCount?: boolean
  accentColor?: string

  // Behavior
  enableHapticFeedback?: boolean
  autoScroll?: boolean
  snapToSlot?: boolean

  // Time format
  use24Hour?: boolean
  showDuration?: boolean
  duration?: number // in minutes
}

export function MobileTimeSlotPicker({
  selectedDate,
  selectedTime,
  onTimeSelect,
  timeSlots,
  slotHeight = 60,
  showAvailabilityCount = true,
  accentColor,
  enableHapticFeedback = true,
  autoScroll = true,
  snapToSlot = true,
  use24Hour = false,
  showDuration = true,
  duration = 30
}: MobileTimeSlotPickerProps) {

  const { theme, getThemeColors } = useTheme()
  const colors = getThemeColors()
  const [activeSlot, setActiveSlot] = useState<string | null>(selectedTime || null)
  const containerRef = useRef<HTMLDivElement>(null)
  const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const primaryColor = accentColor || (theme === 'soft-light' ? '#7c9885' : '#8b5cf6')

  // Format time for display
  const formatTime = useCallback((time: string) => {
    if (use24Hour) return time

    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours

    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }, [use24Hour])

  // Calculate end time
  const calculateEndTime = useCallback((startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + duration
    const endHours = Math.floor(totalMinutes / 60)
    const endMinutes = totalMinutes % 60

    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
  }, [duration])

  // Handle time selection
  const handleTimeSelect = useCallback((slot: TimeSlot) => {
    if (!slot.available) return

    if (enableHapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10)
    }

    setActiveSlot(slot.time)
    onTimeSelect(slot.time)
  }, [enableHapticFeedback, onTimeSelect])

  // Auto scroll to selected time
  useEffect(() => {
    if (autoScroll && selectedTime && containerRef.current) {
      const slotElement = slotRefs.current.get(selectedTime)
      if (slotElement) {
        const container = containerRef.current
        const containerHeight = container.clientHeight
        const slotTop = slotElement.offsetTop
        const scrollPosition = slotTop - (containerHeight / 2) + (slotHeight / 2)

        container.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        })
      }
    }
  }, [selectedTime, autoScroll, slotHeight])

  // Group slots by hour for better visual organization
  const groupedSlots = timeSlots.reduce((acc, slot) => {
    const hour = slot.time.split(':')[0]
    if (!acc[hour]) acc[hour] = []
    acc[hour].push(slot)
    return acc
  }, {} as Record<string, TimeSlot[]>)

  // Check if current time has passed
  const isSlotInPast = useCallback((time: string) => {
    const now = new Date()
    const [hours, minutes] = time.split(':').map(Number)
    const slotDate = new Date(selectedDate)
    slotDate.setHours(hours, minutes, 0, 0)

    return slotDate < now
  }, [selectedDate])

  return (
    <div className="mobile-time-slot-picker">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        <div className="flex items-center space-x-2">
          <ClockIcon className="h-5 w-5" style={{ color: colors.textSecondary }} />
          <span className="font-medium" style={{ color: colors.textPrimary }}>
            Select Time
          </span>
        </div>
        <span className="text-sm" style={{ color: colors.textSecondary }}>
          {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* Time slots container */}
      <div
        ref={containerRef}
        className="overflow-y-auto"
        style={{
          maxHeight: '400px',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: snapToSlot ? 'y mandatory' : 'none'
        }}
      >
        {Object.entries(groupedSlots).map(([hour, slots]) => (
          <div key={hour}>
            {/* Hour separator */}
            <div
              className="sticky top-0 px-4 py-2 text-xs font-medium backdrop-blur-sm"
              style={{
                backgroundColor: colors.background + 'ee',
                color: colors.textSecondary
              }}
            >
              {formatTime(`${hour}:00`).split(':')[0]} {!use24Hour && (parseInt(hour) >= 12 ? 'PM' : 'AM')}
            </div>

            {/* Time slots for this hour */}
            {slots.map((slot) => {
              const isPast = isSlotInPast(slot.time)
              const isSelected = activeSlot === slot.time
              const isAvailable = slot.available && !isPast

              return (
                <motion.div
                  key={slot.time}
                  ref={(el) => {
                    if (el) slotRefs.current.set(slot.time, el)
                  }}
                  onClick={() => isAvailable && handleTimeSelect(slot)}
                  whileTap={isAvailable ? { scale: 0.98 } : {}}
                  className="relative touch-target"
                  style={{
                    height: slotHeight,
                    scrollSnapAlign: snapToSlot ? 'start' : 'none',
                    opacity: isAvailable ? 1 : 0.5,
                    cursor: isAvailable ? 'pointer' : 'not-allowed'
                  }}
                >
                  <div
                    className={`absolute inset-x-4 inset-y-2 rounded-lg flex items-center justify-between px-4 transition-all ${
                      isSelected ? 'ring-2' : ''
                    }`}
                    style={{
                      backgroundColor: isSelected
                        ? primaryColor + '20'
                        : isAvailable
                          ? colors.cardBackground
                          : colors.background,
                      borderColor: isSelected ? primaryColor : 'transparent',
                      ringColor: primaryColor
                    }}
                  >
                    {/* Time display */}
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium" style={{
                          color: isSelected ? primaryColor : colors.textPrimary
                        }}>
                          {formatTime(slot.time)}
                        </div>
                        {showDuration && (
                          <div className="text-xs" style={{ color: colors.textSecondary }}>
                            {formatTime(slot.time)} - {formatTime(calculateEndTime(slot.time))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Availability indicator */}
                    <div className="flex items-center space-x-2">
                      {showAvailabilityCount && slot.appointments !== undefined && (
                        <div className="text-xs" style={{ color: colors.textSecondary }}>
                          {slot.appointments > 0 ? `${slot.appointments} booked` : 'Available'}
                        </div>
                      )}

                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center justify-center w-6 h-6 rounded-full"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <CheckIcon className="h-4 w-4 text-white" />
                        </motion.div>
                      )}

                      {!isAvailable && !isPast && (
                        <div className="text-xs font-medium text-red-500">
                          Full
                        </div>
                      )}

                      {isPast && (
                        <div className="text-xs" style={{ color: colors.textSecondary }}>
                          Past
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ripple effect on tap */}
                  {isAvailable && (
                    <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                      <div className="touch-ripple-container" />
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        ))}

        {/* Empty state */}
        {timeSlots.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <ClockIcon className="h-12 w-12 mb-3" style={{ color: colors.textSecondary, opacity: 0.5 }} />
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              No time slots available
            </p>
          </div>
        )}
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .mobile-time-slot-picker {
          position: relative;
        }

        /* Hide scrollbar on mobile */
        .mobile-time-slot-picker > div::-webkit-scrollbar {
          display: none;
        }

        /* Touch ripple effect */
        .touch-ripple-container::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: ${primaryColor}40;
          transform: translate(-50%, -50%);
          transition: width 0.3s, height 0.3s;
        }

        .touch-target:active .touch-ripple-container::after {
          width: 100%;
          height: 100%;
        }

        /* Smooth scrolling */
        @media (prefers-reduced-motion: no-preference) {
          .mobile-time-slot-picker > div {
            scroll-behavior: smooth;
          }
        }
      `}</style>
    </div>
  )
}

// Preset time slot configurations
export const TimeSlotPresets = {
  standard: {
    duration: 30,
    start: '09:00',
    end: '17:00',
    interval: 30
  },

  extended: {
    duration: 30,
    start: '08:00',
    end: '20:00',
    interval: 30
  },

  barber: {
    duration: 45,
    start: '09:00',
    end: '19:00',
    interval: 15
  },

  spa: {
    duration: 60,
    start: '10:00',
    end: '20:00',
    interval: 30
  }
}

// Utility to generate time slots
export function generateTimeSlots(
  start: string,
  end: string,
  interval: number,
  bookedSlots: string[] = []
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const [startHour, startMin] = start.split(':').map(Number)
  const [endHour, endMin] = end.split(':').map(Number)

  let currentHour = startHour
  let currentMin = startMin

  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    const time = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`

    slots.push({
      time,
      available: !bookedSlots.includes(time),
      appointments: bookedSlots.filter(slot => slot === time).length
    })

    currentMin += interval
    if (currentMin >= 60) {
      currentHour += Math.floor(currentMin / 60)
      currentMin = currentMin % 60
    }
  }

  return slots
}

export default MobileTimeSlotPicker
