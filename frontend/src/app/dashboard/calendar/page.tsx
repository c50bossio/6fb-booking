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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
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
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Calendar
              </h1>
              <p className="text-lg text-gray-600">
                Manage your appointments and schedule
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleNewAppointment}
                className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors duration-200"
              >
                New Appointment
              </button>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 ${
                    viewMode === 'week'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 ${
                    viewMode === 'day'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
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
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-500"
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
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{todayAppointments.length}</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Week Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">${weekRevenue}</p>
              </div>
              <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available Barbers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{availableBarbers}</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">98%</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Calendar */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
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
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Status</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {barbers.map((barber) => (
              <div key={barber.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    barber.status === 'online' ? 'bg-teal-500' :
                    barber.status === 'busy' ? 'bg-gray-400' : 'bg-gray-600'
                  }`}></div>
                  <span className="font-medium text-gray-900">{barber.name}</span>
                </div>
                <span className={`text-sm font-medium ${
                  barber.status === 'online'
                    ? 'text-teal-600'
                    : 'text-gray-500'
                }`}>
                  {barber.status}
                </span>
              </div>
            ))}
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
    </div>
  )
}
