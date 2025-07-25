'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { format, addMinutes, differenceInMinutes } from 'date-fns'
import { ClockIcon, UserIcon, ScissorsIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'
import { touchTargets, mobileSpacing } from '@/hooks/useResponsiveCalendar'
import { useReducedMotion, useHighContrastMode } from './CalendarAccessibility'

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

interface MobileTimeSlotProps {
  slotTime: Date
  appointment?: Appointment
  isCurrentTime?: boolean
  isPast?: boolean
  isSelected?: boolean
  onSlotClick?: (slotTime: Date) => void
  onAppointmentClick?: (appointment: Appointment) => void
  onLongPress?: (slotTime: Date, appointment?: Appointment) => void
  enableHaptics?: boolean
  className?: string
  // Accessibility props
  id?: string
  ariaLabel?: string
  announceChanges?: boolean
}

export default function MobileTimeSlot({
  slotTime,
  appointment,
  isCurrentTime = false,
  isPast = false,
  isSelected = false,
  onSlotClick,
  onAppointmentClick,
  onLongPress,
  enableHaptics = true,
  className = '',
  id,
  ariaLabel,
  announceChanges = true
}: MobileTimeSlotProps) {
  const [isPressed, setIsPressed] = useState(false)
  const [longPressTriggered, setLongPressTriggered] = useState(false)
  const [announcementText, setAnnouncementText] = useState<string>('')
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pressStartTimeRef = useRef<number>(0)
  
  // Accessibility hooks
  const prefersReducedMotion = useReducedMotion()
  const isHighContrast = useHighContrastMode()
  
  // Screen reader announcements
  const announceToScreenReader = useCallback((message: string) => {
    if (!announceChanges) return
    
    setAnnouncementText(message)
    setTimeout(() => setAnnouncementText(''), 1000)
  }, [announceChanges])

  // Haptic feedback utility
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHaptics || typeof window === 'undefined') return
    
    // Use the Vibration API as fallback for haptic feedback
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30]
      }
      navigator.vibrate(patterns[type])
    }
  }, [enableHaptics])

  // Long press handling
  const handlePressStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    setIsPressed(true)
    setLongPressTriggered(false)
    pressStartTimeRef.current = Date.now()
    
    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      setLongPressTriggered(true)
      triggerHapticFeedback('medium')
      onLongPress?.(slotTime, appointment)
    }, 500) // 500ms for long press
  }, [slotTime, appointment, onLongPress, triggerHapticFeedback])

  const handlePressEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    setIsPressed(false)
    
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    // If it wasn't a long press, handle as regular click
    if (!longPressTriggered) {
      const pressDuration = Date.now() - pressStartTimeRef.current
      if (pressDuration < 500) { // Regular tap
        triggerHapticFeedback('light')
        if (appointment) {
          onAppointmentClick?.(appointment)
        } else {
          onSlotClick?.(slotTime)
        }
      }
    }
    
    setLongPressTriggered(false)
  }, [longPressTriggered, slotTime, appointment, onSlotClick, onAppointmentClick, triggerHapticFeedback])

  const handlePressCancel = useCallback(() => {
    setIsPressed(false)
    setLongPressTriggered(false)
    
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'confirmed':
      case 'scheduled':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-l-green-500',
          text: 'text-green-700 dark:text-green-300',
          icon: CheckCircleIcon
        }
      case 'pending':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-l-yellow-500',
          text: 'text-yellow-700 dark:text-yellow-300',
          icon: ExclamationTriangleIcon
        }
      case 'cancelled':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-l-red-500',
          text: 'text-red-700 dark:text-red-300',
          icon: ExclamationTriangleIcon
        }
      case 'completed':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-l-blue-500',
          text: 'text-blue-700 dark:text-blue-300',
          icon: CheckCircleIcon
        }
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-800/50',
          border: 'border-l-gray-500',
          text: 'text-gray-700 dark:text-gray-300',
          icon: ClockIcon
        }
    }
  }, [])

  const statusStyle = appointment ? getStatusColor(appointment.status) : null

  // Build comprehensive ARIA label
  const timeString = format(slotTime, 'h:mm a')
  const buildAriaLabel = () => {
    if (ariaLabel) return ariaLabel
    
    const parts = [timeString]
    if (appointment) {
      parts.push(`${appointment.service_name} appointment`)
      if (appointment.client_name) parts.push(`with ${appointment.client_name}`)
      parts.push(appointment.status)
    } else {
      parts.push(isPast ? 'Past time slot' : 'Available time slot')
    }
    
    if (isCurrentTime) parts.push('Current time')
    if (isSelected) parts.push('Selected')
    
    return parts.join(', ')
  }

  return (
    <div 
      className={`relative ${className}`}
      id={id}
    >
      {/* Screen reader announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        className="sr-only"
      >
        {announcementText}
      </div>

      {/* Current time indicator */}
      {isCurrentTime && (
        <div 
          className="absolute left-0 right-0 z-10 pointer-events-none"
          role="presentation"
          aria-label="Current time indicator"
        >
          <div className="flex items-center">
            <div 
              className={`w-3 h-3 bg-red-500 rounded-full ${
                prefersReducedMotion ? '' : 'animate-pulse'
              }`} 
              aria-hidden="true"
            />
            <div className="flex-1 h-px bg-red-500" aria-hidden="true" />
            <span 
              className="text-xs text-red-500 font-medium px-2"
              aria-label="Current time"
            >
              Now
            </span>
          </div>
        </div>
      )}

      {/* Time slot container */}
      <div className="flex border-b border-gray-100 dark:border-gray-700">
        {/* Time label */}
        <div 
          className="w-20 px-3 py-4 text-right flex-shrink-0"
          role="gridcell"
          aria-label={`Time: ${timeString}`}
        >
          <span 
            className={`text-sm font-medium ${
              isCurrentTime 
                ? 'text-red-500' 
                : 'text-gray-600 dark:text-gray-400'
            }`}
            aria-hidden="true"
          >
            {timeString}
          </span>
        </div>

        {/* Appointment or empty slot */}
        <div className="flex-1 p-2">
          {appointment ? (
            <div
              className={`w-full text-left rounded-lg border-l-4 transition-all ${
                prefersReducedMotion ? 'duration-0' : 'duration-150'
              } ${statusStyle?.bg} ${statusStyle?.border} ${
                isPressed ? 'scale-95 shadow-sm' : 'shadow-sm hover:shadow-md'
              } ${isPast ? 'opacity-60' : ''} ${
                isSelected ? 'ring-2 ring-primary-500 ring-opacity-50' : ''
              } ${isHighContrast ? 'border-2 border-gray-900' : ''}`}
              style={{ 
                minHeight: touchTargets.recommended,
                padding: mobileSpacing.md
              }}
              onTouchStart={handlePressStart}
              onTouchEnd={handlePressEnd}
              onTouchCancel={handlePressCancel}
              onMouseDown={handlePressStart}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressCancel}
              role="button"
              tabIndex={0}
              aria-label={buildAriaLabel()}
              aria-pressed={isPressed}
              aria-describedby={onLongPress ? `${id}-long-press-hint` : undefined}
            >
              <div className="space-y-2">
                {/* Status indicator and service name */}
                <div className="flex items-start justify-between">
                  <h4 className={`font-medium text-sm leading-tight ${statusStyle?.text}`}>
                    {appointment.service_name}
                  </h4>
                  {statusStyle?.icon && (
                    <statusStyle.icon className={`w-4 h-4 flex-shrink-0 ml-2 ${statusStyle.text}`} />
                  )}
                </div>
                
                {/* Client information */}
                {appointment.client_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <UserIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{appointment.client_name}</span>
                  </div>
                )}
                
                {/* Barber information */}
                {appointment.barber_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <ScissorsIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{appointment.barber_name}</span>
                  </div>
                )}
                
                {/* Duration and time */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  {appointment.duration_minutes && (
                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-3 h-3" />
                      <span>{appointment.duration_minutes} min</span>
                    </div>
                  )}
                  
                  {appointment.end_time && (
                    <span>
                      {format(slotTime, 'h:mm')} - {format(addMinutes(slotTime, appointment.duration_minutes || 30), 'h:mm a')}
                    </span>
                  )}
                </div>

                {/* Price if available */}
                {appointment.price && (
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    ${appointment.price}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              className={`w-full rounded-lg border-2 border-dashed transition-all ${
                prefersReducedMotion ? 'duration-0' : 'duration-150'
              } flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                isPast
                  ? 'border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-50'
                  : `border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 ${
                      isPressed ? 'scale-95 bg-primary-50 dark:bg-primary-900/10' : ''
                    } ${isSelected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : ''}`
              } ${isHighContrast ? 'border-4 border-gray-900' : ''}`}
              style={{ minHeight: touchTargets.recommended }}
              disabled={isPast}
              onTouchStart={handlePressStart}
              onTouchEnd={handlePressEnd}
              onTouchCancel={handlePressCancel}
              onMouseDown={handlePressStart}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressCancel}
              aria-label={buildAriaLabel()}
              aria-pressed={isPressed}
              aria-describedby={onLongPress ? `${id}-long-press-hint` : undefined}
            >
              {!isPast && (
                <span 
                  className={`text-sm text-gray-500 dark:text-gray-400 transition-opacity ${
                    prefersReducedMotion ? 'duration-0' : ''
                  } ${isPressed || isSelected ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
                  aria-hidden="true"
                >
                  + Add
                </span>
              )}
              <span className="sr-only">
                {isPast ? 'Past time slot, cannot book' : 'Available time slot, click to book'}
              </span>
            </button>
          )}
        </div>

        {/* Long press indicator */}
        {onLongPress && (
          <div 
            className="w-8 flex items-center justify-center"
            role="presentation"
          >
            <EllipsisHorizontalIcon 
              className="w-4 h-4 text-gray-400" 
              aria-hidden="true"
            />
          </div>
        )}
      </div>
      
      {/* Long press hint for screen readers */}
      {onLongPress && (
        <div id={`${id}-long-press-hint`} className="sr-only">
          Hold for additional options
        </div>
      )}
    </div>
  )
}