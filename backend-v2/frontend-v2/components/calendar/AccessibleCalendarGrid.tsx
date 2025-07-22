'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isToday, getDay } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { Button } from '../ui/button'
import { 
  useAccessibilityAnnouncer, 
  useFocusManagement, 
  useKeyboardShortcuts, 
  AccessibilityManager 
} from '@/lib/accessibility'
import type { BookingResponse } from '@/lib/api'

interface AccessibleCalendarGridProps {
  currentDate: Date
  appointments: BookingResponse[]
  onDateSelect: (date: Date) => void
  onAppointmentSelect?: (appointment: BookingResponse) => void
  view: 'month' | 'week' | 'day'
  className?: string
  highContrastMode?: boolean
  verboseMode?: boolean
}

interface CalendarCell {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  appointments: BookingResponse[]
  isEmpty: boolean
}

/**
 * WCAG 2.1 AA compliant calendar grid with full keyboard navigation
 * and screen reader support
 */
export function AccessibleCalendarGrid({
  currentDate,
  appointments,
  onDateSelect,
  onAppointmentSelect,
  view = 'month',
  className = '',
  highContrastMode = false,
  verboseMode = false
}: AccessibleCalendarGridProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate)
  const [focusedDate, setFocusedDate] = useState<Date>(currentDate)
  const [focusedAppointment, setFocusedAppointment] = useState<number>(-1)
  const [navigationLevel, setNavigationLevel] = useState<'grid' | 'appointments'>('grid')
  
  const gridRef = useRef<HTMLDivElement>(null)
  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const { announce } = useAccessibilityAnnouncer()
  const { trapFocus, saveFocus, restoreFocus } = useFocusManagement()
  
  const manager = AccessibilityManager.getInstance()

  // Generate calendar grid data
  const calendarData = useMemo(() => {
    const startDate = view === 'month' 
      ? startOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))
      : startOfWeek(currentDate)
    
    const endDate = view === 'month'
      ? endOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0))
      : endOfWeek(currentDate)

    const days: CalendarCell[] = []
    let date = new Date(startDate)

    while (date <= endDate) {
      const dayAppointments = appointments.filter(apt => 
        isSameDay(new Date(apt.start_time), date)
      )

      days.push({
        date: new Date(date),
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        isToday: isToday(date),
        isSelected: isSameDay(date, selectedDate),
        appointments: dayAppointments,
        isEmpty: dayAppointments.length === 0
      })

      date = addDays(date, 1)
    }

    return days
  }, [currentDate, appointments, selectedDate, view])

  // Keyboard shortcuts
  const shortcuts = useMemo(() => ({
    'arrowup': () => handleArrowKey('up'),
    'arrowdown': () => handleArrowKey('down'),
    'arrowleft': () => handleArrowKey('left'),
    'arrowright': () => handleArrowKey('right'),
    'home': () => handleHomeEnd('home'),
    'end': () => handleHomeEnd('end'),
    'pageup': () => handlePageNavigation('previous'),
    'pagedown': () => handlePageNavigation('next'),
    'enter': () => handleEnter(),
    'space': () => handleSpace(),
    'escape': () => handleEscape(),
    'tab': () => handleTab(),
    'shift+tab': () => handleShiftTab()
  }), [navigationLevel, focusedDate, focusedAppointment])

  useKeyboardShortcuts(shortcuts)

  // Arrow key navigation
  const handleArrowKey = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (navigationLevel === 'grid') {
      let newDate = new Date(focusedDate)
      
      switch (direction) {
        case 'left':
          newDate = addDays(newDate, -1)
          break
        case 'right':
          newDate = addDays(newDate, 1)
          break
        case 'up':
          newDate = addDays(newDate, -7)
          break
        case 'down':
          newDate = addDays(newDate, 7)
          break
      }
      
      setFocusedDate(newDate)
      
      // Focus the cell
      const cellKey = format(newDate, 'yyyy-MM-dd')
      const cellElement = cellRefs.current.get(cellKey)
      if (cellElement) {
        cellElement.focus()
      }
      
      // Announce the date
      const cell = calendarData.find(c => isSameDay(c.date, newDate))
      if (cell) {
        const description = manager.generateDateDescription(
          cell.date, 
          !cell.isEmpty, 
          cell.appointments.length
        )
        announce(description)
      }
    } else if (navigationLevel === 'appointments') {
      const dayAppointments = calendarData.find(c => isSameDay(c.date, focusedDate))?.appointments || []
      
      if (direction === 'up' && focusedAppointment > 0) {
        setFocusedAppointment(focusedAppointment - 1)
      } else if (direction === 'down' && focusedAppointment < dayAppointments.length - 1) {
        setFocusedAppointment(focusedAppointment + 1)
      }
      
      // Announce focused appointment
      const appointment = dayAppointments[focusedAppointment]
      if (appointment) {
        const description = manager.generateAppointmentDescription({
          time: format(new Date(appointment.start_time), 'h:mm a'),
          duration: appointment.duration || 60,
          service: appointment.service_name || 'Service',
          client: appointment.client_name || 'Client',
          status: appointment.status || 'scheduled'
        })
        announce(description)
      }
    }
  }, [navigationLevel, focusedDate, focusedAppointment, calendarData, manager, announce])

  // Home/End navigation
  const handleHomeEnd = useCallback((key: 'home' | 'end') => {
    if (navigationLevel === 'grid') {
      const weekStart = startOfWeek(focusedDate)
      const newDate = key === 'home' ? weekStart : addDays(weekStart, 6)
      
      setFocusedDate(newDate)
      
      const cellKey = format(newDate, 'yyyy-MM-dd')
      const cellElement = cellRefs.current.get(cellKey)
      if (cellElement) {
        cellElement.focus()
      }
      
      announce(key === 'home' ? 'First day of week' : 'Last day of week')
    }
  }, [navigationLevel, focusedDate, announce])

  // Page navigation (month/week changes)
  const handlePageNavigation = useCallback((direction: 'previous' | 'next') => {
    if (navigationLevel === 'grid') {
      const daysToAdd = view === 'month' ? (direction === 'next' ? 30 : -30) : (direction === 'next' ? 7 : -7)
      const newDate = addDays(focusedDate, daysToAdd)
      
      setFocusedDate(newDate)
      announce(`Navigated to ${direction} ${view}`)
    }
  }, [navigationLevel, focusedDate, view, announce])

  // Enter key handling
  const handleEnter = useCallback(() => {
    if (navigationLevel === 'grid') {
      setSelectedDate(focusedDate)
      onDateSelect(focusedDate)
      
      const cell = calendarData.find(c => isSameDay(c.date, focusedDate))
      if (cell && !cell.isEmpty) {
        setNavigationLevel('appointments')
        setFocusedAppointment(0)
        announce('Entering appointments for selected date. Use arrow keys to navigate appointments.')
      } else {
        announce('Date selected')
      }
    } else if (navigationLevel === 'appointments') {
      const dayAppointments = calendarData.find(c => isSameDay(c.date, focusedDate))?.appointments || []
      const appointment = dayAppointments[focusedAppointment]
      
      if (appointment && onAppointmentSelect) {
        onAppointmentSelect(appointment)
        announce('Appointment selected')
      }
    }
  }, [navigationLevel, focusedDate, focusedAppointment, calendarData, onDateSelect, onAppointmentSelect, announce])

  // Space key handling
  const handleSpace = useCallback(() => {
    handleEnter() // Space and Enter have same behavior
  }, [handleEnter])

  // Escape key handling
  const handleEscape = useCallback(() => {
    if (navigationLevel === 'appointments') {
      setNavigationLevel('grid')
      setFocusedAppointment(-1)
      announce('Returned to calendar grid')
      
      // Focus the date cell
      const cellKey = format(focusedDate, 'yyyy-MM-dd')
      const cellElement = cellRefs.current.get(cellKey)
      if (cellElement) {
        cellElement.focus()
      }
    }
  }, [navigationLevel, focusedDate, announce])

  // Tab handling
  const handleTab = useCallback(() => {
    // Allow tab to move focus outside the grid
    if (navigationLevel === 'appointments') {
      setNavigationLevel('grid')
      setFocusedAppointment(-1)
    }
  }, [navigationLevel])

  // Shift+Tab handling  
  const handleShiftTab = useCallback(() => {
    // Allow shift+tab to move focus outside the grid
    if (navigationLevel === 'appointments') {
      setNavigationLevel('grid')
      setFocusedAppointment(-1)
    }
  }, [navigationLevel])

  // Cell click handler
  const handleCellClick = useCallback((cell: CalendarCell) => {
    setSelectedDate(cell.date)
    setFocusedDate(cell.date)
    onDateSelect(cell.date)
    
    if (!cell.isEmpty) {
      setNavigationLevel('appointments')
      setFocusedAppointment(0)
      announce('Date selected. Press Enter to navigate appointments.')
    } else {
      announce('Date selected. No appointments.')
    }
  }, [onDateSelect, announce])

  // Generate cell description
  const getCellDescription = useCallback((cell: CalendarCell) => {
    return manager.generateDateDescription(
      cell.date,
      !cell.isEmpty,
      cell.appointments.length
    )
  }, [manager])

  // Render day names header
  const renderDayHeaders = () => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    return (
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {dayNames.map((dayName, index) => (
          <div
            key={dayName}
            className={`
              py-3 px-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400
              ${highContrastMode ? 'border-2 border-gray-800 dark:border-white' : ''}
            `}
            role="columnheader"
            aria-label={dayName}
          >
            <span aria-hidden="true">{shortDayNames[index]}</span>
            <span className="sr-only">{dayName}</span>
          </div>
        ))}
      </div>
    )
  }

  // Render calendar cell
  const renderCell = useCallback((cell: CalendarCell) => {
    const cellKey = format(cell.date, 'yyyy-MM-dd')
    const isFocused = isSameDay(cell.date, focusedDate)
    const showAppointments = navigationLevel === 'appointments' && isFocused

    return (
      <button
        key={cellKey}
        ref={(el) => {
          if (el) cellRefs.current.set(cellKey, el)
        }}
        className={`
          relative h-24 p-1 text-left border-b border-r border-gray-200 dark:border-gray-700 
          transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500
          ${cell.isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'}
          ${cell.isToday ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
          ${cell.isSelected ? 'bg-blue-100 dark:bg-blue-800/30' : ''}
          ${isFocused ? 'ring-2 ring-blue-500 ring-inset' : ''}
          ${highContrastMode ? 'border-2 border-gray-800 dark:border-white' : ''}
          hover:bg-gray-50 dark:hover:bg-gray-700
        `}
        onClick={() => handleCellClick(cell)}
        aria-label={getCellDescription(cell)}
        aria-selected={cell.isSelected}
        aria-current={cell.isToday ? 'date' : undefined}
        tabIndex={isFocused ? 0 : -1}
        role="gridcell"
      >
        {/* Date number */}
        <div className={`
          text-sm font-medium
          ${cell.isCurrentMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}
          ${cell.isToday ? 'text-blue-600 dark:text-blue-400' : ''}
          ${highContrastMode ? 'font-bold' : ''}
        `}>
          {cell.date.getDate()}
        </div>

        {/* Today indicator */}
        {cell.isToday && (
          <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" aria-hidden="true" />
        )}

        {/* Appointment indicators */}
        {!cell.isEmpty && (
          <div className="mt-1 space-y-1">
            {cell.appointments.slice(0, 3).map((appointment, index) => (
              <div
                key={appointment.id}
                className={`
                  text-xs p-1 rounded truncate
                  ${appointment.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-200' : ''}
                  ${appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-200' : ''}
                  ${appointment.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-200' : ''}
                  ${showAppointments && index === focusedAppointment ? 'ring-2 ring-blue-500' : ''}
                  ${highContrastMode ? 'border border-gray-800 dark:border-white' : ''}
                `}
                aria-label={manager.generateAppointmentDescription({
                  time: format(new Date(appointment.start_time), 'h:mm a'),
                  duration: appointment.duration || 60,
                  service: appointment.service_name || 'Service',
                  client: appointment.client_name || 'Client',
                  status: appointment.status || 'scheduled'
                })}
              >
                {format(new Date(appointment.start_time), 'h:mm a')} {appointment.service_name}
              </div>
            ))}
            
            {cell.appointments.length > 3 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                +{cell.appointments.length - 3} more
              </div>
            )}
          </div>
        )}

        {/* Screen reader only appointment count */}
        {!cell.isEmpty && (
          <span className="sr-only">
            {cell.appointments.length} appointment{cell.appointments.length !== 1 ? 's' : ''}
          </span>
        )}
      </button>
    )
  }, [
    focusedDate, 
    navigationLevel, 
    focusedAppointment, 
    handleCellClick, 
    getCellDescription, 
    manager, 
    highContrastMode
  ])

  // Initialize focus on mount
  useEffect(() => {
    const cellKey = format(focusedDate, 'yyyy-MM-dd')
    const cellElement = cellRefs.current.get(cellKey)
    if (cellElement && gridRef.current?.contains(document.activeElement)) {
      cellElement.focus()
    }
  }, [focusedDate])

  return (
    <div className={`accessible-calendar-grid ${className}`}>
      {/* Screen reader instructions */}
      <div className="sr-only" aria-live="polite">
        Use arrow keys to navigate calendar. Press Enter or Space to select a date. 
        Press Escape to return to date grid from appointments. 
        Use Page Up and Page Down to navigate between months or weeks.
      </div>

      {/* Calendar grid */}
      <div
        ref={gridRef}
        role="grid"
        aria-label={`Calendar ${view} view for ${format(currentDate, 'MMMM yyyy')}`}
        aria-multiselectable="false"
        className={`
          border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden
          ${highContrastMode ? 'border-4 border-gray-800 dark:border-white' : ''}
        `}
      >
        {/* Day headers */}
        <div role="row" className="contents">
          {renderDayHeaders()}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {calendarData.map((cell) => (
            <div key={format(cell.date, 'yyyy-MM-dd')} role="gridcell" className="contents">
              {renderCell(cell)}
            </div>
          ))}
        </div>
      </div>

      {/* Current navigation context announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {navigationLevel === 'appointments' 
          ? `Navigating appointments for ${format(focusedDate, 'EEEE, MMMM d, yyyy')}. ${focusedAppointment + 1} of ${calendarData.find(c => isSameDay(c.date, focusedDate))?.appointments.length || 0}.`
          : ''
        }
      </div>

      {/* Keyboard shortcuts help */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <details>
          <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
            Keyboard shortcuts
          </summary>
          <div className="mt-2 space-y-1">
            <div>Arrow keys: Navigate dates</div>
            <div>Enter/Space: Select date or appointment</div>
            <div>Home/End: First/last day of week</div>
            <div>Page Up/Down: Previous/next {view}</div>
            <div>Escape: Return to calendar grid</div>
          </div>
        </details>
      </div>
    </div>
  )
}

export default AccessibleCalendarGrid