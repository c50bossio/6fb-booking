'use client'

import React, { useState, useEffect } from 'react'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'

import { EnterpriseCalendar } from '../calendar/EnterpriseCalendar'
import { SettingsPanel } from './SettingsPanel'
import { SettingsProvider, useUserPreferences, useTheme, useCalendarPreferences } from './SettingsProvider'
import { SettingsScope } from '@/lib/api/settings'

interface SettingsIntegratedCalendarProps {
  // Calendar props
  appointments?: any[]
  onAppointmentClick?: (appointment: any) => void
  onTimeSlotClick?: (date: string, time: string) => void
  onAppointmentDrop?: (appointmentId: string, newDate: string, newTime: string) => void
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  availableBarbers?: any[]

  // Settings integration props
  locationId?: number
  userRole?: string
  enableSettings?: boolean
}

// Internal component that uses settings context
function CalendarWithSettings({
  appointments = [],
  onAppointmentClick,
  onTimeSlotClick,
  onAppointmentDrop,
  loading = false,
  error = null,
  onRefresh,
  availableBarbers = [],
  locationId,
  userRole = 'barber',
  enableSettings = true
}: SettingsIntegratedCalendarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Use settings hooks
  const { preferences, isLoading: prefsLoading } = useUserPreferences()
  const { theme, themeColor, fontSize, highContrast } = useTheme()
  const {
    defaultView,
    showWeekends,
    timeFormat,
    dateFormat,
    timezone,
    startWeekOn
  } = useCalendarPreferences()

  // Determine settings scope based on user role
  const getSettingsScope = (): SettingsScope => {
    if (userRole === 'admin' || userRole === 'super_admin') {
      return locationId ? SettingsScope.LOCATION : SettingsScope.GLOBAL
    }
    return SettingsScope.USER
  }

  // Apply theme to document root when it changes
  useEffect(() => {
    const root = document.documentElement

    // Theme class
    root.className = root.className.replace(/\btheme-\w+\b/g, '')
    root.classList.add(`theme-${theme}`)

    // High contrast
    if (highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Custom properties
    root.style.setProperty('--primary-color', themeColor)
    root.style.setProperty('--font-size-base', fontSize)

  }, [theme, themeColor, fontSize, highContrast])

  // Generate working hours from preferences/settings
  const getWorkingHours = () => {
    // Default working hours - in a real implementation,
    // this would come from location settings
    return {
      start: '08:00',
      end: '20:00'
    }
  }

  // Generate time slot duration from preferences
  const getTimeSlotDuration = () => {
    // Default 30 minutes - would come from location settings
    return 30
  }

  // Format time based on user preferences
  const formatTime = (time: string) => {
    if (!preferences) return time

    const [hours, minutes] = time.split(':').map(Number)
    const date = new Date()
    date.setHours(hours, minutes)

    return date.toLocaleTimeString([], {
      hour12: timeFormat === '12h',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  // Format date based on user preferences
  const formatDate = (date: Date) => {
    if (!preferences) return date.toLocaleDateString()

    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone
    }

    switch (dateFormat) {
      case 'MM/DD/YYYY':
        options.month = '2-digit'
        options.day = '2-digit'
        options.year = 'numeric'
        break
      case 'DD/MM/YYYY':
        options.day = '2-digit'
        options.month = '2-digit'
        options.year = 'numeric'
        break
      case 'YYYY-MM-DD':
        options.year = 'numeric'
        options.month = '2-digit'
        options.day = '2-digit'
        break
      case 'relative':
        const today = new Date()
        const diffTime = date.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Tomorrow'
        if (diffDays === -1) return 'Yesterday'
        if (diffDays > 1 && diffDays <= 7) return date.toLocaleDateString([], { weekday: 'long' })
        break
    }

    return date.toLocaleDateString([], options)
  }

  if (prefsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Settings Button */}
      {enableSettings && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'bg-gray-800/80 text-gray-300 hover:text-white hover:bg-gray-700'
                : 'bg-white/80 text-gray-600 hover:text-gray-900 hover:bg-white'
            } backdrop-blur-sm border ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}
            title="Open Settings"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Enhanced Calendar with Settings Integration */}
      <EnterpriseCalendar
        appointments={appointments}
        onAppointmentClick={onAppointmentClick}
        onTimeSlotClick={onTimeSlotClick}
        onAppointmentDrop={onAppointmentDrop}

        // Settings-driven props
        view={defaultView}
        theme={theme === 'light' ? 'light' : 'dark'}
        loading={loading}
        error={error}
        onRefresh={onRefresh}

        // Calendar behavior from settings
        workingHours={getWorkingHours()}
        timeSlotDuration={getTimeSlotDuration()}
        showWeekends={showWeekends}

        // Performance settings
        enableDragDrop={preferences?.enable_animations ?? true}
        enableVirtualScroll={!preferences?.reduce_motion}
        compactMode={fontSize === 'small'}

        // Data and state
        availableBarbers={availableBarbers}
        selectedBarbers={[]}
        onBarberFilter={() => {}}

        // Features based on preferences
        showToolbar={true}
        cacheData={true}
        realTimeUpdates={preferences?.desktop_notifications ?? true}
      />

      {/* Settings Panel */}
      {isSettingsOpen && (
        <SettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          scope={getSettingsScope()}
          scopeId={locationId}
          title={`Settings - ${getSettingsScope() === SettingsScope.USER ? 'Personal' : 'Location'}`}
          theme={theme === 'light' ? 'light' : 'dark'}
        />
      )}

      {/* Settings Status Indicator */}
      {preferences && (
        <div className={`absolute bottom-4 left-4 text-xs px-3 py-1 rounded-full ${
          theme === 'dark'
            ? 'bg-gray-800/80 text-gray-400 border border-gray-700'
            : 'bg-white/80 text-gray-600 border border-gray-200'
        } backdrop-blur-sm`}>
          Theme: {theme} • View: {defaultView} • {timeFormat} • {showWeekends ? 'Weekends' : 'Weekdays'}
        </div>
      )}
    </div>
  )
}

// Main exported component with provider wrapper
export function SettingsIntegratedCalendar(props: SettingsIntegratedCalendarProps) {
  return (
    <SettingsProvider
      initialScope={props.userRole === 'admin' ? SettingsScope.LOCATION : SettingsScope.USER}
      initialScopeId={props.locationId}
    >
      <CalendarWithSettings {...props} />
    </SettingsProvider>
  )
}

// Export individual components for flexibility
export { CalendarWithSettings, SettingsProvider }

// Example usage component
export function SettingsCalendarDemo() {
  const [appointments] = useState([
    {
      id: '1',
      title: 'Haircut & Style',
      client: 'John Doe',
      barber: 'Marcus Johnson',
      startTime: '10:00',
      endTime: '11:00',
      service: 'Premium Cut',
      price: 85,
      status: 'confirmed',
      date: new Date().toISOString().split('T')[0],
      serviceColor: '#8b5cf6'
    },
    {
      id: '2',
      title: 'Beard Trim',
      client: 'Mike Smith',
      barber: 'Sarah Mitchell',
      startTime: '14:30',
      endTime: '15:00',
      service: 'Beard Styling',
      price: 35,
      status: 'confirmed',
      date: new Date().toISOString().split('T')[0],
      serviceColor: '#10b981'
    }
  ])

  const handleAppointmentClick = (appointment: any) => {
    console.log('Appointment clicked:', appointment)
  }

  const handleTimeSlotClick = (date: string, time: string) => {
    console.log('Time slot clicked:', date, time)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Settings-Integrated Enterprise Calendar
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          A fully configurable calendar system with comprehensive settings management.
          Click the settings icon to customize your experience.
        </p>
      </div>

      <SettingsIntegratedCalendar
        appointments={appointments}
        onAppointmentClick={handleAppointmentClick}
        onTimeSlotClick={handleTimeSlotClick}
        userRole="admin"
        locationId={1}
        enableSettings={true}
      />
    </div>
  )
}
