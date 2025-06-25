import { useState, useEffect, useCallback, useRef } from 'react'
import { CalendarAppointment } from '@/components/calendar/RobustCalendar'

interface KeyboardNavigationState {
  focusedElement: {
    type: 'date' | 'timeSlot' | 'appointment' | 'control' | null
    date?: string
    time?: string
    appointmentId?: string
    controlId?: string
  }
  isKeyboardMode: boolean
  shortcuts: {
    [key: string]: {
      action: string
      description: string
      keys: string[]
      context?: 'global' | 'calendar' | 'appointment' | 'modal'
    }
  }
  commandPaletteOpen: boolean
  helpOverlayOpen: boolean
  announcements: string[]
}

interface UseCalendarKeyboardOptions {
  appointments: CalendarAppointment[]
  onNavigate: (direction: 'up' | 'down' | 'left' | 'right' | 'home' | 'end') => void
  onViewChange: (view: 'day' | 'week' | 'month') => void
  onDateChange: (date: Date) => void
  onCreateAppointment: () => void
  onEditAppointment: (appointment: CalendarAppointment) => void
  onDeleteAppointment: (appointmentId: string) => void
  onSelectAppointment: (appointment: CalendarAppointment) => void
  onTimeSlotSelect: (date: string, time: string) => void
  onSearch: () => void
  onFilter: () => void
  onUndo?: () => void
  onRedo?: () => void
  onCopy?: (appointment: CalendarAppointment) => void
  onPaste?: (date: string, time: string) => void
  enableHighContrast?: boolean
  enableReducedMotion?: boolean
}

export default function useCalendarKeyboard({
  appointments,
  onNavigate,
  onViewChange,
  onDateChange,
  onCreateAppointment,
  onEditAppointment,
  onDeleteAppointment,
  onSelectAppointment,
  onTimeSlotSelect,
  onSearch,
  onFilter,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  enableHighContrast = false,
  enableReducedMotion = false
}: UseCalendarKeyboardOptions) {
  const [state, setState] = useState<KeyboardNavigationState>({
    focusedElement: { type: null },
    isKeyboardMode: false,
    shortcuts: {
      // Navigation shortcuts
      'arrow-up': {
        action: 'navigateUp',
        description: 'Navigate up',
        keys: ['ArrowUp'],
        context: 'calendar'
      },
      'arrow-down': {
        action: 'navigateDown',
        description: 'Navigate down',
        keys: ['ArrowDown'],
        context: 'calendar'
      },
      'arrow-left': {
        action: 'navigateLeft',
        description: 'Navigate left',
        keys: ['ArrowLeft'],
        context: 'calendar'
      },
      'arrow-right': {
        action: 'navigateRight',
        description: 'Navigate right',
        keys: ['ArrowRight'],
        context: 'calendar'
      },
      'home': {
        action: 'navigateHome',
        description: 'Go to first item',
        keys: ['Home'],
        context: 'calendar'
      },
      'end': {
        action: 'navigateEnd',
        description: 'Go to last item',
        keys: ['End'],
        context: 'calendar'
      },
      'page-up': {
        action: 'previousPeriod',
        description: 'Previous week/month',
        keys: ['PageUp'],
        context: 'global'
      },
      'page-down': {
        action: 'nextPeriod',
        description: 'Next week/month',
        keys: ['PageDown'],
        context: 'global'
      },

      // Action shortcuts
      'new': {
        action: 'createAppointment',
        description: 'New appointment',
        keys: ['n', 'N'],
        context: 'global'
      },
      'edit': {
        action: 'editAppointment',
        description: 'Edit appointment',
        keys: ['e', 'E'],
        context: 'appointment'
      },
      'delete': {
        action: 'deleteAppointment',
        description: 'Delete appointment',
        keys: ['d', 'Delete'],
        context: 'appointment'
      },
      'select': {
        action: 'selectItem',
        description: 'Select/Open item',
        keys: [' ', 'Enter'],
        context: 'calendar'
      },

      // View shortcuts
      'view-day': {
        action: 'viewDay',
        description: 'Day view',
        keys: ['1'],
        context: 'global'
      },
      'view-week': {
        action: 'viewWeek',
        description: 'Week view',
        keys: ['2'],
        context: 'global'
      },
      'view-month': {
        action: 'viewMonth',
        description: 'Month view',
        keys: ['3'],
        context: 'global'
      },

      // Feature shortcuts
      'filter': {
        action: 'toggleFilter',
        description: 'Toggle filters',
        keys: ['f', 'F'],
        context: 'global'
      },
      'search': {
        action: 'toggleSearch',
        description: 'Search',
        keys: ['/', 's', 'S'],
        context: 'global'
      },
      'today': {
        action: 'goToToday',
        description: 'Go to today',
        keys: ['t', 'T'],
        context: 'global'
      },

      // Editing shortcuts
      'undo': {
        action: 'undo',
        description: 'Undo',
        keys: ['Ctrl+z', 'Cmd+z'],
        context: 'global'
      },
      'redo': {
        action: 'redo',
        description: 'Redo',
        keys: ['Ctrl+y', 'Cmd+y', 'Ctrl+Shift+z', 'Cmd+Shift+z'],
        context: 'global'
      },
      'copy': {
        action: 'copy',
        description: 'Copy appointment',
        keys: ['Ctrl+c', 'Cmd+c'],
        context: 'appointment'
      },
      'paste': {
        action: 'paste',
        description: 'Paste appointment',
        keys: ['Ctrl+v', 'Cmd+v'],
        context: 'calendar'
      },

      // UI shortcuts
      'command-palette': {
        action: 'openCommandPalette',
        description: 'Command palette',
        keys: ['Ctrl+k', 'Cmd+k'],
        context: 'global'
      },
      'help': {
        action: 'toggleHelp',
        description: 'Show keyboard shortcuts',
        keys: ['?', 'h', 'H'],
        context: 'global'
      },
      'escape': {
        action: 'escape',
        description: 'Close/Cancel',
        keys: ['Escape'],
        context: 'global'
      },

      // Calendar navigation
      'next-day': {
        action: 'nextDay',
        description: 'Next day',
        keys: ['Ctrl+ArrowRight', 'Cmd+ArrowRight'],
        context: 'global'
      },
      'previous-day': {
        action: 'previousDay',
        description: 'Previous day',
        keys: ['Ctrl+ArrowLeft', 'Cmd+ArrowLeft'],
        context: 'global'
      }
    },
    commandPaletteOpen: false,
    helpOverlayOpen: false,
    announcements: []
  })

  const clipboardRef = useRef<CalendarAppointment | null>(null)
  const lastAnnouncementRef = useRef<string>('')

  // Announce to screen reader
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Prevent duplicate announcements
    if (message === lastAnnouncementRef.current) return
    lastAnnouncementRef.current = message

    setState(prev => ({
      ...prev,
      announcements: [...prev.announcements, message]
    }))

    // Create live region announcement
    const liveRegion = document.getElementById('calendar-live-region') || createLiveRegion()
    liveRegion.setAttribute('aria-live', priority)
    liveRegion.textContent = message

    // Clear after announcement
    setTimeout(() => {
      liveRegion.textContent = ''
      setState(prev => ({
        ...prev,
        announcements: prev.announcements.filter(a => a !== message)
      }))
    }, 1000)
  }, [])

  // Create live region for screen reader announcements
  const createLiveRegion = () => {
    const region = document.createElement('div')
    region.id = 'calendar-live-region'
    region.className = 'sr-only'
    region.setAttribute('aria-live', 'polite')
    region.setAttribute('aria-atomic', 'true')
    document.body.appendChild(region)
    return region
  }

  // Focus management
  const focusElement = useCallback((type: 'date' | 'timeSlot' | 'appointment' | 'control', data?: any) => {
    setState(prev => ({
      ...prev,
      focusedElement: { type, ...data }
    }))

    // Find and focus the DOM element
    let selector = ''
    if (type === 'timeSlot' && data?.date && data?.time) {
      selector = `[data-time-slot="${data.date}-${data.time}"]`
    } else if (type === 'appointment' && data?.appointmentId) {
      selector = `[data-appointment-id="${data.appointmentId}"]`
    } else if (type === 'date' && data?.date) {
      selector = `[data-date="${data.date}"]`
    } else if (type === 'control' && data?.controlId) {
      selector = `[data-control-id="${data.controlId}"]`
    }

    if (selector) {
      const element = document.querySelector(selector) as HTMLElement
      element?.focus()
    }
  }, [])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)

    // Don't handle shortcuts when typing in inputs
    if (isInput && !['Escape', 'Enter'].includes(e.key)) return

    // Check for modifier keys
    const ctrl = e.ctrlKey || e.metaKey
    const shift = e.shiftKey
    const alt = e.altKey

    // Build key combination string
    let keyCombo = ''
    if (ctrl) keyCombo += 'Ctrl+'
    if (shift) keyCombo += 'Shift+'
    if (alt) keyCombo += 'Alt+'
    keyCombo += e.key

    // Find matching shortcut
    const shortcut = Object.values(state.shortcuts).find(s =>
      s.keys.includes(e.key) || s.keys.includes(keyCombo) || s.keys.includes(keyCombo.replace('Ctrl+', 'Cmd+'))
    )

    if (!shortcut) return

    // Check context
    const { focusedElement } = state
    const context = focusedElement.type === 'appointment' ? 'appointment' :
                   focusedElement.type ? 'calendar' : 'global'

    if (shortcut.context && shortcut.context !== 'global' && shortcut.context !== context) return

    e.preventDefault()
    e.stopPropagation()

    // Enable keyboard mode
    if (!state.isKeyboardMode) {
      setState(prev => ({ ...prev, isKeyboardMode: true }))
    }

    // Execute action
    switch (shortcut.action) {
      // Navigation
      case 'navigateUp':
        onNavigate('up')
        announce('Navigated up')
        break
      case 'navigateDown':
        onNavigate('down')
        announce('Navigated down')
        break
      case 'navigateLeft':
        onNavigate('left')
        announce('Navigated left')
        break
      case 'navigateRight':
        onNavigate('right')
        announce('Navigated right')
        break
      case 'navigateHome':
        onNavigate('home')
        announce('Navigated to first item')
        break
      case 'navigateEnd':
        onNavigate('end')
        announce('Navigated to last item')
        break

      // Views
      case 'viewDay':
        onViewChange('day')
        announce('Switched to day view')
        break
      case 'viewWeek':
        onViewChange('week')
        announce('Switched to week view')
        break
      case 'viewMonth':
        onViewChange('month')
        announce('Switched to month view')
        break

      // Actions
      case 'createAppointment':
        onCreateAppointment()
        announce('Opening new appointment dialog')
        break
      case 'editAppointment':
        if (focusedElement.type === 'appointment' && focusedElement.appointmentId) {
          const appointment = appointments.find(a => a.id === focusedElement.appointmentId)
          if (appointment) {
            onEditAppointment(appointment)
            announce(`Editing appointment for ${appointment.client}`)
          }
        }
        break
      case 'deleteAppointment':
        if (focusedElement.type === 'appointment' && focusedElement.appointmentId) {
          const appointment = appointments.find(a => a.id === focusedElement.appointmentId)
          if (appointment && confirm(`Delete appointment for ${appointment.client}?`)) {
            onDeleteAppointment(appointment.id)
            announce(`Deleted appointment for ${appointment.client}`)
          }
        }
        break
      case 'selectItem':
        if (focusedElement.type === 'appointment' && focusedElement.appointmentId) {
          const appointment = appointments.find(a => a.id === focusedElement.appointmentId)
          if (appointment) {
            onSelectAppointment(appointment)
            announce(`Selected appointment for ${appointment.client}`)
          }
        } else if (focusedElement.type === 'timeSlot' && focusedElement.date && focusedElement.time) {
          onTimeSlotSelect(focusedElement.date, focusedElement.time)
          announce(`Selected time slot ${focusedElement.time}`)
        }
        break

      // Features
      case 'toggleFilter':
        onFilter()
        announce('Toggled filters')
        break
      case 'toggleSearch':
        onSearch()
        announce('Opening search')
        break
      case 'goToToday':
        onDateChange(new Date())
        announce('Navigated to today')
        break

      // Editing
      case 'undo':
        if (onUndo) {
          onUndo()
          announce('Undid last action')
        }
        break
      case 'redo':
        if (onRedo) {
          onRedo()
          announce('Redid last action')
        }
        break
      case 'copy':
        if (focusedElement.type === 'appointment' && focusedElement.appointmentId) {
          const appointment = appointments.find(a => a.id === focusedElement.appointmentId)
          if (appointment && onCopy) {
            clipboardRef.current = appointment
            onCopy(appointment)
            announce(`Copied appointment for ${appointment.client}`)
          }
        }
        break
      case 'paste':
        if (clipboardRef.current && focusedElement.type === 'timeSlot' &&
            focusedElement.date && focusedElement.time && onPaste) {
          onPaste(focusedElement.date, focusedElement.time)
          announce(`Pasted appointment to ${focusedElement.time}`)
        }
        break

      // UI
      case 'openCommandPalette':
        setState(prev => ({ ...prev, commandPaletteOpen: true }))
        announce('Command palette opened')
        break
      case 'toggleHelp':
        setState(prev => ({ ...prev, helpOverlayOpen: !prev.helpOverlayOpen }))
        announce(state.helpOverlayOpen ? 'Help closed' : 'Help opened')
        break
      case 'escape':
        if (state.commandPaletteOpen) {
          setState(prev => ({ ...prev, commandPaletteOpen: false }))
          announce('Command palette closed')
        } else if (state.helpOverlayOpen) {
          setState(prev => ({ ...prev, helpOverlayOpen: false }))
          announce('Help closed')
        }
        break

      // Calendar navigation
      case 'nextDay':
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        onDateChange(tomorrow)
        announce('Navigated to next day')
        break
      case 'previousDay':
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        onDateChange(yesterday)
        announce('Navigated to previous day')
        break
      case 'previousPeriod':
        // Handled by calendar component
        announce('Navigated to previous period')
        break
      case 'nextPeriod':
        // Handled by calendar component
        announce('Navigated to next period')
        break
    }
  }, [state, appointments, onNavigate, onViewChange, onDateChange, onCreateAppointment,
      onEditAppointment, onDeleteAppointment, onSelectAppointment, onTimeSlotSelect,
      onSearch, onFilter, onUndo, onRedo, onCopy, onPaste, announce])

  // Detect keyboard vs mouse usage
  useEffect(() => {
    const handleMouseMove = () => {
      if (state.isKeyboardMode) {
        setState(prev => ({ ...prev, isKeyboardMode: false }))
      }
    }

    const handleKeyPress = () => {
      if (!state.isKeyboardMode) {
        setState(prev => ({ ...prev, isKeyboardMode: true }))
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('keydown', handleKeyPress)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [state.isKeyboardMode])

  // Set up keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // High contrast mode
  useEffect(() => {
    if (enableHighContrast) {
      document.documentElement.classList.add('high-contrast')
    } else {
      document.documentElement.classList.remove('high-contrast')
    }
  }, [enableHighContrast])

  // Reduced motion
  useEffect(() => {
    if (enableReducedMotion) {
      document.documentElement.classList.add('reduce-motion')
    } else {
      document.documentElement.classList.remove('reduce-motion')
    }
  }, [enableReducedMotion])

  // Command execution
  const executeCommand = useCallback((commandId: string) => {
    const shortcut = state.shortcuts[commandId]
    if (shortcut) {
      // Simulate key press for the shortcut
      const event = new KeyboardEvent('keydown', { key: shortcut.keys[0] })
      handleKeyDown(event)
    }
  }, [state.shortcuts, handleKeyDown])

  // Get shortcuts for current context
  const getContextShortcuts = useCallback(() => {
    const { focusedElement } = state
    const context = focusedElement.type === 'appointment' ? 'appointment' :
                   focusedElement.type ? 'calendar' : 'global'

    return Object.entries(state.shortcuts)
      .filter(([_, shortcut]) =>
        !shortcut.context || shortcut.context === 'global' || shortcut.context === context
      )
      .map(([id, shortcut]) => ({ id, ...shortcut }))
  }, [state])

  return {
    // State
    focusedElement: state.focusedElement,
    isKeyboardMode: state.isKeyboardMode,
    commandPaletteOpen: state.commandPaletteOpen,
    helpOverlayOpen: state.helpOverlayOpen,
    shortcuts: state.shortcuts,
    announcements: state.announcements,

    // Actions
    focusElement,
    executeCommand,
    getContextShortcuts,
    announce,

    // UI state setters
    setCommandPaletteOpen: (open: boolean) => setState(prev => ({ ...prev, commandPaletteOpen: open })),
    setHelpOverlayOpen: (open: boolean) => setState(prev => ({ ...prev, helpOverlayOpen: open })),

    // Utilities
    isHighContrastMode: enableHighContrast,
    isReducedMotionMode: enableReducedMotion
  }
}
