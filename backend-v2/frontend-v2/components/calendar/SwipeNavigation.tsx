'use client'

import React, { useRef, useCallback, useState, useEffect } from 'react'
import { format, addDays, subDays, startOfWeek, endOfWeek, isSameDay, isToday } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FreshaColors, 
  FreshaTypography,
  FreshaBorderRadius,
  FreshaShadows
} from '@/lib/fresha-design-system'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

// Import mobile interactions
import { useMobileInteractions } from '@/hooks/useMobileInteractions'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'

interface SwipeNavigationProps {
  currentDate: Date
  onDateChange: (date: Date) => void
  showWeekView?: boolean
  minDate?: Date
  maxDate?: Date
  appointments?: Array<{ start_time: string }>
  className?: string
}

const SwipeNavigation: React.FC<SwipeNavigationProps> = ({
  currentDate,
  onDateChange,
  showWeekView = false,
  minDate,
  maxDate,
  appointments = [],
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  
  const { 
    triggerHapticFeedback, 
    announceToScreenReader 
  } = useMobileInteractions()

  // Generate dates to display
  const dates = React.useMemo(() => {
    if (showWeekView) {
      const weekStart = startOfWeek(currentDate)
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    } else {
      return [subDays(currentDate, 1), currentDate, addDays(currentDate, 1)]
    }
  }, [currentDate, showWeekView])

  // Count appointments for each date
  const getAppointmentCount = useCallback((date: Date) => {
    return appointments.filter(apt => 
      isSameDay(new Date(apt.start_time), date)
    ).length
  }, [appointments])

  // Handle date navigation with animation
  const navigateToDate = useCallback((newDate: Date, direction: 'left' | 'right') => {
    if (isAnimating) return
    
    // Check date bounds
    if (minDate && newDate < minDate) return
    if (maxDate && newDate > maxDate) return
    
    setIsAnimating(true)
    setSwipeDirection(direction)
    triggerHapticFeedback({ type: 'light' })
    
    setTimeout(() => {
      onDateChange(newDate)
      announceToScreenReader(`Selected ${format(newDate, 'EEEE, MMMM d, yyyy')}`)
      
      setTimeout(() => {
        setIsAnimating(false)
        setSwipeDirection(null)
      }, 150)
    }, 100)
  }, [isAnimating, minDate, maxDate, onDateChange, triggerHapticFeedback, announceToScreenReader])

  // Handle swipe gestures
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: () => {
      const newDate = showWeekView ? addDays(currentDate, 7) : addDays(currentDate, 1)
      navigateToDate(newDate, 'left')
    },
    onSwipeRight: () => {
      const newDate = showWeekView ? subDays(currentDate, 7) : subDays(currentDate, 1)
      navigateToDate(newDate, 'right')
    }
  }, {
    threshold: 50,
    allowMouseEvents: false
  })

  // Attach swipe handlers
  useEffect(() => {
    if (containerRef.current) {
      const cleanup = swipeHandlers.attachToElement(containerRef.current)
      return cleanup
    }
  }, [swipeHandlers])

  // Handle button navigation
  const handlePrevious = useCallback(() => {
    const newDate = showWeekView ? subDays(currentDate, 7) : subDays(currentDate, 1)
    navigateToDate(newDate, 'right')
  }, [currentDate, showWeekView, navigateToDate])

  const handleNext = useCallback(() => {
    const newDate = showWeekView ? addDays(currentDate, 7) : addDays(currentDate, 1)
    navigateToDate(newDate, 'left')
  }, [currentDate, showWeekView, navigateToDate])

  // Handle date click
  const handleDateClick = useCallback((date: Date) => {
    if (!isSameDay(date, currentDate)) {
      const direction = date > currentDate ? 'left' : 'right'
      navigateToDate(date, direction)
    }
  }, [currentDate, navigateToDate])

  const renderDateButton = (date: Date, index: number) => {
    const isSelected = isSameDay(date, currentDate)
    const isCurrentDay = isToday(date)
    const appointmentCount = getAppointmentCount(date)
    const isDisabled = (minDate && date < minDate) || (maxDate && date > maxDate)

    return (
      <Button
        key={date.toISOString()}
        variant={isSelected ? 'default' : 'ghost'}
        onClick={() => handleDateClick(date)}
        disabled={isDisabled}
        className={`
          relative flex-1 min-w-0 h-auto py-3 px-2 flex flex-col items-center space-y-1
          ${isSelected ? 'bg-blue-600 text-white' : ''}
          ${isCurrentDay && !isSelected ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'touch-manipulation'}
          transition-all duration-200 ease-in-out
          ${isAnimating && swipeDirection ? 
            swipeDirection === 'left' ? 'transform translate-x-2' : 'transform -translate-x-2'
            : ''
          }
          hover:scale-105 active:scale-95
        `}
        style={{
          minHeight: '64px',
          minWidth: showWeekView ? '40px' : '80px'
        }}
      >
        {/* Day of Week (Week view only) */}
        {showWeekView && (
          <span className={`text-xs font-medium ${
            isSelected ? 'text-white' : 'text-gray-500'
          }`}>
            {format(date, 'EEE').toUpperCase()}
          </span>
        )}

        {/* Date Number */}
        <span className={`text-lg font-bold ${
          isSelected ? 'text-white' : 
          isCurrentDay ? 'text-blue-600' : 'text-gray-900'
        }`}>
          {format(date, 'd')}
        </span>

        {/* Month (if different from current) */}
        {!showWeekView && date.getMonth() !== currentDate.getMonth() && (
          <span className={`text-xs ${
            isSelected ? 'text-white' : 'text-gray-500'
          }`}>
            {format(date, 'MMM')}
          </span>
        )}

        {/* Appointment Count */}
        {appointmentCount > 0 && (
          <Badge 
            variant={isSelected ? 'secondary' : 'default'}
            className={`
              absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs
              ${isSelected ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}
            `}
          >
            {appointmentCount > 9 ? '9+' : appointmentCount}
          </Badge>
        )}

        {/* Today Indicator */}
        {isCurrentDay && !isSelected && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
        )}
      </Button>
    )
  }

  return (
    <div className={`relative bg-white ${className}`}>
      {/* Header with Navigation (Week view) */}
      {showWeekView && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            disabled={isAnimating || (minDate && subDays(currentDate, 7) < minDate)}
            className="p-2 min-w-[44px] min-h-[44px]"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </Button>

          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">
              {format(startOfWeek(currentDate), 'MMM d')} - {format(endOfWeek(currentDate), 'MMM d, yyyy')}
            </h2>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNext}
            disabled={isAnimating || (maxDate && addDays(currentDate, 7) > maxDate)}
            className="p-2 min-w-[44px] min-h-[44px]"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Date Selection Area */}
      <div 
        ref={containerRef}
        className={`
          relative p-4 overflow-hidden
          ${isAnimating ? 'pointer-events-none' : ''}
        `}
        style={{
          touchAction: 'pan-y pinch-zoom'
        }}
      >
        {/* Swipe Indicator */}
        <div className="flex justify-center mb-2">
          <div className="flex space-x-1">
            {[...Array(showWeekView ? 7 : 3)].map((_, i) => (
              <div
                key={i}
                className={`w-1 h-1 rounded-full transition-colors ${
                  i === (showWeekView ? dates.findIndex(d => isSameDay(d, currentDate)) : 1)
                    ? 'bg-blue-500' 
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Date Buttons */}
        <div 
          className={`
            flex space-x-2
            transition-transform duration-200 ease-out
            ${isAnimating && swipeDirection ? 
              swipeDirection === 'left' ? 'transform translate-x-4' : 'transform -translate-x-4'
              : ''
            }
          `}
        >
          {dates.map((date, index) => renderDateButton(date, index))}
        </div>

        {/* Navigation Buttons (Day view) */}
        {!showWeekView && (
          <div className="flex justify-between mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              disabled={isAnimating || (minDate && subDays(currentDate, 1) < minDate)}
              className="flex items-center space-x-1 min-w-[44px] min-h-[44px]"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              <span className="text-sm">Previous</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              disabled={isAnimating || (maxDate && addDays(currentDate, 1) > maxDate)}
              className="flex items-center space-x-1 min-w-[44px] min-h-[44px]"
            >
              <span className="text-sm">Next</span>
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Swipe Instructions (First time) */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            👈 Swipe to navigate dates 👉
          </p>
        </div>
      </div>

      {/* Loading Overlay */}
      {isAnimating && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

export default SwipeNavigation