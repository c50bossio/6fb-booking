'use client'

import { useState, useEffect } from 'react'
import { getMyBookings, getUsers, type BookingResponse } from '@/lib/api'
import PremiumCalendar from '@/components/PremiumCalendar'

/**
 * PREMIUM CALENDAR PAGE
 * 
 * Premium calendar implementation with professional design.
 * Features staff-centric layout, professional appointment blocks, and sophisticated visuals.
 */

interface Barber {
  id: number
  name?: string
  first_name?: string
  last_name?: string
  email: string
  avatar?: string
  role?: string
}

export default function PremiumCalendarPage() {
  // Calendar state
  const [view, setView] = useState<'day' | 'week' | 'month'>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedBarberId, setSelectedBarberId] = useState<number | null>(null)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null)
  
  // Data state
  const [appointments, setAppointments] = useState<BookingResponse[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load appointments and barbers
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Load appointments
        const bookingsResponse = await getMyBookings()
        const appointmentsArray = bookingsResponse?.bookings || []
        setAppointments(Array.isArray(appointmentsArray) ? appointmentsArray : [])
        
        // Load barbers/staff
        try {
          const usersResponse = await getUsers()
          const barbersArray = usersResponse?.users || []
          // Filter for barbers or include all users if no specific role filtering
          const filteredBarbers = Array.isArray(barbersArray) 
            ? barbersArray.filter(user => 
                user.role === 'barber' || 
                user.role === 'admin' || 
                user.unified_role === 'barber' || 
                user.unified_role === 'shop_owner' ||
                user.unified_role === 'individual_barber'
              )
            : []
          
          // If no barbers found, create mock barber data based on appointments
          if (filteredBarbers.length === 0 && appointmentsArray.length > 0) {
            const uniqueBarberIds = [...new Set(appointmentsArray.map(apt => apt.barber_id))]
            const mockBarbers = uniqueBarberIds.map(barberId => ({
              id: barberId,
              name: `Barber ${barberId}`,
              email: `barber${barberId}@example.com`,
              role: 'barber'
            }))
            setBarbers(mockBarbers)
          } else {
            setBarbers(filteredBarbers)
          }
        } catch (usersError) {
          // If users endpoint fails, create mock barber data
          if (appointmentsArray.length > 0) {
            const uniqueBarberIds = [...new Set(appointmentsArray.map(apt => apt.barber_id))]
            const mockBarbers = uniqueBarberIds.map(barberId => ({
              id: barberId,
              name: `Barber ${barberId}`,
              email: `barber${barberId}@example.com`,
              role: 'barber'
            }))
            setBarbers(mockBarbers)
          } else {
            // Default mock barber for empty state
            setBarbers([{
              id: 1,
              name: 'John Doe',
              email: 'john@example.com',
              role: 'barber'
            }])
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load calendar data')
        // Set default barber for error state
        setBarbers([{
          id: 1,
          name: 'Demo Barber',
          email: 'demo@example.com',
          role: 'barber'
        }])
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Event handlers
  const handleDateChange = (date: Date) => {
    setCurrentDate(date)
  }

  const handleViewChange = (newView: 'day' | 'week' | 'month') => {
    setView(newView)
  }

  const handleAppointmentClick = (appointment: BookingResponse) => {
    setSelectedAppointmentId(appointment.id)
    // Future: Open appointment details modal
  }

  const handleTimeSlotClick = (date: Date, barberId?: number, hour?: number, minute?: number) => {
    // The calendar component now handles this internally with the modal
    console.log('Time slot clicked:', { date, barberId, hour, minute })
  }

  const handleBarberSelect = (barberId: number) => {
    setSelectedBarberId(selectedBarberId === barberId ? null : barberId)
  }

  const handleNewAppointment = () => {
    // The calendar component now handles this internally with the modal
    console.log('New appointment button clicked')
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Main Calendar - Full Height */}
      <div className="flex-1 overflow-hidden">
        <PremiumCalendar
          // Data
          barbers={barbers}
          appointments={appointments}
          currentDate={currentDate}
          
          // View configuration
          view={view}
          startHour={8}
          endHour={19}
          slotDuration={60}
          
          // Display options
          showRevenue={true}
          showAppointmentCount={true}
          colorScheme="service-based"
          
          // Event handlers
          onDateChange={handleDateChange}
          onViewChange={handleViewChange}
          onAppointmentClick={handleAppointmentClick}
          onTimeSlotClick={handleTimeSlotClick}
          onBarberSelect={handleBarberSelect}
          onNewAppointment={handleNewAppointment}
          onRefresh={handleRefresh}
          
          // Selection state
          selectedBarberId={selectedBarberId}
          selectedAppointmentId={selectedAppointmentId}
          
          // Loading state
          isLoading={loading}
          error={error}
          
          className="h-full"
        />
      </div>
    </div>
  )
}