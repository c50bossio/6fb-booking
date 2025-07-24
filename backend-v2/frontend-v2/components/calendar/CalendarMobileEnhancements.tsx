'use client'

/**
 * Enhanced mobile touch interactions and responsiveness for the calendar
 * Provides improved touch targets, gestures, and mobile-optimized UI
 */

import React, { useCallback, useRef, useState, useEffect } from 'react'
import { format, addMinutes, startOfDay, differenceInMinutes } from 'date-fns'
import { 
  useTouchEnhancements, 
  TouchGesture, 
  TOUCH_TARGET_SIZES,
  getMobileTouchClass 
} from '@/lib/mobile-touch-enhancements'
import { useResponsive } from '@/hooks/useResponsive'
import { Haptics, ImpactStyle } from '@/lib/capacitor-haptics'
import { motion, AnimatePresence } from '@/lib/framer-motion'
import { CalendarDaysIcon, ClockIcon, PlusIcon } from '@heroicons/react/24/outline'
import type { Appointment } from '@/types/calendar'

interface CalendarMobileEnhancementsProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onPinchZoom?: (scale: number) => void
  onDoubleTap?: (position: { x: number; y: number }) => void
  onLongPress?: (position: { x: number; y: number }) => void
  enableHaptics?: boolean
  className?: string
}

export function CalendarMobileEnhancements({
  children,
  onSwipeLeft,
  onSwipeRight,
  onPinchZoom,
  onDoubleTap,
  onLongPress,
  enableHaptics = true,
  className = ''
}: CalendarMobileEnhancementsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { isMobile } = useResponsive()
  const [showGestureHint, setShowGestureHint] = useState(false)
  const [lastGesture, setLastGesture] = useState<TouchGesture | null>(null)

  // Haptic feedback helper
  const triggerHaptic = useCallback(async (style: typeof ImpactStyle.Light = ImpactStyle.Light) => {
    if (!enableHaptics || !isMobile) return
    
    try {
      await Haptics.impact({ style })
    } catch (error) {
      // Haptics not available on this device
      console.debug('Haptics not available:', error)
    }
  }, [enableHaptics, isMobile])

  // Handle touch gestures
  const handleGesture = useCallback((gesture: TouchGesture) => {
    setLastGesture(gesture)

    switch (gesture.type) {
      case 'swipe':
        if (gesture.direction === 'left' && onSwipeLeft) {
          triggerHaptic(ImpactStyle.Medium)
          onSwipeLeft()
        } else if (gesture.direction === 'right' && onSwipeRight) {
          triggerHaptic(ImpactStyle.Medium)
          onSwipeRight()
        }
        break
      
      case 'doubleTap':
        if (onDoubleTap) {
          triggerHaptic(ImpactStyle.Light)
          onDoubleTap({ x: gesture.startX, y: gesture.startY })
        }
        break
      
      case 'longPress':
        if (onLongPress) {
          triggerHaptic(ImpactStyle.Heavy)
          onLongPress({ x: gesture.startX, y: gesture.startY })
        }
        break
      
      case 'pinch':
        if (onPinchZoom && gesture.scale) {
          onPinchZoom(gesture.scale)
        }
        break
    }
  }, [onSwipeLeft, onSwipeRight, onDoubleTap, onLongPress, onPinchZoom, triggerHaptic])

  // Initialize touch enhancements
  useTouchEnhancements(containerRef, handleGesture, {
    enableSwipe: true,
    enableDoubleTap: true,
    enableLongPress: true,
    enablePinch: true,
    preventDefaultOnSwipe: true,
    swipeThreshold: isMobile ? 30 : 50
  })

  // Show gesture hints for first-time users
  useEffect(() => {
    const hasSeenHints = localStorage.getItem('calendar-gesture-hints-seen')
    if (!hasSeenHints && isMobile) {
      setShowGestureHint(true)
      setTimeout(() => {
        setShowGestureHint(false)
        localStorage.setItem('calendar-gesture-hints-seen', 'true')
      }, 5000)
    }
  }, [isMobile])

  return (
    <div 
      ref={containerRef}
      className={`relative touch-manipulation ${className}`}
      style={{ touchAction: 'manipulation' }}
    >
      {children}

      {/* Gesture hint overlay */}
      <AnimatePresence>
        {showGestureHint && (
          <div
            className="absolute bottom-4 left-4 right-4 bg-blue-500 text-white rounded-lg p-4 shadow-lg z-50"
          >
            <h4 className="font-semibold mb-2">📱 Calendar Gestures</h4>
            <ul className="text-sm space-y-1">
              <li>• Swipe left/right to navigate</li>
              <li>• Double-tap to create appointment</li>
              <li>• Long-press to move appointments</li>
              <li>• Pinch to zoom in/out</li>
            </ul>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Mobile-optimized time slot component with enhanced touch targets
 */
interface MobileTouchTimeSlotProps {
  time: Date
  isAvailable: boolean
  isSelected?: boolean
  onClick?: () => void
  onLongPress?: () => void
  className?: string
}

export function MobileTouchTimeSlot({
  time,
  isAvailable,
  isSelected = false,
  onClick,
  onLongPress,
  className = ''
}: MobileTouchTimeSlotProps) {
  const slotRef = useRef<HTMLButtonElement>(null)
  const [isPressed, setIsPressed] = useState(false)

  useTouchEnhancements(slotRef, (gesture) => {
    if (gesture.type === 'tap' && onClick) {
      onClick()
    } else if (gesture.type === 'longPress' && onLongPress) {
      onLongPress()
    }
  }, {
    enableLongPress: true,
    tapThreshold: 15
  })

  return (
    <button
      ref={slotRef}
      className={`
        relative min-h-[${TOUCH_TARGET_SIZES.PREFERRED}px] w-full
        ${isAvailable ? 'hover:bg-gray-50 dark:hover:bg-gray-800' : 'opacity-50 cursor-not-allowed'}
        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500' : 'border-gray-200 dark:border-gray-700'}
        ${isPressed ? 'scale-95' : ''}
        border rounded-lg p-3 transition-all duration-150
        ${className}
      `}
      disabled={!isAvailable}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{format(time, 'h:mm a')}</span>
        {isAvailable && (
          <span className="text-xs text-gray-500 dark:text-gray-400">Available</span>
        )}
      </div>
      
      {/* Enhanced touch target overlay */}
      <span className="absolute inset-0 -m-1" aria-hidden="true" />
    </button>
  )
}

/**
 * Mobile-optimized appointment card with swipe actions
 */
interface MobileAppointmentCardProps {
  appointment: Appointment
  onEdit?: () => void
  onCancel?: () => void
  onReschedule?: () => void
  className?: string
}

export function MobileAppointmentCard({
  appointment,
  onEdit,
  onCancel,
  onReschedule,
  className = ''
}: MobileAppointmentCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [showActions, setShowActions] = useState(false)

  useTouchEnhancements(cardRef, (gesture) => {
    if (gesture.type === 'swipe' && gesture.direction === 'left') {
      setShowActions(true)
    } else if (gesture.type === 'swipe' && gesture.direction === 'right') {
      setShowActions(false)
    } else if (gesture.type === 'tap' && !showActions) {
      // Handle tap when actions aren't shown
    }
  }, {
    enableSwipe: true,
    swipeThreshold: 30
  })

  const statusColors = {
    scheduled: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    confirmed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    completed: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  }

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-lg ${className}`}
    >
      {/* Main appointment content */}
      <div className={`
        ${getMobileTouchClass('medium', 'secondary')}
        ${statusColors[appointment.status as keyof typeof statusColors] || ''}
        p-4 relative
      `}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-base">{appointment.client_name}</h4>
            <p className="text-sm mt-1">{appointment.service_name}</p>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <ClockIcon className="w-4 h-4" />
              <span>{format(new Date(appointment.start_time), 'h:mm a')}</span>
              <span className="text-gray-400">•</span>
              <span>{appointment.duration_minutes} min</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">${appointment.price}</p>
            <span className={`
              inline-block px-2 py-1 text-xs rounded-full mt-1
              ${statusColors[appointment.status as keyof typeof statusColors] || ''}
            `}>
              {appointment.status}
            </span>
          </div>
        </div>
      </div>

      {/* Swipe actions */}
      <AnimatePresence>
        {showActions && (
          <div
            className="absolute inset-y-0 right-0 flex items-stretch"
          >
            {onReschedule && (
              <button
                onClick={onReschedule}
                className="px-4 bg-blue-500 text-white flex items-center justify-center"
              >
                <CalendarDaysIcon className="w-5 h-5" />
              </button>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 bg-red-500 text-white flex items-center justify-center"
              >
                <span>Cancel</span>
              </button>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Mobile-optimized quick actions button
 */
interface MobileQuickActionProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  className?: string
}

export function MobileQuickAction({
  icon,
  label,
  onClick,
  variant = 'primary',
  className = ''
}: MobileQuickActionProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isPressed, setIsPressed] = useState(false)

  const variantStyles = {
    primary: 'bg-blue-500 text-white active:bg-blue-600',
    secondary: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white active:bg-gray-300',
    danger: 'bg-red-500 text-white active:bg-red-600'
  }

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      className={`
        ${getMobileTouchClass('large', variant === 'danger' ? 'secondary' : variant)}
        ${variantStyles[variant]}
        ${isPressed ? 'scale-95' : 'scale-100'}
        flex flex-col items-center justify-center gap-2
        transition-transform duration-75
        ${className}
      `}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}

/**
 * Mobile-optimized floating action button
 */
interface MobileFABProps {
  onClick: () => void
  className?: string
}

export function MobileFAB({ onClick, className = '' }: MobileFABProps) {
  const [isPressed, setIsPressed] = useState(false)

  return (
    <button
      onClick={onClick}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      className={`
        fixed bottom-6 right-6 z-40
        w-14 h-14 rounded-full
        bg-blue-600 text-white shadow-lg
        flex items-center justify-center
        active:bg-blue-700
        ${isPressed ? 'shadow-xl' : 'shadow-lg'}
        ${className}
      `}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <PlusIcon className="w-6 h-6" />
    </button>
  )
}