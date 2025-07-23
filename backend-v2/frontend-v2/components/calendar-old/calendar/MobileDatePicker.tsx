'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks, isSameDay, isToday, isBefore, startOfDay } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'
import { touchTargets, mobileSpacing } from '@/hooks/useResponsiveCalendar'

interface MobileDatePickerProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  disabledDates?: Date[]
  enableHaptics?: boolean
  showWeekView?: boolean
  className?: string
}

export default function MobileDatePicker({
  selectedDate,
  onDateChange,
  minDate,
  maxDate,
  disabledDates = [],
  enableHaptics = true,
  showWeekView = true,
  className = ''
}: MobileDatePickerProps) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(selectedDate, { weekStartsOn: 0 }))
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Haptic feedback utility
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHaptics || typeof window === 'undefined') return
    
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30]
      }
      navigator.vibrate(patterns[type])
    }
  }, [enableHaptics])

  // Generate week days
  const weekDays = useMemo(() => {
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeek, i))
    }
    return days
  }, [currentWeek])

  // Check if date is disabled
  const isDateDisabled = useCallback((date: Date) => {
    if (minDate && isBefore(date, startOfDay(minDate))) return true
    if (maxDate && isBefore(startOfDay(maxDate), date)) return true
    if (disabledDates.some(disabledDate => isSameDay(date, disabledDate))) return true
    return false
  }, [minDate, maxDate, disabledDates])

  // Handle week navigation with animation
  const handleWeekChange = useCallback((direction: 'prev' | 'next') => {
    if (isAnimating) return

    setAnimationDirection(direction === 'next' ? 'left' : 'right')
    setIsAnimating(true)
    triggerHapticFeedback('light')

    setTimeout(() => {
      if (direction === 'next') {
        setCurrentWeek(prev => addWeeks(prev, 1))
      } else {
        setCurrentWeek(prev => subWeeks(prev, 1))
      }
      
      setTimeout(() => {
        setIsAnimating(false)
        setAnimationDirection(null)
      }, 200)
    }, 100)
  }, [isAnimating, triggerHapticFeedback])

  // Swipe gesture handling
  const handleSwipeLeft = useCallback(() => {
    handleWeekChange('next')
  }, [handleWeekChange])

  const handleSwipeRight = useCallback(() => {
    handleWeekChange('prev')
  }, [handleWeekChange])

  const { attachToElement } = useSwipeGesture(
    {
      onSwipeLeft: handleSwipeLeft,
      onSwipeRight: handleSwipeRight
    },
    {
      threshold: 50,
      allowMouseEvents: false,
      preventDefaultTouchMove: false
    }
  )

  // Attach swipe gestures
  useEffect(() => {
    const cleanup = attachToElement(containerRef.current)
    return cleanup
  }, [attachToElement])

  // Handle date selection
  const handleDateSelect = useCallback((date: Date) => {
    if (isDateDisabled(date)) return
    
    triggerHapticFeedback('medium')
    onDateChange(date)
    
    // Update current week if needed
    const weekStart = startOfWeek(date, { weekStartsOn: 0 })
    if (!isSameDay(weekStart, currentWeek)) {
      setCurrentWeek(weekStart)
    }
  }, [isDateDisabled, onDateChange, triggerHapticFeedback, currentWeek])

  // Toggle month picker
  const handleMonthPickerToggle = useCallback(() => {
    setShowMonthPicker(prev => !prev)
    triggerHapticFeedback('light')
  }, [triggerHapticFeedback])

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header with month/year and navigation */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => handleWeekChange('prev')}
          disabled={isAnimating}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ minHeight: touchTargets.minimum, minWidth: touchTargets.minimum }}
          aria-label="Previous week"
        >
          <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        <button
          onClick={handleMonthPickerToggle}
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          style={{ minHeight: touchTargets.minimum }}
        >
          <CalendarDaysIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {format(currentWeek, 'MMMM yyyy')}
            </h2>
          </div>
        </button>

        <button
          onClick={() => handleWeekChange('next')}
          disabled={isAnimating}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ minHeight: touchTargets.minimum, minWidth: touchTargets.minimum }}
          aria-label="Next week"
        >
          <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Week view */}
      {showWeekView && (
        <div 
          ref={containerRef}
          className="overflow-hidden"
        >
          <div 
            className={`transition-transform duration-200 ease-out ${
              animationDirection === 'left' 
                ? 'transform translate-x-full' 
                : animationDirection === 'right'
                ? 'transform -translate-x-full'
                : 'transform translate-x-0'
            }`}
          >
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1 p-2 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <div key={index} className="text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Date buttons */}
            <div className="grid grid-cols-7 gap-1 p-2">
              {weekDays.map((date, index) => {
                const isSelected = isSameDay(date, selectedDate)
                const isCurrentDay = isToday(date)
                const isDisabled = isDateDisabled(date)
                
                return (
                  <button
                    key={index}
                    onClick={() => handleDateSelect(date)}
                    disabled={isDisabled}
                    className={`relative rounded-lg transition-all duration-150 ${
                      isSelected
                        ? 'bg-primary-600 text-white shadow-lg'
                        : isCurrentDay
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                        : isDisabled
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    } ${
                      !isDisabled && !isSelected ? 'active:scale-95' : ''
                    }`}
                    style={{ 
                      minHeight: touchTargets.comfortable,
                      minWidth: touchTargets.comfortable
                    }}
                    aria-label={format(date, 'EEEE, MMMM d, yyyy')}
                    aria-pressed={isSelected}
                    aria-current={isCurrentDay ? 'date' : undefined}
                  >
                    <span className="text-lg font-medium">
                      {format(date, 'd')}
                    </span>
                    
                    {/* Current day indicator */}
                    {isCurrentDay && !isSelected && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-600 dark:bg-primary-400 rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Swipe indicator */}
      <div className="text-center text-xs text-gray-400 py-2 border-t border-gray-100 dark:border-gray-700">
        Swipe left or right to navigate weeks
      </div>

      {/* Month picker modal overlay */}
      {showMonthPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Select Month
              </h3>
            </div>
            
            <div className="p-4 space-y-2">
              {Array.from({ length: 12 }, (_, i) => {
                const monthDate = new Date(selectedDate.getFullYear(), i, 1)
                const isCurrentMonth = selectedDate.getMonth() === i
                
                return (
                  <button
                    key={i}
                    onClick={() => {
                      const newDate = new Date(selectedDate.getFullYear(), i, selectedDate.getDate())
                      setCurrentWeek(startOfWeek(newDate, { weekStartsOn: 0 }))
                      onDateChange(newDate)
                      setShowMonthPicker(false)
                      triggerHapticFeedback('medium')
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      isCurrentMonth
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                    style={{ minHeight: touchTargets.recommended }}
                  >
                    {format(monthDate, 'MMMM')}
                  </button>
                )
              })}
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowMonthPicker(false)}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                style={{ minHeight: touchTargets.minimum }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}