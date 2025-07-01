'use client'

import React from 'react'
import CalendarMonthView from '../CalendarMonthView'
import CalendarWeekView from '../CalendarWeekView'
import CalendarDayView from '../CalendarDayView'
import { CalendarErrorBoundary, withCalendarErrorBoundary } from './CalendarErrorBoundary'
import { CalendarSkeleton, CalendarEmptyState, CalendarErrorState } from './CalendarLoadingStates'
import { useRetry, useNetworkStatus } from '@/lib/RetryManager'
import type { CalendarView } from '@/types/calendar'

interface CalendarWithErrorHandlingProps {
  view: CalendarView
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  appointments?: any[]
  loading?: boolean
  error?: Error | null
  onRetry?: () => void
  // Props passed to the specific calendar view
  [key: string]: any
}

/**
 * Calendar wrapper that handles loading, error, and empty states
 */
export function CalendarWithErrorHandling({
  view,
  selectedDate,
  onDateSelect,
  appointments,
  loading = false,
  error = null,
  onRetry,
  ...otherProps
}: CalendarWithErrorHandlingProps) {
  const isOnline = useNetworkStatus()

  // Show loading state
  if (loading) {
    return <CalendarSkeleton view={view} />
  }

  // Show error state
  if (error) {
    return (
      <CalendarErrorState
        error={error.message}
        onRetry={onRetry}
        context={`${view} view`}
      />
    )
  }

  // Show empty state
  if (!appointments || appointments.length === 0) {
    return (
      <CalendarEmptyState
        view={view}
        selectedDate={selectedDate}
        onCreateAppointment={otherProps.onCreateAppointment}
      />
    )
  }

  // Render the appropriate calendar view
  const CalendarComponent = getCalendarComponent(view)
  
  return (
    <CalendarComponent
      selectedDate={selectedDate}
      onDateSelect={onDateSelect}
      appointments={appointments}
      {...otherProps}
    />
  )
}

function getCalendarComponent(view: CalendarView) {
  switch (view) {
    case 'day':
      return CalendarDayView
    case 'week':
      return CalendarWeekView
    case 'month':
    default:
      return CalendarMonthView
  }
}

// Export wrapped versions of each calendar view
export const CalendarMonthViewWithErrorBoundary = withCalendarErrorBoundary(
  CalendarMonthView,
  'month-view'
)

export const CalendarWeekViewWithErrorBoundary = withCalendarErrorBoundary(
  CalendarWeekView,
  'week-view'
)

export const CalendarDayViewWithErrorBoundary = withCalendarErrorBoundary(
  CalendarDayView,
  'day-view'
)

// Main calendar component with full error handling
export function Calendar(props: CalendarWithErrorHandlingProps) {
  return (
    <CalendarErrorBoundary context={`${props.view}-calendar`}>
      <CalendarWithErrorHandling {...props} />
    </CalendarErrorBoundary>
  )
}

// Hook for handling calendar data fetching with retry
export function useCalendarData(
  fetchFn: () => Promise<any[]>,
  dependencies: React.DependencyList = []
) {
  const [appointments, setAppointments] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const { execute, reset } = useRetry(fetchFn, {
    maxRetries: 3,
    retryCondition: (error) => {
      // Retry on network errors and 5xx errors
      return error.code === 'NETWORK_ERROR' || 
             (error.response && error.response.status >= 500)
    },
    onRetry: (error, attemptNumber) => {
      console.log(`Retrying calendar data fetch (attempt ${attemptNumber})`)
    }
  })

  const loadData = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await execute()

    if (result.success && result.data) {
      setAppointments(result.data)
    } else {
      setError(result.error || new Error('Failed to load calendar data'))
    }

    setLoading(false)
  }, [execute])

  React.useEffect(() => {
    loadData()
  }, dependencies)

  return {
    appointments,
    loading,
    error,
    retry: loadData,
    reset
  }
}

// Example usage component
export function CalendarExample() {
  const [view, setView] = React.useState<CalendarView>('month')
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(new Date())

  // Simulated API call
  const fetchAppointments = React.useCallback(async () => {
    const response = await fetch('/api/appointments')
    if (!response.ok) {
      throw new Error(`Failed to fetch appointments: ${response.statusText}`)
    }
    return response.json()
  }, [])

  const { appointments, loading, error, retry } = useCalendarData(
    fetchAppointments,
    [selectedDate]
  )

  return (
    <div className="space-y-4">
      {/* View selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('day')}
          className={`px-3 py-1 rounded ${view === 'day' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
        >
          Day
        </button>
        <button
          onClick={() => setView('week')}
          className={`px-3 py-1 rounded ${view === 'week' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
        >
          Week
        </button>
        <button
          onClick={() => setView('month')}
          className={`px-3 py-1 rounded ${view === 'month' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
        >
          Month
        </button>
      </div>

      {/* Calendar with error handling */}
      <Calendar
        view={view}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        appointments={appointments}
        loading={loading}
        error={error}
        onRetry={retry}
        onAppointmentClick={(apt: any) => console.log('Clicked appointment:', apt)}
        onCreateAppointment={() => console.log('Create new appointment')}
      />
    </div>
  )
}