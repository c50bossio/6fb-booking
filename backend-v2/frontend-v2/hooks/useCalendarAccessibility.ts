import { useCallback, useEffect, useState, useRef } from 'react'

interface AccessibilityAnnouncement {
  message: string
  priority: 'polite' | 'assertive'
}

interface KeyboardNavigation {
  handleKeyDown: (event: React.KeyboardEvent, context: 'month' | 'week' | 'day') => void
  focusedDate: Date | null
  setFocusedDate: (date: Date | null) => void
}

interface CalendarAccessibilityHook {
  // Screen reader announcements
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  announcement: AccessibilityAnnouncement | null
  
  // Keyboard navigation
  keyboardNav: KeyboardNavigation
  
  // Focus management
  trapFocus: (containerRef: React.RefObject<HTMLElement>) => void
  restoreFocus: () => void
  
  // ARIA attributes
  getGridCellProps: (date: Date, hasAppointments?: boolean, isSelected?: boolean) => object
  getGridProps: () => object
  
  // High contrast detection
  isHighContrast: boolean
}

export function useCalendarAccessibility(): CalendarAccessibilityHook {
  const [announcement, setAnnouncement] = useState<AccessibilityAnnouncement | null>(null)
  const [focusedDate, setFocusedDate] = useState<Date | null>(null)
  const [isHighContrast, setIsHighContrast] = useState(false)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const announcementTimeoutRef = useRef<NodeJS.Timeout>()

  // Detect high contrast mode
  useEffect(() => {
    const checkHighContrast = () => {
      if (window.matchMedia) {
        const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
        setIsHighContrast(highContrastQuery.matches)
        
        const handleChange = (e: MediaQueryListEvent) => {
          setIsHighContrast(e.matches)
        }
        
        highContrastQuery.addEventListener('change', handleChange)
        return () => highContrastQuery.removeEventListener('change', handleChange)
      }
    }
    
    checkHighContrast()
  }, [])

  // Screen reader announcements
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current)
    }
    
    setAnnouncement({ message, priority })
    
    // Clear announcement after a delay to allow screen readers to process
    announcementTimeoutRef.current = setTimeout(() => {
      setAnnouncement(null)
    }, 1000)
  }, [])

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent, context: 'month' | 'week' | 'day') => {
    if (!focusedDate) return

    const key = event.key
    let newDate = new Date(focusedDate)
    let handled = false

    switch (key) {
      case 'ArrowRight':
        newDate.setDate(newDate.getDate() + 1)
        handled = true
        break
      case 'ArrowLeft':
        newDate.setDate(newDate.getDate() - 1)
        handled = true
        break
      case 'ArrowDown':
        if (context === 'month') {
          newDate.setDate(newDate.getDate() + 7) // Next week
        } else if (context === 'week') {
          newDate.setDate(newDate.getDate() + 7) // Next week
        } else { // day view
          newDate.setHours(newDate.getHours() + 1) // Next hour
        }
        handled = true
        break
      case 'ArrowUp':
        if (context === 'month') {
          newDate.setDate(newDate.getDate() - 7) // Previous week
        } else if (context === 'week') {
          newDate.setDate(newDate.getDate() - 7) // Previous week
        } else { // day view
          newDate.setHours(newDate.getHours() - 1) // Previous hour
        }
        handled = true
        break
      case 'Home':
        if (event.ctrlKey) {
          // Go to first day of month
          newDate.setDate(1)
        } else {
          // Go to start of week (Sunday)
          newDate.setDate(newDate.getDate() - newDate.getDay())
        }
        handled = true
        break
      case 'End':
        if (event.ctrlKey) {
          // Go to last day of month
          newDate.setMonth(newDate.getMonth() + 1, 0)
        } else {
          // Go to end of week (Saturday)
          newDate.setDate(newDate.getDate() + (6 - newDate.getDay()))
        }
        handled = true
        break
      case 'PageUp':
        if (event.shiftKey) {
          // Previous year
          newDate.setFullYear(newDate.getFullYear() - 1)
        } else {
          // Previous month
          newDate.setMonth(newDate.getMonth() - 1)
        }
        handled = true
        break
      case 'PageDown':
        if (event.shiftKey) {
          // Next year
          newDate.setFullYear(newDate.getFullYear() + 1)
        } else {
          // Next month
          newDate.setMonth(newDate.getMonth() + 1)
        }
        handled = true
        break
      case 'Enter':
      case ' ':
        // Activate date (handled by parent component)
        handled = true
        break
      case 'Escape':
        // Exit calendar navigation
        handled = true
        break
    }

    if (handled) {
      event.preventDefault()
      event.stopPropagation()
      
      // Check if new date is valid (not too far in past/future)
      const today = new Date()
      const minDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
      const maxDate = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate())
      
      if (newDate < minDate || newDate > maxDate) {
        announce('Cannot navigate to that date', 'assertive')
        return
      }

      if (newDate < today && key !== 'Escape') {
        announce('Cannot navigate to dates in the past', 'assertive')
        return
      }

      if (key !== 'Escape') {
        setFocusedDate(newDate)
        
        // Announce the new date
        const dateString = newDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
        announce(dateString, 'polite')
      }
    }
  }, [focusedDate, announce])

  // Focus management
  const trapFocus = useCallback((containerRef: React.RefObject<HTMLElement>) => {
    if (!containerRef.current) return

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    containerRef.current.addEventListener('keydown', handleTabKey)
    
    return () => {
      containerRef.current?.removeEventListener('keydown', handleTabKey)
    }
  }, [])

  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [])

  // ARIA attributes for grid cells
  const getGridCellProps = useCallback((
    date: Date, 
    hasAppointments: boolean = false, 
    isSelected: boolean = false
  ) => {
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    const isPast = date < today
    
    let ariaLabel = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    if (isToday) {
      ariaLabel += ', Today'
    }
    
    if (isPast) {
      ariaLabel += ', Unavailable'
    }
    
    if (hasAppointments) {
      ariaLabel += ', Has appointments'
    }
    
    if (isSelected) {
      ariaLabel += ', Selected'
    }

    return {
      role: 'gridcell',
      'aria-label': ariaLabel,
      'aria-selected': isSelected,
      'aria-disabled': isPast,
      'aria-current': isToday ? 'date' : undefined,
      tabIndex: isSelected || (focusedDate && date.toDateString() === focusedDate.toDateString()) ? 0 : -1
    }
  }, [focusedDate])

  // ARIA attributes for grid container
  const getGridProps = useCallback(() => ({
    role: 'grid',
    'aria-label': 'Calendar date picker',
    'aria-readonly': false,
    'aria-multiselectable': false
  }), [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current)
      }
    }
  }, [])

  return {
    announce,
    announcement,
    keyboardNav: {
      handleKeyDown,
      focusedDate,
      setFocusedDate
    },
    trapFocus,
    restoreFocus,
    getGridCellProps,
    getGridProps,
    isHighContrast
  }
}

// Helper hook for screen reader announcements only
export function useScreenReaderAnnouncements() {
  const [announcement, setAnnouncement] = useState<string>('')
  const timeoutRef = useRef<NodeJS.Timeout>()

  const announce = useCallback((message: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    setAnnouncement(message)
    
    timeoutRef.current = setTimeout(() => {
      setAnnouncement('')
    }, 1000)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { announcement, announce }
}