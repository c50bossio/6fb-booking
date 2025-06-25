'use client'

/**
 * Keyboard Accessibility Hook for Drag and Drop Operations
 *
 * This hook provides comprehensive keyboard support for users who cannot use mouse or touch:
 * - Arrow key navigation between time slots
 * - Space/Enter to select and move appointments
 * - Tab navigation with focus management
 * - Screen reader announcements
 * - Visual focus indicators
 * - Keyboard shortcuts for common operations
 * - ARIA live regions for status updates
 * - High contrast mode support
 */

import { useCallback, useRef, useEffect, useState } from 'react'
import { CalendarAppointment } from '@/components/calendar/RobustCalendar'

export interface KeyboardNavigationState {
  focusedElement: HTMLElement | null
  focusedAppointment: CalendarAppointment | null
  focusedTimeSlot: { date: string; time: string } | null
  selectedAppointments: Set<string>
  dragMode: boolean
  draggedAppointment: CalendarAppointment | null
  navigationMode: 'calendar' | 'appointment' | 'timeslot'
  announcements: string[]
}

export interface KeyboardShortcuts {
  select: string[]
  move: string[]
  cancel: string[]
  confirm: string[]
  multiSelect: string[]
  nextDay: string[]
  previousDay: string[]
  nextWeek: string[]
  previousWeek: string[]
  nextHour: string[]
  previousHour: string[]
  home: string[]
  end: string[]
}

export interface AccessibilityConfiguration {
  enableScreenReader: boolean
  enableHighContrast: boolean
  enableFocusTrapping: boolean
  enableVirtualCursor: boolean
  announceChanges: boolean
  reduceMotion: boolean
  largeTargets: boolean
  customShortcuts: Partial<KeyboardShortcuts>
}

export interface FocusManagement {
  trapFocus: boolean
  restoreFocus: boolean
  skipLinks: boolean
  landmarkNavigation: boolean
  headingNavigation: boolean
}

export interface KeyboardDragDropHookReturn {
  // State
  navigationState: KeyboardNavigationState
  currentFocus: { element: HTMLElement; type: 'appointment' | 'timeslot' | 'control' } | null

  // Navigation methods
  moveFocus: (direction: 'up' | 'down' | 'left' | 'right' | 'home' | 'end') => void
  focusAppointment: (appointmentId: string) => void
  focusTimeSlot: (date: string, time: string) => void
  focusNextAppointment: () => void
  focusPreviousAppointment: () => void

  // Drag and drop operations
  startKeyboardDrag: (appointment: CalendarAppointment) => void
  moveToTimeSlot: (date: string, time: string) => Promise<void>
  cancelKeyboardDrag: () => void
  confirmKeyboardDrag: () => Promise<void>

  // Selection methods
  selectAppointment: (appointmentId: string, multiSelect?: boolean) => void
  deselectAppointment: (appointmentId: string) => void
  selectAll: () => void
  clearSelection: () => void

  // Keyboard event handlers
  handleKeyDown: (event: React.KeyboardEvent) => void
  handleKeyUp: (event: React.KeyboardEvent) => void

  // Screen reader support
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void
  getAriaLabel: (element: 'appointment' | 'timeslot', data: any) => string
  getAriaDescription: (element: 'appointment' | 'timeslot', data: any) => string

  // Focus management
  setFocusTrap: (container: HTMLElement) => void
  removeFocusTrap: () => void
  restoreFocus: () => void

  // Configuration
  updateAccessibilityConfig: (config: Partial<AccessibilityConfiguration>) => void
  updateKeyboardShortcuts: (shortcuts: Partial<KeyboardShortcuts>) => void

  // Utilities
  isKeyboardUser: boolean
  supportsScreenReader: boolean
  isHighContrastMode: boolean
}

const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcuts = {
  select: ['Space', 'Enter'],
  move: ['Space'],
  cancel: ['Escape'],
  confirm: ['Enter'],
  multiSelect: ['Shift+Space', 'Control+Space'],
  nextDay: ['ArrowRight'],
  previousDay: ['ArrowLeft'],
  nextWeek: ['ArrowDown'],
  previousWeek: ['ArrowUp'],
  nextHour: ['Control+ArrowDown'],
  previousHour: ['Control+ArrowUp'],
  home: ['Home'],
  end: ['End']
}

const DEFAULT_ACCESSIBILITY_CONFIG: AccessibilityConfiguration = {
  enableScreenReader: true,
  enableHighContrast: false,
  enableFocusTrapping: true,
  enableVirtualCursor: true,
  announceChanges: true,
  reduceMotion: false,
  largeTargets: false,
  customShortcuts: {}
}

export function useKeyboardDragDrop(
  appointments: CalendarAppointment[],
  timeSlots: string[],
  weekDays: Date[],
  onAppointmentMove?: (appointmentId: string, newDate: string, newTime: string) => Promise<void>,
  onAppointmentSelect?: (appointment: CalendarAppointment) => void,
  onTimeSlotSelect?: (date: string, time: string) => void,
  initialConfig: Partial<AccessibilityConfiguration> = {}
): KeyboardDragDropHookReturn {

  // Configuration
  const [accessibilityConfig, setAccessibilityConfig] = useState<AccessibilityConfiguration>({
    ...DEFAULT_ACCESSIBILITY_CONFIG,
    ...initialConfig
  })

  const [keyboardShortcuts, setKeyboardShortcuts] = useState<KeyboardShortcuts>({
    ...DEFAULT_KEYBOARD_SHORTCUTS,
    ...accessibilityConfig.customShortcuts
  })

  // Navigation state
  const [navigationState, setNavigationState] = useState<KeyboardNavigationState>({
    focusedElement: null,
    focusedAppointment: null,
    focusedTimeSlot: null,
    selectedAppointments: new Set(),
    dragMode: false,
    draggedAppointment: null,
    navigationMode: 'calendar',
    announcements: []
  })

  const [currentFocus, setCurrentFocus] = useState<{ element: HTMLElement; type: 'appointment' | 'timeslot' | 'control' } | null>(null)

  // Refs for focus management
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const focusTrapRef = useRef<HTMLElement | null>(null)
  const announcementRef = useRef<HTMLElement | null>(null)
  const keyboardUserRef = useRef<boolean>(false)

  // Device and capability detection
  const [isKeyboardUser, setIsKeyboardUser] = useState(false)
  const [supportsScreenReader, setSupportsScreenReader] = useState(false)
  const [isHighContrastMode, setIsHighContrastMode] = useState(false)

  // Initialize accessibility features
  useEffect(() => {
    // Detect keyboard usage
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true)
        keyboardUserRef.current = true
      }
    }

    const handleMouseDown = () => {
      setIsKeyboardUser(false)
      keyboardUserRef.current = false
    }

    // Detect screen reader
    const hasScreenReader = window.speechSynthesis !== undefined ||
                           'screen' in window ||
                           navigator.userAgent.includes('NVDA') ||
                           navigator.userAgent.includes('JAWS')
    setSupportsScreenReader(hasScreenReader)

    // Detect high contrast mode
    const detectHighContrast = () => {
      const testElement = document.createElement('div')
      testElement.style.cssText = 'border: 1px solid; border-color: buttontext; position: absolute; top: -9999px;'
      document.body.appendChild(testElement)

      const computedBorderColor = window.getComputedStyle(testElement).borderColor
      const isHighContrast = computedBorderColor === 'rgb(0, 0, 0)' || computedBorderColor === 'rgb(255, 255, 255)'

      document.body.removeChild(testElement)
      setIsHighContrastMode(isHighContrast)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)
    detectHighContrast()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  // Create ARIA live region for announcements
  useEffect(() => {
    if (!accessibilityConfig.enableScreenReader) return

    const ariaLive = document.createElement('div')
    ariaLive.setAttribute('aria-live', 'polite')
    ariaLive.setAttribute('aria-atomic', 'true')
    ariaLive.className = 'sr-only'
    ariaLive.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `

    document.body.appendChild(ariaLive)
    announcementRef.current = ariaLive

    return () => {
      if (announcementRef.current && document.body.contains(announcementRef.current)) {
        document.body.removeChild(announcementRef.current)
      }
    }
  }, [accessibilityConfig.enableScreenReader])

  // Screen reader announcement function
  const announceToScreenReader = useCallback((
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    if (!accessibilityConfig.announceChanges || !announcementRef.current) return

    announcementRef.current.setAttribute('aria-live', priority)
    announcementRef.current.textContent = message

    setNavigationState(prev => ({
      ...prev,
      announcements: [...prev.announcements.slice(-4), message]
    }))

    // Clear after announcement
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = ''
      }
    }, 1000)
  }, [accessibilityConfig.announceChanges])

  // Generate ARIA labels
  const getAriaLabel = useCallback((
    element: 'appointment' | 'timeslot',
    data: any
  ): string => {
    if (element === 'appointment') {
      const appointment = data as CalendarAppointment
      return `Appointment: ${appointment.service} with ${appointment.barber} for ${appointment.client} at ${appointment.startTime} on ${appointment.date}. Status: ${appointment.status}.`
    } else if (element === 'timeslot') {
      const { date, time, appointments = [] } = data
      const appointmentCount = appointments.length
      const dateStr = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      })
      return `Time slot ${time} on ${dateStr}. ${appointmentCount} appointment${appointmentCount !== 1 ? 's' : ''}.`
    }
    return ''
  }, [])

  // Generate ARIA descriptions
  const getAriaDescription = useCallback((
    element: 'appointment' | 'timeslot',
    data: any
  ): string => {
    if (element === 'appointment') {
      const appointment = data as CalendarAppointment
      const instructions = navigationState.dragMode
        ? 'Use arrow keys to navigate to a new time slot, then press Enter to move the appointment or Escape to cancel.'
        : 'Press Space to select this appointment, then Space again to start moving it.'
      return `Duration: ${appointment.duration} minutes. Price: $${appointment.price}. ${instructions}`
    } else if (element === 'timeslot') {
      const { appointments = [] } = data
      if (navigationState.dragMode && navigationState.draggedAppointment) {
        return 'Press Enter to move the appointment here, or Escape to cancel.'
      }
      return appointments.length > 0
        ? 'Press Enter to view appointments in this time slot.'
        : 'Press Enter to create a new appointment in this time slot.'
    }
    return ''
  }, [navigationState.dragMode, navigationState.draggedAppointment])

  // Focus management
  const moveFocus = useCallback((direction: 'up' | 'down' | 'left' | 'right' | 'home' | 'end') => {
    if (navigationState.navigationMode === 'timeslot') {
      const { focusedTimeSlot } = navigationState
      if (!focusedTimeSlot) return

      const currentDateIndex = weekDays.findIndex(
        date => date.toISOString().split('T')[0] === focusedTimeSlot.date
      )
      const currentTimeIndex = timeSlots.indexOf(focusedTimeSlot.time)

      let newDateIndex = currentDateIndex
      let newTimeIndex = currentTimeIndex

      switch (direction) {
        case 'left':
          newDateIndex = Math.max(0, currentDateIndex - 1)
          break
        case 'right':
          newDateIndex = Math.min(weekDays.length - 1, currentDateIndex + 1)
          break
        case 'up':
          newTimeIndex = Math.max(0, currentTimeIndex - 1)
          break
        case 'down':
          newTimeIndex = Math.min(timeSlots.length - 1, currentTimeIndex + 1)
          break
        case 'home':
          newDateIndex = 0
          newTimeIndex = 0
          break
        case 'end':
          newDateIndex = weekDays.length - 1
          newTimeIndex = timeSlots.length - 1
          break
      }

      if (newDateIndex !== currentDateIndex || newTimeIndex !== currentTimeIndex) {
        const newDate = weekDays[newDateIndex].toISOString().split('T')[0]
        const newTime = timeSlots[newTimeIndex]
        focusTimeSlot(newDate, newTime)
      }
    }
  }, [navigationState, weekDays, timeSlots])

  const focusAppointment = useCallback((appointmentId: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId)
    if (!appointment) return

    const appointmentElement = document.querySelector(`[data-appointment-id="${appointmentId}"]`) as HTMLElement
    if (appointmentElement) {
      appointmentElement.focus()

      setNavigationState(prev => ({
        ...prev,
        focusedElement: appointmentElement,
        focusedAppointment: appointment,
        navigationMode: 'appointment'
      }))

      setCurrentFocus({ element: appointmentElement, type: 'appointment' })

      announceToScreenReader(getAriaLabel('appointment', appointment))
    }
  }, [appointments, getAriaLabel, announceToScreenReader])

  const focusTimeSlot = useCallback((date: string, time: string) => {
    const timeSlotElement = document.querySelector(`[data-time-slot="${date}-${time}"]`) as HTMLElement
    if (timeSlotElement) {
      timeSlotElement.focus()

      const appointmentsInSlot = appointments.filter(
        apt => apt.date === date && apt.startTime === time
      )

      setNavigationState(prev => ({
        ...prev,
        focusedElement: timeSlotElement,
        focusedTimeSlot: { date, time },
        navigationMode: 'timeslot'
      }))

      setCurrentFocus({ element: timeSlotElement, type: 'timeslot' })

      announceToScreenReader(getAriaLabel('timeslot', { date, time, appointments: appointmentsInSlot }))
    }
  }, [appointments, getAriaLabel, announceToScreenReader])

  const focusNextAppointment = useCallback(() => {
    const sortedAppointments = [...appointments].sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.startTime}`)
      const dateB = new Date(`${b.date} ${b.startTime}`)
      return dateA.getTime() - dateB.getTime()
    })

    const currentIndex = navigationState.focusedAppointment
      ? sortedAppointments.findIndex(apt => apt.id === navigationState.focusedAppointment!.id)
      : -1

    const nextIndex = (currentIndex + 1) % sortedAppointments.length
    focusAppointment(sortedAppointments[nextIndex].id)
  }, [appointments, navigationState.focusedAppointment, focusAppointment])

  const focusPreviousAppointment = useCallback(() => {
    const sortedAppointments = [...appointments].sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.startTime}`)
      const dateB = new Date(`${b.date} ${b.startTime}`)
      return dateA.getTime() - dateB.getTime()
    })

    const currentIndex = navigationState.focusedAppointment
      ? sortedAppointments.findIndex(apt => apt.id === navigationState.focusedAppointment!.id)
      : 0

    const prevIndex = currentIndex > 0 ? currentIndex - 1 : sortedAppointments.length - 1
    focusAppointment(sortedAppointments[prevIndex].id)
  }, [appointments, navigationState.focusedAppointment, focusAppointment])

  // Keyboard drag operations
  const startKeyboardDrag = useCallback((appointment: CalendarAppointment) => {
    setNavigationState(prev => ({
      ...prev,
      dragMode: true,
      draggedAppointment: appointment
    }))

    announceToScreenReader(
      `Started moving appointment: ${appointment.service} for ${appointment.client}. Use arrow keys to navigate to a new time slot, then press Enter to confirm or Escape to cancel.`,
      'assertive'
    )

    // Focus the appointment's current time slot
    focusTimeSlot(appointment.date, appointment.startTime)
  }, [announceToScreenReader, focusTimeSlot])

  const moveToTimeSlot = useCallback(async (date: string, time: string) => {
    const { draggedAppointment } = navigationState
    if (!draggedAppointment || !onAppointmentMove) return

    try {
      await onAppointmentMove(draggedAppointment.id, date, time)

      announceToScreenReader(
        `Moved appointment ${draggedAppointment.service} to ${time} on ${new Date(date).toLocaleDateString()}.`,
        'assertive'
      )

      setNavigationState(prev => ({
        ...prev,
        dragMode: false,
        draggedAppointment: null
      }))
    } catch (error) {
      announceToScreenReader('Failed to move appointment. Please try again.', 'assertive')
    }
  }, [navigationState, onAppointmentMove, announceToScreenReader])

  const cancelKeyboardDrag = useCallback(() => {
    const { draggedAppointment } = navigationState

    setNavigationState(prev => ({
      ...prev,
      dragMode: false,
      draggedAppointment: null
    }))

    announceToScreenReader(
      draggedAppointment
        ? `Cancelled moving appointment: ${draggedAppointment.service}.`
        : 'Cancelled appointment move.',
      'assertive'
    )

    // Return focus to the original appointment
    if (draggedAppointment) {
      focusAppointment(draggedAppointment.id)
    }
  }, [navigationState, announceToScreenReader, focusAppointment])

  const confirmKeyboardDrag = useCallback(async () => {
    const { focusedTimeSlot } = navigationState
    if (!focusedTimeSlot) return

    await moveToTimeSlot(focusedTimeSlot.date, focusedTimeSlot.time)
  }, [navigationState, moveToTimeSlot])

  // Selection methods
  const selectAppointment = useCallback((appointmentId: string, multiSelect: boolean = false) => {
    setNavigationState(prev => {
      const newSelection = multiSelect ? new Set(prev.selectedAppointments) : new Set<string>()

      if (newSelection.has(appointmentId)) {
        newSelection.delete(appointmentId)
      } else {
        newSelection.add(appointmentId)
      }

      return {
        ...prev,
        selectedAppointments: newSelection
      }
    })

    const appointment = appointments.find(apt => apt.id === appointmentId)
    if (appointment) {
      announceToScreenReader(
        `${navigationState.selectedAppointments.has(appointmentId) ? 'Deselected' : 'Selected'} appointment: ${appointment.service}`
      )
    }
  }, [navigationState.selectedAppointments, appointments, announceToScreenReader])

  const deselectAppointment = useCallback((appointmentId: string) => {
    setNavigationState(prev => {
      const newSelection = new Set(prev.selectedAppointments)
      newSelection.delete(appointmentId)
      return {
        ...prev,
        selectedAppointments: newSelection
      }
    })
  }, [])

  const selectAll = useCallback(() => {
    const allAppointmentIds = new Set(appointments.map(apt => apt.id))
    setNavigationState(prev => ({
      ...prev,
      selectedAppointments: allAppointmentIds
    }))

    announceToScreenReader(`Selected all ${appointments.length} appointments.`)
  }, [appointments, announceToScreenReader])

  const clearSelection = useCallback(() => {
    setNavigationState(prev => ({
      ...prev,
      selectedAppointments: new Set()
    }))

    announceToScreenReader('Cleared all selections.')
  }, [announceToScreenReader])

  // Keyboard event handling
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const { key, ctrlKey, metaKey, shiftKey } = event
    const modifierKey = ctrlKey || metaKey

    // Check for keyboard shortcuts
    const keyCombo = [
      ...(modifierKey ? ['Control'] : []),
      ...(shiftKey ? ['Shift'] : []),
      key
    ].join('+')

    // Handle drag mode shortcuts
    if (navigationState.dragMode) {
      if (keyboardShortcuts.cancel.includes(key)) {
        event.preventDefault()
        cancelKeyboardDrag()
        return
      }

      if (keyboardShortcuts.confirm.includes(key)) {
        event.preventDefault()
        confirmKeyboardDrag()
        return
      }

      // Navigation in drag mode
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        event.preventDefault()
        const direction = key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right'
        moveFocus(direction)
        return
      }
    }

    // Handle selection shortcuts
    if (navigationState.focusedAppointment) {
      if (keyboardShortcuts.select.includes(key)) {
        event.preventDefault()

        if (navigationState.selectedAppointments.has(navigationState.focusedAppointment.id)) {
          // Start drag if already selected
          startKeyboardDrag(navigationState.focusedAppointment)
        } else {
          // Select the appointment
          selectAppointment(navigationState.focusedAppointment.id, shiftKey)
        }
        return
      }

      if (keyboardShortcuts.multiSelect.some(combo => combo === keyCombo)) {
        event.preventDefault()
        selectAppointment(navigationState.focusedAppointment.id, true)
        return
      }
    }

    // Handle navigation shortcuts
    if (keyboardShortcuts.nextDay.includes(key)) {
      event.preventDefault()
      moveFocus('right')
    } else if (keyboardShortcuts.previousDay.includes(key)) {
      event.preventDefault()
      moveFocus('left')
    } else if (keyboardShortcuts.nextWeek.includes(key)) {
      event.preventDefault()
      moveFocus('down')
    } else if (keyboardShortcuts.previousWeek.includes(key)) {
      event.preventDefault()
      moveFocus('up')
    } else if (keyboardShortcuts.home.includes(key)) {
      event.preventDefault()
      moveFocus('home')
    } else if (keyboardShortcuts.end.includes(key)) {
      event.preventDefault()
      moveFocus('end')
    }

    // Handle appointment navigation
    if (key === 'Tab') {
      if (shiftKey) {
        focusPreviousAppointment()
      } else {
        focusNextAppointment()
      }
      event.preventDefault()
    }

    // Global shortcuts
    if (modifierKey && key === 'a') {
      event.preventDefault()
      selectAll()
    }

  }, [
    navigationState,
    keyboardShortcuts,
    cancelKeyboardDrag,
    confirmKeyboardDrag,
    moveFocus,
    startKeyboardDrag,
    selectAppointment,
    selectAll,
    focusNextAppointment,
    focusPreviousAppointment
  ])

  const handleKeyUp = useCallback((event: React.KeyboardEvent) => {
    // Handle any key up events if needed
  }, [])

  // Focus trap management
  const setFocusTrap = useCallback((container: HTMLElement) => {
    if (!accessibilityConfig.enableFocusTrapping) return

    focusTrapRef.current = container
    previousFocusRef.current = document.activeElement as HTMLElement

    // Get all focusable elements within the container
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

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

    container.addEventListener('keydown', handleTabKey)
    firstElement.focus()

    return () => {
      container.removeEventListener('keydown', handleTabKey)
    }
  }, [accessibilityConfig.enableFocusTrapping])

  const removeFocusTrap = useCallback(() => {
    focusTrapRef.current = null
  }, [])

  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current && accessibilityConfig.enableFocusTrapping) {
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [accessibilityConfig.enableFocusTrapping])

  // Configuration updates
  const updateAccessibilityConfig = useCallback((config: Partial<AccessibilityConfiguration>) => {
    setAccessibilityConfig(prev => ({ ...prev, ...config }))
  }, [])

  const updateKeyboardShortcuts = useCallback((shortcuts: Partial<KeyboardShortcuts>) => {
    setKeyboardShortcuts(prev => ({ ...prev, ...shortcuts }))
  }, [])

  return {
    // State
    navigationState,
    currentFocus,

    // Navigation methods
    moveFocus,
    focusAppointment,
    focusTimeSlot,
    focusNextAppointment,
    focusPreviousAppointment,

    // Drag and drop operations
    startKeyboardDrag,
    moveToTimeSlot,
    cancelKeyboardDrag,
    confirmKeyboardDrag,

    // Selection methods
    selectAppointment,
    deselectAppointment,
    selectAll,
    clearSelection,

    // Keyboard event handlers
    handleKeyDown,
    handleKeyUp,

    // Screen reader support
    announceToScreenReader,
    getAriaLabel,
    getAriaDescription,

    // Focus management
    setFocusTrap,
    removeFocusTrap,
    restoreFocus,

    // Configuration
    updateAccessibilityConfig,
    updateKeyboardShortcuts,

    // Utilities
    isKeyboardUser,
    supportsScreenReader,
    isHighContrastMode
  }
}

export default useKeyboardDragDrop
