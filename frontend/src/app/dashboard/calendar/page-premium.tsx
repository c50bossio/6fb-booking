'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ModernCalendar from '@/components/ModernCalendar'
import BookingFlow from '@/components/booking/BookingFlow'
import { NewAppointmentModal, EditAppointmentModal } from '@/components/modals'
import { appointmentsService } from '@/lib/api/appointments'
import { barbersService } from '@/lib/api/barbers'
import { servicesService } from '@/lib/api/services'
import { calendarBookingIntegration, type CalendarAppointment } from '@/lib/api/calendar-booking-integration'
import type { Service } from '@/lib/api/services'

const mapAppointmentStatus = (status: string): CalendarAppointment['status'] => {
  const statusMap: Record<string, CalendarAppointment['status']> = {
    'scheduled': 'scheduled',
    'confirmed': 'confirmed',
    'in_progress': 'in_progress',
    'completed': 'completed',
    'cancelled': 'cancelled',
    'no_show': 'no_show',
    'pending': 'scheduled'
  }
  return statusMap[status] || 'scheduled'
}

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

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
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

  const fetchBarbers = useCallback(async () => {
    try {
      const response = await barbersService.getBarbers({ is_active: true })
      const barbersData = Array.isArray(response) ? response : (response?.data || [])
      if (Array.isArray(barbersData)) {
        const barberList = barbersData.map(barber => ({
          id: barber.id,
          name: `${barber.first_name} ${barber.last_name}`,
          status: barber.is_active ? 'online' : 'offline'
        }))
        setBarbers(barberList)
      } else {
        setBarbers([])
      }
    } catch (err) {
      console.error('Error fetching barbers:', err)
      setBarbers([
        { id: 1, name: 'John Doe', status: 'online' },
        { id: 2, name: 'Jane Smith', status: 'online' },
        { id: 3, name: 'Mike Johnson', status: 'offline' },
        { id: 4, name: 'Sarah Williams', status: 'online' }
      ])
    }
  }, [])

  const fetchServices = useCallback(async () => {
    try {
      const response = await servicesService.getServices({ is_active: true })
      setServices(response.data)
    } catch (err) {
      console.error('Error fetching services:', err)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    fetchAppointments()
    fetchBarbers()
    fetchServices()
  }, [])

  useEffect(() => {
    if (mounted) {
      fetchAppointments()
    }
  }, [dateRange, fetchAppointments, mounted])

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
    setSelectedSlot({ date, time: '09:00' })
    setShowCreateModal(true)
  }

  const handleAppointmentCreated = async (appointmentData: any) => {
    try {
      if (appointmentData.id) {
        await fetchAppointments()
        setShowCreateModal(false)
        setError(null)
        return
      }

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
      await fetchAppointments()
      setShowCreateModal(false)
      setShowBookingFlow(false)
      setError(null)
    } catch (err: any) {
      console.error('Error creating appointment:', err)
      if (err.suggestions?.length > 0) {
        setError(`Failed to create appointment: ${err.message}. Suggested alternatives available.`)
      } else {
        setError('Failed to create appointment: ' + (err.message || 'Unknown error'))
      }
    }
  }

  const handleAppointmentUpdated = async (updatedAppointment: CalendarAppointment) => {
    try {
      const response = await calendarBookingIntegration.updateCalendarAppointment(
        updatedAppointment.id,
        updatedAppointment
      )
      await fetchAppointments()
      setShowDetailsModal(false)
    } catch (err: any) {
      console.error('Error updating appointment:', err)
      if (err.suggestions?.length > 0) {
        setError(`Failed to update appointment: ${err.message}. Suggested alternatives available.`)
      } else {
        setError('Failed to update appointment: ' + (err.message || 'Unknown error'))
      }
    }
  }

  const handleAppointmentDeleted = async (appointmentId: string) => {
    try {
      await calendarBookingIntegration.cancelCalendarAppointment(appointmentId, 'Cancelled via calendar')
      await fetchAppointments()
      setShowDetailsModal(false)
    } catch (err: any) {
      console.error('Error deleting appointment:', err)
      setError('Failed to delete appointment: ' + (err.message || 'Unknown error'))
    }
  }

  if (!mounted) {
    return (
      <div style={{ backgroundColor: darkMode ? '#171717' : '#f3f4f6', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ animation: 'spin 1s linear infinite', borderRadius: '50%', height: '3rem', width: '3rem', borderBottom: '2px solid #10b981' }}></div>
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
    <div style={{
      backgroundColor: darkMode ? '#171717' : '#f3f4f6',
      minHeight: '100vh',
      transition: 'all 0.3s ease'
    }}>
      {/* Subtle background texture */}
      <div style={{ position: 'absolute', inset: '0', overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute',
          top: '25%',
          left: '25%',
          width: '24rem',
          height: '24rem',
          backgroundColor: '#10b981',
          borderRadius: '50%',
          filter: 'blur(72px)',
          opacity: darkMode ? 0.03 : 0.02
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '25%',
          right: '25%',
          width: '24rem',
          height: '24rem',
          backgroundColor: '#059669',
          borderRadius: '50%',
          filter: 'blur(72px)',
          opacity: darkMode ? 0.03 : 0.02
        }}></div>
      </div>

      <div style={{ position: 'relative', zIndex: 10, padding: '2rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h1 style={{
                fontSize: '2.5rem',
                fontWeight: 'bold',
                marginBottom: '0.5rem',
                color: darkMode ? '#ffffff' : '#111827'
              }}>
                Calendar
              </h1>
              <p style={{
                fontSize: '1.125rem',
                color: darkMode ? '#ffffff' : '#374151'
              }}>
                Manage your appointments and schedule
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setDarkMode(!darkMode)}
                style={{
                  padding: '0.75rem 1rem',
                  fontWeight: '500',
                  borderRadius: '0.5rem',
                  border: '1px solid',
                  transition: 'all 0.2s ease',
                  backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                  borderColor: darkMode ? '#404040' : '#d1d5db',
                  color: darkMode ? '#ffffff' : '#374151',
                  cursor: 'pointer'
                }}
              >
                {darkMode ? (
                  <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <button
                onClick={handleNewAppointment}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontWeight: '500',
                  borderRadius: '0.5rem',
                  border: '1px solid',
                  transition: 'all 0.2s ease',
                  backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                  borderColor: darkMode ? '#404040' : '#d1d5db',
                  color: darkMode ? '#ffffff' : '#374151',
                  cursor: 'pointer'
                }}
              >
                New Appointment
              </button>
              <div style={{
                display: 'flex',
                borderRadius: '0.5rem',
                padding: '0.25rem',
                border: '1px solid',
                backgroundColor: darkMode ? '#2a2a2a' : '#f3f4f6',
                borderColor: darkMode ? '#404040' : '#d1d5db'
              }}>
                <button
                  onClick={() => setViewMode('week')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    backgroundColor: viewMode === 'week' ? (darkMode ? '#333333' : '#ffffff') : 'transparent',
                    border: viewMode === 'week' ? '1px solid' : 'none',
                    borderColor: viewMode === 'week' ? '#10b981' : 'transparent',
                    color: darkMode ? '#ffffff' : '#374151',
                    cursor: 'pointer'
                  }}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode('day')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    backgroundColor: viewMode === 'day' ? (darkMode ? '#333333' : '#ffffff') : 'transparent',
                    border: viewMode === 'day' ? '1px solid' : 'none',
                    borderColor: viewMode === 'day' ? '#10b981' : 'transparent',
                    color: darkMode ? '#ffffff' : '#374151',
                    cursor: 'pointer'
                  }}
                >
                  Day
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{
            marginBottom: '1.5rem',
            borderRadius: '0.5rem',
            padding: '1rem',
            border: '1px solid',
            backgroundColor: darkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
            borderColor: darkMode ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <svg style={{
                width: '1.25rem',
                height: '1.25rem',
                marginRight: '0.5rem',
                flexShrink: 0,
                color: darkMode ? '#f87171' : '#dc2626'
              }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p style={{
                fontSize: '0.875rem',
                color: darkMode ? '#fca5a5' : '#b91c1c'
              }}>{error}</p>
              <button
                onClick={() => setError(null)}
                style={{
                  marginLeft: 'auto',
                  color: darkMode ? '#f87171' : '#dc2626',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none'
                }}
              >
                <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            borderRadius: '0.5rem',
            padding: '1.5rem',
            border: '1px solid',
            transition: 'all 0.2s ease',
            backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
            borderColor: darkMode ? '#404040' : '#e5e7eb',
            boxShadow: darkMode ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: darkMode ? '#ffffff' : '#374151'
                }}>Today's Appointments</p>
                <p style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  marginTop: '0.25rem',
                  color: darkMode ? '#ffffff' : '#111827'
                }}>{todayAppointments.length}</p>
              </div>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: darkMode ? '#333333' : '#f3f4f6',
                border: '1px solid',
                borderColor: darkMode ? '#505050' : '#e5e7eb'
              }}>
                <svg style={{
                  width: '1.25rem',
                  height: '1.25rem',
                  color: darkMode ? '#ffffff' : '#374151'
                }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div style={{
            borderRadius: '0.5rem',
            padding: '1.5rem',
            border: '1px solid',
            transition: 'all 0.2s ease',
            backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
            borderColor: darkMode ? '#404040' : '#e5e7eb',
            boxShadow: darkMode ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: darkMode ? '#ffffff' : '#374151'
                }}>Week Revenue</p>
                <p style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  marginTop: '0.25rem',
                  color: darkMode ? '#ffffff' : '#111827'
                }}>${weekRevenue}</p>
              </div>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: darkMode ? 'rgba(16, 185, 129, 0.1)' : '#d1fae5',
                border: '1px solid',
                borderColor: darkMode ? 'rgba(16, 185, 129, 0.2)' : '#a7f3d0'
              }}>
                <svg style={{
                  width: '1.25rem',
                  height: '1.25rem',
                  color: darkMode ? '#10b981' : '#059669'
                }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div style={{
            borderRadius: '0.5rem',
            padding: '1.5rem',
            border: '1px solid',
            transition: 'all 0.2s ease',
            backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
            borderColor: darkMode ? '#404040' : '#e5e7eb',
            boxShadow: darkMode ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: darkMode ? '#ffffff' : '#374151'
                }}>Available Barbers</p>
                <p style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  marginTop: '0.25rem',
                  color: darkMode ? '#ffffff' : '#111827'
                }}>{availableBarbers}</p>
              </div>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: darkMode ? '#333333' : '#f3f4f6',
                border: '1px solid',
                borderColor: darkMode ? '#505050' : '#e5e7eb'
              }}>
                <svg style={{
                  width: '1.25rem',
                  height: '1.25rem',
                  color: darkMode ? '#ffffff' : '#374151'
                }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div style={{
            borderRadius: '0.5rem',
            padding: '1.5rem',
            border: '1px solid',
            transition: 'all 0.2s ease',
            backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
            borderColor: darkMode ? '#404040' : '#e5e7eb',
            boxShadow: darkMode ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: darkMode ? '#ffffff' : '#374151'
                }}>Completion Rate</p>
                <p style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  marginTop: '0.25rem',
                  color: darkMode ? '#ffffff' : '#111827'
                }}>98%</p>
              </div>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: darkMode ? '#333333' : '#f3f4f6',
                border: '1px solid',
                borderColor: darkMode ? '#505050' : '#e5e7eb'
              }}>
                <svg style={{
                  width: '1.25rem',
                  height: '1.25rem',
                  color: darkMode ? '#ffffff' : '#374151'
                }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Calendar */}
        <div style={{
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid',
          backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
          borderColor: darkMode ? '#404040' : '#e5e7eb',
          boxShadow: darkMode ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <ModernCalendar
            appointments={appointments.map(mapToModernCalendarFormat)}
            onAppointmentClick={(appointment) => {
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
        <div style={{
          borderRadius: '0.5rem',
          padding: '1.5rem',
          border: '1px solid',
          backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
          borderColor: darkMode ? '#404040' : '#e5e7eb',
          boxShadow: darkMode ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: darkMode ? '#ffffff' : '#111827'
          }}>Team Status</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {barbers.map((barber) => (
              <div key={barber.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid',
                transition: 'all 0.2s ease',
                backgroundColor: darkMode ? '#333333' : '#f9fafb',
                borderColor: darkMode ? '#505050' : '#e5e7eb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '0.75rem',
                    height: '0.75rem',
                    borderRadius: '50%',
                    backgroundColor: barber.status === 'online' ? '#10b981' :
                                   barber.status === 'busy' ? '#9ca3af' : '#6b7280'
                  }}></div>
                  <span style={{
                    fontWeight: '500',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}>{barber.name}</span>
                </div>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: barber.status === 'online' ?
                    (darkMode ? '#10b981' : '#059669') :
                    (darkMode ? '#9ca3af' : '#6b7280')
                }}>
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
          const response = await calendarBookingIntegration.rescheduleAppointment(
            id, newDate, newTime, 'Rescheduled via calendar'
          )
          await fetchAppointments()
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
