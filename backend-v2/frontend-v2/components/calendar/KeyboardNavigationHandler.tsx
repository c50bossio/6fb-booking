'use client'

import React, { useEffect, useCallback, useRef, useState } from 'react'
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek, isSameDay } from 'date-fns'
import { useCalendarAccessibility } from './CalendarAccessibilityManager'

export type KeyboardCommand = {
  keys: string[]
  description: string
  action: () => void
  context?: 'global' | 'grid' | 'appointment' | 'modal'
  preventDefault?: boolean
}

export type CalendarView = 'month' | 'week' | 'day'

export interface KeyboardNavigationProps {
  currentDate: Date
  view: CalendarView
  selectedDate?: Date
  appointments?: Array<{ id: number; start_time: string; client_name: string; service_name: string }>
  onDateChange: (date: Date) => void
  onViewChange: (view: CalendarView) => void
  onDateSelect: (date: Date) => void
  onAppointmentSelect?: (appointmentId: number) => void
  onAppointmentCreate?: (date: Date) => void
  onAppointmentEdit?: (appointmentId: number) => void
  onRefresh?: () => void
  enabled?: boolean
  className?: string
}

export function KeyboardNavigationHandler({
  currentDate,
  view,
  selectedDate = currentDate,
  appointments = [],
  onDateChange,
  onViewChange,
  onDateSelect,
  onAppointmentSelect,
  onAppointmentCreate,
  onAppointmentEdit,
  onRefresh,
  enabled = true,
  className = ''
}: KeyboardNavigationProps) {
  const { announce, setFocus, currentFocus } = useCalendarAccessibility()
  const [selectedAppointmentIndex, setSelectedAppointmentIndex] = useState(-1)
  const [isAppointmentMode, setIsAppointmentMode] = useState(false)
  const [helpVisible, setHelpVisible] = useState(false)
  const keyMapRef = useRef<Map<string, KeyboardCommand>>(new Map())

  // Get appointments for selected date
  const getAppointmentsForDate = useCallback((date: Date) => {
    return appointments.filter(apt => isSameDay(new Date(apt.start_time), date))
  }, [appointments])

  // Navigation functions
  const navigatePrevious = useCallback(() => {
    let newDate: Date
    switch (view) {
      case 'day':
        newDate = subDays(selectedDate, 1)
        break
      case 'week':
        newDate = subWeeks(selectedDate, 1)
        break
      case 'month':
        newDate = subMonths(selectedDate, 1)
        break
      default:
        return
    }
    
    onDateSelect(newDate)
    onDateChange(newDate)
    announce({
      type: 'navigation',
      message: `Moved to ${format(newDate, 'EEEE, MMMM d, yyyy')}`,
      priority: 'polite'
    })
  }, [view, selectedDate, onDateSelect, onDateChange, announce])

  const navigateNext = useCallback(() => {
    let newDate: Date
    switch (view) {
      case 'day':
        newDate = addDays(selectedDate, 1)
        break
      case 'week':
        newDate = addWeeks(selectedDate, 1)
        break
      case 'month':
        newDate = addMonths(selectedDate, 1)
        break
      default:
        return
    }
    
    onDateSelect(newDate)
    onDateChange(newDate)
    announce({
      type: 'navigation',
      message: `Moved to ${format(newDate, 'EEEE, MMMM d, yyyy')}`,
      priority: 'polite'
    })
  }, [view, selectedDate, onDateSelect, onDateChange, announce])

  const navigateUp = useCallback(() => {
    const newDate = subDays(selectedDate, view === 'month' ? 7 : 1)
    onDateSelect(newDate)
    announce({
      type: 'navigation',
      message: `Moved to ${format(newDate, 'EEEE, MMMM d, yyyy')}`,
      priority: 'polite'
    })
  }, [selectedDate, view, onDateSelect, announce])

  const navigateDown = useCallback(() => {
    const newDate = addDays(selectedDate, view === 'month' ? 7 : 1)
    onDateSelect(newDate)
    announce({
      type: 'navigation',
      message: `Moved to ${format(newDate, 'EEEE, MMMM d, yyyy')}`,
      priority: 'polite'
    })
  }, [selectedDate, view, onDateSelect, announce])

  const goToToday = useCallback(() => {
    const today = new Date()
    onDateSelect(today)
    onDateChange(today)
    announce({
      type: 'navigation',
      message: `Moved to today, ${format(today, 'EEEE, MMMM d, yyyy')}`,
      priority: 'polite'
    })
  }, [onDateSelect, onDateChange, announce])

  // Appointment navigation
  const enterAppointmentMode = useCallback(() => {
    const appointmentsToday = getAppointmentsForDate(selectedDate)
    if (appointmentsToday.length > 0) {
      setIsAppointmentMode(true)
      setSelectedAppointmentIndex(0)
      announce({
        type: 'status',
        message: `Entered appointment mode. ${appointmentsToday.length} appointments on ${format(selectedDate, 'EEEE, MMMM d')}. Currently on appointment 1: ${appointmentsToday[0].service_name} with ${appointmentsToday[0].client_name}`,
        priority: 'assertive'
      })
    } else {
      announce({
        type: 'status',
        message: `No appointments on ${format(selectedDate, 'EEEE, MMMM d')}`,
        priority: 'polite'
      })
    }
  }, [selectedDate, getAppointmentsForDate, announce])

  const exitAppointmentMode = useCallback(() => {
    setIsAppointmentMode(false)
    setSelectedAppointmentIndex(-1)
    announce({
      type: 'status',
      message: 'Exited appointment mode',
      priority: 'polite'
    })
  }, [announce])

  const navigateAppointments = useCallback((direction: 'next' | 'prev') => {
    if (!isAppointmentMode) return

    const appointmentsToday = getAppointmentsForDate(selectedDate)
    if (appointmentsToday.length === 0) return

    let newIndex = selectedAppointmentIndex
    if (direction === 'next') {
      newIndex = (selectedAppointmentIndex + 1) % appointmentsToday.length
    } else {
      newIndex = selectedAppointmentIndex === 0 ? appointmentsToday.length - 1 : selectedAppointmentIndex - 1
    }

    setSelectedAppointmentIndex(newIndex)
    const appointment = appointmentsToday[newIndex]
    announce({
      type: 'selection',
      message: `Appointment ${newIndex + 1} of ${appointmentsToday.length}: ${appointment.service_name} with ${appointment.client_name} at ${format(new Date(appointment.start_time), 'h:mm a')}`,
      priority: 'polite'
    })
  }, [isAppointmentMode, selectedDate, selectedAppointmentIndex, getAppointmentsForDate, announce])

  // View switching
  const switchView = useCallback((newView: CalendarView) => {
    onViewChange(newView)
    announce({
      type: 'status',
      message: `Switched to ${newView} view`,
      priority: 'polite'
    })
  }, [onViewChange, announce])

  // Help system
  const toggleHelp = useCallback(() => {
    setHelpVisible(!helpVisible)
    if (!helpVisible) {
      announce({
        type: 'status',
        message: 'Keyboard shortcuts help opened',
        priority: 'assertive'
      })
    } else {
      announce({
        type: 'status',
        message: 'Keyboard shortcuts help closed',
        priority: 'polite'
      })
    }
  }, [helpVisible, announce])

  // Action handlers
  const handleCreateAppointment = useCallback(() => {
    if (onAppointmentCreate) {
      onAppointmentCreate(selectedDate)
      announce({
        type: 'action',
        message: `Creating new appointment for ${format(selectedDate, 'EEEE, MMMM d, yyyy')}`,
        priority: 'assertive'
      })
    }
  }, [selectedDate, onAppointmentCreate, announce])

  const handleEditAppointment = useCallback(() => {
    if (!isAppointmentMode || !onAppointmentEdit) return

    const appointmentsToday = getAppointmentsForDate(selectedDate)
    if (appointmentsToday.length > 0 && selectedAppointmentIndex >= 0) {
      const appointment = appointmentsToday[selectedAppointmentIndex]
      onAppointmentEdit(appointment.id)
      announce({
        type: 'action',
        message: `Editing appointment: ${appointment.service_name} with ${appointment.client_name}`,
        priority: 'assertive'
      })
    }
  }, [isAppointmentMode, selectedDate, selectedAppointmentIndex, getAppointmentsForDate, onAppointmentEdit, announce])

  const handleSelectAppointment = useCallback(() => {
    if (!isAppointmentMode || !onAppointmentSelect) return

    const appointmentsToday = getAppointmentsForDate(selectedDate)
    if (appointmentsToday.length > 0 && selectedAppointmentIndex >= 0) {
      const appointment = appointmentsToday[selectedAppointmentIndex]
      onAppointmentSelect(appointment.id)
      announce({
        type: 'selection',
        message: `Selected appointment: ${appointment.service_name} with ${appointment.client_name}`,
        priority: 'polite'
      })
    }
  }, [isAppointmentMode, selectedDate, selectedAppointmentIndex, getAppointmentsForDate, onAppointmentSelect, announce])

  // Build keyboard command map
  useEffect(() => {
    const commands: KeyboardCommand[] = [
      // Basic navigation
      { keys: ['ArrowLeft'], description: 'Move to previous date/period', action: navigatePrevious },
      { keys: ['ArrowRight'], description: 'Move to next date/period', action: navigateNext },
      { keys: ['ArrowUp'], description: 'Move up in calendar grid', action: navigateUp },
      { keys: ['ArrowDown'], description: 'Move down in calendar grid', action: navigateDown },
      
      // Extended navigation
      { keys: ['Home'], description: 'Go to today', action: goToToday },
      { keys: ['PageUp'], description: 'Previous month', action: () => switchView('month') },
      { keys: ['PageDown'], description: 'Next month', action: () => switchView('month') },
      
      // View switching
      { keys: ['1'], description: 'Switch to month view', action: () => switchView('month') },
      { keys: ['2'], description: 'Switch to week view', action: () => switchView('week') },
      { keys: ['3'], description: 'Switch to day view', action: () => switchView('day') },
      
      // Appointment management
      { keys: ['Enter'], description: 'Enter appointment mode or select appointment', action: isAppointmentMode ? handleSelectAppointment : enterAppointmentMode },
      { keys: ['Escape'], description: 'Exit appointment mode', action: exitAppointmentMode },
      { keys: ['Tab'], description: 'Next appointment', action: () => navigateAppointments('next'), context: 'appointment' },
      { keys: ['Shift+Tab'], description: 'Previous appointment', action: () => navigateAppointments('prev'), context: 'appointment' },
      
      // Actions
      { keys: ['n', 'N'], description: 'Create new appointment', action: handleCreateAppointment },
      { keys: ['e', 'E'], description: 'Edit selected appointment', action: handleEditAppointment },
      { keys: ['r', 'R'], description: 'Refresh calendar', action: onRefresh || (() => {}) },
      
      // Help
      { keys: ['?', 'Shift+/'], description: 'Toggle keyboard shortcuts help', action: toggleHelp },
      
      // Quick date jumps
      { keys: ['t', 'T'], description: 'Go to today', action: goToToday },
      { keys: ['g'], description: 'Go to specific date (opens date picker)', action: () => {
        announce({
          type: 'status',
          message: 'Date picker shortcut - feature coming soon',
          priority: 'polite'
        })
      }}
    ]

    // Build the key map
    const newKeyMap = new Map<string, KeyboardCommand>()
    commands.forEach(command => {
      command.keys.forEach(key => {
        newKeyMap.set(key.toLowerCase(), command)
      })
    })
    
    keyMapRef.current = newKeyMap
  }, [
    navigatePrevious, navigateNext, navigateUp, navigateDown, goToToday,
    switchView, isAppointmentMode, handleSelectAppointment, enterAppointmentMode,
    exitAppointmentMode, navigateAppointments, handleCreateAppointment,
    handleEditAppointment, onRefresh, toggleHelp
  ])

  // Main keyboard event handler
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if calendar area is focused or no specific focus
      const calendarContainer = document.querySelector('[role="application"]') as HTMLElement
      const target = event.target as HTMLElement
      
      // Check if we're in the calendar area
      if (calendarContainer && !calendarContainer.contains(target)) return
      
      // Don't interfere with input elements
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      const { key, shiftKey, ctrlKey, altKey } = event
      
      // Build key combination string
      let keyCombo = ''
      if (shiftKey) keyCombo += 'Shift+'
      if (ctrlKey) keyCombo += 'Ctrl+'
      if (altKey) keyCombo += 'Alt+'
      keyCombo += key

      // Look up command
      const command = keyMapRef.current.get(keyCombo.toLowerCase()) || keyMapRef.current.get(key.toLowerCase())
      
      if (command) {
        // Check context
        if (command.context === 'appointment' && !isAppointmentMode) return
        if (command.context === 'grid' && isAppointmentMode) return
        
        // Execute command
        event.preventDefault()
        command.action()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, isAppointmentMode])

  // Keyboard shortcuts help
  const KeyboardShortcutsHelp = () => {
    if (!helpVisible) return null

    const shortcuts = Array.from(keyMapRef.current.entries()).reduce((acc, [key, command]) => {
      const category = command.context || 'general'
      if (!acc[category]) acc[category] = []
      
      // Avoid duplicates
      const exists = acc[category].some(item => item.description === command.description)
      if (!exists) {
        acc[category].push({ key, description: command.description })
      }
      
      return acc
    }, {} as Record<string, Array<{ key: string; description: string }>>)

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-help-title"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
          <h2 id="keyboard-help-title" className="text-xl font-bold mb-4">
            Keyboard Shortcuts
          </h2>
          
          {Object.entries(shortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-semibold mb-2 capitalize">{category}</h3>
              <div className="space-y-2">
                {categoryShortcuts.map(({ key, description }) => (
                  <div key={key} className="flex justify-between">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                      {key}
                    </kbd>
                    <span className="ml-4 text-sm">{description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <button
            onClick={toggleHelp}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close Help
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`keyboard-navigation-handler ${className}`}>
      {/* Status indicator */}
      {isAppointmentMode && (
        <div className="sr-only" aria-live="polite">
          Appointment mode active. Use Tab and Shift+Tab to navigate appointments.
        </div>
      )}
      
      {/* Help overlay */}
      <KeyboardShortcutsHelp />
    </div>
  )
}

// Hook for easier integration
export function useKeyboardNavigation(props: Omit<KeyboardNavigationProps, 'className'>) {
  return <KeyboardNavigationHandler {...props} />
}

export default KeyboardNavigationHandler