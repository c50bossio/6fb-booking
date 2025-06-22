'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import EnterpriseCalendar from '@/components/calendar/EnterpriseCalendar'
import BookingFlow from '@/components/booking/BookingFlow'
import { CreateAppointmentModal, AppointmentDetailsModal } from '@/components/modals'
import { useState as useResponsiveState } from 'react'
import type { Booking } from '@/lib/api/bookings'

// Unified appointment interface
interface CalendarAppointment {
  id: string
  title: string
  client: string
  barber: string
  startTime: string
  endTime: string
  service: string
  price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled'
  date: string
  clientEmail?: string
  clientPhone?: string
  notes?: string
  confirmationNumber?: string
}

// Mock appointment data matching the calendar interface
const mockAppointments: CalendarAppointment[] = [
  {
    id: '1',
    title: 'John Doe - Haircut',
    client: 'John Doe',
    barber: 'Mike Johnson',
    startTime: '09:00',
    endTime: '10:00',
    service: 'Classic Haircut',
    price: 35,
    status: 'confirmed' as const,
    date: new Date().toISOString().split('T')[0],
    clientEmail: 'john.doe@email.com',
    clientPhone: '(555) 123-4567',
    notes: 'Regular customer, prefers shorter cut',
    confirmationNumber: 'BK123456'
  },
  {
    id: '2',
    title: 'Sarah Wilson - Fade Cut',
    client: 'Sarah Wilson',
    barber: 'Sarah Wilson',
    startTime: '14:30',
    endTime: '15:30',
    service: 'Fade Cut',
    price: 45,
    status: 'pending' as const,
    date: new Date().toISOString().split('T')[0],
    clientEmail: 'sarah.wilson@email.com',
    clientPhone: '(555) 987-6543',
    notes: 'First time client',
    confirmationNumber: 'BK123457'
  },
  {
    id: '3',
    title: 'Chris Brown - Beard Trim',
    client: 'Chris Brown',
    barber: 'Chris Brown',
    startTime: '16:00',
    endTime: '16:30',
    service: 'Beard Trim',
    price: 25,
    status: 'completed' as const,
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
    clientEmail: 'chris.brown@email.com',
    clientPhone: '(555) 456-7890',
    notes: 'Allergic to certain products',
    confirmationNumber: 'BK123458'
  }
]

const mockBarbers = [
  { id: 1, name: 'Marcus Johnson', status: 'online' as const },
  { id: 2, name: 'Sarah Mitchell', status: 'busy' as const },
  { id: 3, name: 'Alex Rodriguez', status: 'offline' as const }
]

export default function CalendarPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  const [appointments, setAppointments] = useState(mockAppointments)
  const [barbers, setBarbers] = useState(mockBarbers)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showBookingFlow, setShowBookingFlow] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null)
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day' | 'agenda'>('week')
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Handler functions for modal interactions
  const handleNewAppointment = () => {
    setSelectedSlot(null)
    setShowBookingFlow(true)
  }

  const handleAppointmentClick = (appointment: typeof mockAppointments[0]) => {
    setSelectedAppointment(appointment)
    setShowDetailsModal(true)
  }

  const handleTimeSlotClick = (date: string, time: string) => {
    setSelectedSlot({ date, time })
    setShowBookingFlow(true)
  }

  const handleAppointmentCreated = (booking: Booking) => {
    // Convert booking to appointment format and add to list
    const newAppointment = {
      id: booking.id,
      title: `${booking.client_info.name} - ${booking.service.name}`,
      client: booking.client_info.name,
      barber: booking.barber.name,
      startTime: booking.appointment_time,
      endTime: calculateEndTime(booking.appointment_time, booking.service.duration),
      service: booking.service.name,
      price: booking.service.price,
      status: booking.status as 'confirmed' | 'pending' | 'completed' | 'cancelled',
      date: booking.appointment_date,
      clientEmail: booking.client_info.email,
      clientPhone: booking.client_info.phone,
      notes: booking.notes,
      confirmationNumber: booking.confirmation_number
    }

    setAppointments(prev => [...prev, newAppointment])
    setShowBookingFlow(false)
  }

  const handleAppointmentUpdated = (updatedAppointment: typeof mockAppointments[0]) => {
    setAppointments(prev =>
      prev.map(apt => apt.id === updatedAppointment.id ? updatedAppointment : apt)
    )
    setShowDetailsModal(false)
  }

  const handleAppointmentDeleted = (appointmentId: string) => {
    setAppointments(prev => prev.filter(apt => apt.id !== appointmentId))
    setShowDetailsModal(false)
  }

  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)
    const endDate = new Date(startDate.getTime() + duration * 60000)
    return endDate.toTimeString().slice(0, 5)
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

  const weekRevenue = appointments.reduce((sum, apt) => sum + apt.price, 0)
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
              onAppointmentDrop={(id, date, time) => {
                console.log('Appointment dropped:', { id, date, time })
                // Handle appointment rescheduling
              }}
              view={calendarView}
              theme='dark'
              loading={false}
              error={null}
              onRefresh={async () => {
                setIsRefreshing(true)
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1000))
                setIsRefreshing(false)
              }}
              selectedBarbers={[]}
              availableBarbers={mockBarbers.map(b => ({
                id: b.name.toLowerCase().replace(' ', '-'),
                name: b.name,
                color: '#8b5cf6',
                status: b.status as 'online' | 'busy' | 'offline'
              }))}
              onBarberFilter={(barberIds) => {
                console.log('Filter by barbers:', barberIds)
              }}
              enableDragDrop={true}
              showToolbar={true}
              enableVirtualScroll={true}
              cacheData={true}
              realTimeUpdates={true}
              onExport={(format) => {
                console.log('Export calendar as:', format)
              }}
              onPrint={() => {
                window.print()
              }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterOptions={{}}
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
        onComplete={(bookingData) => {
          console.log('Booking completed:', bookingData)
          handleAppointmentCreated({
            id: Math.random().toString(),
            client_info: {
              name: bookingData.clientInfo?.name || '',
              email: bookingData.clientInfo?.email || '',
              phone: bookingData.clientInfo?.phone || ''
            },
            service: {
              name: bookingData.service?.name || '',
              duration: bookingData.service?.duration || 60,
              price: bookingData.service?.price || 0
            },
            barber: {
              name: bookingData.barber?.name || ''
            },
            appointment_time: bookingData.time || '',
            appointment_date: bookingData.date || '',
            status: 'confirmed',
            notes: bookingData.clientInfo?.notes || '',
            confirmation_number: 'BK' + Math.random().toString().substr(2, 6)
          })
        }}
        theme='dark'
      />

      <AppointmentDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        appointment={selectedAppointment}
        onUpdate={handleAppointmentUpdated}
        onDelete={handleAppointmentDeleted}
      />
    </div>
  )
}
