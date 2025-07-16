'use client'

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { format, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { CalendarAccessibilityManager, useCalendarAccessibility } from './CalendarAccessibilityManager'
import { KeyboardNavigationHandler } from './KeyboardNavigationHandler'

export interface ARIAEnhancedCalendarProps {
  children: React.ReactNode
  currentDate: Date
  view: 'month' | 'week' | 'day'
  selectedDate?: Date
  appointments?: Array<{
    id: number
    start_time: string
    client_name: string
    service_name: string
    status: string
    barber_name?: string
  }>
  onDateChange: (date: Date) => void
  onViewChange: (view: 'month' | 'week' | 'day') => void
  onDateSelect: (date: Date) => void
  onAppointmentSelect?: (appointmentId: number) => void
  onAppointmentCreate?: (date: Date) => void
  onAppointmentEdit?: (appointmentId: number) => void
  onRefresh?: () => void
  className?: string
  enableKeyboardNavigation?: boolean
  enableFocusManagement?: boolean
}

export function ARIAEnhancedCalendar({
  children,
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
  className = '',
  enableKeyboardNavigation = true,
  enableFocusManagement = true
}: ARIAEnhancedCalendarProps) {
  const { announce, setFocus, currentFocus, isHighContrast } = useCalendarAccessibility()
  const [focusedElement, setFocusedElement] = useState<string | null>(null)
  const [announceRegionContent, setAnnounceRegionContent] = useState('')
  const calendarRef = useRef<HTMLDivElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)

  // Focus management
  const manageFocus = useCallback((elementId: string, announce: boolean = true) => {
    if (!enableFocusManagement) return

    const element = document.getElementById(elementId)
    if (element) {
      element.focus()
      setFocusedElement(elementId)
      setFocus(elementId)

      if (announce) {
        const label = element.getAttribute('aria-label') || 
                     element.getAttribute('title') ||
                     element.textContent?.trim() ||
                     'Element'
        
        setAnnounceRegionContent(`Focused on ${label}`)
      }
    }
  }, [enableFocusManagement, setFocus])

  // Enhanced announcement with live regions
  const announceToLiveRegion = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnounceRegionContent(message)
    
    // Also use the accessibility manager's announce function
    announce({
      type: 'status',
      message,
      priority
    })
  }, [announce])

  // Generate comprehensive calendar description
  const getCalendarDescription = useCallback(() => {
    const appointmentCount = appointments.filter(apt => 
      isSameDay(new Date(apt.start_time), selectedDate)
    ).length

    const viewDescription = {
      month: 'month view',
      week: 'week view',
      day: 'day view'
    }[view]

    const dateDescription = format(selectedDate, 'EEEE, MMMM d, yyyy')
    
    return `Calendar in ${viewDescription}. Currently viewing ${dateDescription}. ${appointmentCount} appointment${appointmentCount !== 1 ? 's' : ''} on this date.`
  }, [view, selectedDate, appointments])

  // Generate appointment summary for screen readers
  const getAppointmentSummary = useCallback((date: Date) => {
    const dayAppointments = appointments.filter(apt => 
      isSameDay(new Date(apt.start_time), date)
    )

    if (dayAppointments.length === 0) {
      return `No appointments on ${format(date, 'EEEE, MMMM d')}`
    }

    const summary = dayAppointments.map(apt => {
      const time = format(new Date(apt.start_time), 'h:mm a')
      return `${apt.service_name} with ${apt.client_name} at ${time}`
    }).join('. ')

    return `${dayAppointments.length} appointment${dayAppointments.length !== 1 ? 's' : ''} on ${format(date, 'EEEE, MMMM d')}: ${summary}`
  }, [appointments])

  // Week summary for week view
  const getWeekSummary = useCallback(() => {
    const weekStart = startOfWeek(currentDate)
    const weekEnd = endOfWeek(currentDate)
    
    const weekAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= weekStart && aptDate <= weekEnd
    })

    return `Week of ${format(weekStart, 'MMMM d')} to ${format(weekEnd, 'MMMM d, yyyy')}. ${weekAppointments.length} total appointments this week.`
  }, [currentDate, appointments])

  // Set up focus management on component mount
  useEffect(() => {
    if (enableFocusManagement && calendarRef.current) {
      // Set initial focus to the calendar container
      calendarRef.current.focus()
      
      // Announce calendar state
      announceToLiveRegion(getCalendarDescription(), 'polite')
    }
  }, [enableFocusManagement, getCalendarDescription, announceToLiveRegion])

  // Announce view changes
  useEffect(() => {
    announceToLiveRegion(`Switched to ${view} view. ${getCalendarDescription()}`, 'polite')
  }, [view, announceToLiveRegion, getCalendarDescription])

  // Announce date changes
  useEffect(() => {
    const summary = view === 'week' ? getWeekSummary() : getAppointmentSummary(selectedDate)
    announceToLiveRegion(summary, 'polite')
  }, [selectedDate, currentDate, view, getAppointmentSummary, getWeekSummary, announceToLiveRegion])

  // Handle focus events for better tracking
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement
      if (target.id) {
        setFocusedElement(target.id)
      }
    }

    const handleFocusOut = (event: FocusEvent) => {
      // Small delay to check if focus moved within calendar
      setTimeout(() => {
        const activeElement = document.activeElement
        if (!calendarRef.current?.contains(activeElement)) {
          setFocusedElement(null)
        }
      }, 0)
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)
    
    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    }
  }, [])

  // Generate unique IDs for ARIA relationships
  const calendarId = 'calendar-main'
  const navigationId = 'calendar-navigation'
  const contentId = 'calendar-content'
  const statusId = 'calendar-status'
  const liveRegionId = 'calendar-live-region'

  return (
    <div
      ref={calendarRef}
      className={`aria-enhanced-calendar ${className} ${isHighContrast ? 'high-contrast' : ''}`}
      role="application"
      aria-label="Calendar application"
      aria-describedby={`${statusId} ${liveRegionId}`}
      tabIndex={-1}
      id={calendarId}
    >
      {/* Skip navigation links */}
      <div className="sr-only">
        <a href={`#${navigationId}`} className="skip-link">
          Skip to calendar navigation
        </a>
        <a href={`#${contentId}`} className="skip-link">
          Skip to calendar content
        </a>
      </div>

      {/* Calendar status region */}
      <div
        id={statusId}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        {getCalendarDescription()}
      </div>

      {/* Live region for announcements */}
      <div
        id={liveRegionId}
        className="sr-only"
        aria-live="polite"
        aria-atomic="false"
      >
        {announceRegionContent}
      </div>

      {/* Navigation landmark */}
      <nav
        id={navigationId}
        aria-label="Calendar navigation"
        role="navigation"
        className="calendar-navigation-landmark"
      >
        {/* Navigation controls will be rendered here by children */}
      </nav>

      {/* Main content landmark */}
      <main
        ref={mainContentRef}
        id={contentId}
        aria-label={`Calendar ${view} view for ${format(currentDate, 'MMMM yyyy')}`}
        role="main"
        className="calendar-main-content"
        tabIndex={-1}
      >
        {/* Enhanced children with ARIA support */}
        <div
          role="region"
          aria-label="Calendar grid and appointments"
          aria-describedby={statusId}
        >
          {children}
        </div>
      </main>

      {/* Keyboard navigation handler */}
      {enableKeyboardNavigation && (
        <KeyboardNavigationHandler
          currentDate={currentDate}
          view={view}
          selectedDate={selectedDate}
          appointments={appointments}
          onDateChange={onDateChange}
          onViewChange={onViewChange}
          onDateSelect={onDateSelect}
          onAppointmentSelect={onAppointmentSelect}
          onAppointmentCreate={onAppointmentCreate}
          onAppointmentEdit={onAppointmentEdit}
          onRefresh={onRefresh}
          enabled={true}
        />
      )}

      {/* Focus indicator for high contrast mode */}
      {isHighContrast && focusedElement && (
        <div
          className="focus-indicator"
          aria-hidden="true"
          style={{
            position: 'absolute',
            border: '3px solid yellow',
            pointerEvents: 'none',
            zIndex: 9999
          }}
        />
      )}

      {/* Appointment details region */}
      <aside
        role="complementary"
        aria-label="Appointment details"
        className="sr-only appointment-details-region"
        id="appointment-details"
      >
        {selectedDate && (
          <div>
            <h3>Appointments for {format(selectedDate, 'EEEE, MMMM d, yyyy')}</h3>
            {appointments
              .filter(apt => isSameDay(new Date(apt.start_time), selectedDate))
              .map(apt => (
                <div key={apt.id} role="article" aria-labelledby={`apt-${apt.id}-title`}>
                  <h4 id={`apt-${apt.id}-title`}>
                    {apt.service_name} with {apt.client_name}
                  </h4>
                  <p>
                    Time: {format(new Date(apt.start_time), 'h:mm a')}
                    {apt.barber_name && `, Barber: ${apt.barber_name}`}
                    Status: {apt.status}
                  </p>
                </div>
              ))}
          </div>
        )}
      </aside>

      {/* Contextual help */}
      <div
        role="region"
        aria-label="Keyboard shortcuts"
        className="sr-only keyboard-help-region"
        id="keyboard-help"
      >
        <h3>Keyboard shortcuts</h3>
        <ul>
          <li>Arrow keys: Navigate calendar</li>
          <li>Enter: Select date or appointment</li>
          <li>Space: Activate current item</li>
          <li>Tab: Move between focusable elements</li>
          <li>1, 2, 3: Switch to month, week, day view</li>
          <li>T: Go to today</li>
          <li>N: Create new appointment</li>
          <li>?: Show keyboard shortcuts help</li>
        </ul>
      </div>

      {/* Calendar summary for screen readers */}
      <div
        role="region"
        aria-label="Calendar summary"
        className="sr-only calendar-summary"
        id="calendar-summary"
      >
        <h3>Calendar Summary</h3>
        <p>
          Viewing {view} view for {format(currentDate, 'MMMM yyyy')}.
          Total appointments: {appointments.length}.
          Use arrow keys to navigate, Enter to select, and ? for help.
        </p>
      </div>
    </div>
  )
}

// HOC for easy integration with existing calendar components
export function withARIAEnhancements<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function ARIAEnhancedComponent(props: P & ARIAEnhancedCalendarProps) {
    const {
      currentDate,
      view,
      selectedDate,
      appointments,
      onDateChange,
      onViewChange,
      onDateSelect,
      onAppointmentSelect,
      onAppointmentCreate,
      onAppointmentEdit,
      onRefresh,
      enableKeyboardNavigation,
      enableFocusManagement,
      ...componentProps
    } = props

    return (
      <CalendarAccessibilityManager>
        <ARIAEnhancedCalendar
          currentDate={currentDate}
          view={view}
          selectedDate={selectedDate}
          appointments={appointments}
          onDateChange={onDateChange}
          onViewChange={onViewChange}
          onDateSelect={onDateSelect}
          onAppointmentSelect={onAppointmentSelect}
          onAppointmentCreate={onAppointmentCreate}
          onAppointmentEdit={onAppointmentEdit}
          onRefresh={onRefresh}
          enableKeyboardNavigation={enableKeyboardNavigation}
          enableFocusManagement={enableFocusManagement}
        >
          <WrappedComponent {...(componentProps as P)} />
        </ARIAEnhancedCalendar>
      </CalendarAccessibilityManager>
    )
  }
}

export default ARIAEnhancedCalendar