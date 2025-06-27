'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import UnifiedCalendar from '@/components/calendar/UnifiedCalendar'
import BookingFlow from '@/components/booking/BookingFlow'
import { NewAppointmentModal, EditAppointmentModal, DeleteAppointmentModal } from '@/components/modals'
import EnhancedCreateAppointmentModal from '@/components/modals/EnhancedCreateAppointmentModal'
import { appointmentsService } from '@/lib/api/appointments'
import { barbersService } from '@/lib/api/barbers'
import { servicesService } from '@/lib/api/services'
import { calendarBookingIntegration, CalendarHelpers, type CalendarAppointment } from '@/lib/api/calendar-booking-integration'
import type { Booking } from '@/lib/api/bookings'
import type { Service } from '@/lib/api/services'
import type { BarberProfile } from '@/lib/api/barbers'
import { useTheme } from '@/contexts/ThemeContext'
import ThemeSelector from '@/components/ThemeSelector'
import { CalendarIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

// Import new systems - temporarily commented out
// import { errorManager, AppointmentError, SystemError } from '@/lib/error-handling'
// import { loadingManager } from '@/lib/loading/loading-manager'
// import { availabilityService } from '@/lib/availability'
// import { appointmentValidator } from '@/lib/validation/appointment-validation'

// Use the CalendarAppointment interface from the integration layer

// Map appointment status to display status
const mapAppointmentStatus = (status: string): CalendarAppointment['status'] => {
  const statusMap: Record<string, CalendarAppointment['status']> = {
    'scheduled': 'scheduled',
    'confirmed': 'confirmed',
    'in_progress': 'in_progress',
    'completed': 'completed',
    'cancelled': 'cancelled',
    'no_show': 'no_show',
    'pending': 'scheduled' // Map pending to scheduled
  }
  return statusMap[status] || 'scheduled'
}

// Note: mapToModernCalendarFormat removed - UnifiedCalendar uses appointments directly

export default function CalendarPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'calendar' | 'recurring'>('calendar')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([])
  const [barbers, setBarbers] = useState<Array<{ id: number; name: string; status: string }>>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'appointment' | 'system' | null>(null)
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, CalendarAppointment>>(new Map())
  const [availabilityCache, setAvailabilityCache] = useState<Map<string, boolean>>(new Map())

  // Global theme management
  const { theme, getThemeColors } = useTheme()
  const colors = getThemeColors()

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showBookingFlow, setShowBookingFlow] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null)

  // Debug modal state changes
  useEffect(() => {
    console.log('🎭 Modal states changed:', { showCreateModal, showDetailsModal })
    if (showCreateModal) {
      console.log('✅ Create modal should be visible now!')
      console.log('📍 Selected slot:', selectedSlot)
    }
    if (showDetailsModal) {
      console.log('✅ Details modal should be visible now!')
      console.log('📍 Selected appointment:', selectedAppointment)
    }
  }, [showCreateModal, showDetailsModal, selectedSlot, selectedAppointment])
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day' | 'agenda'>('week')

  // Date range for fetching appointments
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    return {
      start: startOfWeek.toISOString().split('T')[0],
      end: endOfWeek.toISOString().split('T')[0]
    }
  })

  // Check if we're in demo mode
  const [isDemoMode, setIsDemoMode] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const demoMode = window.location.search.includes('demo=true') ||
                     sessionStorage.getItem('demo_mode') === 'true' ||
                     window.location.pathname.includes('/app/')
      setIsDemoMode(demoMode)
      console.log('📱 Calendar page demo mode check:', demoMode)

      // If backend is not available, enable demo mode
      if (demoMode) {
        sessionStorage.setItem('demo_mode', 'true')
      }
    }
  }, [])

  // Fetch appointments from API using the integration layer with enhanced error handling
  const fetchAppointments = useCallback(async () => {
    // Skip API calls in demo mode - let UnifiedCalendar handle mock data
    if (isDemoMode) {
      console.log('📱 Demo mode: Skipping API call, UnifiedCalendar will use mock data')
      setAppointments([])
      setLoading(false)
      // Clear any existing error state when in demo mode
      setError(null)
      setErrorType(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      setErrorType(null)

      // Use the calendar-booking integration for enhanced appointment data
      const calendarAppointments = await calendarBookingIntegration.getCalendarAppointments({
        startDate: dateRange.start,
        endDate: dateRange.end,
        timezone: 'America/New_York'
      })

      setAppointments(calendarAppointments)
    } catch (err: any) {
      console.error('Error fetching appointments:', err)

      // Check if it's a connection error (backend not running)
      if (err.message?.includes('ERR_CONNECTION_TIMED_OUT') ||
          err.message?.includes('Network Error') ||
          err.code === 'ECONNREFUSED' ||
          err.message?.includes('fetch')) {
        console.log('🔄 Backend not available, switching to demo mode')
        setIsDemoMode(true)
        setAppointments([])
        setError(null)
        setErrorType(null)
      } else {
        setError('Failed to load appointments')
        setErrorType('system')
      }
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  // Fetch barbers from API
  const fetchBarbers = useCallback(async () => {
    // Use mock barbers in demo mode
    if (isDemoMode) {
      console.log('📱 Demo mode: Using mock barbers')
      setBarbers([
        { id: 1, name: 'Marcus Johnson', status: 'online' },
        { id: 2, name: 'Sarah Mitchell', status: 'online' },
        { id: 3, name: 'Tony Rodriguez', status: 'offline' },
        { id: 4, name: 'Amanda Chen', status: 'online' }
      ])
      return
    }

    try {
      const response = await barbersService.getBarbers({ is_active: true })
      // Handle both paginated response and direct array response (for mock data)
      const barbersData = Array.isArray(response) ? response : (response?.data || [])

      // Ensure barbersData is an array before mapping
      if (Array.isArray(barbersData)) {
        const barberList = barbersData.map(barber => ({
          id: barber.id,
          name: `${barber.first_name} ${barber.last_name}`,
          status: barber.is_active ? 'online' : 'offline'
        }))
        setBarbers(barberList)
      } else {
        console.error('Invalid barbers data structure:', response)
        setBarbers([])
      }
    } catch (err) {
      console.error('Error fetching barbers:', err)
      // Set fallback mock data on error to prevent undefined errors
      setBarbers([
        { id: 1, name: 'John Doe', status: 'online' },
        { id: 2, name: 'Jane Smith', status: 'online' },
        { id: 3, name: 'Mike Johnson', status: 'offline' },
        { id: 4, name: 'Sarah Williams', status: 'online' }
      ])
    }
  }, [])

  // Fetch services from API
  const fetchServices = useCallback(async () => {
    try {
      const response = await servicesService.getServices({ is_active: true })
      setServices(response.data)
    } catch (err) {
      console.error('Error fetching services:', err)
    }
  }, [])


  // Initial data load - wait for demo mode to be determined
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch data after demo mode is determined
  useEffect(() => {
    if (mounted && isDemoMode !== undefined) {
      // Clear error state immediately when demo mode is confirmed
      if (isDemoMode) {
        setError(null)
        setErrorType(null)
      }
      fetchAppointments()
      fetchBarbers()
      fetchServices()
    }
  }, [mounted, isDemoMode, fetchAppointments])

  // Refresh appointments when date range changes
  useEffect(() => {
    if (mounted) {
      fetchAppointments()
    }
  }, [dateRange, fetchAppointments, mounted])

  // Handler functions for modal interactions
  const handleNewAppointment = () => {
    console.log('🆕 New Appointment button clicked')
    setSelectedSlot(null)
    setShowCreateModal(true)
    console.log('🆕 showCreateModal set to true')
  }

  const handleAppointmentClick = (appointment: CalendarAppointment) => {
    console.log('📅 Calendar page received appointment click:', appointment.id, appointment.client)
    setSelectedAppointment(appointment)
    setShowDetailsModal(true)
    console.log('📅 showDetailsModal set to true')
  }

  const handleTimeSlotClick = (date: string, time: string) => {
    console.log('🕐 Calendar page received time slot click:', date, time)
    setSelectedSlot({ date, time })
    setShowCreateModal(true)
    console.log('🕐 showCreateModal set to true with slot:', { date, time })
  }

  const handleDateClick = (date: string) => {
    // When clicking on a date, show the create modal with the date pre-filled
    setSelectedSlot({ date, time: '09:00' }) // Default to 9 AM
    setShowCreateModal(true)
  }

  const handleAppointmentCreated = async (appointmentData: any) => {
    try {
      // Check if the appointment was already created by NewAppointmentModal
      // If so, just refresh the appointments list
      if (appointmentData.id) {
        console.log('Appointment created successfully:', appointmentData)

        // Apply optimistic update
        const optimisticAppointment = {
          ...appointmentData,
          id: appointmentData.id,
          status: 'confirmed' as const
        }

        setOptimisticUpdates(prev => {
          const newMap = new Map(prev)
          newMap.set(appointmentData.id, optimisticAppointment)
          return newMap
        })

        // Refresh appointments list to show the new appointment
        await fetchAppointments()

        // Clear optimistic update after successful fetch
        setOptimisticUpdates(prev => {
          const newMap = new Map(prev)
          newMap.delete(appointmentData.id)
          return newMap
        })

        // Close the modal
        setShowCreateModal(false)

        // Clear any errors
        setError(null)
        setErrorType(null)

        return
      }

      // Validate appointment data before creation
      const createData = {
        barberId: appointmentData.barber?.id || appointmentData.barberId,
        serviceId: appointmentData.service?.id || appointmentData.service_id,
        date: appointmentData.date || appointmentData.appointment_date,
        time: appointmentData.time || appointmentData.appointment_time,
        clientInfo: {
          name: appointmentData.clientInfo?.name || appointmentData.client_name,
          email: appointmentData.clientInfo?.email || appointmentData.client_email,
          phone: appointmentData.clientInfo?.phone || appointmentData.client_phone
        },
        notes: appointmentData.clientInfo?.notes || appointmentData.notes,
        duration: appointmentData.service?.duration || appointmentData.service_duration || 60,
        timezone: 'America/New_York'
      }

      const response = await calendarBookingIntegration.createCalendarAppointment(createData)

      // Refresh appointments list
      await fetchAppointments()
      setShowCreateModal(false)
      setShowBookingFlow(false)
      setError(null)
      setErrorType(null)

      // Show success message (you could add a toast notification here)
      console.log('Appointment created successfully:', response)
    } catch (err: any) {
      console.error('Error creating appointment:', err)
      setError('Failed to create appointment: ' + (err.message || 'Unknown error'))
      setErrorType('system')
    }
  }

  const handleAppointmentUpdated = async (updatedAppointment: CalendarAppointment) => {
    try {
      // Update via the integration layer with conflict detection
      const response = await calendarBookingIntegration.updateCalendarAppointment(
        updatedAppointment.id,
        updatedAppointment
      )

      // Refresh appointments list
      await fetchAppointments()
      setShowDetailsModal(false)

      console.log('Appointment updated successfully:', response)
    } catch (err: any) {
      console.error('Error updating appointment:', err)

      // Handle conflict suggestions
      if (err.suggestions?.length > 0) {
        setError(`Failed to update appointment: ${err.message}. Suggested alternatives available.`)
        // TODO: Show suggestions in a modal
      } else {
        setError('Failed to update appointment: ' + (err.message || 'Unknown error'))
      }
    }
  }

  const handleAppointmentDeleted = async (appointmentId: string) => {
    try {
      await calendarBookingIntegration.cancelCalendarAppointment(appointmentId, 'Cancelled via calendar')

      // Refresh appointments list
      await fetchAppointments()
      setShowDetailsModal(false)

      console.log('Appointment cancelled successfully')
    } catch (err: any) {
      console.error('Error deleting appointment:', err)
      setError('Failed to delete appointment: ' + (err.message || 'Unknown error'))
    }
  }

  const handleAppointmentDrop = async (appointmentId: string, newDate: string, newTime: string) => {
    try {
      // Reschedule appointment via integration layer with conflict detection
      const response = await calendarBookingIntegration.rescheduleAppointment(
        appointmentId,
        newDate,
        newTime,
        'Rescheduled via calendar drag and drop'
      )

      // Refresh appointments
      await fetchAppointments()

      console.log('Appointment rescheduled successfully:', response)
    } catch (err: any) {
      console.error('Error rescheduling appointment:', err)

      // Handle conflict suggestions
      if (err.suggestions?.length > 0) {
        setError(`Failed to reschedule appointment: ${err.message}. Suggested alternatives available.`)
        // TODO: Show suggestions in a modal
      } else {
        setError('Failed to reschedule appointment: ' + (err.message || 'Unknown error'))
      }
    }
  }

  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)
    const endDate = new Date(startDate.getTime() + duration * 60000)
    return endDate.toTimeString().slice(0, 5)
  }

  // Update date range when view changes
  const updateDateRange = (date: Date, view: 'week' | 'day' | 'month') => {
    let start: Date, end: Date

    if (view === 'day') {
      start = new Date(date)
      end = new Date(date)
    } else if (view === 'week') {
      start = new Date(date)
      start.setDate(date.getDate() - date.getDay())
      end = new Date(start)
      end.setDate(start.getDate() + 6)
    } else {
      // Month view
      start = new Date(date.getFullYear(), date.getMonth(), 1)
      end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    }

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    })
  }


  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        backgroundColor: colors.background
      }}>
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
          theme === 'soft-light' ? 'border-[#7c9885]' : 'border-teal-500'
        }`}></div>
      </div>
    )
  }

  const todayAppointments = appointments.filter(apt =>
    apt.date === new Date().toISOString().split('T')[0]
  )

  const weekRevenue = appointments.reduce((sum, apt) => {
    const serviceRevenue = apt.serviceRevenue || apt.price || 0
    const tipAmount = apt.tipAmount || 0
    const productRevenue = apt.productRevenue || 0
    return sum + serviceRevenue + tipAmount + productRevenue
  }, 0)

  const availableBarbers = barbers.filter(b => b.status === 'online').length

  return (
    <div className="min-h-screen" style={{
      backgroundColor: colors.background
    }}>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{
                color: colors.textPrimary
              }}>
                Calendar
              </h1>
              <p className="text-lg" style={{
                color: colors.textSecondary
              }}>
                Manage your appointments and schedule
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <ThemeSelector variant="button" showLabel={false} />
              <button
                onClick={(e) => {
                  console.log('🔍 DIAGNOSTIC: New Appointment button clicked!', e.target)
                  console.log('🔍 Current modal state before click:', showCreateModal)
                  handleNewAppointment()
                  // Force a re-render to ensure state update
                  setTimeout(() => {
                    console.log('🔍 Modal state after click:', showCreateModal)
                  }, 100)
                }}
                style={{ pointerEvents: 'auto', zIndex: 1000 }}
                className={`px-6 py-3 text-white font-medium rounded-lg transition-colors duration-200 ${
                  theme === 'soft-light'
                    ? 'bg-[#7c9885] hover:bg-[#6a8574]'
                    : theme === 'charcoal'
                    ? 'bg-gray-600 hover:bg-gray-500'
                    : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                New Appointment
              </button>
              <div className="flex rounded-lg p-1" style={{
                backgroundColor: theme === 'dark' ? '#374151' : theme === 'charcoal' ? '#2a2a2a' : '#f3f4f6'
              }}>
                <button
                  onClick={() => setViewMode('week')}
                  className="px-4 py-2 rounded-md font-medium transition-colors duration-200"
                  style={{
                    backgroundColor: viewMode === 'week' ? colors.cardBackground : 'transparent',
                    color: colors.textPrimary,
                    boxShadow: viewMode === 'week' ? colors.shadow : 'none'
                  }}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode('day')}
                  className="px-4 py-2 rounded-md font-medium transition-colors duration-200"
                  style={{
                    backgroundColor: viewMode === 'day' ? colors.cardBackground : 'transparent',
                    color: colors.textPrimary,
                    boxShadow: viewMode === 'day' ? colors.shadow : 'none'
                  }}
                >
                  Day
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 rounded-lg p-1" style={{
            backgroundColor: colors.cardBackground,
            border: `1px solid ${colors.border}`
          }}>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors duration-200 ${
                activeTab === 'calendar'
                  ? 'text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{
                backgroundColor: activeTab === 'calendar'
                  ? (theme === 'soft-light' ? '#7c9885' : theme === 'dark' ? '#14b8a6' : '#0f766e')
                  : 'transparent'
              }}
            >
              <CalendarIcon className="w-4 h-4" />
              Calendar View
            </button>
            <button
              onClick={() => setActiveTab('recurring')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors duration-200 ${
                activeTab === 'recurring'
                  ? 'text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{
                backgroundColor: activeTab === 'recurring'
                  ? (theme === 'soft-light' ? '#7c9885' : theme === 'dark' ? '#14b8a6' : '#0f766e')
                  : 'transparent'
              }}
            >
              <ArrowPathIcon className="w-4 h-4" />
              Recurring Series
            </button>
          </div>
        </div>

        {/* Enhanced Error Notification */}
        {error && (
          <div className="mb-6 rounded-lg p-4 border" style={{
            backgroundColor: errorType === 'appointment'
              ? (theme === 'dark' ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7')
              : (theme === 'dark' ? 'rgba(127, 29, 29, 0.3)' : '#fef2f2'),
            borderColor: errorType === 'appointment'
              ? (theme === 'dark' ? '#d97706' : '#f59e0b')
              : (theme === 'dark' ? '#991b1b' : '#fecaca'),
            color: errorType === 'appointment'
              ? (theme === 'dark' ? '#fbbf24' : '#92400e')
              : (theme === 'dark' ? '#fca5a5' : '#b91c1c')
          }}>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" style={{
                color: errorType === 'appointment'
                  ? (theme === 'dark' ? '#fbbf24' : '#d97706')
                  : (theme === 'dark' ? '#f87171' : '#dc2626')
              }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={errorType === 'appointment'
                    ? "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  } />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {errorType === 'appointment' ? 'Appointment Issue' : 'System Error'}
                </p>
                <p className="text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => {
                  setError(null)
                  setErrorType(null)
                }}
                className="ml-4 hover:opacity-75"
                style={{
                  color: errorType === 'appointment'
                    ? (theme === 'dark' ? '#fbbf24' : '#d97706')
                    : (theme === 'dark' ? '#f87171' : '#dc2626')
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'calendar' ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="rounded-lg border shadow-sm p-6" style={{
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
            boxShadow: colors.shadow
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{
                  color: colors.textSecondary
                }}>Today's Appointments</p>
                <p className="text-2xl font-bold mt-1" style={{
                  color: colors.textPrimary
                }}>{todayAppointments.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                backgroundColor: theme === 'dark' ? '#4b5563' : theme === 'charcoal' ? '#2a2a2a' : '#f3f4f6'
              }}>
                <svg className="w-5 h-5" style={{
                  color: colors.textSecondary
                }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-lg border shadow-sm p-6" style={{
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
            boxShadow: colors.shadow
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{
                  color: colors.textSecondary
                }}>Week Revenue</p>
                <p className="text-2xl font-bold mt-1" style={{
                  color: colors.textPrimary
                }}>${weekRevenue}</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                backgroundColor: theme === 'dark' ? 'rgba(13, 148, 136, 0.3)' :
                                theme === 'soft-light' ? 'rgba(124, 152, 133, 0.15)' :
                                theme === 'charcoal' ? 'rgba(107, 114, 128, 0.2)' : '#f0fdfa'
              }}>
                <svg className={`w-5 h-5 ${theme === 'soft-light' ? 'text-[#7c9885]' : theme === 'charcoal' ? 'text-gray-400' : 'text-teal-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-lg border shadow-sm p-6" style={{
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
            boxShadow: colors.shadow
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{
                  color: colors.textSecondary
                }}>Available Barbers</p>
                <p className="text-2xl font-bold mt-1" style={{
                  color: colors.textPrimary
                }}>{availableBarbers}</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                backgroundColor: theme === 'dark' ? '#4b5563' : theme === 'charcoal' ? '#2a2a2a' : '#f3f4f6'
              }}>
                <svg className="w-5 h-5" style={{
                  color: colors.textSecondary
                }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-lg border shadow-sm p-6" style={{
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
            boxShadow: colors.shadow
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{
                  color: colors.textSecondary
                }}>Completion Rate</p>
                <p className="text-2xl font-bold mt-1" style={{
                  color: colors.textPrimary
                }}>98%</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                backgroundColor: theme === 'dark' ? '#4b5563' : theme === 'charcoal' ? '#2a2a2a' : '#f3f4f6'
              }}>
                <svg className="w-5 h-5" style={{
                  color: colors.textSecondary
                }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Calendar */}
        <div className="rounded-lg border shadow-sm p-6 mb-8" style={{
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
          boxShadow: colors.shadow
        }}>
          <UnifiedCalendar
            appointments={appointments}
            onAppointmentClick={(appointment) => {
              handleAppointmentClick(appointment)
            }}
            onTimeSlotClick={handleTimeSlotClick}
            onAppointmentMove={handleAppointmentDrop}
            enableDragDrop={true}
            enableSearch={true}
            enableExport={true}
            enableKeyboardNavigation={true}
            showConflicts={true}
            allowConflicts={false}
            workingHours={{ start: '08:00', end: '20:00' }}
            initialView={calendarView === 'agenda' ? 'week' : calendarView as any}
          />
        </div>

        {/* Team Status */}
        <div className="rounded-lg border shadow-sm p-6" style={{
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
          boxShadow: colors.shadow
        }}>
          <h3 className="text-lg font-semibold mb-4" style={{
            color: colors.textPrimary
          }}>Team Status</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {barbers.map((barber) => (
              <div key={barber.id} className="flex items-center justify-between p-4 rounded-lg border" style={{
                backgroundColor: theme === 'dark' ? '#4b5563' : theme === 'charcoal' ? '#2a2a2a' : '#f9fafb',
                borderColor: colors.border
              }}>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    barber.status === 'online' ? (theme === 'soft-light' ? 'bg-[#7c9885]' : 'bg-teal-500') :
                    barber.status === 'busy' ? 'bg-gray-400' : 'bg-gray-600'
                  }`}></div>
                  <span className="font-medium" style={{
                    color: colors.textPrimary
                  }}>{barber.name}</span>
                </div>
                <span className="text-sm font-medium" style={{
                  color: barber.status === 'online'
                    ? '#0d9488'
                    : colors.textSecondary
                }}>
                  {barber.status}
                </span>
              </div>
            ))}
          </div>
        </div>
          </>
        ) : (
          /* Recurring Bookings Content */
          <div className="rounded-lg border shadow-sm p-6" style={{
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
            boxShadow: colors.shadow
          }}>
            <div className="text-center py-12">
              <ArrowPathIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textPrimary }}>
                Recurring Appointment Series
              </h3>
              <p className="text-gray-500 mb-6">
                Manage recurring bookings and subscription-based appointments
              </p>
              <button
                onClick={() => router.push('/recurring-bookings')}
                className="px-6 py-3 text-white font-medium rounded-lg transition-colors duration-200"
                style={{
                  backgroundColor: theme === 'soft-light'
                    ? '#7c9885'
                    : theme === 'dark'
                      ? '#14b8a6'
                      : '#0f766e'
                }}
              >
                Open Recurring Bookings Manager
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <BookingFlow
        isOpen={showBookingFlow}
        onClose={() => setShowBookingFlow(false)}
        selectedDate={selectedSlot?.date}
        selectedTime={selectedSlot?.time}
        onComplete={handleAppointmentCreated}
        theme="light"
        services={services}
        barbers={barbers.map(b => ({
          id: b.id,
          name: b.name,
          first_name: b.name.split(' ')[0],
          last_name: b.name.split(' ')[1] || '',
          is_active: b.status === 'online'
        }))}
      />

      <EnhancedCreateAppointmentModal
        isOpen={showCreateModal}
        onClose={() => {
          console.log('🚪 EnhancedCreateAppointmentModal closing')
          setShowCreateModal(false)
        }}
        selectedDate={selectedSlot?.date}
        selectedTime={selectedSlot?.time}
        onSuccess={handleAppointmentCreated}
        services={services}
        barbers={barbers.map(b => ({
          id: b.id,
          name: b.name,
          first_name: b.name.split(' ')[0],
          last_name: b.name.split(' ')[1] || '',
          is_active: b.status === 'online'
        }))}
      />

      <EditAppointmentModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        appointment={selectedAppointment}
        onUpdate={handleAppointmentUpdated}
        onDelete={handleAppointmentDeleted}
        onReschedule={async (id, newDate, newTime) => {
          await handleAppointmentDrop(id, newDate, newTime)
          setShowDetailsModal(false)
        }}
        onComplete={async (id) => {
          const appointment = appointments.find(apt => apt.id === id)
          if (appointment) {
            await handleAppointmentUpdated({
              ...appointment,
              status: 'completed'
            })
          }
        }}
        onCancel={async (id) => {
          await handleAppointmentDeleted(id)
        }}
      />
    </div>
  )
}
