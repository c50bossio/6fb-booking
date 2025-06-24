'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ModernCalendar from '@/components/ModernCalendar'
import BookingFlow from '@/components/booking/BookingFlow'
import { NewAppointmentModal, EditAppointmentModal, DeleteAppointmentModal } from '@/components/modals'
import { appointmentsService } from '@/lib/api/appointments'
import { barbersService } from '@/lib/api/barbers'
import { servicesService } from '@/lib/api/services'
import { calendarBookingIntegration, CalendarHelpers, type CalendarAppointment } from '@/lib/api/calendar-booking-integration'
import type { Booking } from '@/lib/api/bookings'
import type { Service } from '@/lib/api/services'
import type { BarberProfile } from '@/lib/api/barbers'

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

// Map CalendarAppointment to ModernCalendar format
const mapToModernCalendarFormat = (appointment: CalendarAppointment): any => ({
  id: appointment.id,
  title: appointment.title,
  client: appointment.client,
  barber: appointment.barber,
  startTime: appointment.startTime,
  endTime: appointment.endTime,
  service: appointment.service,
  price: appointment.price,
  status: appointment.status === 'scheduled' || appointment.status === 'in_progress' || appointment.status === 'no_show' ? 'confirmed' : appointment.status as any,
  date: appointment.date
})

export default function CalendarPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([])
  const [barbers, setBarbers] = useState<Array<{ id: number; name: string; status: string }>>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(true)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showBookingFlow, setShowBookingFlow] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null)
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

  // Fetch appointments from API using the integration layer
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Use the calendar-booking integration for enhanced appointment data
      const calendarAppointments = await calendarBookingIntegration.getCalendarAppointments({
        startDate: dateRange.start,
        endDate: dateRange.end,
        timezone: 'America/New_York'
      })

      setAppointments(calendarAppointments)
    } catch (err) {
      console.error('Error fetching appointments:', err)
      setError('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  // Fetch barbers from API
  const fetchBarbers = useCallback(async () => {
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

  // Initial data load
  useEffect(() => {
    setMounted(true)
    fetchAppointments()
    fetchBarbers()
    fetchServices()
  }, [])

  // Refresh appointments when date range changes
  useEffect(() => {
    if (mounted) {
      fetchAppointments()
    }
  }, [dateRange, fetchAppointments, mounted])

  // Handler functions for modal interactions
  const handleNewAppointment = () => {
    setSelectedSlot(null)
    setShowCreateModal(true)
  }

  const handleAppointmentClick = (appointment: CalendarAppointment) => {
    setSelectedAppointment(appointment)
    setShowDetailsModal(true)
  }

  const handleTimeSlotClick = (date: string, time: string) => {
    setSelectedSlot({ date, time })
    setShowCreateModal(true)
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

        // Refresh appointments list to show the new appointment
        await fetchAppointments()

        // Close the modal
        setShowCreateModal(false)

        // Clear any errors
        setError(null)

        return
      }

      // Otherwise, create appointment via the integration layer with enhanced validation
      // This path is used by BookingFlow
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

      // Show success message (you could add a toast notification here)
      console.log('Appointment created successfully:', response)
    } catch (err: any) {
      console.error('Error creating appointment:', err)

      // Handle conflict suggestions
      if (err.suggestions?.length > 0) {
        setError(`Failed to create appointment: ${err.message}. Suggested alternatives available.`)
        // TODO: Show suggestions in a modal
      } else {
        setError('Failed to create appointment: ' + (err.message || 'Unknown error'))
      }
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
      <div
        title="Calendar"
        description="Manage appointments and schedules"
      >
        <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
          darkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
        </div>
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
    <div
      title="Calendar"
      description="Manage appointments and schedules"
    >
      <div className={`min-h-screen transition-colors duration-300 ${
        darkMode ? 'bg-[#171717]' : 'bg-gray-50'
      }`}>
        {/* Subtle background texture */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500 rounded-full filter blur-3xl ${
            darkMode ? 'opacity-[0.03]' : 'opacity-[0.02]'
          }`}></div>
          <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-400 rounded-full filter blur-3xl ${
            darkMode ? 'opacity-[0.03]' : 'opacity-[0.02]'
          }`}></div>
        </div>

        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className={`text-3xl sm:text-4xl font-bold mb-2 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Calendar
                </h1>
                <p className={`text-lg ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Manage your appointments and schedule
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`px-4 py-3 font-medium rounded-lg border transition-all duration-200 ${
                    darkMode
                      ? 'bg-[#2a2a2a] hover:bg-[#333333] text-white border-[#404040] hover:border-emerald-500/50'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-emerald-500/40 shadow-sm'
                  }`}
                >
                  {darkMode ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleNewAppointment}
                  className={`px-6 py-3 font-medium rounded-lg border transition-all duration-200 ${
                    darkMode
                      ? 'bg-[#2a2a2a] hover:bg-[#333333] text-white border-[#404040] hover:border-emerald-500/50'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-emerald-500/40 shadow-sm'
                  }`}
                >
                  New Appointment
                </button>
                <div className={`flex rounded-lg p-1 border transition-colors duration-200 ${
                  darkMode
                    ? 'bg-[#2a2a2a] border-[#404040]'
                    : 'bg-gray-100 border-gray-200'
                }`}>
                  <button
                    onClick={() => setViewMode('week')}
                    className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                      viewMode === 'week'
                        ? darkMode
                          ? 'bg-[#333333] text-white border border-emerald-500/40'
                          : 'bg-white text-gray-900 border border-emerald-500/30 shadow-sm'
                        : darkMode
                          ? 'text-gray-300 hover:text-white hover:bg-[#333333]'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setViewMode('day')}
                    className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                      viewMode === 'day'
                        ? darkMode
                          ? 'bg-[#333333] text-white border border-emerald-500/40'
                          : 'bg-white text-gray-900 border border-emerald-500/30 shadow-sm'
                        : darkMode
                          ? 'text-gray-300 hover:text-white hover:bg-[#333333]'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Day
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Error Notification */}
          {error && (
            <div className={`mb-6 rounded-lg p-4 border ${
              darkMode
                ? 'bg-red-900/20 border-red-800/50'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center">
                <svg className={`w-5 h-5 mr-2 flex-shrink-0 ${
                  darkMode ? 'text-red-400' : 'text-red-600'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className={`text-sm ${
                  darkMode ? 'text-red-300' : 'text-red-700'
                }`}>{error}</p>
                <button
                  onClick={() => setError(null)}
                  className={`ml-auto ${
                    darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-500'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <div className={`rounded-lg p-6 border transition-all duration-200 ${
              darkMode
                ? 'bg-[#2a2a2a] border-[#404040] hover:bg-[#333333] hover:border-[#505050]'
                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:shadow-md'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>Today's Appointments</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>{todayAppointments.length}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  darkMode ? 'bg-[#333333] border border-[#505050]' : 'bg-gray-100 border border-gray-200'
                }`}>
                  <svg className={`w-5 h-5 ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className={`rounded-lg p-6 border transition-all duration-200 ${
              darkMode
                ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600'
                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:shadow-md'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Week Revenue</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    darkMode ? 'text-gray-100' : 'text-gray-900'
                  }`}>${weekRevenue}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  darkMode
                    ? 'bg-teal-500/10 border border-teal-500/20'
                    : 'bg-teal-50 border border-teal-200'
                }`}>
                  <svg className={`w-5 h-5 ${
                    darkMode ? 'text-teal-400' : 'text-teal-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>

            <div className={`rounded-lg p-6 border transition-all duration-200 ${
              darkMode
                ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600'
                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:shadow-md'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Available Barbers</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    darkMode ? 'text-gray-100' : 'text-gray-900'
                  }`}>{availableBarbers}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-100 border border-gray-200'
                }`}>
                  <svg className={`w-5 h-5 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className={`rounded-lg p-6 border transition-all duration-200 ${
              darkMode
                ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600'
                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:shadow-md'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Completion Rate</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    darkMode ? 'text-gray-100' : 'text-gray-900'
                  }`}>98%</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-100 border border-gray-200'
                }`}>
                  <svg className={`w-5 h-5 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Modern Calendar */}
          <div className={`rounded-lg p-6 mb-8 border ${
            darkMode
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <ModernCalendar
              appointments={appointments.map(mapToModernCalendarFormat)}
              onAppointmentClick={(appointment) => {
                // Find the original appointment with full data
                const fullAppointment = appointments.find(a => a.id === appointment.id)
                if (fullAppointment) {
                  handleAppointmentClick(fullAppointment)
                }
              }}
              onTimeSlotClick={handleTimeSlotClick}
              onDateClick={handleDateClick}
              view={calendarView === 'agenda' ? 'week' : calendarView as any}
              showCreateModal={showCreateModal}
            />
          </div>

          {/* Team Status */}
          <div className={`rounded-lg p-6 border ${
            darkMode
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>Team Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {barbers.map((barber) => (
                <div key={barber.id} className={`flex items-center justify-between p-4 rounded-lg border transition-colors duration-200 ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 hover:bg-gray-650'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      barber.status === 'online' ? 'bg-teal-500' :
                      barber.status === 'busy' ? 'bg-gray-400' : 'bg-gray-600'
                    }`}></div>
                    <span className={`font-medium ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>{barber.name}</span>
                  </div>
                  <span className={`text-sm font-medium ${
                    barber.status === 'online'
                      ? darkMode ? 'text-teal-400' : 'text-teal-600'
                      : darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {barber.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <BookingFlow
        isOpen={showBookingFlow}
        onClose={() => setShowBookingFlow(false)}
        selectedDate={selectedSlot?.date}
        selectedTime={selectedSlot?.time}
        onComplete={handleAppointmentCreated}
        theme={darkMode ? 'dark' : 'light'}
        services={services}
        barbers={barbers.map(b => ({
          id: b.id,
          name: b.name,
          first_name: b.name.split(' ')[0],
          last_name: b.name.split(' ')[1] || '',
          is_active: b.status === 'online'
        }))}
      />

      <NewAppointmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        selectedDate={selectedSlot?.date}
        selectedTime={selectedSlot?.time}
        onSuccess={handleAppointmentCreated}
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

      {/* Error Modal for backwards compatibility */}
      {error && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md">
          <div className={`rounded-lg p-4 border ${
            darkMode
              ? 'bg-red-900/20 border-red-800/50'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center">
              <svg className={`w-5 h-5 mr-2 flex-shrink-0 ${
                darkMode ? 'text-red-400' : 'text-red-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className={`text-sm ${
                darkMode ? 'text-red-300' : 'text-red-700'
              }`}>{error}</p>
              <button
                onClick={() => setError(null)}
                className={`ml-auto ${
                  darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-500'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
