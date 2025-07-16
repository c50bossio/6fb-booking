'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ViewColumnsIcon, Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { formatDate, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth } from 'date-fns'
import { TouchDragManager, TouchPoint } from './TouchDragManager'

export type CalendarView = 'month' | 'week' | 'day' | 'list'

export interface MobileCalendarControlsProps {
  currentDate: Date
  view: CalendarView
  onDateChange: (date: Date) => void
  onViewChange: (view: CalendarView) => void
  onTodayClick: () => void
  className?: string
  showViewSelector?: boolean
  showDatePicker?: boolean
  enableSwipeNavigation?: boolean
  compactMode?: boolean
}

export function MobileCalendarControls({
  currentDate,
  view,
  onDateChange,
  onViewChange,
  onTodayClick,
  className = '',
  showViewSelector = true,
  showDatePicker = true,
  enableSwipeNavigation = true,
  compactMode = false
}: MobileCalendarControlsProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null)
  const datePickerRef = useRef<HTMLDivElement>(null)

  // View configuration
  const viewConfig = {
    month: { icon: ViewColumnsIcon, label: 'Month', shortLabel: 'M' },
    week: { icon: Squares2X2Icon, label: 'Week', shortLabel: 'W' },
    day: { icon: CalendarIcon, label: 'Day', shortLabel: 'D' },
    list: { icon: ListBulletIcon, label: 'List', shortLabel: 'L' }
  }

  // Navigation functions
  const navigatePrevious = useCallback(() => {
    const newDate = view === 'month' 
      ? subMonths(currentDate, 1)
      : view === 'week'
      ? new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(currentDate.getTime() - 24 * 60 * 60 * 1000)
    
    onDateChange(newDate)
  }, [currentDate, view, onDateChange])

  const navigateNext = useCallback(() => {
    const newDate = view === 'month'
      ? addMonths(currentDate, 1)
      : view === 'week'
      ? new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      : new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
    
    onDateChange(newDate)
  }, [currentDate, view, onDateChange])

  // Touch gesture handlers
  const handleSwipe = useCallback((direction: 'left' | 'right' | 'up' | 'down', velocity: number) => {
    if (!enableSwipeNavigation) return

    // Require minimum velocity for navigation
    if (velocity < 0.5) return

    if (direction === 'left') {
      navigateNext()
    } else if (direction === 'right') {
      navigatePrevious()
    }
  }, [enableSwipeNavigation, navigateNext, navigatePrevious])

  const handleTap = useCallback((point: TouchPoint) => {
    // Close date picker if tapping outside
    if (isDatePickerOpen && datePickerRef.current) {
      const rect = datePickerRef.current.getBoundingClientRect()
      if (
        point.x < rect.left ||
        point.x > rect.right ||
        point.y < rect.top ||
        point.y > rect.bottom
      ) {
        setIsDatePickerOpen(false)
      }
    }
  }, [isDatePickerOpen])

  // Format display text based on view
  const getDisplayText = useCallback(() => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      year: 'numeric'
    }

    if (view === 'day') {
      options.day = 'numeric'
      options.weekday = 'short'
    } else if (view === 'week') {
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      
      if (isSameMonth(startOfWeek, endOfWeek)) {
        return `${formatDate(startOfWeek, 'MMM d')} - ${formatDate(endOfWeek, 'd, yyyy')}`
      } else {
        return `${formatDate(startOfWeek, 'MMM d')} - ${formatDate(endOfWeek, 'MMM d, yyyy')}`
      }
    }

    return currentDate.toLocaleDateString('en-US', options)
  }, [currentDate, view])

  // Quick date picker component
  const QuickDatePicker = () => {
    const today = new Date()
    const currentMonth = startOfMonth(currentDate)
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(today.getFullYear(), i, 1)
      return {
        date: month,
        label: formatDate(month, 'MMM'),
        isCurrent: isSameMonth(month, currentDate)
      }
    })

    return (
      <div 
        ref={datePickerRef}
        className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-4"
      >
        <div className="grid grid-cols-4 gap-2 mb-4">
          {months.map((month) => (
            <Button
              key={month.label}
              size="sm"
              variant={month.isCurrent ? "default" : "ghost"}
              onClick={() => {
                onDateChange(month.date)
                setIsDatePickerOpen(false)
              }}
              className="h-10 text-xs"
            >
              {month.label}
            </Button>
          ))}
        </div>
        
        {/* Year navigation */}
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDateChange(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1))}
          >
            {currentDate.getFullYear() - 1}
          </Button>
          <span className="font-semibold text-sm">
            {currentDate.getFullYear()}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDateChange(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1))}
          >
            {currentDate.getFullYear() + 1}
          </Button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onTodayClick()
              setIsDatePickerOpen(false)
            }}
            className="flex-1 text-xs"
          >
            Today
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsDatePickerOpen(false)}
            className="flex-1 text-xs"
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  // View selector component
  const ViewSelector = () => {
    if (compactMode) {
      return (
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {Object.entries(viewConfig).map(([viewKey, config]) => {
            const Icon = config.icon
            return (
              <Button
                key={viewKey}
                size="sm"
                variant={view === viewKey ? "default" : "ghost"}
                onClick={() => onViewChange(viewKey as CalendarView)}
                className="h-8 w-8 p-0"
              >
                <Icon className="w-4 h-4" />
              </Button>
            )
          })}
        </div>
      )
    }

    return (
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
        {Object.entries(viewConfig).map(([viewKey, config]) => {
          const Icon = config.icon
          return (
            <Button
              key={viewKey}
              size="sm"
              variant={view === viewKey ? "default" : "ghost"}
              onClick={() => onViewChange(viewKey as CalendarView)}
              className="h-8 px-3 flex items-center gap-1"
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs hidden sm:inline">{config.label}</span>
            </Button>
          )
        })}
      </div>
    )
  }

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false)
      }
    }

    if (isDatePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDatePickerOpen])

  const controlsContent = (
    <div className={`flex items-center justify-between gap-3 p-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Navigation and date display */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Button
          size="sm"
          variant="ghost"
          onClick={navigatePrevious}
          className="h-8 w-8 p-0 shrink-0"
          aria-label="Previous period"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </Button>

        {showDatePicker ? (
          <div className="relative">
            <Button
              variant="ghost"
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              className="h-8 px-3 font-medium text-left truncate min-w-0 max-w-40"
            >
              {compactMode ? formatDate(currentDate, 'MMM yyyy') : getDisplayText()}
            </Button>
            {isDatePickerOpen && <QuickDatePicker />}
          </div>
        ) : (
          <span className="font-medium text-sm truncate min-w-0">
            {compactMode ? formatDate(currentDate, 'MMM yyyy') : getDisplayText()}
          </span>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={navigateNext}
          className="h-8 w-8 p-0 shrink-0"
          aria-label="Next period"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </Button>
      </div>

      {/* View selector */}
      {showViewSelector && <ViewSelector />}
    </div>
  )

  if (enableSwipeNavigation) {
    return (
      <TouchDragManager
        onSwipe={handleSwipe}
        onTap={handleTap}
        swipeThreshold={30}
        enableHapticFeedback={true}
        className="relative"
      >
        {controlsContent}
      </TouchDragManager>
    )
  }

  return <div className="relative">{controlsContent}</div>
}

// Hook for mobile calendar navigation
export function useMobileCalendarNavigation({
  initialDate = new Date(),
  initialView = 'month' as CalendarView,
  enableSwipeNavigation = true
}: {
  initialDate?: Date
  initialView?: CalendarView
  enableSwipeNavigation?: boolean
} = {}) {
  const [currentDate, setCurrentDate] = useState(initialDate)
  const [view, setView] = useState<CalendarView>(initialView)

  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const navigateToDate = useCallback((date: Date) => {
    setCurrentDate(date)
  }, [])

  const changeView = useCallback((newView: CalendarView) => {
    setView(newView)
  }, [])

  // Touch gesture navigation
  const navigateWithGesture = useCallback((direction: 'previous' | 'next') => {
    const multiplier = direction === 'next' ? 1 : -1
    
    let newDate: Date
    switch (view) {
      case 'month':
        newDate = addMonths(currentDate, multiplier)
        break
      case 'week':
        newDate = new Date(currentDate.getTime() + (7 * 24 * 60 * 60 * 1000 * multiplier))
        break
      case 'day':
        newDate = new Date(currentDate.getTime() + (24 * 60 * 60 * 1000 * multiplier))
        break
      default:
        newDate = currentDate
    }
    
    setCurrentDate(newDate)
  }, [currentDate, view])

  return {
    currentDate,
    view,
    setCurrentDate: navigateToDate,
    setView: changeView,
    goToToday,
    navigateWithGesture,
    navigationHandlers: {
      onDateChange: navigateToDate,
      onViewChange: changeView,
      onTodayClick: goToToday
    }
  }
}

export default MobileCalendarControls