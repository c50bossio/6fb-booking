'use client'

import React, { useRef, useCallback, useEffect, useState, createContext, useContext } from 'react'
import { format, isSameDay, addDays, subDays, startOfWeek, endOfWeek } from 'date-fns'

export type AccessibilityPreference = {
  reduceMotion: boolean
  highContrast: boolean
  largeText: boolean
  screenReader: boolean
  keyboardNavigation: boolean
  announceLiveChanges: boolean
}

export type CalendarAnnouncement = {
  type: 'navigation' | 'selection' | 'action' | 'status' | 'error'
  message: string
  priority: 'polite' | 'assertive'
  category?: string
}

export interface CalendarAccessibilityContextType {
  preferences: AccessibilityPreference
  announce: (announcement: CalendarAnnouncement) => void
  setFocus: (elementId: string) => void
  currentFocus: string | null
  navigationHistory: string[]
  ariaDescriptions: Map<string, string>
  isHighContrast: boolean
  screenReaderActive: boolean
}

const CalendarAccessibilityContext = createContext<CalendarAccessibilityContextType | null>(null)

export function useCalendarAccessibility() {
  const context = useContext(CalendarAccessibilityContext)
  if (!context) {
    throw new Error('useCalendarAccessibility must be used within CalendarAccessibilityManager')
  }
  return context
}

export interface CalendarAccessibilityManagerProps {
  children: React.ReactNode
  initialPreferences?: Partial<AccessibilityPreference>
  onPreferenceChange?: (preferences: AccessibilityPreference) => void
  enableKeyboardShortcuts?: boolean
  enableLiveRegions?: boolean
  enableFocusManagement?: boolean
}

export function CalendarAccessibilityManager({
  children,
  initialPreferences = {},
  onPreferenceChange,
  enableKeyboardShortcuts = true,
  enableLiveRegions = true,
  enableFocusManagement = true
}: CalendarAccessibilityManagerProps) {
  const [preferences, setPreferences] = useState<AccessibilityPreference>({
    reduceMotion: false,
    highContrast: false,
    largeText: false,
    screenReader: false,
    keyboardNavigation: true,
    announceLiveChanges: true,
    ...initialPreferences
  })

  const [currentFocus, setCurrentFocus] = useState<string | null>(null)
  const [navigationHistory, setNavigationHistory] = useState<string[]>([])
  const [ariaDescriptions, setAriaDescriptions] = useState<Map<string, string>>(new Map())
  const [screenReaderActive, setScreenReaderActive] = useState(false)

  const liveRegionRef = useRef<HTMLDivElement>(null)
  const assertiveRegionRef = useRef<HTMLDivElement>(null)
  const focusHistoryRef = useRef<HTMLElement[]>([])

  // Detect system accessibility preferences
  useEffect(() => {
    const detectAccessibilityPreferences = () => {
      const mediaQueries = {
        reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
        highContrast: window.matchMedia('(prefers-contrast: high)'),
        largeText: window.matchMedia('(prefers-font-size: large)')
      }

      const updatePreferences = () => {
        setPreferences(prev => ({
          ...prev,
          reduceMotion: mediaQueries.reduceMotion.matches,
          highContrast: mediaQueries.highContrast.matches,
          largeText: mediaQueries.largeText.matches
        }))
      }

      // Initial detection
      updatePreferences()

      // Listen for changes
      Object.values(mediaQueries).forEach(mq => {
        mq.addEventListener('change', updatePreferences)
      })

      return () => {
        Object.values(mediaQueries).forEach(mq => {
          mq.removeEventListener('change', updatePreferences)
        })
      }
    }

    detectAccessibilityPreferences()
  }, [])

  // Detect screen reader usage
  useEffect(() => {
    const detectScreenReader = () => {
      // Multiple methods to detect screen reader
      const hasAriaLive = document.querySelector('[aria-live]') !== null
      const hasAriaLabel = document.querySelector('[aria-label]') !== null
      const hasScreenReaderUser = 
        navigator.userAgent.includes('NVDA') ||
        navigator.userAgent.includes('JAWS') ||
        navigator.userAgent.includes('VoiceOver') ||
        window.speechSynthesis?.speak !== undefined

      const screenReaderDetected = hasAriaLive || hasAriaLabel || hasScreenReaderUser

      setScreenReaderActive(screenReaderDetected)
      setPreferences(prev => ({
        ...prev,
        screenReader: screenReaderDetected,
        announceLiveChanges: screenReaderDetected
      }))
    }

    // Delay detection to allow page to load
    setTimeout(detectScreenReader, 1000)
  }, [])

  // Update preferences and notify parent
  useEffect(() => {
    onPreferenceChange?.(preferences)
  }, [preferences, onPreferenceChange])

  // Announcement function for screen readers
  const announce = useCallback((announcement: CalendarAnnouncement) => {
    if (!preferences.announceLiveChanges) return

    const region = announcement.priority === 'assertive' 
      ? assertiveRegionRef.current 
      : liveRegionRef.current

    if (region) {
      // Clear and then set the message to ensure it's announced
      region.textContent = ''
      setTimeout(() => {
        region.textContent = announcement.message
      }, 10)

      // Also log for debugging
      console.log(`[A11Y ${announcement.type}] ${announcement.message}`)
    }
  }, [preferences.announceLiveChanges])

  // Focus management
  const setFocus = useCallback((elementId: string) => {
    if (!enableFocusManagement) return

    const element = document.getElementById(elementId)
    if (element) {
      // Store current focus in history
      setNavigationHistory(prev => [...prev.slice(-9), elementId])
      setCurrentFocus(elementId)
      
      // Set focus with fallback
      try {
        element.focus()
        
        // Store in focus history for potential restoration
        focusHistoryRef.current = [element, ...focusHistoryRef.current.slice(0, 4)]
        
        // Announce focus change for screen readers
        const elementLabel = element.getAttribute('aria-label') || 
                            element.getAttribute('aria-labelledby') ||
                            element.textContent?.trim() ||
                            element.tagName

        announce({
          type: 'navigation',
          message: `Focused on ${elementLabel}`,
          priority: 'polite'
        })
      } catch (error) {
        console.warn(`Failed to set focus on element ${elementId}:`, error)
      }
    }
  }, [enableFocusManagement, announce])

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts || !preferences.keyboardNavigation) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if calendar area is focused
      const calendarContainer = document.querySelector('[role="application"]')
      if (!calendarContainer?.contains(event.target as Node)) return

      const { key, ctrlKey, altKey, shiftKey } = event

      // Calendar-specific shortcuts
      switch (key) {
        case 'ArrowLeft':
          if (ctrlKey) {
            // Previous month/week/day
            announce({
              type: 'navigation',
              message: 'Navigating to previous period',
              priority: 'polite'
            })
            event.preventDefault()
          }
          break

        case 'ArrowRight':
          if (ctrlKey) {
            // Next month/week/day
            announce({
              type: 'navigation',
              message: 'Navigating to next period',
              priority: 'polite'
            })
            event.preventDefault()
          }
          break

        case 'ArrowUp':
          if (ctrlKey) {
            // Previous week
            announce({
              type: 'navigation',
              message: 'Navigating to previous week',
              priority: 'polite'
            })
            event.preventDefault()
          }
          break

        case 'ArrowDown':
          if (ctrlKey) {
            // Next week
            announce({
              type: 'navigation',
              message: 'Navigating to next week',
              priority: 'polite'
            })
            event.preventDefault()
          }
          break

        case 'Home':
          if (ctrlKey) {
            // Go to today
            announce({
              type: 'navigation',
              message: 'Navigating to today',
              priority: 'polite'
            })
            event.preventDefault()
          }
          break

        case 'Enter':
        case ' ':
          // Activate selected item
          if (currentFocus) {
            announce({
              type: 'action',
              message: 'Activating selected item',
              priority: 'polite'
            })
          }
          break

        case 'Escape':
          // Close modals or return to previous focus
          if (focusHistoryRef.current.length > 0) {
            const previousElement = focusHistoryRef.current[0]
            if (previousElement && document.contains(previousElement)) {
              previousElement.focus()
              announce({
                type: 'navigation',
                message: 'Returned to previous focus',
                priority: 'polite'
              })
            }
          }
          break

        case 'Tab':
          // Enhanced tab navigation with announcements
          setTimeout(() => {
            const activeElement = document.activeElement
            if (activeElement && activeElement.id) {
              setCurrentFocus(activeElement.id)
            }
          }, 0)
          break

        case '?':
          if (shiftKey) {
            // Show keyboard shortcuts help
            announce({
              type: 'status',
              message: 'Keyboard shortcuts: Ctrl+Arrow keys to navigate, Enter to select, Escape to close, Ctrl+Home for today',
              priority: 'assertive'
            })
            event.preventDefault()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enableKeyboardShortcuts, preferences.keyboardNavigation, currentFocus, announce])

  // Focus trap for modals
  const trapFocus = useCallback((containerElement: HTMLElement) => {
    const focusableElements = containerElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    containerElement.addEventListener('keydown', handleTabKey)
    return () => containerElement.removeEventListener('keydown', handleTabKey)
  }, [])

  // Enhanced ARIA description management
  const setAriaDescription = useCallback((elementId: string, description: string) => {
    setAriaDescriptions(prev => new Map(prev.set(elementId, description)))
    
    const element = document.getElementById(elementId)
    if (element) {
      element.setAttribute('aria-describedby', `${elementId}-description`)
      
      // Create or update description element
      let descElement = document.getElementById(`${elementId}-description`)
      if (!descElement) {
        descElement = document.createElement('div')
        descElement.id = `${elementId}-description`
        descElement.className = 'sr-only'
        element.parentNode?.appendChild(descElement)
      }
      descElement.textContent = description
    }
  }, [])

  const contextValue: CalendarAccessibilityContextType = {
    preferences,
    announce,
    setFocus,
    currentFocus,
    navigationHistory,
    ariaDescriptions,
    isHighContrast: preferences.highContrast,
    screenReaderActive
  }

  return (
    <CalendarAccessibilityContext.Provider value={contextValue}>
      <div 
        className={`calendar-accessibility-manager ${preferences.highContrast ? 'high-contrast' : ''} ${preferences.reduceMotion ? 'reduce-motion' : ''} ${preferences.largeText ? 'large-text' : ''}`}
        role="region"
        aria-label="Calendar accessibility container"
      >
        {/* Live regions for screen reader announcements */}
        {enableLiveRegions && (
          <>
            <div
              ref={liveRegionRef}
              className="sr-only"
              aria-live="polite"
              aria-atomic="true"
              role="status"
            />
            <div
              ref={assertiveRegionRef}
              className="sr-only"
              aria-live="assertive"
              aria-atomic="true"
              role="alert"
            />
          </>
        )}
        
        {/* Skip navigation link */}
        <a
          href="#calendar-main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
        >
          Skip to calendar content
        </a>

        {children}
      </div>
    </CalendarAccessibilityContext.Provider>
  )
}

// Hook for creating accessible calendar grid props
export function useAccessibleCalendarGrid() {
  const { announce, setAriaDescription } = useCalendarAccessibility()

  const getGridProps = useCallback(() => ({
    role: 'grid',
    'aria-label': 'Calendar grid',
    'aria-multiselectable': false,
    tabIndex: 0
  }), [])

  const getGridCellProps = useCallback((
    date: Date,
    isSelected: boolean = false,
    hasAppointments: boolean = false,
    appointmentCount: number = 0
  ) => {
    const cellId = `calendar-cell-${format(date, 'yyyy-MM-dd')}`
    const dayName = format(date, 'EEEE')
    const dayDate = format(date, 'MMMM d, yyyy')
    
    let description = `${dayName}, ${dayDate}`
    if (hasAppointments) {
      description += `, ${appointmentCount} appointment${appointmentCount !== 1 ? 's' : ''}`
    }
    if (isSameDay(date, new Date())) {
      description += ', today'
    }

    return {
      id: cellId,
      role: 'gridcell',
      'aria-label': description,
      'aria-selected': isSelected,
      'aria-current': isSameDay(date, new Date()) ? 'date' : undefined,
      tabIndex: isSelected ? 0 : -1,
      onClick: () => {
        announce({
          type: 'selection',
          message: `Selected ${description}`,
          priority: 'polite'
        })
      }
    }
  }, [announce])

  return { getGridProps, getGridCellProps }
}

// Hook for appointment accessibility
export function useAccessibleAppointment() {
  const { announce } = useCalendarAccessibility()

  const getAppointmentProps = useCallback((appointment: {
    id: number
    client_name: string
    service_name: string
    start_time: string
    status: string
    barber_name?: string
  }) => {
    const startTime = new Date(appointment.start_time)
    const timeStr = format(startTime, 'h:mm a')
    const dateStr = format(startTime, 'EEEE, MMMM d')
    
    const label = `Appointment: ${appointment.service_name} with ${appointment.client_name} on ${dateStr} at ${timeStr}. Status: ${appointment.status}.${appointment.barber_name ? ` Barber: ${appointment.barber_name}.` : ''} ${appointment.status !== 'completed' && appointment.status !== 'cancelled' ? 'Draggable.' : 'Click for details.'}`

    return {
      id: `appointment-${appointment.id}`,
      role: 'button',
      'aria-label': label,
      'aria-describedby': `appointment-${appointment.id}-details`,
      tabIndex: 0,
      onFocus: () => {
        announce({
          type: 'selection',
          message: label,
          priority: 'polite'
        })
      }
    }
  }, [announce])

  return { getAppointmentProps }
}

export default CalendarAccessibilityManager