'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

export interface CalendarAccessibilityOptions {
  announceChanges?: boolean
  enableKeyboardNavigation?: boolean
  highContrastMode?: boolean
  reducedMotion?: boolean
  announceRegion?: string
}

export interface CalendarAccessibilityState {
  options: CalendarAccessibilityOptions
  announcements: string[]
  focusedElement: HTMLElement | null
}

export function useCalendarAccessibility(
  options: CalendarAccessibilityOptions = {}
) {
  const [state, setState] = useState<CalendarAccessibilityState>({
    options: {
      announceChanges: true,
      enableKeyboardNavigation: true,
      highContrastMode: false,
      reducedMotion: false,
      announceRegion: 'calendar-region',
      ...options
    },
    announcements: [],
    focusedElement: null
  })

  // Check for system preferences
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches
    
    setState(prev => ({
      ...prev,
      options: {
        ...prev.options,
        reducedMotion: prefersReducedMotion,
        highContrastMode: prefersHighContrast
      }
    }))
  }, [])

  // Announce changes to screen readers
  const announce = useCallback((message: string) => {
    if (!state.options.announceChanges) return
    
    setState(prev => ({
      ...prev,
      announcements: [...prev.announcements.slice(-4), message]
    }))
    
    // Clear announcement after a delay
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        announcements: prev.announcements.filter(a => a !== message)
      }))
    }, 3000)
  }, [state.options.announceChanges])

  // Update options
  const updateOptions = useCallback((newOptions: Partial<CalendarAccessibilityOptions>) => {
    setState(prev => ({
      ...prev,
      options: { ...prev.options, ...newOptions }
    }))
  }, [])

  // Focus management
  const setFocusedElement = useCallback((element: HTMLElement | null) => {
    setState(prev => ({ ...prev, focusedElement: element }))
  }, [])

  // Generate accessibility props for calendar elements
  const getCalendarProps = useMemo(() => ({
    role: 'grid' as const,
    'aria-label': 'Calendar',
    'aria-live': 'polite' as const,
    'aria-atomic': false,
    tabIndex: 0
  }), [])

  const getDateCellProps = useCallback((date: Date, isSelected: boolean = false) => ({
    role: 'gridcell' as const,
    'aria-selected': isSelected,
    'aria-label': date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    tabIndex: isSelected ? 0 : -1
  }), [])

  const getAppointmentProps = useCallback((appointment: any) => ({
    role: 'button' as const,
    'aria-label': `Appointment: ${appointment.service} at ${appointment.time}`,
    'aria-describedby': `appointment-${appointment.id}-details`,
    tabIndex: 0
  }), [])

  // Keyboard navigation helpers
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    if (!state.options.enableKeyboardNavigation) return
    
    const { key, ctrlKey, metaKey, shiftKey } = event
    
    switch (key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        // Prevent default scroll behavior
        event.preventDefault()
        announce(`Navigating ${key.replace('Arrow', '').toLowerCase()}`)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        announce('Activating selected item')
        break
      case 'Escape':
        announce('Closing calendar')
        break
      case 'Home':
        if (ctrlKey || metaKey) {
          announce('Jumping to today')
        } else {
          announce('Moving to beginning of week')
        }
        break
      case 'End':
        announce('Moving to end of week')
        break
      case 'PageUp':
        announce(shiftKey ? 'Previous year' : 'Previous month')
        break
      case 'PageDown':
        announce(shiftKey ? 'Next year' : 'Next month')
        break
    }
  }, [state.options.enableKeyboardNavigation, announce])

  return {
    ...state,
    announce,
    updateOptions,
    setFocusedElement,
    getCalendarProps,
    getDateCellProps,
    getAppointmentProps,
    handleKeyboardNavigation,
    // Convenience flags
    isReducedMotion: state.options.reducedMotion,
    isHighContrast: state.options.highContrastMode,
    shouldAnnounce: state.options.announceChanges
  }
}

export default useCalendarAccessibility