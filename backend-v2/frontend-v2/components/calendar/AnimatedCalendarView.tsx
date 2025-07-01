'use client'

import React, { useState, useEffect, useRef } from 'react'
import { animated, useSpring, useTransition, config } from '@react-spring/web'
import CalendarMonthView from '../CalendarMonthView'
import CalendarWeekView from '../CalendarWeekView'
import CalendarDayView from '../CalendarDayView'
import { CalendarLoadingAnimation } from './CalendarLoadingAnimation'
import { RippleContainer, LoadingDots, SuccessCheckmark } from '@/hooks/useCalendarAnimations'
import { CalendarView } from '@/types/calendar'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface AnimatedCalendarViewProps {
  view: CalendarView
  appointments: any[]
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  selectedBarberId?: number | 'all'
  onBarberSelect?: (barberId: number | 'all') => void
  onAppointmentClick?: (appointment: any) => void
  onTimeSlotClick?: (date: Date, barberId?: number) => void
  onAppointmentUpdate?: (appointmentId: number, newStartTime: string) => void
  onDayClick?: (date: Date) => void
  loading?: boolean
  className?: string
}

export function AnimatedCalendarView({
  view,
  appointments,
  selectedDate,
  onDateSelect,
  selectedBarberId,
  onBarberSelect,
  onAppointmentClick,
  onTimeSlotClick,
  onAppointmentUpdate,
  onDayClick,
  loading = false,
  className = ''
}: AnimatedCalendarViewProps) {
  const [previousView, setPreviousView] = useState(view)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [message, setMessage] = useState('')
  const viewRef = useRef<HTMLDivElement>(null)

  // View transition animation
  const viewTransition = useTransition(view, {
    from: (item) => ({
      opacity: 0,
      transform: getTransformForView(item, previousView, 'from')
    }),
    enter: {
      opacity: 1,
      transform: 'translateX(0%) scale(1) rotateY(0deg)'
    },
    leave: (item) => ({
      opacity: 0,
      transform: getTransformForView(item, view, 'leave')
    }),
    config: config.gentle,
    onStart: () => setPreviousView(view)
  })

  // Success/Error notification animations
  const notificationAnimation = useSpring({
    opacity: showSuccess || showError ? 1 : 0,
    transform: showSuccess || showError ? 'translateY(0px)' : 'translateY(-20px)',
    config: config.wobbly
  })

  // Loading overlay animation
  const loadingAnimation = useSpring({
    opacity: loading ? 1 : 0,
    pointerEvents: loading ? 'auto' : 'none',
    config: config.slow
  })

  // Helper function to determine transform direction
  function getTransformForView(
    currentView: CalendarView,
    compareView: CalendarView,
    phase: 'from' | 'leave'
  ): string {
    const viewOrder = ['day', 'week', 'month']
    const currentIndex = viewOrder.indexOf(currentView)
    const compareIndex = viewOrder.indexOf(compareView)
    
    if (phase === 'from') {
      return currentIndex > compareIndex 
        ? 'translateX(100%) scale(0.9) rotateY(-15deg)'
        : 'translateX(-100%) scale(0.9) rotateY(15deg)'
    } else {
      return currentIndex < compareIndex
        ? 'translateX(100%) scale(0.9) rotateY(-15deg)'
        : 'translateX(-100%) scale(0.9) rotateY(15deg)'
    }
  }

  // Show success notification
  const showSuccessNotification = (msg: string) => {
    setMessage(msg)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  // Show error notification
  const showErrorNotification = (msg: string) => {
    setMessage(msg)
    setShowError(true)
    setTimeout(() => setShowError(false), 3000)
  }

  // Enhanced appointment update with animation feedback
  const handleAppointmentUpdate = async (appointmentId: number, newStartTime: string) => {
    try {
      // Add loading state to specific appointment
      const appointmentEl = document.querySelector(`[data-appointment-id="${appointmentId}"]`)
      appointmentEl?.classList.add('animate-pulse')
      
      await onAppointmentUpdate?.(appointmentId, newStartTime)
      
      // Success animation
      appointmentEl?.classList.remove('animate-pulse')
      appointmentEl?.classList.add('success-bounce')
      showSuccessNotification('Appointment rescheduled successfully!')
      
      setTimeout(() => {
        appointmentEl?.classList.remove('success-bounce')
      }, 600)
    } catch (error) {
      // Error animation
      const appointmentEl = document.querySelector(`[data-appointment-id="${appointmentId}"]`)
      appointmentEl?.classList.remove('animate-pulse')
      appointmentEl?.classList.add('error-shake')
      showErrorNotification('Failed to reschedule appointment')
      
      setTimeout(() => {
        appointmentEl?.classList.remove('error-shake')
      }, 500)
    }
  }

  // Add entrance animation to appointments
  useEffect(() => {
    const appointments = viewRef.current?.querySelectorAll('.calendar-appointment')
    appointments?.forEach((el, index) => {
      (el as HTMLElement).style.animationDelay = `${index * 50}ms`
      el.classList.add('appointment-stagger')
    })
  }, [view, appointments])

  return (
    <div className={`relative ${className}`} ref={viewRef}>
      {/* Loading overlay */}
      <animated.div
        style={loadingAnimation}
        className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-40 flex items-center justify-center"
      >
        <CalendarLoadingAnimation view={view} />
      </animated.div>

      {/* Success/Error notifications */}
      <animated.div
        style={notificationAnimation}
        className={`absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          showSuccess 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
        }`}
      >
        {showSuccess ? (
          <>
            <SuccessCheckmark size={20} />
            <span className="text-sm font-medium">{message}</span>
          </>
        ) : (
          <>
            <XCircleIcon className="w-5 h-5" />
            <span className="text-sm font-medium">{message}</span>
          </>
        )}
      </animated.div>

      {/* Animated calendar views */}
      <div className="relative">
        {viewTransition((style, item) => (
          <animated.div
            style={{
              ...style,
              position: item !== view ? 'absolute' : 'relative',
              width: '100%',
              transformOrigin: 'center center',
              perspective: '1000px'
            }}
          >
            {item === 'month' && (
              <div className="month-fade-in">
                <CalendarMonthView
                  selectedDate={selectedDate}
                  onDateSelect={onDateSelect}
                  appointments={appointments}
                  selectedBarberId={selectedBarberId}
                  onAppointmentClick={onAppointmentClick}
                  onAppointmentUpdate={handleAppointmentUpdate}
                  onDayClick={onDayClick}
                />
              </div>
            )}

            {item === 'week' && (
              <CalendarWeekView
                appointments={appointments}
                selectedBarberId={selectedBarberId}
                onBarberSelect={onBarberSelect}
                onAppointmentClick={onAppointmentClick}
                onTimeSlotClick={onTimeSlotClick}
                onAppointmentUpdate={handleAppointmentUpdate}
                currentDate={selectedDate || new Date()}
                onDateChange={onDateSelect}
              />
            )}

            {item === 'day' && (
              <CalendarDayView
                appointments={appointments}
                selectedBarberId={selectedBarberId}
                onBarberSelect={onBarberSelect}
                onAppointmentClick={onAppointmentClick}
                onTimeSlotClick={onTimeSlotClick}
                onAppointmentUpdate={handleAppointmentUpdate}
                currentDate={selectedDate || new Date()}
                onDateChange={onDateSelect}
              />
            )}
          </animated.div>
        ))}
      </div>
    </div>
  )
}

// View switcher with ripple effect
export function AnimatedViewSwitcher({
  currentView,
  onViewChange
}: {
  currentView: CalendarView
  onViewChange: (view: CalendarView) => void
}) {
  const views: CalendarView[] = ['day', 'week', 'month']
  
  const indicatorAnimation = useSpring({
    left: `${views.indexOf(currentView) * 33.33}%`,
    config: config.gentle
  })

  return (
    <div className="relative flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
      <animated.div
        style={indicatorAnimation}
        className="absolute top-1 bottom-1 w-1/3 bg-white dark:bg-gray-600 rounded-md shadow-sm"
      />
      
      {views.map((view) => (
        <RippleContainer key={view} className="relative flex-1">
          <button
            onClick={() => onViewChange(view)}
            className={`relative z-10 w-full px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              currentView === view
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        </RippleContainer>
      ))}
    </div>
  )
}

// Animated appointment card
export function AnimatedAppointmentCard({ 
  appointment,
  onClick,
  onDragStart,
  onDragEnd,
  isDraggable = true
}: {
  appointment: any
  onClick?: () => void
  onDragStart?: () => void
  onDragEnd?: () => void
  isDraggable?: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const cardAnimation = useSpring({
    transform: isHovered && !isDragging 
      ? 'translateY(-2px) scale(1.02)' 
      : isDragging 
      ? 'scale(1.05) rotate(2deg)'
      : 'translateY(0px) scale(1)',
    boxShadow: isHovered || isDragging
      ? '0 8px 24px rgba(0, 0, 0, 0.15)'
      : '0 2px 4px rgba(0, 0, 0, 0.05)',
    config: config.gentle
  })

  return (
    <animated.div
      style={cardAnimation}
      className={`calendar-appointment appointment-stagger ${isDragging ? 'dragging' : ''}`}
      data-appointment-id={appointment.id}
      draggable={isDraggable}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragStart={() => {
        setIsDragging(true)
        onDragStart?.()
      }}
      onDragEnd={() => {
        setIsDragging(false)
        onDragEnd?.()
      }}
    >
      {/* Appointment content */}
    </animated.div>
  )
}