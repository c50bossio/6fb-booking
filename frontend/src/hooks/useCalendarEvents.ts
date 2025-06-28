import { useState, useEffect, useCallback } from 'react'
import { calendarService, CalendarEvent, CalendarFilters } from '@/lib/api/calendar'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/components/AuthProvider'

interface UseCalendarEventsOptions {
  startDate: Date
  endDate: Date
  filters?: CalendarFilters
  includeGoogleEvents?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseCalendarEventsReturn {
  events: CalendarEvent[]
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
  googleCalendarConnected: boolean
  toggleGoogleEvents: () => void
  showGoogleEvents: boolean
}

export function useCalendarEvents({
  startDate,
  endDate,
  filters,
  includeGoogleEvents = true,
  autoRefresh = true,
  refreshInterval = 60000 // 1 minute
}: UseCalendarEventsOptions): UseCalendarEventsReturn {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false)
  const [showGoogleEvents, setShowGoogleEvents] = useState(includeGoogleEvents)
  const { theme } = useTheme()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  // Check Google Calendar connection status
  useEffect(() => {
    const checkGoogleStatus = async () => {
      // Only check status if authenticated and not loading
      if (!isAuthenticated || authLoading) {
        console.log('[useCalendarEvents] Waiting for authentication before checking Google Calendar status')
        return
      }

      try {
        console.log('[useCalendarEvents] Checking Google Calendar status...')
        const status = await calendarService.getGoogleCalendarStatus()
        setGoogleCalendarConnected(status.data.connected)
      } catch (error) {
        console.warn('Failed to check Google Calendar status:', error)
      }
    }

    checkGoogleStatus()
  }, [isAuthenticated, authLoading])

  const fetchEvents = useCallback(async () => {
    // Don't fetch if not authenticated or still loading auth
    if (!isAuthenticated || authLoading) {
      console.log('[useCalendarEvents] Skipping fetch - waiting for authentication')
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('[useCalendarEvents] Fetching calendar events...')
      const response = await calendarService.getCalendarEvents(
        startDate,
        endDate,
        filters,
        { includeGoogleEvents: showGoogleEvents && googleCalendarConnected }
      )

      // Transform events for the calendar component
      const transformedEvents = response.data.map(event => {
        // Apply theme-specific styling for Google events
        if (event.id.startsWith('google_')) {
          return {
            ...event,
            color: theme === 'soft-light' ? '#7c9885' : '#4285f4',
            backgroundColor: theme === 'soft-light' ? 'rgba(124, 152, 133, 0.1)' : 'rgba(66, 133, 244, 0.1)',
            borderColor: theme === 'soft-light' ? '#7c9885' : '#4285f4',
            textColor: theme === 'soft-light' ? '#7c9885' : '#1a73e8'
          }
        }
        return event
      })

      setEvents(transformedEvents)
    } catch (error) {
      console.error('Failed to fetch calendar events:', error)
      setError(error as Error)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, filters, showGoogleEvents, googleCalendarConnected, theme, isAuthenticated, authLoading])

  // Initial fetch
  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchEvents, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchEvents])

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = calendarService.on('calendar_update', () => {
      fetchEvents()
    })

    return unsubscribe
  }, [fetchEvents])

  const toggleGoogleEvents = useCallback(() => {
    setShowGoogleEvents(prev => !prev)
  }, [])

  return {
    events,
    loading,
    error,
    refresh: fetchEvents,
    googleCalendarConnected,
    toggleGoogleEvents,
    showGoogleEvents
  }
}

// Transform CalendarEvent to the format expected by UnifiedCalendar
export function transformToCalendarAppointment(event: CalendarEvent): any {
  const appointment = event.appointment

  if (!appointment) {
    // Handle non-appointment events (like availability blocks)
    return null
  }

  return {
    id: event.id,
    title: event.title,
    client: appointment.clientName,
    clientId: appointment.clientId,
    barber: appointment.barberName,
    barberId: appointment.barberId,
    startTime: event.start.toTimeString().slice(0, 5),
    endTime: event.end.toTimeString().slice(0, 5),
    service: appointment.serviceName,
    serviceId: appointment.serviceId,
    price: appointment.servicePrice,
    status: event.status,
    date: event.start.toISOString().split('T')[0],
    notes: event.description,
    duration: appointment.serviceDuration,
    clientPhone: appointment.clientPhone,
    clientEmail: appointment.clientEmail,
    // Add Google Calendar indicator
    isGoogleEvent: event.id.startsWith('google_'),
    // Preserve event colors
    __eventColors: {
      color: event.color,
      backgroundColor: event.backgroundColor,
      borderColor: event.borderColor,
      textColor: event.textColor
    }
  }
}
