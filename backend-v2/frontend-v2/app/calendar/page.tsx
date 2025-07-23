'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import SimpleCalendar, { type CalendarView } from '@/components/SimpleCalendar'
import CreateAppointmentModal from '@/components/modals/CreateAppointmentModal'
import { Button } from '@/components/ui/button'
import { PlusIcon } from '@heroicons/react/24/outline'
import { getMyBookings, getProfile, getAllUsers, type BookingResponse } from '@/lib/api'
import { handleAuthError } from '@/lib/auth-error-handler'

interface User {
  id: number
  name?: string
  first_name?: string
  last_name?: string
  email: string
  role?: string
}

interface Appointment {
  id: number
  start_time: string
  end_time?: string
  client_name: string
  service_name: string
  barber_name?: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  price?: number
  duration_minutes?: number
}

export default function SimplifiedCalendarPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<CalendarView>('week')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [barbers, setBarbers] = useState<User[]>([])
  const [selectedBarberId, setSelectedBarberId] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [preselectedTime, setPreselectedTime] = useState<string | undefined>(undefined)

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load user profile
        const userProfile = await getProfile()
        setUser(userProfile)

        // Load barbers for filter
        try {
          const allBarbers = await getAllUsers('barber')
          setBarbers(allBarbers || [])
        } catch (barberErr) {
          console.error('Failed to load barbers:', barberErr)
          setBarbers([])
        }

        // Load appointments
        const bookingsResponse = await getMyBookings()
        const bookings = bookingsResponse.bookings || []
        
        // Convert bookings to appointments format
        const convertedAppointments: Appointment[] = bookings.map((booking: BookingResponse) => ({
          id: booking.id,
          start_time: booking.start_time,
          end_time: booking.end_time,
          client_name: booking.client_name || 'Unknown Client',
          service_name: booking.service_name || 'Service',
          barber_name: booking.barber_name,
          status: booking.status as 'pending' | 'confirmed' | 'cancelled' | 'completed',
          price: booking.price,
          duration_minutes: booking.duration_minutes
        }))

        setAppointments(convertedAppointments)
      } catch (err) {
        console.error('Failed to load calendar data:', err)
        
        // Check if it's an authentication error
        if (handleAuthError(err, router)) {
          return
        }
        
        setError('Failed to load calendar data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  // Filter appointments by selected barber
  const filteredAppointments = appointments.filter(apt => {
    if (selectedBarberId === 'all') {
      return true
    }
    return apt.barber_name === barbers.find(b => b.id === selectedBarberId)?.name || 
           apt.barber_name === barbers.find(b => b.id === selectedBarberId)?.first_name
  })

  // Handle appointment click
  const handleAppointmentClick = (appointment: Appointment) => {
    console.log('Appointment clicked:', appointment)
    // TODO: Open appointment details modal
  }

  // Handle time slot click
  const handleTimeSlotClick = (date: Date) => {
    setSelectedDate(date)
    setPreselectedTime(format(date, 'HH:mm'))
    setShowCreateModal(true)
  }

  // Handle day click
  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    setPreselectedTime('09:00')
    setShowCreateModal(true)
  }

  // Calculate today's stats
  const todayAppointments = appointments.filter(apt => {
    try {
      const aptDate = new Date(apt.start_time)
      const today = new Date()
      return aptDate.toDateString() === today.toDateString()
    } catch {
      return false
    }
  })

  const todayRevenue = todayAppointments
    .filter(apt => apt.status === 'completed')
    .reduce((sum, apt) => sum + (apt.price || 0), 0)

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Calendar</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-3"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600">Manage your appointments and schedule</p>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-600">Today's Appointments</div>
            <div className="text-2xl font-bold text-blue-900">{todayAppointments.length}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-600">Today's Revenue</div>
            <div className="text-2xl font-bold text-green-900">${todayRevenue.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          New Appointment
        </Button>

        {/* Barber Filter */}
        {barbers.length > 0 && (
          <select
            value={selectedBarberId}
            onChange={(e) => setSelectedBarberId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="all">All Barbers</option>
            {barbers.map(barber => (
              <option key={barber.id} value={barber.id}>
                {barber.first_name || barber.name || barber.email}
              </option>
            ))}
          </select>
        )}

        <div className="text-sm text-gray-500">
          Showing {filteredAppointments.length} appointments
        </div>
      </div>

      {/* Calendar */}
      <SimpleCalendar
        view={view}
        onViewChange={setView}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        appointments={filteredAppointments}
        onAppointmentClick={handleAppointmentClick}
        onTimeSlotClick={handleTimeSlotClick}
        onDayClick={handleDayClick}
        isLoading={false}
        className="h-[600px]"
      />

      {/* Create Appointment Modal */}
      <CreateAppointmentModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setPreselectedTime(undefined)
          setSelectedDate(null)
        }}
        preselectedDate={selectedDate || undefined}
        preselectedTime={preselectedTime}
        onSuccess={async () => {
          // Refresh appointments
          try {
            const bookingsResponse = await getMyBookings()
            const bookings = bookingsResponse.bookings || []
            
            const convertedAppointments: Appointment[] = bookings.map((booking: BookingResponse) => ({
              id: booking.id,
              start_time: booking.start_time,
              end_time: booking.end_time,
              client_name: booking.client_name || 'Unknown Client',
              service_name: booking.service_name || 'Service',
              barber_name: booking.barber_name,
              status: booking.status as 'pending' | 'confirmed' | 'cancelled' | 'completed',
              price: booking.price,
              duration_minutes: booking.duration_minutes
            }))

            setAppointments(convertedAppointments)
            setPreselectedTime(undefined)
            setSelectedDate(null)
          } catch (err) {
            console.error('Failed to refresh appointments:', err)
          }
        }}
      />
    </div>
  )
}