'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { format, isToday, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval } from 'date-fns'
import { useCalendarVisuals } from '@/hooks/useCalendarVisuals'
import { useCalendarInteraction } from '@/hooks/useCalendarInteraction'

interface VisualEnhancementProps {
  currentDate: Date
  selectedDate?: Date | null
  appointments?: any[]
  onDateHover?: (date: Date | null) => void
  onDateSelect?: (date: Date) => void
  children?: React.ReactNode
}

/**
 * Visual enhancement component that adds subtle animations and micro-interactions
 * Provides capacity indicators, hover effects, and smooth transitions
 */
export function CalendarVisualEnhancement({
  currentDate,
  selectedDate,
  appointments = [],
  onDateHover,
  onDateSelect,
  children
}: VisualEnhancementProps) {
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)
  const [capacityData, setCapacityData] = useState<Map<string, number>>(new Map())
  const [showCapacityIndicators, setShowCapacityIndicators] = useState(false)
  const animationRef = useRef<HTMLDivElement>(null)

  const { prefersReducedMotion } = useCalendarInteraction()
  const { isMobile } = useCalendarVisuals()
  
  // Simple animation functions to replace complex animation hooks
  const animateSuccess = () => {
    if (animationRef.current && !prefersReducedMotion) {
      animationRef.current.style.transform = 'scale(1.05)'
      setTimeout(() => {
        if (animationRef.current) {
          animationRef.current.style.transform = 'scale(1)'
        }
      }, 150)
    }
  }
  
  const getTransitionClasses = (type: string) => {
    if (prefersReducedMotion) return ''
    return 'transition-all duration-200'
  }
  
  const getAnimationClasses = (classes: string) => {
    if (prefersReducedMotion) return ''
    return classes
  }

  // Calculate appointment capacity for each day
  useEffect(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
    
    const capacityMap = new Map<string, number>()
    
    daysInMonth.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd')
      const dayAppointments = appointments.filter(appointment => 
        isSameDay(new Date(appointment.start_time || appointment.date), day)
      )
      
      // Calculate capacity as percentage (0-1)
      const maxAppointmentsPerDay = 8 // Configurable
      const capacity = Math.min(dayAppointments.length / maxAppointmentsPerDay, 1)
      capacityMap.set(dayKey, capacity)
    })
    
    setCapacityData(capacityMap)
  }, [currentDate, appointments])

  const handleDateHover = useCallback((date: Date | null) => {
    setHoveredDate(date)
    onDateHover?.(date)
  }, [onDateHover])

  const handleDateClick = useCallback((date: Date) => {
    onDateSelect?.(date)
    
    if (!prefersReducedMotion) {
      animateSuccess()
    }
  }, [onDateSelect, animateSuccess, prefersReducedMotion])

  const getCapacityColor = (capacity: number) => {
    if (capacity <= 0.3) return 'bg-green-100 dark:bg-green-900' // Low capacity - green
    if (capacity <= 0.7) return 'bg-yellow-100 dark:bg-yellow-900' // Medium capacity - yellow
    return 'bg-red-100 dark:bg-red-900' // High capacity - red
  }

  const getCapacityIndicator = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const capacity = capacityData.get(dateKey) || 0
    
    if (!showCapacityIndicators || capacity === 0) return null
    
    return (
      <div className="absolute bottom-1 right-1 flex space-x-0.5">
        {Array.from({ length: Math.ceil(capacity * 4) }, (_, i) => (
          <div
            key={i}
            className={`w-1 h-1 rounded-full ${
              i < capacity * 4 ? getCapacityColor(capacity) : 'bg-gray-200 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>
    )
  }

  const getCurrentDateGlow = () => {
    if (prefersReducedMotion) return ''
    
    return `
      relative
      before:absolute 
      before:-inset-1 
      before:bg-gradient-to-r 
      before:from-blue-500/20 
      before:to-purple-500/20 
      before:rounded-lg 
      before:blur-sm 
      before:-z-10
      before:animate-pulse
    `
  }

  return (
    <div 
      ref={animationRef}
      className={`calendar-visual-enhancement ${getTransitionClasses('view')}`}
    >
      {/* Capacity Toggle Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setShowCapacityIndicators(!showCapacityIndicators)}
          className={`
            px-3 py-1 text-xs font-medium rounded-full transition-all duration-200
            ${showCapacityIndicators 
              ? 'bg-blue-500 text-white shadow-lg' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }
            ${getTransitionClasses('appointment')}
          `}
          title="Toggle capacity indicators"
        >
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-current opacity-60" />
            <span>Capacity</span>
          </div>
        </button>
      </div>

      {/* Enhanced Date Cells */}
      <div className="calendar-dates-container">
        {children}
      </div>

      {/* Hover Information Overlay */}
      {hoveredDate && (
        <div 
          className={`
            absolute z-20 pointer-events-none
            bg-white dark:bg-gray-800 
            rounded-lg shadow-lg border border-gray-200 dark:border-gray-700
            px-3 py-2 text-sm
            ${getAnimationClasses('opacity-0 animate-fade-in')}
            ${getTransitionClasses('modal')}
          `}
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="text-gray-900 dark:text-white font-medium">
            {format(hoveredDate, 'EEEE, MMMM d')}
          </div>
          
          {capacityData.get(format(hoveredDate, 'yyyy-MM-dd')) && (
            <div className="text-gray-600 dark:text-gray-300 text-xs mt-1">
              {Math.round((capacityData.get(format(hoveredDate, 'yyyy-MM-dd')) || 0) * 8)} appointments
            </div>
          )}
          
          {isToday(hoveredDate) && (
            <div className="text-blue-500 text-xs font-medium">Today</div>
          )}
        </div>
      )}

      {/* Current Date Highlight */}
      <style jsx>{`
        .calendar-current-date {
          ${isToday(currentDate) ? getCurrentDateGlow() : ''}
        }
      `}</style>
    </div>
  )
}

/**
 * Enhanced Date Cell Component with micro-interactions
 */
interface EnhancedDateCellProps {
  date: Date
  isCurrentMonth?: boolean
  isSelected?: boolean
  isToday?: boolean
  appointmentCount?: number
  capacity?: number
  onClick?: (date: Date) => void
  onHover?: (date: Date | null) => void
  children?: React.ReactNode
}

export function EnhancedDateCell({
  date,
  isCurrentMonth = true,
  isSelected = false,
  isToday: isTodayProp = false,
  appointmentCount = 0,
  capacity = 0,
  onClick,
  onHover,
  children
}: EnhancedDateCellProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { prefersReducedMotion: cellPrefersReducedMotion } = useCalendarInteraction()
  
  const getTransitionClasses = (type: string) => {
    if (cellPrefersReducedMotion) return ''
    return 'transition-all duration-200'
  }
  
  const animateTouchStart = (element: HTMLElement) => {
    if (!cellPrefersReducedMotion) {
      element.style.transform = 'scale(0.95)'
    }
  }
  
  const animateTouchEnd = (element: HTMLElement) => {
    if (!cellPrefersReducedMotion) {
      element.style.transform = 'scale(1)'
    }
  }
  const cellRef = useRef<HTMLButtonElement>(null)

  const handleClick = useCallback(() => {
    onClick?.(date)
  }, [date, onClick])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    onHover?.(date)
  }, [date, onHover])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    onHover?.(null)
  }, [onHover])

  const handleTouchStart = useCallback(() => {
    if (cellRef.current) {
      animateTouchStart(cellRef.current)
    }
  }, [animateTouchStart])

  const handleTouchEnd = useCallback(() => {
    if (cellRef.current) {
      animateTouchEnd(cellRef.current)
    }
  }, [animateTouchEnd])

  const getCapacityIndicator = () => {
    if (capacity === 0) return null
    
    const intensity = Math.min(capacity, 1)
    const colorClass = intensity <= 0.3 ? 'bg-green-400' : 
                     intensity <= 0.7 ? 'bg-yellow-400' : 'bg-red-400'
    
    return (
      <div 
        className={`
          absolute top-1 right-1 w-2 h-2 rounded-full ${colorClass}
          ${intensity > 0.7 ? 'animate-pulse' : ''}
        `} 
      />
    )
  }

  return (
    <button
      ref={cellRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`
        relative w-full h-10 rounded-lg
        flex items-center justify-center text-sm font-medium
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        ${getTransitionClasses('appointment')}
        
        ${isCurrentMonth 
          ? 'text-gray-900 dark:text-white' 
          : 'text-gray-400 dark:text-gray-500'
        }
        
        ${isSelected 
          ? 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-300' 
          : isHovered
            ? 'bg-gray-100 dark:bg-gray-700'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        }
        
        ${isTodayProp 
          ? 'ring-2 ring-blue-400 ring-offset-2 bg-blue-50 dark:bg-blue-900/20' 
          : ''
        }
        
        ${appointmentCount > 0 ? 'font-semibold' : ''}
      `}
    >
      <span className="relative z-10">
        {format(date, 'd')}
      </span>
      
      {/* Capacity indicator */}
      {getCapacityIndicator()}
      
      {/* Appointment count indicator */}
      {appointmentCount > 0 && (
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
          <div 
            className={`
              w-1 h-1 rounded-full bg-blue-500
              ${appointmentCount > 3 ? 'animate-pulse' : ''}
            `} 
          />
          {appointmentCount > 1 && (
            <div className="w-1 h-1 rounded-full bg-blue-400 -mt-0.5" />
          )}
          {appointmentCount > 2 && (
            <div className="w-1 h-1 rounded-full bg-blue-300 -mt-0.5" />
          )}
        </div>
      )}
      
      {children}
    </button>
  )
}

/**
 * Status indicator component for real-time updates
 */
interface StatusIndicatorProps {
  status: 'loading' | 'success' | 'error' | 'idle'
  message?: string
  autoHide?: boolean
  duration?: number
}

export function StatusIndicator({ 
  status, 
  message, 
  autoHide = true, 
  duration = 3000 
}: StatusIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true)
  const { prefersReducedMotion: statusPrefersReducedMotion } = useCalendarInteraction()
  
  const getTransitionClasses = (type: string) => {
    if (statusPrefersReducedMotion) return ''
    return 'transition-all duration-200'
  }

  useEffect(() => {
    if (autoHide && (status === 'success' || status === 'error')) {
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [status, autoHide, duration])

  if (!isVisible || status === 'idle') return null

  const getStatusStyles = () => {
    switch (status) {
      case 'loading':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
      case 'success':
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800'
    }
  }

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )
      case 'success':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div 
      className={`
        fixed top-4 left-1/2 transform -translate-x-1/2 z-50
        px-4 py-2 rounded-lg border shadow-lg
        flex items-center space-x-2
        ${getStatusStyles()}
        ${getTransitionClasses('modal')}
        animate-slide-in-down
      `}
    >
      {getIcon()}
      {message && <span className="text-sm font-medium">{message}</span>}
    </div>
  )
}