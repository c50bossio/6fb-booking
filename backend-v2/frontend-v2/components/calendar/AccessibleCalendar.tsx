'use client'

import { useState, useEffect, useRef } from 'react'
import { format, isToday as checkIsToday, startOfMonth, getDaysInMonth as getMonthDays, getDay, addMonths, addDays } from 'date-fns'
import { 
  CalendarA11yProvider, 
  useCalendarA11y,
  useCalendarKeyboardNavigation,
  useScreenReaderAnnouncement,
  CalendarInstructions,
  AccessibleCalendarDay,
  useHighContrastMode,
  useReducedMotion
} from './CalendarAccessibility'

interface AccessibleCalendarProps {
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  bookingDates?: Date[]
  minDate?: Date
  maxDate?: Date
  onTimeSlotClick?: (date: Date) => void
}

// Inner component that uses the accessibility context
function CalendarContent({ 
  selectedDate, 
  onDateSelect, 
  bookingDates = [],
  minDate,
  maxDate,
  onTimeSlotClick
}: AccessibleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [focusedDate, setFocusedDate] = useState<Date | null>(selectedDate)
  const calendarRef = useRef<HTMLDivElement>(null)
  const { announce, AnnouncementRegion } = useScreenReaderAnnouncement()
  const { isKeyboardNavigating, setIsKeyboardNavigating } = useCalendarA11y()
  const isHighContrast = useHighContrastMode()
  const prefersReducedMotion = useReducedMotion()

  // Create today's date at midnight in local timezone
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Set up keyboard navigation
  const { handleKeyDown } = useCalendarKeyboardNavigation({
    selectedDate: focusedDate || selectedDate,
    onDateSelect: (date) => {
      setFocusedDate(date)
      if (!isPastDate(date.getDate()) && !isTooFarInFuture(date.getDate())) {
        onDateSelect(date)
      }
    },
    onMonthChange: setCurrentMonth,
    minDate: minDate || today,
    maxDate: maxDate || addDays(today, 30),
    onTimeSlotClick
  })

  // Add keyboard event listener
  useEffect(() => {
    const container = calendarRef.current
    if (!container) return

    container.addEventListener('keydown', handleKeyDown as any)
    return () => container.removeEventListener('keydown', handleKeyDown as any)
  }, [handleKeyDown])

  // Focus management
  useEffect(() => {
    if (isKeyboardNavigating && focusedDate) {
      const dayButton = calendarRef.current?.querySelector(
        `[data-date="${format(focusedDate, 'yyyy-MM-dd')}"]`
      ) as HTMLButtonElement
      
      if (dayButton) {
        dayButton.focus()
      }
    }
  }, [focusedDate, isKeyboardNavigating])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek }
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth)

  const previousMonth = () => {
    const newMonth = addMonths(currentMonth, -1)
    setCurrentMonth(newMonth)
    announce(`Navigated to ${format(newMonth, 'MMMM yyyy')}`)
  }

  const nextMonth = () => {
    const newMonth = addMonths(currentMonth, 1)
    setCurrentMonth(newMonth)
    announce(`Navigated to ${format(newMonth, 'MMMM yyyy')}`)
  }

  const isToday = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return checkIsToday(date)
  }

  const isSelected = (day: number) => {
    if (!selectedDate) return false
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return date.toDateString() === selectedDate.toDateString()
  }

  const isFocused = (day: number) => {
    if (!focusedDate) return false
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return date.toDateString() === focusedDate.toDateString()
  }

  const isPastDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    date.setHours(0, 0, 0, 0)
    return date < today
  }

  const isTooFarInFuture = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    date.setHours(0, 0, 0, 0)
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + 30)
    maxDate.setHours(23, 59, 59, 999)
    return date > maxDate
  }

  const hasBooking = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return bookingDates.some(bookingDate => {
      return bookingDate.getFullYear() === date.getFullYear() &&
             bookingDate.getMonth() === date.getMonth() &&
             bookingDate.getDate() === date.getDate()
    })
  }

  const getAppointmentCount = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return bookingDates.filter(bookingDate => {
      return bookingDate.getFullYear() === date.getFullYear() &&
             bookingDate.getMonth() === date.getMonth() &&
             bookingDate.getDate() === date.getDate()
    }).length
  }

  const handleDateClick = (day: number) => {
    if (isPastDate(day) || isTooFarInFuture(day)) return
    
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12, 0, 0)
    onDateSelect(date)
    setFocusedDate(date)
    
    // Announce selection
    const appointmentCount = getAppointmentCount(day)
    const announcement = `Selected ${format(date, 'EEEE, MMMM d, yyyy')}`
    if (appointmentCount > 0) {
      announce(`${announcement}, ${appointmentCount} existing appointment${appointmentCount !== 1 ? 's' : ''}`)
    } else {
      announce(announcement)
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Generate calendar grid data
  const calendarDays = []
  let weekIndex = 0
  let dayIndex = 0

  // Empty cells before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push({ weekIndex, dayIndex: i, day: null })
    dayIndex++
    if (dayIndex === 7) {
      weekIndex++
      dayIndex = 0
    }
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({ weekIndex, dayIndex, day })
    dayIndex++
    if (dayIndex === 7) {
      weekIndex++
      dayIndex = 0
    }
  }

  const totalWeeks = weekIndex + (dayIndex > 0 ? 1 : 0)

  return (
    <div 
      ref={calendarRef}
      className={`w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm border ${
        isHighContrast ? 'border-black dark:border-white border-2' : 'border-gray-200 dark:border-gray-700'
      }`}
      role="application"
      aria-label="Calendar date picker"
      aria-describedby="calendar-instructions"
    >
      <CalendarInstructions />
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <button
          onClick={previousMonth}
          className={`p-2 rounded-lg transition-all ${
            isHighContrast 
              ? 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black focus:ring-4 focus:ring-black dark:focus:ring-white' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
          }`}
          aria-label={`Go to previous month, ${format(addMonths(currentMonth, -1), 'MMMM yyyy')}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h2 
          id="calendar-heading" 
          className="text-lg font-semibold"
          aria-live="polite"
          aria-atomic="true"
        >
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        
        <button
          onClick={nextMonth}
          className={`p-2 rounded-lg transition-all ${
            isHighContrast 
              ? 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black focus:ring-4 focus:ring-black dark:focus:ring-white' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
          }`}
          aria-label={`Go to next month, ${format(addMonths(currentMonth, 1), 'MMMM yyyy')}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar Grid */}
      <div 
        role="grid" 
        aria-labelledby="calendar-heading"
        aria-rowcount={totalWeeks + 1}
        aria-colcount={7}
        className="p-4"
      >
        {/* Days of week header */}
        <div role="row" className="grid grid-cols-7 gap-0 pb-2">
          {dayNames.map((day, index) => (
            <div 
              key={day} 
              role="columnheader"
              aria-label={fullDayNames[index]}
              className="text-center text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              <abbr title={fullDayNames[index]} className="no-underline">
                {day}
              </abbr>
            </div>
          ))}
        </div>

        {/* Calendar days grid */}
        <div 
          role="grid"
          className="grid grid-cols-7 gap-0"
        >
          {calendarDays.map((cell, index) => {
            if (cell.day === null) {
              return (
                <div 
                  key={`empty-${index}`} 
                  role="gridcell"
                  className="aspect-square p-1"
                  aria-label="Empty"
                />
              )
            }

            const day = cell.day
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
            const isDisabled = isPastDate(day) || isTooFarInFuture(day)
            const focused = isFocused(day)

            return (
              <div 
                key={day} 
                role="gridcell"
                className="aspect-square p-1"
              >
                <AccessibleCalendarDay
                  date={date}
                  isSelected={isSelected(day)}
                  isToday={isToday(day)}
                  isDisabled={isDisabled}
                  hasAppointments={hasBooking(day)}
                  appointmentCount={getAppointmentCount(day)}
                  onClick={() => handleDateClick(day)}
                  tabIndex={focused ? 0 : -1}
                  data-date={format(date, 'yyyy-MM-dd')}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div 
        className="px-4 pb-4 flex items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400"
        role="region"
        aria-label="Calendar legend"
      >
        <div className="flex items-center gap-1">
          <span 
            className={`w-2 h-2 rounded ${
              isHighContrast ? 'bg-black dark:bg-white' : 'bg-primary-50 dark:bg-primary-900'
            }`} 
            aria-hidden="true"
          />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1">
          <span 
            className={`w-2 h-2 rounded ${
              isHighContrast ? 'bg-black dark:bg-white' : 'bg-primary-600 dark:bg-primary-400'
            }`}
            aria-hidden="true"
          />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <span 
            className={`w-1 h-1 rounded-full ${
              isHighContrast ? 'bg-black dark:bg-white' : 'bg-primary-400'
            }`}
            aria-hidden="true"
          />
          <span>Has appointments</span>
        </div>
      </div>

      <AnnouncementRegion />
    </div>
  )
}

// Main component wrapped with accessibility provider
export default function AccessibleCalendar(props: AccessibleCalendarProps) {
  return (
    <CalendarA11yProvider>
      <CalendarContent {...props} />
    </CalendarA11yProvider>
  )
}