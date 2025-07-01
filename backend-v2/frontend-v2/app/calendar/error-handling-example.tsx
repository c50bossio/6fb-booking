'use client'

import React from 'react'
import { Calendar } from '@/components/calendar/CalendarWithErrorHandling'
import { CalendarErrorBoundary } from '@/components/calendar/CalendarErrorBoundary'
import { useRetry } from '@/lib/RetryManager'
import { apiClient } from '@/lib/api'
import type { CalendarView, Appointment } from '@/types/calendar'

export default function CalendarErrorHandlingExample() {
  const [view, setView] = React.useState<CalendarView>('month')
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(new Date())

  // Fetch appointments with retry logic
  const fetchAppointments = React.useCallback(async (): Promise<Appointment[]> => {
    const response = await apiClient.get('/appointments', {
      params: {
        date: selectedDate?.toISOString(),
        view: view
      }
    })
    
    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid response format')
    }
    
    return response.data
  }, [selectedDate, view])

  // Use retry hook for fetching data
  const {
    data: appointments,
    loading,
    error,
    execute: refetch,
    attempts
  } = useRetry(fetchAppointments, {
    maxRetries: 3,
    initialDelay: 1000,
    retryCondition: (error) => {
      // Only retry on network errors or 5xx server errors
      if (!navigator.onLine) return false
      if (error.response?.status >= 500) return true
      if (error.code === 'NETWORK_ERROR') return true
      return false
    },
    onRetry: (error, attemptNumber) => {
      console.log(`Retrying appointment fetch (attempt ${attemptNumber}):`, error.message)
    }
  })

  // Handle appointment updates
  const handleAppointmentUpdate = React.useCallback(async (
    appointmentId: number, 
    newStartTime: string
  ) => {
    const response = await apiClient.patch(`/appointments/${appointmentId}`, {
      start_time: newStartTime
    })
    
    // Refetch appointments after successful update
    await refetch()
    
    return response.data
  }, [refetch])

  // Handle appointment click
  const handleAppointmentClick = React.useCallback((appointment: Appointment) => {
    console.log('Clicked appointment:', appointment)
    // Open appointment details modal or navigate to details page
  }, [])

  // Handle creating new appointment
  const handleCreateAppointment = React.useCallback(() => {
    console.log('Create new appointment')
    // Open appointment creation modal
  }, [])

  return (
    <CalendarErrorBoundary 
      context="calendar-example"
      onError={(error, errorInfo) => {
        // Log to external monitoring service
        console.error('Calendar error caught by boundary:', error, errorInfo)
      }}
    >
      <div className="space-y-4 p-4">
        <h1 className="text-2xl font-bold">Calendar with Error Handling</h1>
        
        {/* View selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setView('day')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'day' 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'week' 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView('month')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'month' 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Month
          </button>
        </div>

        {/* Retry indicator */}
        {attempts > 1 && !loading && !error && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 p-3 rounded-lg text-sm">
            Successfully loaded after {attempts} attempts
          </div>
        )}

        {/* Calendar with comprehensive error handling */}
        <Calendar
          view={view}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          appointments={appointments || []}
          loading={loading}
          error={error}
          onRetry={refetch}
          onAppointmentClick={handleAppointmentClick}
          onAppointmentUpdate={handleAppointmentUpdate}
          onCreateAppointment={handleCreateAppointment}
          selectedBarberId="all"
        />

        {/* Debug panel (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h3 className="font-semibold mb-2">Debug Actions</h3>
            <div className="space-x-2">
              <button
                onClick={() => {
                  throw new Error('Test error boundary')
                }}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm"
              >
                Trigger Error
              </button>
              <button
                onClick={() => {
                  window.dispatchEvent(new Event('offline'))
                }}
                className="px-3 py-1 bg-amber-500 text-white rounded text-sm"
              >
                Simulate Offline
              </button>
              <button
                onClick={() => {
                  window.dispatchEvent(new Event('online'))
                }}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm"
              >
                Simulate Online
              </button>
            </div>
          </div>
        )}
      </div>
    </CalendarErrorBoundary>
  )
}