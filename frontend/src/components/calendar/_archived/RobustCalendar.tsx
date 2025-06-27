'use client'

import React, { useState, useEffect, useCallback } from 'react'
import PremiumCalendar, { CalendarAppointment, CalendarProps } from './PremiumCalendar'
import GoogleCalendarSync from './GoogleCalendarSync'
import { GoogleCalendarProvider, useGoogleCalendar } from '@/contexts/GoogleCalendarContext'
import { useTheme } from '@/contexts/ThemeContext'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline'
import { GoogleCalendarEvent, mapGoogleEventToAppointment } from '@/lib/google-calendar/types'

interface RobustCalendarProps extends CalendarProps {
  enableGoogleSync?: boolean
  onGoogleSyncStateChange?: (isSyncing: boolean) => void
}

function RobustCalendarContent({
  appointments: localAppointments = [],
  onAppointmentClick,
  onTimeSlotClick,
  onCreateAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
  enableGoogleSync = true,
  onGoogleSyncStateChange,
  ...calendarProps
}: RobustCalendarProps) {
  const { theme, getThemeColors } = useTheme()
  const colors = getThemeColors()

  const [mergedAppointments, setMergedAppointments] = useState<CalendarAppointment[]>(localAppointments)
  const [googleEvents, setGoogleEvents] = useState<CalendarAppointment[]>([])
  const [showSyncStatus, setShowSyncStatus] = useState(false)

  // Google Calendar context (only available if wrapped in provider)
  const googleCalendar = enableGoogleSync ? useGoogleCalendar() : null

  // Merge local and Google appointments
  useEffect(() => {
    const allAppointments = [...localAppointments]

    // Add Google events that don't exist locally
    googleEvents.forEach(googleEvent => {
      const existsLocally = localAppointments.some(local =>
        local.id === googleEvent.id ||
        (local.date === googleEvent.date &&
         local.startTime === googleEvent.startTime &&
         local.client === googleEvent.client)
      )

      if (!existsLocally) {
        allAppointments.push({
          ...googleEvent,
          // Mark as synced from Google
          __source: 'google' as any
        })
      }
    })

    setMergedAppointments(allAppointments)
  }, [localAppointments, googleEvents])

  // Handle Google event callbacks
  const handleGoogleEventCreated = useCallback((event: GoogleCalendarEvent) => {
    const appointment = mapGoogleEventToAppointment(event)
    if (appointment) {
      setGoogleEvents(prev => [...prev, appointment as CalendarAppointment])
    }
  }, [])

  const handleGoogleEventUpdated = useCallback((event: GoogleCalendarEvent) => {
    const appointment = mapGoogleEventToAppointment(event)
    if (appointment && appointment.id) {
      setGoogleEvents(prev =>
        prev.map(apt => apt.id === appointment.id ? { ...apt, ...appointment } : apt)
      )
    }
  }, [])

  const handleGoogleEventDeleted = useCallback((eventId: string) => {
    setGoogleEvents(prev => prev.filter(apt => apt.id !== eventId))
  }, [])

  // Enhanced appointment handlers with Google sync
  const handleCreateAppointment = useCallback(async (date: string, time: string) => {
    // Call original handler
    onCreateAppointment?.(date, time)

    // If Google sync is enabled and user is signed in, prompt to sync
    if (googleCalendar?.authState.isSignedIn) {
      setShowSyncStatus(true)
      setTimeout(() => setShowSyncStatus(false), 3000)
    }
  }, [onCreateAppointment, googleCalendar])

  const handleUpdateAppointment = useCallback(async (appointment: CalendarAppointment) => {
    // Call original handler
    onUpdateAppointment?.(appointment)

    // Sync to Google if enabled
    if (googleCalendar?.authState.isSignedIn && appointment.__googleEventId) {
      try {
        await googleCalendar.updateEvent(
          appointment.__googleEventId as string,
          appointment
        )
      } catch (error) {
        console.error('Failed to sync update to Google:', error)
      }
    }
  }, [onUpdateAppointment, googleCalendar])

  const handleDeleteAppointment = useCallback(async (appointmentId: string) => {
    const appointment = mergedAppointments.find(apt => apt.id === appointmentId)

    // Call original handler
    onDeleteAppointment?.(appointmentId)

    // Delete from Google if it's a synced event
    if (googleCalendar?.authState.isSignedIn && appointment?.__googleEventId) {
      try {
        await googleCalendar.deleteEvent(appointment.__googleEventId as string)
      } catch (error) {
        console.error('Failed to delete from Google:', error)
      }
    }
  }, [onDeleteAppointment, googleCalendar, mergedAppointments])

  // Sync status indicator
  const SyncStatusIndicator = () => {
    if (!googleCalendar || !showSyncStatus) return null

    const { syncState } = googleCalendar

    return (
      <div className="fixed bottom-4 right-4 bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700 z-50 animate-fade-in">
        <div className="flex items-center space-x-3">
          {syncState.isSyncing ? (
            <>
              <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-400" />
              <span className="text-sm text-gray-100">Syncing with Google Calendar...</span>
            </>
          ) : syncState.syncError ? (
            <>
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <span className="text-sm text-gray-100">Sync failed</span>
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
              <span className="text-sm text-gray-100">Synced with Google Calendar</span>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Google Calendar Sync Panel */}
      {enableGoogleSync && (
        <div className="mb-4">
          <GoogleCalendarSync />
        </div>
      )}

      {/* Calendar Component */}
      <PremiumCalendar
        {...calendarProps}
        appointments={mergedAppointments}
        onAppointmentClick={onAppointmentClick}
        onTimeSlotClick={onTimeSlotClick}
        onCreateAppointment={handleCreateAppointment}
        onUpdateAppointment={handleUpdateAppointment}
        onDeleteAppointment={handleDeleteAppointment}
      />

      {/* Sync Status Indicator */}
      <SyncStatusIndicator />

      {/* Custom styles for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

// Main component wrapped with Google Calendar Provider
export default function RobustCalendar(props: RobustCalendarProps) {
  if (!props.enableGoogleSync) {
    return <RobustCalendarContent {...props} />
  }

  return (
    <GoogleCalendarProvider
      onGoogleEventCreated={(event) => {
        // Handle Google event created
        console.log('Google event created:', event)
      }}
      onGoogleEventUpdated={(event) => {
        // Handle Google event updated
        console.log('Google event updated:', event)
      }}
      onGoogleEventDeleted={(eventId) => {
        // Handle Google event deleted
        console.log('Google event deleted:', eventId)
      }}
    >
      <RobustCalendarContent {...props} />
    </GoogleCalendarProvider>
  )
}
