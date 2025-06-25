'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import RobustCalendar, {
  RobustCalendarProps,
  CalendarAppointment,
  Barber,
  Service
} from './RobustCalendar'
import CommandPalette from './CommandPalette'
import KeyboardHelp from './KeyboardHelp'
import useCalendarKeyboard from '@/hooks/useCalendarKeyboard'
import { exportService } from '@/services/exportService'

interface KeyboardAccessibleCalendarProps extends RobustCalendarProps {
  // Additional keyboard-specific props
  enableCommandPalette?: boolean
  enableKeyboardHelp?: boolean
  enableAccessibilityFeatures?: boolean
  onCommandExecute?: (commandId: string) => void
}

export default function KeyboardAccessibleCalendar({
  appointments = [],
  barbers = [],
  services = [],
  enableCommandPalette = true,
  enableKeyboardHelp = true,
  enableAccessibilityFeatures = true,
  onCommandExecute,
  ...robustCalendarProps
}: KeyboardAccessibleCalendarProps) {
  // State
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month'>(
    robustCalendarProps.initialView || 'week'
  )
  const [currentDate, setCurrentDate] = useState(robustCalendarProps.initialDate || new Date())
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null)
  const [focusedDate, setFocusedDate] = useState<string | null>(null)
  const [focusedTime, setFocusedTime] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [copiedAppointment, setCopiedAppointment] = useState<CalendarAppointment | null>(null)

  // Refs
  const calendarRef = useRef<HTMLDivElement>(null)
  const focusedElementRef = useRef<HTMLElement | null>(null)

  // Format date string
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Navigation handlers
  const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right' | 'home' | 'end') => {
    const currentElement = document.activeElement
    const timeSlots = Array.from(document.querySelectorAll('[data-time-slot]'))
    const appointments = Array.from(document.querySelectorAll('[data-appointment-id]'))
    const allFocusable = [...timeSlots, ...appointments].sort((a, b) => {
      const aRect = a.getBoundingClientRect()
      const bRect = b.getBoundingClientRect()
      return aRect.top - bRect.top || aRect.left - bRect.left
    })

    let currentIndex = allFocusable.indexOf(currentElement as HTMLElement)
    if (currentIndex === -1) currentIndex = 0

    let nextIndex = currentIndex
    switch (direction) {
      case 'up':
        nextIndex = Math.max(0, currentIndex - 1)
        break
      case 'down':
        nextIndex = Math.min(allFocusable.length - 1, currentIndex + 1)
        break
      case 'left':
        // Find element to the left in grid
        nextIndex = Math.max(0, currentIndex - 1)
        break
      case 'right':
        // Find element to the right in grid
        nextIndex = Math.min(allFocusable.length - 1, currentIndex + 1)
        break
      case 'home':
        nextIndex = 0
        break
      case 'end':
        nextIndex = allFocusable.length - 1
        break
    }

    const nextElement = allFocusable[nextIndex] as HTMLElement
    if (nextElement) {
      nextElement.focus()
      nextElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [])

  // View change handler
  const handleViewChange = useCallback((view: 'day' | 'week' | 'month') => {
    setCurrentView(view)
  }, [])

  // Date change handler
  const handleDateChange = useCallback((date: Date) => {
    setCurrentDate(date)
  }, [])

  // Appointment handlers
  const handleCreateAppointment = useCallback(() => {
    if (robustCalendarProps.onCreateAppointment) {
      const date = focusedDate || formatDateString(new Date())
      const time = focusedTime || '09:00'
      robustCalendarProps.onCreateAppointment({
        date,
        startTime: time,
        endTime: time, // Will be calculated based on service duration
        barberId: barbers[0]?.id || 1,
        serviceId: services[0]?.id || 1
      } as Partial<CalendarAppointment>)
    }
  }, [focusedDate, focusedTime, barbers, services, robustCalendarProps])

  const handleEditAppointment = useCallback((appointment: CalendarAppointment) => {
    if (robustCalendarProps.onUpdateAppointment) {
      robustCalendarProps.onUpdateAppointment(appointment)
    }
  }, [robustCalendarProps])

  const handleDeleteAppointment = useCallback((appointmentId: string) => {
    if (robustCalendarProps.onDeleteAppointment) {
      robustCalendarProps.onDeleteAppointment(appointmentId)
    }
  }, [robustCalendarProps])

  const handleSelectAppointment = useCallback((appointment: CalendarAppointment) => {
    setSelectedAppointment(appointment)
    if (robustCalendarProps.onAppointmentClick) {
      robustCalendarProps.onAppointmentClick(appointment)
    }
  }, [robustCalendarProps])

  const handleTimeSlotSelect = useCallback((date: string, time: string) => {
    setFocusedDate(date)
    setFocusedTime(time)
    if (robustCalendarProps.onTimeSlotClick) {
      robustCalendarProps.onTimeSlotClick(date, time)
    }
  }, [robustCalendarProps])

  // Copy/Paste handlers
  const handleCopy = useCallback((appointment: CalendarAppointment) => {
    setCopiedAppointment(appointment)
  }, [])

  const handlePaste = useCallback((date: string, time: string) => {
    if (copiedAppointment && robustCalendarProps.onCreateAppointment) {
      robustCalendarProps.onCreateAppointment({
        ...copiedAppointment,
        id: `copy-${Date.now()}`, // Generate new ID
        date,
        startTime: time,
        status: 'pending' // Reset status for new appointment
      })
    }
  }, [copiedAppointment, robustCalendarProps])

  // Export handlers
  const handleExport = useCallback((format: 'csv' | 'pdf' | 'excel') => {
    exportService.exportToFormat(appointments, format, { barbers, services })
  }, [appointments, barbers, services])

  // Navigate to appointment
  const handleNavigateToAppointment = useCallback((appointment: CalendarAppointment) => {
    setCurrentDate(new Date(appointment.date))
    setSelectedAppointment(appointment)

    // Focus the appointment element after a short delay to allow rendering
    setTimeout(() => {
      const element = document.querySelector(`[data-appointment-id="${appointment.id}"]`) as HTMLElement
      element?.focus()
      element?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 100)
  }, [])

  // Initialize keyboard navigation
  const {
    focusedElement,
    isKeyboardMode,
    commandPaletteOpen,
    helpOverlayOpen,
    shortcuts,
    announcements,
    focusElement,
    executeCommand,
    getContextShortcuts,
    announce,
    setCommandPaletteOpen,
    setHelpOverlayOpen,
    isHighContrastMode,
    isReducedMotionMode
  } = useCalendarKeyboard({
    appointments,
    onNavigate: handleNavigate,
    onViewChange: handleViewChange,
    onDateChange: handleDateChange,
    onCreateAppointment: handleCreateAppointment,
    onEditAppointment: handleEditAppointment,
    onDeleteAppointment: handleDeleteAppointment,
    onSelectAppointment: handleSelectAppointment,
    onTimeSlotSelect: handleTimeSlotSelect,
    onSearch: () => setShowSearch(true),
    onFilter: () => setShowFilters(true),
    onUndo: robustCalendarProps.onUpdateAppointment ? () => {} : undefined, // TODO: Implement undo
    onRedo: robustCalendarProps.onUpdateAppointment ? () => {} : undefined, // TODO: Implement redo
    onCopy: handleCopy,
    onPaste: handlePaste,
    enableHighContrast: enableAccessibilityFeatures,
    enableReducedMotion: enableAccessibilityFeatures
  })

  // Focus management
  useEffect(() => {
    if (focusedElement.type && focusedElement.type !== null) {
      let selector = ''

      switch (focusedElement.type) {
        case 'timeSlot':
          if (focusedElement.date && focusedElement.time) {
            selector = `[data-time-slot="${focusedElement.date}-${focusedElement.time}"]`
          }
          break
        case 'appointment':
          if (focusedElement.appointmentId) {
            selector = `[data-appointment-id="${focusedElement.appointmentId}"]`
          }
          break
        case 'date':
          if (focusedElement.date) {
            selector = `[data-date="${focusedElement.date}"]`
          }
          break
        case 'control':
          if (focusedElement.controlId) {
            selector = `[data-control-id="${focusedElement.controlId}"]`
          }
          break
      }

      if (selector) {
        const element = document.querySelector(selector) as HTMLElement
        if (element && element !== focusedElementRef.current) {
          element.focus()
          focusedElementRef.current = element
        }
      }
    }
  }, [focusedElement])

  // Screen reader live region
  useEffect(() => {
    if (announcements.length > 0) {
      const latestAnnouncement = announcements[announcements.length - 1]
      // Announcement is handled by the hook
    }
  }, [announcements])

  return (
    <div
      ref={calendarRef}
      className={`keyboard-accessible-calendar ${isKeyboardMode ? 'keyboard-mode' : ''}`}
      data-high-contrast={isHighContrastMode}
      data-reduced-motion={isReducedMotionMode}
    >
      {/* Screen reader announcements */}
      <div
        id="calendar-announcer"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcements[announcements.length - 1]}
      </div>

      {/* Skip to content link */}
      <a
        href="#calendar-grid"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-violet-600 text-white px-4 py-2 rounded-lg z-50"
      >
        Skip to calendar
      </a>

      {/* Main calendar */}
      <div id="calendar-grid">
        <RobustCalendar
          {...robustCalendarProps}
          appointments={appointments}
          barbers={barbers}
          services={services}
          initialView={currentView}
          initialDate={currentDate}
          enableKeyboardNavigation={true}
          onAppointmentClick={handleSelectAppointment}
          onTimeSlotClick={handleTimeSlotSelect}
          enableSearch={showSearch}
          enableFilters={showFilters}
          enableStatistics={showStats}
        />
      </div>

      {/* Command Palette */}
      {enableCommandPalette && (
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onExecuteCommand={(commandId) => {
            executeCommand(commandId)
            if (onCommandExecute) {
              onCommandExecute(commandId)
            }
          }}
          appointments={appointments}
          barbers={barbers}
          services={services}
          currentView={currentView}
          onViewChange={handleViewChange}
          onCreateAppointment={handleCreateAppointment}
          onSearch={() => setShowSearch(true)}
          onFilter={() => setShowFilters(true)}
          onExport={handleExport}
          onShowStats={() => setShowStats(true)}
          onNavigateToDate={handleDateChange}
          onNavigateToAppointment={handleNavigateToAppointment}
        />
      )}

      {/* Keyboard Help */}
      {enableKeyboardHelp && (
        <KeyboardHelp
          isOpen={helpOverlayOpen}
          onClose={() => setHelpOverlayOpen(false)}
          currentContext={
            focusedElement.type === 'appointment' ? 'appointment' :
            focusedElement.type ? 'calendar' : 'modal'
          }
        />
      )}

      {/* Keyboard indicator */}
      <AnimatePresence>
        {isKeyboardMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 bg-violet-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-40"
          >
            Keyboard mode active • Press ? for help
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced styles for keyboard navigation */}
      <style jsx global>{`
        /* Focus styles */
        .keyboard-mode *:focus {
          outline: 3px solid #8b5cf6;
          outline-offset: 2px;
        }

        /* High contrast mode */
        [data-high-contrast="true"] {
          --contrast-ratio: 2;
        }

        [data-high-contrast="true"] *:focus {
          outline: 4px solid #000;
          outline-offset: 3px;
        }

        /* Reduced motion */
        [data-reduced-motion="true"] * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }

        /* Skip link */
        .focus\\:not-sr-only:focus {
          position: absolute;
          width: auto;
          height: auto;
          padding: 0;
          margin: 0;
          overflow: visible;
          clip: auto;
          white-space: normal;
        }

        /* Keyboard navigation indicators */
        .keyboard-mode [data-time-slot]:hover,
        .keyboard-mode [data-appointment-id]:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        /* Focus ring animation */
        @keyframes focus-ring {
          0% { transform: scale(0.95); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        .keyboard-mode *:focus-within {
          animation: focus-ring 0.3s ease-out;
        }

        /* Announcement region */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }
      `}</style>
    </div>
  )
}
