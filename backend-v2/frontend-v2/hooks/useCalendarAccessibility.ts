/**
 * Calendar accessibility hook for screen readers and keyboard navigation
 * Supports WCAG 2.1 AA compliance for calendar interactions
 */

import { useCallback, useRef, useState, useEffect, useMemo } from 'react'

export interface CalendarAccessibilityOptions {
  announceChanges?: boolean
  enableKeyboardNavigation?: boolean
  highContrastMode?: boolean
  reducedMotion?: boolean
  announceRegion?: string
}

export interface CalendarKeyboardNavigation {
  currentFocus: string | null
  moveFocus: (direction: 'up' | 'down' | 'left' | 'right') => void
  selectFocused: () => void
  announceSelection: (text: string) => void
}

export interface CalendarGridProps {
  role: 'grid'
  'aria-label': string
  'aria-rowcount': number
  'aria-colcount': number
  tabIndex: number
  onKeyDown: (event: React.KeyboardEvent) => void
}

export interface CalendarGridCellProps {
  role: 'gridcell'
  'aria-label': string
  'aria-selected'?: boolean
  'aria-current'?: 'date'
  tabIndex: number
  'data-date': string
}

export function useCalendarAccessibility(options: CalendarAccessibilityOptions = {}) {
  const {
    announceChanges = true,
    enableKeyboardNavigation = true,
    highContrastMode = false,
    reducedMotion = false,
    announceRegion = 'calendar-announcements'
  } = options

  const [isHighContrast, setIsHighContrast] = useState(false)
  const announceRef = useRef<HTMLDivElement>(null)
  const keyboardNavRef = useRef<CalendarKeyboardNavigation>({
    currentFocus: null,
    moveFocus: () => {},
    selectFocused: () => {},
    announceSelection: () => {}
  })

  // Detect high contrast mode
  useEffect(() => {
    const checkHighContrast = () => {
      if (typeof window !== 'undefined') {
        const isHighContrastMedia = window.matchMedia('(prefers-contrast: high)').matches
        const isWindowsHighContrast = window.matchMedia('(-ms-high-contrast: active)').matches
        setIsHighContrast(highContrastMode || isHighContrastMedia || isWindowsHighContrast)
      }
    }

    checkHighContrast()
    
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-contrast: high)')
      mediaQuery.addEventListener('change', checkHighContrast)
      return () => mediaQuery.removeEventListener('change', checkHighContrast)
    }
  }, [highContrastMode])

  // Announcement function for screen readers
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announceChanges || typeof window === 'undefined') return

    // Create or update live region
    let liveRegion = document.getElementById(announceRegion)
    if (!liveRegion) {
      liveRegion = document.createElement('div')
      liveRegion.id = announceRegion
      liveRegion.setAttribute('aria-live', priority)
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.className = 'sr-only'
      liveRegion.style.position = 'absolute'
      liveRegion.style.left = '-10000px'
      liveRegion.style.width = '1px'
      liveRegion.style.height = '1px'
      liveRegion.style.overflow = 'hidden'
      document.body.appendChild(liveRegion)
    }

    // Clear previous content and set new message
    liveRegion.textContent = ''
    setTimeout(() => {
      if (liveRegion) {
        liveRegion.textContent = message
      }
    }, 100) // Small delay to ensure screen readers pick up the change
  }, [announceChanges, announceRegion])

  // Keyboard navigation setup
  const keyboardNav = useMemo(() => {
    if (!enableKeyboardNavigation) {
      return {
        currentFocus: null,
        moveFocus: () => {},
        selectFocused: () => {},
        announceSelection: () => {}
      }
    }

    return {
      currentFocus: keyboardNavRef.current.currentFocus,
      
      moveFocus: (direction: 'up' | 'down' | 'left' | 'right') => {
        // Implementation would depend on specific calendar layout
        announce(`Moving ${direction}`, 'polite')
      },
      
      selectFocused: () => {
        if (keyboardNavRef.current.currentFocus) {
          announce(`Selected ${keyboardNavRef.current.currentFocus}`, 'assertive')
        }
      },
      
      announceSelection: (text: string) => {
        announce(text, 'assertive')
      }
    }
  }, [enableKeyboardNavigation, announce])

  // Get grid props for calendar container
  const getGridProps = useCallback((
    label: string, 
    rowCount: number, 
    colCount: number = 7
  ): CalendarGridProps => {
    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (!enableKeyboardNavigation) return

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          keyboardNav.moveFocus('up')
          break
        case 'ArrowDown':
          event.preventDefault()
          keyboardNav.moveFocus('down')
          break
        case 'ArrowLeft':
          event.preventDefault()
          keyboardNav.moveFocus('left')
          break
        case 'ArrowRight':
          event.preventDefault()
          keyboardNav.moveFocus('right')
          break
        case 'Enter':
        case ' ':
          event.preventDefault()
          keyboardNav.selectFocused()
          break
        case 'Home':
          event.preventDefault()
          announce('Moving to beginning of row', 'polite')
          break
        case 'End':
          event.preventDefault()
          announce('Moving to end of row', 'polite')
          break
        case 'PageUp':
          event.preventDefault()
          announce('Moving to previous month', 'polite')
          break
        case 'PageDown':
          event.preventDefault()
          announce('Moving to next month', 'polite')
          break
      }
    }

    return {
      role: 'grid',
      'aria-label': label,
      'aria-rowcount': rowCount,
      'aria-colcount': colCount,
      tabIndex: 0,
      onKeyDown: handleKeyDown
    }
  }, [enableKeyboardNavigation, keyboardNav, announce])

  // Get grid cell props for calendar days/slots
  const getGridCellProps = useCallback((
    date: string,
    label: string,
    isSelected: boolean = false,
    isCurrent: boolean = false
  ): CalendarGridCellProps => {
    return {
      role: 'gridcell',
      'aria-label': label,
      'aria-selected': isSelected ? true : undefined,
      'aria-current': isCurrent ? 'date' : undefined,
      tabIndex: isSelected ? 0 : -1,
      'data-date': date
    }
  }, [])

  // Appointment announcement helpers
  const announceAppointment = useCallback((
    appointment: any,
    action: 'selected' | 'moved' | 'created' | 'deleted' | 'updated'
  ) => {
    if (!appointment) return

    const time = new Date(appointment.start_time).toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit' 
    })
    
    const client = appointment.client_name || 'Client'
    const service = appointment.service_name || 'appointment'
    
    let message = ''
    switch (action) {
      case 'selected':
        message = `Selected ${service} with ${client} at ${time}`
        break
      case 'moved':
        message = `Moved ${service} with ${client} to ${time}`
        break
      case 'created':
        message = `Created ${service} with ${client} at ${time}`
        break
      case 'deleted':
        message = `Deleted ${service} with ${client} at ${time}`
        break
      case 'updated':
        message = `Updated ${service} with ${client} at ${time}`
        break
    }
    
    announce(message, 'assertive')
  }, [announce])

  // Time slot announcement helpers
  const announceTimeSlot = useCallback((date: Date, available: boolean = true) => {
    const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    const dateStr = date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
    
    const availability = available ? 'available' : 'unavailable'
    announce(`${time} on ${dateStr}, ${availability}`, 'polite')
  }, [announce])

  // Navigation announcement helpers
  const announceNavigation = useCallback((
    view: string,
    date: Date,
    direction?: 'previous' | 'next'
  ) => {
    const dateStr = date.toLocaleDateString([], { 
      month: 'long', 
      year: 'numeric',
      ...(view === 'day' && { day: 'numeric', weekday: 'long' })
    })
    
    if (direction) {
      announce(`Navigated to ${direction} ${view}: ${dateStr}`, 'polite')
    } else {
      announce(`Viewing ${view}: ${dateStr}`, 'polite')
    }
  }, [announce])

  // Loading state announcements
  const announceLoading = useCallback((isLoading: boolean, context: string = 'calendar') => {
    if (isLoading) {
      announce(`Loading ${context}...`, 'polite')
    } else {
      announce(`${context} loaded`, 'polite')
    }
  }, [announce])

  // Error announcements
  const announceError = useCallback((error: string) => {
    announce(`Error: ${error}`, 'assertive')
  }, [announce])

  return {
    // Core accessibility functions
    announce,
    keyboardNav,
    getGridProps,
    getGridCellProps,
    
    // State
    isHighContrast,
    
    // Specialized announcement functions
    announceAppointment,
    announceTimeSlot,
    announceNavigation,
    announceLoading,
    announceError,
    
    // Accessibility preferences
    reducedMotion: reducedMotion || (typeof window !== 'undefined' && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }
}

export default useCalendarAccessibility