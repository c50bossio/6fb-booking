'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import EnterpriseCalendar from '@/components/calendar/EnterpriseCalendar'
import BookingFlow from '@/components/booking/BookingFlow'
import { CreateAppointmentModal, AppointmentDetailsModal } from '@/components/modals'
import { appointmentsService } from '@/lib/api/appointments'
import { barbersService } from '@/lib/api/barbers'
import { servicesService } from '@/lib/api/services'
import type { Booking } from '@/lib/api/bookings'
import type { Service } from '@/lib/api/services'
import type { BarberProfile } from '@/lib/api/barbers'

// Unified appointment interface for calendar
interface CalendarAppointment {
  id: string
  title: string
  client: string
  clientId?: number
  barber: string
  barberId: number
  startTime: string
  endTime: string
  service: string
  serviceId?: number
  price: number
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  date: string
  clientEmail?: string
  clientPhone?: string
  notes?: string
  confirmationNumber?: string
  serviceRevenue?: number
  tipAmount?: number
  productRevenue?: number
}

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
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

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

  // Fetch appointments from API
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await appointmentsService.getAppointmentsByDateRange(
        dateRange.start,
        dateRange.end
      )
      
      // Transform API appointments to calendar format
      const calendarAppointments: CalendarAppointment[] = response.map(apt => {
        // Calculate end time based on duration
        const [hours, minutes] = (apt.appointment_time || '09:00').split(':').map(Number)
        const startDate = new Date(apt.appointment_date)
        startDate.setHours(hours, minutes)
        const endDate = new Date(startDate.getTime() + (apt.service_duration || 60) * 60000)
        
        return {
          id: apt.id.toString(),
          title: `${apt.client_name} - ${apt.service_name}`,
          client: apt.client_name,
          clientId: apt.client_id,
          barber: apt.barber_name || 'Unknown',
          barberId: apt.barber_id,
          startTime: apt.appointment_time || '09:00',
          endTime: `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`,
          service: apt.service_name,
          serviceId: apt.service_id,
          price: apt.service_price || 0,
          status: mapAppointmentStatus(apt.status),
          date: apt.appointment_date,
          clientEmail: apt.client_email,
          clientPhone: apt.client_phone,
          notes: apt.notes,
          confirmationNumber: `BK${apt.id.toString().padStart(6, '0')}`,
          serviceRevenue: apt.service_revenue,
          tipAmount: apt.tip_amount,
          productRevenue: apt.product_revenue
        }
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
      const barberList = response.data.map(barber => ({
        id: barber.id,
        name: `${barber.first_name} ${barber.last_name}`,
        status: barber.is_active ? 'online' : 'offline'
      }))
      setBarbers(barberList)
    } catch (err) {
      console.error('Error fetching barbers:', err)
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
    setShowBookingFlow(true)
  }

  const handleAppointmentClick = (appointment: CalendarAppointment) => {
    setSelectedAppointment(appointment)
    setShowDetailsModal(true)
  }

  const handleTimeSlotClick = (date: string, time: string) => {
    setSelectedSlot({ date, time })
    setShowBookingFlow(true)
  }

  const handleAppointmentCreated = async (appointmentData: any) => {
    try {
      // Create appointment via API
      const createData = {
        barber_id: appointmentData.barber?.id || appointmentData.barberId,
        client_name: appointmentData.clientInfo?.name || appointmentData.client_name,
        client_email: appointmentData.clientInfo?.email || appointmentData.client_email,
        client_phone: appointmentData.clientInfo?.phone || appointmentData.client_phone,
        appointment_date: appointmentData.date || appointmentData.appointment_date,
        appointment_time: appointmentData.time || appointmentData.appointment_time,
        service_id: appointmentData.service?.id || appointmentData.service_id,
        service_name: appointmentData.service?.name || appointmentData.service_name,
        service_duration: appointmentData.service?.duration || appointmentData.service_duration || 60,
        service_price: appointmentData.service?.price || appointmentData.service_price || 0,
        notes: appointmentData.clientInfo?.notes || appointmentData.notes
      }
      
      const response = await appointmentsService.createAppointment(createData)
      
      // Refresh appointments list
      await fetchAppointments()
      setShowBookingFlow(false)
      
      // Show success message (you could add a toast notification here)
      console.log('Appointment created successfully:', response.data)
    } catch (err) {
      console.error('Error creating appointment:', err)
      setError('Failed to create appointment')
    }
  }

  const handleAppointmentUpdated = async (updatedAppointment: CalendarAppointment) => {
    try {
      // Update via API
      const updateData = {
        appointment_date: updatedAppointment.date,
        appointment_time: updatedAppointment.startTime,
        status: updatedAppointment.status as any,
        service_name: updatedAppointment.service,
        service_price: updatedAppointment.price,
        service_revenue: updatedAppointment.serviceRevenue,
        tip_amount: updatedAppointment.tipAmount,
        product_revenue: updatedAppointment.productRevenue,
        notes: updatedAppointment.notes,
        barber_id: updatedAppointment.barberId
      }
      
      await appointmentsService.updateAppointment(parseInt(updatedAppointment.id), updateData)
      
      // Refresh appointments list
      await fetchAppointments()
      setShowDetailsModal(false)
    } catch (err) {
      console.error('Error updating appointment:', err)
      setError('Failed to update appointment')
    }
  }

  const handleAppointmentDeleted = async (appointmentId: string) => {
    try {
      await appointmentsService.cancelAppointment(parseInt(appointmentId))
      
      // Refresh appointments list
      await fetchAppointments()
      setShowDetailsModal(false)
    } catch (err) {
      console.error('Error deleting appointment:', err)
      setError('Failed to delete appointment')
    }
  }

  const handleAppointmentDrop = async (appointmentId: string, newDate: string, newTime: string) => {
    try {
      // Reschedule appointment via API
      await appointmentsService.rescheduleAppointment(
        parseInt(appointmentId),
        newDate,
        newTime,
        'Rescheduled via calendar drag and drop'
      )
      
      // Refresh appointments
      await fetchAppointments()
    } catch (err) {
      console.error('Error rescheduling appointment:', err)
      setError('Failed to reschedule appointment')
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

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchAppointments()
    setIsRefreshing(false)
  }

  if (!mounted) {
    return (
      <div
        title="Calendar"
        description="Manage appointments and schedules"
      >
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
          </div>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                  Calendar
                </h1>
                <p className="text-gray-400 text-lg">
                  Manage your appointments and schedule
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleNewAppointment}
                  className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-purple-700 hover:shadow-lg hover:shadow-violet-500/25 transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  New Appointment
                </button>
                <div className="flex rounded-xl bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-1">
                  <button
                    onClick={() => setViewMode('week')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      viewMode === 'week'
                        ? 'bg-violet-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setViewMode('day')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      viewMode === 'day'
                        ? 'bg-violet-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Day
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:scale-105 hover:bg-gray-800/40 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Today's Appointments</p>
                  <p className="text-2xl font-bold text-white mt-1">{todayAppointments.length}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:scale-105 hover:bg-gray-800/40 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Week Revenue</p>
                  <p className="text-2xl font-bold text-white mt-1">${weekRevenue}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:scale-105 hover:bg-gray-800/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Available Barbers</p>
                  <p className="text-2xl font-bold text-white mt-1">{availableBarbers}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:scale-105 hover:bg-gray-800/40 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Completion Rate</p>
                  <p className="text-2xl font-bold text-white mt-1">98%</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Enterprise Calendar */}
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
            <EnterpriseCalendar
              appointments={appointments}
              onAppointmentClick={handleAppointmentClick}
              onTimeSlotClick={handleTimeSlotClick}
              onAppointmentDrop={handleAppointmentDrop}
              view={calendarView}
              theme='dark'
              loading={loading}
              error={error}
              onRefresh={handleRefresh}
              selectedBarbers={[]}
              availableBarbers={barbers.map(b => ({
                id: b.id.toString(),
                name: b.name,
                color: `#${Math.floor(Math.random()*16777215).toString(16)}`, // Generate random color
                status: b.status as 'online' | 'busy' | 'offline'
              }))}
              onBarberFilter={(barberIds) => {
                // Filter appointments by selected barbers
                if (barberIds.length > 0) {
                  const filtered = appointments.filter(apt => 
                    barberIds.includes(apt.barberId.toString())
                  )
                  setAppointments(filtered)
                } else {
                  fetchAppointments() // Reset to all appointments
                }
              }}
              enableDragDrop={true}
              showToolbar={true}
              enableVirtualScroll={true}
              cacheData={true}
              realTimeUpdates={true}
              onExport={(format) => {
                // Export functionality
                const data = appointments.map(apt => ({
                  Date: apt.date,
                  Time: apt.startTime,
                  Client: apt.client,
                  Service: apt.service,
                  Barber: apt.barber,
                  Status: apt.status,
                  Price: apt.price
                }))
                
                if (format === 'csv') {
                  // Convert to CSV
                  const csv = [
                    Object.keys(data[0]).join(','),
                    ...data.map(row => Object.values(row).join(','))
                  ].join('\n')
                  
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `appointments-${new Date().toISOString().split('T')[0]}.csv`
                  a.click()
                }
              }}
              onPrint={() => {
                window.print()
              }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterOptions={{}}
              onDateChange={(date) => {
                setSelectedDate(date)
                updateDateRange(date, viewMode)
              }}
              onViewChange={(view) => {
                setCalendarView(view)
                if (view === 'day' || view === 'week') {
                  updateDateRange(selectedDate, view)
                }
              }}
            />
          </div>

          {/* Team Status */}
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Team Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {barbers.map((barber) => (
                <div key={barber.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      barber.status === 'online' ? 'bg-green-500' :
                      barber.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`}></div>
                    <span className="text-white font-medium">{barber.name}</span>
                  </div>
                  <span className={`text-sm font-medium ${
                    barber.status === 'online' ? 'text-green-400' :
                    barber.status === 'busy' ? 'text-yellow-400' : 'text-gray-400'
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
        theme='dark'
        services={services}
        barbers={barbers.map(b => ({
          id: b.id,
          name: b.name,
          first_name: b.name.split(' ')[0],
          last_name: b.name.split(' ')[1] || '',
          is_active: b.status === 'online'
        }))}
      />

      <AppointmentDetailsModal
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
