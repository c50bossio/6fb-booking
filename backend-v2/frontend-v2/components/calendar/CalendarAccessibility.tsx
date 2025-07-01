'use client'

import React, { createContext, useContext, useEffect, useRef } from 'react'
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'

// Accessibility context for calendar components
interface CalendarA11yContextType {
  announceToScreenReader: (message: string) => void
  currentFocusDate: Date | null
  setCurrentFocusDate: (date: Date | null) => void
  isKeyboardNavigating: boolean
  setIsKeyboardNavigating: (value: boolean) => void
}

const CalendarA11yContext = createContext<CalendarA11yContextType | null>(null)

export const useCalendarA11y = () => {
  const context = useContext(CalendarA11yContext)
  if (!context) {
    throw new Error('useCalendarA11y must be used within CalendarA11yProvider')
  }
  return context
}

// Screen reader announcement hook
export const useScreenReaderAnnouncement = () => {
  const announcementRef = useRef<HTMLDivElement>(null)

  const announce = (message: string) => {
    if (announcementRef.current) {
      // Clear previous announcement
      announcementRef.current.textContent = ''
      
      // Use setTimeout to ensure screen readers pick up the change
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = message
        }
      }, 100)
    }
  }

  const AnnouncementRegion = () => (
    <div
      ref={announcementRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  )

  return { announce, AnnouncementRegion }
}

// Keyboard navigation hook
export const useCalendarKeyboardNavigation = ({
  selectedDate,
  onDateSelect,
  onMonthChange,
  minDate,
  maxDate,
  onTimeSlotClick,
}: {
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  onMonthChange?: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  onTimeSlotClick?: (date: Date) => void
}) => {
  const { announce } = useScreenReaderAnnouncement()
  const { setIsKeyboardNavigating } = useCalendarA11y()

  const handleKeyDown = (e: KeyboardEvent) => {
    const currentDate = selectedDate || new Date()
    let newDate: Date | null = null
    let shouldPreventDefault = true

    switch (e.key) {
      case 'ArrowLeft':
        newDate = addDays(currentDate, -1)
        break
      case 'ArrowRight':
        newDate = addDays(currentDate, 1)
        break
      case 'ArrowUp':
        newDate = addDays(currentDate, -7)
        break
      case 'ArrowDown':
        newDate = addDays(currentDate, 7)
        break
      case 'Home':
        if (e.ctrlKey) {
          newDate = minDate || startOfMonth(currentDate)
        } else {
          newDate = startOfWeek(currentDate, { weekStartsOn: 1 })
        }
        break
      case 'End':
        if (e.ctrlKey) {
          newDate = maxDate || endOfMonth(currentDate)
        } else {
          newDate = endOfWeek(currentDate, { weekStartsOn: 1 })
        }
        break
      case 'PageUp':
        newDate = addDays(currentDate, e.shiftKey ? -365 : -30)
        if (onMonthChange) {
          onMonthChange(newDate)
        }
        break
      case 'PageDown':
        newDate = addDays(currentDate, e.shiftKey ? 365 : 30)
        if (onMonthChange) {
          onMonthChange(newDate)
        }
        break
      case 'Enter':
      case ' ':
        if (onTimeSlotClick) {
          e.preventDefault()
          onTimeSlotClick(currentDate)
          announce(`Opening time selection for ${format(currentDate, 'MMMM d, yyyy')}`)
        }
        return
      case 'Escape':
        // Handle escape to close modals or cancel operations
        shouldPreventDefault = false
        break
      default:
        shouldPreventDefault = false
    }

    if (newDate && shouldPreventDefault) {
      e.preventDefault()
      setIsKeyboardNavigating(true)

      // Check date boundaries
      if (minDate && newDate < minDate) {
        announce('Cannot navigate to dates in the past')
        return
      }
      if (maxDate && newDate > maxDate) {
        announce('Cannot navigate beyond 30 days from today')
        return
      }

      onDateSelect(newDate)
      
      // Announce the new date with context
      const dateAnnouncement = format(newDate, 'EEEE, MMMM d, yyyy')
      const context = []
      
      if (format(newDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {
        context.push('Today')
      }
      
      announce(`${dateAnnouncement}${context.length ? `, ${context.join(', ')}` : ''}`)
    }
  }

  return { handleKeyDown }
}

// Focus management hook
export const useFocusManagement = (containerRef: React.RefObject<HTMLElement>) => {
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const trapFocus = () => {
    if (!containerRef.current) return

    const focusableElements = containerRef.current.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )

    const firstFocusable = focusableElements[0] as HTMLElement
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable?.focus()
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault()
          firstFocusable?.focus()
        }
      }
    }

    containerRef.current.addEventListener('keydown', handleTabKey)

    return () => {
      containerRef.current?.removeEventListener('keydown', handleTabKey)
    }
  }

  const saveFocus = () => {
    previousFocusRef.current = document.activeElement as HTMLElement
  }

  const restoreFocus = () => {
    previousFocusRef.current?.focus()
  }

  return { trapFocus, saveFocus, restoreFocus }
}

// Calendar accessibility provider component
export const CalendarA11yProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentFocusDate, setCurrentFocusDate] = React.useState<Date | null>(null)
  const [isKeyboardNavigating, setIsKeyboardNavigating] = React.useState(false)
  const { announce, AnnouncementRegion } = useScreenReaderAnnouncement()

  // Reset keyboard navigation flag on mouse movement
  useEffect(() => {
    const handleMouseMove = () => {
      if (isKeyboardNavigating) {
        setIsKeyboardNavigating(false)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [isKeyboardNavigating])

  return (
    <CalendarA11yContext.Provider
      value={{
        announceToScreenReader: announce,
        currentFocusDate,
        setCurrentFocusDate,
        isKeyboardNavigating,
        setIsKeyboardNavigating,
      }}
    >
      {children}
      <AnnouncementRegion />
    </CalendarA11yContext.Provider>
  )
}

// Skip navigation component
export const SkipToCalendar: React.FC<{ targetId: string }> = ({ targetId }) => {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
    >
      Skip to calendar
    </a>
  )
}

// Calendar instructions component
export const CalendarInstructions: React.FC<{ id?: string }> = ({ id = 'calendar-instructions' }) => {
  return (
    <div id={id} className="sr-only">
      <h3>Calendar Keyboard Navigation</h3>
      <ul>
        <li>Use arrow keys to navigate between dates</li>
        <li>Press Home to go to the first day of the week</li>
        <li>Press End to go to the last day of the week</li>
        <li>Press Control+Home to go to the first day of the month</li>
        <li>Press Control+End to go to the last day of the month</li>
        <li>Press Page Up to go to the previous month</li>
        <li>Press Page Down to go to the next month</li>
        <li>Press Enter or Space to select a date</li>
        <li>Press Escape to close any open dialogs</li>
      </ul>
    </div>
  )
}

// Accessible calendar day button
interface AccessibleCalendarDayProps {
  date: Date
  isSelected: boolean
  isToday: boolean
  isDisabled: boolean
  hasAppointments: boolean
  appointmentCount?: number
  onClick: () => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  tabIndex?: number
}

export const AccessibleCalendarDay: React.FC<AccessibleCalendarDayProps> = ({
  date,
  isSelected,
  isToday,
  isDisabled,
  hasAppointments,
  appointmentCount = 0,
  onClick,
  onKeyDown,
  tabIndex = -1,
}) => {
  const { isKeyboardNavigating } = useCalendarA11y()
  const dayLabel = format(date, 'd')
  
  // Build comprehensive ARIA label
  const ariaLabelParts = [format(date, 'EEEE, MMMM d, yyyy')]
  
  if (isToday) ariaLabelParts.push('Today')
  if (isSelected) ariaLabelParts.push('Selected')
  if (hasAppointments) {
    ariaLabelParts.push(`${appointmentCount} appointment${appointmentCount !== 1 ? 's' : ''}`)
  }
  if (isDisabled) ariaLabelParts.push('Unavailable')

  return (
    <button
      onClick={onClick}
      onKeyDown={onKeyDown}
      disabled={isDisabled}
      aria-label={ariaLabelParts.join(', ')}
      aria-pressed={isSelected}
      aria-disabled={isDisabled}
      aria-current={isToday ? 'date' : undefined}
      tabIndex={tabIndex}
      className={`
        relative w-full h-full rounded-lg font-medium text-sm
        transition-all duration-200 
        ${isDisabled 
          ? 'text-gray-300 cursor-not-allowed' 
          : 'hover:bg-gray-100 cursor-pointer'
        }
        ${isToday 
          ? 'bg-primary-50 text-primary-600 font-semibold ring-2 ring-primary-200' 
          : ''
        }
        ${isSelected 
          ? 'bg-primary-600 text-white hover:bg-primary-700' 
          : ''
        }
        ${isKeyboardNavigating ? 'focus:ring-2 focus:ring-offset-2 focus:ring-primary-500' : ''}
      `}
    >
      <span aria-hidden="true">{dayLabel}</span>
      {hasAppointments && !isSelected && (
        <span 
          className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-400 rounded-full"
          aria-label={`${appointmentCount} appointment${appointmentCount !== 1 ? 's' : ''}`}
        />
      )}
    </button>
  )
}

// Utility functions for accessibility
export const getAccessibilityProps = (role: string, label?: string, description?: string) => ({
  role,
  'aria-label': label,
  'aria-describedby': description,
})

export const announceCalendarChange = (announce: (msg: string) => void, change: string) => {
  // Debounce announcements to avoid overwhelming screen readers
  const timeoutId = setTimeout(() => {
    announce(change)
  }, 300)

  return () => clearTimeout(timeoutId)
}

// High contrast mode detection
export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    setIsHighContrast(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setIsHighContrast(e.matches)
    mediaQuery.addEventListener('change', handler)

    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return isHighContrast
}

// Reduced motion detection
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)

    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}